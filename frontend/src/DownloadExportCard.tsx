import React from 'react';

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

interface DownloadExportCardProps {
  jobState: JobState;
  onDownload?: () => void;
}

const DownloadExportCard: React.FC<DownloadExportCardProps> = ({ 
  jobState, 
  onDownload 
}) => {
  const getStatusIcon = () => {
    switch (jobState.status) {
      case 'idle':
        return (
          <svg
            aria-hidden="true"
            className="w-5 h-5 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        );
      case 'uploading':
      case 'processing':
        return (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        );
      case 'completed':
        return (
          <svg
            aria-hidden="true"
            className="w-5 h-5 text-green-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        );
      case 'failed':
        return (
          <svg
            aria-hidden="true"
            className="w-5 h-5 text-red-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (jobState.status) {
      case 'idle':
        return 'Ready to process your file';
      case 'uploading':
        return 'Uploading file to server...';
      case 'processing':
        return 'Processing catalog data and looking up prices...';
      case 'completed':
        return 'Processing complete! Download your updated catalog.';
      case 'failed':
        return 'Processing failed. Please try again.';
      default:
        return 'Unknown status';
    }
  };

  const getHeaderColor = () => {
    switch (jobState.status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'uploading':
      case 'processing':
        return 'text-blue-600';
      default:
        return 'text-primary';
    }
  };

  const canDownload = jobState.status === 'completed' && jobState.downloadUrl;

  return (
    <section
      role="region"
      aria-labelledby="download-exported-data-title"
      className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
          jobState.status === 'completed' ? 'bg-green-100' :
          jobState.status === 'failed' ? 'bg-red-100' :
          jobState.status === 'processing' || jobState.status === 'uploading' ? 'bg-blue-100' :
          'bg-primary/10'
        }`}>
          {getStatusIcon()}
        </div>
        
        <div className="flex-1">
          <h2
            id="download-exported-data-title"
            className={`text-lg font-semibold ${getHeaderColor()}`}
          >
            Download Processed Data
          </h2>
          <p className="text-sm text-muted-foreground">
            {getStatusText()}
          </p>
        </div>
      </div>

      {/* Progress Information */}
      {jobState.progress && (jobState.status === 'processing' || jobState.status === 'completed') && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-800">
              Processing Progress
            </span>
            <span className="text-sm text-blue-600">
              {Math.round((jobState.progress.processed / jobState.progress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 rounded-full h-2 transition-all duration-500"
              style={{ 
                width: `${(jobState.progress.processed / jobState.progress.total) * 100}%` 
              }}
            />
          </div>
          <p className="text-xs text-blue-700">
            {jobState.progress.processed.toLocaleString()} of {jobState.progress.total.toLocaleString()} rows processed
          </p>
        </div>
      )}

      {/* Error Display */}
      {jobState.status === 'failed' && jobState.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 mb-2">Processing Error</h4>
          <p className="text-sm text-red-700">{jobState.error}</p>
          <p className="text-xs text-red-600 mt-2">
            Please check your file format and try again. Make sure the file contains proper ISBN data.
          </p>
        </div>
      )}

      {/* Success Information */}
      {jobState.status === 'completed' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 mb-2">Processing Complete!</h4>
          <p className="text-sm text-green-700">
            Your catalog has been processed with updated pricing information.
          </p>
          {jobState.fileName && (
            <p className="text-xs text-green-600 mt-1">
              File: {jobState.fileName}
            </p>
          )}
        </div>
      )}

      {/* Download Section */}
      <div className="flex flex-col sm:flex-row gap-3">
        {canDownload ? (
          <button
            onClick={onDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 px-4 py-3 rounded-lg font-medium transition-colors"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Processed File
          </button>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-2 bg-muted text-muted-foreground px-4 py-3 rounded-lg font-medium">
            {jobState.status === 'idle' ? (
              <>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Upload a file to begin processing
              </>
            ) : jobState.status === 'uploading' || jobState.status === 'processing' ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Please wait for processing to complete
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                Download not available
              </>
            )}
          </div>
        )}
      </div>

      {/* Additional Information */}
      {jobState.status === 'idle' && (
        <div className="mt-4 p-3 bg-accent/20 border border-accent/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>What happens next:</strong> Once you upload your catalog file, 
            the system will automatically look up current prices for each ISBN, 
            apply your selected pricing rules, and generate a processed CSV file 
            ready for import back into Destiny.
          </p>
        </div>
      )}

      {/* Processing Time Estimate */}
      {(jobState.status === 'uploading' || jobState.status === 'processing') && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Processing time:</strong> Large files may take several minutes to process. 
            You can leave this page open and the download will be available when processing completes.
          </p>
        </div>
      )}
    </section>
  );
};

export default DownloadExportCard;
