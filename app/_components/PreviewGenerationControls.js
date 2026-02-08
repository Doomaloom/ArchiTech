export default function PreviewGenerationControls({
  previewCount,
  quality,
  creativityValue,
  onPreviewCountChange,
  onQualityChange,
  onCreativityChange,
  onGenerate,
  isGenerating,
  isGenerateDisabled = false,
  generateLabel = "Generate previews",
  generatingLabel = "Generating previews...",
  errorMessage = "",
}) {
  const qualityLabel = quality === "pro" ? "Pro" : "Flash";
  const qualityIndex = quality === "pro" ? 1 : 0;

  return (
    <div className="imageflow-info-fields">
      <div className="imageflow-slider-row">
        <label className="imageflow-field">
          <span className="imageflow-field-label">
            Preview count: {previewCount}
          </span>
          <input
            className="imageflow-slider"
            type="range"
            min="1"
            max="6"
            value={previewCount}
            onChange={(event) =>
              onPreviewCountChange?.(Number(event.target.value))
            }
          />
        </label>
        <label className="imageflow-field">
          <span className="imageflow-field-label">Quality: {qualityLabel}</span>
          <input
            className="imageflow-slider"
            type="range"
            min="0"
            max="1"
            step="1"
            value={qualityIndex}
            onChange={(event) =>
              onQualityChange?.(
                Number(event.target.value) === 1 ? "pro" : "flash"
              )
            }
          />
          <div className="imageflow-slider-labels">
            <span>Flash</span>
            <span>Pro</span>
          </div>
        </label>
        <label className="imageflow-field">
          <span className="imageflow-field-label">
            Creativity: {creativityValue}
          </span>
          <input
            className="imageflow-slider"
            type="range"
            min="0"
            max="100"
            value={creativityValue}
            onChange={(event) => onCreativityChange?.(Number(event.target.value))}
          />
        </label>
      </div>
      <button
        className="imageflow-generate-button"
        type="button"
        onClick={onGenerate}
        disabled={isGenerating || isGenerateDisabled}
      >
        {isGenerating ? generatingLabel : generateLabel}
      </button>
      {errorMessage ? <p className="imageflow-error">{errorMessage}</p> : null}
    </div>
  );
}
