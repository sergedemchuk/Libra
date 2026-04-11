/**
 * Tests for the useFileUpload hook
 *
 * Covers: state machine transitions (idle → initiating → uploading → processing → done/error),
 * polling behaviour, timeout after max attempts, error handling, and reset.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '../hooks/useFileUpload';

// ─── Mock API client ──────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  initiateUpload: vi.fn(),
  uploadFileToS3: vi.fn(),
  getJobStatus: vi.fn(),
}));

import { initiateUpload, uploadFileToS3, getJobStatus } from '../api/client';
const mockInitiateUpload = initiateUpload as ReturnType<typeof vi.fn>;
const mockUploadFileToS3 = uploadFileToS3 as ReturnType<typeof vi.fn>;
const mockGetJobStatus = getJobStatus as ReturnType<typeof vi.fn>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(name = 'catalog.csv', size = 1024): File {
  return new File(['content'], name, { type: 'text/csv' }) as File;
}

const defaultSettings = { priceRounding: false };

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// =============================================================================
// INITIAL STATE
// =============================================================================

describe('Initial state', () => {
  it('starts in the idle phase', () => {
    const { result } = renderHook(() => useFileUpload());
    expect(result.current.state.phase).toBe('idle');
  });

  it('has uploadProgress of 0 initially', () => {
    const { result } = renderHook(() => useFileUpload());
    expect(result.current.state.uploadProgress).toBe(0);
  });

  it('has no jobId initially', () => {
    const { result } = renderHook(() => useFileUpload());
    expect(result.current.state.jobId).toBeNull();
  });

  it('has no error message initially', () => {
    const { result } = renderHook(() => useFileUpload());
    expect(result.current.state.errorMessage).toBeNull();
  });
});

// =============================================================================
// STATE MACHINE TRANSITIONS
// =============================================================================

describe('State machine: idle → initiating → uploading → processing → done', () => {

  it('transitions to "initiating" immediately when start() is called', async () => {
    // Never resolves — so we can inspect the initiating state
    mockInitiateUpload.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useFileUpload());

    act(() => {
      result.current.start(makeFile(), defaultSettings);
    });

    expect(result.current.state.phase).toBe('initiating');
  });

  it('transitions to "uploading" after initiateUpload resolves', async () => {
    mockInitiateUpload.mockResolvedValueOnce({
      jobId: 'job-123',
      uploadUrl: 'https://s3.example.com/upload',
      expires: 'x',
    });
    mockUploadFileToS3.mockReturnValue(new Promise(() => {})); // stall here

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.start(makeFile(), defaultSettings);
    });

    expect(result.current.state.phase).toBe('uploading');
    expect(result.current.state.jobId).toBe('job-123');
  });

  it('transitions to "processing" after the S3 upload completes', async () => {
    mockInitiateUpload.mockResolvedValueOnce({
      jobId: 'job-123',
      uploadUrl: 'https://s3.example.com/upload',
      expires: 'x',
    });
    mockUploadFileToS3.mockResolvedValueOnce(undefined);
    mockGetJobStatus.mockReturnValue(new Promise(() => {})); // stall polling

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.start(makeFile(), defaultSettings);
    });

    expect(result.current.state.phase).toBe('processing');
    expect(result.current.state.uploadProgress).toBe(100);
  });

  it('transitions to "done" when getJobStatus returns COMPLETED', async () => {
    mockInitiateUpload.mockResolvedValueOnce({
      jobId: 'job-123',
      uploadUrl: 'https://s3.example.com/upload',
      expires: 'x',
    });
    mockUploadFileToS3.mockResolvedValueOnce(undefined);
    mockGetJobStatus.mockResolvedValueOnce({
      jobId: 'job-123',
      status: 'COMPLETED',
      fileName: 'catalog.csv',
      downloadUrl: 'https://s3.example.com/result.csv',
    });

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.start(makeFile(), defaultSettings);
    });

    expect(result.current.state.phase).toBe('done');
    expect(result.current.state.jobStatus?.status).toBe('COMPLETED');
  });

  it('transitions to "error" when getJobStatus returns FAILED', async () => {
    mockInitiateUpload.mockResolvedValueOnce({
      jobId: 'job-123',
      uploadUrl: 'https://s3.example.com/upload',
      expires: 'x',
    });
    mockUploadFileToS3.mockResolvedValueOnce(undefined);
    mockGetJobStatus.mockResolvedValueOnce({
      jobId: 'job-123',
      status: 'FAILED',
      fileName: 'catalog.csv',
      error: 'Could not parse file',
    });

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.start(makeFile(), defaultSettings);
    });

    expect(result.current.state.phase).toBe('error');
    expect(result.current.state.errorMessage).toBe('Could not parse file');
  });

  it('uses the fallback error message when FAILED status has no error field', async () => {
    mockInitiateUpload.mockResolvedValueOnce({
      jobId: 'job-123',
      uploadUrl: 'https://s3.example.com/upload',
      expires: 'x',
    });
    mockUploadFileToS3.mockResolvedValueOnce(undefined);
    mockGetJobStatus.mockResolvedValueOnce({
      jobId: 'job-123',
      status: 'FAILED',
      fileName: 'catalog.csv',
    });

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.start(makeFile(), defaultSettings);
    });

    expect(result.current.state.phase).toBe('error');
    expect(result.current.state.errorMessage).toBe('Processing failed. Please try again.');
  });
});

// =============================================================================
// POLLING CONTINUATION
// =============================================================================

describe('Polling continuation', () => {
  it('continues polling when status is PENDING, then transitions to done on COMPLETED', async () => {
    mockInitiateUpload.mockResolvedValueOnce({
      jobId: 'job-456',
      uploadUrl: 'https://s3.example.com/upload',
      expires: 'x',
    });
    mockUploadFileToS3.mockResolvedValueOnce(undefined);
    // First poll: still PENDING
    mockGetJobStatus.mockResolvedValueOnce({ jobId: 'job-456', status: 'PENDING', fileName: 'f.csv' });
    // Second poll: COMPLETED
    mockGetJobStatus.mockResolvedValueOnce({
      jobId: 'job-456',
      status: 'COMPLETED',
      fileName: 'f.csv',
      downloadUrl: 'https://s3.example.com/result',
    });

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.start(makeFile(), defaultSettings);
    });

    // Still processing after first poll
    expect(result.current.state.phase).toBe('processing');

    // Advance timer to trigger second poll (3000 ms interval)
    await act(async () => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current.state.phase).toBe('done');
  });

  it('transitions to error after exceeding MAX_POLL_ATTEMPTS (200)', async () => {
    mockInitiateUpload.mockResolvedValueOnce({
      jobId: 'job-789',
      uploadUrl: 'https://s3.example.com/upload',
      expires: 'x',
    });
    mockUploadFileToS3.mockResolvedValueOnce(undefined);

    // Every poll returns PROCESSING
    mockGetJobStatus.mockResolvedValue({
      jobId: 'job-789',
      status: 'PROCESSING',
      fileName: 'f.csv',
      progress: { total: 1000, processed: 1 },
    });

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.start(makeFile(), defaultSettings);
    });

    // Advance through 200+ poll intervals, flushing microtasks between each
    // vi.advanceTimersByTimeAsync advances time AND flushes microtask queue
    for (let i = 0; i <= 200; i++) {
      if (result.current.state.phase === 'error') break;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000);
      });
    }

    expect(result.current.state.phase).toBe('error');
    expect(result.current.state.errorMessage).toMatch(/timed out/i);
  }, 30_000); // Extended timeout for this test
});

// =============================================================================
// ERROR PATHS
// =============================================================================

describe('Error paths', () => {
  it('transitions to "error" when initiateUpload throws', async () => {
    mockInitiateUpload.mockRejectedValueOnce(new Error('File too large'));

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.start(makeFile(), defaultSettings);
    });

    expect(result.current.state.phase).toBe('error');
    expect(result.current.state.errorMessage).toBe('File too large');
  });

  it('transitions to "error" when uploadFileToS3 throws', async () => {
    mockInitiateUpload.mockResolvedValueOnce({
      jobId: 'job-err',
      uploadUrl: 'https://s3.example.com/upload',
      expires: 'x',
    });
    mockUploadFileToS3.mockRejectedValueOnce(new Error('Network error during S3 upload'));

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.start(makeFile(), defaultSettings);
    });

    expect(result.current.state.phase).toBe('error');
    expect(result.current.state.errorMessage).toBe('Network error during S3 upload');
  });

  it('transitions to "error" when getJobStatus throws during polling', async () => {
    mockInitiateUpload.mockResolvedValueOnce({
      jobId: 'job-err',
      uploadUrl: 'https://s3.example.com/upload',
      expires: 'x',
    });
    mockUploadFileToS3.mockResolvedValueOnce(undefined);
    mockGetJobStatus.mockRejectedValueOnce(new Error('Status check failed (503)'));

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.start(makeFile(), defaultSettings);
    });

    expect(result.current.state.phase).toBe('error');
    expect(result.current.state.errorMessage).toBe('Status check failed (503)');
  });
});

// =============================================================================
// RESET
// =============================================================================

describe('reset()', () => {
  it('returns to the idle phase after reset', async () => {
    mockInitiateUpload.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.start(makeFile(), defaultSettings);
    });
    expect(result.current.state.phase).toBe('error');

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.phase).toBe('idle');
  });

  it('clears jobId, jobStatus, and errorMessage after reset', async () => {
    mockInitiateUpload.mockResolvedValueOnce({
      jobId: 'job-reset',
      uploadUrl: 'https://s3.example.com/upload',
      expires: 'x',
    });
    mockUploadFileToS3.mockResolvedValueOnce(undefined);
    mockGetJobStatus.mockResolvedValueOnce({
      jobId: 'job-reset', status: 'COMPLETED', fileName: 'f.csv', downloadUrl: 'https://s3.example.com/r',
    });

    const { result } = renderHook(() => useFileUpload());
    await act(async () => { result.current.start(makeFile(), defaultSettings); });
    expect(result.current.state.phase).toBe('done');

    act(() => { result.current.reset(); });

    expect(result.current.state.jobId).toBeNull();
    expect(result.current.state.jobStatus).toBeNull();
    expect(result.current.state.errorMessage).toBeNull();
    expect(result.current.state.uploadProgress).toBe(0);
  });

  it('cancels any pending polling timer on reset', async () => {
    mockInitiateUpload.mockResolvedValueOnce({
      jobId: 'job-cancel',
      uploadUrl: 'https://s3.example.com/upload',
      expires: 'x',
    });
    mockUploadFileToS3.mockResolvedValueOnce(undefined);
    // Keep returning PROCESSING so the timer would keep firing
    mockGetJobStatus.mockResolvedValue({ jobId: 'job-cancel', status: 'PROCESSING', fileName: 'f.csv' });

    const { result } = renderHook(() => useFileUpload());
    await act(async () => { result.current.start(makeFile(), defaultSettings); });

    act(() => { result.current.reset(); });

    const callCountBeforeAdvance = mockGetJobStatus.mock.calls.length;
    await act(async () => { vi.advanceTimersByTime(10_000); });
    // Should not have polled more after reset
    expect(mockGetJobStatus.mock.calls.length).toBe(callCountBeforeAdvance);
  });
});
