# 🔧 Manual Firestore Rules Update

## ⚠️ Kyun zaroori hai
Firebase deploy billing ki wajah se blocked hai, is liye rules manually Firebase Console mein paste karne hote hain.

> **Latest update:** Rules mein PUBG Hisab (`pubgItems`, `pubgPurchases`, `pubgSales`) aur Online Shop (`shopItems`, `shopPurchases`, `shopOrders`) ke 6 naye collections add hue hain. Ye aapke purane console rules ka SAME style hai (simple, no strict validation) + sirf naye collections — is liye kuch existing cheez tootegi nahi.

## 📋 Steps

### 1. Open Firestore Rules Editor
Go to: https://console.firebase.google.com/project/chaye-cafe-pos/firestore/rules

### 2. PURANE rules ko mukammal tareeqay se replace karein is se (ye local `firestore.rules` ka exact copy hai):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
    function isSignedIn() { return request.auth != null; }
    function isOwner() {
      return isSignedIn() &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'owner';
    }
    match /stock/{id} { allow read, update: if isSignedIn(); allow create: if isSignedIn(); allow delete: if isOwner(); }
    match /purchases/{id} { allow read, create: if isSignedIn(); allow update, delete: if isOwner(); }
    match /openingStock/{id} { allow read, create: if isSignedIn(); allow update, delete: if isOwner(); }
    match /expenses/{id} { allow read, create: if isSignedIn(); allow update, delete: if isOwner(); }
    match /vendors/{id} { allow read, create, update: if isSignedIn(); allow delete: if isOwner(); }
    match /sales/{id} { allow read, create: if isSignedIn(); allow update, delete: if isOwner(); }
    match /returns/{id} { allow read, create: if isSignedIn(); allow update, delete: if isOwner(); }
    match /users/{userId} {
      allow get: if isSignedIn();
      allow create: if isSignedIn() && userId == request.auth.uid;
      allow update: if isSignedIn() && userId == request.auth.uid;
      allow delete: if isOwner();
    }
    match /monthlyProfits/{id} { allow read: if isSignedIn(); allow write: if isOwner(); }
    match /meta/{id} { allow read: if isSignedIn(); allow write: if isOwner(); }
    match /khataCustomers/{id} { allow read, create, update: if isSignedIn(); allow delete: if isOwner(); }
    match /khataTransactions/{id} { allow read, create, update: if isSignedIn(); allow delete: if isOwner(); }

    // ─── PUBG HISAB ───
    match /pubgItems/{id} { allow read, create, update: if isSignedIn(); allow delete: if isOwner(); }
    match /pubgPurchases/{id} { allow read, create: if isSignedIn(); allow update, delete: if isOwner(); }
    match /pubgSales/{id} { allow read, create: if isSignedIn(); allow update, delete: if isOwner(); }

    // ─── ONLINE SHOP ───
    match /shopItems/{id} { allow read, create, update: if isSignedIn(); allow delete: if isOwner(); }
    match /shopPurchases/{id} { allow read, create: if isSignedIn(); allow update, delete: if isOwner(); }
    match /shopOrders/{id} { allow read, create: if isSignedIn(); allow update, delete: if isOwner(); }
  }
}
```

### 3. "Publish" button dabayein

### 4. Browser cache clear karein
- `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac)

### 5. Test karein
- https://chaye-cafe-pos.web.app pe owner login
- Sidebar → **PUBG Hisab** kholen → Kharida tab se item add karein (ye tabhi kaam karega jab rules publish ho jayein)
- Sidebar → **Online Shop** kholen → Purchase → Order (platform + courier ke saath)

---

## 🔍 Agar phir bhi permission-denied aaye

1. **User role check karein** — Firestore Console → `users` collection → apne auth UID wala doc → `role` field = `"owner"` hona chahiye
2. **Force refresh** — `Ctrl + Shift + R`
3. **Logout → dobara login** (naya anonymous session)
4. **Rules lagoo hui hain?** — Console mein rules editor ke upar "Published" timestamp check karein
