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
  createdBy?: 'owner' | 'employee'; // who added this entry
  updatedBy?: 'owner' | 'employee'; // who last edited this entry
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
  profit: number;             // totalAmount − unitCost × quantity (±, negative = loss)
  customerName?: string;
  playerId?: string;          // PUBG player ID / nickname
  note?: string;
  date: any;
  monthKey: string;           // 'YYYY-MM'
}

// ============ Online Shop (Accessories) ============

export type ShopPlatform = 'olx' | 'facebook' | 'whatsapp' | 'walkin' | 'other';

export interface ShopItem {
  id: string;
  name: string;
  category: string;           // emoji-prefixed: '🎧 Audio', '📱 Mobile', '🔌 Cables', '⌚ Wearables', '🎯 Gaming', '🏷️ Other'
  buyPrice: number;           // weighted average cost per unit
  sellPrice: number;
  quantity: number;
  totalInvested: number;      // exact accounting
  lowStockAt: number;         // alert threshold (default 2)
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
  date: any;
  monthKey: string;           // 'YYYY-MM'
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
  date: any;
  monthKey: string;           // 'YYYY-MM'
}
