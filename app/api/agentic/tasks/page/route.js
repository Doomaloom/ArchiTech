import { NextResponse } from "next/server";
import { enqueueIntegrateTask } from "../../../../_lib/gcp/cloud-tasks";
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

async function resolveOrCreateIntegrateTask(admin, job) {
  const { data: inserted, error: insertError } = await admin
    .from("app_generation_tasks")
    .insert({
      job_id: job.id,
      owner_id: job.owner_id,
      task_type: "integrate",
      task_key: "root",
      status: "queued",
      attempt_number: 1,
      payload: {
        stage: "integrate-routes",
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
    .eq("task_type", "integrate")
    .eq("task_key", "root")
    .eq("attempt_number", 1)
    .maybeSingle();

  if (fetchError || !existing) {
    throw fetchError || new Error("Failed to resolve existing integrate task.");
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
    if (task.task_type !== "page") {
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

    await admin.from("app_generation_logs").insert({
      job_id: jobId,
      task_id: taskId,
      owner_id: job.owner_id,
      level: "info",
      stage: "page",
      message: "Page task started.",
      meta: {
        pageId: normalizeText(task?.payload?.pageId),
        route: normalizeText(task?.payload?.route),
      },
    });

    const pageIndex = Number(task?.payload?.pageIndex);
    const pages = Array.isArray(job?.generation_spec?.pages)
      ? job.generation_spec.pages
      : [];
    const pageSpec =
      Number.isFinite(pageIndex) && pageIndex >= 0 && pageIndex < pages.length
        ? pages[pageIndex]
        : null;

    const finishedAt = toIsoNow();
    await admin
      .from("app_generation_tasks")
      .update({
        status: "succeeded",
        finished_at: finishedAt,
        result: {
          ...(task.result || {}),
          scaffold: true,
          pageId: normalizeText(task?.payload?.pageId),
          route: normalizeText(task?.payload?.route),
          selectedPreviewHtmlBytes: pageSpec?.selectedPreviewHtml
            ? Buffer.byteLength(pageSpec.selectedPreviewHtml, "utf8")
            : 0,
        },
      })
      .eq("id", taskId);

    await admin.from("app_generation_logs").insert({
      job_id: jobId,
      task_id: taskId,
      owner_id: job.owner_id,
      level: "info",
      stage: "page",
      message: "Page task completed.",
      meta: {
        pageId: normalizeText(task?.payload?.pageId),
        route: normalizeText(task?.payload?.route),
      },
    });

    const { data: pageTasks, error: pageTasksError } = await admin
      .from("app_generation_tasks")
      .select("status")
      .eq("job_id", jobId)
      .eq("task_type", "page");

    if (pageTasksError) {
      return NextResponse.json(
        { error: "Failed to aggregate page task states." },
        { status: 500 }
      );
    }

    const statuses = Array.isArray(pageTasks) ? pageTasks.map((item) => item.status) : [];
    const hasFailures = statuses.some((status) => status === "failed" || status === "canceled");
    const allSucceeded = statuses.length > 0 && statuses.every((status) => status === "succeeded");

    if (hasFailures) {
      await admin
        .from("app_generation_jobs")
        .update({
          status: "failed",
          current_stage: "pages-running",
          error_message: "One or more page tasks failed.",
          finished_at: toIsoNow(),
        })
        .eq("id", jobId);

      await admin.from("app_generation_logs").insert({
        job_id: jobId,
        task_id: taskId,
        owner_id: job.owner_id,
        level: "error",
        stage: "page",
        message: "Job failed because at least one page task failed.",
        meta: {},
      });
    } else if (allSucceeded) {
      try {
        const integrateTask = await resolveOrCreateIntegrateTask(admin, job);
        const queueResult = await enqueueIntegrateTask({
          type: "integrate",
          jobId: job.id,
          taskId: integrateTask.id,
          requestedAt: toIsoNow(),
        });

        await admin
          .from("app_generation_tasks")
          .update({
            status: "queued",
            error_message: null,
            finished_at: null,
            result: {
              ...(integrateTask.result || {}),
              queueProvider: "cloud-tasks",
              queuePath: queueResult.queuePath,
              queueTaskName: queueResult.taskName,
              scheduleTime: queueResult.scheduleTime,
            },
          })
          .eq("id", integrateTask.id);

        await admin
          .from("app_generation_jobs")
          .update({
            status: "running",
            current_stage: "integration-queued",
            error_message: null,
          })
          .eq("id", jobId);

        await admin.from("app_generation_logs").insert({
          job_id: jobId,
          task_id: taskId,
          owner_id: job.owner_id,
          level: "info",
          stage: "page",
          message: "All page tasks completed; integration task queued.",
          meta: {
            integrateTaskId: integrateTask.id,
            queueTaskName: queueResult.taskName,
          },
        });
      } catch (integrationQueueError) {
        const message =
          integrationQueueError?.message ||
          "Failed to queue integration task after page completion.";
        await admin
          .from("app_generation_jobs")
          .update({
            status: "failed",
            current_stage: "integration-queue-failed",
            error_message: message,
            finished_at: toIsoNow(),
          })
          .eq("id", jobId);

        await admin.from("app_generation_logs").insert({
          job_id: jobId,
          task_id: taskId,
          owner_id: job.owner_id,
          level: "error",
          stage: "page",
          message: "Page stage completed but integration queue dispatch failed.",
          meta: {
            error: message,
          },
        });
      }
    } else {
      await admin
        .from("app_generation_jobs")
        .update({
          status: "running",
          current_stage: "pages-running",
        })
        .eq("id", jobId);
    }

    return NextResponse.json({
      ok: true,
      status: "succeeded",
      pendingPageTasks: statuses.filter((status) => status !== "succeeded").length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected page task failure." },
      { status: 500 }
    );
  }
}
