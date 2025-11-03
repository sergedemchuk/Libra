import { useState, useRef } from "react";
import InstructionsBox from "./InstructionsBox";
import PriceCheckBox from "./PriceCheckbox";
import PriceAdjustmentBox from "./PriceAdjustmentBox";

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [priceRounding, setPriceRounding] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

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

        {/* Configuration Options */}
        <div className="space-y-6">
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

        {/* Download/Export Section */}

        {/* Processing Summary */}

      </div>
    </div>
  );
}