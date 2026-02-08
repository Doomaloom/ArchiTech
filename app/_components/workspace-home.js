"use client";

import InspireView from "./InspireView";
import ImageToSiteView from "./ImageToSiteView";
import WorkspaceHomeDashboard from "./workspace-home-dashboard";
import { useImageToSite } from "../_context/image-to-site-context";
import { useWorkflow } from "../_context/workflow-context";

export default function WorkspaceHome() {
  const { workflowMode, setWorkflowMode, setInspireStep } = useWorkflow();
  const { actions: imageActions } = useImageToSite();

  const handleStartInspire = () => {
    setInspireStep("project-description");
    setWorkflowMode("inspire");
  };

  const handleStartTranslate = () => {
    imageActions.setViewMode("start");
    setWorkflowMode("image-to-site");
  };

  const handleOpenProject = (project) => {
    if (project?.workflow === "inspire") {
      handleStartInspire();
      return;
    }
    handleStartTranslate();
  };

  if (workflowMode === "inspire") {
    return <InspireView />;
  }
  if (workflowMode === "home") {
    return (
      <WorkspaceHomeDashboard
        onStartInspire={handleStartInspire}
        onStartTranslate={handleStartTranslate}
        onOpenProject={handleOpenProject}
      />
    );
  }

  return <ImageToSiteView />;
}
