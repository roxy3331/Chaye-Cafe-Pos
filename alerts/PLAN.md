# n8n Workflow Setup Plan

## Current Workflows

| File | Trigger | Auth Type | Status |
|------|---------|-----------|--------|
| n8n-workflow-oauth.json | Schedule (5 min) | OAuth2 | ❌ Missing alerted update |
| n8n-workflow-simple.json | Schedule (5 min) | Hardcoded JWT | ❌ Missing alerted update, token expired |
| n8n-workflow-schedule.json | Schedule (5 min) | JWT (built-in) | ❌ Missing alerted update |
| n8n-workflow-fixed.json | Webhook | JWT (broken) | ❌ Wrong project, JWT broken |

## Issues to Fix

### 1. Missing `alerted` Field Update (CRITICAL)
Har alert bhejne ke baad document ki `alerted` field `true` karni chahiye:
- **purchases**: `alerted: true`
- **khataTransactions**: `alerted: true`
- **khataCustomers**: `alertedDate: YYYY-MM-DD`

Iske liye Firestore PATCH request add karni hogi.

### 2. Authentication Issues
- **simple**: Hardcoded JWT expired hai
- **oauth**: OAuth credential setup zaroori hai
- **schedule**: Built-in JWT generation sahi hai
- **fixed**: JWT signing incomplete hai, aur wrong project (`ai-studio-...`)

### 3. Project Mismatch
- Main project: `chaye-cafe-pos`
- Wrong project in fixed: `ai-studio-11604781-3243-486c-acd1-dd3729b669bf`

## Recommended Workflow

**Best option: `n8n-workflow-schedule.json`**
- Schedule trigger (har 5 minute)
- Built-in JWT generation (auto-refresh)
- Main project (`chaye-cafe-pos`)
- Bas `alerted` update steps add karni hain

## Setup Steps

### Step 1: Choose & Import Workflow
1. Open n8n dashboard
2. Import `n8n-workflow-schedule.json`
3. Activate workflow

### Step 2: Add Alerted Update Nodes
Har Telegram node ke baad add karni hain:

```
Telegram → Update Firestore (alerted = true)
```

Firestore PATCH request:
- **URL**: `https://firestore.googleapis.com/v1/{docPath}?updateMask.fieldPaths=alerted`
- **Method**: PATCH
- **Body**: `{"fields": {"alerted": {"booleanValue": true}}}`

### Step 3: Test
1. Webhook test karein ya manual trigger chalayen
2. Telegram message aana chahiye
3. Database mein `alerted` field check karein

## Testing Checklist

- [ ] Low stock alert (stock = 0)
- [ ] Purchase alert (alerted: false → true)
- [ ] Khata limit alert (ek baar per day)
- [ ] Khata transaction alert (alerted: false → true)
- [ ] Payment received message ("Shukriya")

## Taste Preferences (Applied)

- Low stock: Stock = 0 per run alert bhejo
- Khata over-limit: Ek baar per day (alertedDate use karein)
- Payment: "Shukriya" message bhejo
- New purchases/transactions: alerted:false detect → alert → patch to true