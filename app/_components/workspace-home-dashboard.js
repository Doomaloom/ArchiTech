"use client";

import { useMemo, useState } from "react";
import ImageflowMenuBar from "./ImageflowMenuBar";

const PROJECT_FOLDERS = [
  {
    id: "proj-summit-banking",
    name: "Summit Banking Redesign",
    workflow: "inspire",
    owner: "Yassine",
    updatedAt: "2026-02-07T18:44:00.000Z",
    files: 18,
  },
  {
    id: "proj-aurora-launch",
    name: "Aurora Launch Site",
    workflow: "image-to-site",
    owner: "Design Team",
    updatedAt: "2026-02-07T13:12:00.000Z",
    files: 11,
  },
  {
    id: "proj-zen-garden",
    name: "Zen Garden Mobile Landing",
    workflow: "inspire",
    owner: "Marketing",
    updatedAt: "2026-02-06T20:20:00.000Z",
    files: 7,
  },
  {
    id: "proj-orbit-portal",
    name: "Orbit SaaS Portal",
    workflow: "image-to-site",
    owner: "Product",
    updatedAt: "2026-02-05T16:35:00.000Z",
    files: 24,
  },
  {
    id: "proj-lumen-commerce",
    name: "Lumen Commerce Refresh",
    workflow: "inspire",
    owner: "Growth",
    updatedAt: "2026-02-04T11:05:00.000Z",
    files: 14,
  },
  {
    id: "proj-vertex-pricing",
    name: "Vertex Pricing Pages",
    workflow: "image-to-site",
    owner: "Web Ops",
    updatedAt: "2026-02-03T08:22:00.000Z",
    files: 9,
  },
];

const formatUpdatedAt = (isoValue) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const toWorkflowLabel = (workflow) =>
  workflow === "inspire" ? "inspire" : "translate";

const toWorkflowClassName = (workflow) =>
  workflow === "inspire" ? "is-inspire" : "is-translate";

const toFileCountLabel = (count) => `${count} ${count === 1 ? "file" : "files"}`;

const toUpdatedBadgeLabel = (isoValue) =>
  `updated ${formatUpdatedAt(isoValue).toLowerCase()}`;

export default function WorkspaceHomeDashboard({
  onStartInspire,
  onStartTranslate,
  onOpenProject,
}) {
  const [searchValue, setSearchValue] = useState("");

  const filteredProjects = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const matchingProjects = PROJECT_FOLDERS.filter((project) => {
      if (!query) {
        return true;
      }
      return [
        project.name,
        project.owner,
        toWorkflowLabel(project.workflow),
        project.id,
      ].some((field) => field.toLowerCase().includes(query));
    });
    return matchingProjects.sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  }, [searchValue]);

  return (
    <div className="imageflow-shell workspace-home-shell">
      <div className="imageflow-panel workspace-home-panel">
        <ImageflowMenuBar />
        <section className="workspace-home-dashboard">
          <div className="workspace-home-left-column">
            <div className="workspace-home-launch-row">
              <button
                className="workspace-home-launch-card is-inspire"
                type="button"
                onClick={onStartInspire}
              >
                <span className="workspace-home-launch-kicker">Start with style</span>
                <h2>Inspire Workflow</h2>
                <p>
                  Build from intent first. Generate structured directions, style
                  systems, and polished concepts.
                </p>
              </button>
              <button
                className="workspace-home-launch-card is-translate"
                type="button"
                onClick={onStartTranslate}
              >
                <span className="workspace-home-launch-kicker">
                  Start from image
                </span>
                <h2>Translate Workflow</h2>
                <p>
                  Turn references into page structures, preview variants, and
                  editable layouts fast.
                </p>
              </button>
            </div>
            <div className="workspace-home-launch-empty" aria-hidden="true" />
          </div>

          <div className="workspace-home-files">
            <div className="workspace-home-files-header">
              <div>
                <p className="workspace-home-files-kicker">Existing files</p>
                <h3>Recent projects</h3>
                <p className="workspace-home-files-sort">Newest updates first</p>
              </div>
              <input
                className="workspace-home-search"
                type="search"
                placeholder="Search projects"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </div>
            <div className="workspace-home-list" role="list">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  className="workspace-home-list-item"
                  type="button"
                  onClick={() => onOpenProject?.(project)}
                  role="listitem"
                >
                  <span className="workspace-home-list-top">
                    <span className="workspace-home-project-cell">
                      <strong>{project.name}</strong>
                      <span>{project.id}</span>
                    </span>
                    <span className="workspace-home-list-badges">
                      <span
                        className={`workspace-home-workflow-pill ${toWorkflowClassName(
                          project.workflow
                        )}`}
                      >
                        {toWorkflowLabel(project.workflow)}
                      </span>
                      <span className="workspace-home-date-pill">
                        {toUpdatedBadgeLabel(project.updatedAt)}
                      </span>
                    </span>
                  </span>
                  <span className="workspace-home-list-bottom">
                    <span className="workspace-home-list-meta">
                      <span className="workspace-home-list-text">{project.owner}</span>
                      <span className="workspace-home-list-dot" aria-hidden="true">
                        &middot;
                      </span>
                      <span className="workspace-home-list-text">
                        {toFileCountLabel(project.files)}
                      </span>
                    </span>
                    <span className="workspace-home-list-actions">
                      <span className="workspace-home-open-button">Open</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {!filteredProjects.length ? (
              <div className="workspace-home-empty">No projects matched your search.</div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
