// Rebuilds WEEKLY workflow with FIXED date-query expression syntax + clean Compute Dates output.
// Run: node _rebuild_weekly.js
const fs = require('fs');

const DB = 'ai-studio-11604781-3243-486c-acd1-dd3729b669bf';
const PROJECT = 'chaye-cafe-pos';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DB}/documents`;
const GOOGLE_CRED = { googleApi: { id: 'Sy9JsEs9pbHHCiO3', name: 'Chaye Cafe Firebase Service Account' } };
const TG_CRED = { telegramApi: { id: 'FCPBkiAhqGQDu04d', name: 'Telegram Bot API' } };
const CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID';

// Plain (no-expression) query node
function qNode(name, position, collection, where) {
  const body = where
    ? { structuredQuery: { from: [{ collectionId: collection }], where, limit: 500 } }
    : { structuredQuery: { from: [{ collectionId: collection }], limit: 500 } };
  return {
    name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position,
    credentials: GOOGLE_CRED,
    parameters: {
      method: 'POST', url: `${BASE_URL}:runQuery`,
      authentication: 'predefinedCredentialType', nodeCredentialType: 'googleApi',
      sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
      sendBody: true, contentType: 'json', specifyBody: 'json',
      jsonBody: JSON.stringify(body),
    },
  };
}

// Date-range query node using n8n expression
// jsonBody is an expression that interpolates the date from Compute Dates node output.
function qDateNode(name, position, collection, dateVar) {
  // Build a template literal that n8n evaluates. The whole body is an expression.
  const expr = '={{ {"structuredQuery":{"from":[{"collectionId":"' + collection + '"}],"where":{"fieldFilter":{"field":{"fieldPath":"date"},"op":"GREATER_THAN_OR_EQUAL","value":{"timestampValue":' + '"{{$json.' + dateVar + '}}"' + '}}},"limit":500}} }}';
  return {
    name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position,
    credentials: GOOGLE_CRED,
    parameters: {
      method: 'POST', url: `${BASE_URL}:runQuery`,
      authentication: 'predefinedCredentialType', nodeCredentialType: 'googleApi',
      sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
      sendBody: true, contentType: 'json', specifyBody: 'json',
      jsonBody: expr,
    },
  };
}

// Compute Dates — output clean ISO strings (NO embedded quotes)
const computeDatesCode = `const now = new Date();
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
return [{ json: {
  weekAgoISO: weekAgo.toISOString(),
  twoWeeksAgoISO: twoWeeksAgo.toISOString(),
  todayISO: now.toISOString().split('T')[0],
} }];`;

// The big COMPUTE node
const COMPUTE_CODE = `const sales14dRaw = $('Fetch Sales 14d').all().map(i => i.json);
const stockRaw = $('Fetch Stock').all().map(i => i.json);
const expensesRaw = $('Fetch Expenses 7d').all().map(i => i.json);
const khataCustRaw = $('Fetch Khata Customers').all().map(i => i.json);
const overdueTxRaw = $('Fetch Overdue Tx').all().map(i => i.json);

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
  }
  return out;
}

const sales14d = sales14dRaw.map(getFields).filter(Boolean);
const stock = stockRaw.map(getFields).filter(Boolean);
const expenses = expensesRaw.map(getFields).filter(Boolean);
const khataCust = khataCustRaw.map(getFields).filter(Boolean);
const overdueTx = overdueTxRaw.map(getFields).filter(Boolean);

const now = new Date();
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const last7dSales = sales14d.filter(s => s.date && s.date >= weekAgo);

const totalRevenue = last7dSales.reduce((a, s) => a + (s.units || 0) * (s.sellPrice || 0), 0);
const totalProfit = last7dSales.reduce((a, s) => a + (s.profit || 0), 0);
const totalExpenses = expenses.reduce((a, e) => a + (e.amount || 0), 0);
const netProfit = totalProfit - totalExpenses;

const byItem = {};
last7dSales.forEach(s => {
  const name = s.itemName || 'Unknown';
  if (!byItem[name]) byItem[name] = { profit: 0, units: 0 };
  byItem[name].profit += (s.profit || 0);
  byItem[name].units += (s.units || 0);
});
const topItems = Object.entries(byItem).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.profit - a.profit).slice(0, 3);

const sold14dNames = new Set(sales14d.filter(s => s.units > 0).map(s => s.itemName));
const deadStock = stock.filter(s => (s.stock || 0) > 0 && !sold14dNames.has(s.name)).slice(0, 10);

const debtors = khataCust.filter(c => (c.totalBalance || 0) > 0).sort((a, b) => (b.totalBalance || 0) - (a.totalBalance || 0)).slice(0, 5);

const overdueNames = [...new Set(overdueTx.map(t => t.customerName).filter(Boolean))];

const fmtRs = (n) => 'Rs. ' + Math.round(n).toLocaleString('en-US');
const dateRange = weekAgo.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' - ' + now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

