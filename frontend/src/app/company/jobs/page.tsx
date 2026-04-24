"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { getCompanyDashboard, createJob, deleteJob } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";

interface JobForm {
  title: string;
  description: string;
  required_skills: string;   // comma-separated input
  experience_level: string;
  experience_years_min: number;
  location: string;
  salary_min: number;
  salary_max: number;
  application_link: string;
}

export default function CompanyJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<JobForm>();

  const load = () =>
    getCompanyDashboard().then((r) => setJobs(r.data.jobs)).catch(() => {});

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: JobForm) => {
    await createJob({
      ...data,
      required_skills: data.required_skills.split(",").map((s) => s.trim()).filter(Boolean),
      experience_years_min: Number(data.experience_years_min),
      salary_min: data.salary_min ? Number(data.salary_min) : undefined,
      salary_max: data.salary_max ? Number(data.salary_max) : undefined,
    });
    reset();
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: number) => {
    await deleteJob(id);
    load();
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Jobs</h1>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus size={16} /> Post Job
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardTitle>New Job Posting</CardTitle>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
              {[
                { label: "Job Title *", key: "title", required: true },
                { label: "Location", key: "location" },
                { label: "Application Link", key: "application_link" },
                { label: "Required Skills (comma-separated)", key: "required_skills" },
              ].map(({ label, key, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input {...register(key as keyof JobForm, { required })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Experience (yrs)</label>
                  <input type="number" {...register("experience_years_min")}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                  <select {...register("experience_level")}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Any</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid</option>
                    <option value="senior">Senior</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={4} {...register("description")}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              <div className="flex gap-3">
                <Button type="submit" loading={isSubmitting} className="flex-1">Post Job</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        <div className="space-y-3">
          {jobs.map((j) => (
            <Card key={j.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{j.title}</p>
                {j.location && <p className="text-sm text-gray-500">{j.location}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Active</Badge>
                <button onClick={() => handleDelete(j.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Delete job">
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
          {jobs.length === 0 && (
            <Card className="text-center text-gray-400 py-12">No jobs posted yet.</Card>
          )}
        </div>
      </main>
    </div>
  );
}
