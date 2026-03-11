import { NextRequest, NextResponse } from "next/server";

const SPOONACULAR_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = "https://api.spoonacular.com";

export async function POST(req: NextRequest) {
  try {
    const { ingredients, number = 10 } = await req.json();

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one ingredient" },
        { status: 400 }
      );
    }

    const ingredientList = ingredients.join(",");

    // Find recipes by ingredients
    const searchRes = await fetch(
      `${BASE_URL}/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredientList)}&number=${number}&ranking=1&ignorePantry=false&apiKey=${SPOONACULAR_KEY}`
    );

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error("Spoonacular search error:", errText);
      return NextResponse.json(
        { error: "Failed to search recipes" },
        { status: 500 }
      );
    }

    const recipes = await searchRes.json();

    // Get detailed info (nutrition + instructions) for each recipe
    const ids = recipes.map((r: { id: number }) => r.id).join(",");
    if (!ids) {
      return NextResponse.json({ recipes: [] });
    }

    const bulkRes = await fetch(
      `${BASE_URL}/recipes/informationBulk?ids=${ids}&includeNutrition=true&apiKey=${SPOONACULAR_KEY}`
    );

    if (!bulkRes.ok) {
      // Return basic results without details
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
      });
    }

    const details = await bulkRes.json();
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

    return NextResponse.json({ recipes: enriched });
  } catch (error) {
    console.error("Recipe search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
