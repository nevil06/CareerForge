"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { listJobs } from "@/lib/api";
import { MapPin, Building2, ExternalLink, Search } from "lucide-react";

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    try {
      const r = await listJobs({ q, limit: 40 });
      setJobs(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { search(); }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Browse Jobs</h1>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search by title or skill…"
              className="w-full pl-9 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <Button onClick={search} loading={loading}>Search</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{job.title}</h4>
                <Badge variant={job.source === "external" ? "warning" : "default"}>
                  {job.source}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                <Building2 size={14} />{job.company_name}
              </div>
              {job.location && (
                <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                  <MapPin size={14} />{job.location}
                </div>
              )}
              {job.required_skills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {job.required_skills.slice(0, 5).map((s: string) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
              )}
              {job.application_link && (
                <Button size="sm" variant="outline" className="w-full gap-2"
                  onClick={() => window.open(job.application_link, "_blank")}>
                  <ExternalLink size={14} /> Apply
                </Button>
              )}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
