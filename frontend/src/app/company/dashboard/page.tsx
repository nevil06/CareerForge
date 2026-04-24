"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
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
      <main className="flex-1 p-8 overflow-auto bg-neo-white">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Company Dashboard</h1>

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
              <div className="col-span-2">
                <Skeleton className="h-[400px]" />
              </div>
              <div className="col-span-3">
                <Skeleton className="h-[600px]" />
              </div>
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
                <CardTitle>Your Jobs</CardTitle>
                <div className="mt-4 space-y-1">
                  {data.jobs.map((j: any) => (
                    <button key={j.id} onClick={() => loadMatches(j.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 border-2 transition-all ${
                        selectedJob === j.id ? "bg-neo-black text-neo-white font-bold" : "bg-neo-white border-transparent hover:border-neo-black text-neo-black font-semibold"
                      }`}>
                      <span className="truncate">{j.title}</span>
                      <ChevronRight size={15} className="flex-shrink-0" />
                    </button>
                  ))}
                  {data.jobs.length === 0 && (
                    <p className="text-neo-dark-grey text-sm text-center py-4 font-bold">No jobs posted yet.</p>
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

                        {/* Screening result */}
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
