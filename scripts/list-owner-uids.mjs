/**
 * chaye-cafe-pos — List users & owner UIDs
 *
 * Reads the `users` collection (admin SDK, custom DB id) and prints every doc
 * with its role/username, highlighting role=="owner" UIDs. Those UIDs get
 * pinned into firestore.rules isOwner() and src/lib/config.ts OWNER_UIDS.
 *
 * Usage: node scripts/list-owner-uids.mjs
 * Prereq: serviceAccount.json in project ROOT + firebase-applet-config.json
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KEY_PATH = resolve(ROOT, 'serviceAccount.json');
const appConfig = JSON.parse(readFileSync(resolve(ROOT, 'firebase-applet-config.json'), 'utf8'));
const PROJECT_ID = appConfig.projectId;
const DATABASE_ID = appConfig.firestoreDatabaseId; // custom DB id — critical, NOT "(default)"

const serviceAccount = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
const app = admin.initializeApp({ credential: admin.cert(serviceAccount) });

// Firestore Admin SDK named-database access (v12+)
const namedDb = getFirestore(app, DATABASE_ID);

const snap = await namedDb.collection('users').get();
if (snap.empty) {
  console.log('users collection is EMPTY.');
} else {
  console.log(`users collection (${snap.size} docs) — DB: ${DATABASE_ID}\n`);
  const owners = [];
  snap.forEach((d) => {
    const u = d.data();
    const role = u.role ?? '—';
    const user = u.username ?? '—';
    const updated = u.updatedAt ?? '—';
    console.log(`  ${role.padEnd(9)} | ${String(user).padEnd(12)} | updated: ${updated} | uid: ${d.id}`);
    if (role === 'owner') owners.push(d.id);
  });
  console.log(`\nOWNER UIDs (pin these into firestore.rules + src/lib/config.ts):`);
  owners.forEach((uid) => console.log(`  - ${uid}`));
  if (owners.length === 0) console.log('  (none found — role docs may be missing!)');
}

process.exit(0);
