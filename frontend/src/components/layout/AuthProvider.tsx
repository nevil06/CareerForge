"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  
  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}
