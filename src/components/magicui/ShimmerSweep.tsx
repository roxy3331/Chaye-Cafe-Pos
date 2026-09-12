import React from 'react';
import { cn } from '../../lib/utils';

// Inject the keyframes once into the document (not per-instance).
// Previously every ShimmerSweep re-rendered a duplicate <style> tag into the DOM.
let keyframesInjected = false;
function ensureKeyframesInjected() {
  if (keyframesInjected || typeof document === 'undefined') return;
  keyframesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer-sweep {
      from { transform: translateX(-100%); }
      to   { transform: translateX(200%); }
    }
  `;
  document.head.appendChild(style);
}

interface ShimmerSweepProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const ShimmerSweep: React.FC<ShimmerSweepProps> = ({
  children,
  className,
  delay = 0,
}) => {
  const [swept, setSwept] = React.useState(false);

  React.useEffect(() => {
    ensureKeyframesInjected();
    const t = setTimeout(() => setSwept(true), delay * 1000);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {children}
      {swept && (
        <div
          className="pointer-events-none absolute inset-0 -translate-x-full"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%)',
            animation: 'shimmer-sweep 0.65s ease-out forwards',
          }}
        />
      )}
    </div>
  );
};
