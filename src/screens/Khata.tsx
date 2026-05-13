import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Search, Phone, ChevronRight, Loader2, X, Trash2, AlertCircle, ArrowUpDown, Pin, PinOff, Eye, EyeOff, MessageCircle, Shield, Star, AlertTriangle, Clock } from 'lucide-react';
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
  const [pinningId, setPinningId] = React.useState<string | null>(null);
  const [showBulkModal, setShowBulkModal] = React.useState(false);
  const [bulkSelected, setBulkSelected] = React.useState<Set<string>>(new Set());
  const [newCreditLimit, setNewCreditLimit] = React.useState('');
  const [newTrustBadge, setNewTrustBadge] = React.useState<'' | 'regular' | 'reliable' | 'caution'>('');
  const [balancesHidden, setBalancesHidden] = React.useState(() => {
    try { return window.localStorage.getItem('khata:globalBalanceHidden') === 'true'; }
    catch { return false; }
  });

  const toggleBalancesHidden = () => {
    setBalancesHidden(h => {
      const next = !h;
      try { window.localStorage.setItem('khata:globalBalanceHidden', next ? 'true' : 'false'); } catch {}
      return next;
    });
  };

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
      const aPinned = !!a.pinned;
      const bPinned = !!b.pinned;
      if (aPinned !== bPinned) return bPinned ? 1 : -1;
      if (aPinned && bPinned) {
        const aTime = a.pinnedAt?.toDate?.()?.getTime?.() ?? a.pinnedAt?.toMillis?.() ?? 0;
        const bTime = b.pinnedAt?.toDate?.()?.getTime?.() ?? b.pinnedAt?.toMillis?.() ?? 0;
        if (aTime !== bTime) return bTime - aTime;
      }
      if (sortBy === 'balance') return (b.totalBalance || 0) - (a.totalBalance || 0);
      return (a.name || '').localeCompare(b.name || '');
    });

  const totalOutstanding = customers.reduce((acc, c) => acc + Math.max(0, c.totalBalance || 0), 0);
  const totalCustomers = customers.length;
  const customersWithBalance = customers.filter(c => (c.totalBalance || 0) > 0).length;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const formatWhatsAppNumber = (raw?: string | null) => {
    if (!raw) return null;
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) return null;
    if (digits.startsWith('92') && digits.length >= 11) return digits;
    if (digits.startsWith('0') && digits.length >= 10) return `92${digits.slice(1)}`;
    if (digits.length === 10 && digits.startsWith('3')) return `92${digits}`;
    return null;
  };

  const buildReminderText = (c: KhataCustomer) => {
    const bal = c.totalBalance || 0;
    const today = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
    return encodeURIComponent([
      `Assalam o Alaikum *${c.name}* Sahab,`,
      '',
      `Aap ki shop ki baaki rakam yaad dilana chahta hun:`,
      '',
      `📋 *Amount: Rs. ${Math.abs(bal).toLocaleString()}*`,
      `📅 *Date: ${today}*`,
      '',
      `Meherbani farma kar jald settlement kar lein.`,
      `Jazak Allah Khair. 🤝`,
      '',
      `_Chaye Cafe_`,
    ].join('\n'));
  };

  const handleSendBulkReminder = (customerId: string) => {
    const c = customers.find(x => x.id === customerId);
    if (!c) return;
    const number = formatWhatsAppNumber(c.phone);
    if (!number) { showToast(`${c.name} ka valid number nahi hai`, 'warning'); return; }
    window.open(`https://wa.me/${number}?text=${buildReminderText(c)}`, '_blank');
  };

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
        ...(newCreditLimit ? { creditLimit: parseFloat(newCreditLimit) } : {}),
        ...(newTrustBadge ? { trustBadge: newTrustBadge } : {}),
      });
      showToast(`${newName} ka khata khul gaya! ✅`, 'success');
      setShowAddModal(false);
      setNewName(''); setNewPhone(''); setNewNote(''); setNewPin('');
      setNewCreditLimit(''); setNewTrustBadge('');
    } catch {
      showToast('Khata nahi khul saka, dobara try karein', 'error');
    } finally {
      setSaving(false);
    }
  };

  const trustBadgeConfig = {
    regular:  { label: 'Regular',  icon: Star,          color: 'bg-blue-100 text-blue-700' },
    reliable: { label: 'Reliable', icon: Shield,        color: 'bg-emerald-100 text-emerald-700' },
    caution:  { label: 'Caution',  icon: AlertTriangle, color: 'bg-orange-100 text-orange-700' },
  } as const;

  const handleTogglePin = async (customer: KhataCustomer) => {
    if (!customer.id) return;
    try {
      setPinningId(customer.id);
      await dataService.setKhataCustomerPinned(customer.id, !customer.pinned);
      showToast(!customer.pinned ? 'Pinned to top ✅' : 'Unpinned ✅', 'success');
    } catch {
      showToast('Pin update nahi ho saka', 'error');
    } finally {
      setPinningId(null);
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
            {balancesHidden ? 'Rs ••••••' : `Rs ${totalOutstanding.toLocaleString()}`}
          </h2>
          <div className="mt-5 flex items-center gap-4 text-sm font-bold opacity-70">
            <span>{totalCustomers} Customer{totalCustomers !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{customersWithBalance} pe baaki hai</span>
          </div>
        </div>
        {/* Monthly Summary */}
        <div className="rounded-3xl p-6 bg-white border border-emerald-100 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Is Mahine Ka Hisab</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-500">Naya Udhar</span>
              <span className="text-red-600">— Rs {balancesHidden ? '••••' : customers.reduce((a, c) => a + Math.max(0, c.totalBalance || 0), 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-500">Limit Cross</span>
              <span className="text-orange-600">{customers.filter(c => c.creditLimit && (c.totalBalance || 0) > c.creditLimit).length} customers</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-500">Inactive (30d)</span>
              <span className="text-slate-400">{customers.filter(c => {
                if (!c.lastTransactionAt) return (c.totalBalance || 0) > 0;
                const d = c.lastTransactionAt?.toDate?.() ?? new Date(c.lastTransactionAt);
                return d < thirtyDaysAgo && (c.totalBalance || 0) > 0;
              }).length} customers</span>
            </div>
          </div>
          <button
            onClick={() => { setBulkSelected(new Set(customers.filter(c => (c.totalBalance || 0) > 0 && c.phone).map(c => c.id))); setShowBulkModal(true); }}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-900 text-white rounded-2xl text-xs font-bold hover:bg-emerald-800 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Bulk WA Reminder
          </button>
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
          onClick={toggleBalancesHidden}
          title={balancesHidden ? 'Balance dikhao' : 'Balance chhupao'}
          className="p-3 bg-white border border-emerald-100 rounded-2xl text-slate-500 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
        >
          {balancesHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-emerald-950 text-base truncate">{customer.name}</p>
                        {customer.trustBadge && (() => {
                          const cfg = trustBadgeConfig[customer.trustBadge];
                          const Icon = cfg.icon;
                          return <span className={cn('flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide', cfg.color)}><Icon className="w-2.5 h-2.5" />{cfg.label}</span>;
                        })()}
                        {(() => {
                          const isInactive = customer.lastTransactionAt
                            ? (customer.lastTransactionAt?.toDate?.() ?? new Date(customer.lastTransactionAt)) < thirtyDaysAgo
                            : (customer.totalBalance || 0) > 0;
                          return isInactive && (customer.totalBalance || 0) > 0
                            ? <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500"><Clock className="w-2.5 h-2.5" />Inactive</span>
                            : null;
                        })()}
                      </div>
                      {customer.pinned && (
                        <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-[0.3em]">PINNED</p>
                      )}
                      {customer.phone && (
                        <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </p>
                      )}
                      {customer.note && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{customer.note}</p>
                      )}
                      {customer.creditLimit ? (
                        <div className="mt-1">
                          <div className="flex items-center gap-1">
                            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all', (customer.totalBalance || 0) >= customer.creditLimit ? 'bg-red-500' : 'bg-emerald-500')}
                                style={{ width: `${Math.min(100, ((customer.totalBalance || 0) / customer.creditLimit) * 100)}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400">{Math.round(((customer.totalBalance || 0) / customer.creditLimit) * 100)}%</span>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Balance */}
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-lg font-bold",
                        isOwed ? "text-red-600" : isClear ? "text-emerald-600" : "text-blue-600"
                      )}>
                        {balancesHidden ? '••••' : `Rs ${Math.abs(bal).toLocaleString()}`}
                      </p>
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        isOwed ? "text-red-400" : isClear ? "text-emerald-400" : "text-blue-400"
                      )}>
                        {balancesHidden ? '—' : (isOwed ? 'Baaki Hai' : isClear ? 'Saaf' : 'Advance')}
                      </p>
                    </div>

                    {/* Owner actions */}
                    {userRole === 'owner' && (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={e => { e.stopPropagation(); handleTogglePin(customer); }}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            "md:opacity-0 md:group-hover:opacity-100",
                            customer.pinned ? 'bg-emerald-50 text-emerald-700' : 'text-slate-300 hover:bg-emerald-50 hover:text-emerald-700'
                          )}
                          title={customer.pinned ? 'Unpin' : 'Pin to top'}
                          disabled={pinningId === customer.id}
                        >
                          {customer.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteConfirm(customer.id); }}
                          className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 ml-1" />
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
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Customer Naam <span className="text-red-400">*</span></label>
                    <input type="text" placeholder="Jaise: Ali Bhai, Hassan Store..." value={newName} onChange={e => setNewName(e.target.value)} autoFocus
                      className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Phone Number (Optional)</label>
                    <input type="tel" placeholder="03XX-XXXXXXX" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Credit Limit (Rs)</label>
                      <input type="number" placeholder="0 = no limit" value={newCreditLimit} onChange={e => setNewCreditLimit(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Trust Badge</label>
                      <select value={newTrustBadge} onChange={e => setNewTrustBadge(e.target.value as any)}
                        className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/20 bg-white">
                        <option value="">None</option>
                        <option value="regular">⭐ Regular</option>
                        <option value="reliable">🛡️ Reliable</option>
                        <option value="caution">⚠️ Caution</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Note (Optional)</label>
                    <input type="text" placeholder="Jaise: Driver, Regular Customer..." value={newNote} onChange={e => setNewNote(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">PIN (Optional)</label>
                    <input type="password" placeholder="4 digit PIN..." value={newPin} onChange={e => setNewPin(e.target.value)} maxLength={6}
                      className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20" />
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

      {/* ── Bulk WhatsApp Modal ── */}
      <AnimatePresence>
        {showBulkModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/30 backdrop-blur-sm z-40" onClick={() => setShowBulkModal(false)} />
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none">
              <div className="pointer-events-auto bg-white rounded-t-[32px] md:rounded-[32px] p-6 w-full md:max-w-md shadow-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-900">Bulk WhatsApp Reminder</h3>
                    <p className="text-xs text-slate-400 font-medium">{bulkSelected.size} customers selected</p>
                  </div>
                  <button onClick={() => setShowBulkModal(false)} className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setBulkSelected(new Set(customers.filter(c => (c.totalBalance || 0) > 0 && c.phone).map(c => c.id)))}
                    className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100">Select All</button>
                  <button onClick={() => setBulkSelected(new Set())}
                    className="flex-1 py-2 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100">Clear</button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-2 mb-4">
                  {customers.filter(c => (c.totalBalance || 0) > 0).map(c => (
                    <div key={c.id} onClick={() => setBulkSelected(prev => { const s = new Set(prev); s.has(c.id) ? s.delete(c.id) : s.add(c.id); return s; })}
                      className={cn('flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors', bulkSelected.has(c.id) ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-transparent')}>
                      <div className={cn('w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0', bulkSelected.has(c.id) ? 'bg-emerald-700 border-emerald-700' : 'border-slate-300')}>
                        {bulkSelected.has(c.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-emerald-950 truncate">{c.name}</p>
                        {c.phone ? <p className="text-xs text-slate-400">{c.phone}</p> : <p className="text-xs text-red-400 font-medium">No phone</p>}
                      </div>
                      <p className="text-sm font-bold text-red-600 shrink-0">Rs {(c.totalBalance || 0).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const toSend = [...bulkSelected];
                    if (toSend.length === 0) { showToast('Koi customer select nahi', 'warning'); return; }
                    let sent = 0;
                    toSend.forEach((id, i) => setTimeout(() => { handleSendBulkReminder(id); sent++; if (sent === toSend.length) showToast(`${sent} reminders bheje gaye ✅`, 'success'); }, i * 800));
                    setShowBulkModal(false);
                  }}
                  disabled={bulkSelected.size === 0}
                  className="w-full py-3.5 bg-emerald-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-800 transition-colors disabled:opacity-50"
                >
                  <MessageCircle className="w-4 h-4" />
                  Send {bulkSelected.size} Reminders
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
