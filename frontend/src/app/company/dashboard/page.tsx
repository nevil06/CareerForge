"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { getCompanyDashboard, getJobMatches } from "@/lib/api";
import { Briefcase, Users, ChevronRight } from "lucide-react";

export default function CompanyDashboard() {
  const [data, setData] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    getCompanyDashboard().then((r) => setData(r.data)).catch(() => {});
  }, []);

  const loadMatches = async (jobId: number) => {
    setSelectedJob(jobId);
    const r = await getJobMatches(jobId);
    setMatches(r.data);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Company Dashboard</h1>

        {data && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { label: "Active Jobs", value: data.total_jobs, icon: Briefcase },
                { label: "Total Matches", value: data.total_matches, icon: Users },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-brand-50 text-brand-500">
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

            <div className="grid grid-cols-2 gap-6">
              {/* Job list */}
              <Card>
                <CardTitle>Your Jobs</CardTitle>
                <div className="mt-4 space-y-2">
                  {data.jobs.map((j: any) => (
                    <button key={j.id} onClick={() => loadMatches(j.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${
                        selectedJob === j.id ? "bg-brand-50 text-brand-700" : "hover:bg-gray-50 text-gray-700"
                      }`}>
                      <span className="font-medium">{j.title}</span>
                      <ChevronRight size={16} />
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
              <Card>
                <CardTitle>
                  {selectedJob ? "Matched Candidates" : "Select a job to see matches"}
                </CardTitle>
                <div className="mt-4 space-y-3">
                  {matches.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{m.candidate_name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.matched_skills.slice(0, 3).map((s: string) => (
                            <Badge key={s} variant="success">{s}</Badge>
                          ))}
                        </div>
                      </div>
                      <Badge variant={m.score_total >= 0.7 ? "success" : "warning"}>
                        {Math.round(m.score_total * 100)}%
                      </Badge>
                    </div>
                  ))}
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
