import { NextResponse } from "next/server";

export const runtime = "nodejs";

const IDEOGRAM_EDIT_ENDPOINT = "https://api.ideogram.ai/v1/ideogram-v3/edit";
let sharpPromise = null;
const MIN_MASK_COVERAGE = 0.0015;
const MAX_MASK_COVERAGE = 0.95;
const MASK_ALPHA_THRESHOLD = 10;
const MASK_DEBUG_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.INSPIRE_MASK_DEBUG === "1";

const isFileLike = (value) =>
  value && typeof value === "object" && typeof value.arrayBuffer === "function";

const parseJsonMaybe = (value) => {
  if (typeof value !== "string") {
    return value;
  }
  const text = value.trim();
  if (!text) {
    return null;
  }
  if (!(text.startsWith("{") || text.startsWith("["))) {
    return value;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return value;
  }
};

const loadSharp = async () => {
  if (!sharpPromise) {
    const moduleName = "sharp";
    sharpPromise = import(moduleName)
      .then((module) => module.default ?? module)
      .catch(() => null);
  }
  return sharpPromise;
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
  const text = normalizeInlineText(value, 72);
  if (text) {
    lines.push(text);
  }
  return lines;
};

const normalizeTextManifest = (value, maxItems = 10) => {
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

const extractQuotedText = (value) => {
  if (typeof value !== "string") {
    return [];
  }
  const matches = [];
  const matcher = /"([^"\n]{2,120})"|'([^'\n]{2,120})'/g;
  let match;
  while ((match = matcher.exec(value)) !== null) {
    const candidate = normalizeInlineText(match[1] || match[2], 72);
    if (candidate) {
      matches.push(candidate);
    }
  }
  return matches;
};

const extractRequestedTextLines = (value) => {
  if (typeof value !== "string") {
    return [];
  }
  const text = value.trim();
  if (!text) {
    return [];
  }
  const ruleMatches = [];
  const markers = [
    "text:",
    "copy:",
    "title:",
    "headline:",
    "button:",
    "cta:",
    "label:",
  ];
  text.split(/\r?\n/).forEach((line) => {
    const normalizedLine = line.trim();
    if (!normalizedLine) {
      return;
    }
    const marker = markers.find((entry) =>
      normalizedLine.toLowerCase().startsWith(entry)
    );
    if (!marker) {
      return;
    }
    const valueText = normalizeInlineText(
      normalizedLine.slice(marker.length).trim(),
      72
    );
    if (valueText) {
      ruleMatches.push(valueText);
    }
  });
  return ruleMatches;
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
  const question = normalizeInlineText(answer.question, 90);
  const answerLabel = normalizeInlineText(answer.answerLabel, 90);
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

const resolvePlanTextManifest = ({ plan, nodeContext, brief, ideaContext }) => {
  const node = nodeContext?.node ?? {};
  const nodeRequirements = normalizeStringList(node.requirements).slice(0, 3);
  const sectionLines = normalizeStringList(plan?.sections).slice(0, 4);
  const answerLines = Array.isArray(ideaContext?.answers)
    ? ideaContext.answers
        .map((entry) => normalizeInlineText(entry?.answerLabel, 72))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  return normalizeTextManifest([
    plan?.textContent,
    plan?.textManifest,
    plan?.copyDeck,
    normalizeInlineText(node.label, 72),
    normalizeInlineText(plan?.title, 72),
    normalizeInlineText(brief?.name, 72),
    normalizeInlineText(ideaContext?.coreValue, 72),
    normalizeInlineText(ideaContext?.primaryConversion, 72),
    ...nodeRequirements,
    ...sectionLines,
    ...answerLines,
  ]);
};

const parseDataUrl = (value, label) => {
  if (typeof value !== "string" || !value.startsWith("data:")) {
    throw new Error(`${label} must be a valid data URL.`);
  }
  const match = value.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
  if (!match) {
    throw new Error(`${label} must be a valid data URL.`);
  }
  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const encoded = match[3] || "";
  const buffer = isBase64
    ? Buffer.from(encoded, "base64")
    : Buffer.from(decodeURIComponent(encoded), "utf8");
  if (!buffer.length) {
    throw new Error(`${label} is empty.`);
  }
  return { buffer, mimeType };
};

const resolveBinaryInput = async (value, label) => {
  if (isFileLike(value)) {
    const buffer = Buffer.from(await value.arrayBuffer());
    if (!buffer.length) {
      throw new Error(`${label} is empty.`);
    }
    return { buffer, mimeType: value.type || "image/png" };
  }
  return parseDataUrl(value, label);
};

const parseRequestPayload = async (request) => {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return request.json();
  }

  const formData = await request.formData();
  return {
    imageDataUrl: formData.get("imageDataUrl"),
    maskDataUrl: formData.get("maskDataUrl"),
    image: formData.get("image"),
    mask: formData.get("mask"),
    prompt: formData.get("prompt")?.toString() || "",
    plan: parseJsonMaybe(formData.get("plan")?.toString()),
    brief: parseJsonMaybe(formData.get("brief")?.toString()),
    style: parseJsonMaybe(formData.get("style")?.toString()),
    nodeContext: parseJsonMaybe(formData.get("nodeContext")?.toString()),
    ideaContext: parseJsonMaybe(formData.get("ideaContext")?.toString()),
  };
};

