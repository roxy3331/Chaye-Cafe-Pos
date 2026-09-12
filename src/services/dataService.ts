import { collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit, getDoc, setDoc, serverTimestamp, onSnapshot, increment, writeBatch, deleteField } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

// Coerce a Firestore value into a finite number, defaulting to 0.
// Guards the whole app against NaN poisoning from missing/corrupt numeric fields.
const num = (v: any): number => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// Normalize a stock doc so every numeric field used downstream is a real number.
const normalizeStock = (doc: any) => {
  const d = doc.data();
  return {
    id: doc.id,
    ...d,
    stock: num(d.stock),
    pcsPerPack: num(d.pcsPerPack) || 1, // never 0 — would cause divide-by-zero
    averageBuy: num(d.averageBuy),
    currentSell: num(d.currentSell),
  };
};

// 'YYYY-MM' month key for business-module docs (fast month filtering)
const bizMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Normalize PUBG/Shop item docs — same numeric NaN-guards as stock
const normalizeBizItem = (d: any) => {
  const data = d.data();
  return {
    id: d.id,
    ...data,
    buyPrice: num(data.buyPrice),
    sellPrice: num(data.sellPrice),
    quantity: num(data.quantity),
    totalInvested: num(data.totalInvested),
    lowStockAt: num(data.lowStockAt) || 2,
  };
};

