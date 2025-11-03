import React from 'react';

const DownloadExportCard: React.FC = () => {
  return (
    <section
      role="region"
      aria-labelledby="download-exported-data-title"
      className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg
            aria-hidden="true"
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        
        <div>
          <h2
            id="download-exported-data-title"
            className="text-lg font-semibold text-foreground"
          >
            Download Exported Data
          </h2>
          <p className="text-sm text-muted-foreground">
            Process your file and download the result
          </p>
        </div>
      </div>
    </section>
  );
};

export default DownloadExportCard;
