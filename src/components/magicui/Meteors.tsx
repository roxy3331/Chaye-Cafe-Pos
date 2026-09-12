import React from 'react';
import { cn } from '../../lib/utils';

interface MeteorsProps {
  number?: number;
  className?: string;
}

export const Meteors: React.FC<MeteorsProps> = ({ number = 12, className }) => {
  const meteors = Array.from({ length: number }, (_, i) => ({
    id: i,
    left: `${Math.floor(Math.random() * 100)}%`,
    delay: `${(Math.random() * 2).toFixed(2)}s`,
    duration: `${(Math.random() * 4 + 4).toFixed(2)}s`,
  }));

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]', className)}>
      {meteors.map((m) => (
        <span
          key={m.id}
          style={{
            left: m.left,
            top: '-5%',
            animationDelay: m.delay,
            animationDuration: m.duration,
          }}
          className={cn(
            'meteor-effect absolute h-px w-24 rotate-[215deg]',
            'bg-gradient-to-r from-white/60 via-white/30 to-transparent',
            'animate-meteor rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.1)]'
          )}
        >
          <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-[1px] w-8 bg-gradient-to-r from-white/0 via-white/40 to-white/0" />
        </span>
      ))}
    </div>
  );
};
