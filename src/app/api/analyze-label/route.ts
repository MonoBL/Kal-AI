import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── FatSecret OAuth2 Token Cache ───────────────────────────────────────────
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getFatSecretToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch("https://oauth.fatsecret.com/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.FATSECRET_CLIENT_ID}:${process.env.FATSECRET_CLIENT_SECRET}`
        ).toString("base64"),
    },
    body: "grant_type=client_credentials&scope=basic",
  });

  if (!res.ok) throw new Error("FatSecret token request failed");
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

// ─── Per-100g nutrition from a database source ──────────────────────────────
type Per100g = { calories: number; protein: number; carbs: number; fats: number };
type DbResult = Per100g & { source: string; matched_name?: string };

async function fetchFatSecretPer100g(query: string, token: string): Promise<DbResult | null> {
  try {
    const res = await fetch("https://platform.fatsecret.com/rest/server.api", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&max_results=3`,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) return null;

    const foods = data?.foods?.food;
    if (!foods) return null;
    const food = Array.isArray(foods) ? foods[0] : foods;

    const desc = (food.food_description as string) || "";
    const calMatch = desc.match(/Calories:\s*([\d.]+)/i);
    if (!calMatch) return null;

    const fatMatch = desc.match(/Fat:\s*([\d.]+)/i);
    const carbMatch = desc.match(/Carbs:\s*([\d.]+)/i);
    const protMatch = desc.match(/Protein:\s*([\d.]+)/i);

    const perMatch = desc.match(/Per\s+([\d.]+)(g|ml)/i);
    const servingSize = perMatch ? parseFloat(perMatch[1]) : 100;
    const scale = 100 / servingSize;

    return {
      calories: Math.round(parseFloat(calMatch[1]) * scale),
      protein: Math.round(parseFloat(protMatch?.[1] || "0") * scale * 10) / 10,
      carbs: Math.round(parseFloat(carbMatch?.[1] || "0") * scale * 10) / 10,
      fats: Math.round(parseFloat(fatMatch?.[1] || "0") * scale * 10) / 10,
      source: "fatsecret",
      matched_name: (food.food_name as string) || undefined,
    };
  } catch {
    return null;
  }
}

async function fetchOpenFoodFactsPer100g(query: string): Promise<DbResult | null> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=3`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const products = data?.products;
    if (!products || products.length === 0) return null;

    const nutriments = products[0].nutriments;
    if (!nutriments) return null;

    const cal = nutriments["energy-kcal_100g"];
    if (!cal) return null;

    return {
      calories: Math.round(cal),
      protein: Math.round((nutriments["proteins_100g"] || 0) * 10) / 10,
      carbs: Math.round((nutriments["carbohydrates_100g"] || 0) * 10) / 10,
      fats: Math.round((nutriments["fat_100g"] || 0) * 10) / 10,
      source: "openfoodfacts",
      matched_name: products[0].product_name || undefined,
    };
  } catch {
    return null;
  }
}

// ─── Verify label per-100g against database sources ─────────────────────────
type VerificationResult = {
  verified: boolean;
  status: "verified" | "adjusted" | "label_only";
  final_per_100g: Per100g;
  final_per_serving: Per100g;
  sources: { source: string; calories: number; matched_name?: string }[];
  adjustment_note?: string;
};

function verifyAndAdjust(
  labelPer100g: Per100g,
  servingWeightG: number,
  dbSources: DbResult[]
): VerificationResult {
  const valid = dbSources.filter(Boolean);
  const sources = valid.map(s => ({ source: s.source, calories: s.calories, matched_name: s.matched_name }));

  if (valid.length === 0) {
    // No DB data — trust the label
    const factor = servingWeightG / 100;
    return {
      verified: false,
      status: "label_only",
      final_per_100g: labelPer100g,
      final_per_serving: {
        calories: Math.round(labelPer100g.calories * factor),
        protein: Math.round(labelPer100g.protein * factor * 10) / 10,
        carbs: Math.round(labelPer100g.carbs * factor * 10) / 10,
        fats: Math.round(labelPer100g.fats * factor * 10) / 10,
      },
      sources: [{ source: "label", calories: labelPer100g.calories }],
    };
  }

  // Check agreement between label and DB sources
  // Average all DB sources first
  const avgDb: Per100g = {
    calories: Math.round(valid.reduce((sum, s) => sum + s.calories, 0) / valid.length),
    protein: Math.round(valid.reduce((sum, s) => sum + s.protein, 0) / valid.length * 10) / 10,
    carbs: Math.round(valid.reduce((sum, s) => sum + s.carbs, 0) / valid.length * 10) / 10,
    fats: Math.round(valid.reduce((sum, s) => sum + s.fats, 0) / valid.length * 10) / 10,
  };

  const diff = Math.abs(labelPer100g.calories - avgDb.calories);
  const avg = (labelPer100g.calories + avgDb.calories) / 2;
  const disagreement = avg > 0 ? diff / avg : 0;

  const factor = servingWeightG / 100;

  if (disagreement <= 0.15) {
    // Label and DB agree — trust the label (it's the most precise for this specific product)
    console.log(`[label-verify] Label (${labelPer100g.calories}) ≈ DB avg (${avgDb.calories}) → verified`);
    return {
      verified: true,
      status: "verified",
      final_per_100g: labelPer100g,
      final_per_serving: {
        calories: Math.round(labelPer100g.calories * factor),
        protein: Math.round(labelPer100g.protein * factor * 10) / 10,
        carbs: Math.round(labelPer100g.carbs * factor * 10) / 10,
        fats: Math.round(labelPer100g.fats * factor * 10) / 10,
      },
      sources: [{ source: "label", calories: labelPer100g.calories }, ...sources],
    };
  }

  // Disagreement > 15% — check if 2 DB sources agree with each other
  if (valid.length >= 2) {
    const [a, b] = valid;
    const dbDiff = Math.abs(a.calories - b.calories);
    const dbAvg = (a.calories + b.calories) / 2;
    const dbAgreement = dbAvg > 0 ? dbDiff / dbAvg : 0;

    if (dbAgreement <= 0.15) {
      // DB sources agree with each other but not label — likely Gemini misread the label
      // Use the DB average as correction
      console.log(`[label-verify] Label (${labelPer100g.calories}) ≠ DB avg (${avgDb.calories}), DB sources agree → adjusting to DB`);
      return {
        verified: true,
        status: "adjusted",
        final_per_100g: avgDb,
        final_per_serving: {
          calories: Math.round(avgDb.calories * factor),
          protein: Math.round(avgDb.protein * factor * 10) / 10,
          carbs: Math.round(avgDb.carbs * factor * 10) / 10,
          fats: Math.round(avgDb.fats * factor * 10) / 10,
        },
        sources: [{ source: "label", calories: labelPer100g.calories }, ...sources],
        adjustment_note: `Adjusted from label (${labelPer100g.calories} kcal/100g) to database consensus (${avgDb.calories} kcal/100g)`,
      };
    }
  }

  // Only 1 DB source disagrees, or DB sources also disagree — trust the label
  // (the physical label is authoritative for this specific product)
  console.log(`[label-verify] Label (${labelPer100g.calories}) ≠ DB (${avgDb.calories}), no DB consensus → trusting label`);
  return {
    verified: false,
    status: "label_only",
    final_per_100g: labelPer100g,
    final_per_serving: {
      calories: Math.round(labelPer100g.calories * factor),
      protein: Math.round(labelPer100g.protein * factor * 10) / 10,
      carbs: Math.round(labelPer100g.carbs * factor * 10) / 10,
      fats: Math.round(labelPer100g.fats * factor * 10) / 10,
    },
    sources: [{ source: "label", calories: labelPer100g.calories }, ...sources],
  };
}

// ─── Gemini Label Prompt ────────────────────────────────────────────────────
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
    const verify = formData.get("verify") as string || "true";

    if (!imageFile) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // Step 1: Gemini reads the label
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

    // Step 2: Cross-reference with nutrition databases (if verify=true)
    if (verify !== "false" && parsed.product_name && parsed.per_100g) {
      try {
        const token = await getFatSecretToken();
        const searchQuery = parsed.product_name;

        console.log(`[label-verify] Verifying "${searchQuery}" against databases...`);

        const [fsResult, offResult] = await Promise.all([
          fetchFatSecretPer100g(searchQuery, token),
          fetchOpenFoodFactsPer100g(searchQuery),
        ]);

        if (fsResult) console.log(`  FatSecret: ${fsResult.calories} kcal/100g (${fsResult.matched_name})`);
        else console.log(`  FatSecret: no match`);
        if (offResult) console.log(`  OpenFoodFacts: ${offResult.calories} kcal/100g (${offResult.matched_name})`);
        else console.log(`  OpenFoodFacts: no match`);

        const dbSources = [fsResult, offResult].filter(Boolean) as DbResult[];
        const verification = verifyAndAdjust(
          parsed.per_100g,
          parsed.serving_weight_g,
          dbSources
        );

        // Apply verified/adjusted values
        parsed.per_100g = verification.final_per_100g;
        parsed.calories_per_serving = verification.final_per_serving.calories;
        parsed.protein_per_serving = verification.final_per_serving.protein;
        parsed.carbs_per_serving = verification.final_per_serving.carbs;
        parsed.fats_per_serving = verification.final_per_serving.fats;
        parsed.verification = {
          status: verification.status,
          sources: verification.sources,
          adjustment_note: verification.adjustment_note,
        };

        console.log(`  → Status: ${verification.status}`);
      } catch (verifyErr) {
        console.error("[label-verify] Verification failed, using label values:", verifyErr);
        parsed.verification = { status: "label_only", sources: [{ source: "label", calories: parsed.per_100g.calories }] };
      }
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("Label analysis error:", err);
    return NextResponse.json({ error: "Label analysis failed" }, { status: 500 });
  }
}
