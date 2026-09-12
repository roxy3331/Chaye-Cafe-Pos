import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Search, Phone, ChevronDown, Info, Loader2, X, Trash2, AlertCircle, ArrowUpDown, Pin, PinOff, Eye, EyeOff, MessageCircle, Shield, Star, AlertTriangle, Clock, Send, ChevronLeft, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { KhataCustomer } from '../types';
import { NumberTicker, BorderBeam, Meteors, ShimmerButton, FlipIn } from '../components/magicui';

// â”€â”€â”€ 7-Tier Credit Status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getCreditTier(customer: KhataCustomer) {
  const bal = customer.totalBalance || 0;
  const limit = customer.creditLimit;
  if (!limit || limit <= 0 || bal <= 0) {
    return { tier: 0, pct: 0, label: 'Normal', badge: '', badgeColor: '', progressColor: 'bg-emerald-500' };
  }
  const pct = (bal / limit) * 100;
  if (pct <= 50)  return { tier: 1, pct, label: 'Safe',     badge: '✅ Safe',            badgeColor: 'bg-emerald-100 text-emerald-700', progressColor: 'bg-emerald-500' };
  if (pct <= 80)  return { tier: 2, pct, label: 'Warning',  badge: '⚠️ Qareeb',          badgeColor: 'bg-yellow-100 text-yellow-700',   progressColor: 'bg-yellow-500'  };
  if (pct <= 99)  return { tier: 3, pct, label: 'Critical', badge: '🔴 Khatam Hone Wali',badgeColor: 'bg-orange-100 text-orange-700',   progressColor: 'bg-orange-500'  };
  if (pct <= 150) return { tier: 4, pct, label: 'Over1',    badge: '🚫 Limit Cross',     badgeColor: 'bg-red-100 text-red-700',         progressColor: 'bg-red-500'     };
  if (pct <= 250) return { tier: 5, pct, label: 'Over2',    badge: '🚫 Bahut Zyada',     badgeColor: 'bg-red-200 text-red-800',         progressColor: 'bg-red-600'     };
  if (pct <= 400) return { tier: 6, pct, label: 'Over3',    badge: '⛔ Serious',          badgeColor: 'bg-red-300 text-red-900',         progressColor: 'bg-red-700'     };
  return           { tier: 7, pct, label: 'Over4',    badge: '🆘 Final Warning',   badgeColor: 'bg-red-900 text-white',          progressColor: 'bg-red-900'     };
}

// â”€â”€â”€ Smart 7-Tier Message Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildSmartMessage(c: KhataCustomer): string {
  const bal = c.totalBalance || 0;
  const { tier } = getCreditTier(c);
  const balStr = `Rs ${Math.abs(bal).toLocaleString()}`;
  const n = c.name;

  if (tier <= 1) return [
    `Assalam Walaikum *${n}* Bhai! 🙏`,
    ``,
    `Aapka hisab:`,
    `💰 *Balance: ${balStr}*`,
    ``,
    `Meherbani karke jaldi settle karein.`,
    `Shukriya! 🤝`,
    ``,
    `— Chaye-Cafe Portal`,
  ].join('\n');

  if (tier === 2) return [
    `Assalam Walaikum *${n}* Bhai,`,
    ``,
    `Aapka balance: *${balStr}*`,
    `📊 Credit limit qareeb aa rahi hai.`,
    `Paise dein taake limit available rahe. 🙏`,
    ``,
    `— Chaye-Cafe Portal`,
  ].join('\n');

  if (tier === 3) return [
    `Assalam Walaikum *${n}* Bhai,`,
    ``,
    `⚠️ *ZAROORI:* Balance *${balStr}* hai.`,
    `Credit limit khatam hone wali hai!`,
    ``,
    `Jaldi payment karein. 🙏`,
    ``,
    `— Chaye-Cafe Portal`,
  ].join('\n');

  if (tier === 4) return [
    `Assalam Walaikum *${n}* Bhai,`,
    ``,
    `🚫 *Limit cross ho gayi hai.*`,
    `Balance: *${balStr}*`,
    ``,
    `Aaj payment karein. Shukriya. 🙏`,
    ``,
    `— Chaye-Cafe Portal`,
  ].join('\n');

  if (tier === 5) return [
    `Assalam Walaikum *${n}* Bhai,`,
    ``,
    `⚠️ Aapka hisab bahut zyada ho gaya hai.`,
    `Balance: *${balStr}*`,
    ``,
    `Credit bilkul nahi bacha. Aaj payment`,
    `zaroor karein. 🙏`,
    ``,
    `— Chaye-Cafe Portal`,
  ].join('\n');

  if (tier === 6) return [
    `*${n}* Bhai,`,
    ``,
    `🚫 *ZAROORI:* Aapka credit band ho gaya.`,
    `Balance: *${balStr}*`,
    ``,
    `Agla maal NAHI milega jab tak paise`,
    `nahi aate. Aaj milein. 🙏`,
    ``,
    `— Chaye-Cafe Portal`,
  ].join('\n');

  return [
    `*${n}* Bhai,`,
    ``,
    `🆘 *FINAL:* Hisab bahut zyada barh gaya.`,
    `Balance: *${balStr}*`,
    ``,
    `Fori payment karein warna aage ka`,
    `lena dena band. ASAP milein.`,
    ``,
    `— Chaye-Cafe Portal`,
  ].join('\n');
}

