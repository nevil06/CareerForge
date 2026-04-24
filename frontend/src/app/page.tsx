"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { BriefcaseIcon, UserIcon, Sparkles, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/lib/store";

const features = [
  "AI parses your resume in seconds",
  "Matches you with real jobs from 5+ sources",
  "Generates tailored resumes & cold emails",
  "Auto-detects recruiter names",
];

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace(user.role === "company" ? "/company/dashboard" : "/candidate/dashboard");
    }
  }, [user, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-gray-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <span className="text-xl font-bold text-brand-600">⚡ Carrier-Forge</span>
        <button
          onClick={() => router.push("/auth/login")}
          className="text-sm text-gray-600 hover:text-brand-600 font-medium transition-colors"
        >
          Sign in →
        </button>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-8 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500 text-white px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <Sparkles size={14} /> Powered by GLM-5.1 AI
        </div>

        <h1 className="text-5xl font-bold text-gray-900 mb-5 leading-tight">
          Your AI-Powered<br />
          <span className="text-brand-500">Career Agent</span>
        </h1>

        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Upload your resume. Let AI find jobs, tailor your applications,
          and write cold emails — all automatically.
        </p>

        {/* Feature list */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2 bg-white border border-gray-100 rounded-full px-4 py-2 text-sm text-gray-600 shadow-sm">
              <CheckCircle size={14} className="text-green-500" /> {f}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => router.push("/auth/login?role=candidate")}
            className="gap-3 px-8"
          >
            <UserIcon size={20} />
            I'm Looking for a Job
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push("/auth/login?role=company")}
            className="gap-3 px-8"
          >
            <BriefcaseIcon size={20} />
            I'm Hiring
          </Button>
        </div>

        <p className="text-sm text-gray-400 mt-6">
          Free to use · No credit card required
        </p>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-8 pb-24">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: "01", title: "Upload Resume", desc: "Drop your PDF or DOCX. AI extracts your skills, experience, and preferred roles instantly." },
            { step: "02", title: "AI Finds Jobs", desc: "Our agent searches LinkedIn, Indeed, Glassdoor, RemoteOK and more — tailored to your profile." },
            { step: "03", title: "Apply in 1 Click", desc: "Get a tailored resume, cold email, and cover letter generated for each job automatically." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="text-4xl font-bold text-brand-100 mb-3">{step}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
