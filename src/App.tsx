import { useState } from "react";
import InstructionsBox from "./InstructionsBox";
import PriceCheckBox from "./PriceCheckBox";
import PriceAdjustmentBox from "./PriceAdjustmentBox";
import DownloadExportCard from "./DownloadExportCard";
import UploadImportCard from "./UploadImportCard";
import ParameterTitleAndDescription from "./ParameterDescription";
import MenuBar, { PageKey } from "./MenuBar";

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [priceRounding, setPriceRounding] = useState<boolean>(false);
  const [priceAdjustment, setPriceAdjustment] = useState<number>(0.0);
  const [activePage, setActivePage] = useState<PageKey>("upload");

  const handleFileSelected = (file: File | null) => {
    setSelectedFile(file);
  };

  const handlePriceRoundingChange = (checked: boolean) => {
    setPriceRounding(checked);
    console.log("Price rounding enabled:", checked);
  };

  return (
    <div className="min-h-screen bg-brand-gradient">
      {/* Top menu bar (visible on both pages) */}
      <MenuBar activePage={activePage} onPageChange={setActivePage} />

      {/* Page content */}
      <div className="mx-auto max-w-4xl px-5 py-10 md:py-12 space-y-8">
        {activePage === "upload" ? (
          <>
            {/* Page Header */}
            <header className="mb-6">
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                Upload Catalog Data
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Process library book catalog data from Destiny
              </p>
            </header>

            {/* Instructions */}
            <InstructionsBox />

            {/* File Upload Section */}
            <UploadImportCard onFileSelect={handleFileSelected} />

            {/* Configuration Options */}
            <div className="space-y-6">
              {/* Parameter Settings and description */}
              <ParameterTitleAndDescription
                Description="Configure pricing adjustments and processing options"
              />

              {/* Price Processing Options */}
              <PriceCheckBox
                label="Price Processing Options"
                descriptionRounded="Checked (Rounded): Prices rounded up to the nearest dollar ($24.16 → $25.00)."
                descriptionUnchanged="Unchecked (Unrounded): Preserves exact calculated prices."
                initialChecked={priceRounding}
                onChange={handlePriceRoundingChange}
              />

              {/* Price Adjustment */}
              <PriceAdjustmentBox
                label="Price Adjustment"
                descriptionEmpty="Empty: No adjustment applied to calculated prices."
                descriptionFilled="Filled: Adds the specified amount to all calculated prices."
                value={priceAdjustment}
                onChange={setPriceAdjustment}
                step={0.01}
              />
            </div>

            {/* Download/Export Section */}
            <DownloadExportCard />

            {/* Processing Summary */}
            {selectedFile && (
              <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Processing Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File:</span>
                    <span className="text-foreground font-medium">
                      {selectedFile.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price Rounding:</span>
                    <span className="text-foreground font-medium">
                      {priceRounding ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Price Adjustment:
                    </span>
                    <span className="text-foreground font-medium">
                      ${priceAdjustment.toFixed(2)}
                    </span>
                  </div>
                </div>
              </section>
            )}
          </>
        ) : (
          // Account Management placeholder page
          <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Account Management
            </h2>
            <p className="text-sm text-muted-foreground">
              Account management tools will be available here in a future
              update.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
