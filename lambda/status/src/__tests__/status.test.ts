/**
 * Unit tests for the Job Status Lambda handler
 *
 * Covers: job retrieval, status transitions, download URL generation,
 * request validation, CORS headers, and error handling.
 * No real AWS calls are made.
 */

import { APIGatewayProxyEvent, Context } from 'aws-lambda';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDynamoSend = jest.fn();
const mockGetSignedUrl = jest.fn().mockResolvedValue('https://s3.example.com/download-url');

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({ send: mockDynamoSend })),
  GetItemCommand: jest.fn().mockImplementation((input) => ({ _cmd: 'GetItem', ...input })),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ _cmd: 'GetObject', ...input })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

jest.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: jest.fn((obj: unknown) => obj),
  unmarshall: jest.fn((obj: unknown) => obj),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { handler } from '../index';
import { GetItemCommand } from '@aws-sdk/client-dynamodb';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STUB_CONTEXT = {} as Context;

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/status/job-123',
    pathParameters: { jobId: 'job-123' },
    queryStringParameters: null,
    headers: {},
    multiValueHeaders: {},
    body: null,
    isBase64Encoded: false,
    resource: '',
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    multiValueQueryStringParameters: null,
    ...overrides,
  };
}

function makeJobItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    jobId: 'job-123',
    status: 'PENDING',
    fileName: 'catalog.csv',
    inputFileKey: 'uploads/job-123/catalog.csv',
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env.OUTPUT_BUCKET = 'test-output-bucket';
  process.env.JOB_STATUS_TABLE = 'test-job-status';
});

// =============================================================================
// CORS PREFLIGHT
// =============================================================================

