export const DEFAULT_ITERATION_TOOL = "cursor";

export const ITERATION_TOOL_CONFIG = [
  {
    id: "cursor",
    label: "Cursor",
    ariaLabel: "Cursor tool",
    selection: "box",
    transform: true,
  },
  {
    id: "text",
    label: "Text",
    ariaLabel: "Text tool",
    selection: "box",
    transform: false,
  },
  {
    id: "pencil",
    label: "Pencil",
    ariaLabel: "Pencil select tool",
    selection: "pencil",
    overlay: "pencil",
  },
  {
    id: "note",
    label: "Note",
    ariaLabel: "Note tool",
    overlay: "note",
  },
];

export const ITERATION_TOOL_MAP = Object.fromEntries(
  ITERATION_TOOL_CONFIG.map((tool) => [tool.id, tool])
);

export const ITERATION_SELECTION_TOOLS = ITERATION_TOOL_CONFIG
  .map((tool) => tool.selection)
  .filter(Boolean);
