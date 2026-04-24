"use client";
import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { getProfile, uploadResume, updateProfile, buildFromInterview, callAgent, getRoadmap } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { Upload, CheckCircle, Loader2, FileText, User, Sparkles, X, Plus, ShieldAlert, Lock, ArrowRight, BookOpen, GraduationCap, Trophy, Github, Target, Map, PenLine, Hammer, TrendingUp, Unlock, Check, XCircle, Star, RotateCcw, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

// ── Pipeline steps for the visual workflow diagram ─────────────────────────
const PIPELINE = [
  { id: "interests", label: "Interests", Icon: Target,      desc: "What do you want to build?" },
  { id: "roadmap",   label: "Roadmap",   Icon: Map,          desc: "AI-generated learning path" },
  { id: "learn",     label: "Learn",     Icon: BookOpen,     desc: "Study free resources" },
  { id: "quiz",      label: "Quiz",      Icon: PenLine,      desc: "Verify understanding" },
  { id: "project",   label: "Project",   Icon: Hammer,       desc: "Build portfolio work" },
  { id: "github",    label: "GitHub",    Icon: Github,       desc: "Submit & verify repo" },
  { id: "score",     label: "Score ↑",   Icon: TrendingUp,   desc: "Trust Score updated" },
];

// ── RestrictedBanner — interest capture + visual roadmap ──────────────────
function RestrictedBanner({ profile, onShowWizard, onProfileUpdate }: {
  profile: any;
  onShowWizard: () => void;
  onProfileUpdate: (p: any) => void;
}) {
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interests, setInterests] = useState("");
  const [generating, setGenerating] = useState(false);
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);

  // ── Quiz state ──────────────────────────────────────────────────────────
  const [quizChapter, setQuizChapter] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  // Try to load existing roadmap on mount
  useEffect(() => {
    getRoadmap()
      .then(r => setRoadmapData(r.data))
      .catch(() => {})
      .finally(() => setLoadingRoadmap(false));
  }, []);

  const generateRoadmap = async () => {
    if (!interests.trim()) return;
    setGenerating(true);
    try {
      await callAgent({
        action: "generate_roadmap",
        user_interests: interests,
        skills: profile.skills || [],
        current_score: profile.careerforge_score || 0,
      });
      const r = await getRoadmap();
      setRoadmapData(r.data);
      setShowInterestModal(false);
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  };

  // ── Open quiz for a chapter ─────────────────────────────────────────────
  const openQuiz = async (chapter: any) => {
    setQuizChapter(chapter);
    setQuizResult(null);
    setAnswers({});
    setQuizLoading(true);
    try {
      const res = await callAgent({
        action: "generate_quiz",
        chapter_id: chapter.id,
        chapter_title: chapter.title,
        concepts: chapter.concepts || [],
      });
      setQuestions(res.data.questions || []);
    } catch { setQuestions([]); }
    finally { setQuizLoading(false); }
  };

  const submitQuiz = async () => {
    const total = questions.length;
    const correct = questions.filter(q => answers[q.id] === q.correct_answer).length;
    const score = Math.round((correct / total) * 100);
    const res = await callAgent({
      action: "evaluate_quiz",
      chapter_id: quizChapter.id,
      chapter_title: quizChapter.title,
      quiz_score: score,
    });
    setQuizResult({ ...res.data, score, correct, total });
    // If passed, refresh roadmap to show unlocked next chapter
    if (res.data.status === "PASS") {
      try {
        const r = await getRoadmap();
        setRoadmapData(r.data);
      } catch {}
    }
  };

  const closeQuiz = () => {
    setQuizChapter(null);
    setQuestions([]);
    setAnswers({});
    setQuizResult(null);
  };


  // Count total chapters and completed ones
  const allChapters = roadmapData?.roadmap?.flatMap((l: any) => l.chapters) ?? [];
  const completedCount = allChapters.filter((c: any) => c.status === "completed").length;
  const totalChapters = allChapters.length;

  return (
    <>
      {/* ── Main restricted banner ── */}
      <div className="mb-6 border-4 border-neo-black bg-neo-white shadow-[6px_6px_0_#111] overflow-hidden">
        {/* Header bar */}
        <div className="bg-red-600 border-b-4 border-neo-black px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert size={26} className="text-white" />
            <div>
              <h2 className="text-xl font-black uppercase text-white tracking-wide">Access Restricted</h2>
              <p className="text-red-200 text-xs font-bold">Trust Score: {profile.careerforge_score ?? 0} / 100 — Need 70+ to unlock</p>
            </div>
          </div>
          <div className="bg-white border-2 border-neo-black px-4 py-2 text-center shadow-[3px_3px_0_#111]">
            <p className="text-3xl font-black text-red-600">{profile.careerforge_score ?? 0}</p>
            <p className="text-xs font-black uppercase text-gray-500">/ 100</p>
          </div>
        </div>

        {/* ── Trust Engine Pipeline Diagram ── */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Your Path to Unlock</p>
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {PIPELINE.map((step, i) => {
              const { Icon } = step;
              const isActive = step.id === (roadmapData ? "learn" : "interests");
              const isDone = i < (roadmapData ? 2 : 0);
              return (
                <div key={step.id} className="flex items-center shrink-0">
                  <div className={clsx(
                    "flex flex-col items-center w-20 text-center",
                    isDone && "opacity-100",
                    !isDone && !isActive && "opacity-40"
                  )}>
                    <div className={clsx(
                      "w-14 h-14 border-4 border-neo-black flex items-center justify-center mb-2 transition-all",
                      isDone ? "bg-green-400 shadow-[3px_3px_0_#111]" :
                      isActive ? "bg-yellow-400 shadow-[3px_3px_0_#facc15] animate-pulse" :
                      "bg-white"
                    )}>
                      <Icon size={22} strokeWidth={2.5} />
                    </div>
                    <p className="text-xs font-black uppercase leading-tight">{step.label}</p>
                    <p className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5">{step.desc}</p>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className={clsx(
                      "w-6 h-1 mx-0.5 mt-[-28px] border-t-4",
                      isDone ? "border-green-500" : "border-dashed border-gray-300"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── AI message ── */}
        {profile.roadmap?.direct_message && (
          <div className="mx-6 my-3 bg-yellow-50 border-2 border-yellow-400 p-4">
            <p className="text-sm font-bold text-gray-800 italic">
              💬 "{profile.roadmap.direct_message}"
            </p>
          </div>
        )}

        {/* ── Roadmap view ── */}
        {loadingRoadmap ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin" size={24} /></div>
        ) : roadmapData ? (
          <div className="px-6 pb-6">
            {/* Progress bar */}
            <div className="flex items-center justify-between mb-2 mt-4">
              <p className="text-xs font-black uppercase tracking-widest text-gray-600">
                Learning Roadmap — {roadmapData.target_role}
              </p>
              <p className="text-xs font-bold text-gray-500">{completedCount}/{totalChapters} chapters</p>
            </div>
            <div className="w-full bg-gray-200 h-2.5 border border-gray-300 mb-5">
              <div className="h-full bg-yellow-400 transition-all"
                style={{ width: totalChapters > 0 ? `${Math.round((completedCount/totalChapters)*100)}%` : "0%" }} />
            </div>

            {/* Chapter cards */}
            {roadmapData.roadmap?.map((lvl: any, li: number) => (
              <div key={li} className="mb-5">
                <div className="inline-block bg-neo-black text-yellow-400 text-xs font-black uppercase tracking-widest px-3 py-1 mb-3">
                  {lvl.level_name}
                </div>
                <div className="space-y-3">
                  {lvl.chapters?.map((ch: any, ci: number) => {
                    const locked = ch.status === "locked";
                    const done = ch.status === "completed";
                    return (
                      <div key={ci} className={clsx(
                        "border-4 border-neo-black p-4 transition-all",
                        done ? "bg-green-50 shadow-[3px_3px_0_#16a34a]" :
                        locked ? "bg-gray-50 opacity-50" :
                        "bg-neo-white shadow-[4px_4px_0_#111]"
                      )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3 flex-1">
                            <div className={clsx(
                              "shrink-0 w-8 h-8 border-2 border-neo-black flex items-center justify-center mt-0.5",
                              done ? "bg-green-400" : locked ? "bg-gray-200" : "bg-yellow-400"
                            )}>
                              {done ? <Check size={14} strokeWidth={3} /> : locked ? <Lock size={14} strokeWidth={2.5} /> : <span className="text-sm font-black">{ci + 1}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-sm uppercase">{ch.title}</p>
                              <p className="text-xs text-gray-500 font-medium mt-0.5">{ch.estimated_time}</p>
                              {/* Concepts */}
                              {ch.concepts?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {ch.concepts.slice(0, 4).map((c: string) => (
                                    <span key={c} className="text-[10px] bg-gray-100 border border-gray-300 px-1.5 py-0.5 font-bold">{c}</span>
                                  ))}
                                </div>
                              )}
                              {/* Free resources */}
                              {!locked && ch.free_resources?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {ch.free_resources.slice(0, 3).map((url: string, ri: number) => (
                                    <a key={ri} href={url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-[10px] font-bold text-blue-600 underline hover:text-blue-800">
                                      <BookOpen size={10} /> Resource {ri + 1}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-2">
                            <p className="text-xs font-black text-yellow-700">+{ch.project_points}pts</p>
                            {done && <Trophy size={18} className="text-green-600" />}
                            {!locked && !done && (
                              <button
                                onClick={() => openQuiz(ch)}
                                title="Take Quiz to unlock next chapter"
                                className="flex items-center gap-1.5 bg-neo-black text-yellow-400 font-black uppercase text-[10px] px-3 py-1.5 border-2 border-neo-black shadow-[2px_2px_0_#facc15] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
                                <PenLine size={11} strokeWidth={2.5} /> Take Quiz
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowInterestModal(true)}
                className="text-xs font-black uppercase border-2 border-neo-black px-4 py-2 hover:bg-gray-100 transition-colors">
                Regenerate Roadmap
              </button>
              <button onClick={onShowWizard}
                className="flex items-center gap-2 bg-neo-black text-yellow-400 font-black uppercase text-sm px-5 py-2.5 border-2 border-neo-black shadow-[4px_4px_0_#facc15] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
                <Sparkles size={16} /> Strengthen Profile — AI Interview
              </button>
            </div>
          </div>
        ) : (
          /* No roadmap yet — CTA */
          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3 mt-4">
            <button onClick={() => setShowInterestModal(true)}
              className="flex items-center gap-2 bg-yellow-400 text-neo-black font-black uppercase px-6 py-3 border-2 border-neo-black shadow-[4px_4px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              <GraduationCap size={18} /> Get My Learning Roadmap →
            </button>
            <button onClick={onShowWizard}
              className="flex items-center gap-2 bg-neo-black text-white font-black uppercase px-6 py-3 border-2 border-neo-black shadow-[4px_4px_0_#facc15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              <Sparkles size={18} /> AI Interview Instead →
            </button>
          </div>
        )}
      </div>

      {/* ── Interest Capture Modal ── */}
      {showInterestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white border-4 border-neo-black shadow-[8px_8px_0_#111] w-full max-w-lg">
            <div className="flex items-center justify-between bg-neo-black text-white p-5">
              <div className="flex items-center gap-3">
                <GraduationCap size={22} className="text-yellow-400" />
                <div>
                  <h2 className="text-lg font-black uppercase">What Do You Want to Build?</h2>
                  <p className="text-xs text-gray-400">We'll generate a personalised roadmap for you</p>
                </div>
              </div>
              <button onClick={() => setShowInterestModal(false)} className="text-gray-400 hover:text-white"><X size={22} /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-black uppercase mb-2">Your Interests & Goals</label>
              <textarea rows={4} value={interests} onChange={e => setInterests(e.target.value)}
                placeholder="e.g. I want to become a backend developer with Python and FastAPI. I already know basic Python but need to learn databases, APIs, and deployment..."
                className="w-full border-2 border-neo-black p-4 text-sm font-medium outline-none resize-none mb-4" />
              <div className="flex gap-3">
                <button onClick={generateRoadmap} disabled={generating || !interests.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 text-neo-black font-black uppercase py-3 border-2 border-neo-black shadow-[4px_4px_0_#111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-40">
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {generating ? "Building Roadmap…" : "Generate My Roadmap →"}
                </button>
                <button onClick={() => setShowInterestModal(false)} className="px-4 py-3 border-2 border-neo-black font-bold hover:bg-gray-100">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quiz Modal ── */}
      {quizChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white border-4 border-neo-black shadow-[8px_8px_0_#111] w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between bg-neo-black text-white p-5">
              <div>
                <p className="text-xs text-yellow-400 font-black uppercase tracking-widest">Chapter Quiz — 10 Questions</p>
                <h2 className="text-lg font-black uppercase">{quizChapter.title}</h2>
                <p className="text-xs text-gray-400 font-medium">Score 80% or above (8/10) to unlock the next chapter</p>
              </div>
              <button onClick={closeQuiz} className="text-gray-400 hover:text-white"><X size={22} /></button>
            </div>

            <div className="p-6">
              {/* Loading */}
              {quizLoading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 className="animate-spin text-neo-black" size={36} />
                  <p className="text-sm font-black uppercase">Generating 10 Questions…</p>
                </div>
              )}

              {/* Questions */}
              {!quizLoading && questions.length > 0 && !quizResult && (
                <div className="space-y-5">
                  {/* Progress dots */}
                  <div className="flex gap-1 flex-wrap mb-4">
                    {questions.map((_, i) => (
                      <div key={i} className={clsx(
                        "w-6 h-6 border-2 border-neo-black text-[10px] font-black flex items-center justify-center transition-all",
                        answers[questions[i].id] ? "bg-yellow-400" : "bg-white"
                      )}>{i + 1}</div>
                    ))}
                    <span className="ml-2 text-xs font-bold text-gray-500 self-center">
                      {Object.keys(answers).length}/10 answered
                    </span>
                  </div>

                  {questions.map((q: any, qi: number) => (
                    <div key={q.id} className="border-4 border-neo-black p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={clsx(
                          "w-7 h-7 border-2 border-neo-black text-xs font-black flex items-center justify-center shrink-0",
                          answers[q.id] ? "bg-yellow-400" : "bg-white"
                        )}>{qi + 1}</span>
                        <p className="font-black text-sm">{q.question}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 pl-9">
                        {q.options.map((opt: string) => (
                          <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                            className={clsx(
                              "text-left text-sm font-medium px-4 py-2.5 border-2 transition-all",
                              answers[q.id] === opt
                                ? "border-neo-black bg-yellow-100 font-bold shadow-[2px_2px_0_#111]"
                                : "border-gray-300 hover:border-neo-black hover:bg-gray-50"
                            )}>{opt}</button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={submitQuiz}
                    disabled={Object.keys(answers).length < questions.length}
                    className="w-full bg-neo-black text-yellow-400 font-black uppercase py-4 border-2 border-neo-black shadow-[4px_4px_0_#facc15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none">
                    Submit Quiz ({Object.keys(answers).length}/10 answered) →
                  </button>
                </div>
              )}

              {/* Result */}
              {quizResult && (
                <div className={clsx(
                  "border-4 p-8 text-center",
                  quizResult.status === "PASS" ? "border-green-500 bg-green-50" : "border-red-400 bg-red-50"
                )}>
                  {/* Score ring */}
                  <div className={clsx(
                    "w-28 h-28 border-8 mx-auto mb-4 flex flex-col items-center justify-center",
                    quizResult.status === "PASS" ? "border-green-500" : "border-red-400"
                  )}>
                    <p className="text-4xl font-black leading-none">{quizResult.score}%</p>
                    <p className="text-xs font-bold text-gray-500">{quizResult.correct}/{quizResult.total}</p>
                  </div>

                  <p className={clsx(
                    "text-2xl font-black uppercase mb-2 flex items-center justify-center gap-2",
                    quizResult.status === "PASS" ? "text-green-700" : "text-red-700"
                  )}>
                    {quizResult.status === "PASS"
                      ? <><Trophy size={22} className="text-green-600" /> Chapter Unlocked!</>
                      : <><XCircle size={22} className="text-red-500" /> Not Quite</>}
                  </p>
                  <p className="text-sm font-medium text-gray-700 mb-6">{quizResult.message}</p>

                  {quizResult.status === "PASS" ? (
                    <div className="space-y-3">
                      <div className="bg-yellow-400 border-2 border-neo-black px-6 py-3 inline-flex items-center gap-2 font-black text-neo-black uppercase">
                        <Check size={16} strokeWidth={3} /> +8 Points Earned
                      </div>
                      <p className="text-xs font-bold text-gray-600">Next chapter is now unlocked in your roadmap!</p>
                      <button onClick={closeQuiz}
                        className="mt-2 bg-neo-black text-white font-black uppercase px-8 py-3 border-2 border-neo-black flex items-center gap-2 mx-auto">
                        Continue <ChevronRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3 justify-center">
                      <button onClick={() => { setQuizResult(null); setAnswers({}); }}
                        className="flex items-center gap-2 bg-neo-black text-white font-black uppercase px-6 py-3 border-2 border-neo-black shadow-[3px_3px_0_#facc15] hover:shadow-none transition-all">
                        <RotateCcw size={14} /> Retry Quiz
                      </button>
                      <button onClick={closeQuiz}
                        className="flex items-center gap-2 px-6 py-3 border-2 border-neo-black font-bold hover:bg-gray-100">
                        <BookOpen size={14} /> Study More
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}



type Step = "idle" | "uploading" | "extracting" | "parsing" | "saving" | "done" | "error";

const STEPS: { key: Step; label: string }[] = [
  { key: "uploading",  label: "Uploading file…" },
  { key: "extracting", label: "Extracting text from document…" },
  { key: "parsing",    label: "AI is analysing your resume…" },
  { key: "saving",     label: "Saving your profile…" },
  { key: "done",       label: "Profile ready!" },
];

function StepIndicator({ current }: { current: Step }) {
  if (current === "idle") return null;
  const idx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="mt-4 space-y-2">
      {STEPS.map((s, i) => {
        const done = i < idx || current === "done";
        const active = s.key === current && current !== "done";
        return (
          <div key={s.key} className={clsx(
            "flex items-center gap-3 border-4 border-neo-black px-4 py-2.5 text-sm font-bold transition-all shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] mb-3",
            done && "bg-neo-grey text-neo-black",
            active && "bg-neo-grey text-neo-black",
            !done && !active && "bg-neo-white text-gray-500",
          )}>
            {done && <CheckCircle size={16} className="flex-shrink-0" />}
            {active && <Loader2 size={16} className="flex-shrink-0 animate-spin" />}
            {!done && !active && <div className="h-4 w-4 flex-shrink-0 border-2 border-gray-400" />}
            {s.label}
          </div>
        );
      })}
      {current === "error" && (
        <div className="flex items-center gap-3 border-4 border-neo-black bg-red-400 px-4 py-2.5 text-sm font-bold text-neo-black shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
          ✕ Something went wrong. Please try again.
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [step, setStep] = useState<Step>("idle");
  const [saved, setSaved] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardAnswers, setWizardAnswers] = useState({
    complex_problem: "",
    project_from_scratch: "",
    core_languages: "",
    github_link: ""
  });
  const [wizardSaving, setWizardSaving] = useState(false);

  const addSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    if (!profile.skills?.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...(profile.skills || []), newSkill.trim()] });
    }
    setNewSkill("");
  };

  const { token } = useAuthStore();
  useEffect(() => {
    if (!token) return;
    getProfile().then((r) => {
      if (r.data) {
        setProfile(r.data);
        setIsEditing(false);
      }
    }).catch(() => {});
  }, [token]);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    setStep("uploading");
    try {
      // Small delays so user can see each step
      await new Promise((r) => setTimeout(r, 400));
      setStep("extracting");
      await new Promise((r) => setTimeout(r, 600));
      setStep("parsing");

      const res = await uploadResume(files[0]); // actual API call (GLM parsing happens here)

      setStep("saving");
      await new Promise((r) => setTimeout(r, 400));
      setProfile(res.data);
      setStep("done");
      setIsEditing(true);
    } catch {
      setStep("error");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [],
    },
    maxFiles: 1,
    disabled: step !== "idle" && step !== "done" && step !== "error",
  });

  const handleSave = async () => {
    if (!profile) return;
    await updateProfile(profile);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setIsEditing(false);
    }, 1000);
  };

  const submitWizard = async () => {
    if (!wizardAnswers.complex_problem.trim() || !wizardAnswers.project_from_scratch.trim() || !wizardAnswers.core_languages.trim()) return;
    setWizardSaving(true);
    try {
      const res = await buildFromInterview(wizardAnswers);
      setProfile(res.data);
      setShowWizard(false);
    } catch (e) {
      console.error("Interview build failed", e);
    } finally {
      setWizardSaving(false);
    }
  };

  const isProcessing = !["idle", "done", "error"].includes(step);

  return (
    <AppShell>
      <div className="max-w-4xl">
        <PageHeader
          eyebrow="Resume soil"
          title="My Profile"
          description="Upload a resume and let the agent extract the structured profile that powers your matches."
        />

        {/* ── Access Restricted Banner ── */}
        {profile && profile.careerforge_score < 70 && (
          <>
            <RestrictedBanner
              profile={profile}
              onShowWizard={() => setShowWizard(true)}
              onProfileUpdate={setProfile}
            />

            {/* Interview Wizard Modal */}
            {showWizard && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                <div className="bg-white border-4 border-neo-black shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between bg-neo-black text-white p-5">
                    <div className="flex items-center gap-3">
                      <Sparkles size={22} />
                      <div>
                        <h2 className="text-xl font-black uppercase">AI Profile Interview</h2>
                        <p className="text-xs text-gray-300 font-medium">Answer honestly — the AI will evaluate your depth</p>
                      </div>
                    </div>
                    <button onClick={() => setShowWizard(false)} className="text-gray-400 hover:text-white transition-colors">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {[
                      { id: "complex_problem", label: "1. What is the most complex technical problem you've solved?", placeholder: "Describe the challenge, how you approached it, and what technologies you used...", hint: "Be specific — include tech stack, scale, and what made it hard." },
                      { id: "project_from_scratch", label: "2. Describe a project you built from scratch.", placeholder: "What did you build? What was the full tech stack? What problem does it solve?", hint: "Include architecture decisions, backend/frontend/DB choices, and any deployments." },
                      { id: "core_languages", label: "3. What are your core programming languages and frameworks?", placeholder: "e.g. Python (FastAPI, SQLAlchemy), TypeScript (Next.js, React), MySQL...", hint: "Be honest about your proficiency level for each." },
                      { id: "github_link", label: "4. GitHub username or portfolio link (optional but recommended)", placeholder: "https://github.com/your-username or https://your-portfolio.dev", hint: "This significantly boosts your Trust Score if your repos are public." }
                    ].map((q) => (
                      <div key={q.id} className="border-2 border-neo-black p-4">
                        <label className="block text-sm font-black text-neo-black uppercase tracking-wide mb-1">{q.label}</label>
                        <p className="text-xs text-gray-500 font-medium mb-2">{q.hint}</p>
                        <textarea rows={3} value={(wizardAnswers as any)[q.id]}
                          onChange={(e) => setWizardAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder={q.placeholder}
                          className="w-full border-2 border-gray-300 focus:border-neo-black p-3 text-sm font-medium text-neo-black resize-none outline-none transition-colors" />
                      </div>
                    ))}
                    <div className="flex gap-3 pt-2">
                      <button onClick={submitWizard} disabled={wizardSaving}
                        className="flex-1 flex items-center justify-center gap-2 bg-neo-black text-white font-black uppercase py-4 border-2 border-neo-black shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50">
                        {wizardSaving ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {wizardSaving ? "Analysing Your Answers…" : "Build My Profile →"}
                      </button>
                      <button onClick={() => setShowWizard(false)} className="px-5 py-4 border-2 border-neo-black font-bold text-neo-black hover:bg-gray-100 transition-colors">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}


        {/* Resume Upload */}
        {(!profile || isEditing) && (
          <Card className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-neo-black" />
              <CardTitle>Upload Resume</CardTitle>
            </div>

            <div
              {...getRootProps()}
              className={clsx(
                "border-4 border-neo-black p-10 text-center transition-all shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] bg-neo-white",
                isDragActive && "bg-neo-grey text-neo-black",
                isProcessing && "cursor-not-allowed opacity-75",
                !isDragActive && !isProcessing && "cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-neo-grey",
              )}
            >
              <input {...getInputProps()} />
              {isProcessing ? (
                <Loader2 className="mx-auto mb-2 animate-spin text-neo-black" size={32} />
              ) : step === "done" ? (
                <CheckCircle className="mx-auto mb-2 text-neo-black" size={32} />
              ) : (
                <Upload className="mx-auto mb-2 text-neo-black" size={32} />
              )}
              <p className="text-sm font-bold text-neo-black">
                {isProcessing ? "Processing your resume…" :
                 step === "done" ? "Resume parsed successfully! Drop another to re-upload." :
                 step === "error" ? "Upload failed — drop your file again to retry" :
                 "Drop your PDF or DOCX here, or click to browse"}
              </p>
              <p className="mt-1 text-xs font-bold text-gray-500">PDF or DOCX · max 10MB</p>
            </div>

            <StepIndicator current={step} />
          </Card>
        )}

        {/* Profile Details */}
        {profile && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <User size={18} className="text-neo-black" />
              <CardTitle>Profile Details</CardTitle>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                {[
                  { label: "Full Name", key: "full_name" },
                  { label: "Location", key: "location" },
                  { label: "Phone", key: "phone" },
                  { label: "Experience (years)", key: "experience_years", type: "number" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-neo-black">{label}</label>
                    <input
                      type={type || "text"}
                      value={profile[key] || ""}
                      onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                      className="w-full border-4 border-neo-black bg-neo-white px-4 py-3 text-neo-black font-bold focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] transition-all"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-neo-black">Summary</label>
                  <textarea
                    rows={3}
                    value={profile.summary || ""}
                    onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                    className="w-full border-4 border-neo-black bg-neo-white px-4 py-3 text-neo-black font-bold focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] transition-all"
                  />
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-neo-black">
                    Skills
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {profile.skills?.map((s: string) => (
                      <Badge key={s} variant="success" className="flex items-center gap-1 pr-1.5 border-2 border-neo-black bg-neo-grey text-neo-black rounded-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                        {s}
                        <button onClick={() => setProfile({...profile, skills: profile.skills.filter((skill: string) => skill !== s)})} className="hover:bg-neo-black hover:text-neo-white p-0.5 ml-1 border-l-2 border-transparent hover:border-neo-black transition-colors">
                          <X size={14} />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      value={newSkill} 
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSkill(e)}
                      placeholder="Add a skill..."
                      className="flex-1 border-4 border-neo-black bg-neo-white px-3 py-2 font-bold focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] transition-all"
                    />
                    <Button onClick={addSkill} className="gap-1 whitespace-nowrap">
                      <Plus size={16} /> Add
                    </Button>
                  </div>
                </div>

                {/* Preferred roles */}
                {profile.preferred_roles?.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-neo-black">
                      Preferred Roles
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {profile.preferred_roles.map((r: string) => (
                        <Badge key={r} className="border-2 border-neo-black bg-neo-grey text-neo-black rounded-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">{r}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={handleSave} className="w-full gap-2">
                  {saved
                    ? <><CheckCircle size={16} /> Saved!</>
                    : "Save Profile"}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black uppercase text-neo-black">{profile.full_name || "Anonymous"}</h2>
                    <p className="text-xl font-bold text-gray-600 mt-1">{profile.location || "Location not set"}</p>
                  </div>
                  <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border-4 border-neo-black bg-neo-grey p-4 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
                    <label className="block text-sm font-bold uppercase tracking-wider mb-1 text-neo-black">Contact</label>
                    <p className="font-bold text-neo-black">{profile.phone || "No phone provided"}</p>
                  </div>
                  <div className="border-4 border-neo-black bg-neo-grey p-4 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
                    <label className="block text-sm font-bold uppercase tracking-wider mb-1 text-neo-black">Experience</label>
                    <p className="font-bold text-neo-black">{profile.experience_years ? `${profile.experience_years} Years` : "Not specified"}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-neo-black">Professional Summary</label>
                  <div className="border-4 border-neo-black bg-neo-white p-4 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] font-bold text-neo-black leading-relaxed">
                    {profile.summary || "No summary provided."}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-neo-black">Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills?.length > 0 ? profile.skills.map((s: string) => (
                      <Badge key={s} className="border-2 border-neo-black bg-neo-white text-neo-black rounded-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] text-lg px-3 py-1">
                        {s}
                      </Badge>
                    )) : <p className="font-bold text-gray-500">No skills added.</p>}
                  </div>
                </div>

                {profile.preferred_roles?.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-neo-black">Preferred Roles</label>
                    <div className="flex flex-wrap gap-2">
                      {profile.preferred_roles.map((r: string) => (
                        <Badge key={r} className="border-2 border-neo-black bg-neo-white text-neo-black rounded-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Empty state — no profile yet */}
        {!profile && step === "idle" && (
          <Card className="py-12 text-center">
            <Sparkles className="mx-auto mb-3 text-neo-black" size={36} />
            <p className="font-display text-2xl font-bold text-neo-black">No profile yet</p>
            <p className="mt-1 text-sm text-gray-500 font-bold">Upload your resume above and AI will fill everything in automatically.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
