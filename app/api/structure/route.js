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

const buildPrompt = ({ title, name, details }) => {
  return [
    "You are an information architect for web apps.",
    "Return JSON only with this schema:",
    "{",
    '  "root": { "id": "root", "label": "App", "children": [',
    '    { "id": "home", "label": "Home", "children": [] }',
    "  ] }",
    "}",
    "Rules:",
    "- Use unique kebab-case ids (<=30 chars).",
    "- 1 to 4 levels deep.",
    "- Prefer pages at depth 1, sections at depth 2, key components at depth 3+.",
    "",
    "Brief:",
    `Title: ${title || "Untitled"}`,
    `Name: ${name || "Unknown"}`,
    `Details: ${details || "None provided."}`,
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

    const formData = await request.formData();
    const image = formData.get("image");
    const title = formData.get("title")?.toString() ?? "";
    const name = formData.get("name")?.toString() ?? "";
    const details = formData.get("details")?.toString() ?? "";

    if (!image || typeof image.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Image file is required." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const prompt = buildPrompt({ title, name, details });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: image.type || "image/png",
                data: buffer.toString("base64"),
              },
            },
          ],
        },
      ],
    });

    const rawText = response?.text ?? "";
    const jsonText = extractJson(rawText);
    const tree = jsonText ? JSON.parse(jsonText) : null;

    if (!tree) {
      return NextResponse.json(
        { error: "Failed to parse model response.", raw: rawText },
        { status: 502 }
      );
    }

    return NextResponse.json({ tree, raw: rawText });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate structure.",
        message: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
