"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useImageToSite } from "../_context/image-to-site-context";
import { useInspire } from "../_context/inspire-context";
import { useWorkflow } from "../_context/workflow-context";

const ACTIVE_JOB_STATUSES = new Set(["queued", "running", "fixing"]);

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }
  const next = encodeURIComponent(window.location.pathname || "/");
  window.location.assign(`/login?next=${next}`);
}

function normalizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed || fallback;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function countHtmlPreviews(previewItems) {
  if (!Array.isArray(previewItems)) {
    return 0;
  }
  return previewItems.filter((entry) => normalizeText(entry?.html || "")).length;
}

function pickPreferredPreviewItems(serverItems, localItems) {
  const serverCount = countHtmlPreviews(serverItems);
  const localCount = countHtmlPreviews(localItems);
  if (localCount >= serverCount) {
    return Array.isArray(localItems) ? localItems : [];
  }
  return Array.isArray(serverItems) ? serverItems : [];
}

function scoreBrief(brief) {
  if (!isPlainObject(brief)) {
    return 0;
  }
  const keys = ["title", "name", "details", "audience", "goals"];
  return keys.reduce(
    (score, key) => score + (normalizeText(brief[key] || "") ? 1 : 0),
    0
  );
}

function scoreStyle(style) {
  if (!isPlainObject(style)) {
    return 0;
  }
  let score = 0;
  if (normalizeText(style.title || "")) {
    score += 1;
  }
  if (normalizeText(style.summary || "")) {
    score += 1;
  }
  if (Array.isArray(style.palette) && style.palette.length) {
    score += 1;
  }
  if (Array.isArray(style.tags) && style.tags.length) {
    score += 1;
  }
  return score;
}

