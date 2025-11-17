import { Construct } from 'constructs';
import { Function, Runtime, Code, Architecture } from 'aws-cdk-lib/aws-lambda';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Duration } from 'aws-cdk-lib';

interface FileHandlingLambdasProps {
  jobStatusTable: Table;
  inputBucket: Bucket;
  outputBucket: Bucket;
}

export class FileHandlingLambdas extends Construct {
  public readonly uploadFunction: Function;
  public readonly statusFunction: Function;

  constructor(scope: Construct, id: string, props: FileHandlingLambdasProps) {
    super(scope, id);

    // Create upload Lambda function
    this.uploadFunction = this.createUploadFunction(props);
    
    // Create status checking Lambda function  
    this.statusFunction = this.createStatusFunction(props);
  }

  private createUploadFunction(props: FileHandlingLambdasProps): Function {
    // Create IAM role for upload function
    const uploadRole = new Role(this, 'UploadLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    // Add basic Lambda execution permissions
    uploadRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream', 
        'logs:PutLogEvents'
      ],
      resources: ['arn:aws:logs:*:*:*']
    }));

    // Add DynamoDB permissions for job creation
    uploadRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:PutItem'
      ],
      resources: [props.jobStatusTable.tableArn]
    }));

    // Add S3 permissions for presigned URL generation
    uploadRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:PutObjectAcl'
      ],
      resources: [`${props.inputBucket.bucketArn}/*`]
    }));

    return new Function(this, 'UploadFunction', {
      functionName: 'library-catalog-upload',
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      handler: 'upload-lambda.handler',
      code: Code.fromAsset('../../lambdas/upload'), // Path to Lambda code
      role: uploadRole,
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        INPUT_BUCKET: props.inputBucket.bucketName,
        JOB_STATUS_TABLE: props.jobStatusTable.tableName
      }
    });
  }

  private createStatusFunction(props: FileHandlingLambdasProps): Function {
    // Create IAM role for status function
    const statusRole = new Role(this, 'StatusLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    // Add basic Lambda execution permissions
    statusRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['arn:aws:logs:*:*:*']
    }));

    // Add DynamoDB permissions for reading job status
    statusRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Query'
      ],
      resources: [
        props.jobStatusTable.tableArn,
        `${props.jobStatusTable.tableArn}/index/*`
      ]
    }));

    // Add S3 permissions for download URL generation
    statusRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:GetObject'
      ],
      resources: [`${props.outputBucket.bucketArn}/*`]
    }));

    return new Function(this, 'StatusFunction', {
      functionName: 'library-catalog-status',
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      handler: 'job-status-lambda.handler',
      code: Code.fromAsset('../../lambdas/status'), // Path to Lambda code
      role: statusRole,
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        OUTPUT_BUCKET: props.outputBucket.bucketName,
        JOB_STATUS_TABLE: props.jobStatusTable.tableName
      }
    });
  }
}
