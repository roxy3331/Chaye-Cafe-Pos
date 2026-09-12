import React from 'react';
import {
  History as HistoryIcon, Package, CalendarDays, Clock, User, Phone,
  Truck, PackageCheck, IndianRupee, CalendarOff, Boxes, Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';
import { Period, filterByPeriod, tsOf } from '../lib/periodUtils';
import { FlipIn, NumberTicker } from '../components/magicui';

const PERIODS: Period[] = ['today', 'week', 'month', 'all'];
const PERIOD_LABELS: Record<Period, string> = {
  today: 'Aaj',
  week: 'Is Hafte',
  month: 'Is Mahine',
  year: 'Is Saal',
  all: 'Sab',
};

/** Entry timestamp = server `date` (kab entry hui), fallback to user-picked purchaseDate. */
const entryTs = (p: any): number | null => tsOf(p.date) ?? tsOf(p.purchaseDate);

const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true });
const rs = (n: number) => Math.round(n).toLocaleString();

export const History: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const [all, setAll] = React.useState<any[] | null>(null); // null = loading
  const [period, setPeriod] = React.useState<Period>('today');
  const [specificDate, setSpecificDate] = React.useState('');

  React.useEffect(() => {
    return dataService.subscribeToPurchases((rows) => {
      // `purchases` collection also holds stock-delete/zero ALERT docs — drop them
      setAll(rows.filter((p: any) => !p.alertType && p.type !== 'alert' && p.itemName));
    });
  }, []);

  const isOwner = userRole === 'owner';

  const filtered = React.useMemo(() => {
    if (!all) return [];
    // Dateless docs are corrupt rows — drop them (same policy as Reports)
    const base = all.filter((p: any) => entryTs(p) !== null);
    if (specificDate) {
      const start = new Date(specificDate); start.setHours(0, 0, 0, 0);
      const end = new Date(specificDate); end.setHours(23, 59, 59, 999);
      return base.filter((p: any) => { const t = entryTs(p)!; return t >= start.getTime() && t <= end.getTime(); });
    }
    // Normalize `date` so filterByPeriod sees the fallback (old docs may only
    // carry the user-picked purchaseDate string)
    return filterByPeriod(base.map((p: any) => ({ ...p, date: p.date ?? p.purchaseDate })), period);
  }, [all, period, specificDate]);

  const summary = React.useMemo(() => {
    let packs = 0, pcs = 0, kharcha = 0;
    filtered.forEach((p: any) => {
      packs += Number(p.quantity) || 0;
      pcs += Number(p.totalPcs) || 0;
      kharcha += (Number(p.buyingPricePerPc) || 0) * (Number(p.totalPcs) || 0);
    });
    return { count: filtered.length, packs, pcs, kharcha };
  }, [filtered]);

  return (
    <div className="space-y-5 animate-in fade-in duration-700 pb-4">
      {/* Header */}
      <FlipIn delay={0}>
        <section className="rounded-2xl p-5 md:p-6 bg-emerald-900 text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-80 mb-1">STOCK ENTRY HISTORY</p>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <HistoryIcon className="w-6 h-6" /> Entry History
            </h1>
            <p className="text-sm opacity-80 mt-1">Cafe ki har purchase-entry — date aur waqt ke saath</p>
          </div>
          <div className="absolute right-[-16px] top-[-16px] opacity-10 pointer-events-none">
            <HistoryIcon className="w-[120px] h-[120px]" />
          </div>
        </section>
      </FlipIn>

      {/* Filters: period tabs + specific date */}
      <FlipIn delay={0.1}>
        <section className="glass-card rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-4 gap-1.5 bg-emerald-50/60 p-1 rounded-xl">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setSpecificDate(''); }}
                className={cn(
                  'py-2 rounded-lg text-xs font-bold transition-colors',
                  period === p && !specificDate
                    ? 'bg-emerald-900 text-white shadow'
                    : 'text-emerald-900/70 hover:bg-white'
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-700 shrink-0" />
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-emerald-100 bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-900/15 outline-none"
            />
            {specificDate && (
              <button
                onClick={() => setSpecificDate('')}
                className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-500 hover:bg-slate-200"
              >
                Clear
              </button>
            )}
          </div>
          {specificDate && (
            <p className="text-[11px] font-bold text-emerald-700">
              📅 {new Date(specificDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })} ki entries
            </p>
          )}
        </section>
      </FlipIn>

      {/* Summary */}
      {all !== null && (
        <FlipIn delay={0.15}>
          <section className="grid grid-cols-3 gap-2 md:gap-3">
            <div className="glass-card rounded-2xl p-3.5 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                <PackageCheck className="w-3 h-3" /> Entries
              </p>
              <p className="text-xl font-bold text-emerald-900 mt-1">
                <NumberTicker value={summary.count} />
              </p>
            </div>
            <div className="glass-card rounded-2xl p-3.5 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                <Boxes className="w-3 h-3" /> Packs / Pcs
              </p>
              <p className="text-xl font-bold text-emerald-900 mt-1">
                {summary.packs} <span className="text-xs text-slate-400 font-bold">/ {summary.pcs.toLocaleString()}</span>
              </p>
            </div>
            {isOwner ? (
              <div className="glass-card rounded-2xl p-3.5 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                  <Wallet className="w-3 h-3" /> Total Kharcha
                </p>
                <p className="text-xl font-bold text-emerald-900 mt-1">
                  Rs <NumberTicker value={Math.round(summary.kharcha)} />
                </p>
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-3.5 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Purana Bacha</p>
                <p className="text-xl font-bold text-emerald-900 mt-1">
                  {filtered.reduce((a: number, p: any) => a + (Number(p.remainingUnits) || 0), 0).toLocaleString()} <span className="text-xs text-slate-400 font-bold">pcs</span>
                </p>
              </div>
            )}
          </section>
        </FlipIn>
      )}

      {/* Entries list */}
      {all === null ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-4 border-emerald-900/10 border-t-emerald-900 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl py-14 text-center">
          <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-slate-400 font-bold text-sm">
            {specificDate ? 'Is date mein koi entry nahi' : 'Is period mein koi entry nahi'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((p: any, i: number) => {
            const t = entryTs(p) ?? Date.now();
            const totalCost = (Number(p.buyingPricePerPc) || 0) * (Number(p.totalPcs) || 0);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="bg-white border border-emerald-50 rounded-2xl p-4 hover:border-emerald-100 transition-colors"
              >
                {/* Row 1: name + who entered */}
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-800 leading-snug">
                    {p.category && <span className="mr-1">{String(p.category).split(' ')[0]}</span>}
                    {p.itemName}
                  </p>
                  {p.createdBy && (
                    <span className={cn(
                      'shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                      p.createdBy === 'owner' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
                    )}>
                      {p.createdBy === 'owner' ? '👑 owner' : '👤 employee'}
                    </span>
                  )}
                </div>

                {/* Row 2: quantity */}
                <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Package className="w-3 h-3 text-emerald-600" />
                    {Number(p.quantity) || 0} packs · {Number(p.totalPcs || 0).toLocaleString()} pcs
                  </span>
                  {p.pcsPerPack > 1 && <span className="text-slate-300">({p.pcsPerPack} pcs/pack)</span>}
                </p>

                {/* Row 3: date + time (alag alag) */}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-600 inline-flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-emerald-600" /> {fmtDate(t)}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {fmtTime(t)}
                  </span>
                </div>

                {/* Row 4: vendor info */}
                {(p.salesmanName || p.orderBookerName) && (
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {p.salesmanName && (
                      <span className="text-[10px] text-slate-500 font-medium inline-flex items-center gap-1">
                        <Truck className="w-3 h-3 text-emerald-500" /> {p.salesmanName}
                        {p.salesmanPhone && <a href={`tel:${p.salesmanPhone}`} className="text-emerald-600 font-bold inline-flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{p.salesmanPhone}</a>}
                      </span>
                    )}
                    {p.orderBookerName && (
                      <span className="text-[10px] text-slate-500 font-medium inline-flex items-center gap-1">
                        <User className="w-3 h-3 text-emerald-500" /> {p.orderBookerName}
                        {p.orderBookerPhone && <a href={`tel:${p.orderBookerPhone}`} className="text-emerald-600 font-bold inline-flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{p.orderBookerPhone}</a>}
                      </span>
                    )}
                  </div>
                )}

                {/* Row 5: owner-only prices */}
                {isOwner && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500 inline-flex items-center gap-1">
                      <IndianRupee className="w-3 h-3 text-slate-400" />
                      Buy Rs {Number(p.buyingPricePerPc || 0).toLocaleString()}/pc
                    </span>
                    <span className="text-slate-200">→</span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Sell Rs {Number(p.sellingPricePerPc || 0).toLocaleString()}/pc
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Total Rs {rs(totalCost)}
                    </span>
                  </div>
                )}

                {/* Row 6: expiry + purana stock */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {p.expiryDate && (
                    <span className="text-[9px] font-bold text-slate-400 inline-flex items-center gap-1">
                      <CalendarOff className="w-3 h-3" /> Expiry: {new Date(p.expiryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {p.remainingUnits != null && Number(p.remainingUnits) > 0 && (
                    <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">
                      Purana bacha: {Number(p.remainingUnits).toLocaleString()} pcs
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
