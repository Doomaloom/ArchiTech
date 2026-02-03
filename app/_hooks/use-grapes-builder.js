"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import grapesjs from "grapesjs";

const GRAPES_CSS_URL = "https://unpkg.com/grapesjs/dist/css/grapes.min.css";
const STARTER_HTML =
  '<section class="hero"><div class="hero__inner"><p class="hero__eyebrow">New template</p><h1 class="hero__title">Launch a page in minutes</h1><p class="hero__subtitle">Drag blocks, swap text, and publish a polished landing page without leaving this workspace.</p><div class="hero__actions"><a class="button button--primary" href="#">Get started</a><a class="button button--ghost" href="#">Live demo</a></div></div></section><section class="features"><div class="feature"><h3>Composable blocks</h3><p>Pick from a focused set of layout blocks optimized for quick iteration.</p></div><div class="feature"><h3>Responsive by default</h3><p>Design once and preview across breakpoints with the built-in device toolbar.</p></div><div class="feature"><h3>Code friendly</h3><p>Export clean HTML/CSS when you are ready to push to the code editor.</p></div></section>';
const STARTER_STYLES =
  "body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; } .hero { background: radial-gradient(circle at 20% 20%, #eef2ff 0, #eef2ff 30%, #e0f2fe 70%, #e0f2fe 100%); padding: 88px 24px; } .hero__inner { max-width: 960px; margin: 0 auto; text-align: center; } .hero__eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; color: #6366f1; } .hero__title { font-size: 48px; font-weight: 700; margin: 18px 0 12px; } .hero__subtitle { font-size: 18px; line-height: 1.6; color: #334155; max-width: 720px; margin: 0 auto 28px; } .hero__actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; } .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 18px; border-radius: 999px; font-weight: 600; text-decoration: none; } .button--primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; box-shadow: 0 12px 30px rgba(99, 102, 241, 0.25); } .button--ghost { border: 1px solid #cbd5e1; color: #0f172a; background: #fff; } .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; padding: 48px 24px; max-width: 960px; margin: 0 auto; } .feature { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); } .feature h3 { margin: 0 0 10px; font-size: 18px; } .feature p { margin: 0; color: #475569; line-height: 1.5; }";

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

    const activateLayersPanel = () => {
      openLayersPanel();
    };

    const handleLoad = () => {
      activateLayersPanel();
      applyCanvasScrollbarStyles(editor);
      setIsReady(true);
      onReady?.(editor);
    };

    editor.on("component:selected", activateLayersPanel);
    editor.on("load", handleLoad);
    return () => {
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
