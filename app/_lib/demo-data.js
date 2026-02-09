export const DEMO_PAGES = [
  { id: "page-home", label: "ProtoBop Home", position: { x: 260, y: 20 } },
  { id: "page-search", label: "Search Results", position: { x: 40, y: 140 } },
  { id: "page-images", label: "Images", position: { x: 260, y: 140 } },
  { id: "page-maps", label: "Maps", position: { x: 480, y: 140 } },
  { id: "page-news", label: "News", position: { x: 40, y: 260 } },
  { id: "page-videos", label: "Videos", position: { x: 260, y: 260 } },
  { id: "page-shopping", label: "Shopping", position: { x: 480, y: 260 } },
  { id: "page-gmail", label: "Gmail", position: { x: 40, y: 380 } },
  { id: "page-drive", label: "Drive", position: { x: 260, y: 380 } },
  { id: "page-settings", label: "Settings", position: { x: 480, y: 380 } },
];

export const DEMO_EDGES = [
  { id: "edge-home-search", source: "page-home", target: "page-search" },
  { id: "edge-home-images", source: "page-home", target: "page-images" },
  { id: "edge-home-maps", source: "page-home", target: "page-maps" },
  { id: "edge-search-news", source: "page-search", target: "page-news" },
  { id: "edge-search-videos", source: "page-search", target: "page-videos" },
  { id: "edge-images-shopping", source: "page-images", target: "page-shopping" },
  { id: "edge-maps-gmail", source: "page-maps", target: "page-gmail" },
  { id: "edge-videos-drive", source: "page-videos", target: "page-drive" },
  { id: "edge-shopping-settings", source: "page-shopping", target: "page-settings" },
];
