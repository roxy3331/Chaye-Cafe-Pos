export interface StockItem {
  id: string;
  name: string;
  category: string;
  batchNumber: string;
  averageBuy: number;
  currentSell: number;
  stock: number;
  status: 'Normal' | 'Low Stock' | 'Closed';
  expiryDate?: string; // YYYY-MM-DD format
}

export interface Vendor {
  id: string;
  name: string;
  phoneNumber?: string; // Company main number (optional)
  salesmanName?: string;
  salesmanPhone?: string;
  orderBookerName?: string;
  orderBookerPhone?: string;
  lastPurchaseDate?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  note: string;
}

export interface BatchRecord {
  id: string;
  productName: string;
  batchNumber: string;
  startDate: string;
  endDate: string;
  purchased: number;
  sold: number;
  remaining: number;
  netProfit: number;
  status: 'Closed';
}

export interface ReturnEntry {
  id: string;
  itemName: string;
  category: string;
  returnType: 'customer_return' | 'supplier_return';
  quantity: number;        // in pcs
  pcsPerPack: number;
  buyPrice: number;
  sellPrice: number;
  reason?: string;
  date: any;
}

// Per-item cafe stock khata — stock/{itemId}/transactions subcollection doc
export interface StockTransaction {
  id: string;
  type: 'purchase' | 'sale';   // purchase = stock aaya, sale = stock gaya
  quantity: number;            // in pcs
  unitPrice: number;           // per-pc buy cost (purchase) ya sell price (sale)
  timestamp: any;              // Firestore serverTimestamp
}

export interface KhataCustomer {
  id: string;
  name: string;
  phone?: string;
  note?: string;
  pin?: string;
  pinned?: boolean;
  pinnedAt?: any;
  totalBalance: number; // total udhar baaki (positive = customer pe baaki, negative = customer ne zyada diya)
  createdAt: any;
  creditLimit?: number;        // max allowed udhar (0 = no limit)
  trustBadge?: 'regular' | 'reliable' | 'caution'; // manual trust rating
  lastTransactionAt?: any;     // Firestore timestamp of last tx (for inactive flag)
}

export interface KhataTransaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'credit' | 'payment'; // credit = udhar diya, payment = paise aaye
  amount: number;
  note?: string;
  date: any;
  updatedAt?: any;
  dueDate?: string; // YYYY-MM-DD, optional payment due date
}

// ============ PUBG Hisab ============

export interface PubgItem {
  id: string;
  name: string;               // '60 UC', '325 UC', 'PUBG Account Lvl 40', custom
  category: 'UC' | 'Account' | 'Item';
  buyPrice: number;           // weighted average cost per unit (PKR)
  sellPrice: number;          // current selling price per unit
  quantity: number;           // units in stock
  totalInvested: number;      // quantity × buyPrice (exact accounting)
  updatedAt?: any;
}

export interface PubgPurchase {
  id: string;
  itemId?: string;
  name: string;
  category: 'UC' | 'Account' | 'Item';
  quantity: number;
  unitCost: number;
  totalCost: number;
  source?: string;            // distributor / website / reseller
  note?: string;
  date: any;
  monthKey: string;           // 'YYYY-MM'
}

export interface PubgSale {
  id: string;
  itemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;          // actual sell price per unit (editable — rates fluctuate)
  totalAmount: number;        // unitPrice × quantity
  unitCost: number;           // frozen weighted-avg cost at sale time
  profit: number;             // totalAmount − unitCost × quantity − platformFee (±, negative = loss)
  platformFee?: number;       // marketplace/commission fee (deducted from profit)
  saleType?: 'stock' | 'account' | 'direct-uc'; // stock = pubgItems, account = pubgAccounts, direct-uc = no stock
  directCategory?: 'UC' | 'USDT' | 'Account' | 'Other'; // direct-sale category (saleType === 'direct-uc')
  linkedAccountId?: string;   // pubgAccounts doc (account sales — used by refund logic)
  refunded?: boolean;         // true = sale reversed; profit excluded from all totals
  refundDate?: any;
  refundReason?: string;
  recoveryCode?: string;      // 10-digit recall code snapshot (account sales)
  loginStatus?: 'instant' | 'pending';  // pending = login baad mein transfer hoga (7-day alert)
  loginTransferDate?: any;    // serverTimestamp when sale marked 'pending'
  loginEmail?: string;        // sale time par account se copy — Sold History mein PIN-locked
  loginPassword?: string;     // sale time par account se copy — Sold History mein PIN-locked
  customerName?: string;
  playerId?: string;          // PUBG player ID / nickname
  note?: string;
  date: any;
  monthKey: string;           // 'YYYY-MM'
}

// Direct-sale categories — no stock tracking (UC / USDT / Account / Other)
export type PubgDirectCategory = 'UC' | 'USDT' | 'Account' | 'Other';

