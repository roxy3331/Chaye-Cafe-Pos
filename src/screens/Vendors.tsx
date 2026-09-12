import React from 'react';
import { Users, Phone, UserCircle, Search, ExternalLink, Calendar, Loader2, X, Plus, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Vendor } from '../types';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { ShimmerButton } from '../components/magicui';

const EMPTY_VENDOR = {
  name: '',
  phoneNumber: '',
  salesmanName: '',
  salesmanPhone: '',
  orderBookerName: '',
  orderBookerPhone: ''
};

export const Vendors: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [editingVendor, setEditingVendor] = React.useState<Vendor | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<Vendor | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [newVendor, setNewVendor] = React.useState({ ...EMPTY_VENDOR });

  const refreshVendors = async () => {
    const data = await dataService.getVendors();
    setVendors(data || []);
  };

  React.useEffect(() => {
    const fetch = async () => {
      try {
        await refreshVendors();
      } catch {
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      await dataService.deleteVendor(deleteConfirm.id);
      await refreshVendors();
      showToast('Vendor delete ho gaya ✅', 'success');
      setDeleteConfirm(null);
    } catch {
      showToast('Delete nahi ho saka', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (v: Vendor) => {
    setEditingVendor(v);
    setNewVendor({
      name: v.name || '',
      phoneNumber: v.phoneNumber || '',
      salesmanName: v.salesmanName || '',
      salesmanPhone: v.salesmanPhone || '',
      orderBookerName: v.orderBookerName || '',
      orderBookerPhone: v.orderBookerPhone || '',
    });
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
    setSaving(true);
    try {
      if (editingVendor) {
        await dataService.updateVendor(editingVendor.id, newVendor);
        showToast('Vendor update ✅', 'success');
      } else {
        await dataService.addVendor(newVendor);
        showToast('Vendor added successfully!', 'success');
      }
      await refreshVendors();
      setShowAddModal(false);
      setEditingVendor(null);
      setNewVendor({ ...EMPTY_VENDOR });
    } catch (e) {
      showToast(editingVendor ? 'Update nahi ho saka' : 'Failed to add vendor', 'error');
    } finally {
      setSaving(false);
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
            <ShimmerButton
              onClick={() => { setEditingVendor(null); setNewVendor({ ...EMPTY_VENDOR }); setShowAddModal(true); }}
              background="rgba(2,44,34,1)"
              borderRadius="12px"
              className="text-white px-6 py-3 font-bold"
            >
              <Plus className="w-4 h-4" />
              Add New
            </ShimmerButton>
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
                    <span className="text-xl font-bold">{vendor.name?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-emerald-950 truncate">{vendor.name}</h3>
                    <div className="flex items-center gap-2 text-slate-400 mt-1">
                      <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-tighter truncate">{vendor.phoneNumber}</span>
                    </div>
                  </div>
                </div>
                {userRole === 'owner' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { openEdit(vendor); setShowAddModal(true); }}
                      className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 transition-colors"
                      aria-label="Edit vendor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(vendor)}
                      className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      aria-label="Delete vendor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
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
                <div className="flex flex-wrap gap-2">
                  {vendor.salesmanPhone && (
                    <a
                      href={`tel:${vendor.salesmanPhone}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-bold hover:bg-emerald-100 transition-colors active:scale-95"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call Sales
                    </a>
                  )}
                  {vendor.orderBookerPhone && (
                    <a
                      href={`tel:${vendor.orderBookerPhone}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-bold hover:bg-emerald-100 transition-colors active:scale-95"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call Booker
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

      {/* Add / Edit Vendor Modal */}
      <AnimatePresence>
        {(showAddModal || editingVendor) && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/20 backdrop-blur-md"
              onClick={() => { setShowAddModal(false); setEditingVendor(null); setNewVendor({ ...EMPTY_VENDOR }); }}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-lg glass-card rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-emerald-900">{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>
                <button onClick={() => { setShowAddModal(false); setEditingVendor(null); setNewVendor({ ...EMPTY_VENDOR }); }} className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-slate-400">
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
                      type="tel"
                      inputMode="tel"
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
                      type="tel"
                      inputMode="tel"
                      placeholder="Phone"
                      className="w-full bg-emerald-50/30 border-none rounded-2xl py-4 px-6 text-emerald-900 font-bold outline-none focus:ring-2 focus:ring-emerald-900/20"
                      value={newVendor.orderBookerPhone}
                      onChange={(e) => setNewVendor({...newVendor, orderBookerPhone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <ShimmerButton
                onClick={handleAddVendor}
                background="rgba(2,44,34,1)"
                borderRadius="16px"
                className="w-full py-6 text-white font-bold text-xl"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : editingVendor ? 'Save Changes' : 'Save Vendor'}
              </ShimmerButton>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/30 backdrop-blur-md"
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-sm glass-card rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl space-y-5 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-950">"{deleteConfirm.name}" ko delete karein?</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Ye wapas nahi aayega.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3.5 rounded-2xl border border-emerald-100 text-sm font-bold text-slate-500 hover:bg-emerald-50 transition-colors"
                  disabled={saving}
                >
                  Nahi
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Haan, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

