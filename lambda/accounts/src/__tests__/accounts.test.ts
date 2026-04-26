/**
 * Unit tests for the Accounts Lambda handler
 *
 * Covers every way an account can be CREATED or DELETED from the web app,
 * verifying the correct DynamoDB commands are issued without hitting a real database.
 * Also covers: login, list accounts, change password, CORS, and routing.
 */

import { APIGatewayProxyEvent } from 'aws-lambda';

// ─── Mocks (must be declared before imports that trigger module load) ──────────

// Variables prefixed with 'mock' are hoisted alongside jest.mock calls
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutItemCommand: jest.fn().mockImplementation((input) => ({ _cmd: 'PutItem', ...input })),
  GetItemCommand: jest.fn().mockImplementation((input) => ({ _cmd: 'GetItem', ...input })),
  DeleteItemCommand: jest.fn().mockImplementation((input) => ({ _cmd: 'DeleteItem', ...input })),
  QueryCommand: jest.fn().mockImplementation((input) => ({ _cmd: 'Query', ...input })),
  ScanCommand: jest.fn().mockImplementation((input) => ({ _cmd: 'Scan', ...input })),
}));

// marshall/unmarshall are pass-through so we can use plain objects in assertions
jest.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: jest.fn((obj: unknown) => obj),
  unmarshall: jest.fn((obj: unknown) => obj),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashed_password'),
  compare: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-abcd-1234'),
}));

// ─── Imports (after mocks) ─────────────────────────────────────────────────────

import { handler } from '../index';
import {
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import * as bcrypt from 'bcryptjs';

// ─── Test helpers ──────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/accounts',
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

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env.USER_ACCOUNTS_TABLE = 'test-user-accounts';
});

// =============================================================================
// CORS PREFLIGHT
// =============================================================================

describe('CORS preflight — OPTIONS', () => {
  it('returns 200 for OPTIONS requests', async () => {
    const result = await handler(makeEvent({ httpMethod: 'OPTIONS' }));
    expect(result.statusCode).toBe(200);
  });

  it('includes Access-Control-Allow-Origin: * on OPTIONS response', async () => {
    const result = await handler(makeEvent({ httpMethod: 'OPTIONS' }));
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  it('includes CORS headers on every non-OPTIONS response', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    const result = await handler(makeEvent({ httpMethod: 'GET', path: '/accounts' }));
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(result.headers?.['Access-Control-Allow-Methods']).toContain('POST');
  });
});

// =============================================================================
// ACCOUNT CREATION — POST /accounts
// All ways a user account can be created from the web app
// =============================================================================

describe('POST /accounts — account creation', () => {

  // ── Input validation ─────────────────────────────────────────────────────

  it('returns 400 when request body is absent', async () => {
    const result = await handler(makeEvent({ httpMethod: 'POST', path: '/accounts' }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Request body required');
  });

  it('returns 400 when email field is missing', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ password: 'password123' }),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('email is required');
  });

  it('returns 400 when email is a non-string value (number)', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 42, password: 'password123' }),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('email is required');
  });

  it('returns 400 when email is null', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: null, password: 'password123' }),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('email is required');
  });

  it('returns 400 when password field is missing', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'user@example.com' }),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('password is required');
  });

  it('returns 400 when password is a non-string value (number)', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'user@example.com', password: 12345678 }),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('password is required');
  });

  it('returns 400 when password is 7 characters (one below minimum)', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'user@example.com', password: '1234567' }),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('password must be at least 8 characters');
  });

  it('returns 400 when password is 1 character', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'user@example.com', password: 'x' }),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('password must be at least 8 characters');
  });

  it('returns 400 when the email address is already registered', async () => {
    // queryByEmail returns an existing account
    mockSend.mockResolvedValueOnce({
      Items: [{ userId: 'existing-id', email: 'user@example.com' }],
    });
    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'user@example.com', password: 'password123' }),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('An account with that email already exists');
  });

  // ── Database operations on successful creation ───────────────────────────

  it('queries the email-index GSI to check for duplicate emails before inserting', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] }); // no existing account
    mockSend.mockResolvedValueOnce({});            // PutItem succeeds

    await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'new@example.com', password: 'password123' }),
    }));

    expect(QueryCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'test-user-accounts',
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        Limit: 1,
      })
    );
  });

  it('stores the email as lowercase and trimmed in the GSI query', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: '  NEW@EXAMPLE.COM  ', password: 'password123' }),
    }));

    expect(QueryCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ExpressionAttributeValues: expect.objectContaining({
          ':email': 'new@example.com',
        }),
      })
    );
  });

  it('hashes the password with bcryptjs (10 salt rounds) before storing', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'new@example.com', password: 'mysecretpassword' }),
    }));

    expect(bcrypt.hash).toHaveBeenCalledWith('mysecretpassword', 10);
  });

  it('issues a PutItemCommand to the correct DynamoDB table', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'new@example.com', password: 'password123' }),
    }));

    expect(PutItemCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'test-user-accounts',
      })
    );
  });

  it('uses ConditionExpression attribute_not_exists(userId) to prevent duplicate keys', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'new@example.com', password: 'password123' }),
    }));

    expect(PutItemCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ConditionExpression: 'attribute_not_exists(userId)',
      })
    );
  });

  it('stores email as lowercase and trimmed in the new account record', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: '  UPPER@EXAMPLE.COM  ', password: 'password123' }),
    }));

    // The Item passed to PutItemCommand should have lowercased/trimmed email
    const putCall = (PutItemCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(putCall.Item.email).toBe('upper@example.com');
  });

  it('stores the hashed password (not plain text) in the account record', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'new@example.com', password: 'password123' }),
    }));

    const putCall = (PutItemCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(putCall.Item.passwordHash).toBe('$2a$10$hashed_password');
    expect(putCall.Item.passwordHash).not.toBe('password123');
  });

  // ── Successful response ──────────────────────────────────────────────────

  it('returns HTTP 201 on successful account creation', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'new@example.com', password: 'password123' }),
    }));

    expect(result.statusCode).toBe(201);
  });

  it('returns the new userId, email, and dateCreated in the 201 response', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'new@example.com', password: 'password123' }),
    }));

    const body = JSON.parse(result.body);
    expect(body.userId).toBe('test-uuid-abcd-1234');
    expect(body.email).toBe('new@example.com');
    expect(body.dateCreated).toBeDefined();
  });

  it('accepts a password that is exactly 8 characters (boundary condition)', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'new@example.com', password: '12345678' }),
    }));

    expect(result.statusCode).toBe(201);
  });

  it('does NOT call PutItemCommand when duplicate email is detected', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [{ userId: 'existing', email: 'user@example.com' }],
    });

    await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'user@example.com', password: 'password123' }),
    }));

    expect(PutItemCommand).not.toHaveBeenCalled();
  });

  it('returns 500 when DynamoDB throws during PutItem', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockRejectedValueOnce(new Error('DynamoDB connection refused'));

    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'new@example.com', password: 'password123' }),
    }));

    expect(result.statusCode).toBe(500);
  });
});

