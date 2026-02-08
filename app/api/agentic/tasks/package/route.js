import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveWorkspaceDir, runCommand } from "../../../../_lib/agentic/runner";
import { createSupabaseAdminClient } from "../../../../_lib/supabase/admin";

export const runtime = "nodejs";

const ARTIFACT_BUCKET_ID = "generated-apps";
const TERMINAL_TASK_STATUSES = new Set([
  "succeeded",
  "failed",
  "canceled",
  "skipped",
]);

const TERMINAL_JOB_STATUSES = new Set([
  "completed",
  "completed_with_warnings",
  "failed",
  "expired",
]);

function normalizeText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function toIsoNow() {
  return new Date().toISOString();
}

function isDispatchAuthorized(request) {
  const expectedToken = normalizeText(process.env.AGENTIC_ORCHESTRATOR_TOKEN);
  const providedToken = normalizeText(request.headers.get("x-agentic-token"));
  if (expectedToken) {
    return providedToken && providedToken === expectedToken;
  }
  return process.env.NODE_ENV !== "production";
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildArtifactPath(job) {
  return `${job.owner_id}/${job.project_id}/${job.id}/app.zip`;
}

async function ensureRuntimeScripts(workspaceDir) {
  const runShPath = path.join(workspaceDir, "run-app.sh");
  const runBatPath = path.join(workspaceDir, "run-app.bat");
  const readmePath = path.join(workspaceDir, "README.md");

  if (!(await fileExists(runShPath))) {
    await writeFile(
      runShPath,
      `#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  npm install
fi
npm run dev
`,
      "utf8"
    );
    await runCommand({
      cwd: workspaceDir,
      command: "chmod",
      args: ["+x", "run-app.sh"],
      timeoutMs: 10_000,
    });
  }

  if (!(await fileExists(runBatPath))) {
    await writeFile(
      runBatPath,
      `@echo off
cd /d "%~dp0"
if not exist node_modules (
  call npm install
)
call npm run dev
`,
      "utf8"
    );
  }

  if (await fileExists(readmePath)) {
    const currentReadme = await readFile(readmePath, "utf8");
    if (!currentReadme.includes("run-app.sh") || !currentReadme.includes("run-app.bat")) {
      await writeFile(
        readmePath,
        `${currentReadme.trim()}\n\n## Quick Start\n- macOS/Linux: \`./run-app.sh\`\n- Windows: \`run-app.bat\`\n`,
        "utf8"
      );
    }
  } else {
    await writeFile(
      readmePath,
      "# Generated App\n\n## Quick Start\n- macOS/Linux: `./run-app.sh`\n- Windows: `run-app.bat`\n",
      "utf8"
    );
  }
}

export async function POST(request) {
  if (!isDispatchAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized dispatcher." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const jobId = normalizeText(body?.jobId);
  const taskId = normalizeText(body?.taskId);

  if (!jobId || !taskId) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "missing-job-or-task-id",
    });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: task, error: taskError } = await admin
      .from("app_generation_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("job_id", jobId)
      .maybeSingle();

    if (taskError) {
      return NextResponse.json({ error: "Failed to load task." }, { status: 500 });
    }
    if (!task) {
      return NextResponse.json({ ok: true, ignored: true, reason: "task-not-found" });
    }
    if (task.task_type !== "package") {
      return NextResponse.json({ ok: true, ignored: true, reason: "wrong-task-type" });
    }
    if (TERMINAL_TASK_STATUSES.has(task.status)) {
      return NextResponse.json({ ok: true, duplicate: true, status: task.status });
    }

    const { data: job, error: jobError } = await admin
      .from("app_generation_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) {
      return NextResponse.json({ error: "Failed to load job." }, { status: 500 });
    }
    if (!job) {
      await admin
        .from("app_generation_tasks")
        .update({
          status: "failed",
          error_message: "Parent job not found.",
          finished_at: toIsoNow(),
        })
        .eq("id", taskId);
      return NextResponse.json({ ok: true, ignored: true, reason: "job-not-found" });
    }
    if (TERMINAL_JOB_STATUSES.has(job.status)) {
      await admin
        .from("app_generation_tasks")
        .update({
          status: "skipped",
          error_message: `Job already terminal (${job.status}).`,
          finished_at: toIsoNow(),
        })
        .eq("id", taskId);
      return NextResponse.json({ ok: true, ignored: true, reason: "job-terminal" });
    }

    const startedAt = toIsoNow();
    await admin
      .from("app_generation_tasks")
      .update({
        status: "running",
        started_at: task.started_at || startedAt,
        error_message: null,
      })
      .eq("id", taskId);

    await admin
      .from("app_generation_jobs")
      .update({
        status: "running",
        current_stage: "packaging",
        error_message: null,
      })
      .eq("id", jobId);

    const workspaceDir = resolveWorkspaceDir(job.id);
    if (!(await fileExists(workspaceDir))) {
      const message = `Workspace directory not found: ${workspaceDir}`;
      await admin
        .from("app_generation_tasks")
        .update({
          status: "failed",
          error_message: message,
          finished_at: toIsoNow(),
        })
        .eq("id", taskId);

      await admin
        .from("app_generation_jobs")
        .update({
          status: "failed",
          current_stage: "packaging",
          error_message: message,
          finished_at: toIsoNow(),
        })
        .eq("id", jobId);

      return NextResponse.json({ ok: true, status: "failed", reason: "workspace-missing" });
    }

    await ensureRuntimeScripts(workspaceDir);

    const zipDir = path.join(path.dirname(workspaceDir), "artifacts");
    await mkdir(zipDir, { recursive: true });
    const zipPath = path.join(zipDir, `${job.id}.zip`);

    const zipResult = await runCommand({
      cwd: workspaceDir,
      command: "zip",
      args: ["-qr", zipPath, "."],
      timeoutMs: 5 * 60 * 1000,
    });

    if (!zipResult.ok) {
      const message = "Failed to create zip artifact.";
      await admin
        .from("app_generation_tasks")
        .update({
          status: "failed",
          error_message: message,
          finished_at: toIsoNow(),
          result: {
            ...(task.result || {}),
            zip: {
              ok: false,
              code: zipResult.code,
              timedOut: zipResult.timedOut,
              stdout: zipResult.stdout,
              stderr: zipResult.stderr,
            },
          },
        })
        .eq("id", taskId);

      await admin
        .from("app_generation_jobs")
        .update({
          status: "failed",
          current_stage: "packaging",
          error_message: message,
          finished_at: toIsoNow(),
        })
        .eq("id", jobId);

      return NextResponse.json({ ok: true, status: "failed", reason: "zip-failed" });
    }

    const zipStats = await stat(zipPath);
    const maxBytes = 350 * 1024 * 1024;
    if (zipStats.size > maxBytes) {
      const message = `Artifact size ${zipStats.size} exceeds max ${maxBytes}.`;
      await admin
        .from("app_generation_tasks")
        .update({
          status: "failed",
          error_message: message,
          finished_at: toIsoNow(),
        })
        .eq("id", taskId);
      await admin
        .from("app_generation_jobs")
        .update({
          status: "failed",
          current_stage: "packaging",
          error_message: message,
          finished_at: toIsoNow(),
        })
        .eq("id", jobId);
      return NextResponse.json({ ok: true, status: "failed", reason: "artifact-too-large" });
    }

    const artifactPath = buildArtifactPath(job);
    const zipBuffer = await readFile(zipPath);
    const { error: uploadError } = await admin.storage
      .from(ARTIFACT_BUCKET_ID)
      .upload(artifactPath, zipBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError) {
      await admin
        .from("app_generation_tasks")
        .update({
          status: "failed",
          error_message: uploadError.message || "Artifact upload failed.",
          finished_at: toIsoNow(),
        })
        .eq("id", taskId);
      await admin
        .from("app_generation_jobs")
        .update({
          status: "failed",
          current_stage: "packaging",
          error_message: uploadError.message || "Artifact upload failed.",
          finished_at: toIsoNow(),
        })
        .eq("id", jobId);
      return NextResponse.json({ ok: true, status: "failed", reason: "upload-failed" });
    }

    await admin
      .from("app_generation_artifacts")
      .upsert(
        {
          job_id: job.id,
          owner_id: job.owner_id,
          project_id: job.project_id,
          bucket_id: ARTIFACT_BUCKET_ID,
          object_path: artifactPath,
          artifact_kind: "app-zip",
          artifact_size_bytes: zipStats.size,
          metadata: {
            source: "package-task",
          },
        },
        {
          onConflict: "bucket_id,object_path",
        }
      );

    const finishedAt = toIsoNow();
    const warningCount = Number(job.warning_count) || 0;
    const finalStatus = warningCount > 0 ? "completed_with_warnings" : "completed";

    await admin
      .from("app_generation_tasks")
      .update({
        status: "succeeded",
        finished_at: finishedAt,
        result: {
          ...(task.result || {}),
          artifact: {
            bucketId: ARTIFACT_BUCKET_ID,
            objectPath: artifactPath,
            sizeBytes: zipStats.size,
          },
        },
      })
      .eq("id", taskId);

    await admin
      .from("app_generation_jobs")
      .update({
        status: finalStatus,
        current_stage: "completed",
        error_message: null,
        finished_at: finishedAt,
      })
      .eq("id", jobId);

    await admin.from("app_generation_logs").insert({
      job_id: jobId,
      task_id: taskId,
      owner_id: job.owner_id,
      level: warningCount > 0 ? "warn" : "info",
      stage: "package",
      message:
        warningCount > 0
          ? "Package complete with warnings."
          : "Package complete.",
      meta: {
        finalStatus,
        artifactPath,
        sizeBytes: zipStats.size,
      },
    });

    return NextResponse.json({
      ok: true,
      status: finalStatus,
      artifact: {
        bucketId: ARTIFACT_BUCKET_ID,
        objectPath: artifactPath,
        sizeBytes: zipStats.size,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected package task failure." },
      { status: 500 }
    );
  }
}
