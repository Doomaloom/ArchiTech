"use client";

import InspireView from "./_components/InspireView";
import ImageToSiteView from "./_components/ImageToSiteView";
import { useWorkflow } from "./_context/workflow-context";

export default function ImageToSitePage() {
  const { workflowMode } = useWorkflow();

  if (workflowMode === "inspire") {
    return <InspireView />;
  }

  return <ImageToSiteView />;
}
