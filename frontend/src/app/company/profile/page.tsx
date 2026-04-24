"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import { Building2, CheckCircle } from "lucide-react";

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/company/profile")
      .then((r) => setProfile(r.data))
      .catch(() => setProfile({}))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const method = profile.id ? "put" : "post";
    await api[method]("/api/company/profile", profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Building2 size={22} className="text-brand-500" />
          <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
        </div>

        <Card>
          <CardTitle>Company Details</CardTitle>
          <div className="mt-4 space-y-4">
            {[
              { label: "Company Name *", key: "company_name" },
              { label: "Industry", key: "industry" },
              { label: "Website", key: "website" },
              { label: "Location", key: "location" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  value={profile?.[key] || ""}
                  onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
              <select
                value={profile?.size || ""}
                onChange={(e) => setProfile({ ...profile, size: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="500+">500+ employees</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={4}
                value={profile?.description || ""}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="What does your company do?"
              />
            </div>

            <Button onClick={handleSave} className="w-full gap-2">
              {saved ? <><CheckCircle size={16} /> Saved!</> : "Save Profile"}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
