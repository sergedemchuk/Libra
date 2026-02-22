/**
 * useFileUpload
 *
 * Manages the complete lifecycle:
 *   idle → initiating → uploading (with % progress) → processing → done | error
 *
 * Usage:
 *   const { state, start, reset } = useFileUpload();
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  initiateUpload,
  uploadFileToS3,
  getJobStatus,
  JobStatusResponse,
  UploadSettings,
} from "../api/client";

// ─── State machine types ──────────────────────────────────────────────────────

export type UploadPhase =
  | "idle"
  | "initiating"   // POST /upload
  | "uploading"    // PUT to S3
  | "processing"   // polling /status
  | "done"
  | "error";

export interface UploadState {
  phase: UploadPhase;
  uploadProgress: number;     // 0–100 during "uploading"
  jobId: string | null;
  jobStatus: JobStatusResponse | null;
  errorMessage: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3_000;   // how often to call /status
const MAX_POLL_ATTEMPTS = 200;    // 200 × 3 s = 10 minutes max wait

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFileUpload() {
  const [state, setState] = useState<UploadState>({
    phase: "idle",
    uploadProgress: 0,
    jobId: null,
    jobStatus: null,
    errorMessage: null,
  });

  // Keep a ref so the polling loop can be cancelled
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // ── Internal helpers ────────────────────────────────────────────────────────

  const set = useCallback((partial: Partial<UploadState>) => {
    if (!isUnmountedRef.current) {
      setState((prev) => ({ ...prev, ...partial }));
    }
  }, []);

  const startPolling = useCallback(
    (jobId: string) => {
      pollCountRef.current = 0;

      const poll = async () => {
        if (isUnmountedRef.current) return;

        pollCountRef.current += 1;

        try {
          const status = await getJobStatus(jobId);
          set({ jobStatus: status });

          if (status.status === "COMPLETED") {
            set({ phase: "done" });
            return;
          }

          if (status.status === "FAILED") {
            set({
              phase: "error",
              errorMessage: status.error ?? "Processing failed. Please try again.",
            });
            return;
          }

          // Still PENDING or PROCESSING
          if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
            set({
              phase: "error",
              errorMessage: "Processing timed out. Please contact support.",
            });
            return;
          }

          pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        } catch (err) {
          set({
            phase: "error",
            errorMessage:
              err instanceof Error ? err.message : "Failed to check status.",
          });
        }
      };

      poll();
    },
    [set]
  );

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Kick off the full upload flow for a given file + settings.
   */
  const start = useCallback(
    async (file: File, settings: UploadSettings) => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

      set({
        phase: "initiating",
        uploadProgress: 0,
        jobId: null,
        jobStatus: null,
        errorMessage: null,
      });

      try {
        // 1. Tell backend about the file → get presigned URL + jobId
        const { jobId, uploadUrl } = await initiateUpload({
          fileName: file.name,
          fileSize: file.size,
          settings,
        });

        set({ phase: "uploading", jobId });

        // 2. Upload raw bytes to S3
        await uploadFileToS3(uploadUrl, file, (pct) => {
          set({ uploadProgress: pct });
        });

        // 3. Poll for processing completion
        set({ phase: "processing", uploadProgress: 100 });
        startPolling(jobId);
      } catch (err) {
        set({
          phase: "error",
          errorMessage:
            err instanceof Error ? err.message : "An unexpected error occurred.",
        });
      }
    },
    [set, startPolling]
  );

  /** Reset back to idle so the user can start over. */
  const reset = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setState({
      phase: "idle",
      uploadProgress: 0,
      jobId: null,
      jobStatus: null,
      errorMessage: null,
    });
  }, []);

  return { state, start, reset };
}
