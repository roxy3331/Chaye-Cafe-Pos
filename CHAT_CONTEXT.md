# CHAT CONTEXT / HANDOFF — Chaye Cafe POS
**Last updated:** 2026-09-13
**Purpose:** Next chat ke liye poora context. Ye file padh kar naya session kaam shuru kar sakta hai.

---

## 1. CURRENT STATE (abhi kya chal raha hai)

- **Live app:** https://chaye-cafe-pos.web.app — **LAPTOP VERSION RESTORED & DEPLOYED** (commit `5b40d3b`, 2026-09-13)
- **Repo:** `C:\Users\MY PC\Desktop\chaye-cafe-pos` (git, GitHub: `roxy3331/Chaye-Cafe-Pos`, private, branch main)
- **Data 100% SAFE** — kuch bhi lost nahi hua. Last verified counts: shopItems 31, shopPurchases 120, shopOrders 16, stock 85, purchases 765+, sales 530+, khataCustomers 45, khataTransactions 2119+, pubgItems 0 (khali — sab bik chuke the, ye normal hai)
- **Firestore rules LIVE aur SAHI hain** (permissive laptop rules — Console mein kuch paste NAHI karna, already correct)

### Laptop version ke features (jo ab live hain):
- **Stock Khata**: har item ki transaction history (`stock/{id}/transactions` subcollection), Stock screen par modal
- **PUBG Hisab (rewrite)**: `pubgAccounts` (serial accounts + warranty + PIN `1234` locked logins + refunds), `pubgDirectEntries` (direct UC sale / profit / loss / expense)
- **Shop pipeline**: Pending tab (processing→shipping→active batches, tracking, 15-din shipping alert), Active Stock (SKU, variants, expiry, archive, damaged), returns with restock, purchase edit, embedded Vendors tab
- **Khata quick-add** (customer list se seedha credit/payment + over-payment/limit warnings)
- **Munafa Chhupa/Dikha** toggle (ProfitVisibilityContext, `localStorage chaye:profitHidden`)
- **Offline cache**: `initializeFirestore(app, { localCache: persistentLocalCache(...) }, databaseId)` — deploy ke baad devices par hard-refresh zaroori
- Mobile bottom nav: Home, Cafe, Khata, PUBG(owner), Shop(owner)

---

## 2. CRITICAL TECHNICAL FACTS (galti se mat bigaarna)

