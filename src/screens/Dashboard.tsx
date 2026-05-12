import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Wallet, Package, BarChart3, PlusCircle, ShoppingCart, Receipt, Trophy, Clock, BookOpen, CalendarClock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';

export const Dashboard: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({
    todayActualProfit: 0,
    monthActualProfit: 0,
    totalInvested: 0,
    lifetimeActualProfit: 0,
  });

  const [loading, setLoading] = React.useState(true);
  const [restockItems, setRestockItems] = React.useState<any[]>([]);
  const [slowItems, setSlowItems] = React.useState<any[]>([]); // 7 days no sale
  const [topItemsData, setTopItemsData] = React.useState<{ name: string; units: number; profit: number }[]>([]);
  const [khataStats, setKhataStats] = React.useState({ totalOutstanding: 0, customersCount: 0 });
  const [expiryItems, setExpiryItems] = React.useState<any[]>([]);

  const stockItemsRef = React.useRef<any[]>([]);

  React.useEffect(() => {
    const unsubscribeStock = dataService.subscribeToStock((items) => {
      stockItemsRef.current = items;
      const outOfStock = items.filter(item => item.stock === 0);
      setRestockItems(outOfStock);
      const invested = items.reduce((acc, item) => acc + (((item.stock || 0) / (item.pcsPerPack || 1)) * (item.averageBuy || 0)), 0);
      setStats(prev => ({ ...prev, totalInvested: invested }));

      // Expiry: items that are expired or expiring within 7 days
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const expiring = items
        .filter(item => item.expiryDate && item.stock > 0)
        .map(item => {
          const exp = new Date(item.expiryDate); exp.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return { ...item, diffDays };
        })
        .filter(item => item.diffDays <= 7)
        .sort((a, b) => a.diffDays - b.diffDays);
      setExpiryItems(expiring);

      setLoading(false);
    });

    const unsubscribeSales = dataService.subscribeToSales((sales) => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); sevenDaysAgo.setHours(0, 0, 0, 0);

      let todayP = 0, monthP = 0, lifetimeP = 0;
      const itemMap: Record<string, { units: number; profit: number }> = {};
      const soldLast7Days = new Set<string>();

      sales.forEach(sale => {
        const saleDate = sale.date?.toDate?.();
        if (!saleDate) return;
        if (saleDate >= todayStart) todayP += (sale.profit || 0);
        if (saleDate >= monthStart) monthP += (sale.profit || 0);
        lifetimeP += (sale.profit || 0);

        const name = sale.itemName || 'Unknown';
        if (!itemMap[name]) itemMap[name] = { units: 0, profit: 0 };
        itemMap[name].units += (sale.units || 0);
        itemMap[name].profit += (sale.profit || 0);

        // Track items sold in last 7 days
        if (saleDate >= sevenDaysAgo) soldLast7Days.add(name);
      });

      // Items in stock but not sold in last 7 days
      const slow = (stockItemsRef.current || [])
        .filter(item => (item.stock || 0) > 0 && !soldLast7Days.has(item.name))
        .slice(0, 5);
      setSlowItems(slow);

      const top5 = Object.entries(itemMap)
        .map(([name, d]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, units: d.units, profit: d.profit }))
        .sort((a, b) => b.units - a.units)
        .slice(0, 5);

      setTopItemsData(top5);
      setStats(prev => ({
        ...prev,
        todayActualProfit: todayP,
        monthActualProfit: monthP,
        lifetimeActualProfit: lifetimeP
      }));
    });

    // Khata outstanding
    const unsubKhata = dataService.subscribeToKhataCustomers((customers) => {
      const totalOutstanding = customers.reduce((acc: number, c: any) => acc + Math.max(0, c.totalBalance || 0), 0);
      const customersCount = customers.filter((c: any) => (c.totalBalance || 0) > 0).length;
      setKhataStats({ totalOutstanding, customersCount });
    });

    return () => {
      unsubscribeStock();
      unsubscribeSales();
      unsubKhata();
    };
  }, []);

  const BAR_COLORS = ['var(--color-emerald-800)', 'var(--color-emerald-700)', 'var(--color-emerald-600)', 'var(--color-green-400)', 'var(--color-green-500)'];

  return (
    <div className="space-y-5 animate-in fade-in duration-700 pb-4">
      {/* Hero Welcome — compact */}
      <section>
        <div className="relative overflow-hidden rounded-2xl p-5 md:p-8 bg-emerald-900 text-white">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-80 mb-1">OPERATIONAL OVERVIEW</p>
              <h1 className="text-2xl md:text-4xl font-bold mb-1">Welcome Back, Partner</h1>
              <p className="text-sm md:text-base opacity-80 max-w-md">
                {userRole === 'owner'
                  ? "Track inventory, investments, and profit real-time."
                  : "Keep inventory updated and manage stock accurately."
                }
              </p>
            </div>
            <button
              onClick={() => navigate('/purchase')}
              className="bg-white text-emerald-900 px-5 py-3 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-transform shadow-xl shadow-emerald-950/20 w-fit"
            >
              <PlusCircle className="w-5 h-5" />
              Quick Entry
            </button>
          </div>
          <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none">
            <Package className="w-[160px] h-[160px]" />
          </div>
        </div>
      </section>

      {/* Stats Grid - 2x2 on mobile, 4 cols on desktop */}
      {userRole === 'owner' && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Aaj Ka Profit"
            value={stats.todayActualProfit.toLocaleString()}
            footer="Actually earned"
            highlight
          />
          <StatCard
            icon={<Receipt className="w-4 h-4" />}
            label="Is Mahine Ka"
            value={stats.monthActualProfit.toLocaleString()}
            footer="Monthly profit"
            color="text-emerald-700"
          />
          <StatCard
            icon={<Wallet className="w-4 h-4" />}
            label="Invested"
            value={stats.totalInvested.toLocaleString()}
            footer="Asset value"
          />
          <StatCard
            icon={<BarChart3 className="w-4 h-4" />}
            label="Lifetime Profit"
            value={stats.lifetimeActualProfit.toLocaleString()}
            footer="All-time earned"
          />
        </section>
      )}

      {/* Khata Outstanding Card — owner only */}
      {userRole === 'owner' && khataStats.totalOutstanding > 0 && (
        <section>
          <button
            onClick={() => navigate('/khata')}
            className="w-full flex items-center gap-4 p-5 bg-red-50 border border-red-200 rounded-2xl hover:bg-red-100 transition-colors text-left"
          >
            <div className="w-11 h-11 rounded-2xl bg-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-200">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Khata — Udhar Baaki</p>
              <p className="text-2xl font-bold text-red-700 tracking-tight">Rs {khataStats.totalOutstanding.toLocaleString()}</p>
              <p className="text-xs text-red-400 font-medium">{khataStats.customersCount} customer{khataStats.customersCount !== 1 ? 's' : ''} pe milna hai</p>
            </div>
            <div className="text-red-300 text-xs font-bold uppercase tracking-wide shrink-0">Dekhein →</div>
          </button>
        </section>
      )}

      {/* Expiry Alerts — owner only, only when items exist */}
      {userRole === 'owner' && expiryItems.length > 0 && (
        <section>
          <button
            onClick={() => navigate('/stock')}
            className="w-full p-5 bg-orange-50 border border-orange-200 rounded-2xl hover:bg-orange-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-200">
                <CalendarClock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Expiry Alert</p>
                <p className="text-base font-bold text-orange-700">{expiryItems.length} item{expiryItems.length !== 1 ? 's' : ''} expiring soon / expired</p>
              </div>
              <div className="ml-auto text-orange-300 text-xs font-bold uppercase tracking-wide shrink-0">Dekhein →</div>
            </div>
            <div className="space-y-1.5">
              {expiryItems.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/70 rounded-xl">
                  <p className="text-sm font-bold text-emerald-900 truncate max-w-[55%]">{item.name}</p>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-lg",
                    item.diffDays < 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                  )}>
                    {item.diffDays < 0 ? '🔴 Expired' : `🟠 ${item.diffDays}d left`}
                  </span>
                </div>
              ))}
              {expiryItems.length > 3 && (
                <p className="text-[10px] text-orange-400 font-bold text-center pt-1">+{expiryItems.length - 3} more items</p>
              )}
            </div>
          </button>
        </section>
      )}

      {/* Top 5 Most Sold Items Chart */}
      {userRole === 'owner' && (
        <section className="glass-card rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-emerald-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Top 5 Best Selling Items
            </h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">By Units Sold</span>
          </div>
          {topItemsData.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-slate-400 text-sm italic">
              No sales data yet
            </div>
          ) : (
            <div className="h-[160px] md:h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItemsData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-emerald-50)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 700, fill: 'var(--color-slate-500)' }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-slate-400)' }} />
                  <Tooltip
                    cursor={{ fill: 'var(--color-emerald-50)' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
                    formatter={(value: any, name: string) => [
                      name === 'units' ? `${Number(value)} units` : `Rs. ${Number(value).toLocaleString()}`,
                      name === 'units' ? 'Units Sold' : 'Profit'
                    ]}
                  />
                  <Bar dataKey="units" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {topItemsData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index] ?? 'var(--color-emerald-800)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Restock Alerts — zero stock only */}
        <div className="glass-card rounded-2xl p-5 border-l-4 border-red-500">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-emerald-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-red-500" />
              Restock Needed
            </h2>
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full uppercase">
              {restockItems.length} Items Out
            </span>
          </div>
          <div className="space-y-2">
            {restockItems.length > 0 ? restockItems.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50/30 rounded-xl border border-red-50">
                <div>
                  <p className="text-sm font-bold text-emerald-900">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Last Price: {item.currentSell}</p>
                </div>
                <button
                  onClick={() => navigate('/purchase')}
                  className="bg-emerald-900 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest active:scale-95 transition-all"
                >
                  Restock
                </button>
              </div>
            )) : (
              <p className="text-slate-400 italic text-center py-6 text-sm">All items in stock! ✅</p>
            )}
          </div>
        </div>

        {/* 7 Days No Sale */}
        <div className="glass-card rounded-2xl p-5 border-l-4 border-orange-400">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-emerald-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              7 Din Se Nahi Bika
            </h2>
            <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full uppercase">
              {slowItems.length} Items
            </span>
          </div>
          <div className="space-y-2">
            {slowItems.length > 0 ? slowItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-orange-50/30 rounded-xl border border-orange-50">
                <div>
                  <p className="text-sm font-bold text-emerald-900">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {Math.floor((item.stock || 0) / (item.pcsPerPack || 1))} Box/Pkt left
                  </p>
                </div>
                <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-lg uppercase">Slow</span>
              </div>
            )) : (
              <p className="text-slate-400 italic text-center py-6 text-sm">Sab items bik rahi hain! 🎉</p>
            )}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ActionCard onClick={() => navigate('/purchase')} icon={<ShoppingCart />} title="New Purchase" desc="Vendor stock buy" />
        <ActionCard onClick={() => navigate('/stock')} icon={<Package />} title="Add Stock" desc="Update levels" />
        <ActionCard onClick={() => navigate('/opening-stock')} icon={<PlusCircle />} title="Opening Stock" desc="Initial setup" />
        {userRole === 'owner' && (
          <ActionCard onClick={() => navigate('/reports')} icon={<BarChart3 />} title="Reports" desc="P&L statements" dark />
        )}
      </section>
    </div>
  );
};

