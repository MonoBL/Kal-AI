import { NextRequest, NextResponse } from "next/server";

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
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // refresh 1 min early
  return cachedToken!;
}

// ─── FatSecret food search ──────────────────────────────────────────────────
async function searchFood(query: string, token: string) {
  const url = `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&max_results=3`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.foods?.food || null;
}

// ─── OpenFoodFacts fallback search ──────────────────────────────────────────
async function searchOpenFoodFacts(query: string) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=3`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.products || null;
}

// ─── Parse FatSecret serving description ────────────────────────────────────
function parseFatSecretNutrition(food: Record<string, unknown>): {
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  source: string;
} | null {
  // FatSecret returns a description string like "Per 100g - Calories: 130kcal | Fat: 0.28g | Carbs: 28.17g | Protein: 2.69g"
  const desc = (food.food_description as string) || "";

  // Try to extract per-100g values
  const calMatch = desc.match(/Calories:\s*([\d.]+)/i);
  const fatMatch = desc.match(/Fat:\s*([\d.]+)/i);
  const carbMatch = desc.match(/Carbs:\s*([\d.]+)/i);
  const protMatch = desc.match(/Protein:\s*([\d.]+)/i);

  if (!calMatch) return null;

  // Check if it's per 100g or per serving
  const perMatch = desc.match(/Per\s+([\d.]+)(g|ml)/i);
  const servingSize = perMatch ? parseFloat(perMatch[1]) : 100;
  const scale = 100 / servingSize;

  return {
    calories_per_100g: Math.round(parseFloat(calMatch[1]) * scale),
    protein_per_100g: Math.round(parseFloat(protMatch?.[1] || "0") * scale * 10) / 10,
    carbs_per_100g: Math.round(parseFloat(carbMatch?.[1] || "0") * scale * 10) / 10,
    fats_per_100g: Math.round(parseFloat(fatMatch?.[1] || "0") * scale * 10) / 10,
    source: "fatsecret",
  };
}

// ─── Parse OpenFoodFacts product ────────────────────────────────────────────
function parseOpenFoodFactsNutrition(product: Record<string, unknown>): {
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  source: string;
} | null {
  const nutriments = product.nutriments as Record<string, number> | undefined;
  if (!nutriments) return null;

  const cal = nutriments["energy-kcal_100g"];
  if (!cal) return null;

  return {
    calories_per_100g: Math.round(cal),
    protein_per_100g: Math.round((nutriments["proteins_100g"] || 0) * 10) / 10,
    carbs_per_100g: Math.round((nutriments["carbohydrates_100g"] || 0) * 10) / 10,
    fats_per_100g: Math.round((nutriments["fat_100g"] || 0) * 10) / 10,
    source: "openfoodfacts",
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────
type FoodItemInput = {
  name: string;
  weight_g: number;
};

type FoodItemResult = {
  name: string;
  weight_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  per_100g: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  source: "fatsecret" | "openfoodfacts" | "gemini_estimate";
  matched_name?: string;
};

// ─── Main endpoint ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { foods, gemini_estimates } = (await req.json()) as {
      foods: FoodItemInput[];
      gemini_estimates: {
        name: string;
        weight_g: number;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
      }[];
    };

    if (!foods || !Array.isArray(foods) || foods.length === 0) {
      return NextResponse.json({ error: "No foods provided" }, { status: 400 });
    }

    const token = await getFatSecretToken();
    const results: FoodItemResult[] = [];

    for (const food of foods) {
      let nutrition: {
        calories_per_100g: number;
        protein_per_100g: number;
        carbs_per_100g: number;
        fats_per_100g: number;
        source: string;
      } | null = null;
      let matchedName: string | undefined;

      // 1. Try FatSecret
      const fsResults = await searchFood(food.name, token);
      if (fsResults) {
        const fsFood = Array.isArray(fsResults) ? fsResults[0] : fsResults;
        nutrition = parseFatSecretNutrition(fsFood);
        matchedName = (fsFood.food_name as string) || undefined;
      }

      // 2. Fallback to OpenFoodFacts
      if (!nutrition) {
        const offResults = await searchOpenFoodFacts(food.name);
        if (offResults && offResults.length > 0) {
          nutrition = parseOpenFoodFactsNutrition(offResults[0]);
          matchedName = (offResults[0].product_name as string) || undefined;
        }
      }

      // 3. Fallback to Gemini estimate
      if (!nutrition) {
        const geminiItem = gemini_estimates?.find(
          (g) => g.name.toLowerCase() === food.name.toLowerCase()
        );
        if (geminiItem) {
          const weight = geminiItem.weight_g || food.weight_g;
          results.push({
            name: food.name,
            weight_g: food.weight_g,
            calories: geminiItem.calories,
            protein: geminiItem.protein,
            carbs: geminiItem.carbs,
            fats: geminiItem.fats,
            per_100g: {
              calories: Math.round((geminiItem.calories / weight) * 100),
              protein: Math.round((geminiItem.protein / weight) * 1000) / 10,
              carbs: Math.round((geminiItem.carbs / weight) * 1000) / 10,
              fats: Math.round((geminiItem.fats / weight) * 1000) / 10,
            },
            source: "gemini_estimate",
          });
          continue;
        }
        // Skip item if no data at all
        continue;
      }

      // Calculate actual values based on weight
      const factor = food.weight_g / 100;
      results.push({
        name: food.name,
        weight_g: food.weight_g,
        calories: Math.round(nutrition.calories_per_100g * factor),
        protein: Math.round(nutrition.protein_per_100g * factor * 10) / 10,
        carbs: Math.round(nutrition.carbs_per_100g * factor * 10) / 10,
        fats: Math.round(nutrition.fats_per_100g * factor * 10) / 10,
        per_100g: {
          calories: nutrition.calories_per_100g,
          protein: nutrition.protein_per_100g,
          carbs: nutrition.carbs_per_100g,
          fats: nutrition.fats_per_100g,
        },
        source: nutrition.source as "fatsecret" | "openfoodfacts",
        matched_name: matchedName,
      });
    }

    // Calculate totals
    const totals = results.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: Math.round((acc.protein + item.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
        fats: Math.round((acc.fats + item.fats) * 10) / 10,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    return NextResponse.json({ items: results, totals });
  } catch (err) {
    console.error("Nutrition lookup error:", err);
    return NextResponse.json(
      { error: "Nutrition lookup failed" },
      { status: 500 }
    );
  }
}
