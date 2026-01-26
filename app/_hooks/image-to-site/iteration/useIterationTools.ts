import { useState } from "react";

import {
  DEFAULT_ITERATION_TOOL,
  ITERATION_TOOL_MAP,
} from "../../../_lib/iteration-tools";

export default function useIterationTools() {
  const [iterationTool, setIterationTool] = useState(DEFAULT_ITERATION_TOOL);
  const activeTool =
    ITERATION_TOOL_MAP[iterationTool] ??
    ITERATION_TOOL_MAP[DEFAULT_ITERATION_TOOL];
  const selectionMode = activeTool?.selection ?? null;
  const overlayMode = activeTool?.overlay ?? null;
  const isOverlayTool = Boolean(overlayMode);
  const isTextTool = iterationTool === "text";
  const isZoomTool = iterationTool === "zoom";
  const isPanTool = iterationTool === "pan";

  return {
    state: { iterationTool },
    derived: {
      activeTool,
      selectionMode,
      overlayMode,
      isOverlayTool,
      isTextTool,
      isZoomTool,
      isPanTool,
    },
    actions: { setIterationTool },
  };
}
