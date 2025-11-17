import React from "react";

export default function InstructionsBox() {
  return (
    <section
      aria-labelledby="instructions-title"
      className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8 shadow-sm"
    >
      <div className="flex items-center mb-5 ml-[-6px]">
        {/* Info icon */}
        <div
          aria-hidden="true"
          className="flex h-8 w-6 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" /> {/* circle radius increased */}
            <line x1="12" y1="10" x2="12" y2="16" />
            <circle cx="12" cy="6.6" r="0.5" fill="currentColor" />
          </svg>
        </div>

        <h2
          id="instructions-title"
          className="text-lg font-semibold text-foreground ml-0.5"
        >
          Instructions
        </h2>
      </div>
      <div className="space-y-6 text-sm leading-6">
        <div>
          <h3 className="mb-2 font-semibold text-foreground">
            File Types Supported:
          </h3>
          <ul className="ms-5 list-disc space-y-1 text-muted-foreground">
            <li>CSV files (.csv)</li>
            <li>Excel files (.xlsx, .xls)</li>
            <li>Tab-separated values (.tsv)</li>
          </ul>
        </div>

        <div>
          <h3 className="mb-2 font-semibold text-foreground">
            Where to Get Files:
          </h3>
          <p className="text-muted-foreground">
            Export your library book catalog data from the Destiny library software.
          </p>
        </div>

        <div>
          <h3 className="mb-2 font-semibold text-foreground">
            What It Exports:
          </h3>
          <p className="text-muted-foreground">
            Processed CSV file with adjusted pricing and formatted catalog data.
          </p>
        </div>

        <div>
          <h3 className="mb-2 font-semibold text-foreground">
            Where to Import Data:
          </h3>
          <p className="text-muted-foreground">
            Import the processed file back into Destiny to update your catalog.
          </p>
        </div>
      </div>
    </section>
  );
}
