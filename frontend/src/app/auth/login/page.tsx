"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login, register as registerUser } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BriefcaseIcon, UserIcon, AlertCircle, CheckCircle } from "lucide-react";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role") || "candidate";
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const setAuth = useAuthStore((s) => s.setAuth);

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const stored = useAuthStore.getState().user;
      if (stored) {
        router.replace(stored.role === "company" ? "/company/dashboard" : "/candidate/dashboard");
      }
    }
  }, [router]);

  const onSubmit = async (data: FormData) => {
    setError("");
    setSuccess("");
    try {
      if (isRegister) {
        await registerUser({ ...data, role });
        setSuccess("Account created! Logging you in…");
        await new Promise((r) => setTimeout(r, 800));
      }
      const res = await login(data);
      setAuth(res.data.user, res.data.access_token);

      // If logging in from a role-specific page, warn if role mismatch
      const actualRole = res.data.user.role;
      if (!isRegister && actualRole !== role) {
        // Still log them in but redirect to their actual dashboard
        setSuccess(`Signed in as ${actualRole}. Redirecting to your dashboard…`);
        await new Promise((r) => setTimeout(r, 1200));
      }

      const path = actualRole === "company" ? "/company/dashboard" : "/candidate/dashboard";
      router.push(path);
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (detail?.msg) {
        setError(detail.msg);
      } else {
        setError(isRegister ? "Registration failed. Email may already be in use." : "Invalid email or password.");
      }
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError("");
    setSuccess("");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-neo-grey px-4">
      <Card className="w-full max-w-md bg-neo-white">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 border-4 border-neo-black bg-neo-grey text-neo-black mb-3 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
            {role === "company" ? <BriefcaseIcon size={24} strokeWidth={2.5} /> : <UserIcon size={24} strokeWidth={2.5} />}
          </div>
          <h2 className="text-3xl font-black text-neo-black uppercase">
            {isRegister ? "Create account" : "Welcome back"}
          </h2>
          <p className="text-neo-dark-grey text-sm mt-1 font-bold uppercase tracking-widest">
            {isRegister
              ? `Join as a ${role}`
              : "Sign in to continue"}
          </p>
        </div>

        {/* Role switcher — shown on register, and as info on login */}
        {isRegister ? (
          <div className="flex gap-2 mb-6 p-2 bg-neo-grey border-2 border-neo-black">
            <a href="/auth/login?role=candidate"
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold uppercase transition-all border-2 border-neo-black ${
                role === "candidate" ? "bg-neo-grey text-neo-black shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-neo-white text-neo-dark-grey hover:bg-neo-grey"
              }`}>
              <UserIcon size={16} strokeWidth={2.5} /> Candidate
            </a>
            <a href="/auth/login?role=company"
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold uppercase transition-all border-2 border-neo-black ${
                role === "company" ? "bg-neo-grey text-neo-black shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-neo-white text-neo-dark-grey hover:bg-neo-grey"
              }`}>
              <BriefcaseIcon size={16} strokeWidth={2.5} /> Company
            </a>
          </div>
        ) : (
          <div className="mb-5 px-4 py-2.5 bg-neo-grey text-neo-black border-2 border-neo-black text-xs font-bold uppercase text-neo-black text-center shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
            Sign in with your registered email — you'll be redirected to your dashboard automatically.
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-black uppercase text-neo-black mb-1.5">
              Email address
            </label>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              className="w-full border-2 border-neo-black bg-neo-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-neo-black transition-shadow"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-black uppercase text-neo-black mb-1.5">
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="w-full border-2 border-neo-black bg-neo-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-neo-black transition-shadow"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.password.message}
              </p>
            )}
            {isRegister && !errors.password && (
              <p className="text-gray-400 text-xs mt-1.5">Minimum 6 characters</p>
            )}
          </div>

          {/* Error / Success messages */}
          {error && (
            <div className="bg-red-400 border-2 border-neo-black px-4 py-3 flex items-start gap-2 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
              <AlertCircle size={16} strokeWidth={2.5} className="text-neo-black flex-shrink-0 mt-0.5" />
              <p className="text-neo-black font-bold text-sm uppercase">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-400 border-2 border-neo-black px-4 py-3 flex items-start gap-2 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
              <CheckCircle size={16} strokeWidth={2.5} className="text-neo-black flex-shrink-0 mt-0.5" />
              <p className="text-neo-black font-bold text-sm uppercase">{success}</p>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            {isRegister ? "Create Account & Continue" : "Sign In"}
          </Button>
        </form>

        {/* Toggle mode */}
        <div className="mt-6 text-center">
          <p className="text-sm font-bold text-neo-dark-grey uppercase">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={toggleMode}
              className="text-neo-black font-black hover:underline focus:outline-none"
            >
              {isRegister ? "Sign in" : "Create account"}
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t-4 border-neo-black text-center">
          <p className="text-xs font-bold text-neo-dark-grey uppercase">
            By continuing, you agree to Carrier-Forge's Terms of Service and Privacy Policy.
          </p>
        </div>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neo-grey">
        <div className="font-display font-black text-2xl uppercase tracking-widest text-neo-black">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
