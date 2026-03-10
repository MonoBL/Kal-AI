"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import type { MealType } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

// ─── Food Database (key=English for Gemini, label=display name) ───────────────
type FoodEntry = { en: string; pt: string; unitGrams?: number; unitLabel?: { en: string; pt: string } };
type CategoryEntry = { en: string; pt: string; foods: FoodEntry[] };

const FOOD_DB: CategoryEntry[] = [
  {
    en: "Grains & Carbs", pt: "Cereais e Hidratos",
    foods: [
      { en: "White Rice", pt: "Arroz Branco" },
      { en: "Brown Rice", pt: "Arroz Integral" },
      { en: "Pasta", pt: "Massa" },
      { en: "Spaghetti", pt: "Esparguete" },
      { en: "White Bread", pt: "Pão Branco" },
      { en: "Whole Wheat Bread", pt: "Pão Integral" },
      { en: "Oats", pt: "Aveia" },
      { en: "Potato", pt: "Batata" },
      { en: "Sweet Potato", pt: "Batata Doce" },
      { en: "Corn", pt: "Milho" },
      { en: "Quinoa", pt: "Quinoa" },
      { en: "Couscous", pt: "Cuscuz" },
      { en: "Tortilla", pt: "Tortilha" },
    ],
  },
  {
    en: "Meat & Poultry", pt: "Carnes e Aves",
    foods: [
      { en: "Chicken Breast", pt: "Peito de Frango" },
      { en: "Chicken Thigh", pt: "Coxa de Frango" },
      { en: "Ground Beef", pt: "Carne Picada" },
      { en: "Beef Steak", pt: "Bife de Vaca" },
      { en: "Pork Chop", pt: "Costeleta de Porco" },
      { en: "Turkey Breast", pt: "Peito de Peru" },
      { en: "Lamb", pt: "Borrego" },
      { en: "Sausage", pt: "Salsicha" },
      { en: "Bacon", pt: "Bacon" },
      { en: "Ham", pt: "Fiambre" },
    ],
  },
  {
    en: "Fish & Seafood", pt: "Peixe e Marisco",
    foods: [
      { en: "Salmon", pt: "Salmão" },
      { en: "Tuna", pt: "Atum" },
      { en: "Cod", pt: "Bacalhau" },
      { en: "Tilapia", pt: "Tilápia" },
      { en: "Sardines", pt: "Sardinhas" },
      { en: "Shrimp", pt: "Camarão" },
      { en: "Mussels", pt: "Mexilhões" },
      { en: "Squid", pt: "Lulas" },
    ],
  },
  {
    en: "Vegetables", pt: "Legumes e Vegetais",
    foods: [
      { en: "Broccoli", pt: "Brócolos" },
      { en: "Spinach", pt: "Espinafres" },
      { en: "Tomato", pt: "Tomate" },
      { en: "Lettuce", pt: "Alface" },
      { en: "Carrot", pt: "Cenoura" },
      { en: "Cucumber", pt: "Pepino" },
      { en: "Bell Pepper", pt: "Pimento" },
      { en: "Onion", pt: "Cebola" },
      { en: "Mushroom", pt: "Cogumelos" },
      { en: "Zucchini", pt: "Courgette" },
      { en: "Cauliflower", pt: "Couve-flor" },
      { en: "Kale", pt: "Couve Galega" },
    ],
  },
  {
    en: "Legumes", pt: "Leguminosas",
    foods: [
      { en: "Chickpeas", pt: "Grão-de-bico" },
      { en: "Lentils", pt: "Lentilhas" },
      { en: "Black Beans", pt: "Feijão Preto" },
      { en: "White Beans", pt: "Feijão Branco" },
      { en: "Green Peas", pt: "Ervilhas" },
      { en: "Tofu", pt: "Tofu" },
      { en: "Edamame", pt: "Edamame" },
    ],
  },
  {
    en: "Dairy & Eggs", pt: "Laticínios e Ovos",
    foods: [
      { en: "Boiled Egg", pt: "Ovo Cozido", unitGrams: 50, unitLabel: { en: "unit(s)", pt: "unid." } },
      { en: "Fried Egg", pt: "Ovo Estrelado", unitGrams: 50, unitLabel: { en: "unit(s)", pt: "unid." } },
      { en: "Scrambled Egg", pt: "Ovo Mexido", unitGrams: 61, unitLabel: { en: "unit(s)", pt: "unid." } },
      { en: "Poached Egg", pt: "Ovo Escalfado", unitGrams: 50, unitLabel: { en: "unit(s)", pt: "unid." } },
      { en: "Egg White", pt: "Clara de Ovo" },
      { en: "Milk (whole)", pt: "Leite (gordo)" },
      { en: "Milk (skimmed)", pt: "Leite (magro)" },
      { en: "Greek Yogurt", pt: "Iogurte Grego" },
      { en: "Yogurt", pt: "Iogurte" },
      { en: "Cheddar Cheese", pt: "Queijo Cheddar" },
      { en: "Mozzarella", pt: "Mozzarella" },
      { en: "Cottage Cheese", pt: "Queijo Cottage" },
      { en: "Butter", pt: "Manteiga" },
      { en: "Cream Cheese", pt: "Queijo Creme" },
    ],
  },
  {
    en: "Fruits", pt: "Frutas",
    foods: [
      { en: "Apple", pt: "Maçã" },
      { en: "Banana", pt: "Banana" },
      { en: "Orange", pt: "Laranja" },
      { en: "Strawberries", pt: "Morangos" },
      { en: "Blueberries", pt: "Mirtilos" },
      { en: "Mango", pt: "Manga" },
      { en: "Grapes", pt: "Uvas" },
      { en: "Watermelon", pt: "Melancia" },
      { en: "Pineapple", pt: "Ananás" },
      { en: "Pear", pt: "Pêra" },
      { en: "Peach", pt: "Pêssego" },
    ],
  },
  {
    en: "Fats & Oils", pt: "Gorduras e Óleos",
    foods: [
      { en: "Olive Oil", pt: "Azeite" },
      { en: "Avocado", pt: "Abacate" },
      { en: "Almonds", pt: "Amêndoas" },
      { en: "Walnuts", pt: "Nozes" },
      { en: "Cashews", pt: "Cajus" },
      { en: "Peanut Butter", pt: "Manteiga de Amendoim" },
      { en: "Coconut Oil", pt: "Óleo de Coco" },
      { en: "Sunflower Seeds", pt: "Sementes de Girassol" },
    ],
  },
  {
    en: "Sauces & Extras", pt: "Molhos e Extras",
    foods: [
      { en: "Ketchup", pt: "Ketchup" },
      { en: "Mayonnaise", pt: "Maionese" },
      { en: "Mustard", pt: "Mostarda" },
      { en: "Soy Sauce", pt: "Molho de Soja" },
      { en: "Honey", pt: "Mel" },
      { en: "Sugar", pt: "Açúcar" },
      { en: "Jam", pt: "Compota" },
    ],
  },
  {
    en: "Other / Custom", pt: "Outro / Personalizado",
    foods: [{ en: "Other", pt: "Outro" }],
  },
];

