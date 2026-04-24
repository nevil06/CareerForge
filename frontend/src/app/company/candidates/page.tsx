"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import {
  Search, User, MapPin, Briefcase, Sparkles,
  ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2,
} from "lucide-react";
import { clsx } from "clsx";

interface Candidate {
  id: number;
  full_name: string;
  location: string;
  summary: string;
  skills: string[];
  experience_years: number;
  preferred_roles: string[];
}

interface ScreeningResult {
  overall_fit: string;
  score: number;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  interview_questions: string[];
  summary: string;
}

function CandidateCard({ candidate, jobs }: { candidate: Candidate; jobs: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedJob, setSelectedJob] = useState("");
  const [screening, setScreening] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runScreening = async () => {
    if (!selectedJob) return;
    setLoading(true);
    try {
      const r = await api.post(`/api/company/screen-candidate/${candidate.id}`, null, {
        params: { job_id: selectedJob },
      });
      setScreening(r.data);
    } finally {
      setLoading(false);
    }
  };

  const fitColor = {
    strong: "success",
    moderate: "warning",
    weak: "danger",
  }[screening?.overall_fit || ""] as any;

  const recColor = {
    hire: "success",
    interview: "warning",
    pass: "danger",
  }[screening?.recommendation || ""] as any;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm flex-shrink-0">
            {candidate.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{candidate.full_name}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              {candidate.location && (
                <span className="flex items-center gap-1"><MapPin size={11} />{candidate.location}</span>
              )}
              <span className="flex items-center gap-1"><Briefcase size={11} />{candidate.experience_years}y exp</span>
            </div>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {candidate.summary && (
        <p className="text-sm text-gray-500 mt-3 line-clamp-2">{candidate.summary}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mt-3">
        {candidate.skills.slice(0, 6).map((s) => (
          <Badge key={s}>{s}</Badge>
        ))}
        {candidate.skills.length > 6 && (
          <Badge variant="default">+{candidate.skills.length - 6}</Badge>
        )}
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {/* AI Screening */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">AI Screen for Job</p>
            <div className="flex gap-2">
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select a job…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
              <Button size="sm" onClick={runScreening} loading={loading}
                disabled={!selectedJob} className="gap-1.5">
                <Sparkles size={14} /> Screen
              </Button>
            </div>
          </div>

          {/* Screening Results */}
          {screening && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={fitColor}>{screening.overall_fit} fit</Badge>
                  <Badge variant={recColor}>{screening.recommendation}</Badge>
                </div>
                <span className="text-2xl font-bold text-gray-900">{screening.score}/100</span>
              </div>

              <p className="text-sm text-gray-600">{screening.summary}</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1.5">Strengths</p>
                  {screening.strengths.map((s) => (
                    <div key={s} className="flex items-start gap-1.5 text-xs text-gray-600 mb-1">
                      <CheckCircle size={11} className="text-green-500 mt-0.5 flex-shrink-0" />{s}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-medium text-red-600 mb-1.5">Concerns</p>
                  {screening.concerns.length === 0
                    ? <p className="text-xs text-gray-400">None</p>
                    : screening.concerns.map((c) => (
                      <div key={c} className="flex items-start gap-1.5 text-xs text-gray-600 mb-1">
                        <XCircle size={11} className="text-red-400 mt-0.5 flex-shrink-0" />{c}
                      </div>
                    ))}
                </div>
              </div>

              {screening.interview_questions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1.5">Suggested Interview Questions</p>
                  <ol className="space-y-1">
                    {screening.interview_questions.map((q, i) => (
                      <li key={i} className="text-xs text-gray-600">{i + 1}. {q}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [form, setForm] = useState({
    query: "", skills: "", min_experience: 0, location: "",
  });

  const search = async () => {
    setLoading(true);
    setSearched(true);
    try {
      // Load jobs for screening
      const jobsRes = await api.get("/api/company/dashboard");
      setJobs(jobsRes.data.jobs || []);

      const r = await api.post("/api/company/search-candidates", {
        query: form.query,
        skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
        min_experience: Number(form.min_experience),
        location: form.location,
        limit: 30,
      });
      setCandidates(r.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Find Candidates</h1>

        {/* Search form */}
        <Card className="mb-6">
          <CardTitle>Search Candidates</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Keyword</label>
              <input
                value={form.query}
                onChange={(e) => setForm({ ...form, query: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="e.g. Python developer, ML engineer…"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
              <input
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="Python, React, Docker…"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="San Francisco, Remote…"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Experience (years)</label>
              <input
                type="number"
                value={form.min_experience}
                onChange={(e) => setForm({ ...form, min_experience: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={search} loading={loading} className="w-full gap-2">
                <Search size={16} /> Search Candidates
              </Button>
            </div>
          </div>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="animate-spin" size={20} /> Searching candidates…
          </div>
        ) : searched && candidates.length === 0 ? (
          <Card className="text-center py-12 text-gray-400">
            No candidates found. Try broader search terms.
          </Card>
        ) : (
          <>
            {candidates.length > 0 && (
              <p className="text-sm text-gray-500 mb-4">{candidates.length} candidates found</p>
            )}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {candidates.map((c) => (
                <CandidateCard key={c.id} candidate={c} jobs={jobs} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
