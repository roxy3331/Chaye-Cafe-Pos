import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { isOwnerUid } from './lib/config';
import { Layout } from './components/Layout';
import { ToastProvider } from './context/ToastContext';
import { dataService } from './services/dataService';

const Dashboard    = React.lazy(() => import('./screens/Dashboard').then(m => ({ default: m.Dashboard })));
const Stock        = React.lazy(() => import('./screens/Stock').then(m => ({ default: m.Stock })));
const Purchase     = React.lazy(() => import('./screens/Purchase').then(m => ({ default: m.Purchase })));
const Expenses     = React.lazy(() => import('./screens/Expenses').then(m => ({ default: m.Expenses })));
const AddExpense   = React.lazy(() => import('./screens/Expenses').then(m => ({ default: m.AddExpense })));
const Reports      = React.lazy(() => import('./screens/Reports').then(m => ({ default: m.Reports })));
const Settings     = React.lazy(() => import('./screens/Settings').then(m => ({ default: m.Settings })));
const ShareReport  = React.lazy(() => import('./screens/ShareReport').then(m => ({ default: m.ShareReport })));
const Vendors      = React.lazy(() => import('./screens/Vendors').then(m => ({ default: m.Vendors })));
const Login        = React.lazy(() => import('./screens/Login').then(m => ({ default: m.Login })));
const OpeningStock = React.lazy(() => import('./screens/OpeningStock').then(m => ({ default: m.OpeningStock })));
const Khata        = React.lazy(() => import('./screens/Khata').then(m => ({ default: m.Khata })));
const KhataDetail  = React.lazy(() => import('./screens/KhataDetail').then(m => ({ default: m.KhataDetail })));
const Returns      = React.lazy(() => import('./screens/Returns').then(m => ({ default: m.Returns })));
const History      = React.lazy(() => import('./screens/History').then(m => ({ default: m.History })));
const Pubg         = React.lazy(() => import('./screens/Pubg').then(m => ({ default: m.Pubg })));
const Shop         = React.lazy(() => import('./screens/Shop').then(m => ({ default: m.Shop })));

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-emerald-900/10 border-t-emerald-900 rounded-full animate-spin" />
  </div>
);

