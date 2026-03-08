import { Construct } from 'constructs';
import { Function, Runtime, Code, Architecture } from 'aws-cdk-lib/aws-lambda';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Duration } from 'aws-cdk-lib';

interface UserLambdasProps {
  userAccountsTable: Table;
}

export class UserLambdas extends Construct {
  public readonly accountsFunction: Function;

  constructor(scope: Construct, id: string, props: UserLambdasProps) {
    super(scope, id);

    this.accountsFunction = this.createAccountsFunction(props);
  }

  private createAccountsFunction(props: UserLambdasProps): Function {
    const role = new Role(this, 'AccountsLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    role.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: ['arn:aws:logs:*:*:*'],
    }));

    role.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:PutItem',
        'dynamodb:GetItem',
        'dynamodb:DeleteItem',
        'dynamodb:Scan',
        'dynamodb:Query',
      ],
      resources: [
        props.userAccountsTable.tableArn,
        `${props.userAccountsTable.tableArn}/index/*`,
      ],
    }));

    return new Function(this, 'AccountsFunction', {
      functionName: 'library-catalog-accounts',
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: 'dist/index.handler',
      code: Code.fromAsset('../lambda/accounts'),
      role,
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        USER_ACCOUNTS_TABLE: props.userAccountsTable.tableName,
      },
    });
  }
}
