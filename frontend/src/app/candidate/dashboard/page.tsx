"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import MatchCard from "@/components/MatchCard";
import { getCandidateMatches, getProfile } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { Briefcase, Star, TrendingUp, Sparkles } from "lucide-react";

export default function CandidateDashboard() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!token && !localStorage.getItem("token")) {
      router.replace("/auth/login");
      return;
    }
    if (user && user.role === "company") {
      router.replace("/company/dashboard");
      return;
    }
  }, [token, user, router]);

  useEffect(() => {
    Promise.all([getCandidateMatches(), getProfile()])
      .then(([m, p]) => { setMatches(m.data); setProfile(p.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const topScore = matches[0]?.score_total ?? 0;
  const avgScore = matches.length
    ? matches.reduce((a, m) => a + m.score_total, 0) / matches.length
    : 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{profile ? `, ${profile.full_name.split(" ")[0]}` : ""}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Here are your latest job matches.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Matches", value: matches.length, icon: Briefcase, color: "text-brand-500", bg: "bg-brand-50" },
            { label: "Best Match", value: `${Math.round(topScore * 100)}%`, icon: Star, color: "text-yellow-500", bg: "bg-yellow-50" },
            { label: "Avg Score", value: `${Math.round(avgScore * 100)}%`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${bg} ${color}`}>
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
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="h-2 bg-gray-100 rounded mb-2" />
                <div className="h-2 bg-gray-100 rounded w-5/6" />
              </div>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <Card className="text-center py-16">
            <Sparkles className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="font-semibold text-gray-700 mb-1">No matches yet</p>
            <p className="text-sm text-gray-400 mb-4">
              {profile
                ? "Go to Browse Jobs and click \"Search from my Resume\" to find matches."
                : "Upload your resume to get personalised job matches."}
            </p>
            <button
              onClick={() => router.push(profile ? "/candidate/jobs" : "/candidate/profile")}
              className="text-sm text-brand-500 hover:underline font-medium"
            >
              {profile ? "Browse Jobs →" : "Upload Resume →"}
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {matches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </main>
    </div>
  );
}
