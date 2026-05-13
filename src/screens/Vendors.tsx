import React from 'react';
import { Users, Phone, UserCircle, Search, ExternalLink, Calendar, Loader2, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Vendor } from '../types';
import { dataService } from '../services/dataService';

import { useToast } from '../context/ToastContext';

export const Vendors: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newVendor, setNewVendor] = React.useState({
    name: '',
    phoneNumber: '',
    salesmanName: '',
    salesmanPhone: '',
    orderBookerName: '',
    orderBookerPhone: ''
  });

  React.useEffect(() => {
    const fetch = async () => {
      const data = await dataService.getVendors();
      setVendors(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleDelete = async (id: string) => {
    if (userRole !== 'owner') return;
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      // Implement delete vendor in dataService later if needed
      // For now we just alert
      showToast('Delete vendor feature coming soon.', 'info');
    }
  };

  const filteredVendors = (vendors || []).filter(v => {
    const q = searchTerm.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      (v.phoneNumber || '').includes(q) ||
      (v.salesmanName || '').toLowerCase().includes(q) ||
      (v.salesmanPhone || '').includes(q) ||
      (v.orderBookerPhone || '').includes(q)
    );
  });

  const handleAddVendor = async () => {
    if (!newVendor.name.trim()) {
      showToast('Company name required hai', 'warning');
      return;
    }
    setLoading(true);
    try {
      await dataService.addVendor(newVendor);
      const data = await dataService.getVendors();
      setVendors(data || []);
      setShowAddModal(false);
      showToast('Vendor added successfully!', 'success');
      setNewVendor({
        name: '',
        phoneNumber: '',
        salesmanName: '',
        salesmanPhone: '',
        orderBookerName: '',
        orderBookerPhone: ''
      });
    } catch (e) {
      showToast('Failed to add vendor', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-6">
        <div className="flex justify-between items-end text-center sm:text-left">
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.2em] mb-2">Network Directory</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-emerald-900">Vendors</h1>
          </div>
          {userRole === 'owner' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/10 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          )}
        </div>

        <div className="relative group max-w-xl mx-auto sm:mx-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-700 transition-colors w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search name, salesman or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-5 bg-white border border-emerald-50 rounded-2xl focus:ring-2 focus:ring-emerald-900/5 transition-all shadow-sm outline-none"
          />
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-900" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredVendors.map((vendor, idx) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card group p-6 rounded-[32px] hover:shadow-xl hover:shadow-emerald-900/5 transition-all border-transparent hover:border-emerald-100"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-900 shadow-inner group-hover:scale-110 transition-transform">
                    <span className="text-xl font-bold">{vendor.name[0]}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-emerald-950">{vendor.name}</h3>
                    <div className="flex items-center gap-2 text-slate-400 mt-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span className="text-xs font-bold uppercase tracking-widest tracking-tighter">{vendor.phoneNumber}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50">
                  <div className="flex items-center gap-2 mb-1">
                    <UserCircle className="w-3 h-3 text-emerald-700" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Salesman</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-emerald-900">{vendor.salesmanName || 'N/A'}</p>
                    <p className="text-xs font-medium text-slate-500">{vendor.salesmanPhone || 'N/A'}</p>
                  </div>
                </div>
                <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50">
                  <div className="flex items-center gap-2 mb-1">
                    <UserCircle className="w-3 h-3 text-emerald-700" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order Booker</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-emerald-900">{vendor.orderBookerName || 'N/A'}</p>
                    <p className="text-xs font-medium text-slate-500">{vendor.orderBookerPhone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-emerald-50/50 flex flex-wrap gap-4 justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-900/30" />
                  <span>Last Supply: {vendor.lastPurchaseDate || 'Never'}</span>
                </div>
                <div className="flex gap-4">
                  {vendor.salesmanPhone && (
                    <a href={`tel:${vendor.salesmanPhone}`} className="flex items-center gap-1.5 text-emerald-900 hover:underline">
                      Call Sales
                      <Phone className="w-3 h-3" />
                    </a>
                  )}
                  {vendor.orderBookerPhone && (
                    <a href={`tel:${vendor.orderBookerPhone}`} className="flex items-center gap-1.5 text-emerald-900 hover:underline">
                      Call Booker
                      <Phone className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && filteredVendors.length === 0 && (
        <div className="py-20 text-center">
          <Users className="w-16 h-16 text-slate-100 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-400">No vendors found</h3>
          <p className="text-slate-400 text-sm mt-1">Try searching for a different name or number.</p>
        </div>
      )}

      {/* Add Vendor Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/20 backdrop-blur-md"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-lg glass-card rounded-[40px] p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-emerald-900">Add New Vendor</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Company Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Nestle Pakistan" 
                    className="w-full bg-emerald-50/30 border-none rounded-2xl py-4 px-6 text-emerald-900 font-bold outline-none focus:ring-2 focus:ring-emerald-900/20"
                    value={newVendor.name}
                    onChange={(e) => setNewVendor({...newVendor, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Company Phone <span className="normal-case text-slate-400 font-normal">(optional)</span></label>
                  <input 
                    type="text" 
                    placeholder="0300-1234567" 
                    className="w-full bg-emerald-50/30 border-none rounded-2xl py-4 px-6 text-emerald-900 font-bold outline-none focus:ring-2 focus:ring-emerald-900/20"
                    value={newVendor.phoneNumber}
                    onChange={(e) => setNewVendor({...newVendor, phoneNumber: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Salesman Name <span className="normal-case text-slate-400 font-normal">(opt)</span></label>
                    <input 
                      type="text" 
                      placeholder="Name" 
                      className="w-full bg-emerald-50/30 border-none rounded-2xl py-4 px-6 text-emerald-900 font-bold outline-none focus:ring-2 focus:ring-emerald-900/20"
                      value={newVendor.salesmanName}
                      onChange={(e) => setNewVendor({...newVendor, salesmanName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Salesman Phone <span className="normal-case text-slate-400 font-normal">(opt)</span></label>
                    <input 
                      type="text" 
                      placeholder="Phone" 
                      className="w-full bg-emerald-50/30 border-none rounded-2xl py-4 px-6 text-emerald-900 font-bold outline-none focus:ring-2 focus:ring-emerald-900/20"
                      value={newVendor.salesmanPhone}
                      onChange={(e) => setNewVendor({...newVendor, salesmanPhone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Order Booker Name <span className="normal-case text-slate-400 font-normal">(opt)</span></label>
                    <input 
                      type="text" 
                      placeholder="Name" 
                      className="w-full bg-emerald-50/30 border-none rounded-2xl py-4 px-6 text-emerald-900 font-bold outline-none focus:ring-2 focus:ring-emerald-900/20"
                      value={newVendor.orderBookerName}
                      onChange={(e) => setNewVendor({...newVendor, orderBookerName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Order Booker Phone <span className="normal-case text-slate-400 font-normal">(opt)</span></label>
                    <input 
                      type="text" 
                      placeholder="Phone" 
                      className="w-full bg-emerald-50/30 border-none rounded-2xl py-4 px-6 text-emerald-900 font-bold outline-none focus:ring-2 focus:ring-emerald-900/20"
                      value={newVendor.orderBookerPhone}
                      onChange={(e) => setNewVendor({...newVendor, orderBookerPhone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleAddVendor}
                className="w-full bg-emerald-900 text-white py-6 rounded-2xl font-bold text-xl active:scale-95 transition-all shadow-xl shadow-emerald-900/20"
              >
                Save Vendor
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

