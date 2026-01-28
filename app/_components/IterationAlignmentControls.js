const ALIGN_BUTTONS = [
  {
    id: "left",
    label: "Align left",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line
          x1="5"
          y1="4"
          x2="5"
          y2="20"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect
          x="7"
          y="7"
          width="8"
          height="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    ),
  },
  {
    id: "center",
    label: "Align center horizontally",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line
          x1="12"
          y1="4"
          x2="12"
          y2="20"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect
          x="8"
          y="7"
          width="8"
          height="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    ),
  },
  {
    id: "right",
    label: "Align right",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line
          x1="19"
          y1="4"
          x2="19"
          y2="20"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect
          x="9"
          y="7"
          width="8"
          height="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    ),
  },
  {
    id: "top",
    label: "Align top",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line
          x1="4"
          y1="5"
          x2="20"
          y2="5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect
          x="7"
          y="7"
          width="10"
          height="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    ),
  },
  {
    id: "middle",
    label: "Align center vertically",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line
          x1="4"
          y1="12"
          x2="20"
          y2="12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect
          x="7"
          y="8"
          width="10"
          height="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    ),
  },
  {
    id: "bottom",
    label: "Align bottom",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line
          x1="4"
          y1="19"
          x2="20"
          y2="19"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect
          x="7"
          y="9"
          width="10"
          height="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    ),
  },
];

export default function IterationAlignmentControls({
  onAlign,
  scopeLabel,
  disabled,
  showDivider = true,
}) {
  const truncatedScopeLabel =
    scopeLabel && scopeLabel.length > 12
      ? `${scopeLabel.slice(0, 12).trim()}…`
      : scopeLabel;
  const scopeTitle = scopeLabel && scopeLabel.length > 12 ? scopeLabel : undefined;
  return (
    <div
      className={`imageflow-align-controls${showDivider ? " has-divider" : ""}`}
      aria-label="Alignment controls"
    >
      <div className="imageflow-align-header">
        <span className="imageflow-align-title">Align</span>
        {scopeLabel ? (
          <span className="imageflow-align-scope" title={scopeTitle}>
            to {truncatedScopeLabel}
          </span>
        ) : null}
      </div>
      <div className="imageflow-align-grid" role="group">
        {ALIGN_BUTTONS.map((button) => (
          <button
            key={button.id}
            className="imageflow-align-button"
            type="button"
            onClick={() => onAlign?.(button.id)}
            aria-label={button.label}
            title={button.label}
            disabled={disabled}
          >
            {button.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
