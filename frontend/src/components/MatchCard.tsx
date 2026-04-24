"use client";
import { Card } from "./ui/Card";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import { MapPin, Building2, ExternalLink, Sparkles } from "lucide-react";

interface Match {
  id: number;
  job_title: string;
  company_name: string;
  score_total: number;
  score_skill: number;
  score_experience: number;
  matched_skills: string[];
  missing_skills: string[];
  application_link?: string;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MatchCard({ match }: { match: Match }) {
  const pct = Math.round(match.score_total * 100);
  const variant = pct >= 70 ? "success" : pct >= 50 ? "warning" : "default";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{match.job_title}</h4>
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
            <Building2 size={14} />{match.company_name}
          </div>
        </div>
        <Badge variant={variant} className="text-sm font-bold px-3 py-1">
          {pct}% match
        </Badge>
      </div>

      <div className="space-y-2 mb-4">
        <ScoreBar label="Skills" value={match.score_skill} />
        <ScoreBar label="Experience" value={match.score_experience} />
      </div>

      {match.matched_skills.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-1.5">Matched skills</p>
          <div className="flex flex-wrap gap-1.5">
            {match.matched_skills.slice(0, 6).map((s) => (
              <Badge key={s} variant="success">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {match.missing_skills.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1.5">Missing skills</p>
          <div className="flex flex-wrap gap-1.5">
            {match.missing_skills.slice(0, 4).map((s) => (
              <Badge key={s} variant="danger">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {match.application_link && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-2"
            onClick={() => window.location.href = `/candidate/apply/${match.job_id}`}>
            <Sparkles size={14} /> Apply with AI
          </Button>
          <Button size="sm" variant="ghost" className="gap-2"
            onClick={() => window.open(match.application_link, "_blank")}>
            <ExternalLink size={14} />
          </Button>
        </div>
      )}
      {!match.application_link && (
        <Button size="sm" variant="outline" className="w-full gap-2"
          onClick={() => window.location.href = `/candidate/apply/${match.job_id}`}>
          <Sparkles size={14} /> Apply with AI
        </Button>
      )}
    </Card>
  );
}
