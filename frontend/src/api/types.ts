// ─── Auth ──────────────────────────────────────────────────────────────────────
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "admin" | "viewer";
  is_active: boolean;
  created_at: string;
}

// ─── Providers ─────────────────────────────────────────────────────────────────
export interface Specialty {
  id: number;
  name: string;
}

export interface Provider {
  id: number;
  npi: string;
  full_name: string;
  organization: string | null;
  state: string | null;
  city: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  license_document_s3_key: string | null;
  created_at: string;
  updated_at: string;
  specialties: Specialty[];
}

export interface ProviderListResponse {
  items: Provider[];
  total: number;
  page: number;
  page_size: number;
}

export interface ProviderCreate {
  npi: string;
  full_name: string;
  organization?: string;
  state?: string;
  city?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
  specialty_ids: number[];
}

export interface ProviderUpdate {
  full_name?: string;
  organization?: string;
  state?: string;
  city?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
  specialty_ids?: number[];
}

export interface DocumentListItem {
  filename: string;
  presigned_url: string;
  s3_key: string;
}

// ─── Claims ────────────────────────────────────────────────────────────────────
export type ClaimStatus = "pending" | "approved" | "denied" | "paid";
export type ClaimType = "professional" | "institutional" | "dental";
export type BatchStatus = "processing" | "completed" | "failed";

export interface Claim {
  id: number;
  claim_number: string;
  provider_id: number;
  batch_id: number | null;
  claim_type: ClaimType;
  status: ClaimStatus;
  service_date: string;
  billed_amount: number;
  approved_amount: number | null;
  patient_id: string | null;
  diagnosis_code: string | null;
  procedure_code: string | null;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface ClaimListResponse {
  items: Claim[];
  total: number;
  page: number;
  page_size: number;
}

export interface ClaimFilter {
  provider_id?: number;
  status?: ClaimStatus;
  claim_type?: ClaimType;
  service_date_from?: string;
  service_date_to?: string;
  page?: number;
  page_size?: number;
}

export interface ClaimBatch {
  id: number;
  filename: string;
  s3_key: string;
  status: BatchStatus;
  total_rows: number;
  imported_rows: number;
  error_count: number;
  error_detail: string | null;
  uploaded_by_id: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface ClaimMetrics {
  status_breakdown: Record<string, number>;
  monthly_billed: Array<{
    month: string;
    total_billed: number;
    total_approved: number;
  }>;
  provider_volume: Array<{
    provider_id: number;
    provider_name: string;
    claim_count: number;
  }>;
  avg_processing_days: number | null;
}
