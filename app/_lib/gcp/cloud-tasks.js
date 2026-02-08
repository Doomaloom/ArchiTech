function firstDefinedValue(values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function getCloudProjectId() {
  const projectId = firstDefinedValue([
    process.env.GCP_PROJECT_ID,
    process.env.GOOGLE_CLOUD_PROJECT,
  ]);
  if (!projectId) {
    throw new Error("Missing GCP project id. Set GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT.");
  }
  return projectId;
}

function getCloudTasksLocation() {
  const location = firstDefinedValue([process.env.CLOUD_TASKS_LOCATION]);
  if (!location) {
    throw new Error("Missing CLOUD_TASKS_LOCATION.");
  }
  return location;
}

function getOrchestratorQueueName() {
  const queueName = firstDefinedValue([process.env.CLOUD_TASKS_ORCHESTRATOR_QUEUE]);
  if (!queueName) {
    throw new Error("Missing CLOUD_TASKS_ORCHESTRATOR_QUEUE.");
  }
  return queueName;
}

function getOrchestratorUrl() {
  const url = firstDefinedValue([process.env.CLOUD_TASKS_ORCHESTRATOR_URL]);
  if (!url) {
    throw new Error("Missing CLOUD_TASKS_ORCHESTRATOR_URL.");
  }
  return url;
}

function getPageQueueName() {
  const queueName = firstDefinedValue([
    process.env.CLOUD_TASKS_PAGE_QUEUE,
    process.env.CLOUD_TASKS_ORCHESTRATOR_QUEUE,
  ]);
  if (!queueName) {
    throw new Error(
      "Missing CLOUD_TASKS_PAGE_QUEUE or CLOUD_TASKS_ORCHESTRATOR_QUEUE."
    );
  }
  return queueName;
}

function getPageTaskUrl() {
  const url = firstDefinedValue([process.env.CLOUD_TASKS_PAGE_URL]);
  if (!url) {
    throw new Error("Missing CLOUD_TASKS_PAGE_URL.");
  }
  return url;
}

function getIntegrateQueueName() {
  const queueName = firstDefinedValue([
    process.env.CLOUD_TASKS_INTEGRATE_QUEUE,
    process.env.CLOUD_TASKS_ORCHESTRATOR_QUEUE,
  ]);
  if (!queueName) {
    throw new Error(
      "Missing CLOUD_TASKS_INTEGRATE_QUEUE or CLOUD_TASKS_ORCHESTRATOR_QUEUE."
    );
  }
  return queueName;
}

function getIntegrateTaskUrl() {
  const url = firstDefinedValue([process.env.CLOUD_TASKS_INTEGRATE_URL]);
  if (!url) {
    throw new Error("Missing CLOUD_TASKS_INTEGRATE_URL.");
  }
  return url;
}

function getValidateQueueName() {
  const queueName = firstDefinedValue([
    process.env.CLOUD_TASKS_VALIDATE_QUEUE,
    process.env.CLOUD_TASKS_ORCHESTRATOR_QUEUE,
  ]);
  if (!queueName) {
    throw new Error(
      "Missing CLOUD_TASKS_VALIDATE_QUEUE or CLOUD_TASKS_ORCHESTRATOR_QUEUE."
    );
  }
  return queueName;
}

function getValidateTaskUrl() {
  const url = firstDefinedValue([process.env.CLOUD_TASKS_VALIDATE_URL]);
  if (!url) {
    throw new Error("Missing CLOUD_TASKS_VALIDATE_URL.");
  }
  return url;
}

function getFixQueueName() {
  const queueName = firstDefinedValue([
    process.env.CLOUD_TASKS_FIX_QUEUE,
    process.env.CLOUD_TASKS_ORCHESTRATOR_QUEUE,
  ]);
  if (!queueName) {
    throw new Error(
      "Missing CLOUD_TASKS_FIX_QUEUE or CLOUD_TASKS_ORCHESTRATOR_QUEUE."
    );
  }
  return queueName;
}

function getFixTaskUrl() {
  const url = firstDefinedValue([process.env.CLOUD_TASKS_FIX_URL]);
  if (!url) {
    throw new Error("Missing CLOUD_TASKS_FIX_URL.");
  }
  return url;
}

async function getGoogleAccessToken() {
  const explicitAccessToken = firstDefinedValue([process.env.GOOGLE_CLOUD_ACCESS_TOKEN]);
  if (explicitAccessToken) {
    return explicitAccessToken;
  }

  const metadataUrl =
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
  const response = await fetch(metadataUrl, {
    method: "GET",
    headers: {
      "Metadata-Flavor": "Google",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to resolve Google access token from metadata server (${response.status}).`
    );
  }

  const payload = await response.json().catch(() => null);
  const accessToken = payload?.access_token?.toString();
  if (!accessToken) {
    throw new Error("Metadata server token response missing access_token.");
  }
  return accessToken;
}

function buildQueuePath(projectId, location, queueName) {
  return `projects/${projectId}/locations/${location}/queues/${queueName}`;
}

async function enqueueTask({ payload, queueName, targetUrl }) {
  const projectId = getCloudProjectId();
  const location = getCloudTasksLocation();
  const serviceAccountEmail = firstDefinedValue([
    process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL,
  ]);
  const dispatchToken = firstDefinedValue([process.env.AGENTIC_ORCHESTRATOR_TOKEN]);
  const oidcAudience = firstDefinedValue([
    process.env.CLOUD_TASKS_OIDC_AUDIENCE,
    targetUrl,
  ]);

  const queuePath = buildQueuePath(projectId, location, queueName);
  const endpoint = `https://cloudtasks.googleapis.com/v2/${queuePath}/tasks`;
  const accessToken = await getGoogleAccessToken();

  const httpRequest = {
    httpMethod: "POST",
    url: targetUrl,
    headers: {
      "Content-Type": "application/json",
      ...(dispatchToken ? { "X-Agentic-Token": dispatchToken } : {}),
    },
    body: Buffer.from(JSON.stringify(payload), "utf8").toString("base64"),
  };

  if (serviceAccountEmail) {
    httpRequest.oidcToken = {
      serviceAccountEmail,
      audience: oidcAudience,
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task: {
        dispatchDeadline: "1800s",
        httpRequest,
      },
    }),
    cache: "no-store",
  });

  const payloadResponse = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage =
      payloadResponse?.error?.message ||
      payloadResponse?.message ||
      `Cloud Tasks enqueue failed (${response.status}).`;
    throw new Error(errorMessage);
  }

  return {
    taskName: payloadResponse?.name || "",
    queuePath,
    scheduleTime: payloadResponse?.scheduleTime || null,
  };
}

export async function enqueueOrchestratorTask(payload) {
  return enqueueTask({
    payload,
    queueName: getOrchestratorQueueName(),
    targetUrl: getOrchestratorUrl(),
  });
}

export async function enqueuePageTask(payload) {
  return enqueueTask({
    payload,
    queueName: getPageQueueName(),
    targetUrl: getPageTaskUrl(),
  });
}

export async function enqueueIntegrateTask(payload) {
  return enqueueTask({
    payload,
    queueName: getIntegrateQueueName(),
    targetUrl: getIntegrateTaskUrl(),
  });
}

export async function enqueueValidateTask(payload) {
  return enqueueTask({
    payload,
    queueName: getValidateQueueName(),
    targetUrl: getValidateTaskUrl(),
  });
}

export async function enqueueFixTask(payload) {
  return enqueueTask({
    payload,
    queueName: getFixQueueName(),
    targetUrl: getFixTaskUrl(),
  });
}
