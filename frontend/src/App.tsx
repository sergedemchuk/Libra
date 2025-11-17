import { useState, useEffect } from "react";
import InstructionsBox from "./InstructionsBox";
import PriceCheckBox from "./PriceCheckBox";
import PriceAdjustmentBox from "./PriceAdjustmentBox";
import DownloadExportCard from "./DownloadExportCard";
import UploadImportCard from "./UploadImportCard";
import { getApiInstance, JobResponse } from "./api-service";
import { getConfig } from "./config";

// Job state interface
interface JobState {
  jobId?: string;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';
  fileName?: string;
  progress?: {
    total: number;
    processed: number;
  };
  downloadUrl?: string;
  error?: string;
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [priceRounding, setPriceRounding] = useState<boolean>(false);
  const [priceAdjustment, setPriceAdjustment] = useState<number>(0);
  const [jobState, setJobState] = useState<JobState>({ status: 'idle' });
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Initialize API
  const config = getConfig();
  const api = getApiInstance(config.api);

  const handleFileSelected = (file: File | null) => {
    setSelectedFile(file);
    // Reset job state when new file is selected
    if (file && jobState.status !== 'idle') {
      setJobState({ status: 'idle' });
    }
  };

  const handlePriceRoundingChange = (checked: boolean) => {
    setPriceRounding(checked);
    console.log("Price rounding enabled:", checked);
  };

  const handlePriceAdjustmentChange = (value: number) => {
    setPriceAdjustment(value);
    console.log("Price adjustment:", value);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      console.error('No file selected');
      return;
    }

    setIsUploading(true);
    setJobState({ status: 'uploading' });

    try {
      // Prepare upload settings
      const settings = {
        priceRounding,
        priceAdjustment: priceAdjustment !== 0 ? priceAdjustment : undefined,
      };

      console.log('Starting upload with settings:', settings);

      // Start upload and processing
      const finalResult = await api.uploadAndProcess(
        selectedFile,
        settings,
        (progress: JobResponse) => {
          console.log('Progress update:', progress);
          
          setJobState({
            jobId: progress.jobId,
            status: progress.status === 'PENDING' ? 'uploading' : 
                   progress.status === 'PROCESSING' ? 'processing' :
                   progress.status === 'COMPLETED' ? 'completed' : 'failed',
            fileName: progress.fileName,
            progress: progress.progress,
            downloadUrl: progress.downloadUrl,
            error: progress.error,
          });
        }
      );

      console.log('Upload and processing complete:', finalResult);

      setJobState({
        jobId: finalResult.jobId,
        status: finalResult.status === 'COMPLETED' ? 'completed' : 'failed',
        fileName: finalResult.fileName,
        progress: finalResult.progress,
        downloadUrl: finalResult.downloadUrl,
        error: finalResult.error,
      });

    } catch (error) {
      console.error('Upload failed:', error);
      setJobState({
        ...jobState,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setJobState({ status: 'idle' });
    setIsUploading(false);
  };

  const handleDownload = () => {
    if (jobState.downloadUrl) {
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = jobState.downloadUrl;
      link.download = jobState.fileName || 'processed-catalog.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
        <UploadImportCard 
          onFileSelect={handleFileSelected}
          selectedFile={selectedFile}
          onUpload={handleUpload}
          isUploading={isUploading}
          disabled={jobState.status === 'processing'}
        />

        {/* Configuration Options */}
        {jobState.status === 'idle' && (
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
              value={priceAdjustment}
              onChange={handlePriceAdjustmentChange}
            />
          </div>
        )}

        {/* Processing Status */}
        {jobState.status !== 'idle' && (
          <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Processing Status</h3>
              {(jobState.status === 'completed' || jobState.status === 'failed') && (
                <button
                  onClick={handleReset}
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  Process New File
                </button>
              )}
            </div>

            <div className="space-y-3">
              {/* Job Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File:</span>
                  <span className="text-foreground font-medium">
                    {jobState.fileName || selectedFile?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-medium ${
                    jobState.status === 'completed' ? 'text-green-600' :
                    jobState.status === 'failed' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {jobState.status === 'uploading' ? 'Uploading...' :
                     jobState.status === 'processing' ? 'Processing...' :
                     jobState.status === 'completed' ? 'Completed' :
                     jobState.status === 'failed' ? 'Failed' : 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {jobState.progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress:</span>
                    <span className="text-foreground">
                      {jobState.progress.processed} / {jobState.progress.total} rows
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all duration-500"
                      style={{ 
                        width: `${(jobState.progress.processed / jobState.progress.total) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {jobState.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{jobState.error}</p>
                </div>
              )}

              {/* Job Settings Summary */}
              <div className="pt-2 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price Rounding:</span>
                    <span className="text-foreground font-medium">
                      {priceRounding ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  {priceAdjustment !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price Adjustment:</span>
                      <span className="text-foreground font-medium">
                        {priceAdjustment > 0 ? '+' : ''}${priceAdjustment.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Download/Export Section */}
        <DownloadExportCard 
          jobState={jobState}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
}
