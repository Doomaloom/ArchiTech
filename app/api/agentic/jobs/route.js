import { NextResponse } from "next/server";
import { enqueueOrchestratorTask } from "../../../_lib/gcp/cloud-tasks";
import { createServerSupabaseClient } from "../../../_lib/supabase/server";

export const runtime = "nodejs";

const JOB_DEFAULTS = {
  maxFixRounds: 4,
  maxDurationSeconds: 2700,
  pageTaskParallelism: 4,
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim();
}

function normalizeActions(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeText(entry))
    .filter(Boolean)
    .slice(0, 100);
}

function normalizePages(value) {
  if (!Array.isArray(value)) {
    return { pages: null, error: "generationSpec.pages must be an array." };
  }
  if (!value.length) {
    return { pages: null, error: "At least one page is required." };
  }

  const pages = [];
  for (let index = 0; index < value.length; index += 1) {
    const rawPage = value[index];
    if (!isPlainObject(rawPage)) {
      return { pages: null, error: `Page ${index + 1} is invalid.` };
    }
    const selectedPreviewHtml = normalizeText(rawPage.selectedPreviewHtml);
    if (!selectedPreviewHtml) {
      return {
        pages: null,
        error: `Page ${index + 1} is missing selectedPreviewHtml.`,
      };
    }

    pages.push({
      pageId: normalizeText(rawPage.pageId, `page-${index + 1}`),
      route: normalizeText(rawPage.route, `/page-${index + 1}`),
      name: normalizeText(rawPage.name, `Page ${index + 1}`),
      treeNode: isPlainObject(rawPage.treeNode) ? rawPage.treeNode : null,
      selectedPreviewHtml,
      actions: normalizeActions(rawPage.actions),
      notes: normalizeText(rawPage.notes),
    });
  }

  return { pages, error: "" };
}

function normalizeGenerationSpec(rawSpec, projectId) {
  if (!isPlainObject(rawSpec)) {
    return { generationSpec: null, error: "generationSpec must be an object." };
  }

  const { pages, error } = normalizePages(rawSpec.pages);
  if (error) {
    return { generationSpec: null, error };
  }

  return {
    generationSpec: {
      projectId,
      brief: isPlainObject(rawSpec.brief) ? rawSpec.brief : {},
      style: isPlainObject(rawSpec.style) ? rawSpec.style : {},
      globalNotes: normalizeText(rawSpec.globalNotes),
      pages,
    },
    error: "",
  };
}

function resolveParallelism(pageCount) {
  return Math.max(1, Math.min(pageCount, JOB_DEFAULTS.pageTaskParallelism, 6));
}

