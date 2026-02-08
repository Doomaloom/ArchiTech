"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const WorkflowContext = createContext(null);

const DEFAULT_INSPIRE_STEP = "project-description";
const VALID_WORKFLOW_MODES = new Set(["home", "image-to-site", "inspire"]);

export function WorkflowProvider({ children }) {
  const [workflowMode, setWorkflowMode] = useState("home");
  const [inspireStep, setInspireStep] = useState(DEFAULT_INSPIRE_STEP);

  const setMode = useCallback((nextMode) => {
    const resolvedMode = VALID_WORKFLOW_MODES.has(nextMode)
      ? nextMode
      : "home";
    setWorkflowMode(resolvedMode);
    if (resolvedMode === "inspire") {
      setInspireStep((current) => current || DEFAULT_INSPIRE_STEP);
    }
  }, []);

  const value = useMemo(
    () => ({
      workflowMode,
      inspireStep,
      setWorkflowMode: setMode,
      setInspireStep,
    }),
    [workflowMode, inspireStep, setMode]
  );

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflow must be used within WorkflowProvider");
  }
  return context;
}
