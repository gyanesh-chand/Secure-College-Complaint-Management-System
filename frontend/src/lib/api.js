import axios from "axios";

// Support multiple env variable names and fall back to localhost for development
const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || "http://localhost:8000";
export const API = `${BACKEND_URL.replace(/\/$/, "")}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ccms_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
