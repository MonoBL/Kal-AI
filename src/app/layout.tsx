import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import FeedbackWidget from "@/components/FeedbackWidget";
import FloatingActions from "@/components/FloatingActions";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata: Metadata = {
  title: "Kal AI",
  description: "Smart calorie tracking powered by AI",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kal AI",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#007AFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <div className="app-shell">
          <AuthProvider>
            <LanguageProvider>
              {children}
              <FloatingActions />
              <FeedbackWidget />
              <InstallPrompt />
            </LanguageProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
