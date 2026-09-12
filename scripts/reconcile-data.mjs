/**
 * chaye-cafe-pos — Data Reconciliation Script
 *
 * Recomputes Khata customer balances from their transactions and normalizes
 * stock numeric fields, against the Firestore database that backs the POS app.
 *
 * Safety model:
 *   1. BACKUP runs first and cannot be skipped. If it fails, nothing is mutated.
 *   2. DRY-RUN is the default. Review the report, then re-run with --apply.
 *   3. Only docs that actually differ are written (minimal churn, full report).
 *
 * Balance rule (mirrors the app, dataService.addKhataTransaction):
 *   totalBalance = sum(credit amounts) − sum(payment amounts)
 *
 * Usage:
 *   node scripts/reconcile-data.mjs                  # backup + dry-run report (NO writes)
 *   node scripts/reconcile-data.mjs --apply          # backup + dry-run report + WRITE
 *   node scripts/reconcile-data.mjs --skip-khata     # ignore Khata (stock only)
 *   node scripts/reconcile-data.mjs --skip-stock     # ignore Stock (khata only)
 *
 * Prerequisites:
 *   - Download a Firebase service-account key JSON from
 *       Firebase Console → Project settings → Service accounts → Generate new private key
 *   - Save it as `serviceAccount.json` in the project ROOT (next to package.json).
 *   - It is gitignored — do NOT commit it.
 */

import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Paths ───────────────────────────────────────────────────────────────────
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KEY_PATH = resolve(ROOT, 'serviceAccount.json');
const BACKUP_DIR = resolve(ROOT, 'scripts', 'data');

// ─── Config read from the app's own config so projectId/db match exactly ──────
const appConfig = JSON.parse(readFileSync(resolve(ROOT, 'firebase-applet-config.json'), 'utf8'));
const PROJECT_ID = appConfig.projectId;
const DATABASE_ID = appConfig.firestoreDatabaseId; // custom DB id — critical, NOT "(default)"

// ─── CLI flags ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const SKIP_KHATA = argv.includes('--skip-khata');
const SKIP_STOCK = argv.includes('--skip-stock');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const c = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
};

