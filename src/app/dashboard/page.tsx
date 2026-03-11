"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { supabase, Meal } from "@/lib/supabase";
import CircularProgress from "@/components/CircularProgress";
import BottomNav from "@/components/BottomNav";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";

type ViewMode = "today" | "weekly" | "monthly";

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { t, lang, setLang } = useLang();
  const router = useRouter();

  const [view, setView] = useState<ViewMode>("today");
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; dateStr: string; calories: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ week: string; calories: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDayMeals, setSelectedDayMeals] = useState<Meal[]>([]);
  const [loadingDayMeals, setLoadingDayMeals] = useState(false);

  const dailyGoal = profile?.daily_goal_calories || 2000;

  const mealTypeLabel = (type?: string) => {
    if (!type) return "";
    const labels: Record<string, { en: string; pt: string; icon: string }> = {
      breakfast: { en: "Breakfast", pt: "Peq-almoço", icon: "☀️" },
      lunch: { en: "Lunch", pt: "Almoço", icon: "🍽️" },
      dinner: { en: "Dinner", pt: "Jantar", icon: "🌙" },
      snack: { en: "Snack", pt: "Lanche", icon: "🍎" },
    };
    const l = labels[type];
    return l ? `${l.icon} ${lang === "pt" ? l.pt : l.en}` : type;
  };

  const mealTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(lang === "pt" ? "pt-PT" : "en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const handleDeleteMeal = async (mealId: string) => {
    setDeletingId(mealId);
    const { error } = await supabase.from("meals").delete().eq("id", mealId);
    if (!error) {
      setTodayMeals(prev => prev.filter(m => m.id !== mealId));
    }
    setDeletingId(null);
  };

  const handleDayClick = async (dateStr: string) => {
    if (selectedDay === dateStr) { setSelectedDay(null); return; }
    setSelectedDay(dateStr);
    setLoadingDayMeals(true);
    const dayStart = new Date(dateStr);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateStr);
    dayEnd.setHours(23, 59, 59, 999);
    const { data } = await supabase
      .from("meals").select("*").eq("user_id", user!.id)
      .gte("created_at", dayStart.toISOString())
      .lte("created_at", dayEnd.toISOString())
      .order("created_at", { ascending: false });
    setSelectedDayMeals(data || []);
    setLoadingDayMeals(false);
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's meals
    const { data: meals } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });
    setTodayMeals(meals || []);

    // Weekly data (last 7 days)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const { data: weekMeals } = await supabase
      .from("meals")
      .select("created_at, calories")
      .eq("user_id", user.id)
      .gte("created_at", weekStart.toISOString());

    const dayNames = lang === "pt"
      ? ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const weekly: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      weekly[d.toDateString()] = 0;
    }
    (weekMeals || []).forEach(m => {
      const d = new Date(m.created_at).toDateString();
      if (weekly[d] !== undefined) weekly[d] += m.calories;
    });
    const weeklyArr = Object.entries(weekly).map(([ds, cal]) => ({
      day: dayNames[new Date(ds).getDay()],
      dateStr: ds,
      calories: Math.round(cal),
    }));
    setWeeklyData(weeklyArr);

    // Monthly data (last 4 weeks)
    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 27);
    const { data: monthMeals } = await supabase
      .from("meals")
      .select("created_at, calories")
      .eq("user_id", user.id)
      .gte("created_at", monthStart.toISOString());

    const monthly: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    (monthMeals || []).forEach(m => {
      const daysAgo = Math.floor((Date.now() - new Date(m.created_at).getTime()) / 86400000);
      const week = 4 - Math.floor(daysAgo / 7);
      if (week >= 1 && week <= 4) monthly[week] += m.calories;
    });
    setMonthlyData(
      Object.entries(monthly).map(([w, cal]) => ({
        week: `W${w}`,
        calories: Math.round(cal),
      }))
    );

    setLoading(false);
  }, [user, lang]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const todayCalories = todayMeals.reduce((s, m) => s + m.calories, 0);
  const todayProtein = todayMeals.reduce((s, m) => s + m.protein, 0);
  const todayCarbs = todayMeals.reduce((s, m) => s + m.carbs, 0);
  const todayFats = todayMeals.reduce((s, m) => s + m.fats, 0);

  const avgWeekly = weeklyData.length
    ? Math.round(weeklyData.reduce((s, d) => s + d.calories, 0) / weeklyData.filter(d => d.calories > 0).length || 0)
    : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7]">
        <div className="w-10 h-10 rounded-full border-4 border-[#007AFF] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Image src="/plate-logo.svg" alt="Kal AI" width={36} height={36} unoptimized />
          <h1 className="text-2xl font-bold text-gray-900">{t.appName}</h1>
        </div>
        <button
          onClick={() => setLang(lang === "en" ? "pt" : "en")}
          className="text-[#007AFF] text-sm font-semibold px-3 py-1.5 rounded-full bg-[#F2F2F7]"
        >
          {lang === "en" ? "PT" : "EN"}
        </button>
      </div>

      {/* View Toggle */}
      <div className="px-4 pt-4">
        <div className="card p-1 flex rounded-2xl">
          {(["today", "weekly", "monthly"] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => { setView(v); setSelectedDay(null); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                view === v ? "bg-[#007AFF] text-white shadow-sm" : "text-[#8E8E93]"
              }`}
            >
              {t[v as keyof typeof t] as string}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 pb-32 space-y-4">
        {view === "today" && (
          <>
            {/* Circular Progress */}
            <div className="card p-6 flex flex-col items-center">
              <CircularProgress value={todayCalories} max={dailyGoal} />
              <div className="mt-4 flex gap-6 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900">{dailyGoal.toLocaleString()}</div>
                  <div className="text-xs text-[#8E8E93]">{t.goal}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[#34C759]">{todayCalories.toLocaleString()}</div>
                  <div className="text-xs text-[#8E8E93]">{t.consumed}</div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${todayCalories > dailyGoal ? "text-[#FF3B30]" : "text-[#007AFF]"}`}>
                    {Math.max(0, dailyGoal - todayCalories).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#8E8E93]">{t.remaining}</div>
                </div>
              </div>
            </div>

            {/* Macros Summary */}
            <div className="card p-4 space-y-3">
              {[
                { label: t.protein, value: todayProtein, max: 180, color: "#007AFF" },
                { label: t.carbs, value: todayCarbs, max: 250, color: "#FF9500" },
                { label: t.fats, value: todayFats, max: 80, color: "#FF3B30" },
              ].map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-[#8E8E93]">{m.label}</span>
                    <span className="text-xs font-bold" style={{ color: m.color }}>{m.value}g</span>
                  </div>
                  <div className="h-2 bg-[#F2F2F7] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%`, background: m.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Today's Meals */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                <h2 className="font-semibold text-gray-900">{t.today}</h2>
                <button
                  onClick={() => router.push("/log")}
                  className="text-[#007AFF] text-sm font-semibold"
                >
                  + Add
                </button>
              </div>
              {todayMeals.length === 0 ? (
                <div className="py-8 text-center text-[#8E8E93] text-sm">{t.noMealsToday}</div>
              ) : (
                <div>
                  {todayMeals.map((meal, i) => (
                    <div key={meal.id} className={`px-4 py-3 ${i < todayMeals.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm">{meal.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {meal.meal_type && (
                              <span className="text-[10px] font-semibold text-[#8E8E93] bg-[#F2F2F7] px-2 py-0.5 rounded-full">
                                {mealTypeLabel(meal.meal_type)}
                              </span>
                            )}
                            <span className="text-[10px] text-[#8E8E93]">{mealTime(meal.created_at)}</span>
                          </div>
                          <div className="text-xs text-[#8E8E93] mt-1">
                            P {meal.protein}g · C {meal.carbs}g · F {meal.fats}g
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                          <span className="text-[#007AFF] font-semibold">{meal.calories} kcal</span>
                          <button
                            onClick={() => handleDeleteMeal(meal.id)}
                            disabled={deletingId === meal.id}
                            className="text-[#FF3B30] opacity-60 hover:opacity-100 transition-opacity p-1"
                            title={lang === "pt" ? "Apagar" : "Delete"}
                          >
                            {deletingId === meal.id ? (
                              <div className="w-4 h-4 rounded-full border-2 border-[#FF3B30] border-t-transparent animate-spin" />
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {view === "weekly" && (
          <>
            <div className="card p-4">
              <h2 className="font-semibold text-gray-900 mb-1">{t.weekly} Overview</h2>
              <div className="flex gap-4 mb-4">
                <div>
                  <div className="text-2xl font-bold text-[#007AFF]">{avgWeekly.toLocaleString()}</div>
                  <div className="text-xs text-[#8E8E93]">{t.avgCalories}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#34C759]">{weeklyData.filter(d => d.calories > 0).length}</div>
                  <div className="text-xs text-[#8E8E93]">{t.mealsLogged} days</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#007AFF" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8E8E93" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8E8E93" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
                    formatter={(v) => [`${v} kcal`, t.calories]}
                  />
                  <Area type="monotone" dataKey="calories" stroke="#007AFF" strokeWidth={2.5} fill="url(#calGrad)" dot={{ fill: "#007AFF", strokeWidth: 0, r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Goal comparison */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-[#8E8E93] mb-3">vs. Daily Goal ({dailyGoal} kcal)</h3>
              <div className="space-y-2">
                {weeklyData.map((d, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 cursor-pointer rounded-lg px-1 py-1 transition-colors ${selectedDay === d.dateStr ? "bg-[#007AFF]/10" : "hover:bg-gray-50"}`}
                    onClick={() => handleDayClick(d.dateStr)}
                  >
                    <span className={`text-xs w-8 ${selectedDay === d.dateStr ? "text-[#007AFF] font-bold" : "text-[#8E8E93]"}`}>{d.day}</span>
                    <div className="flex-1 bg-[#F2F2F7] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${d.calories > dailyGoal ? "bg-[#FF3B30]" : "bg-[#34C759]"}`}
                        style={{ width: `${Math.min((d.calories / dailyGoal) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-16 text-right">{d.calories} kcal</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected day meals */}
            {selectedDay && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {new Date(selectedDay).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", { weekday: "long", day: "numeric", month: "short" })}
                  </h3>
                  <button onClick={() => setSelectedDay(null)} className="text-[#8E8E93] text-xs">✕</button>
                </div>
                {loadingDayMeals ? (
                  <div className="py-6 flex justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
                  </div>
                ) : selectedDayMeals.length === 0 ? (
                  <div className="py-6 text-center text-[#8E8E93] text-sm">
                    {lang === "pt" ? "Sem refeições neste dia" : "No meals this day"}
                  </div>
                ) : (
                  <div>
                    {selectedDayMeals.map((meal, i) => (
                      <div key={meal.id} className={`px-4 py-3 ${i < selectedDayMeals.length - 1 ? "border-b border-gray-50" : ""}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm">{meal.description}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {meal.meal_type && (
                                <span className="text-[10px] font-semibold text-[#8E8E93] bg-[#F2F2F7] px-2 py-0.5 rounded-full">
                                  {mealTypeLabel(meal.meal_type)}
                                </span>
                              )}
                              <span className="text-[10px] text-[#8E8E93]">{mealTime(meal.created_at)}</span>
                            </div>
                            <div className="text-xs text-[#8E8E93] mt-1">
                              P {meal.protein}g · C {meal.carbs}g · F {meal.fats}g
                            </div>
                          </div>
                          <span className="text-[#007AFF] font-semibold ml-3 flex-shrink-0">{meal.calories} kcal</span>
                        </div>
                      </div>
                    ))}
                    <div className="px-4 py-2 bg-[#F2F2F7] text-xs text-[#8E8E93] text-center">
                      {lang === "pt" ? "Total" : "Total"}: {selectedDayMeals.reduce((s, m) => s + m.calories, 0)} kcal
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {view === "monthly" && (
          <div className="card p-4">
            <h2 className="font-semibold text-gray-900 mb-1">{t.monthly} Overview</h2>
            <p className="text-xs text-[#8E8E93] mb-4">Last 4 weeks</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#8E8E93" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8E8E93" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
                  formatter={(v) => [`${v} kcal`, t.calories]}
                />
                <Bar dataKey="calories" fill="#007AFF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-[#F2F2F7] rounded-2xl flex justify-between">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">
                  {monthlyData.reduce((s, d) => s + d.calories, 0).toLocaleString()}
                </div>
                <div className="text-xs text-[#8E8E93]">{t.totalCalories}</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-[#007AFF]">
                  {monthlyData.length
                    ? Math.round(monthlyData.reduce((s, d) => s + d.calories, 0) / 4).toLocaleString()
                    : 0}
                </div>
                <div className="text-xs text-[#8E8E93]">{t.avgCalories}/week</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
