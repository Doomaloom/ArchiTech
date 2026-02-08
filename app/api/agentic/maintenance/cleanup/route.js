import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../../_lib/supabase/admin";

export const runtime = "nodejs";

const DEFAULT_KEEP_LATEST = 5;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isAuthorized(request) {
  const expected = normalizeText(process.env.AGENTIC_MAINTENANCE_TOKEN);
  const provided = normalizeText(request.headers.get("x-agentic-maintenance-token"));
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }
  return provided && provided === expected;
}

function toKeepLatest(rawValue) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    return DEFAULT_KEEP_LATEST;
  }
  return Math.max(1, Math.min(Math.trunc(value), 50));
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized maintenance call." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const keepLatest = toKeepLatest(body?.keepLatest);
    const dryRun = Boolean(body?.dryRun);

    const admin = createSupabaseAdminClient();
    const { data: artifacts, error: artifactsError } = await admin
      .from("app_generation_artifacts")
      .select("id, bucket_id, object_path, owner_id, project_id, created_at")
      .order("owner_id", { ascending: true })
      .order("project_id", { ascending: true })
      .order("created_at", { ascending: false });

    if (artifactsError) {
      return NextResponse.json(
        { error: "Failed to load artifacts for cleanup." },
        { status: 500 }
      );
    }

    const grouped = new Map();
    for (const artifact of artifacts || []) {
      const key = `${artifact.owner_id}:${artifact.project_id}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(artifact);
    }

    const toDelete = [];
    for (const groupArtifacts of grouped.values()) {
      if (groupArtifacts.length <= keepLatest) {
        continue;
      }
      toDelete.push(...groupArtifacts.slice(keepLatest));
    }

    if (!toDelete.length) {
      return NextResponse.json({
        ok: true,
        dryRun,
        keepLatest,
        scanned: artifacts?.length || 0,
        deleted: 0,
      });
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        keepLatest,
        scanned: artifacts?.length || 0,
        wouldDelete: toDelete.length,
        sample: toDelete.slice(0, 10),
      });
    }

    const byBucket = new Map();
    for (const artifact of toDelete) {
      const bucket = artifact.bucket_id || "generated-apps";
      if (!byBucket.has(bucket)) {
        byBucket.set(bucket, []);
      }
      byBucket.get(bucket).push(artifact.object_path);
    }

    for (const [bucket, paths] of byBucket.entries()) {
      const { error: removeError } = await admin.storage.from(bucket).remove(paths);
      if (removeError) {
        return NextResponse.json(
          {
            error: `Failed to remove objects from bucket ${bucket}.`,
            detail: removeError.message,
          },
          { status: 500 }
        );
      }
    }

    const ids = toDelete.map((artifact) => artifact.id);
    const { error: deleteError } = await admin
      .from("app_generation_artifacts")
      .delete()
      .in("id", ids);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to remove artifact metadata." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      dryRun: false,
      keepLatest,
      scanned: artifacts?.length || 0,
      deleted: ids.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected cleanup failure." },
      { status: 500 }
    );
  }
}