// Coerce any stored value into a finite number (NaN/undefined/string → fallback).
// Mirrors the normalizeStock() helper used by the app's dataService.
const toNum = (v, fallback = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const banner = (title) => console.log(`\n${c.bold(c.cyan('═══ ' + title + ' ═══'))}`);
const fmt = (n) => (typeof n === 'number' && Number.isFinite(n)) ? n.toLocaleString('en-PK') : String(n);

// ─── 1. Init admin app, targeting the custom database ─────────────────────────
function initAdmin() {
  if (!existsSync(KEY_PATH)) {
    console.error(c.red(`\n✗ serviceAccount.json not found at:\n  ${KEY_PATH}\n`));
    console.error(c.dim('Download it from Firebase Console → Project settings → Service accounts → Generate new private key'));
    console.error(c.dim('and save it as serviceAccount.json in the project root.\n'));
    process.exit(1);
  }

  const serviceAccount = JSON.parse(readFileSync(KEY_PATH, 'utf8'));

  if (serviceAccount.project_id && serviceAccount.project_id !== PROJECT_ID) {
    console.warn(c.yellow(`\n⚠ Key project_id ("${serviceAccount.project_id}") does not match app projectId ("${PROJECT_ID}"). Proceeding anyway — verify this is intended.\n`));
  }

  const app = admin.initializeApp({
    credential: admin.cert(serviceAccount),
    projectId: PROJECT_ID,
  });

  // Target the NAMED database (not "(default)"). firebase-admin v14 exposes this via
  // the getFirestore(app, databaseId) function — there is no .databaseId() method.
  const db = getFirestore(app, DATABASE_ID || '(default)');
  return { app, db };
}

async function fetchAll(db, collectionName) {
  const snap = await db.collection(collectionName).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── PHASE A — BACKUP (mandatory, first) ──────────────────────────────────────
async function phaseBackup(db) {
  banner('PHASE A — BACKUP');
  console.log(c.dim(`Writing to ${BACKUP_DIR} ...`));

  const ts = new Date();
  const stamp = ts.toISOString().replace(/[:T]/g, '-').slice(0, 16); // YYYY-MM-DD-HHMM
  mkdirSync(BACKUP_DIR, { recursive: true });

  const collections = ['khataCustomers', 'khataTransactions', 'stock'];
  const backup = { exportedAt: ts.toISOString(), projectId: PROJECT_ID, databaseId: DATABASE_ID, data: {} };

  for (const name of collections) {
    const docs = await fetchAll(db, name);
    backup.data[name] = docs;
    console.log(`  ${name.padEnd(20)} ${c.green(docs.length + ' docs')}`);
  }

  const backupPath = resolve(BACKUP_DIR, `backup-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(c.green(`\n✓ Backup written: ${backupPath}`));
  console.log(c.dim('  (If anything goes wrong, restore from this file.)'));
  return backupPath;
}

// ─── Compute planned Khata changes (shared by dry-run & apply) ────────────────
function planKhataChanges(customers, transactions) {
  // Group transactions by customerId
  const txByCustomer = new Map();
  for (const tx of transactions) {
    const cid = tx.customerId;
    if (!cid) continue;
    if (!txByCustomer.has(cid)) txByCustomer.set(cid, []);
    txByCustomer.get(cid).push(tx);
  }

  const changes = [];
  let skippedCorrupt = 0;

  for (const cust of customers) {
    const txs = txByCustomer.get(cust.id) || [];

    let credits = 0, payments = 0, validTx = 0, invalidTx = 0;
    for (const tx of txs) {
      const amt = toNum(tx.amount, null);
      if (amt === null) { invalidTx++; skippedCorrupt++; continue; }
      if (tx.type === 'payment') payments += amt;
      else credits += amt; // 'credit' (and any unknown type treated as credit, matching app's else-branch safety)
      validTx++;
    }

    const newBalance = credits - payments;
    const oldBalance = toNum(cust.totalBalance, 0);
    const delta = newBalance - oldBalance;

    changes.push({
      id: cust.id,
      name: cust.name || '(unnamed)',
      oldBalance,
      newBalance,
      delta,
      willChange: Math.abs(delta) > 0.009, // ignore sub-paisa float noise
      txCount: txs.length,
      validTx,
      invalidTx,
    });
  }

  return { changes, skippedCorrupt };
}

// ─── Compute planned Stock changes (shared by dry-run & apply) ────────────────
function planStockChanges(stockDocs) {
  const changes = [];
  for (const item of stockDocs) {
    const old = {
      stock: item.stock,
      pcsPerPack: item.pcsPerPack,
      averageBuy: item.averageBuy,
      currentSell: item.currentSell,
    };
    const newVal = {
      stock: toNum(item.stock, 0),
      pcsPerPack: toNum(item.pcsPerPack, 0) || 1, // never 0 — would divide-by-zero downstream
      averageBuy: toNum(item.averageBuy, 0),
      currentSell: toNum(item.currentSell, 0),
    };

    const differs = (k) => old[k] !== newVal[k];
    const willChange = differs('stock') || differs('pcsPerPack') || differs('averageBuy') || differs('currentSell');

    changes.push({ id: item.id, name: item.name || '(unnamed)', old, new: newVal, willChange });
  }
  return changes;
}

// ─── PHASE B — DRY-RUN REPORT ─────────────────────────────────────────────────
function phaseReport(khataPlan, stockPlan) {
  banner('PHASE B — DRY-RUN REPORT (no writes)');

  if (!SKIP_KHATA) {
    console.log(c.bold('\nKhata — balance recompute:'));
    const kChanges = khataPlan.changes;
    const kToFix = kChanges.filter(c => c.willChange);
    const totalCusts = kChanges.length;
    console.log(`  Customers total:        ${totalCusts}`);
    console.log(`  Already correct:        ${c.green((totalCusts - kToFix.length) + ' (no change)')}`);
    console.log(`  Need rebalance:         ${c.yellow(kToFix.length + '')}`);
    console.log(`  Corrupt tx amounts:     ${khataPlan.skippedCorrupt > 0 ? c.red(khataPlan.skippedCorrupt + '') : '0'}`);

    if (kToFix.length > 0) {
      console.log(c.bold('\n  Customers that will change:'));
      const show = kToFix.slice(0, 25);
      for (const ch of show) {
        const sign = ch.delta > 0 ? c.yellow('▲') : c.green('▼');
        const invalidTag = ch.invalidTx > 0 ? c.red(` (${ch.invalidTx} bad tx)`) : '';
        console.log(`    ${sign} ${ch.name.padEnd(22).slice(0, 22)}  ${fmt(ch.oldBalance).padStart(12)} → ${fmt(ch.newBalance).padStart(12)}  Δ${fmt(ch.delta).padStart(10)}${invalidTag}`);
      }
      if (kToFix.length > show.length) console.log(c.dim(`    ...and ${kToFix.length - show.length} more`));
    }
  } else {
    console.log(c.dim('\n  (Khata skipped via --skip-khata)'));
  }

  if (!SKIP_STOCK) {
    console.log(c.bold('\nStock — numeric normalization:'));
    const sToFix = stockPlan.filter(c => c.willChange);
    const totalItems = stockPlan.length;
    console.log(`  Stock docs total:       ${totalItems}`);
    console.log(`  Already clean:          ${c.green((totalItems - sToFix.length) + ' (no change)')}`);
    console.log(`  Need normalization:     ${c.yellow(sToFix.length + '')}`);

    if (sToFix.length > 0) {
      console.log(c.bold('\n  Stock docs that will change:'));
      const show = sToFix.slice(0, 25);
      for (const ch of show) {
        const fields = ['stock', 'pcsPerPack', 'averageBuy', 'currentSell']
          .filter(k => ch.old[k] !== ch.new[k])
          .map(k => `${k}: ${JSON.stringify(ch.old[k])}→${ch.new[k]}`)
          .join(', ');
        console.log(`    ⚙ ${ch.name.padEnd(22).slice(0, 22)}  ${c.dim(fields)}`);
      }
      if (sToFix.length > show.length) console.log(c.dim(`    ...and ${sToFix.length - show.length} more`));
    }
  } else {
    console.log(c.dim('\n  (Stock skipped via --skip-stock)'));
  }
}

// ─── PHASE C — APPLY (only with --apply) ──────────────────────────────────────
async function phaseApply(db, khataPlan, stockPlan) {
  banner('PHASE C — APPLY (writing changes)');

  if (!APPLY) {
    console.log(c.yellow('\n  DRY-RUN mode — no writes performed.'));
    console.log(c.dim('  Review the report above. If it looks right, re-run with --apply.'));
    return { khataWritten: 0, stockWritten: 0 };
  }

  console.log(c.red('\n  ⚠ APPLY mode — writing to Firestore now...'));
  let khataWritten = 0, stockWritten = 0;

  // Khata: batched updates, max 450 per batch (Firestore limit is 500; leave headroom).
  if (!SKIP_KHATA) {
    const toFix = khataPlan.changes.filter(c => c.willChange);
    console.log(`\n  Khata: writing ${toFix.length} customer balance(s)...`);
    let batch = db.batch();
    let inBatch = 0;
    for (const ch of toFix) {
      batch.update(db.collection('khataCustomers').doc(ch.id), {
        totalBalance: ch.newBalance,
        reconciledAt: FieldValue.serverTimestamp(),
      });
      inBatch++;
      khataWritten++;
      if (inBatch >= 450) { await batch.commit(); batch = db.batch(); inBatch = 0; }
    }
    if (inBatch > 0) await batch.commit();
    console.log(c.green(`  ✓ Khata: ${khataWritten} balance(s) updated.`));
  }

  // Stock: batched updates, only the 4 numeric fields.
  if (!SKIP_STOCK) {
    const toFix = stockPlan.filter(c => c.willChange);
    console.log(`\n  Stock: writing ${toFix.length} normalization(s)...`);
    let batch = db.batch();
    let inBatch = 0;
    for (const ch of toFix) {
      batch.update(db.collection('stock').doc(ch.id), {
        stock: ch.new.stock,
        pcsPerPack: ch.new.pcsPerPack,
        averageBuy: ch.new.averageBuy,
        currentSell: ch.new.currentSell,
      });
      inBatch++;
      stockWritten++;
      if (inBatch >= 450) { await batch.commit(); batch = db.batch(); inBatch = 0; }
    }
    if (inBatch > 0) await batch.commit();
    console.log(c.green(`  ✓ Stock: ${stockWritten} doc(s) normalized.`));
  }

  return { khataWritten, stockWritten };
}

// ─── PHASE D — VERIFY ─────────────────────────────────────────────────────────
async function phaseVerify(db) {
  banner('PHASE D — VERIFY (re-read sample)');
  if (!APPLY) { console.log(c.dim('  Skipped (dry-run).')); return; }

  // Re-read first 5 customers + all stock and print a sample to confirm writes landed.
  const custSnap = await db.collection('khataCustomers').limit(5).get();
  console.log(c.bold('\n  Sample customers (post-write):'));
  for (const d of custSnap.docs) {
    const data = d.data();
    console.log(`    ${(data.name || '(unnamed)').padEnd(22).slice(0, 22)}  totalBalance = ${fmt(toNum(data.totalBalance, 0))}`);
  }

  const stockSnap = await db.collection('stock').limit(5).get();
  console.log(c.bold('\n  Sample stock (post-write):'));
  for (const d of stockSnap.docs) {
    const data = d.data();
    console.log(`    ${(data.name || '(unnamed)').padEnd(22).slice(0, 22)}  stock=${toNum(data.stock,0)} pcsPerPack=${toNum(data.pcsPerPack,0)||1} avgBuy=${toNum(data.averageBuy,0)} sell=${toNum(data.currentSell,0)}`);
  }
  console.log(c.green('\n  ✓ Verify complete. Compare against the dry-run report above.'));
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(c.bold(c.cyan('\n╔══════════════════════════════════════════════════╗')));
  console.log(c.bold(c.cyan('║   chaye-cafe-pos — Data Reconciliation Script    ║')));
  console.log(c.bold(c.cyan('╚══════════════════════════════════════════════════╝')));
  console.log(`  Project : ${PROJECT_ID}`);
  console.log(`  Database: ${DATABASE_ID || '(default)'}`);
  console.log(`  Mode    : ${APPLY ? c.red('APPLY (will write)') : c.green('DRY-RUN (no writes)')}`);
  if (SKIP_KHATA) console.log(`  ${c.yellow('— Khata skipped')}`);
  if (SKIP_STOCK) console.log(`  ${c.yellow('— Stock skipped')}`);

  const { app, db } = initAdmin();

  // Pull all data ONCE (used by both report & apply so they're consistent).
  banner('FETCHING DATA');
  const [customers, transactions, stockDocs] = await Promise.all([
    SKIP_KHATA ? Promise.resolve([]) : fetchAll(db, 'khataCustomers'),
    SKIP_KHATA ? Promise.resolve([]) : fetchAll(db, 'khataTransactions'),
    SKIP_STOCK ? Promise.resolve([]) : fetchAll(db, 'stock'),
  ]);
  console.log(`  khataCustomers:     ${customers.length}`);
  console.log(`  khataTransactions:  ${transactions.length}`);
  console.log(`  stock:              ${stockDocs.length}`);

  // A — backup first (always)
  await phaseBackup(db);

  // Compute plans once
  const khataPlan = SKIP_KHATA ? { changes: [], skippedCorrupt: 0 } : planKhataChanges(customers, transactions);
  const stockPlan = SKIP_STOCK ? [] : planStockChanges(stockDocs);

  // B — report
  phaseReport(khataPlan, stockPlan);

  // C — apply (only if --apply)
  const { khataWritten, stockWritten } = await phaseApply(db, khataPlan, stockPlan);

  // D — verify
  await phaseVerify(db);

  // Summary
  banner('SUMMARY');
  if (APPLY) {
    console.log(c.green(`  ✓ Khata balances updated: ${khataWritten}`));
    console.log(c.green(`  ✓ Stock docs normalized:  ${stockWritten}`));
    console.log(c.dim('  A backup was saved under scripts/data/ before any writes.'));
  } else {
    console.log(c.yellow('  Dry-run complete. Nothing was written.'));
    const kFix = khataPlan.changes.filter(c => c.willChange).length;
    const sFix = stockPlan.filter(c => c.willChange).length;
    console.log(`  Would update: ${kFix} Khata + ${sFix} Stock`);
    console.log(c.dim('  To write for real, re-run:  node scripts/reconcile-data.mjs --apply'));
  }

  await app.delete();
  console.log(c.dim('\n  Done.\n'));
}

main().catch(async (err) => {
  console.error(c.red('\n✗ Script failed:'), err);
  try { await admin.app().delete(); } catch {}
  process.exit(1);
});
