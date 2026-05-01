import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, BarChart3, Wallet, Info, Share2, Loader2, Trophy, TrendingDown, X, Medal } from 'lucide-react';
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

  const [stats, setStats] = React.useState({
    totalAssets: 0,
    totalExpenses: 0,
    stockCount: 0,
    potentialProfit: 0,
    actualProfit: 0,
    itemsByStatus: { low: 0, normal: 0, out: 0 }
  });

  React.useEffect(() => {
    let unsubscribeSales: () => void;

    const fetch = async () => {
      setLoading(true);
      try {
        const stockItems = await new Promise<any[]>((resolve) => {
          const unsub = dataService.subscribeToStock((data) => {
            unsub();
            resolve(data);
          });
        });

        const expenses = await dataService.getExpenses();

        // averageBuy & currentSell are PER BOX/PKT — must divide stock by pcsPerPack first
        const totalAssets = stockItems.reduce((acc, item) => {
          const boxes = (item.stock || 0) / (item.pcsPerPack || 1);
          return acc + (boxes * (item.averageBuy || 0));
        }, 0);
        const potentialProfit = stockItems.reduce((acc, item) => {
          const boxes = (item.stock || 0) / (item.pcsPerPack || 1);
          return acc + (boxes * ((item.currentSell || 0) - (item.averageBuy || 0)));
        }, 0);
        // stockCount = total boxes in shop (same unit as Active Stock screen)
        const stockCount = stockItems.reduce((acc, item) => acc + Math.floor((item.stock || 0) / (item.pcsPerPack || 1)), 0);

        const totalExpenses = (expenses || []).reduce((acc, exp: any) => acc + (exp.amount || 0), 0);

        unsubscribeSales = dataService.subscribeToSales((sales) => {
          const earned = sales.reduce((acc, s) => acc + (s.profit || 0), 0);
          setStats({
            totalAssets,
            totalExpenses,
            stockCount,
            potentialProfit,
            actualProfit: earned,
            itemsByStatus: {
              // Low = less than 1 full box remaining (same logic as Stock.tsx)
              low: stockItems.filter(i => i.stock > 0 && i.stock < (i.pcsPerPack || 1)).length,
              normal: stockItems.filter(i => i.stock >= (i.pcsPerPack || 1)).length,
              out: stockItems.filter(i => i.stock === 0).length
            }
          });
          setLoading(false);
        });
      } catch (e) {
        setLoading(false);
      }
    };
    fetch();
    return () => unsubscribeSales?.();
  }, []);

  const loadTopSellers = async () => {
    setShowTopSellers(true);
    if (topSellersData) return; // already loaded
    setTopSellersLoading(true);
    try {
      // Get all sales
      const salesRaw = await new Promise<any[]>((resolve) => {
        const unsub = dataService.subscribeToSales((data) => {
          unsub();
          resolve(data);
        });
      });

      // Get all stock items
      const stockItems = await new Promise<any[]>((resolve) => {
        const unsub = dataService.subscribeToStock((data) => {
          unsub();
          resolve(data);
        });
      });

      // Aggregate sales by item
      const salesMap: Record<string, { units: number; profit: number }> = {};
      for (const s of salesRaw) {
        const name = s.itemName || 'Unknown';
        if (!salesMap[name]) salesMap[name] = { units: 0, profit: 0 };
        salesMap[name].units += s.units || 0;
        salesMap[name].profit += s.profit || 0;
      }

      // Top sellers — sorted by units sold desc
      const topSellers = Object.entries(salesMap)
        .map(([name, d]) => ({ name, units: d.units, profit: d.profit }))
        .sort((a, b) => b.units - a.units)
        .slice(0, 15);

      // Dead stock — items in stock but never sold
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
        <div className="flex bg-emerald-50 p-1 rounded-2xl w-fit">
          <button className="px-6 py-2 bg-white rounded-xl shadow-sm text-sm font-bold text-emerald-900">Current View</button>
        </div>
      </header>

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
        <StatCard label="Total Expenses Paid" value={stats.totalExpenses.toLocaleString()} color="text-red-500" />
      </section>

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

      <section className="glass-card p-8 rounded-3xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-emerald-900">Financial Snapshot</h3>
          <Info className="w-4 h-4 text-slate-400" />
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }} />
              <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                {chartData.map((entry, index) => (
                  // Assets=dark-green, Actual Profit=bright-green, Expenses=red, Profit Est=teal
                  <Cell key={`cell-${index}`} fill={['#064e3b','#10b981','#ef4444','#34d399'][index] ?? '#064e3b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

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
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Total Boxes/Pkts in POS</p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto italic">
            This data is generated from current stock levels and recorded financial activities in the database.
          </p>
        </div>
      </section>

      <div className="pt-4 px-2">
        <button
          onClick={() => showToast('Report generated for sharing!', 'success')}
          className="w-full bg-[#25D366] text-white py-6 rounded-3xl font-bold flex items-center justify-center gap-3 shadow-xl hover:bg-[#128C7E] transition-all"
        >
          <Share2 className="w-6 h-6" />
          WhatsApp Share Summary
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
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="relative w-full sm:max-w-2xl glass-card rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
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
                  {/* Top Sellers */}
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

                  {/* Dead / Never Sold */}
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
