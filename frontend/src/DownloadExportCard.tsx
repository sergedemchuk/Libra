import React from "react";
import { UploadState } from "./hooks/useFileUpload";

interface DownloadExportCardProps {
  uploadState: UploadState;
}

const DownloadExportCard: React.FC<DownloadExportCardProps> = ({ uploadState }) => {
  const isComplete =
    uploadState.phase === "done" &&
    !!uploadState.jobStatus?.downloadUrl;

  const downloadUrl = uploadState.jobStatus?.downloadUrl;
  const fileName = uploadState.jobStatus?.fileName ?? "processed-catalog.csv";

  return (
    <section
      role="region"
      aria-labelledby="download-exported-data-title"
      className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8 shadow-sm"
    >
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2
            id="download-exported-data-title"
            className="text-lg font-semibold text-foreground"
          >
            Download Exported Data
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Processed catalog data is exported as a CSV file that can be used to
            update book prices in Destiny.
          </p>
        </div>

        {/* Download button — active only when job is complete */}
        {isComplete && downloadUrl ? (
          <a
            href={downloadUrl}
            download={fileName}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          >
            {/* Download icon */}
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download CSV
          </a>
        ) : (
          // Greyed-out placeholder while not ready
          <button
            type="button"
            disabled
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary/20 text-muted-foreground text-sm font-medium cursor-not-allowed"
            title="Process a file first"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download CSV
          </button>
        )}
      </div>

      {/* Progress details when a job is running */}
      {uploadState.phase === "processing" && uploadState.jobStatus?.progress && (
        <div className="mb-5 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Processing{" "}
            <span className="text-foreground font-medium">
              {uploadState.jobStatus.progress.processed}
            </span>{" "}
            /{" "}
            <span className="text-foreground font-medium">
              {uploadState.jobStatus.progress.total}
            </span>{" "}
            rows…
          </p>
        </div>
      )}

      <div className="space-y-6 text-sm leading-6">
        <div>
          <h3 className="mb-2 font-semibold text-foreground">
            Exported File Format:
          </h3>
          <p className="text-muted-foreground">
            The exported file is a CSV (spreadsheet) that includes your catalog
            data with processed and adjusted prices. This allows you to review
            which book prices have changed before importing it into Destiny.
          </p>
        </div>

        <div>
          <h3 className="mb-2 font-semibold text-foreground">
            Using the File in Destiny:
          </h3>
          <p className="text-muted-foreground">
            To update your catalog, download the CSV file and sign in to Destiny.
            Open the option to import or update catalog data, select the exported
            CSV, and follow Destiny's steps. Destiny will apply the new prices to
            your book records and keep your catalog up to date.
          </p>
        </div>
      </div>
    </section>
  );
};

export default DownloadExportCard;