function mergeSnapshotSources(serverSnapshot, localSnapshot) {
  const serverImage = isPlainObject(serverSnapshot?.imageToSite)
    ? serverSnapshot.imageToSite
    : {};
  const localImage = isPlainObject(localSnapshot?.imageToSite)
    ? localSnapshot.imageToSite
    : {};
  const serverInspire = isPlainObject(serverSnapshot?.inspire)
    ? serverSnapshot.inspire
    : {};
  const localInspire = isPlainObject(localSnapshot?.inspire)
    ? localSnapshot.inspire
    : {};

  const mergedImage = {
    ...serverImage,
    ...localImage,
    previewItems: pickPreferredPreviewItems(
      serverImage.previewItems,
      localImage.previewItems
    ),
    structureFlow: localImage.structureFlow || serverImage.structureFlow || null,
    builderHtml:
      normalizeText(localImage.builderHtml || "") ||
      normalizeText(serverImage.builderHtml || ""),
  };

  const localBriefScore = scoreBrief(localInspire.brief);
  const serverBriefScore = scoreBrief(serverInspire.brief);
  const localStyleScore = scoreStyle(localInspire.selectedStyle);
  const serverStyleScore = scoreStyle(serverInspire.selectedStyle);

  const mergedInspire = {
    ...serverInspire,
    ...localInspire,
    previewItems: pickPreferredPreviewItems(
      serverInspire.previewItems,
      localInspire.previewItems
    ),
    tree: localInspire.tree || serverInspire.tree || null,
    brief:
      localBriefScore >= serverBriefScore
        ? localInspire.brief || {}
        : serverInspire.brief || {},
    selectedStyle:
      localStyleScore >= serverStyleScore
        ? localInspire.selectedStyle || {}
        : serverInspire.selectedStyle || {},
    workspaceNote:
      normalizeText(localInspire.workspaceNote || "") ||
      normalizeText(serverInspire.workspaceNote || ""),
  };

  return {
    ...serverSnapshot,
    imageToSite: mergedImage,
    inspire: mergedInspire,
  };
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

function collectPagesForWorkflow(snapshot, workflowMode) {
  const preferInspire = workflowMode === "inspire";
  const inspireRoot = normalizeTreeRoot(snapshot?.inspire?.tree);
  const imageRoot = normalizeTreeRoot(snapshot?.imageToSite?.structureFlow);

  const primary = preferInspire
    ? collectPagesFromTree(inspireRoot, "inspire")
    : collectPagesFromTree(imageRoot, "image-to-site");
  if (primary.length) {
    return dedupePages(primary);
  }

  const fallback = preferInspire
    ? collectPagesFromTree(imageRoot, "image-to-site")
    : collectPagesFromTree(inspireRoot, "inspire");
  return dedupePages(fallback);
}

function collectHtmlPreviews(snapshot) {
  const imagePreviews = Array.isArray(snapshot?.imageToSite?.previewItems)
    ? snapshot.imageToSite.previewItems
    : [];
  const inspirePreviews = Array.isArray(snapshot?.inspire?.previewItems)
    ? snapshot.inspire.previewItems
    : [];
  const builderHtml = normalizeText(snapshot?.imageToSite?.builderHtml || "");

  const candidates = [];
  const pushPreview = (preview, source, index) => {
    const html = normalizeText(preview?.html || "");
    if (!html) {
      return;
    }
    candidates.push({
      id: normalizeText(preview?.id?.toString(), `${source}-${index + 1}`),
      source,
      html,
      pageId: normalizeText(preview?.pageId?.toString(), ""),
      route: normalizeText(preview?.route?.toString(), ""),
      pageName: normalizeText(
        preview?.pageName?.toString() || preview?.name?.toString(),
        ""
      ),
      notes: normalizeText(preview?.notes?.toString(), ""),
      actions: Array.isArray(preview?.actions) ? preview.actions : [],
    });
  };

  inspirePreviews.forEach((preview, index) =>
    pushPreview(preview, "inspire", index)
  );
  imagePreviews.forEach((preview, index) => pushPreview(preview, "image", index));

  if (builderHtml) {
    candidates.push({
      id: "builder-html",
      source: "builder",
      html: builderHtml,
      pageId: "",
      route: "",
      pageName: "",
      notes: "",
      actions: [],
    });
  }

  return candidates;
}

function buildPagePreviewMap(pages, snapshot) {
  const candidates = collectHtmlPreviews(snapshot).map((entry, index) => ({
    ...entry,
    candidateIndex: index,
  }));
  const used = new Set();
  const map = {};

  const pick = (predicate) => {
    const match = candidates.find(
      (candidate) =>
        !used.has(candidate.candidateIndex) && predicate(candidate)
    );
    if (!match) {
      return null;
    }
    used.add(match.candidateIndex);
    return match;
  };

  pages.forEach((page) => {
    let matched =
      pick((candidate) => candidate.pageId && candidate.pageId === page.pageId) ||
      pick((candidate) => candidate.route && candidate.route === page.route) ||
      pick(
        (candidate) =>
          candidate.pageName &&
          candidate.pageName.toLowerCase() === page.name.toLowerCase()
      ) ||
      pick(() => true);

    if (!matched) {
      map[page.pageId] = null;
      return;
    }

    map[page.pageId] = {
      ...matched,
      pageId: page.pageId,
      route: page.route,
      pageName: page.name,
      notes: page.notes,
      actions: page.actions,
    };
  });

  return map;
}

function buildGenerationPages(pages, pagePreviewMap) {
  return pages.map((page, index) => ({
    pageId: page.pageId || `page-${index + 1}`,
    route: page.route || (index === 0 ? "/" : `/page-${index + 1}`),
    name: page.name || `Page ${index + 1}`,
    treeNode: page.treeNode || null,
    selectedPreviewHtml: pagePreviewMap?.[page.pageId]?.html || "",
    actions: Array.isArray(page.actions) ? page.actions : [],
    notes: page.notes || "",
  }));
}

export default function BuildFlow() {
  const { workflowMode, setInspireStep } = useWorkflow();
  const { state: imageState, actions: imageActions } = useImageToSite();
  const { state: inspireState, actions: inspireActions } = useInspire();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [serverSnapshot, setServerSnapshot] = useState({});
  const [projectId, setProjectId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState(null);
  const [jobError, setJobError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const localSnapshot = useMemo(
    () => ({
      imageToSite: {
        previewItems: Array.isArray(imageState.previewItems)
          ? imageState.previewItems
          : [],
        structureFlow: imageState.structureFlow || null,
        builderHtml: normalizeText(imageState.builderHtml || ""),
      },
      inspire: {
        previewItems: Array.isArray(inspireState.previewItems)
          ? inspireState.previewItems
          : [],
        tree: inspireState.tree || null,
        brief: inspireState.brief || {},
        selectedStyle: inspireState.selectedStyle || {},
        workspaceNote: normalizeText(inspireState.workspaceNote || ""),
      },
    }),
    [
      imageState.builderHtml,
      imageState.previewItems,
      imageState.structureFlow,
      inspireState.brief,
      inspireState.previewItems,
      inspireState.selectedStyle,
      inspireState.tree,
      inspireState.workspaceNote,
    ]
  );

  const effectiveSnapshot = useMemo(
    () => mergeSnapshotSources(serverSnapshot, localSnapshot),
    [localSnapshot, serverSnapshot]
  );

  const brief = useMemo(
    () => (isPlainObject(effectiveSnapshot?.inspire?.brief) ? effectiveSnapshot.inspire.brief : {}),
    [effectiveSnapshot]
  );
  const style = useMemo(
    () =>
      isPlainObject(effectiveSnapshot?.inspire?.selectedStyle)
        ? effectiveSnapshot.inspire.selectedStyle
        : {},
    [effectiveSnapshot]
  );
  const globalNotes = useMemo(
    () => normalizeText(effectiveSnapshot?.inspire?.workspaceNote || ""),
    [effectiveSnapshot]
  );
  const pages = useMemo(() => {
    const inferredPages = collectPagesForWorkflow(effectiveSnapshot, workflowMode);
    if (inferredPages.length) {
      return inferredPages;
    }
    return [
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
  }, [effectiveSnapshot, workflowMode]);
  const pagePreviewMap = useMemo(
    () => buildPagePreviewMap(pages, effectiveSnapshot),
    [effectiveSnapshot, pages]
  );

  const loadSnapshot = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/projects/bootstrap", {
        method: "GET",
        cache: "no-store",
      });
      if (response.status === 401) {
        redirectToLogin();
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load project snapshot.");
      }
      const payload = await response.json();
      const snapshot = payload?.snapshot || {};
      setProjectId(normalizeText(payload?.project?.id));
      setServerSnapshot(isPlainObject(snapshot) ? snapshot : {});
    } catch (loadError) {
      setError(loadError?.message || "Failed to load build context.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

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
          redirectToLogin();
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

  const readyCount = useMemo(
    () =>
      pages.filter((page) => Boolean(pagePreviewMap?.[page.pageId]?.html)).length,
    [pagePreviewMap, pages]
  );
  const missingCount = pages.length - readyCount;
  const canSubmit = Boolean(
    projectId &&
      pages.length &&
      !isSubmitting &&
      pages.every((page) => pagePreviewMap?.[page.pageId]?.html)
  );
  const isJobActive = Boolean(job && ACTIVE_JOB_STATUSES.has(job.status));
  const isJobComplete = Boolean(
    job &&
      (job.status === "completed" || job.status === "completed_with_warnings")
  );

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    setJobError("");
    try {
      const generationPages = buildGenerationPages(pages, pagePreviewMap);
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

  const handleBackToPreviews = () => {
    if (workflowMode === "inspire") {
      setInspireStep("previews");
      return;
    }
    imageActions.setViewMode("preview");
  };

  const handleRegenerateMissing = async () => {
    setIsRegenerating(true);
    setJobError("");
    try {
      if (workflowMode === "inspire") {
        await inspireActions.generatePagePreviews?.();
        setInspireStep("previews");
      } else {
        await imageActions.handleGeneratePreviews?.();
        imageActions.setViewMode("preview");
      }
    } catch (regenError) {
      setJobError(regenError?.message || "Failed to regenerate page previews.");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="build-shell">
      <section className="build-panel">
        <div className="build-header">
          <p className="build-kicker">Build App</p>
          <h1>Build from page previews.</h1>
          <p>
            The generator uses one HTML preview per page plus your brief, style, and
            notes.
          </p>
        </div>

        {isLoading ? <p className="build-status">Loading build context...</p> : null}
        {error ? <p className="build-error">{error}</p> : null}

        {!isLoading && !error ? (
          <>
            <div className="build-job-card">
              <strong>
                Ready pages: {readyCount}/{pages.length}
              </strong>
              <span>
                {missingCount
                  ? `${missingCount} pages are missing HTML previews.`
                  : "All pages have HTML previews."}
              </span>
            </div>

            <div className="build-page-list">
              {pages.map((page) => {
                const preview = pagePreviewMap?.[page.pageId];
                const hasHtml = Boolean(preview?.html);
                return (
                  <article key={page.pageId} className="build-page-card">
                    <div className="build-page-head">
                      <div>
                        <strong>{page.name}</strong>
                        <span>{page.route}</span>
                      </div>
                      <span>{hasHtml ? "Ready" : "Missing"}</span>
                    </div>
                    <p className="build-page-meta">
                      {page.notes || "No page notes."}
                      {page.actions.length ? ` Actions: ${page.actions.join(", ")}` : ""}
                    </p>
                    <div className="build-preview-wrap">
                      {hasHtml ? (
                        <iframe
                          title={`${page.name} preview`}
                          srcDoc={preview.html}
                          sandbox=""
                          className="build-preview-frame"
                        />
                      ) : (
                        <div className="build-preview-empty">
                          Missing HTML preview for this page.
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
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
          <button
            type="button"
            className="build-button is-secondary"
            onClick={handleRegenerateMissing}
            disabled={isRegenerating || isLoading}
          >
            {isRegenerating ? "Regenerating..." : "Regenerate page previews"}
          </button>
          <button
            type="button"
            className="build-button is-secondary"
            onClick={handleBackToPreviews}
            disabled={isLoading}
          >
            Back to previews
          </button>
          <button
            type="button"
            className="build-button is-secondary"
            onClick={loadSnapshot}
            disabled={isLoading}
          >
            Refresh build context
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