// =============================================================================
// ACCOUNT DELETION — DELETE /accounts/{userId}
// All ways an account can be deleted from the web app
// =============================================================================

describe('DELETE /accounts/{userId} — account deletion', () => {

  const userId = 'delete-target-user-id';

  // ── Input / routing validation ───────────────────────────────────────────

  it('returns 400 when userId path parameter is absent (no matching route)', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'DELETE',
      path: '/accounts',
      pathParameters: null,
    }));
    expect(result.statusCode).toBe(400);
  });

  // ── Database lookup before deletion ──────────────────────────────────────

  it('fetches the account via GetItemCommand before attempting deletion', async () => {
    mockSend.mockResolvedValueOnce({ Item: { userId, email: 'user@example.com' } });
    mockSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      httpMethod: 'DELETE',
      path: `/accounts/${userId}`,
      pathParameters: { userId },
    }));

    expect(GetItemCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'test-user-accounts',
        Key: expect.objectContaining({ userId }),
      })
    );
  });

  it('returns 404 when the account does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    const result = await handler(makeEvent({
      httpMethod: 'DELETE',
      path: `/accounts/${userId}`,
      pathParameters: { userId },
    }));

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toBe('Account not found');
  });

  it('returns 404 with no Item in the DynamoDB response (empty object case)', async () => {
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      httpMethod: 'DELETE',
      path: `/accounts/${userId}`,
      pathParameters: { userId },
    }));

    expect(result.statusCode).toBe(404);
  });

  // ── Protected account guard ───────────────────────────────────────────────

  it('returns 400 when trying to delete the protected libradev.admin@gmail.com account', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { userId: 'protected-id', email: 'libradev.admin@gmail.com' },
    });

    const result = await handler(makeEvent({
      httpMethod: 'DELETE',
      path: '/accounts/protected-id',
      pathParameters: { userId: 'protected-id' },
    }));

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('This account cannot be deleted');
  });

  it('does NOT call DeleteItemCommand for the protected account', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { userId: 'protected-id', email: 'libradev.admin@gmail.com' },
    });

    await handler(makeEvent({
      httpMethod: 'DELETE',
      path: '/accounts/protected-id',
      pathParameters: { userId: 'protected-id' },
    }));

    expect(DeleteItemCommand).not.toHaveBeenCalled();
  });

  // ── Successful deletion database operation ───────────────────────────────

  it('calls DeleteItemCommand with the correct table and userId key', async () => {
    mockSend.mockResolvedValueOnce({ Item: { userId, email: 'deleteme@example.com' } });
    mockSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      httpMethod: 'DELETE',
      path: `/accounts/${userId}`,
      pathParameters: { userId },
    }));

    expect(DeleteItemCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'test-user-accounts',
        Key: expect.objectContaining({ userId }),
      })
    );
  });

  it('calls DynamoDB send() exactly twice: GetItem then DeleteItem', async () => {
    mockSend.mockResolvedValueOnce({ Item: { userId, email: 'deleteme@example.com' } });
    mockSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      httpMethod: 'DELETE',
      path: `/accounts/${userId}`,
      pathParameters: { userId },
    }));

    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('returns 200 with a confirmation message after successful deletion', async () => {
    mockSend.mockResolvedValueOnce({ Item: { userId, email: 'deleteme@example.com' } });
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      httpMethod: 'DELETE',
      path: `/accounts/${userId}`,
      pathParameters: { userId },
    }));

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Account deleted');
  });

  it('returns 500 when DynamoDB throws during DeleteItem', async () => {
    mockSend.mockResolvedValueOnce({ Item: { userId, email: 'deleteme@example.com' } });
    mockSend.mockRejectedValueOnce(new Error('DynamoDB timeout'));

    const result = await handler(makeEvent({
      httpMethod: 'DELETE',
      path: `/accounts/${userId}`,
      pathParameters: { userId },
    }));

    expect(result.statusCode).toBe(500);
  });

  it('can delete any non-protected email address', async () => {
    const emails = ['a@example.com', 'admin@company.org', 'test.user+tag@sub.domain.io'];

    for (const email of emails) {
      jest.clearAllMocks();
      mockSend.mockResolvedValueOnce({ Item: { userId, email } });
      mockSend.mockResolvedValueOnce({});

      const result = await handler(makeEvent({
        httpMethod: 'DELETE',
        path: `/accounts/${userId}`,
        pathParameters: { userId },
      }));

      expect(result.statusCode).toBe(200);
      expect(DeleteItemCommand).toHaveBeenCalled();
    }
  });
});

