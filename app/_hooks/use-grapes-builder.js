"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import grapesjs from "grapesjs";
import { STARTER_HTML, STARTER_STYLES } from "./../_lib/grapes-default-template";

const GRAPES_CSS_URL = "https://unpkg.com/grapesjs/dist/css/grapes.min.css";

const TOOLBAR_ICON_DEFS = [
  {
    key: "move",
    keys: ["move", "drag", "arrows", "position"],
    svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'><path d='M12 2v20M2 12h20'/><path d='M12 2l-3 3m3-3 3 3M12 22l-3-3m3 3 3-3M2 12l3-3m-3 3 3 3M22 12l-3-3m3 3-3 3'/></svg>",
  },
  {
    key: "clone",
    keys: ["clone", "copy", "duplicate"],
    svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'><rect x='9' y='9' width='11' height='11' rx='2'/><path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/></svg>",
  },
  {
    key: "delete",
    keys: ["delete", "trash", "remove"],
    svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'><path d='M4 7h16'/><path d='M9 7V5h6v2'/><path d='M10 11v7m4-7v7'/><path d='M6.5 7l1 12a1.8 1.8 0 0 0 1.8 1.6h6.4a1.8 1.8 0 0 0 1.8-1.6l1-12'/></svg>",
  },
  {
    key: "edit",
    keys: ["edit", "pencil"],
    svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'><path d='M5 15l-1 5 5-1 9-9-4-4-9 9z'/><path d='M14 6l4 4'/></svg>",
  },
  {
    key: "parent",
    keys: ["parent", "up", "arrow"],
    svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'><path d='M12 19V5'/><path d='M5 12l7-7 7 7'/></svg>",
  },
  {
    key: "visibility",
    keys: ["eye", "visibility", "view", "preview"],
    svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'><path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z'/><circle cx='12' cy='12' r='3'/></svg>",
  },
  {
    key: "select",
    keys: ["select", "square", "frame", "open"],
    svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'><rect x='6' y='6' width='12' height='12' rx='2.4'/></svg>",
  },
];
const TOOLBAR_ICON_FALLBACK = ["move", "edit", "clone", "delete", "parent", "visibility", "select"];

const ensureGrapesStylesheet = () => {
  const existing = document.getElementById("grapesjs-styles");
  if (existing) {
    return;
  }
  const link = document.createElement("link");
  link.id = "grapesjs-styles";
  link.rel = "stylesheet";
  link.href = GRAPES_CSS_URL;
  document.head.appendChild(link);
};

