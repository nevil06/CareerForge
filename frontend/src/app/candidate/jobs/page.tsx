"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { listJobs } from "@/lib/api";
import api from "@/lib/api";
import { MapPin, Building2, ExternalLink, Search, Sparkles, Loader2 } from "lucide-react";

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState("");

  const fetchJobs = async (query = "") => {
    setLoading(true);
    try {
      const r = await listJobs({ q: query, limit: 50 });
      setJobs(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleSearch = () => fetchJobs(q);

  const handleResumeSearch = async () => {
    setSearching(true);
    setSearchMsg("");
    try {
      const r = await api.post("/api/candidates/search-jobs");
      const { jobs_added, queries_used, message } = r.data;
      setSearchMsg(`✅ ${message}`);
      if (queries_used?.length) {
        console.log("Queries used:", queries_used);
      }
      await fetchJobs(q); // refresh list
    } catch (e: any) {
      const msg = e.response?.data?.detail;
      if (msg === "Profile not found") {
        setSearchMsg("⚠️ Upload your resume first so we know what to search for.");
      } else {
        setSearchMsg("⚠️ Job search unavailable — add JSEARCH_API_KEY to backend .env");
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Browse Jobs</h1>
          <Button
            size="sm"
            onClick={handleResumeSearch}
            loading={searching}
            className="gap-2"
          >
            <Sparkles size={16} />
            Search from my Resume
          </Button>
        </div>

        {searchMsg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            searchMsg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
          }`}>
            {searchMsg}
          </div>
        )}

        {/* Search bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by title, skill or company…"
              className="w-full pl-9 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <Button onClick={handleSearch} loading={loading}>Search</Button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="animate-spin" size={20} />
            Loading jobs…
          </div>
        ) : jobs.length === 0 ? (
          <Card className="text-center py-16 text-gray-400">
            <Sparkles className="mx-auto mb-3 text-gray-300" size={36} />
            <p className="font-medium text-gray-600">No jobs yet</p>
            <p className="text-sm mt-1 mb-4">Click "Search from my Resume" to find real jobs matching your skills.</p>
            <Button size="sm" onClick={handleResumeSearch} loading={searching} className="gap-2 mx-auto">
              <Sparkles size={14} /> Search from my Resume
            </Button>
          </Card>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{jobs.length} jobs found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 leading-tight">{job.title}</h4>
                    <Badge variant={job.source === "external" ? "warning" : "default"} className="ml-2 flex-shrink-0">
                      {job.source}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                    <Building2 size={13} className="flex-shrink-0" />
                    <span className="truncate">{job.company_name}</span>
                  </div>

                  {job.location && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                      <MapPin size={13} className="flex-shrink-0" />
                      <span className="truncate">{job.location}</span>
                    </div>
                  )}

                  {job.salary_min && (
                    <p className="text-xs text-green-600 font-medium mb-2">
                      ${(job.salary_min / 1000).toFixed(0)}k
                      {job.salary_max ? ` – $${(job.salary_max / 1000).toFixed(0)}k` : "+"}
                    </p>
                  )}

                  {job.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {job.required_skills.slice(0, 5).map((s: string) => (
                        <Badge key={s}>{s}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                      onClick={() => window.location.href = `/candidate/apply/${job.id}`}>
                      <Sparkles size={13} /> Apply with AI
                    </Button>
                    {job.application_link && (
                      <Button size="sm" variant="ghost" className="gap-1.5"
                        onClick={() => window.open(job.application_link, "_blank")}>
                        <ExternalLink size={13} />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
