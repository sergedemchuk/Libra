import { Construct } from 'constructs';
import { 
  RestApi, 
  LambdaIntegration, 
  Resource, 
  Method,
  Cors,
  CorsOptions,
  ApiKeySourceType,
  ThrottleSettings,
  RequestValidator,
  Model,
  JsonSchemaType
} from 'aws-cdk-lib/aws-apigateway';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { CfnOutput } from 'aws-cdk-lib';

interface LibraryCatalogApiProps {
  uploadFunction: Function;
  statusFunction: Function;
}

export class LibraryCatalogApi extends Construct {
  public readonly api: RestApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: LibraryCatalogApiProps) {
    super(scope, id);

    // CORS configuration
    const corsOptions: CorsOptions = {
      allowOrigins: ['*'], // Restrict to your domain in production
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: [
        'Content-Type',
        'Authorization',
        'X-Amz-Date',
        'X-Api-Key',
        'X-Amz-Security-Token',
        'X-Amz-User-Agent'
      ],
      exposeHeaders: ['x-amzn-RequestId'],
      maxAge: 300
    };

    // Create REST API
    this.api = new RestApi(this, 'LibraryCatalogApi', {
      restApiName: 'Library Catalog API',
      description: 'API for library catalog pricing application',
      apiKeySourceType: ApiKeySourceType.HEADER,
      defaultCorsPreflightOptions: corsOptions,
      deployOptions: {
        stageName: 'prod',
        throttle: {
          rateLimit: 1000,  // requests per second
          burstLimit: 2000  // concurrent requests
        }
      },
      // Enable request/response logging
      cloudWatchRole: true,
    });

    // Create request validators
    const uploadValidator = this.createUploadValidator();
    const pathValidator = this.createPathValidator();

    // Create API resources and methods
    this.createUploadEndpoint(props.uploadFunction, uploadValidator, corsOptions);
    this.createStatusEndpoint(props.statusFunction, pathValidator, corsOptions);

    this.apiUrl = this.api.url;

    // Output the API URL
    new CfnOutput(scope, 'ApiUrl', {
      value: this.apiUrl,
      description: 'Library Catalog API URL',
    });

    new CfnOutput(scope, 'ApiId', {
      value: this.api.restApiId,
      description: 'Library Catalog API ID',
    });
  }

  private createUploadEndpoint(uploadFunction: Function, validator: RequestValidator, cors: CorsOptions) {
    // Create /upload resource
    const uploadResource = this.api.root.addResource('upload');

    // Lambda integration
    const uploadIntegration = new LambdaIntegration(uploadFunction, {
      proxy: true,
      allowTestInvoke: false,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Methods': "'GET,POST,OPTIONS'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'"
          }
        },
        {
          statusCode: '400',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'"
          }
        },
        {
          statusCode: '500',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'"
          }
        }
      ]
    });

    // POST /upload method
    uploadResource.addMethod('POST', uploadIntegration, {
      requestValidator: validator,
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Headers': true
          }
        },
        {
          statusCode: '400',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        },
        {
          statusCode: '500',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        }
      ]
    });

    // Add CORS preflight
    uploadResource.addCorsPreflight(cors);
  }

  private createStatusEndpoint(statusFunction: Function, validator: RequestValidator, cors: CorsOptions) {
    // Create /status resource
    const statusResource = this.api.root.addResource('status');
    
    // Create {jobId} path parameter resource
    const jobIdResource = statusResource.addResource('{jobId}');

    // Lambda integration
    const statusIntegration = new LambdaIntegration(statusFunction, {
      proxy: true,
      allowTestInvoke: false,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Methods': "'GET,OPTIONS'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'"
          }
        },
        {
          statusCode: '404',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'"
          }
        },
        {
          statusCode: '500',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'"
          }
        }
      ]
    });

    // GET /status/{jobId} method
    jobIdResource.addMethod('GET', statusIntegration, {
      requestValidator: validator,
      requestParameters: {
        'method.request.path.jobId': true
      },
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Headers': true
          }
        },
        {
          statusCode: '404',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        },
        {
          statusCode: '500',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        }
      ]
    });

    // Add CORS preflight for status resource
    statusResource.addCorsPreflight(cors);
    jobIdResource.addCorsPreflight(cors);
  }

  private createUploadValidator(): RequestValidator {
    // Request model for upload endpoint
    const uploadRequestModel = new Model(this, 'UploadRequestModel', {
      restApi: this.api,
      modelName: 'UploadRequest',
      contentType: 'application/json',
      schema: {
        type: JsonSchemaType.OBJECT,
        required: ['fileName', 'fileSize', 'settings'],
        properties: {
          fileName: {
            type: JsonSchemaType.STRING,
            minLength: 1,
            maxLength: 255,
            pattern: '^[\\w\\-_\\.]+\\.(csv|xlsx|xls|tsv)$'
          },
          fileSize: {
            type: JsonSchemaType.INTEGER,
            minimum: 1,
            maximum: 52428800 // 50MB in bytes
          },
          settings: {
            type: JsonSchemaType.OBJECT,
            required: ['priceRounding'],
            properties: {
              priceRounding: {
                type: JsonSchemaType.BOOLEAN
              },
              priceAdjustment: {
                type: JsonSchemaType.NUMBER,
                minimum: -1000,
                maximum: 1000
              }
            }
          }
        }
      }
    });

    return new RequestValidator(this, 'UploadValidator', {
      restApi: this.api,
      requestValidatorName: 'UploadRequestValidator',
      validateRequestBody: true,
      validateRequestParameters: true
    });
  }

  private createPathValidator(): RequestValidator {
    return new RequestValidator(this, 'PathValidator', {
      restApi: this.api,
      requestValidatorName: 'PathParameterValidator',
      validateRequestBody: false,
      validateRequestParameters: true
    });
  }
}
