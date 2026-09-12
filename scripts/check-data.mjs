/**
 * Emergency data check — counts + recent docs per collection so we can see
 * whether data was actually deleted or just not visible in the app.
 * Read-only. Usage: node scripts/check-data.mjs
 */
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appConfig = JSON.parse(readFileSync(resolve(ROOT, 'firebase-applet-config.json'), 'utf8'));
const DATABASE_ID = appConfig.firestoreDatabaseId;

const app = admin.initializeApp({ credential: admin.cert(JSON.parse(readFileSync(resolve(ROOT, 'serviceAccount.json'), 'utf8'))) });
const db = getFirestore(app, DATABASE_ID);

const ts = (v) => {
  if (!v) return '—';
  const d = v.toDate ? v.toDate() : (v.seconds != null ? new Date(v.seconds * 1000) : new Date(v));
  return d.toISOString?.().slice(0, 16).replace('T', ' ') || String(v);
};

const collections = ['shopItems', 'shopPurchases', 'shopOrders', 'pubgItems', 'stock', 'purchases', 'sales', 'khataCustomers', 'khataTransactions', 'expenses', 'vendors', 'users'];

for (const col of collections) {
  const snap = await db.collection(col).get();
  console.log(`\n=== ${col} (${snap.size} docs) ===`);
  if (col === 'shopItems' || col === 'pubgItems') {
    snap.forEach((d) => {
      const x = d.data();
      console.log(`  ${String(x.name || '?').padEnd(28)} qty:${String(x.quantity ?? '?').padEnd(5)} invested:${String(Math.round(x.totalInvested || 0)).padEnd(7)} updated:${ts(x.updatedAt)}`);
    });
  } else if (col === 'users') {
    snap.forEach((d) => {
      const x = d.data();
      console.log(`  ${String(x.role).padEnd(9)} ${String(x.username || '').padEnd(10)} updated:${ts(x.updatedAt)} uid:${d.id}`);
    });
  } else if (snap.size > 0) {
    // newest 3 by date field if present
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (ts(b.date) > ts(a.date) ? 1 : -1)).slice(0, 3);
    docs.forEach((x) => console.log(`  recent: ${x.itemName || x.name || x.customerName || x.title || x.id} · ${ts(x.date)}`));
  }
}

// Also check the DEFAULT database — in case anything ever got written there by mistake
try {
  const def = getFirestore(app); // default DB
  const defShop = await def.collection('shopItems').get();
  console.log(`\n=== DEFAULT-DB shopItems (${defShop.size} docs) ===`);
} catch (e) {
  console.log('\nDEFAULT-DB check skipped:', e.message.slice(0, 80));
}

process.exit(0);
