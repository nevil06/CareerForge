"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { login, register as registerUser } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface FormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role") || "candidate";
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, getValues, formState: { isSubmitting } } = useForm<FormData>();
  const setAuth = useAuthStore((s) => s.setAuth);

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      if (isRegister) {
        // Register first
        await registerUser({ ...data, role });
        // Then auto-login with same credentials
        const res = await login({ email: data.email, password: data.password });
        setAuth(res.data.user, res.data.access_token);
        redirect(res.data.user.role);
      } else {
        const res = await login(data);
        setAuth(res.data.user, res.data.access_token);
        redirect(res.data.user.role);
      }
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Something went wrong");
    }
  };

  const redirect = (userRole: string) => {
    if (userRole === "company") {
      router.push("/company/dashboard");
    } else {
      router.push("/candidate/dashboard");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          {isRegister ? "Create account" : "Welcome back"}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {isRegister ? `Registering as ${role}` : "Sign in to continue"}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...register("email", { required: true })}
              type="email"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              {...register("password", { required: true })}
              type="password"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button type="submit" className="w-full" loading={isSubmitting}>
            {isRegister ? "Create Account & Sign In" : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            className="text-brand-500 font-medium hover:underline"
          >
            {isRegister ? "Sign in" : "Register"}
          </button>
        </p>

        {/* Role switcher when registering */}
        {isRegister && (
          <div className="mt-4 flex gap-2 justify-center">
            <a href={`/auth/login?role=candidate`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${role === "candidate" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              Candidate
            </a>
            <a href={`/auth/login?role=company`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${role === "company" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              Company
            </a>
          </div>
        )}
      </Card>
    </main>
  );
}
