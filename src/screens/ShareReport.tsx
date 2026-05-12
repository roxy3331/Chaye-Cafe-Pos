import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, TrendingUp, ListTodo, Wallet, Info, Send, CheckCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const ShareReport: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-6 min-h-screen">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-emerald-50 z-[70] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-emerald-900"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold text-emerald-900">Share Report</h1>
        </div>
        <MoreVertical className="w-5 h-5 text-emerald-700" />
      </header>

      <div className="pt-8 space-y-8">
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message Preview</p>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">DRAFT</span>
          </div>
          
          {/* Mock WhatsApp Bubble */}
          <div className="bg-[var(--color-whatsapp-bg)] p-6 rounded-3xl relative overflow-hidden shadow-inner min-h-[280px]">
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_2px_2px,black_1px,transparent_0)] bg-[size:20px_20px]" />
            <div className="relative z-10 max-w-[85%] bg-white p-4 rounded-2xl rounded-tl-none shadow-sm">
              <div className="space-y-2">
                <p className="text-sm font-bold text-emerald-800">SHOP HISAB - Daily Inventory Summary</p>
                <p className="text-[10px] text-slate-400 border-b border-emerald-50 pb-2">October 24, 2023</p>
                <div className="grid grid-cols-2 gap-y-2 text-xs font-medium pt-2">
                  <span className="text-slate-400 font-normal">Shop Name</span><span className="text-right text-emerald-950">Urban Boutique</span>
                  <span className="text-slate-400 font-normal">Sales</span><span className="text-right text-emerald-950">45,200</span>
                  <span className="text-slate-400 font-normal">Expenses</span><span className="text-right text-emerald-950">12,400</span>
                  <div className="col-span-2 border-t border-dashed border-emerald-100 my-1" />
                  <span className="text-emerald-900 font-bold">Net Profit</span><span className="text-right text-emerald-500 font-bold">32,800</span>
                </div>
                <div className="flex justify-end items-center gap-1 pt-1 opacity-40">
                  <span className="text-[8px]">10:42 AM</span>
                  <CheckCheck className="w-3 h-3 text-sky-500" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Select Metrics</p>
          <div className="space-y-3">
            <ToggleCard icon={<TrendingUp />} label="Include Profit" desc="Show net earning summary" checked />
            <ToggleCard icon={<ListTodo />} label="Item Breakdown" desc="Individual product sales" />
            <ToggleCard icon={<Wallet />} label="Expense Detail" desc="List major spending" checked />
          </div>
        </section>

        <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 flex gap-4">
          <Info className="w-6 h-6 text-emerald-900 flex-shrink-0" />
          <p className="text-xs font-medium text-emerald-800 leading-relaxed">
            The report will be sent as a plain text message for maximum compatibility with all devices and networks.
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-emerald-50 z-[80]">
        <button className="w-full bg-[var(--color-whatsapp-green)] text-white py-6 rounded-[24px] font-bold text-lg flex items-center justify-center gap-3 shadow-2xl shadow-emerald-900/20 active:scale-95 transition-all">
          <Send className="w-6 h-6" />
          Share to WhatsApp
        </button>
      </div>
    </div>
  );
};

const ToggleCard = ({ icon, label, desc, checked }: any) => (
  <div className="glass-card p-6 rounded-3xl flex items-center justify-between border-transparent transition-all hover:bg-white shadow-sm">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-900">
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      </div>
      <div>
        <p className="font-bold text-emerald-950 leading-tight">{label}</p>
        <p className="text-xs text-slate-400 font-medium">{desc}</p>
      </div>
    </div>
    <div className={cn("w-12 h-7 rounded-full p-1 transition-all", checked ? "bg-emerald-900" : "bg-slate-200")}>
      <div className={cn("w-5 h-5 bg-white rounded-full shadow-sm transition-all", checked ? "translate-x-5" : "translate-x-0")} />
    </div>
  </div>
);
