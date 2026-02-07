import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const FLASH_MODEL =
  process.env.GEMINI_FLASH_MODEL ||
  process.env.GEMINI_MODEL ||
  "gemini-3-flash-preview";
const PRO_MODEL = process.env.GEMINI_PRO_MODEL || "gemini-3-pro-preview";
const MAX_PREVIEWS = 6;
const VIEWPORT = { width: 1280, height: 900 };

const clampNumber = (value, min, max) =>
  Math.min(Math.max(value, min), max);

const roundValue = (value, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const extractJson = (text) => {
  if (!text) {
    return null;
  }
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (
    firstBracket !== -1 &&
    lastBracket !== -1 &&
    (firstBrace === -1 || firstBracket < firstBrace)
  ) {
    return text.slice(firstBracket, lastBracket + 1);
  }
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return null;
};

const extractHtml = (text) => {
  if (!text) {
    return null;
  }
  const fenced =
    text.match(/```html\s*([\s\S]*?)```/i) ||
    text.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const htmlStart = text.search(/<!doctype html|<html|<body/i);
  if (htmlStart !== -1) {
    return text.slice(htmlStart).trim();
  }
  return text.trim();
};

const ensureHtmlDocument = (html) => {
  if (!html) {
    return "";
  }
  if (/<html[\s>]/i.test(html)) {
    return html;
  }
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    "<title>Preview</title>",
    "<style>html,body{width:100%;height:100%;margin:0;}</style>",
    "</head>",
    "<body>",
    html,
    "</body>",
    "</html>",
  ].join("\n");
};

const normalizePlan = (plan, index) => {
  const safe = plan ?? {};
  const toList = (value) =>
    Array.isArray(value)
      ? value.map((entry) => entry?.toString()).filter(Boolean)
      : [];
  return {
    id: safe.id?.toString() || `plan-${index + 1}`,
    title: safe.title?.toString() || `Concept ${index + 1}`,
    summary: safe.summary?.toString() || "",
    layout: safe.layout?.toString() || "",
    sections: toList(safe.sections),
    styleKeywords: toList(safe.styleKeywords),
  };
};

const parsePlans = (text, count) => {
  const jsonText = extractJson(text);
  if (!jsonText) {
    return [];
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return [];
  }
  const rawPlans = Array.isArray(parsed) ? parsed : parsed?.plans;
  if (!Array.isArray(rawPlans)) {
    return [];
  }
  return rawPlans.slice(0, count).map(normalizePlan);
};

const formatWorkspace = (workspace) => {
  if (!workspace || typeof workspace !== "object") {
    return "";
  }
  const note = workspace.note?.toString().trim();
  const maskBounds = workspace.mask?.bounds;
  const boundsText =
    maskBounds &&
    Number.isFinite(maskBounds.x) &&
    Number.isFinite(maskBounds.y) &&
    Number.isFinite(maskBounds.width) &&
    Number.isFinite(maskBounds.height)
      ? `Mask bounds: x=${Math.round(maskBounds.x)}, y=${Math.round(
          maskBounds.y
        )}, w=${Math.round(maskBounds.width)}, h=${Math.round(
          maskBounds.height
        )}`
      : "";
  return [note ? `Workspace note: ${note}` : "", boundsText]
    .filter(Boolean)
    .join("\n");
};

const buildPlanPrompt = ({ count, nodeContext, brief, style, workspace }) => {
  const workspaceText = formatWorkspace(workspace);
  return [
    "You are a product designer generating layout concepts.",
    `Create ${count} distinct plans for the requested page/component.`,
    "Return JSON only with this schema:",
    "{",
    '  "plans": [',
    "    {",
    '      "id": "plan-1",',
    '      "title": "Concept name",',
    '      "summary": "1-2 sentence overview",',
    '      "layout": "Short description of layout strategy",',
    '      "sections": ["Section name", "Section name"],',
    '      "styleKeywords": ["keyword", "keyword"]',
    "    }",
    "  ]",
    "}",
    "Rules:",
    "- Keep plans aligned with the selected style direction.",
    "- Use the project brief to shape content hierarchy and CTAs.",
    "- Keep the layout grounded in the node requirements.",
    "",
    "Project brief:",
    JSON.stringify(brief ?? {}, null, 2),
    "",
    "Selected style:",
    JSON.stringify(style ?? {}, null, 2),
    "",
    workspaceText ? `Workspace input:\n${workspaceText}` : null,
    "",
    "Node context:",
    JSON.stringify(nodeContext, null, 2),
  ]
    .filter(Boolean)
    .join("\n");
};

const buildHtmlPrompt = ({ plan, nodeContext, brief, style, workspace }) => {
  const workspaceText = formatWorkspace(workspace);
  return [
    "You are an expert frontend designer.",
    "Create a complete HTML document (self-contained) that can be rendered in headless Chromium.",
    "Constraints:",
    "- Output HTML only. No markdown or explanations.",
    "- Use inline CSS in a <style> tag. Optional inline JS allowed.",
    "- Avoid external assets or fonts. Use gradients, SVG, or simple shapes instead.",
    "- Ensure body margin is 0 and layout fits within 1280x900.",
    "- Set html, body { width: 100%; height: 100%; margin: 0; }.",
    "- Use a visible background; avoid pure white.",
    "- Provide high contrast, clear hierarchy, and clean spacing.",
    "- Match the selected style (colors, shapes, typography energy).",
    "",
    "Project brief:",
    JSON.stringify(brief ?? {}, null, 2),
    "",
    "Selected style:",
    JSON.stringify(style ?? {}, null, 2),
    "",
    workspaceText ? `Workspace input:\n${workspaceText}` : null,
    "",
    "Plan:",
    JSON.stringify(plan, null, 2),
    "",
    "Node context:",
    JSON.stringify(nodeContext, null, 2),
  ]
    .filter(Boolean)
    .join("\n");
};

