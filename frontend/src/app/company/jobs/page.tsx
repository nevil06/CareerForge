"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
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
    <AppShell>
      <div className="max-w-4xl">
        <PageHeader
          eyebrow="Role nursery"
          title="Manage Jobs"
          description="Post roles, shape requirements, and let the matching engine find candidate fit."
          action={(
            <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus size={16} /> Post Job
            </Button>
          )}
        />

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
                  <label className="organic-label">{label}</label>
                  <input {...register(key as keyof JobForm, { required })}
                    className="organic-input" />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="organic-label">Min Experience (yrs)</label>
                  <input type="number" {...register("experience_years_min")}
                    className="organic-input" />
                </div>
                <div>
                  <label className="organic-label">Level</label>
                  <select {...register("experience_level")}
                    className="organic-input">
                    <option value="">Any</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid</option>
                    <option value="senior">Senior</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="organic-label">Description</label>
                <textarea rows={4} {...register("description")}
                  className="organic-input" />
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
            <Card key={j.id} className="flex items-center justify-between transition-all hover:-translate-y-0.5 hover:shadow-leaf">
              <div>
                <p className="font-display text-xl font-bold text-soil">{j.title}</p>
                {j.location && <p className="text-sm font-semibold text-stone-500">{j.location}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Active</Badge>
                <button onClick={() => handleDelete(j.id)}
                  className="rounded-xl p-2 text-stone-400 transition-colors hover:bg-clay/10 hover:text-clay"
                  aria-label="Delete job">
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
          {jobs.length === 0 && (
            <Card className="py-12 text-center text-stone-500">No jobs posted yet.</Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
