"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DISABLE_PERSISTENCE } from "../_lib/runtime-flags";

const VERSION_INTERVAL_MS = 20000;
const AUTOSAVE_DEBOUNCE_MS = 1500;
const VALID_WORKFLOW_MODES = new Set(["home", "image-to-site", "inspire"]);

const prunePreviewItem = (preview) => {
  if (!preview || typeof preview !== "object") {
    return null;
  }
  return {
    id: preview.id ?? null,
    plan: preview.plan ?? null,
    html: typeof preview.html === "string" ? preview.html : null,
    imageUrl: typeof preview.imageUrl === "string" ? preview.imageUrl : null,
    status: preview.status ?? null,
    renderError: preview.renderError ?? null,
  };
};

export default function useProjectAutosave({
  workflowMode,
  inspireStep,
  setWorkflowMode,
  setInspireStep,
  imageState,
  imageActions,
  inspireState,
  inspireActions,
}) {
  const [status, setStatus] = useState({
    isHydrating: true,
    projectId: null,
    error: "",
    lastSavedAt: null,
  });
  const projectIdRef = useRef(null);
  const isHydratingRef = useRef(true);
  const lastSignatureRef = useRef("");
  const lastVersionAtRef = useRef(0);
  const controlsRef = useRef({
    setWorkflowMode,
    setInspireStep,
    imageHydrate: imageActions.hydrateWorkspace,
    inspireHydrate: inspireActions.hydrateWorkspace,
  });

  controlsRef.current = {
    setWorkflowMode,
    setInspireStep,
    imageHydrate: imageActions.hydrateWorkspace,
    inspireHydrate: inspireActions.hydrateWorkspace,
  };

  const snapshot = useMemo(
    () => ({
      version: 1,
      workflowMode,
      inspireStep,
      imageToSite: {
        title: imageState.title ?? "",
        name: imageState.name ?? "",
        details: imageState.details ?? "",
        viewMode: imageState.viewMode ?? "start",
        structureFlow: imageState.structureFlow ?? null,
        previewItems: Array.isArray(imageState.previewItems)
          ? imageState.previewItems.map(prunePreviewItem).filter(Boolean)
          : [],
        previewCount: imageState.previewCount ?? 3,
        selectedPreviewIndex: imageState.selectedPreviewIndex ?? 0,
        builderHtml: imageState.builderHtml ?? "",
        showComponents: Boolean(imageState.showComponents),
        modelQuality: imageState.modelQuality ?? "flash",
        creativityValue: imageState.creativityValue ?? 40,
      },
      inspire: {
        brief: inspireState.brief ?? null,
        ideaContext: inspireState.ideaContext ?? null,
        styleIdeas: Array.isArray(inspireState.styleIdeas)
          ? inspireState.styleIdeas
          : [],
        selectedStyle: inspireState.selectedStyle ?? null,
        tree: inspireState.tree ?? null,
        selectedNodeId: inspireState.selectedNodeId ?? null,
        previewItems: Array.isArray(inspireState.previewItems)
          ? inspireState.previewItems.map(prunePreviewItem).filter(Boolean)
          : [],
        previewMode: inspireState.previewMode ?? "image",
        previewCount: inspireState.previewCount ?? 3,
        selectedPreviewIndex: inspireState.selectedPreviewIndex ?? 0,
        modelQuality: inspireState.modelQuality ?? "flash",
        creativityValue: inspireState.creativityValue ?? 45,
        workspaceNote: inspireState.workspaceNote ?? "",
        workspaceMask: inspireState.workspaceMask ?? null,
      },
    }),
    [
      imageState.builderHtml,
      imageState.creativityValue,
      imageState.details,
      imageState.modelQuality,
      imageState.name,
      imageState.previewCount,
      imageState.previewItems,
      imageState.selectedPreviewIndex,
      imageState.showComponents,
      imageState.structureFlow,
      imageState.title,
      imageState.viewMode,
      inspireState.brief,
      inspireState.ideaContext,
      inspireState.creativityValue,
      inspireState.modelQuality,
      inspireState.previewCount,
      inspireState.previewItems,
      inspireState.previewMode,
      inspireState.selectedNodeId,
      inspireState.selectedPreviewIndex,
      inspireState.selectedStyle,
      inspireState.styleIdeas,
      inspireState.tree,
      inspireState.workspaceMask,
      inspireState.workspaceNote,
      inspireStep,
      workflowMode,
    ]
  );

  const snapshotSignature = useMemo(() => JSON.stringify(snapshot), [snapshot]);

  useEffect(() => {
    if (DISABLE_PERSISTENCE) {
      isHydratingRef.current = false;
      projectIdRef.current = null;
      setStatus({
        isHydrating: false,
        projectId: null,
        error: "",
        lastSavedAt: null,
      });
      return undefined;
    }

    let isCancelled = false;

    async function bootstrap() {
      setStatus((current) => ({
        ...current,
        isHydrating: true,
        error: "",
      }));
      try {
        const response = await fetch("/api/projects/bootstrap", {
          method: "GET",
          cache: "no-store",
        });
        if (response.status === 401) {
          window.location.assign("/login?next=%2F");
          return;
        }
        if (!response.ok) {
          throw new Error("Failed to bootstrap project state.");
        }
        const payload = await response.json();
        const projectId = payload?.project?.id ?? null;
        projectIdRef.current = projectId;

        const dbSnapshot = payload?.snapshot;
        if (dbSnapshot && typeof dbSnapshot === "object") {
          const controls = controlsRef.current;
          isHydratingRef.current = true;
          controls.setWorkflowMode(
            VALID_WORKFLOW_MODES.has(dbSnapshot.workflowMode)
              ? dbSnapshot.workflowMode
              : "image-to-site"
          );
          if (typeof dbSnapshot.inspireStep === "string") {
            controls.setInspireStep(dbSnapshot.inspireStep);
          }
          controls.imageHydrate(dbSnapshot.imageToSite ?? {});
          controls.inspireHydrate(dbSnapshot.inspire ?? {});
          lastSignatureRef.current = JSON.stringify(dbSnapshot);
        }

        if (!isCancelled) {
          isHydratingRef.current = false;
          setStatus((current) => ({
            ...current,
            isHydrating: false,
            projectId,
            error: "",
          }));
        }
      } catch (error) {
        if (!isCancelled) {
          isHydratingRef.current = false;
          setStatus((current) => ({
            ...current,
            isHydrating: false,
            error: error?.message ?? "Failed to bootstrap project.",
          }));
        }
      }
    }

    bootstrap();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (DISABLE_PERSISTENCE) {
      return;
    }
    if (status.isHydrating || isHydratingRef.current) {
      return;
    }
    if (!projectIdRef.current) {
      return;
    }
    if (snapshotSignature === lastSignatureRef.current) {
      return;
    }

    const timer = setTimeout(async () => {
      const now = Date.now();
      const createVersion = now - lastVersionAtRef.current > VERSION_INTERVAL_MS;
      try {
        const response = await fetch("/api/projects/autosave", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: projectIdRef.current,
            snapshot,
            createVersion,
          }),
        });
        if (response.status === 401) {
          window.location.assign("/login?next=%2F");
          return;
        }
        if (!response.ok) {
          throw new Error("Autosave failed.");
        }
        const payload = await response.json();
        projectIdRef.current = payload?.projectId ?? projectIdRef.current;
        lastSignatureRef.current = snapshotSignature;
        if (createVersion) {
          lastVersionAtRef.current = now;
        }
        setStatus((current) => ({
          ...current,
          projectId: projectIdRef.current,
          error: "",
          lastSavedAt: new Date().toISOString(),
        }));
      } catch (error) {
        setStatus((current) => ({
          ...current,
          error: error?.message ?? "Autosave failed.",
        }));
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [snapshot, snapshotSignature, status.isHydrating]);

  return status;
}
