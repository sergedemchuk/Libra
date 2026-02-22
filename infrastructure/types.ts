// Types for DynamoDB table items

export interface PriceCacheItem {
  isbn: string;              // Partition key
  price: number;             // Book price from ISBNDB
  condition: string;         // new, used, etc.
  vendor?: string;           // Price source vendor
  title?: string;            // Book title for reference
  author?: string;           // Author for reference
  timestamp: string;         // When cached (ISO string)
  ttl: number;              // TTL for auto-expiration (epoch seconds)
}

export interface JobStatusItem {
  jobId: string;            // Partition key (UUID)
  status: JobStatus;        // Current processing status
  fileName: string;         // Original uploaded file name
  inputFileKey: string;     // S3 key for input file
  outputFileKey?: string;   // S3 key for processed file
  totalRows?: number;       // Total rows in CSV
  processedRows?: number;   // Rows processed so far
  errorCount?: number;      // Number of errors encountered
  settings: ProcessingSettings; // User-selected options
  createdAt: string;        // Job creation time (ISO string)
  updatedAt: string;        // Last update time (ISO string)
  errorMessage?: string;    // Error details if failed
}

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING', 
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface ProcessingSettings {
  priceRounding: boolean;   // Round to nearest dollar
  priceAdjustment?: number; // Additional amount to add
}

// API response types
export interface JobResponse {
  jobId: string;
  status: JobStatus;
  fileName: string;
  progress?: {
    total: number;
    processed: number;
  };
  downloadUrl?: string;     // Presigned URL for completed file
  error?: string;
}
