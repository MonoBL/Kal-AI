"use client";
import { usePathname, useRouter } from "next/navigation";
import { useLang } from "@/context/LanguageContext";

const navItems = [
  { href: "/dashboard", icon: "chart", labelKey: "dashboard" as const },
  { href: "/log", icon: "camera", labelKey: "logMeal" as const },
  { href: "/history", icon: "clock", labelKey: "history" as const },
  { href: "/profile", icon: "person", labelKey: "profile" as const },
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
  clock: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  person: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLang();

  return (
    <nav className="bottom-nav">
      <div className="flex">
        {navItems.map(item => {
          const active = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${active ? "text-[#007AFF]" : "text-[#8E8E93]"}`}
            >
              {icons[item.icon]}
              <span className="text-[10px] font-medium">{t[item.labelKey]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
