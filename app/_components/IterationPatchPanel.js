export default function IterationPatchPanel({ patch, onClose }) {
  if (!patch) {
    return null;
  }

  return (
    <div className="imageflow-iteration-patch">
      <div className="imageflow-iteration-patch-header">
        <span className="imageflow-iteration-patch-title">Patch payload</span>
        {onClose ? (
          <button
            className="imageflow-layer-close"
            type="button"
            onClick={onClose}
            aria-label="Close patch panel"
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
      <pre className="imageflow-iteration-patch-body">
        {JSON.stringify(patch, null, 2)}
      </pre>
    </div>
  );
}
