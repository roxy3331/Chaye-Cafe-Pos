import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gamepad2, Package, ShoppingCart, Coins, TrendingUp, TrendingDown, Wallet, Boxes,
  Trash2, Edit2, X, Loader2, User, Hash, AlertTriangle, Plus, Search, CheckCircle, History as HistoryIcon,
  ShieldCheck, RotateCcw, ChevronDown, Link2, UserCheck, Zap, ArrowLeftRight, Copy, KeyRound, Lock,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { NumberTicker, FlipIn, ShimmerSweep } from '../components/magicui';
import { TableWrapper } from '../components/TableWrapper';
import { useProfitVisibility } from '../context/ProfitVisibilityContext';
import { searchList, normalizeText } from '../lib/search';

// ── Constants ──────────────────────────────────────────────────────────────────

const UC_PRESETS = ['60 UC', '325 UC', '660 UC', '1800 UC', '3850 UC', '8100 UC'];
const CATEGORIES = ['UC', 'Account', 'Item'] as const;
type PubgCategory = (typeof CATEGORIES)[number];
type Tab = 'stock' | 'buy' | 'sell' | 'history';
const WARRANTY_SOON_DAYS = 3;
const LINK_PIN = '1234'; // warranty-proof links ka PIN — abhi hardcoded, baad mein settings se

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'stock', label: 'Stock', icon: <Package /> },
  { key: 'buy', label: 'Kharida', icon: <ShoppingCart /> },
  { key: 'sell', label: 'Becha', icon: <Coins /> },
  { key: 'history', label: 'History', icon: <HistoryIcon /> },
];

// Extract a clean message from either a plain Error or handleFirestoreError's JSON
const errText = (e: any): string => {
  const m = String(e?.message || '');
  if (m.startsWith('{')) {
    try { const j = JSON.parse(m); return j.message || j.error || 'Save nahi hua — dobara try karein'; } catch {}
  }
  return m || 'Kuch galat ho gaya';
};

const rs = (n: number) => `Rs ${Math.round(n).toLocaleString()}`;

const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Days left on a 'YYYY-MM-DD' warranty (negative = expired). EOD anchor avoids TZ flicker.
const daysUntilISO = (iso: string): number => {
  if (!iso) return Infinity;
  const end = new Date(`${iso}T23:59:59`).getTime();
  return Math.ceil((end - Date.now()) / 86400000);
};