// â”€â”€â”€ Limit Reminder Message Builder (5 tiers: 20→100% used) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildLimitReminderMessage(c: KhataCustomer): string | null {
  const bal = c.totalBalance || 0;
  const limit = c.creditLimit;
  if (!limit || limit <= 0 || bal <= 0) return null;
  const pct = (bal / limit) * 100;
  if (pct < 20) return null;
  const remaining = Math.max(0, limit - bal);
  const remStr = `Rs ${remaining.toLocaleString()}`;
  const n = c.name;

  let lines: string[];
  if (pct < 50) {
    // Tier 1 — Friendly info (20–49%)
    lines = [
      `Assalam Walaikum *${n}* Bhai! 😊`, ``,
      `Aapki credit limit mein abhi *${remStr}* available hai.`,
      `Payment karte rahein taake limit hamesha available rahe. 🙏`, ``,
      `— Chaye-Cafe Portal`,
    ];
  } else if (pct < 75) {
    // Tier 2 — Polite caution (50–74%)
    lines = [
      `Assalam Walaikum *${n}* Bhai,`, ``,
      `📊 Aapki aadhi se zyada credit limit use ho gayi hai.`,
      `💳 *Sirf ${remStr} limit bachi hai.*`, ``,
      `Meherbani karke jaldi payment karein taake limit available rahe. 🙏`, ``,
      `— Chaye-Cafe Portal`,
    ];
  } else if (pct < 90) {
    // Tier 3 — Clear warning (75–89%)
    lines = [
      `Assalam Walaikum *${n}* Bhai,`, ``,
      `⚠️ *KHABARDAR:* Credit limit khatam hone wali hai!`,
      `💳 *Sirf ${remStr} bachi hai* — agle order ke liye kaafi nahi hogi.`, ``,
      `Aaj ya kal payment ZAROOR karein. 🙏`, ``,
      `— Chaye-Cafe Portal`,
    ];
  } else if (pct < 100) {
    // Tier 4 — Urgent (90–99%)
    lines = [
      `*${n}* Bhai,`, ``,
      `🔴 *FORI KAAM:* Limit khatam hone wali hai!`,
      `💳 *Bas ${remStr} hi bachi hai.*`,
      `Agar aaj payment nahi aayi toh kal agle order pe CREDIT BAND ho jayega.`, ``,
      `Please ABHI contact karein. 🙏`, ``,
      `— Chaye-Cafe Portal`,
    ];
  } else {
    // Tier 5 — Final (100%+)
    lines = [
      `*${n}* Bhai,`, ``,
      `🚫 *FINAL NOTICE: Credit limit POORI khatam ho gayi hai.*`,
      `💳 *Koi limit nahi bachi.*`, ``,
      `Jab tak payment nahi aayegi — agle order pe MAAL NAHI MILEGA.`,
      `Aaj hi milein. Shukriya. 🙏`, ``,
      `— Chaye-Cafe Portal`,
    ];
  }
  return lines.join('\n');
}

// â”€â”€â”€ Tier Config for UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TIER_UI = [
  { bg: 'bg-slate-50',    border: 'border-slate-100',   icon: '💬', label: 'Normal'           },
  { bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: '✅', label: 'Safe'              },
  { bg: 'bg-yellow-50',   border: 'border-yellow-200',  icon: '⚠️', label: 'Qareeb'            },
  { bg: 'bg-orange-50',   border: 'border-orange-200',  icon: '🔴', label: 'Khatam Hone Wali' },
  { bg: 'bg-red-50',      border: 'border-red-200',     icon: '🚫', label: 'Limit Cross'       },
  { bg: 'bg-red-100',     border: 'border-red-300',     icon: '🚫', label: 'Bahut Zyada'       },
  { bg: 'bg-red-200',     border: 'border-red-400',     icon: '⛔', label: 'Serious'           },
  { bg: 'bg-red-900',     border: 'border-red-900',     icon: '🆘', label: 'Final Warning'     },
];

