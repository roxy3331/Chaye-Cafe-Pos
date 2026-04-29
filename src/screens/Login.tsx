import React from 'react';
import { Coffee, Lock, User, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (role: 'owner' | 'employee') => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock authentication
    setTimeout(() => {
      const lowerUser = username.toLowerCase();
      if ((lowerUser === 'owner' || lowerUser === 'employee') && password === '123') {
        onLogin(lowerUser as 'owner' | 'employee');
      } else {
        alert('Invalid Credentials! Use "owner" or "employee" as username and "123" as password.');
      }
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-emerald-50/50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[48px] p-10 shadow-2xl shadow-emerald-900/10 border border-white"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-emerald-900 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-900/20">
            <Coffee className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-emerald-900 tracking-tight">CHAYE CAFE</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Inventory Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">User Identity</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Username (e.g. owner)" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-emerald-50/50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-900/10 outline-none font-medium transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Access Key</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="password" 
                placeholder="********" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-emerald-50/50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-900/10 outline-none font-medium transition-all"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-emerald-900/20 mt-4 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Unlock System
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-10">
          Private access only. Technical support: <span className="text-emerald-900 font-bold">@IMS_SUPPORT</span>
        </p>
      </motion.div>
    </div>
  );
};
