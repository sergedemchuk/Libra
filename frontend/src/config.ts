// Configuration for Library Catalog API
// This file should be updated with your actual API URL after deployment

export interface Config {
  api: {
    baseUrl: string;
    region: string;
  };
  upload: {
    maxFileSize: number; // in bytes
    allowedTypes: string[];
    pollInterval: number; // milliseconds
  };
}

// Default configuration - UPDATE with your deployed API URL
const config: Config = {
  api: {
    // Replace with your API URL from CDK outputs
    baseUrl: process.env.REACT_APP_API_URL || 'https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod',
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  },
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['.csv', '.xlsx', '.xls', '.tsv'],
    pollInterval: 2000, // 2 seconds
  },
};

export default config;

// Environment variable validation
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (config.api.baseUrl.includes('YOUR_API_ID')) {
    errors.push('API URL not configured - update REACT_APP_API_URL environment variable');
  }

  if (!config.api.baseUrl.startsWith('https://')) {
    errors.push('API URL must use HTTPS');
  }

  if (!config.api.region) {
    errors.push('AWS region not configured');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Development mode configuration
export const isDevelopment = process.env.NODE_ENV === 'development';

// Helper function to get config with validation
export const getConfig = (): Config => {
  const validation = validateConfig();
  
  if (!validation.isValid && !isDevelopment) {
    console.error('Configuration errors:', validation.errors);
    throw new Error('Invalid configuration. Please check environment variables.');
  }

  if (!validation.isValid && isDevelopment) {
    console.warn('Configuration warnings (development mode):', validation.errors);
  }

  return config;
};
