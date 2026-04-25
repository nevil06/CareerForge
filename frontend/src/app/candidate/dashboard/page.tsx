"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import MatchCard from "@/components/MatchCard";
import { Skeleton } from "@/components/ui/Skeleton";
import Badge from "@/components/ui/Badge";
import { getCandidateMatches, getProfile, getVisitedJobs } from "@/lib/api";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useAuthStore } from "@/lib/store";
import { Briefcase, Star, TrendingUp, Sparkles, ShieldCheck, AlertCircle } from "lucide-react";

export default function CandidateDashboard() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState("");
  const [visited, setVisited] = useState<Record<number, { has_prep: boolean }>>({});

  // Auth guard — wait for Supabase session before deciding to redirect
  useEffect(() => {
    const check = async () => {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth/login");
        return;
      }
      // Hydrate store if not already done (e.g. hard refresh)
      if (!token) {
        const role = session.user?.user_metadata?.role || "candidate";
        useAuthStore.getState().setAuth(
          { id: session.user.id, email: session.user.email!, role: role as "candidate" | "company" },
          session.access_token
        );
      }
      // Wrong role redirect
      const resolvedRole = session.user?.user_metadata?.role || "candidate";
      if (resolvedRole === "company") {
        router.replace("/company/dashboard");
        return;
      }
      setAuthReady(true);
    };
    check();
  }, []); // run once on mount

  useEffect(() => {
    if (!authReady) return;
    getProfile()
      .then((p) => {
        // 204 means no profile yet
        if (!p.data || p.data.careerforge_score < 70) {
          router.replace("/candidate/profile");
          return Promise.reject("no_profile");
        }
        setProfile(p.data);
        return getCandidateMatches();
      })
      .then((m) => {
        if (m) setMatches(m.data);
        // Load visited state in parallel
        return getVisitedJobs();
      })
      .then((v) => {
        if (v) {
          const map: Record<number, { has_prep: boolean }> = {};
          (v.data as any[]).forEach(r => { map[r.job_id] = { has_prep: r.has_prep }; });
          setVisited(map);
        }
      })
      .catch((e) => {
        if (e === "no_profile" || e.response?.status === 404) {
          router.replace("/candidate/profile");
        }
      })
      .finally(() => setLoading(false));
  }, [router, authReady]);

  const handleAISearch = async () => {
    setSearching(true);
    setSearchMsg("");
    try {
      const r = await api.post("/api/candidates/search-jobs");
      setSearchMsg(`✅ ${r.data.message}`);
      // Refresh matches after job search
      const m = await getCandidateMatches();
      setMatches(m.data);
    } catch (e: any) {
      setSearchMsg("❌ " + apiErrorMessage(e, "Search failed"));
    } finally {
      setSearching(false);
    }
  };

  const topScore = matches[0]?.score_total ?? 0;
  const avgScore = matches.length
    ? matches.reduce((a, m) => a + m.score_total, 0) / matches.length
    : 0;

  if (!authReady || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neo-grey">
        <div className="animate-spin h-12 w-12 border-4 border-neo-black border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto bg-neo-white">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{profile ? `, ${profile.full_name.split(" ")[0]}` : ""}! 👋
          </h1>
          {profile?.headline && <p className="text-xl font-medium text-neo-black mt-2 uppercase">{profile.headline}</p>}
          <p className="text-gray-500 mt-1">Here are your latest job matches.</p>
        </div>

        {profile?.missing_proof && profile.missing_proof.length > 0 && (
          <div className="mb-6 p-4 border-4 border-neo-black bg-neo-accent shadow-neo-sm">
            <div className="flex items-center gap-2 mb-2 text-neo-black font-black uppercase text-lg">
              <AlertCircle size={24} className="text-red-600" /> Action Required: Missing Proof
            </div>
            {profile.missing_proof.map((mp: any, i: number) => (
              <p key={i} className="text-neo-dark-grey font-bold mb-2">
                • {mp.message}
              </p>
            ))}
            <p className="text-sm mt-3 font-semibold text-neo-black italic">
              Update your resume with your GitHub link to boost your Trust Score!
            </p>
          </div>
        )}

        {profile && (
          <div className="mb-8 p-6 border-4 border-neo-black bg-neo-white shadow-neo-sm flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-2xl font-black uppercase text-neo-black">CareerForge Trust Profile</h2>
                <Badge variant={profile.trust_level === "High" ? "success" : profile.trust_level === "Medium" ? "warning" : "danger"}>
                  {profile.trust_level} Trust
                </Badge>
              </div>
              <p className="text-neo-dark-grey font-semibold mb-4 leading-relaxed">{profile.summary}</p>
              
              <div className="mb-4">
                <p className="text-xs font-black uppercase text-neo-black mb-2">Verified Skills</p>
                <div className="flex flex-wrap gap-2">
                  {profile.verified_skills?.map((sk: any, i: number) => (
                    <span key={i} className="bg-neo-grey text-neo-black font-bold text-xs uppercase px-2 py-1 border-2 border-neo-black flex items-center gap-1">
                      <ShieldCheck size={12} className="text-green-600" /> {typeof sk === "string" ? sk : sk.name}
                    </span>
                  ))}
                  {!profile.verified_skills?.length && <span className="text-sm font-semibold text-neo-dark-grey italic">No verified skills yet.</span>}
                </div>
              </div>
            </div>

            <div className="md:w-64 flex flex-col items-center justify-center border-l-4 border-neo-black pl-6">
              <p className="text-sm font-black uppercase text-neo-black mb-2 text-center">Trust Score</p>
              <div className={`text-5xl font-black mb-2 ${profile.careerforge_score >= 80 ? 'text-green-600' : profile.careerforge_score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {profile.careerforge_score}
              </div>
              <p className="text-xs font-bold text-neo-dark-grey text-center">/ 100</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Matches", value: matches.length, icon: Briefcase, color: "text-brand-500", bg: "bg-brand-50" },
            { label: "Best Match", value: `${Math.round(topScore * 100)}%`, icon: Star, color: "text-yellow-500", bg: "bg-yellow-50" },
            { label: "Avg Score", value: `${Math.round(avgScore * 100)}%`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
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

        {/* Matches */}
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Recommended Jobs</CardTitle>
          {!profile && !loading && (
            <button
              onClick={() => router.push("/candidate/profile")}
              className="text-sm text-brand-500 hover:underline font-medium"
            >
              Complete your profile →
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map((i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="h-40" />
                <Skeleton variant="text" className="w-3/4" />
                <Skeleton variant="text" className="w-1/2" />
              </div>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <Card className="text-center py-16">
            <Sparkles className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="font-semibold text-gray-700 mb-1">No job matches yet</p>
            <p className="text-sm text-gray-400 mb-4">
              Let the AI agent search jobs from your resume profile.
            </p>
            {searchMsg && <p className="text-sm mb-4 font-medium">{searchMsg}</p>}
            <button
              onClick={handleAISearch}
              disabled={searching}
              className="inline-flex items-center gap-2 bg-neo-black text-white font-black uppercase text-sm px-6 py-3 border-2 border-neo-black shadow-[4px_4px_0_#facc15] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
            >
              <Sparkles size={16} />
              {searching ? "Searching..." : "Search Jobs from My Resume"}
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {matches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                isVisited={!!visited[m.job_id]}
                hasPrep={visited[m.job_id]?.has_prep ?? false}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
