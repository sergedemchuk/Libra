/**
 * Libra API Client
 * Wraps the two API Gateway endpoints:
 *   POST /upload  → get presigned S3 URL + jobId
 *   GET  /status/{jobId} → poll processing status
 */

const API_BASE_URL = import.meta.env.VITE_API_URL as string;

if (!API_BASE_URL) {
  console.error(
    "[LibraAPI] VITE_API_URL is not set. Copy .env.example → .env.local and fill in the value."
  );
}

// ─── Request / Response shapes (must match lambda types) ─────────────────────

export interface UploadSettings {
  priceRounding: boolean;
  priceAdjustment?: number;
}

export interface InitiateUploadRequest {
  fileName: string;
  fileSize: number;
  settings: UploadSettings;
}

export interface InitiateUploadResponse {
  jobId: string;
  uploadUrl: string;   // presigned S3 PUT URL
  expires: string;     // ISO timestamp
}

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  fileName: string;
  progress?: {
    total: number;
    processed: number;
  };
  downloadUrl?: string;  // presigned S3 GET URL, present when COMPLETED
  error?: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Step 1 – tell the backend about the file.
 * Returns a presigned S3 URL and a jobId to track processing.
 */
export async function initiateUpload(
  req: InitiateUploadRequest
): Promise<InitiateUploadResponse> {
  const res = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Upload initiation failed (${res.status})`);
  }

  return res.json();
}

/**
 * Step 2 – PUT the raw file bytes directly to S3 using the presigned URL.
 * No auth headers — S3 presigned URLs handle auth in the query string.
 */
export async function uploadFileToS3(
  presignedUrl: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener("load", () => {
      // S3 presigned PUT returns 200 on success
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during S3 upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", "text/csv");
    xhr.send(file);
  });
}

/**
 * Step 3 – poll the status endpoint until the job finishes or fails.
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/status/${jobId}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Status check failed (${res.status})`);
  }

  return res.json();
}