const buildEditPrompt = ({
  prompt,
  plan,
  brief,
  style,
  nodeContext,
  ideaContext,
}) => {
  const note = prompt?.toString().trim();

  // Keep text extraction focused on explicit user intent only.
  const explicitQuotedText = extractQuotedText(note);
  const explicitRuleText = extractRequestedTextLines(note);
  const exactTextLines = normalizeTextManifest([...explicitQuotedText, ...explicitRuleText]);
  const hasExplicitText = exactTextLines.length > 0;
  const exactTextBlock = exactTextLines.length
    ? [
        "EXACT TEXT TO RENDER (highest priority, verbatim):",
        ...exactTextLines.map(
          (line, index) => `${index + 1}. "${line}"`
        ),
      ].join("\n")
    : "";

  return [
    "Edit the image using the provided mask.",
    "STRICT MASK RULE: change only masked regions.",
    "STRICT PRESERVE RULE: keep all unmasked regions visually unchanged.",
    note ? `User request (highest priority): ${note}` : null,
    "Interpret and apply the user request strictly and literally.",
    exactTextBlock || null,
    "TEXT RULE: if text is edited, render exact wording only with normal readable letters.",
    "Do not generate gibberish, pseudo letters, placeholder text, or extra words.",
    hasExplicitText ? "Do not render any text other than the exact text list." : null,
    "Keep edited text sharp and legible.",
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
      ? `Ideogram rejected the edit request (422): ${message}`
      : "Ideogram rejected the edit request (422). Try adjusting the prompt or mask.";
  }
  if (status === 429) {
    return message
      ? `Ideogram rate limited the edit request (429): ${message}`
      : "Ideogram rate limited the edit request (429). Please retry shortly.";
  }
  if (status === 400) {
    return message
      ? `Ideogram rejected the edit payload (400): ${message}`
      : "Ideogram rejected the edit payload (400). Use a clear partial mask and try again.";
  }
  if (message) {
    return `Ideogram edit request failed (${status}): ${message}`;
  }
  return `Ideogram edit request failed (${status}).`;
};

