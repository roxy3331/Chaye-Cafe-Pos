import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Plus, Filter, Search, Receipt, Home, Zap, BadgeHelp, Fuel, MoreHorizontal, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Expense } from '../types';

const MOCK_EXPENSES: Expense[] = [
  { id: '1', category: 'Rent', amount: 1240.50, date: 'May 15, 2024', note: 'Payment for main block' },
  { id: '2', category: 'Electricity', amount: 4000.00, date: 'May 12, 2024', note: 'Q1 adjustment included' },
  { id: '3', category: 'Salary', amount: 539.50, date: 'May 10, 2024', note: '4 Full-time employees' },
  { id: '4', category: 'Transport', amount: 539.50, date: 'May 08, 2024', note: 'Weekly fuel refill' }
];

const Icon = ({ cat }: { cat: string }) => {
  switch(cat) {
    case 'Rent': return <Home className="w-5 h-5" />;
    case 'Electricity': return <Zap className="w-5 h-5" />;
    case 'Salary': return <BadgeHelp className="w-5 h-5" />;
    case 'Transport': return <Fuel className="w-5 h-5" />;
    default: return <Receipt className="w-5 h-5" />;
  }
};

export const Expenses: React.FC = () => {
  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass-card p-8 rounded-[32px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-900/5 rounded-full blur-3xl" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">Total Monthly Expenses</span>
          <h2 className="text-6xl font-bold text-emerald-900 tracking-tighter">14,280.00</h2>
          <div className="mt-8 flex items-center gap-2 text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold">2.4% decrease from last month</span>
          </div>
        </div>
        <div className="bg-emerald-900 rounded-[32px] p-8 text-white shadow-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-white/50 uppercase mb-2">Net Profit Impact</span>
          <h2 className="text-4xl font-bold">-12.5%</h2>
          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-4">
            <motion.div initial={{ width: 0 }} animate={{ width: '12.5%' }} className="bg-white h-full" />
          </div>
          <p className="mt-4 text-xs text-white/60">Operating costs are within the sustainable threshold.</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-2xl font-bold text-emerald-900">Recent Expenses</h3>
          <div className="flex gap-2">
            <button className="p-3 bg-white border border-emerald-50 rounded-2xl text-slate-400"><Search className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="space-y-4">
          {MOCK_EXPENSES.map((expense) => (
            <div key={expense.id} className="glass-card group hover:shadow-xl transition-all rounded-[32px] p-6 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-900">
                  <Icon cat={expense.category} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950">{expense.category}</h4>
                  <p className="text-sm text-slate-400">{expense.date} • {expense.note}</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-900">{expense.amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </section>

      <NavLink to="/expenses/add" className="fixed bottom-28 right-8 w-16 h-16 bg-emerald-900 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
        <Plus className="w-8 h-8" />
      </NavLink>
    </div>
  );
};

export const AddExpense: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 min-h-[80vh]">
      <div className="glass-card rounded-[32px] p-8 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Amount</label>
          <input type="number" placeholder="0.00" className="w-full bg-emerald-50/30 border-none rounded-2xl py-6 px-6 text-5xl font-bold text-emerald-900 focus:ring-4 focus:ring-emerald-900/5 transition-all outline-none" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Category</label>
          <select className="w-full bg-emerald-50/30 border-none rounded-2xl py-4 px-6 text-emerald-900 font-bold outline-none">
            <option>Rent</option><option>Electricity</option><option>Salary</option>
          </select>
        </div>
        <button onClick={() => navigate('/expenses')} className="w-full bg-emerald-900 text-white py-6 rounded-2xl font-bold text-xl active:scale-95 transition-all shadow-xl shadow-emerald-900/20">
          Save Expense
        </button>
      </div>
    </div>
  );
};
