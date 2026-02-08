import { NextResponse } from "next/server";

export const runtime = "nodejs";

const IDEOGRAM_EDIT_ENDPOINT = "https://api.ideogram.ai/v1/ideogram-v3/edit";
let sharpPromise = null;
const MIN_MASK_COVERAGE = 0.0015;
const MAX_MASK_COVERAGE = 0.95;

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
  };
};

const buildEditPrompt = ({ prompt, plan, brief, style, nodeContext }) => {
  const note = prompt?.toString().trim();
  const planTitle = plan?.title?.toString().trim();
  const planSummary = plan?.summary?.toString().trim();
  const styleTitle = style?.title?.toString().trim();
  const styleSummary = style?.summary?.toString().trim();
  const pageLabel = nodeContext?.node?.label?.toString().trim();
  const pageDescription = nodeContext?.node?.description?.toString().trim();
  const goals = brief?.goals?.toString().trim();
  const sections = Array.isArray(plan?.sections)
    ? plan.sections.filter(Boolean)
    : [];
  const styleKeywords = Array.isArray(plan?.styleKeywords)
    ? plan.styleKeywords.filter(Boolean)
    : [];

  return [
    "Update the existing web UI composition using the provided mask.",
    "Only change masked regions and preserve unmasked layout and style.",
    note ? `Requested change: ${note}` : null,
    planTitle ? `Concept: ${planTitle}` : null,
    planSummary ? `Concept summary: ${planSummary}` : null,
    sections.length ? `Sections: ${sections.join(", ")}` : null,
    styleKeywords.length ? `Plan style cues: ${styleKeywords.join(", ")}` : null,
    styleTitle ? `Style title: ${styleTitle}` : null,
    styleSummary ? `Style summary: ${styleSummary}` : null,
    pageLabel ? `Page: ${pageLabel}` : null,
    pageDescription ? `Page description: ${pageDescription}` : null,
    goals ? `Goals: ${goals}` : null,
    "Return a polished transparent-background UI image.",
    "Keep text legible and avoid watermarks or blurry details.",
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
    const red = data[offset] ?? 0;
    const green = data[offset + 1] ?? 0;
    const blue = data[offset + 2] ?? 0;
    const alpha = data[offset + 3] ?? 255;
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
    const isEdited = alpha > 24 && luminance < 245;

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
      prompt: payload?.prompt,
      plan: payload?.plan,
      brief: payload?.brief,
      style: payload?.style,
      nodeContext: payload?.nodeContext,
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
