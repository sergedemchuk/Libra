import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { JobStatusItem, JobStatus, JobResponse } from '../infrastructure/types';

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});

const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET!;
const JOB_STATUS_TABLE = process.env.JOB_STATUS_TABLE!;

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Status request:', JSON.stringify(event, null, 2));

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
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

    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Extract jobId from path parameters
    const jobId = event.pathParameters?.jobId;
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'jobId is required' })
      };
    }

    // Get job status from DynamoDB
    const jobStatus = await getJobStatus(jobId);
    
    if (!jobStatus) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }

    // Build response
    const response: JobResponse = {
      jobId: jobStatus.jobId,
      status: jobStatus.status,
      fileName: jobStatus.fileName,
      error: jobStatus.errorMessage
    };

    // Add progress information if available
    if (jobStatus.totalRows && jobStatus.processedRows !== undefined) {
      response.progress = {
        total: jobStatus.totalRows,
        processed: jobStatus.processedRows
      };
    }

    // Add download URL if job is completed
    if (jobStatus.status === JobStatus.COMPLETED && jobStatus.outputFileKey) {
      try {
        response.downloadUrl = await generateDownloadUrl(jobStatus.outputFileKey);
      } catch (error) {
        console.error('Error generating download URL:', error);
        // Don't fail the request if download URL generation fails
        response.error = 'File processed but download URL unavailable';
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Status handler error:', error);
    
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

async function getJobStatus(jobId: string): Promise<JobStatusItem | null> {
  try {
    const result = await dynamoClient.send(new GetItemCommand({
      TableName: JOB_STATUS_TABLE,
      Key: marshall({ jobId })
    }));

    if (!result.Item) {
      return null;
    }

    return unmarshall(result.Item) as JobStatusItem;

  } catch (error) {
    console.error('Error getting job status:', error);
    throw new Error('Failed to retrieve job status');
  }
}

async function generateDownloadUrl(outputFileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: OUTPUT_BUCKET,
    Key: outputFileKey,
    ResponseContentDisposition: `attachment; filename="${outputFileKey.split('/').pop()}"`
  });

  // Generate presigned URL valid for 1 hour
  const presignedUrl = await getSignedUrl(s3Client, command, { 
    expiresIn: 60 * 60 // 1 hour
  });

  console.log(`Generated download URL for: ${outputFileKey}`);
  return presignedUrl;
}
