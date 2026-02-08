# Agentic Backend Plan

## Goal
Build a backend workflow that takes finalized frontend design inputs, generates a full production-ready `Next.js + React + Tailwind` app via real Gemini CLI agents running in containers, validates/fixes automatically, then stores a downloadable artifact in private storage for the project owner.

## Confirmed Decisions
- Use real Gemini CLI in worker containers.
- Use one-shot generation plus automatic fix loop.
- Input bundle includes: app brief, page tree, selected preview HTML per page, style, notes, desired actions/functionality.
- Deliver output by storing ZIP in bucket and returning a signed URL.
- Output is a standalone app repo (`package.json`, source, `README`, `.env.example`).
- Artifacts and jobs are private per user/project.
- If `npm install` fails, still allow artifact download and mark as warning.
- Async queue + autoscaled workers.
- Parallel page-agent generation + integration agent merge.
- Job limits: 45 minutes max, 4 fix rounds max, 350 MB max artifact.
- Include backend API routes in generated apps, but no DB models.
- Use one server-level Gemini key.
- Delivery UX: download ZIP only.
- Execution platform: Google Cloud Run.
- Queueing and async orchestration: Google Cloud Tasks.
- Signed URL TTL: 15 minutes.
- Artifact retention: keep latest 5 artifacts per project.

## High-Level Flow
1. User finalizes project in UI and picks one preview HTML per page.
2. Frontend sends generation request to backend with normalized `generation_spec`.
3. Backend enqueues job and returns `jobId`.
4. Orchestrator schedules parallel page-agent tasks and one integration task.
5. Worker containers run Gemini CLI prompts against a starter template workspace.
6. Validation stage runs install/build checks.
7. If checks fail, fixer agent iterates (max 4 rounds / 45 min total).
8. Workspace is zipped, size checked, uploaded to private bucket.
9. Backend returns short-lived signed download URL.

## Architecture
- API layer: Next.js route handlers for submit/status/download.
- Queue: Google Cloud Tasks queues for job orchestration and retries.
- Orchestrator: Cloud Run service that coordinates fan-out/fan-in stages and fix loop policy.
- Workers: autoscaled Cloud Run service with Node + Gemini CLI + build tooling.
- State store: Supabase Postgres tables for job/task status and logs.
- Artifact store: Supabase Storage private bucket for ZIP outputs.

## GCP Setup (From Scratch)
1. Create a GCP project and set billing.
2. Enable APIs:
- Cloud Run Admin API
- Cloud Build API
- Artifact Registry API
- Secret Manager API
- Cloud Tasks API
- Cloud Logging API
3. Create Artifact Registry repo for worker images.
4. Create service accounts:
- `agent-orchestrator-sa`
- `agent-worker-sa`
5. Grant minimum IAM roles:
- Orchestrator: Cloud Tasks Enqueuer, Secret Manager Accessor, Cloud Run Invoker (worker), logging writer.
- Worker: Secret Manager Accessor, logging writer.
6. Store `GEMINI_API_KEY` in Secret Manager.
7. Deploy `agent-worker` Cloud Run service:
- private ingress
- concurrency `1`
- timeout `3600s`
- cpu `4`
- memory `8Gi`
- max instances based on budget
8. Deploy `agent-orchestrator` Cloud Run service:
- private ingress
- handles queue callbacks and stage transitions
9. Create Cloud Tasks queues:
- `app-gen-orchestrator`
- `app-gen-page`
- `app-gen-integrate`
- `app-gen-fix`
10. Configure OIDC-authenticated task dispatch from Cloud Tasks to Cloud Run services.
11. Add scheduled cleanup job to enforce artifact retention (latest 5 per project).

## Data Contract
`generation_spec` (stored as JSONB):

```json
{
  "projectId": "uuid",
  "brief": { "title": "", "details": "", "audience": "", "goals": "" },
  "style": { "name": "", "palette": [], "typography": [], "notes": "" },
  "globalNotes": "",
  "pages": [
    {
      "pageId": "home",
      "route": "/",
      "name": "Home",
      "treeNode": {},
      "selectedPreviewHtml": "<!doctype html>...",
      "actions": ["signup", "search"],
      "notes": ""
    }
  ]
}
```

## Agent Pipeline
### Stage A: Prepare workspace
- Copy internal starter template into ephemeral job workspace.
- Write normalized spec files under `/.agent/input/`.
- Generate strict system prompts and per-page task prompts.

### Stage B: Parallel page agents
- Spawn one task per page.
- Each page agent outputs route/component files scoped to that page.
- Enforce constraints in prompt:
- no DB models or ORM files
- backend actions only via API routes
- preserve selected preview HTML structure and style intent

### Stage C: Integration agent
- Merge shared layout/theme/components/routes.
- Resolve navigation, shared utilities, Tailwind tokens, and app wiring.
- Generate API routes needed by requested functionality.
- Ensure no database modeling files are introduced.

### Stage D: Validation + Fix loop
- Run:
- `npm install` (warning-only on failure)
- `npm run build` (fix-loop trigger on failure)
- optional `npm run lint` if present (fix-loop trigger on failure)
- On failure, collect logs and run fixer prompt with exact errors.
- Stop at first passing validation or after max 4 fix rounds / 45 minutes.

