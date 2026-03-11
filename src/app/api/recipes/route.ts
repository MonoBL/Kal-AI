import { NextRequest, NextResponse } from "next/server";

const SPOONACULAR_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = "https://api.spoonacular.com";

export async function POST(req: NextRequest) {
  const debugLogs: string[] = [];

  try {
    const { ingredients, number = 10, debug = false } = await req.json();

    debugLogs.push(`[config] API key present: ${!!SPOONACULAR_KEY}`);
    debugLogs.push(`[config] API key length: ${SPOONACULAR_KEY?.length ?? 0}`);
    debugLogs.push(`[input] ingredients: ${JSON.stringify(ingredients)}`);

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one ingredient", debug: debug ? debugLogs : undefined },
        { status: 400 }
      );
    }

    if (!SPOONACULAR_KEY) {
      debugLogs.push("[error] SPOONACULAR_API_KEY env var is not set!");
      return NextResponse.json(
        { error: "API key not configured", debug: debug ? debugLogs : undefined },
        { status: 500 }
      );
    }

    const ingredientList = ingredients.join(",");
    const searchUrl = `${BASE_URL}/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredientList)}&number=${number}&ranking=1&ignorePantry=false&apiKey=${SPOONACULAR_KEY}`;

    debugLogs.push(`[search] URL: ${searchUrl.replace(SPOONACULAR_KEY, "***")}`);

    const searchRes = await fetch(searchUrl);
    debugLogs.push(`[search] status: ${searchRes.status} ${searchRes.statusText}`);

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      debugLogs.push(`[search] error body: ${errText}`);
      console.error("Spoonacular search error:", errText);
      return NextResponse.json(
        { error: "Failed to search recipes", debug: debug ? debugLogs : undefined },
        { status: 500 }
      );
    }

    const recipes = await searchRes.json();
    debugLogs.push(`[search] found ${recipes.length} recipes`);

    const ids = recipes.map((r: { id: number }) => r.id).join(",");
    if (!ids) {
      debugLogs.push("[search] no recipe IDs to fetch details for");
      return NextResponse.json({ recipes: [], debug: debug ? debugLogs : undefined });
    }

    const bulkUrl = `${BASE_URL}/recipes/informationBulk?ids=${ids}&includeNutrition=true&apiKey=${SPOONACULAR_KEY}`;
    debugLogs.push(`[bulk] fetching details for IDs: ${ids}`);

    const bulkRes = await fetch(bulkUrl);
    debugLogs.push(`[bulk] status: ${bulkRes.status} ${bulkRes.statusText}`);

    if (!bulkRes.ok) {
      const errText = await bulkRes.text();
      debugLogs.push(`[bulk] error body: ${errText}`);
      return NextResponse.json({
        recipes: recipes.map((r: Record<string, unknown>) => ({
          id: r.id,
          title: r.title,
          image: r.image,
          usedIngredients: r.usedIngredients,
          missedIngredients: r.missedIngredients,
          usedCount: r.usedIngredientCount,
          missedCount: r.missedIngredientCount,
        })),
        debug: debug ? debugLogs : undefined,
      });
    }

    const details = await bulkRes.json();
    debugLogs.push(`[bulk] got details for ${details.length} recipes`);
    const detailMap = new Map(details.map((d: { id: number }) => [d.id, d]));

    const enriched = recipes.map((r: Record<string, unknown>) => {
      const detail = detailMap.get(r.id) as Record<string, unknown> | undefined;
      const nutrients = detail?.nutrition
        ? ((detail.nutrition as Record<string, unknown>).nutrients as Array<{ name: string; amount: number; unit: string }>) || []
        : [];

      const getNutrient = (name: string) => {
        const n = nutrients.find((x) => x.name === name);
        return n ? Math.round(n.amount) : 0;
      };

      return {
        id: r.id,
        title: r.title,
        image: r.image,
        readyInMinutes: detail?.readyInMinutes || null,
        servings: detail?.servings || null,
        sourceUrl: detail?.sourceUrl || null,
        summary: detail?.summary || null,
        usedIngredients: r.usedIngredients,
        missedIngredients: r.missedIngredients,
        usedCount: r.usedIngredientCount,
        missedCount: r.missedIngredientCount,
        nutrition: {
          calories: getNutrient("Calories"),
          protein: getNutrient("Protein"),
          carbs: getNutrient("Carbohydrates"),
          fats: getNutrient("Fat"),
        },
        instructions: detail?.analyzedInstructions || [],
      };
    });

    debugLogs.push(`[done] returning ${enriched.length} enriched recipes`);
    return NextResponse.json({ recipes: enriched, debug: debug ? debugLogs : undefined });
  } catch (error) {
    debugLogs.push(`[fatal] ${error instanceof Error ? error.message : String(error)}`);
    console.error("Recipe search error:", error);
    return NextResponse.json(
      { error: "Internal server error", debug: debugLogs },
      { status: 500 }
    );
  }
}
