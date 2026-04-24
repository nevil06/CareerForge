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
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>();
  const setAuth = useAuthStore((s) => s.setAuth);

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      if (isRegister) {
        await registerUser({ ...data, role });
      }
      const res = await login(data);
      setAuth(res.data.user, res.data.access_token);
      router.push(res.data.user.role === "company" ? "/company/dashboard" : "/candidate/dashboard");
    } catch (e: any) {
      setError(e.response?.data?.detail || "Something went wrong");
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
            {isRegister ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={() => setIsRegister(!isRegister)}
            className="text-brand-500 font-medium hover:underline">
            {isRegister ? "Sign in" : "Register"}
          </button>
        </p>
      </Card>
    </main>
  );
}
