import { STARTER_STYLES } from "./grapes-default-template";

const GOOGLE_LOGO_HTML =
  '<div class="logo"><span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span></div>';

const buildQuickLinks = (links) => {
  if (!links.length) return "";
  const items = links
    .map((label, index) => {
      const dot = index === 0 ? "" : '<span class="quick-dot">&bull;</span>';
      return `${dot}<a href="#">${label}</a>`;
    })
    .join("");
  return `<div class="quick-links">${items}</div>`;
};

const buildGoogleBody = ({
  tagline = "",
  mainClass = "",
  primaryLabel = "Google Search",
  secondaryLabel = "I'm Feeling Lucky",
  quickLinks = [],
} = {}) => {
  const mainClassAttr = mainClass ? ` class="${mainClass}"` : "";
  const taglineHtml = tagline ? `<p class="tagline">${tagline}</p>` : "";
  const quickLinksHtml = buildQuickLinks(quickLinks);

  return `
    <header>
      <div class="header-links">
        <a href="#">Gmail</a>
        <a href="#">Images</a>
        <div class="icon-btn">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#5f6368">
            <path d="M6 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM6 14c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM6 20c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path>
          </svg>
        </div>
        <div class="profile-pic">D</div>
      </div>
    </header>

    <main${mainClassAttr}>
      ${GOOGLE_LOGO_HTML}
      ${taglineHtml}

      <div class="search-wrapper">
        <div class="search-bar">
          <svg class="search-icon" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
          </svg>
          <input type="text" class="search-input" autofocus>
          <div class="search-tools">
            <svg class="tool-icon" viewBox="0 0 24 24">
              <path fill="#4285f4" d="m12 15c1.66 0 3-1.31 3-2.97v-7.07c0-1.65-1.34-2.96-3-2.96s-3 1.31-3 2.96v7.07c0 1.66 1.34 2.97 3 2.97z"></path>
              <path fill="#34a853" d="m11 18.08h2v3.92h-2z"></path>
              <path fill="#fbbc05" d="m7.05 16.87c-1.27-1.33-2.05-3.12-2.05-5.09h2c0 1.39.56 2.65 1.47 3.56z"></path>
              <path fill="#ea4335" d="m12 18c-2.07 0-3.95-.84-5.32-2.19l-1.42 1.43c1.72 1.73 4.09 2.8 6.74 2.8 5.16 0 9.4-4.14 9.71-9.35l-2 .03c-.27 4.49-4 8.08-8.01 8.08z"></path>
            </svg>
            <svg class="tool-icon" viewBox="0 0 24 24">
              <path fill="#4285f4" d="m19.25 19h-14.5c-1.24 0-2.25-1.01-2.25-2.25v-9.5c0-1.24 1.01-2.25 2.25-2.25h14.5c1.24 0 2.25 1.01 2.25 2.25v9.5c0 1.24-1.01 2.25-2.25 2.25z"></path>
              <path fill="#fff" d="m12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"></path>
              <circle fill="#34a853" cx="16.5" cy="8.5" r="1.5"></circle>
            </svg>
          </div>
        </div>
      </div>

      <div class="button-group">
        <button class="btn">${primaryLabel}</button>
        <button class="btn">${secondaryLabel}</button>
      </div>
      ${quickLinksHtml}
    </main>

    <footer>
      <div class="footer-top">
        United Kingdom
      </div>
      <div class="footer-bottom">
        <div class="footer-links">
          <a href="#">About</a>
          <a href="#">Advertising</a>
          <a href="#">Business</a>
          <a href="#">How Search works</a>
        </div>
        <div class="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Settings</a>
        </div>
      </div>
    </footer>
  `;
};

const BASE_VARIANT_STYLES = `
  .tagline {
    margin: -8px 0 24px;
    font-size: 16px;
    color: var(--text-secondary);
  }

  .main--lifted {
    margin-top: 64px;
  }

  .main--airy {
    margin-top: 84px;
  }

  .main--tight {
    margin-top: 20px;
  }

  .quick-links {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 18px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .quick-links a {
    color: inherit;
    text-decoration: none;
  }

  .quick-links a:hover {
    text-decoration: underline;
  }

  .quick-dot {
    opacity: 0.6;
  }

  body.theme-calm {
    background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 60%, #eef2f7 100%);
  }

  body.theme-calm .search-bar {
    box-shadow: none;
  }

  body.theme-calm .search-bar:hover,
  body.theme-calm .search-bar:focus-within {
    box-shadow: 0 12px 24px rgba(32, 33, 36, 0.18);
  }

  body.theme-bright {
    background: #ffffff;
  }

  body.theme-bright .btn {
    background: #ffffff;
    border-color: #dadce0;
  }
`;

const buildHtmlDocument = ({ title, body, bodyClass = "", extraStyles = "" }) => {
  const classAttr = bodyClass ? ` class="${bodyClass}"` : "";
  const styles = [STARTER_STYLES, BASE_VARIANT_STYLES, extraStyles]
    .filter(Boolean)
    .join("\n");

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
${styles}
        </style>
      </head>
      <body${classAttr}>
${body}
      </body>
    </html>
  `.trim();
};

export const DEFAULT_PREVIEW_ITEMS = [
  {
    html: buildHtmlDocument({
      title: "Google - Classic",
      bodyClass: "theme-classic",
      body: buildGoogleBody({
        mainClass: "main--lifted",
        primaryLabel: "Google Search",
        secondaryLabel: "I'm Feeling Lucky",
      }),
    }),
    plan: { title: "Classic" },
  },
  {
    html: buildHtmlDocument({
      title: "Google - Calm",
      bodyClass: "theme-calm",
      body: buildGoogleBody({
        mainClass: "main--airy",
        tagline: "Search the world's information in seconds.",
        primaryLabel: "Search the web",
        secondaryLabel: "I'm Feeling Lucky",
      }),
    }),
    plan: { title: "Calm" },
  },
  {
    html: buildHtmlDocument({
      title: "Google - Bright",
      bodyClass: "theme-bright",
      body: buildGoogleBody({
        mainClass: "main--tight",
        primaryLabel: "Search",
        secondaryLabel: "I'm Feeling Lucky",
        quickLinks: ["Images", "Maps", "News", "Gmail"],
      }),
    }),
    plan: { title: "Bright" },
  },
];

export const DEFAULT_STRUCTURE_FLOW = {
  id: "page-home",
  label: "Google Home",
  children: [
    {
      id: "page-search",
      label: "Search Results",
      children: [
        { id: "page-news", label: "News" },
        { id: "page-videos", label: "Videos" },
      ],
    },
    {
      id: "page-images",
      label: "Images",
      children: [{ id: "page-shopping", label: "Shopping" }],
    },
    {
      id: "page-maps",
      label: "Maps",
      children: [
        { id: "page-gmail", label: "Gmail" },
        { id: "page-drive", label: "Drive" },
      ],
    },
    { id: "page-settings", label: "Settings" },
  ],
};