const parseHtmlContent = (html) => {
  if (!html || typeof DOMParser === "undefined") {
    return { components: STARTER_HTML, styles: STARTER_STYLES };
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("script").forEach((script) => script.remove());
  const styleTags = Array.from(doc.querySelectorAll("style"));
  const styles = styleTags.map((style) => style.textContent || "").join("\n");
  styleTags.forEach((style) => style.remove());
  const bodyHtml = doc.body ? doc.body.innerHTML : html;
  return {
    components: bodyHtml || STARTER_HTML,
    styles: styles || STARTER_STYLES,
  };
};

const applyCanvasScrollbarStyles = (editor) => {
  const doc = editor?.Canvas?.getDocument?.();
  if (!doc) return;
  if (doc.getElementById("gjs-canvas-scrollbar")) return;
  const style = doc.createElement("style");
  style.id = "gjs-canvas-scrollbar";
  style.textContent = `
    * {
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.85) rgba(255, 255, 255, 0.4);
    }
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: rgb(255, 255, 255);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.85);
      border-radius: 999px;
      border: 1px solid rgb(255, 255, 255);
    }
  `;
  doc.head.appendChild(style);
};

const normalizeToolbarLabel = (label) =>
  typeof label === "string" ? label.toLowerCase() : "";

const isMoveToolbarItem = (item) => {
  if (!item) return false;
  if (item.command === "tlb-move") return true;
  if (item.attributes?.draggable) return true;
  const label = normalizeToolbarLabel(item.label);
  return label.includes("move") || label.includes("arrows");
};

const isEditToolbarItem = (item) => {
  if (!item) return false;
  if (item.command === "image-editor") return true;
  const label = normalizeToolbarLabel(item.label);
  return label.includes("pencil") || label.includes("edit");
};

const mergeClassNames = (baseClass, nextClass) => {
  const base = typeof baseClass === "string" ? baseClass.split(" ") : [];
  const trimmed = base.map((value) => value.trim()).filter(Boolean);
  if (!trimmed.includes(nextClass)) {
    trimmed.push(nextClass);
  }
  return trimmed.join(" ");
};

const ensureMoveToolbarItem = (item, stylePrefix) => {
  const attrs = { ...(item.attributes || {}) };
  const requiredClass = `${stylePrefix}no-touch-actions`;
  const nextClass = mergeClassNames(attrs.class, requiredClass);
  const needsClassUpdate = nextClass !== (attrs.class || "");
  const needsDraggable = attrs.draggable !== true;
  if (!needsClassUpdate && !needsDraggable && item.command === "tlb-move") {
    return item;
  }
  return {
    ...item,
    command: "tlb-move",
    attributes: {
      ...attrs,
      draggable: true,
      class: nextClass,
    },
  };
};

const ensureEditToolbarItem = (item, commandId) => {
  if (item.command === commandId) {
    return item;
  }
  return {
    ...item,
    command: commandId,
  };
};

const applyToolbarBehaviorFixes = (editor, openStylesPanel) => {
  if (!editor) return () => {};
  const commandId = "open-styles-panel";
  if (!editor.Commands?.get?.(commandId)) {
    editor.Commands?.add?.(commandId, {
      run: () => openStylesPanel(),
    });
  }
  const stylePrefix = editor.Config?.stylePrefix || "gjs-";
  const updateToolbar = (component) => {
    if (!component?.get) return;
    const toolbar = component.get("toolbar");
    if (!Array.isArray(toolbar) || toolbar.length === 0) return;
    const nextToolbar = toolbar.map((item) => {
      if (isMoveToolbarItem(item)) {
        return ensureMoveToolbarItem(item, stylePrefix);
      }
      if (isEditToolbarItem(item)) {
        return ensureEditToolbarItem(item, commandId);
      }
      return item;
    });
    const changed = nextToolbar.some((item, index) => item !== toolbar[index]);
    if (changed) {
      component.set("toolbar", nextToolbar);
    }
  };
  editor.on("component:selected", updateToolbar);
  return () => {
    editor.off("component:selected", updateToolbar);
  };
};

const RTE_TOOLBAR_OFFSET = 2;
const RTE_TOOLBAR_Z_INDEX = 60;
const RTE_TOOLBAR_SELECTOR =
  ".gjs-rte-toolbar.gjs-one-bg.gjs-rte-toolbar-ui";

const getRteToolbarElement = (editor, rte) => {
  const actionbar = rte?.actionbarEl?.();
  if (actionbar) {
    if (actionbar.classList?.contains("gjs-rte-toolbar")) {
      return actionbar;
    }
    const toolbar = actionbar.closest?.(".gjs-rte-toolbar");
    if (toolbar) {
      return toolbar;
    }
    if (actionbar.parentElement?.classList?.contains("gjs-rte-toolbar")) {
      return actionbar.parentElement;
    }
  }
  const frameDoc = editor?.Canvas?.getDocument?.();
  const frameToolbar =
    frameDoc?.querySelector?.(RTE_TOOLBAR_SELECTOR) ||
    frameDoc?.querySelector?.(".gjs-rte-toolbar");
  if (frameToolbar) {
    return frameToolbar;
  }
  if (typeof document !== "undefined") {
    return (
      document.querySelector(RTE_TOOLBAR_SELECTOR) ||
      document.querySelector(".gjs-rte-toolbar")
    );
  }
  return null;
};

const getRteReferenceRect = (editor, view, toolbar) => {
  if (!editor || !view?.el || !toolbar) return null;
  const toolbarDoc = toolbar.ownerDocument;
  const highlighter =
    editor.Canvas?.getHighlighter?.(view) || editor.Canvas?.getHighlighter?.();
  if (highlighter && highlighter.ownerDocument === toolbarDoc) {
    return highlighter.getBoundingClientRect();
  }

  const targetRect = view.el.getBoundingClientRect();
  const frameEl = editor.Canvas?.getFrameEl?.();
  const frameDoc = editor.Canvas?.getDocument?.();
  if (!frameEl || !frameDoc || toolbarDoc === frameDoc) {
    return targetRect;
  }

  const frameRect = frameEl.getBoundingClientRect();
  const scale =
    frameEl.offsetHeight && frameRect.height
      ? frameRect.height / frameEl.offsetHeight
      : 1;

  return {
    top: frameRect.top + targetRect.top * scale,
    bottom: frameRect.top + targetRect.bottom * scale,
    left: frameRect.left + targetRect.left * scale,
    right: frameRect.left + targetRect.right * scale,
  };
};

const positionRteToolbarBelow = (editor, view, rte) => {
  if (!editor || !view?.el || !rte) return;
  const toolbar = getRteToolbarElement(editor, rte);
  if (!toolbar) return;
  const referenceRect = getRteReferenceRect(editor, view, toolbar);
  if (!referenceRect) return;
  const offsetParent = toolbar.offsetParent;
  const parentRect = offsetParent?.getBoundingClientRect?.() || { top: 0 };
  const nextTop =
    referenceRect.bottom - parentRect.top + RTE_TOOLBAR_OFFSET;
  if (!Number.isFinite(nextTop)) return;
  toolbar.style.setProperty("top", `${Math.round(nextTop)}px`, "important");
  toolbar.style.setProperty("bottom", "auto", "important");
  toolbar.style.setProperty(
    "z-index",
    String(RTE_TOOLBAR_Z_INDEX),
    "important"
  );
};

const installRteToolbarPositionFix = (editor) => {
  if (!editor) return () => {};
  let activeView = null;
  let activeRte = null;
  let rafId = null;
  let observer = null;
  let observedToolbar = null;
  let isApplying = false;

  const ensureObserver = () => {
    const toolbar = getRteToolbarElement(editor, activeRte);
    if (!toolbar || toolbar === observedToolbar) {
      return;
    }
    if (observer) {
      observer.disconnect();
    }
    observedToolbar = toolbar;
    observer = new MutationObserver(() => {
      if (isApplying) return;
      scheduleUpdate();
    });
    observer.observe(toolbar, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  };

  const scheduleUpdate = () => {
    if (!activeView || !activeRte) return;
    ensureObserver();
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      rafId = null;
      isApplying = true;
      positionRteToolbarBelow(editor, activeView, activeRte);
      isApplying = false;
    });
  };

  const handleEnable = (view, rte) => {
    activeView = view;
    activeRte = rte;
    scheduleUpdate();
    setTimeout(() => {
      scheduleUpdate();
    }, 0);
  };

  const handleDisable = () => {
    activeView = null;
    activeRte = null;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
      observedToolbar = null;
    }
  };

  editor.on("rte:enable", handleEnable);
  editor.on("rte:disable", handleDisable);
  editor.on("component:input", scheduleUpdate);
  editor.on("component:resize", scheduleUpdate);

  const frameWindow = editor.Canvas?.getWindow?.();
  if (frameWindow) {
    frameWindow.addEventListener("scroll", scheduleUpdate, true);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("resize", scheduleUpdate);
  }

  return () => {
    editor.off("rte:enable", handleEnable);
    editor.off("rte:disable", handleDisable);
    editor.off("component:input", scheduleUpdate);
    editor.off("component:resize", scheduleUpdate);
    if (frameWindow) {
      frameWindow.removeEventListener("scroll", scheduleUpdate, true);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", scheduleUpdate);
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    if (observer) {
      observer.disconnect();
    }
  };
};

