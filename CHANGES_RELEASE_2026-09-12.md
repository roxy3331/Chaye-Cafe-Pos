# Safety + Features Release — 2026-09-12

**LLM Council roadmap ka Phase 1 (Safety) + 4 naye features**

---

## 🔒 Security Hardening (Tier 0+1)

### Owner role ab pinned UIDs se aata hai — users collection se nahi
- `firestore.rules`: `isOwner()` ab 12 hardcoded owner UIDs check karta hai
- `users/{uid}`: create sirf `role: 'employee'` ke saath; **update blocked** → koi bhi client se `role: 'owner'` write NAHI kar sakta (pehle ye hole tha — URL wala koi bhi owner ban sakta tha)
- `src/lib/config.ts` (naya): `OWNER_UIDS` — rules ka mirror
- `Login.tsx`: users doc sirf pehli dafa banta hai (role hamesha 'employee'); effectiveRole = pinned UID + owner username
- `App.tsx`: role resolution pinned UID se (users doc read hataya)
- `scripts/list-owner-uids.mjs` (naya): owner UIDs nikalne ka admin tool

### Khata rules change
- `khataTransactions` delete ab signed-in users ke liye (employee delete ke liye zaroori)
- `khataCustomers` delete owner-only hi rahega

### Secrets scrubbed
- Telegram bot token/chat ID: `alerts/index.js` ab env vars (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) se; baaki files mein placeholders
- `.gitignore`: junk logs, n8n workflow exports, unrelated workspace folders
- Deleted: deprecated `src/firebase.ts`, Firebase default `public/index.html`, `nul` files
- 4 mahine ka uncommitted kaam GitHub private repo par push (commit 0e8fd7e)

---

## ✨ Naye Features

### 1. Khata — "Kisne Add Kiya" Tag
- Har nayi entry par chhota pill: 👑 owner / 👤 employee
- Edit par "✏️ edited" marker (kaun edit karta hai wo bhi)
- Purani entries par koi tag nahi (clean)
- Fields: `createdBy`, `updatedBy` on khataTransactions

### 2. Employee Ko Khata Mein Full Access
- Employee ab kar sakta hai: customer edit, pin/unpin, transaction edit + delete
- Customer DELETE sirf owner (cascade risky)
- Action row ab dono roles ke liye 6-col grid

### 3. Dashboard PUBG/Shop Card Fix
- Bug: card SAARE items (bik chuke bhi) ginta tha aur totalInvested sale ke baad 0 ho jata tha → "Rs 0 / koi stock nahi" ghalat dikhta tha
- Fix: sirf in-stock (quantity > 0) items + loaded flag (loading mein neutral text)
- Shop card same fix

### 4. Entry History Page (naya) 📜
- Route `/history` — sidebar + mobile drawer mein "Entry History" (dono roles)
- Filters: Aaj / Is Hafte / Is Mahine / Sab + **date picker** (koi khaas date)
- Har entry: item, packs/pcs, **poora date + waqt alag lines**, salesman/booker (call buttons), expiry, purana bacha stock
- **Prices + total kharcha sirf owner ko**
- Naye entries par 👑/👤 tag (`createdBy` ab addPurchase mein bhi)
- `subscribeToPurchases` (naya) + periodUtils mein 'week' period

### 5. Share Report Zinda + Vendor Delete/Edit
- ShareReport: "Share to WhatsApp" ab kaam karta hai (real numbers), metric toggles real, business WhatsApp number input (localStorage)
- Reports: "Business WhatsApp" real numbers ke saath wa.me; "Simple Share" navigator.share/clipboard; Share screen ka link
- Vendors: edit + delete implement (confirm modal ke saath) — TODO khatam

---

## ⚠️ ACTION REQUIRED — Firestore Rules Manual Paste

`firebase deploy` billing se blocked hai, is liye naye rules **manually** paste karne honge:

1. https://console.firebase.google.com → project **chaye-cafe-pos**
2. Firestore Database → **Rules** tab
3. **Named database select karein:** `ai-studio-11604781-3243-486c-acd1-dd3729b669bf` (NOT default!)
4. `firestore.rules` (repo root) ka content paste karein → **Publish**

Publish hone ke baad:
- Employee khata delete kaam karega (publish hone tak permission error dega)
- Koi bhi naya user khud ko owner NAHI bana sakta

**Note:** Agar owner naye device/browser se login kare to naya anonymous UID banega — wo owner nahi hoga jab tak us UID ko rules + `src/lib/config.ts` mein add na kiya jaye. Owner UIDs: `node scripts/list-owner-uids.mjs`

---

**Build:** `npm run build` ✅ pass (type-check clean)