1. **NAMED DATABASE:** App `ai-studio-11604781-3243-486c-acd1-dd3729b669bf` named DB use karti hai (firestoreDatabaseId in `firebase-applet-config.json`; `firebase.json` mein bhi database field hai).
2. **Rules deploy:** `firebase deploy --only firestore:rules` CLI **default DB** ko target karta hai (wrong DB). Rules kabhi change karni hon to: `node scripts/rules-api.mjs` (self-signed JWT; `list` / `publish` commands) ya Console mein **named DB select kar ke** paste.
3. **Deploy tarika:** `npm run build` → `firebase deploy --only hosting` — ye safe hai.
4. **Auth:** owner/employee + password `123`, anonymous Firebase auth, role `users/{uid}.doc` se. **Security hole known** (koi bhi URL + anonymous auth se apni users doc mein role owner likh sakta hai). Pichhli baar UID-pinning try hui thi — **FAIL hui** kyunki har naye login ka anonymous UID badal jata hai aur owner employee ban gaya tha (is se poora "sab kharab" episode hua). Agar security karni ho to email/password auth use karo, UID pinning NAHI.
5. **REST quirk (known, ignore karo):** Raw REST `listDocuments` 403 deta hai valid ID token ke saath bhi (document GET 200 chalta hai). **Firebase Web SDK (getDocs/onSnapshot) bilkul theek chalta hai** — app par koi asar nahi. Is pe dobara time waste na karna.
6. **Telegram alerts:** `alerts/` scripts ab env vars use karte hain (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`); real values sirf prod copy `C:\chaye-cafe-alerts\` mein hain.
7. **Laptop original dump:** `C:\Users\MY PC\Desktop\CAFE POS LAPTOP` (flat src + `(1)/(2)` junk download-duplicates — canonical files already repo mein restore ho chuki hain, dobara copy ki zaroorat nahi).

### Useful scripts (repo mein):
- `node scripts/check-data.mjs` — sab collections ka count + shop items list
- `node scripts/rules-api.mjs list` — live rules content dekhna
- `node scripts/list-owner-uids.mjs` — users collection se owner UIDs

---

## 3. NEXT CHAT KE PENDING FEATURES (user ne khud bataye — yahin se shuru karna)

### Feature A: Dashboard Business Summary — PUBG card bug
**Masla (user ne bataya):** Dashboard Business Summary mein PUBG card "abhi stock nahi" jaisa dikhata hai jabke PUBG Hisab mein stock add hai.
**Pehla ashubha (investigate first):** Dashboard ka PUBG card shayad sirf `pubgItems` (UC/items) count karta hai — **`pubgAccounts` (accounts) count nahi karta**. Agar owner ne PUBG Hisab mein accounts add kiye hain (ya items ke ilawa sirf accounts hain), card khali dikhega. Pubg.tsx ke Stock tab mein dono mix hote hain (category chips: Sab / UC / Accounts / Item).
**Fix direction:** Dashboard.tsx mein PUBG card ka subtitle `pubgItems` (quantity>0) **+** `pubgAccounts` (available status) dono ginnay. `subscribeToPubgItems` aur `subscribeToPubgAccounts` dono dataService mein already hain.

### Feature B: Khata history — "kisne add kiya" tag 👑/👤
Har khata entry par chhota tag (👑 owner / 👤 employee), edit par "edited" marker. Purani entries bina tag (no migration).
**Ready reference:** Commit `55a2330` mein poora implementation tha (KhataDetail.tsx pills, dataService `createdBy`/`updatedBy`, types.ts). Us se adapt karo — **dhyan:** laptop version ke Khata.tsx mein ab quick-add flow bhi hai, wahan bhi createdBy pass karna hoga.

### Feature C: Cafe entry history screen 📜
Cafe ki har purchase-entry ki history — poora date + waqt, filters (Aaj / Is Hafte / Is Mahine / Sab + khaas date picker), prices sirf owner ko, 👑/👤 tag.
**Ready reference:** Commit `55a2330` mein `src/screens/History.tsx` + `subscribeToPurchases` + periodUtils mein 'week' period tha. Adapt notes: laptop `addPurchase` ab `stock/{id}/transactions` bhi likhta hai; History purchases collection se banegi to alert docs filter karna (`!p.alertType && p.itemName`).

### Feature D (baqi backlog — user chahe to):
- Employee ko khata edit/delete access (customer delete sirf owner) — rules change bhi chahiye (`khataTransactions` delete → isSignedIn)
- ShareReport wiring + Reports share buttons + Vendor edit/delete — sab `55a2330` mein ready hai
- Long-term ideas: real email/password auth, PWA install, Day-End Cash Count, PDF/Excel export

---

## 4. BRIEF HISTORY (kya hua tha — context)

- **Sep 12-13:** PC par: 4-mahine ka uncommitted kaam GitHub push (backup `0e8fd7e`), security hardening + 4 features deploy (`55a2330`) — **lekin owner naye anonymous UID par employee ban gaya** → "sab kharab" → revert (`9f68180`).
- Asli latest version **laptop** par tha (upar wale naye features ke saath) jo PC-code deploy se overwrite ho gaya tha. User ne laptop folder diya.
- **Data "gayab" ka dar sirf display-level tha** — REST quirk + role bug + purana code. Data kabhi delete nahi hua (har baar counts verify kiye).
- **Sep 13:** Laptop version restore → SDK query test pass → build → deploy (`5b40d3b`) → data counts verified. **Sab theek.**

**Rule of thumb next chat ke liye:** Deploy se pehle SDK-query test + data counts check karo, aur **user se pooch kar deploy karo** (user ne khud bola: "puch kr krna jo bi krna hai").
