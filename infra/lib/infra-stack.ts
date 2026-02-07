
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as path from 'path';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================================================
    // 1. DynamoDB
    // ========================================================================
    const table = new dynamodb.Table(this, 'DumbbellProLogTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev/demo only
    });

    // ========================================================================
    // 2. Auth (Cognito) - Private Use
    // ========================================================================
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: false, // Private use only
      signInAliases: { username: true, email: true },
      autoVerify: { email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = userPool.addClient('UserPoolClient', {
      authFlows: {
        userPassword: true,
        userSrp: true, // 標準的なログインフロー (SRP) を有効化
      },
    });

    const cfnUserPool = userPool.node.defaultChild as cognito.CfnUserPool;
    // Removed failed addPropertyOverride

    // Use AwsCustomResource to trigger UpdateUserPool API directly for WebAuthn configuration
    // This bypasses CloudFormation property support issues.
    new cr.AwsCustomResource(this, 'UpdateUserPoolWebAuthnConfig', {
      onCreate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'updateUserPool',
        parameters: {
          UserPoolId: userPool.userPoolId,
          WebAuthnConfiguration: {
            RelyingPartyId: 'd3d47h1cjnwltv.cloudfront.net',
            UserVerification: 'PREFERRED',
          },
        },
        physicalResourceId: cr.PhysicalResourceId.of('WebAuthnConfigReleaseV1'),
      },
      onUpdate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'updateUserPool',
        parameters: {
          UserPoolId: userPool.userPoolId,
          WebAuthnConfiguration: {
            RelyingPartyId: 'd3d47h1cjnwltv.cloudfront.net',
            UserVerification: 'PREFERRED',
          },
        },
        physicalResourceId: cr.PhysicalResourceId.of('WebAuthnConfigReleaseV1'),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [userPool.userPoolArn],
      }),
    });

    const cfnUserPoolClient = userPoolClient.node.defaultChild as cognito.CfnUserPoolClient;
    cfnUserPoolClient.allowedOAuthFlows = ['code', 'implicit'];
    cfnUserPoolClient.allowedOAuthFlowsUserPoolClient = true;
    cfnUserPoolClient.allowedOAuthScopes = ['phone', 'email', 'openid', 'profile', 'aws.cognito.signin.user.admin'];
    cfnUserPoolClient.explicitAuthFlows = [
      'ALLOW_REFRESH_TOKEN_AUTH',
      'ALLOW_USER_PASSWORD_AUTH',
      'ALLOW_USER_SRP_AUTH',
      'ALLOW_USER_AUTH'
    ];

    const authAuthorizer = new HttpUserPoolAuthorizer('AuthAuthorizer', userPool, {
      userPoolClients: [userPoolClient],
    });

    // ========================================================================
    // 3. Backend (Lambda + API Gateway)
    // ========================================================================
    // Assumes the Rust binary is built and located at ../backend/target/lambda/backend
    // We will use a makefile or just copy it there manually for now.
    // Actually, let's point to a 'dist' folder we will instruct the user to create.
    const backendFunction = new lambda.Function(this, 'BackendFunction', {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: 'bootstrap', // Rust binaries in Lambda are always named bootstrap
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: {
        TABLE_NAME: table.tableName,
      },
      architecture: lambda.Architecture.ARM_64, // Cost effective
      memorySize: 128,
    });

    table.grantReadWriteData(backendFunction);

    const api = new apigw.HttpApi(this, 'DumbbellProLogApi', {
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigw.CorsHttpMethod.ANY],
      },
    });

    api.addRoutes({
      path: '/{proxy+}',
      methods: [apigw.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration('BackendIntegration', backendFunction),
      authorizer: authAuthorizer,
    });

    // ========================================================================
    // 3. Frontend (S3 + CloudFront)
    // ========================================================================
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html', // SPA Routing
        },
      ],
    });

    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/dist'))],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ========================================================================
    // Outputs
    // ========================================================================
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url! });
    new cdk.CfnOutput(this, 'FrontendUrl', { value: distribution.domainName });
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
  }
}
