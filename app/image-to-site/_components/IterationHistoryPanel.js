export default function IterationHistoryPanel({
  entries,
  activeEntryId,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClose,
}) {
  const recentEntries = (entries ?? []).slice(-6).reverse();

  return (
    <aside className="imageflow-iteration-history">
      <div className="imageflow-iteration-history-header">
        <span className="imageflow-iteration-history-title">History</span>
        <div className="imageflow-iteration-history-actions">
          <button
            className="imageflow-history-action"
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M8 7l-4 4 4 4M4 11h9a5 5 0 110 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className="imageflow-history-action"
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M16 7l4 4-4 4M20 11h-9a5 5 0 100 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {onClose ? (
            <button
              className="imageflow-history-close"
              type="button"
              onClick={onClose}
              aria-label="Close history panel"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M7 7l10 10M17 7L7 17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      <div className="imageflow-iteration-history-list" role="list">
        {recentEntries.length ? (
          recentEntries.map((entry) => (
            <div
              key={entry.id}
              className={`imageflow-history-entry${
                entry.id === activeEntryId ? " is-active" : ""
              }`}
            >
              <span className="imageflow-history-label">{entry.label}</span>
            </div>
          ))
        ) : (
          <div className="imageflow-history-empty">No edits yet.</div>
        )}
      </div>
    </aside>
  );
}
