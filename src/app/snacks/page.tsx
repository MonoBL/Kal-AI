"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import type { CommonSnack, MealType } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

type LabelResult = {
  product_name: string;
  serving_name: string;
  serving_weight_g: number;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fats_per_serving: number;
  per_100g: { calories: number; protein: number; carbs: number; fats: number };
  notes: string;
};

type PageView = "list" | "add" | "quicklog";

export default function SnacksPage() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<PageView>("list");
  const [snacks, setSnacks] = useState<CommonSnack[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [labelResult, setLabelResult] = useState<LabelResult | null>(null);
  const [editName, setEditName] = useState("");
  const [editServing, setEditServing] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Quick-log state
  const [selectedSnack, setSelectedSnack] = useState<CommonSnack | null>(null);
  const [servingCount, setServingCount] = useState("1");
  const [quickLogMealType, setQuickLogMealType] = useState<MealType>("snack");
  const [quickLogDate, setQuickLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quickSaving, setQuickSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchSnacks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("common_snacks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSnacks(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchSnacks();
  }, [user, fetchSnacks]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setLabelResult(null);
    setError("");
  }, []);

  const handleAnalyzeLabel = async () => {
    if (!image) {
      setError(lang === "pt" ? "Adiciona uma foto da etiqueta" : "Add a photo of the label");
      return;
    }
    setAnalyzing(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", image);
      fd.append("language", lang);
      if (context) fd.append("context", context);

      const res = await fetch("/api/analyze-label", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Analysis failed");
      const data: LabelResult = await res.json();
      setLabelResult(data);
      setEditName(data.product_name);
      setEditServing(data.serving_name);
    } catch {
      setError(lang === "pt" ? "Falha na análise. Tenta novamente." : "Analysis failed. Try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveSnack = async () => {
    if (!labelResult || !user) return;
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (image) {
        const fileName = `${user.id}/snack-${Date.now()}.${image.name.split(".").pop()}`;
        const { error: uploadError } = await supabase.storage
          .from("meal-images").upload(fileName, image);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("meal-images").getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }
      await supabase.from("common_snacks").insert({
        user_id: user.id,
        name: editName || labelResult.product_name,
        image_url: imageUrl,
        serving_name: editServing || labelResult.serving_name,
        serving_weight_g: labelResult.serving_weight_g,
        calories_per_serving: labelResult.calories_per_serving,
        protein_per_serving: labelResult.protein_per_serving,
        carbs_per_serving: labelResult.carbs_per_serving,
        fats_per_serving: labelResult.fats_per_serving,
      });
      // Reset and go back to list
      resetAddForm();
      setView("list");
      fetchSnacks();
    } catch {
      setError(lang === "pt" ? "Falha ao guardar" : "Failed to save");
      setSaving(false);
    }
  };

  const resetAddForm = () => {
    setImage(null);
    setImagePreview(null);
    setContext("");
    setLabelResult(null);
    setEditName("");
    setEditServing("");
    setSaving(false);
    setError("");
  };

  const handleQuickLog = async () => {
    if (!selectedSnack || !user) return;
    const count = parseFloat(servingCount) || 1;
    setQuickSaving(true);
    try {
      await supabase.from("meals").insert({
        user_id: user.id,
        description: `${count}x ${selectedSnack.serving_name} ${selectedSnack.name}`,
        calories: Math.round(selectedSnack.calories_per_serving * count),
        protein: Math.round(selectedSnack.protein_per_serving * count * 10) / 10,
        carbs: Math.round(selectedSnack.carbs_per_serving * count * 10) / 10,
        fats: Math.round(selectedSnack.fats_per_serving * count * 10) / 10,
        image_url: selectedSnack.image_url,
        meal_type: quickLogMealType,
        created_at: new Date(quickLogDate + "T" + new Date().toTimeString().slice(0, 8)).toISOString(),
      });
      router.push("/dashboard");
    } catch {
      setError(lang === "pt" ? "Falha ao registar" : "Failed to log");
      setQuickSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("common_snacks").delete().eq("id", id);
    setDeleteId(null);
    fetchSnacks();
  };

  const openQuickLog = (snack: CommonSnack) => {
    setSelectedSnack(snack);
    setServingCount("1");
    setQuickLogMealType("snack");
    setQuickLogDate(new Date().toISOString().slice(0, 10));
    setQuickSaving(false);
    setError("");
    setView("quicklog");
  };

  const selectClass = "w-full bg-[#F2F2F7] rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 outline-none appearance-none border-0";

  // ─── LIST VIEW ──────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="min-h-screen bg-[#F2F2F7]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">{t.commonSnacks}</h1>
          <button
            onClick={() => { resetAddForm(); setView("add"); }}
            className="text-[#007AFF] font-semibold text-sm"
          >
            + {t.addSnack}
          </button>
        </div>

        <div className="px-4 py-4 pb-32 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-3 border-[#007AFF] border-t-transparent animate-spin" />
            </div>
          ) : snacks.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-4xl mb-3">🍪</div>
              <p className="text-[#8E8E93] text-sm mb-4">{t.noSnacksYet}</p>
              <button
                onClick={() => { resetAddForm(); setView("add"); }}
                className="ios-button"
              >
                + {t.addSnack}
              </button>
            </div>
          ) : (
            snacks.map(snack => (
              <div key={snack.id} className="card overflow-hidden">
                <button
                  onClick={() => openQuickLog(snack)}
                  className="w-full text-left"
                >
                  <div className="flex items-center p-3 gap-3">
                    {snack.image_url ? (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                        <Image src={snack.image_url} alt={snack.name} fill style={{ objectFit: "cover" }} />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[#F2F2F7] flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🍪</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{snack.name}</h3>
                      <p className="text-xs text-[#8E8E93] mt-0.5">{snack.serving_name} ({snack.serving_weight_g}g)</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs font-semibold text-[#007AFF]">{snack.calories_per_serving} kcal</span>
                        <span className="text-xs text-[#8E8E93]">
                          P{snack.protein_per_serving}g C{snack.carbs_per_serving}g F{snack.fats_per_serving}g
                        </span>
                      </div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" className="w-5 h-5 flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                {/* Delete action */}
                <div className="border-t border-gray-50 px-3 py-2 flex justify-end">
                  {deleteId === snack.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => setDeleteId(null)} className="text-xs text-[#8E8E93] font-medium px-2 py-1">
                        {t.cancel}
                      </button>
                      <button onClick={() => handleDelete(snack.id)} className="text-xs text-[#FF3B30] font-semibold px-2 py-1">
                        {t.confirmDelete}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteId(snack.id)} className="text-xs text-[#FF3B30] font-medium px-2 py-1">
                      {lang === "pt" ? "Eliminar" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ─── ADD VIEW ───────────────────────────────────────────────────────────────
  if (view === "add") {
    return (
      <div className="min-h-screen bg-[#F2F2F7]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <button onClick={() => { resetAddForm(); setView("list"); }} className="text-[#007AFF] font-medium text-base">
            ‹ {t.back}
          </button>
          <h1 className="font-semibold text-base">{t.addSnack}</h1>
          <div className="w-14" />
        </div>

        <div className="px-4 py-4 pb-32 space-y-3">
          {/* How it works */}
          {!labelResult && (
            <div className="card p-4 space-y-2">
              <h2 className="font-semibold text-gray-900 text-sm">{t.howItWorks}</h2>
              <div className="space-y-2">
                {[
                  { step: "1", text: t.step1 },
                  { step: "2", text: t.step2 },
                  { step: "3", text: t.step3 },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#007AFF] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</span>
                    <p className="text-sm text-gray-600 leading-snug">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo section */}
          {imagePreview ? (
            <div className="card overflow-hidden">
              <div className="relative w-full h-52">
                <Image src={imagePreview} alt="label" fill style={{ objectFit: "contain" }} className="bg-white" />
                <button
                  onClick={() => { setImage(null); setImagePreview(null); setLabelResult(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center space-y-3">
              <p className="text-sm text-[#8E8E93]">{t.labelPhotoHint}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 py-3 rounded-2xl bg-[#007AFF] text-white font-semibold text-sm"
                >
                  {t.takePhoto}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3 rounded-2xl bg-[#F2F2F7] text-[#007AFF] font-semibold text-sm"
                >
                  {t.uploadPhoto}
                </button>
              </div>
            </div>
          )}
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

          {/* Optional context — always visible before result */}
          {!labelResult && (
            <div className="card p-3 space-y-2">
              <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">
                {t.labelContext}
              </label>
              <input
                type="text"
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder={t.labelContextPlaceholder}
                className={selectClass}
              />
              <p className="text-xs text-[#8E8E93]">{t.contextHelp}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center">{error}</div>
          )}

          {/* Analyze button */}
          {image && !labelResult && (
            <button onClick={handleAnalyzeLabel} disabled={analyzing} className="ios-button flex items-center justify-center gap-2">
              {analyzing ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {t.analyzingLabel}
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  {t.readLabel}
                </>
              )}
            </button>
          )}

          {/* Result / Edit */}
          {labelResult && (
            <div className="space-y-3">
              <div className="card p-4 space-y-3">
                <h2 className="font-semibold text-gray-900">{t.labelDetected}</h2>

                {/* Editable name */}
                <div>
                  <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1 block">{t.snackName}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className={selectClass}
                  />
                </div>

                {/* Editable serving name */}
                <div>
                  <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1 block">{t.servingName}</label>
                  <input
                    type="text"
                    value={editServing}
                    onChange={e => setEditServing(e.target.value)}
                    className={selectClass}
                  />
                </div>

                {/* Nutrition per serving */}
                <div className="bg-[#F2F2F7] rounded-2xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-[#8E8E93] uppercase">{t.perServing} ({labelResult.serving_weight_g}g)</p>
                  <div className="flex">
                    {[
                      { label: t.calories, val: `${labelResult.calories_per_serving}`, unit: "kcal", color: "text-[#007AFF]" },
                      { label: t.protein, val: `${labelResult.protein_per_serving}`, unit: "g", color: "text-[#007AFF]" },
                      { label: t.carbs, val: `${labelResult.carbs_per_serving}`, unit: "g", color: "text-[#FF9500]" },
                      { label: t.fats, val: `${labelResult.fats_per_serving}`, unit: "g", color: "text-[#FF3B30]" },
                    ].map((m, i) => (
                      <div key={i} className="flex-1 text-center">
                        <div className={`text-lg font-bold ${m.color}`}>{m.val}{m.unit === "kcal" ? "" : m.unit}</div>
                        <div className="text-[10px] text-[#8E8E93]">{m.label}{m.unit === "kcal" ? " (kcal)" : ""}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per 100g reference */}
                <div className="bg-[#F2F2F7] rounded-2xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-[#8E8E93] uppercase">{t.per100g}</p>
                  <div className="flex">
                    {[
                      { label: t.calories, val: `${labelResult.per_100g.calories}`, color: "text-gray-600" },
                      { label: t.protein, val: `${labelResult.per_100g.protein}g`, color: "text-gray-600" },
                      { label: t.carbs, val: `${labelResult.per_100g.carbs}g`, color: "text-gray-600" },
                      { label: t.fats, val: `${labelResult.per_100g.fats}g`, color: "text-gray-600" },
                    ].map((m, i) => (
                      <div key={i} className="flex-1 text-center">
                        <div className={`text-sm font-semibold ${m.color}`}>{m.val}</div>
                        <div className="text-[10px] text-[#8E8E93]">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes from AI */}
                {labelResult.notes && (
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-blue-700">{labelResult.notes}</p>
                  </div>
                )}
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-3">
                <button
                  onClick={() => { resetAddForm(); setView("list"); }}
                  className="flex-1 py-3 rounded-2xl bg-[#F2F2F7] text-[#8E8E93] font-semibold text-sm"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSaveSnack}
                  disabled={saving}
                  className="flex-1 py-3 rounded-2xl bg-[#34C759] text-white font-semibold text-sm"
                >
                  {saving ? "..." : t.saveSnack}
                </button>
              </div>
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ─── QUICK-LOG VIEW ─────────────────────────────────────────────────────────
  if (view === "quicklog" && selectedSnack) {
    const count = parseFloat(servingCount) || 0;
    const totalCal = Math.round(selectedSnack.calories_per_serving * count);
    const totalP = Math.round(selectedSnack.protein_per_serving * count * 10) / 10;
    const totalC = Math.round(selectedSnack.carbs_per_serving * count * 10) / 10;
    const totalF = Math.round(selectedSnack.fats_per_serving * count * 10) / 10;

    return (
      <div className="min-h-screen bg-[#F2F2F7]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <button onClick={() => setView("list")} className="text-[#007AFF] font-medium text-base">
            ‹ {t.back}
          </button>
          <h1 className="font-semibold text-base">{t.quickLog}</h1>
          <div className="w-14" />
        </div>

        <div className="px-4 py-4 pb-32 space-y-3">
          {/* Snack info */}
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              {selectedSnack.image_url ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <Image src={selectedSnack.image_url} alt={selectedSnack.name} fill style={{ objectFit: "cover" }} />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#F2F2F7] flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">🍪</span>
                </div>
              )}
              <div>
                <h2 className="font-bold text-gray-900">{selectedSnack.name}</h2>
                <p className="text-xs text-[#8E8E93]">{selectedSnack.serving_name} ({selectedSnack.serving_weight_g}g)</p>
                <p className="text-xs text-[#007AFF] font-semibold mt-0.5">{selectedSnack.calories_per_serving} kcal / {t.serving}</p>
              </div>
            </div>
          </div>

          {/* How many */}
          <div className="card p-4 space-y-3">
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide block">
              {t.howMany}
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setServingCount(String(Math.max(0.5, count - 0.5)))}
                className="w-12 h-12 rounded-2xl bg-[#F2F2F7] flex items-center justify-center text-xl font-bold text-[#007AFF]"
              >
                −
              </button>
              <input
                type="number"
                value={servingCount}
                onChange={e => setServingCount(e.target.value)}
                className="flex-1 text-center text-3xl font-bold text-gray-900 bg-transparent outline-none"
                min={0.5}
                step={0.5}
              />
              <button
                onClick={() => setServingCount(String(count + 0.5))}
                className="w-12 h-12 rounded-2xl bg-[#F2F2F7] flex items-center justify-center text-xl font-bold text-[#007AFF]"
              >
                +
              </button>
            </div>
            <p className="text-center text-sm text-[#8E8E93]">
              {count} × {selectedSnack.serving_name}
            </p>
          </div>

          {/* Totals */}
          <div className="card p-4">
            <div className="text-center mb-3">
              <span className="text-4xl font-bold text-[#007AFF]">{totalCal}</span>
              <span className="text-sm text-[#8E8E93] ml-1">kcal</span>
            </div>
            <div className="flex bg-[#F2F2F7] rounded-2xl p-3">
              {[
                { label: t.protein, val: totalP, color: "text-[#007AFF]" },
                { label: t.carbs, val: totalC, color: "text-[#FF9500]" },
                { label: t.fats, val: totalF, color: "text-[#FF3B30]" },
              ].map((m, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className={`text-xl font-bold ${m.color}`}>{m.val}g</div>
                  <div className="text-xs text-[#8E8E93]">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Date & Meal Type */}
          <div className="card p-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1 block">{t.mealDate}</label>
                <input
                  type="date"
                  value={quickLogDate}
                  onChange={e => setQuickLogDate(e.target.value)}
                  className="w-full bg-[#F2F2F7] rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 outline-none border-0"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1 block">{t.mealType}</label>
                <div className="relative">
                  <select
                    value={quickLogMealType}
                    onChange={e => setQuickLogMealType(e.target.value as MealType)}
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

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center">{error}</div>
          )}

          {/* Log button */}
          <button
            onClick={handleQuickLog}
            disabled={quickSaving || count <= 0}
            className="ios-button flex items-center justify-center gap-2"
          >
            {quickSaving ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {t.logSnack}
              </>
            )}
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return null;
}
