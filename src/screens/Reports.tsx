import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { NavLink } from 'react-router-dom';
import { TrendingUp, BarChart3, Wallet, Info, Share2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';

import { useToast } from '../context/ToastContext';

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    totalAssets: 0,
    totalExpenses: 0,
    totalPurchases: 0,
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
        
        const totalAssets = stockItems.reduce((acc, item) => acc + (item.stock * item.averageBuy), 0);
        const totalExpenses = (expenses || []).reduce((acc, exp: any) => acc + (exp.amount || 0), 0);
        const potentialProfit = stockItems.reduce((acc, item) => acc + (item.stock * (item.currentSell - item.averageBuy)), 0);
        const stockCount = stockItems.reduce((acc, item) => acc + item.stock, 0);

        unsubscribeSales = dataService.subscribeToSales((sales) => {
          const earned = sales.reduce((acc, s) => acc + (s.profit || 0), 0);
          setStats(prev => ({
            ...prev,
            totalAssets,
            totalExpenses,
            totalPurchases: 0,
            stockCount,
            potentialProfit,
            actualProfit: earned,
            itemsByStatus: {
              low: stockItems.filter(i => i.stock > 0 && i.stock < 10).length,
              normal: stockItems.filter(i => i.stock >= 10).length,
              out: stockItems.filter(i => i.stock === 0).length
            }
          }));
          setLoading(false);
        });
      } catch (e) {
        setLoading(false);
      }
    };
    fetch();
    return () => unsubscribeSales?.();
  }, []);

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

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-8 rounded-3xl flex justify-between items-center bg-gradient-to-br from-emerald-900 to-emerald-800 text-white shadow-2xl">
          <div>
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Actual Earned Profit (Settle Realized)</p>
            <p className="text-6xl font-bold">{stats.actualProfit.toLocaleString()}</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white shadow-sm backdrop-blur-md">
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>
        <div className="md:col-span-3 glass-card p-8 rounded-3xl flex justify-between items-center bg-emerald-50">
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

      {/* Chart Section */}
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
                  <Cell key={`cell-${index}`} fill={index === 2 ? '#10b981' : index === 1 ? '#ef4444' : '#064e3b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Summary */}
        <div className="glass-card p-8 rounded-3xl space-y-6">
          <h3 className="text-lg font-bold text-emerald-900">Inventory Health</h3>
          <div className="space-y-6">
            <RankItem label="Normal Stock Items" value={stats.itemsByStatus.normal} total={stats.itemsByStatus.normal + stats.itemsByStatus.low + stats.itemsByStatus.out} color="bg-emerald-500" />
            <RankItem label="Low Stock Warnings" value={stats.itemsByStatus.low} total={stats.itemsByStatus.normal + stats.itemsByStatus.low + stats.itemsByStatus.out} color="bg-orange-500" />
            <RankItem label="Out of Stock" value={stats.itemsByStatus.out} total={stats.itemsByStatus.normal + stats.itemsByStatus.low + stats.itemsByStatus.out} color="bg-red-500" />
          </div>
        </div>

        {/* Global Summary */}
        <div className="glass-card p-8 rounded-3xl flex flex-col justify-center text-center space-y-6">
          <BarChart3 className="w-16 h-16 text-emerald-900/10 mx-auto" />
          <div>
            <p className="text-4xl font-bold text-emerald-900">{stats.stockCount.toLocaleString()}</p>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Total Units in POS</p>
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

