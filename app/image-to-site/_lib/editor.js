export const EDITOR_OPTIONS = {
  fontSize: 13,
  fontFamily:
    "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace",
  lineNumbersMinChars: 3,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  wordWrap: "on",
  tabSize: 2,
  automaticLayout: true,
};

export const handleEditorWillMount = (monaco) => {
  monaco.editor.defineTheme("imageflow-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "94a3b8" },
      { token: "keyword", foreground: "0f766e" },
      { token: "string", foreground: "0369a1" },
      { token: "number", foreground: "1d4ed8" },
      { token: "type", foreground: "4338ca" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.lineHighlightBackground": "#eef2f766",
      "editor.selectionBackground": "#dbeafe80",
      "editor.inactiveSelectionBackground": "#e2e8f066",
      "editorLineNumber.foreground": "#94a3b8",
      "editorLineNumber.activeForeground": "#475569",
      "editorCursor.foreground": "#0f172a",
      "editorIndentGuide.background": "#e2e8f080",
      "editorIndentGuide.activeBackground": "#cbd5e199",
    },
  });
};
