"use client";

import { useRouter } from "next/navigation";
import InspireView from "./InspireView";
import ImageToSiteView from "./ImageToSiteView";
import WorkspaceHomeDashboard from "./workspace-home-dashboard";
import { useImageToSite } from "../_context/image-to-site-context";
import { useWorkflow } from "../_context/workflow-context";

const WORKFLOW_IMAGE_TO_SITE = "image-to-site";

function resolveWorkflow(workflow) {
  return workflow === "inspire" ? "inspire" : WORKFLOW_IMAGE_TO_SITE;
}

export default function WorkspaceHome({ projects = [] }) {
  const router = useRouter();
  const { workflowMode, setWorkflowMode, setInspireStep } = useWorkflow();
  const { actions: imageActions } = useImageToSite();

  const handleStartInspire = () => {
    setInspireStep("project-description");
    setWorkflowMode("inspire");
  };

  const handleStartTranslate = () => {
    imageActions.setViewMode("start");
    setWorkflowMode(WORKFLOW_IMAGE_TO_SITE);
  };

  const handleOpenProject = (project) => {
    if (!project?.id) {
      return;
    }
    if (resolveWorkflow(project.workflow) === "inspire") {
      handleStartInspire();
    } else {
      handleStartTranslate();
    }
    router.push(`/?projectId=${encodeURIComponent(project.id)}`);
  };

  const handleCreateProject = async (workflow) => {
    const nextWorkflow = resolveWorkflow(workflow);
    const params = new URLSearchParams({
      create: "true",
      workflow: nextWorkflow,
    });
    const response = await fetch(`/api/projects/bootstrap?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
    if (response.status === 401) {
      window.location.assign("/login?next=%2F");
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Failed to create project.");
    }
    const projectId = payload?.project?.id?.toString();
    if (!projectId) {
      throw new Error("Project id was missing from create response.");
    }
    if (nextWorkflow === "inspire") {
      handleStartInspire();
    } else {
      handleStartTranslate();
    }
    router.push(`/?projectId=${encodeURIComponent(projectId)}`);
  };

  if (workflowMode === "inspire") {
    return <InspireView />;
  }
  if (workflowMode === "home") {
    return (
      <WorkspaceHomeDashboard
        onStartInspire={handleStartInspire}
        onStartTranslate={handleStartTranslate}
        projects={projects}
        onCreateProject={handleCreateProject}
        onOpenProject={handleOpenProject}
      />
    );
  }

  return <ImageToSiteView />;
}