const getToolbarIconData = (label, index) => {
  const normalized = (label || "").toLowerCase();
  const match = TOOLBAR_ICON_DEFS.find((iconDef) =>
    iconDef.keys.some((key) => normalized.includes(key))
  );
  if (match) {
    return match;
  }
  const fallbackKey = TOOLBAR_ICON_FALLBACK[index % TOOLBAR_ICON_FALLBACK.length];
  return TOOLBAR_ICON_DEFS.find((iconDef) => iconDef.key === fallbackKey) || TOOLBAR_ICON_DEFS[0];
};

const buildSvgMask = (svg) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

const applyInlineIconStyles = (icon, dataUrl) => {
  icon.style.setProperty("display", "inline-block");
  icon.style.setProperty("width", "18px");
  icon.style.setProperty("height", "18px");
  icon.style.setProperty("background-color", "#000000");
  icon.style.setProperty("mask-image", dataUrl);
  icon.style.setProperty("mask-repeat", "no-repeat");
  icon.style.setProperty("mask-position", "center");
  icon.style.setProperty("mask-size", "contain");
  icon.style.setProperty("-webkit-mask-image", dataUrl);
  icon.style.setProperty("-webkit-mask-repeat", "no-repeat");
  icon.style.setProperty("-webkit-mask-position", "center");
  icon.style.setProperty("-webkit-mask-size", "contain");
  icon.style.setProperty("pointer-events", "none");
};

