// Rebuilds the Generate Token node's jsCode with proper JSON escaping.
// Run: node _build_jwt_node.js
const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('./n8n-workflow-PRODUCTION.json', 'utf8'));
const sa = JSON.parse(fs.readFileSync('./serviceAccount.json', 'utf8'));

const jwtCode = `const email = ${JSON.stringify(sa.client_email)};
const pk = ${JSON.stringify(sa.private_key)};

const crypto = require('crypto');
const now = Math.floor(Date.now() / 1000);

const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss: email,
  scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 3600
})).toString('base64url');

const signingInput = header + '.' + payload;
const sign = crypto.createSign('RSA-SHA256');
sign.update(signingInput);
const signature = sign.sign(pk, 'base64url');
const jwt = signingInput + '.' + signature;

const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + encodeURIComponent(jwt)
});

const tokenData = await tokenResp.json();
if (!tokenData.access_token) {
  throw new Error('JWT exchange failed: ' + JSON.stringify(tokenData));
}

return [{ json: { accessToken: tokenData.access_token } }];
`;

const idx = wf.nodes.findIndex(n => n.id === 'gen-token');
wf.nodes[idx].parameters.jsCode = jwtCode;
fs.writeFileSync('./n8n-workflow-PRODUCTION.json', JSON.stringify(wf, null, 2));
console.log('JWT node updated. Code length:', jwtCode.length);

// Verify the saved JSON still parses
const check = JSON.parse(fs.readFileSync('./n8n-workflow-PRODUCTION.json', 'utf8'));
const savedCode = check.nodes[idx].parameters.jsCode;
console.log('Saved code first line:', savedCode.split('\n')[0]);
console.log('Contains crypto.createSign:', savedCode.includes('crypto.createSign'));
console.log('No literal newlines in key:', !savedCode.includes('-----BEGIN PRIVATE KEY-----\nMIIE'));
console.log('Has proper escape:', savedCode.includes('-----BEGIN PRIVATE KEY-----\\nMIIE'));
