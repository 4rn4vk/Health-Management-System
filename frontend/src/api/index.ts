import api from "./client";
import type {
  ClaimBatch,
  ClaimFilter,
  ClaimListResponse,
  ClaimMetrics,
  DocumentListItem,
  Provider,
  ProviderCreate,
  ProviderListResponse,
  ProviderUpdate,
  Specialty,
  TokenPair,
} from "./types";

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenPair>("/auth/login", { email, password }).then((r) => r.data),
  refresh: (refresh_token: string) =>
    api.post<TokenPair>("/auth/refresh", { refresh_token }).then((r) => r.data),
};

// ─── Providers ─────────────────────────────────────────────────────────────────
export const providersApi = {
  list: (params: Record<string, unknown> = {}) =>
    api.get<ProviderListResponse>("/providers", { params }).then((r) => r.data),
  get: (id: number) => api.get<Provider>(`/providers/${id}`).then((r) => r.data),
  create: (data: ProviderCreate) => api.post<Provider>("/providers", data).then((r) => r.data),
  update: (id: number, data: ProviderUpdate) =>
    api.put<Provider>(`/providers/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/providers/${id}`),
  listSpecialties: () => api.get<Specialty[]>("/providers/specialties").then((r) => r.data),
  uploadDocument: (providerId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<{ s3_key: string; filename: string; presigned_url: string }>(
        `/providers/${providerId}/documents/upload`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      .then((r) => r.data);
  },
  listDocuments: (providerId: number) =>
    api.get<DocumentListItem[]>(`/providers/${providerId}/documents`).then((r) => r.data),
};

// ─── Claims ────────────────────────────────────────────────────────────────────
export const claimsApi = {
  list: (filters: ClaimFilter = {}) =>
    api.get<ClaimListResponse>("/claims", { params: filters }).then((r) => r.data),
  metrics: () => api.get<ClaimMetrics>("/claims/metrics").then((r) => r.data),
};

// ─── Uploads ───────────────────────────────────────────────────────────────────
export const uploadsApi = {
  uploadCsv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<ClaimBatch>("/uploads/claims-csv", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  listBatches: () => api.get<ClaimBatch[]>("/uploads/batches").then((r) => r.data),
  getBatch: (id: number) => api.get<ClaimBatch>(`/uploads/batches/${id}`).then((r) => r.data),
};
