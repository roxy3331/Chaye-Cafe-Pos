# 🚀 CHAYE CAFE POS — n8n Automation Setup Guide

## Your Config
- **Firebase Project:** chaye-cafe-pos
- **Firestore DB:** ai-studio-11604781-3243-486c-acd1-dd3729b669bf
- **Telegram Chat ID:** 7955481761
- **n8n URL:** http://158.101.105.179:5678

---

## Import Kaise Karo (Each Workflow)

1. n8n kholo → http://158.101.105.179:5678
2. Top-right → **+ New Workflow**
3. Top-right 3 dots → **Import from File**
4. JSON file select karo
5. **Save** karo
6. **Activate** toggle on karo ✅

---

## Workflows List

| File | Trigger | Kya karta hai |
|------|---------|---------------|
| workflow-01-daily-profit-report.json | Roz 10 PM | Aaj ka profit Telegram |
| workflow-02-low-stock-alert.json | Har ghante | Stock < 5 alert |
| workflow-03-stock-khatam-alert.json | Har 30 min | Stock = 0 alert |
| workflow-04-monthly-report.json | 1 tarikh 9 AM | Monthly summary |
| workflow-05-loss-alert.json | Roz 11 PM | Expenses > Profit warning |
| workflow-06-weekly-summary.json | Har Monday 9 AM | Week ka report |
| workflow-07-dead-stock-alert.json | Roz 8 AM | 15 din se nahi bika |
| workflow-08-employee-webhook.json | Webhook | Employee purchase → owner alert |
| workflow-09-price-change-webhook.json | Webhook | Nayi price > puraani → alert |

---

## Webhooks ke liye App Update

workflow-08 aur workflow-09 ke liye, POS app mein webhook call add karna hoga.
Webhook URLs milenge jab aap workflow import karoge.

---

## Test Karna

Har workflow import karne ke baad:
1. Workflow kholo
2. Top-right → **Test Workflow** (play button)
3. Telegram pe message aana chahiye ✅
