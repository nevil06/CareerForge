"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export default function AuthGuard({ children, role }: {
  children: React.ReactNode;
  role?: "candidate" | "company";
}) {
  const router = useRouter();
  const { user, token, initialize } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for Supabase session to be resolved before making any redirect decision
    const check = async () => {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      // Hydrate the Zustand store if not already done
      if (!token) {
        const userRole = session.user?.user_metadata?.role || "candidate";
        useAuthStore.getState().setAuth(
          {
            id: session.user.id,
            email: session.user.email!,
            role: userRole as "candidate" | "company",
          },
          session.access_token
        );
      }

      // Role guard — redirect to the correct dashboard
      const resolvedRole = session.user?.user_metadata?.role || "candidate";
      if (role && resolvedRole !== role) {
        router.replace(resolvedRole === "company" ? "/company/dashboard" : "/candidate/dashboard");
        return;
      }

      setReady(true);
    };

    check();
  }, []); // Run once on mount — intentionally no deps

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neo-grey">
        <div className="animate-spin h-10 w-10 border-4 border-neo-black border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
