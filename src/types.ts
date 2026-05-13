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
}
