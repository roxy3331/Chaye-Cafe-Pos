// Rebuilds PRODUCTION workflow to use n8n's built-in googleApi OAuth credential
// on HTTP Request nodes (no JS code signing needed - crypto module disallowed)
// Run: node _build_final_workflow.js
const fs = require('fs');

const sa = JSON.parse(fs.readFileSync('./serviceAccount.json', 'utf8'));
const DB = 'ai-studio-11604781-3243-486c-acd1-dd3729b669bf';
const PROJECT = 'chaye-cafe-pos';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DB}/documents`;
const TG_CRED_ID = 'FCPBkiAhqGQDu04d';
const GOOGLE_CRED_ID = 'Sy9JsEs9pbHHCiO3';
const CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID';

// HTTP query node factory - uses googleApi credential for auth (n8n signs JWT internally)
function httpQuery(collection, where) {
  const body = where
    ? { structuredQuery: { from: [{ collectionId: collection }], where, limit: 100 } }
    : { structuredQuery: { from: [{ collectionId: collection }], limit: 100 } };
  return {
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    sendHeaders: true,
    headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
    sendBody: true,
    contentType: 'json',
    specifyBody: 'json',
    method: 'POST',
    url: `${BASE_URL}:runQuery`,
    jsonBody: JSON.stringify(body),
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleApi',
  };
}

const wf = {
  name: 'Chaye Cafe Alerts - PRODUCTION',
  nodes: [
    {
      name: 'Schedule (every 1 min)',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [0, 400],
      parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] } },
    },
    {
      name: 'Fetch Stock (stock=0)',
      position: [280, 60],
      parameters: httpQuery('stock', { fieldFilter: { field: { fieldPath: 'stock' }, op: 'EQUAL', value: { integerValue: 0 } } }).parameters ? Object.assign(
        httpQuery('stock', { fieldFilter: { field: { fieldPath: 'stock' }, op: 'EQUAL', value: { integerValue: 0 } } }),
        { credentials: { googleApi: { id: GOOGLE_CRED_ID, name: 'Chaye Cafe Firebase Service Account' } } }
      ) : {},
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
    },
  ],
};

// Simpler: build nodes directly with merged params
const nodes = [
  {
    name: 'Schedule (every 1 min)',
    type: 'n8n-nodes-base.scheduleTrigger',
    typeVersion: 1.2,
    position: [0, 400],
    parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] } },
  },
];

// Helper to make query node
function qNode(name, position, collection, where) {
  const body = where
    ? { structuredQuery: { from: [{ collectionId: collection }], where, limit: 100 } }
    : { structuredQuery: { from: [{ collectionId: collection }], limit: 100 } };
  return {
    name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position,
    credentials: { googleApi: { id: GOOGLE_CRED_ID, name: 'Chaye Cafe Firebase Service Account' } },
    parameters: {
      method: 'POST',
      url: `${BASE_URL}:runQuery`,
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleApi',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
      sendBody: true, contentType: 'json', specifyBody: 'json',
      jsonBody: JSON.stringify(body),
    },
  };
}

// Helper for code node
function codeNode(name, position, code) {
  return {
    name, type: 'n8n-nodes-base.code', typeVersion: 2, position,
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: code },
  };
}

// Helper for telegram node
function tgNode(name, position) {
  return {
    name, type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position,
    credentials: { telegramApi: { id: TG_CRED_ID, name: 'Telegram Bot API' } },
    parameters: {
      resource: 'message', operation: 'sendMessage',
      chatId: CHAT_ID, text: '={{ $json.message }}', replyMarkup: 'none',
    },
  };
}

// Helper for PATCH node (mark alerted)
function patchNode(name, position, collection, fieldExpr, bodyExpr) {
  return {
    name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position,
    credentials: { googleApi: { id: GOOGLE_CRED_ID, name: 'Chaye Cafe Firebase Service Account' } },
    parameters: {
      method: 'PATCH',
      url: `={{ '${BASE_URL}/${collection}/' + $json.docId + '?updateMask.fieldPaths=${fieldExpr}' }}`,
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleApi',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
      sendBody: true, contentType: 'json', specifyBody: 'json',
      jsonBody: bodyExpr,
    },
  };
}

const STOCK_FORMAT = `const docs = $input.all()[0].json;
if (!Array.isArray(docs) || docs.length === 0) return [];
const items = docs.filter(d => {
  const f = d.document && d.document.fields;
  if (!f) return false;
  const stock = f.stock ? parseInt(f.stock.integerValue || '0') : -1;
  return stock === 0;
});
if (items.length === 0) return [];
let msg = '⚠️ CHAYE CAFE - STOCK KHATAM!\\n\\n';
items.forEach(d => {
  const name = d.document.fields.name?.stringValue || 'Unknown';
  msg += '• ' + name + '\\n';
});
msg += '\\n📦 Foran restock karein!';
return [{ json: { message: msg, count: items.length } }];`;

const PURCHASE_FORMAT = `const docs = $input.all()[0].json;
if (!Array.isArray(docs) || docs.length === 0) return [];
const items = docs.filter(d => {
  const f = d.document && d.document.fields;
  return f && f.alerted?.booleanValue === false;
});
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
  let msg = '🛒 CHAYE CAFE - Naya Purchase!\\n\\n';
  if (salesman) msg += '👤 Salesman: ' + salesman + '\\n';
  msg += '📦 Item: ' + name + '\\n';
  if (category) msg += '🏷️ Category: ' + category + '\\n\\n';
  msg += '📊 Qty: ' + qtyPacks + ' packs (' + totalPcs + ' pcs)\\n   Buy: Rs.' + buy + '/pc\\n   Sell: Rs.' + sell + '/pc\\n   Total: Rs.' + totalCost + '\\n\\n✅ Stock updated!';
  return { json: { message: msg, docId } };
});`;

const KHATA_FORMAT = `const docs = $input.all()[0].json;
if (!Array.isArray(docs) || docs.length === 0) return [];
const today = new Date().toISOString().split('T')[0];
const over = docs.filter(d => {
  const f = d.document && d.document.fields;
  if (!f) return false;
  const bal = parseFloat(f.totalBalance?.doubleValue || f.totalBalance?.integerValue || '0');
  const lim = parseFloat(f.creditLimit?.doubleValue || f.creditLimit?.integerValue || '0');
  const alerted = f.alertedDate?.stringValue || '';
  return bal > lim && lim > 0 && alerted !== today;
});
if (over.length === 0) return [];
return over.map(d => {
  const f = d.document.fields;
  const name = f.name?.stringValue || 'Unknown';
  const bal = parseFloat(f.totalBalance?.doubleValue || f.totalBalance?.integerValue || '0').toFixed(2);
  const lim = parseFloat(f.creditLimit?.doubleValue || f.creditLimit?.integerValue || '0').toFixed(0);
  const docId = d.document.name.split('/').pop();
  let msg = '⚠️ CHAYE CAFE - Khata Limit Cross!\\n\\n👤 ' + name + '\\n💰 Balance: Rs. ' + bal + '\\n🚨 Limit: Rs. ' + lim + ' (exceeded!)';
  return { json: { message: msg, docId, updateValue: today } };
});`;

const KHATA_TX_FORMAT = `const docs = $input.all()[0].json;
if (!Array.isArray(docs) || docs.length === 0) return [];
const items = docs.filter(d => {
  const f = d.document && d.document.fields;
  return f && f.alerted?.booleanValue === false;
});
if (items.length === 0) return [];
return items.map(d => {
  const f = d.document.fields;
  const type = f.type?.stringValue || 'credit';
  const cust = f.customerName?.stringValue || 'Unknown';
  const amt = parseFloat(f.amount?.doubleValue || f.amount?.integerValue || '0').toFixed(2);
  const note = f.note?.stringValue || '';
  const docId = d.document.name.split('/').pop();
  let msg = '';
  if (type === 'payment') {
    msg = '💰 PAYMENT RECEIVED!\\n\\n👤 ' + cust + '\\n💵 Rs. ' + amt + '\\n';
    if (note) msg += '📝 ' + note + '\\n';
    msg += '\\n🙏 Shukriya!';
  } else {
    msg = '📝 NAYA UDHAR\\n\\n👤 ' + cust + '\\n💵 Rs. ' + amt + '\\n';
    if (note) msg += '📝 ' + note + '\\n';
  }
  return { json: { message: msg, docId, type } };
});`;

const finalNodes = [
  { name: 'Schedule (every 1 min)', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 400], parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] } } },
  qNode('Fetch Stock (stock=0)', [280, 60], 'stock', { fieldFilter: { field: { fieldPath: 'stock' }, op: 'EQUAL', value: { integerValue: 0 } } }),
  qNode('Fetch Purchases (alerted=false)', [280, 240], 'purchases', { fieldFilter: { field: { fieldPath: 'alerted' }, op: 'EQUAL', value: { booleanValue: false } } }),
  qNode('Fetch Khata Customers', [280, 440], 'khataCustomers', null),
  qNode('Fetch Khata Tx (alerted=false)', [280, 640], 'khataTransactions', { fieldFilter: { field: { fieldPath: 'alerted' }, op: 'EQUAL', value: { booleanValue: false } } }),
  codeNode('Format Stock Alert', [560, 60], STOCK_FORMAT),
  codeNode('Format Purchase Alert', [560, 240], PURCHASE_FORMAT),
  codeNode('Format Khata Limit Alert', [560, 440], KHATA_FORMAT),
  codeNode('Format Khata Tx Alert', [560, 640], KHATA_TX_FORMAT),
  tgNode('Telegram: Stock Alert', [840, 60]),
  tgNode('Telegram: Purchase Alert', [840, 240]),
  tgNode('Telegram: Khata Limit', [840, 440]),
  tgNode('Telegram: Khata Tx', [840, 640]),
  // PATCH nodes - mark alerted after sending
  patchNode('PATCH: Purchase Alerted', [1100, 240], 'purchases', 'alerted', '{"fields":{"alerted":{"booleanValue":true}}}'),
  patchNode('PATCH: Khata Customer Alerted', [1100, 440], 'khataCustomers', 'alertedDate', '={{ \'{"fields":{"alertedDate":{"stringValue":"' + '" + $json.updateValue + \'"}}}}\'}}'),
  patchNode('PATCH: Khata Tx Alerted', [1100, 640], 'khataTransactions', 'alerted', '{"fields":{"alerted":{"booleanValue":true}}}'),
];

// Fix PATCH Khata Customer body (need docId-based URL with alertedDate field)
const patchKhataIdx = finalNodes.findIndex(n => n.name === 'PATCH: Khata Customer Alerted');
finalNodes[patchKhataIdx].parameters.url = `={{ '${BASE_URL}/khataCustomers/' + $json.docId + '?updateMask.fieldPaths=alertedDate' }}`;
finalNodes[patchKhataIdx].parameters.jsonBody = `={ "fields": { "alertedDate": { "stringValue": "{{ $json.updateValue }}" } } }`;

const connections = {
  'Schedule (every 1 min)': { main: [[
    { node: 'Fetch Stock (stock=0)', type: 'main', index: 0 },
    { node: 'Fetch Purchases (alerted=false)', type: 'main', index: 0 },
    { node: 'Fetch Khata Customers', type: 'main', index: 0 },
    { node: 'Fetch Khata Tx (alerted=false)', type: 'main', index: 0 },
  ]] },
  'Fetch Stock (stock=0)': { main: [[{ node: 'Format Stock Alert', type: 'main', index: 0 }]] },
  'Fetch Purchases (alerted=false)': { main: [[{ node: 'Format Purchase Alert', type: 'main', index: 0 }]] },
  'Fetch Khata Customers': { main: [[{ node: 'Format Khata Limit Alert', type: 'main', index: 0 }]] },
  'Fetch Khata Tx (alerted=false)': { main: [[{ node: 'Format Khata Tx Alert', type: 'main', index: 0 }]] },
  'Format Stock Alert': { main: [[{ node: 'Telegram: Stock Alert', type: 'main', index: 0 }]] },
  'Format Purchase Alert': { main: [[
    { node: 'Telegram: Purchase Alert', type: 'main', index: 0 },
    { node: 'PATCH: Purchase Alerted', type: 'main', index: 0 },
  ]] },
  'Format Khata Limit Alert': { main: [[
    { node: 'Telegram: Khata Limit', type: 'main', index: 0 },
    { node: 'PATCH: Khata Customer Alerted', type: 'main', index: 0 },
  ]] },
  'Format Khata Tx Alert': { main: [[
    { node: 'Telegram: Khata Tx', type: 'main', index: 0 },
    { node: 'PATCH: Khata Tx Alerted', type: 'main', index: 0 },
  ]] },
};

const out = {
  name: 'Chaye Cafe Alerts - PRODUCTION',
  nodes: finalNodes,
  connections,
  settings: { executionOrder: 'v1', saveDataErrorExecution: 'all', saveDataSuccessExecution: 'all' },
};

fs.writeFileSync('./n8n-workflow-PRODUCTION.json', JSON.stringify(out, null, 2));
console.log('Final workflow built.');
console.log('Nodes:', finalNodes.length);
console.log('No crypto module - uses googleApi credential on HTTP nodes');
