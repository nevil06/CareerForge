"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import {
  FileText, Mail, BookOpen, Sparkles, Copy, CheckCircle,
  Loader2, ChevronDown, ChevronUp, ExternalLink, Download,
} from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-500 transition-colors"
    >
      {copied ? <CheckCircle size={13} className="text-green-500" /> : <Copy size={13} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function Section({ icon: Icon, title, content, defaultOpen = false }: {
  icon: any; title: string; content: string; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="mb-4">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-brand-500" />
          <CardTitle>{title}</CardTitle>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className="mt-4">
          <div className="flex justify-end mb-2">
            <CopyButton text={content} />
          </div>
          <pre className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm whitespace-pre-wrap text-gray-700 max-h-80 overflow-auto font-sans leading-relaxed">
            {content}
          </pre>
        </div>
      )}
    </Card>
  );
}

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [pkg, setPkg] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/api/jobs/${jobId}`).then((r) => setJob(r.data)).catch(() => {});
  }, [jobId]);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api.post(`/api/candidates/apply/${jobId}`);
      setPkg(r.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Generation failed. Make sure your profile is complete.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto max-w-3xl">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} className="text-brand-500" />
            <h1 className="text-2xl font-bold text-gray-900">AI Application Package</h1>
          </div>
          {job && (
            <p className="text-gray-500 text-sm">
              {job.title} · {job.company_name}
              {job.application_link && (
                <a href={job.application_link} target="_blank" rel="noreferrer"
                  className="ml-2 inline-flex items-center gap-1 text-brand-500 hover:underline">
                  <ExternalLink size={12} /> View Job
                </a>
              )}
            </p>
          )}
        </div>

        {/* Generate form */}
        {!pkg && (
          <Card className="mb-6">
            <CardTitle>Generate Application Materials</CardTitle>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              AI will tailor your resume, write a cold email, and create a cover letter — all specific to this job.
            </p>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <Button onClick={generate} loading={loading} className="w-full gap-2">
              {loading
                ? "GLM is writing your application…"
                : <><Sparkles size={16} /> Generate Full Application Package</>}
            </Button>
            {loading && (
              <div className="mt-4 space-y-2">
                {[
                  "Detecting recruiter name…",
                  "Analysing job requirements…",
                  "Tailoring your resume…",
                  "Writing cold email…",
                  "Crafting cover letter…",
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 size={14} className="animate-spin text-brand-400" />
                    {s}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Results */}
        {pkg && (
          <>
            {/* Recruiter detected */}
            {pkg.recruiter_name && (
              <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Recruiter auto-detected: <strong>{pkg.recruiter_name}</strong>
              </div>
            )}
            {/* Summary card */}
            {pkg.summary && (
              <Card className="mb-4 bg-brand-50 border-brand-100">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-brand-500" />
                  <CardTitle>Match Analysis</CardTitle>
                </div>
                <p className="text-sm text-gray-700 mb-3">{pkg.summary.match_summary}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-green-700 mb-1.5">Key Strengths</p>
                    <ul className="space-y-1">
                      {(pkg.summary.key_strengths || []).map((s: string) => (
                        <li key={s} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <CheckCircle size={11} className="text-green-500" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-orange-600 mb-1.5">Skill Gaps</p>
                    <ul className="space-y-1">
                      {(pkg.summary.skill_gaps || []).length === 0
                        ? <li className="text-xs text-gray-400">None identified</li>
                        : (pkg.summary.skill_gaps || []).map((s: string) => (
                          <li key={s} className="text-xs text-gray-600">• {s}</li>
                        ))}
                    </ul>
                  </div>
                </div>
                {pkg.summary.suggested_subject_line && (
                  <div className="mt-3 pt-3 border-t border-brand-100">
                    <p className="text-xs text-gray-500">Suggested email subject:</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{pkg.summary.suggested_subject_line}</p>
                  </div>
                )}
              </Card>
            )}

            <Section icon={Mail}     title="Cold Outreach Email"  content={pkg.cold_email}       defaultOpen={true} />
            <Section icon={FileText} title="Tailored Resume"      content={pkg.tailored_resume}  />
            <Section icon={BookOpen} title="Cover Letter"         content={pkg.cover_letter}     />

            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1 gap-2"
                onClick={async () => {
                  try {
                    const res = await api.get(`/api/candidates/apply/${jobId}/resume.pdf`, { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', 'Tailored_Resume.pdf');
                    document.body.appendChild(link);
                    link.click();
                    link.parentNode?.removeChild(link);
                  } catch (e) {
                    alert("Failed to download resume.");
                  }
                }}>
                <Download size={16} /> Download Resume PDF
              </Button>
              <Button variant="outline" onClick={() => setPkg(null)}>
                Regenerate
              </Button>
              {job?.application_link && (
                <Button className="flex-1 gap-2"
                  onClick={() => window.open(job.application_link, "_blank")}>
                  <ExternalLink size={16} /> Apply Now
                </Button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