const ensureToolbarIcons = (doc) => {
  if (!doc) return;
  const items = doc.querySelectorAll(".gjs-toolbar-item");
  items.forEach((item, index) => {
    let icon = item.querySelector(".gjs-toolbar-icn");
    if (!icon) {
      icon = doc.createElement("span");
      icon.className = "gjs-toolbar-icn";
      item.appendChild(icon);
    }
    const label =
      item.getAttribute("data-command") ||
      item.getAttribute("data-title") ||
      item.getAttribute("title") ||
      item.getAttribute("aria-label") ||
      item.textContent ||
      "";
    const iconDef = getToolbarIconData(label, index);
    icon.dataset.gjsIcon = iconDef.key;
    const maskUrl = buildSvgMask(iconDef.svg);
    icon.style.setProperty("--gjs-icon", maskUrl);
    applyInlineIconStyles(icon, maskUrl);
    item
      .querySelectorAll("svg")
      .forEach((svg) => svg.style.setProperty("display", "none", "important"));
  });
};

const forceToolbarIconStyles = (doc) => {
  if (!doc) return;
  const toolbar = doc.querySelector(".gjs-toolbar");
  if (toolbar) {
    toolbar.style.setProperty("color", "#000000", "important");
  }
  const items = doc.querySelectorAll(".gjs-toolbar-item");
  items.forEach((item) => {
    item.style.setProperty("color", "#000000", "important");
  });
  const svgNodes = doc.querySelectorAll(".gjs-toolbar-item svg, .gjs-toolbar-item svg *");
  svgNodes.forEach((node) => {
    node.style.setProperty("fill", "#000000", "important");
    node.style.setProperty("stroke", "#000000", "important");
    node.style.setProperty("stroke-width", "1.1", "important");
    node.style.setProperty("filter", "brightness(0) saturate(100%)", "important");
  });
  const iconNodes = doc.querySelectorAll(
    ".gjs-toolbar-item i, .gjs-toolbar-item .fa, .gjs-toolbar-item span, .gjs-toolbar-item [class*='fa-']"
  );
  iconNodes.forEach((node) => {
    node.style.setProperty("color", "#000000", "important");
    node.style.setProperty("-webkit-text-fill-color", "#000000", "important");
    node.style.setProperty("filter", "brightness(0) saturate(100%)", "important");
  });
};

const installToolbarIconFix = (editor) => {
  const docs = [];
  if (typeof document !== "undefined") {
    docs.push(document);
  }
  const canvasDoc = editor?.Canvas?.getDocument?.();
  if (canvasDoc) {
    docs.push(canvasDoc);
  }
  const observers = [];
  docs.forEach((doc, index) => {
    const styleId = `gjs-toolbar-force-black-${index}`;
    if (!doc.getElementById(styleId)) {
      const style = doc.createElement("style");
      style.id = styleId;
      style.textContent = `
        .gjs-toolbar, .gjs-toolbar * {
          color: #000000 !important;
        }

        .gjs-badge,
        .gjs-com-badge,
        .gjs-com-badge span,
        .gjs-com-badge div,
        .gjs-com-badge i,
        .gjs-com-badge svg {
          background: rgba(255, 255, 255, 0.72) !important;
          color: #0f172a !important;
          border: 1px solid rgba(255, 255, 255, 0.9) !important;
          border-radius: 10px !important;
          padding: 4px 8px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          letter-spacing: 0.02em !important;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
          backdrop-filter: blur(14px) saturate(140%) !important;
          -webkit-backdrop-filter: blur(14px) saturate(140%) !important;
        }

        .gjs-badge__name,
        .gjs-badge__icon {
          color: inherit !important;
        }

        .gjs-badge__icon,
        .gjs-badge__icon svg {
          display: none !important;
        }

        .gjs-com-badge,
        .gjs-badge {
          outline: none !important;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
        }

        .gjs-com-badge [class*="badge"],
        .gjs-badge [class*="badge"] {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .gjs-badge::before,
        .gjs-badge::after,
        .gjs-com-badge::before,
        .gjs-com-badge::after {
          content: none !important;
          display: none !important;
        }

        .gjs-badge__icon {
          width: 0 !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          background: none !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .gjs-badge > *:not(.gjs-badge__name),
        .gjs-com-badge > *:not(.gjs-badge__name) {
          display: none !important;
        }

        .gjs-badge__name::before,
        .gjs-badge__name::after {
          content: none !important;
          display: none !important;
        }

        .gjs-selected {
          outline: 2px solid #4d9cff !important;
          outline-offset: -2px !important;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.6),
            0 0 16px rgba(77, 156, 255, 0.65),
            0 0 32px rgba(123, 92, 255, 0.45) !important;
        }

        .gjs-com-badge [style*="background"],
        .gjs-badge [style*="background"] {
          background: transparent !important;
        }

        .gjs-com-badge [style*="border-radius"],
        .gjs-badge [style*="border-radius"] {
          border-radius: 0 !important;
        }

        .gjs-toolbar-icn {
          width: 18px;
          height: 18px;
          display: inline-block;
          background-color: #000000 !important;
          mask-image: var(--gjs-icon);
          mask-repeat: no-repeat;
          mask-position: center;
          mask-size: contain;
          -webkit-mask-image: var(--gjs-icon);
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
          -webkit-mask-size: contain;
          pointer-events: none;
        }

        .gjs-toolbar-item svg,
        .gjs-toolbar-item svg * {
          fill: #000000 !important;
          stroke: #000000 !important;
          stroke-width: 1.1 !important;
          filter: brightness(0) saturate(100%) !important;
        }

        .gjs-toolbar-item i,
        .gjs-toolbar-item .fa,
        .gjs-toolbar-item span,
        .gjs-toolbar-item [class*='fa-'] {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          filter: brightness(0) saturate(100%) !important;
        }
      `;
      doc.head.appendChild(style);
    }
    ensureToolbarIcons(doc);
    forceToolbarIconStyles(doc);
    const observer = new MutationObserver(() => {
      ensureToolbarIcons(doc);
      forceToolbarIconStyles(doc);
    });
    observer.observe(doc.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "fill", "stroke", "color"],
    });
    observers.push(observer);
  });

  return () => {
    observers.forEach((observer) => observer.disconnect());
  };
};

