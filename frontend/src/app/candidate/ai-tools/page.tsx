"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { optimizeResume, generateOutreach, generateCoverLetter } from "@/lib/api";
import { Sparkles, Copy } from "lucide-react";

function OutputBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <div className="mt-4 relative">
      <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm whitespace-pre-wrap text-gray-700 max-h-64 overflow-auto">
        {text}
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-500"
        aria-label="Copy to clipboard"
      >
        <Copy size={14} />
      </button>
      {copied && <span className="absolute top-2 right-10 text-xs text-green-600 font-medium">Copied!</span>}
    </div>
  );
}

export default function AIToolsPage() {
  const [jd, setJd] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [optimized, setOptimized] = useState("");
  const [outreach, setOutreach] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (tool: string) => {
    setLoading(tool);
    try {
      if (tool === "optimize") {
        const r = await optimizeResume(jd);
        setOptimized(r.data.optimized_resume);
      } else if (tool === "outreach") {
        const r = await generateOutreach(jobTitle, companyName);
        setOutreach(r.data.message);
      } else if (tool === "cover") {
        const r = await generateCoverLetter({ job_title: jobTitle, company_name: companyName, job_description: jd });
        setCoverLetter(r.data.cover_letter);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="text-brand-500" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">AI Tools</h1>
        </div>

        {/* Shared inputs */}
        <Card className="mb-6">
          <CardTitle>Job Details</CardTitle>
          <div className="mt-4 space-y-3">
            <input placeholder="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <input placeholder="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <textarea rows={4} placeholder="Paste job description here…" value={jd} onChange={(e) => setJd(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </Card>

        {/* Tools */}
        {[
          { key: "optimize", label: "Optimize Resume", desc: "Tailor your resume for this job", output: optimized },
          { key: "outreach", label: "Generate Outreach", desc: "Personalised LinkedIn/email message", output: outreach },
          { key: "cover", label: "Cover Letter", desc: "Professional cover letter", output: coverLetter },
        ].map(({ key, label, desc, output }) => (
          <Card key={key} className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{label}</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
              </div>
              <Button size="sm" loading={loading === key} onClick={() => run(key)}>
                Generate
              </Button>
            </div>
            <OutputBox text={output} />
          </Card>
        ))}
      </main>
    </div>
  );
}
