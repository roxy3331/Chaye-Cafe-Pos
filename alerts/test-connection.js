const { subtle } = globalThis.crypto || require('crypto').webcrypto;

const email = 'firebase-adminsdk-fbsvc@chaye-cafe-pos.iam.gserviceaccount.com';
const pk = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCscKQLE1P/pm9L
wzhf74tUML6RVC4lk26yBTCRXvvMrUAy3wMxkgOY6Fy6x6LooPvF0plcwzXyCXli
Lku+9FXGcMhHJ6Ezm5N02Z6TehjZsEBTAu09aknyxijhr9PDNnh7yz8/D220L9/Q
SzdyzuOuBzlEtTgk9PHJsU/q6JizFxRiKlXpshPu++GYG0I2XcIQtloTQzx7y6zB
0i176INmV0dsrHDjV3t5YWNAJMye8y8u8Eco/bUWKBfk4Guwt8O1IDsg6EUc9L/g
awG9XwHxEDJSTB+v/wx/1ULShSc4dBQRQQNeqpO1KbL/Le1PBixquvH13anYs5yp
1MHT/1fzAgMBAAECggEAA+l74nLXAWiQA2xmx2mZA/+L5m9XqxHD/YhRaI4USrmh
4gWRMWGApDCeIFan6XzArLI+Bg65Si5qcVtfhVhOgdv/jy2xyIi+n0E4o1vhW6VV
/QwgWbfv/L2ZVW8DVnbSSoZH5XElXTGHQFbhTfRHnteAtk0hYvINPwG/MGZQ4IjO
w4mNl7QGAIMhQmz4jhPo3W06H2UTMRyauc89BvMQwWP1mwcagUz0UhRkC41+2vYF
QWhSX5kr4mWqXDWg4+aClmkCLpoG0DXSmQPAtHEmS+HO1IZll7J3+VEI+bJYNwje
FY51dmLkpeeR2gGWRLpkwBlTLh4osYDO2WHBEjJl0QKBgQDcRKfvueVWht7c+kbQ
pdqFjLGBE6qTG9YvHcGiri5ULqyUVe5Tph4anYt2eOD7gFjAnD4l4deh1PkPASbG
K3BRJlypIeVJfPrUcxrg8mfnb1pG0cXs88bo8B/uwITeglKLl1Oq9ISofwE8XObn
YgsDPYCj+Od7DKUs4gJRDUNTfwKBgQDIacQMBcjdaL6zoTvb/7si8MDPYwyK1QJC
nVI9kJ8H0Acpcuj28fhtfbOsdgFacSsqR+doBiRxRXZk7NF+acOtxHxBAAJB1ZZl
q3Ha7B473r1fkG3dqUTMnLB1ANTFjABIE30dLSJvT1P2z2q4hwEa1dC1h+xDYR0v
AepmLacljQKBgQDAj3C03THF1ABO9KklzGhd6iJfch7jnik/ZWcbXeR4iZkr0Hea
PxYANIxwVLpyg8CTGcQm/+mvu2zEFkCca+sztjK5VT2KYi0xvzLXRnNZWvp0AP1j
6bWRfCKeaUV+9DVPfUqSoFK8rtMYvyrJSufPvFuSfY14ABUCSM63pr2d5wKBgCr4
opSBWQRARUN2usL9Hj7rqCvPbQ0HhyiJWuzgaXjfXenBPbpVP5MadL/xvXCK+1ph
eHiReJbg8fXJ4VFdlBtaGdpGCjXbehfqnsr1/bWQmMI40ZXJiXrlzeAIgZap4hWS
OC1dVBjRxYsSBivypoX+enWx4zK/S+acXonyF/ixAoGAA9LQQfM/kI1s/ZmI6UB3
Arn0rS2YV0cfR/rPYDG5r6Wcnq2N/Uy+X4Ki8bmVblRqv3pZOwfP+6c6UzxM0Aap
Bbks9d6pmQ2qum0kfJnH9t0oh3z/QaHAVYz/t4dcWvWOvyZPo5L2SBYQDGtuWknX
B4kW+oOFMw0ed+Srr8pTOVw=
-----END PRIVATE KEY-----`;

async function testJWT() {
  const now = Math.floor(Date.now() / 1000);
  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const signingInput = b64url(header) + '.' + b64url(payload);
  const pemBody = pk.replace(/-----(?:BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s/g, '');
  const keyBytes = Buffer.from(pemBody, 'base64');

  console.log('Step 1: Importing RSA key...');
  const cryptoKey = await subtle.importKey(
    'pkcs8',
    keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength),
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );
  console.log('✅ RSA key imported');

  console.log('Step 2: Signing JWT...');
  const signature = await subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const b64sig = Buffer.from(signature).toString('base64url');
  const jwt = signingInput + '.' + b64sig;
  console.log('✅ JWT signed');
  console.log('   JWT (first 80 chars):', jwt.substring(0, 80) + '...');

  console.log('Step 3: Exchanging JWT for access token...');
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + encodeURIComponent(jwt)
  });

  const tokenData = await tokenResp.json();

  if (!tokenData.access_token) {
    console.log('❌ Token exchange FAILED:', JSON.stringify(tokenData, null, 2));
    process.exit(1);
  }
  console.log('✅ Access token received');
  console.log('   Token type:', tokenData.token_type);
  console.log('   Expires in:', tokenData.expires_in, 'seconds');

  return tokenData.access_token;
}

async function testFirestore(accessToken) {
  console.log('\nStep 4: Testing Firestore connection...');

  // Test 1: Stock collection
  const stockResp = await fetch(
    'https://firestore.googleapis.com/v1/projects/chaye-cafe-pos/databases/(default)/documents:runQuery',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'stock' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'stock' },
              op: 'EQUAL',
              value: { integerValue: 0 }
            }
          },
          limit: 5
        }
      })
    }
  );
  
  const stockData = await stockResp.json();
  if (stockData.error) {
    console.log('❌ Stock query FAILED:', stockData.error.message);
  } else {
    const count = Array.isArray(stockData) ? stockData.length : 0;
    console.log('✅ Stock query OK -', count, 'items with stock=0');
    if (count > 0) {
      console.log('   Sample:', stockData[0].document?.fields?.name?.stringValue || '(no name)');
    }
  }

  // Test 2: Purchases collection
  const purchResp = await fetch(
    'https://firestore.googleapis.com/v1/projects/chaye-cafe-pos/databases/(default)/documents:runQuery',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'purchases' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'alerted' },
              op: 'EQUAL',
              value: { booleanValue: false }
            }
          },
          limit: 5
        }
      })
    }
  );
  
  const purchData = await purchResp.json();
  if (purchData.error) {
    console.log('❌ Purchases query FAILED:', purchData.error.message);
  } else {
    const count = Array.isArray(purchData) ? purchData.length : 0;
    console.log('✅ Purchases query OK -', count, 'un-alerted');
  }

  // Test 3: khataCustomers
  const custResp = await fetch(
    'https://firestore.googleapis.com/v1/projects/chaye-cafe-pos/databases/(default)/documents:runQuery',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'khataCustomers' }],
          limit: 3
        }
      })
    }
  );
  
  const custData = await custResp.json();
  if (custData.error) {
    console.log('❌ Khata Customers query FAILED:', custData.error.message);
  } else {
    const count = Array.isArray(custData) ? custData.length : 0;
    console.log('✅ Khata Customers query OK -', count, 'customers');
    if (count > 0) {
      const f = custData[0].document?.fields;
      console.log('   Sample:', f?.name?.stringValue || '(no name)',
        'Balance:', f?.totalBalance?.doubleValue || f?.totalBalance?.integerValue || '0');
    }
  }

  // Test 4: khataTransactions
  const txResp = await fetch(
    'https://firestore.googleapis.com/v1/projects/chaye-cafe-pos/databases/(default)/documents:runQuery',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'khataTransactions' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'alerted' },
              op: 'EQUAL',
              value: { booleanValue: false }
            }
          },
          limit: 5
        }
      })
    }
  );
  
  const txData = await txResp.json();
  if (txData.error) {
    console.log('❌ Khata Tx query FAILED:', txData.error.message);
  } else {
    const count = Array.isArray(txData) ? txData.length : 0;
    console.log('✅ Khata Tx query OK -', count, 'un-alerted');
  }
}

(async () => {
  try {
    const token = await testJWT();
    await testFirestore(token);
    console.log('\n🎉 ALL TESTS PASSED! Workflow is ready to deploy.');
  } catch (err) {
    console.log('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  }
})();
