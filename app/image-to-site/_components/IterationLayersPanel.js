export default function IterationLayersPanel({
  layerEntries,
  selectedElementIds,
  onSelectLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
}) {
  return (
    <aside className="imageflow-iteration-layers">
      <div className="imageflow-iteration-layers-header">Layers</div>
      <div className="imageflow-iteration-layers-list">
        {layerEntries.length ? (
          layerEntries.map((entry) => {
            const layer = entry.layer;
            const isSelected = selectedElementIds.includes(entry.id);
            return (
              <div
                key={entry.id}
                className={`imageflow-layer-row${isSelected ? " is-active" : ""}${
                  layer.locked ? " is-locked" : ""
                }${layer.hidden ? " is-hidden" : ""}`}
              >
                <button
                  className="imageflow-layer-name"
                  type="button"
                  onClick={() => onSelectLayer(entry.id)}
                >
                  <span className="imageflow-layer-label">{layer.name}</span>
                </button>
                <div className="imageflow-layer-actions">
                  <button
                    className="imageflow-layer-action"
                    type="button"
                    onClick={() => onToggleLayerVisibility(entry.id)}
                    aria-pressed={!layer.hidden}
                    aria-label={layer.hidden ? "Show layer" : "Hide layer"}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  </button>
                  <button
                    className="imageflow-layer-action"
                    type="button"
                    onClick={() => onToggleLayerLock(entry.id)}
                    aria-pressed={layer.locked}
                    aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect
                        x="6"
                        y="10"
                        width="12"
                        height="10"
                        rx="2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M8 10V8a4 4 0 018 0v2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="imageflow-layer-empty">No layers detected.</div>
        )}
      </div>
    </aside>
  );
}
