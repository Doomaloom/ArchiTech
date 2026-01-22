"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { DEFAULT_ITERATION_TOOL, ITERATION_TOOL_CONFIG } from "../_lib/iteration-tools";
import { useImageToSite } from "../_context/image-to-site-context";

const TOOL_ICONS = {
  cursor: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 4l7 16 2.5-6L20 12 5 4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  pan: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4v16M4 12h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 4l-2.5 2.5M12 4l2.5 2.5M12 20l-2.5-2.5M12 20l2.5-2.5M4 12l2.5-2.5M4 12l2.5 2.5M20 12l-2.5-2.5M20 12l-2.5 2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  zoom: (
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
        d="M11 8v6M8 11h6M16.5 16.5l3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  text: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 6h12M12 6v12M8 18h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  pencil: (
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
  note: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 6h14v9H8l-3 3V6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  highlight: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 14l4 4 8-8-4-4-8 8zM4 20h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  delete: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5h6v2M9 11v6M12 11v6M15 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  transform: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  ),
  layers: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4l8 4-8 4-8-4 8-4zM4 12l8 4 8-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  patch: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 6h14v12H5zM8 9h8M8 12h8M8 15h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  regenerate: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 12a8 8 0 11-2.3-5.7M20 4v6h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  grid: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="5"
        y="5"
        width="6"
        height="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="13"
        y="5"
        width="6"
        height="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="5"
        y="13"
        width="6"
        height="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="13"
        y="13"
        width="6"
        height="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  ),
  guides: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4v16M4 12h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  ),
  snapGrid: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 5v5a5 5 0 0010 0V5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M5 16h6M5 19h6M5 16v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  snapGuides: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 5v5a5 5 0 0010 0V5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4 16h8M8 12v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  guideVertical: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4v16M6 8h4M8 6v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  guideHorizontal: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 12h16M8 6v4M6 8h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  guidesClear: (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 7l10 10M17 7L7 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export default function IterationSidebarRail() {
  const { state, derived, actions } = useImageToSite();
  const [slot, setSlot] = useState(null);

  useEffect(() => {
    setSlot(document.getElementById("sidebar-page-slot"));
  }, []);

  const highlightActive =
    state.selectedElementId &&
    state.highlightedIds?.includes(state.selectedElementId);

  if (!derived.isIterationMode || !slot) {
    return null;
  }

  return createPortal(
    <div className="imageflow-sidebar-panel" aria-label="Iteration tools">
      <div className="imageflow-sidebar-content">
        <div className="imageflow-sidebar-tools">
          <div className="imageflow-sidebar-tools-scroll">
            <div className="rail-buttons imageflow-sidebar-group">
              {ITERATION_TOOL_CONFIG.map((tool) => (
                <button
                  key={tool.id}
                  className={`rail-button${
                    state.iterationTool === tool.id ? " is-active" : ""
                  }`}
                  type="button"
                  onClick={() => actions.setIterationTool(tool.id)}
                  aria-pressed={state.iterationTool === tool.id}
                  aria-label={tool.ariaLabel}
                >
                  {TOOL_ICONS[tool.id] ?? null}
                </button>
              ))}
            </div>
            <div className="imageflow-sidebar-divider" />
            <div className="rail-buttons imageflow-sidebar-group">
              <button
                className={`rail-button${highlightActive ? " is-active" : ""}`}
                type="button"
                onClick={actions.handleToggleHighlight}
                disabled={!state.selectedElementId}
                aria-pressed={Boolean(highlightActive)}
                aria-label="Toggle highlight"
              >
                {TOOL_ICONS.highlight}
              </button>
              <button
                className="rail-button"
                type="button"
                onClick={actions.handleDeleteSelection}
                disabled={!state.selectedElementIds.length}
                aria-label="Delete selection"
              >
                {TOOL_ICONS.delete}
              </button>
              <button
                className={`rail-button${
                  state.showTransformControls ? " is-active" : ""
                }`}
                type="button"
                onClick={() =>
                  actions.setShowTransformControls((current) => !current)
                }
                aria-pressed={state.showTransformControls}
                aria-label="Toggle transform controls"
              >
                {TOOL_ICONS.transform}
              </button>
              <button
                className={`rail-button${state.showLayers ? " is-active" : ""}`}
                type="button"
                onClick={() => actions.setShowLayers((current) => !current)}
                aria-pressed={state.showLayers}
                aria-label="Toggle layers panel"
              >
                {TOOL_ICONS.layers}
              </button>
              <button
                className={`rail-button${state.showPatch ? " is-active" : ""}`}
                type="button"
                onClick={() => actions.setShowPatch((current) => !current)}
                aria-label="Toggle patch payload"
              >
                {TOOL_ICONS.patch}
              </button>
              <button
                className="rail-button"
                type="button"
                onClick={() => {
                  actions.setViewMode("preview");
                  actions.setIterationTool(DEFAULT_ITERATION_TOOL);
                }}
                aria-label="Regenerate"
              >
                {TOOL_ICONS.regenerate}
              </button>
            </div>
            <div className="imageflow-sidebar-divider" />
            <div className="rail-buttons imageflow-sidebar-group">
              <button
                className={`rail-button${state.showGrid ? " is-active" : ""}`}
                type="button"
                onClick={() => actions.setShowGrid((current) => !current)}
                aria-pressed={state.showGrid}
                aria-label="Toggle grid"
              >
                {TOOL_ICONS.grid}
              </button>
              <button
                className={`rail-button${state.snapToGrid ? " is-active" : ""}`}
                type="button"
                onClick={() => actions.setSnapToGrid((current) => !current)}
                aria-pressed={state.snapToGrid}
                aria-label="Toggle grid snapping"
              >
                {TOOL_ICONS.snapGrid}
              </button>
              <button
                className={`rail-button${state.showGuides ? " is-active" : ""}`}
                type="button"
                onClick={() => actions.setShowGuides((current) => !current)}
                aria-pressed={state.showGuides}
                aria-label="Toggle guides"
              >
                {TOOL_ICONS.guides}
              </button>
              <button
                className={`rail-button${state.snapToGuides ? " is-active" : ""}`}
                type="button"
                onClick={() => actions.setSnapToGuides((current) => !current)}
                aria-pressed={state.snapToGuides}
                aria-label="Toggle guide snapping"
              >
                {TOOL_ICONS.snapGuides}
              </button>
              <button
                className="rail-button"
                type="button"
                onClick={() => actions.handleAddGuide("vertical")}
                aria-label="Add vertical guide"
              >
                {TOOL_ICONS.guideVertical}
              </button>
              <button
                className="rail-button"
                type="button"
                onClick={() => actions.handleAddGuide("horizontal")}
                aria-label="Add horizontal guide"
              >
                {TOOL_ICONS.guideHorizontal}
              </button>
              <button
                className="rail-button"
                type="button"
                onClick={actions.handleClearGuides}
                aria-label="Clear guides"
              >
                {TOOL_ICONS.guidesClear}
              </button>
            </div>
          </div>
        </div>
        <div className="imageflow-sidebar-divider imageflow-sidebar-divider-spacer" />
      </div>
    </div>,
    slot
  );
}
