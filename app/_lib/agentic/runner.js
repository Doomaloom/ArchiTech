import { spawn } from "node:child_process";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export function resolveWorkspaceDir(jobId) {
  const root = process.env.AGENTIC_WORKSPACE_ROOT || "/tmp/architech-agentic/jobs";
  return path.join(root, jobId, "workspace");
}

export function trimOutput(text, maxChars = 20000) {
  if (typeof text !== "string") {
    return "";
  }
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n...[truncated]`;
}

export async function runCommand({
  cwd,
  command,
  args = [],
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        code: null,
        stdout: trimOutput(stdout),
        stderr: trimOutput(`${stderr}\n${error.message}`),
        timedOut,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        ok: code === 0 && !timedOut,
        code,
        stdout: trimOutput(stdout),
        stderr: trimOutput(stderr),
        timedOut,
      });
    });
  });
}
