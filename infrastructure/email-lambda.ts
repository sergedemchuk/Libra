// infrastructure/email-lambda.ts
// Add this construct to your CDK app (e.g. import & instantiate from cdk-app.ts)

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
  sesFromAddress: string;     // e.g. 'no-reply@yourdomain.com' (verified in SES sandbox)
  adminEmail: string;         // e.g. 'admin@yourdomain.com'   (verified in SES sandbox)
  appUrl: string;             // e.g. 'https://libra.example.com'
}

export class EmailLambda extends Construct {
  constructor(scope: Construct, id: string, props: EmailLambdaProps) {
    super(scope, id);

    // Tokens table — TTL-based cleanup of reset tokens & 2FA codes
    const tokens = new dynamodb.Table(this, 'EmailTokens', {
      partitionKey: { name: 'token', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const fn = new nodejs.NodejsFunction(this, 'EmailFn', {
      entry: '../lambda_email/src/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(15),
      environment: {
        SES_FROM_ADDRESS:    props.sesFromAddress,
        ADMIN_EMAIL:         props.adminEmail,
        ACCOUNTS_TABLE:      props.accountsTable.tableName,
        EMAIL_TOKENS_TABLE:  tokens.tableName,
        APP_URL:             props.appUrl,
      },
    });

    tokens.grantReadWriteData(fn);
    props.accountsTable.grantReadData(fn);

    // SES send permission
    fn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    // Wire up POST /email
    const route = props.api.root.addResource('email');
    route.addMethod('POST', new LambdaIntegration(fn));
    route.addCorsPreflight({ allowOrigins: ['*'], allowMethods: ['POST'] });
  }
}