/**
 * Unit tests for the Upload Lambda handler
 *
 * Covers: request validation, job record creation in DynamoDB,
 * presigned URL generation, CORS headers, and error handling.
 * No real AWS calls are made.
 */

import { APIGatewayProxyEvent, Context } from 'aws-lambda';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDynamoSend = jest.fn();
const mockGetSignedUrl = jest.fn().mockResolvedValue('https://s3.example.com/presigned-upload-url');

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({ send: mockDynamoSend })),
  PutItemCommand: jest.fn().mockImplementation((input) => ({ _cmd: 'PutItem', ...input })),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ _cmd: 'PutObject', ...input })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

jest.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: jest.fn((obj: unknown) => obj),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('upload-job-uuid-1234'),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { handler } from '../index';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STUB_CONTEXT = {} as Context;

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    path: '/upload',
    pathParameters: null,
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

function validBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    fileName: 'catalog.csv',
    fileSize: 1024,
    settings: { priceRounding: false },
    ...overrides,
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env.INPUT_BUCKET = 'test-input-bucket';
  process.env.JOB_STATUS_TABLE = 'test-job-status';
  mockDynamoSend.mockResolvedValue({});
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

describe('Non-POST requests', () => {
  it('returns 405 for GET requests', async () => {
    const result = await handler(makeEvent({ httpMethod: 'GET' }), STUB_CONTEXT);
    expect(result.statusCode).toBe(405);
    expect(JSON.parse(result.body).error).toBe('Method not allowed');
  });

  it('returns 405 for DELETE requests', async () => {
    const result = await handler(makeEvent({ httpMethod: 'DELETE' }), STUB_CONTEXT);
    expect(result.statusCode).toBe(405);
  });
});

// =============================================================================
// REQUEST BODY VALIDATION
// =============================================================================

describe('Request body validation', () => {
  it('returns 400 when request body is absent', async () => {
    const result = await handler(makeEvent({ body: null }), STUB_CONTEXT);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Request body is required');
  });

  it('returns 400 when fileName is missing', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ fileName: undefined }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('fileName is required');
  });

  it('returns 400 when fileSize is missing', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ fileSize: undefined }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Valid fileSize is required');
  });

  it('returns 400 when fileSize is zero', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ fileSize: 0 }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Valid fileSize is required');
  });

  it('returns 400 when fileSize is negative', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ fileSize: -100 }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Valid fileSize is required');
  });

  it('returns 400 when fileSize exceeds the 50 MB limit', async () => {
    const over50MB = 50 * 1024 * 1024 + 1;
    const result = await handler(
      makeEvent({ body: validBody({ fileSize: over50MB }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('File size exceeds 50MB limit');
  });

  it('accepts a file whose size is exactly at the 50 MB limit', async () => {
    const exactly50MB = 50 * 1024 * 1024;
    const result = await handler(
      makeEvent({ body: validBody({ fileSize: exactly50MB }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(200);
  });

  it('returns 400 when settings object is missing', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ settings: undefined }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Valid settings object is required');
  });

  it('returns 400 when priceRounding is not a boolean', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ settings: { priceRounding: 'yes' } }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Valid settings object is required');
  });

  it('returns 400 when priceAdjustment is not a number', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ settings: { priceRounding: false, priceAdjustment: 'ten' } }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('priceAdjustment must be a number');
  });

  it('returns 400 when priceAdjustment exceeds the upper bound of 1000', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ settings: { priceRounding: false, priceAdjustment: 1001 } }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('priceAdjustment must be between -1000 and 1000');
  });

  it('returns 400 when priceAdjustment is below the lower bound of -1000', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ settings: { priceRounding: false, priceAdjustment: -1001 } }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('priceAdjustment must be between -1000 and 1000');
  });

  it('accepts priceAdjustment at the exact boundaries (-1000 and 1000)', async () => {
    for (const adj of [-1000, 1000]) {
      jest.clearAllMocks();
      mockDynamoSend.mockResolvedValue({});

      const result = await handler(
        makeEvent({ body: validBody({ settings: { priceRounding: true, priceAdjustment: adj } }) }),
        STUB_CONTEXT,
      );
      expect(result.statusCode).toBe(200);
    }
  });

  it('returns 400 for unsupported file extensions like .pdf', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ fileName: 'report.pdf' }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toContain('File type not supported');
  });

  it('returns 400 for unsupported file extensions like .json', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ fileName: 'data.json' }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toContain('File type not supported');
  });

  it('accepts .xlsx files', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ fileName: 'catalog.xlsx' }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(200);
  });

  it('accepts .xls files', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ fileName: 'catalog.xls' }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(200);
  });

  it('accepts .tsv files', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ fileName: 'catalog.tsv' }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(200);
  });

  it('rejects file extensions in a case-insensitive check', async () => {
    const result = await handler(
      makeEvent({ body: validBody({ fileName: 'catalog.CSV' }) }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(200);
  });
});

