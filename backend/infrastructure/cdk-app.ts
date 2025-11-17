#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

import { LibraryCatalogTables } from './dynamodb-tables';
import { S3Buckets } from './s3-buckets';
import { ProcessingLambda } from './processing-lambda-construct';
import { FileHandlingLambdas } from './file-handling-lambdas';
import { LibraryCatalogApi } from './api-gateway';

class LibraryCatalogStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create DynamoDB tables
    const tables = new LibraryCatalogTables(this, 'Tables');
    
    // Create S3 buckets
    const buckets = new LibraryCatalogBuckets(this, 'Buckets');
    
    // Create file handling Lambda functions
    const fileHandling = new FileHandlingLambdas(this, 'FileHandling', {
      jobStatusTable: tables.jobStatus,
      inputBucket: buckets.inputBucket,
      outputBucket: buckets.outputBucket,
    });

    // Get ISBNdb API secret (must be created manually first)
    const isbndbSecret = Secret.fromSecretNameV2(this, 'IsbndbSecret', 'isbndb-api-key');
    
    // Create main processing Lambda
    const processing = new ProcessingLambda(this, 'Processing', {
      priceCacheTable: tables.priceCache,
      jobStatusTable: tables.jobStatus,
      dailyUsageTable: tables.dailyUsage,
      inputBucket: buckets.inputBucket,
      outputBucket: buckets.outputBucket,
      isbndbSecret,
    });

    // Create API Gateway
    const api = new LibraryCatalogApi(this, 'Api', {
      uploadFunction: fileHandling.uploadFunction,
      statusFunction: fileHandling.statusFunction,
    });
    
    // Output important values for frontend configuration
    new CfnOutput(this, 'ApiUrl', {
      value: api.apiUrl,
      description: 'Library Catalog API URL',
      exportName: 'LibraryCatalogApiUrl'
    });

    new CfnOutput(this, 'ApiId', {
      value: api.api.restApiId,
      description: 'API Gateway REST API ID',
      exportName: 'LibraryCatalogApiId'
    });
    
    // Database outputs
    new CfnOutput(this, 'PriceCacheTableName', {
      value: tables.priceCache.tableName,
      description: 'Price cache DynamoDB table name',
    });

    new CfnOutput(this, 'JobStatusTableName', {
      value: tables.jobStatus.tableName,
      description: 'Job status DynamoDB table name',
    });

    new CfnOutput(this, 'DailyUsageTableName', {
      value: tables.dailyUsage.tableName,
      description: 'Daily usage tracking DynamoDB table name',
    });
    
    // S3 outputs
    new CfnOutput(this, 'InputBucketName', {
      value: buckets.inputBucket.bucketName,
      description: 'Input S3 bucket name',
    });

    new CfnOutput(this, 'OutputBucketName', {
      value: buckets.outputBucket.bucketName,
      description: 'Output S3 bucket name',
    });
    
    // Lambda outputs
    new CfnOutput(this, 'UploadFunctionName', {
      value: fileHandling.uploadFunction.functionName,
      description: 'Upload Lambda function name',
    });
    
    new CfnOutput(this, 'StatusFunctionName', {
      value: fileHandling.statusFunction.functionName,
      description: 'Status Lambda function name',
    });

    new CfnOutput(this, 'ProcessingFunctionName', {
      value: processing.function.functionName,
      description: 'Processing Lambda function name',
    });

    // Environment configuration for frontend
    new CfnOutput(this, 'FrontendConfig', {
      value: JSON.stringify({
        apiUrl: api.apiUrl,
        region: this.region,
        apiId: api.api.restApiId
      }),
      description: 'Configuration object for frontend application',
    });
  }
}

const app = new App();
new LibraryCatalogStack(app, 'LibraryCatalogStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
