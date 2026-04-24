"use client";
import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { getProfile, uploadResume, updateProfile } from "@/lib/api";
import { Upload, CheckCircle, Loader2, FileText, User, Sparkles } from "lucide-react";
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
            "flex items-center gap-3 rounded-[1.25rem] px-4 py-2.5 text-sm transition-all",
            done && "bg-fern/15 text-moss",
            active && "bg-sun/20 font-bold text-amber-800",
            !done && !active && "text-stone-300",
          )}>
            {done && <CheckCircle size={16} className="flex-shrink-0 text-fern" />}
            {active && <Loader2 size={16} className="flex-shrink-0 animate-spin text-clay" />}
            {!done && !active && <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-stone-200" />}
            {s.label}
          </div>
        );
      })}
      {current === "error" && (
        <div className="flex items-center gap-3 rounded-[1.25rem] bg-clay/10 px-4 py-2.5 text-sm font-semibold text-clay">
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

  useEffect(() => {
    getProfile().then((r) => setProfile(r.data)).catch(() => {});
  }, []);

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
    setTimeout(() => setSaved(false), 2000);
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

        {/* Resume Upload */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-moss" />
            <CardTitle>Upload Resume</CardTitle>
          </div>

          <div
            {...getRootProps()}
            className={clsx(
              "rounded-[2rem] border-2 border-dashed p-10 text-center transition-all",
              isDragActive && "border-moss bg-fern/10",
              isProcessing && "cursor-not-allowed border-stone-200 bg-white/35",
              !isDragActive && !isProcessing && "cursor-pointer border-moss/20 hover:-translate-y-0.5 hover:border-moss/45 hover:bg-white/45",
            )}
          >
            <input {...getInputProps()} />
            {isProcessing ? (
              <Loader2 className="mx-auto mb-2 animate-spin text-moss" size={32} />
            ) : step === "done" ? (
              <CheckCircle className="mx-auto mb-2 text-fern" size={32} />
            ) : (
              <Upload className="mx-auto mb-2 text-stone-400" size={32} />
            )}
            <p className="text-sm font-bold text-soil">
              {isProcessing ? "Processing your resume…" :
               step === "done" ? "Resume parsed successfully! Drop another to re-upload." :
               step === "error" ? "Upload failed — drop your file again to retry" :
               "Drop your PDF or DOCX here, or click to browse"}
            </p>
            <p className="mt-1 text-xs font-semibold text-stone-400">PDF or DOCX · max 10MB</p>
          </div>

          <StepIndicator current={step} />
        </Card>

        {/* Profile Details */}
        {profile && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <User size={18} className="text-moss" />
              <CardTitle>Profile Details</CardTitle>
            </div>

            <div className="space-y-4">
              {[
                { label: "Full Name", key: "full_name" },
                { label: "Location", key: "location" },
                { label: "Phone", key: "phone" },
                { label: "Experience (years)", key: "experience_years", type: "number" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="organic-label">{label}</label>
                  <input
                    type={type || "text"}
                    value={profile[key] || ""}
                    onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                    className="organic-input"
                  />
                </div>
              ))}

              <div>
                <label className="organic-label">Summary</label>
                <textarea
                  rows={3}
                  value={profile.summary || ""}
                  onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                  className="organic-input"
                />
              </div>

              {/* Skills */}
              {profile.skills?.length > 0 && (
                <div>
                  <label className="organic-label">
                    Skills extracted by AI
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((s: string) => (
                      <Badge key={s} variant="success">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Preferred roles */}
              {profile.preferred_roles?.length > 0 && (
                <div>
                  <label className="organic-label">
                    Preferred Roles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {profile.preferred_roles.map((r: string) => (
                      <Badge key={r}>{r}</Badge>
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
          </Card>
        )}

        {/* Empty state — no profile yet */}
        {!profile && step === "idle" && (
          <Card className="py-12 text-center">
            <Sparkles className="mx-auto mb-3 text-fern" size={36} />
            <p className="font-display text-2xl font-bold text-soil">No profile yet</p>
            <p className="mt-1 text-sm text-stone-500">Upload your resume above and AI will fill everything in automatically.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
