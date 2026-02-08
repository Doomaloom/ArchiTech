import { NextResponse } from "next/server";
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

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
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
      return NextResponse.json(
        { error: "Failed to load task." },
        { status: 500 }
      );
    }

    if (!task) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "task-not-found",
      });
    }

    if (TERMINAL_TASK_STATUSES.has(task.status)) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        status: task.status,
      });
    }

    const { data: job, error: jobError } = await admin
      .from("app_generation_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) {
      return NextResponse.json(
        { error: "Failed to load job." },
        { status: 500 }
      );
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

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "job-not-found",
      });
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

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "job-terminal",
      });
    }

    const startedAt = toIsoNow();
    await admin
      .from("app_generation_tasks")
      .update({
        status: "running",
        started_at: startedAt,
        error_message: null,
      })
      .eq("id", taskId);

    await admin
      .from("app_generation_jobs")
      .update({
        status: "running",
        current_stage: "orchestrating",
        started_at: job.started_at || startedAt,
      })
      .eq("id", jobId);

    await admin.from("app_generation_logs").insert({
      job_id: jobId,
      task_id: taskId,
      owner_id: job.owner_id,
      level: "info",
      stage: "orchestrator",
      message: "Orchestrator callback received.",
      meta: {
        source: "cloud-tasks",
      },
    });

    // Scaffold-only behavior until stage fanout workers are implemented.
    const finishedAt = toIsoNow();
    const scaffoldMessage =
      "Orchestrator scaffold reached. Downstream fanout stages are not implemented yet.";

    await admin
      .from("app_generation_tasks")
      .update({
        status: "failed",
        error_message: scaffoldMessage,
        finished_at: finishedAt,
      })
      .eq("id", taskId);

    await admin
      .from("app_generation_jobs")
      .update({
        status: "failed",
        current_stage: "orchestrator-scaffold",
        error_message: scaffoldMessage,
        finished_at: finishedAt,
      })
      .eq("id", jobId);

    await admin.from("app_generation_logs").insert({
      job_id: jobId,
      task_id: taskId,
      owner_id: job.owner_id,
      level: "warn",
      stage: "orchestrator",
      message: scaffoldMessage,
      meta: {
        action: "mark-job-failed",
      },
    });

    return NextResponse.json({
      ok: true,
      status: "failed",
      reason: "orchestrator-scaffold",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected orchestrator failure." },
      { status: 500 }
    );
  }
}
