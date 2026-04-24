"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import { Briefcase, Users, ChevronRight, Sparkles, TrendingUp } from "lucide-react";

export default function CompanyDashboard() {
  const [data, setData] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [screening, setScreening] = useState<Record<number, any>>({});
  const [screeningId, setScreeningId] = useState<number | null>(null);

  useEffect(() => {
    api.get("/api/company/dashboard").then((r) => setData(r.data)).catch(() => {});
  }, []);

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
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Company Dashboard</h1>

        {data && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Active Jobs", value: data.total_jobs, icon: Briefcase, color: "text-brand-500" },
                { label: "Total Matches", value: data.total_matches, icon: Users, color: "text-green-500" },
                { label: "Avg Match Rate", value: data.total_jobs ? `${Math.round(data.total_matches / data.total_jobs)}` : "0", icon: TrendingUp, color: "text-purple-500" },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-gray-50 ${color}`}><Icon size={20} /></div>
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
                <CardTitle>Your Jobs</CardTitle>
                <div className="mt-4 space-y-1">
                  {data.jobs.map((j: any) => (
                    <button key={j.id} onClick={() => loadMatches(j.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${
                        selectedJob === j.id ? "bg-brand-50 text-brand-700 font-medium" : "hover:bg-gray-50 text-gray-700"
                      }`}>
                      <span className="truncate">{j.title}</span>
                      <ChevronRight size={15} className="flex-shrink-0" />
                    </button>
                  ))}
                  {data.jobs.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">No jobs posted yet.</p>
                  )}
                </div>
                <Button size="sm" variant="outline" className="w-full mt-4"
                  onClick={() => window.location.href = "/company/jobs"}>
                  Manage Jobs
                </Button>
              </Card>

              {/* Candidate matches */}
              <Card className="col-span-3 overflow-auto max-h-[600px]">
                <CardTitle>
                  {selectedJob ? "Matched Candidates" : "Select a job to see matches"}
                </CardTitle>
                <div className="mt-4 space-y-3">
                  {matches.map((m) => {
                    const s = screening[m.candidate_id];
                    return (
                      <div key={m.id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm text-gray-900">{m.candidate_name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(m.matched_skills || []).slice(0, 3).map((sk: string) => (
                                <Badge key={sk} variant="success">{sk}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={m.score_total >= 0.7 ? "success" : "warning"}>
                              {Math.round(m.score_total * 100)}%
                            </Badge>
                            <Button size="sm" variant="outline"
                              loading={screeningId === m.candidate_id}
                              onClick={() => runScreening(m.candidate_id, selectedJob!)}
                              className="gap-1">
                              <Sparkles size={12} /> Screen
                            </Button>
                          </div>
                        </div>

                        {/* Screening result */}
                        {s && (
                          <div className="mt-2 pt-2 border-t border-gray-100 bg-gray-50 rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={recBadge(s.recommendation)}>{s.recommendation}</Badge>
                              <span className="text-xs text-gray-500">{s.score}/100 — {s.overall_fit} fit</span>
                            </div>
                            <p className="text-xs text-gray-600">{s.summary}</p>
                            {s.interview_questions?.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-500 mb-1">Interview Qs:</p>
                                {s.interview_questions.slice(0, 2).map((q: string, i: number) => (
                                  <p key={i} className="text-xs text-gray-500">• {q}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {selectedJob && matches.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">No matches yet.</p>
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