let msg = '';
msg += '\\u{1F4CA} WEEKLY REPORT \\u2014 Chaye Cafe\\n';
msg += '\\u{1F4C5} ' + dateRange + '\\n';
msg += '\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';
msg += '\\u{1F4B0} FINANCIALS\\n';
msg += '   Revenue: ' + fmtRs(totalRevenue) + '\\n';
msg += '   Profit: ' + fmtRs(totalProfit) + '\\n';
msg += '   Expenses: ' + fmtRs(totalExpenses) + '\\n';
msg += '   \\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\n';
msg += '   NET: ' + fmtRs(netProfit) + (netProfit >= 0 ? ' \\u2705' : ' \\u274C') + '\\n\\n';
msg += '\\u{1F3C6} TOP 3 ITEMS (by profit)\\n';
if (topItems.length === 0) msg += '   (no sales this week)\\n';
else topItems.forEach((it, i) => { msg += '   ' + (i + 1) + '. ' + it.name + ' \\u2014 ' + fmtRs(it.profit) + '\\n'; });
msg += '\\n';
msg += '\\u{1F480} DEAD STOCK (14 din se sale nahi)\\n';
if (deadStock.length === 0) msg += '   \\u2705 Sab items bik rahe hain\\n';
else { deadStock.slice(0, 5).forEach(d => { msg += '   \\u2022 ' + d.name + ' (stock: ' + (d.stock || 0) + ')\\n'; }); if (deadStock.length > 5) msg += '   ... +' + (deadStock.length - 5) + ' aur\\n'; }
msg += '\\n';
msg += '\\u{1F465} TOP 5 DEBTORS (recovery karni)\\n';
if (debtors.length === 0) msg += '   \\u2705 Koi udhar nahi\\n';
else debtors.forEach((d, i) => { msg += '   ' + (i + 1) + '. ' + d.name + ' \\u2014 ' + fmtRs(d.totalBalance || 0) + '\\n'; });
msg += '\\n';
msg += '\\u23F0 OVERDUE (' + overdueNames.length + ' customers)\\n';
if (overdueNames.length === 0) msg += '   \\u2705 Sab time pe\\n';
else { overdueNames.slice(0, 5).forEach(n => msg += '   \\u2022 ' + n + '\\n'); if (overdueNames.length > 5) msg += '   ... +' + (overdueNames.length - 5) + ' aur\\n'; }
msg += '\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';
msg += 'Auto-report \\u2022 Chaye Cafe POS';

return [{ json: { message: msg } }];`;

const nodes = [
  { name: 'Trigger (Mon 9PM)', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 400],
    parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] } } }, // 1-min for TEST, will change to cron later
  { name: 'Compute Dates', type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 400],
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: computeDatesCode } },
  qDateNode('Fetch Sales 14d', [500, 100], 'sales', 'twoWeeksAgoISO'),
  qNode('Fetch Stock', [500, 260], 'stock', null),
  qDateNode('Fetch Expenses 7d', [500, 420], 'expenses', 'weekAgoISO'),
  qNode('Fetch Khata Customers', [500, 580], 'khataCustomers', null),
  qNode('Fetch Overdue Tx', [500, 740], 'khataTransactions', { fieldFilter: { field: { fieldPath: 'type' }, op: 'EQUAL', value: { stringValue: 'credit' } } }),
  { name: 'Compute Report', type: 'n8n-nodes-base.code', typeVersion: 2, position: [820, 400],
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: COMPUTE_CODE } },
  { name: 'Telegram: Weekly Report', type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: [1100, 400],
    credentials: TG_CRED,
    parameters: { resource: 'message', operation: 'sendMessage', chatId: CHAT_ID, text: '={{ $json.message }}', replyMarkup: 'none' } },
];

const connections = {
  'Trigger (Mon 9PM)': { main: [[{ node: 'Compute Dates', type: 'main', index: 0 }]] },
  'Compute Dates': { main: [[
    { node: 'Fetch Sales 14d', type: 'main', index: 0 },
    { node: 'Fetch Stock', type: 'main', index: 0 },
    { node: 'Fetch Expenses 7d', type: 'main', index: 0 },
    { node: 'Fetch Khata Customers', type: 'main', index: 0 },
    { node: 'Fetch Overdue Tx', type: 'main', index: 0 },
  ]] },
  'Fetch Sales 14d': { main: [[{ node: 'Compute Report', type: 'main', index: 0 }]] },
  'Fetch Stock': { main: [[{ node: 'Compute Report', type: 'main', index: 0 }]] },
  'Fetch Expenses 7d': { main: [[{ node: 'Compute Report', type: 'main', index: 0 }]] },
  'Fetch Khata Customers': { main: [[{ node: 'Compute Report', type: 'main', index: 0 }]] },
  'Fetch Overdue Tx': { main: [[{ node: 'Compute Report', type: 'main', index: 0 }]] },
  'Compute Report': { main: [[{ node: 'Telegram: Weekly Report', type: 'main', index: 0 }]] },
};

const wf = { name: 'Chaye Cafe - Weekly Report', nodes, connections, settings: { executionOrder: 'v1', saveDataErrorExecution: 'all', saveDataSuccessExecution: 'all' } };
fs.writeFileSync('./n8n-workflow-WEEKLY.json', JSON.stringify(wf, null, 2));

// Validation
const nodeNames = new Set(nodes.map(n => n.name));
const mismatch = Object.keys(connections).filter(k => !nodeNames.has(k));
const dangling = [];
Object.values(connections).forEach(c => c.main.forEach(b => b.forEach(t => { if (!nodeNames.has(t.node)) dangling.push(t.node); })));
console.log('Rebuilt. Nodes:', nodes.length);
console.log('Conn mismatches:', mismatch.length ? mismatch.join(',') : 'NONE');
console.log('Dangling:', dangling.length ? dangling.join(',') : 'NONE');
console.log('Sample expr body:', qDateNode('x', [0,0], 'sales', 'twoWeeksAgoISO').parameters.jsonBody);
