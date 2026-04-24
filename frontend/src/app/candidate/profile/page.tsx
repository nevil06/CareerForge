"use client";
import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { getProfile, uploadResume, updateProfile, buildFromInterview } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { Upload, CheckCircle, Loader2, FileText, User, Sparkles, X, Plus, ShieldAlert, Lock, ArrowRight } from "lucide-react";
import { clsx } from "clsx";

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

        {/* Access Restricted Banner / Roadmap */}
        {profile && profile.careerforge_score < 70 && (
          <>
            <div className="mb-6 p-6 border-4 border-neo-black bg-red-100 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
              <div className="flex items-start gap-4">
                <div className="bg-red-600 text-white p-3 border-2 border-neo-black mt-1">
                  <ShieldAlert size={28} />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black uppercase text-red-700 mb-2 flex items-center gap-2">
                    <Lock size={20} /> Access Restricted
                  </h2>
                  <p className="text-neo-black font-bold text-lg mb-4">
                    Trust Score: <span className="text-red-600">{profile.careerforge_score} / 100</span> — You need <span className="text-red-600">70+</span> to unlock the platform.
                  </p>
                  <div className="bg-white border-2 border-neo-black p-4 mb-4">
                    <p className="font-bold text-neo-black text-sm italic">
                      "{profile.roadmap?.direct_message || "Your resume lacks verifiable proof or GitHub projects. We require a higher trust score to unlock the platform."}"
                    </p>
                  </div>

                  {profile.roadmap?.action_steps && profile.roadmap.action_steps.length > 0 && (
                    <div className="mb-5">
                      <h3 className="text-sm font-black uppercase tracking-widest text-red-800 mb-3">Roadmap to Unlock</h3>
                      <ul className="space-y-3">
                        {profile.roadmap.action_steps.map((step: string, i: number) => (
                          <li key={i} className="flex gap-3 text-neo-black font-semibold bg-white p-3 border-2 border-neo-black">
                            <ArrowRight className="text-red-500 shrink-0 mt-0.5" size={18} />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => setShowWizard(true)}
                    className="mt-2 flex items-center gap-2 bg-neo-black text-white font-black uppercase px-6 py-3 border-2 border-neo-black shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                  >
                    <Sparkles size={18} /> Strengthen My Profile — AI Interview
                  </button>
                </div>
              </div>
            </div>

            {/* Interview Wizard Modal */}
            {showWizard && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                <div className="bg-white border-4 border-neo-black shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  {/* Header */}
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

                  {/* Questions */}
                  <div className="p-6 space-y-6">
                    {[
                      {
                        id: "complex_problem",
                        label: "1. What is the most complex technical problem you've solved?",
                        placeholder: "Describe the challenge, how you approached it, and what technologies you used...",
                        hint: "Be specific — include tech stack, scale, and what made it hard."
                      },
                      {
                        id: "project_from_scratch",
                        label: "2. Describe a project you built from scratch.",
                        placeholder: "What did you build? What was the full tech stack? What problem does it solve?",
                        hint: "Include architecture decisions, backend/frontend/DB choices, and any deployments."
                      },
                      {
                        id: "core_languages",
                        label: "3. What are your core programming languages and frameworks?",
                        placeholder: "e.g. Python (FastAPI, SQLAlchemy), TypeScript (Next.js, React), MySQL...",
                        hint: "Be honest about your proficiency level for each."
                      },
                      {
                        id: "github_link",
                        label: "4. GitHub username or portfolio link (optional but recommended)",
                        placeholder: "https://github.com/your-username or https://your-portfolio.dev",
                        hint: "This significantly boosts your Trust Score if your repos are public."
                      }
                    ].map((q) => (
                      <div key={q.id} className="border-2 border-neo-black p-4">
                        <label className="block text-sm font-black text-neo-black uppercase tracking-wide mb-1">{q.label}</label>
                        <p className="text-xs text-gray-500 font-medium mb-2">{q.hint}</p>
                        <textarea
                          rows={3}
                          value={(wizardAnswers as any)[q.id]}
                          onChange={(e) => setWizardAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder={q.placeholder}
                          className="w-full border-2 border-gray-300 focus:border-neo-black p-3 text-sm font-medium text-neo-black resize-none outline-none transition-colors"
                        />
                      </div>
                    ))}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={submitWizard}
                        disabled={wizardSaving}
                        className="flex-1 flex items-center justify-center gap-2 bg-neo-black text-white font-black uppercase py-4 border-2 border-neo-black shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {wizardSaving ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {wizardSaving ? "Analysing Your Answers…" : "Build My Profile →"}
                      </button>
                      <button
                        onClick={() => setShowWizard(false)}
                        className="px-5 py-4 border-2 border-neo-black font-bold text-neo-black hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
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
