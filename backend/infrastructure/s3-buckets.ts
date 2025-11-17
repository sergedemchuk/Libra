import { Construct } from 'constructs';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import { 
  Bucket, 
  BucketEncryption, 
  HttpMethods,
  StorageClass,
  BlockPublicAccess 
} from 'aws-cdk-lib/aws-s3';

export class S3Buckets extends Construct {
  public readonly uploadBucket: Bucket;
  public readonly processingBucket: Bucket;
  public readonly outputBucket: Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Upload bucket for CSV files
    this.uploadBucket = new Bucket(this, 'LibraUploadBucket', {
      bucketName: 'libra-catalog-uploads',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      cors: [{
        allowedMethods: [HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      lifecycleRules: [{
        id: 'DeleteIncompleteMultipartUploads',
        enabled: true,
        abortIncompleteMultipartUploadAfter: Duration.days(1), // Fixed: Use Duration.days()
      }, {
        id: 'DeleteOldUploads',
        enabled: true,
        expiration: Duration.days(30), // Fixed: Use Duration.days()
      }],
      removalPolicy: RemovalPolicy.DESTROY, // For development - change to RETAIN for production
    });

    // Processing bucket for temporary files during processing
    this.processingBucket = new Bucket(this, 'LibraProcessingBucket', {
      bucketName: 'libra-catalog-processing',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      cors: [{
        allowedMethods: [HttpMethods.GET], // Fixed: Use HttpMethods enum
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      lifecycleRules: [{
        id: 'DeleteProcessingFiles',
        enabled: true,
        expiration: Duration.days(7), // Clean up processing files after 7 days
      }],
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Output bucket for generated reports and exports
    this.outputBucket = new Bucket(this, 'LibraOutputBucket', {
      bucketName: 'libra-catalog-outputs',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{
        id: 'TransitionToIA',
        enabled: true,
        transitions: [{
          storageClass: StorageClass.INFREQUENT_ACCESS,
          transitionAfter: Duration.days(30), // Fixed: Use Duration.days()
        }, {
          storageClass: StorageClass.GLACIER,
          transitionAfter: Duration.days(90), // Fixed: Use Duration.days()
        }],
      }],
      removalPolicy: RemovalPolicy.RETAIN, // Keep output files
    });
  }
}