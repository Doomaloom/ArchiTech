import { NextResponse } from "next/server";
import { enqueueValidateTask } from "../../../../_lib/gcp/cloud-tasks";
import { createSupabaseAdminClient } from "../../../../_lib/supabase/admin";

export const runtime = "nodejs";

const TERMINAL_TASK_STATUSES = new Set([
  "succeeded",
  "failed",
  "canceled",
  "skipped",
]);

const TERMINAL_JOB_STATUSES = new Set([
  "completed",
  "completed_with_warnings",
  "failed",
  "expired",
]);

function normalizeText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function toIsoNow() {
  return new Date().toISOString();
}

function isDispatchAuthorized(request) {
  const expectedToken = normalizeText(process.env.AGENTIC_ORCHESTRATOR_TOKEN);
  const providedToken = normalizeText(request.headers.get("x-agentic-token"));
  if (expectedToken) {
    return providedToken && providedToken === expectedToken;
  }
  return process.env.NODE_ENV !== "production";
}

function isUniqueViolation(error) {
  return error?.code === "23505";
}

async function resolveOrCreateValidateTask(admin, job, attemptNumber) {
  const { data: inserted, error: insertError } = await admin
    .from("app_generation_tasks")
    .insert({
      job_id: job.id,
      owner_id: job.owner_id,
      task_type: "validate",
      task_key: "root",
      status: "queued",
      attempt_number: attemptNumber,
      payload: {
        stage: "build-validation",
        requestedBy: "fix",
      },
    })
    .select("*")
    .single();

  if (!insertError && inserted) {
    return inserted;
  }

  if (!isUniqueViolation(insertError)) {
    throw insertError;
  }

  const { data: existing, error: fetchError } = await admin
    .from("app_generation_tasks")
    .select("*")
    .eq("job_id", job.id)
    .eq("task_type", "validate")
    .eq("task_key", "root")
    .eq("attempt_number", attemptNumber)
    .maybeSingle();

  if (fetchError || !existing) {
    throw fetchError || new Error("Failed to resolve existing validate task.");
  }

  return existing;
}

export async function POST(request) {
  if (!isDispatchAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized dispatcher." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const jobId = normalizeText(body?.jobId);
  const taskId = normalizeText(body?.taskId);

  if (!jobId || !taskId) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "missing-job-or-task-id",
    });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: task, error: taskError } = await admin
      .from("app_generation_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("job_id", jobId)
      .maybeSingle();

    if (taskError) {
      return NextResponse.json({ error: "Failed to load task." }, { status: 500 });
    }
    if (!task) {
      return NextResponse.json({ ok: true, ignored: true, reason: "task-not-found" });
    }
    if (task.task_type !== "fix") {
      return NextResponse.json({ ok: true, ignored: true, reason: "wrong-task-type" });
    }
    if (TERMINAL_TASK_STATUSES.has(task.status)) {
      return NextResponse.json({ ok: true, duplicate: true, status: task.status });
    }

    const { data: job, error: jobError } = await admin
      .from("app_generation_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) {
      return NextResponse.json({ error: "Failed to load job." }, { status: 500 });
    }
    if (!job) {
      await admin
        .from("app_generation_tasks")
        .update({
          status: "failed",
          error_message: "Parent job not found.",
          finished_at: toIsoNow(),
        })
        .eq("id", taskId);
      return NextResponse.json({ ok: true, ignored: true, reason: "job-not-found" });
    }
    if (TERMINAL_JOB_STATUSES.has(job.status)) {
      await admin
        .from("app_generation_tasks")
        .update({
          status: "skipped",
          error_message: `Job already terminal (${job.status}).`,
          finished_at: toIsoNow(),
        })
        .eq("id", taskId);
      return NextResponse.json({ ok: true, ignored: true, reason: "job-terminal" });
    }

    const startedAt = toIsoNow();
    await admin
      .from("app_generation_tasks")
      .update({
        status: "running",
        started_at: task.started_at || startedAt,
        error_message: null,
      })
      .eq("id", taskId);

    await admin
      .from("app_generation_jobs")
      .update({
        status: "fixing",
        current_stage: "fixing",
        fix_round: Math.max(job.fix_round || 0, task.attempt_number || 0),
      })
      .eq("id", jobId);

    await admin.from("app_generation_logs").insert({
      job_id: jobId,
      task_id: taskId,
      owner_id: job.owner_id,
      level: "info",
      stage: "fix",
      message: "Fix task started (scaffold).",
      meta: {
        fixRound: task.attempt_number,
      },
    });

    const nextValidateAttempt = (task.attempt_number || 0) + 1;
    const validateTask = await resolveOrCreateValidateTask(
      admin,
      job,
      nextValidateAttempt
    );
    const queueResult = await enqueueValidateTask({
      type: "validate",
      jobId: job.id,
      taskId: validateTask.id,
      attemptNumber: nextValidateAttempt,
      requestedAt: toIsoNow(),
    });

    await admin
      .from("app_generation_tasks")
      .update({
        status: "succeeded",
        finished_at: toIsoNow(),
        result: {
          ...(task.result || {}),
          scaffold: true,
          nextValidateAttempt,
          validateTaskId: validateTask.id,
        },
      })
      .eq("id", taskId);

    await admin
      .from("app_generation_tasks")
      .update({
        status: "queued",
        error_message: null,
        finished_at: null,
        result: {
          ...(validateTask.result || {}),
          queueProvider: "cloud-tasks",
          queuePath: queueResult.queuePath,
          queueTaskName: queueResult.taskName,
          scheduleTime: queueResult.scheduleTime,
        },
      })
      .eq("id", validateTask.id);

    await admin
      .from("app_generation_jobs")
      .update({
        status: "running",
        current_stage: "validate-queued",
        error_message: null,
      })
      .eq("id", jobId);

    await admin.from("app_generation_logs").insert({
      job_id: jobId,
      task_id: taskId,
      owner_id: job.owner_id,
      level: "info",
      stage: "fix",
      message: "Fix task completed; validation re-queued.",
      meta: {
        nextValidateAttempt,
        validateTaskId: validateTask.id,
      },
    });

    return NextResponse.json({
      ok: true,
      status: "validate-queued",
      validateTaskId: validateTask.id,
      attemptNumber: nextValidateAttempt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected fix task failure." },
      { status: 500 }
    );
  }
}