const loadPuppeteer = async () => {
  try {
    const module = await import("puppeteer");
    return module.default ?? module;
  } catch (error) {
    throw new Error(
      "Puppeteer is required for preview rendering. Install puppeteer to enable previews."
    );
  }
};

const renderHtmlList = async (htmlList) => {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      process.env.CHROME_BIN ||
      undefined,
  });

  try {
    const results = [];
    const errors = [];
    for (const html of htmlList) {
      if (!html) {
        results.push(null);
        errors.push("Missing HTML.");
        continue;
      }
      const page = await browser.newPage();
      try {
        await page.setViewport({
          width: VIEWPORT.width,
          height: VIEWPORT.height,
          deviceScaleFactor: 1,
        });
        await page.emulateMediaType("screen");
        await page.setContent(html, {
          waitUntil: ["domcontentloaded", "load"],
          timeout: 20000,
        });
        await new Promise((resolve) => setTimeout(resolve, 150));
        const buffer = await page.screenshot({ type: "png", fullPage: true });
        results.push(`data:image/png;base64,${buffer.toString("base64")}`);
        errors.push(null);
      } catch (error) {
        results.push(null);
        errors.push(error?.message ?? "Failed to render HTML.");
      } finally {
        await page.close();
      }
    }
    return { images: results, errors };
  } finally {
    await browser.close();
  }
};

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY or GOOGLE_API_KEY." },
        { status: 500 }
      );
    }

    const payload = await request.json();
    const count = clampNumber(Number(payload?.count) || 1, 1, MAX_PREVIEWS);
    const quality = payload?.quality === "pro" ? "pro" : "flash";
    const renderMode = payload?.renderMode === "png" ? "png" : "html";
    const creativity = clampNumber(Number(payload?.creativity) || 0, 0, 100);
    const temperature = roundValue(0.2 + (creativity / 100) * 1.0);
    const nodeContext = payload?.nodeContext ?? null;
    const brief = payload?.brief ?? {};
    const style = payload?.style ?? {};
    const workspace = payload?.workspace ?? null;

    if (!nodeContext?.node) {
      return NextResponse.json(
        { error: "Node context is required." },
        { status: 400 }
      );
    }

    const model = quality === "pro" ? PRO_MODEL : FLASH_MODEL;
    const ai = new GoogleGenAI({ apiKey });

    const planPrompt = buildPlanPrompt({
      count,
      nodeContext,
      brief,
      style,
      workspace,
    });
    const planMaxTokens = Number(process.env.PREVIEW_PLAN_MAX_TOKENS) || 4096;
    const htmlMaxTokens = Number(process.env.PREVIEW_HTML_MAX_TOKENS) || 16384;

    const planResponse = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{ text: planPrompt }],
        },
      ],
      config: {
        temperature,
        responseMimeType: "application/json",
        maxOutputTokens: planMaxTokens,
      },
    });

    const planText = planResponse?.text ?? "";
    const plans = parsePlans(planText, count);
    if (!plans.length) {
      return NextResponse.json(
        { error: "Failed to parse plan response.", raw: planText },
        { status: 502 }
      );
    }

    const htmlResponses = await Promise.allSettled(
      plans.map((plan) =>
        ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: buildHtmlPrompt({
                    plan,
                    nodeContext,
                    brief,
                    style,
                    workspace,
                  }),
                },
              ],
            },
          ],
          config: {
            temperature,
            maxOutputTokens: htmlMaxTokens,
          },
        })
      )
    );

    const htmlCandidates = htmlResponses.map((result, index) => {
      if (result.status !== "fulfilled") {
        return {
          plan: plans[index],
          html: null,
          error: result.reason?.message ?? "Failed to generate HTML.",
        };
      }
      const rawHtml = extractHtml(result.value?.text ?? "");
      return {
        plan: plans[index],
        html: ensureHtmlDocument(rawHtml),
      };
    });

    let renderResult = {
      images: Array.from({ length: htmlCandidates.length }, () => null),
      errors: Array.from({ length: htmlCandidates.length }, () => null),
    };

    if (renderMode === "png") {
      renderResult = await renderHtmlList(
        htmlCandidates.map((candidate) => candidate.html)
      );
    }

    const previews = htmlCandidates.map((candidate, index) => ({
      id: candidate.plan?.id ?? `preview-${index + 1}`,
      plan: candidate.plan,
      html: candidate.html,
      imageUrl: renderResult.images[index] ?? null,
      renderError: renderResult.errors[index] ?? null,
      error: candidate.error ?? null,
      model,
      temperature,
    }));

    const renderedAny = previews.some((preview) => preview.imageUrl);
    if (renderMode === "png" && !renderedAny) {
      const errors = renderResult.errors.filter(Boolean);
      const missingHtml = errors.filter((error) => error === "Missing HTML.")
        .length;
      let errorMessage =
        "Preview rendering failed. Ensure Chromium is available for Puppeteer.";
      if (errors.length && missingHtml === errors.length) {
        errorMessage =
          "Preview HTML generation failed. No HTML was returned by the model.";
      } else if (errors.length) {
        errorMessage = `Preview rendering failed: ${errors[0]}`;
      }
      return NextResponse.json(
        {
          error: errorMessage,
          previews,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ previews, model, temperature, renderMode });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate previews.",
        message: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