// Serial-tracked PUBG account (one doc per account — warranty + ownership trail)
export interface PubgAccountStock {
  id: string;
  name: string;                     // label, e.g. 'PUBG Account Lvl 40'
  characterId?: string;             // in-game character ID
  boughtFrom: 'Customer' | 'Seller';
  ownerName: string;                // original owner (re-claim / ban dispute)
  ownerCnic?: string;               // CNIC proof of ownership
  warrantyLink?: string;            // proof URL (Drive / screenshot) — UI mein PIN-locked
  loginEmail?: string;              // baad mein "Edit Logins" se add hota hai (PIN-locked display)
  loginPassword?: string;           // Add Account form mein nahi — sirf Edit Logins / sale copy
  recoveryCode?: string;            // 10-digit recall code
  buyingPrice: number;
  warrantyDays: number;             // int ≥ 0 (0 = No Warranty — expiry calculate nahi hoti)
  expiryDate: string;               // 'YYYY-MM-DD' = purchaseDate + warrantyDays ('' if 0)
  status: 'available' | 'sold' | 'refunded';
  saleId?: string;                  // linked pubgSale doc (refund reversal)
  soldPrice?: number;               // frozen at sale time (refund UI)
  createdAt?: any;
  updatedAt?: any;
}

// Manual profit / loss / expense outside sales (video earnings, marketing, ads)
export interface PubgDirectEntry {
  id: string;
  type: 'profit' | 'loss' | 'expense'; // amount always positive; type decides sign
  amount: number;
  description?: string;
  date: any;
  monthKey: string;               // 'YYYY-MM'
}

// ============ Online Shop (Accessories) ============

export type ShopPlatform = 'olx' | 'facebook' | 'whatsapp' | 'walkin' | 'other';

// Step-wise stock workflow: processing → shipping (trackingId + 15-day alert) → active → sold
export type ShopItemStatus = 'processing' | 'shipping' | 'active' | 'sold';

export interface ShopItemVariant {
  label: string;               // jaise: 'Red' / 'Red / M'
  quantity: number;
  sku?: string;                // variant sub-SKU (jaise: 'IPC-RD-M')
}

export interface ShopItem {
  id: string;
  name: string;
  category: string;           // emoji-prefixed: '🎧 Audio', '📱 Mobile', '🔌 Cables', '⌚ Wearables', '🎯 Gaming', '🏷️ Other'
  sku: string;                // auto-generated short code (jaise: 'IPC-4821')
  buyPrice: number;           // weighted average cost per unit
  sellPrice: number;
  quantity: number;
  totalInvested: number;      // exact accounting
  lowStockAt: number;         // custom low-stock alert threshold (default 2)
  email?: string;             // customer/supplier email (legacy field)
  orderEmail?: string;        // email jis se ye order/batch kiya gaya — Pending card se Edit hota hai
  trackingId?: string;        // shipping tracking ID (shipping step mein add hota hai)
  shippedAt?: any;            // timestamp when moved to shipping
  status?: ShopItemStatus;    // legacy docs = undefined → 'active' treat hota hai
  expiryDate?: string;        // ISO 'YYYY-MM-DD' (edibles) — 🟠 badge if ≤ 7 days
  variants?: ShopItemVariant[];
  vendorId?: string;          // vendors/{id} link
  archived?: boolean;         // true = Active Stock se chhupa hua (Show Archived se dikhta hai)
  updatedAt?: any;
}

export interface ShopPurchase {
  id: string;
  itemId?: string;
  name: string;
  category: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  source?: string;            // Daraz / Alibaba / vendor
  vendorId?: string;          // vendors/{id} link
  orderEmail?: string;        // email jis se product order kiya (naya batch workflow — required)
  status?: 'processing' | 'shipping' | 'active';  // batch lifecycle; legacy docs (undefined) = purchase-time merged
  trackingId?: string;        // shipping tracking ID
  shippedAt?: any;            // timestamp when moved to shipping
  date: any;
  monthKey: string;           // 'YYYY-MM'
}

// Email-based batch stock (v2 workflow) — shopPurchases doc with status tracking.
// Deliver hone par quantity shopItems mein merge ho jati hai; batch history permanent rehta hai.
export interface ShopBatch {
  id: string;
  productName: string;
  orderEmail: string;                              // required — email se order kiya
  quantity: number;
  buyingPrice: number;                             // per-unit cost
  status: 'processing' | 'shipping' | 'active';    // 'active' = delivered + merged
  trackingId?: string;
  createdAt: any;
}

export interface ShopOrder {
  id: string;
  itemId?: string;
  name: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;        // unitPrice × quantity
  courierReceived: number;    // customer se courier liya (default 0)
  courierPaid: number;        // owner ne courier diya (default 0)
  unitCost: number;           // frozen weighted-avg cost at order time
  profit: number;             // totalAmount + courierReceived − unitCost×qty − courierPaid (±)
  platform: ShopPlatform;
  customerName?: string;
  customerPhone?: string;
  note?: string;
  status?: 'delivered' | 'returned';  // return = profit 0 + stock restored
  refunded?: boolean;
  returnDate?: any;
  profitBeforeReturn?: number;        // audit trail (original profit)
  variantLabel?: string;              // agar koi specific variant becha
  date: any;
  monthKey: string;           // 'YYYY-MM'
}
