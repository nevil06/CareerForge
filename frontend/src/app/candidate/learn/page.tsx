"use client";
import { useEffect, useState, useCallback } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useAuthStore } from "@/lib/store";
import { callAgent, getRoadmap } from "@/lib/api";
import { GraduationCap, Lock, Unlock, CheckCircle, Loader2, Sparkles, BookOpen, Trophy, ChevronRight, X, Github } from "lucide-react";
import { clsx } from "clsx";

type Chapter = {
  id: string; title: string; concepts: string[]; free_resources: string[];
  estimated_time: string; learning_points: number; project_points: number;
  status: "locked" | "unlocked" | "completed"; quiz_required: boolean; project_required: boolean;
};
type Level = { level_name: string; chapters: Chapter[] };
type Roadmap = { id: number; target_role: string; level: string; skill_gaps: string[]; roadmap: Level[]; total_score_possible: number; total_points_earned: number; };
type Question = { id: string; question: string; options: string[]; correct_answer: string };

export default function LearnPage() {
  const { token } = useAuthStore();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [interests, setInterests] = useState("");

  // Quiz state
  const [quizChapter, setQuizChapter] = useState<Chapter | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);

  // Project state
  const [projectData, setProjectData] = useState<any>(null);
  const [ghLink, setGhLink] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const loadRoadmap = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getRoadmap();
      setRoadmap(res.data);
    } catch { setRoadmap(null); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadRoadmap(); }, [loadRoadmap]);

  const generateRoadmap = async () => {
    if (!interests.trim()) return;
    setGenerating(true);
    try {
      const res = await callAgent({ action: "generate_roadmap", user_interests: interests });
      await loadRoadmap();
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  };

  const openQuiz = async (chapter: Chapter) => {
    setQuizChapter(chapter); setQuizResult(null); setAnswers({});
    setQuizLoading(true);
    try {
      const res = await callAgent({ action: "generate_quiz", chapter_id: chapter.id, chapter_title: chapter.title, concepts: chapter.concepts });
      setQuestions(res.data.questions || []);
    } catch { setQuestions([]); }
    finally { setQuizLoading(false); }
  };

  const submitQuiz = async () => {
    const total = questions.length;
    const correct = questions.filter(q => answers[q.id] === q.correct_answer).length;
    const score = Math.round((correct / total) * 100);
    const res = await callAgent({ action: "evaluate_quiz", chapter_id: quizChapter!.id, chapter_title: quizChapter!.title, quiz_score: score });
    setQuizResult({ ...res.data, score, correct, total });
    if (res.data.status === "PASS") {
      const proj = await callAgent({ action: "generate_project", chapter_id: quizChapter!.id, chapter_title: quizChapter!.title, concepts: quizChapter!.concepts });
      setProjectData(proj.data.project);
    }
  };

  const submitProject = async () => {
    if (!ghLink.trim() || !projectData) return;
    setVerifyLoading(true);
    try {
      const res = await callAgent({ action: "verify_project", chapter_id: quizChapter!.id, chapter_title: quizChapter!.title, github_link: ghLink, verification_rules: projectData.verification_rules });
      setVerifyResult(res.data);
      if (res.data.status === "PASS") await loadRoadmap();
    } catch (e) { console.error(e); }
    finally { setVerifyLoading(false); }
  };

  const closeModal = () => { setQuizChapter(null); setQuestions([]); setQuizResult(null); setProjectData(null); setVerifyResult(null); setGhLink(""); };

  const totalEarned = roadmap?.total_points_earned ?? 0;
  const totalPossible = roadmap?.total_score_possible ?? 0;
  const pct = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

  return (
    <AppShell>
      <div className="max-w-4xl">
        <PageHeader eyebrow="CareerForge Agent" title="Learn & Earn" description="Complete chapters, pass quizzes, build projects — earn points and boost your Trust Score." />

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin" size={32} /></div>
        ) : !roadmap ? (
          /* ── Generate Roadmap ── */
          <div className="border-4 border-neo-black bg-neo-white p-8 shadow-[6px_6px_0_#111]">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-neo-black p-3"><GraduationCap className="text-yellow-400" size={28} /></div>
              <div>
                <h2 className="text-2xl font-black uppercase">Generate Your Roadmap</h2>
                <p className="text-sm text-gray-500 font-medium">Tell the AI what you want to learn and it'll build a personalised path.</p>
              </div>
            </div>
            <textarea rows={3} value={interests} onChange={e => setInterests(e.target.value)}
              placeholder="e.g. I want to become a backend developer using Python and FastAPI..."
              className="w-full border-2 border-neo-black p-4 text-sm font-medium outline-none resize-none mb-4" />
            <button onClick={generateRoadmap} disabled={generating || !interests.trim()}
              className="flex items-center gap-2 bg-neo-black text-yellow-400 font-black uppercase px-8 py-4 border-2 border-neo-black shadow-[4px_4px_0_#facc15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50">
              {generating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {generating ? "Building Roadmap…" : "Generate My Roadmap →"}
            </button>
          </div>
        ) : (
          <>
            {/* ── Progress Header ── */}
            <div className="mb-6 border-4 border-neo-black bg-neo-black text-white p-6 shadow-[6px_6px_0_#facc15]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-yellow-400">Target Role</p>
                  <h2 className="text-2xl font-black uppercase">{roadmap.target_role}</h2>
                  <p className="text-sm text-gray-400 font-medium">{roadmap.level} • {roadmap.skill_gaps?.length ?? 0} skill gaps identified</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-yellow-400">{totalEarned}</p>
                  <p className="text-xs font-bold uppercase text-gray-400">/ {totalPossible} pts</p>
                </div>
              </div>
              <div className="w-full bg-gray-700 h-3 border border-gray-600">
                <div className="h-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs font-bold text-gray-400 mt-1">{pct}% complete</p>
            </div>

            {/* ── Roadmap Levels ── */}
            {roadmap.roadmap.map((lvl, li) => (
              <div key={li} className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-neo-black text-yellow-400 px-3 py-1 text-xs font-black uppercase tracking-widest">{lvl.level_name}</div>
                </div>
                <div className="space-y-3">
                  {lvl.chapters.map((ch) => {
                    const isLocked = ch.status === "locked";
                    const isDone = ch.status === "completed";
                    return (
                      <div key={ch.id} className={clsx(
                        "border-4 border-neo-black p-5 transition-all",
                        isDone ? "bg-green-50" : isLocked ? "bg-gray-50 opacity-60" : "bg-neo-white shadow-[4px_4px_0_#111]"
                      )}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={clsx("mt-0.5 p-1.5 border-2 border-neo-black shrink-0",
                              isDone ? "bg-green-400" : isLocked ? "bg-gray-200" : "bg-yellow-400")}>
                              {isDone ? <CheckCircle size={16} /> : isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-black text-base uppercase">{ch.title}</h3>
                              <p className="text-xs text-gray-500 font-medium mt-0.5">{ch.estimated_time} • {ch.concepts.slice(0, 3).join(", ")}{ch.concepts.length > 3 ? "…" : ""}</p>
                              <div className="flex gap-3 mt-2">
                                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 border border-blue-300">+{ch.learning_points} quiz pts</span>
                                <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 border border-yellow-300">+{ch.project_points} project pts</span>
                              </div>
                              {ch.free_resources?.length > 0 && !isLocked && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {ch.free_resources.slice(0, 2).map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs font-bold text-blue-700 underline hover:text-blue-900">
                                      <BookOpen size={11} /> Resource {i + 1}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {!isLocked && !isDone && (
                            <button onClick={() => openQuiz(ch)}
                              className="shrink-0 flex items-center gap-2 bg-neo-black text-white font-black uppercase text-xs px-4 py-2.5 border-2 border-neo-black shadow-[3px_3px_0_#facc15] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
                              Start <ChevronRight size={14} />
                            </button>
                          )}
                          {isDone && <Trophy size={22} className="text-green-600 shrink-0 mt-1" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Quiz / Project Modal ── */}
      {quizChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white border-4 border-neo-black shadow-[8px_8px_0_#111] w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between bg-neo-black text-white p-5">
              <div>
                <h2 className="text-lg font-black uppercase">{quizChapter.title}</h2>
                <p className="text-xs text-gray-400 font-medium">{verifyResult ? "Project Verification" : projectData ? "Build the Project" : quizResult ? "Quiz Result" : "Quiz"}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-white"><X size={22} /></button>
            </div>

            <div className="p-6">
              {/* Loading quiz */}
              {quizLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={32} /></div>}

              {/* Questions */}
              {!quizLoading && questions.length > 0 && !quizResult && (
                <div className="space-y-6">
                  {questions.map((q, qi) => (
                    <div key={q.id} className="border-2 border-neo-black p-4">
                      <p className="font-black text-sm mb-3">{qi + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt) => (
                          <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                            className={clsx("w-full text-left text-sm font-medium px-4 py-2.5 border-2 transition-all",
                              answers[q.id] === opt ? "border-neo-black bg-yellow-100 font-bold" : "border-gray-300 hover:border-neo-black")}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={submitQuiz} disabled={Object.keys(answers).length < questions.length}
                    className="w-full bg-neo-black text-yellow-400 font-black uppercase py-4 border-2 border-neo-black shadow-[4px_4px_0_#facc15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-40">
                    Submit Quiz →
                  </button>
                </div>
              )}

              {/* Quiz result */}
              {quizResult && !projectData && (
                <div className={clsx("border-4 p-6 text-center", quizResult.status === "PASS" ? "border-green-500 bg-green-50" : "border-red-400 bg-red-50")}>
                  <p className="text-5xl font-black mb-2">{quizResult.score}%</p>
                  <p className="text-sm font-bold mb-4">{quizResult.correct}/{quizResult.total} correct</p>
                  <p className={clsx("text-xl font-black uppercase mb-3", quizResult.status === "PASS" ? "text-green-700" : "text-red-700")}>{quizResult.status}</p>
                  <p className="text-sm font-medium text-gray-700">{quizResult.message}</p>
                  {quizResult.status === "FAIL" && (
                    <button onClick={() => { setQuizResult(null); setAnswers({}); }}
                      className="mt-4 bg-neo-black text-white font-black uppercase px-6 py-3 border-2 border-neo-black">Retry Quiz</button>
                  )}
                </div>
              )}

              {/* Project brief */}
              {projectData && !verifyResult && (
                <div className="space-y-5">
                  <div className="border-4 border-yellow-400 bg-yellow-50 p-5">
                    <p className="text-xs font-black uppercase tracking-widest text-yellow-700 mb-1">Your Project Challenge</p>
                    <h3 className="text-xl font-black">{projectData.title}</h3>
                    <p className="text-sm font-medium text-gray-700 mt-2">{projectData.problem_statement}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-2 border-neo-black p-4">
                      <p className="text-xs font-black uppercase mb-2">Tech Stack</p>
                      <div className="flex flex-wrap gap-1">{projectData.tech_stack?.map((t: string) => <span key={t} className="text-xs bg-neo-black text-white px-2 py-0.5 font-bold">{t}</span>)}</div>
                    </div>
                    <div className="border-2 border-neo-black p-4">
                      <p className="text-xs font-black uppercase mb-2">Features Required</p>
                      <ul className="space-y-1">{projectData.features?.map((f: string, i: number) => <li key={i} className="text-xs font-medium">• {f}</li>)}</ul>
                    </div>
                  </div>
                  <div className="border-2 border-neo-black p-4">
                    <p className="text-xs font-black uppercase mb-2">Expected Output</p>
                    <p className="text-sm font-medium">{projectData.expected_output}</p>
                  </div>
                  <div className="border-2 border-neo-black p-4">
                    <p className="text-xs font-black uppercase mb-2">Required Files in Repo</p>
                    <div className="flex flex-wrap gap-1">{projectData.verification_rules?.required_files?.map((f: string) => <code key={f} className="text-xs bg-gray-100 border border-gray-300 px-2 py-0.5">{f}</code>)}</div>
                  </div>
                  <div className="flex gap-3">
                    <input value={ghLink} onChange={e => setGhLink(e.target.value)} placeholder="https://github.com/your-username/repo"
                      className="flex-1 border-2 border-neo-black p-3 text-sm font-medium outline-none" />
                    <button onClick={submitProject} disabled={verifyLoading || !ghLink.trim()}
                      className="flex items-center gap-2 bg-neo-black text-yellow-400 font-black uppercase px-5 py-3 border-2 border-neo-black shadow-[3px_3px_0_#facc15] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-40">
                      {verifyLoading ? <Loader2 className="animate-spin" size={16} /> : <Github size={16} />}
                      {verifyLoading ? "Verifying…" : "Verify"}
                    </button>
                  </div>
                </div>
              )}

              {/* Verify result */}
              {verifyResult && (
                <div className={clsx("border-4 p-6 text-center", verifyResult.status === "PASS" ? "border-green-500 bg-green-50" : "border-red-400 bg-red-50")}>
                  <p className="text-5xl font-black mb-2">{verifyResult.score ?? 0}%</p>
                  <p className={clsx("text-xl font-black uppercase mb-3", verifyResult.status === "PASS" ? "text-green-700" : "text-red-700")}>{verifyResult.status}</p>
                  <p className="text-sm font-medium text-gray-700 mb-4">{verifyResult.feedback}</p>
                  {verifyResult.status === "PASS" && (
                    <div className="bg-yellow-400 border-2 border-neo-black px-6 py-3 inline-block font-black text-neo-black uppercase">
                      +{verifyResult.award_points} Points Earned! 🎉
                    </div>
                  )}
                  {verifyResult.status === "FAIL" && (
                    <button onClick={() => setVerifyResult(null)} className="bg-neo-black text-white font-black uppercase px-6 py-3 border-2 border-neo-black">Try Again</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
