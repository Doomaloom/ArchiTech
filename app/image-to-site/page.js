"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="imageflow-editor-loader">Loading editor...</div>,
});

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes)) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const DEMO_PAGES = [
  { id: "page-home", label: "Home", position: { x: 260, y: 20 } },
  { id: "page-search", label: "Search", position: { x: 40, y: 140 } },
  { id: "page-watch", label: "Watch", position: { x: 260, y: 140 } },
  { id: "page-login", label: "Login", position: { x: 480, y: 140 } },
  { id: "page-subscriptions", label: "Subscriptions", position: { x: 40, y: 260 } },
  { id: "page-library", label: "Library", position: { x: 260, y: 260 } },
  { id: "page-channel", label: "Channel", position: { x: 480, y: 260 } },
  { id: "page-playlists", label: "Playlists", position: { x: 40, y: 380 } },
  { id: "page-history", label: "History", position: { x: 260, y: 380 } },
  { id: "page-settings", label: "Settings", position: { x: 480, y: 380 } },
];

const DEMO_EDGES = [
  { id: "edge-home-search", source: "page-home", target: "page-search" },
  { id: "edge-home-watch", source: "page-home", target: "page-watch" },
  { id: "edge-home-login", source: "page-home", target: "page-login" },
  { id: "edge-search-subscriptions", source: "page-search", target: "page-subscriptions" },
  { id: "edge-watch-library", source: "page-watch", target: "page-library" },
  { id: "edge-login-channel", source: "page-login", target: "page-channel" },
  { id: "edge-subscriptions-playlists", source: "page-subscriptions", target: "page-playlists" },
  { id: "edge-library-history", source: "page-library", target: "page-history" },
  { id: "edge-channel-settings", source: "page-channel", target: "page-settings" },
];

const CODE_FILE_GROUPS = [
  {
    label: "gem-studio",
    items: [
      { id: "src/app/layout.tsx", label: "layout.tsx", language: "typescript" },
      { id: "src/app/page.tsx", label: "page.tsx", language: "typescript" },
      { id: "src/components/hero/hero.tsx", label: "hero.tsx", language: "typescript" },
      { id: "src/components/ui/button.tsx", label: "button.tsx", language: "typescript" },
      { id: "src/components/ui/card.tsx", label: "card.tsx", language: "typescript" },
      { id: "src/hooks/useTheme.ts", label: "useTheme.ts", language: "typescript" },
      { id: "src/lib/format.ts", label: "format.ts", language: "typescript" },
      { id: "styles/globals.css", label: "globals.css", language: "css" },
      { id: "styles/theme.css", label: "theme.css", language: "css" },
      { id: "config/site.json", label: "site.json", language: "json" },
      { id: "config/theme.json", label: "theme.json", language: "json" },
      { id: "public/logo.svg", label: "logo.svg", language: "svg" },
      { id: "README.md", label: "README.md", language: "markdown" },
    ],
  },
];

