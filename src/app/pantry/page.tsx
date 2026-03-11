"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import BottomNav from "@/components/BottomNav";

const ADMIN_EMAIL = "nunom3ndes2005@gmail.com";

interface RecipeIngredient {
  name: string;
  image: string;
  amount: number;
  unit: string;
  original: string;
}

interface Recipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number | null;
  servings: number | null;
  sourceUrl: string | null;
  summary: string | null;
  usedIngredients: RecipeIngredient[];
  missedIngredients: RecipeIngredient[];
  usedCount: number;
  missedCount: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  instructions: Array<{
    steps: Array<{
      number: number;
      step: string;
    }>;
  }>;
}

const COMMON_INGREDIENTS = [
  // Proteins
  "chicken", "beef", "pork", "salmon", "tuna", "eggs", "shrimp", "turkey",
  // Dairy
  "milk", "cheese", "butter", "yogurt", "cream",
  // Vegetables
  "onion", "garlic", "tomato", "potato", "carrot", "broccoli", "spinach", "pepper", "mushroom", "lettuce", "cucumber", "zucchini",
  // Fruits
  "lemon", "lime", "apple", "banana", "avocado",
  // Pantry staples
  "rice", "pasta", "bread", "flour", "olive oil", "soy sauce", "vinegar",
  // Canned / other
  "beans", "chickpeas", "coconut milk", "corn",
];

