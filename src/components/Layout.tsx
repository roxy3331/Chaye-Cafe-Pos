import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, ReceiptIndianRupee, BarChart3, Menu, Bell, Users } from 'lucide-react';
import { cn } from '../lib/utils';

export const Layout: React.FC<{ children: React.ReactNode; userRole: 'owner' | 'employee' }> = ({ children, userRole }) => {
  const initials = userRole === 'owner' ? 'OW' : 'EM';
  
  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-64">
      {/* Top Header */}
      <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white/80 backdrop-blur-md border-b border-emerald-50 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button className="md:hidden text-emerald-900">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold tracking-[0.1em] text-emerald-900 uppercase">
            SHOP HISAB
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-xs font-bold text-emerald-950 capitalize">{userRole}</span>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">System Access</span>
          </div>
          <button className="p-2 rounded-full hover:bg-emerald-50 transition-colors text-emerald-900 focus:outline-none">
            <Bell className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-emerald-900 flex items-center justify-center border border-emerald-950 shadow-lg">
            <span className="text-xs font-bold text-white tracking-widest">{initials}</span>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-emerald-50 flex-col py-8 px-4 z-50">
        <div className="mb-12 px-4">
          <h2 className="text-xl font-extrabold text-emerald-900 tracking-tighter">SHOP HISAB</h2>
          <p className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase">Purchase · Stock · Profit</p>
        </div>
        <nav className="space-y-2">
          <SidebarLink to="/" icon={<LayoutDashboard />} label="Dashboard" />
          <SidebarLink to="/purchase" icon={<ShoppingCart />} label="Purchase" />
          <SidebarLink to="/stock" icon={<Package />} label="Stock" />
          {userRole === 'owner' && <SidebarLink to="/expenses" icon={<ReceiptIndianRupee />} label="Expenses" />}
          <SidebarLink to="/vendors" icon={<Users />} label="Vendors" />
          {userRole === 'owner' && <SidebarLink to="/reports" icon={<BarChart3 />} label="Reports" />}
        </nav>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-emerald-100 px-2 py-3 pb-safe z-50 flex justify-around items-center">
        <MobileNavLink to="/" icon={<LayoutDashboard />} label="Home" />
        <MobileNavLink to="/purchase" icon={<ShoppingCart />} label="Purchase" />
        <MobileNavLink to="/stock" icon={<Package />} label="Stock" />
        <MobileNavLink to="/vendors" icon={<Users />} label="Vendors" />
        {userRole === 'owner' && <MobileNavLink to="/reports" icon={<BarChart3 />} label="Reports" />}
      </nav>

      {/* Main Content */}
      <main className="pt-24 px-4 md:px-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
};

const SidebarLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <NavLink
    to={to}
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

const MobileNavLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        "flex flex-col items-center justify-center gap-1 transition-all",
        isActive ? "text-emerald-900" : "text-slate-400"
      )
    }
  >
    <div className={cn(
      "p-1 rounded-lg transition-all",
      "active:scale-90"
    )}>
      {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
    </div>
    <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
  </NavLink>
);
