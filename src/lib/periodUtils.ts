// ─── Period / P&L helpers ────────────────────────────────────────────────────
// Shared by Reports.tsx, ShareReport.tsx and App.tsx so every screen computes
// profit the SAME way (this was the root cause of "profit alag dikh raha hai").

export type Period = 'today' | 'week' | 'month' | 'year' | 'all';

export const PERIOD_LABELS: Record<Period, string> = {
  today: 'Aaj',
  week: 'Is Hafte',
  month: 'Is Mahine',
  year: 'Is Saal',
  all: 'Sab (All Time)',
};

/** YYYY-MM month key (was copy-pasted in 3 places before). */
export const getMonthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Start-of-period timestamp for a Period (null for 'all'). */
export const periodStart = (period: Period): number | null => {
  const now = new Date();
  switch (period) {
    case 'today': {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime();
    }
    case 'week': {
      // Start of this week (Monday, Pakistani business week)
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
      d.setDate(d.getDate() - dow);
      return d.getTime();
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); return d.getTime();
    }
    case 'year': {
      const d = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0); return d.getTime();
    }
    case 'all':
    default:
      return null;
  }
};

/** Extract a JS timestamp from a Firestore date field (or raw date value). */
export const tsOf = (v: any): number | null => {
  if (!v) return null;
  const d = v.toDate?.() ?? (v.seconds != null ? new Date(v.seconds * 1000) : new Date(v));
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
};

/**
 * Filter items with a `date` field by period.
 * Dateless docs are ALWAYS excluded (they're corrupt rows and previously caused
 * Dashboard vs Reports lifetime numbers to disagree).
 */
export const filterByPeriod = (items: any[], period: Period): any[] => {
  const start = periodStart(period);
  if (start === null) {
    return items.filter(i => tsOf(i.date) !== null);
  }
  return items.filter(i => {
    const t = tsOf(i.date);
    return t !== null && t >= start;
  });
};

export interface PnL {
  revenue: number;        // Σ units × sellPrice
  cogs: number;           // Σ units × buyPrice
  grossProfit: number;    // Σ s.profit (same as revenue − cogs for well-formed docs)
  totalExpenses: number;  // Σ expense.amount
  netProfit: number;      // grossProfit − totalExpenses
  marginPct: number;      // grossProfit / revenue × 100
  returnsImpact: number;  // Σ profit where isReturn (negative = returns ne kam kiya)
  salesCount: number;     // number of sale docs (incl. returns)
}

const n = (v: any): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Compute a full P&L from (already period-filtered) sales + expenses. */
export const computePnL = (sales: any[], expenses: any[]): PnL => {
  let revenue = 0, cogs = 0, grossProfit = 0, returnsImpact = 0;
  for (const s of sales) {
    const units = n(s.units);
    revenue += units * n(s.sellPrice);
    cogs += units * n(s.buyPrice);
    grossProfit += n(s.profit);
    if (s.isReturn) returnsImpact += n(s.profit);
  }
  let totalExpenses = 0;
  for (const e of expenses) totalExpenses += n(e.amount);

  return {
    revenue,
    cogs,
    grossProfit,
    totalExpenses,
    netProfit: grossProfit - totalExpenses,
    marginPct: revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0,
    returnsImpact,
    salesCount: sales.length,
  };
};

/** Group expenses by month key → total. */
export const expensesByMonth = (expenses: any[]): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    const t = tsOf(e.date);
    if (t === null) continue;
    const key = getMonthKey(new Date(t));
    map[key] = (map[key] || 0) + n(e.amount);
  }
  return map;
};
