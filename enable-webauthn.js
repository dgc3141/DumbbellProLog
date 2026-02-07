const { CognitoIdentityProviderClient, UpdateUserPoolCommand } = require('@aws-sdk/client-cognito-identity-provider');

async function enableWebAuthn() {
    const client = new CognitoIdentityProviderClient({ region: 'ap-northeast-1' });

    const command = new UpdateUserPoolCommand({
        UserPoolId: 'ap-northeast-1_0ej2TMmoO',
        WebAuthnConfiguration: {
            RelyingPartyId: 'd3d47h1cjnwltv.cloudfront.net',
            UserVerification: 'PREFERRED',
        },
    });

    try {
        const response = await client.send(command);
        console.log('✅ WebAuthn configuration successfully applied!');
        console.log('Response:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('❌ Failed to update user pool:', error);
        process.exit(1);
    }
}

enableWebAuthn();
