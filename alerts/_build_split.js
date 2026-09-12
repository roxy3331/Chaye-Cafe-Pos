// Build TWO production workflows:
// 1. REALTIME (5-min): stock=0, new purchase, new khata tx — per-event messages
// 2. REMINDERS (3x/day cron 0 7,13,16 * * *): khata limit cross — ONE combined message
// Run: node _build_split.js
const fs = require('fs');

const DB = 'ai-studio-11604781-3243-486c-acd1-dd3729b669bf';
const PROJECT = 'chaye-cafe-pos';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DB}/documents`;
const GCREDS = { googleApi: { id: 'Sy9JsEs9pbHHCiO3', name: 'Chaye Cafe Firebase Service Account' } };
const TG = { telegramApi: { id: 'FCPBkiAhqGQDu04d', name: 'Telegram Bot API' } };
const CHAT = process.env.TELEGRAM_CHAT_ID || 'YOUR_TELEGRAM_CHAT_ID';

function fetchNode(name, pos, body) {
  return {
    name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: GCREDS,
    parameters: {
      method: 'POST', url: `${BASE}:runQuery`, authentication: 'predefinedCredentialType', nodeCredentialType: 'googleApi',
      sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
      sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: body,
    },
  };
}
function patchNode(name, pos, coll, field) {
  return {
    name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: GCREDS,
    parameters: {
      method: 'PATCH',
      url: `={{ 'https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DB}/documents/${coll}/' + $json.docId + '?updateMask.fieldPaths=${field}' }}`,
      authentication: 'predefinedCredentialType', nodeCredentialType: 'googleApi',
      sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
      sendBody: true, contentType: 'json', specifyBody: 'json',
      jsonBody: `={ "fields": { "${field}": { "stringValue": "{{ $json.updateValue }}" } } }`,
    },
  };
}
function tgNode(name, pos) {
  return {
    name, type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: pos, credentials: TG,
    parameters: { resource: 'message', operation: 'sendMessage', chatId: CHAT, text: '={{ $json.message }}', replyMarkup: 'none', options: {} },
  };
}
function codeNode(name, pos, code) {
  return { name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: code } };
}

// =================== REALTIME WORKFLOW ===================
const stockBody = JSON.stringify({ structuredQuery: { from: [{ collectionId: 'stock' }], where: { fieldFilter: { field: { fieldPath: 'stock' }, op: 'EQUAL', value: { integerValue: 0 } } }, limit: 100 } });
const purBody = JSON.stringify({ structuredQuery: { from: [{ collectionId: 'purchases' }], where: { fieldFilter: { field: { fieldPath: 'alerted' }, op: 'EQUAL', value: { booleanValue: false } } }, limit: 100 } });
const khataTxBody = JSON.stringify({ structuredQuery: { from: [{ collectionId: 'khataTransactions' }], where: { fieldFilter: { field: { fieldPath: 'alerted' }, op: 'EQUAL', value: { booleanValue: false } } }, limit: 100 } });

const formatStock = `const _raw = $input.all();
const docs = (_raw.length === 1 && Array.isArray(_raw[0].json)) ? _raw[0].json : _raw.map(i => i.json);
if (!Array.isArray(docs) || docs.length === 0) return [];
const today = new Date().toISOString().split('T')[0];
const items = docs.filter(d => {
  const f = d.document && d.document.fields;
  if (!f) return false;
  const stock = f.stock ? parseInt(f.stock.integerValue || '0') : -1;
  if (stock !== 0) return false;
  const alertedDate = f.stockAlertedDate?.stringValue || '';
  return alertedDate !== today;
});
if (items.length === 0) return [];
const docIds = items.map(d => d.document.name.split('/').pop());
let msg = '⚠️ CHAYE CAFE - STOCK KHATAM!\\n\\n';
items.forEach(d => { msg += '• ' + (d.document.fields.name?.stringValue || 'Unknown') + '\\n'; });
msg += '\\n📦 Foran restock karein!';
return [{ json: { message: msg, count: items.length, docIds, updateValue: today } }];`;

const formatPurchase = `const _raw = $input.all();
const docs = (_raw.length === 1 && Array.isArray(_raw[0].json)) ? _raw[0].json : _raw.map(i => i.json);
if (!Array.isArray(docs) || docs.length === 0) return [];
const items = docs.filter(d => { const f = d.document && d.document.fields; return f && f.alerted?.booleanValue === false; });
if (items.length === 0) return [];
return items.map(d => {
  const f = d.document.fields;
  const name = f.itemName?.stringValue || 'Unknown';
  const qtyPacks = f.quantity?.integerValue || f.quantity?.doubleValue || '0';
  const totalPcs = f.totalPcs?.integerValue || f.totalPcs?.doubleValue || '0';
  const buy = f.buyingPricePerPc?.doubleValue || f.buyingPricePerPc?.integerValue || '0';
  const sell = f.sellingPricePerPc?.doubleValue || f.sellingPricePerPc?.integerValue || '0';
  const category = f.category?.stringValue || '';
  const salesman = f.salesmanName?.stringValue || '';
  const docId = d.document.name.split('/').pop();
  const totalCost = (parseFloat(totalPcs) * parseFloat(buy)).toFixed(0);
  let msg = '🛒 Naya Purchase!\\n\\n';
  if (salesman) msg += '👤 ' + salesman + '\\n';
  msg += '📦 ' + name + '\\n';
  if (category) msg += '🏷️ ' + category + '\\n\\n';
  msg += '📊 ' + qtyPacks + ' packs (' + totalPcs + ' pcs)\\n   Buy: Rs.' + buy + '   Sell: Rs.' + sell + '\\n   Total: Rs.' + totalCost;
  return { json: { message: msg, docId } };
});`;

const formatKhataTx = `const _raw = $input.all();
const docs = (_raw.length === 1 && Array.isArray(_raw[0].json)) ? _raw[0].json : _raw.map(i => i.json);
if (!Array.isArray(docs) || docs.length === 0) return [];
const items = docs.filter(d => { const f = d.document && d.document.fields; return f && f.alerted?.booleanValue === false; });
if (items.length === 0) return [];
return items.map(d => {
  const f = d.document.fields;
  const type = f.type?.stringValue || 'credit';
  const cust = f.customerName?.stringValue || 'Unknown';
  const amt = parseFloat(f.amount?.doubleValue || f.amount?.integerValue || '0').toFixed(0);
  const note = f.note?.stringValue || '';
  const docId = d.document.name.split('/').pop();
  let msg = '';
  if (type === 'payment') { msg = '💰 PAYMENT!\\n👤 ' + cust + '\\n💵 Rs.' + amt; if (note) msg += '\\n📝 ' + note; msg += '\\n🙏 Shukriya!'; }
  else { msg = '📝 NAYA UDHAR\\n👤 ' + cust + '\\n💵 Rs.' + amt; if (note) msg += '\\n📝 ' + note; }
  return { json: { message: msg, docId } };
});`;

const splitStock = `const all = $input.all(); if (all.length === 0) return [];
const ids = all[0].json.docIds || []; const today = all[0].json.updateValue;
return ids.map(id => ({ json: { docId: id, updateValue: today } }));`;

const realtime = {
  name: 'Chaye Cafe - REALTIME Alerts',
  nodes: [
    { name: 'Every 5 min', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 300],
      parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] } } },
    fetchNode('Fetch Stock (0)', [280, 60], stockBody),
    fetchNode('Fetch Purchases', [280, 280], purBody),
    fetchNode('Fetch Khata Tx', [280, 500], khataTxBody),
    codeNode('Format Stock', [560, 60], formatStock),
    codeNode('Format Purchase', [560, 280], formatPurchase),
    codeNode('Format Khata Tx', [560, 500], formatKhataTx),
    codeNode('Split Stock Docs', [840, 60], splitStock),
    tgNode('TG: Stock', [840, -60]),
    tgNode('TG: Purchase', [840, 280]),
    tgNode('TG: Khata Tx', [840, 500]),
    patchNode('PATCH: Stock', [1120, 60], 'stock', 'stockAlertedDate'),
    patchNode('PATCH: Purchase', [1120, 280], 'purchases', 'alerted'),
    patchNode('PATCH: Khata Tx', [1120, 500], 'khataTransactions', 'alerted'),
  ],
  connections: {
    'Every 5 min': { main: [[
      { node: 'Fetch Stock (0)', type: 'main', index: 0 },
      { node: 'Fetch Purchases', type: 'main', index: 0 },
      { node: 'Fetch Khata Tx', type: 'main', index: 0 },
    ]] },
    'Fetch Stock (0)': { main: [[{ node: 'Format Stock', type: 'main', index: 0 }]] },
    'Fetch Purchases': { main: [[{ node: 'Format Purchase', type: 'main', index: 0 }]] },
    'Fetch Khata Tx': { main: [[{ node: 'Format Khata Tx', type: 'main', index: 0 }]] },
    'Format Stock': { main: [[{ node: 'TG: Stock', type: 'main', index: 0 }, { node: 'Split Stock Docs', type: 'main', index: 0 }]] },
    'Split Stock Docs': { main: [[{ node: 'PATCH: Stock', type: 'main', index: 0 }]] },
    'Format Purchase': { main: [[{ node: 'TG: Purchase', type: 'main', index: 0 }, { node: 'PATCH: Purchase', type: 'main', index: 0 }]] },
    'Format Khata Tx': { main: [[{ node: 'TG: Khata Tx', type: 'main', index: 0 }, { node: 'PATCH: Khata Tx', type: 'main', index: 0 }]] },
  },
  settings: { executionOrder: 'v0', saveDataErrorExecution: 'all', saveDataSuccessExecution: 'all' },
};

// =================== REMINDERS WORKFLOW ===================
// Cron 0 7,13,16 * * * (UTC) = 12PM, 6PM, 9PM PKT
const khataCustBody = JSON.stringify({ structuredQuery: { from: [{ collectionId: 'khataCustomers' }], limit: 200 } });

const reminderCode = `const _raw = $input.all();
const docs = (_raw.length === 1 && Array.isArray(_raw[0].json)) ? _raw[0].json : _raw.map(i => i.json);
if (!Array.isArray(docs) || docs.length === 0) return [];
const over = docs.filter(d => {
  const f = d.document && d.document.fields;
  if (!f) return false;
  const bal = parseFloat(f.totalBalance?.doubleValue || f.totalBalance?.integerValue || '0');
  const lim = parseFloat(f.creditLimit?.doubleValue || f.creditLimit?.integerValue || '0');
  return bal > 0 && lim > 0 && bal > lim;
}).map(d => {
  const f = d.document.fields;
  return {
    name: f.name?.stringValue || 'Unknown',
    bal: parseFloat(f.totalBalance?.doubleValue || f.totalBalance?.integerValue || '0'),
    lim: parseFloat(f.creditLimit?.doubleValue || f.creditLimit?.integerValue || '0'),
    phone: f.phone?.stringValue || '',
  };
}).sort((a, b) => b.bal - a.bal);
if (over.length === 0) return [];
const top = over.slice(0, 10);
const now = new Date();
const pkt = new Date(now.getTime() + 5 * 3600 * 1000);
const hh = pkt.getUTCHours();
const slot = hh === 7 ? '12 PM' : hh === 13 ? '6 PM' : '9 PM';
let msg = '🔔 KHATA REMINDER (' + slot + ')\\n';
msg += '⚠️ Limit cross — ' + over.length + ' customers\\n';
msg += '━━━━━━━━━━━━━\\n\\n';
top.forEach((c, i) => {
  msg += (i + 1) + '. ' + c.name + '\\n';
  msg += '   💰 Rs.' + Math.round(c.bal).toLocaleString('en-US') + ' / Limit Rs.' + Math.round(c.lim).toLocaleString('en-US') + '\\n';
  if (c.phone) msg += '   📱 ' + c.phone + '\\n';
});
if (over.length > 10) msg += '\\n...+' + (over.length - 10) + ' aur\\n';
msg += '\\n📞 Recovery karein!';
return [{ json: { message: msg } }];`;

const reminders = {
  name: 'Chaye Cafe - REMINDERS (3x/day)',
  nodes: [
    { name: 'Cron 12/6/9 PKT', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 300],
      parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 7,13,16 * * *' }] } } },
    fetchNode('Fetch Khata Customers', [280, 300], khataCustBody),
    codeNode('Build Reminder Msg', [560, 300], reminderCode),
    tgNode('TG: Reminder', [840, 300]),
  ],
  connections: {
    'Cron 12/6/9 PKT': { main: [[{ node: 'Fetch Khata Customers', type: 'main', index: 0 }]] },
    'Fetch Khata Customers': { main: [[{ node: 'Build Reminder Msg', type: 'main', index: 0 }]] },
    'Build Reminder Msg': { main: [[{ node: 'TG: Reminder', type: 'main', index: 0 }]] },
  },
  settings: { executionOrder: 'v0', saveDataErrorExecution: 'all', saveDataSuccessExecution: 'all' },
};

// validate
function validate(wf, label) {
  const ns = new Set(wf.nodes.map(n => n.name));
  const dang = [];
  Object.entries(wf.connections).forEach(([k, c]) => { if (!ns.has(k)) dang.push('SRC:' + k); c.main.forEach(b => b.forEach(t => { if (!ns.has(t.node)) dang.push('DST:' + t.node); })); });
  console.log(`[${label}] nodes=${wf.nodes.length} issues=${dang.length ? dang.join(',') : 'NONE'}`);
}

validate(realtime, 'REALTIME');
validate(reminders, 'REMINDERS');
fs.writeFileSync('./n8n-workflow-REALTIME.json', JSON.stringify(realtime, null, 2));
fs.writeFileSync('./n8n-workflow-REMINDERS.json', JSON.stringify(reminders, null, 2));
console.log('Both files written.');
