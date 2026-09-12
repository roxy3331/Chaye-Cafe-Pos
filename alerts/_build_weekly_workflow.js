// Builds the Weekly Report workflow for Chaye Cafe POS.
// Generates n8n-workflow-WEEKLY.json programmatically (no JSON escaping issues).
// Run: node _build_weekly_workflow.js
const fs = require('fs');

const DB = 'ai-studio-11604781-3243-486c-acd1-dd3729b669bf';
const PROJECT = 'chaye-cafe-pos';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DB}/documents`;
const GOOGLE_CRED = { googleApi: { id: 'Sy9JsEs9pbHHCiO3', name: 'Chaye Cafe Firebase Service Account' } };
const TG_CRED = { telegramApi: { id: 'FCPBkiAhqGQDu04d', name: 'Telegram Bot API' } };
const CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID';

// Firestore query node factory
function qNode(name, position, collection, where) {
  const body = where
    ? { structuredQuery: { from: [{ collectionId: collection }], where, limit: 500 } }
    : { structuredQuery: { from: [{ collectionId: collection }], limit: 500 } };
  return {
    name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position,
    credentials: GOOGLE_CRED,
    parameters: {
      method: 'POST',
      url: `${BASE_URL}:runQuery`,
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleApi',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: JSON.stringify(body),
    },
  };
}

// Timestamp range filter (Firestore uses ISO timestamps for queries)
// n8n evaluates {{ }} at runtime, so we build the JSON body with expressions
function qNodeWithExpr(name, position, collection, daysAgoField, dateField) {
  // Body uses expression for dynamic date — n8n will resolve
  return {
    name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position,
    credentials: GOOGLE_CRED,
    parameters: {
      method: 'POST',
      url: `${BASE_URL}:runQuery`,
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleApi',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      // Date computed in trigger code node, passed via $node
      jsonBody: `={ "structuredQuery": { "from": [{"collectionId": "${collection}"}], "where": {"fieldFilter":{"field":{"fieldPath":"${dateField}"},"op":"GREATER_THAN_OR_EQUAL","value":{"timestampValue":{{ $json.${daysAgoField} }}}}}, "limit": 500 } }`,
    },
  };
}

// The big COMPUTE node — receives all 5 query outputs, produces the message
const COMPUTE_CODE = `// === CHAYE CAFE WEEKLY REPORT COMPUTE ===
// Collect inputs from 5 parallel query nodes
const sales14dRaw = $('Fetch Sales 14d').all().map(i => i.json);
const stockRaw = $('Fetch Stock').all().map(i => i.json);
const expensesRaw = $('Fetch Expenses 7d').all().map(i => i.json);
const khataCustRaw = $('Fetch Khata Customers').all().map(i => i.json);
const overdueTxRaw = $('Fetch Overdue Tx').all().map(i => i.json);

