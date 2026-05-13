import React from 'react';
import { RotateCcw, Loader2, Search, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';
import { ReturnEntry } from '../types';

export const Returns: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const [returns, setReturns] = React.useState<ReturnEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'all' | 'customer_return' | 'supplier_return'>('all');

  React.useEffect(() => {
    const unsub = dataService.subscribeToReturns((data) => {
      setReturns(data as ReturnEntry[]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = returns.filter(r => {
    const matchSearch = r.itemName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || r.returnType === filterType;
    return matchSearch && matchType;
  });

  const totalCustomerReturns = returns.filter(r => r.returnType === 'customer_return').length;
  const totalSupplierReturns = returns.filter(r => r.returnType === 'supplier_return').length;

  const formatDate = (ts: any): string => {
    if (!ts) return '—';
    const d = ts?.toDate?.() ?? new Date(ts);
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-700">

      {/* ── Header Cards ── */}
      <section className="grid grid-cols-2 gap-4">
        <div className="relative overflow-hidden rounded-3xl p-6 bg-orange-500 text-white">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mb-1">Customer Returns</p>
          <h2 className="text-4xl font-bold tracking-tight">{totalCustomerReturns}</h2>
          <p className="text-xs opacity-70 mt-1 font-medium">wapas aaye</p>
        </div>
        <div className="relative overflow-hidden rounded-3xl p-6 bg-slate-800 text-white">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mb-1">Supplier Returns</p>
          <h2 className="text-4xl font-bold tracking-tight">{totalSupplierReturns}</h2>
          <p className="text-xs opacity-70 mt-1 font-medium">wapas bheje</p>
        </div>
      </section>

      {/* ── Filters ── */}
      <section className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Item dhundho..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-emerald-100 bg-white text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
          />
        </div>
        {/* Type Filter */}
        <div className="flex gap-2">
          {([
            { val: 'all',              label: 'All' },
            { val: 'customer_return',  label: '🛒 Customer' },
            { val: 'supplier_return',  label: '🏭 Supplier' },
          ] as const).map(opt => (
            <button
              key={opt.val}
              onClick={() => setFilterType(opt.val)}
              className={cn(
                "px-4 py-2 rounded-xl font-bold text-xs transition-all",
                filterType === opt.val
                  ? "bg-emerald-900 text-white shadow"
                  : "bg-white border border-emerald-100 text-slate-600 hover:bg-emerald-50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Returns List ── */}
      <section>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-900" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <RotateCcw className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">
              {searchTerm || filterType !== 'all' ? 'Koi return nahi mila' : 'Abhi koi return nahi hua'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((ret, i) => {
                const isCustomer = ret.returnType === 'customer_return';
                return (
                  <motion.div
                    key={ret.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white border border-emerald-50 rounded-3xl p-5"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5",
                        isCustomer ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-600"
                      )}>
                        {isCustomer ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-emerald-950 text-base">{ret.itemName}</p>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                            isCustomer ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-600"
                          )}>
                            {isCustomer ? 'Customer' : 'Supplier'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{ret.category}</p>
                        {ret.reason && (
                          <p className="text-xs text-slate-500 mt-1 italic">"{ret.reason}"</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1.5">{formatDate(ret.date)}</p>
                      </div>

                      {/* Qty + Prices */}
                      <div className="text-right shrink-0">
                        <p className="text-xl font-black text-emerald-900">{ret.quantity} <span className="text-xs font-bold text-slate-400">pcs</span></p>
                        {userRole === 'owner' && (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-[10px] text-slate-400">Buy: <span className="font-bold text-slate-600">Rs {(ret.buyPrice || 0).toLocaleString()}</span></p>
                            <p className="text-[10px] text-slate-400">Sell: <span className="font-bold text-slate-600">Rs {(ret.sellPrice || 0).toLocaleString()}</span></p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
};
