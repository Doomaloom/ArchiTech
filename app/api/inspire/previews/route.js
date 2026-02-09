import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const FLASH_MODEL =
  process.env.GEMINI_FLASH_MODEL ||
  process.env.GEMINI_MODEL ||
  "gemini-3-flash-preview";
const PRO_MODEL = process.env.GEMINI_PRO_MODEL || "gemini-3-pro-preview";
const IDEOGRAM_ENDPOINT =
  "https://api.ideogram.ai/v1/ideogram-v3/generate";
const MAX_PREVIEWS = 6;
const MAX_TEXT_LINES = 10;
const MAX_TEXT_LINE_LENGTH = 72;

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

const normalizeInlineText = (value, maxLength = 160) => {
  if (value == null) {
    return "";
  }
  const text = value
    .toString()
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
  if (!text) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

const normalizeStringList = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeInlineText(entry)).filter(Boolean);
  }
  const text = normalizeInlineText(value);
  return text ? [text] : [];
};

const flattenTextManifest = (value, lines = []) => {
  if (value == null) {
    return lines;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => flattenTextManifest(entry, lines));
    return lines;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((entry) => flattenTextManifest(entry, lines));
    return lines;
  }
  const text = normalizeInlineText(value, MAX_TEXT_LINE_LENGTH);
  if (text) {
    lines.push(text);
  }
  return lines;
};

const normalizeTextManifest = (value, maxItems = MAX_TEXT_LINES) => {
  const lines = flattenTextManifest(value);
  const seen = new Set();
  return lines
    .filter(
      (line) =>
        line &&
        !/lorem ipsum|placeholder|sample text|dummy text|gibberish/i.test(line)
    )
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
};

