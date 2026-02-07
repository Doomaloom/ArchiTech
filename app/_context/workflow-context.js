"use client";

import { createContext, useContext, useMemo, useState } from "react";

const WorkflowContext = createContext(null);

const DEFAULT_INSPIRE_STEP = "project-description";

export function WorkflowProvider({ children }) {
  const [workflowMode, setWorkflowMode] = useState("image-to-site");
  const [inspireStep, setInspireStep] = useState(DEFAULT_INSPIRE_STEP);

  const setMode = (nextMode) => {
    setWorkflowMode(nextMode);
    if (nextMode === "inspire" && !inspireStep) {
      setInspireStep(DEFAULT_INSPIRE_STEP);
    }
  };

  const value = useMemo(
    () => ({
      workflowMode,
      inspireStep,
      setWorkflowMode: setMode,
      setInspireStep,
    }),
    [workflowMode, inspireStep]
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
