import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../_lib/supabase/server";

const DEFAULT_PROJECT_TITLE = "Untitled Project";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existingProject, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (projectError) {
      return NextResponse.json(
        { error: "Failed to load project." },
        { status: 500 }
      );
    }

    let project = existingProject;
    if (!project) {
      const { data: createdProject, error: createError } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          title: DEFAULT_PROJECT_TITLE,
          latest_snapshot: null,
        })
        .select("*")
        .single();
      if (createError) {
        return NextResponse.json(
          { error: "Failed to create project." },
          { status: 500 }
        );
      }
      project = createdProject;
    }

    const { data: latestVersion, error: versionError } = await supabase
      .from("project_versions")
      .select("snapshot_json, version_number")
      .eq("project_id", project.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) {
      return NextResponse.json(
        { error: "Failed to load project version." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      project,
      snapshot: latestVersion?.snapshot_json ?? project.latest_snapshot ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected bootstrap failure." },
      { status: 500 }
    );
  }
}
