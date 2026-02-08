"use client";

import Link from "next/link";
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
import TopbarNav from "./topbar-nav";

function AppShellFrame({ children }) {
  const { workflowMode, inspireStep, setWorkflowMode, setInspireStep } =
    useWorkflow();
  const { state: imageState, actions: imageActions } = useImageToSite();
  const { state: inspireState, actions: inspireActions } = useInspire();
  const autosaveStatus = useProjectAutosave({
    workflowMode,
    inspireStep,
    setWorkflowMode,
    setInspireStep,
    imageState,
    imageActions,
    inspireState,
    inspireActions,
  });

  const autosaveLabel = autosaveStatus.error
    ? "Autosave error"
    : autosaveStatus.isHydrating
    ? "Loading project..."
    : autosaveStatus.lastSavedAt
    ? "Saved"
    : "Autosave ready";

  return (
    <div className="app-shell">
      <SidebarRail />
      <header className="topbar" aria-label="Top bar">
        <div className="topbar-content">
          <div className="topbar-spacer" aria-hidden="true" />
          <TopbarNav />
          <div className="topbar-actions" aria-label="Actions">
            <span
              className={`autosave-chip${autosaveStatus.error ? " is-error" : ""}`}
              role="status"
              aria-live="polite"
            >
              {autosaveLabel}
            </span>
            <button className="circle-button" type="button" aria-label="Search">
              <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  cx="11"
                  cy="11"
                  r="6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M16.5 16.5L20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button className="circle-button" type="button" aria-label="Alerts">
              <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M18 16H6l1.4-2.1V10a4.6 4.6 0 019.2 0v3.9L18 16z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="18.5" r="1.4" fill="currentColor" />
              </svg>
            </button>
            <Link className="circle-button" href="/auth/logout" aria-label="Log out">
              <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M10 6h-3a2 2 0 00-2 2v8a2 2 0 002 2h3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 16l4-4-4-4M18 12H9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </header>
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
