/**
 * Unit tests for the Email Lambda handler
 *
 * Covers: forgot-password, send-2fa, verify-2fa, notify-admin,
 * CORS preflight, unknown actions, and error handling.
 * No real AWS calls are made.
 */

import { APIGatewayProxyEvent } from 'aws-lambda';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDdbSend = jest.fn();
const mockSesSend = jest.fn();

jest.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: jest.fn().mockImplementation(() => ({ send: mockSesSend })),
  SendEmailCommand: jest.fn().mockImplementation((input) => ({ _cmd: 'SendEmail', ...input })),
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockImplementation(() => ({ send: mockDdbSend })),
  },
  PutCommand: jest.fn().mockImplementation((input) => ({ _cmd: 'Put', ...input })),
  GetCommand: jest.fn().mockImplementation((input) => ({ _cmd: 'Get', ...input })),
  QueryCommand: jest.fn().mockImplementation((input) => ({ _cmd: 'Query', ...input })),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({ toString: () => 'mock-reset-token-abc123' }),
  randomInt: jest.fn().mockReturnValue(123456),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { handler } from '../index';
import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    path: '/email',
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

function postBody(action: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ action, ...extra });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SES_FROM_ADDRESS = 'no-reply@test.com';
  process.env.ADMIN_EMAIL = 'admin@test.com';
  process.env.ACCOUNTS_TABLE = 'test-accounts';
  process.env.ACCOUNTS_EMAIL_INDEX = 'email-index';
  process.env.EMAIL_TOKENS_TABLE = 'test-tokens';
  process.env.APP_URL = 'https://app.test.com';
  mockSesSend.mockResolvedValue({});
});

// =============================================================================
// CORS PREFLIGHT
// =============================================================================

describe('OPTIONS — CORS preflight', () => {
  it('returns 204 for OPTIONS requests', async () => {
    const result = await handler(makeEvent({ httpMethod: 'OPTIONS' }));
    expect(result.statusCode).toBe(204);
  });

  it('includes CORS headers on OPTIONS response', async () => {
    const result = await handler(makeEvent({ httpMethod: 'OPTIONS' }));
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(result.headers?.['Access-Control-Allow-Methods']).toContain('POST');
  });
});

// =============================================================================
// UNKNOWN / MISSING ACTION
// =============================================================================

describe('Unknown or missing action', () => {
  it('returns 400 for an unknown action', async () => {
    const result = await handler(makeEvent({
      body: postBody('do-something-weird'),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Unknown action');
  });

  it('returns 400 when action is absent from the body', async () => {
    const result = await handler(makeEvent({
      body: JSON.stringify({ email: 'user@example.com' }),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Unknown action');
  });

  it('returns 500 when body is not valid JSON', async () => {
    const result = await handler(makeEvent({
      body: '{ broken json !!!',
    }));
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe('Internal error');
  });
});

// =============================================================================
// FORGOT PASSWORD — action: 'forgot-password'
// =============================================================================

describe('forgot-password', () => {
  it('always returns 200 regardless of whether the user exists (prevents enumeration)', async () => {
    // User does NOT exist
    mockDdbSend.mockResolvedValueOnce({ Count: 0, Items: [] });

    const result = await handler(makeEvent({
      body: postBody('forgot-password', { email: 'nobody@example.com' }),
    }));

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toContain('If that account exists');
  });

  it('does NOT send an email when the user does not exist', async () => {
    mockDdbSend.mockResolvedValueOnce({ Count: 0, Items: [] });

    await handler(makeEvent({
      body: postBody('forgot-password', { email: 'nobody@example.com' }),
    }));

    expect(mockSesSend).not.toHaveBeenCalled();
  });

  it('stores a reset token in DynamoDB when the user exists', async () => {
    mockDdbSend.mockResolvedValueOnce({ Count: 1, Items: [{ email: 'user@example.com' }] });
    mockDdbSend.mockResolvedValueOnce({}); // PutCommand for token
    mockSesSend.mockResolvedValueOnce({});  // SES send

    await handler(makeEvent({
      body: postBody('forgot-password', { email: 'user@example.com' }),
    }));

    expect(PutCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'test-tokens',
        Item: expect.objectContaining({
          token: 'mock-reset-token-abc123',
          email: 'user@example.com',
          kind: 'reset',
        }),
      })
    );
  });

  it('sends a reset email via SES when the user exists', async () => {
    mockDdbSend.mockResolvedValueOnce({ Count: 1, Items: [{ email: 'user@example.com' }] });
    mockDdbSend.mockResolvedValueOnce({});
    mockSesSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      body: postBody('forgot-password', { email: 'user@example.com' }),
    }));

    expect(SendEmailCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        FromEmailAddress: 'no-reply@test.com',
        Destination: { ToAddresses: ['user@example.com'] },
      })
    );
  });

  it('includes the APP_URL in the reset link', async () => {
    mockDdbSend.mockResolvedValueOnce({ Count: 1, Items: [{ email: 'user@example.com' }] });
    mockDdbSend.mockResolvedValueOnce({});
    mockSesSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      body: postBody('forgot-password', { email: 'user@example.com' }),
    }));

    const sesCall = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0];
    const htmlBody = sesCall.Content.Simple.Body.Html.Data;
    expect(htmlBody).toContain('https://app.test.com/reset?token=mock-reset-token-abc123');
  });
});

// =============================================================================
// SEND 2FA — action: 'send-2fa'
// =============================================================================

