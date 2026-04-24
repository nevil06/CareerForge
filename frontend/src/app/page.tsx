"use client";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { BriefcaseIcon, UserIcon } from "lucide-react";

export default function Home() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center gap-2 bg-brand-500 text-white px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          ✨ Powered by GLM AI
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Carrier-Forge
        </h1>
        <p className="text-xl text-gray-500 mb-10">
          Intelligent matching between top talent and great companies — powered by AI.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => router.push("/auth/login?role=candidate")}
            className="gap-3">
            <UserIcon size={20} /> I'm a Candidate
          </Button>
          <Button size="lg" variant="outline" onClick={() => router.push("/auth/login?role=company")}
            className="gap-3">
            <BriefcaseIcon size={20} /> I'm a Company
          </Button>
        </div>
      </div>
    </main>
  );
}
