import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../../../_lib/supabase/server";

export const runtime = "nodejs";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function resolveJobId(context) {
  const params = await Promise.resolve(context?.params);
  return normalizeText(params?.jobId);
}

function resolveLimit(searchParams) {
  const raw = Number(searchParams.get("limit"));
  if (!Number.isFinite(raw)) {
    return 200;
  }
  return Math.max(1, Math.min(Math.trunc(raw), 1000));
}

function resolveOrder(searchParams) {
  const raw = normalizeText(searchParams.get("order")).toLowerCase();
  return raw === "asc" ? "asc" : "desc";
}

export async function GET(request, context) {
  try {
    const jobId = await resolveJobId(context);
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
      .select("id, owner_id, project_id, status, created_at")
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

    const url = new URL(request.url);
    const limit = resolveLimit(url.searchParams);
    const order = resolveOrder(url.searchParams);

    const { data: logs, error: logsError } = await supabase
      .from("app_generation_logs")
      .select("id, job_id, task_id, owner_id, level, stage, message, meta, created_at")
      .eq("job_id", job.id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: order === "asc" })
      .limit(limit);

    if (logsError) {
      return NextResponse.json(
        { error: "Failed to load generation logs." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      job: {
        id: job.id,
        projectId: job.project_id,
        status: job.status,
        createdAt: job.created_at,
      },
      logs: Array.isArray(logs) ? logs : [],
      order,
      limit,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected job log failure." },
      { status: 500 }
    );
  }
}
