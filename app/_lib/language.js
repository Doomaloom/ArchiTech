export const getLanguageFromFilename = (filename) => {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  switch (extension) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "css":
      return "css";
    case "html":
      return "html";
    case "md":
      return "markdown";
    case "svg":
      return "svg";
    default:
      return "plaintext";
  }
};

export const LANGUAGE_BADGES = {
  typescript: { label: "TS", className: "is-ts" },
  javascript: { label: "JS", className: "is-js" },
  css: { label: "CSS", className: "is-css" },
  json: { label: "JSON", className: "is-json" },
  markdown: { label: "MD", className: "is-md" },
  svg: { label: "SVG", className: "is-svg" },
  html: { label: "HTML", className: "is-html" },
  plaintext: { label: "TXT", className: "is-text" },
};

export const getLanguageBadge = (language) => {
  return LANGUAGE_BADGES[language] ?? LANGUAGE_BADGES.plaintext;
};
