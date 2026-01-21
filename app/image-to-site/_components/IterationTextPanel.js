import {
  TEXT_ALIGN_OPTIONS,
  TEXT_TOOL_FONTS,
  TEXT_TRANSFORM_OPTIONS,
  TEXT_WEIGHT_OPTIONS,
} from "../_lib/text-tools";

export default function IterationTextPanel({
  draft,
  onChangeText,
  onChangeStyle,
  onReset,
}) {
  const hasFontOption = draft
    ? TEXT_TOOL_FONTS.some((font) => font.value === draft.fontFamily)
    : true;
  const hasWeightOption = draft
    ? TEXT_WEIGHT_OPTIONS.includes(String(draft.fontWeight))
    : true;

  return (
    <aside className="imageflow-iteration-text">
      <div className="imageflow-iteration-text-header">Text Tool</div>
      {!draft ? (
        <div className="imageflow-iteration-text-empty">
          Select a text layer to edit typography.
        </div>
      ) : (
        <div className="imageflow-iteration-text-body">
          <label className="imageflow-iteration-text-field">
            <span className="imageflow-iteration-text-label">Content</span>
            <textarea
              className="imageflow-iteration-text-input"
              rows={3}
              value={draft.text}
              onChange={(event) => onChangeText(event.target.value)}
            />
          </label>
          <div className="imageflow-iteration-text-grid">
            <label className="imageflow-iteration-text-field">
              <span className="imageflow-iteration-text-label">Font size</span>
              <input
                className="imageflow-iteration-text-input"
                type="number"
                min="8"
                max="120"
                value={draft.fontSize}
                onChange={(event) =>
                  onChangeStyle("fontSize", Number(event.target.value))
                }
              />
            </label>
            <label className="imageflow-iteration-text-field">
              <span className="imageflow-iteration-text-label">Line height</span>
              <input
                className="imageflow-iteration-text-input"
                type="number"
                step="0.1"
                min="0.8"
                max="3"
                value={draft.lineHeight}
                onChange={(event) =>
                  onChangeStyle("lineHeight", Number(event.target.value))
                }
              />
            </label>
            <label className="imageflow-iteration-text-field">
              <span className="imageflow-iteration-text-label">Weight</span>
              <select
                className="imageflow-iteration-text-input"
                value={draft.fontWeight}
                onChange={(event) =>
                  onChangeStyle("fontWeight", event.target.value)
                }
              >
                {!hasWeightOption ? (
                  <option value={draft.fontWeight}>{draft.fontWeight}</option>
                ) : null}
                {TEXT_WEIGHT_OPTIONS.map((weight) => (
                  <option key={weight} value={weight}>
                    {weight}
                  </option>
                ))}
              </select>
            </label>
            <label className="imageflow-iteration-text-field">
              <span className="imageflow-iteration-text-label">Tracking</span>
              <input
                className="imageflow-iteration-text-input"
                type="number"
                step="0.1"
                min="-2"
                max="8"
                value={draft.letterSpacing}
                onChange={(event) =>
                  onChangeStyle("letterSpacing", Number(event.target.value))
                }
              />
            </label>
            <label className="imageflow-iteration-text-field">
              <span className="imageflow-iteration-text-label">Align</span>
              <select
                className="imageflow-iteration-text-input"
                value={draft.textAlign}
                onChange={(event) =>
                  onChangeStyle("textAlign", event.target.value)
                }
              >
                {TEXT_ALIGN_OPTIONS.map((align) => (
                  <option key={align} value={align}>
                    {align}
                  </option>
                ))}
              </select>
            </label>
            <label className="imageflow-iteration-text-field">
              <span className="imageflow-iteration-text-label">Transform</span>
              <select
                className="imageflow-iteration-text-input"
                value={draft.textTransform}
                onChange={(event) =>
                  onChangeStyle("textTransform", event.target.value)
                }
              >
                {TEXT_TRANSFORM_OPTIONS.map((transform) => (
                  <option key={transform} value={transform}>
                    {transform}
                  </option>
                ))}
              </select>
            </label>
            <label className="imageflow-iteration-text-field">
              <span className="imageflow-iteration-text-label">Font</span>
              <select
                className="imageflow-iteration-text-input"
                value={draft.fontFamily}
                onChange={(event) =>
                  onChangeStyle("fontFamily", event.target.value)
                }
              >
                {!hasFontOption ? (
                  <option value={draft.fontFamily}>{draft.fontFamily}</option>
                ) : null}
                {TEXT_TOOL_FONTS.map((font) => (
                  <option key={font.label} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="imageflow-iteration-text-field">
              <span className="imageflow-iteration-text-label">Color</span>
              <input
                className="imageflow-iteration-text-color"
                type="color"
                value={draft.color}
                onChange={(event) => onChangeStyle("color", event.target.value)}
              />
            </label>
          </div>
          <button
            className="imageflow-iteration-text-reset"
            type="button"
            onClick={onReset}
          >
            Reset text overrides
          </button>
        </div>
      )}
    </aside>
  );
}
