"use client";

import { useImageToSite } from "../_context/image-to-site-context";
import { useWorkflow } from "../_context/workflow-context";

const ICONS = {
  home: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 11l8-6 8 6v8a2 2 0 01-2 2h-4v-5H10v5H6a2 2 0 01-2-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  image: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="2"
        ry="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle
        cx="9"
        cy="10"
        r="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M6 17l4-4 3 3 3-2 2 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  ),
  structure: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3l-4 5h2.5L7 12h2.5L6 16h12l-3.5-4H17l-3.5-4h2.5L12 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 16v4M10.5 20h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  preview: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 9.5v5M9.5 12h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  ),
  builder: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.8 15.6l-.8 3.6 3.6-.8L19 7.9a2 2 0 000-2.8l-1.9-1.9a2 2 0 00-2.8 0L4.8 15.6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13.4 4.6l3.9 3.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4 19l4.5-1.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  iterate: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20l4-1 9-9-3-3-9 9-1 4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13 5l3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  document: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="5"
        y="4"
        width="14"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 8h8M8 12h8M8 16h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  palette: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4a8 8 0 100 16c2 0 2.5-1.3 2.5-2.2 0-1-.8-1.8-.8-2.7 0-1 .8-1.8 1.8-1.8h2.2A8 8 0 0012 4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="7.5" cy="12.5" r="1" fill="currentColor" />
      <circle cx="11.5" cy="7.5" r="1" fill="currentColor" />
    </svg>
  ),
  sparkle: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4l1.8 4.2L18 10l-4.2 1.8L12 16l-1.8-4.2L6 10l4.2-1.8L12 4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const IMAGE_TO_SITE_BUTTONS = [
  {
    id: "image-upload",
    label: "Image upload and description",
    icon: "image",
    step: "start",
  },
  {
    id: "website-structure",
    label: "Website structure",
    icon: "structure",
    step: "nodes",
  },
  { id: "preview", label: "Preview", icon: "preview", step: "preview" },
  {
    id: "builder",
    label: "Iteration editor",
    icon: "builder",
    step: "builder",
  },
];

const INSPIRE_BUTTONS = [
  {
    id: "project-description",
    label: "Project description",
    icon: "document",
    step: "project-description",
  },
  { id: "style", label: "Style", icon: "palette", step: "style" },
  {
    id: "project-tree",
    label: "Project tree",
    icon: "structure",
    step: "project-tree",
  },
  { id: "previews", label: "Previews", icon: "preview", step: "previews" },
  {
    id: "inspire-workspace",
    label: "Inspire workspace",
    icon: "sparkle",
    step: "inspire-workspace",
  },
  {
    id: "builder",
    label: "Iteration editor",
    icon: "builder",
    step: "builder",
  },
];

const BUTTON_SETS = {
  "image-to-site": IMAGE_TO_SITE_BUTTONS,
  inspire: INSPIRE_BUTTONS,
};

export default function SidebarRail() {
  const { workflowMode, inspireStep, setWorkflowMode, setInspireStep } =
    useWorkflow();
  const { actions: imageToSiteActions } = useImageToSite();
  const buttonSets = BUTTON_SETS;
  const handleHomeClick = () => {
    if (workflowMode === "inspire") {
      setInspireStep("project-description");
      return;
    }
    imageToSiteActions.setViewMode("start");
  };

  return (
    <aside
      className="sidebar-rail"
      aria-label="Sidebar rail"
      data-workflow-mode={workflowMode}
    >
      <div className="sidebar-header">
        <button
          className="rail-button"
          type="button"
          onClick={handleHomeClick}
          aria-label="Home"
        >
          {ICONS.home}
        </button>
      </div>
      <div className="sidebar-body">
        <div className="sidebar-nav">
          <div className="rail-buttons" data-workflow-group="image-to-site">
            {buttonSets["image-to-site"].map((button) => (
              <button
                key={button.id}
                className="rail-button"
                type="button"
                aria-label={button.label}
                data-imageflow-step={button.step}
              >
                {ICONS[button.icon]}
              </button>
            ))}
          </div>
          <div className="rail-buttons" data-workflow-group="inspire">
            {buttonSets.inspire.map((button) => (
              <button
                key={button.id}
                className={`rail-button${
                  inspireStep === button.step ? " is-active" : ""
                }`}
                type="button"
                onClick={() => setInspireStep(button.step)}
                aria-label={button.label}
                aria-pressed={inspireStep === button.step}
                data-workflow-step={button.step}
              >
                {ICONS[button.icon]}
              </button>
            ))}
          </div>
        </div>
        <div className="sidebar-page-slot" id="sidebar-page-slot" />
        <div className="sidebar-footer">
          <div className="workflow-toggle-block">
            <button
              className="rail-button workflow-toggle-circle"
              type="button"
              onClick={() =>
                setWorkflowMode(
                  workflowMode === "image-to-site" ? "inspire" : "image-to-site"
                )
              }
              aria-pressed={workflowMode === "inspire"}
              aria-label={
                workflowMode === "image-to-site"
                  ? "Switch to Inspire workflow"
                  : "Switch to Image-to-Site workflow"
              }
            >
              {workflowMode === "image-to-site" ? ICONS.sparkle : ICONS.image}
            </button>
          </div>
          <div className="imageflow-sidebar-toggle-block">
            <span className="imageflow-sidebar-toggle-label">
              <span className="is-tools">Tools</span>
              <span className="is-nav">Nav</span>
            </span>
            <div className="imageflow-sidebar-toggle" aria-label="Sidebar mode">
              <input
                className="imageflow-sidebar-toggle-input"
                type="checkbox"
                id="imageflow-sidebar-toggle"
                aria-label="Toggle tools mode"
              />
              <label
                className="imageflow-sidebar-toggle-track"
                htmlFor="imageflow-sidebar-toggle"
              >
                <span className="imageflow-sidebar-toggle-dot" aria-hidden="true" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
