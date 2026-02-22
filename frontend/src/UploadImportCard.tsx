import { useState, useRef } from "react";
import { UploadState } from "./hooks/useFileUpload";

interface UploadImportCardProps {
  onFileSelect?: (file: File | null) => void;
  uploadState: UploadState;
  onProcessFile: () => void;
  onReset: () => void;
}

// ── Small progress bar sub-component ─────────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-primary/10 rounded-full h-2 overflow-hidden">
      <div
        className="h-2 bg-primary rounded-full transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// ── Phase label helpers ───────────────────────────────────────────────────────
function phaseLabel(uploadState: UploadState): string {
  switch (uploadState.phase) {
    case "initiating":
      return "Preparing upload…";
    case "uploading":
      return `Uploading… ${uploadState.uploadProgress}%`;
    case "processing": {
      const p = uploadState.jobStatus?.progress;
      if (p && p.total > 0) {
        return `Processing… ${p.processed} / ${p.total} rows`;
      }
      return "Processing… (this may take a few minutes)";
    }
    case "done":
      return "✓ Processing complete!";
    case "error":
      return "Upload failed";
    default:
      return "";
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UploadImportCard({
  onFileSelect,
  uploadState,
  onProcessFile,
  onReset,
}: UploadImportCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    onFileSelect?.(file);
  };

  const handleUploadClick = () => {
    // Don't open picker while a job is running
    if (uploadState.phase !== "idle" && uploadState.phase !== "error") return;
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onReset();
  };

  const isActive =
    uploadState.phase === "initiating" ||
    uploadState.phase === "uploading" ||
    uploadState.phase === "processing";

  const isDone = uploadState.phase === "done";
  const isError = uploadState.phase === "error";
  const isIdle = uploadState.phase === "idle";

  // Processing progress percentage for the bar
  const processingPct = (() => {
    if (uploadState.phase === "uploading") return uploadState.uploadProgress;
    if (uploadState.phase === "processing") {
      const p = uploadState.jobStatus?.progress;
      if (p && p.total > 0) return Math.round((p.processed / p.total) * 100);
      return null; // indeterminate
    }
    if (isDone) return 100;
    return 0;
  })();

  return (
    <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Upload Library Book Catalog
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a CSV file from Destiny to process your library book catalog data
        </p>
      </div>

      {/* Drop zone — disabled while a job is running */}
      <div
        onClick={handleUploadClick}
        className={[
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200",
          isActive || isDone
            ? "border-primary/30 bg-card/20 cursor-default"
            : "border-accent hover:border-primary cursor-pointer hover:bg-card/50 bg-card/20",
        ].join(" ")}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.tsv"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-3">
          {/* Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-8 w-8 ${isActive || isDone ? "text-primary" : "text-accent"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {isIdle && !selectedFile && (
            <>
              <p className="text-sm text-foreground font-medium">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">CSV, Excel, or TSV files only</p>
            </>
          )}

          {/* Selected file chip */}
          {selectedFile && (
            <div className="mt-1 p-3 bg-primary/10 rounded-lg w-full max-w-xs text-left">
              <p className="text-sm text-primary font-semibold truncate">
                📄 {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Progress / status area ────────────────────────────────────────── */}
      {uploadState.phase !== "idle" && (
        <div className="mt-5 space-y-3">
          <p
            className={`text-sm font-medium ${
              isError ? "text-destructive" : isDone ? "text-primary" : "text-foreground"
            }`}
          >
            {phaseLabel(uploadState)}
          </p>

          {/* Determinate bar */}
          {processingPct !== null && !isError && (
            <ProgressBar value={processingPct} />
          )}

          {/* Indeterminate spinner during processing with unknown total */}
          {uploadState.phase === "processing" && processingPct === null && (
            <div className="w-full bg-primary/10 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-primary rounded-full animate-pulse w-1/2" />
            </div>
          )}

          {/* Job ID for support / debugging */}
          {uploadState.jobId && !isError && (
            <p className="text-xs text-muted-foreground">
              Job ID: <span className="font-mono">{uploadState.jobId}</span>
            </p>
          )}

          {/* Error detail */}
          {isError && uploadState.errorMessage && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive">{uploadState.errorMessage}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className="mt-5 flex gap-3 flex-wrap">
        {/* Process button — only shown when a file is selected and idle */}
        {selectedFile && isIdle && (
          <button
            type="button"
            onClick={onProcessFile}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          >
            Process File
          </button>
        )}

        {/* Reset / start over */}
        {(isDone || isError) && (
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2.5 rounded-lg border border-primary/30 text-sm font-medium text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          >
            Start Over
          </button>
        )}
      </div>
    </section>
  );
}