const KHATA_SCROLL_KEY = 'khata:scrollY';

export const Khata: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  React.useEffect(() => {
    let savedY = 0;
    try {
      const saved = sessionStorage.getItem(KHATA_SCROLL_KEY);
      if (saved) { savedY = parseInt(saved, 10); sessionStorage.removeItem(KHATA_SCROLL_KEY); }
    } catch {}

    if (savedY > 0) {
      // The list is lazy-mounted + async-loaded, so the page isn't tall enough to scroll
      // immediately. Retry on a short interval until layout is ready (cap ~1.5s).
      const start = Date.now();
      const tryScroll = () => {
        // Only scroll if the document is tall enough to hold the saved position.
        if (document.body.scrollHeight >= savedY + 50 || Date.now() - start > 1500) {
          window.scrollTo(0, savedY);
        } else {
          setTimeout(tryScroll, 80);
        }
      };
      setTimeout(tryScroll, 60);
    }

    return () => {
      try { sessionStorage.setItem(KHATA_SCROLL_KEY, String(window.scrollY)); } catch {}
    };
  }, []);

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

  // â”€â”€â”€ Inline Quick-Add (accordion) State â”€â”â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [quickType, setQuickType] = React.useState<'credit' | 'payment'>('credit');
  const [quickAmount, setQuickAmount] = React.useState('');
  const [quickNote, setQuickNote] = React.useState('');
  const [quickSaving, setQuickSaving] = React.useState(false);
  const [pendingQuickWarning, setPendingQuickWarning] = React.useState<{ customerId: string; customerName: string; type: 'balance' | 'creditLimit'; amount: number } | null>(null);

  // â”€â”€ Sequential Queue State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showQueueModal, setShowQueueModal] = React.useState(false);
  const [queueList, setQueueList] = React.useState<string[]>([]);
  const [queueIndex, setQueueIndex] = React.useState(0);
  const [queueSent, setQueueSent] = React.useState<Set<string>>(new Set());
  const [msgType, setMsgType] = React.useState<'balance' | 'limit'>('balance');

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

  // Memoized so the filter + sort (and the derived totals) only recompute when
  // customers / search / sort actually change — not on every render.
  const filtered = React.useMemo(() => customers
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
    }), [customers, searchTerm, sortBy]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const { totalOutstanding, totalCustomers, customersWithBalance, limitCrossCount, inactiveCount } = React.useMemo(() => {
    const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let totalOutstanding = 0, customersWithBalance = 0, limitCrossCount = 0, inactiveCount = 0;
    for (const c of customers) {
      const bal = c.totalBalance || 0;
      if (bal > 0) totalOutstanding += bal;
      if (bal > 0) customersWithBalance++;
      if (c.creditLimit && bal > c.creditLimit) limitCrossCount++;
      const lastTs = c.lastTransactionAt;
      const lastMs = lastTs ? (lastTs.toDate?.()?.getTime?.() ?? (typeof lastTs === 'number' ? lastTs : new Date(lastTs as any).getTime())) : 0;
      const isInactive = (!lastMs) ? bal > 0 : (lastMs < thirtyDaysAgoMs && bal > 0);
      if (isInactive) inactiveCount++;
    }
    return { totalOutstanding, totalCustomers: customers.length, customersWithBalance, limitCrossCount, inactiveCount };
  }, [customers]);

  const formatWANumber = (raw?: string | null) => {
    if (!raw) return null;
    const d = raw.replace(/[^0-9]/g, '');
    if (!d) return null;
    if (d.startsWith('92') && d.length >= 11) return d;
    if (d.startsWith('0') && d.length >= 10) return `92${d.slice(1)}`;
    if (d.length === 10 && d.startsWith('3')) return `92${d}`;
    return null;
  };

  // â”€â”€ Queue Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const startQueue = (type: 'balance' | 'limit' = 'balance') => {
    const ids = [...bulkSelected].filter(id => {
      const c = customers.find(x => x.id === id);
      if (!c || !formatWANumber(c.phone)) return false;
      if (type === 'limit') {
        const limit = c.creditLimit;
        const bal = c.totalBalance || 0;
        if (!limit || limit <= 0 || bal <= 0) return false;
        const pct = (bal / limit) * 100;
        return pct >= 20;
      }
      return true;
    });
    if (ids.length === 0) {
      const hint = type === 'limit'
        ? 'Limit reminder ke liye: credit limit set honi chahiye aur 20%+ use hona chahiye'
        : 'Valid phone number wale customers nahi hain';
      showToast(hint, 'warning');
      return;
    }
    setMsgType(type);
    setQueueList(ids);
    setQueueIndex(0);
    setQueueSent(new Set());
    setShowBulkModal(false);
    setShowQueueModal(true);
  };

  const currentQueueCustomer = queueList[queueIndex] ? customers.find(c => c.id === queueList[queueIndex]) : null;

  const sendCurrentAndNext = () => {
    if (!currentQueueCustomer) return;
    const number = formatWANumber(currentQueueCustomer.phone);
    if (number) {
      const msg = msgType === 'limit'
        ? (buildLimitReminderMessage(currentQueueCustomer) || buildSmartMessage(currentQueueCustomer))
        : buildSmartMessage(currentQueueCustomer);
      const isAndroid = /android/i.test(navigator.userAgent);
      const encoded = encodeURIComponent(msg);
      if (isAndroid) {
        window.open(`intent://send?phone=${number}&text=${encoded}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`, '_blank');
      } else {
        window.open(`https://wa.me/${number}?text=${encoded}`, '_blank');
      }
      setQueueSent(prev => new Set([...prev, currentQueueCustomer.id]));
    }
    if (queueIndex < queueList.length - 1) {
      setQueueIndex(i => i + 1);
    } else {
      setShowQueueModal(false);
      showToast(`${queueSent.size + 1} messages bhej diye gaye ✅`, 'success');
    }
  };

  const skipCurrent = () => {
    if (queueIndex < queueList.length - 1) {
      setQueueIndex(i => i + 1);
    } else {
      setShowQueueModal(false);
      showToast(`Queue complete. ${queueSent.size} messages bheje ✅`, 'success');
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

  const handleAddCustomer = async () => {
    if (!newName.trim()) { showToast('Customer ka naam zaroor likhein', 'warning'); return; }
    setSaving(true);
    try {
      await dataService.addKhataCustomer({
        name: newName.trim(),
        phone: newPhone.trim() || '',
        note: newNote.trim() || '',
        pin: newPin.trim() || '',
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

  // â”€â”€â”€ Inline Quick-Add Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Naam pe tap → wahin neeche quick entry khul jati hai (no page navigation)
  const toggleExpand = (customerId?: string) => {
    if (!customerId) return;
    if (expandedId === customerId) { setExpandedId(null); return; }
    // Fresh row — quick-entry fields reset
    setQuickType('credit');
    setQuickAmount('');
    setQuickNote('');
    setExpandedId(customerId);
    // Expanded row ko view mein laane ke liye (panel height animate hone ke baad)
    setTimeout(() => {
      document.getElementById(`khata-row-${customerId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  const quickSave = async (customerId: string, customerName: string, amount: number) => {
    setQuickSaving(true);
    try {
      await dataService.addKhataTransaction({
        customerId,
        customerName,
        type: quickType,
        amount,
        note: quickNote.trim() || '',
      });
      showToast(quickType === 'credit'
        ? `Rs ${amount.toLocaleString()} udhar add ✅`
        : `Rs ${amount.toLocaleString()} payment record ✅`, 'success');
      // Panel khula rehta hai — agli entry turant dal sakte hain
      setQuickAmount('');
      setPendingQuickWarning(null);
    } catch (err: any) {
      const msg = err?.message || String(err);
      const parsed = (() => { try { return JSON.parse(msg); } catch { return null; } })();
      const detail = parsed?.error || msg;
      console.error('QUICK TX SAVE ERROR:', detail);
      showToast(detail.slice(0, 80), 'error');
    } finally {
      setQuickSaving(false);
    }
  };

  const handleQuickSave = () => {
    const amount = parseFloat(quickAmount);
    if (!amount || amount <= 0) { showToast('Amount likhein', 'warning'); return; }
    const customer = customers.find(c => c.id === expandedId);
    if (!customer) return;

    const bal = customer.totalBalance || 0;
    // Same guards as KhataDetail — warn via modal, never window.confirm
    if (quickType === 'payment' && bal <= 0) {
      setPendingQuickWarning({ customerId: customer.id, customerName: customer.name, type: 'balance', amount });
      return;
    }
    if (quickType === 'credit' && customer.creditLimit && (bal + amount) > customer.creditLimit) {
      setPendingQuickWarning({ customerId: customer.id, customerName: customer.name, type: 'creditLimit', amount });
      return;
    }
    quickSave(customer.id, customer.name, amount);
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-700">

      {/* â”€â”€ Header Cards â”€â”€ */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FlipIn delay={0}>
        <div className="md:col-span-2 relative overflow-hidden rounded-3xl p-7 bg-emerald-900 text-white">
          <BorderBeam colorFrom="#6ee7b7" colorTo="#34d399" size={200} duration={8} borderWidth={1.5} />
          <Meteors number={10} />
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-1 relative z-10">Total Udhar Baaki</p>
          <h2 className="text-5xl font-bold tracking-tighter relative z-10">
            {balancesHidden ? 'Rs ••••••' : <><span>Rs </span><NumberTicker value={totalOutstanding} /></>}
          </h2>
          <div className="mt-5 flex items-center gap-4 text-sm font-bold opacity-70 relative z-10">
            <span>{totalCustomers} Customer{totalCustomers !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{customersWithBalance} pe baaki hai</span>
          </div>
        </div>
        </FlipIn>
        <FlipIn delay={0.1}>
        <div className="rounded-3xl p-6 bg-white border border-emerald-100 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Is Mahine Ka Hisab</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-500">Total Baaki</span>
              <span className="text-red-600">Rs {balancesHidden ? '••••' : totalOutstanding.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-500">Limit Cross</span>
              <span className="text-orange-600">{limitCrossCount} customers</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-500">Inactive (30d)</span>
              <span className="text-slate-400">{inactiveCount} customers</span>
            </div>
          </div>
          <ShimmerButton
            onClick={() => { setBulkSelected(new Set(customers.filter(c => (c.totalBalance || 0) > 0 && c.phone).map(c => c.id))); setShowBulkModal(true); }}
            background="rgba(2,44,34,1)"
            borderRadius="12px"
            className="mt-4 w-full py-2.5 text-white text-xs font-bold"
          >
            <MessageCircle className="w-4 h-4" />
            Bulk WA Reminder
          </ShimmerButton>
        </div>
        </FlipIn>
      </section>

      {/* â”€â”€ Search + Sort + Add â”€â”€ */}
      <section className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Customer dhundho..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-emerald-100 bg-white text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-900/20" />
        </div>
        <button onClick={toggleBalancesHidden} title={balancesHidden ? 'Balance dikhao' : 'Balance chhupao'}
          className="p-3 bg-white border border-emerald-100 rounded-2xl text-slate-500 hover:bg-emerald-50 hover:text-emerald-900 transition-colors">
          {balancesHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button onClick={() => setSortBy(s => s === 'balance' ? 'name' : 'balance')}
          className="p-3 bg-white border border-emerald-100 rounded-2xl text-slate-500 hover:bg-emerald-50 hover:text-emerald-900 transition-colors">
          <ArrowUpDown className="w-4 h-4" />
        </button>
        <ShimmerButton
          onClick={() => setShowAddModal(true)}
          background="rgba(2,44,34,1)"
          borderRadius="12px"
          className="text-white font-bold text-sm px-4 py-3"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Naya</span>
        </ShimmerButton>
      </section>

      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-2 px-1">
        Sort: {sortBy === 'balance' ? 'Zyada Baaki Pehle' : 'A–Z Naam'}
      </p>

      {/* â”€â”€ Customer List â”€â”€ */}
      <section>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-900" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">
              {searchTerm ? 'Koi customer nahi mila' : 'Abhi tak koi customer nahi, pehla khata kholo!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((customer, i) => {
                const bal = customer.totalBalance || 0;
                const isOwed = bal > 0;
                const isClear = bal === 0;
                const tier = getCreditTier(customer);
                const isExpanded = expandedId != null && expandedId === customer.id;
                return (
                  <motion.div key={customer.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}
                    id={`khata-row-${customer.id}`}
                    className={cn(
                      "border rounded-2xl transition-all",
                      tier.tier >= 6 ? "bg-red-50 border-red-300 shadow-sm shadow-red-100" :
                      tier.tier >= 4 ? "bg-red-50/60 border-red-200" :
                      "bg-white border-emerald-50",
                      isExpanded ? "border-emerald-300 shadow-md" : ""
                    )}>
                    {/* Tappable header — tap karne se wahin neeche quick entry khul jati hai */}
                    <div className="flex items-center gap-2 p-2.5 rounded-2xl hover:shadow-md transition-all cursor-pointer"
                      onClick={() => toggleExpand(customer.id)}>
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                        isOwed ? "bg-red-100 text-red-700" : isClear ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>
                        {customer.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-emerald-950 text-[13px] leading-tight truncate max-w-[45vw] sm:max-w-[180px]">{customer.name || 'Unnamed'}</p>
                          {customer.trustBadge && (() => {
                            const cfg = trustBadgeConfig[customer.trustBadge];
                            const Icon = cfg.icon;
                            return <span className={cn('flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide', cfg.color)}><Icon className="w-2 h-2" />{cfg.label}</span>;
                          })()}
                          {(() => {
                            const isInactive = customer.lastTransactionAt
                              ? (customer.lastTransactionAt?.toDate?.() ?? new Date(customer.lastTransactionAt)) < thirtyDaysAgo
                              : (customer.totalBalance || 0) > 0;
                            return isInactive && (customer.totalBalance || 0) > 0
                              ? <span className="flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500"><Clock className="w-2 h-2" />Inactive</span>
                              : null;
                          })()}
                          {customer.pinned && <span className="text-[10px] leading-none">📌</span>}
                        </div>
                        {customer.creditLimit && customer.creditLimit > 0 ? (
                          <div className="mt-1">
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full transition-all', tier.progressColor)}
                                  style={{ width: `${Math.min(100, tier.pct)}%` }} />
                              </div>
                              <span className={cn('text-[8px] font-bold shrink-0', tier.tier >= 4 ? 'text-red-600' : tier.tier >= 2 ? 'text-orange-500' : 'text-slate-400')}>
                                {Math.round(tier.pct)}%
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right shrink-0 ml-auto">
                        <p className={cn("text-sm font-bold", isOwed ? "text-red-600" : isClear ? "text-emerald-600" : "text-blue-600")}>
                          {balancesHidden ? '••••' : `Rs ${Math.abs(bal).toLocaleString()}`}
                        </p>
                        <p className={cn("text-[8px] font-bold uppercase tracking-widest", isOwed ? "text-red-400" : isClear ? "text-emerald-400" : "text-blue-400")}>
                          {balancesHidden ? '—' : (isOwed ? 'Baaki Hai' : isClear ? 'Saaf' : 'Advance')}
                        </p>
                      </div>
                      {/* Full Details — history page ke liye side button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/khata/${customer.id}`); }}
                        title="Full Details & History"
                        className="shrink-0 flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded-lg bg-emerald-900 text-white hover:bg-emerald-800 active:scale-95 transition-all"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span className="text-[7px] font-bold uppercase tracking-widest leading-none">Full</span>
                      </button>
                      <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform duration-300",
                        isExpanded ? "text-emerald-700 rotate-180" : "text-slate-300")} />
                    </div>

                    {/* â”€â”€ Inline Quick-Add Panel â”€â”€ */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="mx-2.5 mb-2.5 rounded-xl bg-slate-50/70 border border-slate-100 p-2 space-y-1.5">
                            {/* Type toggle */}
                            <div className="flex gap-1.5">
                              <button onClick={() => setQuickType('credit')}
                                className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors",
                                  quickType === 'credit' ? "bg-red-600 text-white" : "bg-red-50 text-red-500 hover:bg-red-100")}>
                                UDHAR (YOU GAVE)
                              </button>
                              <button onClick={() => setQuickType('payment')}
                                className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors",
                                  quickType === 'payment' ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")}>
                                PAYMENT (YOU GOT)
                              </button>
                            </div>

                            {/* Amount + Save — same row, compact */}
                            <div className="flex gap-1.5">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">Rs</span>
                                <input
                                  type="text" inputMode="decimal" autoFocus placeholder="0"
                                  value={quickAmount}
                                  onChange={(e) => setQuickAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickSave(); }}
                                  className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                                />
                              </div>
                              <button onClick={handleQuickSave}
                                disabled={quickSaving || !quickAmount || (parseFloat(quickAmount) || 0) <= 0}
                                className={cn("px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1 shrink-0",
                                  quickType === 'credit' ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700")}>
                                {quickSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {quickSaving ? 'Saving' : 'SAVE'}
                              </button>
                            </div>

                            {/* Quick amount presets */}
                            <div className="flex gap-1.5 overflow-x-auto">
                              {[50, 100, 200, 500, 1000, 2000].map(amt => (
                                <button key={amt} onClick={() => setQuickAmount(String(amt))}
                                  className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-100 active:scale-95 transition-all">
                                  {amt}
                                </button>
                              ))}
                            </div>

                            {/* Note */}
                            <input type="text" placeholder="Note (optional)..."
                              value={quickNote} onChange={(e) => setQuickNote(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* â”€â”€ Add Customer Modal â”€â”€ */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/30 backdrop-blur-sm z-40" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }}
              className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none">
              <div className="pointer-events-auto bg-white rounded-t-[32px] md:rounded-[32px] p-7 w-full md:max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-emerald-900">Naya Khata Kholo</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400"><X className="w-5 h-5" /></button>
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
                <button onClick={handleAddCustomer} disabled={saving || !newName.trim()}
                  className="w-full mt-6 py-4 bg-emerald-900 text-white rounded-2xl font-bold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Khata khul raha hai...' : 'Khata Kholo'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* â”€â”€ Bulk Selection Modal â”€â”€ */}
      <AnimatePresence>
        {showBulkModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/30 backdrop-blur-sm z-40" onClick={() => setShowBulkModal(false)} />
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none">
              <div className="pointer-events-auto bg-white rounded-t-[32px] md:rounded-[32px] p-6 w-full md:max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-900">WhatsApp Reminder Queue</h3>
                    <p className="text-xs text-slate-400 font-medium">{bulkSelected.size} selected — ek ek karke jayega</p>
                  </div>
                  <button onClick={() => setShowBulkModal(false)} className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400"><X className="w-5 h-5" /></button>
                </div>

                {/* Select All / Clear */}
                <div className="flex gap-2 mb-3 shrink-0">
                  <button onClick={() => setBulkSelected(new Set(customers.filter(c => (c.totalBalance || 0) > 0 && c.phone).map(c => c.id)))}
                    className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100">Select All</button>
                  <button onClick={() => setBulkSelected(new Set())}
                    className="flex-1 py-2 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100">Clear</button>
                </div>

                {/* Customer list with tier info */}
                <div className="overflow-y-auto flex-1 space-y-2 mb-4">
                  {customers.filter(c => (c.totalBalance || 0) > 0).map(c => {
                    const tier = getCreditTier(c);
                    const tierUi = TIER_UI[tier.tier] || TIER_UI[0];
                    const hasPhone = !!formatWANumber(c.phone);
                    return (
                      <div key={c.id}
                        onClick={() => hasPhone && setBulkSelected(prev => { const s = new Set(prev); s.has(c.id) ? s.delete(c.id) : s.add(c.id); return s; })}
                        className={cn('flex items-center gap-3 p-3 rounded-2xl transition-colors border',
                          !hasPhone ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-100' :
                          bulkSelected.has(c.id) ? `${tierUi.bg} ${tierUi.border} cursor-pointer` : 'bg-slate-50 border-transparent cursor-pointer hover:bg-slate-100'
                        )}>
                        <div className={cn('w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0',
                          bulkSelected.has(c.id) ? 'bg-emerald-700 border-emerald-700' : 'border-slate-300')}>
                          {bulkSelected.has(c.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-emerald-950 truncate">{c.name}</p>
                            {tier.tier >= 1 && tier.badge && (
                              <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold', tier.badgeColor)}>
                                {tier.badge}
                              </span>
                            )}
                          </div>
                          {c.phone
                            ? <p className="text-xs text-slate-400">{c.phone}</p>
                            : <p className="text-xs text-red-400 font-medium">❌ Phone nahi</p>
                          }
                          {c.creditLimit && c.creditLimit > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full', tier.progressColor)}
                                  style={{ width: `${Math.min(100, tier.pct)}%` }} />
                              </div>
                              <span className="text-[9px] font-bold text-slate-400">{Math.round(tier.pct)}%</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-bold text-red-600 shrink-0">Rs {(c.totalBalance || 0).toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startQueue('balance')} disabled={bulkSelected.size === 0}
                    className="flex-1 py-3.5 bg-emerald-900 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-800 transition-colors disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" />
                    Balance Queue
                  </button>
                  <button onClick={() => startQueue('limit')} disabled={bulkSelected.size === 0}
                    className="flex-1 py-3.5 bg-blue-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-800 transition-colors disabled:opacity-50">
                    <CreditCard className="w-3.5 h-3.5" />
                    Limit Queue
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* â”€â”€ Sequential Queue Modal â”€â”€ */}
      <AnimatePresence>
        {showQueueModal && currentQueueCustomer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/50 backdrop-blur-md z-[80]" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">

                {/* Progress bar */}
                <div className="h-1.5 bg-slate-100 w-full">
                  <div className="h-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${((queueIndex) / queueList.length) * 100}%` }} />
                </div>

                <div className="p-7 space-y-5">
                  {/* Counter */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {queueIndex + 1} / {queueList.length} · {msgType === 'limit' ? '💳 Limit' : '💬 Balance'}
                    </p>
                    <div className="flex items-center gap-1">
                      {queueList.map((_, idx) => (
                        <div key={idx} className={cn('w-1.5 h-1.5 rounded-full transition-all',
                          idx < queueIndex ? 'bg-emerald-500' :
                          idx === queueIndex ? 'bg-emerald-900 w-3' : 'bg-slate-200')} />
                      ))}
                    </div>
                  </div>

                  {/* Customer info */}
                  {(() => {
                    const tier = getCreditTier(currentQueueCustomer);
                    const tierUi = TIER_UI[tier.tier] || TIER_UI[0];
                    return (
                      <div className={cn('rounded-2xl p-5 border', tierUi.bg, tierUi.border)}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-900 flex items-center justify-center text-white font-bold text-xl">
                            {currentQueueCustomer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-emerald-950 text-lg">{currentQueueCustomer.name}</p>
                            <p className="text-xs text-slate-500">{currentQueueCustomer.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-slate-600">Balance:</span>
                          <span className="text-xl font-bold text-red-600">Rs {(currentQueueCustomer.totalBalance || 0).toLocaleString()}</span>
                        </div>
                        {tier.tier >= 1 && tier.badge && (
                          <div className="flex items-center gap-2">
                            <span className={cn('px-2 py-1 rounded-full text-xs font-bold', tier.badgeColor)}>
                              {tier.badge}
                            </span>
                            {currentQueueCustomer.creditLimit && currentQueueCustomer.creditLimit > 0 && (
                              <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full', tier.progressColor)}
                                  style={{ width: `${Math.min(100, tier.pct)}%` }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Message preview */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Message Preview</p>
                    <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                      {buildSmartMessage(currentQueueCustomer)}
                    </p>
                  </div>

                  {/* Sent counter */}
                  {queueSent.size > 0 && (
                    <p className="text-center text-xs font-bold text-emerald-600">
                      ✅ {queueSent.size} message{queueSent.size > 1 ? 's' : ''} bhaij diye
                    </p>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button onClick={skipCurrent}
                      className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                      Skip →
                    </button>
                    <button onClick={sendCurrentAndNext}
                      className="flex-1 py-3.5 rounded-2xl bg-emerald-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-900/20">
                      <Send className="w-4 h-4" />
                      {queueIndex === queueList.length - 1 ? 'Send & Done ✅' : 'Send & Next →'}
                    </button>
                  </div>

                  <button onClick={() => { setShowQueueModal(false); showToast(`${queueSent.size} messages bheje gaye`, 'success'); }}
                    className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 py-1">
                    Queue band karo
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* â”€â”€ Delete Confirm Modal â”€â”€ */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/30 backdrop-blur-sm z-40" onClick={() => setDeleteConfirm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none px-4">
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
                  <button onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3 rounded-2xl border border-emerald-100 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                  <button onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">Haan, Delete Karo</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* â”€â”€â”€ Quick-Add Warning Modal (over-payment / limit cross) â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {pendingQuickWarning && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]" onClick={() => setPendingQuickWarning(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-[90] pointer-events-none px-4">
              <div className="pointer-events-auto bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center space-y-5">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  {pendingQuickWarning.type === 'balance' ? (
                    <>
                      <h3 className="text-xl font-bold text-emerald-900">Balance Already 0</h3>
                      <p className="text-slate-500 text-sm mt-2">
                        {pendingQuickWarning.customerName} ka balance pehle se Rs 0 ya Advance hai. Kya phir bhi <span className="font-bold text-emerald-900">Rs {pendingQuickWarning.amount.toLocaleString()}</span> payment add karein?
                      </p>
                    </>
                  ) : (() => {
                    const warnCust = customers.find(c => c.id === pendingQuickWarning.customerId);
                    const limit = warnCust?.creditLimit || 0;
                    const curBal = warnCust?.totalBalance || 0;
                    return (
                      <>
                        <h3 className="text-xl font-bold text-emerald-900">⚠️ Credit Limit Cross</h3>
                        <p className="text-slate-500 text-sm mt-2">
                          {limit > 0 && <>Limit: <span className="font-bold">Rs {limit.toLocaleString()}</span><br /></>}
                          New Balance (approx): <span className="font-bold text-red-500">Rs {(curBal + pendingQuickWarning.amount).toLocaleString()}</span><br />
                          <span className="text-[11px] text-slate-400">Final balance save ke baad update hoga.</span><br />
                          Kya phir bhi add karein?
                        </p>
                      </>
                    );
                  })()}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setPendingQuickWarning(null)}
                    className="flex-1 py-3 rounded-2xl border border-emerald-100 text-slate-600 font-bold hover:bg-emerald-50 transition-colors">
                    Raho
                  </button>
                  <button onClick={() => quickSave(pendingQuickWarning.customerId, pendingQuickWarning.customerName, pendingQuickWarning.amount)}
                    className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors">
                    Haan, Add Karo
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
