import "./globals.css";
import { Sora } from "next/font/google";
import TopbarNav from "./components/topbar-nav";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata = {
  title: "Gem Layout",
  description: "Base layout with sidebar rail and top bar.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={sora.className}>
        <div className="app-shell">
          <aside className="sidebar-rail" aria-label="Sidebar rail">
            <div className="sidebar-header" />
            <div className="sidebar-body">
              <div className="sidebar-nav">
                <div className="rail-buttons">
                  <button
                    className="rail-button"
                    type="button"
                    aria-label="Start"
                    data-imageflow-step="start"
                  >
                    <svg
                      className="button-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <rect
                        x="4"
                        y="5"
                        width="16"
                        height="14"
                        rx="2"
                        ry="2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <circle
                        cx="9"
                        cy="10"
                        r="1.6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M6 17l4-4 3 3 3-2 2 3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  <button
                    className="rail-button"
                    type="button"
                    aria-label="Nodes"
                    data-imageflow-step="nodes"
                  >
                    <svg
                      className="button-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 3l-4 5h2.5L7 12h2.5L6 16h12l-3.5-4H17l-3.5-4h2.5L12 3z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 16v4M10.5 20h3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  <button
                    className="rail-button"
                    type="button"
                    aria-label="Preview"
                    data-imageflow-step="preview"
                  >
                    <svg
                      className="button-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M12 9.5v5M9.5 12h5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                    </svg>
                  </button>
                  <button
                    className="rail-button"
                    type="button"
                    aria-label="Builder"
                    data-imageflow-step="builder"
                  >
                    <svg
                      className="button-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M4.8 15.6l-.8 3.6 3.6-.8L19 7.9a2 2 0 000-2.8l-1.9-1.9a2 2 0 00-2.8 0L4.8 15.6z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M13.4 4.6l3.9 3.9"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <path
                        d="M4 19l4.5-1.1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  <button
                    className="rail-button"
                    type="button"
                    aria-label="Code"
                    data-imageflow-step="code"
                  >
                    <svg
                      className="button-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M9 7l-4 5 4 5M15 7l4 5-4 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    className="rail-button"
                    type="button"
                    aria-label="Settings"
                  >
                    <svg
                      className="button-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
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
                </div>
              </div>
              <div className="sidebar-page-slot" id="sidebar-page-slot" />
              <div className="sidebar-footer">
                <div className="rail-buttons rail-buttons-bottom sidebar-footer-actions">
                  <button className="rail-button" type="button" aria-label="Help">
                    <svg
                      className="button-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M9.3 9a3 3 0 115.4 1.8c-.8.7-1.7 1.2-1.7 2.6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <circle cx="12" cy="17.5" r="1" fill="currentColor" />
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                    </svg>
                  </button>
                  <button className="rail-button" type="button" aria-label="Theme">
                    <svg
                      className="button-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M14.5 4.5a7 7 0 106.3 9.6 7.6 7.6 0 01-6.3-9.6z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <div className="imageflow-sidebar-toggle-block">
                  <span className="imageflow-sidebar-toggle-label">
                    <span className="is-tools">Tools</span>
                    <span className="is-nav">Nav</span>
                  </span>
                  <div className="imageflow-sidebar-toggle" aria-label="Sidebar mode">
                    <input
                      className="imageflow-sidebar-toggle-input"
                      type="checkbox"
                      id="imageflow-sidebar-toggle"
                      aria-label="Toggle tools mode"
                    />
                    <label
                      className="imageflow-sidebar-toggle-track"
                      htmlFor="imageflow-sidebar-toggle"
                    >
                      <span
                        className="imageflow-sidebar-toggle-dot"
                        aria-hidden="true"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </aside>
          <header className="topbar" aria-label="Top bar">
            <div className="topbar-content">
              <div className="topbar-spacer" aria-hidden="true" />
              <TopbarNav />
              <div className="topbar-actions" aria-label="Actions">
                <button className="circle-button" type="button" aria-label="Search">
                  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
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
                <button className="circle-button" type="button" aria-label="Alerts">
                  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M18 16H6l1.4-2.1V10a4.6 4.6 0 019.2 0v3.9L18 16z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="18.5" r="1.4" fill="currentColor" />
                  </svg>
                </button>
                <button className="circle-button" type="button" aria-label="Profile">
                  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <circle
                      cx="12"
                      cy="8"
                      r="3.6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M5 19.5a7 7 0 0114 0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </header>
          <main className="page-canvas">{children}</main>
        </div>
      </body>
    </html>
  );
}
