/**
 * Unit tests for the frontend API client (src/api/client.ts)
 *
 * Covers: createAccount, deleteAccount, loginAccount, changePassword,
 * listAccounts, initiateUpload, getJobStatus.
 * All HTTP calls are intercepted via a global fetch mock — no real network.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAccount,
  deleteAccount,
  loginAccount,
  changePassword,
  listAccounts,
  initiateUpload,
  getJobStatus,
} from '../api/client';

// ─── Setup ────────────────────────────────────────────────────────────────────

// Vitest provides a global fetch mock via jsdom; we replace it with vi.fn()
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Point the API client at a test base URL
vi.stubEnv('VITE_API_URL', 'http://test-api.local');

function mockOkResponse(body: unknown, status = 200): Response {
  return {
    ok: true,
    status,
    json: async () => body,
  } as unknown as Response;
}

function mockErrorResponse(body: unknown, status: number): Response {
  return {
    ok: false,
    status,
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// createAccount
// =============================================================================

describe('createAccount()', () => {
  it('makes a POST request to /accounts', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ userId: 'u1', email: 'a@b.com', dateCreated: 'x', lastLogin: 'x' })
    );

    await createAccount('a@b.com', 'password123');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/accounts'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sends email, password, and role in the JSON request body', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ userId: 'u1', email: 'a@b.com', dateCreated: 'x', lastLogin: 'x' })
    );

    await createAccount('a@b.com', 'mypassword');

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ email: 'a@b.com', password: 'mypassword', role: 'user' });
  });

  it('sets Content-Type: application/json header', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ userId: 'u1', email: 'a@b.com', dateCreated: 'x', lastLogin: 'x' })
    );

    await createAccount('a@b.com', 'password123');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers?.['Content-Type']).toBe('application/json');
  });

  it('returns the Account object from the response', async () => {
    const account = { userId: 'u1', email: 'a@b.com', dateCreated: '2024-01-01', lastLogin: '2024-01-01' };
    mockFetch.mockResolvedValueOnce(mockOkResponse(account));

    const result = await createAccount('a@b.com', 'password123');
    expect(result).toEqual(account);
  });

  it('throws an error with the server error message when the response is not ok', async () => {
    mockFetch.mockResolvedValueOnce(
      mockErrorResponse({ error: 'An account with that email already exists' }, 400)
    );

    await expect(createAccount('taken@example.com', 'password123')).rejects.toThrow(
      'An account with that email already exists'
    );
  });

  it('throws a fallback error message when the server error body is empty', async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse({}, 500));

    await expect(createAccount('a@b.com', 'password123')).rejects.toThrow(
      'Failed to create account (500)'
    );
  });
});

// =============================================================================
// deleteAccount
// =============================================================================

describe('deleteAccount()', () => {
  it('makes a DELETE request to /accounts/{userId}', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ message: 'Account deleted' }));

    await deleteAccount('user-123');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/user-123'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('resolves without a return value on success', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ message: 'Account deleted' }));

    const result = await deleteAccount('user-123');
    expect(result).toBeUndefined();
  });

  it('includes the userId in the URL path', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ message: 'Account deleted' }));

    await deleteAccount('my-special-user-id');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('my-special-user-id');
  });

  it('throws an error with the server error message when deletion fails', async () => {
    mockFetch.mockResolvedValueOnce(
      mockErrorResponse({ error: 'This account cannot be deleted' }, 400)
    );

    await expect(deleteAccount('protected-id')).rejects.toThrow(
      'This account cannot be deleted'
    );
  });

  it('throws a fallback error message when the server returns 404', async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse({ error: 'Account not found' }, 404));

    await expect(deleteAccount('ghost-id')).rejects.toThrow('Account not found');
  });
});

// =============================================================================
// loginAccount
// =============================================================================

describe('loginAccount()', () => {
  it('makes a POST request to /accounts/login', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ userId: 'u1', email: 'a@b.com', dateCreated: 'x', lastLogin: 'x' })
    );

    await loginAccount('a@b.com', 'password123');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/login'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sends email and password in the request body', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ userId: 'u1', email: 'a@b.com', dateCreated: 'x', lastLogin: 'x' })
    );

    await loginAccount('a@b.com', 'mypassword');

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ email: 'a@b.com', password: 'mypassword' });
  });

  it('returns the Account object on successful login', async () => {
    const account = { userId: 'u1', email: 'a@b.com', dateCreated: '2024-01-01', lastLogin: '2024-06-01' };
    mockFetch.mockResolvedValueOnce(mockOkResponse(account));

    const result = await loginAccount('a@b.com', 'password123');
    expect(result).toEqual(account);
  });

  it('throws an error on invalid credentials (401)', async () => {
    mockFetch.mockResolvedValueOnce(
      mockErrorResponse({ error: 'Invalid email or password' }, 401)
    );

    await expect(loginAccount('wrong@example.com', 'badpass')).rejects.toThrow(
      'Invalid email or password'
    );
  });
});

// =============================================================================
// changePassword
// =============================================================================

describe('changePassword()', () => {
  it('makes a PUT request to /accounts/{userId}/password', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ message: 'Password updated' }));

    await changePassword('user-123', 'newpassword123');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/user-123/password'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('sends the new password in the request body as newPassword', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ message: 'Password updated' }));

    await changePassword('user-123', 'newsecretpassword');

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ newPassword: 'newsecretpassword' });
  });

  it('resolves without a return value on success', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ message: 'Password updated' }));

    const result = await changePassword('user-123', 'newpassword123');
    expect(result).toBeUndefined();
  });

  it('throws when the server rejects the new password', async () => {
    mockFetch.mockResolvedValueOnce(
      mockErrorResponse({ error: 'newPassword must be at least 8 characters' }, 400)
    );

    await expect(changePassword('user-123', 'short')).rejects.toThrow(
      'newPassword must be at least 8 characters'
    );
  });
});

// =============================================================================
// listAccounts
// =============================================================================

describe('listAccounts()', () => {
  it('makes a GET request to /accounts', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ accounts: [] }));

    await listAccounts();

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/accounts'));
    const [, options] = mockFetch.mock.calls[0];
    expect(options?.method ?? 'GET').toBe('GET');
  });

  it('returns the accounts array from the response', async () => {
    const accounts = [
      { userId: 'u1', email: 'a@b.com', dateCreated: 'x', lastLogin: 'x' },
      { userId: 'u2', email: 'c@d.com', dateCreated: 'x', lastLogin: 'x' },
    ];
    mockFetch.mockResolvedValueOnce(mockOkResponse({ accounts }));

    const result = await listAccounts();
    expect(result).toEqual(accounts);
  });

  it('returns an empty array when no accounts exist', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ accounts: [] }));

    const result = await listAccounts();
    expect(result).toEqual([]);
  });

  it('throws on server error', async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse({ error: 'Unauthorized' }, 403));

    await expect(listAccounts()).rejects.toThrow();
  });
});

// =============================================================================
// initiateUpload
// =============================================================================

describe('initiateUpload()', () => {
  it('makes a POST request to /upload', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ jobId: 'j1', uploadUrl: 'https://s3.example.com/url', expires: 'x' })
    );

    await initiateUpload({ fileName: 'books.csv', fileSize: 1024, settings: { priceRounding: false } });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/upload'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sends fileName, fileSize, and settings in the request body', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ jobId: 'j1', uploadUrl: 'https://s3.example.com/url', expires: 'x' })
    );

    const req = { fileName: 'catalog.xlsx', fileSize: 2048, settings: { priceRounding: true, priceAdjustment: 5 } };
    await initiateUpload(req);

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual(req);
  });

  it('returns jobId, uploadUrl, and expires on success', async () => {
    const response = { jobId: 'job-uuid', uploadUrl: 'https://s3.example.com/put-url', expires: '2024-01-01T00:15:00.000Z' };
    mockFetch.mockResolvedValueOnce(mockOkResponse(response));

    const result = await initiateUpload({ fileName: 'f.csv', fileSize: 100, settings: { priceRounding: false } });
    expect(result).toEqual(response);
  });

  it('throws when the server rejects the upload request', async () => {
    mockFetch.mockResolvedValueOnce(
      mockErrorResponse({ error: 'File size exceeds 50MB limit' }, 400)
    );

    await expect(
      initiateUpload({ fileName: 'huge.csv', fileSize: 999999999, settings: { priceRounding: false } })
    ).rejects.toThrow('File size exceeds 50MB limit');
  });
});

// =============================================================================
// getJobStatus
// =============================================================================

describe('getJobStatus()', () => {
  it('makes a GET request to /status/{jobId}', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ jobId: 'j1', status: 'PENDING', fileName: 'f.csv' })
    );

    await getJobStatus('j1');

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/status/j1'));
  });

  it('returns the job status response object', async () => {
    const jobStatus = { jobId: 'j1', status: 'PROCESSING', fileName: 'f.csv', progress: { total: 100, processed: 50 } };
    mockFetch.mockResolvedValueOnce(mockOkResponse(jobStatus));

    const result = await getJobStatus('j1');
    expect(result).toEqual(jobStatus);
  });

  it('throws when the job is not found (404)', async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse({ error: 'Job not found' }, 404));

    await expect(getJobStatus('nonexistent')).rejects.toThrow('Job not found');
  });
});