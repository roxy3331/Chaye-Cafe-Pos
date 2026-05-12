import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Search, Phone, ChevronRight, Loader2, X, Trash2, AlertCircle, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { KhataCustomer } from '../types';

export const Khata: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [customers, setCustomers] = React.useState<KhataCustomer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sortBy, setSortBy] = React.useState<'name' | 'balance'>('balance');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newPhone, setNewPhone] = React.useState('');
  const [newNote, setNewNote] = React.useState('');
  const [newPin, setNewPin] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsub = dataService.subscribeToKhataCustomers((data) => {
      setCustomers(data as KhataCustomer[]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = customers
    .filter(c => {
      const q = searchTerm.toLowerCase();
      return c.name?.toLowerCase().includes(q) || (c.phone || '').includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'balance') return (b.totalBalance || 0) - (a.totalBalance || 0);
      return (a.name || '').localeCompare(b.name || '');
    });

  const totalOutstanding = customers.reduce((acc, c) => acc + Math.max(0, c.totalBalance || 0), 0);
  const totalCustomers = customers.length;
  const customersWithBalance = customers.filter(c => (c.totalBalance || 0) > 0).length;

  const handleAddCustomer = async () => {
    if (!newName.trim()) {
      showToast('Customer ka naam zaroor likhein', 'warning');
      return;
    }
    setSaving(true);
    try {
      await dataService.addKhataCustomer({
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
        note: newNote.trim() || undefined,
        pin: newPin.trim() || undefined,
      });
      showToast(`${newName} ka khata khul gaya! ✅`, 'success');
      setShowAddModal(false);
      setNewName('');
      setNewPhone('');
      setNewNote('');
      setNewPin('');
    } catch {
      showToast('Khata nahi khul saka, dobara try karein', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dataService.deleteKhataCustomer(id);
      showToast('Customer delete ho gaya', 'success');
      setDeleteConfirm(null);
    } catch {
      showToast('Delete nahi ho saka', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-700">

      {/* ── Header Cards ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Baaki */}
        <div className="md:col-span-2 relative overflow-hidden rounded-3xl p-7 bg-emerald-900 text-white">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-1">Total Udhar Baaki</p>
          <h2 className="text-5xl font-bold tracking-tighter">
            Rs {totalOutstanding.toLocaleString()}
          </h2>
          <div className="mt-5 flex items-center gap-4 text-sm font-bold opacity-70">
            <span>{totalCustomers} Customer{totalCustomers !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{customersWithBalance} pe baaki hai</span>
          </div>
        </div>
        {/* Quick tip */}
        <div className="rounded-3xl p-7 bg-white border border-emerald-100 flex flex-col justify-between">
          <BookOpen className="w-8 h-8 text-emerald-700 mb-3" />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Khata System</p>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Har customer ka udhar aur payment yahan record karein. Balance automatically update hota hai.
            </p>
          </div>
        </div>
      </section>

      {/* ── Search + Sort + Add ── */}
      <section className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Customer dhundho..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-emerald-100 bg-white text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
          />
        </div>
        <button
          onClick={() => setSortBy(s => s === 'balance' ? 'name' : 'balance')}
          title={sortBy === 'balance' ? 'Balance se sort' : 'Naam se sort'}
          className="p-3 bg-white border border-emerald-100 rounded-2xl text-slate-500 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-emerald-900 text-white rounded-2xl font-bold text-sm hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-900/20"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Naya</span>
        </button>
      </section>

      {/* Sort label */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-2 px-1">
        Sort: {sortBy === 'balance' ? 'Zyada Baaki Pehle' : 'A–Z Naam'}
      </p>

      {/* ── Customer List ── */}
      <section>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-900" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">
              {searchTerm ? 'Koi customer nahi mila' : 'Abhi tak koi customer nahi, pehla khata kholo!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((customer, i) => {
                const bal = customer.totalBalance || 0;
                const isOwed = bal > 0;
                const isClear = bal === 0;
                return (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white border border-emerald-50 rounded-3xl p-5 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => navigate(`/khata/${customer.id}`)}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0",
                      isOwed ? "bg-red-100 text-red-700" : isClear ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-emerald-950 text-base truncate">{customer.name}</p>
                      {customer.phone && (
                        <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </p>
                      )}
                      {customer.note && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{customer.note}</p>
                      )}
                    </div>

                    {/* Balance */}
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-lg font-bold",
                        isOwed ? "text-red-600" : isClear ? "text-emerald-600" : "text-blue-600"
                      )}>
                        Rs {Math.abs(bal).toLocaleString()}
                      </p>
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        isOwed ? "text-red-400" : isClear ? "text-emerald-400" : "text-blue-400"
                      )}>
                        {isOwed ? 'Baaki Hai' : isClear ? 'Saaf' : 'Advance'}
                      </p>
                    </div>

                    {/* Delete (owner) */}
                    {userRole === 'owner' && (
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(customer.id); }}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ── Add Customer Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/30 backdrop-blur-sm z-40"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none"
            >
              <div className="pointer-events-auto bg-white rounded-t-[32px] md:rounded-[32px] p-7 w-full md:max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-emerald-900">Naya Khata Kholo</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                      Customer Naam <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Jaise: Ali Bhai, Hassan Store..."
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      autoFocus
                      className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="03XX-XXXXXXX"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                      Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Jaise: Driver, Regular Customer..."
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                      PIN (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="4 digit PIN..."
                      value={newPin}
                      onChange={e => setNewPin(e.target.value)}
                      maxLength={6}
                      className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddCustomer}
                  disabled={saving || !newName.trim()}
                  className="w-full mt-6 py-4 bg-emerald-900 text-white rounded-2xl font-bold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Khata khul raha hai...' : 'Khata Kholo'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/30 backdrop-blur-sm z-40"
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none px-4"
            >
              <div className="pointer-events-auto bg-white rounded-3xl p-7 w-full max-w-sm shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-950">Customer Delete Karein?</p>
                    <p className="text-xs text-slate-400 font-medium">Sab transactions bhi delete ho jayenge</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3 rounded-2xl border border-emerald-100 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                  >
                    Haan, Delete Karo
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
