import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, ReceiptIndianRupee, BarChart3, Menu, Bell, Users, X, LogOut, Settings, BookOpen, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';

interface LayoutProps {
  children: React.ReactNode;
  userRole: 'owner' | 'employee';
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, userRole, onLogout }) => {
  const initials = userRole === 'owner' ? 'OW' : 'EM';
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [restockAlerts, setRestockAlerts] = React.useState<any[]>([]);

  React.useEffect(() => {
    const unsub = dataService.subscribeToStock((items) => {
      const alerts = items.filter(i => i.stock === 0 || i.stock < (i.pcsPerPack || 1));
      setRestockAlerts(alerts.slice(0, 5));
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-64">
      {/* Top Header */}
      <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white/80 backdrop-blur-md border-b border-emerald-50 z-50 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-xl hover:bg-emerald-50 text-emerald-900 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold tracking-[0.1em] text-emerald-900 uppercase">
            SHOP HISAB
          </h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-xs font-bold text-emerald-950 capitalize">{userRole}</span>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">System Access</span>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(prev => !prev)}
              className="relative p-2 rounded-full hover:bg-emerald-50 transition-colors text-emerald-900"
            >
              <Bell className="w-5 h-5" />
              {restockAlerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-12 w-72 bg-white rounded-3xl shadow-2xl border border-emerald-50 overflow-hidden z-50">
                  <div className="p-4 border-b border-emerald-50 flex items-center justify-between">
                    <p className="text-sm font-bold text-emerald-900">Notifications</p>
                    <button onClick={() => setNotifOpen(false)}>
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {restockAlerts.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-2xl mb-2">✅</p>
                        <p className="text-xs text-slate-400 font-bold">Sab stock theek hai!</p>
                      </div>
                    ) : (
                      restockAlerts.map((item, i) => (
                        <div key={i} className="px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-emerald-50/50 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              item.stock === 0 ? "bg-red-500" : "bg-orange-400"
                            )} />
                            <div>
                              <p className="text-sm font-bold text-emerald-900">{item.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {item.stock === 0 ? '⚠️ Out of Stock' : `⚡ Low: ${Math.floor(item.stock / (item.pcsPerPack || 1))} box left`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Avatar + Logout */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-900 flex items-center justify-center border border-emerald-950 shadow-lg">
              <span className="text-xs font-bold text-white tracking-widest">{initials}</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Logout"
                className="hidden md:flex p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-emerald-50 flex-col py-8 px-4 z-50">
        <div className="mb-12 px-4">
          <h2 className="text-xl font-extrabold text-emerald-900 tracking-tighter">SHOP HISAB</h2>
          <p className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase">Purchase · Stock · Profit</p>
        </div>
        <nav className="space-y-2 flex-1">
          <SidebarLink to="/" icon={<LayoutDashboard />} label="Dashboard" />
          <SidebarLink to="/purchase" icon={<ShoppingCart />} label="Purchase" />
          <SidebarLink to="/stock" icon={<Package />} label="Stock" />
          {userRole === 'owner' && <SidebarLink to="/expenses" icon={<ReceiptIndianRupee />} label="Expenses" />}
          <SidebarLink to="/vendors" icon={<Users />} label="Vendors" />
          <SidebarLink to="/khata" icon={<BookOpen />} label="Khata" />
          <SidebarLink to="/returns" icon={<RotateCcw />} label="Returns" />
          {userRole === 'owner' && <SidebarLink to="/reports" icon={<BarChart3 />} label="Reports" />}
        </nav>
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all font-medium mt-4"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        )}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-emerald-950/30 backdrop-blur-sm z-[60]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={cn(
        "md:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-[70] flex flex-col py-8 px-4 transition-transform duration-300 shadow-2xl",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between mb-10 px-2">
          <div>
            <h2 className="text-xl font-extrabold text-emerald-900 tracking-tighter">SHOP HISAB</h2>
            <p className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase">Purchase · Stock · Profit</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-xl hover:bg-emerald-50 text-emerald-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 px-2 py-3 bg-emerald-50 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-900 flex items-center justify-center">
            <span className="text-sm font-bold text-white tracking-widest">{initials}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-900 capitalize">{userRole}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">System Access</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1 mt-4" onClick={() => setMobileOpen(false)}>
          <MobileDrawerLink to="/" icon={<LayoutDashboard />} label="Dashboard" />
          <MobileDrawerLink to="/purchase" icon={<ShoppingCart />} label="Purchase" />
          <MobileDrawerLink to="/stock" icon={<Package />} label="Stock" />
          {userRole === 'owner' && <MobileDrawerLink to="/expenses" icon={<ReceiptIndianRupee />} label="Expenses" />}
          <MobileDrawerLink to="/vendors" icon={<Users />} label="Vendors" />
          <MobileDrawerLink to="/khata" icon={<BookOpen />} label="Khata" />
          <MobileDrawerLink to="/returns" icon={<RotateCcw />} label="Returns" />
          {userRole === 'owner' && <MobileDrawerLink to="/reports" icon={<BarChart3 />} label="Reports" />}
        </nav>

        {onLogout && (
          <button
            onClick={() => { setMobileOpen(false); onLogout(); }}
            className="flex items-center gap-3 px-4 py-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold mt-4 border border-red-100"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        )}
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-emerald-100 px-2 py-3 pb-safe z-50 flex justify-around items-center">
        <MobileNavLink to="/" icon={<LayoutDashboard />} label="Home" />
        <MobileNavLink to="/purchase" icon={<ShoppingCart />} label="Purchase" />
        <MobileNavLink to="/stock" icon={<Package />} label="Stock" />
        <MobileNavLink to="/khata" icon={<BookOpen />} label="Khata" />
        <MobileNavLink to="/vendors" icon={<Users />} label="Vendors" />
        {userRole === 'owner' && <MobileNavLink to="/reports" icon={<BarChart3 />} label="Reports" />}
      </nav>

      {/* Main Content */}
      <main className="pt-20 px-4 md:px-8 max-w-7xl mx-auto pb-28 md:pb-16">
        {children}
      </main>
    </div>
  );
};

const SidebarLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <NavLink
    to={to}
    end={to === '/'}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
        isActive
          ? "bg-emerald-900 text-white shadow-lg shadow-emerald-900/10"
          : "text-slate-500 hover:text-emerald-900 hover:bg-emerald-50"
      )
    }
  >
    {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
    <span>{label}</span>
  </NavLink>
);

const MobileDrawerLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <NavLink
    to={to}
    end={to === '/'}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 font-bold",
        isActive
          ? "bg-emerald-900 text-white"
          : "text-slate-600 hover:text-emerald-900 hover:bg-emerald-50"
      )
    }
  >
    {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
    <span>{label}</span>
  </NavLink>
);

const MobileNavLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <NavLink
    to={to}
    end={to === '/'}
    className={({ isActive }) =>
      cn(
        "flex flex-col items-center justify-center gap-1 transition-all",
        isActive ? "text-emerald-900" : "text-slate-400"
      )
    }
  >
    <div className={cn("p-1 rounded-lg transition-all", "active:scale-90")}>
      {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
    </div>
    <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
  </NavLink>
);
