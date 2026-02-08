import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../../_lib/supabase/admin";
import { createServerSupabaseClient } from "../../../../../_lib/supabase/server";

export const runtime = "nodejs";

const DOWNLOAD_EXPIRY_SECONDS = 15 * 60;
const SUCCESS_JOB_STATUSES = new Set(["completed", "completed_with_warnings"]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function resolveJobId(context) {
  const params = await Promise.resolve(context?.params);
  return normalizeText(params?.jobId);
}

function buildDownloadFileName(projectId, jobId) {
  const safeProject = projectId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeJob = jobId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `architech-${safeProject || "project"}-${safeJob || "job"}.zip`;
}

export async function POST(request, context) {
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
      .select("id, owner_id, project_id, status")
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
    if (!SUCCESS_JOB_STATUSES.has(job.status)) {
      return NextResponse.json(
        { error: "Artifact is not available until the job is completed." },
        { status: 409 }
      );
    }

    const { data: artifact, error: artifactError } = await supabase
      .from("app_generation_artifacts")
      .select("id, bucket_id, object_path, created_at")
      .eq("job_id", job.id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (artifactError) {
      return NextResponse.json(
        { error: "Failed to load generation artifact." },
        { status: 500 }
      );
    }
    if (!artifact?.bucket_id || !artifact?.object_path) {
      return NextResponse.json(
        { error: "No generated artifact found for this job." },
        { status: 404 }
      );
    }

    const admin = createSupabaseAdminClient();
    const downloadName = buildDownloadFileName(job.project_id, job.id);
    const { data: signed, error: signedError } = await admin.storage
      .from(artifact.bucket_id)
      .createSignedUrl(artifact.object_path, DOWNLOAD_EXPIRY_SECONDS, {
        download: downloadName,
      });

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to create download URL." },
        { status: 500 }
      );
    }

    const expiresAt = new Date(
      Date.now() + DOWNLOAD_EXPIRY_SECONDS * 1000
    ).toISOString();

    return NextResponse.json({
      url: signed.signedUrl,
      expiresAt,
      artifact: {
        id: artifact.id,
        bucketId: artifact.bucket_id,
        objectPath: artifact.object_path,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected download URL failure." },
      { status: 500 }
    );
  }
}
