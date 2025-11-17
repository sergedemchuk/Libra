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

        {/* What It Does */}
        <div>
          <h3 className="mb-2 font-semibold text-foreground">Price Lookup Process:</h3>
          <p className="text-muted-foreground">
            The system uses ISBNdb's Bulk Data API to efficiently look up current book prices. 
            It processes up to 100 books per API call for fast, reliable pricing data with 
            intelligent caching to reduce duplicate lookups.
          </p>
        </div>

        {/* Performance Information */}
        <div>
          <h3 className="mb-2 font-semibold text-foreground">Processing Performance:</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-blue-700 font-medium">File Size</span>
                <span className="text-blue-700 font-medium">Processing Time</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-blue-600">100 books</span>
                <span className="text-blue-600">~2-3 seconds</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-blue-600">500 books</span>
                <span className="text-blue-600">~6-7 seconds</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-blue-600">1,000 books</span>
                <span className="text-blue-600">~12-15 seconds</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-blue-600">5,000 books</span>
                <span className="text-blue-600">~1-2 minutes</span>
              </div>
            </div>
          </div>
          <ul className="ms-5 list-disc space-y-1 text-muted-foreground">
            <li>Bulk processing: 100 results per API call</li>
            <li>Rate limit: 1 call per second (very fast processing)</li>
            <li>Daily limit: 5,000 API calls (up to 500,000 books per day)</li>
            <li>Smart caching reduces repeat lookups for duplicate ISBNs</li>
          </ul>
        </div>

        {/* What It Exports */}
        <div>
          <h3 className="mb-2 font-semibold text-foreground">What It Exports:</h3>
          <p className="text-muted-foreground">
            Processed CSV file with current market pricing from ISBNdb, markup calculations, and 
            formatted library catalog data ready for import back into Destiny library software.
          </p>
        </div>

        {/* Where to Import Data */}
        <div>
          <h3 className="mb-2 font-semibold text-foreground">Where to Import Data:</h3>
          <p className="text-muted-foreground">
            Import the processed file back into your Destiny library software to update your book
            catalog with current market pricing data.
          </p>
        </div>

        {/* Processing Notes */}
        <div>
          <h3 className="mb-2 font-semibold text-foreground">Additional Features:</h3>
          <ul className="ms-5 list-disc space-y-1 text-muted-foreground">
            <li>Automatic daily usage tracking to prevent API limit overages</li>
            <li>Price data cached for 7 days to improve performance</li>
            <li>Fallback to original pricing for books not found in ISBNdb</li>
            <li>Real-time progress tracking with detailed status updates</li>
            <li>Error handling with detailed reporting for failed lookups</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
