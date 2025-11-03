import React from "react";

export default function InstructionsBox() {
  return (
    <section
      aria-labelledby="instructions-title"
      className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        {/* Info icon */}
        <div
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="10" x2="12" y2="16" strokeLinecap="round" />
            <circle cx="12" cy="7" r="0.8" fill="currentColor" />
          </svg>
        </div>

        <h2
          id="instructions-title"
          className="text-lg font-semibold text-foreground"
        >
          Instructions
        </h2>
      </div>

      {/* Body */}
      <div className="space-y-6 text-sm leading-6">
        {/* File Types */}
        <div>
          <h3 className="mb-2 font-semibold text-foreground">File Types Supported:</h3>
          <ul className="ms-5 list-disc space-y-1 text-muted-foreground">
            <li>CSV files (.csv)</li>
            <li>Excel files (.xlsx, .xls)</li>
            <li>Tab-separated values (.tsv)</li>
          </ul>
        </div>

        {/* Where to Get Files */}
        <div>
          <h3 className="mb-2 font-semibold text-foreground">Where to Get Files:</h3>
          <p className="text-muted-foreground">
            Export your library book catalog data from the Destiny library software. Ensure the
            file contains book ISBNs, titles, authors, and base pricing information.
          </p>
        </div>

        {/* What It Exports */}
        <div>
          <h3 className="mb-2 font-semibold text-foreground">What It Exports:</h3>
          <p className="text-muted-foreground">
            Processed CSV file with adjusted pricing, markup calculations, and formatted library
            catalog data ready for import back into Destiny library software.
          </p>
        </div>

        {/* Where to Import Data */}
        <div>
          <h3 className="mb-2 font-semibold text-foreground">Where to Import Data:</h3>
          <p className="text-muted-foreground">
            Import the processed file back into your Destiny library software to update your book
            catalog with adjusted pricing.
          </p>
        </div>
      </div>
    </section>
  );
}
