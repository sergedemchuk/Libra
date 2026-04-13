// frontend/src/api/client.ts

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

// ─── Upload / Job API (unchanged) ─────────────────────────────────────────────

export interface UploadInitResponse {
  jobId: string;
  uploadUrl: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  error?: string;
  resultUrl?: string;
}

export async function initiateUpload(filename: string, settings?: object): Promise<UploadInitResponse> {
  const res = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, settings: settings ?? {} }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Upload init failed (${res.status})`);
  }
  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/status/${jobId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Status check failed (${res.status})`);
  }
  return res.json();
}

// ─── Account API (unchanged) ──────────────────────────────────────────────────

export interface Account {
  userId: string;
  email: string;
  role: "admin" | "user";
  dateCreated: string;
  lastLogin: string;
}

export async function listAccounts(): Promise<Account[]> {
  const res = await fetch(`${API_BASE_URL}/accounts`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to list accounts (${res.status})`);
  }
  const data = await res.json();
  return data.accounts;
}

export async function createAccount(
  email: string,
  password: string,
  role: "admin" | "user" = "user",
): Promise<Account> {
  const res = await fetch(`${API_BASE_URL}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to create account (${res.status})`);
  }
  return res.json();
}

export async function deleteAccount(userId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/accounts/${userId}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to delete account (${res.status})`);
  }
}

export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/accounts/${userId}/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to change password (${res.status})`);
  }
}

export async function loginAccount(email: string, password: string): Promise<Account> {
  const res = await fetch(`${API_BASE_URL}/accounts/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Login failed (${res.status})`);
  }
  return res.json();
}

// ─── Email API (NEW) ──────────────────────────────────────────────────────────

async function postEmail(payload: object) {
  const res = await fetch(`${API_BASE_URL}/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Email request failed (${res.status})`);
  }
  return res.json();
}

export const requestPasswordReset = (email: string) =>
  postEmail({ action: "forgot-password", email });

export const send2FACode = (email: string) =>
  postEmail({ action: "send-2fa", email });

export const verify2FACode = (email: string, code: string) =>
  postEmail({ action: "verify-2fa", email, code });

export const notifyAdminOfChange = (actor: string, change: string, details?: string) =>
  postEmail({ action: "notify-admin", actor, change, details });