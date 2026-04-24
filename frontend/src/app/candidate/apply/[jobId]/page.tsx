"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import api from "@/lib/api";
import {
  FileText, Mail, BookOpen, Sparkles, Copy, CheckCircle,
  Loader2, ChevronDown, ChevronUp, ExternalLink, Download,
  Github, Globe, AlertCircle, Check, Star
} from "lucide-react";

/* ── helpers ── */
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

function Collapsible({ icon: Icon, title, children, defaultOpen = false }: {
  icon: any; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-4 border-neo-black mb-3 shadow-[3px_3px_0_#111]">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-indigo-600" />
          <span className="font-black text-sm uppercase text-neo-black">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="border-t-4 border-neo-black">{children}</div>}
    </div>
  );
}

const STEPS = [
  { label: "Detecting recruiter context…", icon: Sparkles },
  { label: "Analysing job requirements…", icon: FileText },
  { label: "Fetching GitHub projects…", icon: Github },
  { label: "Tailoring your resume…", icon: FileText },
  { label: "Writing cold email…", icon: Mail },
  { label: "Crafting cover letter…", icon: BookOpen },
];

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [pkg, setPkg] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(-1);
  const [githubUsername, setGithubUsername] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const stepTimer = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    api.get(`/api/jobs/${jobId}`).then((r) => setJob(r.data)).catch(() => {});
  }, [jobId]);

  const animateSteps = () => {
    let step = 0;
    setCurrentStep(0);
    stepTimer.current = setInterval(() => {
      step++;
      if (step < STEPS.length) setCurrentStep(step);
      else if (stepTimer.current) clearInterval(stepTimer.current);
    }, 3500);
  };

  const stopSteps = () => {
    if (stepTimer.current) clearInterval(stepTimer.current);
    setCurrentStep(-1);
  };

  const generate = async () => {
    setLoading(true);
    setError("");
    setPkg(null);
    animateSteps();
    try {
      const r = await api.post(`/api/candidates/apply/${jobId}`, {
        github_username: githubUsername.trim(),
        portfolio_url: portfolioUrl.trim(),
      });
      setPkg(r.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Generation failed. Make sure your profile is complete.");
    } finally {
      stopSteps();
      setLoading(false);
    }
  };

  const downloadResume = () => {
    if (!pkg?.resume_html) return;
    const blob = new Blob([pkg.resume_html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Resume_${job?.title || "application"}_${job?.company_name || ""}.html`.replace(/\s+/g, "_");
    a.click();
    URL.revokeObjectURL(url);
  };

  const printResume = () => {
    iframeRef.current?.contentWindow?.print();
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto max-w-3xl">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-neo-black p-2 border-2 border-neo-black">
              <Sparkles size={18} className="text-yellow-400" />
            </div>
            <h1 className="text-2xl font-black uppercase text-neo-black">AI Application Package</h1>
          </div>
          {job && (
            <p className="text-gray-500 text-sm ml-10">
              <span className="font-bold text-neo-black">{job.title}</span> · {job.company_name}
              {job.application_link && (
                <a href={job.application_link} target="_blank" rel="noreferrer"
                  className="ml-2 inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium">
                  <ExternalLink size={11} /> View Job
                </a>
              )}
            </p>
          )}
        </div>

        {/* Generator form */}
        {!pkg && (
          <div className="border-4 border-neo-black shadow-[6px_6px_0_#facc15] bg-white p-6 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-indigo-600" />
              <h2 className="font-black text-sm uppercase text-neo-black">Generate Application Materials</h2>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              AI will tailor your resume from real GitHub projects, write a cold email, and craft a cover letter — all specific to this job.
            </p>

            {/* GitHub username (optional but recommended) */}
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-black uppercase text-neo-black block mb-1.5">
                  GitHub Username <span className="text-indigo-500 font-bold">(recommended for best resume)</span>
                </label>
                <div className="relative">
                  <Github size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    placeholder="e.g. nevil06"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    className="w-full border-2 border-neo-black pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-black uppercase text-neo-black block mb-1.5">
                  Portfolio URL <span className="text-gray-400 font-medium">(optional)</span>
                </label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    placeholder="e.g. yoursite.dev"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="w-full border-2 border-neo-black pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-red-600 border-2 border-red-300 bg-red-50 px-3 py-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button onClick={generate} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-neo-black text-white font-black uppercase text-sm py-3.5 border-2 border-neo-black shadow-[4px_4px_0_#facc15] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "GLM is writing your application…" : "Generate Full Application Package"}
            </button>

            {/* Animated step indicators */}
            {loading && (
              <div className="mt-5 space-y-2">
                {STEPS.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={i} className={`flex items-center gap-2.5 text-sm transition-all duration-500
                      ${done ? "text-green-600 font-bold" : active ? "text-neo-black font-bold" : "text-gray-300"}`}>
                      {done ? (
                        <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                      ) : active ? (
                        <Loader2 size={14} className="animate-spin text-indigo-500 flex-shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 flex-shrink-0" />
                      )}
                      {step.label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {pkg && (
          <div>
            {/* Meta badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {pkg.github_enriched && (
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-green-50 border-2 border-green-400 text-green-700">
                  <Github size={11} /> {pkg.repos_used} GitHub repos used
                </span>
              )}
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-indigo-50 border-2 border-indigo-300 text-indigo-700">
                <Sparkles size={11} /> AI-Tailored Package
              </span>
            </div>

            {/* Match Analysis */}
            {pkg.summary && (
              <div className="border-4 border-neo-black bg-yellow-50 p-5 mb-4 shadow-[4px_4px_0_#111]">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-indigo-600" />
                  <h2 className="font-black text-sm uppercase text-neo-black">Match Analysis</h2>
                </div>
                <p className="text-sm text-gray-700 mb-4 leading-relaxed">{pkg.summary.match_summary}</p>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs font-black uppercase text-green-700 mb-2">Key Strengths</p>
                    <ul className="space-y-1">
                      {(pkg.summary.key_strengths || []).map((s: string) => (
                        <li key={s} className="text-xs text-gray-700 flex items-start gap-1.5">
                          <CheckCircle size={11} className="text-green-500 mt-0.5 flex-shrink-0" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-orange-600 mb-2">Skill Gaps</p>
                    <ul className="space-y-1">
                      {(pkg.summary.skill_gaps || []).length === 0
                        ? <li className="text-xs text-gray-400 italic">None identified ✓</li>
                        : (pkg.summary.skill_gaps || []).map((s: string) => (
                          <li key={s} className="text-xs text-gray-600">• {s}</li>
                        ))}
                    </ul>
                  </div>
                </div>
                {pkg.summary.suggested_subject_line && (
                  <div className="border-t-2 border-yellow-300 pt-3">
                    <p className="text-xs font-black uppercase text-gray-500 mb-1">Suggested Email Subject</p>
                    <p className="text-sm font-bold text-neo-black">{pkg.summary.suggested_subject_line}</p>
                  </div>
                )}
              </div>
            )}

            {/* Cold Email */}
            <Collapsible icon={Mail} title="Cold Outreach Email" defaultOpen={true}>
              <div className="p-4">
                <div className="flex justify-end mb-2"><CopyButton text={pkg.cold_email} /></div>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{pkg.cold_email}</pre>
              </div>
            </Collapsible>

            {/* Cover Letter */}
            <Collapsible icon={BookOpen} title="Cover Letter">
              <div className="p-4">
                <div className="flex justify-end mb-2"><CopyButton text={pkg.cover_letter} /></div>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{pkg.cover_letter}</pre>
              </div>
            </Collapsible>

            {/* HTML Resume */}
            {pkg.resume_html && (
              <Collapsible icon={FileText} title="Tailored Resume (HTML Preview)">
                <div className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-xs text-gray-500 font-medium">Live preview — print or save as PDF from your browser</p>
                    <div className="flex gap-2">
                      <button onClick={printResume}
                        className="flex items-center gap-1.5 text-xs font-bold uppercase border-2 border-neo-black px-3 py-1.5 bg-neo-black text-white hover:bg-gray-800 transition-colors shadow-[2px_2px_0_#facc15]">
                        <Download size={12} /> Save as PDF
                      </button>
                      <button onClick={downloadResume}
                        className="flex items-center gap-1.5 text-xs font-bold uppercase border-2 border-neo-black px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 transition-colors">
                        <Download size={12} /> Download HTML
                      </button>
                      <CopyButton text={pkg.resume_html} />
                    </div>
                  </div>
                  <div className="border-4 border-neo-black shadow-[3px_3px_0_#111]">
                    <iframe ref={iframeRef} srcDoc={pkg.resume_html} className="w-full h-[700px] bg-white" title="Resume" sandbox="allow-same-origin allow-scripts allow-modals" />
                  </div>
                </div>
              </Collapsible>
            )}

            {/* Action row */}
            <div className="flex flex-wrap gap-3 mt-4">
              <button onClick={() => { setPkg(null); setCurrentStep(-1); }}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-neo-black px-4 py-2.5 font-black text-sm uppercase hover:bg-gray-50 transition-colors">
                Regenerate
              </button>
              {job?.application_link && (
                <button onClick={() => window.open(job.application_link, "_blank")}
                  className="flex-1 flex items-center justify-center gap-2 bg-neo-black text-white font-black text-sm uppercase px-4 py-2.5 border-2 border-neo-black shadow-[3px_3px_0_#facc15] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                  <ExternalLink size={14} /> Apply Now
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
