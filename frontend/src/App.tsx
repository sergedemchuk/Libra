import { useState, useEffect } from "react";
import InstructionsBox from "./InstructionsBox";
import PriceCheckBox from "./PriceCheckBox";
import PriceAdjustmentBox from "./PriceAdjustmentBox";
import DownloadExportCard from "./DownloadExportCard";
import UploadImportCard from "./UploadImportCard";
import ParameterTitleAndDescription from "./ParameterDescription";
import MenuBar, { PageKey } from "./MenuBar";
import LoginPage from "./LoginPage";
import AccountManagementPage from "./AccountManagementPage";
import { useFileUpload } from "./hooks/useFileUpload";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [priceRounding, setPriceRounding] = useState<boolean>(false);
  const [priceAdjustment, setPriceAdjustment] = useState<number>(0.0);
  const [activePage, setActivePage] = useState<PageKey>("upload");

  const { state: uploadState, start: startUpload, reset: resetUpload } = useFileUpload();

  // Check for existing session on mount
  useEffect(() => {
    const hasSession = localStorage.getItem("libra_remember") === "true";
    setIsAuthenticated(hasSession);
  }, []);

  const handleLoginSuccess = () => setIsAuthenticated(true);

  const handleLogout = () => {
    localStorage.removeItem("libra_remember");
    setIsAuthenticated(false);
    setSelectedFile(null);
    setPriceRounding(false);
    setPriceAdjustment(0.0);
    setActivePage("upload");
    resetUpload();
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const handleFileSelected = (file: File | null) => {
    setSelectedFile(file);
    if (file) resetUpload();
  };

  const handlePriceRoundingChange = (checked: boolean) => {
    setPriceRounding(checked);
    console.log("Price rounding enabled:", checked);
  };

  const handleProcessFile = () => {
    if (!selectedFile) return;

    const settings = {
      priceRounding,
      ...(priceAdjustment !== 0 && !Number.isNaN(priceAdjustment)
        ? { priceAdjustment }
        : {}),
    };

    startUpload(selectedFile, settings);
  };

  return (
    <div className="min-h-screen bg-brand-gradient">
      <MenuBar
        activePage={activePage}
        onPageChange={setActivePage}
        onLogout={handleLogout}
      />

      <div className="mx-auto max-w-4xl px-5 py-10 md:py-12 space-y-8">
        {activePage === "account" ? (
          // Account management page rendered inside the same layout shell
          <AccountManagementPage onBack={() => setActivePage("upload")} />
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                Upload Catalog Data
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Process library book catalog data from Destiny
              </p>
            </header>

            <InstructionsBox />

            <UploadImportCard
              onFileSelect={handleFileSelected}
              uploadState={uploadState}
              onProcessFile={handleProcessFile}
              onReset={resetUpload}
            />

            {uploadState.phase === "idle" || uploadState.phase === "error" ? (
              <div className="space-y-6">
                <ParameterTitleAndDescription
                  Description="Configure pricing adjustments and processing options"
                />

                <PriceCheckBox
                  label="Price Processing Options"
                  descriptionRounded="Checked (Rounded): Prices rounded up to the nearest dollar ($24.16 → $25.00)."
                  descriptionUnchanged="Unchecked (Unrounded): Preserves exact calculated prices."
                  initialChecked={priceRounding}
                  onChange={handlePriceRoundingChange}
                />

                <PriceAdjustmentBox
                  label="Price Adjustment"
                  descriptionEmpty="Empty: No adjustment applied to calculated prices."
                  descriptionFilled="Filled: Adds the specified amount to all calculated prices."
                  value={priceAdjustment}
                  onChange={setPriceAdjustment}
                  step={0.01}
                />
              </div>
            ) : null}

            <DownloadExportCard uploadState={uploadState} />

            {selectedFile && uploadState.phase === "idle" && (
              <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Processing Summary
                </h3>
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price Adjustment:</span>
                    <span className="text-foreground font-medium">
                      ${priceAdjustment.toFixed(2)}
                    </span>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
