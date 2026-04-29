import React from 'react';
import { Smartphone, Apple, ShieldCheck, CloudOff, RefreshCw, Smartphone as Android, History, Smartphone as iOS, Settings as SettingsIcon, Package, Check, Smartphone as Phone } from 'lucide-react';
import { cn } from '../lib/utils';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-12 pb-32 animate-in fade-in duration-700">
      <header>
        <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.2em] mb-2">PWA INSTALLATION</p>
        <h1 className="text-4xl font-bold text-emerald-900">Install CHAYE CAFE IMS</h1>
        <p className="text-slate-500 mt-2">Get the inventory manager on your phone without app store hassle.</p>
      </header>

      {/* Benefits Bento */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-10 rounded-3xl flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-emerald-900 rounded-3xl flex items-center justify-center shadow-2xl text-white mb-6">
            <Package className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-bold text-emerald-900">CHAYE CAFE</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Inventory Management System</p>
          <button className="mt-8 w-full bg-emerald-900 text-white py-4 rounded-xl font-bold active:scale-95 transition-all">
            Copy App Link
          </button>
        </div>

        <div className="glass-card p-10 rounded-3xl space-y-8">
          <h3 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Benefits
          </h3>
          <BenefitItem icon={<CloudOff />} title="Works offline" desc="Access ledger data even without internet." />
          <BenefitItem icon={<RefreshCw />} title="Instant updates" desc="Always run the latest business tools." />
        </div>
      </section>

      {/* Guides */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GuideCard 
          icon={<Android className="text-emerald-700" />} 
          title="Android Guide" 
          steps={[
            "Open Chrome and navigate to this page.",
            "Tap the three dots menu in the top right.",
            "Select Add to Home screen from the list."
          ]}
        />
        <GuideCard 
          icon={<iOS className="text-emerald-500" />} 
          title="iOS Guide" 
          steps={[
            "Open Safari and visit this URL.",
            "Tap the Share icon (square with arrow).",
            "Scroll down and tap Add to Home Screen."
          ]}
        />
      </section>
      
      {/* App Config Preview Section */}
      <section className="space-y-6 pt-12 border-t border-emerald-100">
        <div>
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.2em] mb-2">BUILD ENVIRONMENT</p>
          <h2 className="text-3xl font-bold text-emerald-900">APK Configuration</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Icon Preview</p>
            <div className="w-32 h-32 bg-emerald-900 rounded-3xl mx-auto flex items-center justify-center text-white">
              <Package className="w-16 h-16" />
            </div>
            <button className="w-full text-sm font-bold text-emerald-700">Replace Icon</button>
          </div>
          
          <div className="md:col-span-2 glass-card p-6 rounded-3xl space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-bold flex items-center gap-2"><SettingsIcon className="w-5 h-5" /> Config</h4>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">STABLE</span>
            </div>
            <div className="space-y-4">
              <ToggleRow icon={<RefreshCw />} label="Real-time Sync" desc="Background worker enabled" checked />
              <ToggleRow icon={<CloudOff />} label="Offline Mode" desc="Persistent local storage" checked />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const BenefitItem = ({ icon, title, desc }: any) => (
  <div className="flex gap-4">
    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
      {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
    </div>
    <div>
      <p className="font-bold text-emerald-900 leading-none mb-1">{title}</p>
      <p className="text-sm text-slate-400 leading-tight">{desc}</p>
    </div>
  </div>
);

const GuideCard = ({ icon, title, steps }: any) => (
  <div className="glass-card p-10 rounded-3xl border-l-[6px] border-emerald-900 shadow-xl">
    <div className="flex items-center gap-3 mb-8">
      {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      <h3 className="text-2xl font-bold text-emerald-900">{title}</h3>
    </div>
    <div className="space-y-6 text-sm font-medium">
      {steps.map((step: string, i: number) => (
        <div key={i} className="flex gap-4">
          <span className="w-6 h-6 rounded-full bg-emerald-900 text-white flex items-center justify-center text-xs shrink-0">{i+1}</span>
          <p className="text-emerald-950 leading-relaxed">{step}</p>
        </div>
      ))}
    </div>
  </div>
);

const ToggleRow = ({ icon, label, desc, checked }: any) => (
  <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white border border-emerald-50 flex items-center justify-center text-emerald-900">
        {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      </div>
      <div>
        <p className="font-bold text-emerald-900 leading-none mb-1">{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
    </div>
    <div className={cn("w-11 h-6 rounded-full p-1 transition-all", checked ? "bg-emerald-900" : "bg-slate-200")}>
      <div className={cn("w-4 h-4 bg-white rounded-full transition-all", checked ? "translate-x-5" : "translate-x-0")} />
    </div>
  </div>
);
