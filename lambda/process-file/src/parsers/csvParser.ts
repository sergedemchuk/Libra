import csv from 'csv-parse';

export type CSVRow = Record<string, string>;

async function parseCSV(csvData: string): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    csv.parse(
      csvData,
      {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      },
      (err, records) => {
        if (err) reject(err);
        else resolve(records);
      }
    );
  });
}

import { NormalizedRow } from '../types';

export async function parseCsvDocument(fileData: Buffer): Promise<NormalizedRow[]> {
  const csvData = fileData.toString('utf-8');
  const records = await parseCSV(csvData);

  return records.map((row) => ({
    ...row,
    isbn: row.isbn ?? row.ISBN ?? '',
    basePrice: row.basePrice ?? row['Base Price'] ?? '',
  }));
}