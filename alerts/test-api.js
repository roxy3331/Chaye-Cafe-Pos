const fs = require('fs');
const https = require('https');

// Service Account
const serviceAccount = {
  "client_email": "firebase-adminsdk-fbsvc@chaye-cafe-pos.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCrhijL2ePB08XA\nAnyhhBTJChS58KzfsOqb3omVlKIBRS7QXETZx2qctXoL07KnmtcYCdqe35OS1ePJ\nkuYe6Ftpt9loVU1jIrM0BQ+iXrr8cNvF8TdC4cn8vPPDmx35H30wWtBlPnEFUOph\nffr+qij0j9ovnH8erV8QVHAM5J+cHAp5P1AdfHnZrQpGLFfUyNbaB8jZ+WCTZqBr\ngQyH/6AudCfjGJ3UhUlJqHfGM9wgbSGsg5m+HMUwMCIjRqy3FqERCChH9AKjkRWP\n9WG2TDZ49KxYHOjiZptYRU5kfa/gTWuQYeXkDylwE/M+YXd3xvVuRhSYVsqjUsUt\n9Sqt3wlfAgMBAAECggEAUfzuekacMlXGlDn8Ff57Kv/ZGWo8UC6SblAo5umlqMLH\nlkxMkubaBK9Qd9/I6Ym/oBtxt3h6Y3k/CWbg/cwmifmZ/9+qfqUjEM4Mg5oRekJ+\nIvdi6WLhOKCfSpRWdvMA1cDLFWIMBzT+2/wqoll2+zPZ4OFG+ER6COW7q8YKr0UF\nFgAah6dSw4HyBIqL4dZUXp47IUwwIGwJEeKnbpXm4W4PziBoFbz2uSx7/YB83Z6W\nswOykaoSqfVf0AHa/ljZyVfHy/HwshGzaUV6MiNWzmktI8Ks4f2xeSi9DP/Dd7LR\nEd9KoY47KTkDg0Yxpb4tBopMjifsLqq2UeEv3IsH/QKBgQDjOit+04XjN9KcsPel\n0MFfJfKhidI3w51kDXQUgTBqSPHqB3w3wvOQ6WAL6vFGghp1NAO6UPWapUx8xgdP\nKL75CExFE8uX1aju6J7vj+WJV/PUTpydiRIgz5G1ilBXYgjwwEb5mjDuN0unAc+0\nwPnzp5NNDwC9Vlto17Yoy/qdywKBgQDBPk7FIpNOuWH+Oi1uXFmxSKP4KysCUQuX\nrHm4G31xG6tLunBnLchaul6IjGigTGH6LWdfV/+l12IFAZOo2ePCkz6fOBUkdKQR\n/KZvA92ucUwgw6kkEJcnfL+PJWTI5jqzIwgYPizS370qZen1HpQTFSrTRIpWc5eQ\niOZyCohQPQKBgDZzpSKyW75UjUMBYYc53G0JsfgmB9tXJCtq0etr/gcqTdaQTqMq\nM6YBVwPkHEeSO/bkLRSD/Cc//3FTH0NH92PEKkrPcJWFHQOLeTLdX9sm2YaCBCP4\nSgDU3Q0NBS27j3rqCNgdrCYZ2CZAV97v87YA7VqlAr9cp3EbaEqkfv07AoGAIiIX\nV8rbqjQkkvtDuxKk5SOnktZNKoOWQJw+g76XUbtJbn7oC9GSajQxLn1enbHgPIh4\nkebBSVHaBnhY1KJoEJ5hmU4WrfHMaUDvRPyx03Y/tCnbXntvt5HZZDd+rd280JeH\nfoC8+iJ7D1ohESLtlNFQVzDsHokcZHNKASrLGSECgYEApPJsI4O0q2E+IGl03PJp\n8FBT8FOUeqh5MWQzp6oyMKClH5tAZlsF5cqqcSzQhM20BzvJs8hQF0kCBcXDBxae\nNevJYVPLirs3NjubmQ2mKmWSQGRhZg6gLMNQvRXSPDbe3b/n/D0dYsbMHMZuLfzI\nIj4lds76NX4A6W+xPksOsHw=\n-----END PRIVATE KEY-----"
};

// Generate JWT Token
function generateJWT() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = headerB64 + '.' + payloadB64;

  // For n8n, we'll use the token endpoint directly
  return { signingInput, headerB64, payloadB64 };
}

// Get Access Token from Google OAuth
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const { signingInput, headerB64, payloadB64 } = generateJWT();

    // We need to sign the JWT - for now let's use a simpler approach
    // Use the service account to get token via OAuth
    const postData = 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + signingInput + '.SIGNED_PLACEHOLDER';

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('OAuth Response:', data);
        try {
          const json = JSON.parse(data);
          resolve(json.access_token);
        } catch(e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

console.log('Testing API...');
getAccessToken().then(token => {
  console.log('Token:', token);
}).catch(err => {
  console.error('Error:', err.message);
});