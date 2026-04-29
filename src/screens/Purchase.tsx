import React from 'react';
import { ShoppingCart, Search, Info, History, TrendingDown, Package, Layers, CheckCircle, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const Purchase: React.FC = () => {
  const [purchasePrice, setPurchasePrice] = React.useState('37.50');
  const [salePrice, setSalePrice] = React.useState('55.00');
  const [newQuantity, setNewQuantity] = React.useState('2'); // Number of packs/crates
  const [pcsPerPack, setPcsPerPack] = React.useState('24'); // Pieces in one pack
  const [remainingUnits, setRemainingUnits] = React.useState('2');
  const [selectedCategory, setSelectedCategory] = React.useState<'bottles' | 'lays' | 'biscuits' | 'custom'>('bottles');
  
  const totalNewPcs = parseInt(newQuantity || '0') * parseInt(pcsPerPack || '0');
  
  const unitOptions = {
    bottles: [
      { label: '250ml (24 pcs)', value: '24' },
      { label: '300ml (12 pcs)', value: '12' },
      { label: '500ml (12 pcs)', value: '12' },
      { label: '1.0L (6 pcs)', value: '6' },
      { label: '1.5L (6 pcs)', value: '6' },
      { label: '2.15L (4 pcs)', value: '4' },
    ],
    lays: [
      { label: 'Large (80 pcs)', value: '80' },
      { label: 'Medium (48 pcs)', value: '48' },
      { label: 'Small (16 pcs)', value: '16' },
    ],
    biscuits: [
      { label: '8 pcs', value: '8' },
      { label: '12 pcs', value: '12' },
      { label: '16 pcs', value: '16' },
      { label: '24 pcs', value: '24' },
      { label: '30 pcs', value: '30' },
    ]
  };

  // Mock data for existing item found after search
  const existingStock = 5; 
  const soldUnits = Math.max(0, existingStock - parseInt(remainingUnits || '0'));
  const totalNewStockTotal = parseInt(remainingUnits || '0') + totalNewPcs;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-6">
        <h1 className="text-5xl font-bold tracking-tight text-emerald-900">Purchase</h1>
        <div className="relative group max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-700 transition-colors w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search item (e.g. Coca Cola)..." 
            className="w-full pl-12 pr-6 py-5 bg-white border border-emerald-50 rounded-2xl focus:ring-2 focus:ring-emerald-900/5 transition-all shadow-sm outline-none"
            defaultValue="Coca Cola 250ml"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          
          {/* Stock Reconciliation (The "Smart" part) */}
          <section className="glass-card rounded-[32px] p-8 border-l-[6px] border-emerald-900">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-emerald-700" />
                <h3 className="text-2xl font-bold text-emerald-900">Current Shop Check</h3>
              </div>
              <span className="bg-emerald-50 text-emerald-900 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Item Exists</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Units in Shop (Before New Delivery)</p>
                <div className="p-5 bg-emerald-50/30 rounded-2xl border border-emerald-50 flex justify-between items-center">
                  <span className="text-lg font-medium text-emerald-900">Previous Batch Level:</span>
                  <span className="text-2xl font-bold text-emerald-900">{existingStock} Units</span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">How many are remaining NOW?</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={remainingUnits}
                    onChange={(e) => setRemainingUnits(e.target.value)}
                    className="w-full bg-white border-2 border-emerald-900/10 rounded-2xl py-5 px-6 text-3xl font-bold text-emerald-900 focus:border-emerald-900 transition-all outline-none"
                    placeholder="Enter remaining..."
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Bachay Huay</div>
                </div>
                <p className="text-xs text-slate-400 px-1 italic">Note: {soldUnits} units will be marked as SOLD and added to Profit Reports.</p>
              </div>
            </div>
          </section>

          {/* New Purchase Details */}
          <section className="glass-card rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <Package className="w-6 h-6 text-emerald-700" />
              <h3 className="text-2xl font-bold text-emerald-900">New Delivery Details</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Quantity (Packs/Crates)</label>
                <input 
                  type="number" 
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  className="w-full bg-emerald-50/30 border-none rounded-2xl py-4 px-5 text-xl font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-900/5 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Buying Price (Per PC)</label>
                <input 
                  type="number" 
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full bg-emerald-50/30 border-none rounded-2xl py-4 px-5 text-xl font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-900/5 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Selling Price (Per PC)</label>
                <input 
                  type="number" 
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full bg-emerald-50/30 border-none rounded-2xl py-4 px-5 text-xl font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-900/5 transition-all outline-none"
                />
              </div>
            </div>
          </section>

          {/* Unit Selector - NEW REFINED VERSION */}
          <section className="glass-card rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <Layers className="w-6 h-6 text-emerald-700" />
              <h3 className="text-2xl font-bold text-emerald-900">Select Unit Type</h3>
            </div>
            
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 bg-emerald-50/50 p-1.5 rounded-2xl">
              {[
                { id: 'bottles', label: 'Bottles' },
                { id: 'lays', label: 'Lays/Snacks' },
                { id: 'biscuits', label: 'Biscuits' },
                { id: 'custom', label: 'Manual Pcs' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={cn(
                    "px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all",
                    selectedCategory === cat.id 
                      ? "bg-emerald-900 text-white shadow-lg" 
                      : "text-emerald-900/60 hover:bg-emerald-100"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Pieces Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {selectedCategory !== 'custom' ? (
                unitOptions[selectedCategory as keyof typeof unitOptions].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setPcsPerPack(opt.value)}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left transition-all",
                      pcsPerPack === opt.value 
                        ? "border-emerald-900 bg-emerald-50" 
                        : "border-emerald-50 bg-white hover:border-emerald-200"
                    )}
                  >
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Standard Pack</p>
                    <p className="text-sm font-bold text-emerald-900">{opt.label}</p>
                  </button>
                ))
              ) : (
                <div className="col-span-full">
                  <div className="max-w-xs space-y-2">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Manually Enter Pcs per Unit</label>
                    <input 
                      type="number" 
                      value={pcsPerPack}
                      onChange={(e) => setPcsPerPack(e.target.value)}
                      className="w-full bg-white border-2 border-emerald-900/10 rounded-2xl py-4 px-6 text-xl font-bold text-emerald-900 focus:border-emerald-900 outline-none"
                      placeholder="e.g. 100"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Vendor Information */}
          <section className="glass-card rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-emerald-700" />
                <h3 className="text-2xl font-bold text-emerald-900">Vendor Supply Info</h3>
              </div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Salesman Name</label>
                  <input type="text" placeholder="e.g. Ahmed Ali" className="w-full bg-emerald-50/30 border-none rounded-xl py-4 px-5 text-emerald-900 outline-none font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Salesman Phone</label>
                  <input type="text" placeholder="03xx-xxxxxxx" className="w-full bg-emerald-50/30 border-none rounded-xl py-4 px-5 text-emerald-900 outline-none font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-emerald-50/50">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Order Booker Name</label>
                  <input type="text" placeholder="e.g. Zubair Khan" className="w-full bg-emerald-50/30 border-none rounded-xl py-4 px-5 text-emerald-900 outline-none font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Order Booker Phone</label>
                  <input type="text" placeholder="03xx-xxxxxxx" className="w-full bg-emerald-50/30 border-none rounded-xl py-4 px-5 text-emerald-900 outline-none font-medium" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          {/* New Advanced Merge Preview */}
          <section className="glass-card rounded-[32px] overflow-hidden border-none shadow-2xl backdrop-blur-2xl sticky top-24">
            <div className="bg-emerald-900 p-8 text-white">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-6 h-6" />
                  <h3 className="text-2xl font-bold">Merge Preview</h3>
                </div>
                <span className="bg-emerald-500 text-[10px] px-3 py-1 rounded-full font-extrabold uppercase tracking-widest">Live</span>
              </div>
            </div>
            
            <div className="p-8 space-y-6 bg-white/40">
              {/* Previous Batch Closure */}
              <div className="p-4 bg-emerald-900/5 rounded-2xl border border-emerald-900/10">
                <p className="text-[10px] font-bold text-emerald-900 uppercase tracking-widest mb-3">Settling Previous Batch</p>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-slate-500">Units Sold:</span>
                  <span className="font-bold text-emerald-950">{soldUnits} units</span>
                </div>
                <div className="flex justify-between text-sm py-1 border-t border-emerald-100/50 mt-1">
                  <span className="text-slate-500">Realized Profit:</span>
                  <span className="font-bold text-emerald-600">+{((soldUnits * parseFloat(salePrice)) - (soldUnits * parseFloat(purchasePrice))).toFixed(2)}</span>
                </div>
              </div>

              {/* Combined Stock */}
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-emerald-50/50 pb-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total New Stock</p>
                    <p className="text-4xl font-bold text-emerald-950">{totalNewStockTotal} <span className="text-sm font-normal text-slate-400 italic">units</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">New Avg Cost</p>
                    <p className="text-xl font-bold text-emerald-700">{purchasePrice}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <button className="w-full bg-emerald-900 text-white rounded-3xl py-6 font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-emerald-950/20">
                <CheckCircle className="w-6 h-6" />
                Finalize Purchase
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
