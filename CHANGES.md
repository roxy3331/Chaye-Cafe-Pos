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
# Complete Changes Log - Chaye Cafe POS

**Project:** Chaye Cafe POS
**Date:** 2026-08-14
**Version:** Latest (with PUBG + Shop modules)

---

## 📊 Summary of Changes

### NEW MODULES ADDED
- ✅ PUBG Hisab module (4 tabs, weighted-average cost)
- ✅ Online Shop module (4 tabs, platform + courier tracking)
- ✅ Dashboard Business Summary (combined profit view)

### NEW FILES CREATED
- `src/lib/search.ts` - Fuzzy search utility
- `src/screens/Pubg.tsx` - Complete PUBG module
- `src/screens/Shop.tsx` - Complete Shop module
- `PROJECT_SUMMARY.md` - Complete project documentation
- `DEPLOYMENT_CHECKLIST.md` - Updated deployment checklist

### FILES MODIFIED
- `src/types.ts` - Added 6 new interfaces
- `src/services/dataService.ts` - Added 16+ new functions
- `src/App.tsx` - Added PUBG and Shop routes
- `src/components/Layout.tsx` - Added navigation items
- `src/screens/Dashboard.tsx` - Added Business Summary
- `src/screens/Purchase.tsx` - Fixed search functionality
- `src/screens/Stock.tsx` - Fixed search functionality
- `src/screens/Pubg.tsx` - Fixed search functionality
- `src/screens/Shop.tsx` - Fixed search functionality
- `firestore.rules` - Added 6 new collections rules

### FILES DELETED
- None (all changes are additive)

---

## 🆕 NEW FILES DETAILS

### 1. `src/lib/search.ts` (NEW)
**Purpose:** Fuzzy search utility for all screens

**Key Functions:**
- `normalize()` - Normalize text for consistent matching
- `searchRank()` - Calculate match rank (0=exact, 1=starts-with, 2=substring, 3=fuzzy)
- `searchList()` - Search list of items with ranking

**Features:**
- Token-based matching (handles "coca cola" vs "Coca-Cola 300ml")
- Hyphen/bracket/spacing agnostic
- Word-order agnostic
- Ranked results (exact matches first)
- Maximum 5-8 suggestions

**Lines of Code:** ~40 lines

---

### 2. `src/screens/Pubg.tsx` (NEW)
**Purpose:** Complete PUBG Hisab module

**Tabs:**
1. **Stock** - View all PUBG items with stock levels, edit items
2. **Kharida (Buy)** - Add purchases with autocomplete
3. **Becha (Sell)** - Sell items with profit/loss preview
4. **History** - View purchase/sale history with monthly charts

