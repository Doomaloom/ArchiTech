"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ImageflowMenuBar from "./ImageflowMenuBar";

const PROJECT_FOLDERS = [
  {
    id: "proj-summit-banking",
    name: "Summit Banking Redesign",
    workflow: "inspire",
    owner: "Yassine",
    updatedAt: "2026-02-07T18:44:00.000Z",
    files: 18,
  },
  {
    id: "proj-aurora-launch",
    name: "Aurora Launch Site",
    workflow: "image-to-site",
    owner: "Design Team",
    updatedAt: "2026-02-07T13:12:00.000Z",
    files: 11,
  },
  {
    id: "proj-zen-garden",
    name: "Zen Garden Mobile Landing",
    workflow: "inspire",
    owner: "Marketing",
    updatedAt: "2026-02-06T20:20:00.000Z",
    files: 7,
  },
  {
    id: "proj-orbit-portal",
    name: "Orbit SaaS Portal",
    workflow: "image-to-site",
    owner: "Product",
    updatedAt: "2026-02-05T16:35:00.000Z",
    files: 24,
  },
  {
    id: "proj-lumen-commerce",
    name: "Lumen Commerce Refresh",
    workflow: "inspire",
    owner: "Growth",
    updatedAt: "2026-02-04T11:05:00.000Z",
    files: 14,
  },
  {
    id: "proj-vertex-pricing",
    name: "Vertex Pricing Pages",
    workflow: "image-to-site",
    owner: "Web Ops",
    updatedAt: "2026-02-03T08:22:00.000Z",
    files: 9,
  },
];

const CONTRIBUTION_TIMELINE_DATA = [
  { year: "2017", concept: 52, production: 94, quality: 136 },
  { year: "2018", concept: 68, production: 104, quality: 148 },
  { year: "2019", concept: 74, production: 116, quality: 132 },
  { year: "2020", concept: 60, production: 96, quality: 156 },
  { year: "2021", concept: 82, production: 90, quality: 126 },
  { year: "2022", concept: 92, production: 110, quality: 144 },
  { year: "2023", concept: 88, production: 124, quality: 138 },
  { year: "2024", concept: 108, production: 132, quality: 166 },
];

const CONTRIBUTOR_ICONS = [
  { id: "ys", name: "Yassine", initials: "YS" },
  { id: "dk", name: "Dina", initials: "DK" },
  { id: "jt", name: "Jules", initials: "JT" },
  { id: "mk", name: "Mika", initials: "MK" },
  { id: "al", name: "Alex", initials: "AL" },
];

const CONTRIBUTION_STATS = [
  { label: "Commits", value: "146", delta: "+18%" },
  { label: "Velocity", value: "24.8", delta: "+9%" },
  { label: "Reviews", value: "39", delta: "+12%" },
];

const formatUpdatedAt = (isoValue) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const toFileCountLabel = (count) => `${count} ${count === 1 ? "file" : "files"}`;

const toUpdatedBadgeLabel = (isoValue) =>
  `Updated ${formatUpdatedAt(isoValue)}`;

const renderTimelineTooltip = ({ active, label, payload }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="workspace-home-chart-tooltip">
      <p>{label}</p>
      {payload.map((entry) => (
        <span key={entry.dataKey}>
          {entry.name}: {entry.value}
        </span>
      ))}
    </div>
  );
};

