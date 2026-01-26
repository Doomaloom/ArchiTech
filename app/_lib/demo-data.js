export const DEMO_PAGES = [
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

export const DEMO_EDGES = [
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
