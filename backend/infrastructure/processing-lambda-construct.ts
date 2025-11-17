import { Construct } from 'constructs';
import { Function, Runtime, Code, Architecture } from 'aws-cdk-lib/aws-lambda';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Duration } from 'aws-cdk-lib';

interface ProcessingLambdaProps {
  priceCacheTable: Table;
  jobStatusTable: Table;
  dailyUsageTable: Table;
  inputBucket: Bucket;
  outputBucket: Bucket;
  isbndbSecret: ISecret;
}

export class ProcessingLambda extends Construct {
  public readonly function: Function;

  constructor(scope: Construct, id: string, props: ProcessingLambdaProps) {
    super(scope, id);

    // Create IAM role with necessary permissions
    const lambdaRole = new Role(this, 'ProcessingLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    // Add basic Lambda execution permissions
    lambdaRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['arn:aws:logs:*:*:*']
    }));

    // Add DynamoDB permissions
    lambdaRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:Query'
      ],
      resources: [
        props.priceCacheTable.tableArn,
        props.jobStatusTable.tableArn,
        props.dailyUsageTable.tableArn,
        `${props.jobStatusTable.tableArn}/index/*`
      ]
    }));

    // Add S3 permissions
    lambdaRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:GetObject'
      ],
      resources: [`${props.inputBucket.bucketArn}/*`]
    }));

    lambdaRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:PutObjectAcl'
      ],
      resources: [`${props.outputBucket.bucketArn}/*`]
    }));

    // Add Secrets Manager permissions
    lambdaRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue'
      ],
      resources: [props.isbndbSecret.secretArn]
    }));

    // Create Lambda function
    this.function = new Function(this, 'ProcessCsvFunction', {
      functionName: 'library-catalog-process-csv',
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      handler: 'isbndb-bulk-process-csv-lambda.handler',
      code: Code.fromAsset('../../lambdas/process-csv'), // Path to Lambda code
      role: lambdaRole,
      timeout: Duration.minutes(15), // Max processing time
      memorySize: 1024, // Adequate memory for CSV processing
      environment: {
        PRICE_CACHE_TABLE: props.priceCacheTable.tableName,
        JOB_STATUS_TABLE: props.jobStatusTable.tableName,
        DAILY_USAGE_TABLE: props.dailyUsageTable.tableName,
        OUTPUT_BUCKET: props.outputBucket.bucketName,
        ISBNDB_SECRET_NAME: props.isbndbSecret.secretName
      }
    });

    // Add S3 event trigger for new file uploads
    props.inputBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new LambdaDestination(this.function),
      { prefix: 'uploads/' } // Only trigger for files in uploads/ folder
    );
  }
}
