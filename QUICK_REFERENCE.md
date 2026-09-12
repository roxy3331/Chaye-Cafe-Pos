# Quick Reference - Chaye Cafe POS

**Last Updated:** 2026-08-14

---

## 🚀 How to Access New Features

### 1. PUBG Hisab
- **URL:** https://chaye-cafe-pos.web.app/pubg
- **Navigation:** Sidebar → "PUBG Hisab" (only visible to owner)
- **4 Tabs:**
  - 📦 Stock (View items)
  - 🛒 Kharida (Buy items)
  - 💰 Becha (Sell items)
  - 📊 History (Monthly charts)

### 2. Online Shop
- **URL:** https://chaye-cafe-pos.web.app/shop
- **Navigation:** Sidebar → "Online Shop" (only visible to owner)
- **4 Tabs:**
  - 📦 Products (View products)
  - 🛒 Purchase (Add stock)
  - 📦 Order (Create order)
  - 📊 History (Monthly charts)

### 3. Dashboard Business Summary
- **URL:** https://chaye-cafe-pos.web.app/
- **Navigation:** Home → "Business Summary" (only visible to owner)
- **4 Cards:** Cafe Profit, PUBG Profit, Shop Profit, Total Profit
- **2 Stats:** Today's Profit, Monthly Profit

---

## 💰 Profit Formulas

### PUBG
```
Weighted-Average Cost = (old_qty × old_avg + new_qty × new_rate) / total_qty
Profit = (unitPrice - avgCost) × qty
```

### Shop
```
Profit = (unitPrice × qty) + courierReceived - (avgCost × qty) - courierPaid
```

---

## 🔍 Search Tips

### What Search Can Match
- ✅ "coca cola" → "Coca-Cola 300ml"
- ✅ "coca cola" → "coca cola"
- ✅ "300 cola" → "Coca-Cola 300ml"
- ✅ "coc" → "coca"

### Search Ranking
- 0 = Exact match
- 1 = Starts with
- 2 = Substring
- 3 = Fuzzy

---

## 📊 Data Flow

### PUBG Purchase Flow
1. Select item from autocomplete dropdown
2. Enter quantity (blocked if insufficient stock)
3. Enter unit cost
4. System calculates total cost and new average
5. Atomic batch save (item + purchase record)

### PUBG Sale Flow
1. Select item from dropdown (stock only)
2. Enter quantity (blocked if insufficient stock)
3. Enter unit price (pre-filled but editable)
4. System calculates live profit preview
5. If profit < 0, shows in red
6. Atomic batch save (item + sale record)

### Shop Order Flow
1. Select item from dropdown
2. Enter quantity (blocked if insufficient stock)
3. Enter unit price (editable)
4. Enter courierReceived (from customer)
5. Enter courierPaid (by owner)
6. Select platform (OLX/Facebook/WhatsApp/Walk-in/Other)
7. System calculates live profit preview
8. Optional: customer name, phone, note
9. Atomic batch save (item + order record)

---

## 📁 Key Files

### Source Files
- `src/lib/search.ts` - Search utility
- `src/screens/Pubg.tsx` - PUBG module
- `src/screens/Shop.tsx` - Shop module
- `src/types.ts` - Type definitions
- `src/services/dataService.ts` - Data operations

### Documentation
- `PROJECT_SUMMARY.md` - Complete project documentation
- `CHANGES.md` - Detailed changes log
- `DEPLOYMENT_CHECKLIST.md` - Deployment guide

### Config Files
- `firestore.rules` - Security rules
- `firebase.json` - Firebase configuration
- `package.json` - Dependencies and scripts

---

## 🔐 Security Rules

### Access Levels
- **Read:** Any signed-in user
- **Create:** Signed-in user with validation
- **Update:** Signed-in user with validation
- **Delete:** Owner only

### Required Roles
- `owner` - Full access (can view/edit/delete all data)
- `employee` - Read-only access (can only view data)

---

## 📱 Navigation

### Desktop
- Sidebar on the left
- Navigation items: Dashboard, Stock, Purchase, etc.
- PUBG Hisab (Gamepad2 icon)
- Online Shop (ShoppingBag icon)

### Mobile
- Drawer from left side
- Same navigation items
- PUBG Hisab (Gamepad2 icon)
- Online Shop (ShoppingBag icon)

---

## 🎨 Visual Indicators

### Profit/Loss
- 🟢 Green = Profit
- 🔴 Red = Loss

### Stock Status
- 🟡 LOW (≤2 items) - Yellow pill
- 🔴 OUT (≤0 items) - Red pill

### Platform Tags
- 🔵 OLX
- 🟣 Facebook
- 🟢 WhatsApp
- 🟤 Walk-in
- ⚪ Other

---

## 🚀 Build & Deploy

### Local Development
```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Type check
```

### Firebase Deployment
```bash
# Quick deploy (only hosting)
firebase deploy --only hosting

# Full deploy (including rules)
firebase deploy

# View logs
firebase deploy --only hosting --verbosity=debug
```

---

## 📊 Current Build Info

- **Build Date:** 2026-08-14 18:25
- **Total Files:** 49
- **Bundle Size:** ~1.6 MB (uncompressed)
- **Gzip Size:** ~460 KB
- **PUBG Bundle:** 39.53 KB (gzip: 8.91 KB)
- **Shop Bundle:** 43.79 KB (gzip: 9.67 KB)

---

## 🌐 Live URLs

- **App:** https://chaye-cafe-pos.web.app
- **Firebase Console:** https://console.firebase.google.com/project/chaye-cafe-pos/overview
- **Hosting:** https://console.firebase.google.com/project/chaye-cafe-pos/hosting
- **Firestore:** https://console.firebase.google.com/project/chaye-cafe-pos/firestore

---

## 🐛 Common Issues

### Issue: Tabs not showing
**Fix:** Clear browser cache (`Ctrl + F5`)

### Issue: Search not working
**Fix:** Already fixed (fuzzy matching enabled)

### Issue: Module not loading
**Fix:** Clear browser cache and hard refresh

---

## ✅ Checklist Before Testing

- [ ] Clear browser cache
- [ ] Login as owner
- [ ] Navigate to /pubg
- [ ] Test adding purchase
- [ ] Test selling item
- [ ] Check profit/loss display
- [ ] Navigate to /shop
- [ ] Test creating order
- [ ] Check platform tracking
- [ ] Check dashboard cards

---

## 📞 Quick Help

### Need More Info?
1. Check `PROJECT_SUMMARY.md` for complete documentation
2. Check `CHANGES.md` for detailed changes
3. Check `DEPLOYMENT_CHECKLIST.md` for deployment guide

### Deployment Issues?
1. Check Firebase console for errors
2. Check browser console for runtime errors
3. Verify network tab for asset loading

---

**Version:** Latest (2026-08-14)
**Status:** ✅ Production Ready
