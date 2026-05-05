/// <reference types="vite/client" />
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  paramsSerializer: (params) => {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(params)) {
      if (val === undefined || val === null) continue;
      if (Array.isArray(val)) {
        val.forEach((v) => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val as string)}`);
      }
    }
    return parts.join("&");
  },
});

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = window.__accessToken;
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// On 401, attempt silent refresh
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        if (!refresh) throw new Error("no refresh token");
        const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
          refresh_token: refresh,
        });
        window.__accessToken = data.access_token;
        localStorage.setItem("refresh_token", data.refresh_token);
        original.headers["Authorization"] = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        window.__accessToken = undefined;
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Augment window type for in-memory token storage
declare global {
  interface Window {
    __accessToken?: string;
  }
}

export default api;
