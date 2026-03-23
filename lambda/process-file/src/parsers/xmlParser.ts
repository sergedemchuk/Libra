import { XMLParser } from 'fast-xml-parser';
import { NormalizedRow } from '../types';

export async function parseXmlDocument(fileData: Buffer): Promise<NormalizedRow[]> {
  const xmlData = fileData.toString('utf-8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
  });

  const parsed = parser.parse(xmlData);

  // Example only — this depends on your XML structure
  const rows = parsed?.rows?.row;

  if (!rows) {
    throw new Error('XML format not recognized');
  }

  const rowArray = Array.isArray(rows) ? rows : [rows];

  return rowArray.map((row: Record<string, unknown>) => ({
    ...row,
    isbn: String(row.isbn ?? row.ISBN ?? ''),
    basePrice: String(row.basePrice ?? ''),
  }));
}