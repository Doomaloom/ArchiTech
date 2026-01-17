"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="code-editor-loader">Loading editor...</div>,
});

const FILE_GROUPS = [
  {
    label: "Workspace",
    items: [
      { id: "workspace/app.ts", label: "app.ts", language: "typescript" },
      { id: "workspace/editor.tsx", label: "editor.tsx", language: "typescript" },
      { id: "workspace/workspace.ts", label: "workspace.ts", language: "typescript" },
    ],
  },
  {
    label: "Features",
    items: [
      { id: "features/git.ts", label: "git.ts", language: "typescript" },
      { id: "features/diff.ts", label: "diff.ts", language: "typescript" },
      { id: "features/search.ts", label: "search.ts", language: "typescript" },
    ],
  },
  {
    label: "Config",
    items: [
      { id: "config/settings.json", label: "settings.json", language: "json" },
      { id: "config/extensions.json", label: "extensions.json", language: "json" },
    ],
  },
];

const INITIAL_TABS = [
  FILE_GROUPS[0].items[0],
  FILE_GROUPS[0].items[1],
  FILE_GROUPS[2].items[0],
];

const INITIAL_CONTENTS = {
  "workspace/app.ts": `import { createWorkspace } from "./workspace";
import { enableDiff } from "../features/diff";
import { enableGit } from "../features/git";
import { enableSearch } from "../features/search";

const workspace = createWorkspace({
  name: "Gem",
  root: "/workspace",
  autosave: "onFocusChange",
});

enableGit(workspace, { initOnFirstSave: true });
enableSearch(workspace);
enableDiff(workspace);

export function openFile(path: string) {
  return workspace.open({ path, reveal: true });
}

export function saveAll() {
  return workspace.save({ scope: "all" });
}
`,
  "workspace/editor.tsx": `import { WorkspaceStatus } from "./workspace";

export function EditorShell() {
  return (
    <section className="editor-shell">
      <header className="editor-header">
        <h1>Gem Editor</h1>
      </header>
      <WorkspaceStatus branch="main" changes={3} />
    </section>
  );
}
`,
  "workspace/workspace.ts": `export type WorkspaceOptions = {
  name: string;
  root: string;
  autosave: "off" | "onFocusChange" | "afterDelay";
};

export type Workspace = ReturnType<typeof createWorkspace>;

export function createWorkspace(options: WorkspaceOptions) {
  return {
    ...options,
    open: ({ path, reveal = false }: { path: string; reveal?: boolean }) => ({
      path,
      reveal,
    }),
    save: ({ scope }: { scope: "active" | "all" }) => ({
      scope,
      status: "ok",
    }),
    search: ({ term }: { term: string }) => ["/workspace/" + term + ".ts"],
    diff: ({
      left,
      right,
      staged = false,
    }: {
      left?: string;
      right?: string;
      staged?: boolean;
    }) => ({ left, right, staged }),
    register: (name: string, handler: unknown) => ({ name, handler }),
  };
}

export function WorkspaceStatus({
  branch,
  changes,
}: {
  branch: string;
  changes: number;
}) {
  return (
    <div className="workspace-status">
      <span>{branch}</span>
      <span>{changes} changes</span>
    </div>
  );
}
`,
  "features/git.ts": `import type { Workspace } from "../workspace/workspace";

export function enableGit(
  workspace: Workspace,
  options: { initOnFirstSave: boolean }
) {
  return workspace.register("git", {
    init: options.initOnFirstSave,
    status: () => workspace.diff({ staged: false }),
  });
}
`,
  "features/diff.ts": `import type { Workspace } from "../workspace/workspace";

export function enableDiff(workspace: Workspace) {
  return workspace.register("diff", {
    compare: (left: string, right: string) => workspace.diff({ left, right }),
  });
}
`,
  "features/search.ts": `import type { Workspace } from "../workspace/workspace";

export function enableSearch(workspace: Workspace) {
  return workspace.register("search", {
    query: (term: string) => workspace.search({ term }),
  });
}
`,
  "config/settings.json": `{
  "editor.tabSize": 2,
  "editor.wordWrap": "on",
  "editor.minimap.enabled": false,
  "workspace.autosave": "onFocusChange",
  "git.autofetch": true
}
`,
  "config/extensions.json": `{
  "recommendations": ["eslint", "prettier", "github.copilot"]
}
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
  monaco.editor.defineTheme("gem-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "94a3b8" },
      { token: "keyword", foreground: "1e3a8a" },
      { token: "string", foreground: "0369a1" },
      { token: "number", foreground: "0f766e" },
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

export default function Page4() {
  useEffect(() => {
    document.body.classList.add("code-page");
    return () => {
      document.body.classList.remove("code-page");
    };
  }, []);

  const [tabs, setTabs] = useState(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState(INITIAL_TABS[0].id);
  const [fileContents, setFileContents] = useState(INITIAL_CONTENTS);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const activeLanguage = activeTab?.language ?? "typescript";
  const activeContent = fileContents[activeTab?.id] ?? "";

  const dirtyCount = tabs.filter(
    (tab) => fileContents[tab.id] !== INITIAL_CONTENTS[tab.id]
  ).length;

  const handleFileSelect = (file) => {
    setActiveTabId(file.id);
    setTabs((current) => {
      if (current.some((tab) => tab.id === file.id)) {
        return current;
      }
      return [...current, file];
    });
  };

  const handleEditorChange = (value) => {
    if (!activeTab) {
      return;
    }
    setFileContents((prev) => ({
      ...prev,
      [activeTab.id]: value ?? "",
    }));
  };

  return (
    <div className="code-shell">
      <div className="code-panel">
        <header className="code-panel-header">
          <div className="code-panel-title">
            <span className="code-panel-kicker">Code Workspace</span>
            <span className="code-panel-project">Gem Editor</span>
          </div>
          <div className="code-panel-actions">
            <button className="code-action" type="button">
              Save
            </button>
            <button className="code-action" type="button">
              Diff
            </button>
            <button className="code-action" type="button">
              Search
            </button>
            <button className="code-action" type="button">
              Git Init
            </button>
          </div>
        </header>

        <div className="code-workspace">
          <nav className="code-activity" aria-label="Activity bar">
            <button
              className="code-activity-button is-active"
              type="button"
              aria-label="Explorer"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 6h7l2 2h7v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 10h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </button>
            <button className="code-activity-button" type="button" aria-label="Search">
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
                  d="M16.5 16.5L20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              className="code-activity-button"
              type="button"
              aria-label="Source control"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="6" cy="6" r="2.5" fill="currentColor" />
                <circle cx="18" cy="18" r="2.5" fill="currentColor" />
                <path
                  d="M8.5 7.5L15.5 16.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              className="code-activity-button"
              type="button"
              aria-label="Extensions"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M5 8l4-4 4 4-4 4-4-4zM11 14l4-4 4 4-4 4-4-4z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="code-activity-button"
              type="button"
              aria-label="Settings"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 8.3a3.7 3.7 0 100 7.4 3.7 3.7 0 000-7.4z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M19.4 12a7.4 7.4 0 00-.1-1.1l2-1.5-2-3.4-2.3.8a7.6 7.6 0 00-1.9-1.1l-.3-2.4H9.2l-.3 2.4a7.6 7.6 0 00-1.9 1.1l-2.3-.8-2 3.4 2 1.5a7.4 7.4 0 000 2.2l-2 1.5 2 3.4 2.3-.8a7.6 7.6 0 001.9 1.1l.3 2.4h5.6l.3-2.4a7.6 7.6 0 001.9-1.1l2.3.8 2-3.4-2-1.5c.1-.4.1-.7.1-1.1z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </nav>

          <aside className="code-sidebar" aria-label="Explorer">
            <div className="code-sidebar-header">
              <span className="code-sidebar-title">Explorer</span>
              <button className="code-sidebar-action" type="button" aria-label="New file">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 6v12M6 12h12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="code-tree">
              {FILE_GROUPS.map((group) => (
                <div key={group.label} className="code-tree-group">
                  <span className="code-tree-title">{group.label}</span>
                  <div className="code-tree-list">
                    {group.items.map((file) => {
                      const isActive = file.id === activeTabId;
                      return (
                        <button
                          key={file.id}
                          type="button"
                          className={
                            isActive
                              ? "code-tree-item is-active"
                              : "code-tree-item"
                          }
                          onClick={() => handleFileSelect(file)}
                        >
                          <span className="code-file-dot" aria-hidden="true" />
                          <span className="code-file-name">{file.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="code-editor-pane" aria-label="Editor">
            <div className="code-tabs" role="tablist">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const isDirty =
                  fileContents[tab.id] !== INITIAL_CONTENTS[tab.id];
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    className={isActive ? "code-tab is-active" : "code-tab"}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <span className="code-tab-label">{tab.label}</span>
                    {isDirty ? (
                      <span className="code-tab-status" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="code-editor-frame">
              <MonacoEditor
                language={activeLanguage}
                theme="gem-light"
                value={activeContent}
                height="100%"
                width="100%"
                onChange={handleEditorChange}
                beforeMount={handleEditorWillMount}
                options={EDITOR_OPTIONS}
              />
            </div>
            <footer className="code-statusbar">
              <div className="code-status-group">
                <span className="code-status-pill">main</span>
                <span className="code-status-pill">
                  {dirtyCount} changes
                </span>
              </div>
              <div className="code-status-group">
                <span className="code-status-pill">
                  {activeLanguage.toUpperCase()}
                </span>
                <span className="code-status-pill">Spaces: 2</span>
                <span className="code-status-pill">UTF-8</span>
              </div>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}