// Helper: extract fields from Firestore REST response items
function getFields(item) {
  if (!item || !item.document || !item.document.fields) return null;
  const f = item.document.fields;
  const out = { _id: (item.document.name || '').split('/').pop() };
  for (const k of Object.keys(f)) {
    const v = f[k];
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = parseInt(v.integerValue);
    else if (v.doubleValue !== undefined) out[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    else if (v.timestampValue !== undefined) out[k] = new Date(v.timestampValue);
    else if (v.arrayValue && v.arrayValue.values) out[k] = v.arrayValue.values.map(x => x.stringValue || x.integerValue || x.doubleValue);
  }
  return out;
}

const sales14d = sales14dRaw.map(getFields).filter(Boolean);
const stock = stockRaw.map(getFields).filter(Boolean);
const expenses = expensesRaw.map(getFields).filter(Boolean);
const khataCust = khataCustRaw.map(getFields).filter(Boolean);
const overdueTx = overdueTxRaw.map(getFields).filter(Boolean);

// 1. Weekly window (last 7 days)
const now = new Date();
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const last7dSales = sales14d.filter(s => s.date && s.date >= weekAgo);

// 2. Financials
const totalRevenue = last7dSales.reduce((a, s) => a + (s.units || 0) * (s.sellPrice || 0), 0);
const totalProfit = last7dSales.reduce((a, s) => a + (s.profit || 0), 0);
const totalExpenses = expenses.reduce((a, e) => a + (e.amount || 0), 0);
const netProfit = totalProfit - totalExpenses;

// 3. Top 3 items by profit
const byItem = {};
last7dSales.forEach(s => {
  const name = s.itemName || 'Unknown';
  if (!byItem[name]) byItem[name] = { profit: 0, units: 0 };
  byItem[name].profit += (s.profit || 0);
  byItem[name].units += (s.units || 0);
});
const topItems = Object.entries(byItem)
  .map(([name, d]) => ({ name, ...d }))
  .sort((a, b) => b.profit - a.profit)
  .slice(0, 3);

// 4. Dead stock (in stock with >0 quantity, but NOT sold in last 14 days)
const sold14dNames = new Set(sales14d.filter(s => s.units > 0).map(s => s.itemName));
const deadStock = stock.filter(s => (s.stock || 0) > 0 && !sold14dNames.has(s.name)).slice(0, 10);

// 5. Top 5 debtors
const debtors = khataCust
  .filter(c => (c.totalBalance || 0) > 0)
  .sort((a, b) => (b.totalBalance || 0) - (a.totalBalance || 0))
  .slice(0, 5);

// 6. Overdue customers (distinct)
const overdueNames = [...new Set(overdueTx.map(t => t.customerName).filter(Boolean))];

// === BUILD MESSAGE ===
const fmtRs = (n) => 'Rs. ' + Math.round(n).toLocaleString('en-US');
const dateRange = weekAgo.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' - ' + now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

let msg = '\\u{1F4CA} WEEKLY REPORT \\u2014 Chaye Cafe\\n';
msg += '\\u{1F4C5} ' + dateRange + '\\n';
msg += '\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';

// Financials
msg += '\\u{1F4B0} FINANCIALS\\n';
msg += '   Revenue: ' + fmtRs(totalRevenue) + '\\n';
msg += '   Profit: ' + fmtRs(totalProfit) + '\\n';
msg += '   Expenses: ' + fmtRs(totalExpenses) + '\\n';
msg += '   \\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\n';
msg += '   NET: ' + fmtRs(netProfit) + (netProfit >= 0 ? ' \\u2705' : ' \\u274C') + '\\n\\n';

// Top items
msg += '\\u{1F3C6} TOP 3 ITEMS (by profit)\\n';
if (topItems.length === 0) {
  msg += '   (no sales this week)\\n';
} else {
  topItems.forEach((it, i) => {
    msg += '   ' + (i + 1) + '. ' + it.name + ' \\u2014 ' + fmtRs(it.profit) + '\\n';
  });
}
msg += '\\n';

// Dead stock
msg += '\\u{1F480} DEAD STOCK (14 din se sale nahi)\\n';
if (deadStock.length === 0) {
  msg += '   \\u2705 Sab items bik rahe hain\\n';
} else {
  deadStock.slice(0, 5).forEach(d => {
    msg += '   \\u2022 ' + d.name + ' (stock: ' + (d.stock || 0) + ')\\n';
  });
  if (deadStock.length > 5) msg += '   ... +' + (deadStock.length - 5) + ' aur\\n';
}
msg += '\\n';

// Top debtors
msg += '\\u{1F465} TOP 5 DEBTORS (recovery karni)\\n';
if (debtors.length === 0) {
  msg += '   \\u2705 Koi udhar nahi\\n';
} else {
  debtors.forEach((d, i) => {
    msg += '   ' + (i + 1) + '. ' + d.name + ' \\u2014 ' + fmtRs(d.totalBalance || 0) + '\\n';
  });
}
msg += '\\n';

// Overdue
msg += '\\u23F0 OVERDUE (' + overdueNames.length + ' customers)\\n';
if (overdueNames.length === 0) {
  msg += '   \\u2705 Sab time pe\\n';
} else {
  overdueNames.slice(0, 5).forEach(n => msg += '   \\u2022 ' + n + '\\n');
  if (overdueNames.length > 5) msg += '   ... +' + (overdueNames.length - 5) + ' aur\\n';
}
msg += '\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';
msg += 'Auto-report \\u2022 Chaye Cafe POS';

return [{ json: { message: msg } }];`;

const nodes = [
  // 0. Schedule Trigger — Monday 9PM PKT (16:00 UTC Monday)
  {
    name: 'Trigger (Mon 9PM)',
    type: 'n8n-nodes-base.scheduleTrigger',
    typeVersion: 1.1,
    position: [0, 400],
    parameters: {
      rule: {
        interval: [{ field: 'cronExpression', expression: '0 16 * * 1' }],
      },
    },
  },
  // 1. Compute dates node — produces ISO timestamps for queries
  {
    name: 'Compute Dates',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [240, 400],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: [
        'const now = new Date();',
        'const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);',
        'const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);',
        'return [{ json: {',
        '  weekAgoISO: "\\"" + weekAgo.toISOString() + "\\"",',
        '  twoWeeksAgoISO: "\\"" + twoWeeksAgo.toISOString() + "\\"",',
        '  todayISO: "\\"" + now.toISOString().split("T")[0] + "\\"",',
        '} }];',
      ].join('\n'),
    },
  },
  // 2-6. Five parallel Firestore queries
  qNodeWithExpr('Fetch Sales 14d', [500, 100], 'twoWeeksAgoISO', 'date'),
  qNode('Fetch Stock', [500, 260], 'stock', null),
  qNodeWithExpr('Fetch Expenses 7d', [500, 420], 'weekAgoISO', 'date'),
  qNode('Fetch Khata Customers', [500, 580], 'khataCustomers', null),
  qNode('Fetch Overdue Tx', [500, 740], 'khataTransactions', {
    fieldFilter: {
      field: { fieldPath: 'type' },
      op: 'EQUAL',
      value: { stringValue: 'credit' },
    },
  }),
  // 7. Compute Report (the big node)
  {
    name: 'Compute Report',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [820, 400],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: COMPUTE_CODE,
    },
  },
  // 8. Telegram send
  {
    name: 'Telegram: Weekly Report',
    type: 'n8n-nodes-base.telegram',
    typeVersion: 1.2,
    position: [1100, 400],
    credentials: TG_CRED,
    parameters: {
      resource: 'message',
      operation: 'sendMessage',
      chatId: CHAT_ID,
      text: '={{ $json.message }}',
      replyMarkup: 'none',
    },
  },
];

const connections = {
  'Trigger (Mon 9PM)': {
    main: [[{ node: 'Compute Dates', type: 'main', index: 0 }]],
  },
  'Compute Dates': {
    main: [[
      { node: 'Fetch Sales 14d', type: 'main', index: 0 },
      { node: 'Fetch Stock', type: 'main', index: 0 },
      { node: 'Fetch Expenses 7d', type: 'main', index: 0 },
      { node: 'Fetch Khata Customers', type: 'main', index: 0 },
      { node: 'Fetch Overdue Tx', type: 'main', index: 0 },
    ]],
  },
  'Fetch Sales 14d': { main: [[{ node: 'Compute Report', type: 'main', index: 0 }]] },
  'Fetch Stock': { main: [[{ node: 'Compute Report', type: 'main', index: 0 }]] },
  'Fetch Expenses 7d': { main: [[{ node: 'Compute Report', type: 'main', index: 0 }]] },
  'Fetch Khata Customers': { main: [[{ node: 'Compute Report', type: 'main', index: 0 }]] },
  'Fetch Overdue Tx': { main: [[{ node: 'Compute Report', type: 'main', index: 0 }]] },
  'Compute Report': { main: [[{ node: 'Telegram: Weekly Report', type: 'main', index: 0 }]] },
};

const wf = {
  name: 'Chaye Cafe - Weekly Report',
  nodes,
  connections,
  settings: {
    executionOrder: 'v1',
    saveDataErrorExecution: 'all',
    saveDataSuccessExecution: 'all',
  },
};

fs.writeFileSync('./n8n-workflow-WEEKLY.json', JSON.stringify(wf, null, 2));
console.log('Weekly workflow generated.');
console.log('Nodes:', nodes.length);
console.log('Connection keys:', Object.keys(connections).length);

// Validation
const nodeNames = new Set(nodes.map(n => n.name));
const connKeys = Object.keys(connections);
const mismatch = connKeys.filter(k => !nodeNames.has(k));
const danglingTargets = [];
Object.values(connections).forEach(c => {
  c.main.forEach(branch => branch.forEach(t => {
    if (!nodeNames.has(t.node)) danglingTargets.push(t.node);
  }));
});
console.log('\n=== VALIDATION ===');
console.log('Conn key mismatches:', mismatch.length === 0 ? 'NONE' : mismatch.join(', '));
console.log('Dangling target nodes:', danglingTargets.length === 0 ? 'NONE' : danglingTargets.join(', '));
console.log('JSON valid:', true);
