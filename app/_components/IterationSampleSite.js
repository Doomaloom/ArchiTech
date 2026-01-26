const IterationSampleSite = () => (
  <main className="iteration-site">
    <header className="iteration-header">
      <div className="iteration-logo" data-gem-id="logo">
        Gem Studio
      </div>
      <nav className="iteration-nav">
        <span data-gem-id="nav-overview">Overview</span>
        <span data-gem-id="nav-preview">Preview</span>
        <span data-gem-id="nav-export">Export</span>
      </nav>
      <button className="iteration-cta" data-gem-id="nav-cta" type="button">
        Start free
      </button>
    </header>
    <section className="iteration-hero">
      <div className="iteration-hero-text">
        <p className="iteration-kicker" data-gem-id="hero-kicker">
          Concept to launch
        </p>
        <h1 className="iteration-title" data-gem-id="hero-title">
          Ship pixel-perfect UI in days
        </h1>
        <p className="iteration-subtitle" data-gem-id="hero-subtitle">
          Upload a layout and refine it with precise AI iterations.
        </p>
        <div className="iteration-hero-actions">
          <button className="iteration-primary" data-gem-id="hero-primary" type="button">
            Generate site
          </button>
          <button className="iteration-secondary" data-gem-id="hero-secondary" type="button">
            View plans
          </button>
        </div>
      </div>
      <div className="iteration-hero-card" data-gem-id="hero-card">
        <div className="iteration-card-title" data-gem-id="hero-card-title">
          Variant A
        </div>
        <div className="iteration-card-body" data-gem-id="hero-card-body">
          Preview ready for iteration.
        </div>
      </div>
    </section>
    <section className="iteration-grid">
      <article className="iteration-feature" data-gem-id="feature-1">
        <h3 data-gem-id="feature-1-title">Auto layout</h3>
        <p data-gem-id="feature-1-copy">
          Keep structure intact while you nudge elements.
        </p>
      </article>
      <article
        className="iteration-feature iteration-feature-nesting"
        data-gem-id="feature-2"
        data-gem-folder="notes-stack"
        data-gem-folder-name="Notes Container"
        data-gem-folder-parent="true"
      >
        <span
          className="iteration-feature-tag"
          data-gem-id="feature-2-tag"
          data-gem-folder="notes-stack"
        >
          Nested group
        </span>
        <h3 data-gem-id="feature-2-title" data-gem-folder="notes-stack">
          Versioned notes
        </h3>
        <p data-gem-id="feature-2-copy" data-gem-folder="notes-stack">
          Circle issues and capture intent.
        </p>
        <span
          className="iteration-feature-hint"
          data-gem-id="feature-2-hint"
          data-gem-folder="notes-stack"
        >
          Select me -&gt; UNLINK
        </span>
      </article>
      <article className="iteration-feature" data-gem-id="feature-3">
        <h3 data-gem-id="feature-3-title">AI patches</h3>
        <p data-gem-id="feature-3-copy">
          Send deltas instead of rewriting the entire page.
        </p>
      </article>
    </section>
  </main>
);

export default IterationSampleSite;
