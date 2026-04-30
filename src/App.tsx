import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './lib/firebase';
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
import { ToastProvider } from './context/ToastContext';

export default function App() {
  const [user, setUser] = React.useState<{ role: 'owner' | 'employee' } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let checkTimeout = setTimeout(() => {
      if (loading) setLoading(false);
    }, 8000); // 8 second fallback

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setUser({ role: userDoc.data().role });
          }
        } catch (err) {
          console.error("Auth sync error:", err);
        }
      }
      setLoading(false);
      clearTimeout(checkTimeout);
    });
    return () => {
      unsubscribe();
      clearTimeout(checkTimeout);
    };
  }, [loading]);

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

  if (!user) {
    return <Login onLogin={(role) => setUser({ role })} />;
  }

  return (
    <Router>
      <ToastProvider>
        <Layout userRole={user.role}>
          <Routes>
            <Route path="/" element={<Dashboard userRole={user.role} />} />
            <Route path="/purchase" element={<Purchase userRole={user.role} />} />
            <Route path="/stock" element={<Stock userRole={user.role} />} />
            <Route path="/reports" element={user.role === 'owner' ? <Reports /> : <Navigate to="/" />} />
            <Route path="/reports/share" element={user.role === 'owner' ? <ShareReport /> : <Navigate to="/" />} />
            <Route path="/expenses" element={user.role === 'owner' ? <Expenses /> : <Navigate to="/" />} />
            <Route path="/expenses/add" element={user.role === 'owner' ? <AddExpense /> : <Navigate to="/" />} />
            <Route path="/opening-stock" element={user.role === 'owner' ? <OpeningStock /> : <Navigate to="/" />} />
            <Route path="/vendors" element={<Vendors userRole={user.role} />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/analytics" element={user.role === 'owner' ? <Reports /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </Router>
  );
}
