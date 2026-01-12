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
            <div className="sidebar-header" aria-hidden="true" />
            <div className="sidebar-body">
              <div className="rail-buttons">
                <button className="rail-button" type="button" aria-label="Back">
                  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M15 6l-6 6 6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button className="rail-button" type="button" aria-label="Share">
                  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M15 8l-6 4 6 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="6" cy="12" r="2.5" fill="currentColor" />
                    <circle cx="18" cy="6.5" r="2.5" fill="currentColor" />
                    <circle cx="18" cy="17.5" r="2.5" fill="currentColor" />
                  </svg>
                </button>
                <button className="rail-button" type="button" aria-label="Add">
                  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 6v12M6 12h12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <button className="rail-button" type="button" aria-label="Bookmark">
                  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M7 5h10v14l-5-3-5 3V5z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button className="rail-button" type="button" aria-label="Calendar">
                  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <rect
                      x="4"
                      y="6"
                      width="16"
                      height="14"
                      rx="3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M4 10h16M8 3v4M16 3v4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <button className="rail-button" type="button" aria-label="Settings">
                  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
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
              <div className="rail-buttons rail-buttons-bottom">
                <button className="rail-button" type="button" aria-label="Help">
                  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
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
                  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
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
