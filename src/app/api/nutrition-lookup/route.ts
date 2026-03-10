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
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

// ─── Per-100g nutrition data from any source ────────────────────────────────
type NutritionPer100g = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  source: "fatsecret" | "openfoodfacts" | "gemini_estimate";
  matched_name?: string;
};

// ─── FatSecret food search ──────────────────────────────────────────────────
async function fetchFatSecret(query: string, token: string): Promise<NutritionPer100g | null> {
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

// ─── OpenFoodFacts search ───────────────────────────────────────────────────
async function fetchOpenFoodFacts(query: string): Promise<NutritionPer100g | null> {
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

// ─── Gemini estimate as per-100g ────────────────────────────────────────────
function geminiToPer100g(
  geminiItem: { calories: number; protein: number; carbs: number; fats: number; weight_g: number },
  weight_g: number
): NutritionPer100g {
  const w = geminiItem.weight_g || weight_g;
  return {
    calories: Math.round((geminiItem.calories / w) * 100),
    protein: Math.round((geminiItem.protein / w) * 1000) / 10,
    carbs: Math.round((geminiItem.carbs / w) * 1000) / 10,
    fats: Math.round((geminiItem.fats / w) * 1000) / 10,
    source: "gemini_estimate",
  };
}

// ─── Consensus: compare all sources & pick best value ───────────────────────
function pickBestNutrition(
  sources: NutritionPer100g[],
  foodName: string
): NutritionPer100g & { sources_used: string[]; all_sources: { source: string; calories: number }[] } {
  // Filter out nulls
  const valid = sources.filter(Boolean);

  if (valid.length === 0) {
    return {
      calories: 0, protein: 0, carbs: 0, fats: 0,
      source: "gemini_estimate",
      sources_used: [],
      all_sources: [],
    };
  }

  if (valid.length === 1) {
    const s = valid[0];
    return {
      ...s,
      sources_used: [s.source],
      all_sources: [{ source: s.source, calories: s.calories }],
    };
  }

  const allSources = valid.map(s => ({ source: s.source, calories: s.calories }));

  // If we have 2+ database sources (not gemini), prefer their consensus
  const dbSources = valid.filter(s => s.source !== "gemini_estimate");
  const geminiSource = valid.find(s => s.source === "gemini_estimate");

  if (dbSources.length >= 2) {
    // Check if the two DB sources agree (within 15% of each other on calories)
    const [a, b] = dbSources;
    const diff = Math.abs(a.calories - b.calories);
    const avg = (a.calories + b.calories) / 2;
    const agreement = avg > 0 ? diff / avg : 0;

    if (agreement <= 0.15) {
      // They agree — average them
      console.log(`[consensus] "${foodName}": FatSecret (${a.calories}) & OpenFoodFacts (${b.calories}) agree → averaging`);
      return {
        calories: Math.round((a.calories + b.calories) / 2),
        protein: Math.round(((a.protein + b.protein) / 2) * 10) / 10,
        carbs: Math.round(((a.carbs + b.carbs) / 2) * 10) / 10,
        fats: Math.round(((a.fats + b.fats) / 2) * 10) / 10,
        source: a.source, // primary badge
        matched_name: a.matched_name || b.matched_name,
        sources_used: dbSources.map(s => s.source),
        all_sources: allSources,
      };
    } else {
      // They disagree — pick the one closer to Gemini (if available) as tiebreaker
      if (geminiSource) {
        const diffA = Math.abs(a.calories - geminiSource.calories);
        const diffB = Math.abs(b.calories - geminiSource.calories);
        const winner = diffA <= diffB ? a : b;
        console.log(`[consensus] "${foodName}": DB sources disagree (${a.calories} vs ${b.calories}), Gemini (${geminiSource.calories}) as tiebreaker → ${winner.source}`);
        return {
          ...winner,
          sources_used: valid.map(s => s.source),
          all_sources: allSources,
        };
      }
      // No Gemini — prefer FatSecret (curated database)
      const winner = dbSources.find(s => s.source === "fatsecret") || dbSources[0];
      return {
        ...winner,
        sources_used: dbSources.map(s => s.source),
        all_sources: allSources,
      };
    }
  }

  if (dbSources.length === 1) {
    // One DB source + Gemini — check if they agree
    const db = dbSources[0];
    if (geminiSource) {
      const diff = Math.abs(db.calories - geminiSource.calories);
      const avg = (db.calories + geminiSource.calories) / 2;
      const agreement = avg > 0 ? diff / avg : 0;

      if (agreement <= 0.20) {
        // They agree — average, badge the DB source
        console.log(`[consensus] "${foodName}": ${db.source} (${db.calories}) & Gemini (${geminiSource.calories}) agree → averaging`);
        return {
          calories: Math.round((db.calories + geminiSource.calories) / 2),
          protein: Math.round(((db.protein + geminiSource.protein) / 2) * 10) / 10,
          carbs: Math.round(((db.carbs + geminiSource.carbs) / 2) * 10) / 10,
          fats: Math.round(((db.fats + geminiSource.fats) / 2) * 10) / 10,
          source: db.source,
          matched_name: db.matched_name,
          sources_used: [db.source, "gemini_estimate"],
          all_sources: allSources,
        };
      }
      // Disagree — check HOW MUCH they disagree
      // If DB is >2x Gemini, DB likely has raw/dry values → trust Gemini
      const ratio = db.calories / geminiSource.calories;
      if (ratio > 2.0) {
        console.log(`[consensus] "${foodName}": ${db.source} (${db.calories}) is ${ratio.toFixed(1)}x Gemini (${geminiSource.calories}) → likely raw/dry data, trusting Gemini`);
        return {
          ...geminiSource,
          sources_used: ["gemini_estimate", db.source],
          all_sources: allSources,
        };
      }
      // DB is not wildly off — trust the DB
      console.log(`[consensus] "${foodName}": ${db.source} (${db.calories}) & Gemini (${geminiSource.calories}) disagree → trusting DB`);
    }
    return {
      ...db,
      sources_used: valid.map(s => s.source),
      all_sources: allSources,
    };
  }

  // Only Gemini
  return {
    ...valid[0],
    sources_used: ["gemini_estimate"],
    all_sources: allSources,
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────
type FoodItemInput = { name: string; weight_g: number };

type FoodItemResult = {
  name: string;
  weight_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  per_100g: { calories: number; protein: number; carbs: number; fats: number };
  source: "fatsecret" | "openfoodfacts" | "gemini_estimate";
  matched_name?: string;
  sources_used: string[];
  all_sources: { source: string; calories: number }[];
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

    let token: string | null = null;
    try {
      token = await getFatSecretToken();
    } catch (tokenErr) {
      console.error("[nutrition-lookup] FatSecret token failed:", tokenErr);
    }
    const results: FoodItemResult[] = [];

    for (const food of foods) {
      console.log(`[nutrition-lookup] Looking up: "${food.name}" (${food.weight_g}g)`);

      // Query ALL sources in parallel
      const [fsResult, offResult] = await Promise.all([
        token ? fetchFatSecret(food.name, token) : Promise.resolve(null),
        fetchOpenFoodFacts(food.name),
      ]);

      // Get Gemini estimate as per-100g
      const geminiItem = gemini_estimates?.find(
        (g) => g.name.toLowerCase() === food.name.toLowerCase()
      );
      const geminiResult = geminiItem
        ? geminiToPer100g(geminiItem, food.weight_g)
        : null;

      // Log what we got
      if (fsResult) console.log(`  FatSecret: ${fsResult.calories} kcal/100g (${fsResult.matched_name})`);
      else console.log(`  FatSecret: no match`);
      if (offResult) console.log(`  OpenFoodFacts: ${offResult.calories} kcal/100g (${offResult.matched_name})`);
      else console.log(`  OpenFoodFacts: no match`);
      if (geminiResult) console.log(`  Gemini: ${geminiResult.calories} kcal/100g`);

      // Pick the best value using consensus
      const allSources = [fsResult, offResult, geminiResult].filter(Boolean) as NutritionPer100g[];
      const best = pickBestNutrition(allSources, food.name);

      console.log(`  → Winner: ${best.source} (${best.calories} kcal/100g), used: [${best.sources_used.join(", ")}]`);

      // Scale to actual weight
      const factor = food.weight_g / 100;
      results.push({
        name: food.name,
        weight_g: food.weight_g,
        calories: Math.round(best.calories * factor),
        protein: Math.round(best.protein * factor * 10) / 10,
        carbs: Math.round(best.carbs * factor * 10) / 10,
        fats: Math.round(best.fats * factor * 10) / 10,
        per_100g: {
          calories: best.calories,
          protein: best.protein,
          carbs: best.carbs,
          fats: best.fats,
        },
        source: best.source,
        matched_name: best.matched_name,
        sources_used: best.sources_used,
        all_sources: best.all_sources,
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
