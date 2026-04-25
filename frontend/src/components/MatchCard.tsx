"use client";
import { Card } from "./ui/Card";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import { MapPin, Building2, ExternalLink, Sparkles, Eye, Zap } from "lucide-react";

interface Match {
  id: number;
  job_id: number;
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
      <div className="mb-1 flex justify-between text-xs font-bold uppercase text-neo-dark-grey">
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div className="h-4 border-2 border-neo-black bg-neo-white">
        <div
          className="h-full border-r-2 border-neo-black bg-neo-grey text-neo-black transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MatchCard({
  match,
  isVisited = false,
  hasPrep = false,
}: {
  match: Match;
  isVisited?: boolean;
  hasPrep?: boolean;
}) {
  const pct = Math.round(match.score_total * 100);
  const variant = pct >= 70 ? "success" : pct >= 50 ? "warning" : "default";

  return (
    <Card className={`group relative overflow-hidden transition-all hover:translate-y-[-4px] hover:translate-x-[-4px] hover:shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] flex flex-col h-full ${
      isVisited ? "border-green-500" : ""
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="pr-2 flex-1 min-w-0">
          <h4 className="font-display text-xl font-black uppercase text-neo-black leading-tight">{match.job_title}</h4>
          <div className="mt-1 flex items-center gap-2 text-sm font-bold text-neo-dark-grey uppercase">
            <Building2 size={16} strokeWidth={2.5} className="flex-shrink-0" />{match.company_name}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Badge variant={variant} className="text-sm font-bold px-3 py-1">
            {pct}% match
          </Badge>
          {isVisited && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-green-700 bg-green-100 border border-green-400 px-1.5 py-0.5">
              <Eye size={9} /> Viewed
            </span>
          )}
          {hasPrep && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-yellow-800 bg-yellow-100 border border-yellow-400 px-1.5 py-0.5">
              <Zap size={9} /> Prep Ready
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <ScoreBar label="Skills" value={match.score_skill} />
        <ScoreBar label="Experience" value={match.score_experience} />
      </div>

      {match.matched_skills.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-neo-black">Matched skills</p>
          <div className="flex flex-wrap gap-1.5">
            {match.matched_skills.slice(0, 6).map((s) => (
              <Badge key={s} variant="success">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {match.missing_skills.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-neo-black">Missing skills</p>
          <div className="flex flex-wrap gap-1.5">
            {match.missing_skills.slice(0, 4).map((s) => (
              <Badge key={s} variant="danger">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-2">
        {match.application_link ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 gap-2"
              onClick={() => window.location.href = `/candidate/apply/${match.job_id}`}>
              <Sparkles size={14} /> {isVisited ? "View Again" : "Apply with AI"}
            </Button>
            <Button size="sm" variant="ghost" className="gap-2"
              onClick={() => window.open(match.application_link, "_blank")}>
              <ExternalLink size={14} />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="w-full gap-2"
            onClick={() => window.location.href = `/candidate/apply/${match.job_id}`}>
            <Sparkles size={14} /> {isVisited ? "View Again" : "Apply with AI"}
          </Button>
        )}
      </div>
    </Card>
  );
}

