import { collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, getDoc, setDoc, serverTimestamp, onSnapshot, increment, writeBatch, deleteField } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export const dataService = {
  // Stock
  async getStock() {
    try {
      const snap = await getDocs(collection(db, 'stock'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'stock');
    }
  },

  subscribeToStock(callback: (data: any[]) => void) {
    return onSnapshot(collection(db, 'stock'), (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'stock');
    });
  },

  subscribeToSales(callback: (data: any[]) => void) {
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
    try {
      await addDoc(collection(db, 'purchases'), {
        ...purchase,
        type: 'purchase',
        date: serverTimestamp(),
        alerted: false   // n8n poller picks this up and sends Telegram
      });

      const q = query(collection(db, 'stock'), where('name', '==', purchase.itemName));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const stockDoc = snap.docs[0];
        const oldData = stockDoc.data() as any;

        const soldPcs = Math.max(0, (oldData.stock || 0) - (purchase.remainingUnits || 0));
        if (soldPcs > 0 && oldData.type !== 'opening') {
          const unitSize = oldData.pcsPerPack || 1;
          const soldUnits = soldPcs / unitSize;
          const oldAvgBuy = oldData.averageBuy || purchase.buyingPricePerPc;
          const oldSellPrice = oldData.currentSell || purchase.sellingPricePerPc;

          await addDoc(collection(db, 'sales'), {
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

        await updateDoc(doc(db, 'stock', stockDoc.id), {
          category: purchase.category,
          stock: (purchase.remainingUnits || 0) + purchase.totalPcs,
          pcsPerPack: purchase.pcsPerPack || 1,
          averageBuy: weightedAvg,
          currentSell: purchase.sellingPricePerPc,
          updatedAt: serverTimestamp(),
          type: 'purchase'
        });
      } else {
        await addDoc(collection(db, 'stock'), {
          name: purchase.itemName,
          category: purchase.category || 'General',
          stock: purchase.totalPcs,
          pcsPerPack: purchase.pcsPerPack || 1,
          averageBuy: purchase.buyingPricePerPc,
          currentSell: purchase.sellingPricePerPc,
          status: 'Normal',
          updatedAt: serverTimestamp(),
          type: 'purchase'
        });
      }
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
        await updateDoc(doc(db, 'stock', stockDoc.id), {
          stock: (oldData.stock || 0) + data.qty,
          type: 'opening',
          updatedAt: serverTimestamp()
        });
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
      const snap = await getDocs(collection(db, 'expenses'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'expenses');
    }
  },

  // Vendors
  async getVendors() {
    try {
      const snap = await getDocs(collection(db, 'vendors'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'vendors');
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
      const snap = await getDocs(collection(db, 'vendors'));
      const match = snap.docs.find(d => {
        const v = d.data();
        return (data.salesmanPhone && v.salesmanPhone === data.salesmanPhone) ||
               v.name?.toLowerCase() === data.companyName.toLowerCase();
      });
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

  async saveMonthlyProfit(monthKey: string, profit: number, label: string) {
    try {
      await setDoc(doc(db, 'monthlyProfits', monthKey), {
        monthKey,
        label,
        profit,
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
      const docRef = await addDoc(collection(db, 'khataCustomers'), {
        ...customer,
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
      const delta = tx.type === 'credit' ? tx.amount : -tx.amount;
      const batch = writeBatch(db);

      // 1. Add transaction record (strip undefined fields — Firestore rejects them)
      const txRef = doc(collection(db, 'khataTransactions'));
      const txData: Record<string, any> = { date: serverTimestamp() };
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
      if (params.note !== undefined) {
        updates.note = params.note ? params.note : deleteField();
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
};
