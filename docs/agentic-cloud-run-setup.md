# Agentic Cloud Tasks Env

Set these environment variables for API queue dispatch:

```env
GCP_PROJECT_ID="<gcp-project-id>"
CLOUD_TASKS_LOCATION="<region>"
CLOUD_TASKS_ORCHESTRATOR_QUEUE="app-gen-orchestrator"
CLOUD_TASKS_ORCHESTRATOR_URL="https://<orchestrator-service-url>/tasks/orchestrate"
# Optional but recommended for private Cloud Run target auth
CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL="<tasks-invoker-service-account-email>"
# Optional override; defaults to CLOUD_TASKS_ORCHESTRATOR_URL
CLOUD_TASKS_OIDC_AUDIENCE="https://<orchestrator-service-url>"
```

Local development options:

```env
# Optional local override if not running on GCP metadata-enabled runtime
GOOGLE_CLOUD_ACCESS_TOKEN="<short-lived-oauth-access-token>"
```

Notes:
- `POST /api/agentic/jobs` now creates DB records and enqueues one orchestrator task in Cloud Tasks.
- If enqueue fails, the job and initial task are marked `failed` with error details.
