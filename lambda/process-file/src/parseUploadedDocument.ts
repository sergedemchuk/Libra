import { parseCsvDocument } from './parsers/csvParser';
import { parseXlsxDocument } from './parsers/xlsxParser';
import { parseXmlDocument } from './parsers/xmlParser';
import { NormalizedRow, SupportedFileType } from '../src/types';

function detectFileType(fileName: string): SupportedFileType {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.xlsx')) return 'xlsx';
  if (lower.endsWith('.xml')) return 'xml';

  throw new Error('Unsupported file type for file: ${fileName}');
}

export async function parseUploadedDocument(
  fileData: Buffer,
  fileName: string
): Promise<NormalizedRow[]> {
  const fileType = detectFileType(fileName);

  switch (fileType) {
    case 'csv':
      return parseCsvDocument(fileData);
    case 'xlsx':
      return parseXlsxDocument(fileData);
    case 'xml':
      return parseXmlDocument(fileData);
    default:
      throw new Error('Unsupported file type: ${fileType}');
  }
}