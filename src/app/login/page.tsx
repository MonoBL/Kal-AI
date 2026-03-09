"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/context/LanguageContext";

export default function LoginPage() {
  const { t, lang, setLang } = useLang();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); }
      else router.replace("/dashboard");
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); }
      else {
        setSuccess("Account created! Check your email to confirm, then sign in.");
        setMode("signin");
        setLoading(false);
      }
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Language Toggle */}
      <div className="flex justify-end p-4">
        <button
          onClick={() => setLang(lang === "en" ? "pt" : "en")}
          className="text-[#007AFF] font-semibold text-sm px-3 py-1.5 rounded-full bg-[#F2F2F7]"
        >
          {lang === "en" ? "PT" : "EN"}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Image
            src="/plate-logo.svg"
            alt="Kal AI"
            width={160}
            height={160}
            className="mx-auto mb-2 drop-shadow-lg"
            priority
          />
          <h1 className="text-3xl font-bold text-gray-900">{t.appName}</h1>
        </div>

        <div className="w-full max-w-sm space-y-4">
          {/* Mode Toggle */}
          <div className="card p-1 flex rounded-2xl">
            <button
              onClick={() => { setMode("signin"); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${mode === "signin" ? "bg-[#007AFF] text-white shadow-sm" : "text-[#8E8E93]"}`}
            >
              {t.signIn}
            </button>
            <button
              onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${mode === "signup" ? "bg-[#007AFF] text-white shadow-sm" : "text-[#8E8E93]"}`}
            >
              {lang === "en" ? "Sign Up" : "Criar Conta"}
            </button>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white border border-gray-200 font-semibold text-gray-700 text-base shadow-sm active:opacity-70 disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "..." : (lang === "en" ? "Continue with Google" : "Continuar com Google")}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-[#C7C7CC] font-medium">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center">{error}</div>
            )}
            {success && (
              <div className="bg-green-50 text-[#34C759] text-sm p-3 rounded-xl text-center">{success}</div>
            )}
            <div className="card p-4 space-y-3">
              <input
                type="email"
                placeholder={t.email}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full text-base outline-none border-b border-gray-100 pb-3"
              />
              <input
                type="password"
                placeholder={t.password}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full text-base outline-none pt-1"
              />
            </div>
            <button type="submit" className="ios-button" disabled={loading}>
              {loading ? "..." : mode === "signin" ? t.signIn : (lang === "en" ? "Create Account" : "Criar Conta")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
