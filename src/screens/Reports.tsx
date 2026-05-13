import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, BarChart3, Wallet, Info, Share2, Loader2, Trophy, TrendingDown, X, Calendar, Receipt, Tag } from 'lucide-react';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [showTopSellers, setShowTopSellers] = React.useState(false);
  const [topSellersLoading, setTopSellersLoading] = React.useState(false);
  const [topSellersData, setTopSellersData] = React.useState<{
    topSellers: { name: string; units: number; profit: number }[];
    deadStock: { name: string; units: number; stock: number }[];
  } | null>(null);

  const [monthlyProfits, setMonthlyProfits] = React.useState<any[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = React.useState<{ month: string; label: string; total: number }[]>([]);
  const [categoryData, setCategoryData] = React.useState<{ category: string; units: number; revenue: number; profit: number; margin: number }[]>([]);

  const [stats, setStats] = React.useState({
    totalAssets: 0,
    totalExpenses: 0,
    stockCount: 0,
    potentialProfit: 0,
    actualProfit: 0,
    thisMonthExpenses: 0,
    itemsByStatus: { low: 0, normal: 0, out: 0 }
  });

  React.useEffect(() => {
    let unsubscribeSales: () => void;
    let safetyTimer: ReturnType<typeof setTimeout>;

    const fetch = async () => {
      setLoading(true);
      safetyTimer = setTimeout(() => setLoading(false), 8000);
      try {
        const stockItems = await new Promise<any[]>((resolve) => {
          const unsub = dataService.subscribeToStock((data) => {
            unsub();
            resolve(data);
          });
        });

        const expenses = await dataService.getExpenses();

        const totalAssets = stockItems.reduce((acc, item) => {
          const boxes = (item.stock || 0) / (item.pcsPerPack || 1);
          return acc + (boxes * (item.averageBuy || 0));
        }, 0);
        const potentialProfit = stockItems.reduce((acc, item) => {
          const boxes = (item.stock || 0) / (item.pcsPerPack || 1);
          return acc + (boxes * ((item.currentSell || 0) - (item.averageBuy || 0)));
        }, 0);
        // stockCount = unique items in stock (distinct products, not total boxes)
        const stockCount = stockItems.filter(item => (item.stock || 0) > 0).length;

        const totalExpenses = (expenses || []).reduce((acc, exp: any) => acc + (exp.amount || 0), 0);

        // Monthly expenses breakdown
        const expByMonth: Record<string, { label: string; total: number }> = {};
        (expenses || []).forEach((exp: any) => {
          const d = exp.date?.toDate?.() || (exp.date ? new Date(exp.date) : null);
          if (!d) return;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          if (!expByMonth[key]) expByMonth[key] = { label, total: 0 };
          expByMonth[key].total += (exp.amount || 0);
        });
        const monthlyExpList = Object.entries(expByMonth)
          .map(([month, v]) => ({ month, label: v.label, total: v.total }))
          .sort((a, b) => b.month.localeCompare(a.month));
        setMonthlyExpenses(monthlyExpList);

        // This month's expenses
        const now = new Date();
        const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const thisMonthExp = (expByMonth[thisMonthKey]?.total) || 0;

        // Monthly profits from Firestore
        const savedMonthly = await dataService.getMonthlyProfits();
        setMonthlyProfits(savedMonthly || []);

        // Build itemName → category map from stock
        const itemCategoryMap: Record<string, string> = {};
        stockItems.forEach(item => {
          if (item.name) itemCategoryMap[item.name] = item.category || 'General';
        });

        unsubscribeSales = dataService.subscribeToSales((sales) => {
          const earned = sales.reduce((acc, s) => acc + (s.profit || 0), 0);
          setStats({
            totalAssets,
            totalExpenses,
            stockCount,
            potentialProfit,
            actualProfit: earned,
            thisMonthExpenses: thisMonthExp,
            itemsByStatus: {
              low: stockItems.filter(i => i.stock > 0 && i.stock < (i.pcsPerPack || 1)).length,
              normal: stockItems.filter(i => i.stock >= (i.pcsPerPack || 1)).length,
              out: stockItems.filter(i => i.stock === 0).length
            }
          });

          // ── Category-wise Profit ──────────────────────────────────────────
          const catMap: Record<string, { units: number; revenue: number; profit: number }> = {};
          sales.forEach(s => {
            const cat = itemCategoryMap[s.itemName] || 'General';
            if (!catMap[cat]) catMap[cat] = { units: 0, revenue: 0, profit: 0 };
            catMap[cat].units  += (s.units  || 0);
            catMap[cat].revenue += (s.units  || 0) * (s.sellPrice || 0);
            catMap[cat].profit  += (s.profit || 0);
          });
          const catList = Object.entries(catMap)
            .map(([category, d]) => ({
              category,
              units:   Math.round(d.units * 10) / 10,
              revenue: Math.round(d.revenue),
              profit:  Math.round(d.profit),
              margin:  d.revenue > 0 ? Math.round((d.profit / d.revenue) * 100 * 10) / 10 : 0,
            }))
            .sort((a, b) => b.profit - a.profit);
          setCategoryData(catList);

          setLoading(false);
        });
      } catch (e) {
        setLoading(false);
      }
    };
    fetch();
    return () => { unsubscribeSales?.(); clearTimeout(safetyTimer); };
  }, []);

  const loadTopSellers = async () => {
    setShowTopSellers(true);
    if (topSellersData) return;
    setTopSellersLoading(true);
    try {
      const salesRaw = await new Promise<any[]>((resolve) => {
        const unsub = dataService.subscribeToSales((data) => {
          unsub();
          resolve(data);
        });
      });

      const stockItems = await new Promise<any[]>((resolve) => {
        const unsub = dataService.subscribeToStock((data) => {
          unsub();
          resolve(data);
        });
      });

      const salesMap: Record<string, { units: number; profit: number }> = {};
      for (const s of salesRaw) {
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
    { name: 'Assets', value: stats.totalAssets },
    { name: 'Actual Profit', value: stats.actualProfit },
    { name: 'Expenses', value: stats.totalExpenses },
    { name: 'Profit Est.', value: stats.potentialProfit },
  ];

  // Monthly profits chart — last 6 months
  const monthlyChartData = [...monthlyProfits]
    .slice(0, 6)
    .reverse()
    .map((m: any) => ({
      month: m.label?.split(' ')[0]?.slice(0, 3) ?? m.monthKey,
      profit: m.profit || 0
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
      <header className="space-y-6">
        <h1 className="text-4xl font-bold text-emerald-900">Reports & Analytics</h1>
      </header>

      {/* Summary cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-8 rounded-3xl flex justify-between items-center bg-gradient-to-br from-emerald-900 to-emerald-800 text-white shadow-2xl">
          <div>
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Actual Earned Profit (Settled)</p>
            <p className="text-6xl font-bold">{stats.actualProfit.toLocaleString()}</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white shadow-sm backdrop-blur-md">
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>
        <div className="glass-card p-8 rounded-3xl flex justify-between items-center bg-emerald-50">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Potential Net Profit (Unsold Stock)</p>
            <p className="text-5xl font-bold text-emerald-600">+{stats.potentialProfit.toLocaleString()}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
            <BarChart3 className="w-7 h-7" />
          </div>
        </div>
        <StatCard label="Asset Valuation" value={stats.totalAssets.toLocaleString()} color="text-emerald-900" />
        <div className="glass-card p-6 rounded-3xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Expenses Paid</p>
          <p className="text-3xl font-bold text-red-500">{stats.totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">This month: <span className="font-bold text-red-400">Rs. {stats.thisMonthExpenses.toLocaleString()}</span></p>
        </div>
      </section>

      {/* Monthly Profit History */}
      <section className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-900 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-900">Monthly Profit History</h3>
            <p className="text-xs text-slate-400">Har mahine ka actual profit record</p>
          </div>
        </div>

        {monthlyProfits.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Calendar className="w-10 h-10 text-emerald-900/10 mx-auto" />
            <p className="text-slate-400 text-sm italic">Abhi tak koi monthly record nahi. Pehla record aglay mahine ke 1 tarikh ko save hoga.</p>
          </div>
        ) : (
          <>
            {/* Chart */}
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
                      formatter={(value: any) => [`Rs. ${Number(value).toLocaleString()}`, 'Profit']}
                    />
                    <Bar dataKey="profit" radius={[8, 8, 0, 0]} maxBarSize={48}>
                      {monthlyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.profit > 0 ? 'var(--color-emerald-800)' : 'var(--color-gray-100)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* List */}
            <div className="space-y-2">
              {monthlyProfits.map((m: any) => (
                <div key={m.monthKey} className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                  <div>
                    <p className="font-bold text-emerald-900 text-sm">{m.label}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{m.monthKey}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-xl font-bold", m.profit >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {m.profit >= 0 ? '+' : ''}{Math.round(m.profit).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400">PKR</p>
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

          {/* Table */}
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[480px]">
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
                      {row.profit >= 0 ? '+' : ''}{row.profit.toLocaleString()}
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
          </div>
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
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-emerald-50)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--color-slate-400)' }} />
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
            <RankItem label="Normal Stock Items" value={stats.itemsByStatus.normal} total={stats.itemsByStatus.normal + stats.itemsByStatus.low + stats.itemsByStatus.out} color="bg-emerald-500" />
            <RankItem label="Low Stock Warnings" value={stats.itemsByStatus.low} total={stats.itemsByStatus.normal + stats.itemsByStatus.low + stats.itemsByStatus.out} color="bg-orange-500" />
            <RankItem label="Out of Stock" value={stats.itemsByStatus.out} total={stats.itemsByStatus.normal + stats.itemsByStatus.low + stats.itemsByStatus.out} color="bg-red-500" />
          </div>
        </div>

        <div className="glass-card p-8 rounded-3xl flex flex-col justify-center text-center space-y-6">
          <BarChart3 className="w-16 h-16 text-emerald-900/10 mx-auto" />
          <div>
            <p className="text-4xl font-bold text-emerald-900">{stats.stockCount.toLocaleString()}</p>
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
                                  <span className="text-xs text-slate-400 ml-2">Rs. {item.profit.toFixed(0)}</span>
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
    <p className={cn("text-3xl font-bold", color)}>{value}</p>
  </div>
);

const RankItem = ({ label, value, total, color }: any) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-emerald-900">{label}</span>
        <span className="font-bold text-slate-400">{value} items</span>
      </div>
      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};
