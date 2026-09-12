# Chaye Cafe POS — Project Context

**Last Updated:** 2026-06-10  
**Project Path:** `C:\Users\MY PC\Desktop\chaye-cafe-pos`

---

## Project Overview

**Chaye Cafe POS** ek React + TypeScript + Firebase based Point of Sale system hai cafe/shop ke liye.

### Key Features
- **Khata Management** — Customer credit/udhar tracking
- **Sales & Reports** — Daily sales, reports with charts (Recharts)
- **Inventory** — Stock management with low stock alerts
- **Calculator** — Built-in calculator for quick math
- **PIN Security** — Secure access with PIN (ab remove ho gaya)
- **WhatsApp Integration** — Business WhatsApp button (ab Telegram only)
- **Telegram Alerts** — Low stock, new purchases, khata reminders, khata transactions

---

## Tech Stack

| Technology | Version |
|------------|---------|
| React | 19.0.1 |
| TypeScript | 5.8.2 |
| Firebase | 12.12.1 (Auth, Firestore) |
| Tailwind CSS | 4.1.14 |
| Vite | 6.2.3 |
| Recharts | 3.8.1 (reports) |
| React Router | 7.14.2 |
| Lucide React | 0.546.0 |
| Motion | 12.23.24 |

---

## Project Structure

```
chaye-cafe-pos/
├── src/
│   ├── components/        # UI components
│   ├── pages/             # Main pages
│   ├── services/          # dataService.ts, etc.
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utilities
│   ├── types/             # TypeScript types
│   └── styles/            # Global styles
├── alerts/                # Telegram alert script (desktop copy)
├── public/                # Static assets
├── .agents/               # Agent configs
├── .commandcode/          # Taste preferences
├── .claude/               # Claude commands/skills
├── .opencode/             # Opencode configs
└── dist/                  # Build output
```

---

## Firestore Collections

| Collection | Documents | Purpose |
|------------|-----------|---------|
| `stock` | ~92 | Inventory items |
| `purchases` | ~200 | Sales transactions |
| `khataCustomers` | ~38 | Credit customers |
| `khataTransactions` | ~200 | Khata transactions |

**Named Database ID:** `ai-studio-11604781-3243-486c-acd1-dd3729b669bf`

---

## Telegram Alert System

**Status:** ✅ Production Ready  
**Location:** `C:\chaye-cafe-alerts\` (production)  
**Desktop Copy:** `C:\Users\MY PC\Desktop\chaye-cafe-pos\alerts\`

### Alert Types
1. **Low Stock** — Consolidated alert when stock = 0 (each run)
2. **New Purchases** — Detect `alerted:false`, send alert, patch to `alerted:true`
3. **New Khata Transactions** — Detect `alerted:false`, send alert, patch to `alerted:true`
4. **Khata Over-Limit** — Send once per day per customer (uses `alertedDate` field)

### Configuration
- **Bot Token:** `YOUR_TELEGRAM_BOT_TOKEN`
- **Chat ID:** `YOUR_TELEGRAM_CHAT_ID`
- **Schedule:** Every 15 minutes via Windows Task Scheduler
- **Task Name:** `ChayeCafePOS-Alerts`
- **Log File:** `C:\chaye-cafe-alerts\last_run.log`

---

## Recent Work (2026-06-10)

### Latest Commits
1. **65fe342** — Fix: strip undefined fields in addKhataCustomer before Firestore addDoc
2. **438877b** — UI: compact customer list, full name, balance right, pin/delete in detail page
3. **ca7f60e** — Multiple fixes: khata edit undefined error, WA Business button, vendor auto-save, PIN removal, calculator expression, no waking-up loader, reports safety timeout, heartbeat fix

### Current State
- ✅ Khata customer edit fix complete
- ✅ UI improvements done
- ✅ Telegram alerts working
- ✅ Firestore integration stable

---

## Global Skills Installed

**Location:** `C:\Users\MY PC\AppData\Roaming\npm\node_modules\command-code\skills\`

| Skill | Purpose |
|-------|---------|
| autoresearch | Modify, verify, keep/discard loop |
| frontend-design | Distinctive UI design guidance |
| claude-deep-research | Research report generation |
| claude-seo | Complete SEO toolkit |
| claudedesignskills | Design skills |
| dev-browser | Browser automation |
| humanizer | Remove AI writing patterns |
| pm-skills | Project management |
| Skill_Seekers | Skill discovery |
| social-media-skills | LinkedIn/content creation |
| superpowers | Development superpowers |
| vault-daydream | Obsidian vault connections |
| web-scraper | Web scraping strategies |
| WellAlly-health | Health analyzer |

---

## Important Files

| File | Purpose |
|------|---------|
| `src/services/dataService.ts` | Firestore CRUD operations |
| `alerts/index.js` | Telegram alert script (desktop copy) |
| `src/types/index.ts` | TypeScript interfaces |
| `firestore.rules` | Security rules |
| `CHAT_CONTEXT.md` | This file |

---

## Commands

```bash
# Development
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run preview      # Preview build
npm run lint         # TypeScript check

# Deployment
npm run deploy       # Deploy to hosting
```

---

## Notes for Future Sessions

1. **Language:** Communicate in Urdu/Hindi (Roman script)
2. **Alert System:** Check `C:\chaye-cafe-alerts\last_run.log` for status
3. **WhatsApp Removed:** Only Telegram alerts now
4. **PIN Removed:** No PIN security anymore
5. **Firestore:** Uses named database ID (not default)

---

## Contact/Access

- **n8n:** `http://129.153.11.98:5678` (workflows deleted, only server access)
- **Firebase Console:** `chaye-cafe-pos` project
- **AI Studio:** `https://ai.studio/apps/11604781-3243-486c-acd1-dd3729b669bf`

---

*Context saved for future reference. Last updated: 2026-06-10*
