"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useImageToSite } from "./../_context/image-to-site-context";
import BuilderParamSlider from "./BuilderParamSlider";

const PencilIcon = (
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
);

const SquareIcon = (
  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
    <rect
      x="5"
      y="5"
      width="14"
      height="14"
      rx="2.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
);

const ClearIcon = (
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
);

const RestartIcon = (
  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 8.5V4h4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 6a7.5 7.5 0 111.2 9.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const LayersIcon = (
  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 9l8-4 8 4-8 4-8-4z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M4 15l8 4 8-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const BrushIcon = (
  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 7h16M4 12h16M4 17h16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <rect x="7" y="6" width="3" height="2" rx="0.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <rect x="14" y="11" width="3" height="2" rx="0.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <rect x="10" y="16" width="3" height="2" rx="0.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export default function BuilderSidebarRail({
  annotations,
  builderTuningValue,
  onBuilderTuningChange,
  onOpenLayers = () => {},
  onOpenStyles = () => {},
}) {
  const { state } = useImageToSite();
  const [slot, setSlot] = useState(null);

  useEffect(() => {
    setSlot(document.getElementById("sidebar-page-slot"));
  }, []);

  if (state.viewMode !== "builder" || !slot) {
    return null;
  }

  return createPortal(
    <div className="imageflow-sidebar-panel" aria-label="Builder tools">
      <div className="imageflow-sidebar-content">
          <div className="imageflow-sidebar-tools">
            <div className="imageflow-sidebar-tools-scroll">
              <div className="rail-buttons imageflow-sidebar-group">
                <button
                  className={`rail-button${
                  annotations.state.modeActive && annotations.state.tool === "pencil"
                    ? " is-active"
                    : ""
                }`}
                  type="button"
                  onClick={() => annotations.actions.selectTool("pencil")}
                  aria-pressed={
                    annotations.state.modeActive &&
                    annotations.state.tool === "pencil"
                  }
                  aria-label="Pencil overlay"
                >
                  {PencilIcon}
                </button>
                <button
                  className={`rail-button${
                    annotations.state.modeActive &&
                    annotations.state.tool === "rect"
                      ? " is-active"
                      : ""
                  }`}
                  type="button"
                  onClick={() => annotations.actions.selectTool("rect")}
                  aria-pressed={
                    annotations.state.modeActive &&
                    annotations.state.tool === "rect"
                  }
                  aria-label="Square overlay"
                >
                  {SquareIcon}
                </button>
                <button
                  className={`rail-button${
                    annotations.state.modeActive &&
                    annotations.state.tool === "clear"
                      ? " is-active"
                      : ""
                  }`}
                  type="button"
                  onClick={() => annotations.actions.selectTool("clear")}
                  aria-pressed={
                    annotations.state.modeActive &&
                    annotations.state.tool === "clear"
                  }
                  aria-label="Clear annotations"
                >
                  {ClearIcon}
                </button>
              </div>
              <BuilderParamSlider
                value={builderTuningValue ?? state.builderTuningValue ?? 50}
                min={0}
                max={100}
                onChange={onBuilderTuningChange}
                label="Creativity"
              />
              <div className="rail-buttons imageflow-sidebar-group">
                <button
                  className={`rail-button${
                    annotations.state.modeActive &&
                    annotations.state.tool === "restart"
                      ? " is-active"
                      : ""
                  }`}
                  type="button"
                  onClick={() => annotations.actions.selectTool("restart")}
                  aria-pressed={
                    annotations.state.modeActive &&
                    annotations.state.tool === "restart"
                  }
                  aria-label="Restart overlay"
                >
                  {RestartIcon}
                </button>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <button
                    className="rail-button"
                    type="button"
                    onClick={onOpenLayers}
                    aria-label="Open layers"
                  >
                    {LayersIcon}
                  </button>
                  <button
                    className="rail-button"
                    type="button"
                    onClick={onOpenStyles}
                    aria-label="Open styles"
                  >
                    {BrushIcon}
                  </button>
                </div>
              </div>
            </div>
          </div>
        <div className="imageflow-sidebar-divider imageflow-sidebar-divider-spacer" />
      </div>
    </div>,
    slot
  );
}
