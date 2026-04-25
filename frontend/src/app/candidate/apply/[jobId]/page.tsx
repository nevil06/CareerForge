"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import api, { getInterviewPrep, generateApplicationPackage, markJobVisited } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import {
  ArrowLeft, ExternalLink, MapPin, Building2, Briefcase,
  Sparkles, Loader2, ChevronDown, ChevronUp, Copy, CheckCircle,
  BookOpen, AlertTriangle, MessageSquare, FileText, Star,
  CheckSquare, Clock, Target, Lightbulb, Shield,
} from "lucide-react";
import { clsx } from "clsx";

// ── Category colour map ─────────────────────────────────────────────────────
const CATEGORY_STYLES: Record<string, string> = {
  Behavioural:   "bg-blue-50 border-blue-400 text-blue-800",
  Technical:     "bg-yellow-50 border-yellow-400 text-yellow-900",
  "System Design": "bg-purple-50 border-purple-400 text-purple-800",
  "Culture Fit": "bg-green-50 border-green-400 text-green-800",
};
const CATEGORY_DOT: Record<string, string> = {
  Behavioural:   "bg-blue-400",
  Technical:     "bg-yellow-400",
  "System Design": "bg-purple-400",
  "Culture Fit": "bg-green-400",
};

// ── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-xs font-bold uppercase border-2 border-neo-black px-2 py-1 hover:bg-gray-100 transition-colors"
    >
      {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Collapsible section ──────────────────────────────────────────────────────
function Section({ icon: Icon, title, badge, children }: {
  icon: any; title: string; badge?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-4 border-neo-black shadow-[4px_4px_0_#111] mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-neo-black text-white px-5 py-3.5 font-black uppercase tracking-wide"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={16} />
          <span>{title}</span>
          {badge && <span className="bg-yellow-400 text-neo-black text-xs font-black px-2 py-0.5 border border-yellow-600">{badge}</span>}
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div className="p-5 bg-white">{children}</div>}
    </div>
  );
}

// ── Apply steps ──────────────────────────────────────────────────────────────
const APPLY_STEPS = [
  { icon: Target, label: "Review the full job description carefully", detail: "Identify 3-5 key requirements to address in your application" },
  { icon: FileText, label: "Tailor your resume to the role", detail: "Mirror keywords from the JD in your resume" },
  { icon: MessageSquare, label: "Write a focused cover letter", detail: "2-3 paragraphs — why this company, why this role, your best evidence" },
  { icon: CheckSquare, label: "Submit via the official link below", detail: "Apply directly on the company's portal — avoid 3rd party reposters" },
  { icon: Clock, label: "Follow up after 5–7 business days", detail: "A polite follow-up email to the hiring manager shows initiative" },
];

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const jobIdNum = parseInt(jobId, 10);

  const [job, setJob] = useState<any>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  // Interview Prep
  const [prep, setPrep] = useState<any>(null);
  const [loadingPrep, setLoadingPrep] = useState(false);
  const [prepError, setPrepError] = useState("");

  // Optional AI tools
  const [toolLoading, setToolLoading] = useState<"cold_email" | "cover_letter" | null>(null);
  const [coldEmail, setColdEmail] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [toolError, setToolError] = useState("");

  // Fetch job details
  useEffect(() => {
    api.get(`/api/jobs/${jobIdNum}`)
      .then(r => setJob(r.data))
      .catch(() => {})
      .finally(() => setLoadingJob(false));
  }, [jobIdNum]);

  // Mark visited + try to load cached prep on mount
  useEffect(() => {
    if (!jobIdNum) return;
    // Fire-and-forget: mark visited
    markJobVisited(jobIdNum).catch(() => {});
    // Try to load cached interview prep silently
    getInterviewPrep(jobIdNum)
      .then(r => {
        if (r.data && (r.data._cached || r.data.process_overview)) {
          setPrep(r.data);
        }
      })
      .catch(() => {}); // no cache yet — user can generate manually
  }, [jobIdNum]);


  const generatePrep = async () => {
    setLoadingPrep(true);
    setPrepError("");
    try {
      const r = await getInterviewPrep(jobIdNum);
      setPrep(r.data);
    } catch (e: any) {
      setPrepError(apiErrorMessage(e, "Failed to generate interview prep. Try again."));
    } finally {
      setLoadingPrep(false);
    }
  };

  const generateTool = async (tool: "cold_email" | "cover_letter") => {
    setToolLoading(tool);
    setToolError("");
    try {
      const r = await generateApplicationPackage(jobIdNum);
      if (tool === "cold_email") setColdEmail(r.data.cold_email || "");
      if (tool === "cover_letter") setCoverLetter(r.data.cover_letter || "");
    } catch (e: any) {
      setToolError(apiErrorMessage(e, "Generation failed. Make sure your profile is complete."));
    } finally {
      setToolLoading(null);
    }
  };

  if (loadingJob) return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-neo-black" />
      </main>
    </div>
  );

  if (!job) return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center">
        <p className="font-black uppercase text-gray-400">Job not found.</p>
      </main>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 max-w-4xl">

        {/* ── Back ── */}
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-black uppercase mb-5 hover:underline">
          <ArrowLeft size={16} /> Back to Jobs
        </button>

        {/* ── Job Header ── */}
        <div className="border-4 border-neo-black bg-neo-black text-white shadow-[6px_6px_0_#facc15] mb-6 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-yellow-400 text-xs font-black uppercase tracking-widest mb-1">{job.company_name}</p>
              <h1 className="text-2xl font-black uppercase leading-tight mb-3">{job.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm font-bold text-gray-300">
                {job.location && <span className="flex items-center gap-1.5"><MapPin size={14} /> {job.location}</span>}
                {job.experience_level && <span className="flex items-center gap-1.5"><Briefcase size={14} /> {job.experience_level}</span>}
                {job.salary_min && (
                  <span className="flex items-center gap-1.5 text-yellow-400">
                    <Star size={14} />
                    ${(job.salary_min / 1000).toFixed(0)}k{job.salary_max ? `–$${(job.salary_max / 1000).toFixed(0)}k` : "+"}
                  </span>
                )}
              </div>
            </div>

            {/* Apply CTA */}
            {job.application_link ? (
              <a href={job.application_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-yellow-400 text-neo-black font-black uppercase text-sm px-6 py-3 border-2 border-yellow-400 shadow-[4px_4px_0_#facc15] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all whitespace-nowrap">
                <ExternalLink size={16} /> Apply Now →
              </a>
            ) : (
              <div className="text-xs font-bold text-gray-400 bg-gray-800 border border-gray-600 px-4 py-3">
                Applications via CareerForge portal
              </div>
            )}
          </div>

          {/* Skills */}
          {job.required_skills?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700">
              {job.required_skills.map((s: string) => (
                <span key={s} className="text-xs font-bold bg-gray-800 border border-gray-600 px-2.5 py-1">{s}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── Company Hiring Details (only for internal/company-posted jobs) ── */}
        {job.source === "internal" && (
          <Section icon={Building2} title="Company Hiring Details" badge="Direct Hire">
            <div className="space-y-4">
              {/* Posted by / when */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 bg-yellow-50 border-2 border-yellow-400 px-3 py-2">
                  <Building2 size={14} className="text-yellow-700" />
                  <span className="font-black text-yellow-900">{job.company_name}</span>
                  <span className="text-yellow-700 font-medium">is hiring directly on CareerForge</span>
                </div>
                {job.created_at && (
                  <div className="flex items-center gap-2 border-2 border-gray-200 px-3 py-2 text-xs font-bold text-gray-600">
                    <Clock size={12} />
                    Posted {new Date(job.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                )}
              </div>

              {/* Full description */}
              {job.description && (
                <div className="border-l-4 border-neo-black pl-4">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">About This Role</p>
                  <p className="text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-line">{job.description}</p>
                </div>
              )}

              {/* Skill requirements */}
              {job.required_skills?.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Skills They're Looking For</p>
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map((s: string) => (
                      <span key={s} className="flex items-center gap-1.5 text-xs font-black uppercase border-2 border-neo-black px-2.5 py-1.5 bg-white shadow-[2px_2px_0_#111]">
                        <Target size={10} />
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience + Salary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {job.experience_level && (
                  <div className="border-2 border-gray-200 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Level</p>
                    <p className="font-black text-sm uppercase">{job.experience_level}</p>
                  </div>
                )}
                {job.experience_years_min > 0 && (
                  <div className="border-2 border-gray-200 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Min Experience</p>
                    <p className="font-black text-sm">{job.experience_years_min}+ years</p>
                  </div>
                )}
                {job.salary_min && (
                  <div className="border-2 border-yellow-400 bg-yellow-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-yellow-700 mb-0.5">Salary Range</p>
                    <p className="font-black text-sm text-yellow-900">
                      ₹{(job.salary_min / 100000).toFixed(1)}L{job.salary_max ? ` – ₹${(job.salary_max / 100000).toFixed(1)}L` : "+"}
                    </p>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="bg-neo-black text-white p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-black uppercase text-sm text-yellow-400">Direct Hire via CareerForge</p>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">Your profile is already matched to this role. Apply directly using the button above.</p>
                </div>
                {job.application_link && (
                  <a href={job.application_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-yellow-400 text-neo-black font-black uppercase text-xs px-4 py-2.5 border-2 border-yellow-400 whitespace-nowrap hover:bg-yellow-300 transition-colors">
                    <ExternalLink size={13} /> Apply Now
                  </a>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* ── How to Apply ── */}
        <Section icon={CheckSquare} title="How to Apply">
          <div className="space-y-3">
            {APPLY_STEPS.map((step, i) => {
              const { icon: Icon } = step;
              return (
                <div key={i} className="flex gap-4 border-2 border-gray-200 p-4 hover:border-neo-black transition-colors">
                  <div className="w-8 h-8 bg-yellow-400 border-2 border-neo-black flex items-center justify-center shrink-0 font-black text-sm">{i + 1}</div>
                  <div>
                    <p className="font-black text-sm uppercase text-neo-black">{step.label}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {job.application_link && (
            <a href={job.application_link} target="_blank" rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full bg-neo-black text-white font-black uppercase py-3 border-2 border-neo-black shadow-[4px_4px_0_#facc15] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">
              <ExternalLink size={16} /> Open Application Portal
            </a>
          )}
        </Section>

        {/* ── Interview Prep ── */}
        <Section icon={Sparkles} title="Interview Preparation" badge="AI">
          {!prep && !loadingPrep && (
            <div className="text-center py-6">
              <Sparkles size={36} className="mx-auto mb-3 text-yellow-400" />
              <p className="font-black uppercase text-sm mb-1">AI Interview Coach</p>
              <p className="text-xs text-gray-500 font-medium mb-4">
                Get company-specific interview questions, process breakdown, and what to study — generated for this exact role.
              </p>
              <button onClick={generatePrep}
                className="flex items-center gap-2 mx-auto bg-neo-black text-yellow-400 font-black uppercase px-6 py-3 border-2 border-neo-black shadow-[4px_4px_0_#facc15] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">
                <Sparkles size={16} /> Generate Interview Prep
              </button>
              {prepError && <p className="mt-3 text-red-600 text-xs font-bold">{prepError}</p>}
            </div>
          )}

          {loadingPrep && (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 size={32} className="animate-spin" />
              <p className="text-sm font-black uppercase">Analysing job & company…</p>
              <p className="text-xs text-gray-400">Researching interview patterns, generating questions</p>
            </div>
          )}

          {prep && (
            <div className="space-y-5">
              {/* Process overview */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-yellow-700 mb-1">Process Overview</p>
                <p className="text-sm font-medium text-gray-800">{prep.process_overview}</p>
              </div>

              {/* Rounds */}
              {prep.rounds?.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Interview Rounds</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {prep.rounds.map((r: any, i: number) => (
                      <div key={i} className="border-2 border-neo-black p-3 flex gap-3">
                        <div className="w-7 h-7 bg-neo-black text-yellow-400 flex items-center justify-center font-black text-xs shrink-0">{i + 1}</div>
                        <div>
                          <p className="font-black text-sm">{r.name}</p>
                          <p className="text-xs text-gray-500">{r.format} · {r.duration}</p>
                          <p className="text-xs text-gray-600 mt-0.5 font-medium">{r.focus}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Likely questions */}
              {prep.likely_questions?.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Likely Interview Questions</p>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(CATEGORY_DOT).map(([cat, dot]) => (
                      <span key={cat} className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                        <span className={`w-2.5 h-2.5 rounded-full ${dot}`} /> {cat}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {prep.likely_questions.map((q: any, i: number) => (
                      <div key={i} className={clsx("border-2 p-3", CATEGORY_STYLES[q.category] || "bg-gray-50 border-gray-300")}>
                        <div className="flex items-start gap-2">
                          <span className={clsx("w-2.5 h-2.5 rounded-full shrink-0 mt-1.5", CATEGORY_DOT[q.category] || "bg-gray-400")} />
                          <div>
                            <p className="font-bold text-sm">{q.question}</p>
                            {q.tip && <p className="text-xs mt-1 opacity-75 font-medium">💡 {q.tip}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Topics to study */}
              {prep.topics_to_study?.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">What to Study</p>
                  <div className="space-y-2">
                    {prep.topics_to_study.map((t: any, i: number) => (
                      <div key={i} className="flex gap-3 border-2 border-gray-200 p-3 hover:border-neo-black transition-colors">
                        <BookOpen size={16} className="shrink-0 mt-0.5 text-gray-600" />
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm">{t.topic}</p>
                          <p className="text-xs text-gray-500 font-medium">{t.why}</p>
                          {t.resource && (
                            <a href={t.resource.startsWith("http") ? t.resource : undefined}
                              target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-600 font-bold underline hover:text-blue-800 break-all mt-0.5 block">
                              {t.resource}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prep tips */}
              {prep.prep_tips?.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Preparation Tips</p>
                  <div className="space-y-1.5">
                    {prep.prep_tips.map((tip: string, i: number) => (
                      <div key={i} className="flex gap-3 border-2 border-green-200 bg-green-50 p-3">
                        <Lightbulb size={14} className="shrink-0 mt-0.5 text-green-600" />
                        <p className="text-sm font-medium text-gray-800">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Company culture + Red flags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prep.company_culture && (
                  <div className="border-2 border-blue-300 bg-blue-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-blue-700 mb-1 flex items-center gap-1"><Shield size={12} /> Company Culture</p>
                    <p className="text-sm font-medium text-gray-800">{prep.company_culture}</p>
                  </div>
                )}
                {prep.red_flags?.length > 0 && (
                  <div className="border-2 border-red-300 bg-red-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-red-700 mb-2 flex items-center gap-1"><AlertTriangle size={12} /> Avoid These Mistakes</p>
                    <ul className="space-y-1">
                      {prep.red_flags.map((f: string, i: number) => (
                        <li key={i} className="text-sm font-medium text-red-800 flex gap-2"><span>✗</span><span>{f}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button onClick={generatePrep}
                className="text-xs font-black uppercase border-2 border-neo-black px-4 py-2 hover:bg-gray-100 transition-colors">
                ↻ Regenerate
              </button>
            </div>
          )}
        </Section>

        {/* ── AI Writing Tools (optional, on-demand) ── */}
        <Section icon={MessageSquare} title="AI Writing Tools" badge="Optional">
          <p className="text-xs text-gray-500 font-medium mb-4">
            Generate a cold email or cover letter tailored to this role. Only generates when you click.
          </p>

          {toolError && (
            <div className="mb-4 border-2 border-red-400 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
              {toolError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cold Email */}
            <div className="border-2 border-neo-black p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-black text-sm uppercase">Cold Email</p>
                <button
                  onClick={() => generateTool("cold_email")}
                  disabled={toolLoading !== null}
                  className="flex items-center gap-1.5 text-xs font-black uppercase bg-neo-black text-yellow-400 px-3 py-1.5 border-2 border-neo-black shadow-[2px_2px_0_#facc15] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40"
                >
                  {toolLoading === "cold_email" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {coldEmail ? "Regenerate" : "Generate"}
                </button>
              </div>
              {coldEmail ? (
                <div>
                  <div className="flex justify-end mb-1"><CopyBtn text={coldEmail} /></div>
                  <pre className="whitespace-pre-wrap text-xs text-gray-700 leading-relaxed font-sans bg-gray-50 border border-gray-200 p-3 max-h-52 overflow-y-auto">{coldEmail}</pre>
                </div>
              ) : (
                <p className="text-xs text-gray-400 font-medium">150-200 word outreach email referencing your projects and the role requirements.</p>
              )}
            </div>

            {/* Cover Letter */}
            <div className="border-2 border-neo-black p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-black text-sm uppercase">Cover Letter</p>
                <button
                  onClick={() => generateTool("cover_letter")}
                  disabled={toolLoading !== null}
                  className="flex items-center gap-1.5 text-xs font-black uppercase bg-neo-black text-yellow-400 px-3 py-1.5 border-2 border-neo-black shadow-[2px_2px_0_#facc15] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40"
                >
                  {toolLoading === "cover_letter" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {coverLetter ? "Regenerate" : "Generate"}
                </button>
              </div>
              {coverLetter ? (
                <div>
                  <div className="flex justify-end mb-1"><CopyBtn text={coverLetter} /></div>
                  <pre className="whitespace-pre-wrap text-xs text-gray-700 leading-relaxed font-sans bg-gray-50 border border-gray-200 p-3 max-h-52 overflow-y-auto">{coverLetter}</pre>
                </div>
              ) : (
                <p className="text-xs text-gray-400 font-medium">3-paragraph cover letter aligned to the job description and your experience.</p>
              )}
            </div>
          </div>
        </Section>

      </main>
    </div>
  );
}
