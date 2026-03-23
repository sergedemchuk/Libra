import * as XLSX from 'xlsx';
import { NormalizedRow } from '../types';

export async function parseXlsxDocument(fileData: Buffer): Promise<NormalizedRow[]> {
  const workbook = XLSX.read(fileData, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('XLSX file has no sheets');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });

  return records.map((row) => ({
    ...row,
    isbn: String(row.isbn ?? row.ISBN ?? ''),
    basePrice: String(row.basePrice ?? row['Base Price'] ?? ''),
  }));
}