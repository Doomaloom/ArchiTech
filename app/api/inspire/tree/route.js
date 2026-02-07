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

const normalizeRequirements = (requirements) => {
  if (Array.isArray(requirements)) {
    return requirements
      .map((item) => (item == null ? "" : item.toString()).trim())
      .filter(Boolean);
  }
  if (requirements == null) {
    return [];
  }
  const text = requirements.toString().trim();
  return text ? [text] : [];
};

const normalizeTreeNode = (node) => {
  if (!node || typeof node !== "object") {
    return node;
  }
  const next = { ...node };
  next.description = next.description?.toString().trim() || "";
  next.requirements = normalizeRequirements(next.requirements);
  ["children", "items", "pages", "nodes"].forEach((key) => {
    if (Array.isArray(next[key])) {
      next[key] = next[key].map(normalizeTreeNode);
    }
  });
  return next;
};

const normalizeTreePayload = (tree) => {
  if (!tree || typeof tree !== "object") {
    return tree;
  }
  if (tree.root && typeof tree.root === "object") {
    return { ...tree, root: normalizeTreeNode(tree.root) };
  }
  return normalizeTreeNode(tree);
};

const buildPrompt = ({ brief, style }) => {
  return [
    "You are an information architect for web apps.",
    "Generate a concise project tree based on the product brief and the selected style.",
    "Return JSON only with this schema:",
    "{",
    '  "root": {',
    '    "id": "root",',
    '    "label": "App",',
    '    "description": "Brief summary of the overall app",',
    '    "requirements": ["Short requirement"],',
    '    "children": [',
    "      {",
    '        "id": "home",',
    '        "label": "Home",',
    '        "description": "Brief summary of this page/section",',
    '        "requirements": ["Short requirement"],',
    '        "children": []',
    "      }",
    "    ]",
    "  }",
    "}",
    "Rules:",
    "- Use unique kebab-case ids (<=30 chars).",
    "- 1 to 4 levels deep.",
    "- Prefer pages at depth 1, sections at depth 2, key components at depth 3+.",
    "- Every node (including root) must include description and requirements.",
    "- Descriptions: 1-2 short sentences.",
    "- Requirements: array of 2-5 short, concrete strings.",
    "",
    "Project brief:",
    `Title: ${brief?.title || "Untitled"}`,
    `Name: ${brief?.name || "Unknown"}`,
    `Details: ${brief?.details || ""}`,
    `Audience: ${brief?.audience || ""}`,
    `Goals: ${brief?.goals || ""}`,
    "",
    "Selected style:",
    style?.title ? `Title: ${style.title}` : null,
    style?.summary ? `Summary: ${style.summary}` : null,
    Array.isArray(style?.palette) && style.palette.length
      ? `Palette: ${style.palette.join(", ")}`
      : null,
    Array.isArray(style?.tags) && style.tags.length
      ? `Tags: ${style.tags.join(", ")}`
      : null,
    Array.isArray(style?.components) && style.components.length
      ? `Components: ${style.components.join(", ")}`
      : null,
    style?.stylePrompt ? `Style prompt: ${style.stylePrompt}` : null,
  ]
    .filter(Boolean)
    .join("\n");
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
    const brief = payload?.brief ?? {};
    const style = payload?.style ?? null;

    if (!style) {
      return NextResponse.json(
        { error: "Style selection is required." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [{ text: buildPrompt({ brief, style }) }],
        },
      ],
    });

    const rawText = response?.text ?? "";
    const jsonText = extractJson(rawText);
    const parsedTree = jsonText ? JSON.parse(jsonText) : null;
    const tree = normalizeTreePayload(parsedTree);

    if (!tree) {
      return NextResponse.json(
        { error: "Failed to parse tree response.", raw: rawText },
        { status: 502 }
      );
    }

    return NextResponse.json({ tree, raw: rawText });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate tree.",
        message: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
