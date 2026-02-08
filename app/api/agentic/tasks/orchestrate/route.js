import { NextResponse } from "next/server";
import { enqueuePageTask } from "../../../../_lib/gcp/cloud-tasks";
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

function buildTaskKey(page, index) {
  const fromPage = normalizeText(page?.pageId);
  return fromPage || `page-${index + 1}`;
}

async function markTaskFailed(admin, taskId, errorMessage) {
  await admin
    .from("app_generation_tasks")
    .update({
      status: "failed",
      error_message: errorMessage,
      finished_at: toIsoNow(),
    })
    .eq("id", taskId);
}

async function markJobFailed(admin, jobId, stage, errorMessage) {
  await admin
    .from("app_generation_jobs")
    .update({
      status: "failed",
      current_stage: stage,
      error_message: errorMessage,
      finished_at: toIsoNow(),
    })
    .eq("id", jobId);
}

async function resolveOrCreatePageTask(admin, { job, taskKey, pageIndex, page }) {
  const insertPayload = {
    job_id: job.id,
    owner_id: job.owner_id,
    task_type: "page",
    task_key: taskKey,
    status: "queued",
    attempt_number: 1,
    payload: {
      pageIndex,
      pageId: normalizeText(page?.pageId, `page-${pageIndex + 1}`),
      route: normalizeText(page?.route, `/page-${pageIndex + 1}`),
      name: normalizeText(page?.name, `Page ${pageIndex + 1}`),
    },
  };

  const { data: inserted, error: insertError } = await admin
    .from("app_generation_tasks")
    .insert(insertPayload)
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
    .eq("task_type", "page")
    .eq("task_key", taskKey)
    .eq("attempt_number", 1)
    .maybeSingle();

  if (fetchError || !existing) {
    throw fetchError || new Error("Failed to resolve existing page task.");
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
    if (task.task_type !== "orchestrate") {
      return NextResponse.json({ ok: true, ignored: true, reason: "wrong-task-type" });
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
      return NextResponse.json({ error: "Failed to load job." }, { status: 500 });
    }
    if (!job) {
      await markTaskFailed(admin, taskId, "Parent job not found.");
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
      message: "Orchestrator started page fanout.",
      meta: { source: "cloud-tasks" },
    });

    const pages = Array.isArray(job?.generation_spec?.pages)
      ? job.generation_spec.pages
      : [];
    if (!pages.length) {
      const errorMessage = "Generation spec has no pages for fanout.";
      await markTaskFailed(admin, taskId, errorMessage);
      await markJobFailed(admin, jobId, "orchestrator-fanout", errorMessage);
      await admin.from("app_generation_logs").insert({
        job_id: jobId,
        task_id: taskId,
        owner_id: job.owner_id,
        level: "error",
        stage: "orchestrator",
        message: errorMessage,
        meta: {},
      });
      return NextResponse.json({ ok: true, status: "failed", reason: "no-pages" });
    }

    const enqueueErrors = [];
    let enqueuedCount = 0;

    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      const taskKey = buildTaskKey(page, index);
      let pageTask = null;

      try {
        pageTask = await resolveOrCreatePageTask(admin, {
          job,
          taskKey,
          pageIndex: index,
          page,
        });

        const alreadyQueued =
          typeof pageTask?.result?.queueTaskName === "string" &&
          pageTask.result.queueTaskName.length > 0;
        if (alreadyQueued || pageTask.status === "running" || pageTask.status === "succeeded") {
          enqueuedCount += 1;
          continue;
        }

        const queueResult = await enqueuePageTask({
          type: "page",
          jobId: job.id,
          taskId: pageTask.id,
          pageIndex: index,
          pageId: normalizeText(page?.pageId, `page-${index + 1}`),
          route: normalizeText(page?.route, `/page-${index + 1}`),
          requestedAt: toIsoNow(),
        });

        await admin
          .from("app_generation_tasks")
          .update({
            result: {
              queueProvider: "cloud-tasks",
              queuePath: queueResult.queuePath,
              queueTaskName: queueResult.taskName,
              scheduleTime: queueResult.scheduleTime,
            },
            status: "queued",
          })
          .eq("id", pageTask.id);

        enqueuedCount += 1;
      } catch (error) {
        if (pageTask?.id) {
          await admin
            .from("app_generation_tasks")
            .update({
              status: "failed",
              error_message: error?.message || "Failed to enqueue page task.",
              finished_at: toIsoNow(),
            })
            .eq("id", pageTask.id);
        }
        enqueueErrors.push({
          pageIndex: index,
          taskKey,
          message: error?.message || "Unknown queue error.",
        });
      }
    }

    if (enqueueErrors.length > 0) {
      const queueMessage = `Failed to enqueue ${enqueueErrors.length} page task(s).`;
      await markTaskFailed(admin, taskId, queueMessage);
      await markJobFailed(admin, jobId, "page-queue-dispatch", queueMessage);
      await admin.from("app_generation_logs").insert({
        job_id: jobId,
        task_id: taskId,
        owner_id: job.owner_id,
        level: "error",
        stage: "orchestrator",
        message: queueMessage,
        meta: { errors: enqueueErrors },
      });
      return NextResponse.json({
        ok: true,
        status: "failed",
        reason: "page-enqueue-failed",
        errors: enqueueErrors,
      });
    }

    const finishedAt = toIsoNow();
    await admin
      .from("app_generation_tasks")
      .update({
        status: "succeeded",
        finished_at: finishedAt,
        result: {
          ...(task.result || {}),
          pagesTotal: pages.length,
          pagesEnqueued: enqueuedCount,
          stage: "fanout-pages",
        },
      })
      .eq("id", taskId);

    await admin
      .from("app_generation_jobs")
      .update({
        status: "running",
        current_stage: "pages-running",
        error_message: null,
      })
      .eq("id", jobId);

    await admin.from("app_generation_logs").insert({
      job_id: jobId,
      task_id: taskId,
      owner_id: job.owner_id,
      level: "info",
      stage: "orchestrator",
      message: "Page tasks queued.",
      meta: {
        pagesTotal: pages.length,
        pagesEnqueued: enqueuedCount,
      },
    });

    return NextResponse.json({
      ok: true,
      status: "pages-running",
      pagesTotal: pages.length,
      pagesEnqueued: enqueuedCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected orchestrator failure." },
      { status: 500 }
    );
  }
}
