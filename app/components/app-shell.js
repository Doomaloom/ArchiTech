"use client";

import { ImageToSiteProvider } from "../_context/image-to-site-context";
import { WorkflowProvider } from "../_context/workflow-context";
import useImageToSiteState from "../_hooks/use-image-to-site-state";
import SidebarRail from "./sidebar-rail";
import TopbarNav from "./topbar-nav";

export default function AppShell({ children }) {
  const model = useImageToSiteState();

  return (
    <WorkflowProvider>
      <ImageToSiteProvider value={model}>
        <div className="app-shell">
          <SidebarRail />
          <header className="topbar" aria-label="Top bar">
            <div className="topbar-content">
              <div className="topbar-spacer" aria-hidden="true" />
              <TopbarNav />
              <div className="topbar-actions" aria-label="Actions">
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
                <button className="circle-button" type="button" aria-label="Profile">
                  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <circle
                      cx="12"
                      cy="8"
                      r="3.6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M5 19.5a7 7 0 0114 0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </header>
          <main className="page-canvas">{children}</main>
        </div>
      </ImageToSiteProvider>
    </WorkflowProvider>
  );
}
