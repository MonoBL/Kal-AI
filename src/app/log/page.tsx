"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import type { MealType } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

// ─── Food Database (key=English for Gemini, label=display name) ───────────────
type FoodEntry = { en: string; pt: string };
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
      { en: "Egg (whole)", pt: "Ovo (inteiro)" },
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

// catIdx = index into FOOD_DB, foodIdx = index into that category's foods
type FoodItem = { id: number; catIdx: number; foodIdx: number; grams: string };

// ─── Types ────────────────────────────────────────────────────────────────────
type AnalysisResult = {
  dish_name: string;
  total_calories: number;
  macros: { protein: number; carbs: number; fats: number };
  confidence_score: number;
  detailed_analysis: string;
};

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
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [mealDate, setMealDate] = useState(() => new Date().toISOString().slice(0, 10));

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

  // Always send English food names to Gemini for best accuracy
  const buildDescription = () =>
    items
      .filter(i => i.grams && parseFloat(i.grams) > 0)
      .map(i => `${i.grams}g ${FOOD_DB[i.catIdx].foods[i.foodIdx].en}`)
      .join(", ");

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
  }, []);

  const handleAnalyze = async () => {
    const description = buildDescription();
    if (!image && !description && !skipQuantities) {
      setError("Add a photo or enter at least one food item with grams");
      return;
    }
    setAnalyzing(true);
    setError("");
    try {
      const fd = new FormData();
      if (!skipQuantities && description) fd.append("description", description);
      fd.append("language", lang);
      if (image) fd.append("image", image);

      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!result || !user) return;
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (image) {
        const fileName = `${user.id}/${Date.now()}.${image.name.split(".").pop()}`;
        const { error: uploadError } = await supabase.storage
          .from("meal-images").upload(fileName, image);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("meal-images").getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }
      await supabase.from("meals").insert({
        user_id: user.id,
        description: result.dish_name || buildDescription(),
        calories: result.total_calories,
        protein: result.macros.protein,
        carbs: result.macros.carbs,
        fats: result.macros.fats,
        image_url: imageUrl,
        meal_type: mealType,
        created_at: new Date(mealDate + "T" + new Date().toTimeString().slice(0, 8)).toISOString(),
      });
      router.push("/dashboard");
    } catch {
      setError("Failed to save meal");
      setSaving(false);
    }
  };

  const selectClass = "w-full bg-[#F2F2F7] rounded-xl px-3 py-2 text-sm font-medium text-gray-800 outline-none appearance-none border-0";

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
            {/* Date picker */}
            <div className="flex-1">
              <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1 block">{t.mealDate}</label>
              <input
                type="date"
                value={mealDate}
                onChange={e => setMealDate(e.target.value)}
                className="w-full bg-[#F2F2F7] rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 outline-none border-0"
              />
            </div>
            {/* Meal type */}
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

                  {/* Category */}
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

                  {/* Food + Grams */}
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
                        placeholder="100"
                        value={item.grams}
                        onChange={e => updateGrams(item.id, e.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none"
                        min={1}
                        max={5000}
                      />
                      <span className="text-xs text-[#8E8E93] font-medium">g</span>
                    </div>
                  </div>

                  {/* Preview label */}
                  {item.grams && parseFloat(item.grams) > 0 && (
                    <p className="text-xs text-[#007AFF] font-medium pl-1">
                      → {item.grams}g {lang === "pt" ? food.pt : food.en}
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
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center">{error}</div>
        )}

        {/* Analyze Button */}
        {!result && (
          <button onClick={handleAnalyze} disabled={analyzing} className="ios-button flex items-center justify-center gap-2">
            {analyzing ? (
              <>
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                {t.analyzing}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {t.analyze}
              </>
            )}
          </button>
        )}

        {/* Result */}
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

            <div className="bg-[#F2F2F7] rounded-2xl p-3">
              <p className="text-xs font-semibold text-[#8E8E93] mb-1">{t.detailedAnalysis}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.detailed_analysis}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setResult(null); setImage(null); setImagePreview(null); }}
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
