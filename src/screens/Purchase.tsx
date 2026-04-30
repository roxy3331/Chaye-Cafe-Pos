import React from 'react';
import { ShoppingCart, Search, Info, History, TrendingDown, Package, Layers, CheckCircle, Users, Loader2, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export const Purchase: React.FC<{ userRole?: 'owner' | 'employee' }> = ({ userRole = 'owner' }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [itemName, setItemName] = React.useState('');
  const [category, setCategory] = React.useState('🏷️ Other');
  const [purchasePrice, setPurchasePrice] = React.useState('');
  const [salePrice, setSalePrice] = React.useState('');
  const [newQuantity, setNewQuantity] = React.useState('1'); 
  const [pcsPerPack, setPcsPerPack] = React.useState('1'); 
  const [remainingUnits, setRemainingUnits] = React.useState('0');
  const [selectedUnitCat, setSelectedUnitCat] = React.useState<'bottles' | 'snacks' | 'biscuits' | 'cigarettes' | 'velo' | 'custom'>('custom');
  const [loading, setLoading] = React.useState(false);
  const [existingItems, setExistingItems] = React.useState<any[]>([]);
  const [foundItem, setFoundItem] = React.useState<any | null>(null);

  const categories = [
    '🥤 Cold Drinks',
    '🚬 Cigarettes',
    '🍟 Chips',
    '🍪 Biscuits',
    '💧 Water',
    '⚡ Energy Drinks',
    '🟡 Velo',
    '🏷️ Other'
  ];
  
  // Vendor states
  const [salesmanName, setSalesmanName] = React.useState('');
  const [salesmanPhone, setSalesmanPhone] = React.useState('');
  const [orderBookerName, setOrderBookerName] = React.useState('');
  const [orderBookerPhone, setOrderBookerPhone] = React.useState('');

  React.useEffect(() => {
    const unsub = dataService.subscribeToStock((data) => {
      setExistingItems(data);
    });
    return () => unsub();
  }, []);

  const [showItemPicker, setShowItemPicker] = React.useState(false);

  const handleSearch = (name: string) => {
    setItemName(name);
    const cleanName = name.toLowerCase().trim();
    if (!cleanName) {
      setFoundItem(null);
      return;
    }
    const item = existingItems.find(i => i.name.toLowerCase().trim() === cleanName);
    if (item) {
      setFoundItem(item);
      setCategory(item.category || '🏷️ Other');
      setSalePrice(item.currentSell?.toString() || '');
      setRemainingUnits(item.stock?.toString() || '0');
      setPurchasePrice(item.averageBuy?.toString() || '');
      setShowItemPicker(false);
    } else {
      setFoundItem(null);
    }
  };

  const suggestions = itemName.length > 0 && !foundItem 
    ? existingItems.filter(i => i.name.toLowerCase().includes(itemName.toLowerCase())).slice(0, 5)
    : [];

  const totalNewPcs = parseInt(newQuantity || '0') * parseInt(pcsPerPack || '0');
  
  const unitOptions = {
    bottles: [
      { label: '250ml (24 pcs)', value: '24' },
      { label: '500ml (12 pcs)', value: '12' },
      { label: '1.5L (6 pcs)', value: '6' },
    ],
    snacks: [
      { label: '30 pcs', value: '30' },
      { label: '24 pcs', value: '24' },
      { label: '12 pcs', value: '12' },
    ],
    biscuits: [
      { label: '12 pcs', value: '12' },
      { label: '24 pcs', value: '24' },
    ],
    cigarettes: [
      { label: '1 Polister (10 packs)', value: '10' },
    ],
    velo: [
      { label: '1 Polister (5 boxes)', value: '5' },
    ]
  };

  const existingStock = foundItem ? foundItem.stock : 0; 
  const currentPcsPerPack = foundItem ? (foundItem.pcsPerPack || 1) : parseInt(pcsPerPack || '1');
  const soldPcs = Math.max(0, existingStock - parseInt(remainingUnits || '0'));
  const soldUnitsCount = soldPcs / currentPcsPerPack;
  const totalNewStockTotal = parseInt(remainingUnits || '0') + totalNewPcs;

  const handleFinalize = async () => {
    if (!itemName || !purchasePrice || !salePrice) {
      showToast('Please enter Name, Buying & Selling Price', 'warning');
      return;
    }
    setLoading(true);
    try {
      const sanitizedQty = parseInt(newQuantity || '0') || 0;
      const sanitizedPcsPerPack = parseInt(pcsPerPack || '0') || 1;
      const sanitizedTotalPcs = sanitizedQty * sanitizedPcsPerPack;
      const sanitizedRemaining = parseInt(remainingUnits || '0') || 0;
      const sanitizedBuyPrice = parseFloat(purchasePrice || '0') || 0;
      const sanitizedSellPrice = parseFloat(salePrice || '0') || 0;

      await dataService.addPurchase({
        itemName,
        category,
        quantity: sanitizedQty,
        pcsPerPack: sanitizedPcsPerPack,
        totalPcs: sanitizedTotalPcs,
        buyingPricePerPc: sanitizedBuyPrice,
        sellingPricePerPc: sanitizedSellPrice,
        salesmanName,
        salesmanPhone,
        orderBookerName,
        orderBookerPhone,
        remainingUnits: sanitizedRemaining
      });
      showToast('Stock updated successfully!', 'success');
      navigate('/stock');
    } catch (e) {
      showToast('Failed to save purchase', 'error');
    } finally {
      setLoading(false);
    }
  };

  const quickButtons = [0, 1, 2, 3, 5, 10, 15, 20, 25, 30, 50];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-4">
        <h1 className="text-5xl font-bold tracking-tight text-emerald-900">Purchase Entry</h1>
        <p className="text-slate-500 font-medium px-1 italic text-sm">Enter item details as they arrive. If the item exists, we'll reconcile old stock.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Item Selection */}
          <section className="glass-card rounded-[32px] p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-emerald-700" />
                <h3 className="text-2xl font-bold text-emerald-900">Item Selection</h3>
              </div>
              <button 
                onClick={() => setShowItemPicker(!showItemPicker)}
                className="text-[10px] font-bold text-emerald-900 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full hover:bg-emerald-100 transition-colors"
              >
                <Filter className="w-3 h-3" />
                {showItemPicker ? 'CLOSE PICKER' : 'PICK FROM STOCK'}
              </button>
            </div>

            {showItemPicker && (
               <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100"
               >
                 {existingItems.map(item => (
                   <button 
                    key={item.id}
                    onClick={() => handleSearch(item.name)}
                    className="p-4 bg-white rounded-xl border border-emerald-50 text-left hover:border-emerald-600 transition-all group"
                   >
                     <p className="text-sm font-bold text-emerald-950 group-hover:text-emerald-700">{item.name}</p>
                     <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.stock} in stock</p>
                   </button>
                 ))}
               </motion.div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Item Name / Search</label>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-700 transition-colors w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Type name (e.g. Coca Cola)..." 
                    className="w-full pl-10 pr-6 py-4 bg-white border border-emerald-50 rounded-2xl focus:ring-2 focus:ring-emerald-900/5 transition-all shadow-sm outline-none font-bold text-emerald-950"
                    value={itemName}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-emerald-50 overflow-hidden z-[60]">
                      {suggestions.map(item => (
                        <button
                          key={item.id}
                          className="w-full px-6 py-3 text-left hover:bg-emerald-50 transition-colors flex justify-between items-center"
                          onClick={() => handleSearch(item.name)}
                        >
                          <span className="font-bold text-emerald-900">{item.name}</span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">{item.category}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {foundItem && (
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest px-2 animate-pulse">✓ Existing Item Found</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Category</label>
                <select 
                  className="w-full py-4 px-6 bg-white border border-emerald-50 rounded-2xl focus:ring-2 focus:ring-emerald-900/5 outline-none font-bold text-emerald-900 appearance-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* 2. Stock Reconciliation (Only if item exists) */}
          {foundItem && (
            <motion.section 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="glass-card rounded-[32px] p-8 border-l-[6px] border-emerald-900 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <History className="w-6 h-6 text-emerald-700" />
                  <h3 className="text-2xl font-bold text-emerald-900">Current Shop Check</h3>
                </div>
                <span className="bg-emerald-900 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">Reconcile Old Stock</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Old Stock Record</p>
                  <div className="p-8 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col justify-center items-center text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-2">System Record</span>
                    <span className="text-5xl font-black text-emerald-900">{existingStock}</span>
                    <span className="text-xs font-bold text-emerald-800/60 uppercase mt-2 tracking-widest">Previous Units</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1 flex justify-between">
                    How many are REMAINING now?
                    <span className="text-slate-400">(Sold = {soldPcs})</span>
                  </label>
                  
                  {/* Quick Buttons */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {quickButtons.map(val => (
                      <button 
                        key={val}
                        onClick={() => setRemainingUnits(val.toString())}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-900 font-bold text-xs hover:bg-emerald-900 hover:text-white transition-all shadow-sm"
                      >
                        {val}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <input 
                      type="number" 
                      value={remainingUnits}
                      onChange={(e) => setRemainingUnits(e.target.value)}
                      className="w-full bg-white border-2 border-emerald-900/10 rounded-2xl py-6 px-6 text-4xl font-bold text-emerald-900 focus:border-emerald-900 transition-all outline-none"
                      placeholder="0"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold uppercase text-[10px] tracking-widest">Bachay Huay</div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* 3. New Purchase Details */}
          <section className="glass-card rounded-[32px] p-8 space-y-8">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-emerald-700" />
              <h3 className="text-2xl font-bold text-emerald-900">New Supply Details</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Quantity (Packs/Crates)</label>
                <input 
                  type="number" 
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  className="w-full bg-emerald-50/30 border-none rounded-2xl py-5 px-6 text-2xl font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-900/5 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Buying Price (PKR/UNIT)</label>
                <input 
                  type="number" 
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full bg-emerald-50/30 border-none rounded-2xl py-5 px-6 text-2xl font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-900/5 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Selling Price (PKR/UNIT)</label>
                <input 
                  type="number" 
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="e.g. 2297"
                  className="w-full bg-emerald-50/30 border-none rounded-2xl py-5 px-6 text-2xl font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-900/5 outline-none"
                />
              </div>
            </div>

            {/* Unit Selector */}
            <div className="pt-6 border-t border-emerald-50">
              <div className="flex items-center gap-3 mb-6">
                <Layers className="w-5 h-5 text-emerald-700" />
                <h4 className="font-bold text-emerald-900 uppercase text-xs tracking-widest">Select Packaging / Unit Size</h4>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6 bg-emerald-50/50 p-1.5 rounded-2xl w-fit">
                {[
                  { id: 'bottles', label: 'Bottles' },
                  { id: 'snacks', label: 'Snacks/Chips' },
                  { id: 'biscuits', label: 'Biscuits' },
                  { id: 'cigarettes', label: 'Cigarettes' },
                  { id: 'velo', label: 'Velo' },
                  { id: 'custom', label: 'Manual' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedUnitCat(cat.id as any)}
                    className={cn(
                      "px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all",
                      selectedUnitCat === cat.id 
                        ? "bg-emerald-900 text-white shadow-lg" 
                        : "text-emerald-900/60 hover:bg-emerald-100"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {selectedUnitCat !== 'custom' ? (
                  unitOptions[selectedUnitCat as keyof typeof unitOptions].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setPcsPerPack(opt.value)}
                      className={cn(
                        "p-4 rounded-2xl border-2 text-left transition-all group",
                        pcsPerPack === opt.value 
                          ? "border-emerald-900 bg-emerald-50 shadow-inner" 
                          : "border-emerald-50 bg-white hover:border-emerald-200"
                      )}
                    >
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">Standard Pack</p>
                      <p className="text-sm font-black text-emerald-950">{opt.label}</p>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full">
                    <div className="max-w-xs space-y-2">
                       <input 
                        type="number" 
                        value={pcsPerPack}
                        onChange={(e) => setPcsPerPack(e.target.value)}
                        className="w-full bg-white border-2 border-emerald-900/10 rounded-2xl py-4 px-6 text-xl font-bold text-emerald-900 focus:border-emerald-900 outline-none"
                        placeholder="Pcs per pack (e.g. 1)"
                      />
                      <p className="text-[10px] font-bold text-slate-400 italic px-1 text-xs">Tip: Use 1 if you are adding loose pieces directly.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 4. Vendor Info */}
          <section className="glass-card rounded-[32px] p-8 space-y-8">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-emerald-700" />
              <h3 className="text-2xl font-bold text-emerald-900">Vendor Info</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Salesman Name" 
                  className="w-full bg-emerald-50/30 border-none rounded-xl py-4 px-5 text-emerald-900 outline-none font-bold" 
                  value={salesmanName}
                  onChange={(e) => setSalesmanName(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Salesman Phone" 
                  className="w-full bg-emerald-50/30 border-none rounded-xl py-4 px-5 text-emerald-900 outline-none font-bold" 
                  value={salesmanPhone}
                  onChange={(e) => setSalesmanPhone(e.target.value)}
                />
              </div>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Order Booker Name" 
                  className="w-full bg-emerald-50/30 border-none rounded-xl py-4 px-5 text-emerald-900 outline-none font-bold" 
                  value={orderBookerName}
                  onChange={(e) => setOrderBookerName(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Order Booker Phone" 
                  className="w-full bg-emerald-50/30 border-none rounded-xl py-4 px-5 text-emerald-900 outline-none font-bold" 
                  value={orderBookerPhone}
                  onChange={(e) => setOrderBookerPhone(e.target.value)}
                />
              </div>
            </div>
          </section>
        </div>

        {/* 5. Summary & Action */}
        <div className="lg:col-span-4 space-y-6">
          <section className="glass-card rounded-[40px] overflow-hidden border-none shadow-2xl backdrop-blur-3xl sticky top-24">
            <div className="bg-emerald-900 p-10 text-white space-y-2">
              <p className="text-[10px] font-bold text-emerald-100/50 uppercase tracking-[0.2em]">Summary Preview</p>
              <h3 className="text-3xl font-black tracking-tight">{itemName || 'New Item'}</h3>
              <p className="text-xs font-bold bg-white/10 w-fit px-3 py-1 rounded-full">{category}</p>
            </div>
            
            <div className="p-8 space-y-6 bg-white/40">
              {foundItem && (
                <div className="p-4 bg-emerald-900/5 rounded-2xl border border-emerald-900/10">
                  <p className="text-[10px] font-bold text-emerald-900 uppercase tracking-widest mb-3">Settling Old Batch</p>
                  <div className="flex justify-between text-sm py-1 font-bold">
                    <span className="text-slate-500">Units Sold:</span>
                    <span className="text-emerald-950">{soldUnitsCount.toFixed(1)} Units</span>
                  </div>
                  {userRole === 'owner' && (
                    <div className="flex justify-between text-sm py-1 border-t border-emerald-100/50 mt-1 font-bold">
                      <span className="text-slate-500">Old Batch Profit:</span>
                      <span className="text-emerald-600">+{((soldUnitsCount * (parseFloat(salePrice) || 0)) - (soldUnitsCount * (foundItem.averageBuy || 0))).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Incoming Stock</p>
                    <p className="text-xl font-black text-emerald-950">
                      +{newQuantity} {parseInt(pcsPerPack) > 1 ? 'Units' : 'Pcs'}
                      <span className="text-[10px] block opacity-50">Total: {totalNewPcs} pcs</span>
                    </p>
                  </div>
                  <div className="w-px h-8 bg-emerald-100" />
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Final stock total</p>
                    <p className="text-xl font-black text-emerald-900">
                      {Math.floor(totalNewStockTotal / parseInt(pcsPerPack || '1'))} Units
                      <span className="text-[10px] block opacity-50">Total {totalNewStockTotal} pcs</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2 py-2">
                   <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                    <span>Buying Cost</span>
                    <span className="text-emerald-950">{purchasePrice || '0'} /Unit</span>
                  </div>
                   <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                    <span>Selling Rate</span>
                    <span className="text-emerald-950">{salePrice || '0'} /Unit</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleFinalize}
                disabled={loading}
                className="w-full bg-emerald-900 text-white rounded-3xl py-6 font-black text-xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl shadow-emerald-950/30 disabled:opacity-50"
              >
                <CheckCircle className="w-8 h-8" />
                {loading ? 'ADDING...' : 'ADD TO STOCK'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