const downloadImageAsDataUrl = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download Ideogram edit image (${response.status}).`);
  }
  const mimeType =
    response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
};

const ensureMaskMatchesImage = async ({ sharp, imageBuffer, maskBuffer }) => {
  const imageMeta = await sharp(imageBuffer).metadata();
  const width = imageMeta.width || 0;
  const height = imageMeta.height || 0;
  if (!width || !height) {
    throw new Error("Unable to read source image dimensions.");
  }

  const normalizedMask = await sharp(maskBuffer).ensureAlpha().png().toBuffer();
  const maskMeta = await sharp(normalizedMask).metadata();
  const needsResize = maskMeta.width !== width || maskMeta.height !== height;
  if (!needsResize) {
    return { maskBuffer: normalizedMask, resized: false };
  }

  const resizedMask = await sharp(normalizedMask)
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();
  return { maskBuffer: resizedMask, resized: true };
};

const buildIdeogramMask = async ({ sharp, maskBuffer }) => {
  const { data, info } = await sharp(maskBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const totalPixels = info.width * info.height;
  const monoMask = Buffer.alloc(totalPixels);
  let editedPixels = 0;

  for (let index = 0; index < totalPixels; index += 1) {
    const offset = index * info.channels;
    const alpha = data[offset + 3] ?? 255;
    const isEdited = alpha >= MASK_ALPHA_THRESHOLD;

    monoMask[index] = isEdited ? 0 : 255;
    if (isEdited) {
      editedPixels += 1;
    }
  }

  const coverage = totalPixels ? editedPixels / totalPixels : 0;
  const ideogramMask = await sharp(monoMask, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 1,
    },
  })
    .png()
    .toBuffer();

  return { ideogramMask, coverage };
};

export async function POST(request) {
  try {
    const apiKey = process.env.IDEOGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing IDEOGRAM_API_KEY." },
        { status: 500 }
      );
    }

    const payload = await parseRequestPayload(request);
    const imageInput = payload?.imageDataUrl ?? payload?.image;
    const maskInput = payload?.maskDataUrl ?? payload?.mask;
    const promptText = payload?.prompt?.toString().trim() || "";

    if (!imageInput) {
      return NextResponse.json(
        { error: "imageDataUrl is required." },
        { status: 400 }
      );
    }
    if (!maskInput) {
      return NextResponse.json(
        { error: "maskDataUrl is required." },
        { status: 400 }
      );
    }
    if (!promptText) {
      return NextResponse.json(
        {
          error:
            "prompt is required. Describe the exact change you want in the masked region.",
        },
        { status: 400 }
      );
    }

    const [{ buffer: imageBuffer, mimeType }, { buffer: maskBuffer }] =
      await Promise.all([
        resolveBinaryInput(imageInput, "imageDataUrl"),
        resolveBinaryInput(maskInput, "maskDataUrl"),
      ]);
    const sharp = await loadSharp();
    if (!sharp) {
      return NextResponse.json(
        {
          error:
            "Mask resizing requires sharp. Install sharp and restart the server.",
        },
        { status: 500 }
      );
    }
    const { maskBuffer: normalizedMask, resized } = await ensureMaskMatchesImage({
      sharp,
      imageBuffer,
      maskBuffer,
    });
    const { ideogramMask, coverage } = await buildIdeogramMask({
      sharp,
      maskBuffer: normalizedMask,
    });
    if (coverage <= MIN_MASK_COVERAGE) {
      return NextResponse.json(
        {
          error:
            "Mask area is too small. Paint a larger region before applying edits.",
        },
        { status: 400 }
      );
    }
    if (coverage >= MAX_MASK_COVERAGE) {
      return NextResponse.json(
        {
          error:
            "Mask covers most of the image. Use a smaller, partial mask for Ideogram edits.",
        },
        { status: 400 }
      );
    }
    const prompt = buildEditPrompt({
      prompt: promptText,
      plan: payload?.plan,
      brief: payload?.brief,
      style: payload?.style,
      nodeContext: payload?.nodeContext,
      ideaContext: payload?.ideaContext,
    });

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append(
      "image",
      new Blob([imageBuffer], { type: mimeType || "image/png" }),
      "image.png"
    );
    formData.append(
      "mask",
      new Blob([ideogramMask], { type: "image/png" }),
      "mask.png"
    );
    formData.append("num_images", "1");
    formData.append("rendering_speed", "QUALITY");
    formData.append("magic_prompt", "OFF");
    formData.append(
      "negative_prompt",
      "gibberish text, fake letters, random symbols, lorem ipsum, unreadable text, blurry text, watermark, misspelled words, distorted typography"
    );

    const response = await fetch(IDEOGRAM_EDIT_ENDPOINT, {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
      },
      body: formData,
    });
    const responsePayload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          error: toIdeogramErrorMessage(response.status, responsePayload),
          debug: MASK_DEBUG_ENABLED
            ? {
                userPrompt: promptText,
                maskPrompt: prompt,
              }
            : undefined,
        },
        { status: response.status }
      );
    }

    const editedUrl = responsePayload?.data?.[0]?.url?.toString().trim();
    if (!editedUrl) {
      return NextResponse.json(
        { error: "Ideogram edit response missing image URL." },
        { status: 502 }
      );
    }
    const imageUrl = await downloadImageAsDataUrl(editedUrl);

    return NextResponse.json({
      imageUrl,
      resizedMask: resized,
      maskCoverage: coverage,
      model: "ideogram-v3-edit",
      debug: MASK_DEBUG_ENABLED
        ? {
            userPrompt: promptText,
            maskPrompt: prompt,
          }
        : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to apply mask edit.",
        message: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