describe('OPTIONS — CORS preflight', () => {
  it('returns 200 for OPTIONS requests', async () => {
    const result = await handler(makeEvent({ httpMethod: 'OPTIONS' }), STUB_CONTEXT);
    expect(result.statusCode).toBe(200);
  });

  it('includes Access-Control-Allow-Origin: * on all responses', async () => {
    const result = await handler(makeEvent({ httpMethod: 'OPTIONS' }), STUB_CONTEXT);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});

// =============================================================================
// METHOD GUARD
// =============================================================================

describe('Non-GET requests', () => {
  it('returns 405 for POST requests', async () => {
    const result = await handler(makeEvent({ httpMethod: 'POST' }), STUB_CONTEXT);
    expect(result.statusCode).toBe(405);
    expect(JSON.parse(result.body).error).toBe('Method not allowed');
  });

  it('returns 405 for DELETE requests', async () => {
    const result = await handler(makeEvent({ httpMethod: 'DELETE' }), STUB_CONTEXT);
    expect(result.statusCode).toBe(405);
  });
});

// =============================================================================
// INPUT VALIDATION
// =============================================================================

describe('Input validation', () => {
  it('returns 400 when jobId path parameter is missing', async () => {
    const result = await handler(
      makeEvent({ pathParameters: null }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('jobId is required');
  });

  it('returns 400 when pathParameters exists but jobId is undefined', async () => {
    const result = await handler(
      makeEvent({ pathParameters: {} }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('jobId is required');
  });
});

// =============================================================================
// JOB RETRIEVAL
// =============================================================================

describe('Job retrieval from DynamoDB', () => {
  it('queries DynamoDB with GetItemCommand using the correct table and jobId', async () => {
    mockDynamoSend.mockResolvedValueOnce({ Item: makeJobItem() });

    await handler(makeEvent(), STUB_CONTEXT);

    expect(GetItemCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'test-job-status',
        Key: expect.objectContaining({ jobId: 'job-123' }),
      })
    );
  });

  it('returns 404 when no job is found for the given jobId', async () => {
    mockDynamoSend.mockResolvedValueOnce({ Item: undefined });

    const result = await handler(makeEvent(), STUB_CONTEXT);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toBe('Job not found');
  });

  it('returns 200 with job details when the job exists', async () => {
    mockDynamoSend.mockResolvedValueOnce({ Item: makeJobItem() });

    const result = await handler(makeEvent(), STUB_CONTEXT);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.jobId).toBe('job-123');
    expect(body.status).toBe('PENDING');
    expect(body.fileName).toBe('catalog.csv');
  });
});

// =============================================================================
// JOB STATUS VALUES
// =============================================================================

describe('Job status values in response', () => {
  it('returns PENDING status correctly', async () => {
    mockDynamoSend.mockResolvedValueOnce({ Item: makeJobItem({ status: 'PENDING' }) });

    const result = await handler(makeEvent(), STUB_CONTEXT);
    expect(JSON.parse(result.body).status).toBe('PENDING');
  });

  it('returns PROCESSING status correctly', async () => {
    mockDynamoSend.mockResolvedValueOnce({ Item: makeJobItem({ status: 'PROCESSING' }) });

    const result = await handler(makeEvent(), STUB_CONTEXT);
    expect(JSON.parse(result.body).status).toBe('PROCESSING');
  });

  it('returns FAILED status with error message', async () => {
    mockDynamoSend.mockResolvedValueOnce({
      Item: makeJobItem({ status: 'FAILED', errorMessage: 'Could not parse file' }),
    });

    const result = await handler(makeEvent(), STUB_CONTEXT);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('FAILED');
    expect(body.error).toBe('Could not parse file');
  });
});

// =============================================================================
// PROGRESS REPORTING
// =============================================================================

describe('Progress information', () => {
  it('includes progress object when totalRows and processedRows are present', async () => {
    mockDynamoSend.mockResolvedValueOnce({
      Item: makeJobItem({
        status: 'PROCESSING',
        totalRows: 200,
        processedRows: 75,
      }),
    });

    const result = await handler(makeEvent(), STUB_CONTEXT);
    const body = JSON.parse(result.body);
    expect(body.progress).toEqual({ total: 200, processed: 75 });
  });

  it('omits the progress object when totalRows is not set', async () => {
    mockDynamoSend.mockResolvedValueOnce({ Item: makeJobItem({ status: 'PENDING' }) });

    const result = await handler(makeEvent(), STUB_CONTEXT);
    expect(JSON.parse(result.body).progress).toBeUndefined();
  });
});

// =============================================================================
// DOWNLOAD URL GENERATION
// =============================================================================

describe('Download URL for COMPLETED jobs', () => {
  it('generates a presigned S3 GET URL when the job status is COMPLETED', async () => {
    mockDynamoSend.mockResolvedValueOnce({
      Item: makeJobItem({
        status: 'COMPLETED',
        outputFileKey: 'results/job-123/catalog_processed.csv',
      }),
    });

    const result = await handler(makeEvent(), STUB_CONTEXT);

    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    expect(JSON.parse(result.body).downloadUrl).toBe('https://s3.example.com/download-url');
  });

  it('sets the presigned download URL to expire in 1 hour', async () => {
    mockDynamoSend.mockResolvedValueOnce({
      Item: makeJobItem({
        status: 'COMPLETED',
        outputFileKey: 'results/job-123/catalog_processed.csv',
      }),
    });

    await handler(makeEvent(), STUB_CONTEXT);

    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 60 * 60 }),
    );
  });

  it('uses the correct output bucket when generating the download URL', async () => {
    mockDynamoSend.mockResolvedValueOnce({
      Item: makeJobItem({
        status: 'COMPLETED',
        outputFileKey: 'results/job-123/output.csv',
      }),
    });

    await handler(makeEvent(), STUB_CONTEXT);

    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    expect(GetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-output-bucket',
        Key: 'results/job-123/output.csv',
      })
    );
  });

  it('does NOT generate a download URL for PENDING jobs', async () => {
    mockDynamoSend.mockResolvedValueOnce({ Item: makeJobItem({ status: 'PENDING' }) });

    const result = await handler(makeEvent(), STUB_CONTEXT);

    expect(mockGetSignedUrl).not.toHaveBeenCalled();
    expect(JSON.parse(result.body).downloadUrl).toBeUndefined();
  });

  it('does NOT generate a download URL for PROCESSING jobs', async () => {
    mockDynamoSend.mockResolvedValueOnce({
      Item: makeJobItem({ status: 'PROCESSING', totalRows: 100, processedRows: 50 }),
    });

    const result = await handler(makeEvent(), STUB_CONTEXT);

    expect(mockGetSignedUrl).not.toHaveBeenCalled();
    expect(JSON.parse(result.body).downloadUrl).toBeUndefined();
  });

  it('does NOT generate a download URL for FAILED jobs', async () => {
    mockDynamoSend.mockResolvedValueOnce({
      Item: makeJobItem({ status: 'FAILED', errorMessage: 'Parsing error' }),
    });

    const result = await handler(makeEvent(), STUB_CONTEXT);

    expect(mockGetSignedUrl).not.toHaveBeenCalled();
    expect(JSON.parse(result.body).downloadUrl).toBeUndefined();
  });

  it('still returns 200 if download URL generation fails after a COMPLETED job', async () => {
    mockDynamoSend.mockResolvedValueOnce({
      Item: makeJobItem({
        status: 'COMPLETED',
        outputFileKey: 'results/job-123/output.csv',
      }),
    });
    mockGetSignedUrl.mockRejectedValueOnce(new Error('S3 signing failed'));

    const result = await handler(makeEvent(), STUB_CONTEXT);

    // Should not blow up the whole response — graceful degradation
    expect(result.statusCode).toBe(200);
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

describe('Error handling', () => {
  it('returns 500 when DynamoDB throws an unexpected error', async () => {
    mockDynamoSend.mockRejectedValueOnce(new Error('Unexpected DynamoDB error'));

    const result = await handler(makeEvent(), STUB_CONTEXT);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe('Internal server error');
  });
});
