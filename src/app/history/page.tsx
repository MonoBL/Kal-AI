"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { supabase, Meal } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setMeals(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchMeals();
  }, [user, fetchMeals]);

  const grouped: Record<string, Meal[]> = {};
  meals.forEach(meal => {
    const date = new Date(meal.created_at).toLocaleDateString();
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(meal);
  });

  const handleDelete = async (id: string) => {
    await supabase.from("meals").delete().eq("id", id);
    setMeals(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">{t.history}</h1>
      </div>

      <div className="px-4 py-4 pb-32 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-[#007AFF] border-t-transparent animate-spin" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-[#8E8E93]">{t.noMealsToday}</div>
        ) : (
          Object.entries(grouped).map(([date, dateMeals]) => (
            <div key={date} className="card overflow-hidden">
              <div className="px-4 py-2 bg-[#F2F2F7] flex justify-between items-center">
                <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">{date}</span>
                <span className="text-xs font-semibold text-[#007AFF]">
                  {dateMeals.reduce((s, m) => s + m.calories, 0)} kcal
                </span>
              </div>
              {dateMeals.map((meal, i) => (
                <div key={meal.id} className={`px-4 py-3 flex items-center gap-3 ${i < dateMeals.length - 1 ? "border-b border-gray-50" : ""}`}>
                  {meal.image_url && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                      <Image src={meal.image_url} alt={meal.description} width={48} height={48} style={{ objectFit: "cover" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{meal.description}</div>
                    <div className="text-xs text-[#8E8E93] mt-0.5">
                      P {meal.protein}g · C {meal.carbs}g · F {meal.fats}g
                    </div>
                    <div className="text-xs text-[#8E8E93]">
                      {new Date(meal.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[#007AFF] font-semibold text-sm">{meal.calories} kcal</span>
                    <button
                      onClick={() => handleDelete(meal.id)}
                      className="text-[#FF3B30] text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}
