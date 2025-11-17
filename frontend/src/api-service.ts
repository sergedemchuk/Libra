// API service for Library Catalog backend

export interface ApiConfig {
  baseUrl: string;
  region: string;
}

export interface UploadRequest {
  fileName: string;
  fileSize: number;
  settings: {
    priceRounding: boolean;
    priceAdjustment?: number;
  };
}

export interface UploadResponse {
  jobId: string;
  uploadUrl: string;
  expires: string;
}

export interface JobProgress {
  total: number;
  processed: number;
}

export interface JobResponse {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileName: string;
  progress?: JobProgress;
  downloadUrl?: string;
  error?: string;
}

class LibraryCatalogApi {
  private baseUrl: string;

  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Initialize file upload and get presigned URL
   */
  async initializeUpload(request: UploadRequest): Promise<UploadResponse> {
    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Upload file to S3 using presigned URL
   */
  async uploadFile(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'text/csv',
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Check job status and get progress/download URL
   */
  async getJobStatus(jobId: string): Promise<JobResponse> {
    const response = await fetch(`${this.baseUrl}/status/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Job not found');
      }
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Complete upload workflow with progress tracking
   */
  async uploadAndProcess(
    file: File,
    settings: UploadRequest['settings'],
    onProgress?: (status: JobResponse) => void
  ): Promise<JobResponse> {
    // Step 1: Initialize upload
    const uploadResponse = await this.initializeUpload({
      fileName: file.name,
      fileSize: file.size,
      settings,
    });

    // Step 2: Upload file to S3
    await this.uploadFile(uploadResponse.uploadUrl, file);

    // Step 3: Poll for status until complete
    return this.pollJobStatus(uploadResponse.jobId, onProgress);
  }

  /**
   * Poll job status with exponential backoff
   */
  async pollJobStatus(
    jobId: string,
    onProgress?: (status: JobResponse) => void,
    maxAttempts: number = 120 // 5 minutes with exponential backoff
  ): Promise<JobResponse> {
    let attempt = 0;
    let delay = 1000; // Start with 1 second

    while (attempt < maxAttempts) {
      try {
        const status = await this.getJobStatus(jobId);
        
        // Notify progress callback
        if (onProgress) {
          onProgress(status);
        }

        // Check if job is complete
        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          return status;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Exponential backoff with max of 5 seconds
        delay = Math.min(delay * 1.2, 5000);
        attempt++;

      } catch (error) {
        console.error('Error polling job status:', error);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      }
    }

    throw new Error('Job status polling timeout - maximum attempts reached');
  }
}

// Export singleton instance
let apiInstance: LibraryCatalogApi | null = null;

export const getApiInstance = (config: ApiConfig): LibraryCatalogApi => {
  if (!apiInstance) {
    apiInstance = new LibraryCatalogApi(config);
  }
  return apiInstance;
};

// Export class for direct use if needed
export { LibraryCatalogApi };

// Utility function to validate file before upload
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 50MB limit' };
  }

  // Check file type
  const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  const allowedExtensions = ['.csv', '.xlsx', '.xls', '.tsv'];
  
  const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  const hasValidExtension = allowedExtensions.includes(fileExtension);
  const hasValidType = allowedTypes.includes(file.type) || file.type === '';

  if (!hasValidExtension) {
    return { 
      isValid: false, 
      error: `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}` 
    };
  }

  return { isValid: true };
};
