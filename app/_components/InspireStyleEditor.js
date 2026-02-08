"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const COLOR_OPTION_ITEMS = [
  { id: "cooler", label: "Make it cooler" },
  { id: "warmer", label: "Make it warmer" },
  { id: "muted", label: "Make it softer" },
];

const FONT_SAMPLE_ROWS = [
  { id: "times", fontFamily: '"Times New Roman", Times, serif' },
  { id: "georgia", fontFamily: 'Georgia, "Palatino Linotype", serif' },
  { id: "trebuchet", fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { id: "gill", fontFamily: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif' },
  { id: "lucida", fontFamily: '"Lucida Sans", "Lucida Grande", sans-serif' },
  { id: "franklin", fontFamily: '"Franklin Gothic Medium", "Arial Narrow", Arial, sans-serif' },
  { id: "copperplate", fontFamily: "Copperplate, 'Copperplate Gothic Light', fantasy" },
  { id: "brush", fontFamily: '"Brush Script MT", "Comic Sans MS", cursive' },
  { id: "courier", fontFamily: '"Courier New", Courier, monospace' },
  { id: "verdana", fontFamily: "Verdana, Geneva, sans-serif" },
  { id: "tahoma", fontFamily: "Tahoma, Geneva, sans-serif" },
  { id: "impact", fontFamily: 'Impact, "Arial Black", sans-serif' },
  { id: "palatino", fontFamily: '"Palatino Linotype", Palatino, serif' },
  { id: "bookman", fontFamily: '"Bookman Old Style", Bookman, serif' },
  { id: "garamond", fontFamily: 'Garamond, "Times New Roman", serif' },
  { id: "didot", fontFamily: 'Didot, "Bodoni MT", serif' },
  { id: "optima", fontFamily: "Optima, Candara, sans-serif" },
  { id: "century-gothic", fontFamily: '"Century Gothic", Futura, sans-serif' },
  { id: "avant-garde", fontFamily: '"Avant Garde", "Century Gothic", sans-serif' },
  { id: "calibri", fontFamily: "Calibri, Candara, Segoe, sans-serif" },
  { id: "cambria", fontFamily: "Cambria, Cochin, Georgia, serif" },
  { id: "rockwell", fontFamily: "Rockwell, 'Courier Bold', serif" },
  { id: "consolas", fontFamily: "Consolas, Menlo, Monaco, monospace" },
  { id: "monaco", fontFamily: "Monaco, Consolas, monospace" },
  { id: "candara", fontFamily: "Candara, Calibri, Segoe, sans-serif" },
  { id: "hoefler", fontFamily: '"Hoefler Text", Garamond, serif' },
  { id: "segoe-print", fontFamily: '"Segoe Print", "Comic Sans MS", cursive' },
  { id: "papyrus", fontFamily: "Papyrus, fantasy" },
];
const FONT_OPTIONS = FONT_SAMPLE_ROWS.map((row) => ({
  id: row.id,
  label: row.id.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
  fontFamily: row.fontFamily,
}));

const MIN_LIBRARY_COUNT = 4;
const MAX_LIBRARY_COUNT = 12;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeHexColor = (value) => {
  const cleaned = String(value || "")
    .trim()
    .replace(/^#/, "");
  if (/^[a-fA-F0-9]{6}$/.test(cleaned)) {
    return cleaned.toLowerCase();
  }
  if (/^[a-fA-F0-9]{3}$/.test(cleaned)) {
    return cleaned
      .toLowerCase()
      .split("")
      .map((channel) => `${channel}${channel}`)
      .join("");
  }
  return "64748b";
};

const hexToRgb = (value) => {
  const normalized = normalizeHexColor(value);
  return {
    red: parseInt(normalized.slice(0, 2), 16),
    green: parseInt(normalized.slice(2, 4), 16),
    blue: parseInt(normalized.slice(4, 6), 16),
  };
};

const toHexChannel = (value) => {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
};

const rgbToHex = ({ red, green, blue }) => {
  return `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;
};

const lerp = (start, end, t) => start + (end - start) * t;

const mixRgb = (left, right, t) => {
  return {
    red: lerp(left.red, right.red, t),
    green: lerp(left.green, right.green, t),
    blue: lerp(left.blue, right.blue, t),
  };
};

const createToneVariant = (rgb, shift) => {
  if (shift >= 0) {
    return {
      red: lerp(rgb.red, 255, shift),
      green: lerp(rgb.green, 255, shift),
      blue: lerp(rgb.blue, 255, shift),
    };
  }
  const factor = 1 + shift;
  return {
    red: rgb.red * factor,
    green: rgb.green * factor,
    blue: rgb.blue * factor,
  };
};

const rgbToHsl = ({ red, green, blue }) => {
  const r = clamp(red, 0, 255) / 255;
  const g = clamp(green, 0, 255) / 255;
  const b = clamp(blue, 0, 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  const lightness = (max + min) / 2;
  let saturation = 0;

  if (delta !== 0) {
    saturation =
      lightness > 0.5
        ? delta / (2 - max - min)
        : delta / (max + min || 1);

    if (max === r) {
      hue = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      hue = ((b - r) / delta + 2) / 6;
    } else {
      hue = ((r - g) / delta + 4) / 6;
    }
  }

  return { hue, saturation, lightness };
};

const hslToRgb = ({ hue, saturation, lightness }) => {
  if (saturation === 0) {
    const gray = lightness * 255;
    return { red: gray, green: gray, blue: gray };
  }

  const hueToRgb = (p, q, t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return {
    red: hueToRgb(p, q, hue + 1 / 3) * 255,
    green: hueToRgb(p, q, hue) * 255,
    blue: hueToRgb(p, q, hue - 1 / 3) * 255,
  };
};

const normalizeHue = (value) => {
  if (value < 0) return value + 1;
  if (value > 1) return value - 1;
  return value;
};

const transformColorByOption = (color, optionId) => {
  if (optionId === "none") {
    return color;
  }
  const hsl = rgbToHsl(hexToRgb(color));
  const next = { ...hsl };

  if (optionId === "cooler") {
    next.hue = normalizeHue(hsl.hue + 0.055);
    next.saturation = clamp(hsl.saturation + 0.06, 0, 1);
  } else if (optionId === "warmer") {
    next.hue = normalizeHue(hsl.hue - 0.045);
    next.saturation = clamp(hsl.saturation + 0.04, 0, 1);
  } else if (optionId === "muted") {
    next.saturation = clamp(hsl.saturation - 0.2, 0, 1);
    next.lightness = clamp(hsl.lightness + 0.05, 0, 1);
  }

  return rgbToHex(hslToRgb(next));
};

const buildLibraryColors = (source, count) => {
  if (!source.length) {
    return FALLBACK_PALETTE.slice(0, count);
  }

  const normalizedStops = source.map(normalizeHexColor).map((color) => `#${color}`);
  if (normalizedStops.length >= count) {
    return normalizedStops.slice(0, count);
  }

  if (normalizedStops.length === 1) {
    const base = hexToRgb(normalizedStops[0]);
    return Array.from({ length: count }, (_, index) => {
      const ratio = count === 1 ? 0.5 : index / (count - 1);
      const shift = (ratio - 0.5) * 0.56;
      return rgbToHex(createToneVariant(base, shift));
    });
  }

  const stopColors = normalizedStops.map(hexToRgb);
  const maxStopIndex = stopColors.length - 1;
  return Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0 : index / (count - 1);
    const scaledIndex = ratio * maxStopIndex;
    const leftIndex = Math.floor(scaledIndex);
    const rightIndex = Math.min(maxStopIndex, leftIndex + 1);
    const localRatio = scaledIndex - leftIndex;
    const mixed = mixRgb(stopColors[leftIndex], stopColors[rightIndex], localRatio);
    return rgbToHex(mixed);
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
  const [activeColorOption, setActiveColorOption] = useState("none");
  const [selectedFontId, setSelectedFontId] = useState(FONT_OPTIONS[0]?.id ?? "times");
  const paletteRef = useRef(null);
  const [paletteSelection, setPaletteSelection] = useState({
    hasSelection: false,
    isLocked: false,
  });
  const [libraryColorOverrides, setLibraryColorOverrides] = useState({});

  const transformedPalette = useMemo(() => {
    return displayPalette.map((color) =>
      transformColorByOption(color, activeColorOption)
    );
  }, [activeColorOption, displayPalette]);

  const generatedLibraryColors = useMemo(() => {
    return buildLibraryColors(transformedPalette, libraryCount);
  }, [transformedPalette, libraryCount]);
  const libraryColors = useMemo(() => {
    return generatedLibraryColors.map(
      (color, index) => libraryColorOverrides[index] ?? color
    );
  }, [generatedLibraryColors, libraryColorOverrides]);
  const selectedFont = useMemo(() => {
    return (
      FONT_OPTIONS.find((option) => option.id === selectedFontId) ?? FONT_OPTIONS[0]
    );
  }, [selectedFontId]);

  useEffect(() => {
    setLibraryColorOverrides({});
  }, [selectedStyle?.id]);

  const handleTogglePaletteLock = useCallback(() => {
    paletteRef.current?.toggleSelectedSphereLock?.();
  }, []);

  const handleLibraryColorChange = useCallback(({ index, color }) => {
    if (!Number.isInteger(index) || index < 0) {
      return;
    }
    setLibraryColorOverrides((current) => ({
      ...current,
      [index]: `#${normalizeHexColor(color)}`,
    }));
  }, []);

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
                ref={paletteRef}
                title={selectedStyle?.title || "Style palette"}
                colors={libraryColors}
                onSelectionStateChange={setPaletteSelection}
                onColorChange={handleLibraryColorChange}
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
                      onClick={handleTogglePaletteLock}
                      disabled={!paletteSelection.hasSelection}
                      aria-label="Lock palette"
                      aria-pressed={paletteSelection.isLocked}
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
                <label className="inspire-style-select-row">
                  <span className="inspire-style-select-label">Font</span>
                  <select
                    className="inspire-style-select"
                    value={selectedFontId}
                    onChange={(event) => setSelectedFontId(event.target.value)}
                    aria-label="Select font"
                  >
                    {FONT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="inspire-style-placeholders">
              {COLOR_OPTION_ITEMS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`inspire-style-placeholder${
                    activeColorOption === option.id ? " is-selected" : ""
                  }`}
                  onClick={() => setActiveColorOption(option.id)}
                  aria-pressed={activeColorOption === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="inspire-style-panel is-empty inspire-style-type-showcase">
            <div className="inspire-style-type-header">Type Preview</div>
            <p
              className="inspire-style-type-active"
              style={{ fontFamily: selectedFont?.fontFamily }}
            >
              Quick brown fox jumps over the lazy dog
            </p>
            <div className="inspire-style-type-rows">
              {FONT_SAMPLE_ROWS.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`inspire-style-type-row${
                    selectedFontId === row.id ? " is-selected" : ""
                  }`}
                  style={{ fontFamily: row.fontFamily }}
                  onClick={() => setSelectedFontId(row.id)}
                  aria-pressed={selectedFontId === row.id}
                >
                  Quick brown fox jumps over the lazy dog
                </button>
              ))}
            </div>
          </div>
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
