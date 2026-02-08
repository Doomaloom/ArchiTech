"use client";

import { useEffect, useMemo, useState } from "react";
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

const TIMELINE_YEARS = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"];

const CONTRIBUTOR_POOL = [
  { id: "ys", name: "Yassine", initials: "YS" },
  { id: "dk", name: "Dina", initials: "DK" },
  { id: "jt", name: "Jules", initials: "JT" },
  { id: "mk", name: "Mika", initials: "MK" },
  { id: "al", name: "Alex", initials: "AL" },
  { id: "rp", name: "Rafa", initials: "RP" },
  { id: "sn", name: "Sana", initials: "SN" },
  { id: "lb", name: "Liam", initials: "LB" },
];

const toWorkflowBoost = (workflow) => (workflow === "inspire" ? 8 : 12);

const toProjectSeed = (projectId) =>
  projectId.split("").reduce((total, char) => total + char.charCodeAt(0), 0);

const buildContributionTimeline = (project) => {
  const seed = toProjectSeed(project.id);
  const fileBase = project.files * 2;
  const workflowBoost = toWorkflowBoost(project.workflow);
  const conceptAmplitude = 8 + (seed % 11);
  const productionAmplitude = 12 + (seed % 7);
  const qualityAmplitude = 16 + (seed % 9);
  const conceptPhase = seed % 3;
  const productionPhase = (seed + 1) % 4;
  const qualityPhase = (seed + 2) % 5;
  return TIMELINE_YEARS.map((year, index) => {
    const indexBoost = index * (3 + (seed % 3));
    const conceptWave = ((index + conceptPhase) % 2 === 0 ? 1 : -1) * conceptAmplitude;
    const productionWave =
      ((index + productionPhase) % 3 === 0 ? 1 : -1) * productionAmplitude;
    const qualityWave =
      ((index + qualityPhase) % 4 < 2 ? 1 : -1) * qualityAmplitude;
    return {
      year,
      concept: 50 + fileBase + indexBoost + conceptWave,
      production: 76 + fileBase + workflowBoost + indexBoost + productionWave,
      quality: 104 + fileBase + workflowBoost + indexBoost + qualityWave,
    };
  });
};

const buildContributionStats = (project) => {
  const workflowBoost = toWorkflowBoost(project.workflow);
  const commits = project.files * 6 + workflowBoost;
  const velocity = (project.files * 1.2 + workflowBoost / 2).toFixed(1);
  const reviews = Math.max(12, Math.round(project.files * 1.7 + workflowBoost));
  return [
    { label: "Commits", value: String(commits), delta: `+${14 + project.files}%` },
    { label: "Velocity", value: velocity, delta: `+${7 + workflowBoost / 2}%` },
    { label: "Reviews", value: String(reviews), delta: `+${9 + Math.round(project.files / 3)}%` },
  ];
};

const buildContributors = (project) => {
  const charCodeSum = project.id
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  const startIndex = charCodeSum % CONTRIBUTOR_POOL.length;
  const contributorCount = 2 + (charCodeSum % 4);
  return Array.from({ length: contributorCount }, (_, offset) => {
    const contributor = CONTRIBUTOR_POOL[
      (startIndex + offset) % CONTRIBUTOR_POOL.length
    ];
    return {
      ...contributor,
      projectScopedId: `${project.id}-${contributor.id}`,
    };
  });
};

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
  const [selectedProjectId, setSelectedProjectId] = useState(PROJECT_FOLDERS[0].id);

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

  useEffect(() => {
    if (!filteredProjects.length) {
      return;
    }
    const hasSelected = filteredProjects.some(
      (project) => project.id === selectedProjectId
    );
    if (!hasSelected) {
      setSelectedProjectId(filteredProjects[0].id);
    }
  }, [filteredProjects, selectedProjectId]);

  const selectedProject = useMemo(
    () =>
      filteredProjects.find((project) => project.id === selectedProjectId) ??
      PROJECT_FOLDERS.find((project) => project.id === selectedProjectId) ??
      PROJECT_FOLDERS[0],
    [filteredProjects, selectedProjectId]
  );

  const contributionTimelineData = useMemo(
    () => buildContributionTimeline(selectedProject),
    [selectedProject]
  );

  const contributionStats = useMemo(
    () => buildContributionStats(selectedProject),
    [selectedProject]
  );

  const projectContributors = useMemo(
    () => buildContributors(selectedProject),
    [selectedProject]
  );

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
                    {projectContributors.map((contributor) => (
                      <span
                        key={contributor.projectScopedId}
                        className="workspace-home-contrib-header-icon"
                        data-contributor={contributor.name}
                        title={contributor.name}
                        aria-label={contributor.name}
                        tabIndex={0}
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
                        data={contributionTimelineData}
                        margin={{ top: 18, right: 14, left: 0, bottom: 16 }}
                      >
                        <defs>
                          <linearGradient id="glassConceptFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.62)" />
                            <stop offset="55%" stopColor="rgba(255,255,255,0.34)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0.14)" />
                          </linearGradient>
                          <linearGradient id="glassProductionFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
                            <stop offset="55%" stopColor="rgba(255,255,255,0.18)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
                          </linearGradient>
                          <linearGradient id="glassQualityFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
                            <stop offset="55%" stopColor="rgba(255,255,255,0.08)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
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
                  {contributionStats.map((stat) => (
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
                <h3>Recent projects</h3>
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
                  className={`workspace-home-list-item${
                    project.id === selectedProjectId ? " is-selected" : ""
                  }`}
                  type="button"
                  onClick={() => setSelectedProjectId(project.id)}
                  onDoubleClick={() => onOpenProject?.(project)}
                  role="listitem"
                  title="Click to drive stats, double-click to open project"
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
