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
    <main className="min-h-screen bg-neo-grey">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto border-b-4 border-neo-black bg-neo-white">
        <span className="text-xl font-black text-neo-black uppercase tracking-tight">⚡ Carrier-Forge</span>
        <button
          onClick={() => router.push("/auth/login")}
          className="text-sm font-bold text-neo-black uppercase border-2 border-neo-black px-4 py-2 hover:bg-neo-grey text-neo-black transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
        >
          Sign in →
        </button>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-8 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-neo-grey text-neo-black px-4 py-1.5 font-bold uppercase text-xs mb-6 border-2 border-neo-black shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
          <Sparkles size={14} /> Powered by GLM-5.1 AI
        </div>

        <h1 className="text-6xl font-black text-neo-black mb-5 leading-tight uppercase tracking-tighter">
          Your AI-Powered<br />
          <span className="bg-neo-grey text-neo-black px-2 border-4 border-neo-black shadow-neo-sm">Career Agent</span>
        </h1>

        <p className="text-xl text-neo-dark-grey font-bold mb-10 max-w-2xl mx-auto">
          Upload your resume. Let AI find jobs, tailor your applications,
          and write cold emails — all automatically.
        </p>

        {/* Feature list */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2 bg-neo-white border-2 border-neo-black px-4 py-2 text-sm font-bold text-neo-black shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
              <CheckCircle size={16} strokeWidth={3} className="text-green-500" /> {f}
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

        <p className="text-sm font-bold text-neo-dark-grey mt-6 uppercase">
          Free to use · No credit card required
        </p>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-8 pb-24">
        <h2 className="text-4xl font-black text-neo-black text-center mb-10 uppercase tracking-tight">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: "01", title: "Upload Resume", desc: "Drop your PDF or DOCX. AI extracts your skills, experience, and preferred roles instantly." },
            { step: "02", title: "AI Finds Jobs", desc: "Our agent searches LinkedIn, Indeed, Glassdoor, RemoteOK and more — tailored to your profile." },
            { step: "03", title: "Apply in 1 Click", desc: "Get a tailored resume, cold email, and cover letter generated for each job automatically." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-neo-white border-4 border-neo-black p-6 shadow-neo-md hover:translate-y-[-4px] hover:translate-x-[-4px] hover:shadow-neo-lg transition-all">
              <div className="text-5xl font-black text-neo-white border-text-black mb-4" style={{ WebkitTextStroke: "2px #111827" }}>{step}</div>
              <h3 className="font-black text-neo-black mb-2 uppercase text-lg">{title}</h3>
              <p className="text-sm font-bold text-neo-dark-grey leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