describe('send-2fa', () => {
  it('returns 404 when the account does not exist', async () => {
    mockDdbSend.mockResolvedValueOnce({ Count: 0, Items: [] });

    const result = await handler(makeEvent({
      body: postBody('send-2fa', { email: 'nobody@example.com' }),
    }));

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toBe('Account not found');
  });

  it('stores a 6-digit code in DynamoDB when user exists', async () => {
    mockDdbSend.mockResolvedValueOnce({ Count: 1, Items: [{ email: 'user@example.com' }] });
    mockDdbSend.mockResolvedValueOnce({});
    mockSesSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      body: postBody('send-2fa', { email: 'user@example.com' }),
    }));

    expect(PutCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'test-tokens',
        Item: expect.objectContaining({
          token: '2fa:user@example.com',
          code: '123456',
          kind: '2fa',
        }),
      })
    );
  });

  it('sends an email with the 2FA code', async () => {
    mockDdbSend.mockResolvedValueOnce({ Count: 1, Items: [{ email: 'user@example.com' }] });
    mockDdbSend.mockResolvedValueOnce({});
    mockSesSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      body: postBody('send-2fa', { email: 'user@example.com' }),
    }));

    expect(mockSesSend).toHaveBeenCalledTimes(1);
    const sesCall = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0];
    const htmlBody = sesCall.Content.Simple.Body.Html.Data;
    expect(htmlBody).toContain('123456');
  });

  it('returns 200 with "Code sent" on success', async () => {
    mockDdbSend.mockResolvedValueOnce({ Count: 1, Items: [{ email: 'user@example.com' }] });
    mockDdbSend.mockResolvedValueOnce({});
    mockSesSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      body: postBody('send-2fa', { email: 'user@example.com' }),
    }));

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Code sent');
  });
});

// =============================================================================
// VERIFY 2FA — action: 'verify-2fa'
// =============================================================================

describe('verify-2fa', () => {
  it('returns 401 when no token record is found', async () => {
    mockDdbSend.mockResolvedValueOnce({ Item: undefined });

    const result = await handler(makeEvent({
      body: postBody('verify-2fa', { email: 'user@example.com', code: '123456' }),
    }));

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toBe('Invalid or expired code');
  });

  it('returns 401 when the code does not match', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Item: { token: '2fa:user@example.com', code: '999999', ttl: Math.floor(Date.now() / 1000) + 600 },
    });

    const result = await handler(makeEvent({
      body: postBody('verify-2fa', { email: 'user@example.com', code: '000000' }),
    }));

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toBe('Invalid or expired code');
  });

  it('returns 401 when the code has expired', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Item: { token: '2fa:user@example.com', code: '123456', ttl: Math.floor(Date.now() / 1000) - 60 },
    });

    const result = await handler(makeEvent({
      body: postBody('verify-2fa', { email: 'user@example.com', code: '123456' }),
    }));

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toBe('Code expired');
  });

  it('returns 200 with verified: true when the code matches and is not expired', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Item: { token: '2fa:user@example.com', code: '123456', ttl: Math.floor(Date.now() / 1000) + 600 },
    });

    const result = await handler(makeEvent({
      body: postBody('verify-2fa', { email: 'user@example.com', code: '123456' }),
    }));

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).verified).toBe(true);
  });

  it('looks up the token using the correct DynamoDB key', async () => {
    mockDdbSend.mockResolvedValueOnce({ Item: undefined });

    await handler(makeEvent({
      body: postBody('verify-2fa', { email: 'user@example.com', code: '123456' }),
    }));

    expect(GetCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'test-tokens',
        Key: { token: '2fa:user@example.com' },
      })
    );
  });
});

// =============================================================================
// NOTIFY ADMIN — action: 'notify-admin'
// =============================================================================

describe('notify-admin', () => {
  it('sends an email to the configured admin address', async () => {
    mockSesSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      body: postBody('notify-admin', { actor: 'user1', change: 'deleted account X' }),
    }));

    expect(SendEmailCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Destination: { ToAddresses: ['admin@test.com'] },
      })
    );
  });

  it('includes the actor and change description in the email', async () => {
    mockSesSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      body: postBody('notify-admin', { actor: 'user1', change: 'deleted account X', details: 'some detail' }),
    }));

    const sesCall = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0];
    const htmlBody = sesCall.Content.Simple.Body.Html.Data;
    expect(htmlBody).toContain('user1');
    expect(htmlBody).toContain('deleted account X');
    expect(htmlBody).toContain('some detail');
  });

  it('returns 200 with "Admin notified" on success', async () => {
    mockSesSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      body: postBody('notify-admin', { actor: 'user1', change: 'test change' }),
    }));

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Admin notified');
  });

  it('handles optional details being omitted', async () => {
    mockSesSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      body: postBody('notify-admin', { actor: 'user1', change: 'test change' }),
    }));

    expect(result.statusCode).toBe(200);
  });
});

// =============================================================================
// CORS HEADERS ON ALL RESPONSES
// =============================================================================

describe('CORS headers on all responses', () => {
  it('includes Access-Control-Allow-Origin on success responses', async () => {
    mockDdbSend.mockResolvedValueOnce({ Count: 0 });

    const result = await handler(makeEvent({
      body: postBody('forgot-password', { email: 'x@y.com' }),
    }));

    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  it('includes Access-Control-Allow-Origin on error responses', async () => {
    const result = await handler(makeEvent({
      body: postBody('unknown-action'),
    }));

    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});
