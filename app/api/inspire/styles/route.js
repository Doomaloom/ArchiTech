import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

const extractJson = (text) => {
  if (!text) {
    return null;
  }
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  return text.slice(firstBrace, lastBrace + 1);
};

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (entry == null ? "" : entry.toString()).trim())
      .filter(Boolean);
  }
  if (value == null) {
    return [];
  }
  const text = value.toString().trim();
  return text ? [text] : [];
};

const normalizeStyleIdea = (style, index) => {
  const palette = Array.isArray(style?.palette)
    ? style.palette.map((color) => color?.toString().trim()).filter(Boolean)
    : [];
  return {
    id: style?.id?.toString() || `style-${index + 1}`,
    title: style?.title?.toString() || `Style ${index + 1}`,
    summary: style?.summary?.toString() || "",
    palette,
    tags: normalizeList(style?.tags),
    components: normalizeList(style?.components),
    stylePrompt: style?.stylePrompt?.toString() || "",
  };
};

const parseStyles = (text, count) => {
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
  const rawStyles = Array.isArray(parsed) ? parsed : parsed?.styles;
  if (!Array.isArray(rawStyles)) {
    return [];
  }
  return rawStyles.slice(0, count).map(normalizeStyleIdea);
};

const buildPrompt = ({ brief, count }) => {
  return [
    "You are a senior brand designer generating style directions for a web app.",
    `Return ${count} distinct style directions.`,
    "Return JSON only with this schema:",
    "{",
    '  "styles": [',
    "    {",
    '      "id": "style-1",',
    '      "title": "Style name",',
    '      "summary": "1-2 sentence summary",',
    '      "palette": ["#112233", "#aabbcc"],',
    '      "tags": ["keyword", "keyword"],',
    '      "components": ["Hero band", "Card grid"],',
    '      "stylePrompt": "Short visual direction sentence"',
    "    }",
    "  ]",
    "}",
    "Rules:",
    "- Keep palette to 3-5 hex colors.",
    "- Summary should mention mood, typography feel, and layout energy.",
    "- Tags should be short, visual cues.",
    "- Components should be UI elements likely to appear.",
    "- Use unique ids and avoid spaces.",
    "",
    "Project brief:",
    `Title: ${brief?.title || "Untitled"}`,
    `Name: ${brief?.name || "Unknown"}`,
    `Details: ${brief?.details || ""}`,
    `Audience: ${brief?.audience || ""}`,
    `Goals: ${brief?.goals || ""}`,
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

    const payload = await request.json();
    const count = Math.min(Math.max(Number(payload?.count) || 4, 2), 6);
    const brief = payload?.brief ?? {};

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [{ text: buildPrompt({ brief, count }) }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: Number(process.env.INSPIRE_STYLE_MAX_TOKENS) || 2048,
      },
    });

    const rawText = response?.text ?? "";
    const styles = parseStyles(rawText, count);
    if (!styles.length) {
      return NextResponse.json(
        { error: "Failed to parse style response.", raw: rawText },
        { status: 502 }
      );
    }

    return NextResponse.json({ styles, raw: rawText });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate styles.",
        message: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
