import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Phone, Loader2, X, Trash2, Edit2, Save,
  AlertCircle, Share2, MessageCircle, Delete
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { KhataCustomer, KhataTransaction } from '../types';

// ─── Calculator Hook ──────────────────────────────────────────────────────────
function useCalculator() {
  const [display, setDisplay] = React.useState('0');
  const [prevValue, setPrevValue] = React.useState<number | null>(null);
  const [operator, setOperator] = React.useState<string | null>(null);
  const [waitingNext, setWaitingNext] = React.useState(false);

  const press = (btn: string) => {
    if (btn === 'AC') {
      setDisplay('0'); setPrevValue(null); setOperator(null); setWaitingNext(false);
      return;
    }
    if (btn === '⌫') {
      setDisplay(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    if (['+', '-', '×', '÷'].includes(btn)) {
      setPrevValue(parseFloat(display));
      setOperator(btn);
      setWaitingNext(true);
      return;
    }
    if (btn === '%') {
      setDisplay(prev => String(parseFloat(prev) / 100));
      return;
    }
    if (btn === '=') {
      if (prevValue !== null && operator) {
        const curr = parseFloat(display);
        let result = 0;
        if (operator === '+') result = prevValue + curr;
        if (operator === '-') result = prevValue - curr;
        if (operator === '×') result = prevValue * curr;
        if (operator === '÷') result = curr !== 0 ? prevValue / curr : 0;
        const str = Number.isInteger(result) ? String(result) : result.toFixed(2).replace(/\.?0+$/, '');
        setDisplay(str);
        setPrevValue(null); setOperator(null); setWaitingNext(false);
      }
      return;
    }
    if (btn === '.') {
      if (waitingNext) { setDisplay('0.'); setWaitingNext(false); return; }
      if (!display.includes('.')) setDisplay(prev => prev + '.');
      return;
    }
    // digit
    if (waitingNext) { setDisplay(btn); setWaitingNext(false); return; }
    setDisplay(prev => (prev === '0' ? btn : prev.length < 12 ? prev + btn : prev));
  };

  const reset = () => { setDisplay('0'); setPrevValue(null); setOperator(null); setWaitingNext(false); };
  const value = parseFloat(display) || 0;
  return { display, operator, press, reset, value };
}

// ─── Running Balance Calculator ───────────────────────────────────────────────
function computeRunningBalances(txs: KhataTransaction[], currentBalance: number): number[] {
  // txs are newest-first. Balance shown = balance AFTER that transaction.
  const balances: number[] = [];
  let running = currentBalance;
  for (const tx of txs) {
    balances.push(running);
    running -= tx.type === 'credit' ? tx.amount : -tx.amount;
  }
  return balances;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const KhataDetail: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const calc = useCalculator();

  const [customer, setCustomer] = React.useState<KhataCustomer | null>(null);
  const [transactions, setTransactions] = React.useState<KhataTransaction[]>([]);
  const [customerLoaded, setCustomerLoaded] = React.useState(false);
  const [txLoaded, setTxLoaded] = React.useState(false);

  // Modal state
  const [showTxModal, setShowTxModal] = React.useState(false);
  const [txType, setTxType] = React.useState<'credit' | 'payment'>('credit');
  const [txNote, setTxNote] = React.useState('');
  const [txSaving, setTxSaving] = React.useState(false);

  // Edit customer modal
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editPhone, setEditPhone] = React.useState('');
  const [editNote, setEditNote] = React.useState('');
  const [editPin, setEditPin] = React.useState('');
  const [showPinInput, setShowPinInput] = React.useState(false);
  const [balanceHidden, setBalanceHidden] = React.useState(false);
  const [editSaving, setEditSaving] = React.useState(false);

  // Delete confirms
  const [deleteTxConfirm, setDeleteTxConfirm] = React.useState<KhataTransaction | null>(null);

  // Bug #4 Fix: single doc subscription (not full collection)
  // Bug #5 Fix: separate loaded flags, both must be true to hide loader
  React.useEffect(() => {
    if (!customerId) return;

    const unsubCustomer = dataService.subscribeToSingleKhataCustomer(customerId, (data) => {
      setCustomer(data);
      setCustomerLoaded(true);
    });

    const unsubTx = dataService.subscribeToKhataTransactions(customerId, (data) => {
      setTransactions(data as KhataTransaction[]);
      setTxLoaded(true);
    });

    return () => { unsubCustomer(); unsubTx(); };
  }, [customerId]);

  const loading = !customerLoaded || !txLoaded;

  const openTxModal = (type: 'credit' | 'payment') => {
    setTxType(type);
    setTxNote('');
    calc.reset();
    setShowTxModal(true);
  };

  const handleAddTx = async () => {
    const amount = calc.value;
    if (!amount || amount <= 0) { showToast('Amount likhein', 'warning'); return; }
    if (!customer || !customerId) return;

    // Over-payment warning
    const bal = customer.totalBalance || 0;
    if (txType === 'payment' && bal <= 0) {
      const ok = window.confirm(`Balance pehle se Rs 0 ya Advance hai. Kya phir bhi Rs ${amount} payment add karein?`);
      if (!ok) return;
    }

    setTxSaving(true);
    try {
      await dataService.addKhataTransaction({
        customerId,
        customerName: customer.name,
        type: txType,
        amount,
        note: txNote.trim() || undefined,
      });
      showToast(txType === 'credit' ? `Rs ${amount.toLocaleString()} udhar add ✅` : `Rs ${amount.toLocaleString()} payment record ✅`, 'success');
      setShowTxModal(false);
    } catch { showToast('Save nahi ho saka', 'error'); }
    finally { setTxSaving(false); }
  };

  const handleEditSave = async () => {
    if (!editName.trim() || !customerId) { showToast('Naam zaroor likhein', 'warning'); return; }
    setEditSaving(true);
    try {
      await dataService.updateKhataCustomer(customerId, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        note: editNote.trim() || undefined,
        pin: editPin.trim() || undefined,
      });
      showToast('Customer update ✅', 'success');
      setShowEditModal(false);
    } catch { showToast('Update nahi ho saka', 'error'); }
    finally { setEditSaving(false); }
  };

  const handleDeleteTx = async () => {
    if (!deleteTxConfirm) return;
    try {
      await dataService.deleteKhataTransaction({
        id: deleteTxConfirm.id,
        customerId: deleteTxConfirm.customerId,
        type: deleteTxConfirm.type,
        amount: deleteTxConfirm.amount,
      });
      showToast('Entry delete ✅', 'success');
      setDeleteTxConfirm(null);
    } catch { showToast('Delete nahi ho saka', 'error'); }
  };

  const handleWhatsAppShare = () => {
    if (!customer) return;
    const bal = customer.totalBalance || 0;
    const lines = [
      `*${customer.name} ka Khata*`,
      bal > 0 ? `Aap ko milna hai: *Rs ${bal.toLocaleString()}*` : bal < 0 ? `Advance: *Rs ${Math.abs(bal).toLocaleString()}*` : `Hisab saaf hai ✅`,
      '',
      '*Transactions:*',
    ];
    const txReversed = [...transactions].reverse();
    txReversed.forEach(tx => {
      const d = tx.date?.toDate?.() ? tx.date.toDate().toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '';
      const sign = tx.type === 'credit' ? '🔴 Diya' : '🟢 Liya';
      lines.push(`${d}: ${sign} Rs ${tx.amount.toLocaleString()}${tx.note ? ` (${tx.note})` : ''}`);
    });
    lines.push('', '_Shop Hisab POS_');
    const text = encodeURIComponent(lines.join('\n'));
    const phone = customer.phone?.replace(/[^0-9]/g, '');
    if (phone && phone.length >= 10) {
      window.open(`https://wa.me/92${phone.replace(/^0/, '')}?text=${text}`, '_blank');
    } else {
      showToast('Customer ka valid number nahi hai', 'warning');
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts?.toDate?.() ?? new Date(ts);
    return d.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const d = ts?.toDate?.() ?? new Date(ts);
    return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-900" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-400 font-bold">Customer nahi mila</p>
        <button onClick={() => navigate('/khata')} className="mt-4 text-emerald-700 font-bold text-sm">← Wapas Jao</button>
      </div>
    );
  }

  const balance = customer.totalBalance || 0;
  const isOwed = balance > 0;
  const isClear = balance === 0;
  const runningBalances = computeRunningBalances(transactions, balance);

  // ── CALCULATOR BUTTONS LAYOUT ──
  const calcRows = [
    ['AC', 'M+', 'M-', '⌫'],
    ['%', '÷', '×', '-'],
    ['7', '8', '9', '+'],
    ['4', '5', '6', '='],
    ['1', '2', '3', '↵'],
    ['0', '.', '', ''],
  ];

  return (
    <div className="pb-32 animate-in fade-in duration-700">

      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/khata')} className="p-2 rounded-xl hover:bg-emerald-50 text-emerald-900">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-emerald-950 truncate">{customer.name}</h1>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Customer</span>
          </div>
          {customer.phone && (
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Phone className="w-3 h-3" /> {customer.phone}
            </p>
          )}
        </div>
        <button onClick={handleWhatsAppShare} className="p-2 rounded-xl hover:bg-green-50 text-green-600" title="WhatsApp share">
          <MessageCircle className="w-5 h-5" />
        </button>
        {userRole === 'owner' && (
          <button
            onClick={() => { setEditName(customer.name); setEditPhone(customer.phone || ''); setEditNote(customer.note || ''); setShowEditModal(true); }}
            className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-900"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Balance Hero Card (DigiKhata style) ── */}
      <div className={cn(
        "rounded-3xl p-6 mb-4 text-white relative overflow-hidden",
        isOwed ? "bg-red-600" : isClear ? "bg-emerald-700" : "bg-blue-600"
      )}>
        <div className="absolute -right-6 -top-6 w-36 h-36 bg-white/10 rounded-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold tracking-tight relative z-10">
              {balanceHidden ? '****' : `Rs ${Math.abs(balance).toLocaleString()}`}
            </p>
            <p className="text-sm font-semibold opacity-75 mt-1">
              {isOwed ? 'Aap ko milna hai (You will get)' : isClear ? '✅ Hisab saaf hai' : 'Customer ka advance hai'}
            </p>
          </div>
          <button
            onClick={() => setBalanceHidden(!balanceHidden)}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
            title={balanceHidden ? 'Show balance' : 'Hide balance'}
          >
            <span className="text-xl">{balanceHidden ? '👁️' : '🙈'}</span>
          </button>
        </div>
        <p className="text-xs opacity-50 mt-3">{transactions.length} entries total</p>
      </div>

      {/* ── Action Buttons row ── */}
      <div className={`grid gap-2 mb-5 ${userRole === 'owner' ? 'grid-cols-3' : 'grid-cols-1'}`}>
        <button onClick={handleWhatsAppShare} className="flex flex-col items-center gap-1.5 py-3 bg-white border border-emerald-100 rounded-2xl hover:bg-green-50 transition-colors">
          <MessageCircle className="w-5 h-5 text-green-600" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">WhatsApp</span>
        </button>
        {userRole === 'owner' && (
          <button
            onClick={() => { setEditName(customer.name); setEditPhone(customer.phone || ''); setEditNote(customer.note || ''); setShowEditModal(true); }}
            className="flex flex-col items-center gap-1.5 py-3 bg-white border border-emerald-100 rounded-2xl hover:bg-emerald-50 transition-colors"
          >
            <Edit2 className="w-5 h-5 text-emerald-700" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Edit</span>
          </button>
        )}
        {userRole === 'owner' && (
          <button
            onClick={() => { if (window.confirm('Yeh customer aur sari entries delete ho jayengi. Sure?')) { dataService.deleteKhataCustomer(customerId!).then(() => { showToast('Customer delete ✅', 'success'); navigate('/khata'); }); } }}
            className="flex flex-col items-center gap-1.5 py-3 bg-white border border-red-100 rounded-2xl hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-5 h-5 text-red-500" />
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Delete</span>
          </button>
        )}
      </div>

      {/* ── Transaction Table — DigiKhata style ── */}
      <div className="bg-white border border-emerald-50 rounded-3xl overflow-hidden mb-4">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_80px] px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entries</span>
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest text-right">You Gave</span>
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-right">You Got</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-300 font-bold text-sm">Koi entry nahi abhi tak</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {transactions.map((tx, i) => {
              const runBal = runningBalances[i];
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "grid grid-cols-[1fr_80px_80px] px-4 py-3 items-center group",
                    tx.type === 'credit' ? "bg-red-50/40" : "bg-white"
                  )}
                >
                  {/* Left: date + running balance */}
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 font-medium">
                      {formatDate(tx.date)} · {formatTime(tx.date)}
                    </p>
                    <p className={cn(
                      "text-[11px] font-bold mt-0.5",
                      runBal > 0 ? "text-red-500" : runBal === 0 ? "text-emerald-500" : "text-blue-500"
                    )}>
                      Bal. Rs {Math.abs(runBal).toLocaleString()}
                    </p>
                    {tx.note && <p className="text-[10px] text-slate-400 truncate mt-0.5">{tx.note}</p>}
                  </div>

                  {/* You Gave (credit = udhar diya = aap ne credit diya = you gave) */}
                  <div className="text-right">
                    {tx.type === 'credit' && (
                      <p className="text-base font-bold text-red-600">{tx.amount.toLocaleString()}</p>
                    )}
                  </div>

                  {/* You Got (payment = customer ne diya = you got) */}
                  <div className="text-right flex items-center justify-end gap-1">
                    {tx.type === 'payment' && (
                      <p className="text-base font-bold text-emerald-600">{tx.amount.toLocaleString()}</p>
                    )}
                    {userRole === 'owner' && (
                      <button
                        onClick={() => setDeleteTxConfirm(tx)}
                        className="opacity-0 group-hover:opacity-100 ml-1 p-1 rounded-lg hover:bg-red-100 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom Action Buttons (fixed) — DigiKhata style ── */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 flex z-40 shadow-2xl shadow-slate-900/20">
        <button
          onClick={() => openTxModal('credit')}
          className="flex-1 py-4 bg-red-600 text-white font-bold text-sm uppercase tracking-widest hover:bg-red-700 transition-colors flex items-center justify-center gap-2 md:relative"
        >
          <span className="hidden md:inline">YOU GAVE Rs</span>
          <span className="md:hidden">GIVE</span>
        </button>
        <button
          onClick={() => openTxModal('payment')}
          className="flex-1 py-4 bg-emerald-600 text-white font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 md:relative"
        >
          <span className="hidden md:inline">YOU GOT Rs</span>
          <span className="md:hidden">GOT</span>
        </button>
      </div>

      {/* ── Transaction Modal with Calculator ── */}
      <AnimatePresence>
        {showTxModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowTxModal(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 md:left-64 z-50 bg-white rounded-t-3xl shadow-2xl"
            >
              {/* Modal Header */}
              <div className={cn(
                "px-5 pt-5 pb-4 rounded-t-3xl",
                txType === 'credit' ? "bg-red-600" : "bg-emerald-600"
              )}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white font-bold text-sm">
                    {txType === 'credit' ? `You Gave Rs ${calc.value > 0 ? calc.value.toLocaleString() : '0'} to ${customer.name}` : `You Got Rs ${calc.value > 0 ? calc.value.toLocaleString() : '0'} from ${customer.name}`}
                  </p>
                  <button onClick={() => setShowTxModal(false)} className="p-1 rounded-lg bg-white/20 text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* Amount display */}
                <div className="flex items-center justify-between bg-white/20 rounded-2xl px-4 py-3 mt-2">
                  <span className="text-white text-3xl font-bold tracking-tight">
                    Rs {calc.display === '0' ? '' : ''}{calc.display}
                  </span>
                  {calc.operator && (
                    <span className="text-white/70 text-lg font-bold">{calc.operator}</span>
                  )}
                </div>
              </div>

              {/* Note input */}
              <div className="px-4 py-3 border-b border-slate-100">
                <input
                  type="text"
                  placeholder="Add Items / Note (optional)..."
                  value={txNote}
                  onChange={e => setTxNote(e.target.value)}
                  className="w-full text-sm text-slate-700 placeholder-slate-300 font-medium focus:outline-none"
                />
              </div>

              {/* Switch type toggle */}
              <div className="flex px-4 py-2 gap-2">
                <button
                  onClick={() => setTxType('credit')}
                  className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-colors",
                    txType === 'credit' ? "bg-red-600 text-white" : "bg-slate-100 text-slate-500")}
                >
                  YOU GAVE
                </button>
                <button
                  onClick={() => setTxType('payment')}
                  className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-colors",
                    txType === 'payment' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500")}
                >
                  YOU GOT
                </button>
              </div>

              {/* SAVE button */}
              <div className="px-4 pb-2">
                <button
                  onClick={handleAddTx}
                  disabled={txSaving || calc.value <= 0}
                  className={cn(
                    "w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2",
                    txType === 'credit' ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  {txSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {txSaving ? 'Saving...' : 'SAVE'}
                </button>
              </div>

              {/* ── Calculator Keyboard ── */}
              <div className="px-3 pb-6 pt-1">
                {calcRows.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-4 gap-2 mb-2">
                    {row.map((btn, bi) => {
                      if (!btn) return <div key={bi} />;
                      const isOp = ['+', '-', '×', '÷', '%', '=', '↵'].includes(btn);
                      const isDelete = btn === '⌫';
                      const isAC = btn === 'AC';
                      const isEnter = btn === '↵';
                      const isMem = btn === 'M+' || btn === 'M-';
                      return (
                        <button
                          key={bi}
                          onClick={() => btn === '↵' ? handleAddTx() : calc.press(btn)}
                          className={cn(
                            "py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95",
                            isEnter ? "bg-emerald-600 text-white" :
                            isAC ? "bg-slate-200 text-slate-700" :
                            isDelete ? "bg-slate-200 text-slate-700" :
                            isMem ? "bg-slate-100 text-slate-500 text-xs" :
                            isOp ? "bg-slate-200 text-slate-700" :
                            "bg-slate-100 text-slate-800"
                          )}
                        >
                          {btn === '⌫' ? '⌫' : btn}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Edit Customer Modal ── */}
      <AnimatePresence>
        {showEditModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/30 backdrop-blur-sm z-40" onClick={() => setShowEditModal(false)} />
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none"
            >
              <div className="pointer-events-auto bg-white rounded-t-[32px] md:rounded-[32px] p-7 w-full md:max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-emerald-900">Customer Edit</h3>
                  <button onClick={() => setShowEditModal(false)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Naam *', val: editName, set: setEditName, ph: 'Customer naam', type: 'text' },
                    { label: 'Phone', val: editPhone, set: setEditPhone, ph: '03XX-XXXXXXX', type: 'tel' },
                    { label: 'Note', val: editNote, set: setEditNote, ph: 'Regular Customer...', type: 'text' },
                    { label: 'PIN (Optional)', val: editPin, set: setEditPin, ph: '4 digit pin', type: 'password' },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{f.label}</label>
                      <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                        className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-900/20" />
                    </div>
                  ))}
                </div>
                <button onClick={handleEditSave} disabled={editSaving || !editName.trim()}
                  className="w-full mt-5 py-3.5 bg-emerald-900 text-white rounded-2xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editSaving ? 'Saving...' : 'Save Karo'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete Transaction Confirm ── */}
      <AnimatePresence>
        {deleteTxConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40" onClick={() => setDeleteTxConfirm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none px-4">
              <div className="pointer-events-auto bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-950 text-sm">Entry Delete Karein?</p>
                    <p className="text-xs text-slate-400">
                      {deleteTxConfirm.type === 'credit' ? 'Udhar' : 'Payment'}: Rs {deleteTxConfirm.amount.toLocaleString()} — Balance bhi reverse hoga
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteTxConfirm(null)}
                    className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button onClick={handleDeleteTx}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600">Delete</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