const INITIAL_CODE_CONTENTS = {
  "src/app/layout.tsx": `export const metadata = {
  title: "Gem Studio",
  description: "Generated from your upload.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  "src/app/page.tsx": `import { Hero } from "../components/hero/hero";

export default function Page() {
  return (
    <main className="page">
      <Hero />
    </main>
  );
}
`,
  "src/components/hero/hero.tsx": `import { Button } from "../ui/button";

export function Hero() {
  return (
    <section className="hero">
      <h1>Build faster with Gem Studio</h1>
      <p>Convert layouts into clean, production-ready UI.</p>
      <Button>Start building</Button>
    </section>
  );
}
`,
  "src/components/ui/button.tsx": `export function Button({ children }) {
  return <button className="button">{children}</button>;
}
`,
  "src/components/ui/card.tsx": `export function Card({ children }) {
  return <div className="card">{children}</div>;
}
`,
  "src/hooks/useTheme.ts": `export function useTheme() {
  return { mode: "light", accent: "#f97316" };
}
`,
  "src/lib/format.ts": `export const formatTitle = (value: string) =>
  value.replace(/-/g, " ").toUpperCase();
`,
  "styles/globals.css": `:root {
  color-scheme: light;
  --accent: #f97316;
}

body {
  margin: 0;
  font-family: "Space Grotesk", system-ui, sans-serif;
  background: #f8fafc;
  color: #0f172a;
}

.hero {
  padding: 96px 80px;
}
`,
  "styles/theme.css": `.button {
  background: var(--accent);
  color: #fff7ed;
  border: none;
  padding: 12px 18px;
  border-radius: 999px;
}
`,
  "config/site.json": `{
  "brand": "Gem Studio",
  "cta": "Start building",
  "layout": "landing"
}
`,
  "config/theme.json": `{
  "accent": "#f97316",
  "radius": 16,
  "glass": true
}
`,
  "public/logo.svg": `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="28" fill="#f97316" />
  <path d="M20 36l8-16 8 16 8-16" fill="none" stroke="#fff7ed" stroke-width="4" />
</svg>
`,
  "README.md": `# Gem Studio

Sample project with a nested tree to preview file navigation.
`,
};

const EDITOR_OPTIONS = {
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

const handleEditorWillMount = (monaco) => {
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

const getLanguageFromFilename = (filename) => {
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

const LANGUAGE_BADGES = {
  typescript: { label: "TS", className: "is-ts" },
  javascript: { label: "JS", className: "is-js" },
  css: { label: "CSS", className: "is-css" },
  json: { label: "JSON", className: "is-json" },
  markdown: { label: "MD", className: "is-md" },
  svg: { label: "SVG", className: "is-svg" },
  html: { label: "HTML", className: "is-html" },
  plaintext: { label: "TXT", className: "is-text" },
};

const getLanguageBadge = (language) => {
  return LANGUAGE_BADGES[language] ?? LANGUAGE_BADGES.plaintext;
};

const buildFileTree = (files) => {
  const root = { name: "", path: "", children: new Map(), file: null };

  files.forEach((file) => {
    const parts = file.id.split("/").filter(Boolean);
    let cursor = root;
    parts.forEach((part, index) => {
      const isLeaf = index === parts.length - 1;
      if (!cursor.children.has(part)) {
        cursor.children.set(part, {
          name: part,
          path: cursor.path ? `${cursor.path}/${part}` : part,
          children: new Map(),
          file: isLeaf ? file : null,
        });
      }
      cursor = cursor.children.get(part);
      if (isLeaf) {
        cursor.file = file;
      }
    });
  });

  const toArray = (node) => {
    return Array.from(node.children.values()).map((child) => ({
      ...child,
      children: toArray(child),
    }));
  };

  return toArray(root);
};

export default function ImageToSitePage() {
  const [fileMeta, setFileMeta] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState("start");
  const [previewCount, setPreviewCount] = useState(3);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [speedValue, setSpeedValue] = useState(60);
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [customFiles, setCustomFiles] = useState([]);
  const [activeCodeFileId, setActiveCodeFileId] = useState(
    CODE_FILE_GROUPS[0].items[0].id
  );
  const [openCodeTabs, setOpenCodeTabs] = useState(() => [
    CODE_FILE_GROUPS[0].items[0],
    CODE_FILE_GROUPS[0].items[1],
  ]);
  const [codePanelMode, setCodePanelMode] = useState("agent");
  const [collapsedFolders, setCollapsedFolders] = useState(() => ({}));
  const [codeContents, setCodeContents] = useState(INITIAL_CODE_CONTENTS);
  const [agentInput, setAgentInput] = useState("");
  const [agentMessages, setAgentMessages] = useState([
    {
      role: "assistant",
      text: "Upload a layout or describe the UI changes and I will draft the code.",
    },
    {
      role: "assistant",
      text: "I can also open new files, refactor sections, and sync the theme.",
    },
  ]);
  const objectUrlsRef = useRef([]);
  const [selectedNodeId, setSelectedNodeId] = useState(
    DEMO_PAGES[0]?.id ?? null
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(() =>
    DEMO_PAGES.map((page) => ({
      id: page.id,
      position: page.position,
      data: { label: page.label },
      type: "default",
    }))
  );
  const [edges, , onEdgesChange] = useEdgesState(DEMO_EDGES);

  const hasFile = Boolean(fileMeta);
  const dropTitle = hasFile
    ? "Image ready for conversion"
    : "Drop an image or click to browse";
  const dropMeta = hasFile
    ? "Drag a new file to replace the current one."
    : "PNG, JPG, WebP up to 12MB";
  const fileSizeLabel = useMemo(() => {
    if (!fileMeta) {
      return "";
    }
    return formatFileSize(fileMeta.size);
  }, [fileMeta]);

  const activePreview = gallery[activeIndex] ?? fileMeta?.previewUrl ?? null;
  const codeFileGroups = useMemo(() => {
    if (!customFiles.length) {
      return CODE_FILE_GROUPS;
    }
    return [
      ...CODE_FILE_GROUPS,
      {
        label: "Uploads",
        items: customFiles,
      },
    ];
  }, [customFiles]);
  const codeTreeGroups = useMemo(() => {
    return codeFileGroups.map((group) => ({
      label: group.label,
      tree: buildFileTree(group.items),
    }));
  }, [codeFileGroups]);
  const activeCodeFile = useMemo(() => {
    return codeFileGroups
      .flatMap((group) => group.items)
      .find((file) => file.id === activeCodeFileId);
  }, [activeCodeFileId, codeFileGroups]);
  const fallbackCodeFile = useMemo(() => {
    return openCodeTabs.find((file) => file.id === activeCodeFileId);
  }, [activeCodeFileId, openCodeTabs]);
  const resolvedCodeFile = activeCodeFile ?? fallbackCodeFile;
  const activeCodeLanguage = resolvedCodeFile?.language ?? "typescript";
  const activeCodeContent = codeContents[activeCodeFileId] ?? "";

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const selectedId = DEMO_PAGES[activeIndex % DEMO_PAGES.length]?.id ?? null;
    if (selectedId) {
      setSelectedNodeId(selectedId);
    }
    setNodes((current) =>
      current.map((node) => ({ ...node, selected: node.id === selectedId }))
    );
  }, [activeIndex, setNodes]);

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      }))
    );
  }, [selectedNodeId, setNodes]);

  const selectedNodeLabel =
    DEMO_PAGES.find((page) => page.id === selectedNodeId)?.label ?? "Unknown";
  const qualityValue = 100 - speedValue;

  useEffect(() => {
    const buttons = Array.from(
      document.querySelectorAll("[data-imageflow-step]")
    );

    const handleClick = (event) => {
      const target = event.currentTarget;
      const step = target?.dataset?.imageflowStep;
      if (step) {
        setViewMode(step);
      }
    };

    buttons.forEach((button) => {
      button.addEventListener("click", handleClick);
    });

    return () => {
      buttons.forEach((button) => {
        button.removeEventListener("click", handleClick);
      });
    };
  }, []);

  useEffect(() => {
    const buttons = Array.from(
      document.querySelectorAll("[data-imageflow-step]")
    );

    buttons.forEach((button) => {
      const step = button?.dataset?.imageflowStep;
      if (!step) {
        return;
      }
      const isActive =
        step === viewMode ||
        (step === "preview" && viewMode === "selected");
      button.classList.toggle("is-active", isActive);
    });
  }, [viewMode]);

  const handleFile = (file) => {
    if (!file) {
      setFileMeta(null);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(previewUrl);
    setFileMeta({
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl,
    });
    setGallery((prev) => [previewUrl, ...prev].slice(0, 6));
    setActiveIndex(0);
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    setTitle(baseName);
    setName(file.name);
    setDetails(file.type ? `File type: ${file.type}` : "File type: image");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    handleFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (viewMode === "code") {
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const contents =
          typeof reader.result === "string" ? reader.result : "";
        const id = `uploads/${file.name}`;
        const language = getLanguageFromFilename(file.name);
        const newFile = { id, label: file.name, language };
        setCustomFiles((prev) =>
          prev.some((item) => item.id === id) ? prev : [...prev, newFile]
        );
        setCodeContents((prev) => ({ ...prev, [id]: contents }));
        setOpenCodeTabs((prev) =>
          prev.some((item) => item.id === id) ? prev : [...prev, newFile]
        );
        setActiveCodeFileId(id);
        setCodePanelMode("files");
      };
      reader.readAsText(file);
      return;
    }
    handleFile(file);
  };

  const handleOpenCodeFile = (file) => {
    setActiveCodeFileId(file.id);
    setOpenCodeTabs((prev) =>
      prev.some((item) => item.id === file.id) ? prev : [...prev, file]
    );
  };

  const handleEditorChange = (value) => {
    setCodeContents((prev) => ({
      ...prev,
      [activeCodeFileId]: value ?? "",
    }));
  };

  const handleToggleFolder = (folderKey) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderKey]: !prev[folderKey],
    }));
  };

  const renderFileTree = (nodes, groupLabel, depth = 0) => {
    return nodes.map((node) => {
      const isFile = Boolean(node.file);
      const folderKey = `${groupLabel}/${node.path}`;
      const isCollapsed = collapsedFolders[folderKey];
      const indentStyle = { "--indent": depth };

      if (isFile) {
        const badge = getLanguageBadge(node.file.language);
        return (
          <button
            key={node.path}
            type="button"
            className={`imageflow-file-button imageflow-file-node${
              node.file.id === activeCodeFileId ? " is-active" : ""
            }`}
            style={indentStyle}
            onClick={() => handleOpenCodeFile(node.file)}
          >
            <span className={`imageflow-file-icon ${badge.className}`}>
              {badge.label}
            </span>
            <span className="imageflow-file-name">{node.name}</span>
          </button>
        );
      }

      return (
        <div key={node.path} className="imageflow-file-folder">
          <button
            type="button"
            className="imageflow-file-group-toggle imageflow-file-node"
            style={indentStyle}
            onClick={() => handleToggleFolder(folderKey)}
            aria-expanded={!isCollapsed}
          >
            <span
              className={`imageflow-file-chevron${
                isCollapsed ? " is-collapsed" : ""
              }`}
              aria-hidden="true"
            />
            <span className="imageflow-file-folder-name">{node.name}</span>
          </button>
          {isCollapsed ? null : renderFileTree(node.children, groupLabel, depth + 1)}
        </div>
      );
    });
  };

  const handleAgentSend = () => {
    const trimmed = agentInput.trim();
    if (!trimmed) {
      return;
    }
    setAgentMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      {
        role: "assistant",
        text: "Queued: drafting updates and syncing the file tree.",
      },
    ]);
    setAgentInput("");
  };

  return (
    <div className="imageflow-shell">
      <div className="imageflow-panel">
        <div
          className={`imageflow-layout${viewMode === "code" ? " is-code" : ""}`}
        >
          <section
            className={`imageflow-dropzone${hasFile ? " is-ready" : ""}${
              isDragging ? " is-dragging" : ""
            }${viewMode === "nodes" ? " is-tree" : ""}${
              viewMode === "preview" ? " is-preview" : ""
            }${viewMode === "code" ? " is-code" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {viewMode === "code" ? (
              <div className="imageflow-code-editor" aria-label="Code editor">
                <div className="imageflow-code-tabs" role="tablist">
                  {openCodeTabs.map((tab) => {
                    const isActive = tab.id === activeCodeFileId;
                    return (
                      <button
                        key={tab.id}
                        role="tab"
                        type="button"
                        aria-selected={isActive}
                        className={
                          isActive
                            ? "imageflow-code-tab is-active"
                            : "imageflow-code-tab"
                        }
                        onClick={() => handleOpenCodeFile(tab)}
                      >
                        <span className="imageflow-code-tab-label">
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="imageflow-editor-frame">
                  <MonacoEditor
                    language={activeCodeLanguage}
                    theme="imageflow-light"
                    value={activeCodeContent}
                    height="100%"
                    width="100%"
                    onChange={handleEditorChange}
                    beforeMount={handleEditorWillMount}
                    options={EDITOR_OPTIONS}
                  />
                </div>
                {isDragging ? (
                  <div className="imageflow-drop-overlay">
                    Drop files to add them to the workspace.
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <div className="imageflow-media-controls" aria-label="Image tools">
                  <button
                    className="imageflow-control-button"
                    type="button"
                    aria-label="Previous image"
                    onClick={() =>
                      setActiveIndex((current) =>
                        current > 0 ? current - 1 : Math.max(gallery.length - 1, 0)
                      )
                    }
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M14 6l-6 6 6 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    className="imageflow-control-button"
                    type="button"
                    aria-label="Zoom image"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle
                        cx="11"
                        cy="11"
                        r="6.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M11 8v6M8 11h6M16.5 16.5L20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  <button
                    className="imageflow-control-button"
                    type="button"
                    aria-label="Delete image"
                    onClick={() => {
                      if (!gallery.length) {
                        return;
                      }
                      setGallery((prev) => {
                        const next = prev.filter((_, index) => index !== activeIndex);
                        setActiveIndex((current) =>
                          current > 0 ? current - 1 : 0
                        );
                        return next;
                      });
                      setFileMeta(null);
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M6 7h12M9 7V5h6v2M9 10v7M12 10v7M15 10v7M7 7l1 13h8l1-13"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    className="imageflow-control-button"
                    type="button"
                    aria-label="Next image"
                    onClick={() =>
                      setActiveIndex((current) =>
                        gallery.length
                          ? (current + 1) % gallery.length
                          : current
                      )
                    }
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M10 6l6 6-6 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                {viewMode === "nodes" ? (
                  <div className="imageflow-tree" aria-label="Site tree">
                    <ReactFlowProvider>
                      <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={(_, node) => {
                          setSelectedNodeId(node.id);
                          const index = DEMO_PAGES.findIndex(
                            (page) => page.id === node.id
                          );
                          if (index >= 0 && index < gallery.length) {
                            setActiveIndex(index);
                          }
                        }}
                        fitView
                        minZoom={0.3}
                        maxZoom={2.2}
                      >
                        <Background
                          gap={20}
                          size={1}
                          color="rgba(15, 23, 42, 0.12)"
                        />
                        <Controls position="bottom-right" />
                      </ReactFlow>
                    </ReactFlowProvider>
                  </div>
                ) : viewMode === "preview" ? (
                  <div
                    className={`imageflow-previews imageflow-previews--${previewCount}`}
                    aria-label="Generated previews"
                  >
                    {Array.from({ length: previewCount }).map((_, index) => (
                      <button
                        key={`preview-${index}`}
                        className={`imageflow-preview-card${
                          selectedPreviewIndex === index ? " is-selected" : ""
                        }`}
                        type="button"
                        onClick={() => {
                          setSelectedPreviewIndex(index);
                          setViewMode("selected");
                        }}
                      >
                        <span className="imageflow-preview-label">
                          Preview {index + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : viewMode === "selected" ? (
                  <div className="imageflow-previews imageflow-previews--1">
                    <div className="imageflow-preview-card is-selected">
                      <span className="imageflow-preview-label">
                        Preview {selectedPreviewIndex + 1}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      id="imageflow-upload"
                      className="imageflow-file-input"
                      type="file"
                      accept="image/*"
                      aria-label="Upload image"
                      onChange={handleFileChange}
                    />
                    <label
                      className="imageflow-drop-content"
                      htmlFor="imageflow-upload"
                    >
                      {activePreview ? (
                        <img
                          className="imageflow-preview"
                          src={activePreview}
                          alt="Uploaded preview"
                        />
                      ) : (
                        <>
                          <span className="imageflow-drop-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                              <path
                                d="M7 15l3-3 2 2 4-4 3 3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                              />
                              <rect
                                x="4"
                                y="5"
                                width="16"
                                height="14"
                                rx="3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                              />
                              <circle
                                cx="9"
                                cy="9"
                                r="1.6"
                                fill="currentColor"
                              />
                            </svg>
                          </span>
                          <span className="imageflow-drop-title">{dropTitle}</span>
                          <span className="imageflow-drop-meta">{dropMeta}</span>
                        </>
                      )}
                    </label>
                    <div className="imageflow-file-row">
                      {hasFile ? (
                        <div className="imageflow-file-chip">
                          <span className="imageflow-file-name">
                            {fileMeta.name}
                          </span>
                          <span className="imageflow-file-size">
                            {fileSizeLabel}
                          </span>
                        </div>
                      ) : (
                        <span className="imageflow-file-empty">
                          Add an image to start the conversion.
                        </span>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </section>

          {viewMode === "code" ? null : (
            <section className="imageflow-gallery" aria-label="Uploaded gallery">
              <>
                <div className="imageflow-gallery-header">
                  <span className="imageflow-gallery-title">Gallery</span>
                  <span className="imageflow-gallery-meta">
                    {hasFile ? "Latest upload highlighted" : "Awaiting uploads"}
                  </span>
                </div>
                <div className="imageflow-thumbs">
                  {gallery.length ? (
                    gallery.map((src, index) => (
                      <button
                        key={`thumb-${src}`}
                        className={`imageflow-thumb${
                          index === activeIndex ? " is-active" : ""
                        }`}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                      >
                        <img src={src} alt="" />
                      </button>
                    ))
                  ) : (
                    <div className="imageflow-thumb is-empty" aria-hidden="true" />
                  )}
                </div>
              </>
            </section>
          )}

          <aside className="imageflow-info">
            {viewMode === "code" ? (
              <div className="imageflow-agent">
                <div className="imageflow-panel-switch">
                  <button
                    type="button"
                    className={
                      codePanelMode === "agent"
                        ? "imageflow-switch-button is-active"
                        : "imageflow-switch-button"
                    }
                    onClick={() => setCodePanelMode("agent")}
                  >
                    Agent
                  </button>
                  <button
                    type="button"
                    className={
                      codePanelMode === "files"
                        ? "imageflow-switch-button is-active"
                        : "imageflow-switch-button"
                    }
                    onClick={() => setCodePanelMode("files")}
                  >
                    Files
                  </button>
                </div>
                {codePanelMode === "agent" ? (
                  <>
                    <div className="imageflow-agent-header">
                      <p className="imageflow-info-kicker">Gem Code Agent</p>
                      <h1 className="imageflow-info-title">Code assistant</h1>
                      <p className="imageflow-info-subtitle">
                        Ask for refactors, new components, or layout conversions.
                      </p>
                    </div>
                    <div className="imageflow-agent-messages" role="log">
                      {agentMessages.map((message, index) => (
                        <div
                          key={`agent-${index}`}
                          className={`imageflow-agent-bubble is-${message.role}`}
                        >
                          {message.text}
                        </div>
                      ))}
                    </div>
                    <div className="imageflow-agent-input">
                      <textarea
                        className="imageflow-agent-textarea"
                        rows={3}
                        placeholder="Describe the change you want applied..."
                        value={agentInput}
                        onChange={(event) => setAgentInput(event.target.value)}
                      />
                      <button
                        className="imageflow-generate-button"
                        type="button"
                        onClick={handleAgentSend}
                      >
                        Send request
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="imageflow-file-selector">
                    {codeTreeGroups.map((group) => {
                      const groupKey = `group/${group.label}`;
                      const isGroupCollapsed = collapsedFolders[groupKey];
                      return (
                      <div key={group.label} className="imageflow-file-group">
                        <button
                          type="button"
                          className="imageflow-file-group-toggle imageflow-file-node"
                          style={{ "--indent": 0 }}
                          onClick={() => handleToggleFolder(groupKey)}
                          aria-expanded={!isGroupCollapsed}
                        >
                          <span
                            className={`imageflow-file-chevron${
                              isGroupCollapsed ? " is-collapsed" : ""
                            }`}
                            aria-hidden="true"
                          />
                          <span className="imageflow-file-folder-name">
                            {group.label}
                          </span>
                        </button>
                        {isGroupCollapsed ? null : (
                          <div className="imageflow-file-list">
                            {renderFileTree(group.tree, group.label, 1)}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="imageflow-info-header">
                  {viewMode === "nodes" ? (
                    <>
                      <p className="imageflow-info-kicker">Selected node</p>
                      <h1 className="imageflow-info-title">
                        {selectedNodeLabel}
                      </h1>
                      <p className="imageflow-info-subtitle">
                        Pick how many previews to generate for this node.
                      </p>
                    </>
                  ) : viewMode === "preview" || viewMode === "selected" ? (
                    <>
                      <p className="imageflow-info-kicker">Preview selection</p>
                      <h1 className="imageflow-info-title">Choose a preview</h1>
                      <p className="imageflow-info-subtitle">
                        Click a layout to make it the main panel.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="imageflow-info-kicker">Image to Site</p>
                      <h1 className="imageflow-info-title">
                        Conversion details
                      </h1>
                      <p className="imageflow-info-subtitle">
                        Keep the brief tight. We will take the upload and translate
                        it into structure and components.
                      </p>
                    </>
                  )}
                </div>
                {viewMode === "nodes" ? (
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
                            setPreviewCount(Number(event.target.value))
                          }
                        />
                      </label>
                      <label className="imageflow-field">
                        <span className="imageflow-field-label">
                          Speed: {speedValue}
                        </span>
                        <input
                          className="imageflow-slider"
                          type="range"
                          min="0"
                          max="100"
                          value={speedValue}
                          onChange={(event) =>
                            setSpeedValue(Number(event.target.value))
                          }
                        />
                      </label>
                      <label className="imageflow-field">
                        <span className="imageflow-field-label">
                          Quality: {qualityValue}
                        </span>
                        <input
                          className="imageflow-slider"
                          type="range"
                          min="0"
                          max="100"
                          value={qualityValue}
                          onChange={(event) =>
                            setSpeedValue(100 - Number(event.target.value))
                          }
                        />
                      </label>
                    </div>
                    <button
                      className="imageflow-generate-button"
                      type="button"
                      onClick={() => {
                        setSelectedPreviewIndex(0);
                        setViewMode("preview");
                      }}
                    >
                      Generate previews
                    </button>
                  </div>
                ) : viewMode === "preview" || viewMode === "selected" ? (
                  <div className="imageflow-info-fields">
                    <button
                      className="imageflow-generate-button"
                      type="button"
                      onClick={() => setViewMode("preview")}
                    >
                      Regenerate previews
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="imageflow-info-fields">
                      <label className="imageflow-field">
                        <span className="imageflow-field-label">Title</span>
                        <input
                          className="imageflow-input-field"
                          type="text"
                          placeholder="Landing page"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                        />
                      </label>
                      <label className="imageflow-field">
                        <span className="imageflow-field-label">Name</span>
                        <input
                          className="imageflow-input-field"
                          type="text"
                          placeholder="Aurora Studio"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                        />
                      </label>
                      <label className="imageflow-field">
                        <span className="imageflow-field-label">Details</span>
                        <textarea
                          className="imageflow-textarea"
                          rows={6}
                          placeholder="Describe the layout, sections, and key elements."
                          value={details}
                          onChange={(event) => setDetails(event.target.value)}
                        />
                      </label>
                    </div>
                    <button
                      className="imageflow-generate-button"
                      type="button"
                      onClick={() => setViewMode("nodes")}
                    >
                      Generate Website Structure
                    </button>

                  </>
                )}
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
