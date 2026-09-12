import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, BarChart3, Wallet, Info, Share2, Loader2, Trophy, TrendingDown, X, Calendar, Receipt, Tag, PiggyBank, ArrowDown, ArrowUp, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { useProfitVisibility } from '../context/ProfitVisibilityContext';
import { motion, AnimatePresence } from 'motion/react';
import { NumberTicker, BorderBeam, Meteors, FlipIn, ShimmerSweep } from '../components/magicui';
import { TableWrapper } from '../components/TableWrapper';
import { Period, PERIOD_LABELS, filterByPeriod, computePnL, getMonthKey, expensesByMonth, tsOf } from '../lib/periodUtils';

const PERIODS: Period[] = ['today', 'month', 'year', 'all'];

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const { isProfitHidden, toggleProfitHidden, formatProfit } = useProfitVisibility();
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<Period>('all');
  const [showTopSellers, setShowTopSellers] = React.useState(false);
  const [topSellersLoading, setTopSellersLoading] = React.useState(false);
  const [topSellersData, setTopSellersData] = React.useState<{
    topSellers: { name: string; units: number; profit: number }[];
    deadStock: { name: string; units: number; stock: number }[];
  } | null>(null);

  // Raw data — everything below is DERIVED from these via useMemo, so all screens
  // compute profit the exact same way (fixes the "profit alag dikh raha tha" bug).
  const [sales, setSales] = React.useState<any[]>([]);
  const [expenses, setExpenses] = React.useState<any[]>([]);
  const [stockItems, setStockItems] = React.useState<any[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = React.useState<{ month: string; label: string; total: number }[]>([]);

  // Refs hold the data we already fetched/subscribed to, so the Top Sellers modal
  // doesn't re-download the entire sales + stock collections a second time.
  const stockRef = React.useRef<any[]>([]);
  const salesRef = React.useRef<any[]>([]);

  React.useEffect(() => {
    let unsubscribeSales: () => void;
    let safetyTimer: ReturnType<typeof setTimeout>;

    const fetch = async () => {
      setLoading(true);
      safetyTimer = setTimeout(() => setLoading(false), 8000);
      try {
        // Fetch independent collections in parallel instead of sequentially.
        const [stock, exps] = await Promise.all([
          dataService.getStock() as Promise<any[]>,
          dataService.getExpenses(),
        ]);
        stockRef.current = stock || [];
        setStockItems(stock || []);
        setExpenses(exps || []);

        // Monthly expenses list (breakdown section)
        const expByMonth: Record<string, { label: string; total: number }> = {};
        (exps || []).forEach((exp: any) => {
          const t = tsOf(exp.date);
          if (t === null) return;
          const d = new Date(t);
          const key = getMonthKey(d);
          const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          if (!expByMonth[key]) expByMonth[key] = { label, total: 0 };
          expByMonth[key].total += (exp.amount || 0);
        });
        setMonthlyExpenses(
          Object.entries(expByMonth)
            .map(([month, v]) => ({ month, label: v.label, total: v.total }))
            .sort((a, b) => b.month.localeCompare(a.month))
        );

        unsubscribeSales = dataService.subscribeToSales((s) => {
          salesRef.current = s; // cached so loadTopSellers can reuse it
          setSales(s);
          setLoading(false);
        });
      } catch (e) {
        setLoading(false);
      }
    };
    fetch();
    return () => { unsubscribeSales?.(); clearTimeout(safetyTimer); };
  }, []);

  // ── P&L for the selected period (single source of truth) ────────────────────
  const pnl = React.useMemo(() => {
    const periodSales = filterByPeriod(sales, period);
    const periodExpenses = filterByPeriod(expenses, period);
    return computePnL(periodSales, periodExpenses);
  }, [sales, expenses, period]);

  // Stock-derived stats (not period-dependent — current stock state)
  const stockStats = React.useMemo(() => {
    let totalAssets = 0, potentialProfit = 0, stockCount = 0;
    let low = 0, normal = 0, out = 0;
    for (const item of stockItems) {
      const boxes = (item.stock || 0) / (item.pcsPerPack || 1);
      totalAssets += boxes * (item.averageBuy || 0);
      potentialProfit += boxes * ((item.currentSell || 0) - (item.averageBuy || 0));
      if ((item.stock || 0) > 0) stockCount++;
      if ((item.stock || 0) === 0) out++;
      else if ((item.stock || 0) < (item.pcsPerPack || 1)) low++;
      else normal++;
    }
    return { totalAssets, potentialProfit, stockCount, itemsByStatus: { low, normal, out } };
  }, [stockItems]);

  // ── Category-wise profit (period-filtered) ──────────────────────────────────
  const itemCategoryMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    stockItems.forEach(item => { if (item.name) map[item.name] = item.category || 'General'; });
    return map;
  }, [stockItems]);

  const categoryData = React.useMemo(() => {
    const periodSales = filterByPeriod(sales, period);
    const catMap: Record<string, { units: number; revenue: number; profit: number }> = {};
    periodSales.forEach(s => {
      const cat = itemCategoryMap[s.itemName] || 'General';
      if (!catMap[cat]) catMap[cat] = { units: 0, revenue: 0, profit: 0 };
      catMap[cat].units  += (s.units  || 0);
      catMap[cat].revenue += (s.units  || 0) * (s.sellPrice || 0);
      catMap[cat].profit  += (s.profit || 0);
    });
    return Object.entries(catMap)
      .map(([category, d]) => ({
        category,
        units:   Math.round(d.units * 10) / 10,
        revenue: Math.round(d.revenue),
        profit:  Math.round(d.profit),
        margin:  d.revenue > 0 ? Math.round((d.profit / d.revenue) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [sales, period, itemCategoryMap]);

  // ── Monthly history: LIVE gross + net from sales & expenses (not frozen snapshots) ──
  const monthlyHistory = React.useMemo(() => {
    const grossByMonth: Record<string, number> = {};
    for (const s of sales) {
      const t = tsOf(s.date);
      if (t === null) continue;
      const key = getMonthKey(new Date(t));
      grossByMonth[key] = (grossByMonth[key] || 0) + (s.profit || 0);
    }
    const expByMonth = expensesByMonth(expenses);

    const keys = new Set([...Object.keys(grossByMonth), ...Object.keys(expByMonth)]);
    return Array.from(keys)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 12) // latest 12 months
      .map(key => {
        const [y, m] = key.split('-').map(Number);
        const label = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const gross = grossByMonth[key] || 0;
        const exp = expByMonth[key] || 0;
        return { monthKey: key, label, gross, expenses: exp, net: gross - exp };
      });
  }, [sales, expenses]);

  // ── Expense category breakdown (period-filtered) ────────────────────────────
  const expenseByCategory = React.useMemo(() => {
    const periodExpenses = filterByPeriod(expenses, period);
    const catMap: Record<string, number> = {};
    let total = 0;
    for (const e of periodExpenses) {
      const cat = e.category || 'Others';
      catMap[cat] = (catMap[cat] || 0) + (e.amount || 0);
      total += (e.amount || 0);
    }
    return Object.entries(catMap)
      .map(([category, amount]) => ({ category, amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, period]);

  const loadTopSellers = async () => {
    setShowTopSellers(true);
    if (topSellersData) return;
    setTopSellersLoading(true);
    try {
      // Reuse already-fetched stock + already-subscribed sales when available, so we
      // don't re-download both entire collections just to open this modal.
      let salesRaw = salesRef.current;
      let stockRaw = stockRef.current;
      const needFetch = salesRaw.length === 0 || stockRaw.length === 0;
      if (needFetch) {
        const [s, st] = await Promise.all([
          salesRaw.length === 0 ? dataService.getSales() : Promise.resolve(salesRaw),
          stockRaw.length === 0 ? dataService.getStock() as Promise<any[]> : Promise.resolve(stockRaw),
        ]);
        salesRaw = s as any[];
        stockRaw = st as any[];
      }
      // Top sellers respect the selected period
      const periodSales = filterByPeriod(salesRaw, period);
      const stockItems = stockRaw;

      const salesMap: Record<string, { units: number; profit: number }> = {};
      for (const s of periodSales) {
        const name = s.itemName || 'Unknown';
        if (!salesMap[name]) salesMap[name] = { units: 0, profit: 0 };
        salesMap[name].units += s.units || 0;
        salesMap[name].profit += s.profit || 0;
      }

      const topSellers = Object.entries(salesMap)
        .map(([name, d]) => ({ name, units: d.units, profit: d.profit }))
        .sort((a, b) => b.units - a.units)
        .slice(0, 15);

      const soldNames = new Set(Object.keys(salesMap));
      const deadStock = stockItems
        .filter(i => i.stock > 0 && !soldNames.has(i.name))
        .map(i => ({ name: i.name, units: i.stock, stock: i.stock }))
        .sort((a, b) => b.stock - a.stock);

      setTopSellersData({ topSellers, deadStock });
    } catch (e) {
      showToast('Data load nahi hua', 'error');
    } finally {
      setTopSellersLoading(false);
    }
  };

  const chartData = [
    { name: 'Assets', value: stockStats.totalAssets },
    { name: 'Gross Profit', value: pnl.grossProfit },
    { name: 'Expenses', value: pnl.totalExpenses },
    { name: 'Net Profit', value: pnl.netProfit },
  ];

  // Monthly net-profit chart — last 6 months (live computed)
  const monthlyChartData = [...monthlyHistory]
    .slice(0, 6)
    .reverse()
    .map(m => ({
      month: m.label?.split(' ')[0]?.slice(0, 3) ?? m.monthKey,
      net: m.net,
    }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-emerald-900/40">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="font-bold uppercase text-xs tracking-widest">Generating Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold text-emerald-900">Reports & Analytics</h1>

        {/* Time period tabs + munafa hide/show — saare metrics is period ke hisaab se */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 bg-emerald-50/60 p-1.5 rounded-2xl w-fit max-w-full overflow-x-auto">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap",
                  period === p ? "bg-emerald-900 text-white shadow-lg" : "text-emerald-900/60 hover:bg-emerald-100"
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <button
            onClick={toggleProfitHidden}
            title={isProfitHidden ? 'Munafa dikhayein' : 'Munafa chhupayein'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 border border-emerald-100 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
          >
            {isProfitHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {isProfitHidden ? 'Munafa Chhupa' : 'Munafa Dikha'}
          </button>
        </div>
      </header>

      {/* NET PROFIT hero — gross minus kharcha */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FlipIn delay={0}>
          <div className="glass-card p-8 rounded-3xl flex justify-between items-center bg-gradient-to-br from-emerald-900 to-emerald-800 text-white shadow-2xl relative overflow-hidden">
            <BorderBeam colorFrom="#6ee7b7" colorTo="#34d399" size={200} duration={8} borderWidth={1.5} />
            <Meteors number={8} />
            <div className="relative z-10">
              <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">NET PROFIT — {PERIOD_LABELS[period]}</p>
              <p className={cn("text-6xl font-bold", pnl.netProfit < 0 && "text-red-300")}>
                {formatProfit(pnl.netProfit, true)}
              </p>
              <p className="text-[11px] font-bold opacity-70 mt-2">
                Gross: {formatProfit(pnl.grossProfit, true)} · Kharcha: Rs {Math.round(pnl.totalExpenses).toLocaleString()}
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white shadow-sm backdrop-blur-md relative z-10">
              <PiggyBank className="w-8 h-8" />
            </div>
          </div>
        </FlipIn>
        <FlipIn delay={0.08}>
          <ShimmerSweep delay={0.3}>
          <div className="glass-card p-8 rounded-3xl flex justify-between items-center bg-emerald-50">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Potential Profit (Unsold Stock)</p>
              <p className="text-5xl font-bold text-emerald-600">{formatProfit(stockStats.potentialProfit, true)}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
              <BarChart3 className="w-7 h-7" />
            </div>
          </div>
          </ShimmerSweep>
        </FlipIn>
        <FlipIn delay={0.16}>
          <StatCard label="Asset Valuation" value={stockStats.totalAssets} color="text-emerald-900" />
        </FlipIn>
        <FlipIn delay={0.24}>
          <ShimmerSweep delay={0.45}>
          <div className="glass-card p-6 rounded-3xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Kharcha — {PERIOD_LABELS[period]}</p>
            <p className="text-3xl font-bold text-red-500"><NumberTicker value={pnl.totalExpenses} /></p>
            <p className="text-xs text-slate-400 mt-1">Margin: <span className="font-bold text-emerald-700">{pnl.marginPct}%</span></p>
          </div>
          </ShimmerSweep>
        </FlipIn>
      </section>

      {/* ── P&L Breakdown — sab kuch ek nazar me ── */}
      <section className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-900 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-900">Profit &amp; Loss — {PERIOD_LABELS[period]}</h3>
            <p className="text-xs text-slate-400">Revenue se net profit tak poora hisaab</p>
          </div>
        </div>

        <div className="space-y-1">
          <PnlRow label="Total Revenue (Sale)" value={pnl.revenue} tone="plain" />
          <PnlRow label="− Cost of Goods (Maal ka cost)" value={-pnl.cogs} tone="minus" />
          <PnlRow label="= Gross Profit (Chhala maal kamane wala)" value={pnl.grossProfit} tone="sub" isProfit />
          <PnlRow label="− Total Kharcha (Expenses)" value={-pnl.totalExpenses} tone="minus" />
          <PnlRow label="= NET PROFIT (Asli munafa)" value={pnl.netProfit} tone="total" isProfit />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="bg-slate-50 rounded-2xl p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margin %</p>
            <p className="text-xl font-bold text-emerald-900 mt-1">{pnl.marginPct}%</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Returns Asar</p>
            <p className={cn("text-xl font-bold mt-1", pnl.returnsImpact < 0 ? "text-red-500" : "text-emerald-900")}>
              {Math.round(pnl.returnsImpact).toLocaleString()}
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sales Entries</p>
            <p className="text-xl font-bold text-emerald-900 mt-1">{pnl.salesCount}</p>
          </div>
        </div>
      </section>

      {/* ── Expense Category Breakdown ── */}
      {expenseByCategory.length > 0 && (
        <section className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">Kharcha Categories — {PERIOD_LABELS[period]}</h3>
              <p className="text-xs text-slate-400">Kis cheez pe kitna gaya</p>
            </div>
          </div>
          <div className="space-y-4">
            {expenseByCategory.map(cat => (
              <RankItem key={cat.category} label={`${cat.category} (${cat.pct}%)`} value={cat.amount} total={pnl.totalExpenses} color="bg-red-500" isMoney />
            ))}
          </div>
        </section>
      )}

      {/* Monthly Profit History — LIVE gross + net (updates with new data, not frozen) */}
      <section className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-900 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-900">Monthly Profit History</h3>
            <p className="text-xs text-slate-400">Gross aur Net (kharcha minus karke) — live updated</p>
          </div>
        </div>

        {monthlyHistory.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Calendar className="w-10 h-10 text-emerald-900/10 mx-auto" />
            <p className="text-slate-400 text-sm italic">Abhi tak koi record nahi. Pehli sale/kharcha ke baad yahan aa jayega.</p>
          </div>
        ) : (
          <>
            {/* Chart — NET per month */}
            {monthlyChartData.length > 0 && (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-emerald-50)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--color-slate-400)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-slate-400)' }} />
                    <Tooltip
                      cursor={{ fill: 'var(--color-emerald-50)' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
                      formatter={(value: any) => [`Rs. ${Number(value).toLocaleString()}`, 'Net Profit']}
                    />
                    <Bar dataKey="net" radius={[8, 8, 0, 0]} maxBarSize={48}>
                      {monthlyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.net >= 0 ? 'var(--color-emerald-800)' : 'var(--color-red-300)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* List — gross + kharcha + net columns */}
            <div className="space-y-2">
              {monthlyHistory.map(m => (
                <div key={m.monthKey} className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-emerald-900 text-sm truncate">{m.label}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Gross: {formatProfit(m.gross, true)} · Kharcha: {Math.round(m.expenses).toLocaleString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-xl font-bold", m.net >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {formatProfit(m.net, true)}
                    </p>
                    <p className="text-[10px] text-slate-400">NET · PKR</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Monthly Expenses */}
      <section className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-900">Monthly Expenses</h3>
            <p className="text-xs text-slate-400">Har mahine ka kharcha</p>
          </div>
        </div>

        {monthlyExpenses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm italic">Koi expense record nahi abhi tak</p>
          </div>
        ) : (
          <div className="space-y-2">
            {monthlyExpenses.map((m) => (
              <div key={m.month} className="flex items-center justify-between p-4 bg-red-50/40 rounded-2xl border border-red-100/50">
                <p className="font-bold text-emerald-900 text-sm">{m.label}</p>
                <p className="text-lg font-bold text-red-500">-{m.total.toLocaleString()} <span className="text-xs font-normal text-slate-400">PKR</span></p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Category-wise Profit Analysis ── */}
      {categoryData.length > 0 && (
        <section className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">Category-wise Profit</h3>
              <p className="text-xs text-slate-400">Har category ka total munafa</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData.map(c => ({
                  name: c.category.length > 10 ? c.category.slice(0, 10) + '…' : c.category,
                  profit: c.profit,
                }))}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-emerald-50)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: 'var(--color-slate-500)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-slate-400)' }} />
                <Tooltip
                  cursor={{ fill: 'var(--color-purple-50)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
                  formatter={(value: any) => [`Rs. ${Number(value).toLocaleString()}`, 'Profit']}
                />
                <Bar dataKey="profit" radius={[8, 8, 0, 0]} maxBarSize={52}>
                  {categoryData.map((_, idx) => {
                    const COLORS = ['var(--color-purple-600)','var(--color-purple-500)','var(--color-purple-400)','var(--color-purple-300)','var(--color-purple-200)','var(--color-purple-100)'];
                    return <Cell key={idx} fill={COLORS[idx % COLORS.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table — TableWrapper se mobile/PC par left-right scroll */}
          <TableWrapper className="-mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-emerald-50">
                  <th className="text-left pb-3 px-2">Category</th>
                  <th className="text-right pb-3 px-2">Units Sold</th>
                  <th className="text-right pb-3 px-2">Revenue</th>
                  <th className="text-right pb-3 px-2">Profit</th>
                  <th className="text-right pb-3 px-2">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50/50">
                {categoryData.map((row, i) => (
                  <tr key={row.category} className="hover:bg-violet-50/30 transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          i === 0 ? "bg-violet-600" : i === 1 ? "bg-violet-500" : i === 2 ? "bg-violet-400" : "bg-violet-300"
                        )} />
                        <span className="font-bold text-emerald-900">{row.category}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-slate-600 font-medium">{row.units}</td>
                    <td className="py-3 px-2 text-right font-bold text-slate-700">Rs {row.revenue.toLocaleString()}</td>
                    <td className={cn("py-3 px-2 text-right font-bold", row.profit >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {formatProfit(row.profit, true)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        row.margin >= 15 ? "bg-emerald-100 text-emerald-700"
                          : row.margin >= 5 ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-600"
                      )}>
                        {row.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
        </section>
      )}

      {/* Top Sellers Button */}
      <section>
        <button
          onClick={loadTopSellers}
          className="w-full glass-card p-6 rounded-3xl flex items-center justify-between group hover:shadow-xl hover:shadow-emerald-900/5 transition-all border border-transparent hover:border-yellow-100 active:scale-[0.99]"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Sales Intelligence</p>
              <h3 className="text-xl font-bold text-emerald-900">Top & Dead Stock Rankings</h3>
              <p className="text-xs text-slate-400 mt-0.5">Konsa item zada bika, konsa bilkul nahi bika</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-yellow-50 transition-colors">
            <TrendingUp className="w-5 h-5 text-emerald-900" />
          </div>
        </button>
      </section>

      {/* Financial Snapshot Chart */}
      <section className="glass-card p-8 rounded-3xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-emerald-900">Financial Snapshot</h3>
          <Info className="w-4 h-4 text-slate-400" />
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-emerald-50)" />
              {/* Angled + smaller labels so 4 long words don't overlap on mobile */}
              <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={50} tick={{ fontSize: 9, fontWeight: 600, fill: 'var(--color-slate-400)' }} />
              <Tooltip cursor={{ fill: 'var(--color-slate-50)' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }} />
              <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['var(--color-emerald-800)','var(--color-green-500)','var(--color-red-500)','var(--color-green-400)'][index] ?? 'var(--color-emerald-800)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Inventory Health */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-8 rounded-3xl space-y-6">
          <h3 className="text-lg font-bold text-emerald-900">Inventory Health</h3>
          <div className="space-y-6">
            <RankItem label="Normal Stock Items" value={stockStats.itemsByStatus.normal} total={stockStats.itemsByStatus.normal + stockStats.itemsByStatus.low + stockStats.itemsByStatus.out} color="bg-emerald-500" />
            <RankItem label="Low Stock Warnings" value={stockStats.itemsByStatus.low} total={stockStats.itemsByStatus.normal + stockStats.itemsByStatus.low + stockStats.itemsByStatus.out} color="bg-orange-500" />
            <RankItem label="Out of Stock" value={stockStats.itemsByStatus.out} total={stockStats.itemsByStatus.normal + stockStats.itemsByStatus.low + stockStats.itemsByStatus.out} color="bg-red-500" />
          </div>
        </div>

        <div className="glass-card p-8 rounded-3xl flex flex-col justify-center text-center space-y-6">
          <BarChart3 className="w-16 h-16 text-emerald-900/10 mx-auto" />
          <div>
            <p className="text-4xl font-bold text-emerald-900">{stockStats.stockCount.toLocaleString()}</p>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Unique Items in Stock</p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto italic">
            This data is generated from current stock levels and recorded financial activities in the database.
          </p>
        </div>
      </section>

      <div className="pt-4 px-2">
        <button
          onClick={() => {
            const message = 'Business Report Summary from Shop Hisab POS';
            const phone = import.meta.env.VITE_BUSINESS_WHATSAPP || window.localStorage.getItem('chaye:businessWhatsApp') || '';
            if (!phone) { showToast('Settings mein business WhatsApp number set karein', 'warning'); return; }
            window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
          }}
          className="w-full bg-[var(--color-whatsapp-green)] text-white py-6 rounded-3xl font-bold flex items-center justify-center gap-3 shadow-xl hover:bg-[var(--color-whatsapp-green-dark)] transition-all"
        >
          <Share2 className="w-6 h-6" />
          Business WhatsApp
        </button>
        <button
          onClick={() => showToast('Report generated for sharing!', 'success')}
          className="w-full mt-2 bg-[var(--color-emerald-600)] text-white py-6 rounded-3xl font-bold flex items-center justify-center gap-3 shadow-xl hover:bg-[var(--color-emerald-700)] transition-all"
        >
          <Share2 className="w-6 h-6" />
          Simple Share
        </button>
      </div>

      {/* Top Sellers Modal */}
      <AnimatePresence>
        {showTopSellers && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/30 backdrop-blur-md"
              onClick={() => setShowTopSellers(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full sm:max-w-2xl glass-card rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-emerald-900">Sales Rankings</h2>
                    <p className="text-xs text-slate-400">All-time data</p>
                  </div>
                </div>
                <button onClick={() => setShowTopSellers(false)} className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {topSellersLoading ? (
                <div className="flex-1 flex items-center justify-center py-16">
                  <div className="text-center space-y-3">
                    <Loader2 className="w-10 h-10 animate-spin text-emerald-900 mx-auto" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sales data load ho raha hai...</p>
                  </div>
                </div>
              ) : topSellersData ? (
                <div className="overflow-y-auto flex-1 space-y-8 pr-1">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-widest">Top Selling Items</h3>
                    </div>
                    {topSellersData.topSellers.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-6">Abhi koi sale record nahi hai</p>
                    ) : (
                      <div className="space-y-2">
                        {topSellersData.topSellers.map((item, idx) => {
                          const maxUnits = topSellersData.topSellers[0]?.units || 1;
                          const pct = (item.units / maxUnits) * 100;
                          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                          return (
                            <div key={item.name} className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <span className="text-base min-w-[28px]">{medal}</span>
                                  <span className="font-bold text-emerald-900 text-sm">{item.name}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-bold text-emerald-700">{item.units} units</span>
                                  <span className="text-xs text-slate-400 ml-2">{formatProfit(item.profit, true)}</span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-700"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                      <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest">Kabhi Nahi Bika (Dead Stock)</h3>
                    </div>
                    {topSellersData.deadStock.length === 0 ? (
                      <div className="text-center py-6 space-y-2">
                        <p className="text-2xl">🎉</p>
                        <p className="text-slate-400 text-sm">Sab items bik gaye hain! Great job!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {topSellersData.deadStock.map((item) => (
                          <div key={item.name} className="bg-red-50/50 rounded-2xl p-4 border border-red-100/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className="text-base">📦</span>
                              <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-red-500">{item.stock} units remaining</span>
                              <p className="text-[10px] text-slate-400">Sold: 0</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ label, value, color }: any) => (
  <div className="glass-card p-6 rounded-3xl">
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
    <p className={cn("text-3xl font-bold", color)}><NumberTicker value={typeof value === 'number' ? value : parseFloat(value) || 0} /></p>
  </div>
);

const RankItem = ({ label, value, total, color, isMoney }: any) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-emerald-900">{label}</span>
        <span className="font-bold text-slate-400">
          {isMoney ? `Rs ${Math.round(value).toLocaleString()}` : `${value} items`}
        </span>
      </div>
      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

// P&L statement row — accounting style (label, value, tone). isProfit rows '****' ho jate hain jab munafa chhupa ho.
const PnlRow = ({ label, value, tone, isProfit }: { label: string; value: number; tone: 'plain' | 'minus' | 'sub' | 'total'; isProfit?: boolean }) => {
  const { formatProfit } = useProfitVisibility();
  const isNegative = value < 0;
  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-3 rounded-2xl",
      tone === 'total' && "bg-emerald-900 text-white shadow-lg",
      tone === 'sub' && "bg-emerald-50 border border-emerald-100",
      (tone === 'plain' || tone === 'minus') && "bg-white border border-slate-100"
    )}>
      <span className={cn(
        "text-sm font-bold flex items-center gap-2",
        tone === 'total' ? "text-white" : "text-slate-600"
      )}>
        {tone === 'minus' && <ArrowDown className="w-3.5 h-3.5 text-red-400" />}
        {tone === 'sub' && <span className="text-emerald-600 font-black">=</span>}
        {tone === 'total' && <PiggyBank className="w-4 h-4" />}
        {label}
      </span>
      <span className={cn(
        "font-bold",
        tone === 'total' ? (isNegative ? "text-red-300 text-xl" : "text-white text-xl") : cn("text-lg", isNegative ? "text-red-500" : "text-emerald-900")
      )}>
        {isProfit ? formatProfit(value, true) : <>Rs {Math.round(Math.abs(value)).toLocaleString()}{isNegative ? ' −' : ''}</>}
      </span>
    </div>
  );
};
