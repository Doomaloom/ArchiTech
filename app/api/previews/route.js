import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const FLASH_MODEL =
  process.env.GEMINI_FLASH_MODEL ||
  process.env.GEMINI_MODEL ||
  "gemini-3-flash-preview";
const PRO_MODEL = process.env.GEMINI_PRO_MODEL || "gemini-3-pro-preview";
const IDEOGRAM_ENDPOINT =
  "https://api.ideogram.ai/v1/ideogram-v3/generate-transparent";
const MAX_PREVIEWS = 6;
const VIEWPORT = { width: 1280, height: 900 };
const IDEOGRAM_ASPECT_RATIOS = new Set([
  "1x3",
  "3x1",
  "1x2",
  "2x1",
  "9x16",
  "16x9",
  "10x16",
  "16x10",
  "2x3",
  "3x2",
  "3x4",
  "4x3",
  "4x5",
  "5x4",
  "1x1",
]);
const IDEOGRAM_RENDERING_SPEEDS = new Set([
  "FLASH",
  "TURBO",
  "DEFAULT",
  "QUALITY",
]);
const IDEOGRAM_MAGIC_PROMPTS = new Set(["AUTO", "ON", "OFF"]);
const IDEOGRAM_UPSCALE_FACTORS = new Set(["X1", "X2", "X4"]);

const clampNumber = (value, min, max) =>
  Math.min(Math.max(value, min), max);

const roundValue = (value, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const resolveIdeogramParams = (nodeContext) => {
  const analysis = nodeContext?.node?.imageAnalysis ?? {};
  const ideogram = analysis?.ideogram ?? {};
  return {
    aspect_ratio: ideogram.aspect_ratio,
    rendering_speed: ideogram.rendering_speed,
    magic_prompt: ideogram.magic_prompt,
    upscale_factor: ideogram.upscale_factor,
    seed: ideogram.seed,
    negative_prompt: ideogram.negative_prompt,
  };
};

const normalizeIdeogramParams = (params) => {
  if (!params || typeof params !== "object") {
    return {};
  }
  const normalized = {};
  if (params.aspect_ratio && IDEOGRAM_ASPECT_RATIOS.has(params.aspect_ratio)) {
    normalized.aspect_ratio = params.aspect_ratio;
  }
  if (params.rendering_speed && IDEOGRAM_RENDERING_SPEEDS.has(params.rendering_speed)) {
    normalized.rendering_speed = params.rendering_speed;
  }
  if (params.magic_prompt && IDEOGRAM_MAGIC_PROMPTS.has(params.magic_prompt)) {
    normalized.magic_prompt = params.magic_prompt;
  }
  if (params.upscale_factor && IDEOGRAM_UPSCALE_FACTORS.has(params.upscale_factor)) {
    normalized.upscale_factor = params.upscale_factor;
  }
  if (params.negative_prompt) {
    normalized.negative_prompt = params.negative_prompt.toString();
  }
  if (params.seed != null && Number.isFinite(Number(params.seed))) {
    normalized.seed = Number(params.seed);
  }
  return normalized;
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
    "<html lang=\"en\">",
    "<head>",
    "<meta charset=\"utf-8\" />",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
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

const buildPlanPrompt = ({ count, nodeContext }) => {
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
    "- Keep plans as faithful to the uploaded images as possible.",
    "- Focus on matching colors, shapes, spacing, and placement.",
    "- Plans can be subtle alternatives but avoid big departures.",
    "- Keep plans grounded in the provided node requirements.",
    "",
    "Node context:",
    JSON.stringify(nodeContext, null, 2),
  ].join("\n");
};

const buildHtmlPrompt = ({ plan, nodeContext }) => {
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
    "- Match the uploaded image analysis as closely as possible (colors, shapes, placement).",
    "",
    "Plan:",
    JSON.stringify(plan, null, 2),
    "",
    "Node context:",
    JSON.stringify(nodeContext, null, 2),
  ].join("\n");
};

