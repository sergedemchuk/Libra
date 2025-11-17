import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { marshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { JobStatusItem, JobStatus, ProcessingSettings } from '../infrastructure/types';

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});

const INPUT_BUCKET = process.env.INPUT_BUCKET!;
const JOB_STATUS_TABLE = process.env.JOB_STATUS_TABLE!;

interface UploadRequestBody {
  fileName: string;
  fileSize: number;
  settings: ProcessingSettings;
}

interface UploadResponse {
  jobId: string;
  uploadUrl: string;
  expires: string;
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Upload request:', JSON.stringify(event, null, 2));

  // Add CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Restrict to your domain in production
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };

  try {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'CORS preflight' })
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    const requestBody: UploadRequestBody = JSON.parse(event.body);

    // Validate request
    const validation = validateUploadRequest(requestBody);
    if (!validation.isValid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: validation.error })
      };
    }

    // Generate unique job ID and file key
    const jobId = uuidv4();
    const fileKey = `uploads/${jobId}/${requestBody.fileName}`;

    // Create job record in DynamoDB
    await createJobRecord(jobId, requestBody);

    // Generate presigned URL for upload
    const uploadUrl = await generatePresignedUrl(fileKey, requestBody.fileSize);

    // Calculate expiration time (15 minutes from now)
    const expirationTime = new Date(Date.now() + 15 * 60 * 1000);

    const response: UploadResponse = {
      jobId,
      uploadUrl,
      expires: expirationTime.toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Upload handler error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

function validateUploadRequest(body: UploadRequestBody): { isValid: boolean; error?: string } {
  if (!body.fileName) {
    return { isValid: false, error: 'fileName is required' };
  }

  if (!body.fileSize || body.fileSize <= 0) {
    return { isValid: false, error: 'Valid fileSize is required' };
  }

  // Check file size limit (50MB)
  if (body.fileSize > 50 * 1024 * 1024) {
    return { isValid: false, error: 'File size exceeds 50MB limit' };
  }

  // Check file extension
  const allowedExtensions = ['.csv', '.xlsx', '.xls', '.tsv'];
  const fileExtension = body.fileName.toLowerCase().slice(body.fileName.lastIndexOf('.'));
  
  if (!allowedExtensions.includes(fileExtension)) {
    return { isValid: false, error: `File type not supported. Allowed: ${allowedExtensions.join(', ')}` };
  }

  if (!body.settings || typeof body.settings.priceRounding !== 'boolean') {
    return { isValid: false, error: 'Valid settings object is required' };
  }

  // Validate price adjustment if provided
  if (body.settings.priceAdjustment !== undefined) {
    if (typeof body.settings.priceAdjustment !== 'number') {
      return { isValid: false, error: 'priceAdjustment must be a number' };
    }
    
    if (body.settings.priceAdjustment < -1000 || body.settings.priceAdjustment > 1000) {
      return { isValid: false, error: 'priceAdjustment must be between -1000 and 1000' };
    }
  }

  return { isValid: true };
}

async function createJobRecord(jobId: string, request: UploadRequestBody): Promise<void> {
  const now = new Date().toISOString();
  const fileKey = `uploads/${jobId}/${request.fileName}`;

  const jobItem: JobStatusItem = {
    jobId,
    status: JobStatus.PENDING,
    fileName: request.fileName,
    inputFileKey: fileKey,
    settings: request.settings,
    createdAt: now,
    updatedAt: now
  };

  await dynamoClient.send(new PutItemCommand({
    TableName: JOB_STATUS_TABLE,
    Item: marshall(jobItem),
    ConditionExpression: 'attribute_not_exists(jobId)' // Prevent duplicates
  }));

  console.log(`Created job record: ${jobId}`);
}

async function generatePresignedUrl(fileKey: string, fileSize: number): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: INPUT_BUCKET,
    Key: fileKey,
    ContentType: 'text/csv', // Default content type
    ContentLength: fileSize,
    ServerSideEncryption: 'AES256',
    Metadata: {
      'upload-timestamp': new Date().toISOString()
    }
  });

  // Generate presigned URL valid for 15 minutes
  const presignedUrl = await getSignedUrl(s3Client, command, { 
    expiresIn: 15 * 60 // 15 minutes
  });

  console.log(`Generated presigned URL for: ${fileKey}`);
  return presignedUrl;
}
