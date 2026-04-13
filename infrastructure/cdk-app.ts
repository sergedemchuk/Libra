#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

import { LibraryCatalogTables } from './dynamodb-tables';
import { S3Buckets } from './s3-buckets';
import { ProcessingLambda } from './processing-lambda-construct';
import { FileHandlingLambdas } from './file-handling-lambdas';
import { UserLambdas } from './user-lambdas';
import { LibraryCatalogApi } from './api-gateway';
import { EmailLambda } from './email-lambda';

class LibraryCatalogStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create DynamoDB tables
    const tables = new LibraryCatalogTables(this, 'Tables');

    // Create S3 buckets
    const buckets = new S3Buckets(this, 'Buckets');

    // Create file handling Lambda functions
    const fileHandling = new FileHandlingLambdas(this, 'FileHandling', {
      jobStatusTable: tables.jobStatus,
      inputBucket: buckets.uploadBucket,
      outputBucket: buckets.outputBucket,
    });

    // Create user account Lambda functions
    const userLambdas = new UserLambdas(this, 'UserLambdas', {
      userAccountsTable: tables.userAccounts,
    });

    // Get ISBNdb API secret (must be created manually first)
    const isbndbSecret = Secret.fromSecretNameV2(this, 'IsbndbSecret', 'isbndb-api-key');

    // Create main processing Lambda
    const processing = new ProcessingLambda(this, 'Processing', {
      priceCacheTable: tables.priceCache,
      jobStatusTable: tables.jobStatus,
      dailyUsageTable: tables.dailyUsage,
      inputBucket: buckets.uploadBucket,
      outputBucket: buckets.outputBucket,
      isbndbSecret,
    });

    // Create API Gateway
    const api = new LibraryCatalogApi(this, 'Api', {
      uploadFunction: fileHandling.uploadFunction,
      statusFunction: fileHandling.statusFunction,
      accountsFunction: userLambdas.accountsFunction,
    });

    // ── NEW: Email Lambda (SES-backed password reset, 2FA, admin notifications)
    //
    // IMPORTANT — update these three values to match your SES-verified identities:
    //   - sesFromAddress: the verified sender (shows as "From:" in every email)
    //   - adminEmail:     the verified admin who receives account-change notifications
    //   - appUrl:         the frontend origin used to build the password reset link
    //
    // In SES sandbox mode, every recipient must also be verified in SES.
    new EmailLambda(this, 'EmailLambda', {
      api: api.api,                           // the underlying RestApi
      accountsTable: tables.userAccounts,     // reuses existing user-accounts table
      sesFromAddress: 'libradev.admin@gmail.com',
      adminEmail:     'libradev.admin@gmail.com',
      appUrl:         'http://localhost:3000',
    });

    // ── Outputs ─────────────────────────────────────────────────────────────

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

    new CfnOutput(this, 'InputBucketName', {
      value: buckets.uploadBucket.bucketName,
      description: 'Input S3 bucket name',
    });

    new CfnOutput(this, 'OutputBucketName', {
      value: buckets.outputBucket.bucketName,
      description: 'Output S3 bucket name',
    });

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

    new CfnOutput(this, 'AccountsFunctionName', {
      value: userLambdas.accountsFunction.functionName,
      description: 'Accounts Lambda function name',
    });

    new CfnOutput(this, 'UserAccountsTableName', {
      value: tables.userAccounts.tableName,
      description: 'User accounts DynamoDB table name',
    });

    new CfnOutput(this, 'FrontendConfig', {
      value: JSON.stringify({
        apiUrl: api.apiUrl,
        region: this.region,
        apiId: api.api.restApiId,
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