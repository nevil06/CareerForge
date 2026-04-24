"use client";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
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
      const { jobs_added, queries_used, sources, message } = r.data;
      setSearchMsg(`✅ ${message}`);
      console.log("Sources:", sources, "Queries:", queries_used);
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
    <AppShell>
        <PageHeader
          eyebrow="Opportunity stream"
          title="Browse Jobs"
          description="Search the full job pool or ask the agent to branch outward from your resume."
          action={(
            <Button
            size="sm"
            onClick={handleResumeSearch}
            loading={searching}
            className="gap-2"
          >
            <Sparkles size={16} />
            Search from my Resume
            </Button>
          )}
        />

        {searchMsg && (
          <div className={`mb-4 rounded-[1.35rem] px-4 py-3 text-sm font-bold ${
            searchMsg.startsWith("✅") ? "bg-fern/15 text-moss" : "bg-sun/25 text-amber-800"
          }`}>
            {searchMsg}
          </div>
        )}

        {/* Search bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by title, skill or company…"
              className="organic-input pl-11"
            />
          </div>
          <Button onClick={handleSearch} loading={loading}>Search</Button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-stone-500">
            <Loader2 className="animate-spin" size={20} />
            Loading jobs...
          </div>
        ) : jobs.length === 0 ? (
          <Card className="py-16 text-center">
            <Sparkles className="mx-auto mb-3 text-fern" size={36} />
            <p className="font-display text-2xl font-bold text-soil">No jobs yet</p>
            <p className="mb-4 mt-1 text-sm text-stone-500">Click "Search from my Resume" to find real jobs matching your skills.</p>
            <Button size="sm" onClick={handleResumeSearch} loading={searching} className="gap-2 mx-auto">
              <Sparkles size={14} /> Search from my Resume
            </Button>
          </Card>
        ) : (
          <>
            <p className="mb-4 text-sm font-bold text-stone-500">{jobs.length} jobs found</p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job) => (
                <Card key={job.id} className="group flex flex-col h-full overflow-hidden transition-all hover:-translate-y-1 hover:shadow-leaf">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-display text-xl font-bold leading-tight text-soil pr-2">{job.title}</h4>
                    <Badge variant={job.source === "external" ? "warning" : "default"} className="flex-shrink-0">
                      {job.source}
                    </Badge>
                  </div>

                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-stone-500">
                    <Building2 size={14} className="flex-shrink-0" />
                    <span className="truncate">{job.company_name}</span>
                  </div>

                  {job.location && (
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-500">
                      <MapPin size={14} className="flex-shrink-0" />
                      <span className="truncate">{job.location}</span>
                    </div>
                  )}

                  {job.salary_min && (
                    <p className="mb-3 text-sm font-bold text-moss">
                      ${(job.salary_min / 1000).toFixed(0)}k
                      {job.salary_max ? ` – $${(job.salary_max / 1000).toFixed(0)}k` : "+"}
                    </p>
                  )}

                  {job.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {job.required_skills.slice(0, 5).map((s: string) => (
                        <Badge key={s}>{s}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-2 flex gap-2">
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
    </AppShell>
  );
}
