/**
 * Unit tests for the frontend CSV parser / serializer utility.
 *
 * Covers: basic parsing, quoted fields, embedded commas, embedded newlines,
 * escaped quotes, empty inputs, round-trip (parse → stringify → parse),
 * and edge cases.
 */

import { parseCsv, stringifyCsv } from '../utils/csvParser';

// =============================================================================
// parseCsv — BASIC PARSING
// =============================================================================

describe('parseCsv — basic parsing', () => {
  it('parses a simple CSV with headers and one row', () => {
    const result = parseCsv('name,age\nAlice,30');
    expect(result.headers).toEqual(['name', 'age']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ name: 'Alice', age: '30' });
  });

  it('parses multiple rows', () => {
    const result = parseCsv('a,b\n1,2\n3,4\n5,6');
    expect(result.rows).toHaveLength(3);
    expect(result.rows[2]).toEqual({ a: '5', b: '6' });
  });

  it('returns empty headers and rows for an empty string', () => {
    const result = parseCsv('');
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('returns headers but no rows when only the header line is present', () => {
    const result = parseCsv('col1,col2,col3');
    expect(result.headers).toEqual(['col1', 'col2', 'col3']);
    expect(result.rows).toEqual([]);
  });

  it('fills missing columns with empty strings', () => {
    const result = parseCsv('a,b,c\n1');
    expect(result.rows[0]).toEqual({ a: '1', b: '', c: '' });
  });

  it('skips blank lines', () => {
    const result = parseCsv('a,b\n1,2\n\n3,4\n');
    expect(result.rows).toHaveLength(2);
  });
});

// =============================================================================
// parseCsv — QUOTED FIELDS
// =============================================================================

describe('parseCsv — quoted fields', () => {
  it('handles fields enclosed in double quotes', () => {
    const result = parseCsv('name,title\n"Alice","Director"');
    expect(result.rows[0]).toEqual({ name: 'Alice', title: 'Director' });
  });

  it('handles embedded commas inside quoted fields', () => {
    const result = parseCsv('name,address\nAlice,"123 Main St, Apt 4"');
    expect(result.rows[0].address).toBe('123 Main St, Apt 4');
  });

  it('handles embedded newlines inside quoted fields', () => {
    const result = parseCsv('name,bio\nAlice,"Line 1\nLine 2"');
    expect(result.rows[0].bio).toBe('Line 1\nLine 2');
  });

  it('handles escaped double quotes (doubled) inside quoted fields', () => {
    const result = parseCsv('name,quote\nAlice,"She said ""hello"""');
    expect(result.rows[0].quote).toBe('She said "hello"');
  });
});

// =============================================================================
// parseCsv — CRLF HANDLING
// =============================================================================

describe('parseCsv — CRLF line endings', () => {
  it('parses Windows-style CRLF line endings', () => {
    const result = parseCsv('a,b\r\n1,2\r\n3,4');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ a: '1', b: '2' });
  });
});

// =============================================================================
// stringifyCsv — BASIC SERIALIZATION
// =============================================================================

describe('stringifyCsv — basic serialization', () => {
  it('serializes headers and rows into a CSV string', () => {
    const headers = ['name', 'age'];
    const rows = [{ name: 'Alice', age: '30' }];
    const result = stringifyCsv(headers, rows);
    expect(result).toBe('name,age\nAlice,30');
  });

  it('escapes fields that contain commas', () => {
    const headers = ['address'];
    const rows = [{ address: '123 Main, Apt 4' }];
    const result = stringifyCsv(headers, rows);
    expect(result).toContain('"123 Main, Apt 4"');
  });

  it('escapes fields that contain double quotes', () => {
    const headers = ['quote'];
    const rows = [{ quote: 'She said "hi"' }];
    const result = stringifyCsv(headers, rows);
    expect(result).toContain('"She said ""hi"""');
  });

  it('escapes fields that contain newlines', () => {
    const headers = ['bio'];
    const rows = [{ bio: 'Line 1\nLine 2' }];
    const result = stringifyCsv(headers, rows);
    expect(result).toContain('"Line 1\nLine 2"');
  });

  it('uses empty string for missing keys', () => {
    const headers = ['a', 'b'];
    const rows = [{ a: '1' } as Record<string, string>];
    const result = stringifyCsv(headers, rows);
    expect(result).toBe('a,b\n1,');
  });
});

// =============================================================================
// ROUND-TRIP — parse → stringify → parse
// =============================================================================

describe('Round-trip: parse → stringify → parse', () => {
  it('preserves data through a full round-trip', () => {
    const original = 'isbn,title,price\n"978-0-13-468599-1","Algorithms, 4th Ed","89.99"\n"978-0-596-51774-8","JavaScript: The Good Parts","29.99"';
    const parsed = parseCsv(original);
    const serialized = stringifyCsv(parsed.headers, parsed.rows);
    const reparsed = parseCsv(serialized);

    expect(reparsed.headers).toEqual(parsed.headers);
    expect(reparsed.rows).toEqual(parsed.rows);
  });
});
