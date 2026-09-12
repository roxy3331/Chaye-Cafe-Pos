import React from 'react';

const STORAGE_KEY = 'chaye:profitHidden';

interface ProfitVisibilityContextType {
  isProfitHidden: boolean;
  toggleProfitHidden: () => void;
  // '****' when hidden, else 'Rs 1,234' — signed variant keeps +/- on visible values
  formatProfit: (value: number, signed?: boolean) => string;
}

const ProfitVisibilityContext = React.createContext<ProfitVisibilityContextType | undefined>(undefined);

export const ProfitVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isProfitHidden, setIsProfitHidden] = React.useState<boolean>(() => {
    try { return window.localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });

  const toggleProfitHidden = () => {
    setIsProfitHidden(prev => {
      const next = !prev;
      try { window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  const formatProfit = (value: number, signed?: boolean): string => {
    if (isProfitHidden) return '****';
    const rounded = Math.round(Math.abs(value)).toLocaleString();
    if (signed && value < 0) return `− Rs ${rounded}`;
    return `${signed && value > 0 ? '+ ' : ''}Rs ${rounded}`;
  };

  return (
    <ProfitVisibilityContext.Provider value={{ isProfitHidden, toggleProfitHidden, formatProfit }}>
      {children}
    </ProfitVisibilityContext.Provider>
  );
};

export const useProfitVisibility = () => {
  const context = React.useContext(ProfitVisibilityContext);
  if (!context) throw new Error('useProfitVisibility must be used within a ProfitVisibilityProvider');
  return context;
};