type AccBadge = { dot: string; label: string; cls: string };
// 🟢 available · 🟠 expiring soon (≤3d) · 🔴 expired · 💰 sold · ↩ refunded · ⬜ no warranty
const accountBadge = (a: any): AccBadge => {
  if (a.status === 'sold') return { dot: '💰', label: 'Sold', cls: 'bg-blue-50 text-blue-600' };
  if (a.status === 'refunded') return { dot: '↩️', label: 'Refunded', cls: 'bg-slate-100 text-slate-500' };
  // BUG FIX: 0/null warranty → gray "No Warranty" — expiry math entirely skipped
  if (!a.warrantyDays || !(Number(a.warrantyDays) > 0)) return { dot: '⬜', label: 'No Warranty', cls: 'bg-slate-100 text-slate-500' };
  const days = daysUntilISO(a.expiryDate);
  if (days < 0) return { dot: '🔴', label: 'Expired', cls: 'bg-red-100 text-red-600' };
  if (days <= WARRANTY_SOON_DAYS) return { dot: '🟠', label: `Expiring ${days}d`, cls: 'bg-orange-50 text-orange-600' };
  return { dot: '🟢', label: 'Available', cls: 'bg-emerald-50 text-emerald-700' };
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
// Login transfer pending + 7 din se zyada → "Logins Change Karwao" alert
const isLoginTransferOverdue = (sale: any): boolean => {
  if (sale?.loginStatus !== 'pending' || !sale.loginTransferDate || sale.refunded) return false;
  const t = sale.loginTransferDate?.toDate?.()?.getTime?.()
    ?? (typeof sale.loginTransferDate === 'number' ? sale.loginTransferDate : 0);
  return t > 0 && (Date.now() - t) > SEVEN_DAYS_MS;
};

// ── Screen ─────────────────────────────────────────────────────────────────────

export const Pubg: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const { showToast } = useToast();
  const { formatProfit } = useProfitVisibility();

  const [items, setItems] = React.useState<any[]>([]);
  const [sales, setSales] = React.useState<any[]>([]);
  const [purchases, setPurchases] = React.useState<any[]>([]);
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [directEntries, setDirectEntries] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<Tab>('stock');

  // Stock tab
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [detailCard, setDetailCard] = React.useState<any | null>(null); // mobile card tap → modal

  // Buy form (quick UC/Item — unchanged logic)
  const [buyMode, setBuyMode] = React.useState<'quick' | 'account'>('quick');
  const [buyName, setBuyName] = React.useState('');
  const [buyCategory, setBuyCategory] = React.useState<PubgCategory>('UC');
  const [buyQty, setBuyQty] = React.useState('1');
  const [buyCost, setBuyCost] = React.useState('');
  const [buySell, setBuySell] = React.useState('');
  const [buySource, setBuySource] = React.useState('');
  const [buyShowDropdown, setBuyShowDropdown] = React.useState(false);
  const [buySaving, setBuySaving] = React.useState(false);

  // Buy form — ACCOUNT (serial stock-in)
  const [accName, setAccName] = React.useState('');
  const [accCharacterId, setAccCharacterId] = React.useState('');
  const [accBoughtFrom, setAccBoughtFrom] = React.useState<'Customer' | 'Seller'>('Customer');
  const [accOwnerName, setAccOwnerName] = React.useState('');
  const [accOwnerCnic, setAccOwnerCnic] = React.useState('');
  const [accWarrantyLink, setAccWarrantyLink] = React.useState('');
  const [accRecoveryCode, setAccRecoveryCode] = React.useState('');
  const [accBuyingPrice, setAccBuyingPrice] = React.useState('');
  const [accWarrantyDays, setAccWarrantyDays] = React.useState('7');
  const [accMoreOpen, setAccMoreOpen] = React.useState(false); // warranty accordion
  const [accSaving, setAccSaving] = React.useState(false);

  // PIN-locked links — warranty proof links sirf unlock ke baad dikhte hain (session-wide)
  const [isPinUnlocked, setIsPinUnlocked] = React.useState(false);
  const [showPinModal, setShowPinModal] = React.useState(false);
  const [pinInput, setPinInput] = React.useState('');

  // Edit Logins — loginEmail/loginPassword baad mein add/update (Add form mein nahi)
  const [editLoginsAcc, setEditLoginsAcc] = React.useState<any | null>(null);
  const [editLoginsEmail, setEditLoginsEmail] = React.useState('');
  const [editLoginsPassword, setEditLoginsPassword] = React.useState('');
  const [editLoginsSaving, setEditLoginsSaving] = React.useState(false);

  const openEditLogins = React.useCallback((acc: any) => {
    setEditLoginsAcc(acc);
    setEditLoginsEmail(acc.loginEmail || '');
    setEditLoginsPassword(acc.loginPassword || '');
  }, []);

  const handleSaveLogins = () => {
    if (!editLoginsAcc) return;
    const accId = editLoginsAcc.id;
    const email = editLoginsEmail || undefined;
    const password = editLoginsPassword || undefined;
    showToast('Logins save ho gaye 🔐 (PIN ke baad dikhte hain)', 'success');
    setEditLoginsAcc(null);
    setEditLoginsSaving(true);
    dataService.updatePubgAccountLogins(accId, email, password)
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setEditLoginsSaving(false));
  };

  const handlePinUnlock = () => {
    if (pinInput === LINK_PIN) {
      setIsPinUnlocked(true);
      setShowPinModal(false);
      setPinInput('');
      showToast('Sensitive data unlock ho gaya ✅', 'success');
    } else {
      showToast('Ghalat PIN — dobara try karein', 'error');
    }
  };

  // Sell form (stock)
  const [sellMode, setSellMode] = React.useState<'stock' | 'direct'>('stock');
  const [sellItemId, setSellItemId] = React.useState('');
  const [sellQty, setSellQty] = React.useState('1');
  const [sellPrice, setSellPrice] = React.useState('');
  const [sellFee, setSellFee] = React.useState('');
  const [sellCustomer, setSellCustomer] = React.useState('');
  const [sellPlayerId, setSellPlayerId] = React.useState('');
  const [sellNote, setSellNote] = React.useState('');
  const [sellSaving, setSellSaving] = React.useState(false);

  // Sell form — DIRECT (no stock): UC / USDT / Account / Other
  const [duCategory, setDuCategory] = React.useState<'UC' | 'USDT' | 'Account' | 'Other'>('UC');
  const [duName, setDuName] = React.useState('60 UC');
  const [duQty, setDuQty] = React.useState('1');
  const [duBuy, setDuBuy] = React.useState('');
  const [duSale, setDuSale] = React.useState('');
  const [duFee, setDuFee] = React.useState('');
  const [duSaving, setDuSaving] = React.useState(false);

  // Account sale modal (from stock tab)
  const [saleAcc, setSaleAcc] = React.useState<any | null>(null);
  const [accSalePrice, setAccSalePrice] = React.useState('');
  const [accSaleFee, setAccSaleFee] = React.useState('');
  const [accSaleCustomer, setAccSaleCustomer] = React.useState('');
  const [accSaleLoginStatus, setAccSaleLoginStatus] = React.useState<'instant' | 'pending'>('instant');
  const [accSaleRecoveryCode, setAccSaleRecoveryCode] = React.useState('');
  const [accSaleSaving, setAccSaleSaving] = React.useState(false);

  // Sell tab — account login transfer + recovery
  const [sellLoginStatus, setSellLoginStatus] = React.useState<'instant' | 'pending'>('instant');
  const [sellRecoveryCode, setSellRecoveryCode] = React.useState('');

  // Secure vault copy — clipboard + toast
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copy ho gaya ✅`, 'success');
    } catch {
      showToast('Copy nahi hua — manually note kar lein', 'error');
    }
  };

  // Refund modal
  const [refundSale, setRefundSale] = React.useState<any | null>(null);
  const [refundRestock, setRefundRestock] = React.useState(true);
  const [refundReason, setRefundReason] = React.useState('');
  const [refundBusy, setRefundBusy] = React.useState(false);

  // Direct profit/loss/expense
  const [directOpen, setDirectOpen] = React.useState(false);
  const [directType, setDirectType] = React.useState<'profit' | 'loss' | 'expense'>('profit');
  const [directAmount, setDirectAmount] = React.useState('');
  const [directDesc, setDirectDesc] = React.useState('');
  const [directDate, setDirectDate] = React.useState(todayISO());
  const [directSaving, setDirectSaving] = React.useState(false);

  // History tab
  const [historyFilter, setHistoryFilter] = React.useState<'all' | 'purchase' | 'sale' | 'account' | 'direct' | 'month'>('all');
  const [deleteEntry, setDeleteEntry] = React.useState<any | null>(null); // { kind, ... }
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  // Edit item modal
  const [editItem, setEditItem] = React.useState<any | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editCategory, setEditCategory] = React.useState<PubgCategory>('UC');
  const [editSellPrice, setEditSellPrice] = React.useState('');
  const [editSaving, setEditSaving] = React.useState(false);

  // ── Data (real-time, 5s safety fallback — same as Stock.tsx) ────────────────
  React.useEffect(() => {
    let timeout: any;
    const done = () => { setLoading(false); if (timeout) clearTimeout(timeout); };
    const u1 = dataService.subscribeToPubgItems((d: any[]) => { setItems(d); done(); });
    const u2 = dataService.subscribeToPubgSales((d: any[]) => setSales(d));
    const u3 = dataService.subscribeToPubgPurchases((d: any[]) => setPurchases(d));
    const u4 = dataService.subscribeToPubgAccounts((d: any[]) => {
      setAccounts([...d].sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    const u5 = dataService.subscribeToPubgDirectEntries((d: any[]) => setDirectEntries(d));
    timeout = setTimeout(() => setLoading(false), 5000);
    return () => { u1(); u2(); u3(); u4(); u5(); if (timeout) clearTimeout(timeout); };
  }, []);

  // ── Derived stats — UNIFIED: (Account − Refunds) + UC + Direct Profit − Direct Loss ──
  const stats = React.useMemo(() => {
    const itemsInvested = items.reduce((a, i) => a + (Number(i.totalInvested) || 0), 0);
    const availableAccounts = accounts.filter(a => a.status === 'available');
    const accountsInvested = availableAccounts.reduce((a, x) => a + (Number(x.buyingPrice) || 0), 0);
    const invested = itemsInvested + accountsInvested;
    // Stock value: available accounts = buyingPrice · legacy Account items = buyingPrice (qty 1) · UC/items = qty × sellRate
    const itemsSellValue = items
      .filter(i => i.status !== 'sold')
      .reduce((a, i) => a + (i.category === 'Account'
        ? (Number(i.buyingPrice) || 0)
        : (Number(i.quantity) || 0) * (Number(i.sellPrice) || 0)), 0);
    const stockValue = itemsSellValue + accountsInvested;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let today = 0, month = 0, accProfit = 0, ucProfit = 0, directSalesProfit = 0, refundedProfit = 0;

    sales.forEach(s => {
      const p = Number(s.profit) || 0;
      if (s.refunded) { refundedProfit += p; return; }  // reversed — excluded everywhere
      if (s.saleType === 'account') accProfit += p;
      else if (s.saleType === 'direct-uc') directSalesProfit += p;
      else ucProfit += p;
      const d = s.date?.toDate?.();
      if (d) {
        const t = d.getTime();
        if (t >= todayStart) today += p;
        if (t >= monthStart) month += p;
      }
    });

    let directProfit = 0, directLoss = 0, directExpense = 0;
    directEntries.forEach(e => {
      const amt = Number(e.amount) || 0;
      if (e.type === 'profit') directProfit += amt;
      else if (e.type === 'loss') directLoss += amt;
      else directExpense += amt;
      const d = e.date?.toDate?.();
      if (d) {
        const sign = e.type === 'profit' ? 1 : e.type === 'loss' ? -1 : 0; // expense ∉ net formula
        const t = d.getTime();
        if (sign && t >= todayStart) today += sign * amt;
        if (sign && t >= monthStart) month += sign * amt;
      }
    });

    const net = accProfit + ucProfit + directSalesProfit + directProfit - directLoss;
    return { invested, stockValue, expected: stockValue - invested, today, month, total: net, accProfit, ucProfit, directSalesProfit, directProfit, directLoss, directExpense, refundedProfit };
  }, [items, sales, accounts, directEntries]);

  // Monthly chart (last 6 months) — sales (ex-refunds) + direct net
  const chartData = React.useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach(s => {
      if (s.refunded) return;
      const d = s.date?.toDate?.() ?? (s.date ? new Date(s.date) : null);
      if (!d) return;
      map.set(monthKeyOf(d), (map.get(monthKeyOf(d)) || 0) + (Number(s.profit) || 0));
    });
    directEntries.forEach(e => {
      const d = e.date?.toDate?.();
      if (!d) return;
      const sign = e.type === 'profit' ? 1 : e.type === 'loss' ? -1 : 0;
      if (!sign) return;
      map.set(monthKeyOf(d), (map.get(monthKeyOf(d)) || 0) + sign * (Number(e.amount) || 0));
    });
    const out: { label: string; profit: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKeyOf(d);
      out.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), profit: Math.round(map.get(key) || 0) });
    }
    return out;
  }, [sales, directEntries]);

  // Sirf 'available' accounts — sell dropdown + stock list dono me (sold/refunded History me rehte hain)
  const availableAccounts = React.useMemo(() => accounts.filter(a => a.status === 'available'), [accounts]);

  const filteredItems = React.useMemo(() => {
    let list = items.filter(i => i.status !== 'sold');   // legacy sold account items hidden
    if (categoryFilter && categoryFilter !== 'Account') list = list.filter(i => i.category === categoryFilter);
    else if (categoryFilter === 'Account') list = [];
    if (search.trim()) list = searchList(search, list as any[], i => i.name, 100);
    return list;
  }, [items, categoryFilter, search]);

  const filteredAccounts = React.useMemo(() => {
    if (categoryFilter && categoryFilter !== 'Account') return [];
    let list = availableAccounts;                        // available ONLY
    if (search.trim()) list = searchList(search, list as any[], (i: any) => `${i.name} ${i.ownerName || ''}`, 100);
    return list;
  }, [availableAccounts, categoryFilter, search]);

  const sellableItems = React.useMemo(() => items.filter(i => (Number(i.quantity) || 0) > 0), [items]);
  const sellItem = sellableItems.find(i => i.id === sellItemId) || null;
  // Sell tab: dropdown se account select ho sakta hai (pubgAccounts collection)
  const sellAccount = availableAccounts.find(a => a.id === sellItemId) || null;

  // Stable row actions — memoized table rows ke liye props identity stable rehti hai
  const detailAccount = React.useCallback((a: any) => setDetailCard({ type: 'account', ...a }), []);
  const detailItem = React.useCallback((i: any) => setDetailCard({ type: 'item', ...i }), []);
  const detailHistory = React.useCallback((e: any) => setDetailCard({ type: 'history', ...e }), []);
  const openSaleAcc = React.useCallback((a: any) => {
    setSaleAcc(a); setAccSalePrice(''); setAccSaleFee(''); setAccSaleCustomer(''); setAccSaleLoginStatus('instant'); setAccSaleRecoveryCode(a.recoveryCode || '');
  }, []);
  const deleteRow = React.useCallback((kind: string, e: any) => setDeleteEntry({ kind, ...e }), []);
  const showPin = React.useCallback(() => setShowPinModal(true), []);
  const sellRowItem = React.useCallback((item: any) => {
    setSellItemId(item.id);
    setSellRecoveryCode('');
    setSellLoginStatus('instant');
    setSellPrice(item.sellPrice ? String(item.sellPrice) : '');
    setSellQty('1'); setSellFee('');
    setTab('sell');
  }, []);

  // ── Buy form (quick UC/Item) ─────────────────────────────────────────────────
  const existingNameMatch = buyName.trim()
    ? items.find(i => normalizeText(i.name) === normalizeText(buyName))
    : undefined;
  const buySuggestions = React.useMemo(() => {
    if (!buyName.trim() || existingNameMatch) return [];
    return searchList(buyName, items as any[], i => i.name, 5);
  }, [buyName, items, existingNameMatch]);

  const buyQtyN = parseFloat(buyQty) || 0;
  const buyCostN = parseFloat(buyCost) || 0;
  const buyTotal = buyQtyN * buyCostN;

  // ── Optimistic UI: toast + form reset turant, Firebase background mein sync ──
  const handleBuy = () => {
    if (!buyName.trim()) { showToast('Item ka naam likhein', 'warning'); return; }
    if (buyQtyN <= 0) { showToast('Quantity sahi likhein', 'warning'); return; }
    if (buyCostN < 0 || buyCost === '') { showToast('Cost sahi likhein', 'warning'); return; }
    if (!existingNameMatch && !(parseFloat(buySell) > 0)) {
      showToast('Naye item ka sell price zaroori hai', 'warning'); return;
    }
    const payload = {
      name: buyName.trim(),
      category: buyCategory,
      quantity: buyQtyN,
      unitCost: buyCostN,
      sellPrice: parseFloat(buySell) || undefined,
      source: buySource || undefined,
    };
    showToast(`Kharida record ho gaya ✅ (${payload.name} × ${payload.quantity})`, 'success');
    setBuyName(''); setBuyQty('1'); setBuyCost(''); setBuySell(''); setBuySource('');
    setTab('stock');
    dataService.addPubgPurchase(payload)
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setBuySaving(false));
  };

  // ── Buy form — ACCOUNT stock-in ──────────────────────────────────────────────
  const accPriceN = parseFloat(accBuyingPrice) || 0;
  const accWarrantyN = parseInt(accWarrantyDays) || 0;
  // BUG FIX: 0 din → koi expiry calculate nahi hoti
  const accExpiryPreview = React.useMemo(() => {
    if (accWarrantyN <= 0) return 'No warranty';
    const d = new Date();
    d.setDate(d.getDate() + accWarrantyN);
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [accWarrantyN]);

  // keepSellerMeta=true → "Save & Add Another": Seller/CNIC/warranty intact for bulk entry
  const handleAccountBuy = (keepSellerMeta: boolean) => {
    if (!accName.trim()) { showToast('Account ka naam likhein', 'warning'); return; }
    if (!accOwnerName.trim()) { showToast('Owner ka naam likhein', 'warning'); return; }
    if (accBuyingPrice === '' || accPriceN < 0) { showToast('Buying price sahi likhein', 'warning'); return; }
    if (accWarrantyDays === '' || accWarrantyN < 0) { showToast('Warranty days sahi likhein', 'warning'); return; }
    const payload = {
      name: accName.trim(),
      characterId: accCharacterId || undefined,
      boughtFrom: accBoughtFrom,
      ownerName: accOwnerName.trim(),
      ownerCnic: accOwnerCnic || undefined,
      warrantyLink: accWarrantyLink || undefined,
      recoveryCode: accRecoveryCode || undefined,
      buyingPrice: accPriceN,
      warrantyDays: accWarrantyN,
    };
    showToast(`Account stock me add ✅ ${accWarrantyN > 0 ? `Warranty: ${accExpiryPreview}` : 'No Warranty'}`, 'success');
    if (keepSellerMeta) {
      // bulk entry: sirf account-specific fields reset
      setAccName(''); setAccCharacterId(''); setAccBuyingPrice(''); setAccRecoveryCode('');
    } else {
      setAccName(''); setAccCharacterId(''); setAccOwnerName(''); setAccOwnerCnic('');
      setAccWarrantyLink(''); setAccBuyingPrice(''); setAccRecoveryCode('');
      setTab('stock');
    }
    dataService.addPubgAccount(payload)
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setAccSaving(false));
  };

  // ── Sell form (stock, fee-aware) ─────────────────────────────────────────────
  const sellQtyN = parseFloat(sellQty) || 0;
  const sellPriceN = parseFloat(sellPrice) || 0;
  const sellFeeN = parseFloat(sellFee) || 0;
  // Account selected → qty 1, cost = buyingPrice (stock nahi ghat-ta, status flip hota hai)
  const previewCost = sellAccount
    ? (Number(sellAccount.buyingPrice) || 0)
    : (sellItem ? (Number(sellItem.buyPrice) || 0) * sellQtyN : 0);
  const previewAmount = sellAccount ? sellPriceN : sellPriceN * sellQtyN;
  const previewProfit = previewAmount - previewCost - sellFeeN; // Net = sale − cost − platform fee

  const handleItemPick = (id: string) => {
    setSellItemId(id);
    const it = items.find(i => i.id === id);
    const acc = availableAccounts.find(a => a.id === id);
    // Account pick → recovery code prefill + login status reset
    setSellRecoveryCode(acc?.recoveryCode || '');
    setSellLoginStatus('instant');
    if (it) setSellPrice(it.sellPrice ? String(it.sellPrice) : '');
    else setSellPrice(''); // account select hua — purani price clear
  };

  const handleSell = () => {
    // ACCOUNT sale — atomic service call: sale doc + account status→'sold' ek hi batch me
    if (sellAccount) {
      if (sellPrice === '' || sellPriceN < 0) { showToast('Price sahi likhein', 'warning'); return; }
      const acc = sellAccount;
      showToast(previewProfit >= 0 ? `Account bech diya ✅ Profit: ${formatProfit(previewProfit)}` : `Account becha ⚠️ Loss: ${formatProfit(Math.abs(previewProfit))}`, previewProfit >= 0 ? 'success' : 'warning');
      setSellItemId(''); setSellQty('1'); setSellPrice(''); setSellFee(''); setSellCustomer(''); setSellPlayerId(''); setSellNote('');
      setSellLoginStatus('instant'); setSellRecoveryCode('');
      setTab('history');
      setSellSaving(true);
      dataService.addPubgAccountSale({
        accountId: acc.id,
        salePrice: sellPriceN,
        platformFee: sellFeeN || undefined,
        customerName: sellCustomer || undefined,
        loginStatus: sellLoginStatus,
        recoveryCode: sellRecoveryCode || undefined,
      })
        .catch((e: any) => showToast(errText(e), 'error'))
        .finally(() => setSellSaving(false));
      return;
    }
    if (!sellItem) { showToast('Item select karein', 'warning'); return; }
    if (sellQtyN <= 0) { showToast('Quantity sahi likhein', 'warning'); return; }
    if (sellQtyN > (Number(sellItem.quantity) || 0)) {
      showToast(`Stock kam hai — sirf ${sellItem.quantity} maujood`, 'warning'); return;
    }
    if (sellPrice === '' || sellPriceN < 0) { showToast('Price sahi likhein', 'warning'); return; }
    const item = sellItem;
    const msg = previewProfit >= 0
      ? `Sale record ho gayi ✅ Profit: ${formatProfit(previewProfit)}`
      : `Sale record ho gayi ✅ Loss: ${formatProfit(Math.abs(previewProfit))}`;
    showToast(msg, previewProfit >= 0 ? 'success' : 'warning');
    setSellQty('1'); setSellCustomer(''); setSellPlayerId(''); setSellNote(''); setSellFee('');
    setTab('history');
    setSellSaving(true);
    dataService.addPubgSale({
      itemId: item.id,
      quantity: sellQtyN,
      unitPrice: sellPriceN,
      platformFee: sellFeeN || undefined,
      customerName: sellCustomer || undefined,
      playerId: sellPlayerId || undefined,
      note: sellNote || undefined,
    })
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setSellSaving(false));
  };

  // ── UC DIRECT sale (no stock) ────────────────────────────────────────────────
  const duQtyN = parseFloat(duQty) || 0;
  const duBuyN = parseFloat(duBuy) || 0;
  const duSaleN = parseFloat(duSale) || 0;
  const duFeeN = parseFloat(duFee) || 0;
  const duProfit = (duSaleN - duBuyN) * duQtyN - duFeeN;

  const handleDirectUcSale = () => {
    if (duQtyN <= 0) { showToast('Quantity sahi likhein', 'warning'); return; }
    if (duBuy === '' || duBuyN < 0 || duSale === '' || duSaleN < 0) { showToast('Buy/Sale price sahi likhein', 'warning'); return; }
    showToast(duProfit >= 0 ? `UC direct sale ✅ Profit: ${formatProfit(duProfit)}` : `UC direct sale ⚠️ Loss: ${formatProfit(Math.abs(duProfit))}`, duProfit >= 0 ? 'success' : 'warning');
    setDuQty('1'); setDuBuy(''); setDuSale(''); setDuFee('');
    setTab('history');
    setDuSaving(true);
    dataService.addPubgDirectUcSale({
      name: duName.trim() || `${duCategory} Direct`,
      directCategory: duCategory,
      quantity: duQtyN,
      buyPrice: duBuyN,
      salePrice: duSaleN,
      platformFee: duFeeN || undefined,
    })
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setDuSaving(false));
  };

  // ── Account sale modal ───────────────────────────────────────────────────────
  const accSalePriceN = parseFloat(accSalePrice) || 0;
  const accSaleFeeN = parseFloat(accSaleFee) || 0;
  const accSaleProfit = saleAcc ? accSalePriceN - (Number(saleAcc.buyingPrice) || 0) - accSaleFeeN : 0;

  const handleAccountSale = () => {
    if (!saleAcc) return;
    if (accSalePrice === '' || accSalePriceN < 0) { showToast('Sale price sahi likhein', 'warning'); return; }
    const acc = saleAcc;
    showToast(accSaleProfit >= 0 ? `Account bech diya ✅ Profit: ${formatProfit(accSaleProfit)}` : `Account becha ⚠️ Loss: ${formatProfit(Math.abs(accSaleProfit))}`, accSaleProfit >= 0 ? 'success' : 'warning');
    setSaleAcc(null); setAccSalePrice(''); setAccSaleFee(''); setAccSaleCustomer('');
    setAccSaleLoginStatus('instant'); setAccSaleRecoveryCode('');
    setAccSaleSaving(true);
    dataService.addPubgAccountSale({
      accountId: acc.id,
      salePrice: accSalePriceN,
      platformFee: accSaleFeeN || undefined,
      customerName: accSaleCustomer || undefined,
      loginStatus: accSaleLoginStatus,
      recoveryCode: accSaleRecoveryCode || undefined,
    })
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setAccSaleSaving(false));
  };

  // ── Refund / reversal ────────────────────────────────────────────────────────
  const openRefund = React.useCallback((s: any) => {
    setRefundSale(s);
    setRefundRestock(true); // default: account wapas stock me
    setRefundReason('');
  }, []);

  const handleRefund = async () => {
    if (!refundSale) return;
    setRefundBusy(true);
    try {
      await dataService.refundPubgSale({
        saleId: refundSale.id,
        restock: refundRestock,
        reason: refundReason || undefined,
      });
      showToast(`Refund ho gaya ✅ Profit (${formatProfit(Number(refundSale.profit) || 0, true)}) hisaab se kat gaya`, 'success');
      setRefundSale(null);
    } catch (e: any) {
      showToast(errText(e), 'error');
    } finally {
      setRefundBusy(false);
    }
  };

  // ── Direct profit/loss/expense ───────────────────────────────────────────────
  const handleDirectEntry = () => {
    const amt = parseFloat(directAmount) || 0;
    if (amt <= 0) { showToast('Amount sahi likhein', 'warning'); return; }
    const label = directType === 'profit' ? `Munafa +${formatProfit(amt)}` : directType === 'loss' ? `Nuqsan −${formatProfit(amt)}` : `Kharcha ${rs(amt)}`;
    showToast(`Entry add ✅ ${label}`, 'success');
    setDirectAmount(''); setDirectDesc(''); setDirectDate(todayISO());
    setDirectSaving(true);
    dataService.addPubgDirectEntry({
      type: directType,
      amount: amt,
      description: directDesc || undefined,
      dateISO: directDate || undefined,
    })
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setDirectSaving(false));
  };

  // ── History ──────────────────────────────────────────────────────────────────
  const historyEntries = React.useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const list: any[] = [];
    purchases.forEach(p => list.push({ kind: 'purchase', ...p }));
    sales.forEach(s => list.push({ kind: 'sale', ...s }));
    directEntries.forEach(e => list.push({ kind: 'direct', ...e }));
    list.sort((a, b) => {
      const da = a.date?.toDate?.()?.getTime() ?? 0;
      const db = b.date?.toDate?.()?.getTime() ?? 0;
      return db - da;
    });
    if (historyFilter === 'purchase') return list.filter(e => e.kind === 'purchase');
    if (historyFilter === 'sale') return list.filter(e => e.kind === 'sale');
    if (historyFilter === 'account') return list.filter(e => e.kind === 'sale' && e.saleType === 'account');
    if (historyFilter === 'direct') return list.filter(e => e.kind === 'direct');
    if (historyFilter === 'month') return list.filter(e => (e.date?.toDate?.()?.getTime() ?? 0) >= monthStart);
    return list;
  }, [purchases, sales, directEntries, historyFilter]);

  // Profit breakdown (History) — Accounts vs UC vs Direct
  const breakdown = React.useMemo(() => {
    const rows = [
      { key: 'account', label: '👤 Accounts', amount: stats.accProfit, cls: 'bg-emerald-600' },
      { key: 'uc', label: '💎 UC + Items', amount: stats.ucProfit, cls: 'bg-sky-500' },
      { key: 'direct-sales', label: '💵 Direct Sales', amount: stats.directSalesProfit, cls: 'bg-amber-500' },
      { key: 'direct', label: '⚡ Misc (net)', amount: stats.directProfit - stats.directLoss, cls: 'bg-violet-500' },
    ];
    const posTotal = rows.reduce((a, r) => a + Math.max(0, r.amount), 0) || 1;
    return { rows, posTotal };
  }, [stats]);

  const confirmDeleteEntry = async () => {
    if (!deleteEntry) return;
    setDeleteBusy(true);
    try {
      if (deleteEntry.kind === 'sale') {
        await dataService.deletePubgSale({
          id: deleteEntry.id,
          itemId: deleteEntry.itemId,
          quantity: Number(deleteEntry.quantity) || 0,
          unitCost: Number(deleteEntry.unitCost) || 0,
        });
        showToast('Sale delete — stock wapis restore ✅', 'success');
      } else if (deleteEntry.kind === 'direct') {
        await dataService.deletePubgDirectEntry(deleteEntry.id);
        showToast('Direct entry delete ho gayi ✅', 'success');
      } else if (deleteEntry.kind === 'account') {
        if (deleteEntry.status === 'sold' && !deleteEntry.refunded) {
          showToast('Pehle sale refund karein (History tab) — phir delete', 'warning');
          setDeleteEntry(null);
          return;
        }
        await dataService.deletePubgAccount(deleteEntry.id);
        showToast('Account delete ho gaya ✅', 'success');
      } else {
        await dataService.deletePubgPurchase({
          id: deleteEntry.id,
          name: deleteEntry.name,
          quantity: Number(deleteEntry.quantity) || 0,
          totalCost: Number(deleteEntry.totalCost) || 0,
        });
        showToast('Purchase delete — stock adjust ho gaya ✅', 'success');
      }
      setDeleteEntry(null);
    } catch (e: any) {
      showToast(errText(e), 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  // ── Edit item ────────────────────────────────────────────────────────────────
  const openEdit = React.useCallback((item: any) => {
    setEditItem(item);
    setEditName(item.name || '');
    setEditCategory((item.category as PubgCategory) || 'Item');
    setEditSellPrice(item.sellPrice ? String(item.sellPrice) : '');
  }, []);

  const handleSaveEdit = () => {
    if (!editItem) return;
    if (!editName.trim()) { showToast('Item ka naam likhein', 'warning'); return; }
    const id = editItem.id;
    const updates = {
      name: editName.trim(),
      category: editCategory,
      sellPrice: parseFloat(editSellPrice) || 0,
    };
    showToast('Item update ho gaya ✅', 'success');
    setEditItem(null);
    setEditSaving(true);
    dataService.updatePubgItem(id, updates)
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setEditSaving(false));
  };

  const inputCls = 'w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl text-xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5';
  const labelCls = 'text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1';

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-emerald-900/40">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="font-bold uppercase text-xs tracking-widest">PUBG Hisab load ho raha hai...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-900 rounded-2xl flex items-center justify-center text-white">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-emerald-900">PUBG Hisab</h1>
          </div>
          <p className="text-slate-500 text-lg mt-2 max-w-lg">UC, accounts, direct sales aur munafa — sab yahan.</p>
        </div>
      </div>

      {/* Stats bento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        <FlipIn delay={0}>
          <ShimmerSweep delay={0.3}>
            <div className="glass-card p-4 md:p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-900"><Wallet className="w-4 h-4" /></div>
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Lagaya Hua</p>
              <h3 className="text-xl md:text-2xl font-bold text-emerald-900 mt-0.5">Rs <NumberTicker value={Math.round(stats.invested)} /></h3>
              <p className="text-[10px] text-slate-400 italic mt-2 pt-2 border-t border-emerald-50/50">Stock + {accounts.filter(a => a.status === 'available').length} accounts</p>
            </div>
          </ShimmerSweep>
        </FlipIn>
        <FlipIn delay={0.08}>
          <ShimmerSweep delay={0.35}>
            <div className="glass-card p-4 md:p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-900"><Boxes className="w-4 h-4" /></div>
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Stock Value</p>
              <h3 className="text-xl md:text-2xl font-bold text-emerald-900 mt-0.5">Rs <NumberTicker value={Math.round(stats.stockValue)} /></h3>
              <p className="text-[10px] text-slate-400 italic mt-2 pt-2 border-t border-emerald-50/50">Bechne ke rate se · Expected: {formatProfit(stats.expected, true)}</p>
            </div>
          </ShimmerSweep>
        </FlipIn>
        <FlipIn delay={0.16}>
          <ShimmerSweep delay={0.4}>
            <div className="glass-card p-4 md:p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-900"><Coins className="w-4 h-4" /></div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Aaj</span>
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Munafa Aaj</p>
              <h3 className={cn('text-xl md:text-2xl font-bold mt-0.5', stats.today < 0 ? 'text-red-500' : 'text-emerald-900')}>
                {formatProfit(stats.today, true)}
              </h3>
              <p className="text-[10px] text-slate-400 italic mt-2 pt-2 border-t border-emerald-50/50">Unified total: {formatProfit(stats.total, true)}</p>
            </div>
          </ShimmerSweep>
        </FlipIn>
        <FlipIn delay={0.24}>
          <ShimmerSweep delay={0.45}>
            <div className="glass-card p-4 md:p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-900">
                  {stats.month < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Mahina</span>
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Net Munafa Is Mahine</p>
              <h3 className={cn('text-xl md:text-2xl font-bold mt-0.5', stats.month < 0 ? 'text-red-500' : 'text-emerald-900')}>
                {formatProfit(stats.month, true)}
              </h3>
              <p className="text-[10px] text-slate-400 italic mt-2 pt-2 border-t border-emerald-50/50">
                Refunds kat chuke: {formatProfit(stats.refundedProfit, true)}
              </p>
            </div>
          </ShimmerSweep>
        </FlipIn>
      </div>

      {/* Tabs — sticky under top bar */}
      <div className="sticky top-14 md:top-2 z-30 -mx-1 px-1 py-1">
        <div className="glass-card rounded-full p-1.5 flex gap-1 overflow-x-auto shadow-lg">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-4 md:px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all',
                tab === t.key ? 'bg-emerald-900 text-white shadow-lg shadow-emerald-900/10' : 'text-slate-500 hover:bg-emerald-50'
              )}
            >
              {React.cloneElement(t.icon as React.ReactElement, { className: 'w-4 h-4' })}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          {/* ════════ STOCK TAB — mobile cards + desktop table ════════ */}
          {tab === 'stock' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="glass-card rounded-3xl p-4 md:p-6 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategoryFilter(null)}
                    className={cn('px-4 py-2.5 rounded-2xl text-xs font-bold border transition-colors',
                      !categoryFilter ? 'bg-emerald-900 border-emerald-900 text-white' : 'bg-emerald-50/60 border-emerald-100 text-slate-600 hover:bg-emerald-50')}
                  >Sab ({items.filter(i => i.status !== 'sold').length + availableAccounts.length})</button>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setCategoryFilter(c)}
                      className={cn('px-4 py-2.5 rounded-2xl text-xs font-bold border transition-colors',
                        categoryFilter === c ? 'bg-emerald-900 border-emerald-900 text-white' : 'bg-emerald-50/60 border-emerald-100 text-slate-600 hover:bg-emerald-50')}
                    >{c === 'UC' ? '💎 UC' : c === 'Account' ? '👤 Accounts' : '📦 Item'} ({c === 'Account' ? availableAccounts.length : items.filter(i => i.category === c && i.status !== 'sold').length})</button>
                  ))}
                </div>
                <div className="relative w-full md:w-64 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-emerald-700" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-md border border-emerald-50 rounded-2xl text-sm font-medium text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5"
                  />
                </div>
              </div>

              {/* ── ACCOUNTS (serial stock + warranty) ── */}
              {filteredAccounts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 px-2">
                    <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-widest">👤 Accounts — Warranty Tracker</h3>
                    {!isPinUnlocked ? (
                      <button onClick={() => setShowPinModal(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wide hover:bg-slate-200 transition-colors">
                        🔓 Unlock
                      </button>
                    ) : (
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">🔓 Unlocked</span>
                    )}
                  </div>

                  {/* Mobile cards — Name + Status + Profit/Loss only, tap = details */}
                  <div className="block md:hidden space-y-3">
                    {filteredAccounts.map(a => {
                      const b = accountBadge(a);
                      const profit = a.status === 'sold' ? (Number(a.soldPrice) || 0) - (Number(a.buyingPrice) || 0) : null;
                      return (
                        <div key={a.id} onClick={() => setDetailCard({ type: 'account', ...a })} role="button" tabIndex={0}
                          className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform cursor-pointer">
                          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-900 flex items-center justify-center shrink-0"><UserCheck className="w-5 h-5" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-emerald-900 truncate">{a.name}</p>
                            <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest', b.cls)}>{b.dot} {b.label}</span>
                            {a.recoveryCode && (
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">RC: {a.recoveryCode}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {profit !== null ? (
                              <p className={cn('text-sm font-black', profit < 0 ? 'text-red-500' : 'text-emerald-600')}>{formatProfit(profit, true)}</p>
                            ) : (
                              <p className="text-sm font-bold text-slate-500">{rs(Number(a.buyingPrice) || 0)}</p>
                            )}
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{profit !== null ? 'profit' : 'cost'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop table — TableWrapper scroll + memoized rows */}
                  <div className="hidden md:block glass-card rounded-3xl overflow-hidden">
                    <TableWrapper>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-emerald-50">
                            <th className="px-5 py-4">Account</th>
                            <th className="px-5 py-4">Owner</th>
                            <th className="px-5 py-4">Source</th>
                            <th className="px-5 py-4 text-right">Buying</th>
                            <th className="px-5 py-4">Warranty</th>
                            <th className="px-5 py-4 text-right">Profit/Loss</th>
                            <th className="px-5 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAccounts.map(a => (
                            <AccountRow
                              key={a.id}
                              a={a}
                              isPinUnlocked={isPinUnlocked}
                              userRole={userRole}
                              onShowPin={showPin}
                              onEditLogins={openEditLogins}
                              onSell={openSaleAcc}
                              onDelete={deleteRow}
                            />
                          ))}
                        </tbody>
                      </table>
                    </TableWrapper>
                  </div>
                </div>
              )}

              {/* ── STOCK ITEMS (UC / Items) ── */}
              {filteredItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-widest px-2">💎 UC & Items</h3>

                  {/* Mobile cards */}
                  <div className="block md:hidden space-y-3">
                    {filteredItems.map(item => {
                      const qty = Number(item.quantity) || 0;
                      const margin = (Number(item.sellPrice) || 0) - (Number(item.buyPrice) || 0);
                      return (
                        <button key={item.id} onClick={() => setDetailCard({ type: 'item', ...item })}
                          className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
                          <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white',
                            qty === 0 ? 'bg-red-500' : qty <= 2 ? 'bg-orange-400' : 'bg-emerald-900')}>
                            <Boxes className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-emerald-900 truncate">{item.name}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {item.category === 'UC' ? '💎 UC' : '📦 Item'} · Stock: {qty}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn('text-sm font-black', margin < 0 ? 'text-red-500' : 'text-emerald-600')}>{formatProfit(margin, true)}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">margin/pc</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Desktop table — TableWrapper scroll + memoized rows */}
                  <div className="hidden md:block glass-card rounded-3xl overflow-hidden">
                    <TableWrapper>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-emerald-50">
                            <th className="px-5 py-4">Item</th>
                            <th className="px-5 py-4 text-right">Stock</th>
                            <th className="px-5 py-4 text-right">Avg Cost</th>
                            <th className="px-5 py-4 text-right">Sell Price</th>
                            <th className="px-5 py-4 text-right">Margin/pc</th>
                            <th className="px-5 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredItems.map(item => (
                            <ItemRow
                              key={item.id}
                              item={item}
                              userRole={userRole}
                              onEdit={openEdit}
                              onSell={sellRowItem}
                            />
                          ))}
                        </tbody>
                      </table>
                    </TableWrapper>
                  </div>
                </div>
              )}

              {filteredItems.length === 0 && filteredAccounts.length === 0 && (
                <div className="glass-card rounded-3xl p-10 text-center">
                  <p className="text-4xl mb-3">🎮</p>
                  <p className="text-slate-400 font-bold">Koi stock nahi — "Kharida" tab se UC ya account add karein</p>
                </div>
              )}
            </div>
          )}

          {/* ════════ BUY TAB — UC/Item quick | Account (accordion) ════════ */}
          {tab === 'buy' && (
            <div className="space-y-6">
              {/* Mode toggle */}
              <div className="glass-card rounded-full p-1.5 grid grid-cols-2 gap-1 max-w-md mx-auto">
                {([['quick', '⚡ UC / Item'], ['account', '👤 Account']] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setBuyMode(k)}
                    className={cn('py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all',
                      buyMode === k ? 'bg-emerald-900 text-white shadow-lg' : 'text-slate-500 hover:bg-emerald-50')}>{label}</button>
                ))}
              </div>

              {buyMode === 'quick' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-8 space-y-6">
                    <div className="glass-card rounded-[32px] p-6 md:p-8 space-y-6">
                      {/* ... existing quick-buy form (name/autocomplete, category, qty+cost, sell+source) ... */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-900"><ShoppingCart className="w-6 h-6" /></div>
                        <div>
                          <h2 className="text-2xl font-bold text-emerald-900">Nayi Kharidari</h2>
                          <p className="text-xs text-slate-400">UC / item kharida? Yahan entry karein</p>
                        </div>
                      </div>

                      {existingNameMatch && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-bold animate-pulse">
                          <CheckCircle className="w-4 h-4" /> Existing item mila — avg cost khud update hoga (stock: {existingNameMatch.quantity})
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className={labelCls}>Item Ka Naam</label>
                        <div className="relative">
                          <input
                            value={buyName} onChange={e => { setBuyName(e.target.value); setBuyShowDropdown(true); }}
                            onFocus={() => setBuyShowDropdown(true)} onBlur={() => setTimeout(() => setBuyShowDropdown(false), 150)}
                            placeholder="jaise: 60 UC / 1800 UC / PUBG Account"
                            className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10"
                          />
                          {buyShowDropdown && buySuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-emerald-50 overflow-hidden z-[60]">
                              {buySuggestions.map(s => (
                                <button key={s.id} type="button"
                                  onMouseDown={() => { setBuyName(s.name); setBuyCategory((s.category as PubgCategory) || 'Item'); setBuyShowDropdown(false); }}
                                  className="w-full text-left px-5 py-3 hover:bg-emerald-50 text-sm font-bold text-emerald-900 flex justify-between items-center"
                                >
                                  <span>{s.name}</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">stock: {s.quantity}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {UC_PRESETS.map(p => (
                            <button key={p} type="button" onClick={() => { setBuyName(p); setBuyCategory('UC'); }}
                              className={cn('px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
                                buyName === p ? 'bg-emerald-900 text-white' : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100')}
                            >{p}</button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className={labelCls}>Category</label>
                        <div className="grid grid-cols-3 gap-2">
                          {CATEGORIES.filter(c => c !== 'Account').map(c => (
                            <button key={c} type="button" onClick={() => setBuyCategory(c)}
                              className={cn('py-3 px-2 rounded-2xl border text-xs font-bold transition-colors',
                                buyCategory === c ? 'border-emerald-900 bg-emerald-50 text-emerald-900' : 'border-emerald-100 bg-white text-slate-500 hover:bg-emerald-50/50')}
                            >{c === 'UC' ? '💎 UC' : '📦 Item'}</button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className={labelCls}>Quantity</label>
                          <input type="number" min="1" value={buyQty} onChange={e => setBuyQty(e.target.value)} className={inputCls} />
                          <div className="flex gap-1.5 flex-wrap">
                            {[1, 2, 5, 10, 20, 50].map(q => (
                              <button key={q} type="button" onClick={() => setBuyQty(String(q))}
                                className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-xs hover:bg-emerald-900 hover:text-white transition-colors">{q}</button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className={labelCls}>Cost / Unit (Rs)</label>
                          <input type="number" min="0" value={buyCost} onChange={e => setBuyCost(e.target.value)} placeholder="0" className={inputCls} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className={labelCls}>Sell Price / Unit (Rs) {!existingNameMatch && <span className="text-red-500">*</span>}</label>
                          <input type="number" min="0" value={buySell} onChange={e => setBuySell(e.target.value)} placeholder="0" className={inputCls} />
                          <p className="text-[10px] text-slate-400 px-1">Naye item ke liye zaroori · purane pe optional</p>
                        </div>
                        <div className="space-y-2">
                          <label className={labelCls}>Source (optional)</label>
                          <input value={buySource} onChange={e => setBuySource(e.target.value)} placeholder="Midasbuy / reseller..."
                            className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4">
                    <div className="glass-card rounded-[40px] overflow-hidden sticky top-24">
                      <div className="relative overflow-hidden bg-emerald-900 p-8 text-white">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 relative z-10">Total Kharid</p>
                        <p className="text-4xl font-black mt-2 relative z-10">Rs {(Math.round(buyTotal)).toLocaleString()}</p>
                        <p className="text-xs text-emerald-200/70 mt-2 relative z-10">{buyName.trim() || '— item —'} × {buyQtyN || 0} @ Rs {(buyCostN || 0).toLocaleString()}</p>
                        <div className="absolute right-[-20px] top-[-20px] opacity-10"><ShoppingCart className="w-32 h-32" /></div>
                      </div>
                      <div className="p-6 space-y-4 bg-white/40">
                        <button onClick={handleBuy} disabled={buySaving}
                          className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                          {buySaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                          {buySaving ? 'ADDING...' : 'PURCHASE RECORD KARO'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── ACCOUNT BUYING — accordion form ── */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-8 space-y-6">
                    <div className="glass-card rounded-[32px] p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-900"><UserCheck className="w-6 h-6" /></div>
                        <div>
                          <h2 className="text-2xl font-bold text-emerald-900">Account Kharida</h2>
                          <p className="text-xs text-slate-400">Serial stock — warranty + owner record ke saath</p>
                        </div>
                      </div>

                      {/* Core fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className={labelCls}>Account Naam <span className="text-red-500">*</span></label>
                          <input value={accName} onChange={e => setAccName(e.target.value)} placeholder="jaise: PUBG Account Lvl 40"
                            className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" />
                        </div>
                        <div className="space-y-2">
                          <label className={labelCls}>Character ID (optional)</label>
                          <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={accCharacterId} onChange={e => setAccCharacterId(e.target.value)} placeholder="5123456789"
                              className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                          </div>
                        </div>
                      </div>

                      {/* Bought from */}
                      <div className="space-y-2">
                        <label className={labelCls}>Kisse Kharida</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['Customer', 'Seller'] as const).map(v => (
                            <button key={v} type="button" onClick={() => setAccBoughtFrom(v)}
                              className={cn('py-3 px-2 rounded-2xl border text-xs font-bold transition-colors',
                                accBoughtFrom === v ? 'border-emerald-900 bg-emerald-50 text-emerald-900' : 'border-emerald-100 bg-white text-slate-500 hover:bg-emerald-50/50')}
                            >{v === 'Customer' ? '🧑 Customer' : '🤝 Seller'}</button>
                          ))}
                        </div>
                      </div>

                      {/* Owner + price */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className={labelCls}>Owner Naam <span className="text-red-500">*</span></label>
                          <input value={accOwnerName} onChange={e => setAccOwnerName(e.target.value)} placeholder="Original owner"
                            className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" />
                        </div>
                        <div className="space-y-2">
                          <label className={labelCls}>Buying Price (Rs) <span className="text-red-500">*</span></label>
                          <input type="number" min="0" value={accBuyingPrice} onChange={e => setAccBuyingPrice(e.target.value)} placeholder="0" className={inputCls} />
                        </div>
                      </div>

                      {/* Warranty accordion (CNIC + link + days) */}
                      <div className="rounded-[28px] border border-emerald-100 overflow-hidden">
                        <button type="button" onClick={() => setAccMoreOpen(o => !o)}
                          className="w-full flex items-center justify-between px-5 py-4 bg-emerald-50/50 text-emerald-900 font-bold text-sm">
                          <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Warranty & Proof (CNIC / link / days)</span>
                          <ChevronDown className={cn('w-5 h-5 transition-transform', accMoreOpen && 'rotate-180')} />
                        </button>
                        <AnimatePresence initial={false}>
                          {accMoreOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="p-5 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className={labelCls}>Owner CNIC (optional)</label>
                                    <input value={accOwnerCnic} onChange={e => setAccOwnerCnic(e.target.value)} placeholder="35202-XXXXXXX-X"
                                      className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                                  </div>
                                  <div className="space-y-2">
                                    <label className={labelCls}>Warranty Days</label>
                                    <input type="number" min="0" value={accWarrantyDays} onChange={e => setAccWarrantyDays(e.target.value)} className={inputCls} />
                                    <div className="flex gap-1.5 flex-wrap">
                                      {[0, 3, 7, 15, 30].map(d => (
                                        <button key={d} type="button" onClick={() => setAccWarrantyDays(String(d))}
                                          className={cn('px-3 h-9 rounded-lg font-bold text-xs transition-colors',
                                            accWarrantyDays === String(d) ? 'bg-emerald-900 text-white' : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100')}>{d === 0 ? 'No wr.' : `${d}d`}</button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className={labelCls}>Recovery Code (10-digit, optional)</label>
                                  <input value={accRecoveryCode} onChange={e => setAccRecoveryCode(e.target.value.replace(/[^0-9]/g, ''))} maxLength={10} placeholder="0123456789"
                                    className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                                </div>
                                <div className="space-y-2">
                                  <label className={labelCls}>Warranty Link / Proof (optional)</label>
                                  <div className="relative">
                                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input value={accWarrantyLink} onChange={e => setAccWarrantyLink(e.target.value)} placeholder="https://drive.google.com/..."
                                      className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-bold">
                                  <ShieldCheck className="w-4 h-4" />
                                  {accWarrantyN > 0 ? `Expiry hoga: ${accExpiryPreview} (aaj + ${accWarrantyN} din)` : 'No warranty — expiry calculate nahi hogi'}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Side actions — Save & Add Another for bulk */}
                  <div className="lg:col-span-4">
                    <div className="glass-card rounded-[40px] overflow-hidden sticky top-24">
                      <div className="relative overflow-hidden bg-emerald-900 p-8 text-white">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 relative z-10">Account Stock-In</p>
                        <p className="text-4xl font-black mt-2 relative z-10">{rs(accPriceN)}</p>
                        <p className="text-xs text-emerald-200/70 mt-2 relative z-10">{accName.trim() || '— account —'} · warranty {accWarrantyN || 0}d</p>
                        <div className="absolute right-[-20px] top-[-20px] opacity-10"><ShieldCheck className="w-32 h-32" /></div>
                      </div>
                      <div className="p-6 space-y-3 bg-white/40">
                        <button onClick={() => handleAccountBuy(true)} disabled={accSaving}
                          className="w-full bg-white border-2 border-emerald-900 text-emerald-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50">
                          {accSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                          SAVE & ADD ANOTHER
                        </button>
                        <button onClick={() => handleAccountBuy(false)} disabled={accSaving}
                          className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                          <CheckCircle className="w-5 h-5" /> SAVE & DONE
                        </button>
                        <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest">"Add Another" me seller/CNIC/warranty barqarar rehte hain</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════ SELL TAB — Stock sale (fee) | UC Direct ════════ */}
          {tab === 'sell' && (
            <div className="space-y-6">
              <div className="glass-card rounded-full p-1.5 grid grid-cols-2 gap-1 max-w-md mx-auto">
                {([['stock', '📦 Stock Sale'], ['direct', '⚡ Direct Sale']] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setSellMode(k)}
                    className={cn('py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all',
                      sellMode === k ? 'bg-emerald-900 text-white shadow-lg' : 'text-slate-500 hover:bg-emerald-50')}>{label}</button>
                ))}
              </div>

              {sellMode === 'stock' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-8 space-y-6">
                    <div className="glass-card rounded-[32px] p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-900"><Coins className="w-6 h-6" /></div>
                        <div>
                          <h2 className="text-2xl font-bold text-emerald-900">Nayi Sale (Stock)</h2>
                          <p className="text-xs text-slate-400">Rate roz change hota hai — price yahan set karein</p>
                        </div>
                      </div>

                      {sellableItems.length === 0 && availableAccounts.length === 0 ? (
                        <div className="py-10 text-center">
                          <p className="text-4xl mb-3">📦</p>
                          <p className="text-slate-400 font-bold">Stock khatam hai — pehle "Kharida" tab se le aayein</p>
                          <button onClick={() => setTab('buy')} className="mt-4 px-6 py-3 bg-emerald-900 text-white rounded-2xl font-bold text-sm">Kharida Tab Kholein</button>
                        </div>
                      ) : (
                        <>
                          {/* Item / Account select — sirf AVAILABLE accounts dikhte hain */}
                          <div className="space-y-2">
                            <label className={labelCls}>Item / Account</label>
                            <select value={sellItemId} onChange={e => handleItemPick(e.target.value)}
                              className="w-full py-4 px-6 bg-white border border-emerald-50 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5 appearance-none">
                              <option value="">— Item chunein —</option>
                              <optgroup label="👤 Available Accounts">
                                {availableAccounts.map(a => (
                                  <option key={a.id} value={a.id}>
                                    {a.name} · {rs(Number(a.buyingPrice) || 0)}{a.ownerName ? ` · ${a.ownerName}` : ''}
                                  </option>
                                ))}
                                {/* legacy: purane pubgItems wale accounts (qty-based) */}
                                {sellableItems.filter(i => i.category === 'Account').map(i => (
                                  <option key={'lg-' + i.id} value={i.id}>{i.name} · {rs(Number(i.buyPrice) || 0)} (stock item)</option>
                                ))}
                              </optgroup>
                              <optgroup label="💎 UC & Items">
                                {sellableItems.filter(i => i.category !== 'Account').map(i => (
                                  <option key={i.id} value={i.id}>{i.name} ({i.quantity} available)</option>
                                ))}
                              </optgroup>
                            </select>
                          </div>

                          {sellItem && !sellAccount && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-bold">
                              <Boxes className="w-4 h-4" /> Stock: {sellItem.quantity} · Avg Cost: {rs(sellItem.buyPrice)}
                            </div>
                          )}
                          {sellAccount && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-bold">
                              <UserCheck className="w-4 h-4" /> {sellAccount.ownerName} · Cost: {rs(Number(sellAccount.buyingPrice) || 0)} · Warranty: {sellAccount.warrantyDays > 0 ? sellAccount.expiryDate : 'No Warranty'}
                            </div>
                          )}

                          {/* Login transfer + recovery — sirf account sales */}
                          {sellAccount && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className={labelCls}>Login Transfer</label>
                                <select value={sellLoginStatus} onChange={e => setSellLoginStatus(e.target.value as 'instant' | 'pending')}
                                  className="w-full py-4 px-6 bg-white border border-emerald-50 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5 appearance-none">
                                  <option value="instant">⚡ Instant — login turant diya</option>
                                  <option value="pending">⏳ Pending — baad mein change hoga</option>
                                </select>
                                {sellLoginStatus === 'pending' && (
                                  <p className="text-[10px] text-orange-500 font-bold px-1">7 din mein change na ho to History mein red alert aayega</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <label className={labelCls}>Recovery Code (optional)</label>
                                <div className="relative">
                                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <input value={sellRecoveryCode} onChange={e => setSellRecoveryCode(e.target.value.replace(/[^0-9]/g, ''))} maxLength={10} placeholder="0123456789"
                                    className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Qty + Price — account mode me qty hidden (fixed 1) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {!sellAccount && (
                            <div className="space-y-2">
                              <label className={labelCls}>Quantity</label>
                              <input type="number" min="1" value={sellQty} onChange={e => setSellQty(e.target.value)} className={inputCls} />
                              {sellItem && (
                                <div className="flex gap-1.5 flex-wrap">
                                  {Array.from({ length: Math.min(5, Math.floor(sellItem.quantity)) }, (_, k) => k + 1).map(q => (
                                    <button key={q} type="button" onClick={() => setSellQty(String(q))}
                                      className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-xs hover:bg-emerald-900 hover:text-white transition-colors">{q}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                            )}
                            <div className="space-y-2">
                              <label className={labelCls}>{sellAccount ? 'Price (Rs)' : 'Price / Unit (Rs)'}</label>
                              <input type="number" min="0" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="0" className={inputCls} />
                            </div>
                          </div>

                          {/* Platform fee */}
                          <div className="space-y-2">
                            <label className={labelCls}>Platform Fee (optional)</label>
                            <input type="number" min="0" value={sellFee} onChange={e => setSellFee(e.target.value)} placeholder="0 — marketplace commission"
                              className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className={labelCls}>Customer (optional)</label>
                              <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input value={sellCustomer} onChange={e => setSellCustomer(e.target.value)} placeholder="Naam"
                                  className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                              </div>
                            </div>
                            {!sellAccount && (
                            <div className="space-y-2">
                              <label className={labelCls}>Player ID (optional)</label>
                              <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input value={sellPlayerId} onChange={e => setSellPlayerId(e.target.value)} placeholder="5123456789"
                                  className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                              </div>
                            </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className={labelCls}>Note (optional)</label>
                            <input value={sellNote} onChange={e => setSellNote(e.target.value)} placeholder="jaise: Royal Pass ke saath"
                              className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-4">
                    <div className={cn('glass-card rounded-[40px] overflow-hidden sticky top-24', previewProfit < 0 && 'border-red-200')}>
                      <div className={cn('relative overflow-hidden p-8 text-white', previewProfit < 0 ? 'bg-red-600' : 'bg-emerald-900')}>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 relative z-10">
                          {previewProfit < 0 ? '⚠️ LOSS Ban Raha Hai' : 'Munafa Ban Raha Hai'}
                        </p>
                        <p className="text-4xl font-black mt-2 relative z-10">
                          {formatProfit(previewProfit, true)}
                        </p>
                        <div className="absolute right-[-20px] top-[-20px] opacity-10">
                          {previewProfit < 0 ? <AlertTriangle className="w-32 h-32" /> : <Coins className="w-32 h-32" />}
                        </div>
                      </div>
                      <div className="p-6 space-y-4 bg-white/40">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Sale</span>
                          <span className="text-sm font-bold text-emerald-950">{rs(previewAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Cost ({sellAccount ? `account · ${rs(Number(sellAccount.buyingPrice) || 0)}` : `${sellQtyN || 0} × ${sellItem ? rs(sellItem.buyPrice) : '—'}`})
                          </span>
                          <span className="text-sm font-bold text-emerald-950">{rs(previewCost)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Platform Fee</span>
                          <span className="text-sm font-bold text-emerald-950">{rs(sellFeeN)}</span>
                        </div>
                        {sellItem && !sellAccount && sellQtyN > (Number(sellItem.quantity) || 0) && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Stock se zyada — sirf {sellItem.quantity} maujood
                          </div>
                        )}
                        <button onClick={handleSell} disabled={sellSaving || (!sellItem && !sellAccount) || (!sellAccount && sellQtyN <= 0)}
                          className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                          {sellSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                          {sellSaving ? 'SAVING...' : sellAccount ? 'ACCOUNT SALE RECORD KARO' : 'SALE RECORD KARO'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── UC DIRECT — no stock ── */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-8 space-y-6">
                    <div className="glass-card rounded-[32px] p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-900"><Zap className="w-6 h-6" /></div>
                        <div>
                          <h2 className="text-2xl font-bold text-emerald-900">Direct Sale</h2>
                          <p className="text-xs text-slate-400">UC / USDT / Account — stock ke baghair instant trade</p>
                        </div>
                      </div>

                      {/* Category — UC / USDT / Account / Other */}
                      <div className="space-y-2">
                        <label className={labelCls}>Category</label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['UC', 'USDT', 'Account', 'Other'] as const).map(c => (
                            <button key={c} type="button" onClick={() => { setDuCategory(c); setDuName(c === 'UC' ? '60 UC' : ''); }}
                              className={cn('py-3 px-2 rounded-2xl border text-xs font-bold transition-colors',
                                duCategory === c ? 'border-emerald-900 bg-emerald-50 text-emerald-900' : 'border-emerald-100 bg-white text-slate-500 hover:bg-emerald-50/50')}
                            >{c === 'UC' ? '💎 UC' : c === 'USDT' ? '💵 USDT' : c === 'Account' ? '👤 Account' : '📦 Other'}</button>
                          ))}
                        </div>
                      </div>

                      {/* Naam — UC presets ya free text */}
                      <div className="space-y-2">
                        <label className={labelCls}>{duCategory === 'UC' ? 'UC Pack' : 'Naam / Label'}</label>
                        {duCategory === 'UC' ? (
                          <div className="flex flex-wrap gap-2">
                            {UC_PRESETS.map(p => (
                              <button key={p} type="button" onClick={() => setDuName(p)}
                                className={cn('px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors',
                                  duName === p ? 'bg-emerald-900 text-white' : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100')}>{p}</button>
                            ))}
                          </div>
                        ) : (
                          <input value={duName} onChange={e => setDuName(e.target.value)} placeholder="jaise: USDT 100$ / Account Lvl 50 / Misc"
                            className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" />
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className={labelCls}>Quantity</label>
                          <input type="number" min="1" value={duQty} onChange={e => setDuQty(e.target.value)} className={inputCls} />
                        </div>
                        <div className="space-y-2">
                          <label className={labelCls}>Buy Price / Unit <span className="text-red-500">*</span></label>
                          <input type="number" min="0" value={duBuy} onChange={e => setDuBuy(e.target.value)} placeholder="0" className={inputCls} />
                        </div>
                        <div className="space-y-2">
                          <label className={labelCls}>Sale Price / Unit <span className="text-red-500">*</span></label>
                          <input type="number" min="0" value={duSale} onChange={e => setDuSale(e.target.value)} placeholder="0" className={inputCls} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className={labelCls}>Platform Fee (optional)</label>
                        <input type="number" min="0" value={duFee} onChange={e => setDuFee(e.target.value)} placeholder="0"
                          className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4">
                    <div className={cn('glass-card rounded-[40px] overflow-hidden sticky top-24', duProfit < 0 && 'border-red-200')}>
                      <div className={cn('relative overflow-hidden p-8 text-white', duProfit < 0 ? 'bg-red-600' : 'bg-emerald-900')}>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 relative z-10">
                          {duProfit < 0 ? '⚠️ LOSS Ban Raha Hai' : 'Instant Munafa'}
                        </p>
                        <p className="text-4xl font-black mt-2 relative z-10">
                          {formatProfit(duProfit, true)}
                        </p>
                        <div className="absolute right-[-20px] top-[-20px] opacity-10"><Zap className="w-32 h-32" /></div>
                      </div>
                      <div className="p-6 space-y-4 bg-white/40">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Sale</span>
                          <span className="text-sm font-bold text-emerald-950">{rs(duSaleN * duQtyN)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Cost</span>
                          <span className="text-sm font-bold text-emerald-950">{rs(duBuyN * duQtyN)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Platform Fee</span>
                          <span className="text-sm font-bold text-emerald-950">{rs(duFeeN)}</span>
                        </div>
                        <button onClick={handleDirectUcSale} disabled={duSaving || duQtyN <= 0}
                          className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                          {duSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                          {duSaving ? 'SAVING...' : 'DIRECT SALE RECORD KARO'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════ HISTORY TAB — chart + breakdown + timeline (cards/table) ════════ */}
          {tab === 'history' && (
            <div className="space-y-6">
              {/* Monthly chart */}
              <div className="glass-card rounded-3xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-emerald-900">Monthly Munafa</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pichhle 6 mahine · refunds excluded</span>
                </div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-emerald-50)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-slate-400)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--color-slate-400)' }} />
                      <Tooltip
                        cursor={{ fill: 'var(--color-emerald-50)' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
                        formatter={(v: any) => [`Rs. ${Number(v).toLocaleString()}`, 'Profit']}
                      />
                      <Bar dataKey="profit" radius={[8, 8, 0, 0]} maxBarSize={48}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.profit < 0 ? 'var(--color-red-500)' : 'var(--color-emerald-500)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Profit Breakdown — visual bars */}
              <div className="glass-card rounded-3xl p-6 md:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-emerald-900">Munafa Breakdown</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net: {formatProfit(stats.total, true)}</span>
                </div>
                {breakdown.rows.map(r => (
                  <div key={r.key} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">{r.label}</span>
                      <span className={cn('text-sm font-black', r.amount < 0 ? 'text-red-500' : 'text-emerald-900')}>
                        {formatProfit(r.amount, true)}
                        <span className="text-[10px] text-slate-400 font-bold ml-1">{Math.round((Math.max(0, r.amount) / breakdown.posTotal) * 100)}%</span>
                      </span>
                    </div>
                    <div className="h-3 bg-emerald-50/70 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (Math.max(0, r.amount) / breakdown.posTotal) * 100)}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }} className={cn('h-full rounded-full', r.cls)} />
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-50">
                  <div className="text-center p-2 rounded-2xl bg-red-50/60">
                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Refunds</p>
                    <p className="text-sm font-black text-red-500">{formatProfit(-Math.abs(stats.refundedProfit), true)}</p>
                  </div>
                  <div className="text-center p-2 rounded-2xl bg-orange-50/60">
                    <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">Direct Loss</p>
                    <p className="text-sm font-black text-orange-500">{formatProfit(-Math.abs(stats.directLoss), true)}</p>
                  </div>
                  <div className="text-center p-2 rounded-2xl bg-slate-100/70">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Expenses</p>
                    <p className="text-sm font-black text-slate-500">{rs(stats.directExpense)}</p>
                  </div>
                </div>
              </div>

              {/* Direct profit/loss/expense — collapsible form */}
              <div className="glass-card rounded-3xl overflow-hidden">
                <button onClick={() => setDirectOpen(o => !o)} className="w-full flex items-center justify-between p-5 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center"><ArrowLeftRight className="w-5 h-5" /></div>
                    <div className="text-left">
                      <h3 className="font-bold text-emerald-900">Direct Profit / Loss / Kharcha</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Video earning, marketing waghera</p>
                    </div>
                  </div>
                  <ChevronDown className={cn('w-5 h-5 text-slate-400 transition-transform', directOpen && 'rotate-180')} />
                </button>
                <AnimatePresence initial={false}>
                  {directOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-5 md:px-6 pb-6 space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          {([['profit', '📈 Profit'], ['loss', '📉 Loss'], ['expense', '💸 Kharcha']] as const).map(([k, label]) => (
                            <button key={k} type="button" onClick={() => setDirectType(k)}
                              className={cn('py-3 rounded-2xl border text-xs font-bold transition-colors',
                                directType === k
                                  ? k === 'profit' ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                                    : k === 'loss' ? 'border-orange-500 bg-orange-50 text-orange-600'
                                      : 'border-slate-500 bg-slate-100 text-slate-600'
                                  : 'border-emerald-100 bg-white text-slate-500 hover:bg-emerald-50/50')}
                            >{label}</button>
                          ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className={labelCls}>Amount (Rs) <span className="text-red-500">*</span></label>
                            <input type="number" min="0" value={directAmount} onChange={e => setDirectAmount(e.target.value)} placeholder="0" className={inputCls} />
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}>Date</label>
                            <input type="date" value={directDate} onChange={e => setDirectDate(e.target.value)}
                              className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}>Description</label>
                            <input value={directDesc} onChange={e => setDirectDesc(e.target.value)} placeholder="jaise: YouTube video earning"
                              className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                          </div>
                        </div>
                        <button onClick={handleDirectEntry} disabled={directSaving}
                          className="w-full bg-emerald-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                          {directSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                          ENTRY ADD KARO
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'all', label: 'Sab' },
                  { key: 'sale', label: '💰 Becha' },
                  { key: 'account', label: '👤 Accounts' },
                  { key: 'purchase', label: '🛒 Kharida' },
                  { key: 'direct', label: '⚡ Direct' },
                  { key: 'month', label: '📅 Is Mahine' },
                ] as const).map(f => (
                  <button key={f.key} onClick={() => setHistoryFilter(f.key)}
                    className={cn('px-4 py-2.5 rounded-2xl text-xs font-bold border transition-colors',
                      historyFilter === f.key ? 'bg-emerald-900 border-emerald-900 text-white' : 'bg-white/60 border-emerald-100 text-slate-600 hover:bg-emerald-50')}
                  >{f.label}</button>
                ))}
              </div>

              {/* Timeline */}
              {historyEntries.length === 0 ? (
                <div className="glass-card rounded-3xl p-10 text-center">
                  <p className="text-4xl mb-3">🗂️</p>
                  <p className="text-slate-400 font-bold">Abhi koi entry nahi</p>
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="block md:hidden space-y-3">
                    {historyEntries.map(e => {
                      const d = e.date?.toDate?.();
                      const isSale = e.kind === 'sale';
                      const isDirect = e.kind === 'direct';
                      const profit = Number(e.profit) || 0;
                      return (
                        <button key={e.kind + e.id} onClick={() => setDetailCard({ type: 'history', ...e })}
                          className={cn('w-full glass-card rounded-2xl p-4 flex items-center gap-3 text-left border-l-4 active:scale-[0.98] transition-transform',
                            isSale ? 'border-l-emerald-500' : isDirect ? 'border-l-violet-400' : 'border-l-slate-300')}>
                          <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
                            isSale ? 'bg-emerald-900 text-white' : isDirect ? 'bg-violet-100 text-violet-600' : 'bg-emerald-50 text-emerald-900')}>
                            {isSale ? <Coins className="w-5 h-5" /> : isDirect ? <ArrowLeftRight className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('font-bold text-emerald-900 truncate text-sm', e.refunded && 'line-through opacity-60')}>
                              {isDirect ? (e.description || e.type) : e.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {d ? d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—'}
                              {e.refunded ? ' · ↩ refunded' : ''}
                              {isSale && e.saleType === 'account' && (e.loginEmail || e.loginPassword) && (
                                <span className="ml-0.5">{isPinUnlocked ? '✉' : '🔒'}</span>
                              )}
                            </p>
                            {isSale && isLoginTransferOverdue(e) && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[9px] font-bold uppercase tracking-wide animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5" /> Logins Change Karwao (7+ days)
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {isSale && (
                              <>
                                <p className="text-sm font-black text-emerald-950">{rs(Number(e.totalAmount) || 0)}</p>
                                <p className={cn('text-xs font-bold', e.refunded ? 'text-slate-400 line-through' : profit < 0 ? 'text-red-500' : 'text-emerald-600')}>
                                  {formatProfit(profit, true)}
                                </p>
                              </>
                            )}
                            {isDirect && (
                              <p className={cn('text-sm font-black', e.type === 'profit' ? 'text-emerald-600' : e.type === 'loss' ? 'text-orange-500' : 'text-slate-500')}>
                                {e.type === 'expense' ? rs(Number(e.amount) || 0) : formatProfit(e.type === 'loss' ? -Math.abs(Number(e.amount) || 0) : Math.abs(Number(e.amount) || 0), true)}
                              </p>
                            )}
                            {!isSale && !isDirect && <p className="text-sm font-black text-emerald-950">{rs(Number(e.totalCost) || 0)}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Desktop table — TableWrapper scroll + memoized rows */}
                  <div className="hidden md:block glass-card rounded-3xl overflow-hidden">
                    <TableWrapper>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-emerald-50">
                            <th className="px-5 py-4">Entry</th>
                            <th className="px-5 py-4">Date</th>
                            <th className="px-5 py-4">Detail</th>
                            <th className="px-5 py-4 text-right">Amount</th>
                            <th className="px-5 py-4 text-right">Profit/Loss</th>
                            <th className="px-5 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyEntries.map(e => (
                            <HistoryRow
                              key={e.kind + e.id}
                              e={e}
                              isPinUnlocked={isPinUnlocked}
                              userRole={userRole}
                              onRefund={openRefund}
                              onDelete={deleteRow}
                            />
                          ))}
                        </tbody>
                      </table>
                    </TableWrapper>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* FAB — above mobile bottom nav */}
      {tab === 'stock' && (
        <button onClick={() => setTab('buy')}
          className="fixed bottom-20 right-4 w-16 h-16 bg-emerald-900 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-40">
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* ════════ MOBILE DETAIL MODAL (card tap) ════════ */}
      <AnimatePresence>
        {detailCard && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/20 backdrop-blur-md z-[80]" onClick={() => setDetailCard(null)} />
            <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full max-w-md glass-card rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto pointer-events-auto">
                <button onClick={() => setDetailCard(null)}
                  className="absolute right-6 top-6 p-2 rounded-full hover:bg-emerald-50 text-slate-400"><X className="w-5 h-5" /></button>

                {detailCard.type === 'account' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-900"><UserCheck className="w-6 h-6" /></div>
                      <div>
                        <h2 className="text-xl font-bold text-emerald-900">{detailCard.name}</h2>
                        {(() => { const b = accountBadge(detailCard); return <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full', b.cls)}>{b.dot} {b.label}</span>; })()}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[
                        ['Owner', detailCard.ownerName], ['CNIC', detailCard.ownerCnic || '—'],
                        ['Character ID', detailCard.characterId || '—'], ['Kisse Liya', detailCard.boughtFrom],
                        ['Buying Price', rs(Number(detailCard.buyingPrice) || 0)],
                        ['Warranty', Number(detailCard.warrantyDays) > 0 ? `${detailCard.warrantyDays}d → ${detailCard.expiryDate}` : 'No Warranty'],
                        ['Recovery Code', detailCard.recoveryCode || '—'],
                        ['Sold Price', detailCard.soldPrice ? rs(Number(detailCard.soldPrice)) : '—'],
                      ].map(([k, v]) => (
                        <div key={k as string} className="flex justify-between items-center border-b border-emerald-50/50 pb-2.5">
                          <span className="text-xs font-medium text-slate-500 italic">{k}</span>
                          <span className="text-sm font-bold text-emerald-900">{v}</span>
                        </div>
                      ))}
                    </div>
                    {/* Logins — sirf PIN unlock ke baad reveal (Edit Logins se add/update hote hain) */}
                    {(detailCard.loginEmail || detailCard.loginPassword) && (
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <KeyRound className="w-3 h-3" /> Logins {isPinUnlocked ? '' : '· locked'}
                        </p>
                        {isPinUnlocked ? (
                          <>
                            {detailCard.loginEmail && (
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-xs font-medium text-slate-500 italic">Email</span>
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs font-bold text-emerald-900 truncate max-w-[150px]">{detailCard.loginEmail}</span>
                                  <button onClick={() => copyToClipboard(detailCard.loginEmail, 'Email')} className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-90 transition-all"><Copy className="w-3 h-3" /></button>
                                </span>
                              </div>
                            )}
                            {detailCard.loginPassword && (
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-xs font-medium text-slate-500 italic">Password</span>
                                <span className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-emerald-900">{detailCard.loginPassword}</span>
                                  <button onClick={() => copyToClipboard(detailCard.loginPassword, 'Password')} className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-90 transition-all"><Copy className="w-3 h-3" /></button>
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <button onClick={() => setShowPinModal(true)}
                            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wide hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" /> 🔒 PIN se unlock karein
                          </button>
                        )}
                      </div>
                    )}
                    {detailCard.warrantyLink && (isPinUnlocked
                      ? <a href={detailCard.warrantyLink} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 p-3 bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-bold"><Link2 className="w-4 h-4" /> Warranty proof kholein</a>
                      : <button onClick={() => setShowPinModal(true)}
                          className="w-full flex items-center gap-2 p-3 bg-slate-50 rounded-2xl text-slate-400 text-xs font-bold"><Lock className="w-4 h-4" /> 🔒 Warranty proof — PIN locked</button>
                    )}
                    {userRole === 'owner' && (
                      <div className="flex gap-2">
                        {detailCard.status === 'available' && (
                          <>
                            <button onClick={() => { const a = detailCard; setDetailCard(null); openEditLogins(a); }}
                              className="flex-1 bg-slate-800 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                              <KeyRound className="w-4 h-4" /> Edit Logins
                            </button>
                            <button onClick={() => { const a = detailCard; setDetailCard(null); setSaleAcc(a); setAccSalePrice(''); setAccSaleFee(''); setAccSaleCustomer(''); setAccSaleLoginStatus('instant'); setAccSaleRecoveryCode(a.recoveryCode || ''); }}
                              className="flex-1 bg-emerald-900 text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform">Bechna</button>
                          </>
                        )}
                        <button onClick={() => { setDeleteEntry({ kind: 'account', ...detailCard }); setDetailCard(null); }}
                          className="px-5 bg-red-50 text-red-500 rounded-2xl"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    )}
                  </>
                ) : detailCard.type === 'item' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white',
                        detailCard.quantity === 0 ? 'bg-red-500' : detailCard.quantity <= 2 ? 'bg-orange-400' : 'bg-emerald-900')}><Boxes className="w-6 h-6" /></div>
                      <div>
                        <h2 className="text-xl font-bold text-emerald-900">{detailCard.name}</h2>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock: {detailCard.quantity}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[
                        ['Avg Cost', rs(Number(detailCard.buyPrice) || 0)],
                        ['Sell Price', rs(Number(detailCard.sellPrice) || 0)],
                        ['Margin/pc', formatProfit((Number(detailCard.sellPrice) || 0) - (Number(detailCard.buyPrice) || 0), true)],
                        ['Total Invested', rs(Number(detailCard.totalInvested) || 0)],
                      ].map(([k, v]) => (
                        <div key={k as string} className="flex justify-between items-center border-b border-emerald-50/50 pb-2.5">
                          <span className="text-xs font-medium text-slate-500 italic">{k}</span>
                          <span className="text-sm font-bold text-emerald-900">{v}</span>
                        </div>
                      ))}
                    </div>
                    {userRole === 'owner' && detailCard.quantity > 0 && (
                      <button onClick={() => { const id = detailCard.id; setDetailCard(null); handleItemPick(id); setSellQty('1'); setSellFee(''); setTab('sell'); }}
                        className="w-full bg-emerald-900 text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform">Bechna</button>
                    )}
                  </>
                ) : (
                  /* history entry detail (mobile) */
                  <>
                    <h2 className="text-xl font-bold text-emerald-900">{detailCard.kind === 'direct' ? (detailCard.description || detailCard.type) : detailCard.name}</h2>
                    <div className="space-y-3">
                      {detailCard.kind === 'sale' && ([
                        ['Type', detailCard.saleType === 'account' ? '👤 Account' : detailCard.saleType === 'direct-uc' ? `⚡ Direct ${detailCard.directCategory || 'UC'}` : '📦 Stock'],
                        ['Qty × Price', `${detailCard.quantity} × ${rs(Number(detailCard.unitPrice) || 0)}`],
                        ['Total', rs(Number(detailCard.totalAmount) || 0)],
                        ['Cost', rs(Number(detailCard.unitCost) * (Number(detailCard.quantity) || 0))],
                        ['Platform Fee', detailCard.platformFee ? rs(Number(detailCard.platformFee)) : '—'],
                        ['Profit', formatProfit(Number(detailCard.profit) || 0, true)],
                        ['Customer', detailCard.customerName || '—'],
                        ['Login Transfer', detailCard.loginStatus === 'pending'
                          ? (isLoginTransferOverdue(detailCard) ? '⏳ Pending — 7+ din ho gaye!' : '⏳ Pending')
                          : '⚡ Instant'],
                        ['Recovery Code', detailCard.recoveryCode || '—'],
                        ...(detailCard.saleType === 'account' && (detailCard.loginEmail || detailCard.loginPassword) ? [
                          ['Login Email', isPinUnlocked
                            ? <span className="flex items-center gap-1.5"><span className="truncate max-w-[140px]">{detailCard.loginEmail}</span><div role="button" onClick={() => copyToClipboard(detailCard.loginEmail, 'Email')} className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-90 transition-all"><Copy className="w-3 h-3" /></div></span>
                            : <span className="flex items-center gap-1"><span>••••••</span><button onClick={() => setShowPinModal(true)} className="text-[10px] text-slate-400 underline">(PIN unlock)</button></span>],
                          ['Login Password', isPinUnlocked
                            ? <span className="flex items-center gap-1.5"><span>{detailCard.loginPassword}</span><div role="button" onClick={() => copyToClipboard(detailCard.loginPassword, 'Password')} className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-90 transition-all"><Copy className="w-3 h-3" /></div></span>
                            : <span className="flex items-center gap-1"><span>••••••</span><button onClick={() => setShowPinModal(true)} className="text-[10px] text-slate-400 underline">(PIN unlock)</button></span>],
                        ] : []),
                        ['Refunded', detailCard.refunded ? 'Haan ↩' : 'Nahi'],
                      ]).map(([k, v]) => (
                        <div key={k as string} className="flex justify-between items-center border-b border-emerald-50/50 pb-2.5">
                          <span className="text-xs font-medium text-slate-500 italic">{k}</span>
                          <span className="text-sm font-bold text-emerald-900">{v}</span>
                        </div>
                      ))}
                      {detailCard.kind === 'direct' && ([
                        ['Type', detailCard.type], ['Amount', rs(Number(detailCard.amount) || 0)], ['Description', detailCard.description || '—'],
                      ]).map(([k, v]) => (
                        <div key={k as string} className="flex justify-between items-center border-b border-emerald-50/50 pb-2.5">
                          <span className="text-xs font-medium text-slate-500 italic">{k}</span>
                          <span className="text-sm font-bold text-emerald-900">{v}</span>
                        </div>
                      ))}
                    </div>
                    {userRole === 'owner' && detailCard.kind === 'sale' && !detailCard.refunded && detailCard.saleType === 'account' && (
                      <button onClick={() => { const s = detailCard; setDetailCard(null); openRefund(s); }}
                        className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <RotateCcw className="w-4 h-4" /> Refund / Reverse
                      </button>
                    )}
                    {userRole === 'owner' && (
                      <button onClick={() => { const entry = { kind: detailCard.kind, ...detailCard }; setDetailCard(null); setDeleteEntry(entry); }}
                        className="w-full bg-red-50 text-red-500 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <Trash2 className="w-4 h-4" /> Delete Entry
                      </button>
                    )}
                  </>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ════════ ACCOUNT SALE MODAL ════════ */}
      <AnimatePresence>
        {saleAcc && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/20 backdrop-blur-md z-[80]" onClick={() => setSaleAcc(null)} />
            <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full max-w-md glass-card rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto pointer-events-auto">
                <button onClick={() => setSaleAcc(null)}
                  className="absolute right-6 top-6 p-2 rounded-full hover:bg-emerald-50 text-slate-400"><X className="w-5 h-5" /></button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-900 rounded-2xl flex items-center justify-center text-white"><Coins className="w-6 h-6" /></div>
                  <div>
                    <h2 className="text-xl font-bold text-emerald-900">{saleAcc.name} bechna</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cost: {rs(Number(saleAcc.buyingPrice) || 0)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Sale Price (Rs) <span className="text-red-500">*</span></label>
                  <input type="number" min="0" value={accSalePrice} onChange={e => setAccSalePrice(e.target.value)} placeholder="0" className={inputCls} />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Platform Fee (optional)</label>
                  <input type="number" min="0" value={accSaleFee} onChange={e => setAccSaleFee(e.target.value)} placeholder="0" className={inputCls} />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Customer (optional)</label>
                  <input value={accSaleCustomer} onChange={e => setAccSaleCustomer(e.target.value)} placeholder="Naam"
                    className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={labelCls}>Login Transfer</label>
                    <select value={accSaleLoginStatus} onChange={e => setAccSaleLoginStatus(e.target.value as 'instant' | 'pending')}
                      className="w-full py-4 px-5 bg-white border border-emerald-50 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5 appearance-none">
                      <option value="instant">⚡ Instant — diya</option>
                      <option value="pending">⏳ Pending — baad mein</option>
                    </select>
                    {accSaleLoginStatus === 'pending' && (
                      <p className="text-[10px] text-orange-500 font-bold px-1">7 din mein change na ho to alert</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Recovery Code (optional)</label>
                    <input value={accSaleRecoveryCode} onChange={e => setAccSaleRecoveryCode(e.target.value.replace(/[^0-9]/g, ''))} maxLength={10} placeholder="0123456789"
                      className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                  </div>
                </div>
                <div className={cn('p-4 rounded-2xl text-center', accSaleProfit < 0 ? 'bg-red-50' : 'bg-emerald-50')}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Munafa (fee kat ke)</p>
                  <p className={cn('text-2xl font-black mt-1', accSaleProfit < 0 ? 'text-red-500' : 'text-emerald-700')}>
                    {formatProfit(accSaleProfit, true)}
                  </p>
                </div>
                <button onClick={handleAccountSale} disabled={accSaleSaving || accSalePrice === ''}
                  className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                  {accSaleSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  SALE RECORD KARO
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ════════ REFUND MODAL ════════ */}
      <AnimatePresence>
        {refundSale && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-[80]" onClick={() => setRefundSale(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-5">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
                  <RotateCcw className="w-8 h-8 text-orange-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-emerald-900">Refund / Reverse Sale?</h3>
                  <p className="text-slate-500 text-sm mt-2">
                    <span className="font-bold text-emerald-900">{refundSale.name}</span> · Profit{' '}
                    <span className="font-bold">{rs(Number(refundSale.profit) || 0)}</span> hisaab se kat jayega.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([['restock', '🟢 Wapas Stock'], ['dead', '🔴 Ban/Dead']] as const).map(([k, label]) => (
                    <button key={k} onClick={() => setRefundRestock(k === 'restock')}
                      className={cn('py-3 rounded-2xl border text-xs font-bold transition-colors',
                        (k === 'restock') === refundRestock ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-emerald-100 bg-white text-slate-500')}
                    >{label}</button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest">
                  {refundRestock ? 'Account available ho jayega' : 'Account refunded mark hoga (paisa wapas)'}
                </p>
                <input value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Wajah (optional): ban / customer return..."
                  className="w-full px-5 py-3.5 bg-orange-50/40 border border-orange-100 rounded-2xl text-sm font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-orange-400/20" />
                <div className="flex gap-3">
                  <button onClick={() => setRefundSale(null)}
                    className="flex-1 py-3 rounded-2xl border border-emerald-100 text-slate-600 font-bold hover:bg-emerald-50 transition-colors">Raho</button>
                  <button onClick={handleRefund} disabled={refundBusy}
                    className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {refundBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    Refund Karo
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ════════ EDIT ITEM MODAL (bottom-sheet mobile / centered desktop) ════════ */}
      <AnimatePresence>
        {editItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/20 backdrop-blur-md z-[80]" onClick={() => setEditItem(null)} />
            <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full max-w-md glass-card rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto pointer-events-auto">
                <button onClick={() => setEditItem(null)}
                  className="absolute right-6 top-6 p-2 rounded-full hover:bg-emerald-50 text-slate-400"><X className="w-5 h-5" /></button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-900"><Edit2 className="w-6 h-6" /></div>
                  <div>
                    <h2 className="text-2xl font-bold text-emerald-900">Edit Item</h2>
                    <p className="text-xs text-slate-400">Naam, category ya sell price theek karein</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>Item Name</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" />
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c} type="button" onClick={() => setEditCategory(c)}
                        className={cn('py-3 px-2 rounded-2xl border text-xs font-bold transition-colors',
                          editCategory === c ? 'border-emerald-900 bg-emerald-50 text-emerald-900' : 'border-emerald-100 bg-white text-slate-500 hover:bg-emerald-50/50')}
                      >{c === 'UC' ? '💎 UC' : c === 'Account' ? '👤 Account' : '📦 Item'}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>Sell Price / Unit (Rs)</label>
                  <input type="number" min="0" value={editSellPrice} onChange={e => setEditSellPrice(e.target.value)}
                    className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" />
                  <p className="text-[10px] text-slate-400 px-1">Avg cost ({rs(editItem.buyPrice)}) kharidari se khud update hota hai</p>
                </div>

                <button onClick={handleSaveEdit} disabled={editSaving}
                  className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                  {editSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Edit2 className="w-5 h-5" />}
                  Save Changes
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ════════ DELETE CONFIRM MODAL ════════ */}
      <AnimatePresence>
        {deleteEntry && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-[80]" onClick={() => setDeleteEntry(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center space-y-5">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-900">Delete Karo?</h3>
                  <p className="text-slate-500 text-sm mt-2">
                    {deleteEntry.kind === 'sale'
                      ? <>Ye sale delete hategi aur stock mein <span className="font-bold text-emerald-900">+{deleteEntry.quantity}</span> wapis aa jayega.</>
                      : deleteEntry.kind === 'direct'
                        ? <>Ye direct entry permanently delete ho jayegi.</>
                        : deleteEntry.kind === 'account'
                          ? <>Ye account permanently delete ho jayega (warranty record bhi).</>
                          : <>Ye purchase delete hoga aur stock <span className="font-bold text-red-500">−{deleteEntry.quantity}</span> ho jayega (agar maal bech chuke hain to 0 tak).</>}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteEntry(null)}
                    className="flex-1 py-3 rounded-2xl border border-emerald-100 text-slate-600 font-bold hover:bg-emerald-50 transition-colors">Raho</button>
                  <button onClick={confirmDeleteEntry} disabled={deleteBusy}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {deleteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Haan, Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ════════ EDIT LOGINS MODAL ════════ */}
      <AnimatePresence>
        {editLoginsAcc && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/20 backdrop-blur-md z-[80]" onClick={() => setEditLoginsAcc(null)} />
            <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full max-w-md glass-card rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto pointer-events-auto">
                <button onClick={() => setEditLoginsAcc(null)}
                  className="absolute right-6 top-6 p-2 rounded-full hover:bg-emerald-50 text-slate-400"><X className="w-5 h-5" /></button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600"><KeyRound className="w-6 h-6" /></div>
                  <div>
                    <h2 className="text-xl font-bold text-emerald-900">Edit Logins</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{editLoginsAcc.name}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Login Email</label>
                  <input type="email" value={editLoginsEmail} onChange={e => setEditLoginsEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Login Password</label>
                  <input value={editLoginsPassword} onChange={e => setEditLoginsPassword(e.target.value)}
                    placeholder="Account password"
                    className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" />
                </div>
                <p className="text-[10px] text-slate-400 px-1 font-bold">Ye logins PIN unlock ke baad hi dikhte hain stock mein. Bechne par sale record mein copy ho jayenge.</p>
                <button onClick={handleSaveLogins} disabled={editLoginsSaving}
                  className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                  {editLoginsSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                  Save Logins
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ════════ PIN UNLOCK MODAL ════════ */}
      <AnimatePresence>
        {showPinModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-[100]" onClick={() => { setShowPinModal(false); setPinInput(''); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl text-center space-y-5">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-900">PIN Unlock</h3>
                  <p className="text-slate-500 text-sm mt-2">Warranty links, logins, aur sensitive data dekhne ke liye PIN enter karein.</p>
                </div>
                <input type="password" inputMode="numeric" maxLength={6} value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handlePinUnlock(); }}
                  placeholder="••••"
                  className="w-full text-center text-2xl tracking-[0.5em] font-black px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" autoFocus />
                <div className="flex gap-3">
                  <button onClick={() => { setShowPinModal(false); setPinInput(''); }}
                    className="flex-1 py-3 rounded-2xl border border-emerald-100 text-slate-600 font-bold hover:bg-emerald-50 transition-colors">Cancel</button>
                  <button onClick={handlePinUnlock}
                    className="flex-1 py-3 rounded-2xl bg-emerald-900 text-white font-bold hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" /> Unlock
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

// ── Memoized table rows — list re-renders par sirf badle hue rows dobara render hote hain ──

const AccountRow = React.memo(({ a, isPinUnlocked, userRole, onShowPin, onEditLogins, onSell, onDelete }: {
  a: any;
  isPinUnlocked: boolean;
  userRole: string;
  onShowPin: () => void;
  onEditLogins: (a: any) => void;
  onSell: (a: any) => void;
  onDelete: (kind: string, a: any) => void;
}) => {
  const { formatProfit } = useProfitVisibility();
  const b = accountBadge(a);
  const profit = a.status === 'sold' ? (Number(a.soldPrice) || 0) - (Number(a.buyingPrice) || 0) : null;
  return (
    <tr className="border-b border-emerald-50/50 hover:bg-emerald-50/30">
      <td className="px-5 py-4">
        <p className="font-bold text-emerald-900">{a.name}</p>
        {a.characterId && <p className="text-[10px] text-slate-400 font-bold">ID: {a.characterId}</p>}
        <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', b.cls)}>{b.dot} {b.label}</span>
        {a.recoveryCode && <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">RC: {a.recoveryCode}</p>}
      </td>
      <td className="px-5 py-4 text-slate-600 font-medium">{a.ownerName}{a.ownerCnic ? <span className="block text-[10px] text-slate-400">CNIC: {a.ownerCnic}</span> : null}</td>
      <td className="px-5 py-4 text-slate-600 font-medium">{a.boughtFrom}</td>
      <td className="px-5 py-4 text-right font-bold text-emerald-900">{rs(Number(a.buyingPrice) || 0)}</td>
      <td className="px-5 py-4 text-slate-600 font-medium text-xs">
        {Number(a.warrantyDays) > 0
          ? <>{a.expiryDate} <span className="text-slate-400">({a.warrantyDays}d)</span></>
          : <span className="text-slate-400 font-bold">— No Warranty —</span>}
        {a.warrantyLink && (isPinUnlocked
          ? <a href={a.warrantyLink} target="_blank" rel="noreferrer" className="block text-emerald-600 underline text-[10px] mt-0.5"><Link2 className="w-3 h-3 inline" /> proof</a>
          : <button onClick={onShowPin} className="block mt-0.5 text-[10px] font-bold text-slate-400 hover:text-emerald-600">🔒 Link locked</button>
        )}
      </td>
      <td className="px-5 py-4 text-right">
        {profit !== null
          ? <span className={cn('font-black', profit < 0 ? 'text-red-500' : 'text-emerald-600')}>{formatProfit(profit, true)}</span>
          : <span className="text-slate-400 font-bold">—</span>}
      </td>
      <td className="px-5 py-4">
        <div className="flex gap-2 justify-end">
          {a.status === 'available' && userRole === 'owner' && (
            <button onClick={() => onEditLogins(a)} title="Edit Logins (email/password)"
              className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white rounded-xl transition-colors"><KeyRound className="w-4 h-4" /></button>
          )}
          {a.status === 'available' && (
            <button onClick={() => onSell(a)}
              className="px-3 py-2 bg-emerald-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors">Bechna</button>
          )}
          {userRole === 'owner' && (
            <button onClick={() => onDelete('account', a)}
              className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      </td>
    </tr>
  );
});

const ItemRow = React.memo(({ item, userRole, onEdit, onSell }: {
  item: any;
  userRole: string;
  onEdit: (item: any) => void;
  onSell: (item: any) => void;
}) => {
  const { formatProfit } = useProfitVisibility();
  const qty = Number(item.quantity) || 0;
  const margin = (Number(item.sellPrice) || 0) - (Number(item.buyPrice) || 0);
  const marginPct = item.sellPrice > 0 ? Math.round((margin / item.sellPrice) * 100) : 0;
  return (
    <tr className="border-b border-emerald-50/50 hover:bg-emerald-50/30">
      <td className="px-5 py-4">
        <p className="font-bold text-emerald-900">{item.name}</p>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {item.category === 'UC' ? '💎 UC' : item.category === 'Account' ? '👤 Account' : '📦 Item'}
        </span>
      </td>
      <td className="px-5 py-4 text-right">
        <span className={cn('inline-block px-3 py-1 rounded-full font-black text-white',
          qty === 0 ? 'bg-red-500' : qty <= 2 ? 'bg-orange-400' : 'bg-emerald-900')}>{qty}</span>
      </td>
      <td className="px-5 py-4 text-right font-bold text-emerald-900">{rs(item.buyPrice)}</td>
      <td className="px-5 py-4 text-right font-bold text-emerald-900">{rs(item.sellPrice)}</td>
      <td className={cn('px-5 py-4 text-right font-black', margin < 0 ? 'text-red-500' : 'text-emerald-600')}>
        {formatProfit(margin, true)} <span className="text-[10px] text-slate-400">({marginPct}%)</span>
      </td>
      <td className="px-5 py-4">
        <div className="flex gap-2 justify-end">
          {userRole === 'owner' && (
            <button onClick={() => onEdit(item)} title="Edit"
              className="p-2.5 bg-emerald-50 text-emerald-700 hover:text-white hover:bg-emerald-700 rounded-xl transition-colors"><Edit2 className="w-4 h-4" /></button>
          )}
          <button
            onClick={() => onSell(item)}
            disabled={qty === 0}
            className="px-3 py-2 bg-emerald-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors disabled:opacity-40">Bechna</button>
        </div>
      </td>
    </tr>
  );
});

const HistoryRow = React.memo(({ e, isPinUnlocked, userRole, onRefund, onDelete }: {
  e: any;
  isPinUnlocked: boolean;
  userRole: string;
  onRefund: (e: any) => void;
  onDelete: (kind: string, e: any) => void;
}) => {
  const { formatProfit } = useProfitVisibility();
  const d = e.date?.toDate?.();
  const isSale = e.kind === 'sale';
  const isDirect = e.kind === 'direct';
  const profit = Number(e.profit) || 0;
  return (
    <tr className={cn('border-b border-emerald-50/50 hover:bg-emerald-50/30', e.refunded && 'opacity-60')}>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
            isSale ? 'bg-emerald-900 text-white' : isDirect ? 'bg-violet-100 text-violet-600' : 'bg-emerald-50 text-emerald-900')}>
            {isSale ? <Coins className="w-4 h-4" /> : isDirect ? <ArrowLeftRight className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          </div>
          <span className={cn('font-bold text-emerald-900', e.refunded && 'line-through')}>
            {isDirect ? (e.description || e.type) : e.name}
            {!isDirect && <span className="text-slate-400 font-normal"> × {e.quantity}</span>}
          </span>
        </div>
      </td>
      <td className="px-5 py-4 text-slate-500 font-medium text-xs">
        {d ? d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
        {e.refunded && <span className="block text-red-400 font-bold">↩ Refunded</span>}
        {isSale && isLoginTransferOverdue(e) && (
          <span className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[9px] font-bold uppercase tracking-wide animate-pulse w-fit">
            <AlertTriangle className="w-2.5 h-2.5" /> Logins Change Karwao (7+ days)
          </span>
        )}
      </td>
      <td className="px-5 py-4 text-slate-500 font-medium text-xs">
        {isSale && (e.saleType === 'account' ? '👤 account' : e.saleType === 'direct-uc' ? `⚡ direct ${e.directCategory || 'UC'}` : '📦 stock')}
        {isSale && e.platformFee ? ` · fee ${rs(Number(e.platformFee))}` : ''}
        {isSale && e.customerName ? ` · ${e.customerName}` : ''}
        {isSale && e.saleType === 'account' && (e.loginEmail || e.loginPassword) && (
          <span className="ml-1">{isPinUnlocked ? '✉' : '🔒'} logins</span>
        )}
        {!isSale && !isDirect && e.source ? e.source : ''}
        {isDirect && e.type}
      </td>
      <td className="px-5 py-4 text-right font-black text-emerald-950">
        {rs(isSale ? (Number(e.totalAmount) || 0) : isDirect ? (Number(e.amount) || 0) : (Number(e.totalCost) || 0))}
      </td>
      <td className="px-5 py-4 text-right">
        {isSale && (
          <span className={cn('font-black', e.refunded ? 'text-slate-400 line-through' : profit < 0 ? 'text-red-500' : 'text-emerald-600')}>
            {formatProfit(profit, true)}
          </span>
        )}
        {isDirect && (
          <span className={cn('font-black', e.type === 'profit' ? 'text-emerald-600' : e.type === 'loss' ? 'text-orange-500' : 'text-slate-500')}>
            {e.type === 'expense' ? rs(Number(e.amount) || 0) : formatProfit(e.type === 'loss' ? -Math.abs(Number(e.amount) || 0) : Math.abs(Number(e.amount) || 0), true)}
          </span>
        )}
        {!isSale && !isDirect && <span className="text-slate-400 font-bold">—</span>}
      </td>
      <td className="px-5 py-4">
        <div className="flex gap-2 justify-end">
          {userRole === 'owner' && isSale && !e.refunded && e.saleType === 'account' && (
            <button onClick={() => onRefund(e)} title="Refund / Reverse"
              className="p-2.5 bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white rounded-xl transition-colors"><RotateCcw className="w-4 h-4" /></button>
          )}
          {userRole === 'owner' && !(isSale && e.saleType === 'account' && !e.refunded) && (
            <button onClick={() => onDelete(e.kind, e)} title="Delete"
              className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      </td>
    </tr>
  );
});
