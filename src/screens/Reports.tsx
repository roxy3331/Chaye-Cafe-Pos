import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { NavLink } from 'react-router-dom';
import { TrendingUp, BarChart3, Wallet, Info, Share2 } from 'lucide-react';
import { cn } from '../lib/utils';

const DATA = [
  { name: 'JAN', profit: 4000, expenses: 2400 },
  { name: 'FEB', profit: 3000, expenses: 1398 },
  { name: 'MAR', profit: 2000, expenses: 9800 },
  { name: 'APR', profit: 2780, expenses: 3908 },
  { name: 'MAY', profit: 1890, expenses: 4800 },
  { name: 'JUN', profit: 2390, expenses: 3800 },
];

export const Reports: React.FC = () => {
  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700">
      <header className="space-y-6">
        <h1 className="text-4xl font-bold text-emerald-900">Reports & Analytics</h1>
        <div className="flex bg-emerald-50 p-1 rounded-2xl w-fit">
          <button className="px-6 py-2 bg-white rounded-xl shadow-sm text-sm font-bold text-emerald-900">This Month</button>
          <button className="px-6 py-2 text-sm font-bold text-slate-500">Last Month</button>
          <button className="px-6 py-2 text-sm font-bold text-slate-500">All Time</button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3 glass-card p-8 rounded-3xl flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Net Profit</p>
            <p className="text-6xl font-bold text-emerald-500">28,610</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>
        <StatCard label="Total Sales" value="44,890" color="text-emerald-900" />
        <StatCard label="Total Expenses" value="16,280" color="text-slate-500" />
      </section>

      {/* Chart Section */}
      <section className="glass-card p-8 rounded-3xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-emerald-900">Monthly Profit Trends</h3>
          <Info className="w-4 h-4 text-slate-400" />
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }} />
              <Bar dataKey="profit" fill="#064e3b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories Analysis */}
        <div className="glass-card p-8 rounded-3xl space-y-6">
          <h3 className="text-lg font-bold text-emerald-900">Best Selling Categories</h3>
          <div className="space-y-4">
            <RankItem label="Cold Drinks" value={35} />
            <RankItem label="Cigarettes" value={28} />
            <RankItem label="Chips" value={15} />
            <RankItem label="Biscuits" value={12} />
          </div>
        </div>

        {/* Top Items Table */}
        <div className="glass-card p-8 rounded-3xl">
          <h3 className="text-lg font-bold text-emerald-900 mb-6">Top Profitable Items</h3>
          <div className="space-y-4">
            <TableItem name="Coca-Cola 500ml" units="450" margin="22%" />
            <TableItem name="Lays Classic XL" units="320" margin="18%" />
            <TableItem name="Marlboro Gold" units="1200" margin="12%" />
            <TableItem name="Dairy Milk Silk" units="180" margin="25%" />
          </div>
        </div>
      </section>

      <div className="pt-4 px-2">
        <NavLink to="/reports/share" className="w-full bg-[#25D366] text-white py-6 rounded-3xl font-bold flex items-center justify-center gap-3 shadow-xl hover:bg-[#128C7E] transition-all">
          <Share2 className="w-6 h-6" />
          WhatsApp Share Monthly Summary
        </NavLink>
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

const RankItem = ({ label, value }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span className="font-semibold text-emerald-900">{label}</span>
      <span className="font-bold text-slate-400">{value}%</span>
    </div>
    <div className="h-1.5 w-full bg-emerald-50 rounded-full">
      <div className="h-full bg-emerald-900 rounded-full" style={{ width: `${value}%` }} />
    </div>
  </div>
);

const TableItem = ({ name, units, margin }: any) => (
  <div className="flex items-center justify-between py-3 border-b border-emerald-50/50 last:border-0">
    <span className="text-sm font-semibold text-emerald-950">{name}</span>
    <div className="flex gap-8 items-baseline">
      <span className="text-xs text-slate-400">{units} units</span>
      <span className="text-sm font-bold text-emerald-500 whitespace-nowrap">{margin}</span>
    </div>
  </div>
);
