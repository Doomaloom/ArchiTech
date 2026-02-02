import { roundValue } from "../../../_lib/geometry";

const TEXT_TAGS = new Set([
  "P",
  "SPAN",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BUTTON",
  "LABEL",
  "A",
  "LI",
  "SMALL",
  "STRONG",
  "EM",
]);

const clampNumber = (value, fallback) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return value;
};

export const normalizeColor = (value) => {
  if (!value) {
    return "#0f172a";
  }
  if (value.startsWith("rgb")) {
    const match = value.match(/rgba?\\(([^)]+)\\)/);
    if (!match) {
      return "#0f172a";
    }
    const [r, g, b] = match[1]
      .split(",")
      .slice(0, 3)
      .map((channel) => Number.parseInt(channel.trim(), 10));
    if ([r, g, b].some((channel) => Number.isNaN(channel))) {
      return "#0f172a";
    }
    const toHex = (channel) => channel.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return value;
};

export const isEditableTarget = (target) => {
  if (!target || !target.closest) {
    return false;
  }
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable=''], [contenteditable='true']"
    )
  );
};

export const getEditableTextElement = (element) => {
  if (!element) {
    return null;
  }
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
    return element;
  }
  if (element.childElementCount > 0 && !TEXT_TAGS.has(element.tagName)) {
    return null;
  }
  const text = element.textContent ?? "";
  if (!text.trim()) {
    return null;
  }
  return element;
};

const hasNestedGemNode = (element) => {
  if (!element?.querySelector) {
    return false;
  }
  return Boolean(element.querySelector("[data-gem-id]"));
};

const hasTextContent = (element) => {
  const text = element?.textContent ?? "";
  return Boolean(text.trim());
};

export const isTextTransformTarget = (element) => {
  if (!element) {
    return false;
  }
  if (getEditableTextElement(element)) {
    return true;
  }
  if (hasNestedGemNode(element)) {
    return false;
  }
  return hasTextContent(element);
};

export const getTransformTextElement = (element) =>
  isTextTransformTarget(element) ? element : null;

export const getTextSnapshot = (element) => {
  if (!element || typeof window === "undefined") {
    return null;
  }
  const computed = window.getComputedStyle(element);
  const fontSize = clampNumber(parseFloat(computed.fontSize), 16);
  const lineHeightPx = parseFloat(computed.lineHeight);
  const lineHeight = clampNumber(lineHeightPx / fontSize, 1.4);
  const letterSpacing = clampNumber(parseFloat(computed.letterSpacing), 0);
  return {
    text: element.value ?? element.textContent ?? "",
    fontSize: roundValue(fontSize),
    lineHeight: roundValue(lineHeight),
    letterSpacing: roundValue(letterSpacing),
    fontWeight: computed.fontWeight || "500",
    fontFamily: computed.fontFamily || "system-ui, sans-serif",
    textAlign: computed.textAlign || "left",
    textTransform: computed.textTransform || "none",
    color: normalizeColor(computed.color),
  };
};
