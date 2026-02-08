import path from "node:path";
import { NextResponse } from "next/server";
import { runGeminiCliPrompt } from "../../../../_lib/agentic/gemini-cli";
import {
  ensureJobWorkspace,
  readWorkspaceFile,
  writePageSnapshot,
  writeRoutePage,
} from "../../../../_lib/agentic/workspace";
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

async function resolveOrCreateValidateTask(admin, job) {
  const { data: inserted, error: insertError } = await admin
    .from("app_generation_tasks")
    .insert({
      job_id: job.id,
      owner_id: job.owner_id,
      task_type: "validate",
      task_key: "root",
      status: "queued",
      attempt_number: 1,
      payload: {
        stage: "build-validation",
        requestedBy: "integrate",
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
    .eq("attempt_number", 1)
    .maybeSingle();

  if (fetchError || !existing) {
    throw fetchError || new Error("Failed to resolve existing validate task.");
  }

  return existing;
}

function makeFallbackHomePage(pages) {
  const links = pages
    .map((page) => {
      const route = normalizeText(page?.route, "/");
      const label = normalizeText(page?.name, route);
      return `        <li><a href="${route}">${label}</a></li>`;
    })
    .join("\n");
  return `export default function HomePage() {
  return (
    <main>
      <h1>Generated Site</h1>
      <p>Select a page:</p>
      <ul>
${links || "        <li><a href=\"/\">Home</a></li>"}
      </ul>
    </main>
  );
}
`;
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
    if (task.task_type !== "integrate") {
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
        current_stage: "integrating",
      })
      .eq("id", jobId);

    await admin.from("app_generation_logs").insert({
      job_id: jobId,
      task_id: taskId,
      owner_id: job.owner_id,
      level: "info",
      stage: "integrate",
      message: "Integration task started.",
      meta: {},
    });

    const workspaceDir = await ensureJobWorkspace(job.id);
    const pages = Array.isArray(job?.generation_spec?.pages)
      ? job.generation_spec.pages
      : [];

    const rootPage = pages.find((page) => normalizeText(page?.route, "/") === "/");
    if (!rootPage) {
      await writeRoutePage({
        workspaceDir,
        route: "/",
        content: makeFallbackHomePage(pages),
      });
    }

    const routesSummary = pages.map((page) => ({
      route: normalizeText(page?.route, "/"),
      name: normalizeText(page?.name),
      actions: Array.isArray(page?.actions) ? page.actions : [],
    }));

    const routesSummaryFile = await writePageSnapshot({
      workspaceDir,
      taskKey: "routes-summary",
      payload: {
        generatedAt: toIsoNow(),
        pages: routesSummary,
      },
    });

    const appPagePath = path.join(workspaceDir, "app", "page.tsx");
    const currentRootPage = await readWorkspaceFile(appPagePath);
    const integrationPrompt = [
      "You are integrating a generated Next.js App Router project.",
      "Improve the root app/page.tsx to provide navigation and summary for generated pages.",
      "Return only TSX code for app/page.tsx.",
      "",
      `Project brief: ${normalizeText(job?.generation_spec?.brief?.title)}`,
      `Global notes: ${normalizeText(job?.generation_spec?.globalNotes)}`,
      `Pages JSON: ${JSON.stringify(routesSummary)}`,
      "",
      "Current app/page.tsx:",
      currentRootPage,
    ].join("\n");

    const geminiResult = await runGeminiCliPrompt({
      cwd: workspaceDir,
      prompt: integrationPrompt,
      timeoutMs: 6 * 60 * 1000,
    });

    if (geminiResult.ok) {
      await writeRoutePage({
        workspaceDir,
        route: "/",
        content: geminiResult.output,
      });
    }

    const validateTask = await resolveOrCreateValidateTask(admin, job);
    const queueResult = await enqueueValidateTask({
      type: "validate",
      jobId: job.id,
      taskId: validateTask.id,
      attemptNumber: validateTask.attempt_number,
      requestedAt: toIsoNow(),
    });

    const finishedAt = toIsoNow();
    await admin
      .from("app_generation_tasks")
      .update({
        status: "succeeded",
        finished_at: finishedAt,
        result: {
          ...(task.result || {}),
          routesSummaryFile,
          method: geminiResult.ok ? "gemini-cli" : "fallback-template",
          gemini: {
            ok: geminiResult.ok,
            traces: geminiResult.traces,
          },
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
      level: geminiResult.ok ? "info" : "warn",
      stage: "integrate",
      message: geminiResult.ok
        ? "Integration completed with Gemini CLI update."
        : "Integration completed with fallback root page.",
      meta: {
        validateTaskId: validateTask.id,
      },
    });

    return NextResponse.json({
      ok: true,
      status: "validate-queued",
      validateTaskId: validateTask.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected integrate task failure." },
      { status: 500 }
    );
  }
}
