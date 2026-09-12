const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const https = require('https');
const nodemailer = require('nodemailer');

// Load service account
const sa = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccount.json'), 'utf8'));

// Proxy configuration (set PROXY_URL env var for SOCKS5/HTTP proxy)
// Example: socks5://127.0.0.1:1080 or http://proxy:port
const PROXY_URL = process.env.PROXY_URL || null;

// Email fallback configuration
const EMAIL_CONFIG = {
  enabled: process.env.EMAIL_ENABLED === 'true' || false,
  smtp: process.env.EMAIL_SMTP || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  user: process.env.EMAIL_USER || '',
  pass: process.env.EMAIL_PASS || '',
  to: process.env.EMAIL_TO || ''
};

// Lazy-load proxy agents (optional dependency)
let SocksProxyAgent, HttpsProxyAgent;
try { SocksProxyAgent = require('socks-proxy-agent').SocksProxyAgent; } catch (_) {}
try { HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent; } catch (_) {}

// Create email transporter if enabled
let emailTransporter = null;
if (EMAIL_CONFIG.enabled && EMAIL_CONFIG.user && EMAIL_CONFIG.pass) {
  try {
    emailTransporter = nodemailer.createTransporter({
      host: EMAIL_CONFIG.smtp,
      port: EMAIL_CONFIG.port,
      secure: EMAIL_CONFIG.port === 465,
      auth: { user: EMAIL_CONFIG.user, pass: EMAIL_CONFIG.pass }
    });
    console.log('[EMAIL] Fallback email configured');
  } catch (e) {
    console.log('[EMAIL ERR] ' + e.message);
  }
}
// Telegram credentials come from env vars (never commit real values)
//   set TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID before running
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
if (!BOT_TOKEN || !CHAT_ID) {
  console.error('[CONFIG] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars missing — aborting.');
  process.exit(1);
}
const DB = 'ai-studio-11604781-3243-486c-acd1-dd3729b669bf';
const PROJ = 'chaye-cafe-pos';
const TODAY = new Date().toISOString().split('T')[0];

