import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Wallet, Package, BarChart3, PlusCircle, ArrowRight, ShoppingCart, Receipt } from 'lucide-react';
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
    potentialProfit: 0
  });

  const [loading, setLoading] = React.useState(true);
  const [restockItems, setRestockItems] = React.useState<any[]>([]);

  React.useEffect(() => {
    const unsubscribeStock = dataService.subscribeToStock((items) => {
      const outOfStock = items.filter(item => item.stock === 0);
      setRestockItems(outOfStock);
      
      const invested = items.reduce((acc, item) => acc + (((item.stock || 0) / (item.pcsPerPack || 1)) * (item.averageBuy || 0)), 0);
      const potential = items.reduce((acc, item) => acc + (((item.stock || 0) / (item.pcsPerPack || 1)) * ((item.currentSell || 0) - (item.averageBuy || 0))), 0);
      
      setStats(prev => ({ ...prev, totalInvested: invested, potentialProfit: potential }));
      setLoading(false);
    });

    const unsubscribeSales = dataService.subscribeToSales((sales) => {
       const todayStart = new Date();
       todayStart.setHours(0,0,0,0);
       
       const monthStart = new Date();
       monthStart.setDate(1);
       monthStart.setHours(0,0,0,0);

       let todayP = 0;
       let monthP = 0;
       let lifetimeP = 0;

       sales.forEach(sale => {
         const saleDate = sale.date?.toDate();
         if (!saleDate) return;

         if (saleDate >= todayStart) todayP += (sale.profit || 0);
         if (saleDate >= monthStart) monthP += (sale.profit || 0);
         lifetimeP += (sale.profit || 0);
       });

       setStats(prev => ({ 
         ...prev, 
         todayActualProfit: todayP, 
         monthActualProfit: monthP, 
         lifetimeActualProfit: lifetimeP 
       }));
    });

    return () => {
      unsubscribeStock();
      unsubscribeSales();
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Hero Welcome */}
      <section>
        <div className="relative overflow-hidden rounded-3xl p-8 bg-emerald-900 text-white">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-80 mb-2">OPERATIONAL OVERVIEW</p>
              <h1 className="text-4xl font-bold mb-2">Welcome Back, Partner</h1>
              <p className="text-lg opacity-90 max-w-md">
                {userRole === 'owner' 
                  ? "Track your inventory, investments, and profit real-time."
                  : "Let's keep the inventory updated and manage the stock accurately."
                }
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => navigate('/purchase')}
                className="bg-white text-emerald-900 px-6 py-4 rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-transform shadow-xl shadow-emerald-950/20"
              >
                <PlusCircle className="w-5 h-5" />
                Quick Entry
              </button>
            </div>
          </div>
          {/* Decorative background icon */}
          <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none">
            <Package className="w-[200px] h-[200px]" />
          </div>
        </div>
      </section>

      {/* Stats Grid - ONLY FOR OWNER */}
      {userRole === 'owner' && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={<TrendingUp className="w-5 h-5" />} 
            label="Aaj Ka Actual Profit" 
            value={stats.todayActualProfit.toLocaleString()} 
            footer="Jo actually aa gaya" 
            highlight
          />
          <StatCard 
            icon={<BarChart3 className="w-5 h-5" />} 
            label="Potential Profit" 
            value={stats.potentialProfit.toLocaleString()} 
            footer="Agar sab bik jaye" 
            color="text-blue-500"
          />
          <StatCard 
            icon={<Wallet className="w-5 h-5" />} 
            label="Total Invested" 
            value={stats.totalInvested.toLocaleString()} 
            footer="Asset valuation included" 
          />
          <StatCard 
            icon={<Receipt className="w-5 h-5" />} 
            label="Is Mahine Actual" 
            value={stats.monthActualProfit.toLocaleString()} 
            footer="Monthly earned profit" 
          />
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Restock Alerts */}
        <div className="glass-card rounded-3xl p-8 border-l-4 border-red-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-red-500" />
              Restock Needed
            </h2>
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full uppercase">
              {restockItems.length} Items Out
            </span>
          </div>
          <div className="space-y-3">
            {restockItems.length > 0 ? restockItems.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-red-50/30 rounded-2xl border border-red-50">
                <div>
                  <p className="text-sm font-bold text-emerald-900">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Last Price: {item.currentSell}</p>
                </div>
                <button 
                  onClick={() => navigate('/purchase')}
                  className="bg-emerald-900 text-white text-[10px] px-3 py-2 rounded-lg font-bold uppercase tracking-widest active:scale-95 transition-all"
                >
                  Restock Now
                </button>
              </div>
            )) : (
              <p className="text-slate-400 italic text-center py-8">All items are in stock!</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-emerald-900 px-2">Quick Actions</h2>
          <ActionCard 
            onClick={() => navigate('/purchase')}
            icon={<ShoppingCart />} 
            title="New Purchase" 
            desc="Record vendor stock buy" 
          />
          <ActionCard 
            onClick={() => navigate('/stock')}
            icon={<Package />} 
            title="Add Stock" 
            desc="Update current levels" 
          />
          {userRole === 'owner' && (
            <ActionCard 
              onClick={() => navigate('/opening-stock')}
              icon={<PlusCircle />} 
              title="Opening Stock" 
              desc="Initial setup (one-time)" 
              highlight
            />
          )}
          {userRole === 'owner' && (
            <ActionCard 
              onClick={() => navigate('/reports')}
              icon={<BarChart3 />} 
              title="Reports" 
              desc="Generate P&L statements" 
              dark 
            />
          )}
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ icon, label, value, trend, footer, highlight }: any) => (
  <div className={cn(
    "glass-card p-6 rounded-3xl flex flex-col justify-between group h-full",
    highlight && "bg-gradient-to-br from-emerald-50 to-white border-emerald-100"
  )}>
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "p-2 rounded-xl text-emerald-900",
          highlight ? "bg-emerald-900 text-white" : "bg-emerald-50"
        )}>
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      <h3 className="text-3xl font-bold text-emerald-900 mt-1">{value}</h3>
    </div>
    <div className="mt-4 pt-4 border-t border-emerald-50/50">
      <p className="text-xs text-slate-400 italic">{footer}</p>
    </div>
  </div>
);

const ActionCard = ({ icon, title, desc, dark, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full glass-card p-6 rounded-3xl flex items-center gap-4 transition-all hover:translate-x-1 active:scale-95 group text-left",
      dark && "bg-emerald-900 border-none hover:bg-emerald-800"
    )}
  >
    <div className={cn(
      "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
      dark ? "bg-white/10 text-white" : "bg-emerald-50 text-emerald-900"
    )}>
      {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
    </div>
    <div>
      <p className={cn("font-bold text-lg", dark ? "text-white" : "text-emerald-900")}>{title}</p>
      <p className={cn("text-sm", dark ? "text-white/60" : "text-slate-500")}>{desc}</p>
    </div>
  </button>
);

