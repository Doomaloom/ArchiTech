"use client";

import { useEffect, useRef, useState } from "react";

const VIEW_MODE_HASHES = new Set([
  "start",
  "nodes",
  "preview",
  "selected",
  "iterate",
  "code",
  "builder",
  "build-app",
]);

export default function useViewMode() {
  const [viewMode, setViewMode] = useState("start");
  const hashSyncRef = useRef({
    lastWritten: "",
    isApplying: false,
    initialized: false,
  });

  useEffect(() => {
    const buttons = Array.from(
      document.querySelectorAll("[data-imageflow-step]")
    );

    const handleClick = (event) => {
      const target = event.currentTarget;
      const step = target?.dataset?.imageflowStep;
      if (step) {
        setViewMode(step);
      }
    };

    buttons.forEach((button) => {
      button.addEventListener("click", handleClick);
    });

    return () => {
      buttons.forEach((button) => {
        button.removeEventListener("click", handleClick);
      });
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!VIEW_MODE_HASHES.has(hash) || hash === viewMode) {
        return;
      }
      hashSyncRef.current.isApplying = true;
      setViewMode(hash);
    };
    if (!hashSyncRef.current.initialized) {
      hashSyncRef.current.initialized = true;
      applyHash();
    }
    window.addEventListener("hashchange", applyHash);
    return () => {
      window.removeEventListener("hashchange", applyHash);
    };
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!VIEW_MODE_HASHES.has(viewMode)) {
      return;
    }
    if (hashSyncRef.current.isApplying) {
      hashSyncRef.current.isApplying = false;
      return;
    }
    const nextHash = `#${viewMode}`;
    if (hashSyncRef.current.lastWritten === nextHash) {
      return;
    }
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
    hashSyncRef.current.lastWritten = nextHash;
  }, [viewMode]);

  useEffect(() => {
    const buttons = Array.from(
      document.querySelectorAll("[data-imageflow-step]")
    );

    buttons.forEach((button) => {
      const step = button?.dataset?.imageflowStep;
      if (!step) {
        return;
      }
      const isActive =
        step === viewMode ||
        (step === "preview" &&
          (viewMode === "selected" || viewMode === "iterate"));
      button.classList.toggle("is-active", isActive);
    });
  }, [viewMode]);

  const isPreviewMode =
    viewMode === "preview" || viewMode === "selected" || viewMode === "iterate";
  const isIterationMode = viewMode === "iterate";

  return { viewMode, setViewMode, isPreviewMode, isIterationMode };
}
