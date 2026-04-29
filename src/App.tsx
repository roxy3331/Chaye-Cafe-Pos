import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  const [user, setUser] = React.useState<{ role: 'owner' | 'employee' } | null>(null);

  if (!user) {
    return <Login onLogin={(role) => setUser({ role })} />;
  }

  return (
    <Router>
      <Layout userRole={user.role}>
        <Routes>
          <Route path="/" element={<Dashboard userRole={user.role} />} />
          <Route path="/purchase" element={<Purchase />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/reports" element={user.role === 'owner' ? <Reports /> : <Navigate to="/" />} />
          <Route path="/reports/share" element={user.role === 'owner' ? <ShareReport /> : <Navigate to="/" />} />
          <Route path="/expenses" element={user.role === 'owner' ? <Expenses /> : <Navigate to="/" />} />
          <Route path="/expenses/add" element={user.role === 'owner' ? <AddExpense /> : <Navigate to="/" />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/analytics" element={user.role === 'owner' ? <Reports /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
