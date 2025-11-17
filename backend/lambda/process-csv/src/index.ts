import { S3Event, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import * as csv from 'csv-parse';
import { stringify } from 'csv-stringify';
import { Readable } from 'stream';
import { PriceCacheItem, JobStatusItem, JobStatus, ProcessingSettings } from '../infrastructure/types';

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const secretsClient = new SecretsManagerClient({});

const PRICE_CACHE_TABLE = process.env.PRICE_CACHE_TABLE!;
const JOB_STATUS_TABLE = process.env.JOB_STATUS_TABLE!;
const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET!;
const ISBNDB_SECRET_NAME = process.env.ISBNDB_SECRET_NAME!;
const DAILY_USAGE_TABLE = process.env.DAILY_USAGE_TABLE!;

interface CSVRow {
  isbn?: string;
  title?: string;
  author?: string;
  basePrice?: string;
  [key: string]: string | undefined;
}

interface ProcessedRow extends CSVRow {
  calculatedPrice?: string;
  priceSource?: string;
  processingStatus?: string;
}

interface ISBNdbBulkResponse {
  books: Array<{
    title: string;
    title_long?: string;
    isbn: string;
    isbn13: string;
    authors?: string[];
    publisher?: string;
    language?: string;
    pages?: number;
    date_published?: string;
    subjects?: string[];
    msrp?: string;
    binding?: string;
  }>;
  total: number;
}

interface DailyUsageItem {
  date: string; // YYYY-MM-DD
  callCount: number;
  lastUpdated: string;
  ttl: number;
}

const DAILY_LIMIT = 5000; // 5,000 daily searches
const BULK_SIZE = 100; // 100 results per call
const RATE_LIMIT_DELAY = 1100; // 1.1 seconds between calls (1 call per second)

export const handler = async (event: S3Event, context: Context) => {
  console.log('Processing started:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    // Extract jobId from the file key (assumes format: uploads/{jobId}/filename.csv)
    const jobId = key.split('/')[1];
    
    try {
      await processFile(bucket, key, jobId);
    } catch (error) {
      console.error(`Error processing file ${key}:`, error);
      await updateJobStatus(jobId, JobStatus.FAILED, {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

async function processFile(bucket: string, key: string, jobId: string) {
  // Get job details and settings
  const jobStatus = await getJobStatus(jobId);
  if (!jobStatus) {
    throw new Error(`Job ${jobId} not found`);
  }

  await updateJobStatus(jobId, JobStatus.PROCESSING);

  // Get ISBNdb API key
  const apiKey = await getIsbndbApiKey();

  // Download and parse CSV
  const csvData = await downloadFile(bucket, key);
  const rows = await parseCSV(csvData);
  
  // Extract unique ISBNs for bulk processing
  const allIsbns = rows
    .map(row => row.isbn?.replace(/[-\s]/g, ''))
    .filter((isbn): isbn is string => !!isbn && isbn.length >= 10);
  
  const uniqueIsbns = [...new Set(allIsbns)];
  
  await updateJobStatus(jobId, JobStatus.PROCESSING, {
    totalRows: rows.length
  });

  console.log(`Processing ${rows.length} rows with ${uniqueIsbns.length} unique ISBNs`);

  // Check daily usage limit
  const today = new Date().toISOString().split('T')[0];
  const dailyUsage = await getDailyUsage(today);
  const estimatedCalls = Math.ceil(uniqueIsbns.length / BULK_SIZE);
  
  if (dailyUsage.callCount + estimatedCalls > DAILY_LIMIT) {
    throw new Error(`Daily API limit would be exceeded. Current usage: ${dailyUsage.callCount}, Estimated additional calls: ${estimatedCalls}, Daily limit: ${DAILY_LIMIT}`);
  }

  // Build price lookup map using bulk API
  const priceMap = new Map<string, number>();
  await buildPriceMap(uniqueIsbns, priceMap, apiKey, today);

  // Process each row using the price map
  const processedRows: ProcessedRow[] = [];
  let processedCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    try {
      const processedRow = await processRow(row, jobStatus.settings, priceMap);
      processedRows.push(processedRow);
      processedCount++;

      // Update progress every 50 rows
      if (processedCount % 50 === 0) {
        await updateJobStatus(jobId, JobStatus.PROCESSING, {
          processedRows: processedCount,
          errorCount: errorCount
        });
      }
    } catch (error) {
      console.error(`Error processing row:`, error);
      errorCount++;
      processedRows.push({
        ...row,
        processingStatus: 'error',
        calculatedPrice: row.basePrice || '',
        priceSource: 'original'
      });
    }
  }

  // Generate output CSV
  const outputCsv = await generateCSV(processedRows);
  const outputKey = `processed/${jobId}/${jobStatus.fileName}`;
  
  // Upload processed file
  await uploadFile(OUTPUT_BUCKET, outputKey, outputCsv);

  // Update job as completed
  await updateJobStatus(jobId, JobStatus.COMPLETED, {
    processedRows: processedCount,
    errorCount: errorCount,
    outputFileKey: outputKey
  });

  console.log(`Processing completed for job ${jobId}: ${processedCount} rows processed, ${errorCount} errors`);
}

async function buildPriceMap(isbns: string[], priceMap: Map<string, number>, apiKey: string, date: string) {
  console.log(`Building price map for ${isbns.length} ISBNs using bulk API`);

  // First, check cache for all ISBNs
  const uncachedIsbns: string[] = [];
  
  for (const isbn of isbns) {
    const cachedPrice = await getPriceFromCache(isbn);
    if (cachedPrice) {
      priceMap.set(isbn, cachedPrice);
    } else {
      uncachedIsbns.push(isbn);
    }
  }

  console.log(`Found ${isbns.length - uncachedIsbns.length} prices in cache, need to fetch ${uncachedIsbns.length}`);

  if (uncachedIsbns.length === 0) {
    return;
  }

  // Process uncached ISBNs in batches of 100
  const batches = [];
  for (let i = 0; i < uncachedIsbns.length; i += BULK_SIZE) {
    batches.push(uncachedIsbns.slice(i, i + BULK_SIZE));
  }

  console.log(`Processing ${batches.length} batches of up to ${BULK_SIZE} ISBNs each`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    try {
      console.log(`Processing batch ${i + 1}/${batches.length} with ${batch.length} ISBNs`);
      
      const booksData = await fetchBulkDataFromISBNdb(batch, apiKey);
      await incrementDailyUsage(date);

      // Process results and cache prices
      for (const book of booksData.books) {
        const isbn = book.isbn13 || book.isbn;
        const price = extractPriceFromBook(book);
        
        if (price && isbn) {
          priceMap.set(isbn.replace(/[-\s]/g, ''), price);
          // Cache the price
          await cachePriceData(isbn, price, book.title, book.authors?.join(', '));
        }
      }

      console.log(`Processed batch ${i + 1}, found ${booksData.books.length} books`);

      // Rate limiting: wait before next call (except for last batch)
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }

    } catch (error) {
      console.error(`Error processing batch ${i + 1}:`, error);
      
      // Continue with next batch on error, don't fail entire job
      continue;
    }
  }

  console.log(`Bulk processing complete. Price map now contains ${priceMap.size} prices`);
}

async function fetchBulkDataFromISBNdb(isbns: string[], apiKey: string): Promise<ISBNdbBulkResponse> {
  const isbnList = isbns.join(',');
  
  try {
    const response = await fetch(`https://api2.isbndb.com/books/${isbnList}`, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log('Rate limit hit, waiting...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        throw new Error('Rate limit exceeded, will retry in next batch');
      }
      
      if (response.status === 404) {
        console.log('No books found for this batch');
        return { books: [], total: 0 };
      }
      
      throw new Error(`ISBNdb API error: ${response.status} ${response.statusText}`);
    }

    const data: ISBNdbBulkResponse = await response.json();
    console.log(`ISBNdb bulk API returned ${data.books.length} books out of ${isbns.length} requested`);
    
    return data;
    
  } catch (error) {
    console.error(`Error fetching bulk data from ISBNdb:`, error);
    throw error;
  }
}

function extractPriceFromBook(book: any): number | null {
  // Try to extract price from various fields
  if (book.msrp) {
    const priceStr = book.msrp.toString().replace(/[^0-9.]/g, '');
    const price = parseFloat(priceStr);
    if (!isNaN(price) && price > 0) {
      return price;
    }
  }

  // If no price found, return null
  return null;
}

async function processRow(row: CSVRow, settings: ProcessingSettings, priceMap: Map<string, number>): Promise<ProcessedRow> {
  const isbn = row.isbn?.replace(/[-\s]/g, ''); // Clean ISBN
  
  if (!isbn) {
    return {
      ...row,
      calculatedPrice: row.basePrice || '',
      priceSource: 'original',
      processingStatus: 'no_isbn'
    };
  }

  // Get price from our pre-built map
  let price = priceMap.get(isbn);
  let priceSource = price ? 'isbndb_bulk' : 'original';

  // Use base price as fallback
  if (!price && row.basePrice) {
    price = parseFloat(row.basePrice);
    priceSource = 'original';
  }

  if (!price) {
    return {
      ...row,
      calculatedPrice: row.basePrice || '',
      priceSource: 'original',
      processingStatus: 'no_price_found'
    };
  }

  // Apply settings
  let finalPrice = price;
  
  if (settings.priceAdjustment) {
    finalPrice += settings.priceAdjustment;
  }
  
  if (settings.priceRounding) {
    finalPrice = Math.ceil(finalPrice);
  }

  return {
    ...row,
    calculatedPrice: finalPrice.toFixed(2),
    priceSource: priceSource,
    processingStatus: 'success'
  };
}

async function getPriceFromCache(isbn: string): Promise<number | null> {
  try {
    const result = await dynamoClient.send(new GetItemCommand({
      TableName: PRICE_CACHE_TABLE,
      Key: marshall({ isbn })
    }));

    if (result.Item) {
      const item = unmarshall(result.Item) as PriceCacheItem;
      // Check if cache entry is still valid (not expired)
      if (item.ttl > Math.floor(Date.now() / 1000)) {
        return item.price;
      }
    }
  } catch (error) {
    console.error('Error reading from cache:', error);
  }
  
  return null;
}

async function cachePriceData(isbn: string, price: number, title?: string, author?: string) {
  const ttl = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
  
  const item: PriceCacheItem = {
    isbn,
    price,
    condition: 'new',
    vendor: 'isbndb',
    title,
    author,
    timestamp: new Date().toISOString(),
    ttl
  };

  try {
    await dynamoClient.send(new PutItemCommand({
      TableName: PRICE_CACHE_TABLE,
      Item: marshall(item)
    }));
  } catch (error) {
    console.error('Error caching price data:', error);
  }
}

async function getDailyUsage(date: string): Promise<DailyUsageItem> {
  try {
    const result = await dynamoClient.send(new GetItemCommand({
      TableName: DAILY_USAGE_TABLE,
      Key: marshall({ date })
    }));

    if (result.Item) {
      return unmarshall(result.Item) as DailyUsageItem;
    }
  } catch (error) {
    console.error('Error getting daily usage:', error);
  }

  // Return default if not found
  return {
    date,
    callCount: 0,
    lastUpdated: new Date().toISOString(),
    ttl: Math.floor(Date.now() / 1000) + (48 * 60 * 60) // 48 hours TTL
  };
}

async function incrementDailyUsage(date: string) {
  const ttl = Math.floor(Date.now() / 1000) + (48 * 60 * 60); // 48 hours TTL

  try {
    await dynamoClient.send(new UpdateItemCommand({
      TableName: DAILY_USAGE_TABLE,
      Key: marshall({ date }),
      UpdateExpression: 'ADD callCount :inc SET lastUpdated = :updated, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#ttl': 'ttl'
      },
      ExpressionAttributeValues: marshall({
        ':inc': 1,
        ':updated': new Date().toISOString(),
        ':ttl': ttl
      })
    }));
  } catch (error) {
    console.error('Error incrementing daily usage:', error);
  }
}

async function getJobStatus(jobId: string): Promise<JobStatusItem | null> {
  try {
    const result = await dynamoClient.send(new GetItemCommand({
      TableName: JOB_STATUS_TABLE,
      Key: marshall({ jobId })
    }));

    return result.Item ? unmarshall(result.Item) as JobStatusItem : null;
  } catch (error) {
    console.error('Error getting job status:', error);
    return null;
  }
}

async function updateJobStatus(jobId: string, status: JobStatus, updates: Partial<JobStatusItem> = {}) {
  try {
    await dynamoClient.send(new UpdateItemCommand({
      TableName: JOB_STATUS_TABLE,
      Key: marshall({ jobId }),
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt' + 
        (updates.totalRows ? ', totalRows = :totalRows' : '') +
        (updates.processedRows !== undefined ? ', processedRows = :processedRows' : '') +
        (updates.errorCount !== undefined ? ', errorCount = :errorCount' : '') +
        (updates.outputFileKey ? ', outputFileKey = :outputFileKey' : '') +
        (updates.errorMessage ? ', errorMessage = :errorMessage' : ''),
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':status': status,
        ':updatedAt': new Date().toISOString(),
        ...(updates.totalRows && { ':totalRows': updates.totalRows }),
        ...(updates.processedRows !== undefined && { ':processedRows': updates.processedRows }),
        ...(updates.errorCount !== undefined && { ':errorCount': updates.errorCount }),
        ...(updates.outputFileKey && { ':outputFileKey': updates.outputFileKey }),
        ...(updates.errorMessage && { ':errorMessage': updates.errorMessage })
      })
    }));
  } catch (error) {
    console.error('Error updating job status:', error);
  }
}

async function getIsbndbApiKey(): Promise<string> {
  const result = await secretsClient.send(new GetSecretValueCommand({
    SecretId: ISBNDB_SECRET_NAME
  }));
  
  if (!result.SecretString) {
    throw new Error('ISBNdb API key not found in secrets manager');
  }
  
  const secrets = JSON.parse(result.SecretString);
  return secrets.apiKey;
}

async function downloadFile(bucket: string, key: string): Promise<string> {
  const result = await s3Client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key
  }));

  if (!result.Body) {
    throw new Error('File not found');
  }

  const stream = result.Body as Readable;
  const chunks: Buffer[] = [];
  
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks).toString('utf-8');
}

async function parseCSV(csvData: string): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    csv.parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }, (err, records) => {
      if (err) reject(err);
      else resolve(records);
    });
  });
}

async function generateCSV(rows: ProcessedRow[]): Promise<string> {
  return new Promise((resolve, reject) => {
    stringify(rows, {
      header: true,
      quoted: true
    }, (err, output) => {
      if (err) reject(err);
      else resolve(output);
    });
  });
}

async function uploadFile(bucket: string, key: string, content: string) {
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: content,
    ContentType: 'text/csv'
  }));
}