export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const projectId = normalizeText(url.searchParams.get("projectId"));
    const requestedLimit = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(Math.trunc(requestedLimit), 100))
      : 20;

    let query = supabase
      .from("app_generation_jobs")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data: jobs, error } = await query;
    if (error) {
      return NextResponse.json(
        { error: "Failed to load generation jobs." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      jobs: Array.isArray(jobs) ? jobs : [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected job list failure." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const projectId = normalizeText(body?.projectId);
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId." }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (projectError) {
      return NextResponse.json(
        { error: "Failed to validate project." },
        { status: 500 }
      );
    }
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const { generationSpec, error: specError } = normalizeGenerationSpec(
      body?.generationSpec,
      projectId
    );
    if (specError) {
      return NextResponse.json({ error: specError }, { status: 400 });
    }

    const pageCount = generationSpec.pages.length;
    const pageTaskParallelism = resolveParallelism(pageCount);

    const { data: job, error: insertJobError } = await supabase
      .from("app_generation_jobs")
      .insert({
        owner_id: user.id,
        project_id: projectId,
        status: "queued",
        current_stage: "queued",
        generation_spec: generationSpec,
        metadata: {
          queueProvider: "cloud-tasks",
          scaffoldVersion: 1,
        },
        max_fix_rounds: JOB_DEFAULTS.maxFixRounds,
        max_duration_seconds: JOB_DEFAULTS.maxDurationSeconds,
        page_task_parallelism: pageTaskParallelism,
      })
      .select("*")
      .single();

    if (insertJobError || !job) {
      return NextResponse.json(
        { error: "Failed to create generation job." },
        { status: 500 }
      );
    }

    const { data: initialTask, error: taskError } = await supabase
      .from("app_generation_tasks")
      .insert({
        job_id: job.id,
        owner_id: user.id,
        task_type: "orchestrate",
        task_key: "root",
        status: "queued",
        attempt_number: 1,
        payload: {
          stage: "queue-dispatch",
        },
      })
      .select("*")
      .single();

    if (taskError || !initialTask) {
      return NextResponse.json(
        { error: "Created job but failed to create initial task." },
        { status: 500 }
      );
    }

    const { error: logError } = await supabase.from("app_generation_logs").insert({
      job_id: job.id,
      owner_id: user.id,
      level: "info",
      stage: "api",
      message: "Generation job created (queue dispatch scaffold only).",
      meta: {
        pageCount,
        pageTaskParallelism,
      },
    });

    if (logError) {
      return NextResponse.json(
        { error: "Created job but failed to create initial log." },
        { status: 500 }
      );
    }

    let queueResult = null;

    try {
      queueResult = await enqueueOrchestratorTask({
        type: "orchestrate",
        jobId: job.id,
        taskId: initialTask.id,
        ownerId: user.id,
        projectId,
        requestedAt: new Date().toISOString(),
      });

      await supabase
        .from("app_generation_tasks")
        .update({
          status: "queued",
          result: {
            queueProvider: "cloud-tasks",
            queuePath: queueResult.queuePath,
            queueTaskName: queueResult.taskName,
            scheduleTime: queueResult.scheduleTime,
          },
        })
        .eq("id", initialTask.id)
        .eq("owner_id", user.id);

      await supabase
        .from("app_generation_jobs")
        .update({
          current_stage: "orchestrator-queued",
          metadata: {
            ...(job.metadata || {}),
            queueProvider: "cloud-tasks",
            queuePath: queueResult.queuePath,
            queueTaskName: queueResult.taskName,
          },
        })
        .eq("id", job.id)
        .eq("owner_id", user.id);

      await supabase.from("app_generation_logs").insert({
        job_id: job.id,
        owner_id: user.id,
        task_id: initialTask.id,
        level: "info",
        stage: "api",
        message: "Queued orchestrator task in Cloud Tasks.",
        meta: {
          queuePath: queueResult.queuePath,
          queueTaskName: queueResult.taskName,
        },
      });
    } catch (queueError) {
      const failedAt = new Date().toISOString();
      const queueMessage =
        queueError?.message ?? "Failed to enqueue orchestrator task.";

      await supabase
        .from("app_generation_tasks")
        .update({
          status: "failed",
          error_message: queueMessage,
          finished_at: failedAt,
        })
        .eq("id", initialTask.id)
        .eq("owner_id", user.id);

      await supabase
        .from("app_generation_jobs")
        .update({
          status: "failed",
          current_stage: "queue-dispatch",
          error_message: queueMessage,
          finished_at: failedAt,
        })
        .eq("id", job.id)
        .eq("owner_id", user.id);

      await supabase.from("app_generation_logs").insert({
        job_id: job.id,
        owner_id: user.id,
        task_id: initialTask.id,
        level: "error",
        stage: "api",
        message: "Cloud Tasks dispatch failed during job creation.",
        meta: {
          error: queueMessage,
        },
      });

      return NextResponse.json(
        {
          error: "Failed to enqueue generation job.",
          jobId: job.id,
          detail: queueMessage,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        job: {
          id: job.id,
          status: job.status,
          currentStage: "orchestrator-queued",
          projectId: job.project_id,
          createdAt: job.created_at,
          maxFixRounds: job.max_fix_rounds,
          maxDurationSeconds: job.max_duration_seconds,
          pageTaskParallelism: job.page_task_parallelism,
          queueTaskName: queueResult?.taskName || null,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected job creation failure." },
      { status: 500 }
    );
  }
}