const StatCard = ({ icon, label, value, trend, footer, highlight, color }: any) => (
  <div className={cn(
    "glass-card p-4 md:p-5 rounded-2xl flex flex-col justify-between group",
    highlight && "bg-gradient-to-br from-emerald-50 to-white border-emerald-100"
  )}>
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className={cn(
          "p-1.5 rounded-xl",
          highlight ? "bg-emerald-900 text-white" : "bg-emerald-50 text-emerald-900"
        )}>
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      <h3 className={cn("text-xl md:text-2xl font-bold text-emerald-900 mt-0.5", color)}>{value}</h3>
    </div>
    <div className="mt-2 pt-2 border-t border-emerald-50/50">
      <p className="text-[10px] text-slate-400 italic">{footer}</p>
    </div>
  </div>
);

const ActionCard = ({ icon, title, desc, dark, onClick, highlight }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full glass-card p-4 rounded-2xl flex items-center gap-3 transition-all hover:translate-x-1 active:scale-95 group text-left",
      dark && "bg-emerald-900 border-none hover:bg-emerald-800"
    )}
  >
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0",
      dark ? "bg-white/10 text-white" : "bg-emerald-50 text-emerald-900"
    )}>
      {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
    </div>
    <div>
      <p className={cn("font-bold", dark ? "text-white" : "text-emerald-900")}>{title}</p>
      <p className={cn("text-xs", dark ? "text-white/60" : "text-slate-500")}>{desc}</p>
    </div>
  </button>
);
