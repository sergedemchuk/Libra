import { useState, useRef } from "react";

interface UploadImportCardProps {
  onFileSelect?: (file: File | null) => void;
}

export default function UploadImportCard({ onFileSelect }: UploadImportCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect?.(file);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

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

      <div
        onClick={handleUploadClick}
        className="border-2 border-dashed border-accent hover:border-primary transition-colors duration-200 rounded-lg p-8 text-center cursor-pointer hover:bg-card/50 bg-card/20"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.tsv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center space-y-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-accent"
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
          <p className="text-sm text-foreground font-medium">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">
            CSV, Excel, or TSV files only
          </p>
          {selectedFile && (
            <div className="mt-3 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-primary font-semibold">
                📄 {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
