import React from 'react';
import { Package, TrendingUp, Wallet, Search, Filter, Plus, ChevronRight, X, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { StockItem } from '../types';

const MOCK_STOCK: StockItem[] = [
  {
    id: '1',
    name: 'Coca Cola 250ml',
    category: 'Carbonated',
    batchNumber: '4022',
    averageBuy: 0.45,
    currentSell: 0.75,
    stock: 0,
    status: 'Low Stock'
  },
  {
    id: '2',
    name: 'Lays Classic 50g',
    category: 'Snacks',
    batchNumber: '3981',
    averageBuy: 1.10,
    currentSell: 1.50,
    stock: 120,
    status: 'Normal'
  },
  {
    id: '3',
    name: 'Oreo Cookies 133g',
    category: 'Biscuits',
    batchNumber: '4105',
    averageBuy: 0.95,
    currentSell: 1.25,
    stock: 0,
    status: 'Low Stock'
  },
  {
    id: '4',
    name: 'Nescafe Gold 200g',
    category: 'Coffee',
    batchNumber: '3882',
    averageBuy: 6.40,
    currentSell: 8.50,
    stock: 12,
    status: 'Low Stock'
  }
];

export const Stock: React.FC = () => {
  const [showModal, setShowModal] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<StockItem | null>(null);

  const handleCloseBatch = (item: StockItem) => {
    setSelectedItem(item);
    setShowModal(true);
  };

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
          />
        </div>
      </header>

      {/* Stats Bento */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-3xl flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Assets</p>
            <p className="text-3xl font-bold text-emerald-900">42,850</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-900">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
        <div className="glass-card p-6 rounded-3xl flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Items in Stock</p>
            <p className="text-3xl font-bold text-emerald-900">1,240</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-900">
            <Package className="w-6 h-6" />
          </div>
        </div>
        <div className="glass-card p-6 rounded-3xl flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Potential Profit</p>
            <p className="text-3xl font-bold text-emerald-500">+8,120</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* Stock List */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {MOCK_STOCK.map((item) => (
          <StockCard key={item.id} item={item} onCloseBatch={() => handleCloseBatch(item)} />
        ))}
      </section>

      {/* FAB */}
      <button className="fixed bottom-28 right-8 w-16 h-16 bg-emerald-900 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-40">
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
                  <p className="text-slate-500">Original Batch: <span className="font-bold text-emerald-900">{selectedItem.stock} units</span></p>
                </div>

                <div className="p-6 bg-white/50 rounded-3xl space-y-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-left mb-2">Enter Remaining Stock</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="0" 
                      className="w-full py-6 bg-white border border-emerald-50 rounded-2xl text-center text-4xl font-bold text-emerald-900 focus:ring-4 focus:ring-emerald-900/5 outline-none transition-all"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Units</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowModal(false)}
                    className="py-5 border border-emerald-100 text-emerald-900 rounded-2xl font-bold hover:bg-emerald-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button className="py-5 bg-emerald-900 text-white rounded-2xl font-bold shadow-xl shadow-emerald-900/20 active:scale-95 transition-all">
                    Finalize & Close
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

const StockCard: React.FC<{ item: StockItem; onCloseBatch: () => void }> = ({ item, onCloseBatch }) => (
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
            item.stock === 0 ? "bg-red-100 text-red-600" : (item.status === 'Low Stock' ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-700")
          )}>
            {item.stock === 0 ? 'Out of Stock' : (item.status === 'Low Stock' ? 'Low Stock' : item.category)}
          </span>
          <span className="text-xs font-medium text-slate-400">Batch #{item.batchNumber}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className={cn(
          "px-4 py-3 rounded-2xl text-center shadow-sm min-w-[70px]",
          item.stock === 0 ? "bg-red-600 text-white" : (item.status === 'Low Stock' ? "bg-orange-600 text-white" : "bg-emerald-900 text-white")
        )}>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Stock</p>
          <p className="text-xl font-bold leading-tight">{item.stock}</p>
        </div>
        <button className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Delete permanently">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-emerald-50/50 pb-3">
        <span className="text-sm font-medium text-slate-500 italic">Average Buy</span>
        <span className="font-bold text-emerald-900">{item.averageBuy.toFixed(2)}</span>
      </div>
      <div className="flex justify-between items-center border-b border-emerald-50/50 pb-3">
        <span className="text-sm font-medium text-slate-500 italic">Current Sell</span>
        <span className="font-bold text-emerald-900">{item.currentSell.toFixed(2)}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-500 italic">Est. Profit</span>
        <span className="font-bold text-emerald-500">+{(item.stock * (item.currentSell - item.averageBuy)).toFixed(2)}</span>
      </div>
    </div>

    <button 
      onClick={onCloseBatch}
      className="w-full py-4 bg-white border border-emerald-100 text-emerald-900 font-bold rounded-2xl hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 active:scale-95"
    >
      <X className="w-4 h-4" />
      Close Batch
    </button>
  </motion.div>
);
