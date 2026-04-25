"use client";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { optimizeResume, generateOutreach, generateCoverLetter, getGithubRepos, generateProfessionalResume } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import {
  Sparkles, Copy, Check, Github, Globe, FileText,
  Loader2, Download, Wand2, Mail, BookOpen, Star,
  Code2, RefreshCw, ChevronRight, AlertCircle
} from "lucide-react";

/* ── Helpers ── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1.5 text-xs font-bold uppercase border-2 border-neo-black px-3 py-1.5 bg-white hover:bg-yellow-50 transition-colors">
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function TextOutput({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-black uppercase text-gray-500">Output</span>
        <CopyButton text={text} />
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-2 border-neo-black bg-gray-50 p-4 text-sm leading-6 text-gray-800 font-mono">{text}</pre>
    </div>
  );
}

function SectionHead({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="bg-neo-black p-2.5 border-2 border-neo-black flex-shrink-0">
        <Icon size={18} className="text-yellow-400" strokeWidth={2.5} />
      </div>
      <div>
        <h2 className="font-black text-base uppercase text-neo-black">{title}</h2>
        <p className="text-xs text-gray-500 font-medium">{subtitle}</p>
      </div>
    </div>
  );
}

export default function AIToolsPage() {
  /* Shared job inputs */
  const [jd, setJd] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");

  /* Step 1 — GitHub username */
  const [ghUsername, setGhUsername] = useState("");
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState("");
  const [ghProfile, setGhProfile] = useState<any>(null);
  const [ghRepos, setGhRepos] = useState<any[]>([]);

  /* Step 2 — optional portfolio */
  const [portfolioUrl, setPortfolioUrl] = useState("");

  /* Step 3 — generation */
  const [proHtml, setProHtml] = useState("");
  const [proMeta, setProMeta] = useState<any>(null);
  const [proLoading, setProLoading] = useState(false);
  const [proError, setProError] = useState("");

  /* Other tools */
  const [optimized, setOptimized] = useState("");
  const [outreach, setOutreach] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  /* Fetch repos from GitHub */
  const fetchRepos = async () => {
    if (!ghUsername.trim()) return;
    setGhLoading(true);
    setGhError("");
    setGhProfile(null);
    setGhRepos([]);
    setProHtml("");
    try {
      const r = await getGithubRepos(ghUsername.trim());
      setGhProfile(r.data);
      setGhRepos(r.data.repos || []);
    } catch (e: any) {
      setGhError(apiErrorMessage(e, `Could not find GitHub user "${ghUsername}"`));
    } finally {
      setGhLoading(false);
    }
  };

  /* Generate the resume */
  const buildResume = async () => {
    setProLoading(true);
    setProError("");
    setProHtml("");
    try {
      const r = await generateProfessionalResume({
        github_username: ghUsername.trim(),
        portfolio_url: portfolioUrl,
        job_title: jobTitle,
        company_name: companyName,
        job_description: jd,
      });
      setProHtml(r.data.html);
      setProMeta(r.data);
    } catch (e: any) {
      setProError(apiErrorMessage(e, "Resume generation failed. Please try again."));
    } finally {
      setProLoading(false);
    }
  };

  const downloadResume = () => {
    const blob = new Blob([proHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(jobTitle || "resume").replace(/\s+/g, "_")}_${(companyName || "careerforge").replace(/\s+/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const run = async (tool: string) => {
    setLoading(tool);
    try {
      if (tool === "optimize") { const r = await optimizeResume(jd); setOptimized(r.data.optimized_resume); }
      else if (tool === "outreach") { const r = await generateOutreach(jobTitle, companyName); setOutreach(r.data.message); }
      else if (tool === "cover") { const r = await generateCoverLetter({ job_title: jobTitle, company_name: companyName, job_description: jd }); setCoverLetter(r.data.cover_letter); }
    } finally { setLoading(null); }
  };

  const hasRepos = ghRepos.length > 0;

  return (
    <AppShell>
      <div className="max-w-4xl space-y-6">
        <PageHeader eyebrow="Agent Workbench" title="AI Tools"
          description="Build a master-level resume from your real GitHub projects, then generate outreach and cover letters." />

        {/* ── Job Details ── */}
        <Card>
          <SectionHead icon={FileText} title="Job Details" subtitle="Used by all tools below" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Job Title (e.g. Backend Engineer)" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
              className="border-2 border-neo-black px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            <input placeholder="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              className="border-2 border-neo-black px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <textarea rows={5} placeholder="Paste the full job description…" value={jd} onChange={(e) => setJd(e.target.value)}
            className="mt-3 w-full border-2 border-neo-black px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
        </Card>

        {/* ── Professional Resume Builder ── */}
        <Card className="border-4 border-neo-black shadow-[6px_6px_0_#facc15]">
          <SectionHead icon={Wand2} title="Professional Resume Builder"
            subtitle="Fetches your real GitHub repos — zero fabrication, only enhancement" />

          {/* STEP 1 — GitHub Username */}
          <div className="mb-5">
            <p className="text-xs font-black uppercase text-neo-black mb-2">
              <span className="bg-neo-black text-yellow-400 px-2 py-0.5 mr-2">Step 1</span>
              Enter your GitHub username
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Github size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="e.g. nevil06"
                  value={ghUsername}
                  onChange={(e) => setGhUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchRepos()}
                  className="w-full border-2 border-neo-black pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <button onClick={fetchRepos} disabled={ghLoading || !ghUsername.trim()}
                className="flex items-center gap-2 bg-neo-black text-white font-black uppercase text-sm px-5 py-2.5 border-2 border-neo-black hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {ghLoading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                {ghLoading ? "Fetching…" : "Fetch Repos"}
              </button>
              {hasRepos && (
                <button onClick={() => { setGhProfile(null); setGhRepos([]); setProHtml(""); }}
                  className="p-2.5 border-2 border-gray-300 text-gray-500 hover:border-neo-black hover:text-neo-black transition-colors">
                  <RefreshCw size={16} />
                </button>
              )}
            </div>
            {ghError && (
              <div className="mt-2 flex items-center gap-2 text-sm font-bold text-red-600 border-2 border-red-300 bg-red-50 px-3 py-2">
                <AlertCircle size={14} /> {ghError}
              </div>
            )}
          </div>

          {/* STEP 2 — Repo Preview */}
          {ghProfile && (
            <div className="mb-5">
              {/* Profile banner */}
              <div className="flex items-center gap-3 bg-gray-50 border-2 border-neo-black p-3 mb-3">
                <Github size={20} className="text-neo-black flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-neo-black">@{ghProfile.username}
                    {ghProfile.name && <span className="font-medium ml-2 text-gray-600">— {ghProfile.name}</span>}
                  </p>
                  {ghProfile.bio && <p className="text-xs text-gray-500 truncate">{ghProfile.bio}</p>}
                </div>
                <span className="text-xs font-bold text-gray-500 whitespace-nowrap">{ghProfile.public_repos} repos</span>
              </div>

              <p className="text-xs font-black uppercase text-neo-black mb-2">
                <span className="bg-neo-black text-yellow-400 px-2 py-0.5 mr-2">Step 2</span>
                Repos that will appear in your resume ({ghRepos.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {ghRepos.map((repo) => (
                  <a key={repo.name} href={repo.url} target="_blank" rel="noopener noreferrer"
                    className="block border-2 border-gray-200 hover:border-neo-black p-2.5 transition-colors group">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-xs text-neo-black group-hover:text-indigo-600 transition-colors truncate">{repo.name}</p>
                      {repo.stars > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-yellow-600 font-bold flex-shrink-0">
                          <Star size={10} fill="currentColor" />{repo.stars}
                        </span>
                      )}
                    </div>
                    {repo.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{repo.description}</p>}
                    {repo.languages?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {repo.languages.slice(0, 4).map((lang: string) => (
                          <span key={lang} className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700">
                            {lang}
                          </span>
                        ))}
                      </div>
                    )}
                  </a>
                ))}
              </div>

              {/* Optional portfolio */}
              <div className="mt-3">
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input placeholder="Portfolio URL (optional — e.g. yoursite.dev)" value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="w-full border-2 border-neo-black pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Generate */}
          {hasRepos && (
            <div>
              <p className="text-xs font-black uppercase text-neo-black mb-3">
                <span className="bg-neo-black text-yellow-400 px-2 py-0.5 mr-2">Step 3</span>
                Generate your master resume
              </p>
              <button onClick={buildResume} disabled={proLoading}
                className="flex items-center gap-2 bg-neo-black text-white font-black uppercase text-sm px-6 py-3 border-2 border-neo-black shadow-[4px_4px_0_#facc15] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50">
                {proLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {proLoading ? "Building Master Resume…" : "Build Professional Resume"}
              </button>
              {proLoading && (
                <p className="mt-2 text-xs text-gray-500 font-medium">
                  Fetching READMEs + languages, then generating… ~20-30 seconds
                </p>
              )}
            </div>
          )}

          {proError && (
            <div className="mt-3 flex items-center gap-2 text-sm font-bold text-red-600 border-2 border-red-300 bg-red-50 px-3 py-2">
              <AlertCircle size={14} /> {proError}
            </div>
          )}

          {/* Output */}
          {proHtml && (
            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-gray-500">Resume Preview</span>
                  {proMeta && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-green-50 border border-green-300 text-green-700">
                      {proMeta.repos_used} GitHub repos included
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={downloadResume}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase border-2 border-neo-black px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 transition-colors">
                    <Download size={12} /> Download HTML
                  </button>
                  <CopyButton text={proHtml} />
                </div>
              </div>
              <div className="border-4 border-neo-black overflow-hidden shadow-[4px_4px_0_#111]">
                <iframe srcDoc={proHtml} className="w-full h-[750px] bg-white" title="Resume Preview" sandbox="allow-same-origin" />
              </div>
              <div className="mt-2 p-3 bg-indigo-50 border-2 border-indigo-200">
                <p className="text-xs font-bold text-indigo-800">
                  📥 <strong>To get a PDF:</strong> Download HTML → Open in Chrome → Ctrl+P → Save as PDF (A4, no margins)
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  All GitHub repo links are real and clickable. No fabricated data.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* ── Other AI Tools ── */}
        <div className="space-y-4">
          {[
            { key: "optimize", label: "Quick Resume Optimizer", desc: "Fast ATS-tailored text (no GitHub needed)", icon: FileText, output: optimized },
            { key: "outreach", label: "Recruiter Outreach", desc: "Personalised LinkedIn / cold email", icon: Mail, output: outreach },
            { key: "cover", label: "Cover Letter", desc: "Professional cover letter for the role", icon: BookOpen, output: coverLetter },
          ].map(({ key, label, desc, icon: Icon, output }) => (
            <Card key={key}>
              <div className="flex items-center justify-between">
                <SectionHead icon={Icon} title={label} subtitle={desc} />
                <Button size="sm" loading={loading === key} onClick={() => run(key)}>Generate</Button>
              </div>
              <TextOutput text={output} />
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
