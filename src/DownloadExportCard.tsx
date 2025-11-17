import React from "react";

const DownloadExportCard: React.FC = () => {
  return (
    <section
      role="region"
      aria-labelledby="download-exported-data-title"
      className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8 shadow-sm"
    >
      <div className="mb-5">
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
            CSV, and follow Destiny’s steps. Destiny will apply the new prices to
            your book records and keep your catalog up to date.
          </p>
        </div>

      </div>
    </section>
  );
};

export default DownloadExportCard;
