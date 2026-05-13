import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Plus, Filter, Search, Receipt, Home, Zap, BadgeHelp, Fuel, MoreHorizontal, Save, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';

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
  const [expenses, setExpenses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetch = async () => {
      const data = await dataService.getExpenses();
      setExpenses(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const totalAmount = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass-card p-8 rounded-[32px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-900/5 rounded-full blur-3xl" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">Total Expenses Recorded</span>
          <h2 className="text-6xl font-bold text-emerald-900 tracking-tighter">{totalAmount.toLocaleString()}</h2>
          <div className="mt-8 flex items-center gap-2 text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold">Live database summary</span>
          </div>
        </div>
        <div className="bg-emerald-900 rounded-[32px] p-8 text-white shadow-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-white/50 uppercase mb-2">Operational Tip</span>
          <h2 className="text-4xl font-bold">Review Monthly</h2>
          <p className="mt-4 text-xs text-white/60">Keep check of electricity units and fuel costs to minimize overheads.</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-2xl font-bold text-emerald-900">Recent Expenses</h3>
        </div>
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-900" /></div>
          ) : expenses.length > 0 ? expenses.map((expense) => (
            <div key={expense.id} className="glass-card group hover:shadow-xl transition-all rounded-[32px] p-6 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-900">
                  <Icon cat={expense.category} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950">{expense.category}</h4>
                  <p className="text-sm text-slate-400">
                    {expense.title} {expense.description ? `• ${expense.description}` : ''}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-900">{(expense.amount || 0).toFixed(2)}</p>
            </div>
          )) : (
            <p className="text-slate-400 italic text-center py-20">No expenses recorded yet.</p>
          )}
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
  const { showToast } = useToast();
  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState('Rent');
  const [title, setTitle] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSave = async () => {
    if (!amount || !title) {
      showToast('Please fill amount and title', 'warning');
      return;
    }
    setLoading(true);
    try {
      await dataService.addExpense({
        amount: parseFloat(amount),
        category,
        title
      });
      showToast('Expense saved!', 'success');
      navigate('/expenses');
    } catch (e) {
      showToast('Failed to save expense', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 min-h-[80vh]">
      <div className="glass-card rounded-[32px] p-8 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Title</label>
          <input 
            type="text" 
            placeholder="e.g. Electricity Bill May" 
            className="w-full bg-emerald-50/30 border-none rounded-2xl py-4 px-6 text-emerald-900 font-bold outline-none focus:ring-2 focus:ring-emerald-900/20"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Amount</label>
          <input 
            type="number" 
            placeholder="0.00" 
            className="w-full bg-emerald-50/30 border-none rounded-2xl py-6 px-6 text-5xl font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-900/20 transition-all outline-none" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Category</label>
          <select 
            className="w-full bg-emerald-50/30 border-none rounded-2xl py-4 px-6 text-emerald-900 font-bold outline-none focus:ring-2 focus:ring-emerald-900/20"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Rent</option>
            <option>Electricity</option>
            <option>Salary</option>
            <option>Transport</option>
            <option>Others</option>
          </select>
        </div>
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="w-full bg-emerald-900 text-white py-6 rounded-2xl font-bold text-xl active:scale-95 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Expense'}
        </button>
      </div>
    </div>
  );
};