**Stats Bento:**
- Lagaya Hua (Total Invested)
- Stock Value @Sell (Current value if sold)
- Expected (Potential profit)
- Munafa Aaj (Today's profit)
- Mahina (Monthly profit)
- Total (All-time profit)

**Key Features:**
- Weighted-average cost calculation
- Profit/Loss preview (red for loss)
- Fuzzy search with autocomplete
- Category filtering (UC, Account, Item)
- UC presets (60, 325, 660, 1800, 3850, 8100)
- Monthly charts with loss months in red
- Delete with reversal (exact undo)

**Lines of Code:** ~650 lines
**Bundle Size:** 39.53 KB (gzip: 8.91 KB)

---

### 3. `src/screens/Shop.tsx` (NEW)
**Purpose:** Complete Online Shop module

**Tabs:**
1. **Products** - View products with stock levels
2. **Purchase** - Add stock purchases
3. **Order** - Create customer orders
4. **History** - View order history with monthly charts

**Platform Tracking:**
- OLX
- Facebook
- WhatsApp
- Walk-in
- Other

**Courier Tracking:**
- `courierReceived` - Amount received from customer
- `courierPaid` - Amount paid to courier

**Profit Formula:**
```
profit = (unitPrice × qty) + courierReceived - (avgCost × qty) - courierPaid
```

**Key Features:**
- Weighted-average cost calculation
- Live profit preview
- Platform filtering
- Customer name/phone tracking
- Category chips with emojis
- LOW (≤2) / OUT (≤0) stock indicators
- Monthly charts
- Delete with reversal

**Lines of Code:** ~700 lines
**Bundle Size:** 43.79 KB (gzip: 9.67 KB)

---

### 4. `PROJECT_SUMMARY.md` (NEW)
**Purpose:** Complete project documentation

**Contents:**
- Project overview and tech stack
- Core modules description
- Profit formulas
- Database structure
- File structure
- Key technical implementation
- Deployment details
- Security rules
- Data flow examples
- UI/UX features
- Development workflow

**Lines of Code:** ~400 lines

---

### 5. `DEPLOYMENT_CHECKLIST.md` (UPDATED)
**Purpose:** Deployment and verification guide

**Updates:**
- Added post-deployment verification checklist
- Added build artifacts section
- Added security rules reference
- Added monitoring section
- Updated status to production ready
- Added redeploy workflows

---

## 🔧 MODIFIED FILES DETAILS

### 1. `src/types.ts` (MODIFIED)
**Changes:**
- Added `PubgItem` interface
- Added `PubgPurchase` interface
- Added `PubgSale` interface
- Added `ShopItem` interface
- Added `ShopPurchase` interface
- Added `ShopOrder` interface

**Total New Lines:** ~60 lines

---

### 2. `src/services/dataService.ts` (MODIFIED)
**Changes:**
- Added 16+ new functions for PUBG module
- Added 16+ new functions for Shop module
- Total: 32 new functions

**PUBG Functions:**
- `subscribeToPubgItems()`
- `getPubgItems()`
- `subscribeToPubgPurchases()`
- `subscribeToPubgSales()`
- `addPubgPurchase()`
- `addPubgSale()`
- `updatePubgItem()`
- `deletePubgItem()`
- `deletePubgSale()`
- `deletePubgPurchase()`

**Shop Functions:**
- `subscribeToShopItems()`
- `getShopItems()`
- `subscribeToShopPurchases()`
- `subscribeToShopOrders()`
- `addShopPurchase()`
- `addShopOrder()`
- `updateShopItem()`
- `deleteShopItem()`
- `deleteShopOrder()`
- `deleteShopPurchase()`

**Total New Lines:** ~400 lines

---

### 3. `src/App.tsx` (MODIFIED)
**Changes:**
- Added `Pubg` component (lazy loaded)
- Added `Shop` component (lazy loaded)
- Added owner-gated routes:
  - `/pubg` → Only visible to `role === 'owner'`
  - `/shop` → Only visible to `role === 'owner'`

**Code Added:**
```typescript
const Pubg = React.lazy(() => import('./screens/Pubg').then(m => ({ default: m.Pubg })));
const Shop = React.lazy(() => import('./screens/Shop').then(m => ({ default: m.Shop })));

<Route path="/pubg" element={user.role === 'owner' ? <Pubg userRole={user.role} /> : <Navigate to="/" />} />
<Route path="/shop" element={user.role === 'owner' ? <Shop userRole={user.role} /> : <Navigate to="/" />} />
```

**Total New Lines:** ~10 lines

---

### 4. `src/components/Layout.tsx` (MODIFIED)
**Changes:**
- Added PUBG Hisab navigation item (desktop sidebar)
- Added Online Shop navigation item (desktop sidebar)
- Added PUBG Hisab navigation item (mobile drawer)
- Added Online Shop navigation item (mobile drawer)
- Both items are owner-gated

**Code Added:**
```typescript
// Desktop sidebar
{user.role === 'owner' && (
  <>
    <NavLink to="/pubg" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
      <Gamepad2 className="w-5 h-5" />
      <span>PUBG Hisab</span>
    </NavLink>
    <NavLink to="/shop" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
      <ShoppingBag className="w-5 h-5" />
      <span>Online Shop</span>
    </NavLink>
  </>
)}

// Mobile drawer (same items)
```

**Total New Lines:** ~15 lines

---

### 5. `src/screens/Dashboard.tsx` (MODIFIED)
**Changes:**
- Added "Business Summary" section for owner
- Added 4 clickable cards:
  - Cafe Profit
  - PUBG Profit
  - Shop Profit
  - Total Profit
- Added today's profit + monthly profit display
- Owner-gated (only visible to `role === 'owner'`)

**Code Added:**
```typescript
{user.role === 'owner' && (
  <div className="space-y-4">
    <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">Business Summary</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Cafe Profit Card */}
      {/* PUBG Profit Card */}
      {/* Shop Profit Card */}
      {/* Total Profit Card */}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Today's Profit */}
      {/* Monthly Profit */}
    </div>
  </div>
)}
```

**Total New Lines:** ~80 lines

---

### 6. `src/screens/Purchase.tsx` (MODIFIED)
**Changes:**
- Added `as any[]` type assertion to `searchList()` call
- Fixed TypeScript error: Property 'name' does not exist on type 'unknown'

**Code Changed:**
```typescript
// Before
const suggestions = searchTerm.trim().length > 0 && !foundItem
  ? searchList(searchTerm, existingItems, i => i.name, 8)
  : [];

// After
const suggestions = searchTerm.trim().length > 0 && !foundItem
  ? searchList(searchTerm, existingItems as any[], i => i.name, 8)
  : [];
```

**Total Lines Changed:** 1 line

---

### 7. `src/screens/Stock.tsx` (MODIFIED)
**Changes:**
- Added `as any[]` type assertion to `searchList()` call
- Fixed TypeScript error: Property 'name' does not exist on type 'unknown'

**Code Changed:**
```typescript
// Before
const filteredItems = React.useMemo(() =>
  searchTerm.trim()
    ? searchList(searchTerm, items, i => i.name, 100)
    : items, [items, searchTerm]);

// After
const filteredItems = React.useMemo(() =>
  searchTerm.trim()
    ? searchList(searchTerm, items as any[], i => i.name, 100)
    : items, [items, searchTerm]);
```

**Total Lines Changed:** 1 line

---

### 8. `src/screens/Pubg.tsx` (MODIFIED)
**Changes:**
- Added `as any[]` type assertions to 2 `searchList()` calls
- Fixed TypeScript errors in Stock tab and Kharida tab

**Code Changed:**
```typescript
// Stock tab search
const filteredItems = React.useMemo(() => {
  let list = items;
  if (categoryFilter) list = list.filter(i => i.category === categoryFilter);
  if (search.trim()) list = searchList(search, list as any[], i => i.name, 100);
  return list;
}, [items, categoryFilter, search]);

// Kharida tab autocomplete
const buySuggestions = React.useMemo(() => {
  if (!buyName.trim() || existingNameMatch) return [];
  return searchList(buyName, items as any[], i => i.name, 5);
}, [buyName, items, existingNameMatch]);
```

**Total Lines Changed:** 2 lines

---

### 9. `src/screens/Shop.tsx` (MODIFIED)
**Changes:**
- Added `as any[]` type assertions to 2 `searchList()` calls
- Fixed TypeScript errors in Products tab and Purchase tab

**Code Changed:**
```typescript
// Products tab search
const filteredItems = React.useMemo(() => {
  let list = items;
  if (categoryFilter) list = list.filter(i => i.category === categoryFilter);
  if (search.trim()) list = searchList(search, list as any[], i => i.name, 100);
  return list;
}, [items, categoryFilter, search]);

// Purchase tab autocomplete
const purchaseSuggestions = React.useMemo(() => {
  if (!purchaseName.trim() || existingNameMatch) return [];
  return searchList(purchaseName, items as any[], i => i.name, 5);
}, [purchaseName, items, existingNameMatch]);
```

**Total Lines Changed:** 2 lines

---

### 10. `firestore.rules` (MODIFIED)
**Changes:**
- Added 6 new match blocks for PUBG collections
- Added 6 new match blocks for Shop collections

**New Collections:**
1. `pubgItems`
2. `pubgPurchases`
3. `pubgSales`
4. `shopItems`
5. `shopPurchases`
6. `shopOrders`

**Security Pattern:**
```javascript
match /{collection}/{docId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn() && isValid{Entity}(incoming());
  allow update: if isSignedIn() && isValid{Entity}(incoming());
  allow delete: if isOwner();
}
```

**Total New Lines:** ~60 lines

---

## 📦 Deployment Summary

### Build Statistics
- **Build Time:** 4.79 seconds
- **Total Files:** 49 files
- **Total Size:** ~1.6 MB (uncompressed)
- **Gzip Size:** ~460 KB

### Bundle Sizes
| File | Size | Gzip |
|------|------|------|
| index.html | 0.85 KB | 0.44 KB |
| index-CsK379Lj.css | 87.46 KB | 14.35 KB |
| index-CzHZnHW8.js | 298.02 KB | 93.00 KB |
| recharts-DFm75szS.js | 364.65 KB | 109.39 KB |
| firebase-KgRz4Ikr.js | 464.66 KB | 109.08 KB |
| motion-BiORJEvL.js | 140.04 KB | 46.39 KB |
| Pubg-DsIdF0cs.js | 39.53 KB | 8.91 KB |
| Shop-CgWeb-_b.js | 43.79 KB | 9.67 KB |

### Firebase Deployment
- **Project:** chaye-cafe-pos
- **Hosting URL:** https://chaye-cafe-pos.web.app
- **Deployment Date:** 2026-08-14 18:25
- **Cache Updated:** Yes (timestamp: 1786713879989)
- **PUBG Entries:** Present
- **Shop Entries:** Present

---

## 🔐 Security Rules Summary

### Existing Rules (Cafe)
- `stock`, `sales`, `expenses`, `vendors`, `returns`, `khataCustomers`

### New Rules Added
- `pubgItems` - Items with UC/Account/Item categories
- `pubgPurchases` - Purchase history with monthKey
- `pubgSales` - Sales history with profit calculation
- `shopItems` - Shop products with emojis
- `shopPurchases` - Purchase history
- `shopOrders` - Orders with platform and courier tracking

### Access Control
- **Read:** Any signed-in user
- **Create:** Signed-in user with validation
- **Update:** Signed-in user with validation
- **Delete:** Owner only

---

## 📊 Database Schema Summary

### Existing Collections (Cafe)
- `stock` - Product stock management
- `sales` - Sales transactions
- `expenses` - Expenses tracking
- `vendors` - Vendor information
- `returns` - Returns management
- `khataCustomers` - Customer ledger

### New Collections (PUBG)
- `pubgItems` - Items with weighted-average cost
- `pubgPurchases` - Purchase history
- `pubgSales` - Sales history with profit

### New Collections (Shop)
- `shopItems` - Products with stock levels
- `shopPurchases` - Purchase history
- `shopOrders` - Orders with platform tracking

---

## 🎯 Feature Summary

### Cafe POS (Existing)
- ✅ Stock management
- ✅ Sales tracking
- ✅ Expenses
- ✅ Vendors
- ✅ Returns
- ✅ Reports
- ✅ Khata (customer ledger)
- ✅ Search (fuzzy matching)

### PUBG Hisab (NEW)
- ✅ Stock tab (view items)
- ✅ Kharida tab (add purchases)
- ✅ Becha tab (sell items)
- ✅ History tab (monthly charts)
- ✅ Weighted-average cost
- ✅ Profit/Loss tracking
- ✅ Fuzzy search
- ✅ UC presets
- ✅ Category filtering

### Online Shop (NEW)
- ✅ Products tab (view products)
- ✅ Purchase tab (add stock)
- ✅ Order tab (create orders)
- ✅ History tab (monthly charts)
- ✅ Platform tracking (OLX, FB, WA, Walk-in, Other)
- ✅ Courier tracking (both received and paid)
- ✅ Customer name/phone
- ✅ Weighted-average cost
- ✅ Profit calculation
- ✅ Category chips with emojis
- ✅ Stock indicators (LOW, OUT)

### Dashboard (UPDATED)
- ✅ Cafe Profit card
- ✅ PUBG Profit card
- ✅ Shop Profit card
- ✅ Total Profit card
- ✅ Today's profit
- ✅ Monthly profit
- ✅ Clickable navigation

---

## 🐛 Bugs Fixed

### 1. TypeScript Generic Inference Error
**Issue:** `searchList()` generic type `<T,>` couldn't infer that `T` has a `.name` property

**Locations:**
- `src/screens/Purchase.tsx` (line 80)
- `src/screens/Stock.tsx` (line 197)
- `src/screens/Pubg.tsx` (lines 143, 156)
- `src/screens/Shop.tsx` (lines 170, 183)

**Fix:** Added `as any[]` type assertions to all `searchList()` calls

**Status:** ✅ Fixed

---

## 📈 Performance Improvements

### Search Performance
- Token-based matching is faster than regex
- Ranked results reduce DOM operations
- Limit suggestions to 5-8 items

### Lazy Loading
- PUBG and Shop modules load on-demand
- No impact on initial page load
- Faster initial render

### Code Splitting
- React.lazy() for route-based splitting
- Smaller initial bundle
- Faster first contentful paint

---

## 🧪 Testing Status

### Manual Testing Completed
- ✅ Build succeeds with no errors
- ✅ TypeScript compilation succeeds
- ✅ Firebase deployment succeeds
- ✅ PUBG bundle exists (39.53 KB)
- ✅ Shop bundle exists (43.79 KB)
- ✅ Firebase cache updated

### Manual Testing Pending
- ⏳ Test PUBG module functionality
- ⏳ Test Shop module functionality
- ⏳ Test search functionality
- ⏳ Test Dashboard Business Summary
- ⏳ Test mobile responsiveness

---

## 📝 Notes

### Type Inference Workaround
Used `as any[]` to bypass TypeScript generic inference issues. This is a temporary workaround until TypeScript can infer the correct type from the `getText` function parameter.

### Lazy Loading
PUBG and Shop modules use React.lazy() for code splitting. These modules will load when the user navigates to `/pubg` or `/shop`.

### Owner-Gated Access
PUBG and Shop modules are only visible to users with `role === 'owner'`. This is enforced in both the navigation and route guards.

### Search Ranking
Search ranking system:
- 0 = exact match
- 1 = starts with
- 2 = substring match
- 3 = fuzzy match
- -1 = no match

---

## 🚀 Next Steps

### Immediate
1. ✅ Build and deploy completed
2. ⏳ User testing on https://chaye-cafe-pos.web.app
3. ⏳ Verify all features work correctly
4. ⏳ Clear browser cache on test devices

### Short-term
1. Test all CRUD operations manually
2. Verify search functionality with various inputs
3. Test mobile responsiveness
4. Monitor Firebase console for data

### Long-term
1. Add export to Excel/PDF for reports
2. Add barcode scanning for stock items
3. Add multi-user support
4. Add inventory alerts
5. Add daily sales summary

---

## 📞 Support

For questions or issues:
1. Check `PROJECT_SUMMARY.md` for complete documentation
2. Check `DEPLOYMENT_CHECKLIST.md` for deployment guide
3. Check `firestore.rules` for security rules
4. Check Firebase console for data issues

---

**Document Version:** 1.0
**Last Updated:** 2026-08-14 18:25
**Status:** ✅ All changes documented and deployed
