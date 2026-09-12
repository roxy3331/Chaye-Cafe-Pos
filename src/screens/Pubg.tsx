import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gamepad2, Package, ShoppingCart, Coins, TrendingUp, TrendingDown, Wallet, Boxes,
  Trash2, Edit2, X, Loader2, User, Hash, AlertTriangle, Plus, Search, CheckCircle, History as HistoryIcon,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { NumberTicker, FlipIn, ShimmerSweep } from '../components/magicui';
import { searchList, normalizeText } from '../lib/search';

// ── Constants ──────────────────────────────────────────────────────────────────

const UC_PRESETS = ['60 UC', '325 UC', '660 UC', '1800 UC', '3850 UC', '8100 UC'];
const CATEGORIES = ['UC', 'Account', 'Item'] as const;
type PubgCategory = (typeof CATEGORIES)[number];
type Tab = 'stock' | 'buy' | 'sell' | 'history';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'stock', label: 'Stock', icon: <Package /> },
  { key: 'buy', label: 'Kharida', icon: <ShoppingCart /> },
  { key: 'sell', label: 'Becha', icon: <Coins /> },
  { key: 'history', label: 'History', icon: <HistoryIcon /> },
];

// Extract a clean message from either a plain Error or handleFirestoreError's JSON
const errText = (e: any): string => {
  const m = String(e?.message || '');
  if (m.startsWith('{')) {
    try { const j = JSON.parse(m); return j.message || j.error || 'Save nahi hua — dobara try karein'; } catch {}
  }
  return m || 'Kuch galat ho gaya';
};

const rs = (n: number) => `Rs ${Math.round(n).toLocaleString()}`;

const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// ── Screen ─────────────────────────────────────────────────────────────────────