// =============================================================================
// LOGIN — POST /accounts/login
// =============================================================================

describe('POST /accounts/login', () => {

  it('returns 400 when request body is absent', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts/login',
    }));
    expect(result.statusCode).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts/login',
      body: JSON.stringify({ password: 'password123' }),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('email and password are required');
  });

  it('returns 400 when password is missing', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts/login',
      body: JSON.stringify({ email: 'user@example.com' }),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('email and password are required');
  });

  it('returns 401 when the email does not exist in the database', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts/login',
      body: JSON.stringify({ email: 'noone@example.com', password: 'password123' }),
    }));

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toBe('Invalid email or password');
  });

  it('returns 401 when password does not match the stored hash', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [{ userId: 'u1', email: 'user@example.com', passwordHash: 'stored_hash' }],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts/login',
      body: JSON.stringify({ email: 'user@example.com', password: 'wrongpassword' }),
    }));

    expect(result.statusCode).toBe(401);
    // Same message for both cases prevents user enumeration
    expect(JSON.parse(result.body).error).toBe('Invalid email or password');
  });

  it('updates lastLogin timestamp via PutItemCommand on successful login', async () => {
    const existingUser = {
      userId: 'u1',
      email: 'user@example.com',
      passwordHash: 'stored_hash',
      dateCreated: '2024-01-01T00:00:00.000Z',
      lastLogin: '2024-01-01T00:00:00.000Z',
    };
    mockSend.mockResolvedValueOnce({ Items: [existingUser] });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts/login',
      body: JSON.stringify({ email: 'user@example.com', password: 'correctpassword' }),
    }));

    expect(result.statusCode).toBe(200);
    expect(PutItemCommand).toHaveBeenCalledWith(
      expect.objectContaining({ TableName: 'test-user-accounts' })
    );
  });

  it('returns user data without passwordHash on successful login', async () => {
    const existingUser = {
      userId: 'u1',
      email: 'user@example.com',
      passwordHash: 'stored_hash',
      dateCreated: '2024-01-01T00:00:00.000Z',
      lastLogin: '2024-01-01T00:00:00.000Z',
    };
    mockSend.mockResolvedValueOnce({ Items: [existingUser] });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts/login',
      body: JSON.stringify({ email: 'user@example.com', password: 'correctpassword' }),
    }));

    const body = JSON.parse(result.body);
    expect(body.userId).toBe('u1');
    expect(body.email).toBe('user@example.com');
    expect(body.passwordHash).toBeUndefined();
  });

  it('uses bcrypt.compare to validate the password against the stored hash', async () => {
    const existingUser = {
      userId: 'u1',
      email: 'user@example.com',
      passwordHash: 'stored_hash',
    };
    mockSend.mockResolvedValueOnce({ Items: [existingUser] });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    mockSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts/login',
      body: JSON.stringify({ email: 'user@example.com', password: 'correctpassword' }),
    }));

    expect(bcrypt.compare).toHaveBeenCalledWith('correctpassword', 'stored_hash');
  });
});