// =============================================================================
// MALFORMED JSON BODY
// =============================================================================

describe('Malformed JSON body', () => {
  it('returns 500 when request body is not valid JSON', async () => {
    const result = await handler(
      makeEvent({ body: '{ invalid json !!!' }),
      STUB_CONTEXT,
    );
    expect(result.statusCode).toBe(500);
  });
});

// =============================================================================
// JOB RECORD CREATION IN DYNAMODB
// =============================================================================

describe('DynamoDB job record creation', () => {
  it('creates a job record with PutItemCommand on a valid request', async () => {
    const result = await handler(makeEvent({ body: validBody() }), STUB_CONTEXT);

    expect(result.statusCode).toBe(200);
    expect(PutItemCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'test-job-status',
        ConditionExpression: 'attribute_not_exists(jobId)',
      })
    );
  });

  it('stores the job with PENDING status', async () => {
    await handler(makeEvent({ body: validBody() }), STUB_CONTEXT);

    const putCall = (PutItemCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(putCall.Item.status).toBe('PENDING');
  });

  it('stores the original fileName in the job record', async () => {
    await handler(makeEvent({ body: validBody({ fileName: 'my_books.xlsx' }) }), STUB_CONTEXT);

    const putCall = (PutItemCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(putCall.Item.fileName).toBe('my_books.xlsx');
  });

  it('stores the processing settings in the job record', async () => {
    const settings = { priceRounding: true, priceAdjustment: 5 };
    await handler(
      makeEvent({ body: validBody({ settings }) }),
      STUB_CONTEXT,
    );

    const putCall = (PutItemCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(putCall.Item.settings).toEqual(settings);
  });

  it('uses ConditionExpression to prevent duplicate jobId', async () => {
    await handler(makeEvent({ body: validBody() }), STUB_CONTEXT);

    const putCall = (PutItemCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(putCall.ConditionExpression).toBe('attribute_not_exists(jobId)');
  });

  it('returns 500 when DynamoDB throws during job record creation', async () => {
    mockDynamoSend.mockRejectedValueOnce(new Error('DynamoDB unavailable'));

    const result = await handler(makeEvent({ body: validBody() }), STUB_CONTEXT);

    expect(result.statusCode).toBe(500);
  });
});

// =============================================================================
// SUCCESSFUL UPLOAD RESPONSE
// =============================================================================

describe('Successful upload initiation response', () => {
  it('returns 200 with jobId, uploadUrl, and expires', async () => {
    const result = await handler(makeEvent({ body: validBody() }), STUB_CONTEXT);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.jobId).toBe('upload-job-uuid-1234');
    expect(body.uploadUrl).toBe('https://s3.example.com/presigned-upload-url');
    expect(body.expires).toBeDefined();
  });

  it('generates a presigned URL via getSignedUrl', async () => {
    await handler(makeEvent({ body: validBody() }), STUB_CONTEXT);

    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('sets the presigned URL to expire in ~15 minutes', async () => {
    await handler(makeEvent({ body: validBody() }), STUB_CONTEXT);

    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 15 * 60 }),
    );
  });

  it('includes the jobId in the S3 file key path', async () => {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await handler(makeEvent({ body: validBody({ fileName: 'books.csv' }) }), STUB_CONTEXT);

    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-input-bucket',
        Key: expect.stringContaining('upload-job-uuid-1234'),
      })
    );
  });
});