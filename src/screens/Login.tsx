import React from 'react';
import { Package, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Meteors, ShimmerButton } from '../components/magicui';

interface LoginProps {
  onLogin: (role: 'owner' | 'employee') => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const lowerUser = username.toLowerCase().trim();
      // SECURITY WARNING: Hardcoded credentials should be replaced with proper authentication
      if ((lowerUser === 'owner' || lowerUser === 'employee') && password === '123') {
        console.warn('Using hardcoded credentials - consider implementing proper authentication');
        // 1. Sign in to Firebase Auth
        let userCred;
        try {
          userCred = await signInAnonymously(auth);
        } catch (authErr: any) {
          if (authErr.code === 'auth/admin-restricted-operation') {
            throw new Error("ERROR: Anonymous Sign-in is disabled. Please enable it in Firebase Console (Authentication > Sign-in method).");
          }
          throw authErr;
        }
        
        // 2. Ensure user document or update role
        const userRef = doc(db, 'users', userCred.user.uid);
        await setDoc(userRef, {
          role: lowerUser,
          username: username,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        onLogin(lowerUser as 'owner' | 'employee');
      } else {
        setError('Invalid Credentials! Use "owner" or "employee" as username and "123" as password.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'System connection error. Please check your internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-emerald-950">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-md w-full bg-white rounded-[48px] p-10 shadow-2xl shadow-emerald-900/30 border border-emerald-900/10 overflow-hidden"
      >
        <Meteors number={10} />

        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-emerald-900 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-900/20">
                <Package className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-emerald-900 tracking-tight">SHOP HISAB</h1>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Purchase · Stock · Profit Management</p>
            </div>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-600 leading-relaxed">{error}</p>
              </div>
            )}

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.12 }}>
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
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.2 }}>
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
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.28 }}>
              <ShimmerButton
                type="submit"
                disabled={loading}
                background="rgba(2,44,34,1)"
                borderRadius="16px"
                className="w-full py-5 text-white font-bold text-lg mt-4 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Unlock System
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </ShimmerButton>
            </motion.div>
          </form>

          <p className="text-center text-xs text-slate-400 mt-10">
            Private access only. Technical support: <span className="text-emerald-900 font-bold">@IMS_SUPPORT</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
