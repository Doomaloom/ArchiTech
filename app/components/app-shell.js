"use client";

import { ImageToSiteProvider } from "../_context/image-to-site-context";
import { InspireProvider } from "../_context/inspire-context";
import { WorkflowProvider } from "../_context/workflow-context";
import { useImageToSite } from "../_context/image-to-site-context";
import { useInspire } from "../_context/inspire-context";
import { useWorkflow } from "../_context/workflow-context";
import useProjectAutosave from "../_hooks/use-project-autosave";
import useImageToSiteState from "../_hooks/use-image-to-site-state";
import useInspireState from "../_hooks/use-inspire-state";
import SidebarRail from "./sidebar-rail";

function AppShellFrame({ children }) {
  const { workflowMode, inspireStep, setWorkflowMode, setInspireStep } =
    useWorkflow();
  const { state: imageState, actions: imageActions } = useImageToSite();
  const { state: inspireState, actions: inspireActions } = useInspire();
  useProjectAutosave({
    workflowMode,
    inspireStep,
    setWorkflowMode,
    setInspireStep,
    imageState,
    imageActions,
    inspireState,
    inspireActions,
  });

  return (
    <div className="app-shell">
      <SidebarRail />
      <main className="page-canvas">{children}</main>
    </div>
  );
}

export default function AppShell({ children }) {
  const model = useImageToSiteState();
  const inspireModel = useInspireState();

  return (
    <WorkflowProvider>
      <ImageToSiteProvider value={model}>
        <InspireProvider value={inspireModel}>
          <AppShellFrame>{children}</AppShellFrame>
        </InspireProvider>
      </ImageToSiteProvider>
    </WorkflowProvider>
  );
}
