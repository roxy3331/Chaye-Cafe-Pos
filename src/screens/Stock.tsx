import React from 'react';
import { Package, TrendingUp, Wallet, Search, Plus, X, Trash2, Edit2, Loader2, Save, RotateCcw, CalendarClock, ArrowLeft, History as HistoryIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { StockItem, StockTransaction } from '../types';
import { dataService } from '../services/dataService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useProfitVisibility } from '../context/ProfitVisibilityContext';
import { NumberTicker, FlipIn, ShimmerSweep } from '../components/magicui';
import { searchList } from '../lib/search';

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
  const { formatProfit } = useProfitVisibility();
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

  // Return modal state
  const [showReturnModal, setShowReturnModal] = React.useState(false);
  const [returnItem, setReturnItem] = React.useState<any | null>(null);
  const [returnType, setReturnType] = React.useState<'customer_return' | 'supplier_return'>('customer_return');
  const [returnQty, setReturnQty] = React.useState('');
  const [returnReason, setReturnReason] = React.useState('');
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ id: string; name: string } | null>(null);

  // Stock khata (transaction history) — modal open = live subscription
  const [historyItem, setHistoryItem] = React.useState<any | null>(null);
  const [historyTxns, setHistoryTxns] = React.useState<StockTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  React.useEffect(() => {
    if (!historyItem) return;
    setHistoryLoading(true);
    const unsub = dataService.subscribeToStockTransactions(historyItem.id, (txns) => {
      setHistoryTxns(txns as StockTransaction[]);
      setHistoryLoading(false);
    });
    return () => { unsub(); setHistoryTxns([]); };
  }, [historyItem]);

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

  // Stable item-taking callbacks so React.memo'd StockCards don't re-render on parent state churn
  const handleCloseBatch = React.useCallback((item: any) => {
    setSelectedItem(item);
    setShowModal(true);
  }, []);

  const handleEdit = React.useCallback((item: any) => {
    setEditItem(item);
    setEditName(item.name || '');
    setEditBuyPrice(item.averageBuy?.toString() || '');
    setEditSellPrice(item.currentSell?.toString() || '');
    setEditCategory(item.category || '');
    setEditPcsPerPack(item.pcsPerPack?.toString() || '1');
    setEditStock(item.stock?.toString() || '0');
    setShowEditModal(true);
  }, []);

  const handleDelete = React.useCallback((item: any) => {
    if (userRole !== 'owner') return;
    setDeleteConfirm({ id: item.id, name: item.name });
  }, [userRole]);

  const handleOpenReturn = React.useCallback((item: any) => {
    setReturnItem(item);
    setReturnType('customer_return');
    setReturnQty('');
    setReturnReason('');
    setShowReturnModal(true);
  }, []);

  const openHistory = React.useCallback((item: any) => {
    setHistoryItem(item);
  }, []);

  // Optimistic — modal turant band + toast, Firestore background mein sync
  const handleSaveEdit = () => {
    if (!editItem || !editName.trim()) {
      showToast('Item name required', 'warning');
      return;
    }
    const newAverageBuy = parseFloat(editBuyPrice) || 0;
    const newCurrentSell = parseFloat(editSellPrice) || 0;
    const newPcsPerPack = parseInt(editPcsPerPack) || 1;
    const newStock = editStock !== '' ? (parseInt(editStock) || 0) : (editItem.stock || 0);
    const oldStock = editItem.stock || 0;

    const updates: any = {
      name: editName.trim(),
      averageBuy: newAverageBuy,
      currentSell: newCurrentSell,
      category: editCategory.trim() || 'General',
      pcsPerPack: newPcsPerPack,
    };

    setShowEditModal(false);
    showToast('Item updated!', 'success');

    (async () => {
      // If stock decreased, record a sale for the difference so profit is counted
      // (same as Close Batch). recordStockReduction updates stock atomically with the sale.
      if (editStock !== '' && newStock < oldStock) {
        await dataService.recordStockReduction({
          id: editItem.id,
          name: editName.trim() || editItem.name,
          stock: oldStock,
          pcsPerPack: newPcsPerPack,
          averageBuy: newAverageBuy,
          currentSell: newCurrentSell,
          type: editItem.type,
        }, newStock);
        // Still persist the non-stock field edits (name/prices/category/pcsPerPack).
        await dataService.updateStock(editItem.id, updates);
      } else {
        if (editStock !== '') updates.stock = newStock;
        await dataService.updateStock(editItem.id, updates);
      }
    })().catch(() => showToast('Update failed — dobara try karein', 'error'));
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const target = deleteConfirm;
    setDeleteConfirm(null);
    showToast('Item deleted', 'success');
    (async () => {
      await dataService.deleteStock(target.id);
      await dataService.addStockAlert({ alertType: 'stock_delete', itemName: target.name, performedBy: userRole });
    })().catch(() => showToast('Delete failed — dobara try karein', 'error'));
  };

  const handleSubmitReturn = () => {
    const qty = parseInt(returnQty);
    if (!qty || qty <= 0) { showToast('Quantity sahi likhein', 'warning'); return; }
    if (!returnItem) return;
    const target = returnItem;
    setShowReturnModal(false);
    showToast('Return record ho gaya ✅', 'success');
    dataService.addReturn({
      itemName: target.name,
      category: target.category || 'General',
      returnType,
      quantity: qty,
      pcsPerPack: target.pcsPerPack || 1,
      buyPrice: target.averageBuy || 0,
      sellPrice: target.currentSell || 0,
      reason: returnReason.trim() || undefined,
    }).catch(() => showToast('Return save nahi hua, dobara try karein', 'error'));
  };

  // Set to Zero — optimistic: modal band + toast, sale + alert background mein
  const handleSetZero = () => {
    if (!selectedItem) return;
    const target = selectedItem;
    setShowModal(false);
    showToast('Stock set to zero', 'success');
    (async () => {
      await dataService.recordStockReduction(target, 0);
      await dataService.addStockAlert({
        alertType: 'stock_zero',
        itemName: target.name,
        previousStock: target.stock,
        performedBy: userRole,
      });
    })().catch(() => showToast('Update failed — dobara try karein', 'error'));
  };

  const filteredItems = React.useMemo(() =>
    searchTerm.trim()
      ? searchList(searchTerm, items as any[], i => i.name, 100)
      : items, [items, searchTerm]);

  // Memoized so these only recompute when items change, not on every keystroke/render.
  // All `item.stock` accesses are guarded so one bad doc can't poison the totals with NaN.
  const { totalAssets, totalStockItems, potentialProfit, totalStockValue } = React.useMemo(() => {
    let totalAssets = 0, totalStockItems = 0, potentialProfit = 0, totalStockValue = 0;
    for (const item of items) {
      const stock = item.stock || 0;
      const pcsPerPack = item.pcsPerPack || 1;
      const avgBuy = item.averageBuy || 0;
      const boxes = stock / pcsPerPack;
      totalAssets += boxes * avgBuy;
      totalStockItems += Math.floor(boxes);
      potentialProfit += boxes * ((item.currentSell || 0) - avgBuy);
      totalStockValue += boxes * avgBuy;
    }
    return { totalAssets, totalStockItems, potentialProfit, totalStockValue };
  }, [items]);

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
          {[{
            label: 'Total Assets', value: totalAssets, icon: <Wallet className="w-6 h-6" />, prefix: '', color: 'text-emerald-900', isProfit: false
          },{
            label: 'Items in Stock', value: totalStockItems, icon: <Package className="w-6 h-6" />, prefix: '', color: 'text-emerald-900', isProfit: false
          },{
            label: 'Potential Profit', value: potentialProfit, icon: <TrendingUp className="w-6 h-6" />, prefix: '+', color: 'text-emerald-500', isProfit: true
          }].map((s, i) => (
            <FlipIn key={s.label} delay={i * 0.08}>
              <ShimmerSweep delay={0.3 + i * 0.1}>
                <div className="glass-card p-6 rounded-3xl flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={`text-3xl font-bold ${s.color}`}>
                      {s.isProfit ? formatProfit(s.value, true) : <>{s.prefix}<NumberTicker value={s.value} /></>}
                    </p>
                  </div>
                  <div className={`w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center ${s.color}`}>
                    {s.icon}
                  </div>
                </div>
              </ShimmerSweep>
            </FlipIn>
          ))}
        </section>
      )}

      {/* Category Summary */}
      <section className="space-y-4">
        <ShimmerSweep delay={0.5}>
        <div className="glass-card rounded-3xl p-6 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Purchase Cost (All Stock)</p>
            <p className="text-3xl font-bold text-emerald-900">Rs <NumberTicker value={Math.round(totalStockValue)} /></p>
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
        </ShimmerSweep>
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
                      onCloseBatch={handleCloseBatch}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onReturn={handleOpenReturn}
                      onHistory={openHistory}
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
                    onCloseBatch={handleCloseBatch}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onReturn={handleOpenReturn}
                    onHistory={openHistory}
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
                    onClick={handleSetZero}
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
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/20 backdrop-blur-md"
              onClick={() => setShowEditModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-md glass-card rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto"
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
                className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
              >
                <Save className="w-5 h-5" />
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
                  disabled={!returnQty}
                  className="w-full mt-6 py-4 bg-orange-500 text-white rounded-2xl font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  <RotateCcw className="w-4 h-4" />
                  Return Record Karo
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-[80]"
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center space-y-5">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-900">Delete Karo?</h3>
                  <p className="text-slate-500 text-sm mt-2">
                    "<span className="font-bold text-emerald-900">{deleteConfirm.name}</span>" permanently delete ho jayega. Yeh undo nahi hoga.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3 rounded-2xl border border-emerald-100 text-slate-600 font-bold hover:bg-emerald-50 transition-colors"
                  >
                    Raho
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
                  >
                    Haan, Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* ── Stock Khata (Transaction History) Modal ── */}
      <AnimatePresence>
        {historyItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/30 backdrop-blur-sm z-[80]"
              onClick={() => setHistoryItem(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-[90] pointer-events-none"
            >
              <div className="pointer-events-auto bg-white rounded-t-[32px] md:rounded-[32px] p-7 w-full md:max-w-md shadow-2xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-5 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <HistoryIcon className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-emerald-900 truncate">Stock Khata</h3>
                      <p className="text-xs text-slate-400 font-medium truncate">{historyItem.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setHistoryItem(null)} className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400 shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Transactions list — live subscription */}
                <div className="overflow-y-auto space-y-2 flex-1 pr-1">
                  {historyLoading ? (
                    <div className="py-10 flex flex-col items-center gap-3 text-emerald-900/40">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Khata load ho rahi hai...</p>
                    </div>
                  ) : historyTxns.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-3xl mb-2">📒</p>
                      <p className="text-slate-400 font-bold text-sm">Abhi koi khata entry nahi</p>
                      <p className="text-slate-400 text-xs mt-1">Nayi kharidari ya sale ke baad yahan dikhega</p>
                    </div>
                  ) : historyTxns.map(t => {
                    const d = t.timestamp?.toDate?.();
                    const isPurchase = t.type === 'purchase';
                    return (
                      <div key={t.id} className={cn('flex items-center gap-3 p-3 rounded-2xl border',
                        isPurchase ? 'bg-emerald-50/50 border-emerald-100/60' : 'bg-amber-50/50 border-amber-100/60')}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest',
                              isPurchase ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                              {isPurchase ? '🛒 Kharida' : '💰 Sale'}
                            </span>
                            <span className="text-xs font-bold text-slate-600">{Number(t.quantity) || 0} pcs</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">
                            {d ? d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                          </p>
                        </div>
                        <p className="text-sm font-black text-emerald-900 shrink-0">
                          Rs {(Math.round((Number(t.unitPrice) || 0)) || 0).toLocaleString()}
                          <span className="text-[9px] text-slate-400 font-bold block text-right">per pc</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Memoized so typing in search / unrelated state changes don't re-render every card.
// Callbacks are item-taking (stable via useCallback in parent) so props stay identical.
const StockCard: React.FC<{
  item: any;
  userRole: string;
  onCloseBatch: (item: any) => void;
  onDelete: (item: any) => void;
  onEdit: (item: any) => void;
  onReturn: (item: any) => void;
  onHistory: (item: any) => void;
}> = React.memo(({ item, userRole, onCloseBatch, onDelete, onEdit, onReturn, onHistory }) => {
  const { formatProfit } = useProfitVisibility();
  return (
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
          {/* Show when this stock was last updated/added. */}
          {(() => {
            const ts = item.updatedAt || item.lastPurchaseDate;
            const d = ts?.toDate?.() ?? (ts ? new Date(ts) : null);
            if (!d) return null;
            return (
              <span className="text-xs font-medium text-slate-400">
                · {d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })}
              </span>
            );
          })()}
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
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHistory(item); }}
              className="p-3 bg-slate-100 text-slate-600 hover:text-white hover:bg-slate-600 rounded-xl transition-all shadow-sm flex items-center justify-center"
              title="Stock khata (history)"
            >
              <HistoryIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReturn(item); }}
              className="p-3 bg-orange-50 text-orange-600 hover:text-white hover:bg-orange-500 rounded-xl transition-all shadow-sm flex items-center justify-center"
              title="Return entry"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(item); }}
              className="p-3 bg-emerald-50 text-emerald-700 hover:text-white hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center justify-center"
              title="Edit item"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item); }}
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
          <span className="font-bold text-emerald-500">
            {formatProfit((item.stock / (item.pcsPerPack || 1)) * ((item.currentSell || 0) - (item.averageBuy || 0)), true)}
          </span>
        </div>
      )}
    </div>

    <button
      onClick={() => onCloseBatch(item)}
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
});


