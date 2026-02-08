"use client";

import { useMemo, useState } from "react";
import InspirePaletteSpheres3D from "./InspirePaletteSpheres3D";

const FALLBACK_PALETTE = [
  "#f97316",
  "#22c55e",
  "#0ea5e9",
  "#a855f7",
  "#f43f5e",
  "#14b8a6",
  "#6366f1",
  "#eab308",
];

const PLACEHOLDER_LABELS = [
  "Color rhythm",
  "Accent hierarchy",
  "Background tones",
  "CTA contrast",
];

const MIN_LIBRARY_COUNT = 4;
const MAX_LIBRARY_COUNT = 12;

const buildLibraryColors = (source, count) => {
  if (!source.length) {
    return FALLBACK_PALETTE.slice(0, count);
  }
  return Array.from({ length: count }, (_, index) => {
    return source[index % source.length];
  });
};

export default function InspireStyleEditor({
  styleError,
  isGeneratingStyles,
  styleIdeas,
  selectedStyle,
  onSelectStyle,
}) {
  const palette = selectedStyle?.palette ?? [];
  const displayPalette = palette.length ? palette : FALLBACK_PALETTE;
  const [libraryCount, setLibraryCount] = useState(6);

  const libraryColors = useMemo(() => {
    return buildLibraryColors(displayPalette, libraryCount);
  }, [displayPalette, libraryCount]);

  return (
    <div className="inspire-style">
      <div className="inspire-style-top">
        <div className="inspire-style-top-grid">
          <div className="inspire-style-panel is-canvas">
            <div
              className="inspire-style-library"
              role="img"
              aria-label="Selected color library in 3D"
            >
              <InspirePaletteSpheres3D
                title={selectedStyle?.title || "Style palette"}
                colors={libraryColors}
              />
            </div>
          </div>
          <div className="inspire-style-middle">
            <div className="inspire-style-panel">
              <div className="inspire-style-controls">
                <div className="inspire-style-slider-header">
                  <span>Palette options</span>
                </div>
                <div className="inspire-style-slider-row">
                  <div className="inspire-style-icon-row">
                    <button
                      className="inspire-style-icon"
                      type="button"
                      aria-label="Lock palette"
                      aria-pressed="false"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                    </button>
                    <button
                      className="inspire-style-icon"
                      type="button"
                      aria-label="Sample color"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M4 20l6-6" />
                        <path d="M14 4l6 6-3 3-6-6 3-3z" />
                        <path d="M8 16l3 3" />
                      </svg>
                    </button>
                    <button
                      className="inspire-style-icon"
                      type="button"
                      aria-label="Placeholder action"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                  </div>
                  <div className="inspire-style-slider">
                    <input
                      type="range"
                      min={MIN_LIBRARY_COUNT}
                      max={MAX_LIBRARY_COUNT}
                      step="1"
                      value={libraryCount}
                      onChange={(event) =>
                        setLibraryCount(Number(event.target.value))
                      }
                      aria-label="Library size"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="inspire-style-placeholders">
              {PLACEHOLDER_LABELS.map((label) => (
                <div key={label} className="inspire-style-placeholder">
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="inspire-style-panel is-empty" aria-hidden="true" />
        </div>
      </div>
      <div className="inspire-style-bottom">
        <p className="inspire-style-caption">
          AI style ideas focused on the palette.
        </p>
        {styleError ? (
          <div className="inspire-style-error" role="status">
            {styleError}
          </div>
        ) : null}
        <div className="inspire-style-cards">
          <div className="inspire-style-grid">
            {isGeneratingStyles && !styleIdeas.length ? (
              <div className="inspire-style-loading">
                Generating style ideas...
              </div>
            ) : null}
            {styleIdeas.map((style) => (
              <button
                key={style.id}
                type="button"
                className={`inspire-style-card${
                  selectedStyle?.id === style.id ? " is-selected" : ""
                }`}
                onClick={() => onSelectStyle(style)}
              >
                <div className="inspire-style-palette">
                  {(style.palette ?? []).map((color) => (
                    <span key={color} style={{ background: color }} />
                  ))}
                </div>
                <div className="inspire-style-card-meta">
                  <div className="inspire-style-card-header">
                    <h3>{style.title}</h3>
                    <span>{style.summary}</span>
                  </div>
                  <div className="inspire-style-tags">
                    {(style.tags ?? []).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
