import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../_lib/supabase/server";

const DEFAULT_PROJECT_TITLE = "Untitled Project";

function resolveTitle(snapshot) {
  const imageTitle = snapshot?.imageToSite?.title?.toString().trim();
  if (imageTitle) {
    return imageTitle;
  }
  const briefTitle = snapshot?.inspire?.brief?.title?.toString().trim();
  if (briefTitle) {
    return briefTitle;
  }
  return DEFAULT_PROJECT_TITLE;
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
    const snapshot = body?.snapshot;
    const requestedProjectId = body?.projectId?.toString() || null;
    const createVersion = Boolean(body?.createVersion);

    if (!snapshot || typeof snapshot !== "object") {
      return NextResponse.json({ error: "Invalid snapshot." }, { status: 400 });
    }

    let project = null;
    if (requestedProjectId) {
      const { data: existingProject, error: fetchProjectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", requestedProjectId)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (fetchProjectError) {
        return NextResponse.json(
          { error: "Failed to load project." },
          { status: 500 }
        );
      }
      project = existingProject;
    }

    if (!project) {
      const { data: latestProject, error: latestError } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) {
        return NextResponse.json(
          { error: "Failed to resolve project." },
          { status: 500 }
        );
      }
      project = latestProject;
    }

    const title = resolveTitle(snapshot);

    if (!project) {
      const { data: createdProject, error: createProjectError } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          title,
          latest_snapshot: snapshot,
        })
        .select("*")
        .single();

      if (createProjectError) {
        return NextResponse.json(
          { error: "Failed to create project." },
          { status: 500 }
        );
      }
      project = createdProject;
    } else {
      const { data: updatedProject, error: updateProjectError } = await supabase
        .from("projects")
        .update({
          title,
          latest_snapshot: snapshot,
        })
        .eq("id", project.id)
        .eq("owner_id", user.id)
        .select("*")
        .single();

      if (updateProjectError) {
        return NextResponse.json(
          { error: "Failed to update project." },
          { status: 500 }
        );
      }
      project = updatedProject;
    }

    if (createVersion) {
      const { data: versionData, error: versionError } = await supabase
        .from("project_versions")
        .select("version_number")
        .eq("project_id", project.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (versionError) {
        return NextResponse.json(
          { error: "Failed to resolve version number." },
          { status: 500 }
        );
      }

      const nextVersion = (versionData?.version_number ?? 0) + 1;

      const { error: createVersionError } = await supabase
        .from("project_versions")
        .insert({
          project_id: project.id,
          version_number: nextVersion,
          snapshot_json: snapshot,
          source: "autosave",
          summary: "Autosave snapshot",
        });

      if (createVersionError) {
        return NextResponse.json(
          { error: "Failed to create version." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      projectId: project.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected autosave failure." },
      { status: 500 }
    );
  }
}
