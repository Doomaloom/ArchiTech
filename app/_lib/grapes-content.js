"use client";

const parseInlineStyle = (styleText) => {
  if (!styleText) return {};
  return styleText
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const idx = entry.indexOf(":");
      if (idx === -1) return acc;
      const prop = entry.slice(0, idx).trim();
      const value = entry.slice(idx + 1).trim();
      if (!prop || !value) return acc;
      const key = prop.startsWith("--")
        ? prop
        : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      acc[key] = value;
      return acc;
    }, {});
};

const collectStyles = (doc) => {
  const styleTags = Array.from(doc.querySelectorAll("style"));
  const css = styleTags.map((tag) => tag.textContent || "").join("\n");
  styleTags.forEach((tag) => tag.remove());
  return css.trim();
};

const stripScripts = (doc) => {
  doc.querySelectorAll("script").forEach((node) => node.remove());
};

export const toGrapesContent = (html) => {
  if (!html || typeof window === "undefined") return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  stripScripts(doc);
  const body = doc.body || doc.documentElement;
  if (!body) return null;
  const styles = collectStyles(doc);
  const bodyStyleText = body.getAttribute("style") || "";
  const combinedStyles = [
    styles,
    bodyStyleText ? `body { ${bodyStyleText} }` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  return {
    components: body.innerHTML.trim(),
    styles: combinedStyles,
    bodyClass: (body.getAttribute("class") || "").trim(),
    bodyStyle: parseInlineStyle(bodyStyleText),
  };
};

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ProtoBop - Template Gallery</title>
    <style>
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --secondary: #14b8a6;
            --bg: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --accent: #f43f5e;
            --shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        * {
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
        }

        html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            overflow-x: hidden;
        }

        /* Layout Container */
        .app-container {
            width: 1280px;
            height: 900px;
            margin: 0 auto;
            position: relative;
            background-color: var(--bg);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Header */
        header {
            height: 72px;
            background: var(--card-bg);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 40px;
            z-index: 100;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 800;
            font-size: 20px;
            text-decoration: none;
        }

        .logo-text {
            background: linear-gradient(120deg, #2563eb, #f97316);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }

        .logo-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        nav {
            display: flex;
            gap: 32px;
        }

        nav a {
            text-decoration: none;
            color: var(--text-muted);
            font-weight: 500;
            font-size: 14px;
            transition: color 0.2s;
        }

        nav a:hover, nav a.active {
            color: var(--primary);
        }

        .auth-controls {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .btn {
            padding: 8px 20px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
        }

        .btn-ghost {
            background: transparent;
            color: var(--text-main);
        }

        .btn-primary {
            background: var(--primary);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
        }

        .btn-primary:hover {
            background: var(--primary-dark);
            transform: translateY(-1px);
        }

        /* Hero Section */
        .hero {
            padding: 60px 40px 40px;
            text-align: center;
            background: radial-gradient(circle at top right, #eef2ff 0%, var(--bg) 50%);
        }

        .hero h1 {
            font-size: 42px;
            font-weight: 800;
            margin: 0 0 16px;
            letter-spacing: -0.02em;
        }

        .hero p {
            color: var(--text-muted);
            font-size: 18px;
            max-width: 600px;
            margin: 0 auto 32px;
        }

        .search-container {
            max-width: 540px;
            margin: 0 auto;
            position: relative;
        }

        .search-input {
            width: 100%;
            padding: 16px 24px 16px 52px;
            border-radius: 16px;
            border: 1px solid var(--border);
            background: var(--card-bg);
            box-shadow: var(--shadow);
            font-size: 16px;
            outline: none;
            transition: border-color 0.2s;
        }

        .search-input:focus {
            border-color: var(--primary);
        }

        .search-icon {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
        }

        /* Category Tabs */
        .categories {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-bottom: 40px;
            padding: 0 40px;
        }

        .tab {
            padding: 8px 20px;
            border-radius: 100px;
            background: var(--card-bg);
            border: 1px solid var(--border);
            color: var(--text-muted);
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .tab.active {
            background: var(--text-main);
            color: white;
            border-color: var(--text-main);
        }

        .tab:hover:not(.active) {
            border-color: var(--primary);
            color: var(--primary);
        }

        /* Masonry Gallery */
        .gallery-scroll {
            flex: 1;
            overflow-y: auto;
            padding: 0 40px 100px;
        }

        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .template-card {
            background: var(--card-bg);
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid var(--border);
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
        }

        .template-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .template-preview {
            width: 100%;
            height: 240px;
            background: #f1f5f9;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        /* Visual Mockups inside cards */
        .mock-header { height: 15px; background: #e2e8f0; margin: 15px; width: 40%; border-radius: 4px; }
        .mock-line { height: 8px; background: #f1f5f9; margin: 0 15px 8px; border-radius: 4px; }
        .mock-line.short { width: 60%; }
        .mock-circle { width: 40px; height: 40px; border-radius: 50%; background: #e2e8f0; margin: 15px; }

        .preview-overlay {
            position: absolute;
            inset: 0;
            background: rgba(99, 102, 241, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .template-card:hover .preview-overlay {
            opacity: 1;
        }

        .template-info {
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .template-title {
            font-weight: 700;
            font-size: 16px;
            margin: 0 0 4px;
        }

        .template-tag {
            font-size: 12px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 600;
        }

        .pro-badge {
            background: #fef3c7;
            color: #92400e;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 800;
        }

        /* My Projects Drawer */
        .projects-drawer {
            position: absolute;
            bottom: 0;
            right: 40px;
            width: 320px;
            background: var(--card-bg);
            border-radius: 16px 16px 0 0;
            box-shadow: 0 -10px 25px rgba(0,0,0,0.1);
            border: 1px solid var(--border);
            border-bottom: none;
            z-index: 200;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .drawer-header {
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            border-bottom: 1px solid var(--border);
        }

        .drawer-header h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .drawer-content {
            padding: 12px;
            max-height: 240px;
            overflow-y: auto;
        }

        .mini-project {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px;
            border-radius: 8px;
            transition: background 0.2s;
            cursor: pointer;
        }

        .mini-project:hover {
            background: #f1f5f9;
        }

        .mini-thumb {
            width: 40px;
            height: 40px;
            border-radius: 6px;
            background: #e2e8f0;
            flex-shrink: 0;
        }

        .mini-info {
            flex: 1;
            min-width: 0;
        }

        .mini-name {
            font-size: 13px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .mini-meta {
            font-size: 11px;
            color: var(--text-muted);
        }

        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--secondary);
            display: inline-block;
            margin-right: 4px;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }

        /* Icons */
        .icon {
            width: 18px;
            height: 18px;
            fill: none;
            stroke: currentColor;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
    </style>
</head>
<body>

<div class="app-container">
    <!-- Main Header -->
    <header>
        <a href="#" class="logo">
            <div class="logo-icon">
                <svg class="icon" style="color: white;" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <span class="logo-text">ProtoBop</span>
        </a>
        <nav>
            <a href="#" class="active">Templates</a>
            <a href="#">Dashboard</a>
            <a href="#">Visual Editor</a>
            <a href="#">Analytics</a>
        </nav>
        <div class="auth-controls">
            <button class="btn btn-ghost">Log In</button>
            <button class="btn btn-primary">Sign Up Free</button>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <h1>Your next career move starts here.</h1>
        <p>Choose from over 50+ professionally designed, ATS-friendly templates and build your digital presence in minutes.</p>
        
        <div class="search-container">
            <svg class="icon search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" class="search-input" placeholder="Search templates (e.g. 'Software Engineer', 'Creative', 'Minimal')...">
        </div>
    </section>

    <!-- Category Tabs -->
    <div class="categories">
        <button class="tab active">All Templates</button>
        <button class="tab">Minimal</button>
        <button class="tab">Tech & Dev</button>
        <button class="tab">Creative Arts</button>
        <button class="tab">Executive</button>
        <button class="tab">Academic</button>
    </div>

    <!-- Gallery -->
    <div class="gallery-scroll">
        <div class="gallery-grid">
            <!-- Template 1 -->
            <div class="template-card">
                <div class="template-preview" style="background: linear-gradient(to bottom, #fff, #f8fafc);">
                    <div class="mock-circle"></div>
                    <div class="mock-header"></div>
                    <div class="mock-line"></div>
                    <div class="mock-line"></div>
                    <div class="mock-line short"></div>
                    <div class="preview-overlay">
                        <button class="btn btn-primary" style="background: white; color: var(--primary);">Use Template</button>
                    </div>
                </div>
                <div class="template-info">
                    <div>
                        <div class="template-tag">Minimal</div>
                        <h3 class="template-title">The Helvetica</h3>
                    </div>
                    <span class="pro-badge">FREE</span>
                </div>
            </div>

            <!-- Template 2 -->
            <div class="template-card">
                <div class="template-preview" style="background: #0f172a;">
                    <div class="mock-header" style="background: #334155; width: 60%; margin-top: 30px;"></div>
                    <div class="mock-line" style="background: #1e293b;"></div>
                    <div class="mock-line" style="background: #1e293b;"></div>
                    <div class="mock-line short" style="background: #1e293b;"></div>
                    <div class="preview-overlay">
                        <button class="btn btn-primary" style="background: white; color: var(--primary);">Use Template</button>
                    </div>
                </div>
                <div class="template-info">
                    <div>
                        <div class="template-tag">Tech & Dev</div>
                        <h3 class="template-title">Dark Mode Pro</h3>
                    </div>
                    <span class="pro-badge" style="background: #dcfce7; color: #166534;">PRO</span>
                </div>
            </div>

            <!-- Template 3 -->
            <div class="template-card">
                <div class="template-preview" style="background: #fff; border-left: 60px solid #6366f1;">
                    <div class="mock-header" style="width: 80%;"></div>
                    <div class="mock-line"></div>
                    <div class="mock-line"></div>
                    <div class="mock-line short"></div>
                    <div class="preview-overlay">
                        <button class="btn btn-primary" style="background: white; color: var(--primary);">Use Template</button>
                    </div>
                </div>
                <div class="template-info">
                    <div>
                        <div class="template-tag">Executive</div>
                        <h3 class="template-title">The Director</h3>
                    </div>
                    <span class="pro-badge" style="background: #dcfce7; color: #166534;">PRO</span>
                </div>
            </div>

            <!-- Template 4 -->
            <div class="template-card">
                <div class="template-preview" style="background: #faf5ff;">
                    <div class="mock-circle" style="background: #d8b4fe; width: 60px; height: 60px; margin: 20px auto;"></div>
                    <div class="mock-header" style="width: 40%; margin: 0 auto 15px;"></div>
                    <div class="mock-line" style="width: 70%; margin: 0 auto 8px;"></div>
                    <div class="mock-line" style="width: 60%; margin: 0 auto 8px;"></div>
                    <div class="preview-overlay">
                        <button class="btn btn-primary" style="background: white; color: var(--primary);">Use Template</button>
                    </div>
                </div>
                <div class="template-info">
                    <div>
                        <div class="template-tag">Creative</div>
                        <h3 class="template-title">Prism Portfolio</h3>
                    </div>
                    <span class="pro-badge">FREE</span>
                </div>
            </div>

            <!-- Template 5 -->
            <div class="template-card">
                <div class="template-preview" style="background: #fff; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 15px;">
                    <div style="background: #f8fafc; border-radius: 8px;"></div>
                    <div style="background: #f1f5f9; border-radius: 8px;"></div>
                    <div class="preview-overlay">
                        <button class="btn btn-primary" style="background: white; color: var(--primary);">Use Template</button>
                    </div>
                </div>
                <div class="template-info">
                    <div>
                        <div class="template-tag">Modern</div>
                        <h3 class="template-title">Split View</h3>
                    </div>
                    <span class="pro-badge">FREE</span>
                </div>
            </div>

            <!-- Template 6 -->
            <div class="template-card">
                <div class="template-preview" style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);">
                    <div class="mock-header" style="background: rgba(255,255,255,0.2); width: 30%;"></div>
                    <div class="mock-line" style="background: rgba(255,255,255,0.1);"></div>
                    <div class="mock-line" style="background: rgba(255,255,255,0.1);"></div>
                    <div class="preview-overlay">
                        <button class="btn btn-primary" style="background: white; color: var(--primary);">Use Template</button>
                    </div>
                </div>
                <div class="template-info">
                    <div>
                        <div class="template-tag">Creative</div>
                        <h3 class="template-title">Teal Flow</h3>
                    </div>
                    <span class="pro-badge" style="background: #dcfce7; color: #166534;">PRO</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Miniature My Projects Drawer -->
    <div class="projects-drawer" id="drawer">
        <div class="drawer-header" onclick="toggleDrawer()">
            <h3>
                <svg class="icon" style="width: 16px; height: 16px;" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                My Projects (3)
            </h3>
            <svg id="chevron" class="icon" style="width: 16px; height: 16px;" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>
        </div>
        <div class="drawer-content">
            <div class="mini-project">
                <div class="mini-thumb" style="background: #6366f1;"></div>
                <div class="mini-info">
                    <div class="mini-name">Senior Product Designer</div>
                    <div class="mini-meta"><span class="status-dot"></span>Live • Updated 2h ago</div>
                </div>
            </div>
            <div class="mini-project">
                <div class="mini-thumb" style="background: #e2e8f0;"></div>
                <div class="mini-info">
                    <div class="mini-name">UX Researcher Draft</div>
                    <div class="mini-meta">Draft • Updated 1d ago</div>
                </div>
            </div>
            <div class="mini-project">
                <div class="mini-thumb" style="background: #14b8a6;"></div>
                <div class="mini-info">
                    <div class="mini-name">Freelance Portfolio</div>
                    <div class="mini-meta"><span class="status-dot"></span>Live • Updated 5d ago</div>
                </div>
            </div>
            <button class="btn btn-ghost" style="width: 100%; margin-top: 8px; font-size: 12px; border: 1px dashed var(--border);">+ Create New Version</button>
        </div>
    </div>
</div>

<script>
    let isOpen = true;
    function toggleDrawer() {
        const drawer = document.getElementById('drawer');
        const chevron = document.getElementById('chevron');
        if (isOpen) {
            drawer.style.transform = 'translateY(240px)';
            chevron.style.transform = 'rotate(180deg)';
        } else {
            drawer.style.transform = 'translateY(0)';
            chevron.style.transform = 'rotate(0deg)';
        }
        isOpen = !isOpen;
    }
</script>

</body>
</html>`;

export const STARTER_CONTENT =
  toGrapesContent(DEFAULT_HTML) || {
    components: "",
    styles: "",
    bodyClass: "",
    bodyStyle: {},
  };

const mountCanvasStyles = (editor, styles) => {
  const doc = editor?.Canvas?.getDocument?.();
  if (!doc || !styles) return;
  const existing = doc.getElementById("gjs-user-styles");
  if (existing?.parentNode) {
    existing.parentNode.removeChild(existing);
  }
  const styleTag = doc.createElement("style");
  styleTag.id = "gjs-user-styles";
  styleTag.textContent = styles;
  doc.head?.appendChild(styleTag);
};

const applyBodyAttributes = (editor, content) => {
  const doc = editor?.Canvas?.getDocument?.();
  if (!doc) return;
  const body = doc.body;
  if (body) {
    body.className = content.bodyClass || "";
    Object.assign(body.style, content.bodyStyle || {});
  }
  const html = doc.documentElement;
  if (html) {
    html.style.background = content.bodyStyle?.background || "transparent";
    html.style.color = content.bodyStyle?.color || "inherit";
  }
  const frameEl = editor?.Canvas?.getFrameEl?.();
  if (frameEl) {
    frameEl.style.background = "transparent";
  }
};

const injectOverrideTheme = (editor, content) => {
  const doc = editor?.Canvas?.getDocument?.();
  if (!doc) return;
  const overrideId = "gjs-user-theme-overrides";
  const existing = doc.getElementById(overrideId);
  if (existing?.parentNode) {
    existing.parentNode.removeChild(existing);
  }
  const tag = doc.createElement("style");
  tag.id = overrideId;
  const bodyColor = content?.bodyStyle?.color || "inherit";
  const forceBg =
    content?.styles && content.styles.includes("--bg")
      ? "background: var(--bg) !important;"
      : "";
  tag.textContent = `
    html, body {
      min-height: 100%;
      color: ${bodyColor} !important;
      ${forceBg}
    }
    *, *::before, *::after {
      color: inherit;
    }
    svg, svg * {
      color: inherit !important;
      stroke: currentColor !important;
      fill: currentColor;
    }
    svg [fill="none"] { fill: none !important; }
    svg [stroke="none"] { stroke: none !important; }
    input, textarea, button, select, option {
      color: inherit !important;
      background: inherit;
      border-color: inherit;
    }
    .gjs-cv-canvas, #wrapper, .gjs-frame {
      background: transparent !important;
    }
  `;
  doc.head?.appendChild(tag);
};

export const applyGrapesContent = (editor, content = STARTER_CONTENT) => {
  if (!editor) return;
  editor.setComponents(content.components || "");
  editor.setStyle(content.styles || "");
  mountCanvasStyles(editor, content.styles || "");
  applyBodyAttributes(editor, content);
  injectOverrideTheme(editor, content);
  const wrapper = editor.DomComponents.getWrapper();
  if (wrapper) {
    const classList = content.bodyClass
      ? content.bodyClass.split(/\s+/).filter(Boolean)
      : [];
    wrapper.setClass(classList);
    wrapper.setStyle(content.bodyStyle || {});
  }
};
