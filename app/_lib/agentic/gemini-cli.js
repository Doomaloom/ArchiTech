import { runCommand, trimOutput } from "./runner";

function extractCodeFence(text) {
  if (typeof text !== "string") {
    return "";
  }
  const fenceMatch = text.match(/```(?:tsx|ts|jsx|js)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }
  return text.trim();
}

function isLikelyCode(text) {
  if (!text) {
    return false;
  }
  return /export\s+default|function\s+\w+|const\s+\w+\s*=/.test(text);
}

export async function runGeminiCliPrompt({
  cwd,
  prompt,
  timeoutMs = 8 * 60 * 1000,
}) {
  const attempts = [
    ["-p", prompt],
    ["--prompt", prompt],
  ];

  const traces = [];
  for (const args of attempts) {
    const result = await runCommand({
      cwd,
      command: "gemini",
      args,
      timeoutMs,
    });
    traces.push({
      args,
      ok: result.ok,
      code: result.code,
      stdout: trimOutput(result.stdout, 6000),
      stderr: trimOutput(result.stderr, 6000),
      timedOut: result.timedOut,
    });
    if (result.ok) {
      const raw = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
      const extracted = extractCodeFence(raw);
      if (isLikelyCode(extracted)) {
        return {
          ok: true,
          output: extracted,
          rawOutput: trimOutput(raw, 12000),
          traces,
        };
      }
    }
  }

  return {
    ok: false,
    output: "",
    rawOutput: "",
    traces,
  };
}
