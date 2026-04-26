/**
 * Unit tests for parseUploadedDocument
 *
 * Covers: file type detection (.csv, .xlsx, .xml),
 * unsupported file types, case sensitivity, and parser dispatch.
 * Parser implementations are mocked — only routing logic is tested.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockParseCsv = jest.fn().mockResolvedValue([{ isbn: '1234567890', basePrice: '10.00' }]);
const mockParseXlsx = jest.fn().mockResolvedValue([{ isbn: '1234567890', basePrice: '20.00' }]);
const mockParseXml = jest.fn().mockResolvedValue([{ isbn: '1234567890', basePrice: '30.00' }]);

jest.mock('../parsers/csvParser', () => ({
  parseCsvDocument: mockParseCsv,
}));

jest.mock('../parsers/xlsxParser', () => ({
  parseXlsxDocument: mockParseXlsx,
}));

jest.mock('../parsers/xmlParser', () => ({
  parseXmlDocument: mockParseXml,
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { parseUploadedDocument } from '../parseUploadedDocument';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

const DUMMY_BUFFER = Buffer.from('dummy file content');

// =============================================================================
// FILE TYPE DETECTION
// =============================================================================

describe('File type detection', () => {
  it('detects .csv files and dispatches to the CSV parser', async () => {
    await parseUploadedDocument(DUMMY_BUFFER, 'catalog.csv');
    expect(mockParseCsv).toHaveBeenCalledWith(DUMMY_BUFFER);
    expect(mockParseXlsx).not.toHaveBeenCalled();
    expect(mockParseXml).not.toHaveBeenCalled();
  });

  it('detects .xlsx files and dispatches to the XLSX parser', async () => {
    await parseUploadedDocument(DUMMY_BUFFER, 'catalog.xlsx');
    expect(mockParseXlsx).toHaveBeenCalledWith(DUMMY_BUFFER);
    expect(mockParseCsv).not.toHaveBeenCalled();
    expect(mockParseXml).not.toHaveBeenCalled();
  });

  it('detects .xml files and dispatches to the XML parser', async () => {
    await parseUploadedDocument(DUMMY_BUFFER, 'catalog.xml');
    expect(mockParseXml).toHaveBeenCalledWith(DUMMY_BUFFER);
    expect(mockParseCsv).not.toHaveBeenCalled();
    expect(mockParseXlsx).not.toHaveBeenCalled();
  });

  it('handles uppercase extensions (case-insensitive detection)', async () => {
    await parseUploadedDocument(DUMMY_BUFFER, 'DATA.CSV');
    expect(mockParseCsv).toHaveBeenCalledWith(DUMMY_BUFFER);
  });

  it('handles mixed-case extensions', async () => {
    await parseUploadedDocument(DUMMY_BUFFER, 'report.Xlsx');
    expect(mockParseXlsx).toHaveBeenCalledWith(DUMMY_BUFFER);
  });
});

// =============================================================================
// UNSUPPORTED FILE TYPES
// =============================================================================

describe('Unsupported file types', () => {
  it('throws for .pdf files', async () => {
    await expect(parseUploadedDocument(DUMMY_BUFFER, 'report.pdf'))
      .rejects.toThrow(/Unsupported file type/);
  });

  it('throws for .json files', async () => {
    await expect(parseUploadedDocument(DUMMY_BUFFER, 'data.json'))
      .rejects.toThrow(/Unsupported file type/);
  });

  it('throws for .txt files', async () => {
    await expect(parseUploadedDocument(DUMMY_BUFFER, 'notes.txt'))
      .rejects.toThrow(/Unsupported file type/);
  });

  it('throws for files with no extension', async () => {
    await expect(parseUploadedDocument(DUMMY_BUFFER, 'datafile'))
      .rejects.toThrow(/Unsupported file type/);
  });

  it('includes the filename in the error message', async () => {
    await expect(parseUploadedDocument(DUMMY_BUFFER, 'report.pdf'))
      .rejects.toThrow('report.pdf');
  });
});

// =============================================================================
// RETURN VALUES
// =============================================================================

describe('Return values', () => {
  it('returns the parsed rows from the CSV parser', async () => {
    const result = await parseUploadedDocument(DUMMY_BUFFER, 'data.csv');
    expect(result).toEqual([{ isbn: '1234567890', basePrice: '10.00' }]);
  });

  it('returns the parsed rows from the XLSX parser', async () => {
    const result = await parseUploadedDocument(DUMMY_BUFFER, 'data.xlsx');
    expect(result).toEqual([{ isbn: '1234567890', basePrice: '20.00' }]);
  });

  it('returns the parsed rows from the XML parser', async () => {
    const result = await parseUploadedDocument(DUMMY_BUFFER, 'data.xml');
    expect(result).toEqual([{ isbn: '1234567890', basePrice: '30.00' }]);
  });
});

// =============================================================================
// PATH-LIKE FILE NAMES
// =============================================================================

describe('File names with paths', () => {
  it('detects the extension even when the fileName includes a path', async () => {
    await parseUploadedDocument(DUMMY_BUFFER, 'uploads/job-123/catalog.csv');
    expect(mockParseCsv).toHaveBeenCalledWith(DUMMY_BUFFER);
  });

  it('detects .xlsx from a full S3 key path', async () => {
    await parseUploadedDocument(DUMMY_BUFFER, 'uploads/abc/data.xlsx');
    expect(mockParseXlsx).toHaveBeenCalledWith(DUMMY_BUFFER);
  });
});