### Stage E: Package + Upload
- Build ZIP from workspace.
- Enforce max artifact size 350 MB.
- Upload to private storage bucket path:
- `generated-apps/{owner_id}/{project_id}/{job_id}/app.zip`
- Persist artifact metadata and mark job terminal state.

## Job States
- `queued`
- `running`
- `fixing`
- `completed`
- `completed_with_warnings`
- `failed`
- `expired`

Warnings examples:
- `npm install` failed but artifact exists.
- lint skipped or missing.

## Concurrency and Limits
- Per-job page parallelism: `min(page_count, 4)` with hard max `6`.
- Per-user running jobs: max `2`.
- Global worker cap: start at `30` max Cloud Run instances.
- Retry backoff for transient execution failures: `20s`, `60s`, `180s`.
- User daily generation cap: `5` full app generation jobs.

## API Plan
- `POST /api/agentic/jobs`
- Auth required.
- Validates ownership + `generation_spec`.
- Creates job + enqueues orchestrator task.
- Returns `{ jobId }`.

- `GET /api/agentic/jobs/:jobId`
- Auth + ownership required.
- Returns status, progress, warnings, timestamps.

- `POST /api/agentic/jobs/:jobId/download`
- Auth + ownership required.
- Creates signed URL with short TTL (example: 15 minutes).
- Returns `{ url, expiresAt }`.

- `GET /api/agentic/jobs/:jobId/logs`
- Auth + ownership required.
- Returns redacted stage/task logs for debugging UI.

## Database Plan (SQL migration)
Add tables:
- `app_generation_jobs`
- `app_generation_tasks`
- `app_generation_artifacts`
- `app_generation_logs`

Key columns:
- `owner_id`, `project_id`, `status`, `generation_spec jsonb`
- `attempt_count`, `fix_round`, `warning_count`
- `artifact_path`, `artifact_size_bytes`, `checksum`
- `started_at`, `finished_at`, `expires_at`

RLS:
- Owner-only read/write by `auth.uid() = owner_id`.
- Service role only for worker updates and artifact upload metadata.

## Storage Plan
- Bucket: `generated-apps` (private).
- Objects stored per owner/project/job path.
- Signed URLs generated on demand by API route.
- Lifecycle cleanup:
- keep latest `5` artifacts per project
- remove older artifacts and stale temp outputs on scheduled cleanup.

## Worker Container Plan
- Base image includes:
- Node LTS
- Gemini CLI
- zip utilities
- build toolchain needed by Next.js apps
- Environment:
- `GEMINI_API_KEY` (server-level paid key)
- no user-provided API keys in worker runtime for now
- Execution:
- ephemeral filesystem workspace per task/job
- no shared mutable workspace across jobs
- task-level timeout + global job timeout enforcement

## Security Sandbox
- Run containers as non-root.
- Use read-only root filesystem.
- Use writable ephemeral `/workspace` only.
- Keep Cloud Run services private (no public ingress).
- Restrict worker egress to required external endpoints only.
- Load secrets at runtime from Secret Manager, never persist in artifacts/logs.
- Redact sensitive tokens and headers from logs.

## Prompting and Guardrails
- Primary prompt from frontend spec + strict output contract.
- Guardrails:
- never generate DB models (`prisma`, `drizzle`, schema migrations)
- only API routes/backend logic requested by spec
- keep app structure deployable as plain Next.js app
- Fix prompts include:
- prior diff summary
- exact command failure logs
- instruction to minimize unrelated churn

## Download UX
- UI polls `GET /api/agentic/jobs/:jobId`.
- When complete, show `Download ZIP`.
- Clicking download calls signed URL endpoint and starts file download.

## Frontend Build Flow
- Add a new page: `/build`.
- Entry point: available after user finalizes previews in workflow.
- Required step on `/build`:
- user must select exactly one preview HTML per page
- user reviews notes/actions summary before submit
- Submit starts generation job and redirects to job progress state
- Completion state shows only `Download ZIP`

## Generated App Runtime Script Requirement
Each generated artifact includes:
- `run-app.sh` (macOS/Linux)
- `run-app.bat` (Windows)
- optional `Dockerfile` for containerized runs

`run-app.sh` behavior:
1. Ensures script runs from project root.
2. Runs `npm install` if `node_modules` missing.
3. Runs `npm run dev`.
4. Prints local URL and keeps process attached.

`README.md` in artifact includes one-click launch instruction:
- macOS/Linux: double-click `run-app.sh` if executable or run once with permissions.
- Windows: double-click `run-app.bat`.

## Implementation Phases
1. Schema + storage migration + RLS.
2. Build `/build` page and finalize preview-selection payload contract.
3. Job submit/status/download APIs.
4. Cloud Run orchestrator + worker services and Cloud Tasks queues.
5. Gemini CLI page-agent + integration-agent prompts.
6. Validation + fix-loop executor.
7. Artifact zipping + signed URL delivery.
8. Frontend integration (trigger job, progress polling, download button).
9. Observability, quotas/rate limits, and retention cleanup jobs.

## Non-Goals (Current Phase)
- No DB models in generated apps.
- No per-user Gemini credentials.
- No deploy-to-cloud flow from this pipeline.
