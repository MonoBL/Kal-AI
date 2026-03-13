"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Forward auth errors from hash to login page
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash.includes("error=")) {
        router.replace("/login" + hash);
        return;
      }
      if (user) router.replace("/dashboard");
      else router.replace("/login");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );
}
