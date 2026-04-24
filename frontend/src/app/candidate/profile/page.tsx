"use client";
import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Sidebar from "@/components/layout/Sidebar";
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
            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all",
            done   && "bg-green-50 text-green-700",
            active && "bg-brand-50 text-brand-700 font-medium",
            !done && !active && "text-gray-300",
          )}>
            {done   && <CheckCircle size={16} className="text-green-500 flex-shrink-0" />}
            {active && <Loader2 size={16} className="animate-spin text-brand-500 flex-shrink-0" />}
            {!done && !active && <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />}
            {s.label}
          </div>
        );
      })}
      {current === "error" && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm bg-red-50 text-red-600">
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
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        {/* Resume Upload */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-brand-500" />
            <CardTitle>Upload Resume</CardTitle>
          </div>

          <div
            {...getRootProps()}
            className={clsx(
              "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
              isDragActive    && "border-brand-500 bg-brand-50",
              isProcessing    && "border-gray-200 bg-gray-50 cursor-not-allowed",
              !isDragActive && !isProcessing && "border-gray-200 hover:border-brand-300 cursor-pointer",
            )}
          >
            <input {...getInputProps()} />
            {isProcessing ? (
              <Loader2 className="mx-auto mb-2 text-brand-400 animate-spin" size={32} />
            ) : step === "done" ? (
              <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
            ) : (
              <Upload className="mx-auto mb-2 text-gray-400" size={32} />
            )}
            <p className="text-sm font-medium text-gray-600">
              {isProcessing ? "Processing your resume…" :
               step === "done" ? "Resume parsed successfully! Drop another to re-upload." :
               step === "error" ? "Upload failed — drop your file again to retry" :
               "Drop your PDF or DOCX here, or click to browse"}
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF or DOCX · max 10MB</p>
          </div>

          <StepIndicator current={step} />
        </Card>

        {/* Profile Details */}
        {profile && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <User size={18} className="text-brand-500" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type || "text"}
                    value={profile[key] || ""}
                    onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                <textarea
                  rows={3}
                  value={profile.summary || ""}
                  onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Skills */}
              {profile.skills?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
          <Card className="text-center py-12 text-gray-400">
            <Sparkles className="mx-auto mb-3 text-gray-300" size={36} />
            <p className="font-medium">No profile yet</p>
            <p className="text-sm mt-1">Upload your resume above and AI will fill everything in automatically.</p>
          </Card>
        )}
      </main>
    </div>
  );
}
