import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const FLASH_MODEL =
  process.env.GEMINI_FLASH_MODEL ||
  process.env.GEMINI_MODEL ||
  "gemini-3-flash-preview";
const PRO_MODEL = process.env.GEMINI_PRO_MODEL || "gemini-3-pro-preview";

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
    image: formData.get("image"),
    quality: formData.get("quality")?.toString() || "flash",
    plan: parseJsonMaybe(formData.get("plan")?.toString()),
    brief: parseJsonMaybe(formData.get("brief")?.toString()),
    style: parseJsonMaybe(formData.get("style")?.toString()),
    nodeContext: parseJsonMaybe(formData.get("nodeContext")?.toString()),
  };
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

const buildFinalizePrompt = ({ plan, brief, style, nodeContext }) => {
  return [
    "You are an expert frontend designer and engineer.",
    "Generate a complete, self-contained HTML document that recreates the provided UI image.",
    "Output HTML only. Do not wrap in markdown. Do not include explanations.",
    "Requirements:",
    "- Include <!doctype html>, <html>, <head>, and <body>.",
    "- Use inline CSS in a <style> tag.",
    "- Optional inline JS is allowed.",
    "- Do not use external assets, fonts, frameworks, or CDNs.",
    "- Ensure html, body { width: 100%; height: 100%; margin: 0; }.",
    "- Match layout, spacing, colors, and visual hierarchy from the image closely.",
    "- Keep text legible and semantic where possible.",
    "",
    "Project brief:",
    JSON.stringify(brief ?? {}, null, 2),
    "",
    "Selected style:",
    JSON.stringify(style ?? {}, null, 2),
    "",
    "Plan:",
    JSON.stringify(plan ?? {}, null, 2),
    "",
    "Node context:",
    JSON.stringify(nodeContext ?? {}, null, 2),
  ].join("\n");
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

    const payload = await parseRequestPayload(request);
    const imageInput = payload?.imageDataUrl ?? payload?.image;
    if (!imageInput) {
      return NextResponse.json(
        { error: "imageDataUrl is required." },
        { status: 400 }
      );
    }

    const { buffer, mimeType } = await resolveBinaryInput(
      imageInput,
      "imageDataUrl"
    );
    const quality = payload?.quality === "pro" ? "pro" : "flash";
    const model = quality === "pro" ? PRO_MODEL : FLASH_MODEL;
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildFinalizePrompt({
                plan: payload?.plan,
                brief: payload?.brief,
                style: payload?.style,
                nodeContext: payload?.nodeContext,
              }),
            },
            {
              inlineData: {
                mimeType: mimeType || "image/png",
                data: buffer.toString("base64"),
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.35,
        maxOutputTokens: Number(process.env.PREVIEW_HTML_MAX_TOKENS) || 16384,
      },
    });

    const rawText = response?.text ?? "";
    const html = ensureHtmlDocument(extractHtml(rawText));
    if (!html) {
      return NextResponse.json(
        {
          error: "Failed to generate HTML from finalized preview.",
          raw: rawText,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ html, model });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to finalize preview to HTML.",
        message: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