type FoodItem = { id: number; catIdx: number; foodIdx: number; grams: string };

// ─── Types ────────────────────────────────────────────────────────────────────
type NutritionItem = {
  name: string;
  weight_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  per_100g: { calories: number; protein: number; carbs: number; fats: number };
  source: "fatsecret" | "openfoodfacts" | "gemini_estimate";
  matched_name?: string;
  sources_used?: string[];
  all_sources?: { source: string; calories: number }[];
};

type AnalysisResult = {
  dish_name: string;
  total_calories: number;
  macros: { protein: number; carbs: number; fats: number };
  confidence_score: number;
  detailed_analysis: string;
  items?: NutritionItem[];
  data_source?: string;
};

type AnalysisStep = "idle" | "identifying" | "verifying" | "finalizing" | "done" | "error";

let nextId = 1;

export default function LogPage() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<FoodItem[]>([
    { id: nextId++, catIdx: 0, foodIdx: 0, grams: "" },
  ]);
  const [skipQuantities, setSkipQuantities] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [mealDate, setMealDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [userHint, setUserHint] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const isAdmin = user?.email === "nunom3ndes2005@gmail.com";

  // Load debug mode from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && user?.email === "nunom3ndes2005@gmail.com") {
      setDebugMode(localStorage.getItem("kal-debug") === "true");
    }
  }, [user]);

  const addItem = () => {
    setItems(prev => [...prev, { id: nextId++, catIdx: 1, foodIdx: 0, grams: "" }]);
  };

  const removeItem = (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateCat = (id: number, catIdx: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, catIdx, foodIdx: 0 } : i));
  };

  const updateFood = (id: number, foodIdx: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, foodIdx } : i));
  };

  const updateGrams = (id: number, grams: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, grams } : i));
  };

  const buildDescription = () =>
    items
      .filter(i => i.grams && parseFloat(i.grams) > 0)
      .map(i => {
        const food = FOOD_DB[i.catIdx].foods[i.foodIdx];
        if (food.unitGrams) {
          const units = parseFloat(i.grams);
          const totalG = Math.round(units * food.unitGrams);
          return `${units} ${food.en} (${totalG}g)`;
        }
        return `${i.grams}g ${food.en}`;
      })
      .join(", ");

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
  }, []);

  // ─── Multi-step analysis ────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    const description = buildDescription();
    if (!image && !description && !skipQuantities) {
      setError(lang === "pt"
        ? "Adiciona uma foto ou insere pelo menos um alimento com gramas"
        : "Add a photo or enter at least one food item with grams");
      return;
    }
    setAnalyzing(true);
    setAnalysisStep("identifying");
    setError("");
    setResult(null);
    const logs: string[] = [];
    const dbg = (msg: string) => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

    try {
      // ── Step 1: Gemini identifies foods ──────────────────────────────────
      dbg("Step 1: Sending to Gemini...");
      const fd = new FormData();
      const fullDescription = [
        !skipQuantities && description ? description : "",
        userHint.trim() ? `(Extra context: ${userHint.trim()})` : "",
      ].filter(Boolean).join(". ");
      if (fullDescription) fd.append("description", fullDescription);
      fd.append("language", lang);
      if (image) fd.append("image", image);

      const geminiRes = await fetch("/api/analyze", { method: "POST", body: fd });
      if (!geminiRes.ok) {
        const errBody = await geminiRes.text().catch(() => "");
        dbg(`Gemini FAILED (HTTP ${geminiRes.status}): ${errBody.slice(0, 300)}`);
        throw new Error("Gemini analysis failed");
      }
      const geminiData = await geminiRes.json();
      dbg(`Gemini OK: "${geminiData.dish_name}", ${geminiData.foods?.length || 0} foods identified`);
      if (geminiData.foods) {
        geminiData.foods.forEach((f: { name: string; weight_g: number; calories: number }) => {
          dbg(`  → ${f.name}: ${f.weight_g}g, ${f.calories} kcal (Gemini est.)`);
        });
      }

      // ── Step 2: Verify with nutrition APIs ───────────────────────────────
      setAnalysisStep("verifying");
      dbg("Step 2: Verifying with FatSecret + OpenFoodFacts...");

      const foodsToLookup = geminiData.foods;
      let verifiedResult: AnalysisResult;

      if (foodsToLookup && foodsToLookup.length > 0) {
        const lookupRes = await fetch("/api/nutrition-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            foods: foodsToLookup.map((f: { name: string; weight_g: number }) => ({
              name: f.name,
              weight_g: f.weight_g,
            })),
            gemini_estimates: foodsToLookup,
          }),
        });

        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();
          const apiItems: NutritionItem[] = lookupData.items;
          const apiTotals = lookupData.totals;

          dbg(`Nutrition lookup OK: ${apiItems.length} items returned`);
          apiItems.forEach(item => {
            const srcList = item.sources_used?.join(", ") || item.source;
            dbg(`  → ${item.name}: ${item.calories} kcal (source: ${item.source}, used: [${srcList}])`);
            if (item.all_sources && item.all_sources.length > 0) {
              item.all_sources.forEach(s => {
                dbg(`    · ${s.source}: ${s.calories} kcal/100g`);
              });
            }
          });

          // Count how many items came from verified sources
          const verifiedCount = apiItems.filter(
            (i) => i.source !== "gemini_estimate"
          ).length;
          const totalCount = apiItems.length;
          dbg(`Verified: ${verifiedCount}/${totalCount} items from DB sources`);

          // Determine data source label
          const sources = [...new Set(apiItems.map((i) => i.source))];
          const multiSourceCount = apiItems.filter(
            (i) => i.sources_used && i.sources_used.length > 1
          ).length;
          const dataSource = multiSourceCount > 0
            ? (lang === "pt" ? "Cruzado entre múltiplas fontes" : "Cross-referenced across sources")
            : sources.includes("fatsecret") || sources.includes("openfoodfacts")
            ? (lang === "pt" ? "Verificado por base de dados nutricional" : "Verified by nutrition database")
            : (lang === "pt" ? "Estimativa IA" : "AI estimate");
          dbg(`Data source label: "${dataSource}"`);

          // Adjust confidence based on verification
          const baseConfidence = geminiData.confidence_score || 70;
          const verifiedBonus = verifiedCount > 0 ? Math.min(15, (verifiedCount / totalCount) * 15) : 0;
          const adjustedConfidence = Math.min(98, Math.round(baseConfidence + verifiedBonus));

          verifiedResult = {
            dish_name: geminiData.dish_name,
            total_calories: apiTotals.calories,
            macros: {
              protein: Math.round(apiTotals.protein),
              carbs: Math.round(apiTotals.carbs),
              fats: Math.round(apiTotals.fats),
            },
            confidence_score: adjustedConfidence,
            detailed_analysis: geminiData.detailed_analysis,
            items: apiItems,
            data_source: dataSource,
          };
        } else {
          // API lookup failed, fall back to Gemini data
          const errBody = await lookupRes.text().catch(() => "");
          dbg(`Nutrition lookup FAILED (HTTP ${lookupRes.status}): ${errBody.slice(0, 200)}`);
          verifiedResult = {
            dish_name: geminiData.dish_name,
            total_calories: geminiData.total_calories,
            macros: geminiData.macros,
            confidence_score: geminiData.confidence_score,
            detailed_analysis: geminiData.detailed_analysis,
            data_source: lang === "pt" ? "Estimativa IA (Gemini)" : "AI estimate (Gemini)",
          };
        }
      } else {
        // No structured foods returned, use Gemini totals
        dbg("No structured foods from Gemini → using Gemini totals only");
        verifiedResult = {
          dish_name: geminiData.dish_name,
          total_calories: geminiData.total_calories,
          macros: geminiData.macros,
          confidence_score: geminiData.confidence_score,
          detailed_analysis: geminiData.detailed_analysis,
          data_source: lang === "pt" ? "Estimativa IA (Gemini)" : "AI estimate (Gemini)",
        };
      }

      // ── Step 3: Finalize ─────────────────────────────────────────────────
      setAnalysisStep("finalizing");
      dbg("Step 3: Finalizing...");
      dbg(`Final: ${verifiedResult.total_calories} kcal, source: "${verifiedResult.data_source}"`);
      await new Promise((r) => setTimeout(r, 400)); // brief pause for UX
      setResult(verifiedResult);
      setAnalysisStep("done");
      setDebugLog(logs);
    } catch (err) {
      dbg(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
      setDebugLog(logs);
      setError(lang === "pt" ? "Análise falhou. Tenta novamente." : "Analysis failed. Please try again.");
      setAnalysisStep("error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!result || !user) return;
    setSaving(true);
    setError("");
    try {
      let imageUrl: string | undefined;
      if (image) {
        const fileName = `${user.id}/${Date.now()}.${image.name.split(".").pop()}`;
        const { error: uploadError } = await supabase.storage
          .from("meal-images").upload(fileName, image);
        if (uploadError) {
          console.error("Image upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage.from("meal-images").getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }
      const insertData = {
        user_id: user.id,
        description: result.dish_name || buildDescription(),
        calories: result.total_calories,
        protein: result.macros.protein,
        carbs: result.macros.carbs,
        fats: result.macros.fats,
        image_url: imageUrl,
        meal_type: mealType,
        created_at: new Date(mealDate + "T" + new Date().toTimeString().slice(0, 8)).toISOString(),
      };
      console.log("Saving meal:", insertData);
      const { error: insertError } = await supabase.from("meals").insert(insertData);
      if (insertError) {
        console.error("Meal insert error:", insertError);
        setError(lang === "pt"
          ? `Falha ao guardar: ${insertError.message}`
          : `Failed to save: ${insertError.message}`);
        setSaving(false);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      console.error("Save error:", err);
      setError(lang === "pt" ? "Falha ao guardar refeição" : "Failed to save meal");
      setSaving(false);
    }
  };

  const selectClass = "w-full bg-[#F2F2F7] rounded-xl px-3 py-2 text-sm font-medium text-gray-800 outline-none appearance-none border-0";

  // ─── Progress Steps Config ────────────────────────────────────────────────
  const steps = [
    {
      key: "identifying" as const,
      label: lang === "pt" ? "Identificando alimentos..." : "Identifying foods...",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      key: "verifying" as const,
      label: lang === "pt" ? "Verificando nutrição..." : "Verifying nutrition data...",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
    {
      key: "finalizing" as const,
      label: lang === "pt" ? "Finalizando..." : "Finalizing results...",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      ),
    },
  ];

  const stepOrder: AnalysisStep[] = ["identifying", "verifying", "finalizing"];
  const currentStepIdx = stepOrder.indexOf(analysisStep);

  // Source badge color
  const sourceColor = (source: string) => {
    if (source === "fatsecret") return "bg-green-100 text-green-700";
    if (source === "openfoodfacts") return "bg-blue-100 text-blue-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const sourceLabel = (source: string) => {
    if (source === "fatsecret") return "FatSecret";
    if (source === "openfoodfacts") return "OpenFoodFacts";
    return lang === "pt" ? "Estimativa IA" : "AI Estimate";
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button onClick={() => router.back()} className="text-[#007AFF] font-medium text-base">‹ Back</button>
        <h1 className="font-semibold text-base">{t.addMeal}</h1>
        <div className="w-14" />
      </div>

      <div className="px-4 py-4 pb-32 space-y-3">
        {/* Photo section */}
        {imagePreview ? (
          <div className="card overflow-hidden">
            <div className="relative w-full h-44">
              <Image src={imagePreview} alt="meal" fill style={{ objectFit: "cover" }} />
              <button
                onClick={() => { setImage(null); setImagePreview(null); setResult(null); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 card py-5 flex flex-col items-center justify-center gap-2 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="#007AFF" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[#007AFF] font-semibold text-sm">{t.takePhoto}</span>
            </button>
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="flex-1 card py-5 flex flex-col items-center justify-center gap-2 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="#007AFF" className="w-8 h-8">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-[#007AFF] font-semibold text-sm">{t.uploadPhoto}</span>
            </button>
          </div>
        )}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

        {/* Date & Meal Type */}
        <div className="card p-3 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1 block">{t.mealDate}</label>
              <input
                type="date"
                value={mealDate}
                onChange={e => setMealDate(e.target.value)}
                className="w-full bg-[#F2F2F7] rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 outline-none border-0"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1 block">{t.mealType}</label>
              <div className="relative">
                <select
                  value={mealType}
                  onChange={e => setMealType(e.target.value as MealType)}
                  className="w-full bg-[#F2F2F7] rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 outline-none appearance-none border-0"
                >
                  <option value="breakfast">{t.breakfast}</option>
                  <option value="lunch">{t.lunch}</option>
                  <option value="dinner">{t.dinner}</option>
                  <option value="snack">{t.snack}</option>
                </select>
                <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93] pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* "I don't know quantities" toggle */}
        <button
          onClick={() => { setSkipQuantities(!skipQuantities); }}
          className={`w-full text-sm font-medium py-3 rounded-2xl transition-colors ${
            skipQuantities ? "bg-[#007AFF] text-white" : "bg-white text-[#007AFF]"
          }`}
        >
          {skipQuantities ? "✓ " : ""}{t.dontKnowQty}
        </button>

        {/* AI Hint */}
        <div className="card p-3">
          <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5 block">
            {lang === "pt" ? "Dica para a IA (opcional)" : "Hint for AI (optional)"}
          </label>
          <input
            type="text"
            value={userHint}
            onChange={e => setUserHint(e.target.value)}
            placeholder={lang === "pt"
              ? "ex. grelhado com azeite, cozido, frito..."
              : "e.g. grilled with olive oil, boiled, fried..."}
            className="w-full bg-[#F2F2F7] rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none border-0 placeholder:text-[#C7C7CC]"
          />
          <p className="text-[11px] text-[#8E8E93] mt-1.5 px-1">
            {lang === "pt"
              ? "Ajuda a IA com detalhes: método de cozinha, molhos, temperos..."
              : "Help the AI with details: cooking method, sauces, seasoning..."}
          </p>
        </div>

        {/* Food Items Builder */}
        {!skipQuantities && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide px-1">
              {lang === "pt" ? "Ingredientes" : "Ingredients"}
            </p>

            {items.map((item, idx) => {
              const cat = FOOD_DB[item.catIdx];
              const food = cat.foods[item.foodIdx];
              return (
                <div key={item.id} className="card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#8E8E93]">Item {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.id)} className="text-[#FF3B30] text-xs font-semibold">
                        {lang === "pt" ? "Remover" : "Remove"}
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <select
                      value={item.catIdx}
                      onChange={e => updateCat(item.id, parseInt(e.target.value))}
                      className={selectClass}
                    >
                      {FOOD_DB.map((c, i) => (
                        <option key={i} value={i}>{lang === "pt" ? c.pt : c.en}</option>
                      ))}
                    </select>
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93] pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </div>

                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <select
                        value={item.foodIdx}
                        onChange={e => updateFood(item.id, parseInt(e.target.value))}
                        className={selectClass}
                      >
                        {cat.foods.map((f, i) => (
                          <option key={i} value={i}>{lang === "pt" ? f.pt : f.en}</option>
                        ))}
                      </select>
                      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93] pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex items-center bg-[#F2F2F7] rounded-xl px-3 py-2 w-24 gap-1">
                      <input
                        type="number"
                        placeholder={food.unitGrams ? "1" : "100"}
                        value={item.grams}
                        onChange={e => updateGrams(item.id, e.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none"
                        min={food.unitGrams ? 1 : 1}
                        max={food.unitGrams ? 50 : 5000}
                        step={food.unitGrams ? 1 : undefined}
                      />
                      <span className="text-xs text-[#8E8E93] font-medium whitespace-nowrap">
                        {food.unitGrams ? (lang === "pt" ? food.unitLabel?.pt || "unid." : food.unitLabel?.en || "unit(s)") : "g"}
                      </span>
                    </div>
                  </div>

                  {item.grams && parseFloat(item.grams) > 0 && (
                    <p className="text-xs text-[#007AFF] font-medium pl-1">
                      → {food.unitGrams
                        ? `${item.grams}x ${lang === "pt" ? food.pt : food.en} (${Math.round(parseFloat(item.grams) * food.unitGrams)}g)`
                        : `${item.grams}g ${lang === "pt" ? food.pt : food.en}`}
                    </p>
                  )}
                </div>
              );
            })}

            <button
              onClick={addItem}
              className="w-full py-3 rounded-2xl border border-dashed border-[#007AFF]/40 text-[#007AFF] text-sm font-semibold"
            >
              + {lang === "pt" ? "Adicionar ingrediente" : "Add ingredient"}
            </button>
          </div>
        )}

        {error && (
          <div className="space-y-2">
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center">{error}</div>
            {/* Debug panel on error */}
            {debugMode && isAdmin && debugLog.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-3 space-y-0.5 overflow-x-auto">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Debug Log</span>
                  <button onClick={() => setDebugLog([])} className="text-[10px] text-gray-500">Clear</button>
                </div>
                {debugLog.map((line, i) => (
                  <p key={i} className={`text-[10px] font-mono leading-tight ${
                    line.includes("FAILED") || line.includes("ERROR") ? "text-red-400" :
                    line.includes("OK") || line.includes("Verified") ? "text-green-400" :
                    line.includes("Step") ? "text-yellow-300" :
                    line.startsWith("  ") ? "text-gray-400" : "text-gray-300"
                  }`}>{line}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Progress Bar (during analysis) ─────────────────────────────── */}
        {analyzing && (
          <div className="card p-4 space-y-3">
            {/* Overall progress bar */}
            <div className="w-full h-2 bg-[#F2F2F7] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#007AFF] rounded-full transition-all duration-700 ease-out"
                style={{
                  width:
                    analysisStep === "identifying" ? "33%"
                    : analysisStep === "verifying" ? "66%"
                    : analysisStep === "finalizing" ? "90%"
                    : "100%",
                }}
              />
            </div>

            {/* Step indicators */}
            <div className="space-y-2">
              {steps.map((step, idx) => {
                const isActive = step.key === analysisStep;
                const isDone = currentStepIdx > idx;
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 py-1.5 px-2 rounded-xl transition-all duration-300 ${
                      isActive ? "bg-[#007AFF]/10" : ""
                    }`}
                  >
                    {/* Step icon */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      isDone ? "bg-[#34C759] text-white"
                      : isActive ? "bg-[#007AFF] text-white"
                      : "bg-[#E5E5EA] text-[#8E8E93]"
                    }`}>
                      {isDone ? (
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : isActive ? (
                        <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    {/* Step label */}
                    <span className={`text-sm font-medium transition-colors ${
                      isDone ? "text-[#34C759]"
                      : isActive ? "text-[#007AFF] font-semibold"
                      : "text-[#8E8E93]"
                    }`}>
                      {isDone
                        ? (lang === "pt" ? "Concluído" : "Done")
                        : step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Analyze Button */}
        {!result && !analyzing && (
          <button onClick={handleAnalyze} disabled={analyzing} className="ios-button flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            {t.analyze}
          </button>
        )}

        {/* ─── Result ──────────────────────────────────────────────────────── */}
        {result && (
          <div className="card p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{result.dish_name}</h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-[#8E8E93]">{t.confidence}:</span>
                  <span className={`text-xs font-semibold ${result.confidence_score >= 80 ? "text-[#34C759]" : result.confidence_score >= 60 ? "text-[#FF9500]" : "text-[#FF3B30]"}`}>
                    {result.confidence_score}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-[#007AFF]">{result.total_calories}</span>
                <div className="text-xs text-[#8E8E93]">kcal</div>
              </div>
            </div>

            {/* Data source badge */}
            {result.data_source && (
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5 text-[#34C759]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span className="text-xs font-medium text-[#34C759]">{result.data_source}</span>
              </div>
            )}

            {/* Debug panel */}
            {debugMode && isAdmin && debugLog.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-3 space-y-0.5 overflow-x-auto">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Debug Log</span>
                  <button onClick={() => setDebugLog([])} className="text-[10px] text-gray-500">Clear</button>
                </div>
                {debugLog.map((line, i) => (
                  <p key={i} className={`text-[10px] font-mono leading-tight ${
                    line.includes("FAILED") || line.includes("ERROR") ? "text-red-400" :
                    line.includes("OK") || line.includes("Verified") ? "text-green-400" :
                    line.includes("Step") ? "text-yellow-300" :
                    line.startsWith("  ") ? "text-gray-400" : "text-gray-300"
                  }`}>{line}</p>
                ))}
              </div>
            )}

            {/* Macros */}
            <div className="flex bg-[#F2F2F7] rounded-2xl p-3">
              {[
                { label: t.protein, val: result.macros.protein, color: "text-[#007AFF]" },
                { label: t.carbs, val: result.macros.carbs, color: "text-[#FF9500]" },
                { label: t.fats, val: result.macros.fats, color: "text-[#FF3B30]" },
              ].map((m, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className={`text-xl font-bold ${m.color}`}>{m.val}g</div>
                  <div className="text-xs text-[#8E8E93]">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Per-item breakdown */}
            {result.items && result.items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">
                  {lang === "pt" ? "Detalhe por alimento" : "Per-item breakdown"}
                </p>
                {result.items.map((item, i) => (
                  <div key={i} className="bg-[#F2F2F7] rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 capitalize">{item.name}</span>
                        {/* Show all sources that were consulted */}
                        {item.sources_used && item.sources_used.length > 1 ? (
                          item.sources_used.map((s, j) => (
                            <span key={j} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sourceColor(s)}`}>
                              {sourceLabel(s)}
                            </span>
                          ))
                        ) : (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sourceColor(item.source)}`}>
                            {sourceLabel(item.source)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#8E8E93]">{item.weight_g}g</span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-gray-600"><span className="font-semibold">{item.calories}</span> kcal</span>
                      <span className="text-[#007AFF]">P: {item.protein}g</span>
                      <span className="text-[#FF9500]">C: {item.carbs}g</span>
                      <span className="text-[#FF3B30]">F: {item.fats}g</span>
                    </div>
                    {/* Show comparison from all sources */}
                    {item.all_sources && item.all_sources.length > 1 && (
                      <div className="flex gap-2 text-[10px] text-[#8E8E93] pt-0.5 flex-wrap">
                        {item.all_sources.map((s, j) => (
                          <span key={j} className="bg-white/60 px-1.5 py-0.5 rounded">
                            {sourceLabel(s.source)}: {s.calories} kcal/100g
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Detailed analysis */}
            <div className="bg-[#F2F2F7] rounded-2xl p-3">
              <p className="text-xs font-semibold text-[#8E8E93] mb-1">{t.detailedAnalysis}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.detailed_analysis}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setResult(null); setImage(null); setImagePreview(null); setAnalysisStep("idle"); }}
                className="flex-1 py-3 rounded-2xl bg-[#F2F2F7] text-[#8E8E93] font-semibold text-sm"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-[#34C759] text-white font-semibold text-sm"
              >
                {saving ? "..." : t.save}
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
