"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import api, { createJob } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import {
  Briefcase, Users, ChevronRight, Sparkles, TrendingUp,
  Plus, X, MapPin, DollarSign, Star, CheckCircle,
} from "lucide-react";

// ── Skill tag input ────────────────────────────────────────────────────────
function SkillInput({ skills, onChange }: { skills: string[]; onChange: (s: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const s = input.trim();
    if (s && !skills.includes(s)) onChange([...skills, s]);
    setInput("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {skills.map(s => (
          <span key={s} className="flex items-center gap-1 bg-yellow-400 border-2 border-neo-black text-xs font-black uppercase px-2 py-0.5">
            {s}
            <button onClick={() => onChange(skills.filter(x => x !== s))} className="hover:text-red-600">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="e.g. React, Python — press Enter to add"
          className="flex-1 border-2 border-neo-black px-3 py-2 text-sm font-medium outline-none focus:shadow-[2px_2px_0_#111] transition-shadow"
        />
        <button onClick={add} className="border-2 border-neo-black px-3 py-2 font-black text-sm hover:bg-gray-100">
          + Add
        </button>
      </div>
    </div>
  );
}

// ── Post Job Modal ─────────────────────────────────────────────────────────
function PostJobModal({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    application_link: "",
    experience_level: "mid",
    experience_years_min: 0,
    salary_min: "",
    salary_max: "",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  const submit = async () => {
    if (!form.title.trim()) { setError("Job title is required."); return; }
    if (skills.length === 0) { setError("Add at least one required skill."); return; }
    setLoading(true);
    setError("");
    try {
      await createJob({
        ...form,
        required_skills: skills,
        experience_years_min: Number(form.experience_years_min),
        salary_min: form.salary_min ? Number(form.salary_min) : undefined,
        salary_max: form.salary_max ? Number(form.salary_max) : undefined,
      });
      onPosted();
      onClose();
    } catch (e: any) {
      setError(apiErrorMessage(e, "Failed to post job. Try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white border-4 border-neo-black shadow-[8px_8px_0_#111] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between bg-neo-black text-white p-5 sticky top-0">
          <div className="flex items-center gap-3">
            <Briefcase size={20} className="text-yellow-400" />
            <div>
              <h2 className="text-lg font-black uppercase">Post a Hiring</h2>
              <p className="text-xs text-gray-400">Visible to all matching candidates instantly</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={22} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-1.5 text-neo-black">Job Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full border-2 border-neo-black px-4 py-2.5 text-sm font-medium outline-none focus:shadow-[2px_2px_0_#111] transition-shadow" />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-1.5 text-neo-black">Required Skills *</label>
            <SkillInput skills={skills} onChange={setSkills} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-1.5 text-neo-black">Job Description</label>
            <textarea rows={4} value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Describe the role, responsibilities, team, and what you're looking for..."
              className="w-full border-2 border-neo-black px-4 py-2.5 text-sm font-medium outline-none resize-none focus:shadow-[2px_2px_0_#111] transition-shadow" />
          </div>

          {/* Location + Level */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-1.5 text-neo-black">Location</label>
              <input value={form.location} onChange={e => set("location", e.target.value)}
                placeholder="e.g. Bangalore / Remote"
                className="w-full border-2 border-neo-black px-4 py-2.5 text-sm font-medium outline-none focus:shadow-[2px_2px_0_#111] transition-shadow" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-1.5 text-neo-black">Experience Level</label>
              <select value={form.experience_level} onChange={e => set("experience_level", e.target.value)}
                className="w-full border-2 border-neo-black px-4 py-2.5 text-sm font-medium outline-none bg-white">
                <option value="intern">Intern</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid-level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Staff</option>
              </select>
            </div>
          </div>

          {/* Min experience + Salary */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-1.5 text-neo-black">Min Exp (yrs)</label>
              <input type="number" min={0} value={form.experience_years_min} onChange={e => set("experience_years_min", e.target.value)}
                className="w-full border-2 border-neo-black px-4 py-2.5 text-sm font-medium outline-none focus:shadow-[2px_2px_0_#111] transition-shadow" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-1.5 text-neo-black">Salary Min (₹/yr)</label>
              <input type="number" value={form.salary_min} onChange={e => set("salary_min", e.target.value)}
                placeholder="e.g. 600000"
                className="w-full border-2 border-neo-black px-4 py-2.5 text-sm font-medium outline-none focus:shadow-[2px_2px_0_#111] transition-shadow" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-1.5 text-neo-black">Salary Max (₹/yr)</label>
              <input type="number" value={form.salary_max} onChange={e => set("salary_max", e.target.value)}
                placeholder="e.g. 1200000"
                className="w-full border-2 border-neo-black px-4 py-2.5 text-sm font-medium outline-none focus:shadow-[2px_2px_0_#111] transition-shadow" />
            </div>
          </div>

          {/* Application link */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-1.5 text-neo-black">Application Link (optional)</label>
            <input value={form.application_link} onChange={e => set("application_link", e.target.value)}
              placeholder="https://careers.yourcompany.com/apply/..."
              className="w-full border-2 border-neo-black px-4 py-2.5 text-sm font-medium outline-none focus:shadow-[2px_2px_0_#111] transition-shadow" />
          </div>

          {error && (
            <div className="border-2 border-red-400 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={submit} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-neo-black text-yellow-400 font-black uppercase py-3.5 border-2 border-neo-black shadow-[4px_4px_0_#facc15] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40">
              {loading ? "Posting…" : <><CheckCircle size={16} /> Post Hiring</>}
            </button>
            <button onClick={onClose} className="px-5 py-3.5 border-2 border-neo-black font-bold hover:bg-gray-100 transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────
export default function CompanyDashboard() {
  const [data, setData] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [screening, setScreening] = useState<Record<number, any>>({});
  const [screeningId, setScreeningId] = useState<number | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const load = () =>
    api.get("/api/company/dashboard").then((r) => setData(r.data)).catch(() => {});

  useEffect(() => { load(); }, []);

  const loadMatches = async (jobId: number) => {
    setSelectedJob(jobId);
    setMatches([]);
    setScreening({});
    const r = await api.get(`/api/jobs/${jobId}/matches`);
    setMatches(r.data);
  };

  const runScreening = async (candidateId: number, jobId: number) => {
    setScreeningId(candidateId);
    try {
      const r = await api.post(`/api/company/screen-candidate/${candidateId}`, null, {
        params: { job_id: jobId },
      });
      setScreening((prev) => ({ ...prev, [candidateId]: r.data }));
    } finally {
      setScreeningId(null);
    }
  };

  const recBadge = (rec: string) =>
    ({ hire: "success", interview: "warning", pass: "danger" }[rec] as any) || "default";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto bg-neo-white">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Company Dashboard</h1>
          <button
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-2 bg-neo-black text-yellow-400 font-black uppercase text-sm px-5 py-2.5 border-2 border-neo-black shadow-[4px_4px_0_#facc15] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">
            <Plus size={16} /> Post a Hiring
          </button>
        </div>

        {/* Post Job Modal */}
        {showPostModal && (
          <PostJobModal
            onClose={() => setShowPostModal(false)}
            onPosted={() => { load(); }}
          />
        )}

        {!data ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-3">
                  <Skeleton className="h-24" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-6">
              <div className="col-span-2"><Skeleton className="h-[400px]" /></div>
              <div className="col-span-3"><Skeleton className="h-[600px]" /></div>
            </div>
          </>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Active Jobs", value: data.total_jobs, icon: Briefcase, color: "text-brand-500", bg: "bg-brand-50" },
                { label: "Total Matches", value: data.total_matches, icon: Users, color: "text-green-500", bg: "bg-green-50" },
                { label: "Avg Match Rate", value: data.total_jobs ? `${Math.round(data.total_matches / data.total_jobs)}` : "0", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <Card key={label}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 border-2 border-neo-black shadow-neo-sm ${bg} ${color}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{value}</p>
                      <p className="text-sm text-gray-500">{label}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-6">
              {/* Job list */}
              <Card className="col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <CardTitle>Your Hirings</CardTitle>
                  <button onClick={() => setShowPostModal(true)}
                    className="flex items-center gap-1 text-xs font-black uppercase border-2 border-neo-black px-2.5 py-1.5 hover:bg-yellow-400 transition-colors">
                    <Plus size={12} /> New
                  </button>
                </div>
                <div className="space-y-1">
                  {data.jobs.map((j: any) => (
                    <button key={j.id} onClick={() => loadMatches(j.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 border-2 transition-all ${
                        selectedJob === j.id ? "bg-neo-black text-neo-white font-bold border-neo-black" : "bg-neo-white border-transparent hover:border-neo-black text-neo-black font-semibold"
                      }`}>
                      <div className="text-left min-w-0">
                        <p className="truncate text-sm">{j.title}</p>
                        {j.location && <p className={`text-xs ${selectedJob === j.id ? "text-gray-400" : "text-gray-500"}`}>{j.location}</p>}
                      </div>
                      <ChevronRight size={15} className="flex-shrink-0 ml-2" />
                    </button>
                  ))}
                  {data.jobs.length === 0 && (
                    <div className="text-center py-8">
                      <Briefcase size={28} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-bold text-gray-400 uppercase">No hirings posted yet</p>
                      <button onClick={() => setShowPostModal(true)}
                        className="mt-3 text-xs font-black uppercase underline text-neo-black hover:no-underline">
                        Post your first hiring →
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => window.location.href = "/company/jobs"}
                  className="mt-4 w-full text-xs font-bold uppercase border-2 border-neo-black px-3 py-2 hover:bg-gray-100 transition-colors">
                  Manage All Jobs
                </button>
              </Card>

              {/* Candidate matches */}
              <Card className="col-span-3 overflow-auto max-h-[600px]">
                <CardTitle>
                  {selectedJob ? "Matched Candidates" : "Select a hiring to see matches"}
                </CardTitle>
                <div className="mt-4 space-y-3">
                  {matches.map((m) => {
                    const s = screening[m.candidate_id];
                    return (
                      <div key={m.id} className="border-4 border-neo-black shadow-neo-sm bg-neo-white p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-black text-lg text-neo-black uppercase">{m.candidate_name}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {(m.matched_skills || []).slice(0, 3).map((sk: string) => (
                                <span key={sk} className="bg-neo-grey text-neo-black font-bold text-xs uppercase px-2 py-1 border-2 border-neo-black">
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`font-black text-lg ${m.score_total >= 0.7 ? "text-green-600" : "text-yellow-600"}`}>
                              {Math.round(m.score_total * 100)}% Match
                            </span>
                            <Button size="sm" variant="primary"
                              loading={screeningId === m.candidate_id}
                              onClick={() => runScreening(m.candidate_id, selectedJob!)}
                              className="gap-1 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                              <Sparkles size={14} /> AI Screen
                            </Button>
                          </div>
                        </div>

                        {s && (
                          <div className="mt-3 pt-3 border-t-4 border-neo-black bg-neo-grey p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={recBadge(s.recommendation)}>{s.recommendation}</Badge>
                              <span className="text-xs font-bold uppercase text-neo-black">{s.score}/100 — {s.overall_fit} fit</span>
                            </div>
                            <p className="text-sm font-semibold text-neo-black leading-snug">{s.summary}</p>
                            {s.interview_questions?.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-black uppercase text-neo-black mb-1">Interview Questions:</p>
                                {s.interview_questions.slice(0, 2).map((q: string, i: number) => (
                                  <p key={i} className="text-xs font-semibold text-neo-dark-grey">• {q}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {selectedJob && matches.length === 0 && (
                    <p className="text-neo-dark-grey font-bold uppercase text-sm text-center py-4">No matches yet.</p>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