// =============================================================================
// LIST ACCOUNTS — GET /accounts
// =============================================================================

describe('GET /accounts — list all accounts', () => {

  it('issues a ScanCommand to the correct table with projection', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    await handler(makeEvent({ httpMethod: 'GET', path: '/accounts' }));

    expect(ScanCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'test-user-accounts',
        ProjectionExpression: 'userId, email, dateCreated, lastLogin, #r',
        ExpressionAttributeNames: { '#r': 'role' },
      })
    );
  });

  it('returns 200 with an empty accounts array when no accounts exist', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    const result = await handler(makeEvent({ httpMethod: 'GET', path: '/accounts' }));

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).accounts).toEqual([]);
  });

  it('returns all accounts when Items are present in DynamoDB response', async () => {
    const items = [
      { userId: 'id-1', email: 'a@example.com', dateCreated: '2024-01-01', lastLogin: '2024-01-02' },
      { userId: 'id-2', email: 'b@example.com', dateCreated: '2024-02-01', lastLogin: '2024-02-02' },
    ];
    mockSend.mockResolvedValueOnce({ Items: items });

    const result = await handler(makeEvent({ httpMethod: 'GET', path: '/accounts' }));

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).accounts).toHaveLength(2);
  });

  it('returns empty array when DynamoDB response has no Items property', async () => {
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({ httpMethod: 'GET', path: '/accounts' }));

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).accounts).toEqual([]);
  });

  it('does not expose passwordHash in the scan projection', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    await handler(makeEvent({ httpMethod: 'GET', path: '/accounts' }));

    const scanCall = (ScanCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(scanCall.ProjectionExpression).not.toContain('passwordHash');
  });
});

// =============================================================================
// CHANGE PASSWORD — PUT /accounts/{userId}/password
// =============================================================================