export default function App() {
  const [user, setUser] = React.useState<{ role: 'owner' | 'employee' } | null>(() => {
    try {
      const cached = window.localStorage.getItem('chaye:userRole');
      if (cached === 'owner' || cached === 'employee') return { role: cached as 'owner' | 'employee' };
    } catch {}
    return null;
  });
  const [loading, setLoading] = React.useState(() => {
    try { return !window.localStorage.getItem('chaye:userRole'); } catch { return true; }
  });

  // Hook 1 — auth listener (must be before any conditional return)
  React.useEffect(() => {
    let checkTimeout = setTimeout(() => {
      if (loading) setLoading(false);
    }, 2000); // Reduced from 8000ms to 2000ms

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Owner role comes ONLY from the pinned UID list (src/lib/config.ts);
          // the users collection can never grant owner under the hardened rules.
          const role: 'owner' | 'employee' = isOwnerUid(firebaseUser.uid) ? 'owner' : 'employee';
          setUser({ role });
          try { window.localStorage.setItem('chaye:userRole', role); } catch {}
        } else {
          setUser(null);
          try { window.localStorage.removeItem('chaye:userRole'); } catch {}
        }
      } catch (err) {
        console.error("Auth sync error (non-fatal):", err);
      } finally {
        setLoading(false);
        clearTimeout(checkTimeout);
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(checkTimeout);
    };
  }, []);

  // Hook 2 — monthly profit auto-save (must be before any conditional return)
  React.useEffect(() => {
    if (!user) return;
    const checkMonthlyProfit = async () => {
      try {
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastRecorded = await dataService.getLastRecordedMonth();

        if (lastRecorded && lastRecorded !== currentMonthKey) {
          // Fetch sales + expenses ONCE, then compute + save NET profit for EVERY
          // missed month between lastRecorded and currentMonth (not just the first).
          const [sales, expenses] = await Promise.all([
            dataService.getSales(),
            dataService.getExpenses(),
          ]);

          const tsOf = (v: any): number | null => {
            if (!v) return null;
            const d = v.toDate?.() ?? (v.seconds != null ? new Date(v.seconds * 1000) : new Date(v));
            const t = d.getTime();
            return Number.isFinite(t) ? t : null;
          };

          // Walk forward month-by-month from lastRecorded up to (but not including) current month.
          let [ly, lm] = lastRecorded.split('-').map(Number);
          const safetyCap = 24; // guard against runaway loop
          let iter = 0;
          while (iter < safetyCap) {
            iter++;
            const monthStart = new Date(ly, lm - 1, 1, 0, 0, 0, 0);
            const monthEnd = new Date(ly, lm, 1, 0, 0, 0, 0);
            const monthKey = `${ly}-${String(lm).padStart(2, '0')}`;

            const inMonth = (items: any[]) => items.filter(i => {
              const t = tsOf(i.date);
              return t !== null && t >= monthStart.getTime() && t < monthEnd.getTime();
            });

            const monthGross = inMonth(sales).reduce((acc, s) => acc + (s.profit || 0), 0);
            const monthExpenses = inMonth(expenses).reduce((acc, e) => acc + (e.amount || 0), 0);
            const monthNet = monthGross - monthExpenses;

            const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            await dataService.saveMonthlyProfit(monthKey, monthNet, monthLabel, monthGross, monthExpenses);

            // Advance to next month
            lm++;
            if (lm > 12) { lm = 1; ly++; }
            const nextKey = `${ly}-${String(lm).padStart(2, '0')}`;
            if (nextKey === currentMonthKey) break;
          }
        }

        await dataService.setLastRecordedMonth(currentMonthKey);
      } catch (err) {
        console.warn('Monthly profit check failed (non-fatal):', err);
      }
    };
    checkMonthlyProfit();
  }, [user]);

  // ---- All hooks above this line ----

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-900/10 border-t-emerald-900 rounded-full animate-spin" />
          <p className="text-emerald-900 font-bold uppercase text-[10px] tracking-widest">Waking up system...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    try { window.localStorage.removeItem('chaye:userRole'); } catch {}
  };

  if (!user) {
    return (
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-emerald-50"><div className="w-10 h-10 border-4 border-emerald-900/10 border-t-emerald-900 rounded-full animate-spin" /></div>}>
        <Login onLogin={(role) => setUser({ role })} />
      </React.Suspense>
    );
  }

  return (
    <Router>
      <ToastProvider>
        <Layout userRole={user.role} onLogout={handleLogout}>
          <React.Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard userRole={user.role} />} />
              <Route path="/purchase" element={<Purchase userRole={user.role} />} />
              <Route path="/stock" element={<Stock userRole={user.role} />} />
              <Route path="/reports" element={user.role === 'owner' ? <Reports /> : <Navigate to="/" />} />
              <Route path="/reports/share" element={user.role === 'owner' ? <ShareReport /> : <Navigate to="/" />} />
              <Route path="/expenses" element={user.role === 'owner' ? <Expenses /> : <Navigate to="/" />} />
              <Route path="/expenses/add" element={user.role === 'owner' ? <AddExpense /> : <Navigate to="/" />} />
              <Route path="/opening-stock" element={<OpeningStock />} />
              <Route path="/vendors" element={<Vendors userRole={user.role} />} />
              <Route path="/khata" element={<Khata userRole={user.role} />} />
              <Route path="/khata/:customerId" element={<KhataDetail userRole={user.role} />} />
              <Route path="/returns" element={<Returns userRole={user.role} />} />
              <Route path="/history" element={<History userRole={user.role} />} />
              <Route path="/pubg" element={user.role === 'owner' ? <Pubg userRole={user.role} /> : <Navigate to="/" />} />
              <Route path="/shop" element={user.role === 'owner' ? <Shop userRole={user.role} /> : <Navigate to="/" />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/analytics" element={user.role === 'owner' ? <Reports /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </Layout>
      </ToastProvider>
    </Router>
  );
}
