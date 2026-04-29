import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Wallet, Package, BarChart3, PlusCircle, ArrowRight, ShoppingCart, Receipt } from 'lucide-react';
import { cn } from '../lib/utils';

export const Dashboard: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
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
                  ? "Your shop performance is up by 12% compared to last week. Keep up the momentum."
                  : "Let's keep the inventory updated and manage the stock accurately."
                }
              </p>
            </div>
            <div className="flex gap-3">
              <button className="bg-white text-emerald-900 px-6 py-4 rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-transform shadow-xl shadow-emerald-950/20">
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
            label="Aaj Ka Profit" 
            value="4,250" 
            trend="+4.5%" 
            footer="Refreshed just now" 
          />
          <StatCard 
            icon={<Package className="w-5 h-5" />} 
            label="Is Mahine Profit" 
            value="82,400" 
            trend="+12.3%" 
            footer="Target: 100,000" 
          />
          <StatCard 
            icon={<Wallet className="w-5 h-5" />} 
            label="Total Invested" 
            value="3,45,000" 
            footer="Asset valuation included" 
          />
          <StatCard 
            icon={<BarChart3 className="w-5 h-5" />} 
            label="Total Profit" 
            value="12,45,000" 
            highlight 
            footer="Lifetime shop performance" 
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
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full uppercase">3 Items Out</span>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Coca Cola 250ml', lastPrice: '55.00' },
              { name: 'Lays Masala Large', lastPrice: '80.00' },
              { name: 'Sooper Biscuits Small', lastPrice: '20.00' }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-red-50/30 rounded-2xl border border-red-50">
                <div>
                  <p className="text-sm font-bold text-emerald-900">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Last Sale: {item.lastPrice}</p>
                </div>
                <button className="bg-emerald-900 text-white text-[10px] px-3 py-2 rounded-lg font-bold uppercase tracking-widest active:scale-95 transition-all">
                  Restock Now
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-emerald-900 px-2">Quick Actions</h2>
          <ActionCard icon={<ShoppingCart />} title="New Purchase" desc="Record vendor stock buy" />
          <ActionCard icon={<Package />} title="Add Stock" desc="Update current levels" />
          {userRole === 'owner' && <ActionCard icon={<BarChart3 />} title="Reports" desc="Generate P&L statements" dark />}
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

const ActionCard = ({ icon, title, desc, dark }: any) => (
  <button className={cn(
    "w-full glass-card p-6 rounded-3xl flex items-center gap-4 transition-all hover:translate-x-1 active:scale-95 group text-left",
    dark && "bg-emerald-900 border-none hover:bg-emerald-800"
  )}>
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
