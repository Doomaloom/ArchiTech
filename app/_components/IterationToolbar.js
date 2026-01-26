import { ITERATION_TOOL_CONFIG } from "../_lib/iteration-tools";

const TOOL_ICONS = {
  cursor: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 4l7 16 2.5-6L20 12 5 4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  pan: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4v16M4 12h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 4l-2.5 2.5M12 4l2.5 2.5M12 20l-2.5-2.5M12 20l2.5-2.5M4 12l2.5-2.5M4 12l2.5 2.5M20 12l-2.5-2.5M20 12l-2.5 2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  zoom: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="11"
        cy="11"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M11 8v6M8 11h6M16.5 16.5l3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  text: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 6h12M12 6v12M8 18h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  pencil: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20l4-1 9-9-3-3-9 9-1 4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13 5l3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  note: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 6h14v9H8l-3 3V6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export default function IterationToolbar({
  iterationTool,
  onToolChange,
  selectedElementId,
  highlightedIds,
  onToggleHighlight,
  canDelete,
  onDeleteSelection,
  showTransformControls,
  onToggleTransformControls,
  showLayers,
  onToggleLayers,
  onRegenerate,
  showPatch,
  onTogglePatch,
}) {
  const highlightActive =
    selectedElementId && highlightedIds?.includes(selectedElementId);

  return (
    <aside className="imageflow-iteration-toolbar imageflow-iteration-rail">
      <div className="imageflow-iteration-rail-group">
        {ITERATION_TOOL_CONFIG.map((tool) => (
          <button
            key={tool.id}
            className={`imageflow-iteration-tool${
              iterationTool === tool.id ? " is-active" : ""
            }`}
            type="button"
            onClick={() => onToolChange(tool.id)}
            aria-pressed={iterationTool === tool.id}
            aria-label={tool.ariaLabel}
          >
            {TOOL_ICONS[tool.id] ?? null}
          </button>
        ))}
      </div>
      <div className="imageflow-iteration-rail-divider" />
      <div className="imageflow-iteration-rail-group">
        <button
          className={`imageflow-iteration-tool${
            highlightActive ? " is-active" : ""
          }`}
          type="button"
          onClick={onToggleHighlight}
          disabled={!selectedElementId}
          aria-pressed={Boolean(highlightActive)}
          aria-label="Toggle highlight"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 14l4 4 8-8-4-4-8 8zM4 20h7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          className="imageflow-iteration-tool"
          type="button"
          onClick={onDeleteSelection}
          disabled={!canDelete}
          aria-label="Delete selection"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 7h16M9 7V5h6v2M9 11v6M12 11v6M15 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          className={`imageflow-iteration-tool${
            showTransformControls ? " is-active" : ""
          }`}
          type="button"
          onClick={onToggleTransformControls}
          aria-pressed={showTransformControls}
          aria-label="Toggle transform controls"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect
              x="5"
              y="5"
              width="14"
              height="14"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
        </button>
        <button
          className={`imageflow-iteration-tool${showLayers ? " is-active" : ""}`}
          type="button"
          onClick={onToggleLayers}
          aria-pressed={showLayers}
          aria-label="Toggle layers panel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 4l8 4-8 4-8-4 8-4zM4 12l8 4 8-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          className={`imageflow-iteration-tool${showPatch ? " is-active" : ""}`}
          type="button"
          onClick={onTogglePatch}
          aria-label="Toggle patch payload"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 6h14v12H5zM8 9h8M8 12h8M8 15h6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className="imageflow-iteration-rail-actions">
        <button
          className="imageflow-iteration-action imageflow-iteration-rail-action"
          type="button"
          onClick={onRegenerate}
        >
          Regenerate
        </button>
      </div>
    </aside>
  );
}
