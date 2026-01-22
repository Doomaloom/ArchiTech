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
      {MENU_ITEMS.map((menu) => (
        <details className="imageflow-menu" key={menu.label}>
          <summary className="imageflow-menu-trigger">{menu.label}</summary>
          <div className="imageflow-menu-dropdown" role="menu">
            {menu.items.map((item, index) =>
              item === "---" ? (
                <div className="imageflow-menu-divider" key={`${menu.label}-div-${index}`} />
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
  );
}
