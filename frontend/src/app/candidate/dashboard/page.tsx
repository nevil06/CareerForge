"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import MatchCard from "@/components/MatchCard";
import { getCandidateMatches, getProfile } from "@/lib/api";
import { Briefcase, Star, TrendingUp } from "lucide-react";

export default function CandidateDashboard() {
  const [matches, setMatches] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
            Welcome back{profile ? `, ${profile.full_name}` : ""}!
          </h1>
          <p className="text-gray-500 mt-1">Here are your latest job matches.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Matches", value: matches.length, icon: Briefcase, color: "text-brand-500" },
            { label: "Best Match", value: `${Math.round(topScore * 100)}%`, icon: Star, color: "text-yellow-500" },
            { label: "Avg Score", value: `${Math.round(avgScore * 100)}%`, icon: TrendingUp, color: "text-green-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-gray-50 ${color}`}>
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
        <CardTitle>Recommended Jobs</CardTitle>
        {loading ? (
          <p className="text-gray-400 mt-4">Loading matches…</p>
        ) : matches.length === 0 ? (
          <Card className="mt-4 text-center text-gray-400 py-12">
            No matches yet. Complete your profile to get started.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {matches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </main>
    </div>
  );
}
