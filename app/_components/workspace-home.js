"use client";

import InspireView from "./InspireView";
import ImageToSiteView from "./ImageToSiteView";
import { useWorkflow } from "../_context/workflow-context";

export default function WorkspaceHome() {
  const { workflowMode } = useWorkflow();

  if (workflowMode === "inspire") {
    return <InspireView />;
  }

  return <ImageToSiteView />;
}
