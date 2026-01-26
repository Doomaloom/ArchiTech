export const ITERATION_SAMPLE = {
  html: `<main class="iteration-site">
  <header class="iteration-header">
    <div class="iteration-logo" data-gem-id="logo">Gem Studio</div>
    <nav class="iteration-nav">
      <span data-gem-id="nav-overview">Overview</span>
      <span data-gem-id="nav-preview">Preview</span>
      <span data-gem-id="nav-export">Export</span>
    </nav>
    <button class="iteration-cta" data-gem-id="nav-cta" type="button">
      Start free
    </button>
  </header>
  <section class="iteration-hero">
    <div class="iteration-hero-text">
      <p class="iteration-kicker" data-gem-id="hero-kicker">Concept to launch</p>
      <h1 class="iteration-title" data-gem-id="hero-title">
        Ship pixel-perfect UI in days
      </h1>
      <p class="iteration-subtitle" data-gem-id="hero-subtitle">
        Upload a layout and refine it with precise AI iterations.
      </p>
      <div class="iteration-hero-actions">
        <button class="iteration-primary" data-gem-id="hero-primary" type="button">
          Generate site
        </button>
        <button class="iteration-secondary" data-gem-id="hero-secondary" type="button">
          View plans
        </button>
      </div>
    </div>
    <div class="iteration-hero-card" data-gem-id="hero-card">
      <div class="iteration-card-title" data-gem-id="hero-card-title">Variant A</div>
      <div class="iteration-card-body" data-gem-id="hero-card-body">
        Preview ready for iteration.
      </div>
    </div>
  </section>
  <section class="iteration-grid">
    <article class="iteration-feature" data-gem-id="feature-1">
      <h3 data-gem-id="feature-1-title">Auto layout</h3>
      <p data-gem-id="feature-1-copy">
        Keep structure intact while you nudge elements.
      </p>
    </article>
    <article class="iteration-feature" data-gem-id="feature-2">
      <h3 data-gem-id="feature-2-title">Versioned notes</h3>
      <p data-gem-id="feature-2-copy">
        Circle issues and capture intent.
      </p>
    </article>
    <article class="iteration-feature" data-gem-id="feature-3">
      <h3 data-gem-id="feature-3-title">AI patches</h3>
      <p data-gem-id="feature-3-copy">
        Send deltas instead of rewriting the entire page.
      </p>
    </article>
  </section>
</main>`,
  css: `.iteration-site {
  display: flex;
  flex-direction: column;
  gap: 28px;
  font-family: "Space Grotesk", system-ui, sans-serif;
  color: #0f172a;
}

.iteration-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.iteration-logo {
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.02em;
}

.iteration-nav {
  display: flex;
  gap: 18px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.iteration-cta {
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.2);
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.8);
}

.iteration-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 24px;
  align-items: center;
}

.iteration-hero-text {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.iteration-kicker {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #64748b;
}

.iteration-title {
  margin: 0;
  font-size: clamp(26px, 4vw, 42px);
  letter-spacing: -0.02em;
}

.iteration-subtitle {
  margin: 0;
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}

.iteration-hero-actions {
  display: flex;
  gap: 12px;
}

.iteration-primary,
.iteration-secondary {
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}

.iteration-primary {
  background: #0f172a;
  color: #ffffff;
}

.iteration-secondary {
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

.iteration-hero-card {
  border-radius: 20px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.7);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.1);
}

.iteration-card-title {
  font-weight: 600;
  font-size: 13px;
}

.iteration-card-body {
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}

.iteration-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.iteration-feature {
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  padding: 14px;
  background: rgba(255, 255, 255, 0.6);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.iteration-feature h3 {
  margin: 0;
  font-size: 14px;
}

.iteration-feature p {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}`,
};
