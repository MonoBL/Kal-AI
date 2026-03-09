"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/context/LanguageContext";

export default function InstallPrompt() {
  const { lang } = useLang();
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // Check if dismissed recently (24h cooldown)
    const dismissed = localStorage.getItem("kal-install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 86400000) return;

    // Detect platform
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    setIsIOS(ios);

    if (ios) {
      // iOS: show manual instructions (no beforeinstallprompt)
      setShow(true);
    } else {
      // Android/Desktop: listen for beforeinstallprompt
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt && "prompt" in deferredPrompt) {
      (deferredPrompt as { prompt: () => void }).prompt();
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("kal-install-dismissed", Date.now().toString());
  };

  if (!show) return null;

  const t = {
    en: {
      title: "Install Kal AI",
      desc: "Add to your home screen for the best experience. No app store needed.",
      iosStep1: "Tap the Share button",
      iosStep2: 'Select "Add to Home Screen"',
      install: "Install",
      dismiss: "Not now",
    },
    pt: {
      title: "Instalar Kal AI",
      desc: "Adiciona ao ecrã inicial para a melhor experiência. Sem app store.",
      iosStep1: "Toca no botão Partilhar",
      iosStep2: '"Adicionar ao ecrã inicial"',
      install: "Instalar",
      dismiss: "Agora não",
    },
  }[lang];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 9998,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Prompt card */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "white",
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          zIndex: 9999,
          maxWidth: 420,
          margin: "0 auto",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.15)",
          animation: "slideUp 0.3s ease",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#F2F2F7",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: "#8E8E93",
          }}
        >
          ✕
        </button>

        {/* Icon + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 26, color: "white", fontWeight: 700 }}>K</span>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1C1C1E" }}>{t.title}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#8E8E93", lineHeight: 1.4 }}>{t.desc}</p>
          </div>
        </div>

        {isIOS ? (
          /* iOS instructions */
          <div
            style={{
              background: "#F2F2F7",
              borderRadius: 14,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#007AFF",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                1
              </span>
              <span style={{ fontSize: 15, color: "#1C1C1E" }}>
                {t.iosStep1}{" "}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#007AFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ verticalAlign: "middle", marginLeft: 2 }}
                >
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#007AFF",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                2
              </span>
              <span style={{ fontSize: 15, color: "#1C1C1E" }}>{t.iosStep2}</span>
            </div>
          </div>
        ) : (
          /* Android/Desktop install button */
          <button
            onClick={handleInstall}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 14,
              border: "none",
              background: "#007AFF",
              color: "white",
              fontSize: 17,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 10,
            }}
          >
            {t.install}
          </button>
        )}

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 14,
            border: "none",
            background: "transparent",
            color: "#8E8E93",
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {t.dismiss}
        </button>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