// Retry wrapper for network requests
async function withRetry(fn, retries = 3, delay = 2000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      console.log('[RETRY] Attempt ' + (i + 1) + '/' + retries + ' failed: ' + e.message);
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

function httpsReq(url, method, headers, body, useProxy = true) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opt = { 
      hostname: u.hostname, 
      port: 443, 
      path: u.pathname + u.search, 
      method, 
      headers: headers || {}, 
      timeout: 30000,
      agent: new https.Agent({ keepAlive: false, rejectUnauthorized: true })
    };
    
    // Apply proxy for Telegram API if configured
    if (useProxy && PROXY_URL && u.hostname.includes('telegram.org')) {
      try {
        if (PROXY_URL.startsWith('socks5') && SocksProxyAgent) {
          opt.agent = new SocksProxyAgent(PROXY_URL);
          console.log('[PROXY] Using SOCKS5 for Telegram');
        } else if (PROXY_URL.startsWith('http') && HttpsProxyAgent) {
          opt.agent = new HttpsProxyAgent(PROXY_URL);
          console.log('[PROXY] Using HTTP proxy for Telegram');
        } else {
          console.log('[PROXY WARN] Proxy URL set but agent module not installed. Run: npm install socks-proxy-agent https-proxy-agent');
        }
      } catch (e) {
        console.log('[PROXY WARN] ' + e.message);
      }
    }
    
    console.log('[REQ] ' + method + ' ' + u.hostname + (opt.agent ? ' (via proxy)' : ''));
    const req = https.request(opt, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function getToken() {
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign({ 
    iss: sa.client_email, 
    scope: 'https://www.googleapis.com/auth/datastore', 
    aud: 'https://oauth2.googleapis.com/token', 
    iat: now, 
    exp: now + 3600 
  }, sa.private_key, { algorithm: 'RS256' });
  
  return await withRetry(async () => {
    const r = await httpsReq('https://oauth2.googleapis.com/token', 'POST', { 
      'Content-Type': 'application/x-www-form-urlencoded' 
    }, 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + encodeURIComponent(assertion));
    if (!r.body.access_token) throw new Error('Token failed: ' + JSON.stringify(r.body));
    return r.body.access_token;
  });
}

async function queryDocs(token, collectionId) {
  const body = JSON.stringify({ structuredQuery: { from: [{ collectionId }], limit: 100 } });
  
  return await withRetry(async () => {
    const r = await httpsReq('https://firestore.googleapis.com/v1/projects/' + PROJ + '/databases/' + DB + '/documents:runQuery', 'POST', { 
      'Authorization': 'Bearer ' + token, 
      'Content-Type': 'application/json' 
    }, body);
    if (r.status !== 200 || r.body.error) throw new Error(r.body.error ? r.body.error.message : 'HTTP ' + r.status);
    return (r.body || []).filter(d => d.document).map(d => ({ id: d.document.name.split('/').pop(), fields: d.document.fields }));
  });
}

async function patchDoc(token, docPath, fields) {
  const encoded = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'boolean') encoded[k] = { booleanValue: v };
    else if (typeof v === 'number') encoded[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else if (typeof v === 'string') encoded[k] = { stringValue: v };
    else encoded[k] = { stringValue: String(v) };
  }
  const mask = Object.keys(fields).map(f => 'updateMask.fieldPaths=' + f).join('&');
  
  return await withRetry(async () => {
    const r = await httpsReq('https://firestore.googleapis.com/v1/projects/' + PROJ + '/databases/' + DB + '/documents/' + docPath + '?' + mask, 'PATCH', { 
      'Authorization': 'Bearer ' + token, 
      'Content-Type': 'application/json' 
    }, JSON.stringify({ fields: encoded }));
    if (r.status !== 200) throw new Error('Patch failed: HTTP ' + r.status);
  });
}

async function sendTg(msg) {
  return await withRetry(async () => {
    const r = await httpsReq('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', 'POST', { 
      'Content-Type': 'application/json' 
    }, JSON.stringify({ chat_id: CHAT_ID, text: msg }));
    if (!r.body.ok) throw new Error('Telegram error: ' + r.body.description);
  });
}

function log(msg) {
  const line = new Date().toISOString() + ' ' + msg;
  console.log(line);
  try {
    // Use hardcoded path for SYSTEM user compatibility
    const logPath = 'C:\\chaye-cafe-alerts\\last_run.log';
    fs.appendFileSync(logPath, line + '\n');
  } catch (e) {
    console.error('[LOG ERR] ' + e.message);
  }
}

async function main() {
  log('[RUN] Starting alert check...');
  
  let token;
  try {
    token = await getToken();
    log('[AUTH] OK');
  } catch (e) {
    log('[AUTH ERR] ' + e.message);
    throw e;
  }

  // 1. Low Stock Alert
  try {
    const stock = await queryDocs(token, 'stock');
    const zeroStock = stock.filter(d => { 
      const v = d.fields.stock; 
      return v && (v.integerValue === '0' || v.doubleValue === 0); 
    });
    if (zeroStock.length) {
      let msg = '🔴 CHAYE CAFE - STOCK KHATAM!\n\n';
      zeroStock.forEach(d => msg += '❌ ' + (d.fields.name?.stringValue || '?') + '\n');
      msg += '\n⚡ Foran restock karein!';
      await sendTg(msg);
      log('[SENT] LowStock:' + zeroStock.length);
    } else {
      log('[OK] LowStock:0');
    }
  } catch (e) {
    log('[ERR LowStock] ' + e.message);
  }

  // 2. New Purchase Alert
  try {
    const purchases = await queryDocs(token, 'purchases');
    const newPurchases = purchases.filter(d => d.fields.alerted?.booleanValue === false);
    for (const p of newPurchases) {
      const f = p.fields;
      let msg = '📦 CHAYE CAFE - Naya Purchase!\n\n';
      msg += '👤 By: ' + (f.performedBy?.stringValue || 'Employee') + '\n';
      msg += '📋 Item: ' + (f.itemName?.stringValue || '?') + '\n\n';
      msg += '📊 Qty: ' + (f.quantity?.integerValue || 0) + ' packs\n';
      msg += '  Buy: Rs.' + (f.buyPrice?.integerValue || f.buyPrice?.doubleValue || 0) + '/pc\n';
      msg += '  Sell: Rs.' + (f.sellPrice?.integerValue || f.sellPrice?.doubleValue || 0) + '/pc\n';
      msg += '  Cost: Rs.' + (f.totalCost?.integerValue || f.totalCost?.doubleValue || 0) + '\n\n';
      msg += '✅ Stock updated!';
      await sendTg(msg);
      await patchDoc(token, 'purchases/' + p.id, { alerted: true });
      log('[SENT] Purchase:' + (f.itemName?.stringValue || '?'));
    }
    if (!newPurchases.length) log('[OK] Purchases:0');
  } catch (e) {
    log('[ERR Purchases] ' + e.message);
  }

  // 3. Khata Over-Limit Alert
  try {
    const customers = await queryDocs(token, 'khataCustomers');
    for (const c of customers) {
      const f = c.fields;
      const bal = parseFloat(f.totalBalance?.integerValue || f.totalBalance?.doubleValue || 0);
      const lim = parseFloat(f.creditLimit?.integerValue || f.creditLimit?.doubleValue || 0);
      const alertedDate = f.alertedDate?.stringValue || '';
      if (bal > lim && lim > 0 && alertedDate !== TODAY) {
        await sendTg('⚠️ CHAYE CAFE - Khata Limit!\n\n👤 ' + (f.name?.stringValue || '?') + '\n💰 Rs.' + bal.toFixed(2) + '\n⚠️ Limit exceed!');
        await patchDoc(token, 'khataCustomers/' + c.id, { alertedDate: TODAY });
        log('[SENT] Khata:' + (f.name?.stringValue || '?'));
      }
    }
    log('[OK] Khata done');
  } catch (e) {
    log('[ERR Khata] ' + e.message);
  }

  // 4. New Khata Transaction Alert
  try {
    const txs = await queryDocs(token, 'khataTransactions');
    const newTxs = txs.filter(d => d.fields.alerted?.booleanValue === false);
    for (const tx of newTxs) {
      const f = tx.fields;
      const amt = parseFloat(f.amount?.integerValue || f.amount?.doubleValue || 0).toFixed(2);
      const cust = f.customerName?.stringValue || '?';
      const t = f.type?.stringValue || 'credit';
      await sendTg(t === 'payment' ? '✅ Payment Received!\n\n👤 ' + cust + '\n💰 Rs.' + amt + '\n\n🙏 Shukriya!' : '📝 Naya Udhar: ' + cust + ' (Rs.' + amt + ')');
      await patchDoc(token, 'khataTransactions/' + tx.id, { alerted: true });
      log('[SENT] Tx:' + cust);
    }
    if (!newTxs.length) log('[OK] Tx:0');
  } catch (e) {
    log('[ERR Tx] ' + e.message);
  }

  log('[DONE] Alert check complete');
}

main().catch(async (e) => {
  const errMsg = '[FATAL ERR] ' + e.message;
  console.error(errMsg);
  try {
    fs.appendFileSync(path.join(__dirname, 'last_run.log'), new Date().toISOString() + ' ' + errMsg + '\n');
    await withRetry(() => httpsReq('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', 'POST', { 'Content-Type': 'application/json' }, JSON.stringify({ chat_id: CHAT_ID, text: '❌ Alert Error: ' + (e.message || '').substring(0, 200) })), 2);
  } catch (_) {}
  process.exit(1);
});