export default function useGrapesBuilder({ onReady, htmlContent } = {}) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const lastHtmlRef = useRef("");
  const [isReady, setIsReady] = useState(false);

  const openLayersPanel = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    ["open-blocks", "open-sm", "open-tm"].forEach((btnId) =>
      editor.Panels?.getButton?.("views", btnId)?.set?.("active", false)
    );
    editor.Panels?.getButton?.("views", "open-layers")?.set?.("active", true);
    editor.Commands?.run?.("open-layers");
  }, []);

  const openStylesPanel = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    ["open-blocks", "open-layers", "open-tm"].forEach((btnId) =>
      editor.Panels?.getButton?.("views", btnId)?.set?.("active", false)
    );
    editor.Panels?.getButton?.("views", "open-sm")?.set?.("active", true);
    editor.Commands?.run?.("open-sm");
  }, []);

  useEffect(() => {
    if (editorRef.current || !containerRef.current) {
      return undefined;
    }
    ensureGrapesStylesheet();
    const editor = grapesjs.init({
      container: containerRef.current,
      height: "100%",
      width: "100%",
      storageManager: false,
      fromElement: false,
      plugins: ["gjs-blocks-basic"],
      pluginsOpts: {
        "gjs-blocks-basic": { flexGrid: true },
      },
      components: STARTER_HTML,
      style: STARTER_STYLES,
      canvas: {
        styles: [
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
        ],
      },
    });
    editorRef.current = editor;
    let cleanupToolbarFix = () => {};
    let cleanupToolbarBehaviorFixes = () => {};
    let cleanupRteToolbarFix = () => {};

    const activateLayersPanel = () => {
      openLayersPanel();
    };

    const handleLoad = () => {
      activateLayersPanel();
      applyCanvasScrollbarStyles(editor);
      cleanupToolbarFix = installToolbarIconFix(editor);
      cleanupToolbarBehaviorFixes = applyToolbarBehaviorFixes(
        editor,
        openStylesPanel
      );
      cleanupRteToolbarFix = installRteToolbarPositionFix(editor);
      setIsReady(true);
      onReady?.(editor);
    };

    editor.on("component:selected", activateLayersPanel);
    editor.on("load", handleLoad);
    return () => {
      cleanupToolbarFix();
      cleanupToolbarBehaviorFixes();
      cleanupRteToolbarFix();
      editor.off("component:selected", activateLayersPanel);
      editor.off("load", handleLoad);
      editor.destroy();
      editorRef.current = null;
    };
  }, [onReady]);

  useEffect(() => {
    if (!editorRef.current || !isReady) {
      return;
    }
    const nextHtml = htmlContent || "";
    if (nextHtml === lastHtmlRef.current) {
      return;
    }
    const { components, styles } = parseHtmlContent(nextHtml);
    const editor = editorRef.current;
    editor.setComponents(components);
    editor.setStyle(styles);
    lastHtmlRef.current = nextHtml;
  }, [htmlContent, isReady]);

  return {
    containerRef,
    editor: editorRef.current,
    isReady,
    openLayersPanel,
    openStylesPanel,
  };
}
