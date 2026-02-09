import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../_lib/supabase/server";

const DEFAULT_PROJECT_TITLE = "Untitled Project";
const VALID_WORKFLOWS = new Set(["inspire", "image-to-site"]);

function resolveWorkflow(value) {
  const candidate = value?.toString();
  return VALID_WORKFLOWS.has(candidate) ? candidate : "image-to-site";
}

function resolveProjectTitle(workflow) {
  if (workflow === "inspire") {
    return "Untitled Inspire Project";
  }
  if (workflow === "image-to-site") {
    return "Untitled Translate Project";
  }
  return DEFAULT_PROJECT_TITLE;
}

function buildInitialSnapshot(workflow) {
  return {
    version: 1,
    workflowMode: workflow,
    inspireStep: "project-description",
    imageToSite: {
      title: "",
      name: "",
      details: "",
      viewMode: "start",
      structureFlow: null,
      previewItems: [],
      previewCount: 3,
      selectedPreviewIndex: 0,
      builderHtml: "",
      showComponents: false,
      modelQuality: "flash",
      creativityValue: 40,
    },
    inspire: {
      brief: null,
      styleIdeas: [],
      selectedStyle: null,
      tree: null,
      selectedNodeId: null,
      previewItems: [],
      previewMode: "image",
      previewCount: 3,
      selectedPreviewIndex: 0,
      modelQuality: "flash",
      creativityValue: 45,
      workspaceNote: "",
      workspaceMask: null,
    },
  };
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
    const requestedProjectId = url.searchParams.get("projectId")?.toString() || "";
    const shouldCreate = url.searchParams.get("create") === "true";

    if (shouldCreate) {
      const workflow = resolveWorkflow(url.searchParams.get("workflow"));
      const snapshot = buildInitialSnapshot(workflow);
      const { data: createdProject, error: createError } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          title: resolveProjectTitle(workflow),
          latest_snapshot: snapshot,
        })
        .select("*")
        .single();

      if (createError || !createdProject) {
        return NextResponse.json(
          { error: "Failed to create project." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        project: createdProject,
        snapshot,
      });
    }

    let projectQuery = supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)
      .eq("is_archived", false);
    if (requestedProjectId) {
      projectQuery = projectQuery.eq("id", requestedProjectId);
    }

    const { data: existingProject, error: projectError } = await projectQuery
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (projectError) {
      return NextResponse.json(
        { error: "Failed to load project." },
        { status: 500 }
      );
    }

    if (!existingProject && requestedProjectId) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (!existingProject) {
      return NextResponse.json({
        project: null,
        snapshot: null,
      });
    }

    const { data: latestVersion, error: versionError } = await supabase
      .from("project_versions")
      .select("snapshot_json, version_number")
      .eq("project_id", existingProject.id)
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
      project: existingProject,
      snapshot: latestVersion?.snapshot_json ?? existingProject.latest_snapshot ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected bootstrap failure." },
      { status: 500 }
    );
  }
}
