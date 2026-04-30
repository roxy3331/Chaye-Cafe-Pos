import React from 'react';
import { Package, TrendingUp, Wallet, Search, Filter, Plus, ChevronRight, X, Trash2, Edit2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { StockItem } from '../types';
import { dataService } from '../services/dataService';
import { useNavigate } from 'react-router-dom';

import { useToast } from '../context/ToastContext';

export const Stock: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showModal, setShowModal] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<StockItem | null>(null);
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

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

  const handleDelete = async (id: string) => {
    if (userRole !== 'owner') {
      showToast('Only owners can delete stock items.', 'warning');
      return;
    }
    if (window.confirm('Are you sure you want to delete this item permanently?')) {
      await dataService.deleteStock(id);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAssets = items.reduce((acc, item) => acc + ((item.stock / (item.pcsPerPack || 1)) * (item.averageBuy || 0)), 0);
  const totalStockItems = items.reduce((acc, item) => acc + Math.floor(item.stock / (item.pcsPerPack || 1)), 0);
  const potentialProfit = items.reduce((acc, item) => acc + ((item.stock / (item.pcsPerPack || 1)) * ((item.currentSell || 0) - (item.averageBuy || 0))), 0);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
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

      {/* Stock List */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-emerald-900/40">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="font-bold uppercase text-xs tracking-widest">Loading Inventory...</p>
          </div>
        ) : filteredItems.map((item) => (
          <StockCard 
            key={item.id} 
            item={item} 
            userRole={userRole}
            onCloseBatch={() => handleCloseBatch(item)} 
            onDelete={() => handleDelete(item.id)}
          />
        ))}
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
                      await dataService.updateStock(selectedItem.id, { stock: 0 });
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
    </div>
  );
};

const StockCard: React.FC<{ item: any; userRole: string; onCloseBatch: () => void; onDelete: () => void }> = ({ item, userRole, onCloseBatch, onDelete }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card rounded-[32px] p-8 space-y-6 group hover:shadow-2xl transition-all duration-300"
  >
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
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="p-3 bg-red-100/50 text-red-500 hover:text-white hover:bg-red-600 rounded-xl transition-all shadow-sm flex items-center justify-center" 
            title="Delete permanently"
          >
            <Trash2 className="w-5 h-5" />
          </button>
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
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-slate-500 italic">Est. Profit</span>
          <span className="font-bold text-emerald-500">+{((item.stock / (item.pcsPerPack || 1)) * ((item.currentSell || 0) - (item.averageBuy || 0))).toLocaleString()}</span>
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


