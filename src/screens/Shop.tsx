import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag, Package, ShoppingCart, Coins, TrendingUp, TrendingDown, Wallet, Boxes,
  Trash2, Edit2, X, Loader2, User, Phone, Truck, AlertTriangle, Plus, Search, CheckCircle,
  History as HistoryIcon, Globe, PackageCheck, RotateCcw, HeartCrack, Barcode, Users, Mail,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { useProfitVisibility } from '../context/ProfitVisibilityContext';
import { NumberTicker, FlipIn, ShimmerSweep } from '../components/magicui';
import { searchList, normalizeText } from '../lib/search';

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = ['🎧 Audio', '📱 Mobile', '🔌 Cables', '⌚ Wearables', '🎯 Gaming', '🏷️ Other'] as const;
const PLATFORMS = [
  { key: 'olx', label: 'OLX' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'walkin', label: 'Walk-in' },
  { key: 'other', label: 'Other' },
] as const;
type PlatformKey = (typeof PLATFORMS)[number]['key'];
type Tab = 'pending' | 'active' | 'buy' | 'order' | 'history' | 'vendors';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'pending', label: 'Pending', icon: <Truck /> },
  { key: 'active', label: 'Active Stock', icon: <Package /> },
  { key: 'buy', label: 'Add Order', icon: <ShoppingCart /> },
  { key: 'order', label: 'Order', icon: <ShoppingBag /> },
  { key: 'history', label: 'History', icon: <HistoryIcon /> },
  { key: 'vendors', label: 'Vendors', icon: <Users /> },
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

// ── Workflow helpers ───────────────────────────────────────────────────────────

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

// 15-day delay alert — sirf 'shipping' items ke liye (shippedAt se aaj tak 15+ din)
const isDelayed = (item: any): boolean => {
  if ((item.status || 'active') !== 'shipping' || !item.shippedAt) return false;
  const t = item.shippedAt?.toDate?.()?.getTime?.()
    ?? (typeof item.shippedAt === 'number' ? item.shippedAt : 0);
  return t > 0 && (Date.now() - t) > FIFTEEN_DAYS_MS;
};

// Din gin-ta hai expiry tak (null = no expiry). 🟠 badge if ≤ 7.
const daysToExpiry = (iso?: string): number | null => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ── Screen ─────────────────────────────────────────────────────────────────────

