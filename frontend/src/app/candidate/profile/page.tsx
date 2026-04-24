"use client";
import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { getProfile, uploadResume, updateProfile } from "@/lib/api";
import { Upload, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProfile().then((r) => setProfile(r.data)).catch(() => {});
  }, []);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    setUploading(true);
    try {
      const res = await uploadResume(files[0]);
      setProfile(res.data);
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "application/pdf": [], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [] }, maxFiles: 1,
  });

  const handleSave = async () => {
    if (!profile) return;
    await updateProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        {/* Resume Upload */}
        <Card className="mb-6">
          <CardTitle>Upload Resume</CardTitle>
          <div
            {...getRootProps()}
            className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-brand-300"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto mb-2 text-gray-400" size={32} />
            <p className="text-sm text-gray-500">
              {uploading ? "Parsing with AI…" : "Drop your PDF or DOCX here, or click to browse"}
            </p>
          </div>
        </Card>

        {profile && (
          <Card>
            <CardTitle>Profile Details</CardTitle>
            <div className="mt-4 space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                <div className="flex flex-wrap gap-2">
                  {(profile.skills || []).map((s: string) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
              </div>

              <Button onClick={handleSave} className="w-full gap-2">
                {saved ? <><CheckCircle size={16} /> Saved!</> : "Save Profile"}
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
