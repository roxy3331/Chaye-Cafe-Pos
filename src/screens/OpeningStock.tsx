import React from 'react';
import { Package, Search, PlusCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';

export const OpeningStock: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [existingItems, setExistingItems] = React.useState<any[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedItem, setSelectedItem] = React.useState<any | null>(null);
  const [qty, setQty] = React.useState('1');
  const [category, setCategory] = React.useState('🏷️ Other');
  const [pcsPerPack, setPcsPerPack] = React.useState('1');

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

  React.useEffect(() => {
    dataService.getStock().then(data => setExistingItems(data || []));
  }, []);

  const suggestions = searchTerm 
    ? existingItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5)
    : [];

  const handleSelect = (item: any) => {
    setSelectedItem(item);
    setSearchTerm(item.name);
    setCategory(item.category || '🏷️ Other');
    setPcsPerPack(item.pcsPerPack?.toString() || '1');
  };

  const handleSave = async () => {
    if (!searchTerm || !qty) {
      showToast('Please enter Item Name and Quantity', 'warning');
      return;
    }

    setLoading(true);
    try {
      const sanitizedQty = parseInt(qty || '0') || 0;
      const sanitizedPcsPerPack = parseInt(pcsPerPack || '0') || 1;
      
      await dataService.addOpeningStock({
        itemName: searchTerm.trim(),
        qty: sanitizedQty * sanitizedPcsPerPack,
        category,
        pcsPerPack: sanitizedPcsPerPack,
        type: 'opening'
      });
      showToast('Opening stock added!', 'success');
      navigate('/stock');
    } catch (e) {
      showToast('Failed to add opening stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 rounded-2xl bg-white border border-emerald-50 text-emerald-900 hover:bg-emerald-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-4xl font-bold text-emerald-900 tracking-tight">Opening Stock</h1>
          <p className="text-slate-500">Initial setup for your existing inventory.</p>
        </div>
      </header>

      <div className="glass-card rounded-[40px] p-8 md:p-12 space-y-10">
        <div className="space-y-6">
          {/* Item Name */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Item Name</label>
            <div className="relative">
              <Package className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Product name (e.g. Coca Cola 1.5L)" 
                className="w-full pl-14 pr-6 py-5 bg-emerald-50/30 border border-emerald-100 rounded-[24px] focus:ring-4 focus:ring-emerald-900/5 transition-all outline-none font-bold text-emerald-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-emerald-50 overflow-hidden z-50">
                  {suggestions.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="w-full px-6 py-4 text-left hover:bg-emerald-50 flex items-center justify-between border-b border-emerald-50 last:border-0"
                    >
                      <span className="font-bold text-emerald-900">{item.name}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">{item.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Qty & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
              <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">How many Boxes/Packs?</label>
              <input 
                type="number" 
                className="w-full px-6 py-5 bg-emerald-50/30 border border-emerald-100 rounded-[24px] focus:ring-4 focus:ring-emerald-900/5 transition-all outline-none font-bold text-emerald-900"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Category</label>
              <select 
                className="w-full px-6 py-5 bg-emerald-50/30 border border-emerald-100 rounded-[24px] focus:ring-4 focus:ring-emerald-900/5 outline-none font-bold text-emerald-900 appearance-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-1">Pieces per Pack (Bundle Size)</label>
            <input 
              type="number" 
              className="w-full px-6 py-5 bg-emerald-50/30 border border-emerald-100 rounded-[24px] focus:ring-4 focus:ring-emerald-900/5 transition-all outline-none font-bold text-emerald-900 text-center"
              value={pcsPerPack}
              onChange={(e) => setPcsPerPack(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">Total units to be added: <span className="text-emerald-600">{(parseInt(qty || '0') * parseInt(pcsPerPack || '0'))} pieces</span></p>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-emerald-900 text-white py-6 rounded-[28px] font-bold shadow-2xl shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:active:scale-100"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <PlusCircle className="w-6 h-6" />
              Add Opening Stock
            </>
          )}
        </button>
      </div>
    </div>
  );
};
