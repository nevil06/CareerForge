"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export default function AuthGuard({ children, role }: {
  children: React.ReactNode;
  role?: "candidate" | "company";
}) {
  const router = useRouter();
  const { user, token } = useAuthStore();

  useEffect(() => {
    // Rehydrate from localStorage on first load
    const stored = localStorage.getItem("token");
    if (!stored && !token) {
      router.replace("/auth/login");
      return;
    }
    if (role && user && user.role !== role) {
      // Wrong role — redirect to their dashboard
      router.replace(user.role === "company" ? "/company/dashboard" : "/candidate/dashboard");
    }
  }, [token, user, role, router]);

  if (!token && typeof window !== "undefined" && !localStorage.getItem("token")) {
    return null;
  }

  return <>{children}</>;
}
