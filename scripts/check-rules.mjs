/**
 * Live rules + end-to-end access check (read-only tests + one harmless
 * anonymous sign-in like the app does).
 * 1. What Firestore rules release is live for the named DB?
 * 2. Anonymous sign-in via REST (app ka exact flow)
 * 3. shopItems read allowed?  users-doc write (old Login behavior) allowed?
 */
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appConfig = JSON.parse(readFileSync(resolve(ROOT, 'firebase-applet-config.json'), 'utf8'));
const PROJECT_ID = appConfig.projectId;
const DATABASE_ID = appConfig.firestoreDatabaseId;
const API_KEY = appConfig.apiKey;

const creds = JSON.parse(readFileSync(resolve(ROOT, 'serviceAccount.json'), 'utf8'));
const app = admin.initializeApp({ credential: admin.cert(creds) });

// ── 1. List rules releases (what's live?) ──────────────────────────────────
const accessToken = await app.options.credential.getAccessToken();
const tok = accessToken.accessToken;
const listRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`, {
  headers: { Authorization: `Bearer ${tok}` },
});
const releases = await listRes.json();
console.log('=== RULES RELEASES (live) ===');
if (!releases.releases) console.log('  none / error:', JSON.stringify(releases).slice(0, 200));
for (const r of releases.releases || []) {
  console.log(`  ${r.name} → ${r.rulesetName}`);
}

// Show the SOURCE of each release (first 40 lines of rules) so we can tell
// old vs new (new = has pinned UIDs / "role == 'employee'")
for (const r of releases.releases || []) {
  const rulesetName = r.rulesetName.split('/').pop();
  const srcRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets/${rulesetName}`, {
    headers: { Authorization: `Bearer ${tok}` },
  });
  const ruleset = await srcRes.json();
  const src = (ruleset.source?.files || []).map(f => f.content).join('\n');
  const hasPinned = src.includes("request.auth.uid in [");
  const hasEmployeeOnly = src.includes("role == 'employee'");
  console.log(`  ${r.name}: ${src.length} chars · pinnedUIDs:${hasPinned} · employeeOnlyCreate:${hasEmployeeOnly}`);
}

// ── 2. Anonymous sign-in (exact app flow) ──────────────────────────────────
console.log('\n=== ANONYMOUS AUTH TEST ===');
const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ returnSecureToken: true }),
});
const signIn = await signInRes.json();
if (!signIn.idToken) {
  console.log('  SIGN-IN FAILED:', JSON.stringify(signIn).slice(0, 300));
  process.exit(1);
}
const uid = signIn.localId;
console.log(`  sign-up OK (test uid: ${uid.slice(0, 8)}…)`);

// ── 3. Firestore REST tests against the NAMED db ───────────────────────────
const fsBase = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;
const fsHeaders = { Authorization: `Bearer ${signIn.idToken}`, 'Content-Type': 'application/json' };

// 3a. read shopItems (limit 1)
const readRes = await fetch(`${fsBase}/shopItems?pageSize=1`, { headers: fsHeaders });
console.log(`\nshopItems READ → ${readRes.status} ${readRes.ok ? '✅ (data dikh sakta hai)' : '❌ DENIED'}`);
if (!readRes.ok) console.log((await readRes.text()).slice(0, 200));

// 3b. read khataCustomers
const kRead = await fetch(`${fsBase}/khataCustomers?pageSize=1`, { headers: fsHeaders });
console.log(`khataCustomers READ → ${kRead.status} ${kRead.ok ? '✅' : '❌ DENIED'}`);

// 3c. OLD Login behavior: write own users doc with role owner (setDoc merge)
const writeRes = await fetch(`${fsBase}/users/${uid}?updateMask.fieldPaths=role&updateMask.fieldPaths=username&updateMask.fieldPaths=updatedAt`, {
  method: 'PATCH', headers: fsHeaders,
  body: JSON.stringify({ fields: {
    role: { stringValue: 'owner' },
    username: { stringValue: 'rule-test' },
    updatedAt: { timestampValue: new Date().toISOString() },
  } }),
});
console.log(`users WRITE (old login flow, role:owner) → ${writeRes.status} ${writeRes.ok ? '✅ allowed (old rules live — sab theek)' : '❌ DENIED (naye rules live hain!)'}`);

// cleanup test doc if created
if (writeRes.ok) {
  const adm = admin.firestore();
  // note: admin default db doesn't exist; use named
  const named = (await import('firebase-admin/firestore')).getFirestore(app, DATABASE_ID);
  await named.collection('users').doc(uid).delete();
  console.log('  (test doc cleaned up)');
}

process.exit(0);