const buildIdeogramPrompt = ({ plan, nodeContext }) => {
  const node = nodeContext?.node ?? {};
  const requirements = Array.isArray(node?.requirements)
    ? node.requirements.filter(Boolean)
    : [];
  const sections = Array.isArray(plan?.sections)
    ? plan.sections.filter(Boolean)
    : [];
  const keywords = Array.isArray(plan?.styleKeywords)
    ? plan.styleKeywords.filter(Boolean)
    : [];
  const imageDescriptions = Array.isArray(node?.imageDescriptions)
    ? node.imageDescriptions.filter(Boolean)
    : [];
  const imageAnalysis = node?.imageAnalysis ?? null;
  const analysisColors = Array.isArray(imageAnalysis?.colors)
    ? imageAnalysis.colors.filter(Boolean)
    : [];
  const analysisShapes = Array.isArray(imageAnalysis?.shapes)
    ? imageAnalysis.shapes.filter(Boolean)
    : [];
  const analysisComponents = Array.isArray(imageAnalysis?.components)
    ? imageAnalysis.components.filter(Boolean)
    : [];
  const analysisKeywords = Array.isArray(imageAnalysis?.styleKeywords)
    ? imageAnalysis.styleKeywords.filter(Boolean)
    : [];
  const placement =
    imageAnalysis?.placement?.toString().trim() ||
    imageAnalysis?.layout?.placement?.toString().trim() ||
    "";
  const typography =
    imageAnalysis?.typography?.notes?.toString().trim() ||
    imageAnalysis?.typography?.style?.toString().trim() ||
    "";
  const background = imageAnalysis?.background?.toString().trim() || "";
  const imagery = imageAnalysis?.imagery?.toString().trim() || "";
  const pathLabels = Array.isArray(nodeContext?.path)
    ? nodeContext.path
        .map((entry) => entry?.label?.toString().trim())
        .filter(Boolean)
    : [];
  const childLabels = Array.isArray(nodeContext?.children)
    ? nodeContext.children
        .map((entry) => entry?.label?.toString().trim())
        .filter(Boolean)
    : [];

  return [
    "High-fidelity UI mockup of a modern product website.",
    "Match the provided visual analysis as closely as possible.",
    "Only include website UI layers on a transparent background.",
    node?.label ? `Page: ${node.label}` : null,
    node?.description ? `Description: ${node.description}` : null,
    imageDescriptions.length
      ? `Image references: ${imageDescriptions.join(" | ")}`
      : null,
    imageAnalysis?.summary
      ? `Visual summary: ${imageAnalysis.summary}`
      : null,
    analysisColors.length ? `Dominant colors: ${analysisColors.join(", ")}` : null,
    analysisShapes.length ? `Shapes: ${analysisShapes.join(", ")}` : null,
    placement ? `Placement: ${placement}` : null,
    analysisComponents.length
      ? `Components: ${analysisComponents.join(", ")}`
      : null,
    typography ? `Typography: ${typography}` : null,
    background ? `Background: ${background}` : null,
    imagery ? `Imagery: ${imagery}` : null,
    analysisKeywords.length
      ? `Style cues: ${analysisKeywords.join(", ")}`
      : null,
    requirements.length ? `Requirements: ${requirements.join("; ")}` : null,
    pathLabels.length ? `App path: ${pathLabels.join(" > ")}` : null,
    nodeContext?.parent?.label
      ? `Parent section: ${nodeContext.parent.label}`
      : null,
    childLabels.length ? `Child sections: ${childLabels.join(", ")}` : null,
    plan?.title ? `Concept: ${plan.title}` : null,
    plan?.summary ? `Summary: ${plan.summary}` : null,
    plan?.layout ? `Layout: ${plan.layout}` : null,
    sections.length ? `Sections: ${sections.join(", ")}` : null,
    keywords.length ? `Style keywords: ${keywords.join(", ")}` : null,
    "Use clear hierarchy, crisp typography, and generous spacing.",
    "Avoid watermarks, avoid blurry text, keep copy legible.",
    "Landscape canvas similar to 1280x900.",
  ]
    .filter(Boolean)
    .join("\n");
};

const requestIdeogramImage = async ({ prompt, apiKey, ideogramParams }) => {
  const normalizedParams = normalizeIdeogramParams(ideogramParams);
  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("num_images", "1");
  formData.append(
    "rendering_speed",
    normalizedParams.rendering_speed || "QUALITY"
  );
  formData.append(
    "magic_prompt",
    normalizedParams.magic_prompt || "OFF"
  );
  formData.append("upscale_factor", normalizedParams.upscale_factor || "X2");
  formData.append(
    "negative_prompt",
    normalizedParams.negative_prompt ||
      "people, characters, objects, scenery, product photography, device mockups, watermarks, blurry text, low resolution, unreadable text"
  );
  if (normalizedParams.seed != null) {
    formData.append("seed", String(normalizedParams.seed));
  }
  if (normalizedParams.aspect_ratio) {
    formData.append("aspect_ratio", normalizedParams.aspect_ratio);
  }

  const response = await fetch(IDEOGRAM_ENDPOINT, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
    },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.error || payload?.message || "Ideogram request failed."
    );
  }
  const imageUrl = payload?.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("Ideogram response missing image url.");
  }
  return imageUrl;
};

const generateIdeogramImages = async ({ plans, nodeContext, apiKey }) => {
  const ideogramParams = resolveIdeogramParams(nodeContext);
  const results = await Promise.allSettled(
    plans.map((plan) =>
      requestIdeogramImage({
        prompt: buildIdeogramPrompt({ plan, nodeContext }),
        apiKey,
        ideogramParams,
      })
    )
  );

  const images = [];
  const errors = [];
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      images.push(result.value);
      errors.push(null);
      return;
    }
    images.push(null);
    errors.push(result.reason?.message ?? "Ideogram request failed.");
  });
  return { images, errors };
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
      process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN || undefined,
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
    const creativity = clampNumber(
      Number(payload?.creativity) || 0,
      0,
      100
    );
    const temperature = roundValue(0.2 + (creativity / 100) * 1.0);
    const nodeContext = payload?.nodeContext ?? null;

    if (!nodeContext?.node) {
      return NextResponse.json(
        { error: "Node context is required." },
        { status: 400 }
      );
    }

    const model = quality === "pro" ? PRO_MODEL : FLASH_MODEL;
    const ai = new GoogleGenAI({ apiKey });

    const planPrompt = buildPlanPrompt({ count, nodeContext });
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
              parts: [{ text: buildHtmlPrompt({ plan, nodeContext }) }],
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
