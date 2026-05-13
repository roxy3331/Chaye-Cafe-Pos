import React from 'react';
import { Package, TrendingUp, Wallet, Search, Plus, X, Trash2, Edit2, Loader2, Save, RotateCcw, CalendarClock, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { StockItem } from '../types';
import { dataService } from '../services/dataService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

// ── Expiry helpers ─────────────────────────────────────────────────────────────
function getExpiryStatus(expiryDate?: string) {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate); exp.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return { label: 'Expired',       days: diffDays, level: 'expired'  as const };
  if (diffDays <= 7) return { label: `${diffDays}d left`, days: diffDays, level: 'soon'    as const };
  return               { label: 'Valid',              days: diffDays, level: 'ok'      as const };
}

function formatExpiryDate(d: string) {
  return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' });
}

export const Stock: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showModal, setShowModal] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<StockItem | null>(null);
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editItem, setEditItem] = React.useState<any | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editBuyPrice, setEditBuyPrice] = React.useState('');
  const [editSellPrice, setEditSellPrice] = React.useState('');
  const [editCategory, setEditCategory] = React.useState('');
  const [editPcsPerPack, setEditPcsPerPack] = React.useState('');
  const [editStock, setEditStock] = React.useState('');
  const [editSaving, setEditSaving] = React.useState(false);

  // Return modal state
  const [showReturnModal, setShowReturnModal] = React.useState(false);
  const [returnItem, setReturnItem] = React.useState<any | null>(null);
  const [returnType, setReturnType] = React.useState<'customer_return' | 'supplier_return'>('customer_return');
  const [returnQty, setReturnQty] = React.useState('');
  const [returnReason, setReturnReason] = React.useState('');
  const [returnSaving, setReturnSaving] = React.useState(false);

  React.useEffect(() => {
    let timeout: any;
    const unsubscribe = dataService.subscribeToStock((data) => {
      setItems(data);
      setLoading(false);
      if (timeout) clearTimeout(timeout);
    });

    // Fallback if subscription fails silently or takes too long
    timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const handleCloseBatch = (item: StockItem) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setEditName(item.name || '');
    setEditBuyPrice(item.averageBuy?.toString() || '');
    setEditSellPrice(item.currentSell?.toString() || '');
    setEditCategory(item.category || '');
    setEditPcsPerPack(item.pcsPerPack?.toString() || '1');
    setEditStock(item.stock?.toString() || '0');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editItem || !editName.trim()) {
      showToast('Item name required', 'warning');
      return;
    }
    setEditSaving(true);
    try {
      const updates: any = {
        name: editName.trim(),
        averageBuy: parseFloat(editBuyPrice) || 0,
        currentSell: parseFloat(editSellPrice) || 0,
        category: editCategory.trim() || 'General',
        pcsPerPack: parseInt(editPcsPerPack) || 1,
      };
      if (editStock !== '') updates.stock = parseInt(editStock) || 0;
      await dataService.updateStock(editItem.id, updates);
      showToast('Item updated!', 'success');
      setShowEditModal(false);
    } catch (e) {
      showToast('Update failed', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (userRole !== 'owner') {
      showToast('Only owners can delete stock items.', 'warning');
      return;
    }
    if (window.confirm(`"${itemName}" permanently delete karna chahte ho?`)) {
      await dataService.deleteStock(id);
      await dataService.addStockAlert({ alertType: 'stock_delete', itemName, performedBy: userRole });
    }
  };

  const handleOpenReturn = (item: any) => {
    setReturnItem(item);
    setReturnType('customer_return');
    setReturnQty('');
    setReturnReason('');
    setShowReturnModal(true);
  };

  const handleSubmitReturn = async () => {
    const qty = parseInt(returnQty);
    if (!qty || qty <= 0) { showToast('Quantity sahi likhein', 'warning'); return; }
    if (!returnItem) return;
    setReturnSaving(true);
    try {
      await dataService.addReturn({
        itemName: returnItem.name,
        category: returnItem.category || 'General',
        returnType,
        quantity: qty,
        pcsPerPack: returnItem.pcsPerPack || 1,
        buyPrice: returnItem.averageBuy || 0,
        sellPrice: returnItem.currentSell || 0,
        reason: returnReason.trim() || undefined,
      });
      showToast(`Return record ho gaya ✅`, 'success');
      setShowReturnModal(false);
    } catch {
      showToast('Return save nahi hua, dobara try karein', 'error');
    } finally {
      setReturnSaving(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAssets = items.reduce((acc, item) => acc + ((item.stock / (item.pcsPerPack || 1)) * (item.averageBuy || 0)), 0);
  const totalStockItems = items.reduce((acc, item) => acc + Math.floor(item.stock / (item.pcsPerPack || 1)), 0);
  const potentialProfit = items.reduce((acc, item) => acc + ((item.stock / (item.pcsPerPack || 1)) * ((item.currentSell || 0) - (item.averageBuy || 0))), 0);
  const totalStockValue = items.reduce((acc, item) => acc + ((item.stock || 0) / (item.pcsPerPack || 1)) * (item.averageBuy || 0), 0);

  const groupedByCategory = React.useMemo(() => {
    const groups: Record<string, { items: any[]; stock: number; boxes: number; value: number }> = {};
    filteredItems.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = { items: [], stock: 0, boxes: 0, value: 0 };
      }
      const pcsPerPack = item.pcsPerPack || 1;
      groups[category].items.push(item);
      groups[category].stock += item.stock || 0;
      groups[category].boxes += Math.floor((item.stock || 0) / pcsPerPack);
      groups[category].value += ((item.stock || 0) / pcsPerPack) * (item.averageBuy || 0);
    });
    return Object.entries(groups).sort((a, b) => b[1].value - a[1].value);
  }, [filteredItems]);

  const categoryItems = React.useMemo(() => {
    if (!selectedCategory) return [];
    return items.filter(item => (item.category || 'Uncategorized') === selectedCategory);
  }, [items, selectedCategory]);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-emerald-900">Active Stock</h1>
          <p className="text-slate-500 text-lg max-w-lg">
            Manage inventory levels, monitor margins, and oversee batch closures.
          </p>
        </div>
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-700 transition-colors w-5 h-5" />
          <input 
            type="text" 
            placeholder="Filter stock items..." 
            className="w-full pl-12 pr-4 py-4 bg-white/70 backdrop-blur-md border border-emerald-50 rounded-2xl focus:ring-2 focus:ring-emerald-900/5 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* Stats Bento - ONLY FOR OWNER */}
      {userRole === 'owner' && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-3xl flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Assets</p>
              <p className="text-3xl font-bold text-emerald-900">{totalAssets.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-900">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <div className="glass-card p-6 rounded-3xl flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Items in Stock</p>
              <p className="text-3xl font-bold text-emerald-900">{totalStockItems.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-900">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className="glass-card p-6 rounded-3xl flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Potential Profit</p>
              <p className="text-3xl font-bold text-emerald-500">+{potentialProfit.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </section>
      )}

      {/* Category Summary */}
      <section className="space-y-4">
        <div className="glass-card rounded-3xl p-6 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Purchase Cost (All Stock)</p>
            <p className="text-3xl font-bold text-emerald-900">Rs {totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {groupedByCategory.map(([category, summary]) => (
              <button
                key={category}
                onClick={() => { setSelectedCategory(prev => prev === category ? null : category); setSearchTerm(''); }}
                className={cn(
                  "px-4 py-3 border rounded-2xl text-left transition-all hover:shadow-md active:scale-95",
                  selectedCategory === category
                    ? "bg-emerald-900 border-emerald-900"
                    : "bg-emerald-50/60 border-emerald-100 hover:bg-emerald-100"
                )}
              >
                <p className={cn("text-[10px] font-bold uppercase tracking-widest", selectedCategory === category ? "text-emerald-100" : "text-emerald-700")}>{category}</p>
                <p className={cn("text-sm font-black", selectedCategory === category ? "text-white" : "text-emerald-900")}>{summary.boxes.toLocaleString()} packs · Rs {summary.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stock List by Category */}
      <section className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-emerald-900/40">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="font-bold uppercase text-xs tracking-widest">Loading Inventory...</p>
          </div>
        ) : searchTerm ? (
          groupedByCategory.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center text-slate-400 font-bold">Koi item nahi mila</div>
          ) : (
            groupedByCategory.map(([category, summary]) => (
              <div key={category} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-lg font-bold text-emerald-900">{category}</h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                    {summary.items.length} items · {summary.boxes.toLocaleString()} packs · Rs {summary.value.toLocaleString()}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {summary.items.map(item => (
                    <StockCard
                      key={item.id}
                      item={item}
                      userRole={userRole}
                      onCloseBatch={() => handleCloseBatch(item)}
                      onDelete={() => handleDelete(item.id, item.name)}
                      onEdit={() => handleEdit(item)}
                      onReturn={() => handleOpenReturn(item)}
                    />
                  ))}
                </div>
              </div>
            ))
          )
        ) : selectedCategory ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-emerald-900">{selectedCategory}</h2>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{categoryItems.length} items</p>
              </div>
            </div>
            {categoryItems.length === 0 ? (
              <div className="glass-card rounded-3xl p-10 text-center text-slate-400 font-bold">Is category mein koi item nahi</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {categoryItems.map(item => (
                  <StockCard
                    key={item.id}
                    item={item}
                    userRole={userRole}
                    onCloseBatch={() => handleCloseBatch(item)}
                    onDelete={() => handleDelete(item.id, item.name)}
                    onEdit={() => handleEdit(item)}
                    onReturn={() => handleOpenReturn(item)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card rounded-3xl p-8 text-center space-y-2">
            <p className="text-emerald-900 font-bold text-lg">Upar se category select karo</p>
            <p className="text-slate-400 text-sm font-medium">Ya search box mein item ka naam type karo</p>
          </div>
        )}
      </section>

      {/* FAB */}
      <button 
        onClick={() => navigate('/purchase')}
        className="fixed bottom-28 right-8 w-16 h-16 bg-emerald-900 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-40"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Close Batch Modal */}
      <AnimatePresence>
        {showModal && selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/20 backdrop-blur-md"
              onClick={() => setShowModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass-card rounded-[40px] p-8 shadow-2xl"
            >
              <button 
                onClick={() => setShowModal(false)}
                className="absolute right-6 top-6 p-2 rounded-full hover:bg-emerald-50 transition-colors text-slate-400"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-900 mx-auto shadow-sm">
                  <Package className="w-10 h-10" />
                </div>
                
                <div>
                  <h2 className="text-3xl font-bold text-emerald-900">{selectedItem.name}</h2>
                  <p className="text-slate-500">Stock in shop: <span className="font-bold text-emerald-900">{selectedItem.stock} units</span></p>
                </div>

                <div className="p-6 bg-white/50 rounded-3xl space-y-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-left mb-2">Are you closing this batch?</label>
                  <p className="text-sm text-slate-400 italic text-left">Closing a batch means you'll set the current stock to zero and record sales, or delete if vendor changed.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowModal(false)}
                    className="py-5 border border-emerald-100 text-emerald-900 rounded-2xl font-bold hover:bg-emerald-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const prevStock = selectedItem.stock;
                      await dataService.updateStock(selectedItem.id, { stock: 0 });
                      await dataService.addStockAlert({
                        alertType: 'stock_zero',
                        itemName: selectedItem.name,
                        previousStock: prevStock,
                        performedBy: userRole,
                      });
                      setShowModal(false);
                    }}
                    className="py-5 bg-red-600 text-white rounded-2xl font-bold shadow-xl shadow-red-900/20 active:scale-95 transition-all"
                  >
                    Set to Zero
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Edit Item Modal */}
      <AnimatePresence>
        {showEditModal && editItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/20 backdrop-blur-md"
              onClick={() => setShowEditModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-card rounded-[40px] p-8 shadow-2xl space-y-6"
            >
              <button
                onClick={() => setShowEditModal(false)}
                className="absolute right-6 top-6 p-2 rounded-full hover:bg-emerald-50 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-900">
                  <Edit2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-emerald-900">Edit Item</h2>
                  <p className="text-xs text-slate-400">Galat details theek karo</p>
                </div>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Item Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Item Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10"
                    placeholder="e.g. Cigarettes, Beverages"
                  />
                </div>

                {/* Pcs per Pack */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Pcs per Pack / Box</label>
                  <input
                    type="number"
                    value={editPcsPerPack}
                    onChange={e => setEditPcsPerPack(e.target.value)}
                    className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10"
                    placeholder="e.g. 10, 20"
                    min="1"
                  />
                </div>

                {userRole === 'owner' && (
                  <>
                    {/* Buying Price */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Buying Price (per unit)</label>
                      <input
                        type="number"
                        value={editBuyPrice}
                        onChange={e => setEditBuyPrice(e.target.value)}
                        className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10"
                        placeholder="e.g. 985"
                      />
                    </div>

                    {/* Selling Price */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Selling Price (per unit)</label>
                      <input
                        type="number"
                        value={editSellPrice}
                        onChange={e => setEditSellPrice(e.target.value)}
                        className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10"
                        placeholder="e.g. 1680"
                      />
                    </div>

                    {/* Direct Stock Edit */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest px-1">⚠ Stock Quantity (direct edit)</label>
                      <input
                        type="number"
                        value={editStock}
                        onChange={e => setEditStock(e.target.value)}
                        className="w-full px-5 py-4 bg-orange-50/50 border border-orange-200 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-orange-400/20"
                        placeholder="Total pcs in stock"
                        min="0"
                      />
                      <p className="text-[10px] text-slate-400 px-1">Galat stock count fix karne ke liye — carefully use karo</p>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50"
              >
                {editSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Changes
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Return Modal ── */}
      <AnimatePresence>
        {showReturnModal && returnItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/30 backdrop-blur-sm z-40"
              onClick={() => setShowReturnModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none"
            >
              <div className="pointer-events-auto bg-white rounded-t-[32px] md:rounded-[32px] p-7 w-full md:max-w-md shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center">
                      <RotateCcw className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-emerald-900">Return Entry</h3>
                      <p className="text-xs text-slate-400 font-medium">{returnItem.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowReturnModal(false)} className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Return Type Toggle */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Return Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { val: 'customer_return', label: '🛒 Customer Return', desc: 'Wapas aaya, stock + hoga' },
                        { val: 'supplier_return', label: '🏭 Supplier Return', desc: 'Wapas bheja, stock - hoga' },
                      ] as const).map(opt => (
                        <button
                          key={opt.val}
                          onClick={() => setReturnType(opt.val)}
                          className={cn(
                            "p-3 rounded-2xl border-2 text-left transition-all",
                            returnType === opt.val
                              ? "border-emerald-900 bg-emerald-50"
                              : "border-emerald-100 bg-white hover:bg-emerald-50/50"
                          )}
                        >
                          <p className="text-xs font-bold text-emerald-900">{opt.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                      Quantity (Pcs) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      value={returnQty}
                      onChange={e => setReturnQty(e.target.value)}
                      min="1"
                      autoFocus
                      className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                    <p className="text-[10px] text-slate-400 px-1 mt-1">
                      Current stock: <strong>{returnItem.stock} pcs</strong>
                    </p>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                      Reason <span className="font-medium normal-case text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Damage, Wrong item, Expiry..."
                      value={returnReason}
                      onChange={e => setReturnReason(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSubmitReturn}
                  disabled={returnSaving || !returnQty}
                  className="w-full mt-6 py-4 bg-orange-500 text-white rounded-2xl font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  {returnSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  {returnSaving ? 'Record ho raha hai...' : 'Return Record Karo'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const StockCard: React.FC<{ item: any; userRole: string; onCloseBatch: () => void; onDelete: () => void; onEdit: () => void; onReturn: () => void }> = ({ item, userRole, onCloseBatch, onDelete, onEdit, onReturn }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card rounded-[32px] p-8 space-y-6 group hover:shadow-2xl transition-all duration-300"
  >
    {/* Expiry Banner */}
    {(() => {
      const exp = getExpiryStatus(item.expiryDate);
      if (!exp) return null;
      return (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold mb-2",
          exp.level === 'expired' ? "bg-red-100 text-red-700"
          : exp.level === 'soon'  ? "bg-orange-100 text-orange-700"
          :                         "bg-emerald-50 text-emerald-700"
        )}>
          <CalendarClock className="w-3.5 h-3.5 shrink-0" />
          <span>
            {exp.level === 'expired' ? '🔴 Expired' : exp.level === 'soon' ? `🟠 Expiring in ${exp.days}d` : '✅ Valid'}
            {item.expiryDate && <span className="font-medium opacity-70 ml-1">· {formatExpiryDate(item.expiryDate)}</span>}
          </span>
        </div>
      );
    })()}

    <div className="flex justify-between items-start">
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-emerald-900 opacity-90">{item.name}</h3>
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
            item.stock === 0 ? "bg-red-100 text-red-600" : (item.stock < 10 ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-700")
          )}>
            {item.stock === 0 ? 'Out of Stock' : (item.stock < 10 ? 'Low Stock' : item.category || 'General')}
          </span>
          <span className="text-xs font-medium text-slate-400">Batch #{item.batchNumber || 'N/A'}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className={cn(
          "px-4 py-3 rounded-2xl text-center shadow-sm min-w-[90px]",
          item.stock === 0 ? "bg-red-600 text-white" : (item.stock < (item.pcsPerPack || 1) ? "bg-orange-600 text-white" : "bg-emerald-900 text-white")
        )}>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Inventory</p>
          <div className="flex flex-col items-center">
            <p className="text-xl font-black leading-tight">
              {Math.floor(item.stock / (item.pcsPerPack || 1))} <span className="text-[10px]">Box/Pkt</span>
            </p>
            {item.stock % (item.pcsPerPack || 1) > 0 && (
               <p className="text-[10px] font-bold">+{item.stock % (item.pcsPerPack || 1)} Pcs</p>
            )}
          </div>
        </div>
        {userRole === 'owner' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReturn(); }}
              className="p-3 bg-orange-50 text-orange-600 hover:text-white hover:bg-orange-500 rounded-xl transition-all shadow-sm flex items-center justify-center"
              title="Return entry"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
              className="p-3 bg-emerald-50 text-emerald-700 hover:text-white hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center justify-center"
              title="Edit item"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
              className="p-3 bg-red-100/50 text-red-500 hover:text-white hover:bg-red-600 rounded-xl transition-all shadow-sm flex items-center justify-center"
              title="Delete permanently"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>

    <div className="space-y-4">
      {userRole === 'owner' && (
        <div className="flex justify-between items-center border-b border-emerald-50/50 pb-3">
          <span className="text-sm font-medium text-slate-500 italic">Average Buy (Unit)</span>
          <span className="font-bold text-emerald-900">{(item.averageBuy || 0).toLocaleString()}</span>
        </div>
      )}
      <div className="flex justify-between items-center border-b border-emerald-50/50 pb-3">
        <span className="text-sm font-medium text-slate-500 italic">Current Sell (Unit)</span>
        <span className="font-bold text-emerald-900">{(item.currentSell || 0).toLocaleString()}</span>
      </div>
      {userRole === 'owner' && (
        <div className="flex justify-between items-center border-b border-emerald-50/50 pb-3">
          <span className="text-sm font-medium text-slate-500 italic">Total Invested</span>
          <span className="font-bold text-slate-700">Rs {((item.stock / (item.pcsPerPack || 1)) * (item.averageBuy || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      )}
      {userRole === 'owner' && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-slate-500 italic">Est. Profit</span>
          <span className="font-bold text-emerald-500">+{((item.stock / (item.pcsPerPack || 1)) * ((item.currentSell || 0) - (item.averageBuy || 0))).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      )}
    </div>

    <button 
      onClick={onCloseBatch}
      className={cn(
        "w-full py-4 border font-bold rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95",
        item.stock === 0 
          ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed" 
          : "bg-white border-emerald-100 text-emerald-900 hover:bg-emerald-50"
      )}
      disabled={item.stock === 0}
    >
      <X className="w-4 h-4" />
      Close Batch
    </button>
  </motion.div>
);