export const Pubg: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const { showToast } = useToast();

  const [items, setItems] = React.useState<any[]>([]);
  const [sales, setSales] = React.useState<any[]>([]);
  const [purchases, setPurchases] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<Tab>('stock');

  // Stock tab
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');

  // Buy form
  const [buyName, setBuyName] = React.useState('');
  const [buyCategory, setBuyCategory] = React.useState<PubgCategory>('UC');
  const [buyQty, setBuyQty] = React.useState('1');
  const [buyCost, setBuyCost] = React.useState('');
  const [buySell, setBuySell] = React.useState('');
  const [buySource, setBuySource] = React.useState('');
  const [buyShowDropdown, setBuyShowDropdown] = React.useState(false);
  const [buySaving, setBuySaving] = React.useState(false);

  // Sell form
  const [sellItemId, setSellItemId] = React.useState('');
  const [sellQty, setSellQty] = React.useState('1');
  const [sellPrice, setSellPrice] = React.useState('');
  const [sellCustomer, setSellCustomer] = React.useState('');
  const [sellPlayerId, setSellPlayerId] = React.useState('');
  const [sellNote, setSellNote] = React.useState('');
  const [sellSaving, setSellSaving] = React.useState(false);

  // History tab
  const [historyFilter, setHistoryFilter] = React.useState<'all' | 'purchase' | 'sale' | 'month'>('all');
  const [deleteEntry, setDeleteEntry] = React.useState<any | null>(null); // { kind, ... }
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  // Edit item modal
  const [editItem, setEditItem] = React.useState<any | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editCategory, setEditCategory] = React.useState<PubgCategory>('UC');
  const [editSellPrice, setEditSellPrice] = React.useState('');
  const [editSaving, setEditSaving] = React.useState(false);

  // ── Data (real-time, 5s safety fallback — same as Stock.tsx) ────────────────
  React.useEffect(() => {
    let timeout: any;
    const done = () => { setLoading(false); if (timeout) clearTimeout(timeout); };
    const u1 = dataService.subscribeToPubgItems((d: any[]) => { setItems(d); done(); });
    const u2 = dataService.subscribeToPubgSales((d: any[]) => setSales(d));
    const u3 = dataService.subscribeToPubgPurchases((d: any[]) => setPurchases(d));
    timeout = setTimeout(() => setLoading(false), 5000);
    return () => { u1(); u2(); u3(); if (timeout) clearTimeout(timeout); };
  }, []);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const stats = React.useMemo(() => {
    const invested = items.reduce((a, i) => a + (Number(i.totalInvested) || 0), 0);
    const stockValue = items.reduce((a, i) => a + (Number(i.quantity) || 0) * (Number(i.sellPrice) || 0), 0);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let today = 0, month = 0, total = 0;
    sales.forEach(s => {
      const p = Number(s.profit) || 0;
      total += p;
      const d = s.date?.toDate?.();
      if (d) {
        const t = d.getTime();
        if (t >= todayStart) today += p;
        if (t >= monthStart) month += p;
      }
    });

    return { invested, stockValue, expected: stockValue - invested, today, month, total };
  }, [items, sales]);

  // Monthly chart data (last 6 months, loss months negative → red bars)
  const chartData = React.useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach(s => {
      const d = s.date?.toDate?.() ?? (s.date ? new Date(s.date) : null);
      if (!d) return;
      const key = monthKeyOf(d);
      map.set(key, (map.get(key) || 0) + (Number(s.profit) || 0));
    });
    const out: { label: string; profit: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKeyOf(d);
      out.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), profit: Math.round(map.get(key) || 0) });
    }
    return out;
  }, [sales]);

  const filteredItems = React.useMemo(() => {
    let list = items;
    if (categoryFilter) list = list.filter(i => i.category === categoryFilter);
    if (search.trim()) list = searchList(search, list as any[], i => i.name, 100);
    return list;
  }, [items, categoryFilter, search]);

  const sellableItems = React.useMemo(() => items.filter(i => (Number(i.quantity) || 0) > 0), [items]);
  const sellItem = sellableItems.find(i => i.id === sellItemId) || null;

  // ── Buy form ─────────────────────────────────────────────────────────────────
  const existingNameMatch = buyName.trim()
    ? items.find(i => normalizeText(i.name) === normalizeText(buyName))
    : undefined;
  const buySuggestions = React.useMemo(() => {
    if (!buyName.trim() || existingNameMatch) return [];
    return searchList(buyName, items as any[], i => i.name, 5);
  }, [buyName, items, existingNameMatch]);

  const buyQtyN = parseFloat(buyQty) || 0;
  const buyCostN = parseFloat(buyCost) || 0;
  const buyTotal = buyQtyN * buyCostN;

  const handleBuy = async () => {
    if (!buyName.trim()) { showToast('Item ka naam likhein', 'warning'); return; }
    if (buyQtyN <= 0) { showToast('Quantity sahi likhein', 'warning'); return; }
    if (buyCostN < 0 || buyCost === '') { showToast('Cost sahi likhein', 'warning'); return; }
    if (!existingNameMatch && !(parseFloat(buySell) > 0)) {
      showToast('Naye item ka sell price zaroori hai', 'warning'); return;
    }
    setBuySaving(true);
    try {
      await dataService.addPubgPurchase({
        name: buyName.trim(),
        category: buyCategory,
        quantity: buyQtyN,
        unitCost: buyCostN,
        sellPrice: parseFloat(buySell) || undefined,
        source: buySource || undefined,
      });
      showToast(`Kharida record ho gaya ✅ (${buyName.trim()} × ${buyQtyN})`, 'success');
      setBuyName(''); setBuyQty('1'); setBuyCost(''); setBuySell(''); setBuySource('');
      setTab('stock');
    } catch (e: any) {
      showToast(errText(e), 'error');
    } finally {
      setBuySaving(false);
    }
  };

  // ── Sell form ────────────────────────────────────────────────────────────────
  const sellQtyN = parseFloat(sellQty) || 0;
  const sellPriceN = parseFloat(sellPrice) || 0;
  const previewCost = sellItem ? (Number(sellItem.buyPrice) || 0) * sellQtyN : 0;
  const previewAmount = sellPriceN * sellQtyN;
  const previewProfit = previewAmount - previewCost;

  const handleItemPick = (id: string) => {
    setSellItemId(id);
    const it = items.find(i => i.id === id);
    if (it) setSellPrice(it.sellPrice ? String(it.sellPrice) : '');
  };

  const handleSell = async () => {
    if (!sellItem) { showToast('Item select karein', 'warning'); return; }
    if (sellQtyN <= 0) { showToast('Quantity sahi likhein', 'warning'); return; }
    if (sellQtyN > (Number(sellItem.quantity) || 0)) {
      showToast(`Stock kam hai — sirf ${sellItem.quantity} maujood`, 'warning'); return;
    }
    if (sellPrice === '' || sellPriceN < 0) { showToast('Price sahi likhein', 'warning'); return; }
    setSellSaving(true);
    try {
      await dataService.addPubgSale({
        itemId: sellItem.id,
        quantity: sellQtyN,
        unitPrice: sellPriceN,
        customerName: sellCustomer || undefined,
        playerId: sellPlayerId || undefined,
        note: sellNote || undefined,
      });
      const msg = previewProfit >= 0
        ? `Sale record ho gayi ✅ Profit: ${rs(previewProfit)}`
        : `Sale record ho gayi ✅ Loss: Rs ${Math.abs(Math.round(previewProfit)).toLocaleString()}`;
      showToast(msg, previewProfit >= 0 ? 'success' : 'warning');
      setSellQty('1'); setSellCustomer(''); setSellPlayerId(''); setSellNote('');
      setTab('history');
    } catch (e: any) {
      showToast(errText(e), 'error');
    } finally {
      setSellSaving(false);
    }
  };

  // ── History ──────────────────────────────────────────────────────────────────
  const historyEntries = React.useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const list: any[] = [];
    purchases.forEach(p => list.push({ kind: 'purchase', ...p }));
    sales.forEach(s => list.push({ kind: 'sale', ...s }));
    list.sort((a, b) => {
      const da = a.date?.toDate?.()?.getTime() ?? 0;
      const db = b.date?.toDate?.()?.getTime() ?? 0;
      return db - da;
    });
    if (historyFilter === 'purchase') return list.filter(e => e.kind === 'purchase');
    if (historyFilter === 'sale') return list.filter(e => e.kind === 'sale');
    if (historyFilter === 'month') return list.filter(e => (e.date?.toDate?.()?.getTime() ?? 0) >= monthStart);
    return list;
  }, [purchases, sales, historyFilter]);

  const confirmDeleteEntry = async () => {
    if (!deleteEntry) return;
    setDeleteBusy(true);
    try {
      if (deleteEntry.kind === 'sale') {
        await dataService.deletePubgSale({
          id: deleteEntry.id,
          itemId: deleteEntry.itemId,
          quantity: Number(deleteEntry.quantity) || 0,
          unitCost: Number(deleteEntry.unitCost) || 0,
        });
        showToast('Sale delete — stock wapis restore ✅', 'success');
      } else {
        await dataService.deletePubgPurchase({
          id: deleteEntry.id,
          name: deleteEntry.name,
          quantity: Number(deleteEntry.quantity) || 0,
          totalCost: Number(deleteEntry.totalCost) || 0,
        });
        showToast('Purchase delete — stock adjust ho gaya ✅', 'success');
      }
      setDeleteEntry(null);
    } catch (e: any) {
      showToast(errText(e), 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  // ── Edit item ────────────────────────────────────────────────────────────────
  const openEdit = (item: any) => {
    setEditItem(item);
    setEditName(item.name || '');
    setEditCategory((item.category as PubgCategory) || 'Item');
    setEditSellPrice(item.sellPrice ? String(item.sellPrice) : '');
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    if (!editName.trim()) { showToast('Item ka naam likhein', 'warning'); return; }
    setEditSaving(true);
    try {
      await dataService.updatePubgItem(editItem.id, {
        name: editName.trim(),
        category: editCategory,
        sellPrice: parseFloat(editSellPrice) || 0,
      });
      showToast('Item update ho gaya ✅', 'success');
      setEditItem(null);
    } catch (e: any) {
      showToast(errText(e), 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-emerald-900/40">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="font-bold uppercase text-xs tracking-widest">PUBG Hisab load ho raha hai...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-900 rounded-2xl flex items-center justify-center text-white">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-emerald-900">PUBG Hisab</h1>
          </div>
          <p className="text-slate-500 text-lg mt-2 max-w-lg">UC aur accounts ka stock, kharidari, sale aur munafa — sab yahan.</p>
        </div>
      </div>

      {/* Stats bento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        <FlipIn delay={0}>
          <ShimmerSweep delay={0.3}>
            <div className="glass-card p-4 md:p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-900"><Wallet className="w-4 h-4" /></div>
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Lagaya Hua</p>
              <h3 className="text-xl md:text-2xl font-bold text-emerald-900 mt-0.5">Rs <NumberTicker value={Math.round(stats.invested)} /></h3>
              <p className="text-[10px] text-slate-400 italic mt-2 pt-2 border-t border-emerald-50/50">Stock me paisa laga hua</p>
            </div>
          </ShimmerSweep>
        </FlipIn>
        <FlipIn delay={0.08}>
          <ShimmerSweep delay={0.35}>
            <div className="glass-card p-4 md:p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-900"><Boxes className="w-4 h-4" /></div>
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Stock Value</p>
              <h3 className="text-xl md:text-2xl font-bold text-emerald-900 mt-0.5">Rs <NumberTicker value={Math.round(stats.stockValue)} /></h3>
              <p className="text-[10px] text-slate-400 italic mt-2 pt-2 border-t border-emerald-50/50">Bechne ke rate se · Expected: {rs(stats.expected)}</p>
            </div>
          </ShimmerSweep>
        </FlipIn>
        <FlipIn delay={0.16}>
          <ShimmerSweep delay={0.4}>
            <div className="glass-card p-4 md:p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-900"><Coins className="w-4 h-4" /></div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Aaj</span>
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Munafa Aaj</p>
              <h3 className={cn('text-xl md:text-2xl font-bold mt-0.5', stats.today < 0 ? 'text-red-500' : 'text-emerald-900')}>
                {stats.today < 0 ? '−' : ''}Rs <NumberTicker value={Math.abs(Math.round(stats.today))} />
              </h3>
              <p className="text-[10px] text-slate-400 italic mt-2 pt-2 border-t border-emerald-50/50">Total kamaya: {rs(stats.total)}</p>
            </div>
          </ShimmerSweep>
        </FlipIn>
        <FlipIn delay={0.24}>
          <ShimmerSweep delay={0.45}>
            <div className="glass-card p-4 md:p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-900">
                  {stats.month < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Mahina</span>
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Munafa Is Mahine</p>
              <h3 className={cn('text-xl md:text-2xl font-bold mt-0.5', stats.month < 0 ? 'text-red-500' : 'text-emerald-900')}>
                {stats.month < 0 ? '−' : ''}Rs <NumberTicker value={Math.abs(Math.round(stats.month))} />
              </h3>
              <p className="text-[10px] text-slate-400 italic mt-2 pt-2 border-t border-emerald-50/50">
                {items.filter(i => (Number(i.quantity) || 0) === 0).length} items khatam
              </p>
            </div>
          </ShimmerSweep>
        </FlipIn>
      </div>

      {/* Tabs */}
      <div className="glass-card rounded-full p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 md:px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all',
              tab === t.key ? 'bg-emerald-900 text-white shadow-lg shadow-emerald-900/10' : 'text-slate-500 hover:bg-emerald-50'
            )}
          >
            {React.cloneElement(t.icon as React.ReactElement, { className: 'w-4 h-4' })}
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          {/* ════════ STOCK TAB ════════ */}
          {tab === 'stock' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="glass-card rounded-3xl p-4 md:p-6 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategoryFilter(null)}
                    className={cn('px-4 py-2.5 rounded-2xl text-xs font-bold border transition-colors',
                      !categoryFilter ? 'bg-emerald-900 border-emerald-900 text-white' : 'bg-emerald-50/60 border-emerald-100 text-slate-600 hover:bg-emerald-50')}
                  >Sab ({items.length})</button>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setCategoryFilter(c)}
                      className={cn('px-4 py-2.5 rounded-2xl text-xs font-bold border transition-colors',
                        categoryFilter === c ? 'bg-emerald-900 border-emerald-900 text-white' : 'bg-emerald-50/60 border-emerald-100 text-slate-600 hover:bg-emerald-50')}
                    >{c === 'UC' ? '💎 UC' : c === 'Account' ? '👤 Account' : '📦 Item'} ({items.filter(i => i.category === c).length})</button>
                  ))}
                </div>
                <div className="relative w-full md:w-64 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-emerald-700" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-md border border-emerald-50 rounded-2xl text-sm font-medium text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5"
                  />
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <div className="glass-card rounded-3xl p-10 text-center">
                  <p className="text-4xl mb-3">🎮</p>
                  <p className="text-slate-400 font-bold">Koi stock nahi — "Kharida" tab se UC ya account add karein</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredItems.map(item => {
                    const qty = Number(item.quantity) || 0;
                    const margin = (Number(item.sellPrice) || 0) - (Number(item.buyPrice) || 0);
                    const marginPct = item.sellPrice > 0 ? Math.round((margin / item.sellPrice) * 100) : 0;
                    return (
                      <motion.div key={item.id} whileHover={{ y: -5 }} className="glass-card rounded-[32px] p-6 md:p-8 space-y-5 group hover:shadow-2xl transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-bold text-emerald-900">{item.name}</h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {item.category === 'UC' ? '💎 UC' : item.category === 'Account' ? '👤 Account' : '📦 Item'}
                            </span>
                          </div>
                          {qty === 0
                            ? <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-100 text-red-600">⚠️ Khatam</span>
                            : qty <= 2
                              ? <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-orange-50 text-orange-600">⚡ Low</span>
                              : <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700">Normal</span>}
                        </div>

                        <div className={cn('rounded-2xl px-4 py-3 flex items-center justify-between',
                          qty === 0 ? 'bg-red-500' : qty <= 2 ? 'bg-orange-400' : 'bg-emerald-900')}>
                          <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Stock</span>
                          <span className="text-white text-2xl font-black">{qty}</span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b border-emerald-50/50 pb-3">
                            <span className="text-sm font-medium text-slate-500 italic">Avg Cost</span>
                            <span className="text-sm font-bold text-emerald-900">{rs(item.buyPrice)}</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-emerald-50/50 pb-3">
                            <span className="text-sm font-medium text-slate-500 italic">Sell Price</span>
                            <span className="text-sm font-bold text-emerald-900">{rs(item.sellPrice)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-500 italic">Margin/pc</span>
                            <span className={cn('text-sm font-bold', margin < 0 ? 'text-red-500' : 'text-emerald-600')}>
                              {margin < 0 ? '' : '+'}{rs(margin)} ({marginPct}%)
                            </span>
                          </div>
                        </div>

                        {userRole === 'owner' && (
                          <div className="flex gap-2 pt-2">
                            <button onClick={() => openEdit(item)}
                              className="flex-1 p-3 bg-emerald-50 text-emerald-700 hover:text-white hover:bg-emerald-700 rounded-xl transition-colors" title="Edit">
                              <Edit2 className="w-4 h-4 mx-auto" />
                            </button>
                            <button
                              onClick={() => { if ((Number(item.quantity) || 0) > 0) { handleItemPick(item.id); setSellQty('1'); setTab('sell'); } else showToast('Stock khatam hai — pehle kharidein', 'warning'); }}
                              disabled={qty === 0}
                              className="flex-1 p-3 bg-emerald-900 text-white hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-40 text-xs font-bold uppercase tracking-wider"
                            >Bechna</button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════ BUY TAB ════════ */}
          {tab === 'buy' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-6">
                <div className="glass-card rounded-[32px] p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-900"><ShoppingCart className="w-6 h-6" /></div>
                    <div>
                      <h2 className="text-2xl font-bold text-emerald-900">Nayi Kharidari</h2>
                      <p className="text-xs text-slate-400">UC / account kharida? Yahan entry karein</p>
                    </div>
                  </div>

                  {existingNameMatch && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-bold animate-pulse">
                      <CheckCircle className="w-4 h-4" /> Existing item mila — avg cost khud update hoga (stock: {existingNameMatch.quantity})
                    </div>
                  )}

                  {/* Item name + autocomplete */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Item Ka Naam</label>
                    <div className="relative">
                      <input
                        value={buyName} onChange={e => { setBuyName(e.target.value); setBuyShowDropdown(true); }}
                        onFocus={() => setBuyShowDropdown(true)} onBlur={() => setTimeout(() => setBuyShowDropdown(false), 150)}
                        placeholder="jaise: 60 UC / 1800 UC / PUBG Account"
                        className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10"
                      />
                      {buyShowDropdown && buySuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-emerald-50 overflow-hidden z-[60]">
                          {buySuggestions.map(s => (
                            <button key={s.id} type="button"
                              onMouseDown={() => { setBuyName(s.name); setBuyCategory((s.category as PubgCategory) || 'Item'); setBuyShowDropdown(false); }}
                              className="w-full text-left px-5 py-3 hover:bg-emerald-50 text-sm font-bold text-emerald-900 flex justify-between items-center"
                            >
                              <span>{s.name}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">stock: {s.quantity}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* UC presets */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {UC_PRESETS.map(p => (
                        <button key={p} type="button" onClick={() => { setBuyName(p); setBuyCategory('UC'); }}
                          className={cn('px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
                            buyName === p ? 'bg-emerald-900 text-white' : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100')}
                        >{p}</button>
                      ))}
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Category</label>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIES.map(c => (
                        <button key={c} type="button" onClick={() => setBuyCategory(c)}
                          className={cn('py-3 px-2 rounded-2xl border text-xs font-bold transition-colors',
                            buyCategory === c ? 'border-emerald-900 bg-emerald-50 text-emerald-900' : 'border-emerald-100 bg-white text-slate-500 hover:bg-emerald-50/50')}
                        >{c === 'UC' ? '💎 UC' : c === 'Account' ? '👤 Account' : '📦 Item'}</button>
                      ))}
                    </div>
                  </div>

                  {/* Qty + Cost */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Quantity</label>
                      <input type="number" min="1" value={buyQty} onChange={e => setBuyQty(e.target.value)}
                        className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl text-xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                      <div className="flex gap-1.5 flex-wrap">
                        {[1, 2, 5, 10, 20, 50].map(q => (
                          <button key={q} type="button" onClick={() => setBuyQty(String(q))}
                            className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-xs hover:bg-emerald-900 hover:text-white transition-colors">{q}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Cost / Unit (Rs)</label>
                      <input type="number" min="0" value={buyCost} onChange={e => setBuyCost(e.target.value)} placeholder="0"
                        className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl text-xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                    </div>
                  </div>

                  {/* Sell price + source */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">
                        Sell Price / Unit (Rs) {!existingNameMatch && <span className="text-red-500">*</span>}
                      </label>
                      <input type="number" min="0" value={buySell} onChange={e => setBuySell(e.target.value)} placeholder="0"
                        className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl text-xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                      <p className="text-[10px] text-slate-400 px-1">Naye item ke liye zaroori · purane pe optional</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Source (optional)</label>
                      <input value={buySource} onChange={e => setBuySource(e.target.value)} placeholder="Midasbuy / reseller..."
                        className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live summary */}
              <div className="lg:col-span-4">
                <div className="glass-card rounded-[40px] overflow-hidden sticky top-24">
                  <div className="relative overflow-hidden bg-emerald-900 p-8 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 relative z-10">Total Kharid</p>
                    <p className="text-4xl font-black mt-2 relative z-10">Rs {(Math.round(buyTotal)).toLocaleString()}</p>
                    <p className="text-xs text-emerald-200/70 mt-2 relative z-10">{buyName.trim() || '— item —'} × {buyQtyN || 0} @ Rs {(buyCostN || 0).toLocaleString()}</p>
                    <div className="absolute right-[-20px] top-[-20px] opacity-10"><ShoppingCart className="w-32 h-32" /></div>
                  </div>
                  <div className="p-6 space-y-4 bg-white/40">
                    {existingNameMatch ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Purana Avg Cost</span>
                          <span className="text-sm font-bold text-emerald-950">{rs(existingNameMatch.buyPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Naya Avg Cost (approx)</span>
                          <span className="text-sm font-bold text-emerald-950">
                            {(() => {
                              const nq = (Number(existingNameMatch.quantity) || 0) + buyQtyN;
                              const ni = (Number(existingNameMatch.totalInvested) || 0) + buyTotal;
                              return rs(nq > 0 ? ni / nq : buyCostN);
                            })()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Naya Item</span>
                        <span className="text-sm font-bold text-emerald-950">{rs(buyCostN)}</span>
                      </div>
                    )}
                    <button onClick={handleBuy} disabled={buySaving}
                      className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                      {buySaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                      {buySaving ? 'ADDING...' : 'PURCHASE RECORD KARO'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════ SELL TAB ════════ */}
          {tab === 'sell' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-6">
                <div className="glass-card rounded-[32px] p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-900"><Coins className="w-6 h-6" /></div>
                    <div>
                      <h2 className="text-2xl font-bold text-emerald-900">Nayi Sale</h2>
                      <p className="text-xs text-slate-400">Rate roz change hota hai — price yahan set karein</p>
                    </div>
                  </div>

                  {sellableItems.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-4xl mb-3">📦</p>
                      <p className="text-slate-400 font-bold">Stock khatam hai — pehle "Kharida" tab se le aayein</p>
                      <button onClick={() => setTab('buy')} className="mt-4 px-6 py-3 bg-emerald-900 text-white rounded-2xl font-bold text-sm">Kharida Tab Kholein</button>
                    </div>
                  ) : (
                    <>
                      {/* Item select */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Item</label>
                        <select value={sellItemId} onChange={e => handleItemPick(e.target.value)}
                          className="w-full py-4 px-6 bg-white border border-emerald-50 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5 appearance-none">
                          <option value="">— Item chunein —</option>
                          {sellableItems.map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.quantity} available)</option>
                          ))}
                        </select>
                      </div>

                      {sellItem && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-bold">
                          <Boxes className="w-4 h-4" /> Stock: {sellItem.quantity} · Avg Cost: {rs(sellItem.buyPrice)}
                        </div>
                      )}

                      {/* Qty + Price */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Quantity</label>
                          <input type="number" min="1" value={sellQty} onChange={e => setSellQty(e.target.value)}
                            className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl text-xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                          {sellItem && (
                            <div className="flex gap-1.5 flex-wrap">
                              {Array.from({ length: Math.min(5, Math.floor(sellItem.quantity)) }, (_, k) => k + 1).map(q => (
                                <button key={q} type="button" onClick={() => setSellQty(String(q))}
                                  className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-xs hover:bg-emerald-900 hover:text-white transition-colors">{q}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Price / Unit (Rs)</label>
                          <input type="number" min="0" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="0"
                            className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl text-xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                        </div>
                      </div>

                      {/* Customer info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Customer (optional)</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={sellCustomer} onChange={e => setSellCustomer(e.target.value)} placeholder="Naam"
                              className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Player ID (optional)</label>
                          <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={sellPlayerId} onChange={e => setSellPlayerId(e.target.value)} placeholder="5123456789"
                              className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Note (optional)</label>
                        <input value={sellNote} onChange={e => setSellNote(e.target.value)} placeholder="jaise: Royal Pass ke saath"
                          className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Live profit preview */}
              <div className="lg:col-span-4">
                <div className={cn('glass-card rounded-[40px] overflow-hidden sticky top-24', previewProfit < 0 && 'border-red-200')}>
                  <div className={cn('relative overflow-hidden p-8 text-white', previewProfit < 0 ? 'bg-red-600' : 'bg-emerald-900')}>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 relative z-10">
                      {previewProfit < 0 ? '⚠️ LOSS Ban Raha Hai' : 'Munafa Ban Raha Hai'}
                    </p>
                    <p className="text-4xl font-black mt-2 relative z-10">
                      {previewProfit < 0 ? '−' : ''}Rs {Math.abs(Math.round(previewProfit)).toLocaleString()}
                    </p>
                    <div className="absolute right-[-20px] top-[-20px] opacity-10">
                      {previewProfit < 0 ? <AlertTriangle className="w-32 h-32" /> : <Coins className="w-32 h-32" />}
                    </div>
                  </div>
                  <div className="p-6 space-y-4 bg-white/40">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Sale</span>
                      <span className="text-sm font-bold text-emerald-950">{rs(previewAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Cost ({sellQtyN || 0} × {sellItem ? rs(sellItem.buyPrice) : '—'})</span>
                      <span className="text-sm font-bold text-emerald-950">{rs(previewCost)}</span>
                    </div>
                    {sellItem && sellQtyN > (Number(sellItem.quantity) || 0) && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Stock se zyada — sirf {sellItem.quantity} maujood
                      </div>
                    )}
                    <button onClick={handleSell} disabled={sellSaving || !sellItem || sellQtyN <= 0}
                      className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                      {sellSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      {sellSaving ? 'SAVING...' : 'SALE RECORD KARO'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════ HISTORY TAB ════════ */}
          {tab === 'history' && (
            <div className="space-y-6">
              {/* Monthly chart */}
              <div className="glass-card rounded-3xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-emerald-900">Monthly Munafa</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pichhle 6 mahine · loss red</span>
                </div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-emerald-50)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-slate-400)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--color-slate-400)' }} />
                      <Tooltip
                        cursor={{ fill: 'var(--color-emerald-50)' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
                        formatter={(v: any) => [`Rs. ${Number(v).toLocaleString()}`, 'Profit']}
                      />
                      <Bar dataKey="profit" radius={[8, 8, 0, 0]} maxBarSize={48}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.profit < 0 ? 'var(--color-red-500)' : 'var(--color-emerald-500)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'all', label: 'Sab' },
                  { key: 'sale', label: '💰 Becha' },
                  { key: 'purchase', label: '🛒 Kharida' },
                  { key: 'month', label: '📅 Is Mahine' },
                ] as const).map(f => (
                  <button key={f.key} onClick={() => setHistoryFilter(f.key)}
                    className={cn('px-4 py-2.5 rounded-2xl text-xs font-bold border transition-colors',
                      historyFilter === f.key ? 'bg-emerald-900 border-emerald-900 text-white' : 'bg-white/60 border-emerald-100 text-slate-600 hover:bg-emerald-50')}
                  >{f.label}</button>
                ))}
              </div>

              {/* Timeline */}
              {historyEntries.length === 0 ? (
                <div className="glass-card rounded-3xl p-10 text-center">
                  <p className="text-4xl mb-3">🗂️</p>
                  <p className="text-slate-400 font-bold">Abhi koi entry nahi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyEntries.map(e => {
                    const d = e.date?.toDate?.();
                    const isSale = e.kind === 'sale';
                    const profit = Number(e.profit) || 0;
                    return (
                      <motion.div key={e.kind + e.id} whileHover={{ x: 4 }}
                        className={cn('glass-card rounded-2xl p-4 md:p-5 flex items-center gap-4 border-l-4',
                          isSale ? 'border-l-emerald-500' : 'border-l-slate-300')}>
                        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
                          isSale ? 'bg-emerald-900 text-white' : 'bg-emerald-50 text-emerald-900')}>
                          {isSale ? <Coins className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-emerald-900 truncate">{e.name}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">× {e.quantity}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {d ? d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                            {isSale && e.customerName ? ` · ${e.customerName}` : ''}
                            {!isSale && e.source ? ` · ${e.source}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-emerald-950">{rs(isSale ? (Number(e.totalAmount) || 0) : (Number(e.totalCost) || 0))}</p>
                          {isSale && (
                            <p className={cn('text-xs font-bold', profit < 0 ? 'text-red-500' : 'text-emerald-600')}>
                              {profit < 0 ? '−' : '+'}Rs {Math.abs(Math.round(profit)).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {userRole === 'owner' && (
                          <button onClick={() => setDeleteEntry(e)} title="Delete"
                            className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* FAB — stock tab pe buy tab khulta hai */}
      {tab === 'stock' && (
        <button onClick={() => setTab('buy')}
          className="fixed bottom-28 right-8 w-16 h-16 bg-emerald-900 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-40">
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* ════════ EDIT ITEM MODAL (bottom-sheet mobile / centered desktop) ════════ */}
      <AnimatePresence>
        {editItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/20 backdrop-blur-md z-[80]" onClick={() => setEditItem(null)} />
            <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full max-w-md glass-card rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto pointer-events-auto">
                <button onClick={() => setEditItem(null)}
                  className="absolute right-6 top-6 p-2 rounded-full hover:bg-emerald-50 text-slate-400"><X className="w-5 h-5" /></button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-900"><Edit2 className="w-6 h-6" /></div>
                  <div>
                    <h2 className="text-2xl font-bold text-emerald-900">Edit Item</h2>
                    <p className="text-xs text-slate-400">Naam, category ya sell price theek karein</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Item Name</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c} type="button" onClick={() => setEditCategory(c)}
                        className={cn('py-3 px-2 rounded-2xl border text-xs font-bold transition-colors',
                          editCategory === c ? 'border-emerald-900 bg-emerald-50 text-emerald-900' : 'border-emerald-100 bg-white text-slate-500 hover:bg-emerald-50/50')}
                      >{c === 'UC' ? '💎 UC' : c === 'Account' ? '👤 Account' : '📦 Item'}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Sell Price / Unit (Rs)</label>
                  <input type="number" min="0" value={editSellPrice} onChange={e => setEditSellPrice(e.target.value)}
                    className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" />
                  <p className="text-[10px] text-slate-400 px-1">Avg cost ({rs(editItem.buyPrice)}) kharidari se khud update hota hai</p>
                </div>

                <button onClick={handleSaveEdit} disabled={editSaving}
                  className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                  {editSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Edit2 className="w-5 h-5" />}
                  Save Changes
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ════════ DELETE CONFIRM MODAL ════════ */}
      <AnimatePresence>
        {deleteEntry && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-[80]" onClick={() => setDeleteEntry(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center space-y-5">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-900">Delete Karo?</h3>
                  <p className="text-slate-500 text-sm mt-2">
                    {deleteEntry.kind === 'sale'
                      ? <>Ye sale delete hategi aur stock mein <span className="font-bold text-emerald-900">+{deleteEntry.quantity}</span> wapis aa jayega.</>
                      : <>Ye purchase delete hoga aur stock <span className="font-bold text-red-500">−{deleteEntry.quantity}</span> ho jayega (agar maal bech chuke hain to 0 tak).</>}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteEntry(null)}
                    className="flex-1 py-3 rounded-2xl border border-emerald-100 text-slate-600 font-bold hover:bg-emerald-50 transition-colors">Raho</button>
                  <button onClick={confirmDeleteEntry} disabled={deleteBusy}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {deleteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Haan, Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
