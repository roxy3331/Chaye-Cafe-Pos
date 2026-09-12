/**
 * Read the LIVE Firestore rules releases (including named DBs) via the
 * Firebase Rules API. Read-only.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JWT } from 'google-auth-library';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(resolve(ROOT, 'firebase-applet-config.json'), 'utf8'));
const PROJECT_ID = cfg.projectId;
const creds = JSON.parse(readFileSync(resolve(ROOT, 'serviceAccount.json'), 'utf8'));

const client = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/firebase.rules'],
});
const { token } = await client.getAccessToken();
const H = { Authorization: `Bearer ${token}` };

const base = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}`;
const relRes = await fetch(`${base}/releases`, { headers: H });
const rel = await relRes.json();
console.log(`HTTP ${relRes.status}`);
if (!rel.releases) {
  console.log(JSON.stringify(rel).slice(0, 400));
  process.exit(1);
}

for (const r of rel.releases) {
  console.log(`\n=== RELEASE: ${r.name} → ${r.rulesetName} ===`);
  const rsName = r.rulesetName.split('/').pop();
  const rsRes = await fetch(`${base}/rulesets/${rsName}`, { headers: H });
  const rs = await rsRes.json();
  for (const f of rs.source?.files || []) {
    const content = f.content || '';
    console.log(`--- file: ${f.name} (${content.length} chars) ---`);
    // print first 60 lines
    content.split('\n').slice(0, 60).forEach(l => console.log('  ' + l));
    if (content.split('\n').length > 60) console.log('  …(truncated)');
  }
}
process.exit(0);
