import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../_lib/supabase/admin";
import { createServerSupabaseClient } from "../../../_lib/supabase/server";

const BUCKET_ID = "project-assets";

function sanitizeFileName(name) {
  const raw = typeof name === "string" ? name : "asset.bin";
  return raw.replace(/[^a-zA-Z0-9._-]/g, "_");
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

    const body = await request.json().catch(() => ({}));
    const projectId = body?.projectId?.toString();
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId." }, { status: 400 });
    }

    const safeName = sanitizeFileName(body?.fileName);
    const contentType =
      typeof body?.contentType === "string" && body.contentType.trim()
        ? body.contentType
        : "application/octet-stream";

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const objectPath = `${user.id}/${projectId}/${Date.now()}-${safeName}`;
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.storage
      .from(BUCKET_ID)
      .createSignedUploadUrl(objectPath, {
        upsert: false,
      });

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to create signed upload URL." },
        { status: 500 }
      );
    }

    const { error: assetInsertError } = await supabase.from("project_assets").insert({
      project_id: projectId,
      owner_id: user.id,
      bucket_id: BUCKET_ID,
      object_path: objectPath,
      mime_type: contentType,
      metadata: {
        source: "signed-upload-url",
      },
    });

    if (assetInsertError) {
      return NextResponse.json(
        { error: "Failed to record asset metadata." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bucketId: BUCKET_ID,
      objectPath,
      token: data.token,
      signedUrl: data.signedUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected storage error." },
      { status: 500 }
    );
  }
}
