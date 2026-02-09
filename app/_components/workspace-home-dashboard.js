"use client";

import { useMemo, useState } from "react";
import ImageflowMenuBar from "./ImageflowMenuBar";

const DEFAULT_PROJECT_TITLE = "Untitled Project";

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

const toProjectName = (project) =>
  project?.name?.toString().trim() || DEFAULT_PROJECT_TITLE;

const normalizeProjects = (projects) => {
  if (!Array.isArray(projects)) {
    return [];
  }
  return projects.map((project) => ({
    id: project?.id?.toString() || "",
    name: toProjectName(project),
    owner: project?.owner?.toString().trim() || "You",
    workflow: project?.workflow === "inspire" ? "inspire" : "image-to-site",
    updatedAt: project?.updatedAt || null,
    files: Number(project?.files) > 0 ? Number(project.files) : 1,
    description: project?.description?.toString() || "",
  }));
};

export default function WorkspaceHomeDashboard({
  projects,
  onCreateProject,
  onStartInspire,
  onStartTranslate,
  onOpenProject,
}) {
  const [searchValue, setSearchValue] = useState("");
  const [isWorkflowPickerOpen, setIsWorkflowPickerOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createError, setCreateError] = useState("");

  const allProjects = useMemo(() => normalizeProjects(projects), [projects]);

  const filteredProjects = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const matchingProjects = allProjects.filter((project) => {
      if (!query) {
        return true;
      }
      return [
        project.name,
        project.owner,
        project.description,
        toWorkflowLabel(project.workflow),
        project.id,
      ].some((field) => field.toLowerCase().includes(query));
    });
    return matchingProjects.sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  }, [allProjects, searchValue]);

  const handleToggleWorkflowPicker = () => {
    if (isCreatingProject) {
      return;
    }
    setCreateError("");
    setIsWorkflowPickerOpen((current) => !current);
  };

  const handleCreateWithWorkflow = async (workflow) => {
    if (!onCreateProject || isCreatingProject) {
      return;
    }
    setIsCreatingProject(true);
    setCreateError("");
    try {
      await onCreateProject(workflow);
      setIsWorkflowPickerOpen(false);
    } catch (error) {
      setCreateError(error?.message || "Failed to create project.");
    } finally {
      setIsCreatingProject(false);
    }
  };

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
                <span className="workspace-home-launch-kicker">Start from image</span>
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
                <p className="workspace-home-files-kicker">Existing projects</p>
                <h3>Recent projects</h3>
                <p className="workspace-home-files-sort">Newest updates first</p>
              </div>
              <div className="workspace-home-files-actions">
                <input
                  className="workspace-home-search"
                  type="search"
                  placeholder="Search projects"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
                <button
                  className="workspace-home-create-button"
                  type="button"
                  onClick={handleToggleWorkflowPicker}
                  disabled={isCreatingProject}
                >
                  {isWorkflowPickerOpen ? "Close" : "Create Project"}
                </button>
              </div>
            </div>

            {isWorkflowPickerOpen ? (
              <div className="workspace-home-create-picker" role="group">
                <p>Choose a workflow for your new project.</p>
                <div className="workspace-home-create-picker-actions">
                  <button
                    className="workspace-home-create-option is-inspire"
                    type="button"
                    onClick={() => handleCreateWithWorkflow("inspire")}
                    disabled={isCreatingProject}
                  >
                    {isCreatingProject ? "Creating..." : "Inspire"}
                  </button>
                  <button
                    className="workspace-home-create-option is-translate"
                    type="button"
                    onClick={() => handleCreateWithWorkflow("image-to-site")}
                    disabled={isCreatingProject}
                  >
                    {isCreatingProject ? "Creating..." : "Translate"}
                  </button>
                </div>
              </div>
            ) : null}

            {createError ? (
              <p className="workspace-home-create-error">{createError}</p>
            ) : null}

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
              <div className="workspace-home-empty">
                {allProjects.length
                  ? "No projects matched your search."
                  : "No projects yet. Create a project to get started."}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
