import AppShell from "./components/app-shell";
import LandingPage from "./_components/landing-page";
import WorkspaceHome from "./_components/workspace-home";
import { createServerSupabaseClient } from "./_lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_PROJECT_TITLE = "Untitled Project";

function resolveProjectWorkflow(project) {
  return project?.latest_snapshot?.workflowMode === "inspire"
    ? "inspire"
    : "image-to-site";
}

function estimateProjectFiles(project) {
  const imagePreviews = Array.isArray(project?.latest_snapshot?.imageToSite?.previewItems)
    ? project.latest_snapshot.imageToSite.previewItems.length
    : 0;
  const inspirePreviews = Array.isArray(project?.latest_snapshot?.inspire?.previewItems)
    ? project.latest_snapshot.inspire.previewItems.length
    : 0;
  return Math.max(imagePreviews, inspirePreviews, 1);
}

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingPage />;
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, description, updated_at, latest_snapshot")
    .eq("owner_id", user.id)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  const owner =
    user.user_metadata?.full_name?.toString().trim() ||
    user.email?.split("@")[0] ||
    "You";

  const projectList = Array.isArray(projects)
    ? projects.map((project) => ({
        id: project.id,
        name: project.title?.toString().trim() || DEFAULT_PROJECT_TITLE,
        description: project.description?.toString() || "",
        workflow: resolveProjectWorkflow(project),
        owner,
        updatedAt: project.updated_at,
        files: estimateProjectFiles(project),
      }))
    : [];

  return (
    <AppShell>
      <WorkspaceHome projects={projectList} />
    </AppShell>
  );
}
