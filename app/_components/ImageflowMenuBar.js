import Link from "next/link";

const MENU_ITEMS = [
  {
    label: "File",
    items: ["New", "Open...", "Open Recent", "---", "Save", "Export", "---", "Close"],
  },
  {
    label: "Edit",
    items: ["Undo", "Redo", "---", "Cut", "Copy", "Paste", "---", "Preferences"],
  },
  {
    label: "Image",
    items: ["Adjustments", "Mode", "Image Size", "Canvas Size"],
  },
  {
    label: "Layer",
    items: ["New Layer", "Duplicate Layer", "---", "Group Layers", "Merge Down"],
  },
  {
    label: "Select",
    items: ["Select All", "Deselect", "Reselect"],
  },
  {
    label: "View",
    items: ["Zoom In", "Zoom Out", "---", "Fit on Screen", "100%"],
  },
  {
    label: "Window",
    items: ["Workspace", "Arrange", "Extensions"],
  },
  {
    label: "Help",
    items: ["Documentation", "Support", "About"],
  },
];

export default function ImageflowMenuBar() {
  const handleMenuItemClick = (event) => {
    const details = event.currentTarget.closest("details");
    if (details?.open) {
      details.open = false;
    }
  };

  return (
    <div className="imageflow-menu-bar" role="menubar" aria-label="Menu">
      <div className="imageflow-menu-group">
        {MENU_ITEMS.map((menu) => (
          <details className="imageflow-menu" key={menu.label}>
            <summary className="imageflow-menu-trigger">{menu.label}</summary>
            <div className="imageflow-menu-dropdown" role="menu">
              {menu.items.map((item, index) =>
                item === "---" ? (
                  <div
                    className="imageflow-menu-divider"
                    key={`${menu.label}-div-${index}`}
                  />
                ) : (
                  <button
                    className="imageflow-menu-item"
                    key={`${menu.label}-${item}`}
                    type="button"
                    role="menuitem"
                    onClick={handleMenuItemClick}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </details>
        ))}
      </div>
      <div className="imageflow-menu-actions" aria-label="Quick actions">
        <button className="imageflow-menu-action" type="button" aria-label="Search">
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
        <button className="imageflow-menu-action" type="button" aria-label="Alerts">
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
        <Link className="imageflow-menu-action" href="/auth/logout" aria-label="Log out">
          <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M10 6h-3a2 2 0 00-2 2v8a2 2 0 002 2h3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 16l4-4-4-4M18 12H9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