const normalizePlan = (plan, index) => {
  const safe = plan ?? {};
  const sections = normalizeStringList(safe.sections);
  const styleKeywords = normalizeStringList(safe.styleKeywords);
  const internalExperience = normalizeStringList(
    safe.internalExperience ?? safe.internalFlow ?? safe.internalSections
  );
  const mustInclude = normalizeStringList(
    safe.mustInclude ?? safe.components ?? safe.mustHaveElements
  );
  const textContent = normalizeTextManifest(
    safe.textContent ?? safe.textManifest ?? safe.copyDeck ?? safe.copyLines
  );

  return {
    id: safe.id?.toString() || `plan-${index + 1}`,
    title: normalizeInlineText(safe.title) || `Concept ${index + 1}`,
    summary: normalizeInlineText(safe.summary, 240),
    layout: normalizeInlineText(safe.layout, 240),
    visualDirection: normalizeInlineText(
      safe.visualDirection ?? safe.visualBlueprint ?? safe.visualDescription,
      680
    ),
    sections,
    styleKeywords,
    internalExperience,
    mustInclude,
    textContent,
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

const extractField = (text, label) => {
  if (!text || !label) {
    return "";
  }
  const matcher = new RegExp(`${label}:\\s*([^\\.\\n]+)`, "i");
  const match = text.match(matcher);
  return match?.[1]?.toString().trim() || "";
};

const normalizeIdeaAnswer = (answer, index) => {
  if (!answer || typeof answer !== "object") {
    return null;
  }
  const question = answer.question?.toString().trim() || "";
  const answerLabel = answer.answerLabel?.toString().trim() || "";
  if (!answerLabel) {
    return null;
  }
  return {
    id: answer.id?.toString().trim() || `answer-${index + 1}`,
    question: question || `Selection ${index + 1}`,
    answerLabel,
  };
};

const normalizeIdeaContext = (ideaContext, brief) => {
  const details = brief?.details?.toString().trim() || "";
  if (!ideaContext || typeof ideaContext !== "object") {
    return {
      category: extractField(details, "Category"),
      audience: brief?.audience?.toString().trim() || "",
      coreValue: extractField(details, "Primary visitor value"),
      heroSection: extractField(details, "Leading section"),
      primaryConversion: extractField(details, "Main conversion"),
      answers: [],
    };
  }
  return {
    category:
      ideaContext.category?.toString().trim() || extractField(details, "Category"),
    audience:
      ideaContext.audience?.toString().trim() ||
      brief?.audience?.toString().trim() ||
      "",
    coreValue:
      ideaContext.coreValue?.toString().trim() ||
      extractField(details, "Primary visitor value"),
    heroSection:
      ideaContext.heroSection?.toString().trim() ||
      extractField(details, "Leading section"),
    primaryConversion:
      ideaContext.primaryConversion?.toString().trim() ||
      extractField(details, "Main conversion"),
    answers: Array.isArray(ideaContext.answers)
      ? ideaContext.answers.map(normalizeIdeaAnswer).filter(Boolean)
      : [],
  };
};

const buildFallbackTextManifest = ({ plan, nodeContext, brief, ideaContext }) => {
  const node = nodeContext?.node ?? {};
  const parent = nodeContext?.parent ?? {};
  const nodeRequirements = normalizeStringList(node.requirements).slice(0, 3);
  const sectionLines = normalizeStringList(plan?.sections).slice(0, 4);
  const answerLines = Array.isArray(ideaContext?.answers)
    ? ideaContext.answers
        .map((entry) => normalizeInlineText(entry?.answerLabel, MAX_TEXT_LINE_LENGTH))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return normalizeTextManifest([
    normalizeInlineText(node.label, MAX_TEXT_LINE_LENGTH),
    normalizeInlineText(plan?.title, MAX_TEXT_LINE_LENGTH),
    normalizeInlineText(brief?.name, MAX_TEXT_LINE_LENGTH),
    normalizeInlineText(ideaContext?.coreValue, MAX_TEXT_LINE_LENGTH),
    normalizeInlineText(ideaContext?.primaryConversion, MAX_TEXT_LINE_LENGTH),
    ...nodeRequirements,
    ...sectionLines,
    ...answerLines,
    normalizeInlineText(parent.label, MAX_TEXT_LINE_LENGTH),
  ]);
};

const resolvePlanTextManifest = ({ plan, nodeContext, brief, ideaContext }) => {
  const planLines = normalizeTextManifest(plan?.textContent);
  const fallbackLines = buildFallbackTextManifest({
    plan,
    nodeContext,
    brief,
    ideaContext,
  });
  return normalizeTextManifest([...planLines, ...fallbackLines]);
};

const enrichPlan = ({ plan, nodeContext, brief, ideaContext }) => {
  return {
    ...plan,
    textContent: resolvePlanTextManifest({ plan, nodeContext, brief, ideaContext }),
    internalExperience: normalizeStringList(plan?.internalExperience),
    mustInclude: normalizeStringList(plan?.mustInclude),
  };
};

const formatIdeaContext = (ideaContext, brief) => {
  const normalized = normalizeIdeaContext(ideaContext, brief);
  const answerLines = normalized.answers
    .map((entry) => `${entry.question}: ${entry.answerLabel}`)
    .filter(Boolean);
  return [
    normalized.category ? `Category: ${normalized.category}` : null,
    normalized.audience ? `Audience: ${normalized.audience}` : null,
    normalized.coreValue ? `Primary value: ${normalized.coreValue}` : null,
    normalized.heroSection ? `Lead section: ${normalized.heroSection}` : null,
    normalized.primaryConversion
      ? `Primary conversion: ${normalized.primaryConversion}`
      : null,
    answerLines.length ? `Idea answers: ${answerLines.join(" | ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

const buildPlanPrompt = ({
  count,
  nodeContext,
  brief,
  ideaContext,
  style,
  workspace,
}) => {
  const workspaceText = formatWorkspace(workspace);
  const ideaContextText = formatIdeaContext(ideaContext, brief);
  return [
    "You are a product designer generating layout concepts.",
    `Create ${count} distinct plans for the requested page/component.`,
    "Return JSON only with this schema:",
    "{",
    '  "plans": [',
    "    {",
    '      "id": "plan-1",',
    '      "title": "Concept name",',
    '      "summary": "2-3 sentence overview tied to page purpose",',
    '      "layout": "Concise layout strategy with hierarchy notes",',
    '      "visualDirection": "4-6 sentences detailing hero, body, and internal page composition",',
    '      "sections": ["Section name", "Section name"],',
    '      "styleKeywords": ["keyword", "keyword"],',
    '      "internalExperience": ["What users see in each main page area"],',
    '      "mustInclude": ["Concrete UI element that must be visible"],',
    '      "textContent": ["Exact text string to appear visibly on the page"]',
    "    }",
    "  ]",
    "}",
    "Rules:",
    "- Keep plans tightly aligned with the selected idea answers and page requirements.",
    "- Use the brief and idea context to shape realistic content hierarchy and CTAs.",
    "- visualDirection must describe internal page structure, not just mood.",
    "- mustInclude should list concrete UI blocks (listings grid, filters, map panel, etc.).",
    "- textContent must be literal on-page copy. No lorem ipsum, placeholders, or gibberish.",
    "- textContent should be concise and specific to this page's role in the tree.",
    "",
    "Project brief:",
    JSON.stringify(brief ?? {}, null, 2),
    "",
    ideaContextText ? `Idea context:\n${ideaContextText}` : null,
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

const buildHtmlPrompt = ({
  plan,
  nodeContext,
  brief,
  ideaContext,
  style,
  workspace,
}) => {
  const workspaceText = formatWorkspace(workspace);
  const ideaContextText = formatIdeaContext(ideaContext, brief);
  const textManifest = resolvePlanTextManifest({
    plan,
    nodeContext,
    brief,
    ideaContext,
  });
  return [
    "You are an expert frontend designer.",
    "Create a complete HTML document (self-contained) that can be rendered in Chromium.",
    "Constraints:",
    "- Output HTML only. No markdown or explanations.",
    "- Use inline CSS in a <style> tag. Optional inline JS allowed.",
    "- Avoid external assets or fonts.",
    "- Ensure body margin is 0 and layout fits within 1280x900.",
    "- Set html, body { width: 100%; height: 100%; margin: 0; }.",
    "- Use a visible background; avoid pure white.",
    "- Provide high contrast, clear hierarchy, and clean spacing.",
    "- Use the provided text manifest exactly for visible copy (do not paraphrase).",
    "",
    "Project brief:",
    JSON.stringify(brief ?? {}, null, 2),
    "",
    ideaContextText ? `Idea context:\n${ideaContextText}` : null,
    "",
    "Selected style:",
    JSON.stringify(style ?? {}, null, 2),
    "",
    workspaceText ? `Workspace input:\n${workspaceText}` : null,
    "",
    "Plan:",
    JSON.stringify(plan, null, 2),
    "",
    textManifest.length
      ? `Text manifest (render verbatim):\n${JSON.stringify(textManifest, null, 2)}`
      : null,
    "",
    "Node context:",
    JSON.stringify(nodeContext, null, 2),
  ]
    .filter(Boolean)
    .join("\n");
};

const buildIdeogramPrompt = ({
  plan,
  nodeContext,
  brief,
  ideaContext,
  style,
  workspace,
}) => {
  const node = nodeContext?.node ?? {};
  const parent = nodeContext?.parent ?? null;
  const requirements = Array.isArray(node?.requirements)
    ? node.requirements.filter(Boolean)
    : [];
  const sections = Array.isArray(plan?.sections)
    ? plan.sections.filter(Boolean)
    : [];
  const styleKeywords = Array.isArray(plan?.styleKeywords)
    ? plan.styleKeywords.filter(Boolean)
    : [];
  const stylePalette = Array.isArray(style?.palette)
    ? style.palette.filter(Boolean)
    : [];
  const styleTags = Array.isArray(style?.tags) ? style.tags.filter(Boolean) : [];
  const styleComponents = Array.isArray(style?.components)
    ? style.components.filter(Boolean)
    : [];
  const stylePrompt = style?.stylePrompt?.toString().trim() || "";
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
  const siblingLabels = Array.isArray(nodeContext?.siblings)
    ? nodeContext.siblings
        .map((entry) => entry?.label?.toString().trim())
        .filter(Boolean)
    : [];
  const workspaceText = formatWorkspace(workspace);
  const ideaContextText = formatIdeaContext(ideaContext, brief);
  const internalExperience = normalizeStringList(plan?.internalExperience);
  const mustInclude = normalizeStringList(plan?.mustInclude);
  const textManifest = resolvePlanTextManifest({
    plan,
    nodeContext,
    brief,
    ideaContext,
  });
  const textManifestBlock = textManifest.length
    ? [
        "Text manifest (render verbatim exactly as written):",
        ...textManifest.map((line, index) => `${index + 1}. "${line}"`),
      ].join("\n")
    : "";

  return [
    "High-fidelity website UI concept rendered as a full-page screenshot.",
    "Use an intentional page background (solid, gradient, or texture) with no transparency.",
    "No alpha channel, no cutout elements, and no checkerboard/transparent canvas.",
    "Avoid device frames and avoid stock photography scenes.",
    "Design direction should match the selected style and plan details.",
    node?.label ? `Page: ${node.label}` : null,
    node?.description ? `Page description: ${node.description}` : null,
    parent?.label ? `Parent section: ${parent.label}` : null,
    pathLabels.length ? `App path: ${pathLabels.join(" > ")}` : null,
    childLabels.length ? `Child sections: ${childLabels.join(", ")}` : null,
    siblingLabels.length ? `Sibling pages: ${siblingLabels.join(", ")}` : null,
    requirements.length ? `Requirements: ${requirements.join("; ")}` : null,
    plan?.title ? `Concept: ${plan.title}` : null,
    plan?.summary ? `Concept summary: ${plan.summary}` : null,
    plan?.layout ? `Layout strategy: ${plan.layout}` : null,
    sections.length ? `Sections: ${sections.join(", ")}` : null,
    styleKeywords.length ? `Plan style cues: ${styleKeywords.join(", ")}` : null,
    plan?.visualDirection ? `Visual direction: ${plan.visualDirection}` : null,
    internalExperience.length
      ? `Internal experience: ${internalExperience.join(" | ")}`
      : null,
    mustInclude.length ? `Must include: ${mustInclude.join("; ")}` : null,
    style?.title ? `Style title: ${style.title}` : null,
    style?.summary ? `Style summary: ${style.summary}` : null,
    stylePalette.length ? `Palette: ${stylePalette.join(", ")}` : null,
    styleTags.length ? `Style tags: ${styleTags.join(", ")}` : null,
    styleComponents.length
      ? `Style components: ${styleComponents.join(", ")}`
      : null,
    stylePrompt ? `Style direction: ${stylePrompt}` : null,
    brief?.title ? `Project title: ${brief.title}` : null,
    brief?.name ? `Product name: ${brief.name}` : null,
    brief?.details ? `Project details: ${brief.details}` : null,
    brief?.audience ? `Audience: ${brief.audience}` : null,
    brief?.goals ? `Goals: ${brief.goals}` : null,
    ideaContextText ? ideaContextText : null,
    workspaceText ? workspaceText : null,
    textManifestBlock || null,
    "TEXT QUALITY RULES (highest priority):",
    "- Render all manifest lines with exact spelling and casing.",
    "- Do not invent extra words, pseudo letters, or decorative gibberish.",
    "- If space is tight, reduce font size before changing the wording.",
    "Landscape composition similar to 1280x900.",
    "Strong hierarchy, clear typography, legible copy.",
    "Avoid watermarks, low-res text, blurry output, people, scenery, and transparent backgrounds.",
  ]
    .filter(Boolean)
    .join("\n");
};

const toIdeogramErrorMessage = (status, payload) => {
  const nested = payload?.error;
  const rawMessage =
    (typeof nested === "string" && nested) ||
    nested?.message ||
    payload?.message ||
    payload?.detail ||
    "";
  const message = rawMessage?.toString().trim();
  if (status === 422) {
    return message
      ? `Ideogram rejected the request (422): ${message}`
      : "Ideogram rejected the request (422). Try adjusting prompt details.";
  }
  if (status === 429) {
    return message
      ? `Ideogram rate limited the request (429): ${message}`
      : "Ideogram rate limited the request (429). Please retry shortly.";
  }
  if (message) {
    return `Ideogram request failed (${status}): ${message}`;
  }
  return `Ideogram request failed (${status}).`;
};

const requestIdeogramImage = async ({ prompt, apiKey }) => {
  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("num_images", "1");
  formData.append("aspect_ratio", "16x10");
  formData.append("rendering_speed", "QUALITY");
  formData.append("magic_prompt", "OFF");
  formData.append("upscale_factor", "X2");
  formData.append(
    "negative_prompt",
    "people, portraits, scenery, device mockups, watermark, low resolution, unreadable text, blurry text, gibberish text, fake letters, lorem ipsum, transparent background, alpha channel, checkerboard background, cutout UI"
  );

  const response = await fetch(IDEOGRAM_ENDPOINT, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
    },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(toIdeogramErrorMessage(response.status, payload));
    error.status = response.status;
    throw error;
  }

  const imageUrl = payload?.data?.[0]?.url?.toString().trim();
  if (!imageUrl) {
    throw new Error("Ideogram response missing image URL.");
  }
  return imageUrl;
};

const downloadImageAsDataUrl = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download Ideogram image (${response.status}).`);
  }
  const mimeType =
    response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
};

const generateIdeogramImages = async ({
  plans,
  nodeContext,
  brief,
  ideaContext,
  style,
  workspace,
  apiKey,
}) => {
  const results = await Promise.allSettled(
    plans.map(async (plan) => {
      const imageUrl = await requestIdeogramImage({
        prompt: buildIdeogramPrompt({
          plan,
          nodeContext,
          brief,
          ideaContext,
          style,
          workspace,
        }),
        apiKey,
      });
      return downloadImageAsDataUrl(imageUrl);
    })
  );

  const images = [];
  const errors = [];
  const statuses = [];
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      images.push(result.value);
      errors.push(null);
      statuses.push(null);
      return;
    }
    images.push(null);
    errors.push(result.reason?.message ?? "Ideogram request failed.");
    statuses.push(result.reason?.status ?? null);
  });
  return { images, errors, statuses };
};

