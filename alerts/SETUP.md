# n8n Workflow Setup Guide

## Files Created:
1. `n8n-workflow-oauth.json` - Main workflow (OAuth2 authentication)
2. `serviceAccount.json` - Your Firebase service account

## Setup Steps in n8n:

### Step 1: Create OAuth2 Credential
1. Go to n8n Dashboard → Settings → Credentials
2. Click "Add Credential"
3. Select "OAuth2"
4. Fill in these details:

| Field | Value |
|-------|-------|
| **Credential Name** | Firebase OAuth2 |
| **Grant Type** | JWT |
| **Access Token URL** | https://oauth2.googleapis.com/token |
| **Scope** | https://www.googleapis.com/auth/datastore |
| **Client Email** | firebase-adminsdk-fbsvc@chaye-cafe-pos.iam.gserviceaccount.com |
| **Private Key** | (Paste from serviceAccount.json) |

### Step 2: Import Workflow
1. n8n → Workflows → Import from File
2. Select `n8n-workflow-oauth.json`
3. The credential "Firebase OAuth2" should auto-connect

### Step 3: Test & Activate
1. Click "Test Workflow" 
2. If works → Click "Activate"

---

## How It Works:
- Schedule Trigger: Runs every 5 minutes
- OAuth2: n8n automatically generates tokens
- 4 Firestore queries: Stock, Purchases, Khata Customers, Khata Transactions
- Format nodes: Create Telegram messages
- Telegram nodes: Send to your bot

---

## Troubleshooting:
- If OAuth fails: Re-check the Private Key matches serviceAccount.json
- If Telegram fails: Check bot token in credentials