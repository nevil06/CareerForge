"use client";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { optimizeResume, generateOutreach, generateCoverLetter } from "@/lib/api";
import { Sparkles, Copy } from "lucide-react";

function OutputBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <div className="mt-4 relative">
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-[1.35rem] border border-white/70 bg-cream/70 p-4 text-sm leading-6 text-soil">
        {text}
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute right-2 top-2 rounded-xl border border-white/70 bg-white/75 p-1.5 text-stone-500 hover:bg-white"
        aria-label="Copy to clipboard"
      >
        <Copy size={14} />
      </button>
      {copied && <span className="absolute right-10 top-2 text-xs font-bold text-moss">Copied!</span>}
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
    <AppShell>
      <div className="max-w-4xl">
        <PageHeader
          eyebrow="Agent workbench"
          title="AI Tools"
          description="Turn a job description into tailored resume copy, recruiter outreach, and cover letters."
        />

        {/* Shared inputs */}
        <Card className="mb-6">
          <CardTitle>Job Details</CardTitle>
          <div className="mt-4 space-y-3">
            <input placeholder="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
              className="organic-input" />
            <input placeholder="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              className="organic-input" />
            <textarea rows={4} placeholder="Paste job description here…" value={jd} onChange={(e) => setJd(e.target.value)}
              className="organic-input" />
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
                <p className="mt-0.5 text-sm text-stone-500">{desc}</p>
              </div>
              <Button size="sm" loading={loading === key} onClick={() => run(key)}>
                Generate
              </Button>
            </div>
            <OutputBox text={output} />
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
