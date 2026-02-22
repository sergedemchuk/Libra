import { Construct } from 'constructs';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export class LibraryCatalogTables extends Construct {
  public readonly priceCache: Table;
  public readonly jobStatus: Table;
  public readonly dailyUsage: Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Price Cache Table - stores ISBN to price mappings
    this.priceCache = new Table(this, 'PriceCache', {
      tableName: 'library-catalog-price-cache',
      partitionKey: {
        name: 'isbn',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl', // Auto-expire cache entries
      removalPolicy: RemovalPolicy.RETAIN, // Keep data if stack is deleted
    });

    // Job Status Table - tracks file processing status
    this.jobStatus = new Table(this, 'JobStatus', {
      tableName: 'library-catalog-job-status',
      partitionKey: {
        name: 'jobId',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // Add GSI for querying jobs by status
    this.jobStatus.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: {
        name: 'status',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: AttributeType.STRING,
      },
    });

    // Daily Usage Table - tracks ISBNdb API usage for rate limiting
    this.dailyUsage = new Table(this, 'DailyUsage', {
      tableName: 'library-catalog-daily-usage',
      partitionKey: {
        name: 'date',
        type: AttributeType.STRING, // Format: YYYY-MM-DD
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl', // Auto-expire old usage records
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}
