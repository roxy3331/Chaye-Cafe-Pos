/**
 * Firebase Rules API helper — manual RS256 JWT (no google-auth-library).
 * Usage:
 *   node scripts/rules-api.mjs list              → list releases + rules content
 *   node scripts/rules-api.mjs publish <file> <releaseName>  → publish rules file to release
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_ID = JSON.parse(readFileSync(resolve(ROOT, 'firebase-applet-config.json'), 'utf8')).projectId;
const SA = JSON.parse(readFileSync(resolve(ROOT, 'serviceAccount.json'), 'utf8'));

// ── manual JWT ──────────────────────────────────────────────────────────────
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
const claims = b64u(JSON.stringify({
  iss: SA.client_email,
  scope: 'https://www.googleapis.com/auth/firebase.rules',
  aud: SA.token_uri,
  iat: now,
  exp: now + 3600,
}));
const signature = b64u(crypto.createSign('RSA-SHA256')
  .update(`${header}.${claims}`)
  .sign(SA.private_key.replace(/\\n/g, '\n')));
const assertion = `${header}.${claims}.${signature}`;

const tokenRes = await fetch(SA.token_uri, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
});
const tokenJson = await tokenRes.json();
if (!tokenJson.access_token) {
  console.error('TOKEN FAILED:', JSON.stringify(tokenJson).slice(0, 300));
  process.exit(1);
}
const TOKEN = tokenJson.access_token;
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const BASE = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}`;

// ── commands ────────────────────────────────────────────────────────────────
const [cmd, fileArg, releaseArg] = process.argv.slice(2);

if (cmd === 'list') {
  const res = await fetch(`${BASE}/releases`, { headers: H });
  const rel = await res.json();
  console.log(`releases HTTP ${res.status}`);
  for (const r of rel.releases || []) {
    console.log(`\n=== RELEASE: ${r.name} → ${r.rulesetName}`);
    const rsName = r.rulesetName.split('/').pop();
    const rsRes = await fetch(`${BASE}/rulesets/${rsName}`, { headers: H });
    const rs = await rsRes.json();
    for (const f of rs.source?.files || []) {
      const content = f.content || '';
      console.log(`--- ${f.name} (${content.length} chars) — first 25 lines: ---`);
      content.split('\n').slice(0, 25).forEach(l => console.log('  ' + l));
    }
  }
  if (!rel.releases) console.log(JSON.stringify(rel).slice(0, 300));
  process.exit(0);
}

if (cmd === 'publish') {
  const content = readFileSync(resolve(process.cwd(), fileArg), 'utf8');
  // 1. create ruleset
  const rsRes = await fetch(`${BASE}/rulesets`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content, firebaseRuleset: true }] } }),
  });
  const rs = await rsRes.json();
  if (!rs.name) { console.error('RULESET FAILED:', JSON.stringify(rs).slice(0, 400)); process.exit(1); }
  console.log('ruleset created:', rs.name);
  // 2. point the release at it
  const relName = releaseArg; // full release resource name e.g. projects/x/releases/cloud.firestore(...)
  const updRes = await fetch(`${BASE}/releases/${encodeURIComponent(relName.split('/').pop())}`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ name: relName, rulesetName: rs.name }),
  });
  const upd = await updRes.json();
  console.log(`release update HTTP ${updRes.status}:`, JSON.stringify(upd).slice(0, 300));
  process.exit(0);
}

console.log('usage: list | publish <rulesFile> <fullReleaseName>');
process.exit(1);
