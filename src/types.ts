export interface StockItem {
  id: string;
  name: string;
  category: string;
  batchNumber: string;
  averageBuy: number;
  currentSell: number;
  stock: number;
  status: 'Normal' | 'Low Stock' | 'Closed';
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
