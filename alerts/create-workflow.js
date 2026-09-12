const fs = require('fs');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YWM3YjE5NC02ZjFmLTRkM2UtOTI2Yy0yNWU2NGNmNmYzZTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZDQ4MWIzMGMtNjIyMC00NGIyLThhMGItMWM5NWFkZTkwNTI5IiwiaWF0IjoxNzgxMDkwMzk5fQ.Z2JPx00Yf2XLyicXPAgi0JTWk3WdFJ2DS39Hy8i2PQE";

const workflow = {
  "name": "Cafe POS Alerts - Simple",
  "nodes": [
    {
      "id": "trigger",
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, 400],
      "parameters": {
        "rule": {
          "interval": [{"field": "minutes", "minutesInterval": 5}]
        }
      }
    },
    {
      "id": "fetchLowStock",
      "name": "Get Low Stock",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [280, 100],
      "parameters": {
        "method": "POST",
        "url": "https://firestore.googleapis.com/v1/projects/chaye-cafe-pos/databases/(default)/documents:runQuery",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {"name": "Authorization", "value": "Bearer " + token},
            {"name": "Content-Type", "value": "application/json"}
          ]
        },
        "sendBody": true,
        "contentType": "json",
        "specifyBody": "json",
        "jsonBody": "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"stock\"}],\"where\":{\"fieldFilter\":{\"field\":{\"fieldPath\":\"stock\"},\"op\":\"EQUAL\",\"value\":{\"integerValue\":0}}},\"limit\":100}}"
      }
    },
    {
      "id": "fetchPurchases",
      "name": "Get New Purchases",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [280, 300],
      "parameters": {
        "method": "POST",
        "url": "https://firestore.googleapis.com/v1/projects/chaye-cafe-pos/databases/(default)/documents:runQuery",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {"name": "Authorization", "value": "Bearer " + token},
            {"name": "Content-Type", "value": "application/json"}
          ]
        },
        "sendBody": true,
        "contentType": "json",
        "specifyBody": "json",
        "jsonBody": "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"purchases\"}],\"where\":{\"fieldFilter\":{\"field\":{\"fieldPath\":\"alerted\"},\"op\":\"EQUAL\",\"value\":{\"booleanValue\":false}}},\"limit\":100}}"
      }
    },
    {
      "id": "fetchKhataCustomers",
      "name": "Get Khata Customers",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [280, 500],
      "parameters": {
        "method": "POST",
        "url": "https://firestore.googleapis.com/v1/projects/chaye-cafe-pos/databases/(default)/documents:runQuery",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {"name": "Authorization", "value": "Bearer " + token},
            {"name": "Content-Type", "value": "application/json"}
          ]
        },
        "sendBody": true,
        "contentType": "json",
        "specifyBody": "json",
        "jsonBody": "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"khataCustomers\"}],\"limit\":100}}"
      }
    },
    {
      "id": "fetchKhataTx",
      "name": "Get Khata Transactions",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [280, 700],
      "parameters": {
        "method": "POST",
        "url": "https://firestore.googleapis.com/v1/projects/chaye-cafe-pos/databases/(default)/documents:runQuery",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {"name": "Authorization", "value": "Bearer " + token},
            {"name": "Content-Type", "value": "application/json"}
          ]
        },
        "sendBody": true,
        "contentType": "json",
        "specifyBody": "json",
        "jsonBody": "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"khataTransactions\"}],\"where\":{\"fieldFilter\":{\"field\":{\"fieldPath\":\"alerted\"},\"op\":\"EQUAL\",\"value\":{\"booleanValue\":false}}},\"limit\":100}}"
      }
    },
    {
      "id": "formatLowStock",
      "name": "Format Low Stock",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [540, 100],
      "parameters": {
        "mode": "runOnceForAllItems",
        "language": "javaScript",
        "jsCode": "const docs = $input.all()[0].json;\nif (!Array.isArray(docs) || docs.length === 0) return [];\nconst items = docs.filter(d => {\n  const f = d.document && d.document.fields;\n  if (!f) return false;\n  const stock = f.stock ? parseInt(f.stock.integerValue || '0') : -1;\n  return stock === 0;\n});\nif (items.length === 0) return [];\nlet msg = '⚠️ CHAYE CAFE - STOCK KHATAM!\\n\\n';\nitems.forEach(d => {\n  const name = d.document.fields.name ? d.document.fields.name.stringValue : 'Unknown';\n  msg += '• ' + name + '\\n';\n});\nmsg += '\\n📦 Foran restock karein!';\nreturn [{ json: { message: msg } }];"
      }
    },
    {
      "id": "formatPurchase",
      "name": "Format Purchase",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [540, 300],
      "parameters": {
        "mode": "runOnceForAllItems",
        "language": "javaScript",
        "jsCode": "const docs = $input.all()[0].json;\nif (!Array.isArray(docs) || docs.length === 0) return [];\nconst items = docs.filter(d => {\n  const f = d.document && d.document.fields;\n  return f && f.alerted && f.alerted.booleanValue === false;\n});\nif (items.length === 0) return [];\nreturn items.map(d => {\n  const f = d.document.fields;\n  const name = f.itemName ? f.itemName.stringValue : 'Unknown';\n  const qty = f.quantity ? f.quantity.integerValue : '0';\n  const buy = f.buyPrice ? (f.buyPrice.doubleValue || f.buyPrice.integerValue || '0') : '0';\n  const sell = f.sellPrice ? (f.sellPrice.doubleValue || f.sellPrice.integerValue || '0') : '0';\n  const cost = f.totalCost ? (f.totalCost.doubleValue || f.totalCost.integerValue || '0') : '0';\n  const by = f.performedBy ? f.performedBy.stringValue : 'Employee';\n  let msg = '🛒 CHAYE CAFE - Naya Purchase!\\n\\n';\n  msg += '👤 By: ' + by + '\\n';\n  msg += '📦 Item: ' + name + '\\n\\n';\n  msg += '📊 Qty: ' + qty + ' packs\\n';\n  msg += '   Buy: Rs.' + buy + '/pc\\n';\n  msg += '   Sell: Rs.' + sell + '/pc\\n';\n  msg += '   Total: Rs.' + cost + '\\n\\n';\n  msg += '✅ Stock updated!';\n  return { json: { message: msg, docId: d.document.name.split('/').pop() } };\n});"
      }
    },
    {
      "id": "formatKhataReminder",
      "name": "Format Khata Reminder",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [540, 500],
      "parameters": {
        "mode": "runOnceForAllItems",
        "language": "javaScript",
        "jsCode": "const docs = $input.all()[0].json;\nif (!Array.isArray(docs) || docs.length === 0) return [];\nconst today = new Date().toISOString().split('T')[0];\nconst over = docs.filter(d => {\n  const f = d.document && d.document.fields;\n  if (!f) return false;\n  const bal = parseFloat(f.totalBalance ? (f.totalBalance.doubleValue || f.totalBalance.integerValue || '0') : '0');\n  const lim = parseFloat(f.creditLimit ? (f.creditLimit.doubleValue || f.creditLimit.integerValue || '0') : '0');\n  const alerted = f.alertedDate ? f.alertedDate.stringValue : null;\n  return bal > lim && lim > 0 && alerted !== today;\n});\nif (over.length === 0) return [];\nreturn over.map(d => {\n  const f = d.document.fields;\n  const name = f.name ? f.name.stringValue : 'Unknown';\n  const bal = parseFloat(f.totalBalance ? (f.totalBalance.doubleValue || f.totalBalance.integerValue || '0') : '0').toFixed(2);\n  let msg = '⚠️ CHAYE CAFE - Khata Limit!\\n\\n';\n  msg += '👤 ' + name + '\\n';\n  msg += '💰 Rs. ' + bal + '\\n';\n  msg += '🚨 Limit exceed!';\n  return { json: { message: msg, docId: d.document.name.split('/').pop() } };\n});"
      }
    },
    {
      "id": "formatKhataTx",
      "name": "Format Khata Tx",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [540, 700],
      "parameters": {
        "mode": "runOnceForAllItems",
        "language": "javaScript",
        "jsCode": "const docs = $input.all()[0].json;\nif (!Array.isArray(docs) || docs.length === 0) return [];\nconst items = docs.filter(d => {\n  const f = d.document && d.document.fields;\n  return f && f.alerted && f.alerted.booleanValue === false;\n});\nif (items.length === 0) return [];\nreturn items.map(d => {\n  const f = d.document.fields;\n  const type = f.type ? f.type.stringValue : 'credit';\n  const cust = f.customerName ? f.customerName.stringValue : 'Unknown';\n  const amt = parseFloat(f.amount ? (f.amount.doubleValue || f.amount.integerValue || '0') : '0').toFixed(2);\n  let msg = '';\n  if (type === 'payment') {\n    msg = '💰 Payment Received!\\n\\n👤 ' + cust + '\\n💵 Rs. ' + amt + '\\n\\n🙏 Shukriya!';\n  } else {\n    msg = '📝 Naya Udhar: ' + cust + ' (Rs. ' + amt + ')';\n  }\n  return { json: { message: msg, docId: d.document.name.split('/').pop(), type: type } };\n});"
      }
    },
    {
      "id": "sendLowStock",
      "name": "TG Low Stock",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1.2,
      "position": [800, 100],
      "parameters": {
        "resource": "message",
        "operation": "sendMessage",
        "chatId": "YOUR_TELEGRAM_CHAT_ID",
        "text": "={{ $json.message }}",
        "replyMarkup": "none"
      },
      "credentials": {
        "telegramApi": {
          "id": "VOMjqsAVXvJCbglz",
          "name": "New Telegram Bot API"
        }
      }
    },
    {
      "id": "sendPurchase",
      "name": "TG Purchase",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1.2,
      "position": [800, 300],
      "parameters": {
        "resource": "message",
        "operation": "sendMessage",
        "chatId": "YOUR_TELEGRAM_CHAT_ID",
        "text": "={{ $json.message }}",
        "replyMarkup": "none"
      },
      "credentials": {
        "telegramApi": {
          "id": "VOMjqsAVXvJCbglz",
          "name": "New Telegram Bot API"
        }
      }
    },
    {
      "id": "sendKhataReminder",
      "name": "TG Khata Reminder",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1.2,
      "position": [800, 500],
      "parameters": {
        "resource": "message",
        "operation": "sendMessage",
        "chatId": "YOUR_TELEGRAM_CHAT_ID",
        "text": "={{ $json.message }}",
        "replyMarkup": "none"
      },
      "credentials": {
        "telegramApi": {
          "id": "VOMjqsAVXvJCbglz",
          "name": "New Telegram Bot API"
        }
      }
    },
    {
      "id": "sendKhataTx",
      "name": "TG Khata Tx",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1.2,
      "position": [800, 700],
      "parameters": {
        "resource": "message",
        "operation": "sendMessage",
        "chatId": "YOUR_TELEGRAM_CHAT_ID",
        "text": "={{ $json.message }}",
        "replyMarkup": "none"
      },
      "credentials": {
        "telegramApi": {
          "id": "VOMjqsAVXvJCbglz",
          "name": "New Telegram Bot API"
        }
      }
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [[
        {"node": "Get Low Stock", "type": "main", "index": 0},
        {"node": "Get New Purchases", "type": "main", "index": 0},
        {"node": "Get Khata Customers", "type": "main", "index": 0},
        {"node": "Get Khata Transactions", "type": "main", "index": 0}
      ]]
    },
    "Get Low Stock": {
      "main": [[{"node": "Format Low Stock", "type": "main", "index": 0}]]
    },
    "Get New Purchases": {
      "main": [[{"node": "Format Purchase", "type": "main", "index": 0}]]
    },
    "Get Khata Customers": {
      "main": [[{"node": "Format Khata Reminder", "type": "main", "index": 0}]]
    },
    "Get Khata Transactions": {
      "main": [[{"node": "Format Khata Tx", "type": "main", "index": 0}]]
    },
    "Format Low Stock": {
      "main": [[{"node": "TG Low Stock", "type": "main", "index": 0}]]
    },
    "Format Purchase": {
      "main": [[{"node": "TG Purchase", "type": "main", "index": 0}]]
    },
    "Format Khata Reminder": {
      "main": [[{"node": "TG Khata Reminder", "type": "main", "index": 0}]]
    },
    "Format Khata Tx": {
      "main": [[{"node": "TG Khata Tx", "type": "main", "index": 0}]]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "saveDataErrorExecution": "all",
    "saveDataSuccessExecution": "all"
  }
};

fs.writeFileSync('n8n-workflow-simple.json', JSON.stringify(workflow, null, 2));
console.log('Workflow created: n8n-workflow-simple.json');