import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const IDEOGRAM_DESCRIBE_ENDPOINT = "https://api.ideogram.ai/describe";

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

const normalizeImageDescriptions = (value) => {
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

const normalizeIdeaContext = (value) => {
  if (!value || typeof value !== "object") {
    return {
      category: "",
      audience: "",
      coreValue: "",
      heroSection: "",
      primaryConversion: "",
      answers: [],
    };
  }
  return {
    category: value.category?.toString().trim() || "",
    audience: value.audience?.toString().trim() || "",
    coreValue: value.coreValue?.toString().trim() || "",
    heroSection: value.heroSection?.toString().trim() || "",
    primaryConversion: value.primaryConversion?.toString().trim() || "",
    answers: Array.isArray(value.answers)
      ? value.answers.map(normalizeIdeaAnswer).filter(Boolean)
      : [],
  };
};

const formatIdeaContext = (ideaContext) => {
  if (!ideaContext || typeof ideaContext !== "object") {
    return "";
  }
  const answers = Array.isArray(ideaContext.answers)
    ? ideaContext.answers
        .map((entry) => `${entry.question}: ${entry.answerLabel}`)
        .filter(Boolean)
    : [];
  return [
    ideaContext.category ? `Category: ${ideaContext.category}` : null,
    ideaContext.audience ? `Audience: ${ideaContext.audience}` : null,
    ideaContext.coreValue ? `Primary value: ${ideaContext.coreValue}` : null,
    ideaContext.heroSection ? `Lead section: ${ideaContext.heroSection}` : null,
    ideaContext.primaryConversion
      ? `Primary conversion: ${ideaContext.primaryConversion}`
      : null,
    answers.length ? `Idea answers: ${answers.join(" | ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

const normalizeTreeNode = (node) => {
  if (!node || typeof node !== "object") {
    return node;
  }
  const next = { ...node };
  next.description = next.description?.toString().trim() || "";
  next.requirements = normalizeRequirements(next.requirements);
  if (next.imageDescriptions) {
    next.imageDescriptions = normalizeImageDescriptions(next.imageDescriptions);
  }
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

const buildPrompt = ({
  title,
  name,
  details,
  audience,
  goals,
  style,
  ideaContext,
}) => {
  const styleSection = [
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
  ].filter(Boolean);
  const ideaSection = formatIdeaContext(ideaContext);

  return [
    "You are an information architect for web apps.",
    "Return JSON only with this schema:",
    "{",
    '  "root": {',
    '    "id": "root",',
    '    "label": "App",',
    '    "description": "Brief summary of the overall app",',
    '    "requirements": ["Short requirement"],',
    '    "children": [',
    '      {',
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
    "- Descriptions: 2-4 short sentences with concrete domain details.",
    "- Requirements: array of 3-6 short, concrete strings tied to user tasks.",
    "- Use the idea context answers to keep page purpose and terminology consistent.",
    "- Internal pages must clearly reflect the selected product category and user journey.",
    "",
    "Brief:",
    `Title: ${title || "Untitled"}`,
    `Name: ${name || "Unknown"}`,
    `Details: ${details || "None provided."}`,
    audience ? `Audience: ${audience}` : null,
    goals ? `Goals: ${goals}` : null,
    ideaSection ? "" : null,
    ideaSection ? "Idea context:" : null,
    ideaSection || null,
    styleSection.length ? "" : null,
    styleSection.length ? "Selected style:" : null,
    ...styleSection,
  ]
    .filter(Boolean)
    .join("\n");
};

const buildImageAnalysisPrompt = ({ title, name, details }) => {
  return [
    "You are a visual designer analyzing UI screenshots.",
    "Describe every aspect of the images in detail so another model can recreate them closely.",
    "Focus on colors, shapes, placement, spacing, typography, background treatment, and hierarchy.",
    "These images will be generated on a transparent background, so describe the UI layers without device mockups.",
    "Return JSON only with this schema:",
    "{",
    '  "summary": "1-2 sentences describing the overall visual style",',
    '  "colors": ["Short color names or hex values"],',
    '  "palette": [',
    "    {",
    '      "color_hex": "#112233",',
    '      "color_weight": 0.4,',
    '      "name": "color name"',
    "    }",
    "  ],",
    '  "shapes": ["Rounded cards", "pill buttons"],',
    '  "placement": "Describe where primary sections and UI blocks sit.",',
    '  "layout": {',
    '    "structure": "Overall layout pattern",',
    '    "grid": "Grid/column structure",',
    '    "alignment": "Alignment and balance",',
    '    "spacing": "Spacing and density notes"',
    "  },",
    '  "typography": {',
    '    "style": "Typography feel",',
    '    "weight": "Font weight tendencies",',
    '    "case": "Upper/lower/mixed",',
    '    "notes": "Any standout type treatments"',
    "  },",
    '  "components": ["Primary UI components visible"],',
    '  "imagery": "Notes about illustrations, icons, or photos",',
    '  "background": "Background color/gradient/texture description",',
    '  "styleKeywords": ["keyword", "keyword"],',
    '  "ideogram": {',
    '    "aspect_ratio": "16x9",',
    '    "rendering_speed": "QUALITY",',
    '    "magic_prompt": "OFF",',
    '    "upscale_factor": "X2",',
    '    "seed": 123456,',
    '    "negative_prompt": "What to avoid",',
    "  }",
    "}",
    "Rules:",
    "- Provide hex colors when possible.",
    "- Keep color_weight between 0.05 and 1.0.",
    "- Keep the ideogram fields aligned with the images to recreate them closely.",
    "- Choose aspect_ratio from: 1x3, 3x1, 1x2, 2x1, 9x16, 16x9, 10x16, 16x10, 2x3, 3x2, 3x4, 4x3, 4x5, 5x4, 1x1.",
    "- Choose rendering_speed from: FLASH, TURBO, DEFAULT, QUALITY.",
    "- Choose magic_prompt from: AUTO, ON, OFF.",
    "- Choose upscale_factor from: X1, X2, X4.",
    "",
    "Brief:",
    `Title: ${title || "Untitled"}`,
    `Name: ${name || "Unknown"}`,
    `Details: ${details || "None provided."}`,
  ].join("\n");
};

const getFormImageFiles = (formData) => {
  if (!formData) {
    return [];
  }
  const images = [];
  const entries = formData.getAll("images");
  entries.forEach((entry) => {
    if (entry && typeof entry.arrayBuffer === "function") {
      images.push(entry);
    }
  });
  const primary = formData.get("image");
  if (primary && typeof primary.arrayBuffer === "function") {
    images.push(primary);
  }
  const seen = new Set();
  return images.filter((file) => {
    const key = `${file.name || "image"}:${file.size}:${file.type}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const extractIdeogramDescriptions = (payload) => {
  const descriptions = Array.isArray(payload?.descriptions)
    ? payload.descriptions
    : [];
  return descriptions
    .map((entry) => entry?.text?.toString().trim())
    .filter(Boolean);
};

const describeImage = async ({ file, apiKey }) => {
  const form = new FormData();
  form.append("image_file", file, file.name || "image.png");
  form.append("describe_model_version", "V_3");

  const response = await fetch(IDEOGRAM_DESCRIBE_ENDPOINT, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
    },
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.error || payload?.message || "Ideogram describe failed."
    );
  }
  return extractIdeogramDescriptions(payload);
};

const describeImages = async ({ files, apiKey }) => {
  if (!apiKey || !files.length) {
    return [];
  }
  const results = await Promise.allSettled(
    files.map((file) => describeImage({ file, apiKey }))
  );
  const descriptions = [];
  results.forEach((result) => {
    if (result.status !== "fulfilled") {
      return;
    }
    const text = result.value?.[0];
    if (text) {
      descriptions.push(text);
    }
  });
  return descriptions;
};

const attachImageDescriptions = (node, descriptions) => {
  if (!node || typeof node !== "object") {
    return node;
  }
  const next = { ...node };
  if (descriptions.length) {
    next.imageDescriptions = descriptions;
  }
  ["children", "items", "pages", "nodes"].forEach((key) => {
    if (Array.isArray(next[key])) {
      next[key] = next[key].map((child) =>
        attachImageDescriptions(child, descriptions)
      );
    }
  });
  return next;
};

const attachImageAnalysis = (node, analysis) => {
  if (!node || typeof node !== "object") {
    return node;
  }
  const next = { ...node };
  if (analysis && typeof analysis === "object") {
    next.imageAnalysis = analysis;
  }
  ["children", "items", "pages", "nodes"].forEach((key) => {
    if (Array.isArray(next[key])) {
      next[key] = next[key].map((child) =>
        attachImageAnalysis(child, analysis)
      );
    }
  });
  return next;
};

const analyzeImagesWithGemini = async ({ ai, files, title, name, details }) => {
  if (!files.length || !ai) {
    return null;
  }
  const parts = [{ text: buildImageAnalysisPrompt({ title, name, details }) }];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    parts.push({
      inlineData: {
        mimeType: file.type || "image/png",
        data: buffer.toString("base64"),
      },
    });
  }
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    config: {
      responseMimeType: "application/json",
      maxOutputTokens:
        Number(process.env.IMAGE_ANALYSIS_MAX_TOKENS) || 2048,
    },
  });
  const rawText = response?.text ?? "";
  const jsonText = extractJson(rawText);
  if (!jsonText) {
    return null;
  }
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    return null;
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

    const contentType = request.headers.get("content-type") || "";
    const isMultipartRequest = contentType.includes("multipart/form-data");
    const formData = isMultipartRequest ? await request.formData() : null;
    const payload = !isMultipartRequest
      ? await request.json().catch(() => ({}))
      : null;

    const image = isMultipartRequest ? formData.get("image") : null;
    const title = isMultipartRequest
      ? formData.get("title")?.toString() ?? ""
      : payload?.title?.toString() ?? "";
    const name = isMultipartRequest
      ? formData.get("name")?.toString() ?? ""
      : payload?.name?.toString() ?? "";
    const details = isMultipartRequest
      ? formData.get("details")?.toString() ?? ""
      : payload?.details?.toString() ?? "";
    const audience = isMultipartRequest
      ? formData.get("audience")?.toString() ?? ""
      : payload?.audience?.toString() ?? "";
    const goals = isMultipartRequest
      ? formData.get("goals")?.toString() ?? ""
      : payload?.goals?.toString() ?? "";
    const style =
      payload?.style && typeof payload.style === "object" ? payload.style : null;
    const ideaContext = normalizeIdeaContext(payload?.ideaContext);
    const ideogramKey = process.env.IDEOGRAM_API_KEY;

    if (
      isMultipartRequest &&
      (!image || typeof image.arrayBuffer !== "function")
    ) {
      return NextResponse.json(
        { error: "Image file is required." },
        { status: 400 }
      );
    }

    const prompt = buildPrompt({
      title,
      name,
      details,
      audience,
      goals,
      style,
      ideaContext,
    });
    const imageFiles = isMultipartRequest ? getFormImageFiles(formData) : [];

    const ai = new GoogleGenAI({ apiKey });
    const generationParts = [{ text: prompt }];
    if (image && typeof image.arrayBuffer === "function") {
      const buffer = Buffer.from(await image.arrayBuffer());
      generationParts.push({
        inlineData: {
          mimeType: image.type || "image/png",
          data: buffer.toString("base64"),
        },
      });
    }
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: generationParts,
        },
      ],
    });

    const rawText = response?.text ?? "";
    const jsonText = extractJson(rawText);
    const parsedTree = jsonText ? JSON.parse(jsonText) : null;
    const tree = normalizeTreePayload(parsedTree);

    if (!tree) {
      return NextResponse.json(
        { error: "Failed to parse model response.", raw: rawText },
        { status: 502 }
      );
    }

    if (!imageFiles.length) {
      return NextResponse.json({ tree, raw: rawText });
    }

    const [imageDescriptions, imageAnalysis] = await Promise.all([
      describeImages({
        files: imageFiles,
        apiKey: ideogramKey,
      }),
      analyzeImagesWithGemini({ ai, files: imageFiles, title, name, details }),
    ]);
    const treeWithDescriptions = imageDescriptions.length
      ? attachImageDescriptions(tree, imageDescriptions)
      : tree;
    const treeWithAnalysis =
      imageAnalysis && typeof imageAnalysis === "object"
        ? attachImageAnalysis(treeWithDescriptions, imageAnalysis)
        : treeWithDescriptions;

    return NextResponse.json({ tree: treeWithAnalysis, raw: rawText });
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
