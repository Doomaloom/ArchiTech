import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../_lib/supabase/server";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function resolveJobIdFromContext(context) {
  const params = await Promise.resolve(context?.params);
  return normalizeText(params?.jobId);
}

export async function GET(request, context) {
  try {
    const jobId = await resolveJobIdFromContext(context);
    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: job, error: jobError } = await supabase
      .from("app_generation_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (jobError) {
      return NextResponse.json(
        { error: "Failed to load generation job." },
        { status: 500 }
      );
    }
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const [{ data: tasks, error: taskError }, { data: artifact, error: artifactError }] =
      await Promise.all([
        supabase
          .from("app_generation_tasks")
          .select("*")
          .eq("job_id", job.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("app_generation_artifacts")
          .select("*")
          .eq("job_id", job.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (taskError || artifactError) {
      return NextResponse.json(
        { error: "Failed to load generation job details." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      job: {
        id: job.id,
        projectId: job.project_id,
        status: job.status,
        currentStage: job.current_stage,
        errorMessage: job.error_message,
        warningMessages: job.warning_messages ?? [],
        warningCount: job.warning_count ?? 0,
        attemptCount: job.attempt_count ?? 0,
        fixRound: job.fix_round ?? 0,
        maxFixRounds: job.max_fix_rounds ?? 4,
        maxDurationSeconds: job.max_duration_seconds ?? 2700,
        pageTaskParallelism: job.page_task_parallelism ?? 4,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        startedAt: job.started_at,
        finishedAt: job.finished_at,
        expiresAt: job.expires_at,
        metadata: job.metadata ?? {},
      },
      tasks: Array.isArray(tasks) ? tasks : [],
      latestArtifact: artifact || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected job status failure." },
      { status: 500 }
    );
  }
}
