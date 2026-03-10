"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

const ADMIN_EMAIL = "nunom3ndes2005@gmail.com";

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { t, lang, setLang } = useLang();
  const router = useRouter();
  const [goal, setGoal] = useState("2000");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Load debug mode from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDebugMode(localStorage.getItem("kal-debug") === "true");
    }
  }, []);

  // Sync goal input when profile loads from Supabase
  useEffect(() => {
    if (profile?.daily_goal_calories) {
      setGoal(profile.daily_goal_calories.toString());
    }
  }, [profile]);

  const handleSaveGoal = async () => {
    if (!user) return;
    const parsed = parseInt(goal);
    if (isNaN(parsed) || parsed < 500 || parsed > 15000) {
      setSaveError("Enter a value between 500 and 15000");
      return;
    }
    setSaving(true);
    setSaveError("");
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, email: user.email!, daily_goal_calories: parsed, preferred_language: lang });
    if (error) {
      setSaveError(error.message);
    } else {
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">{t.profile}</h1>
      </div>

      <div className="px-4 py-4 pb-32 space-y-4">
        {/* User Info */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#007AFF] flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {user?.email?.[0].toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">{user?.email}</div>
              <div className="text-sm text-[#8E8E93]">{t.welcomeBack}</div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">{t.dailyGoal}</div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={goal}
                onChange={e => { setGoal(e.target.value); setSaveError(""); }}
                className="flex-1 text-2xl font-bold text-gray-900 outline-none"
                min={500}
                max={15000}
              />
              <span className="text-[#8E8E93]">kcal</span>
              <button
                onClick={handleSaveGoal}
                disabled={saving}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  saved ? "bg-[#34C759] text-white" : "bg-[#007AFF] text-white"
                }`}
              >
                {saved ? "✓" : saving ? "..." : t.update}
              </button>
            </div>
            {saveError && <p className="text-xs text-[#FF3B30] mt-2">{saveError}</p>}
          </div>

          {/* Language */}
          <div className={`px-4 py-3 ${isAdmin ? "border-b border-gray-50" : ""}`}>
            <div className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">{t.language}</div>
            <div className="flex gap-2">
              {(["en", "pt"] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    lang === l ? "bg-[#007AFF] text-white" : "bg-[#F2F2F7] text-[#8E8E93]"
                  }`}
                >
                  {l === "en" ? "English" : "Português"}
                </button>
              ))}
            </div>
          </div>

          {/* Debug Mode (admin only) */}
          {isAdmin && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Debug Mode</div>
                  <p className="text-[10px] text-[#8E8E93] mt-0.5">{lang === "pt" ? "Mostra logs de API na análise" : "Show API logs during analysis"}</p>
                </div>
                <button
                  onClick={() => {
                    const next = !debugMode;
                    setDebugMode(next);
                    localStorage.setItem("kal-debug", String(next));
                  }}
                  className={`relative w-12 h-7 rounded-full transition-colors ${debugMode ? "bg-[#34C759]" : "bg-[#E5E5EA]"}`}
                >
                  <div
                    className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform"
                    style={{ left: debugMode ? "calc(100% - 26px)" : "2px" }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full py-4 rounded-2xl bg-white text-[#FF3B30] font-semibold text-base"
        >
          {t.logout}
        </button>

        {/* Version info */}
        <div className="pt-4 pb-2 text-center">
          <p className="text-xs text-[#8E8E93] leading-relaxed">
            Kal AI v{process.env.NEXT_PUBLIC_APP_VERSION || "0.2.0"}<br />
            Build: {process.env.NEXT_PUBLIC_BUILD_ID || "dev"}<br />
            {process.env.NEXT_PUBLIC_BUILD_DATE
              ? new Date(process.env.NEXT_PUBLIC_BUILD_DATE).toLocaleDateString(
                  lang === "pt" ? "pt-PT" : "en-GB",
                  { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
                )
              : "Development"}
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
