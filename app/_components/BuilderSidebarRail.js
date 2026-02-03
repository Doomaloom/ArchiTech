"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useImageToSite } from "./../_context/image-to-site-context";

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
      x="6"
      y="6"
      width="12"
      height="12"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
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

export default function BuilderSidebarRail({ annotations }) {
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
              </div>
            </div>
          </div>
        <div className="imageflow-sidebar-divider imageflow-sidebar-divider-spacer" />
      </div>
    </div>,
    slot
  );
}
