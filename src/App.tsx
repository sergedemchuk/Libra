import { useState } from "react";
import InstructionsBox from "./InstructionsBox";
import PriceCheckBox from "./PriceCheckBox";
import PriceAdjustmentBox from "./PriceAdjustmentBox";
import DownloadExportCard from "./DownloadExportCard";
import UploadImportCard from "./UploadImportCard";
import ParameterTitleAndDescription from "./ParameterDescription";

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [priceRounding, setPriceRounding] = useState<boolean>(false);
  const [price, setPrice] = useState<number>(0.00);

  const handleFileSelected = (file: File | null) => {
    setSelectedFile(file);
  };

  const handlePriceRoundingChange = (checked: boolean) => {
    setPriceRounding(checked);
    console.log("Price rounding enabled:", checked);
  };

  return (
    <div className="min-h-screen bg-brand-gradient">
      <div className="mx-auto max-w-4xl px-5 py-10 md:py-12 space-y-8">
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
        <section className = "rounded-xl border border-primary/20 bg-card/40 p-6 md:p-6">
          <div className="space-y-3">


          {/* Price Adjustment */}
          <PriceAdjustmentBox
            label="Price Adjustment"
            descriptionEmpty="Empty: No adjustment applied to calculated prices."
            descriptionFilled="Filled: Adds the specified amount to all calculated prices."
            value={price}
            onChange={setPrice}
            step={0.01}
          />
        </div>
            {/*Parameter Settings and description*/}
            <ParameterTitleAndDescription
             Description = "Configure pricing adustments and Processing Options"
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
            />
            
          </div>
        </section>

        {/* Download/Export Section */}
        <DownloadExportCard />

        {/* Processing Summary */}
        {selectedFile && (
          <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
            <h3 className="text-lg font-semibold text-foreground mb-3">Processing Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">File:</span>
                <span className="text-foreground font-medium">{selectedFile.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price Rounding:</span>
                <span className="text-foreground font-medium">
                  {priceRounding ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
