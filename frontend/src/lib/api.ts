import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

import { supabase } from "./supabase";

// Attach JWT from Supabase on every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export default api;

// ---- Candidate ----
export const getProfile = () => api.get("/api/candidates/profile");
export const createProfile = (data: object) => api.post("/api/candidates/profile", data);
export const updateProfile = (data: object) => api.put("/api/candidates/profile", data);
export const buildFromInterview = (data: object) => api.post("/api/candidates/resume/build-from-interview", data);
export const uploadResume = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/api/candidates/resume/upload", form);
};
export const getCandidateMatches = () => api.get("/api/candidates/matches");
export const getCandidateNotifications = () => api.get("/api/candidates/notifications");
export const optimizeResume = (job_description: string) =>
  api.post("/api/candidates/resume/optimize", { job_description });
export const generateOutreach = (job_title: string, company_name: string) =>
  api.post("/api/candidates/outreach", { job_title, company_name });
export const generateCoverLetter = (data: object) =>
  api.post("/api/candidates/cover-letter", data);

// ---- Jobs ----
export const listJobs = (params?: object) => api.get("/api/jobs", { params });
export const createJob = (data: object) => api.post("/api/jobs", data);
export const updateJob = (id: number, data: object) => api.put(`/api/jobs/${id}`, data);
export const deleteJob = (id: number) => api.delete(`/api/jobs/${id}`);
export const getJobMatches = (id: number) => api.get(`/api/jobs/${id}/matches`);

// ---- Company ----
export const getCompanyDashboard = () => api.get("/api/company/dashboard");
export const getCompanyNotifications = () => api.get("/api/company/notifications");

// ---- Learning Agent ----
export const callAgent = (payload: object) => api.post("/api/learn/agent", payload);
export const getRoadmap = () => api.get("/api/learn/roadmap");

// ---- Professional Resume Builder ----
export const getGithubRepos = (username: string) =>
  api.get("/api/candidates/github/repos", { params: { username } });

export const generateProfessionalResume = (data: {
  github_username: string;
  portfolio_url?: string;
  job_title?: string;
  company_name?: string;
  job_description?: string;
}) => api.post("/api/candidates/resume/build-professional", data);

// ---- Job Action Hub ----
export const getInterviewPrep = (jobId: number) =>
  api.post(`/api/candidates/interview-prep/${jobId}`);

export const generateApplicationPackage = (jobId: number) =>
  api.post(`/api/candidates/apply/${jobId}`);

export const markJobVisited = (jobId: number) =>
  api.post(`/api/candidates/jobs/${jobId}/visit`);

export const getVisitedJobs = () =>
  api.get("/api/candidates/jobs/visited");

