"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLang } from "@/context/LanguageContext";

const mainTabs = [
  { href: "/dashboard", icon: "chart", labelKey: "dashboard" as const },
  { href: "/log", icon: "camera", labelKey: "logMeal" as const },
  { href: "/pantry", icon: "pantry", labelKey: "pantryNav" as const },
];

const drawerItems = [
  { href: "/snacks", icon: "cookie", labelKey: "commonSnacks" as const },
  { href: "/history", icon: "clock", labelKey: "history" as const },
  { href: "/profile", icon: "person", labelKey: "profile" as const },
  { href: "/feedback", icon: "feedback", labelKey: "feedback" as const },
];

const icons: Record<string, React.ReactNode> = {
  chart: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  cookie: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-9-9c0 1.5.5 3 1.5 4-.5.5-1 1.5-1 2.5 0 1.5 1 2.5 2.5 2.5 1 0 2-.5 2.5-1 1 1 2.5 1.5 4 1.5a9 9 0 01-9 9" />
      <circle cx="7.5" cy="14.5" r="1" fill="currentColor" />
      <circle cx="10.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  pantry: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  person: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  feedback: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
};

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLang();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Check if current page is a drawer item
  const isDrawerPage = drawerItems.some(item => pathname === item.href);

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[200] transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Slide-out drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[201] transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-white rounded-t-2xl shadow-2xl px-4 pt-3 pb-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
          {/* Drag handle */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          {/* Drawer items */}
          <div className="space-y-1">
            {drawerItems.map(item => {
              const active = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    setDrawerOpen(false);
                    router.push(item.href);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
                    active
                      ? "bg-[#007AFF]/10 text-[#007AFF]"
                      : "text-gray-700 active:bg-gray-100"
                  }`}
                >
                  {icons[item.icon]}
                  <span className="text-[16px] font-medium">{t[item.labelKey]}</span>
                </button>
              );
            })}
          </div>

          {/* Close button */}
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-full mt-3 py-3 rounded-xl bg-gray-100 text-gray-500 text-[15px] font-medium active:bg-gray-200 transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <div className="flex">
          {mainTabs.map(item => {
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${active ? "text-[#007AFF]" : "text-[#8E8E93]"}`}
              >
                {icons[item.icon]}
                <span className="text-[11px] font-medium">{t[item.labelKey]}</span>
              </button>
            );
          })}
          <button
            onClick={() => setDrawerOpen(prev => !prev)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${isDrawerPage || drawerOpen ? "text-[#007AFF]" : "text-[#8E8E93]"}`}
          >
            {icons.more}
            <span className="text-[11px] font-medium">{t.more}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