export default function PantryPage() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const router = useRouter();

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (typeof window !== "undefined" && isAdmin) {
      setDebugMode(localStorage.getItem("kal-debug") === "true");
    }
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007AFF]" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const addIngredient = (name: string) => {
    const cleaned = name.trim().toLowerCase();
    if (cleaned && !ingredients.includes(cleaned)) {
      setIngredients((prev) => [...prev, cleaned]);
    }
    setInputValue("");
  };

  const removeIngredient = (name: string) => {
    setIngredients((prev) => prev.filter((i) => i !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addIngredient(inputValue);
    }
  };

  const searchRecipes = async () => {
    if (ingredients.length === 0) return;
    setSearching(true);
    setError("");
    setDebugLog([]);
    setExpandedRecipe(null);

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, number: 12, debug: debugMode }),
      });

      const data = await res.json();

      if (data.debug) {
        setDebugLog(data.debug);
      }

      if (!res.ok) {
        setError(data.error || t.pantryError);
        return;
      }

      setRecipes(data.recipes || []);
      if (data.recipes?.length === 0) {
        setError(t.pantryNoResults);
      }
    } catch (err) {
      setError(t.pantryError);
      if (debugMode) {
        setDebugLog((prev) => [...prev, `[client] fetch error: ${err instanceof Error ? err.message : String(err)}`]);
      }
    } finally {
      setSearching(false);
    }
  };

  const filteredSuggestions = COMMON_INGREDIENTS.filter(
    (i) =>
      !ingredients.includes(i) &&
      (inputValue === "" || i.includes(inputValue.toLowerCase()))
  );

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "");

  return (
    <div className="min-h-screen bg-[#F2F2F7] safe-top safe-bottom">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="#007AFF" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h1 className="text-xl font-bold text-gray-900">{t.pantryTitle}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-4">
        {/* Ingredient Input */}
        <div className="card p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            {t.pantryAddIngredients}
          </h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.pantryInputPlaceholder}
              className="flex-1 px-3 py-2.5 bg-[#F2F2F7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
            />
            <button
              onClick={() => addIngredient(inputValue)}
              disabled={!inputValue.trim()}
              className="px-4 py-2.5 bg-[#007AFF] text-white rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
            >
              {t.pantryAdd}
            </button>
          </div>

          {/* Selected Ingredients */}
          {ingredients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {ingredients.map((ing) => (
                <span
                  key={ing}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#007AFF]/10 text-[#007AFF] rounded-full text-sm font-medium"
                >
                  {ing}
                  <button
                    onClick={() => removeIngredient(ing)}
                    className="ml-0.5 hover:text-[#FF3B30] transition-colors"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
              <button
                onClick={() => setIngredients([])}
                className="px-3 py-1.5 text-[#FF3B30] text-sm font-medium"
              >
                {t.pantryClearAll}
              </button>
            </div>
          )}

          {/* Quick-add Suggestions */}
          {inputValue === "" && ingredients.length < 15 && (
            <div>
              <p className="text-xs text-[#8E8E93] mb-2">{t.pantryQuickAdd}</p>
              <div className="flex flex-wrap gap-1.5">
                {filteredSuggestions.slice(0, 16).map((ing) => (
                  <button
                    key={ing}
                    onClick={() => addIngredient(ing)}
                    className="px-2.5 py-1 bg-[#F2F2F7] text-gray-700 rounded-full text-xs font-medium hover:bg-[#E5E5EA] transition-colors"
                  >
                    + {ing}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filtered suggestions while typing */}
          {inputValue && filteredSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {filteredSuggestions.slice(0, 8).map((ing) => (
                <button
                  key={ing}
                  onClick={() => addIngredient(ing)}
                  className="px-2.5 py-1 bg-[#F2F2F7] text-gray-700 rounded-full text-xs font-medium hover:bg-[#E5E5EA] transition-colors"
                >
                  + {ing}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Button */}
        <button
          onClick={searchRecipes}
          disabled={ingredients.length === 0 || searching}
          className="ios-button flex items-center justify-center gap-2"
        >
          {searching ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              {t.pantrySearching}
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              {t.pantrySearch}
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="card p-4 text-center text-[#FF3B30] text-sm">
            {error}
          </div>
        )}

        {/* Debug Panel (admin only) */}
        {debugMode && isAdmin && debugLog.length > 0 && (
          <div className="rounded-2xl bg-gray-900 p-4 space-y-1">
            <p className="text-xs font-bold text-gray-400 mb-2">DEBUG LOG</p>
            {debugLog.map((line, i) => (
              <p key={i} className="text-[11px] font-mono text-gray-300 break-all">
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Results */}
        {recipes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">
              {t.pantryResults} ({recipes.length})
            </h2>
            {recipes.map((recipe) => {
              const isExpanded = expandedRecipe === recipe.id;
              return (
                <div key={recipe.id} className="card overflow-hidden">
                  {/* Recipe Card Header */}
                  <button
                    onClick={() => setExpandedRecipe(isExpanded ? null : recipe.id)}
                    className="w-full text-left"
                  >
                    <div className="flex gap-3 p-3">
                      {recipe.image && (
                        <img
                          src={recipe.image}
                          alt={recipe.title}
                          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                          {recipe.title}
                        </h3>

                        {/* Meta */}
                        <div className="flex flex-wrap gap-2 text-xs text-[#8E8E93] mb-2">
                          {recipe.readyInMinutes && (
                            <span className="flex items-center gap-0.5">
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                              </svg>
                              {recipe.readyInMinutes} min
                            </span>
                          )}
                          {recipe.servings && (
                            <span>{recipe.servings} {t.pantryServings}</span>
                          )}
                          {recipe.nutrition.calories > 0 && (
                            <span className="font-medium text-[#FF9500]">
                              {recipe.nutrition.calories} kcal
                            </span>
                          )}
                        </div>

                        {/* Ingredient match indicator */}
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 bg-[#F2F2F7] rounded-full h-1.5">
                            <div
                              className="bg-[#34C759] rounded-full h-1.5 transition-all"
                              style={{
                                width: `${(recipe.usedCount / (recipe.usedCount + recipe.missedCount)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-[#34C759] font-medium whitespace-nowrap">
                            {recipe.usedCount}/{recipe.usedCount + recipe.missedCount} {t.pantryIngredientsMatch}
                          </span>
                        </div>
                      </div>

                      {/* Expand arrow */}
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className={`w-5 h-5 text-[#8E8E93] flex-shrink-0 mt-2 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-3 space-y-3">
                      {/* Nutrition */}
                      {recipe.nutrition.calories > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: t.calories, value: recipe.nutrition.calories, unit: "kcal", color: "#FF9500" },
                            { label: t.protein, value: recipe.nutrition.protein, unit: "g", color: "#007AFF" },
                            { label: t.carbs, value: recipe.nutrition.carbs, unit: "g", color: "#34C759" },
                            { label: t.fats, value: recipe.nutrition.fats, unit: "g", color: "#FF3B30" },
                          ].map((n) => (
                            <div key={n.label} className="text-center p-2 bg-[#F2F2F7] rounded-xl">
                              <p className="text-xs text-[#8E8E93]">{n.label}</p>
                              <p className="text-sm font-bold" style={{ color: n.color }}>
                                {n.value}
                                <span className="text-[10px] font-normal text-[#8E8E93]"> {n.unit}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Used Ingredients */}
                      {recipe.usedIngredients.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-[#34C759] mb-1">
                            {t.pantryYouHave} ({recipe.usedIngredients.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {recipe.usedIngredients.map((ing, i) => (
                              <span key={i} className="px-2 py-0.5 bg-[#34C759]/10 text-[#34C759] rounded-full text-xs">
                                {ing.original}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Ingredients */}
                      {recipe.missedIngredients.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-[#FF9500] mb-1">
                            {t.pantryYouNeed} ({recipe.missedIngredients.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {recipe.missedIngredients.map((ing, i) => (
                              <span key={i} className="px-2 py-0.5 bg-[#FF9500]/10 text-[#FF9500] rounded-full text-xs">
                                {ing.original}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary */}
                      {recipe.summary && (
                        <div>
                          <p className="text-xs font-semibold text-gray-900 mb-1">{t.pantryAbout}</p>
                          <p className="text-xs text-[#8E8E93] leading-relaxed line-clamp-3">
                            {stripHtml(recipe.summary)}
                          </p>
                        </div>
                      )}

                      {/* Instructions */}
                      {recipe.instructions?.[0]?.steps?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-900 mb-1">{t.pantryInstructions}</p>
                          <ol className="space-y-1.5">
                            {recipe.instructions[0].steps.map((step) => (
                              <li key={step.number} className="flex gap-2 text-xs text-gray-700">
                                <span className="flex-shrink-0 w-5 h-5 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                  {step.number}
                                </span>
                                <span className="leading-relaxed">{step.step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Source link */}
                      {recipe.sourceUrl && (
                        <a
                          href={recipe.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center text-sm text-[#007AFF] font-medium py-2"
                        >
                          {t.pantryViewFull} &rarr;
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
