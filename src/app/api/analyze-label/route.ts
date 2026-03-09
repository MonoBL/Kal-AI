import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const LABEL_PROMPT = `You are a Nutrition Label Reader Expert. Analyze the nutrition label in this image with precision.

RULES:
1. Read ALL serving size columns on the label (per 100g, per unit/serving, per pack, etc.)
2. Identify the INDIVIDUAL SERVING — this is the smallest single portion (e.g., "1 cookie", "1 biscuit", "1 bar", "1 piece"). This is NOT per 100g and NOT the full pack.
3. If the label shows per 100g and per unit (e.g., per 1 cookie of 50g), use the PER UNIT values directly.
4. If the label only shows per 100g, calculate per-serving using the serving weight.
5. Extract the product name from the packaging if visible.

MANDATORY OUTPUT (JSON only, no markdown, no explanation outside JSON):
{
  "product_name": string,
  "serving_name": string (e.g. "1 cookie", "1 biscuit", "1 bar"),
  "serving_weight_g": number,
  "calories_per_serving": number,
  "protein_per_serving": number,
  "carbs_per_serving": number,
  "fats_per_serving": number,
  "per_100g": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fats": number
  },
  "notes": string (any relevant info like "pack contains 4 cookies" or serving details)
}`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const language = formData.get("language") as string || "en";
    const context = formData.get("context") as string || "";

    if (!imageFile) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: LABEL_PROMPT,
    });

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const userPrompt = `Read this nutrition label and extract the per-serving nutritional values.${
      context ? ` Additional context from user: "${context}"` : ""
    }
Language for notes field: ${language === "pt" ? "Portuguese (PT)" : "English (EN)"}.
Return ONLY valid JSON.`;

    const result = await model.generateContent([
      userPrompt,
      { inlineData: { mimeType: imageFile.type, data: base64 } },
    ]);

    const text = result.response.text().trim();
    const jsonText = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonText);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("Label analysis error:", err);
    return NextResponse.json({ error: "Label analysis failed" }, { status: 500 });
  }
}
