# Agentic Cloud Tasks Env

Set these environment variables for API queue dispatch:

```env
GCP_PROJECT_ID="<gcp-project-id>"
CLOUD_TASKS_LOCATION="<region>"
CLOUD_TASKS_ORCHESTRATOR_QUEUE="app-gen-orchestrator"
CLOUD_TASKS_ORCHESTRATOR_URL="https://<app-domain>/api/agentic/tasks/orchestrate"
CLOUD_TASKS_PAGE_QUEUE="app-gen-page"
CLOUD_TASKS_PAGE_URL="https://<app-domain>/api/agentic/tasks/page"
CLOUD_TASKS_INTEGRATE_QUEUE="app-gen-integrate"
CLOUD_TASKS_INTEGRATE_URL="https://<app-domain>/api/agentic/tasks/integrate"
CLOUD_TASKS_VALIDATE_QUEUE="app-gen-validate"
CLOUD_TASKS_VALIDATE_URL="https://<app-domain>/api/agentic/tasks/validate"
CLOUD_TASKS_FIX_QUEUE="app-gen-fix"
CLOUD_TASKS_FIX_URL="https://<app-domain>/api/agentic/tasks/fix"
CLOUD_TASKS_PACKAGE_QUEUE="app-gen-package"
CLOUD_TASKS_PACKAGE_URL="https://<app-domain>/api/agentic/tasks/package"
# Shared dispatch token checked by orchestrator callback route
AGENTIC_ORCHESTRATOR_TOKEN="<long-random-token>"
# Optional workspace root override (default /tmp/architech-agentic/jobs)
AGENTIC_WORKSPACE_ROOT="/tmp/architech-agentic/jobs"
# Optional but recommended for private Cloud Run target auth
CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL="<tasks-invoker-service-account-email>"
# Optional override; defaults to CLOUD_TASKS_ORCHESTRATOR_URL
CLOUD_TASKS_OIDC_AUDIENCE="https://<app-domain>"
```

Local development options:

```env
# Optional local override if not running on GCP metadata-enabled runtime
GOOGLE_CLOUD_ACCESS_TOKEN="<short-lived-oauth-access-token>"
```

Notes:
- `POST /api/agentic/jobs` now creates DB records and enqueues one orchestrator task in Cloud Tasks.
- Queue dispatch adds `X-Agentic-Token` if `AGENTIC_ORCHESTRATOR_TOKEN` is set.
- `POST /api/agentic/tasks/orchestrate` validates this token and handles idempotent callbacks.
- Orchestrator now fans out one `page` task per page via Cloud Tasks.
- `POST /api/agentic/tasks/page` executes a scaffold page step and updates aggregated page state.
- `POST /api/agentic/tasks/page` now attempts real `gemini` CLI page generation and falls back to deterministic TSX when CLI is unavailable.
- `POST /api/agentic/tasks/integrate` now attempts `gemini` CLI integration updates and queues validation.
- `POST /api/agentic/tasks/validate` runs `npm install` and `npm run build`; on build failure it queues fix tasks up to max rounds.
- `POST /api/agentic/tasks/fix` currently performs scaffold fix handling and re-queues validation attempts.
- `POST /api/agentic/tasks/package` zips workspace output, uploads to `generated-apps`, records `app_generation_artifacts`, and finalizes job status.
- If enqueue fails, the job and initial task are marked `failed` with error details.
- Completed jobs expose artifacts via `POST /api/agentic/jobs/:jobId/download`.
