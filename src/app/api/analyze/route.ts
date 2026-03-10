import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are a Digital Nutritionist and Visual Analysis Expert. Your mission is to identify food items and estimate their nutritional content with precision.

ANALYSIS RULES:
1. If the user provides weights (e.g., 200g rice), use that value as the ground truth, but visually validate if the photo matches that proportion.
2. If the user DOES NOT provide weights, estimate the portion size based on the plate size and cutlery visible in the image.
3. Consider visible cooking methods (e.g., oil sheen indicates frying (+ calories), matte/opaque indicates boiled/grilled).
4. Break down the meal into INDIVIDUAL food items with their weights.
5. For each item, provide YOUR best estimate of calories and macros based on your knowledge.
6. MANDATORY OUTPUT (JSON only, no markdown, no explanation outside JSON):
{
  "dish_name": string,
  "foods": [
    {
      "name": string (simple English name for API lookup, e.g. "chicken breast", "white rice"),
      "weight_g": number,
      "calories": number (your estimate for this weight),
      "protein": number (grams),
      "carbs": number (grams),
      "fats": number (grams)
    }
  ],
  "total_calories": number,
  "macros": { "protein": number, "carbs": number, "fats": number },
  "confidence_score": number (0-100),
  "detailed_analysis": string
}`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const description = formData.get("description") as string || "";
    const language = formData.get("language") as string || "en";
    const imageFile = formData.get("image") as File | null;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const userPrompt = `Analyze this meal${description ? ` with user-provided details: "${description}"` : ""}.
Language for detailed_analysis: ${language === "pt" ? "Portuguese (PT)" : "English (EN)"}.
IMPORTANT: Break down into individual food items in the "foods" array. Use simple English food names for API lookup.
CRITICAL: Always specify "cooked" for cooked foods (e.g. "cooked white rice" not "white rice", "cooked pasta" not "pasta", "cooked chicken breast" not "chicken breast"). This is essential because nutrition databases default to RAW values which are very different from cooked values. Raw rice is ~350kcal/100g but cooked rice is ~130kcal/100g.
Return ONLY valid JSON.`;

    let result;
    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      result = await model.generateContent([
        userPrompt,
        { inlineData: { mimeType: imageFile.type, data: base64 } },
      ]);
    } else {
      result = await model.generateContent(userPrompt);
    }

    const text = result.response.text().trim();
    const jsonText = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonText);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("Gemini error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