describe('PUT /accounts/{userId}/password — change password', () => {

  const userId = 'user-to-update';

  it('returns 400 when request body is absent', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'PUT',
      path: `/accounts/${userId}/password`,
      pathParameters: { userId },
    }));
    expect(result.statusCode).toBe(400);
  });

  it('returns 400 when newPassword field is missing', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'PUT',
      path: `/accounts/${userId}/password`,
      pathParameters: { userId },
      body: JSON.stringify({}),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('newPassword is required');
  });

  it('returns 400 when newPassword is not a string', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'PUT',
      path: `/accounts/${userId}/password`,
      pathParameters: { userId },
      body: JSON.stringify({ newPassword: 99999999 }),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('newPassword is required');
  });

  it('returns 400 when newPassword is shorter than 8 characters', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'PUT',
      path: `/accounts/${userId}/password`,
      pathParameters: { userId },
      body: JSON.stringify({ newPassword: 'short' }),
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('newPassword must be at least 8 characters');
  });

  it('returns 404 when the target account does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    const result = await handler(makeEvent({
      httpMethod: 'PUT',
      path: `/accounts/${userId}/password`,
      pathParameters: { userId },
      body: JSON.stringify({ newPassword: 'newpassword123' }),
    }));

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toBe('Account not found');
  });

  it('hashes the new password with bcryptjs before storing', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { userId, email: 'user@example.com', passwordHash: 'old_hash' },
    });
    mockSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      httpMethod: 'PUT',
      path: `/accounts/${userId}/password`,
      pathParameters: { userId },
      body: JSON.stringify({ newPassword: 'newpassword123' }),
    }));

    expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
  });

  it('writes the updated user record back via PutItemCommand', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { userId, email: 'user@example.com', passwordHash: 'old_hash' },
    });
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      httpMethod: 'PUT',
      path: `/accounts/${userId}/password`,
      pathParameters: { userId },
      body: JSON.stringify({ newPassword: 'newpassword123' }),
    }));

    expect(result.statusCode).toBe(200);
    expect(PutItemCommand).toHaveBeenCalledWith(
      expect.objectContaining({ TableName: 'test-user-accounts' })
    );
    expect(JSON.parse(result.body).message).toBe('Password updated');
  });

  it('preserves all other user fields when updating the password', async () => {
    const existingUser = {
      userId,
      email: 'user@example.com',
      passwordHash: 'old_hash',
      dateCreated: '2024-01-01T00:00:00.000Z',
      lastLogin: '2024-06-01T00:00:00.000Z',
    };
    mockSend.mockResolvedValueOnce({ Item: existingUser });
    mockSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      httpMethod: 'PUT',
      path: `/accounts/${userId}/password`,
      pathParameters: { userId },
      body: JSON.stringify({ newPassword: 'newpassword123' }),
    }));

    const putCall = (PutItemCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(putCall.Item.email).toBe('user@example.com');
    expect(putCall.Item.dateCreated).toBe('2024-01-01T00:00:00.000Z');
    // New hash should replace old hash
    expect(putCall.Item.passwordHash).toBe('$2a$10$hashed_password');
  });
});

// =============================================================================
// ROLE ASSIGNMENT — account creation and login
// =============================================================================

describe('Role assignment on account creation', () => {

  it('defaults to "user" role when no role is specified', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'new@example.com', password: 'password123' }),
    }));

    const putCall = (PutItemCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(putCall.Item.role).toBe('user');
    expect(JSON.parse(result.body).role).toBe('user');
  });

  it('allows explicit "admin" role to be set on creation', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'admin@company.com', password: 'password123', role: 'admin' }),
    }));

    const putCall = (PutItemCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(putCall.Item.role).toBe('admin');
    expect(JSON.parse(result.body).role).toBe('admin');
  });

  it('forces "admin" role for the protected email libradev.admin@gmail.com', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({});

    await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'libradev.admin@gmail.com', password: 'password123' }),
    }));

    const putCall = (PutItemCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(putCall.Item.role).toBe('admin');
  });

  it('returns the role field in the 201 creation response', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts',
      body: JSON.stringify({ email: 'new@example.com', password: 'password123' }),
    }));

    expect(JSON.parse(result.body).role).toBeDefined();
  });
});

describe('Role field in login response', () => {

  it('returns the role field on successful login', async () => {
    const existingUser = {
      userId: 'u1',
      email: 'user@example.com',
      passwordHash: 'stored_hash',
      role: 'user',
      dateCreated: '2024-01-01T00:00:00.000Z',
      lastLogin: '2024-01-01T00:00:00.000Z',
    };
    mockSend.mockResolvedValueOnce({ Items: [existingUser] });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts/login',
      body: JSON.stringify({ email: 'user@example.com', password: 'correctpassword' }),
    }));

    const body = JSON.parse(result.body);
    expect(body.role).toBe('user');
  });

  it('returns "admin" role for the protected admin email even without stored role', async () => {
    const existingUser = {
      userId: 'u1',
      email: 'libradev.admin@gmail.com',
      passwordHash: 'stored_hash',
      dateCreated: '2024-01-01T00:00:00.000Z',
      lastLogin: '2024-01-01T00:00:00.000Z',
    };
    mockSend.mockResolvedValueOnce({ Items: [existingUser] });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent({
      httpMethod: 'POST',
      path: '/accounts/login',
      body: JSON.stringify({ email: 'libradev.admin@gmail.com', password: 'correctpassword' }),
    }));

    const body = JSON.parse(result.body);
    expect(body.role).toBe('admin');
  });
});

// =============================================================================
// UNKNOWN ROUTES
// =============================================================================

describe('Unknown routes', () => {
  it('returns 400 with "Route not found" for unsupported HTTP methods', async () => {
    const result = await handler(makeEvent({
      httpMethod: 'PATCH',
      path: '/accounts',
    }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Route not found');
  });
});