export default function WorkspaceHomeDashboard({
  onStartInspire,
  onStartTranslate,
  onOpenProject,
}) {
  const [searchValue, setSearchValue] = useState("");

  const filteredProjects = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const matchingProjects = PROJECT_FOLDERS.filter((project) => {
      if (!query) {
        return true;
      }
      return [
        project.name,
        project.owner,
        project.id,
      ].some((field) => field.toLowerCase().includes(query));
    });
    return matchingProjects.sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  }, [searchValue]);

  return (
    <div className="imageflow-shell workspace-home-shell">
      <div className="imageflow-panel workspace-home-panel">
        <ImageflowMenuBar />
        <section className="workspace-home-dashboard">
          <div className="workspace-home-left-column">
            <div className="workspace-home-launch-row">
              <button
                className="workspace-home-launch-card is-inspire"
                type="button"
                onClick={onStartInspire}
              >
                <span className="workspace-home-launch-kicker">Start with style</span>
                <h2>Inspire Workflow</h2>
                <p>
                  Build from intent first. Generate structured directions, style
                  systems, and polished concepts.
                </p>
              </button>
              <button
                className="workspace-home-launch-card is-translate"
                type="button"
                onClick={onStartTranslate}
              >
                <span className="workspace-home-launch-kicker">
                  Start from image
                </span>
                <h2>Translate Workflow</h2>
                <p>
                  Turn references into page structures, preview variants, and
                  editable layouts fast.
                </p>
              </button>
            </div>
            <section className="workspace-home-launch-empty" aria-label="Contribution activity">
              <header className="workspace-home-contrib-header">
                <p className="workspace-home-contrib-kicker">Weekly pulse</p>
                <div className="workspace-home-contrib-people" aria-label="Contributors">
                  <span className="workspace-home-contrib-people-label">Contributors</span>
                  <span className="workspace-home-contrib-header-icons">
                    {CONTRIBUTOR_ICONS.map((contributor) => (
                      <span
                        key={contributor.id}
                        className="workspace-home-contrib-header-icon"
                        title={contributor.name}
                        aria-label={contributor.name}
                      >
                        {contributor.initials}
                      </span>
                    ))}
                  </span>
                </div>
              </header>

              <div className="workspace-home-contrib-content">
                <div className="workspace-home-contrib-chart-column">
                  <div className="workspace-home-time-graph" role="img" aria-label="Contribution timeline area chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={CONTRIBUTION_TIMELINE_DATA}
                        margin={{ top: 18, right: 14, left: 0, bottom: 16 }}
                      >
                        <defs>
                          <linearGradient id="glassConceptFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.36)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
                          </linearGradient>
                          <linearGradient id="glassProductionFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
                          </linearGradient>
                          <linearGradient id="glassQualityFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,0.22)" strokeDasharray="2 6" vertical={false} />
                        <XAxis
                          dataKey="year"
                          tick={{ fill: "rgba(15,23,42,0.56)", fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: "rgba(255,255,255,0.34)" }}
                        />
                        <YAxis
                          tick={{ fill: "rgba(15,23,42,0.56)", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          width={34}
                        />
                        <Tooltip
                          content={renderTimelineTooltip}
                          cursor={{ stroke: "rgba(255,255,255,0.45)", strokeWidth: 1 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="concept"
                          name="Concept"
                          stroke="rgba(255,255,255,0.84)"
                          strokeWidth={1.8}
                          fill="url(#glassConceptFill)"
                        />
                        <Area
                          type="monotone"
                          dataKey="production"
                          name="Production"
                          stroke="rgba(255,255,255,0.68)"
                          strokeWidth={1.7}
                          fill="url(#glassProductionFill)"
                        />
                        <Area
                          type="monotone"
                          dataKey="quality"
                          name="Quality"
                          stroke="rgba(255,255,255,0.54)"
                          strokeWidth={1.6}
                          fill="url(#glassQualityFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="workspace-home-contrib-stats" role="list">
                  {CONTRIBUTION_STATS.map((stat) => (
                    <div key={stat.label} className="workspace-home-contrib-stat" role="listitem">
                      <span className="workspace-home-contrib-stat-label">{stat.label}</span>
                      <strong className="workspace-home-contrib-stat-value">{stat.value}</strong>
                      <span className="workspace-home-contrib-stat-delta">{stat.delta}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="workspace-home-files">
            <div className="workspace-home-files-header">
              <div>
                <p className="workspace-home-files-kicker">Existing files</p>
                <h3>Recent projects</h3>
                <p className="workspace-home-files-sort">Newest updates first</p>
              </div>
              <input
                className="workspace-home-search"
                type="search"
                placeholder="Search projects"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </div>
            <div className="workspace-home-list" role="list">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  className="workspace-home-list-item"
                  type="button"
                  onClick={() => onOpenProject?.(project)}
                  role="listitem"
                >
                  <span className="workspace-home-list-top">
                    <span className="workspace-home-project-cell">
                      <span>{project.name}</span>
                    </span>
                  </span>
                  <span className="workspace-home-list-bottom">
                    <span className="workspace-home-list-meta">
                      <span className="workspace-home-list-text">{project.owner}</span>
                      <span className="workspace-home-list-dot" aria-hidden="true">
                        &middot;
                      </span>
                      <span className="workspace-home-list-text">
                        {toFileCountLabel(project.files)}
                      </span>
                      <span className="workspace-home-list-dot" aria-hidden="true">
                        &middot;
                      </span>
                      <span className="workspace-home-list-text">
                        {toUpdatedBadgeLabel(project.updatedAt)}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {!filteredProjects.length ? (
              <div className="workspace-home-empty">No projects matched your search.</div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
