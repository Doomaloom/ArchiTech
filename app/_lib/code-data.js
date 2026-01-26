export const CODE_FILE_GROUPS = [
  {
    label: "gem-studio",
    items: [
      { id: "src/app/layout.tsx", label: "layout.tsx", language: "typescript" },
      { id: "src/app/page.tsx", label: "page.tsx", language: "typescript" },
      { id: "src/components/hero/hero.tsx", label: "hero.tsx", language: "typescript" },
      { id: "src/components/ui/button.tsx", label: "button.tsx", language: "typescript" },
      { id: "src/components/ui/card.tsx", label: "card.tsx", language: "typescript" },
      { id: "src/hooks/useTheme.ts", label: "useTheme.ts", language: "typescript" },
      { id: "src/lib/format.ts", label: "format.ts", language: "typescript" },
      { id: "styles/globals.css", label: "globals.css", language: "css" },
      { id: "styles/theme.css", label: "theme.css", language: "css" },
      { id: "config/site.json", label: "site.json", language: "json" },
      { id: "config/theme.json", label: "theme.json", language: "json" },
      { id: "public/logo.svg", label: "logo.svg", language: "svg" },
      { id: "README.md", label: "README.md", language: "markdown" },
    ],
  },
];

export const INITIAL_CODE_CONTENTS = {
  "src/app/layout.tsx": `export const metadata = {
  title: "Gem Studio",
  description: "Generated from your upload.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  "src/app/page.tsx": `import { Hero } from "../components/hero/hero";

export default function Page() {
  return (
    <main className="page">
      <Hero />
    </main>
  );
}
`,
  "src/components/hero/hero.tsx": `import { Button } from "../ui/button";

export function Hero() {
  return (
    <section className="hero">
      <h1>Build faster with Gem Studio</h1>
      <p>Convert layouts into clean, production-ready UI.</p>
      <Button>Start building</Button>
    </section>
  );
}
`,
  "src/components/ui/button.tsx": `export function Button({ children }) {
  return <button className="button">{children}</button>;
}
`,
  "src/components/ui/card.tsx": `export function Card({ children }) {
  return <div className="card">{children}</div>;
}
`,
  "src/hooks/useTheme.ts": `export function useTheme() {
  return { mode: "light", accent: "#f97316" };
}
`,
  "src/lib/format.ts": `export const formatTitle = (value: string) =>
  value.replace(/-/g, " ").toUpperCase();
`,
  "styles/globals.css": `:root {
  color-scheme: light;
  --accent: #f97316;
}

body {
  margin: 0;
  font-family: "Space Grotesk", system-ui, sans-serif;
  background: #f8fafc;
  color: #0f172a;
}

.hero {
  padding: 96px 80px;
}
`,
  "styles/theme.css": `.button {
  background: var(--accent);
  color: #fff7ed;
  border: none;
  padding: 12px 18px;
  border-radius: 999px;
}
`,
  "config/site.json": `{
  "brand": "Gem Studio",
  "cta": "Start building",
  "layout": "landing"
}
`,
  "config/theme.json": `{
  "accent": "#f97316",
  "radius": 16,
  "glass": true
}
`,
  "public/logo.svg": `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="28" fill="#f97316" />
  <path d="M20 36l8-16 8 16 8-16" fill="none" stroke="#fff7ed" stroke-width="4" />
</svg>
`,
  "README.md": `# Gem Studio

Sample project with a nested tree to preview file navigation.
`,
};