export const Shop: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const { showToast } = useToast();
  const { formatProfit } = useProfitVisibility();

  const [items, setItems] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [purchases, setPurchases] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<Tab>('active');

  // Products tab
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');

  // Pending/History email search — batches orderEmail se milte hain
  const [pendingSearch, setPendingSearch] = React.useState('');
  const [historySearch, setHistorySearch] = React.useState('');

  // Add Order form — batch-based: orderEmail required, batch 'processing' se shuru hota hai
  const [buyName, setBuyName] = React.useState('');
  const [buyCategory, setBuyCategory] = React.useState<string>('🏷️ Other');
  const [buyQty, setBuyQty] = React.useState('1');
  const [buyCost, setBuyCost] = React.useState('');
  const [buyEmail, setBuyEmail] = React.useState('');
  const [buySource, setBuySource] = React.useState('');
  const [buyLowStock, setBuyLowStock] = React.useState('2');
  const [buyTracking, setBuyTracking] = React.useState('');
  const [buyShowDropdown, setBuyShowDropdown] = React.useState(false);
  const [buySaving, setBuySaving] = React.useState(false);

  // Order form
  const [orderItemId, setOrderItemId] = React.useState('');
  const [orderSearch, setOrderSearch] = React.useState('');
  const [orderVariant, setOrderVariant] = React.useState('');
  const [orderQty, setOrderQty] = React.useState('1');
  const [orderPrice, setOrderPrice] = React.useState('');
  const [courierReceived, setCourierReceived] = React.useState('0');
  const [courierPaid, setCourierPaid] = React.useState('0');
  const [platform, setPlatform] = React.useState<PlatformKey>('olx');
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [orderNote, setOrderNote] = React.useState('');
  const [orderSaving, setOrderSaving] = React.useState(false);

  // Workflow modals — shipping (trackingId) / damage (qty + reason)
  const [shipItem, setShipItem] = React.useState<any | null>(null);
  const [shipTracking, setShipTracking] = React.useState('');
  const [shipSaving, setShipSaving] = React.useState(false);
  const [deliverBusyId, setDeliverBusyId] = React.useState<string | null>(null);
  const [damageItem, setDamageItem] = React.useState<any | null>(null);
  const [damageQty, setDamageQty] = React.useState('1');
  const [damageReason, setDamageReason] = React.useState('');
  const [damageSaving, setDamageSaving] = React.useState(false);
  const [returnBusyId, setReturnBusyId] = React.useState<string | null>(null);

  // Vendors tab
  const [vendors, setVendors] = React.useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = React.useState<string | null>(null);

  // History tab
  const [historyFilter, setHistoryFilter] = React.useState<'all' | 'purchase' | 'order' | 'loss' | 'month'>('all');
  const [deleteEntry, setDeleteEntry] = React.useState<any | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  // Edit product modal
  const [editItem, setEditItem] = React.useState<any | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editLowStock, setEditLowStock] = React.useState('2');
  const [editSaving, setEditSaving] = React.useState(false);

  // Archive + Stock History (DigiKhata style purchase ledger)
  const [showArchived, setShowArchived] = React.useState(false);
  const [historyItem, setHistoryItem] = React.useState<any | null>(null);
  const [editPurch, setEditPurch] = React.useState<any | null>(null);
  const [editPurchQty, setEditPurchQty] = React.useState('');
  const [editPurchCost, setEditPurchCost] = React.useState('');

  // Pending card email edit — inline input (batch ya legacy item dono par)
  const [emailEdit, setEmailEdit] = React.useState<{ id: string; isBatch: boolean } | null>(null);
  const [emailInput, setEmailInput] = React.useState('');
  const [editPurchSaving, setEditPurchSaving] = React.useState(false);

  // ── Data (real-time, 5s safety fallback — same as Stock.tsx) ────────────────
  React.useEffect(() => {
    let timeout: any;
    const done = () => { setLoading(false); if (timeout) clearTimeout(timeout); };
    const u1 = dataService.subscribeToShopItems((d: any[]) => { setItems(d); done(); });
    const u2 = dataService.subscribeToShopOrders((d: any[]) => setOrders(d));
    const u3 = dataService.subscribeToShopPurchases((d: any[]) => setPurchases(d));
    timeout = setTimeout(() => setLoading(false), 5000);
    return () => { u1(); u2(); u3(); if (timeout) clearTimeout(timeout); };
  }, []);

  // Vendors (one-time — vendor CRUD /vendors screen par hai)
  React.useEffect(() => {
    let alive = true;
    dataService.getVendors().then((v: any[]) => { if (alive) setVendors(v || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // ── Pending stats — deliver nahi hua maal ka paisa (batches + legacy items, unfiltered) ──
  const pendingStats = React.useMemo(() => {
    const batches = purchases.filter(p => p.status === 'processing' || p.status === 'shipping');
    const legacy = items.filter(i => i.status === 'processing' || i.status === 'shipping');
    const batchTotal = batches.reduce((a, b) => a + (Number(b.totalCost) || 0), 0);
    const legacyTotal = legacy.reduce((a, i) => a + (Number(i.totalInvested) || 0), 0);
    return { total: batchTotal + legacyTotal, count: batches.length + legacy.length };
  }, [purchases, items]);

  // ── Derived stats ────────────────────────────────────────────────────────────
  // Lagaya Hua = Active Stock + Pending parcels dono (breakdown footer mein dikhta hai).
  // Stock Value sirf Active Stock se (pending maal abhi bik nahi sakta).
  const stats = React.useMemo(() => {
    const isPendingItem = (i: any) => i.status === 'processing' || i.status === 'shipping';
    const activeItems = items.filter(i => !isPendingItem(i));
    const activeInvested = activeItems.reduce((a, i) => a + (Number(i.totalInvested) || 0), 0);
    const stockValue = activeItems.reduce((a, i) => a + (Number(i.quantity) || 0) * (Number(i.sellPrice) || 0), 0);
    const invested = activeInvested + pendingStats.total;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let today = 0, month = 0, total = 0;
    orders.forEach(s => {
      const p = Number(s.profit) || 0;
      total += p;
      const d = s.date?.toDate?.();
      if (d) {
        const t = d.getTime();
        if (t >= todayStart) today += p;
        if (t >= monthStart) month += p;
      }
    });

    return { invested, activeInvested, stockValue, expected: stockValue - activeInvested, today, month, total };
  }, [items, orders, pendingStats]);

  // Monthly chart data (last 6 months, loss months negative → red bars)
  const chartData = React.useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach(s => {
      const d = s.date?.toDate?.() ?? (s.date ? new Date(s.date) : null);
      if (!d) return;
      const key = monthKeyOf(d);
      map.set(key, (map.get(key) || 0) + (Number(s.profit) || 0));
    });
    const out: { label: string; profit: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKeyOf(d);
      out.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), profit: Math.round(map.get(key) || 0) });
    }
    return out;
  }, [orders]);

  // Per-platform breakdown (this month)
  const platformStats = React.useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const map = new Map<string, { count: number; profit: number }>();
    orders.forEach(o => {
      if (o.type === 'loss' || o.refunded) return;   // loss/returned platform report mein nahi
      const d = o.date?.toDate?.();
      if (!d || d.getTime() < monthStart) return;
      const cur = map.get(o.platform) || { count: 0, profit: 0 };
      cur.count += 1;
      cur.profit += Number(o.profit) || 0;
      map.set(o.platform, cur);
    });
    return PLATFORMS.map(p => ({ ...p, ...(map.get(p.key) || { count: 0, profit: 0 }) }))
      .filter(p => p.count > 0)
      .sort((a, b) => b.profit - a.profit);
  }, [orders]);

  const filteredItems = React.useMemo(() => {
    let list = items;
    if (categoryFilter) list = list.filter(i => i.category === categoryFilter);
    if (search.trim()) list = searchList(search, list as any[], i => i.name, 100);
    return list;
  }, [items, categoryFilter, search]);

  // Step-wise workflow sections — Pending (processing/shipping) vs Active Stock (active + sold)
  // Archived items Active Stock + sale + dead-stock sab se hidden (Show Archived se dikhte hain)
  // v2: Pending = naye email-based BATCHES (shopPurchases status ≠ active) + purane legacy pending items
  const matchesSearch = React.useCallback((obj: any, fields: string[]) => {
    const q = normalizeText(pendingSearch);
    if (!q) return true;
    return fields.some(f => normalizeText(String(obj?.[f] || '')).includes(q));
  }, [pendingSearch]);

  const pendingBatches = React.useMemo(() => {
    let list = purchases.filter(p => p.status === 'processing' || p.status === 'shipping');
    if (categoryFilter) list = list.filter(p => p.category === categoryFilter);
    if (pendingSearch.trim()) list = list.filter(p => matchesSearch(p, ['name', 'orderEmail']));
    return list; // purchases subscription date-desc mein aata hai
  }, [purchases, categoryFilter, pendingSearch, matchesSearch]);

  const legacyPendingItems = React.useMemo(() => {
    let list = items.filter(i => i.status === 'processing' || i.status === 'shipping');
    if (categoryFilter) list = list.filter(i => i.category === categoryFilter);
    if (pendingSearch.trim()) list = list.filter(i => matchesSearch(i, ['name', 'email']));
    return list;
  }, [items, categoryFilter, pendingSearch, matchesSearch]);

  const activeStockItems = React.useMemo(
    () => filteredItems.filter(i => i.status !== 'processing' && i.status !== 'shipping' && !i.archived),
    [filteredItems]
  );
  const archivedItems = React.useMemo(
    () => filteredItems.filter(i => i.archived),
    [filteredItems]
  );

  // Sale sirf Active Stock se — status 'active' + qty > 0 + non-archived (legacy docs = active)
  const sellableItems = React.useMemo(
    () => items.filter(i => (i.status || 'active') === 'active' && !i.archived && (Number(i.quantity) || 0) > 0),
    [items]
  );
  const orderItem = sellableItems.find(i => i.id === orderItemId) || null;

  // Search-based sale — naam / email / trackingId / SKU par fuzzy match
  const orderSearchResults = React.useMemo(() => {
    if (!orderSearch.trim()) return [];
    return searchList(orderSearch, sellableItems as any[], i =>
      `${i.name || ''} ${i.email || ''} ${i.trackingId || ''} ${i.sku || ''}`, 8);
  }, [orderSearch, sellableItems]);

  // Last sold price (orders date-desc hote hain — pehli match latest hai)
  const lastSoldPrice = (itemId: string): number => {
    const o = orders.find(x => x.itemId === itemId && x.type !== 'loss' && !x.refunded);
    return o ? (Number(o.unitPrice) || 0) : 0;
  };

  // Daily sales + profit — current month (Recharts BarChart)
  const dailyChartData = React.useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const map = new Map<number, { sales: number; profit: number }>();
    orders.forEach(o => {
      if (o.type === 'loss' || o.refunded) return;
      const d = o.date?.toDate?.();
      if (!d || d.getTime() < monthStart) return;
      const cur = map.get(d.getDate()) || { sales: 0, profit: 0 };
      cur.sales += Number(o.totalAmount) || 0;
      cur.profit += Number(o.profit) || 0;
      map.set(d.getDate(), cur);
    });
    const out: { label: string; sales: number; profit: number }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const cur = map.get(day);
      out.push({ label: String(day), sales: Math.round(cur?.sales || 0), profit: Math.round(cur?.profit || 0) });
    }
    return out;
  }, [orders]);

  // Best Sellers — top 5 by qty sold (last 30 days)
  const bestSellers = React.useMemo(() => {
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    orders.forEach(o => {
      if (o.type === 'loss' || o.refunded) return;
      const d = o.date?.toDate?.();
      if (!d || d.getTime() < cutoff) return;
      const key = o.itemId || o.name;
      const cur = map.get(key) || { name: o.name, qty: 0, revenue: 0 };
      cur.qty += Number(o.quantity) || 0;
      cur.revenue += Number(o.totalAmount) || 0;
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [orders]);

  // Dead Stock — 'active' items with stock but 0 sales in last 30 days
  const deadStock = React.useMemo(() => {
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const soldRecent = new Set<string>();
    orders.forEach(o => {
      if (o.type === 'loss' || o.refunded) return;
      const d = o.date?.toDate?.();
      if (!d || d.getTime() < cutoff) return;
      soldRecent.add(o.itemId || o.name);
    });
    return items.filter(i =>
      (i.status || 'active') === 'active'
      && (Number(i.quantity) || 0) > 0
      && !soldRecent.has(i.id) && !soldRecent.has(i.name)
    );
  }, [items, orders]);

  // ── Add Order form — product directory = Active Stock + SAARE purane order/batch names ──
  // (naya workflow: pending batches shopItems mein nahi aati — phir bhi naam search mein dikhna chahiye)
  const productDirectory = React.useMemo(() => {
    const map = new Map<string, any>();
    items.forEach(i => {
      const k = normalizeText(i.name);
      if (!map.has(k)) map.set(k, { name: i.name, category: i.category, isItem: true, quantity: i.quantity });
    });
    purchases.forEach(p => {
      const k = normalizeText(p.name);
      if (!map.has(k)) map.set(k, { name: p.name, category: p.category, isItem: false, quantity: 0 });
    });
    return [...map.values()];
  }, [items, purchases]);

  const existingNameMatch = buyName.trim()
    ? productDirectory.find(i => normalizeText(i.name) === normalizeText(buyName))
    : undefined;
  const buySuggestions = React.useMemo(() => {
    if (!buyName.trim() || existingNameMatch) return [];
    return searchList(buyName, productDirectory as any[], i => i.name, 5);
  }, [buyName, productDirectory, existingNameMatch]);

  const buyQtyN = parseFloat(buyQty) || 0;
  const buyCostN = parseFloat(buyCost) || 0;
  const buyTotal = buyQtyN * buyCostN;

  // ── Add Order form — optimistic: toast + reset turant, Firestore background mein ──
  const handleBuy = () => {
    if (!buyName.trim()) { showToast('Product ka naam likhein', 'warning'); return; }
    const email = buyEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { showToast('Order email likhein (jaise: name@gmail.com)', 'warning'); return; }
    if (buyQtyN <= 0) { showToast('Quantity sahi likhein', 'warning'); return; }
    if (buyCostN < 0 || buyCost === '') { showToast('Cost sahi likhein', 'warning'); return; }
    const payload = {
      name: buyName.trim(),
      category: buyCategory,
      quantity: buyQtyN,
      unitCost: buyCostN,
      orderEmail: email,
      source: buySource || undefined,
      lowStockAt: parseInt(buyLowStock) || 2,
      trackingId: buyTracking || undefined,
    };
    showToast(`Order add ho gaya ✅ (${payload.name} × ${payload.quantity}) — ${email}`, 'success');
    setBuyName(''); setBuyQty('1'); setBuyCost(''); setBuyEmail(''); setBuySource(''); setBuyLowStock('2'); setBuyTracking('');
    setTab('pending'); // naya batch 'processing' mein wait karega
    setBuySaving(true);
    dataService.addShopPurchase(payload)
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setBuySaving(false));
  };

  // ── Order form ───────────────────────────────────────────────────────────────
  const orderQtyN = parseFloat(orderQty) || 0;
  const orderPriceN = parseFloat(orderPrice) || 0;
  const cRecN = parseFloat(courierReceived) || 0;
  const cPaidN = parseFloat(courierPaid) || 0;
  const previewCost = orderItem ? (Number(orderItem.buyPrice) || 0) * orderQtyN : 0;
  const previewAmount = orderPriceN * orderQtyN;
  const previewProfit = previewAmount + cRecN - previewCost - cPaidN;
  // profitMarginPercentage = ((salePrice − avgCost) / salePrice) × 100
  const previewMarginPct = orderPriceN > 0 && orderItem
    ? Math.round(((orderPriceN - (Number(orderItem.buyPrice) || 0)) / orderPriceN) * 100)
    : 0;

  // Auto-suggest price: sellPrice, warna last sold price
  const handleItemPick = (id: string) => {
    setOrderItemId(id);
    setOrderVariant('');
    setOrderSearch('');
    const it = items.find(i => i.id === id);
    if (it) {
      const sp = Number(it.sellPrice) || 0;
      const last = lastSoldPrice(id);
      setOrderPrice(sp > 0 ? String(sp) : last > 0 ? String(last) : '');
    }
  };

  const handleOrder = () => {
    if (!orderItem) { showToast('Product select karein', 'warning'); return; }
    if (orderQtyN <= 0) { showToast('Quantity sahi likhein', 'warning'); return; }
    if (orderQtyN > (Number(orderItem.quantity) || 0)) {
      showToast(`Stock kam hai — sirf ${orderItem.quantity} maujood`, 'warning'); return;
    }
    if (orderPrice === '' || orderPriceN < 0) { showToast('Price sahi likhein', 'warning'); return; }
    const item = orderItem;
    const msg = previewProfit >= 0
      ? `Order record ho gaya ✅ Profit: ${formatProfit(previewProfit)}`
      : `Order record ho gaya ✅ Loss: ${formatProfit(Math.abs(previewProfit))}`;
    showToast(msg, previewProfit >= 0 ? 'success' : 'warning');
    setOrderQty('1'); setCourierReceived('0'); setCourierPaid('0'); setCustomerName(''); setCustomerPhone(''); setOrderNote('');
    setOrderItemId(''); setOrderSearch(''); setOrderVariant(''); setOrderPrice('');
    setTab('history');
    setOrderSaving(true);
    dataService.addShopOrder({
      itemId: item.id,
      quantity: orderQtyN,
      unitPrice: orderPriceN,
      courierReceived: cRecN,
      courierPaid: cPaidN,
      platform,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      note: orderNote || undefined,
      variantLabel: orderVariant || undefined,
    })
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setOrderSaving(false));
  };

  // ── Workflow handlers (batch ship/activate, legacy deliver, return, damage) ────
  // Sab optimistic — modal/toast turant, Firestore background mein
  const handleMarkShipping = () => {
    if (!shipItem) return;
    if (!shipTracking.trim()) { showToast('Tracking ID likhein', 'warning'); return; }
    const target = shipItem;
    const tracking = shipTracking.trim();
    showToast(`Shipping mark ho gaya ✅ Tracking: ${tracking}`, 'success');
    setShipItem(null); setShipTracking('');
    setShipSaving(true);
    (target.isBatch
      ? dataService.markShopBatchShipping(target.id, tracking)
      : dataService.markShopItemShipping(target.id, tracking)
    )
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setShipSaving(false));
  };

  const handleMarkDelivered = (item: any) => {
    showToast(`${item.name} deliver ho gaya — Active Stock mein ✅`, 'success');
    setDeliverBusyId(item.id);
    dataService.markShopItemDelivered(item.id)
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setDeliverBusyId(null));
  };

  // Batch → Active Stock: quantity shopItems mein merge, batch history 'active' mark
  const handleActivateBatch = (batch: any) => {
    showToast(`${batch.name} deliver — Active Stock mein merge ho gaya ✅`, 'success');
    dataService.activateShopBatch(batch.id)
      .catch((e: any) => showToast(errText(e), 'error'));
  };

  // ── Pending card: inline email edit + delete (batch ya legacy item) ──────────
  const openEmailEdit = (row: any, isBatch: boolean) => {
    setEmailEdit({ id: row.id, isBatch });
    setEmailInput(String(row.orderEmail || row.email || ''));
  };

  // Optimistic — input band + toast turant, Firestore background mein
  const handleSaveEmail = () => {
    if (!emailEdit) return;
    const email = emailInput.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { showToast('Email sahi likhein (jaise: name@gmail.com)', 'warning'); return; }
    const target = emailEdit;
    setEmailEdit(null);
    showToast('Email update ho gaya ✅', 'success');
    (target.isBatch
      ? dataService.updateShopBatchEmail(target.id, email)
      : dataService.updateShopItem(target.id, { orderEmail: email })
    )
      .catch((e: any) => showToast(errText(e), 'error'));
  };

  const handleDeletePending = (row: any, isBatch: boolean) => {
    if (!window.confirm(`Delete order for ${row.name}? This cannot be undone.`)) return;
    showToast('Order delete ho gaya ✅', 'success');
    setEmailEdit(prev => (prev?.id === row.id ? null : prev));
    (isBatch ? dataService.deleteShopBatch(row.id) : dataService.deleteShopItem(row.id))
      .catch((e: any) => showToast(errText(e), 'error'));
  };

  const handleDamage = () => {
    if (!damageItem) return;
    const q = parseFloat(damageQty) || 0;
    if (q <= 0) { showToast('Damage quantity likhein', 'warning'); return; }
    if (q > (Number(damageItem.quantity) || 0)) {
      showToast(`Stock kam hai — sirf ${damageItem.quantity} maujood`, 'warning'); return;
    }
    const target = damageItem;
    showToast('Damage/Loss record ho gaya — stock adjust ✅', 'success');
    setDamageItem(null); setDamageQty('1'); setDamageReason('');
    setDamageSaving(true);
    dataService.markShopItemDamaged(target.id, q, damageReason || undefined)
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setDamageSaving(false));
  };

  const handleReturn = (e: any) => {
    showToast('Return ho gaya — stock restore + profit adjust ✅', 'success');
    setReturnBusyId(e.id);
    dataService.returnShopOrder({
      id: e.id,
      itemId: e.itemId,
      quantity: Number(e.quantity) || 0,
      unitCost: Number(e.unitCost) || 0,
      profit: Number(e.profit) || 0,
    })
      .catch((err: any) => showToast(errText(err), 'error'))
      .finally(() => setReturnBusyId(null));
  };

  // ── History ──────────────────────────────────────────────────────────────────
  const historyEntries = React.useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const list: any[] = [];
    purchases.forEach(p => list.push({ kind: 'purchase', ...p }));
    orders.forEach(o => list.push({ kind: 'order', ...o }));   // type 'order' | 'loss' dono
    list.sort((a, b) => {
      const da = a.date?.toDate?.()?.getTime() ?? 0;
      const db = b.date?.toDate?.()?.getTime() ?? 0;
      return db - da;
    });
    // Email search — orderEmail (batches) ya naam se filter
    let filtered = list;
    if (historySearch.trim()) {
      const q = normalizeText(historySearch);
      filtered = filtered.filter(e => normalizeText(String(e.name || '')).includes(q) || normalizeText(String(e.orderEmail || '')).includes(q));
    }
    if (historyFilter === 'purchase') return filtered.filter(e => e.kind === 'purchase');
    if (historyFilter === 'order') return filtered.filter(e => e.kind === 'order' && e.type !== 'loss');
    if (historyFilter === 'loss') return filtered.filter(e => e.type === 'loss');
    if (historyFilter === 'month') return filtered.filter(e => (e.date?.toDate?.()?.getTime() ?? 0) >= monthStart);
    return filtered;
  }, [purchases, orders, historyFilter, historySearch]);

  const confirmDeleteEntry = () => {
    if (!deleteEntry) return;
    const target = deleteEntry;
    setDeleteEntry(null);
    setDeleteBusy(true);
    if (target.kind === 'order') {
      showToast('Order delete — stock wapis restore ✅', 'success');
      dataService.deleteShopOrder({
        id: target.id,
        itemId: target.itemId,
        quantity: Number(target.quantity) || 0,
        unitCost: Number(target.unitCost) || 0,
      })
        .catch((e: any) => showToast(errText(e), 'error'))
        .finally(() => setDeleteBusy(false));
    } else {
      showToast('Purchase delete — stock adjust ho gaya ✅', 'success');
      dataService.deleteShopPurchase({
        id: target.id,
        name: target.name,
        quantity: Number(target.quantity) || 0,
        totalCost: Number(target.totalCost) || 0,
        status: target.status,
      })
        .catch((e: any) => showToast(errText(e), 'error'))
        .finally(() => setDeleteBusy(false));
    }
  };

  // ── Edit product ─────────────────────────────────────────────────────────────
  const openEdit = (item: any) => {
    setEditItem(item);
    setEditName(item.name || '');
    setEditLowStock(String(item.lowStockAt ?? 2));
  };

  const handleSaveEdit = () => {
    if (!editItem) return;
    if (!editName.trim()) { showToast('Product ka naam likhein', 'warning'); return; }
    const id = editItem.id;
    const updates = {
      name: editName.trim(),
      lowStockAt: Math.max(0, parseInt(editLowStock) || 2),
    };
    showToast('Product update ho gaya ✅', 'success');
    setEditItem(null);
    if (historyItem) setHistoryItem({ ...historyItem, name: updates.name, lowStockAt: updates.lowStockAt });
    setEditSaving(true);
    dataService.updateShopItem(id, updates)
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setEditSaving(false));
  };

  // ── Archive / Stock History ──────────────────────────────────────────────────
  const openStockHistory = (item: any) => {
    setHistoryItem(item);
    setEditPurch(null);
  };

  const handleArchive = (item: any, archived: boolean) => {
    showToast(archived ? `${item.name} archive ho gaya 📦` : `${item.name} wapis Active Stock mein ✅`, 'success');
    if (historyItem) setHistoryItem(null);
    dataService.updateShopItem(item.id, { archived })
      .catch((e: any) => showToast(errText(e), 'error'));
  };

  const openPurchaseEdit = (p: any) => {
    setEditPurch(p);
    setEditPurchQty(String(p.quantity || ''));
    setEditPurchCost(String(p.unitCost || ''));
  };

  const handleSavePurchaseEdit = () => {
    if (!editPurch || !historyItem) return;
    const q = parseFloat(editPurchQty) || 0;
    const c = parseFloat(editPurchCost) || 0;
    if (q <= 0) { showToast('Quantity sahi likhein', 'warning'); return; }
    if (c < 0 || editPurchCost === '') { showToast('Cost sahi likhein', 'warning'); return; }
    const purchId = editPurch.id;
    const itemName = historyItem.name;
    showToast('Purchase update ✅ — avg cost bhi recalc ho gaya', 'success');
    setEditPurch(null);
    setEditPurchSaving(true);
    dataService.updateShopPurchase(purchId, { quantity: q, unitCost: c }, itemName)
      .catch((e: any) => showToast(errText(e), 'error'))
      .finally(() => setEditPurchSaving(false));
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-emerald-900/40">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="font-bold uppercase text-xs tracking-widest">Online Shop load ho raha hai...</p>
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
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-emerald-900">Online Shop</h1>
          </div>
          <p className="text-slate-500 text-lg mt-2 max-w-lg">Accessories ka stock, orders aur munafa — OLX, Facebook, WhatsApp sab jagah ka hisaab.</p>
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
              <p className="text-[10px] text-slate-400 italic mt-2 pt-2 border-t border-emerald-50/50">
                Active: Rs {Math.round(stats.activeInvested).toLocaleString()} · Pending: Rs {Math.round(pendingStats.total).toLocaleString()}
              </p>
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
              <p className="text-[10px] text-slate-400 italic mt-2 pt-2 border-t border-emerald-50/50">Active Stock bechne rate se · Expected: {formatProfit(stats.expected, true)}</p>
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
              <p className="text-[10px] text-slate-400 italic mt-2 pt-2 border-t border-emerald-50/50">Total kamaya: {formatProfit(stats.total, true)}</p>
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
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Munafa Is Mahine</p>
              <h3 className={cn('text-xl md:text-2xl font-bold mt-0.5', stats.month < 0 ? 'text-red-500' : 'text-emerald-900')}>
                {formatProfit(stats.month, true)}
              </h3>
              <p className="text-[10px] text-slate-400 italic mt-2 pt-2 border-t border-emerald-50/50">{stats.month < 0 ? 'Loss chal raha hai' : 'Profit chal raha hai'}</p>
            </div>
          </ShimmerSweep>
        </FlipIn>
      </div>

      {/* Tabs */}
      <div className="glass-card rounded-full p-1.5 flex gap-1 overflow-x-auto">
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

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          {/* ════════ PENDING STOCK TAB — email-based batches + legacy items ════════ */}
          {tab === 'pending' && (
            <div className="space-y-4">
              {/* Filters + email search */}
              <div className="glass-card rounded-2xl p-3 md:p-4 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategoryFilter(null)}
                    className={cn('px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors',
                      !categoryFilter ? 'bg-emerald-900 border-emerald-900 text-white' : 'bg-emerald-50/60 border-emerald-100 text-slate-600 hover:bg-emerald-50')}
                  >Sab ({pendingBatches.length + legacyPendingItems.length})</button>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setCategoryFilter(c)}
                      className={cn('px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors',
                        categoryFilter === c ? 'bg-emerald-900 border-emerald-900 text-white' : 'bg-emerald-50/60 border-emerald-100 text-slate-600 hover:bg-emerald-50')}
                    >{c}</button>
                  ))}
                </div>
                <div className="relative w-full md:w-64 group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-emerald-700" />
                  <input
                    value={pendingSearch} onChange={e => setPendingSearch(e.target.value)}
                    placeholder="Email ya naam se search..."
                    className="w-full pl-10 pr-3 py-2.5 bg-white/70 border border-emerald-50 rounded-xl text-xs font-medium text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5"
                  />
                </div>
              </div>

              {/* Pending total — kitne paise ke parcels deliver nahi hue */}
              {pendingStats.count > 0 && (
                <div className="glass-card rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-amber-400">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending Stock — Total Payment</p>
                    <p className="text-2xl md:text-3xl font-bold text-emerald-900">Rs {Math.round(pendingStats.total).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 italic">Deliver hone par ye amount Active Stock (Lagaya Hua) mein shamil ho jata hai</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl md:text-3xl font-bold text-amber-600">{pendingStats.count}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">parcels pending</p>
                  </div>
                </div>
              )}

              {pendingBatches.length === 0 && legacyPendingItems.length === 0 ? (
                <div className="glass-card rounded-2xl p-8 text-center">
                  <p className="text-3xl mb-2">📦</p>
                  <p className="text-slate-400 font-bold text-sm">Koi pending stock nahi — sab deliver ho chuka</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* ── Email-based batches (v2) — orderEmail prominent ── */}
                  {pendingBatches.map(b => {
                    const delayed = isDelayed(b);
                    return (
                      <div key={b.id}
                        className={cn('glass-card rounded-xl p-3 flex flex-wrap items-center gap-2.5 border-l-4',
                          delayed ? 'border-l-red-500' : b.status === 'shipping' ? 'border-l-blue-400' : 'border-l-amber-400')}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-emerald-900 truncate">{b.name}</p>
                          {/* Order email — inline Edit/Delete (edit mode mein input + Save) */}
                          {emailEdit?.id === b.id ? (
                            <div className="flex gap-1.5 mt-1">
                              <input
                                type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveEmail(); if (e.key === 'Escape') setEmailEdit(null); }}
                                placeholder="naya email likhein..."
                                autoFocus
                                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-emerald-200 text-xs font-bold text-emerald-900 outline-none focus:border-emerald-500 bg-white"
                              />
                              <button onClick={handleSaveEmail}
                                className="bg-emerald-900 text-white px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide shrink-0">Save</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 truncate flex-1 min-w-0">
                                <Mail className="w-3 h-3 shrink-0" /> {b.orderEmail || '—'}
                              </p>
                              {userRole === 'owner' && (
                                <div className="flex gap-1.5 shrink-0">
                                  <button onClick={() => openEmailEdit(b, true)}
                                    className="text-blue-600 text-[10px] px-2 py-1 border border-blue-200 rounded-lg hover:bg-blue-50 font-bold uppercase tracking-wide transition-colors">Edit</button>
                                  <button onClick={() => handleDeletePending(b, true)}
                                    className="text-red-600 text-[10px] px-2 py-1 border border-red-200 rounded-lg hover:bg-red-50 font-bold uppercase tracking-wide transition-colors">Delete</button>
                                </div>
                              )}
                            </div>
                          )}
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
                            <span className={b.status === 'shipping' ? 'text-blue-500' : 'text-amber-500'}>
                              {b.status === 'shipping' ? '🚚 Shipping' : '⏳ Processing'}
                            </span>
                            <span>× {b.quantity} @ {rs(Number(b.unitCost) || 0)}</span>
                            {b.trackingId && <span className="text-emerald-600 normal-case">· {b.trackingId}</span>}
                          </p>
                          <p className="text-sm font-black text-emerald-950 mt-0.5">Rs {Math.round(Number(b.totalCost) || 0).toLocaleString()} <span className="text-[9px] text-slate-400 font-bold uppercase">total</span></p>
                        </div>
                        {delayed && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold uppercase animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" /> Delay 15+d
                          </span>
                        )}
                        {userRole === 'owner' && (
                          <div className="flex gap-1.5 shrink-0">
                            {b.status === 'processing' && (
                              <button onClick={() => { setShipItem({ ...b, isBatch: true }); setShipTracking(b.trackingId || ''); }}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold uppercase hover:bg-blue-700 transition-colors flex items-center gap-1">
                                <Truck className="w-3 h-3" /> Ship
                              </button>
                            )}
                            <button onClick={() => handleActivateBatch(b)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-900 text-white text-[10px] font-bold uppercase hover:bg-emerald-700 transition-colors flex items-center gap-1">
                              <PackageCheck className="w-3 h-3" /> Active
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* ── Legacy pending items (purana workflow) ── */}
                  {legacyPendingItems.length > 0 && (
                    <>
                      {pendingBatches.length > 0 && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 pt-2">Purane items</p>
                      )}
                      {legacyPendingItems.map(item => {
                        const delayed = isDelayed(item);
                        return (
                          <div key={item.id}
                            className={cn('glass-card rounded-xl p-2.5 flex flex-wrap items-center gap-2 border-l-4 opacity-90',
                              delayed ? 'border-l-red-500' : item.status === 'shipping' ? 'border-l-blue-400' : 'border-l-amber-400')}>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-emerald-900 truncate">{item.name}</p>
                              {/* Email — inline Edit/Delete (legacy items par bhi) */}
                              {emailEdit?.id === item.id ? (
                                <div className="flex gap-1.5 mt-1">
                                  <input
                                    type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEmail(); if (e.key === 'Escape') setEmailEdit(null); }}
                                    placeholder="naya email likhein..."
                                    autoFocus
                                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-emerald-200 text-xs font-bold text-emerald-900 outline-none focus:border-emerald-500 bg-white"
                                  />
                                  <button onClick={handleSaveEmail}
                                    className="bg-emerald-900 text-white px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide shrink-0">Save</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 truncate flex-1 min-w-0">
                                    <Mail className="w-3 h-3 shrink-0" /> {item.orderEmail || item.email || '—'}
                                  </p>
                                  {userRole === 'owner' && (
                                    <div className="flex gap-1.5 shrink-0">
                                      <button onClick={() => openEmailEdit(item, false)}
                                        className="text-blue-600 text-[10px] px-2 py-1 border border-blue-200 rounded-lg hover:bg-blue-50 font-bold uppercase tracking-wide transition-colors">Edit</button>
                                      <button onClick={() => handleDeletePending(item, false)}
                                        className="text-red-600 text-[10px] px-2 py-1 border border-red-200 rounded-lg hover:bg-red-50 font-bold uppercase tracking-wide transition-colors">Delete</button>
                                    </div>
                                  )}
                                </div>
                              )}
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
                                <span className={item.status === 'shipping' ? 'text-blue-500' : 'text-amber-500'}>
                                  {item.status === 'shipping' ? '🚚 Shipping' : '⏳ Processing'}
                                </span>
                                <span>× {item.quantity}</span>
                                {item.trackingId && <span className="text-emerald-600 normal-case">· {item.trackingId}</span>}
                              </p>
                              <p className="text-sm font-black text-emerald-950 mt-0.5">Rs {Math.round(Number(item.totalInvested) || 0).toLocaleString()} <span className="text-[9px] text-slate-400 font-bold uppercase">total</span></p>
                            </div>
                            {delayed && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold uppercase animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5" /> Delay 15+d
                              </span>
                            )}
                            {userRole === 'owner' && (
                              <div className="flex gap-1.5 shrink-0">
                                {item.status === 'processing' && (
                                  <button onClick={() => { setShipItem(item); setShipTracking(item.trackingId || ''); }}
                                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold uppercase hover:bg-blue-700 transition-colors flex items-center gap-1">
                                    <Truck className="w-3 h-3" /> Ship
                                  </button>
                                )}
                                <button onClick={() => handleMarkDelivered(item)} disabled={deliverBusyId === item.id}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-900 text-white text-[10px] font-bold uppercase hover:bg-emerald-700 transition-colors flex items-center gap-1 disabled:opacity-50">
                                  {deliverBusyId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PackageCheck className="w-3 h-3" />} Deliver
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════════ ACTIVE STOCK TAB (compact block cards — tap = Stock History) ════════ */}
          {tab === 'active' && (
            <div className="space-y-4">
              {/* Filters + Show Archived */}
              <div className="glass-card rounded-2xl p-3 md:p-4 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategoryFilter(null)}
                    className={cn('px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors',
                      !categoryFilter ? 'bg-emerald-900 border-emerald-900 text-white' : 'bg-emerald-50/60 border-emerald-100 text-slate-600 hover:bg-emerald-50')}
                  >Sab ({activeStockItems.length})</button>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setCategoryFilter(c)}
                      className={cn('px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors',
                        categoryFilter === c ? 'bg-emerald-900 border-emerald-900 text-white' : 'bg-emerald-50/60 border-emerald-100 text-slate-600 hover:bg-emerald-50')}
                    >{c}</button>
                  ))}
                  <button onClick={() => setShowArchived(s => !s)}
                    className={cn('px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors flex items-center gap-1',
                      showArchived ? 'bg-slate-800 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100')}>
                    📦 Archived{archivedItems.length > 0 ? ` (${archivedItems.length})` : ''}
                  </button>
                </div>
                <div className="relative w-full md:w-56 group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-emerald-700" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-10 pr-3 py-2.5 bg-white/70 border border-emerald-50 rounded-xl text-xs font-medium text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5"
                  />
                </div>
              </div>

              {activeStockItems.length === 0 ? (
                <div className="glass-card rounded-2xl p-8 text-center">
                  <p className="text-3xl mb-2">🛍️</p>
                  <p className="text-slate-400 font-bold text-sm">Koi active stock nahi — \"Add Order\" tab se order karein</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeStockItems.map(item => {
                    const qty = Number(item.quantity) || 0;
                    const lowAt = Number(item.lowStockAt) || 2;
                    return (
                      <button key={item.id} onClick={() => openStockHistory(item)}
                        className="w-full glass-card rounded-xl p-2.5 flex items-center gap-2.5 text-left active:scale-[0.98] transition-transform">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-emerald-900 truncate">{item.name}</p>
                          {item.sku && (
                            <span className="text-[8px] font-bold text-slate-400 uppercase flex items-center gap-0.5">
                              <Barcode className="w-2 h-2" />{item.sku}
                            </span>
                          )}
                        </div>
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black shrink-0',
                          qty === 0 ? 'bg-red-100 text-red-600' : qty <= lowAt ? 'bg-orange-100 text-orange-600' : 'bg-emerald-900 text-white')}>
                          {qty}
                        </span>
                        <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide shrink-0',
                          qty === 0 ? 'bg-red-50 text-red-500' : qty <= lowAt ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-700')}>
                          {qty === 0 ? 'Khatam' : qty <= lowAt ? 'Low' : 'Normal'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {showArchived && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">📦 Archived ({archivedItems.length})</p>
                  {archivedItems.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold px-1 py-2">Koi archived item nahi</p>
                  ) : archivedItems.map(item => (
                    <div key={item.id} className="glass-card rounded-xl p-2.5 flex items-center gap-2.5 opacity-75">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-emerald-900 truncate">{item.name}</p>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Archived · × {item.quantity}</span>
                      </div>
                      <button onClick={() => handleArchive(item, false)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase hover:bg-emerald-100 transition-colors shrink-0">
                        ↩ Wapis
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* ════════ BUY TAB ════════ */}
          {tab === 'buy' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-6">
                <div className="glass-card rounded-[32px] p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-900"><ShoppingCart className="w-6 h-6" /></div>
                    <div>
                      <h2 className="text-2xl font-bold text-emerald-900">Naya Order</h2>
                      <p className="text-xs text-slate-400">Email se order — deliver hone par Active Stock mein merge hoga</p>
                    </div>
                  </div>

                  {existingNameMatch && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-bold animate-pulse">
                      <CheckCircle className="w-4 h-4" /> Existing product mila — deliver par isi mein merge hoga{existingNameMatch.isItem ? ` (stock: ${existingNameMatch.quantity})` : ' (pichhla order mila)'}
                    </div>
                  )}

                  {/* Product name + autocomplete */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Product Ka Naam</label>
                    <div className="relative">
                      <input
                        value={buyName} onChange={e => { setBuyName(e.target.value); setBuyShowDropdown(true); }}
                        onFocus={() => setBuyShowDropdown(true)} onBlur={() => setTimeout(() => setBuyShowDropdown(false), 150)}
                        placeholder="jaise: AirDots A3 / Type-C Cable 60W"
                        className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10"
                      />
                      {buyShowDropdown && buySuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-emerald-50 overflow-hidden z-[60]">
                          {buySuggestions.map(s => (
                            <button key={s.id} type="button"
                              onMouseDown={() => { setBuyName(s.name); setBuyCategory(s.category || '🏷️ Other'); setBuyShowDropdown(false); }}
                              className="w-full text-left px-5 py-3 hover:bg-emerald-50 text-sm font-bold text-emerald-900 flex justify-between items-center"
                            >
                              <span>{s.name}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">stock: {s.quantity}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order email — REQUIRED (batch ka identifier, Pending/History search isi se chalta hai) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Order Email <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email" value={buyEmail} onChange={e => setBuyEmail(e.target.value)}
                        placeholder="name@gmail.com — jis se order kiya"
                        className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 px-1">Is email se Pending/History mein batch search hota hai</p>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Category</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CATEGORIES.map(c => (
                        <button key={c} type="button" onClick={() => setBuyCategory(c)}
                          className={cn('py-3 px-2 rounded-2xl border text-xs font-bold transition-colors',
                            buyCategory === c ? 'border-emerald-900 bg-emerald-50 text-emerald-900' : 'border-emerald-100 bg-white text-slate-500 hover:bg-emerald-50/50')}
                        >{c}</button>
                      ))}
                    </div>
                  </div>

                  {/* Qty + Cost */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Quantity</label>
                      <input type="number" min="1" value={buyQty} onChange={e => setBuyQty(e.target.value)}
                        className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl text-xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                      <div className="flex gap-1.5 flex-wrap">
                        {[1, 2, 5, 10, 20, 50].map(q => (
                          <button key={q} type="button" onClick={() => setBuyQty(String(q))}
                            className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-xs hover:bg-emerald-900 hover:text-white transition-colors">{q}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Cost /pc (Rs)</label>
                      <input type="number" min="0" value={buyCost} onChange={e => setBuyCost(e.target.value)} placeholder="0"
                        className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl text-xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                    </div>
                  </div>

                  {/* Source + Low stock */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Source (optional)</label>
                      <input value={buySource} onChange={e => setBuySource(e.target.value)} placeholder="Daraz / Alibaba / vendor"
                        className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Low Stock Alert (qty)</label>
                      <input type="number" min="0" value={buyLowStock} onChange={e => setBuyLowStock(e.target.value)} placeholder="2"
                        className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                      <p className="text-[10px] text-slate-400 px-1">Is qty pe ya neeche "Low" badge dikhega</p>
                    </div>
                  </div>

                  {/* Tracking ID */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Tracking ID (optional)</label>
                    <div className="relative">
                      <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input value={buyTracking} onChange={e => setBuyTracking(e.target.value)} placeholder="LEA-123456789 — baad mein bhi add ho sakta hai"
                        className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                    </div>
                    <p className="text-[10px] text-slate-400 px-1">Sell price ab Order (sale) form mein enter hota hai</p>
                  </div>
                </div>
              </div>

              {/* Live summary */}
              <div className="lg:col-span-4">
                <div className="glass-card rounded-[40px] overflow-hidden sticky top-24">
                  <div className="relative overflow-hidden bg-emerald-900 p-8 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 relative z-10">Total Order</p>
                    <p className="text-4xl font-black mt-2 relative z-10">Rs {(Math.round(buyTotal)).toLocaleString()}</p>
                    <p className="text-xs text-emerald-200/70 mt-2 relative z-10">{buyName.trim() || '— product —'} × {buyQtyN || 0} @ Rs {(buyCostN || 0).toLocaleString()}</p>
                    <div className="absolute right-[-20px] top-[-20px] opacity-10"><ShoppingCart className="w-32 h-32" /></div>
                  </div>
                  <div className="p-6 space-y-4 bg-white/40">
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Order Email</span>
                      <span className={cn('text-xs font-bold text-right truncate', buyEmail.trim() ? 'text-emerald-950' : 'text-red-400')}>
                        {buyEmail.trim() || 'zaroori hai'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 px-1 leading-relaxed">
                      Order 'processing' mein jayega — deliver par <span className="font-bold text-emerald-700">Mark Active</span> karne se quantity Active Stock mein merge ho jayegi
                    </p>
                    <button onClick={handleBuy} disabled={buySaving || !buyEmail.trim()}
                      className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                      {buySaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                      {buySaving ? 'ADDING...' : 'ORDER ADD KARO'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════ ORDER TAB ════════ */}
          {tab === 'order' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-6">
                <div className="glass-card rounded-[32px] p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-900"><ShoppingBag className="w-6 h-6" /></div>
                    <div>
                      <h2 className="text-2xl font-bold text-emerald-900">Naya Order</h2>
                      <p className="text-xs text-slate-400">Platform, customer aur courier — sab record</p>
                    </div>
                  </div>

                  {sellableItems.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-4xl mb-3">📦</p>
                      <p className="text-slate-400 font-bold">Active Stock khali hai — pehle "Purchase" tab se le aayein</p>
                      <button onClick={() => setTab('buy')} className="mt-4 px-6 py-3 bg-emerald-900 text-white rounded-2xl font-bold text-sm">Purchase Tab Kholein</button>
                    </div>
                  ) : (
                    <>
                      {/* Product search — naam / email / trackingId / SKU */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Product Search</label>
                        {orderItem ? (
                          <div className="flex items-center gap-3 p-4 bg-emerald-900 text-white rounded-2xl">
                            <Boxes className="w-5 h-5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate">{orderItem.name}</p>
                              <p className="text-[10px] text-emerald-200 uppercase tracking-widest flex items-center gap-1.5">
                                Stock: {orderItem.quantity} · {rs(orderItem.buyPrice)}/pc
                                {orderItem.sku && <>· <Barcode className="w-2.5 h-2.5" />{orderItem.sku}</>}
                              </p>
                            </div>
                            <button onClick={() => { setOrderItemId(''); setOrderSearch(''); setOrderVariant(''); setOrderPrice(''); }}
                              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                              value={orderSearch} onChange={e => setOrderSearch(e.target.value)} autoFocus
                              placeholder="Naam, email, tracking ya SKU likhein..."
                              className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5"
                            />
                            {orderSearch.trim() && (
                              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-emerald-50 overflow-hidden z-[60] max-h-64 overflow-y-auto">
                                {orderSearchResults.length === 0 ? (
                                  <p className="px-5 py-4 text-sm font-bold text-slate-400">Active Stock mein kuch nahi mila</p>
                                ) : orderSearchResults.map(s => (
                                  <button key={s.id} type="button" onClick={() => handleItemPick(s.id)}
                                    className="w-full text-left px-5 py-3 hover:bg-emerald-50 flex justify-between items-center gap-2 border-b border-emerald-50/50 last:border-0">
                                    <div className="min-w-0">
                                      <p className="font-bold text-emerald-900 truncate text-sm">{s.name}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1.5">
                                        {s.sku && <><Barcode className="w-2.5 h-2.5" />{s.sku} ·</>}
                                        {rs(s.sellPrice)} · stock {s.quantity}
                                      </p>
                                    </div>
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 px-1">Sirf Active Stock search hota hai (pending items nahi)</p>
                      </div>

                      {/* Variant select (agar variants hain) */}
                      {orderItem && Array.isArray(orderItem.variants) && orderItem.variants.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Variant</label>
                          <select value={orderVariant} onChange={e => setOrderVariant(e.target.value)}
                            className="w-full py-4 px-6 bg-white border border-emerald-50 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5 appearance-none">
                            <option value="">— Default (koi variant nahi) —</option>
                            {orderItem.variants.map((v: any) => (
                              <option key={v.label} value={v.label} disabled={(Number(v.quantity) || 0) <= 0}>
                                {v.label} ({v.quantity} available)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Platform */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Platform</label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {PLATFORMS.map(p => (
                            <button key={p.key} type="button" onClick={() => setPlatform(p.key)}
                              className={cn('py-3 px-2 rounded-2xl border text-xs font-bold transition-colors',
                                platform === p.key ? 'border-emerald-900 bg-emerald-50 text-emerald-900' : 'border-emerald-100 bg-white text-slate-500 hover:bg-emerald-50/50')}
                            >{p.label}</button>
                          ))}
                        </div>
                      </div>

                      {/* Qty + Price */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Quantity</label>
                          <input type="number" min="1" value={orderQty} onChange={e => setOrderQty(e.target.value)}
                            className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl text-xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                          {orderItem && (
                            <div className="flex gap-1.5 flex-wrap">
                              {Array.from({ length: Math.min(5, Math.floor(orderItem.quantity)) }, (_, k) => k + 1).map(q => (
                                <button key={q} type="button" onClick={() => setOrderQty(String(q))}
                                  className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-xs hover:bg-emerald-900 hover:text-white transition-colors">{q}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Price /pc (Rs)</label>
                          <input type="number" min="0" value={orderPrice} onChange={e => setOrderPrice(e.target.value)} placeholder="0"
                            className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl text-xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                        </div>
                      </div>

                      {/* Courier */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Courier — Customer Se (Rs)</label>
                          <div className="relative">
                            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="number" min="0" value={courierReceived} onChange={e => setCourierReceived(e.target.value)}
                              className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                          </div>
                          <p className="text-[10px] text-slate-400 px-1">Customer ne jitna diya (+profit mein)</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Courier — Aapne Diya (Rs)</label>
                          <div className="relative">
                            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="number" min="0" value={courierPaid} onChange={e => setCourierPaid(e.target.value)}
                              className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                          </div>
                          <p className="text-[10px] text-slate-400 px-1">Courier company ko diya (−profit mein)</p>
                        </div>
                      </div>

                      {/* Customer */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Customer (optional)</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Naam"
                              className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Phone (optional)</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="03001234567"
                              className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Note (optional)</label>
                        <input value={orderNote} onChange={e => setOrderNote(e.target.value)} placeholder="jaise: COD / blue color"
                          className="w-full px-5 py-4 bg-emerald-50/30 border-none rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Live profit preview */}
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
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Sale ({orderQtyN || 0} pc)</span>
                      <span className="text-sm font-bold text-emerald-950">{rs(previewAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Cost ({orderItem ? rs(orderItem.buyPrice) : '—'}/pc)</span>
                      <span className="text-sm font-bold text-emerald-950">{rs(previewCost)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Margin %</span>
                      <span className={cn('text-sm font-bold', previewMarginPct < 0 ? 'text-red-500' : 'text-emerald-600')}>
                        {previewMarginPct}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Courier (diya − liya)</span>
                      <span className="text-sm font-bold text-red-500">− Rs {Math.max(0, Math.round(cPaidN - cRecN)).toLocaleString()}</span>
                    </div>
                    {orderItem && orderQtyN > (Number(orderItem.quantity) || 0) && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Stock se zyada — sirf {orderItem.quantity} maujood
                      </div>
                    )}
                    <button onClick={handleOrder} disabled={orderSaving || !orderItem || orderQtyN <= 0}
                      className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                      {orderSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      {orderSaving ? 'SAVING...' : 'ORDER RECORD KARO'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════ HISTORY TAB ════════ */}
          {tab === 'history' && (
            <div className="space-y-6">
              {/* Monthly chart */}
              <div className="glass-card rounded-3xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-emerald-900">Monthly Munafa</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pichhle 6 mahine · loss red</span>
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

              {/* Daily sales + profit — current month */}
              <div className="glass-card rounded-3xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-emerald-900">Daily Sales & Munafa</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · per day
                  </span>
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-emerald-50)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--color-slate-400)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--color-slate-400)' }} />
                      <Tooltip
                        cursor={{ fill: 'var(--color-emerald-50)' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
                        formatter={(v: any, name: any) => [`Rs ${Number(v).toLocaleString()}`, name === 'sales' ? 'Sale' : 'Munafa']}
                        labelFormatter={(l: any) => `Day ${l}`}
                      />
                      <Bar dataKey="sales" fill="var(--color-emerald-500)" radius={[4, 4, 0, 0]} maxBarSize={16} />
                      <Bar dataKey="profit" fill="var(--color-blue-500)" radius={[4, 4, 0, 0]} maxBarSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 justify-center mt-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Sale
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Munafa
                  </span>
                </div>
              </div>

              {/* Best Sellers vs Dead Stock (last 30 days) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-emerald-900">Best Sellers</h3>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">30 din</span>
                  </div>
                  {bestSellers.length === 0 ? (
                    <p className="text-slate-400 font-bold text-sm py-4 text-center">Abhi koi sale nahi hui</p>
                  ) : (
                    <div className="space-y-2">
                      {bestSellers.map((b, i) => (
                        <div key={b.name + i} className="flex items-center gap-3 p-2.5 bg-emerald-50/40 rounded-xl">
                          <span className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0',
                            i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-emerald-900 text-sm truncate">{b.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{b.qty} bikay</p>
                          </div>
                          <p className="text-xs font-black text-emerald-600 shrink-0">{rs(b.revenue)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="glass-card rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingDown className="w-5 h-5 text-slate-400" />
                    <h3 className="text-base font-bold text-emerald-900">Dead Stock</h3>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">30 din se nahi bika</span>
                  </div>
                  {deadStock.length === 0 ? (
                    <p className="text-slate-400 font-bold text-sm py-4 text-center">Sab theek hai — koi dead stock nahi 🎉</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {deadStock.map(i => (
                        <span key={i.id} className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5">
                          {i.name} <span className="text-slate-400">× {i.quantity}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Platform breakdown */}
              {platformStats.length > 0 && (
                <div className="glass-card rounded-3xl p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-5">
                    <Globe className="w-5 h-5 text-emerald-700" />
                    <h3 className="text-lg font-bold text-emerald-900">Is Mahine — Platform Report</h3>
                  </div>
                  <div className="space-y-3">
                    {platformStats.map(p => (
                      <div key={p.key} className="flex items-center justify-between p-3 bg-emerald-50/40 rounded-2xl border border-emerald-50">
                        <div>
                          <p className="font-bold text-emerald-900 text-sm">{p.label}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.count} orders</p>
                        </div>
                        <p className={cn('font-black text-sm', p.profit < 0 ? 'text-red-500' : 'text-emerald-600')}>
                          {formatProfit(p.profit, true)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters + email search */}
              <div className="flex flex-wrap gap-2 items-center">
                {([
                  { key: 'all', label: 'Sab' },
                  { key: 'order', label: '📦 Orders' },
                  { key: 'purchase', label: '🛒 Purchase' },
                  { key: 'loss', label: '💔 Loss' },
                  { key: 'month', label: '📅 Is Mahine' },
                ] as const).map(f => (
                  <button key={f.key} onClick={() => setHistoryFilter(f.key)}
                    className={cn('px-4 py-2.5 rounded-2xl text-xs font-bold border transition-colors',
                      historyFilter === f.key ? 'bg-emerald-900 border-emerald-900 text-white' : 'bg-white/60 border-emerald-100 text-slate-600 hover:bg-emerald-50')}
                  >{f.label}</button>
                ))}
                <div className="relative w-full sm:w-64 group flex-1 sm:flex-none">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-emerald-700" />
                  <input
                    value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                    placeholder="Email se order history search..."
                    className="w-full pl-10 pr-3 py-2.5 bg-white/70 border border-emerald-50 rounded-xl text-xs font-medium text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/5"
                  />
                </div>
              </div>

              {/* Timeline */}
              {historyEntries.length === 0 ? (
                <div className="glass-card rounded-3xl p-10 text-center">
                  <p className="text-4xl mb-3">🗂️</p>
                  <p className="text-slate-400 font-bold">Abhi koi entry nahi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyEntries.map(e => {
                    const d = e.date?.toDate?.();
                    const isOrder = e.kind === 'order';
                    const isLoss = e.type === 'loss';
                    const profit = Number(e.profit) || 0;
                    const plat = PLATFORMS.find(p => p.key === e.platform);
                    return (
                      <motion.div key={e.kind + e.id} whileHover={{ x: 4 }}
                        className={cn('glass-card rounded-2xl p-4 md:p-5 flex items-center gap-4 border-l-4',
                          isLoss ? 'border-l-red-500' : isOrder ? 'border-l-emerald-500' : 'border-l-slate-300',
                          e.refunded && 'opacity-60')}>
                        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
                          isLoss ? 'bg-red-100 text-red-600' : isOrder ? 'bg-emerald-900 text-white' : 'bg-emerald-50 text-emerald-900')}>
                          {isLoss ? <HeartCrack className="w-5 h-5" /> : isOrder ? <ShoppingBag className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-emerald-900 truncate">{e.name}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">× {e.quantity}</span>
                            {isLoss && (
                              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-500 text-[9px] font-bold uppercase tracking-wider">💔 Damage/Loss</span>
                            )}
                            {isOrder && !isLoss && plat && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-wider">{plat.label}</span>
                            )}
                            {e.variantLabel && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-wider">{e.variantLabel}</span>
                            )}
                            {e.refunded && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 text-[9px] font-bold uppercase tracking-wider">↩ Returned</span>
                            )}
                          </div>
                          {/* Purchase/batch order email — email-wise permanent history */}
                          {!isOrder && e.orderEmail && (
                            <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mt-0.5 truncate">
                              <Mail className="w-3 h-3 shrink-0" /> {e.orderEmail}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {d ? d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                            {isOrder && !isLoss && e.customerName ? ` · ${e.customerName}` : ''}
                            {!isOrder && e.source ? ` · ${e.source}` : ''}
                            {e.note ? ` · ${e.note}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {isLoss ? (
                            <p className="text-sm font-black text-red-500">{formatProfit(-Math.abs(profit), true)}</p>
                          ) : (
                            <>
                              <p className="text-sm font-black text-emerald-950">{rs(isOrder ? (Number(e.totalAmount) || 0) : (Number(e.totalCost) || 0))}</p>
                              {isOrder && (
                                <p className={cn('text-xs font-bold', profit < 0 ? 'text-red-500' : 'text-emerald-600')}>
                                  {formatProfit(profit, true)}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        {userRole === 'owner' && isOrder && !isLoss && !e.refunded && (
                          <button onClick={() => handleReturn(e)} disabled={returnBusyId === e.id} title="Mark Returned — stock restore + profit 0"
                            className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-colors shrink-0 disabled:opacity-50">
                            {returnBusyId === e.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                          </button>
                        )}
                        {userRole === 'owner' && !e.refunded && (
                          <button onClick={() => setDeleteEntry(e)} title="Delete"
                            className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════ VENDORS TAB ════════ */}
          {tab === 'vendors' && (
            <div className="space-y-4">
              {vendors.length === 0 ? (
                <div className="glass-card rounded-3xl p-10 text-center">
                  <p className="text-4xl mb-3">🤝</p>
                  <p className="text-slate-400 font-bold">Koi vendor nahi — pehle Vendors screen se add karein</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vendors.map(v => {
                    // Per-vendor stats: purchases by vendorId + us vendor ke items ki orders
                    const vPurchases = purchases.filter(p => p.vendorId === v.id);
                    const totalPurchased = vPurchases.reduce((a, p) => a + (Number(p.totalCost) || 0), 0);
                    const itemCount = new Set(vPurchases.map(p => p.name)).size;
                    const vendorItemIds = new Set(items.filter(i => i.vendorId === v.id).map(i => i.id));
                    const vendorOrders = orders.filter(o => o.type === 'order' && o.itemId && vendorItemIds.has(o.itemId));
                    const returnedCount = vendorOrders.filter(o => o.refunded).length;
                    const returnRate = vendorOrders.length > 0 ? Math.round((returnedCount / vendorOrders.length) * 100) : 0;
                    const selected = selectedVendorId === v.id;
                    return (
                      <motion.div key={v.id} layout className="glass-card rounded-3xl p-5 space-y-4">
                        <button onClick={() => setSelectedVendorId(selected ? null : v.id)} className="w-full text-left flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-emerald-900 text-white flex items-center justify-center font-black text-lg shrink-0">
                            {v.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-emerald-900 truncate">{v.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {v.phoneNumber || 'phone nahi'} · {vPurchases.length} purchases
                            </p>
                          </div>
                          <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full',
                            selected ? 'bg-emerald-900 text-white' : 'bg-emerald-50 text-emerald-700')}>
                            {selected ? 'Band karein' : 'Stats'}
                          </span>
                        </button>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-emerald-50/60 rounded-2xl p-3 text-center">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kharidaya</p>
                            <p className="text-sm font-black text-emerald-900 mt-0.5">{rs(totalPurchased)}</p>
                          </div>
                          <div className="bg-emerald-50/60 rounded-2xl p-3 text-center">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Items</p>
                            <p className="text-sm font-black text-emerald-900 mt-0.5">{itemCount}</p>
                          </div>
                          <div className={cn('rounded-2xl p-3 text-center', returnRate > 20 ? 'bg-red-50' : 'bg-emerald-50/60')}>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Return Rate</p>
                            <p className={cn('text-sm font-black mt-0.5', returnRate > 20 ? 'text-red-600' : 'text-emerald-900')}>{returnRate}%</p>
                          </div>
                        </div>

                        {selected && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                            <div className="border-t border-emerald-50 pt-3 space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                Items Bought ({vendorItemIds.size} linked · {vPurchases.length} purchases)
                              </p>
                              {vPurchases.length === 0 ? (
                                <p className="text-xs text-slate-400 font-medium">Is vendor se abhi koi shop purchase nahi — Purchase tab mein vendor select karein</p>
                              ) : (
                                vPurchases.slice(0, 8).map(p => (
                                  <div key={p.id} className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-600 truncate">{p.name} × {p.quantity}</span>
                                    <span className="text-slate-400 font-bold shrink-0">{rs(Number(p.totalCost) || 0)}</span>
                                  </div>
                                ))
                              )}
                              {vendorOrders.length > 0 && (
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-2">
                                  {vendorOrders.length} orders · {returnedCount} returned ({returnRate}%)
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* FAB — active stock tab pe purchase khulta hai */}
      {tab === 'active' && (
        <button onClick={() => setTab('buy')}
          className="fixed bottom-28 right-8 w-16 h-16 bg-emerald-900 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-40">
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* ════════ EDIT PRODUCT MODAL ════════ */}
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
                    <h2 className="text-2xl font-bold text-emerald-900">Edit Product</h2>
                    <p className="text-xs text-slate-400">Naam, sell price ya low-stock limit theek karein</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Product Name</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Low Stock Alert (qty)</label>
                  <input type="number" min="0" value={editLowStock} onChange={e => setEditLowStock(e.target.value)}
                    className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" />
                  <p className="text-[10px] text-slate-400 px-1">Is quantity pe ya neeche "Low" warning dikhegi</p>
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

      {/* ════════ STOCK HISTORY MODAL (DigiKhata style — purchase ledger + edit) ════════ */}
      <AnimatePresence>
        {historyItem && (() => {
          const itemPurchases = purchases.filter(p => normalizeText(p.name || '') === normalizeText(historyItem.name || ''));
          const hQty = Number(historyItem.quantity) || 0;
          return (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-emerald-950/20 backdrop-blur-md z-[80]" onClick={() => !editPurchSaving && setHistoryItem(null)} />
              <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="relative w-full max-w-md glass-card rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto pointer-events-auto">
                  <button onClick={() => !editPurchSaving && setHistoryItem(null)}
                    className="absolute right-6 top-6 p-2 rounded-full hover:bg-emerald-50 text-slate-400"><X className="w-5 h-5" /></button>

                  <div>
                    <h2 className="text-xl font-bold text-emerald-900 pr-10">{historyItem.name}</h2>
                    {historyItem.sku && <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-0.5"><Barcode className="w-2.5 h-2.5" />{historyItem.sku}</span>}
                  </div>

                  {/* Item snapshot */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-50/60 rounded-2xl p-3 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stock</p>
                      <p className="text-base font-black text-emerald-900 mt-0.5">{hQty}</p>
                    </div>
                    <div className="bg-emerald-50/60 rounded-2xl p-3 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg Cost</p>
                      <p className="text-base font-black text-emerald-900 mt-0.5">{rs(Number(historyItem.buyPrice) || 0)}</p>
                    </div>
                    <div className="bg-emerald-50/60 rounded-2xl p-3 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Invested</p>
                      <p className="text-base font-black text-emerald-900 mt-0.5">{rs(Number(historyItem.totalInvested) || 0)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  {userRole === 'owner' && (
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => { if (hQty > 0) { handleItemPick(historyItem.id); setOrderQty('1'); setHistoryItem(null); setTab('order'); } else showToast('Stock khatam hai — pehle kharidein', 'warning'); }}
                        disabled={hQty === 0}
                        className="py-2.5 rounded-xl bg-emerald-900 text-white text-[10px] font-bold uppercase tracking-wide hover:bg-emerald-700 transition-colors disabled:opacity-40">Order</button>
                      <button onClick={() => { openEdit(historyItem); }}
                        className="py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wide hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
                      <button onClick={() => { setDamageItem(historyItem); setDamageQty('1'); setDamageReason(''); setHistoryItem(null); }}
                        disabled={hQty === 0}
                        className="py-2.5 rounded-xl bg-red-50 text-red-500 text-[10px] font-bold uppercase tracking-wide hover:bg-red-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-1"><HeartCrack className="w-3 h-3" /> Loss</button>
                      <button onClick={() => handleArchive(historyItem, true)}
                        className="py-2.5 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wide hover:bg-slate-200 transition-colors">📦 Archive</button>
                    </div>
                  )}

                  {/* Purchase ledger */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Stock History — {itemPurchases.length} kharidariyan</p>
                    {itemPurchases.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold px-1 py-3">Koi purchase entry nahi mili</p>
                    ) : itemPurchases.map(p => {
                      const d = p.date?.toDate?.();
                      if (editPurch?.id === p.id) {
                        return (
                          <div key={p.id} className="glass-card rounded-xl p-3 space-y-2 border border-emerald-200">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Quantity</label>
                                <input type="number" min="1" value={editPurchQty} onChange={e => setEditPurchQty(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-emerald-100 text-sm font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unit Cost</label>
                                <input type="number" min="0" value={editPurchCost} onChange={e => setEditPurchCost(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-emerald-100 text-sm font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-900/10" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setEditPurch(null)} disabled={editPurchSaving}
                                className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-500 text-[10px] font-bold uppercase">Cancel</button>
                              <button onClick={handleSavePurchaseEdit} disabled={editPurchSaving}
                                className="flex-1 py-2 rounded-lg bg-emerald-900 text-white text-[10px] font-bold uppercase flex items-center justify-center gap-1 disabled:opacity-50">
                                {editPurchSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Save
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={p.id} className="glass-card rounded-xl p-2.5 flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-emerald-900">
                              × {p.quantity} @ {rs(Number(p.unitCost) || 0)}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                              {d ? d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                              {p.edited ? ' · edited' : ''}
                            </p>
                          </div>
                          <span className="text-[11px] font-black text-emerald-950 shrink-0">{rs(Number(p.totalCost) || 0)}</span>
                          {userRole === 'owner' && (
                            <button onClick={() => openPurchaseEdit(p)} title="Edit entry"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            </>
          );
        })()}
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
                    {deleteEntry.kind === 'order'
                      ? <>Ye order delete hoga aur stock mein <span className="font-bold text-emerald-900">+{deleteEntry.quantity}</span> wapis aa jayega.</>
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

      {/* ════════ MARK SHIPPING MODAL (Step 2) ════════ */}
      <AnimatePresence>
        {shipItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-[80]" onClick={() => !shipSaving && setShipItem(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-900">Mark Shipping</h3>
                    <p className="text-xs text-slate-400 font-medium truncate">{shipItem.name} · Tracking ID likhein</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracking ID</label>
                  <input value={shipTracking} onChange={e => setShipTracking(e.target.value)} autoFocus
                    placeholder="jaise: LEA-123456789"
                    className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-bold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20" />
                  <p className="text-[10px] text-slate-400 px-1">15 din se zyada lage to Delay Alert dikhega</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShipItem(null)} disabled={shipSaving}
                    className="flex-1 py-3 rounded-2xl border border-emerald-100 text-slate-600 font-bold hover:bg-emerald-50 transition-colors">Cancel</button>
                  <button onClick={handleMarkShipping} disabled={shipSaving}
                    className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {shipSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                    Shipping Karo
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ════════ DAMAGE / LOSS MODAL ════════ */}
      <AnimatePresence>
        {damageItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-[80]" onClick={() => !damageSaving && setDamageItem(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                    <HeartCrack className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-900">Damage / Loss</h3>
                    <p className="text-xs text-slate-400 font-medium truncate">{damageItem.name} · stock {damageItem.quantity}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Damage Quantity</label>
                  <input type="number" min="1" value={damageQty} onChange={e => setDamageQty(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/20" />
                  <p className="text-[10px] text-slate-400 px-1">
                    Loss hoga: {formatProfit(-Math.round((Number(damageItem.buyPrice) || 0) * (parseFloat(damageQty) || 0)), true)} (avg cost se)
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason (optional)</label>
                  <input value={damageReason} onChange={e => setDamageReason(e.target.value)} placeholder="jaise: toota hua / gum ho gaya"
                    className="w-full px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-medium text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-900/20" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setDamageItem(null)} disabled={damageSaving}
                    className="flex-1 py-3 rounded-2xl border border-emerald-100 text-slate-600 font-bold hover:bg-emerald-50 transition-colors">Cancel</button>
                  <button onClick={handleDamage} disabled={damageSaving}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {damageSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <HeartCrack className="w-4 h-4" />}
                    Loss Record Karo
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
