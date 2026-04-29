import React from 'react';
import { Users, Phone, UserCircle, Search, ExternalLink, Calendar, MoreVertical } from 'lucide-react';
import { motion } from 'motion/react';
import { Vendor } from '../types';

export const Vendors: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const mockVendors: Vendor[] = [
    {
      id: '1',
      name: 'Nestle Pakistan',
      phoneNumber: '0300-1234567',
      salesmanName: 'Ahmed Ali',
      salesmanPhone: '0300-9988776',
      orderBookerName: 'Zubair Khan',
      orderBookerPhone: '0301-1122334',
      lastPurchaseDate: '2023-10-24'
    },
    {
      id: '2',
      name: 'Pepsi Co.',
      phoneNumber: '0321-7654321',
      salesmanName: 'Imran Malik',
      salesmanPhone: '0322-4455667',
      orderBookerName: 'Salman Aziz',
      orderBookerPhone: '0323-7788990',
      lastPurchaseDate: '2023-10-22'
    }
  ];

  const filteredVendors = mockVendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.phoneNumber.includes(searchTerm) ||
    v.salesmanPhone.includes(searchTerm) ||
    v.orderBookerPhone.includes(searchTerm)
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-6">
        <div className="flex justify-between items-end text-center sm:text-left">
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.2em] mb-2">Network Directory</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-emerald-900">Vendors</h1>
          </div>
          <button className="bg-emerald-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/10 active:scale-95 transition-all">
            <Users className="w-4 h-4" />
            Add New
          </button>
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
              <button className="p-2 text-slate-400 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50">
                <div className="flex items-center gap-2 mb-1">
                  <UserCircle className="w-3 h-3 text-emerald-700" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Salesman</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-900">{vendor.salesmanName}</p>
                  <p className="text-xs font-medium text-slate-500">{vendor.salesmanPhone}</p>
                </div>
              </div>
              <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50">
                <div className="flex items-center gap-2 mb-1">
                  <UserCircle className="w-3 h-3 text-emerald-700" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order Booker</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-900">{vendor.orderBookerName}</p>
                  <p className="text-xs font-medium text-slate-500">{vendor.orderBookerPhone}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-emerald-50/50 flex flex-wrap gap-4 justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-900/30" />
                <span>Last Supply: {vendor.lastPurchaseDate}</span>
              </div>
              <div className="flex gap-4">
                <button className="flex items-center gap-1.5 text-emerald-900 hover:underline">
                  Call Sales
                  <Phone className="w-3 h-3" />
                </button>
                <button className="flex items-center gap-1.5 text-emerald-900 hover:underline">
                  Call Booker
                  <Phone className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <div className="py-20 text-center">
          <Users className="w-16 h-16 text-slate-100 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-400">No vendors found</h3>
          <p className="text-slate-400 text-sm mt-1">Try searching for a different name or number.</p>
        </div>
      )}
    </div>
  );
};
