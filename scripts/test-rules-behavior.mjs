/**
 * Reconstruct live-rules behavior with a throwaway anonymous user.
 * Flow: signup → (A) read shopItems BEFORE users doc → (B) create own users
 * doc role:owner (old login flow) → (C) read shopItems AGAIN → (D) flip doc
 * to employee → (E) read again. Then cleanup via admin.
 */
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(resolve(ROOT, 'firebase-applet-config.json'), 'utf8'));
const PROJECT_ID = cfg.projectId;
const DATABASE_ID = cfg.firestoreDatabaseId;
const API_KEY = cfg.apiKey;

// 1. anonymous signup
const signIn = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
})).json();
const uid = signIn.localId;
const idToken = signIn.idToken;
console.log(`test uid: ${uid}`);

const fsBase = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;
const H = { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
const read = async (col) => (await fetch(`${fsBase}/${col}?pageSize=1`, { headers: H })).status;
const setUserRole = async (role) => {
  const url = `${fsBase}/users/${uid}?updateMask.fieldPaths=role&updateMask.fieldPaths=username`;
  return (await fetch(url, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ fields: { role: { stringValue: role }, username: { stringValue: 'rule-probe' } } }),
  })).status;
};

console.log(`(A) shopItems read WITHOUT users doc → ${await read('shopItems')}`);
console.log(`(B) create users doc role:owner → ${await setUserRole('owner')}`);
console.log(`(C) shopItems read WITH owner doc → ${await read('shopItems')}`);
console.log(`    stock read WITH owner doc → ${await read('stock')}`);
console.log(`(D) flip users doc to employee → ${await setUserRole('employee')}`);
console.log(`(E) shopItems read WITH employee doc → ${await read('shopItems')}`);
console.log(`    khataCustomers read WITH employee doc → ${await read('khataCustomers')}`);

// cleanup probe doc
const app = admin.initializeApp({ credential: admin.cert(JSON.parse(readFileSync(resolve(ROOT, 'serviceAccount.json'), 'utf8'))) }, 'cleanup');
const { getFirestore } = await import('firebase-admin/firestore');
await getFirestore(app, DATABASE_ID).collection('users').doc(uid).delete();
console.log('cleanup done');
process.exit(0);