const generateHtmlPreviews = async ({
  ai,
  model,
  temperature,
  maxOutputTokens,
  plans,
  nodeContext,
  brief,
  ideaContext,
  style,
  workspace,
}) => {
  const results = await Promise.allSettled(
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
                  ideaContext,
                  style,
                  workspace,
                }),
              },
            ],
          },
        ],
        config: {
          temperature,
          maxOutputTokens,
        },
      })
    )
  );

  const html = [];
  const errors = [];
  results.forEach((result) => {
    if (result.status !== "fulfilled") {
      html.push(null);
      errors.push(result.reason?.message ?? "Failed to generate HTML.");
      return;
    }
    const raw = extractHtml(result.value?.text ?? "");
    const normalized = ensureHtmlDocument(raw);
    html.push(normalized || null);
    errors.push(normalized ? null : "Failed to generate HTML.");
  });

  return { html, errors };
};

export async function POST(request) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const ideogramApiKey = process.env.IDEOGRAM_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY or GOOGLE_API_KEY." },
        { status: 500 }
      );
    }
    const payload = await request.json();
    const count = clampNumber(Number(payload?.count) || 1, 1, MAX_PREVIEWS);
    const quality = payload?.quality === "pro" ? "pro" : "flash";
    const previewMode = payload?.previewMode === "html" ? "html" : "image";
    const creativity = clampNumber(Number(payload?.creativity) || 0, 0, 100);
    const temperature = roundValue(0.2 + (creativity / 100) * 1.0);
    const nodeContext = payload?.nodeContext ?? null;
    const brief = payload?.brief ?? {};
    const ideaContext = normalizeIdeaContext(payload?.ideaContext ?? null, brief);
    const style = payload?.style ?? {};
    const workspace = payload?.workspace ?? null;

    if (previewMode === "image" && !ideogramApiKey) {
      return NextResponse.json(
        { error: "Missing IDEOGRAM_API_KEY." },
        { status: 500 }
      );
    }

    if (!nodeContext?.node) {
      return NextResponse.json(
        { error: "Node context is required." },
        { status: 400 }
      );
    }

    const model = quality === "pro" ? PRO_MODEL : FLASH_MODEL;
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const planPrompt = buildPlanPrompt({
      count,
      nodeContext,
      brief,
      ideaContext,
      style,
      workspace,
    });
    const planMaxTokens = Number(process.env.PREVIEW_PLAN_MAX_TOKENS) || 6144;
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
    const parsedPlans = parsePlans(planText, count);
    if (!parsedPlans.length) {
      return NextResponse.json(
        { error: "Failed to parse plan response.", raw: planText },
        { status: 502 }
      );
    }
    const plans = parsedPlans.map((plan) =>
      enrichPlan({ plan, nodeContext, brief, ideaContext })
    );

    if (previewMode === "html") {
      const htmlResult = await generateHtmlPreviews({
        ai,
        model,
        temperature,
        maxOutputTokens: htmlMaxTokens,
        plans,
        nodeContext,
        brief,
        ideaContext,
        style,
        workspace,
      });
      const previews = plans.map((plan, index) => ({
        id: plan?.id ?? `preview-${index + 1}`,
        plan,
        imageUrl: null,
        html: htmlResult.html[index] ?? null,
        renderError: htmlResult.errors[index] ?? null,
        model,
        temperature,
      }));
      const renderedAny = previews.some((preview) => preview.html);
      if (!renderedAny) {
        const firstError = htmlResult.errors.find(Boolean);
        return NextResponse.json(
          {
            error: firstError || "HTML preview generation failed.",
            previews,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        previews,
        model,
        temperature,
        renderMode: "html",
      });
    }

    const renderResult = await generateIdeogramImages({
      plans,
      nodeContext,
      brief,
      ideaContext,
      style,
      workspace,
      apiKey: ideogramApiKey,
    });

    const previews = plans.map((plan, index) => ({
      id: plan?.id ?? `preview-${index + 1}`,
      plan,
      imageUrl: renderResult.images[index] ?? null,
      html: null,
      renderError: renderResult.errors[index] ?? null,
      model,
      temperature,
    }));

    const renderedAny = previews.some((preview) => preview.imageUrl);
    if (!renderedAny) {
      const firstError = renderResult.errors.find(Boolean);
      const firstStatus = renderResult.statuses.find(
        (status) => status === 422 || status === 429
      );
      return NextResponse.json(
        {
          error: firstError || "Ideogram preview generation failed.",
          previews,
        },
        { status: firstStatus || 502 }
      );
    }

    return NextResponse.json({
      previews,
      model,
      temperature,
      renderMode: "ideogram",
    });
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
