// infrastructure/email-lambda.ts
//
// Creates the /email API Gateway route + Lambda + tokens table.
// CORS is inherited from the RestApi's defaultCorsPreflightOptions —
// we do NOT add our own preflight here (that was the bug in the previous
// version that produced preflight responses with no Allow-Origin header).

import { Construct } from 'constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';

export interface EmailLambdaProps {
  api: RestApi;
  accountsTable: dynamodb.ITable;
  sesFromAddress: string;     // e.g. 'no-reply@yourdomain.com' (SES-verified)
  adminEmail: string;         // e.g. 'admin@yourdomain.com'    (SES-verified)
  appUrl: string;             // e.g. 'https://libra.example.com'
}

export class EmailLambda extends Construct {
  constructor(scope: Construct, id: string, props: EmailLambdaProps) {
    super(scope, id);

    // ── Tokens table — TTL-based cleanup for reset tokens + 2FA codes ──────
    const tokens = new dynamodb.Table(this, 'EmailTokens', {
      tableName: 'library-catalog-email-tokens',
      partitionKey: { name: 'token', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ── Lambda ─────────────────────────────────────────────────────────────
    const fn = new nodejs.NodejsFunction(this, 'EmailFn', {
      functionName: 'library-catalog-email',
      entry: '../lambda_email/src/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.seconds(15),
      memorySize: 256,
      environment: {
        SES_FROM_ADDRESS:    props.sesFromAddress,
        ADMIN_EMAIL:         props.adminEmail,
        ACCOUNTS_TABLE:      props.accountsTable.tableName,
        ACCOUNTS_EMAIL_INDEX: 'email-index',   // GSI name from dynamodb-tables.ts
        EMAIL_TOKENS_TABLE:  tokens.tableName,
        APP_URL:             props.appUrl,
      },
    });

    // ── IAM ────────────────────────────────────────────────────────────────
    tokens.grantReadWriteData(fn);
    props.accountsTable.grantReadData(fn);

    // Allow reading the email-index GSI (accounts table uses userId as PK;
    // we need the GSI to look up accounts by email)
    fn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Query'],
      resources: [`${props.accountsTable.tableArn}/index/*`],
    }));

    // SES send permission
    fn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    // ── Route wiring ───────────────────────────────────────────────────────
    // CORS preflight is handled automatically by defaultCorsPreflightOptions
    // on the RestApi — do NOT call addCorsPreflight here.
    const route = props.api.root.addResource('email');
    route.addMethod('POST', new LambdaIntegration(fn));
  }
}