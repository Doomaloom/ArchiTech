"use client";

import { useEffect, useMemo, useState } from "react";

const ACTIVE_JOB_STATUSES = new Set(["queued", "running", "fixing"]);

function normalizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed || fallback;
}

function slugify(value, fallback = "page") {
  const slug = normalizeText(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function getTreeChildren(node) {
  if (!node || typeof node !== "object") {
    return [];
  }
  if (Array.isArray(node.children)) {
    return node.children;
  }
  if (Array.isArray(node.items)) {
    return node.items;
  }
  if (Array.isArray(node.pages)) {
    return node.pages;
  }
  if (Array.isArray(node.nodes)) {
    return node.nodes;
  }
  return [];
}

function normalizeTreeRoot(tree) {
  if (!tree || typeof tree !== "object") {
    return null;
  }
  if (tree.root && typeof tree.root === "object") {
    return tree.root;
  }
  if (tree.tree && typeof tree.tree === "object") {
    return tree.tree;
  }
  return tree;
}

function collectPagesFromTree(root, source) {
  if (!root) {
    return [];
  }
  const topLevel = getTreeChildren(root);
  const pages = (topLevel.length ? topLevel : [root]).map((node, index) => {
    const id = normalizeText(node?.id, `${source}-page-${index + 1}`);
    const name = normalizeText(node?.label || node?.name, `Page ${index + 1}`);
    const route = node?.route
      ? normalizeText(node.route, "/")
      : index === 0
      ? "/"
      : `/${slugify(id || name, `page-${index + 1}`)}`;
    const notes = normalizeText(node?.description || node?.summary, "");
    const actions = Array.isArray(node?.requirements)
      ? node.requirements.map((entry) => normalizeText(entry)).filter(Boolean)
      : [];
    return {
      pageId: id,
      name,
      route,
      notes,
      actions,
      treeNode: node,
      source,
    };
  });
  return pages;
}

function dedupePages(pages) {
  const seenRoutes = new Set();
  const deduped = [];
  for (const page of pages) {
    const route = normalizeText(page.route, "/");
    if (seenRoutes.has(route)) {
      continue;
    }
    seenRoutes.add(route);
    deduped.push({ ...page, route });
  }
  return deduped;
}

function collectPreviewOptions(snapshot) {
  const options = [];
  const pushPreview = (preview, source, index) => {
    const html = normalizeText(preview?.html);
    if (!html) {
      return;
    }
    options.push({
      id: `${source}-${index + 1}`,
      label: `${source} preview ${index + 1}`,
      html,
      source,
    });
  };

  const imagePreviews = Array.isArray(snapshot?.imageToSite?.previewItems)
    ? snapshot.imageToSite.previewItems
    : [];
  const inspirePreviews = Array.isArray(snapshot?.inspire?.previewItems)
    ? snapshot.inspire.previewItems
    : [];

  imagePreviews.forEach((preview, index) => pushPreview(preview, "image", index));
  inspirePreviews.forEach((preview, index) => pushPreview(preview, "inspire", index));

  const builderHtml = normalizeText(snapshot?.imageToSite?.builderHtml);
  if (builderHtml) {
    options.push({
      id: "builder-html",
      label: "Builder HTML",
      html: builderHtml,
      source: "builder",
    });
  }

  return options;
}

function buildGenerationPages(pages, selectedPreviewByPage, previewOptionsById) {
  return pages.map((page, index) => {
    const selectedPreviewId = selectedPreviewByPage[page.pageId];
    const selectedPreview = previewOptionsById[selectedPreviewId];
    const html = selectedPreview?.html || "";
    return {
      pageId: page.pageId || `page-${index + 1}`,
      route: page.route || (index === 0 ? "/" : `/page-${index + 1}`),
      name: page.name || `Page ${index + 1}`,
      treeNode: page.treeNode || null,
      selectedPreviewHtml: html,
      actions: Array.isArray(page.actions) ? page.actions : [],
      notes: page.notes || "",
    };
  });
}

export default function BuildFlow() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectId, setProjectId] = useState("");
  const [brief, setBrief] = useState({});
  const [style, setStyle] = useState({});
  const [globalNotes, setGlobalNotes] = useState("");
  const [pages, setPages] = useState([]);
  const [previewOptions, setPreviewOptions] = useState([]);
  const [selectedPreviewByPage, setSelectedPreviewByPage] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState(null);
  const [jobError, setJobError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const previewOptionsById = useMemo(() => {
    return previewOptions.reduce((accumulator, option) => {
      accumulator[option.id] = option;
      return accumulator;
    }, {});
  }, [previewOptions]);

  useEffect(() => {
    let isCancelled = false;
    async function loadSnapshot() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/projects/bootstrap", {
          method: "GET",
          cache: "no-store",
        });
        if (response.status === 401) {
          window.location.assign("/login?next=%2Fbuild");
          return;
        }
        if (!response.ok) {
          throw new Error("Failed to load project snapshot.");
        }
        const payload = await response.json();
        if (isCancelled) {
          return;
        }

        const snapshot = payload?.snapshot || {};
        setProjectId(normalizeText(payload?.project?.id));
        setBrief(snapshot?.inspire?.brief || {});
        setStyle(snapshot?.inspire?.selectedStyle || {});
        setGlobalNotes(normalizeText(snapshot?.inspire?.workspaceNote || ""));

        const inspireRoot = normalizeTreeRoot(snapshot?.inspire?.tree);
        const imageRoot = normalizeTreeRoot(snapshot?.imageToSite?.structureFlow);
        const inferredPages = dedupePages([
          ...collectPagesFromTree(inspireRoot, "inspire"),
          ...collectPagesFromTree(imageRoot, "image-to-site"),
        ]);

        const pageFallback = inferredPages.length
          ? inferredPages
          : [
              {
                pageId: "home",
                name: "Home",
                route: "/",
                notes: "",
                actions: [],
                treeNode: null,
                source: "fallback",
              },
            ];
        setPages(pageFallback);

        const options = collectPreviewOptions(snapshot);
        setPreviewOptions(options);

        const firstOptionId = options[0]?.id || "";
        const initialSelection = {};
        for (const page of pageFallback) {
          initialSelection[page.pageId] = firstOptionId;
        }
        setSelectedPreviewByPage(initialSelection);

        if (!options.length) {
          setError("No HTML previews found. Generate HTML previews before building.");
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError?.message || "Failed to load build context.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }
    loadSnapshot();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!jobId) {
      return undefined;
    }
    let isCancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/agentic/jobs/${jobId}`, {
          method: "GET",
          cache: "no-store",
        });
        if (response.status === 401) {
          window.location.assign("/login?next=%2Fbuild");
          return;
        }
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (!isCancelled) {
            setJobError(payload?.error || "Failed to load job status.");
          }
          return;
        }
        if (!isCancelled) {
          setJob(payload?.job || null);
          setJobError("");
        }
      } catch (pollError) {
        if (!isCancelled) {
          setJobError(pollError?.message || "Failed to poll job status.");
        }
      }
    };

    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [jobId]);

  const canSubmit = useMemo(() => {
    if (!projectId || !pages.length || !previewOptions.length || isSubmitting) {
      return false;
    }
    return pages.every((page) => {
      const selectedId = selectedPreviewByPage[page.pageId];
      return Boolean(selectedId && previewOptionsById[selectedId]?.html);
    });
  }, [
    isSubmitting,
    pages,
    previewOptions.length,
    previewOptionsById,
    projectId,
    selectedPreviewByPage,
  ]);

  const isJobActive = Boolean(job && ACTIVE_JOB_STATUSES.has(job.status));
  const isJobComplete = Boolean(
    job &&
      (job.status === "completed" || job.status === "completed_with_warnings")
  );

  const handleSelectPreview = (pageId, previewId) => {
    setSelectedPreviewByPage((current) => ({
      ...current,
      [pageId]: previewId,
    }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    setJobError("");
    try {
      const generationPages = buildGenerationPages(
        pages,
        selectedPreviewByPage,
        previewOptionsById
      );
      const response = await fetch("/api/agentic/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          generationSpec: {
            brief,
            style,
            globalNotes,
            pages: generationPages,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to start generation job.");
      }
      const nextJobId = normalizeText(payload?.job?.id);
      if (!nextJobId) {
        throw new Error("Job id missing from response.");
      }
      setJobId(nextJobId);
      setJob(payload?.job || null);
    } catch (submitError) {
      setJobError(submitError?.message || "Failed to start generation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!jobId || isDownloading) {
      return;
    }
    setIsDownloading(true);
    setJobError("");
    try {
      const response = await fetch(`/api/agentic/jobs/${jobId}/download`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to prepare download.");
      }
      if (!payload?.url) {
        throw new Error("Signed URL was missing.");
      }
      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setJobError(downloadError?.message || "Failed to download artifact.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="build-shell">
      <section className="build-panel">
        <div className="build-header">
          <p className="build-kicker">Build App</p>
          <h1>Select one HTML preview per page.</h1>
          <p>
            The backend agent uses these selected previews, your brief, style, and notes to
            generate a full Next.js app.
          </p>
        </div>

        {isLoading ? <p className="build-status">Loading build context...</p> : null}
        {error ? <p className="build-error">{error}</p> : null}

        {!isLoading && !error ? (
          <div className="build-page-list">
            {pages.map((page) => {
              const selectedId = selectedPreviewByPage[page.pageId];
              const selectedOption = previewOptionsById[selectedId];
              return (
                <article key={page.pageId} className="build-page-card">
                  <div className="build-page-head">
                    <div>
                      <strong>{page.name}</strong>
                      <span>{page.route}</span>
                    </div>
                    <select
                      className="build-select"
                      value={selectedId || ""}
                      onChange={(event) =>
                        handleSelectPreview(page.pageId, event.target.value)
                      }
                    >
                      {previewOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="build-page-meta">
                    {page.notes || "No page notes."}
                    {page.actions.length ? ` Actions: ${page.actions.join(", ")}` : ""}
                  </p>
                  <div className="build-preview-wrap">
                    {selectedOption?.html ? (
                      <iframe
                        title={`${page.name} preview`}
                        srcDoc={selectedOption.html}
                        sandbox=""
                        className="build-preview-frame"
                      />
                    ) : (
                      <div className="build-preview-empty">No preview selected.</div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        <div className="build-actions">
          <button
            type="button"
            className="build-button"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Starting..." : "Generate App"}
          </button>
          {isJobComplete ? (
            <button
              type="button"
              className="build-button is-secondary"
              disabled={isDownloading}
              onClick={handleDownload}
            >
              {isDownloading ? "Preparing Download..." : "Download ZIP"}
            </button>
          ) : null}
        </div>

        {job ? (
          <div className="build-job-card">
            <strong>Job {job.id}</strong>
            <span>Status: {job.status}</span>
            <span>Stage: {job.currentStage || "n/a"}</span>
            {job.errorMessage ? <p className="build-error">{job.errorMessage}</p> : null}
            {isJobActive ? <p className="build-status">Job is running...</p> : null}
          </div>
        ) : null}
        {jobError ? <p className="build-error">{jobError}</p> : null}
      </section>
    </div>
  );
}
