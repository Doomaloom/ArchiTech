import { access } from "node:fs/promises";
import { NextResponse } from "next/server";
import { enqueueFixTask, enqueuePackageTask } from "../../../../_lib/gcp/cloud-tasks";
import { resolveWorkspaceDir, runCommand } from "../../../../_lib/agentic/runner";
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

async function resolveOrCreateFixTask(admin, job, attemptNumber) {
  const { data: inserted, error: insertError } = await admin
    .from("app_generation_tasks")
    .insert({
      job_id: job.id,
      owner_id: job.owner_id,
      task_type: "fix",
      task_key: "root",
      status: "queued",
      attempt_number: attemptNumber,
      payload: {
        stage: "fix-build",
        requestedBy: "validate",
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
    .eq("task_type", "fix")
    .eq("task_key", "root")
    .eq("attempt_number", attemptNumber)
    .maybeSingle();

  if (fetchError || !existing) {
    throw fetchError || new Error("Failed to resolve existing fix task.");
  }

  return existing;
}

async function resolveOrCreatePackageTask(admin, job) {
  const { data: inserted, error: insertError } = await admin
    .from("app_generation_tasks")
    .insert({
      job_id: job.id,
      owner_id: job.owner_id,
      task_type: "package",
      task_key: "root",
      status: "queued",
      attempt_number: 1,
      payload: {
        stage: "zip-and-upload",
        requestedBy: "validate",
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
    .eq("task_type", "package")
    .eq("task_key", "root")
    .eq("attempt_number", 1)
    .maybeSingle();

  if (fetchError || !existing) {
    throw fetchError || new Error("Failed to resolve existing package task.");
  }

  return existing;
}

async function appendJobWarning(admin, job, warning) {
  const currentWarnings = Array.isArray(job.warning_messages)
    ? job.warning_messages
    : [];
  const nextWarnings = [...currentWarnings, warning];
  await admin
    .from("app_generation_jobs")
    .update({
      warning_messages: nextWarnings,
      warning_count: nextWarnings.length,
    })
    .eq("id", job.id);
  job.warning_messages = nextWarnings;
  job.warning_count = nextWarnings.length;
}

async function workspaceExists(workspaceDir) {
  try {
    await access(workspaceDir);
    return true;
  } catch {
    return false;
  }
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
    if (task.task_type !== "validate") {
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
        status: "running",
        current_stage: "validating",
        attempt_count: (job.attempt_count || 0) + 1,
      })
      .eq("id", jobId);

    await admin.from("app_generation_logs").insert({
      job_id: jobId,
      task_id: taskId,
      owner_id: job.owner_id,
      level: "info",
      stage: "validate",
      message: "Validation task started.",
      meta: { attempt: task.attempt_number },
    });

    const workspaceDir = resolveWorkspaceDir(job.id);
    const hasWorkspace = await workspaceExists(workspaceDir);
    if (!hasWorkspace) {
      const message = `Workspace directory not found: ${workspaceDir}`;
      await admin
        .from("app_generation_tasks")
        .update({
          status: "failed",
          error_message: message,
          finished_at: toIsoNow(),
        })
        .eq("id", taskId);

      await admin
        .from("app_generation_jobs")
        .update({
          status: "failed",
          current_stage: "validating",
          error_message: message,
          finished_at: toIsoNow(),
        })
        .eq("id", jobId);

      return NextResponse.json({ ok: true, status: "failed", reason: "workspace-missing" });
    }

    const installResult = await runCommand({
      cwd: workspaceDir,
      command: "npm",
      args: ["install"],
      timeoutMs: 10 * 60 * 1000,
    });

    if (!installResult.ok) {
      const warningMessage = `npm install failed (attempt ${task.attempt_number}).`;
      await appendJobWarning(admin, job, {
        code: "npm_install_failed",
        message: warningMessage,
        attempt: task.attempt_number,
        at: toIsoNow(),
      });

      await admin.from("app_generation_logs").insert({
        job_id: jobId,
        task_id: taskId,
        owner_id: job.owner_id,
        level: "warn",
        stage: "validate",
        message: warningMessage,
        meta: {
          code: installResult.code,
          timedOut: installResult.timedOut,
          stdout: installResult.stdout,
          stderr: installResult.stderr,
        },
      });
    } else {
      await admin.from("app_generation_logs").insert({
        job_id: jobId,
        task_id: taskId,
        owner_id: job.owner_id,
        level: "info",
        stage: "validate",
        message: "npm install succeeded.",
        meta: {},
      });
    }

    const buildResult = await runCommand({
      cwd: workspaceDir,
      command: "npm",
      args: ["run", "build"],
      timeoutMs: 10 * 60 * 1000,
    });

    if (buildResult.ok) {
      const finishedAt = toIsoNow();
      const packageTask = await resolveOrCreatePackageTask(admin, job);
      const queueResult = await enqueuePackageTask({
        type: "package",
        jobId: job.id,
        taskId: packageTask.id,
        requestedAt: toIsoNow(),
      });

      await admin
        .from("app_generation_tasks")
        .update({
          status: "succeeded",
          finished_at: finishedAt,
          result: {
            ...(task.result || {}),
            install: {
              ok: installResult.ok,
              code: installResult.code,
              timedOut: installResult.timedOut,
            },
            build: {
              ok: true,
              code: buildResult.code,
            },
            packageTaskId: packageTask.id,
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
            ...(packageTask.result || {}),
            queueProvider: "cloud-tasks",
            queuePath: queueResult.queuePath,
            queueTaskName: queueResult.taskName,
            scheduleTime: queueResult.scheduleTime,
          },
        })
        .eq("id", packageTask.id);

      await admin
        .from("app_generation_jobs")
        .update({
          status: "running",
          current_stage: "package-queued",
          error_message: null,
        })
        .eq("id", jobId);

      await admin.from("app_generation_logs").insert({
        job_id: jobId,
        task_id: taskId,
        owner_id: job.owner_id,
        level: "info",
        stage: "validate",
        message: "Validation succeeded; package task queued.",
        meta: {
          packageTaskId: packageTask.id,
          queueTaskName: queueResult.taskName,
        },
      });

      return NextResponse.json({
        ok: true,
        status: "package-queued",
        packageTaskId: packageTask.id,
      });
    }

    const nextFixRound = (job.fix_round || 0) + 1;
    const maxFixRounds = Number(job.max_fix_rounds) || 0;

    await admin.from("app_generation_logs").insert({
      job_id: jobId,
      task_id: taskId,
      owner_id: job.owner_id,
      level: "error",
      stage: "validate",
      message: "npm run build failed.",
      meta: {
        code: buildResult.code,
        timedOut: buildResult.timedOut,
        stdout: buildResult.stdout,
        stderr: buildResult.stderr,
      },
    });

    if (nextFixRound > maxFixRounds) {
      const message = `Build failed and max fix rounds reached (${maxFixRounds}).`;
      await admin
        .from("app_generation_tasks")
        .update({
          status: "failed",
          error_message: message,
          finished_at: toIsoNow(),
          result: {
            ...(task.result || {}),
            build: {
              ok: false,
              code: buildResult.code,
              timedOut: buildResult.timedOut,
            },
          },
        })
        .eq("id", taskId);

      await admin
        .from("app_generation_jobs")
        .update({
          status: "failed",
          current_stage: "validating",
          error_message: message,
          finished_at: toIsoNow(),
        })
        .eq("id", jobId);

      return NextResponse.json({ ok: true, status: "failed", reason: "max-fix-rounds" });
    }

    const fixTask = await resolveOrCreateFixTask(admin, job, nextFixRound);
    const queueResult = await enqueueFixTask({
      type: "fix",
      jobId: job.id,
      taskId: fixTask.id,
      fixRound: nextFixRound,
      requestedAt: toIsoNow(),
    });

    await admin
      .from("app_generation_tasks")
      .update({
        status: "failed",
        error_message: "Build failed. Fix task queued.",
        finished_at: toIsoNow(),
        result: {
          ...(task.result || {}),
          build: {
            ok: false,
            code: buildResult.code,
            timedOut: buildResult.timedOut,
          },
          fixTaskId: fixTask.id,
        },
      })
      .eq("id", taskId);

    await admin
      .from("app_generation_tasks")
      .update({
        status: "queued",
        result: {
          ...(fixTask.result || {}),
          queueProvider: "cloud-tasks",
          queuePath: queueResult.queuePath,
          queueTaskName: queueResult.taskName,
          scheduleTime: queueResult.scheduleTime,
        },
      })
      .eq("id", fixTask.id);

    await admin
      .from("app_generation_jobs")
      .update({
        status: "fixing",
        current_stage: "fix-queued",
        error_message: null,
      })
      .eq("id", jobId);

    return NextResponse.json({
      ok: true,
      status: "fix-queued",
      fixTaskId: fixTask.id,
      fixRound: nextFixRound,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected validate task failure." },
      { status: 500 }
    );
  }
}
