"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function FloatingActions() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <button
      onClick={() => router.push("/log")}
      style={{
        position: "fixed",
        bottom: 96,
        right: 20,
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: "#007AFF",
        color: "white",
        border: "none",
        cursor: "pointer",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 16px rgba(0, 122, 255, 0.35)",
        transition: "transform 0.15s",
      }}
      aria-label="Log Meal"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}
