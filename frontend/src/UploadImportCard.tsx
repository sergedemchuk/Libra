import { useState, useRef } from "react";
import { validateFile } from "./api-service";

interface UploadImportCardProps {
  onFileSelect?: (file: File | null) => void;
  selectedFile?: File | null;
  onUpload?: () => void;
  isUploading?: boolean;
  disabled?: boolean;
}

export default function UploadImportCard({ 
  onFileSelect, 
  selectedFile,
  onUpload,
  isUploading = false,
  disabled = false 
}: UploadImportCardProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    setValidationError(null);
    
    if (file) {
      // Validate file
      const validation = validateFile(file);
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid file');
        onFileSelect?.(null);
        return;
      }
    }
    
    onFileSelect?.(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFileSelect(file || null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleUploadClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    if (disabled) return;
    handleFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canUpload = selectedFile && !validationError && !disabled;

  return (
    <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Upload Library Book Catalog
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a CSV file from Destiny to process your library book catalog data
        </p>
      </div>

      {/* File Upload Area */}
      <div
        onClick={handleUploadClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : disabled
            ? 'border-muted bg-muted/20 cursor-not-allowed'
            : selectedFile
            ? 'border-primary bg-primary/5'
            : 'border-accent hover:border-primary hover:bg-card/50 bg-card/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.tsv"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center space-y-3">
          {/* Upload Icon */}
          <div className={`transition-colors ${
            selectedFile ? 'text-primary' : disabled ? 'text-muted-foreground' : 'text-accent'
          }`}>
            {selectedFile ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            )}
          </div>

          {/* Upload Text */}
          <div>
            <p className={`text-sm font-medium ${
              disabled ? 'text-muted-foreground' : 'text-foreground'
            }`}>
              {selectedFile ? 'File selected' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              CSV, Excel, or TSV files only (max 50MB)
            </p>
          </div>

          {/* Selected File Info */}
          {selectedFile && (
            <div className="mt-3 p-3 bg-primary/10 rounded-lg w-full max-w-md">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary font-semibold truncate">
                    📄 {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                {!disabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    className="ml-2 text-red-600 hover:text-red-700 transition-colors"
                    title="Remove file"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {validationError}
          </p>
        </div>
      )}

      {/* Upload Button */}
      {canUpload && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpload?.();
            }}
            disabled={isUploading}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isUploading
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80'
            }`}
          >
            {isUploading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              'Start Processing'
            )}
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 text-xs text-muted-foreground">
        <p>
          <strong>Tip:</strong> Make sure your CSV file contains columns for ISBN, title, author, and base pricing information.
          The system will look up current prices and apply your selected processing options.
        </p>
      </div>
    </section>
  );
}