export const dataService = {
  // Stock
  async getStock() {
    try {
      const snap = await getDocs(collection(db, 'stock'));
      return snap.docs.map(normalizeStock);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'stock');
      return []; // return [] (not throw) so callers' `data || []` guards work
    }
  },

  subscribeToStock(callback: (data: any[]) => void) {
    return onSnapshot(collection(db, 'stock'), (snap) => {
      callback(snap.docs.map(normalizeStock));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'stock');
    });
  },

  async getSales() {
    try {
      // FULL history — Dashboard lifetime profit + App.tsx monthly-rollover both need all sales.
      // (Bounding this with limit() would silently corrupt those totals.)
      const snap = await getDocs(collection(db, 'sales'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'sales');
      return [] as any[];
    }
  },

  subscribeToSales(callback: (data: any[]) => void) {
    // FULL history — Dashboard sums all sales for the "lifetime profit" figure.
    return onSnapshot(collection(db, 'sales'), (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'sales');
    });
  },

  async addStockItem(item: any) {
    try {
      const docRef = await addDoc(collection(db, 'stock'), {
        ...item,
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'stock');
    }
  },

  async updateStock(id: string, updates: any) {
    try {
      await updateDoc(doc(db, 'stock', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `stock/${id}`);
    }
  },

  async deleteStock(id: string) {
    try {
      await deleteDoc(doc(db, 'stock', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `stock/${id}`);
    }
  },

  // Purchases
  async addPurchase(purchase: any) {
    // Use batch operation to prevent race conditions
    const batch = writeBatch(db);
    let stockDocRef: any = null;
    
    try {
      // Add purchase document
      const purchaseRef = doc(collection(db, 'purchases'));
      batch.set(purchaseRef, {
        ...purchase,
        type: 'purchase',
        date: serverTimestamp(),
        alerted: false   // n8n poller picks this up and sends Telegram
      });

      // Find and update stock in the same batch
      const q = query(collection(db, 'stock'), where('name', '==', purchase.itemName));
      const snap = await getDocs(q);

      if (!snap.empty) {
        stockDocRef = doc(db, 'stock', snap.docs[0].id);
        const oldData = snap.docs[0].data() as any;

        const soldPcs = Math.max(0, (oldData.stock || 0) - (purchase.remainingUnits || 0));
        if (soldPcs > 0 && oldData.type !== 'opening') {
          const unitSize = oldData.pcsPerPack || 1;
          const soldUnits = soldPcs / unitSize;
          const oldAvgBuy = oldData.averageBuy || purchase.buyingPricePerPc;
          const oldSellPrice = oldData.currentSell || purchase.sellingPricePerPc;

          // Add sales document in batch
          const salesRef = doc(collection(db, 'sales'));
          batch.set(salesRef, {
            itemName: purchase.itemName,
            units: soldUnits,
            buyPrice: oldAvgBuy,
            sellPrice: oldSellPrice,
            profit: soldUnits * (oldSellPrice - oldAvgBuy),
            date: serverTimestamp()
          });
        }

        const oldQty = purchase.remainingUnits || 0;
        const oldPrice = oldData.averageBuy || purchase.buyingPricePerPc;
        const newQty = purchase.totalPcs;
        const newPrice = purchase.buyingPricePerPc;

        const weightedAvg = (oldQty + newQty) === 0
          ? newPrice
          : ((oldQty * oldPrice) + (newQty * newPrice)) / (oldQty + newQty);

        // Update stock in batch
        batch.update(stockDocRef, {
          category: purchase.category,
          stock: (purchase.remainingUnits || 0) + purchase.totalPcs,
          pcsPerPack: purchase.pcsPerPack || 1,
          averageBuy: weightedAvg,
          currentSell: purchase.sellingPricePerPc,
          updatedAt: serverTimestamp(),
          type: 'purchase',
          // Persist expiry so Stock/Dashboard expiry alerts actually fire.
          expiryDate: purchase.expiryDate || deleteField(),
        });
      } else {
        // Add new stock item in batch
        const newStockRef = doc(collection(db, 'stock'));
        batch.set(newStockRef, {
          name: purchase.itemName,
          category: purchase.category || 'General',
          stock: purchase.totalPcs,
          pcsPerPack: purchase.pcsPerPack || 1,
          averageBuy: purchase.buyingPricePerPc,
          currentSell: purchase.sellingPricePerPc,
          status: 'Normal',
          updatedAt: serverTimestamp(),
          type: 'purchase',
          // Persist expiry so Stock/Dashboard expiry alerts actually fire.
          ...(purchase.expiryDate ? { expiryDate: purchase.expiryDate } : {}),
        });
      }

      // Commit all operations atomically
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'purchases');
    }
  },

  async addOpeningStock(data: any) {
    try {
      await addDoc(collection(db, 'openingStock'), {
        ...data,
        addedAt: serverTimestamp()
      });

      const q = query(collection(db, 'stock'), where('name', '==', data.itemName));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const stockDoc = snap.docs[0];
        const oldData = stockDoc.data();
        // Add to existing stock. Apply entered prices only when provided so we don't
        // wipe previously-set values, but capture them when the owner fills them in.
        const updates: any = {
          stock: (oldData.stock || 0) + data.qty,
          type: 'opening',
          updatedAt: serverTimestamp()
        };
        if (data.pcsPerPack) updates.pcsPerPack = data.pcsPerPack;
        if (data.averageBuy) updates.averageBuy = data.averageBuy;
        if (data.currentSell) updates.currentSell = data.currentSell;
        if (data.category) updates.category = data.category;
        await updateDoc(doc(db, 'stock', stockDoc.id), updates);
      } else {
        await addDoc(collection(db, 'stock'), {
          name: data.itemName,
          category: data.category || 'General',
          stock: data.qty,
          pcsPerPack: data.pcsPerPack || 1,
          averageBuy: data.averageBuy || 0,
          currentSell: data.currentSell || 0,
          type: 'opening',
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'openingStock');
    }
  },

  // Expenses
  async addExpense(expense: any) {
    try {
      await addDoc(collection(db, 'expenses'), {
        ...expense,
        date: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'expenses');
    }
  },

  async getExpenses() {
    try {
      // FULL history — Reports sums all expenses and builds a monthly breakdown from them.
      const snap = await getDocs(collection(db, 'expenses'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'expenses');
      return []; // return [] (not throw) so callers' `data || []` guards work
    }
  },

  // Vendors
  async getVendors() {
    try {
      const snap = await getDocs(collection(db, 'vendors'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'vendors');
      return []; // return [] (not throw) so callers' `data || []` guards work
    }
  },

  async addVendor(vendor: any) {
    try {
      await addDoc(collection(db, 'vendors'), vendor);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'vendors');
    }
  },

  async addOrUpdateVendorFromPurchase(data: {
    companyName: string;
    salesmanName?: string;
    salesmanPhone?: string;
    orderBookerName?: string;
    orderBookerPhone?: string;
  }) {
    try {
      if (!data.salesmanName && !data.salesmanPhone && !data.orderBookerName && !data.orderBookerPhone) return;

      // Match by phone via indexed queries (no full-collection scan / name collision).
      // Try salesman phone first, then order booker phone, so a vendor saved with only
      // an order booker phone is still recognized and not duplicated.
      let match: any = null;
      if (data.salesmanPhone) {
        const phoneQ = query(collection(db, 'vendors'), where('salesmanPhone', '==', data.salesmanPhone), limit(1));
        const phoneSnap = await getDocs(phoneQ);
        if (!phoneSnap.empty) match = phoneSnap.docs[0];
      }
      if (!match && data.orderBookerPhone) {
        const phoneQ = query(collection(db, 'vendors'), where('orderBookerPhone', '==', data.orderBookerPhone), limit(1));
        const phoneSnap = await getDocs(phoneQ);
        if (!phoneSnap.empty) match = phoneSnap.docs[0];
      }

      const today = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
      if (match) {
        const updates: any = { lastPurchaseDate: today };
        if (data.salesmanName) updates.salesmanName = data.salesmanName;
        if (data.salesmanPhone) updates.salesmanPhone = data.salesmanPhone;
        if (data.orderBookerName) updates.orderBookerName = data.orderBookerName;
        if (data.orderBookerPhone) updates.orderBookerPhone = data.orderBookerPhone;
        await updateDoc(doc(db, 'vendors', match.id), updates);
      } else {
        await addDoc(collection(db, 'vendors'), {
          name: data.companyName,
          phoneNumber: '',
          salesmanName: data.salesmanName || '',
          salesmanPhone: data.salesmanPhone || '',
          orderBookerName: data.orderBookerName || '',
          orderBookerPhone: data.orderBookerPhone || '',
          lastPurchaseDate: today,
        });
      }
    } catch (e) {
      console.warn('addOrUpdateVendorFromPurchase failed (non-fatal):', e);
    }
  },

  async getMonthlyProfits() {
    try {
      const snap = await getDocs(collection(db, 'monthlyProfits'));
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.monthKey || '').localeCompare(a.monthKey || ''));
    } catch (e) {
      console.warn('getMonthlyProfits failed (non-fatal):', e);
      return [];
    }
  },

  async getLastRecordedMonth() {
    try {
      const d = await getDoc(doc(db, 'meta', 'monthlyTracker'));
      return d.exists() ? (d.data().lastMonth as string) : null;
    } catch (e) {
      console.warn('getLastRecordedMonth failed (non-fatal):', e);
      return null;
    }
  },

  async setLastRecordedMonth(monthKey: string) {
    try {
      await setDoc(doc(db, 'meta', 'monthlyTracker'), { lastMonth: monthKey });
    } catch (e) {
      console.warn('setLastRecordedMonth failed (non-fatal):', e);
    }
  },

  // profit = NET (gross − that month's expenses). gross saved separately for the
  // Reports list which shows both columns. Optional so old callers keep working.
  async saveMonthlyProfit(monthKey: string, profit: number, label: string, gross?: number, expenses?: number) {
    try {
      await setDoc(doc(db, 'monthlyProfits', monthKey), {
        monthKey,
        label,
        profit,
        ...(gross !== undefined ? { gross } : {}),
        ...(expenses !== undefined ? { expenses } : {}),
        savedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('saveMonthlyProfit failed (non-fatal):', e);
    }
  },

  // Stock action alerts (delete / set-to-zero) — picked up by n8n poller
  async addStockAlert(alert: { alertType: 'stock_delete' | 'stock_zero'; itemName: string; previousStock?: number; performedBy: string }) {
    try {
      await addDoc(collection(db, 'purchases'), {
        ...alert,
        alerted: false,
        date: serverTimestamp(),
      });
    } catch (e) {
      console.warn('addStockAlert failed (non-fatal):', e);
    }
  },

  // ─── RETURNS SYSTEM ──────────────────────────────────────────────────────────

  // Returns history (real-time, newest first)
  subscribeToReturns(callback: (data: any[]) => void) {
    const q = query(collection(db, 'returns'), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'returns');
    });
  },

  // Add return — atomic: record + update stock + (customer return) negative sale
  async addReturn(ret: {
    itemName: string;
    category: string;
    returnType: 'customer_return' | 'supplier_return';
    quantity: number;   // in pcs
    pcsPerPack: number;
    buyPrice: number;
    sellPrice: number;
    reason?: string;
  }) {
    try {
      const batch = writeBatch(db);

      // 1. Record return entry
      const retRef = doc(collection(db, 'returns'));
      batch.set(retRef, { ...ret, date: serverTimestamp() });

      // 2. Find the stock doc
      const stockQ = query(collection(db, 'stock'), where('name', '==', ret.itemName));
      const stockSnap = await getDocs(stockQ);

      if (!stockSnap.empty) {
        const stockDoc = stockSnap.docs[0];
        const currentStock = (stockDoc.data().stock as number) || 0;

        if (ret.returnType === 'customer_return') {
          // Customer returned item → stock goes back up
          batch.update(stockDoc.ref, {
            stock: currentStock + ret.quantity,
            updatedAt: serverTimestamp(),
          });
          // Negative sale to reduce profit (atomic)
          const soldUnits = ret.quantity / (ret.pcsPerPack || 1);
          const saleRef = doc(collection(db, 'sales'));
          batch.set(saleRef, {
            itemName: ret.itemName,
            units: -soldUnits,
            buyPrice: ret.buyPrice,
            sellPrice: ret.sellPrice,
            profit: -(soldUnits * (ret.sellPrice - ret.buyPrice)),
            date: serverTimestamp(),
            isReturn: true,
            reason: ret.reason || '',
          });
        } else {
          // Supplier return → stock decreases (you're sending it back)
          batch.update(stockDoc.ref, {
            stock: Math.max(0, currentStock - ret.quantity),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'returns');
    }
  },

  // Record a stock reduction (e.g. "Set to Zero" / manual edit that lowers stock)
  // and create a sale doc for the sold amount so profit is actually counted.
  // Mirrors the sale-creation logic in addPurchase. Atomic via writeBatch.
  async recordStockReduction(item: {
    id: string;
    name: string;
    stock: number;
    pcsPerPack: number;
    averageBuy: number;
    currentSell: number;
    type?: string;
  }, newStock: number) {
    try {
      const oldStock = item.stock || 0;
      const safeNew = Math.max(0, newStock);
      const soldPcs = Math.max(0, oldStock - safeNew);

      const batch = writeBatch(db);
      const stockRef = doc(db, 'stock', item.id);

      // Only record a sale when stock actually decreased AND it's not an opening item
      // (matches addPurchase, which intentionally skips profit for opening-stock items).
      if (soldPcs > 0 && item.type !== 'opening') {
        const unitSize = item.pcsPerPack || 1;
        const soldUnits = soldPcs / unitSize;
        const buyPrice = item.averageBuy || 0;
        const sellPrice = item.currentSell || 0;
        const profit = soldUnits * (sellPrice - buyPrice);

        const salesRef = doc(collection(db, 'sales'));
        batch.set(salesRef, {
          itemName: item.name,
          units: soldUnits,
          buyPrice,
          sellPrice,
          profit,
          date: serverTimestamp(),
          source: 'stock_adjustment',
        });
      }

      batch.update(stockRef, { stock: safeNew, updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `stock/${item.id}`);
    }
  },

  // ─── KHATA SYSTEM ────────────────────────────────────────────────────────────

  // Customer list (real-time)
  subscribeToKhataCustomers(callback: (data: any[]) => void) {
    return onSnapshot(collection(db, 'khataCustomers'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // sort by name
      list.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      callback(list);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'khataCustomers');
    });
  },

  // Add new customer
  async addKhataCustomer(customer: { name: string; phone?: string; note?: string; pin?: string; creditLimit?: number; trustBadge?: 'regular' | 'reliable' | 'caution' }) {
    try {
      const cleaned = Object.fromEntries(Object.entries(customer).filter(([, v]) => v !== undefined && v !== null));
      const docRef = await addDoc(collection(db, 'khataCustomers'), {
        ...cleaned,
        pinned: false,
        pinnedAt: serverTimestamp(),
        totalBalance: 0,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'khataCustomers');
    }
  },

  // Delete customer + ALL their transactions (cascade) — owner only
  async deleteKhataCustomer(customerId: string) {
    try {
      const txSnap = await getDocs(
        query(collection(db, 'khataTransactions'), where('customerId', '==', customerId))
      );
      const batch = writeBatch(db);
      txSnap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, 'khataCustomers', customerId));
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `khataCustomers/${customerId}`);
    }
  },

  // Subscribe to a SINGLE customer doc (efficient — no full collection scan)
  subscribeToSingleKhataCustomer(customerId: string, callback: (data: any | null) => void) {
    return onSnapshot(doc(db, 'khataCustomers', customerId), (snap) => {
      callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, `khataCustomers/${customerId}`);
    });
  },

  // Update customer info
  async updateKhataCustomer(customerId: string, updates: { name?: string; phone?: string; note?: string; pin?: string; creditLimit?: number; trustBadge?: 'regular' | 'reliable' | 'caution' | null }) {
    try {
      await updateDoc(doc(db, 'khataCustomers', customerId), updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `khataCustomers/${customerId}`);
    }
  },

  async setKhataCustomerPinned(customerId: string, pinned: boolean) {
    try {
      const updates: any = { pinned };
      updates.pinnedAt = pinned ? serverTimestamp() : deleteField();
      await updateDoc(doc(db, 'khataCustomers', customerId), updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `khataCustomers/${customerId}`);
    }
  },

  // Transactions (real-time) for one customer
  subscribeToKhataTransactions(customerId: string, callback: (data: any[]) => void) {
    const q = query(
      collection(db, 'khataTransactions'),
      where('customerId', '==', customerId),
      orderBy('date', 'desc')
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'khataTransactions');
    });
  },

  // Add credit (udhar diya) or payment (paise aaye)
  // Uses atomic increment — race condition safe
  async addKhataTransaction(tx: {
    customerId: string;
    customerName: string;
    type: 'credit' | 'payment';
    amount: number;
    note?: string;
    dueDate?: string;
  }) {
    try {
      const amount = Number(tx.amount);
      if (isNaN(amount)) throw new Error('Invalid amount');
      
      const delta = tx.type === 'credit' ? amount : -amount;
      const batch = writeBatch(db);

      // 1. Add transaction record (strip undefined fields — Firestore rejects them)
      const txRef = doc(collection(db, 'khataTransactions'));
      const txData: Record<string, any> = { 
        date: serverTimestamp(),
        alerted: false // Added for n8n alerts
      };
      Object.entries(tx).forEach(([k, v]) => { if (v !== undefined) txData[k] = v; });
      batch.set(txRef, txData);

      // 2. Atomically update customer balance + lastTransactionAt
      const custRef = doc(db, 'khataCustomers', tx.customerId);
      batch.update(custRef, { totalBalance: increment(delta), lastTransactionAt: serverTimestamp() });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'khataTransactions');
    }
  },

  // Delete a single transaction and atomically reverse balance
  async deleteKhataTransaction(tx: { id: string; customerId: string; type: 'credit' | 'payment'; amount: number }) {
    try {
      // Reverse delta: credit was +amount to balance, so subtract; payment was -amount, so add back
      const reverseDelta = tx.type === 'credit' ? -tx.amount : tx.amount;
      const batch = writeBatch(db);
      batch.delete(doc(db, 'khataTransactions', tx.id));
      batch.update(doc(db, 'khataCustomers', tx.customerId), { totalBalance: increment(reverseDelta) });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `khataTransactions/${tx.id}`);
    }
  },

  async updateKhataTransaction(params: {
    id: string;
    customerId: string;
    type: 'credit' | 'payment';
    previousAmount: number;
    nextAmount: number;
    note?: string;
  }) {
    try {
      const batch = writeBatch(db);
      const txRef = doc(db, 'khataTransactions', params.id);
      const updates: any = {
        amount: params.nextAmount,
        updatedAt: serverTimestamp(),
      };
      // Only touch the note when caller explicitly passed something:
      //   - a non-empty string → overwrite
      //   - an empty string    → explicit clear (delete)
      //   - undefined          → leave the existing note untouched (don't wipe it)
      if (params.note !== undefined) {
        updates.note = params.note.trim() ? params.note : deleteField();
      }

      if (params.nextAmount !== params.previousAmount) {
        const diff = params.nextAmount - params.previousAmount;
        const balanceDelta = params.type === 'credit' ? diff : -diff;
        batch.update(doc(db, 'khataCustomers', params.customerId), { totalBalance: increment(balanceDelta) });
      }

      batch.update(txRef, updates);
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `khataTransactions/${params.id}`);
    }
  },

  // ─── PUBG HISAB ──────────────────────────────────────────────────────────────
  // Weighted-average cost: buyPrice = totalInvested / quantity (exact accounting).
  // profit = (unitPrice − avgCost) × quantity — negative allowed (loss, shown red).

  subscribeToPubgItems(callback: (data: any[]) => void) {
    return onSnapshot(collection(db, 'pubgItems'), (snap) => {
      callback(snap.docs.map(normalizeBizItem));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'pubgItems');
    });
  },

  async getPubgItems() {
    try {
      const snap = await getDocs(collection(db, 'pubgItems'));
      return snap.docs.map(normalizeBizItem);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'pubgItems');
      return [];
    }
  },

  subscribeToPubgPurchases(callback: (data: any[]) => void) {
    const q = query(collection(db, 'pubgPurchases'), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'pubgPurchases');
    });
  },

  subscribeToPubgSales(callback: (data: any[]) => void) {
    const q = query(collection(db, 'pubgSales'), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'pubgSales');
    });
  },

  // Add PUBG purchase — atomic: purchase doc + item upsert (weighted-avg update)
  async addPubgPurchase(p: {
    name: string;
    category: 'UC' | 'Account' | 'Item';
    quantity: number;
    unitCost: number;
    sellPrice?: number;      // used when creating a new item (or refreshing price on repurchase)
    source?: string;
    note?: string;
  }) {
    try {
      const name = p.name?.trim();
      const qty = num(p.quantity);
      const cost = num(p.unitCost);
      if (!name) throw new Error('Item ka naam likhein');
      if (qty <= 0) throw new Error('Quantity sahi likhein');
      if (cost < 0) throw new Error('Cost sahi likhein');
      const totalCost = qty * cost;

      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'pubgPurchases')), {
        name,
        category: p.category || 'Item',
        quantity: qty,
        unitCost: cost,
        totalCost,
        ...(p.source?.trim() ? { source: p.source.trim() } : {}),
        ...(p.note?.trim() ? { note: p.note.trim() } : {}),
        type: 'purchase',
        monthKey: bizMonthKey(),
        date: serverTimestamp(),
      });

      // Find existing item by name (established identity convention)
      const q = query(collection(db, 'pubgItems'), where('name', '==', name));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const itemDoc = snap.docs[0];
        const d = itemDoc.data();
        const newQty = num(d.quantity) + qty;
        const newInvested = num(d.totalInvested) + totalCost;
        const updates: any = {
          quantity: newQty,
          totalInvested: newInvested,
          buyPrice: newQty > 0 ? newInvested / newQty : cost,
          updatedAt: serverTimestamp(),
        };
        if (num(p.sellPrice) > 0) updates.sellPrice = num(p.sellPrice);
        batch.update(itemDoc.ref, updates);
      } else {
        batch.set(doc(collection(db, 'pubgItems')), {
          name,
          category: p.category || 'Item',
          buyPrice: cost,
          sellPrice: num(p.sellPrice),
          quantity: qty,
          totalInvested: totalCost,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (e) {
      // Plain business-validation messages pass through; Firestore errors get JSON-wrapped
      if (e instanceof Error && !e.message.startsWith('{')) throw e;
      handleFirestoreError(e, OperationType.WRITE, 'pubgPurchases');
    }
  },

  // Add PUBG sale — atomic: sale doc (frozen avg cost + precomputed profit) + stock decrement
  async addPubgSale(s: {
    itemId: string;
    quantity: number;
    unitPrice: number;
    customerName?: string;
    playerId?: string;
    note?: string;
  }) {
    // Guard BEFORE try so a clean stock-validation message reaches the UI toast
    const itemSnap = await getDoc(doc(db, 'pubgItems', s.itemId));
    if (!itemSnap.exists()) throw new Error('Item nahi mila — page refresh karein');
    const item = itemSnap.data();
    const qty = num(s.quantity);
    if (qty <= 0) throw new Error('Quantity sahi likhein');
    if (qty > num(item.quantity)) throw new Error(`Stock kam hai — sirf ${num(item.quantity)} maujood`);

    try {
      const price = num(s.unitPrice);
      const unitCost = num(item.buyPrice);           // frozen at sale time
      const totalAmount = price * qty;
      const profit = totalAmount - unitCost * qty;   // negative = loss (allowed)

      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'pubgSales')), {
        itemId: s.itemId,
        name: item.name,
        category: item.category || 'Item',
        quantity: qty,
        unitPrice: price,
        totalAmount,
        unitCost,
        profit,
        ...(s.customerName?.trim() ? { customerName: s.customerName.trim() } : {}),
        ...(s.playerId?.trim() ? { playerId: s.playerId.trim() } : {}),
        ...(s.note?.trim() ? { note: s.note.trim() } : {}),
        type: 'sale',
        monthKey: bizMonthKey(),
        date: serverTimestamp(),
      });

      const newQty = num(item.quantity) - qty;
      const newInvested = Math.max(0, num(item.totalInvested) - unitCost * qty);
      batch.update(itemSnap.ref, {
        quantity: newQty,
        totalInvested: newInvested,
        buyPrice: newQty > 0 ? newInvested / newQty : 0,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'pubgSales');
    }
  },

  // Delete PUBG sale — exact reversal: stock + totalInvested restored atomically
  async deletePubgSale(sale: { id: string; itemId?: string; quantity: number; unitCost: number }) {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'pubgSales', sale.id));

      if (sale.itemId) {
        const itemRef = doc(db, 'pubgItems', sale.itemId);
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
          const d = itemSnap.data();
          const newQty = num(d.quantity) + num(sale.quantity);
          const newInvested = num(d.totalInvested) + num(sale.unitCost) * num(sale.quantity);
          batch.update(itemRef, {
            quantity: newQty,
            totalInvested: newInvested,
            buyPrice: newQty > 0 ? newInvested / newQty : num(d.buyPrice),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `pubgSales/${sale.id}`);
    }
  },

  // Delete PUBG purchase — reversal (clamps at 0 if stock was already sold)
  async deletePubgPurchase(p: { id: string; name?: string; quantity: number; totalCost: number }) {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'pubgPurchases', p.id));

      if (p.name) {
        const q = query(collection(db, 'pubgItems'), where('name', '==', p.name));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const itemDoc = snap.docs[0];
          const d = itemDoc.data();
          const newQty = Math.max(0, num(d.quantity) - num(p.quantity));
          const newInvested = Math.max(0, num(d.totalInvested) - num(p.totalCost));
          batch.update(itemDoc.ref, {
            quantity: newQty,
            totalInvested: newInvested,
            buyPrice: newQty > 0 ? newInvested / newQty : 0,
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `pubgPurchases/${p.id}`);
    }
  },

  // Edit PUBG item — price/name edits; quantity correction keeps invested consistent
  async updatePubgItem(id: string, updates: { name?: string; category?: string; sellPrice?: number }) {
    try {
      await updateDoc(doc(db, 'pubgItems', id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `pubgItems/${id}`);
    }
  },

  async deletePubgItem(id: string) {
    try {
      await deleteDoc(doc(db, 'pubgItems', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `pubgItems/${id}`);
    }
  },

  // ─── ONLINE SHOP ─────────────────────────────────────────────────────────────
  // profit = (unitPrice × qty) + courierReceived − (avgCost × qty) − courierPaid
  // Negative allowed = loss (red). Delete = exact reversal.

  subscribeToShopItems(callback: (data: any[]) => void) {
    return onSnapshot(collection(db, 'shopItems'), (snap) => {
      callback(snap.docs.map(normalizeBizItem));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'shopItems');
    });
  },

  async getShopItems() {
    try {
      const snap = await getDocs(collection(db, 'shopItems'));
      return snap.docs.map(normalizeBizItem);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'shopItems');
      return [];
    }
  },

  subscribeToShopPurchases(callback: (data: any[]) => void) {
    const q = query(collection(db, 'shopPurchases'), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'shopPurchases');
    });
  },

  subscribeToShopOrders(callback: (data: any[]) => void) {
    const q = query(collection(db, 'shopOrders'), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'shopOrders');
    });
  },

  // Add Shop purchase — atomic: purchase doc + product upsert (weighted-avg update)
  async addShopPurchase(p: {
    name: string;
    category: string;
    quantity: number;
    unitCost: number;
    sellPrice?: number;
    source?: string;
  }) {
    try {
      const name = p.name?.trim();
      const qty = num(p.quantity);
      const cost = num(p.unitCost);
      if (!name) throw new Error('Product ka naam likhein');
      if (qty <= 0) throw new Error('Quantity sahi likhein');
      if (cost < 0) throw new Error('Cost sahi likhein');
      const totalCost = qty * cost;

      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'shopPurchases')), {
        name,
        category: p.category || '🏷️ Other',
        quantity: qty,
        unitCost: cost,
        totalCost,
        ...(p.source?.trim() ? { source: p.source.trim() } : {}),
        type: 'purchase',
        monthKey: bizMonthKey(),
        date: serverTimestamp(),
      });

      const q = query(collection(db, 'shopItems'), where('name', '==', name));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const itemDoc = snap.docs[0];
        const d = itemDoc.data();
        const newQty = num(d.quantity) + qty;
        const newInvested = num(d.totalInvested) + totalCost;
        const updates: any = {
          quantity: newQty,
          totalInvested: newInvested,
          buyPrice: newQty > 0 ? newInvested / newQty : cost,
          updatedAt: serverTimestamp(),
        };
        if (num(p.sellPrice) > 0) updates.sellPrice = num(p.sellPrice);
        batch.update(itemDoc.ref, updates);
      } else {
        batch.set(doc(collection(db, 'shopItems')), {
          name,
          category: p.category || '🏷️ Other',
          buyPrice: cost,
          sellPrice: num(p.sellPrice),
          quantity: qty,
          totalInvested: totalCost,
          lowStockAt: 2,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (e) {
      if (e instanceof Error && !e.message.startsWith('{')) throw e;
      handleFirestoreError(e, OperationType.WRITE, 'shopPurchases');
    }
  },

  // Add Shop order — atomic: order doc (frozen avg cost + courier-aware profit) + stock decrement
  async addShopOrder(o: {
    itemId: string;
    quantity: number;
    unitPrice: number;
    courierReceived?: number;   // customer se courier liya
    courierPaid?: number;       // owner ne courier diya
    platform: 'olx' | 'facebook' | 'whatsapp' | 'walkin' | 'other';
    customerName?: string;
    customerPhone?: string;
    note?: string;
  }) {
    // Guard BEFORE try so a clean stock-validation message reaches the UI toast
    const itemSnap = await getDoc(doc(db, 'shopItems', o.itemId));
    if (!itemSnap.exists()) throw new Error('Product nahi mila — page refresh karein');
    const item = itemSnap.data();
    const qty = num(o.quantity);
    if (qty <= 0) throw new Error('Quantity sahi likhein');
    if (qty > num(item.quantity)) throw new Error(`Stock kam hai — sirf ${num(item.quantity)} maujood`);

    try {
      const price = num(o.unitPrice);
      const cRec = num(o.courierReceived);
      const cPaid = num(o.courierPaid);
      const unitCost = num(item.buyPrice);            // frozen at order time
      const totalAmount = price * qty;
      const profit = totalAmount + cRec - unitCost * qty - cPaid;  // negative = loss (allowed)

      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'shopOrders')), {
        itemId: o.itemId,
        name: item.name,
        category: item.category || '🏷️ Other',
        quantity: qty,
        unitPrice: price,
        totalAmount,
        courierReceived: cRec,
        courierPaid: cPaid,
        unitCost,
        profit,
        platform: o.platform || 'other',
        ...(o.customerName?.trim() ? { customerName: o.customerName.trim() } : {}),
        ...(o.customerPhone?.trim() ? { customerPhone: o.customerPhone.trim() } : {}),
        ...(o.note?.trim() ? { note: o.note.trim() } : {}),
        type: 'order',
        monthKey: bizMonthKey(),
        date: serverTimestamp(),
      });

      const newQty = num(item.quantity) - qty;
      const newInvested = Math.max(0, num(item.totalInvested) - unitCost * qty);
      batch.update(itemSnap.ref, {
        quantity: newQty,
        totalInvested: newInvested,
        buyPrice: newQty > 0 ? newInvested / newQty : 0,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'shopOrders');
    }
  },

  // Delete Shop order — exact reversal: stock + totalInvested restored atomically
  async deleteShopOrder(order: { id: string; itemId?: string; quantity: number; unitCost: number }) {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'shopOrders', order.id));

      if (order.itemId) {
        const itemRef = doc(db, 'shopItems', order.itemId);
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
          const d = itemSnap.data();
          const newQty = num(d.quantity) + num(order.quantity);
          const newInvested = num(d.totalInvested) + num(order.unitCost) * num(order.quantity);
          batch.update(itemRef, {
            quantity: newQty,
            totalInvested: newInvested,
            buyPrice: newQty > 0 ? newInvested / newQty : num(d.buyPrice),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `shopOrders/${order.id}`);
    }
  },

  // Delete Shop purchase — reversal (clamps at 0 if stock was already sold)
  async deleteShopPurchase(p: { id: string; name?: string; quantity: number; totalCost: number }) {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'shopPurchases', p.id));

      if (p.name) {
        const q = query(collection(db, 'shopItems'), where('name', '==', p.name));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const itemDoc = snap.docs[0];
          const d = itemDoc.data();
          const newQty = Math.max(0, num(d.quantity) - num(p.quantity));
          const newInvested = Math.max(0, num(d.totalInvested) - num(p.totalCost));
          batch.update(itemDoc.ref, {
            quantity: newQty,
            totalInvested: newInvested,
            buyPrice: newQty > 0 ? newInvested / newQty : 0,
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `shopPurchases/${p.id}`);
    }
  },

  // Edit Shop product — price/name/lowStockAt
  async updateShopItem(id: string, updates: { name?: string; category?: string; sellPrice?: number; lowStockAt?: number }) {
    try {
      await updateDoc(doc(db, 'shopItems', id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `shopItems/${id}`);
    }
  },

  async deleteShopItem(id: string) {
    try {
      await deleteDoc(doc(db, 'shopItems', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `shopItems/${id}`);
    }
  },
};
