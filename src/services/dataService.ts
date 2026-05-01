import { collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
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
        date: serverTimestamp()
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
  }
};
