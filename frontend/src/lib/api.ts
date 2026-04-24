import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// ---- Auth ----
export const register = (data: { email: string; password: string; role: string }) =>
  api.post("/api/auth/register", data);

export const login = (data: { email: string; password: string }) =>
  api.post("/api/auth/login", data);

// ---- Candidate ----
export const getProfile = () => api.get("/api/candidates/profile");
export const createProfile = (data: object) => api.post("/api/candidates/profile", data);
export const updateProfile = (data: object) => api.put("/api/candidates/profile", data);
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
