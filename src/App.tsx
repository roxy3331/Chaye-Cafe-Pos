import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Layout } from './components/Layout';
import { Dashboard } from './screens/Dashboard';
import { Stock } from './screens/Stock';
import { Purchase } from './screens/Purchase';
import { Expenses, AddExpense } from './screens/Expenses';
import { Reports } from './screens/Reports';
import { Settings } from './screens/Settings';
import { ShareReport } from './screens/ShareReport';
import { Vendors } from './screens/Vendors';
import { Login } from './screens/Login';
import { OpeningStock } from './screens/OpeningStock';
import { Khata } from './screens/Khata';
import { KhataDetail } from './screens/KhataDetail';
import { Returns } from './screens/Returns';
import { ToastProvider } from './context/ToastContext';
import { dataService } from './services/dataService';

export default function App() {
  const [user, setUser] = React.useState<{ role: 'owner' | 'employee' } | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Hook 1 — auth listener (must be before any conditional return)
  React.useEffect(() => {
    let checkTimeout = setTimeout(() => {
      if (loading) setLoading(false);
    }, 2000); // Reduced from 8000ms to 2000ms

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setUser({ role: userDoc.data().role });
          } else {
            console.warn("User authenticated but profile not found in Firestore.");
          }
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
          const [ly, lm] = lastRecorded.split('-').map(Number);
          const prevMonthStart = new Date(ly, lm - 1, 1, 0, 0, 0, 0);
          const prevMonthEnd = new Date(ly, lm, 1, 0, 0, 0, 0);

          const sales = await new Promise<any[]>((resolve) => {
            const unsub = dataService.subscribeToSales((data) => {
              unsub();
              resolve(data);
            });
          });

          const prevMonthProfit = sales
            .filter(s => {
              const d = s.date?.toDate?.();
              return d && d >= prevMonthStart && d < prevMonthEnd;
            })
            .reduce((acc, s) => acc + (s.profit || 0), 0);

          const monthLabel = prevMonthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          await dataService.saveMonthlyProfit(lastRecorded, prevMonthProfit, monthLabel);
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
  };

  if (!user) {
    return <Login onLogin={(role) => setUser({ role })} />;
  }

  return (
    <Router>
      <ToastProvider>
        <Layout userRole={user.role} onLogout={handleLogout}>
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
            <Route path="/settings" element={<Settings />} />
            <Route path="/analytics" element={user.role === 'owner' ? <Reports /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </Router>
  );
}
