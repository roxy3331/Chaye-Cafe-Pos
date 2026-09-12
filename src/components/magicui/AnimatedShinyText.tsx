import React from 'react';
import { cn } from '../../lib/utils';

interface AnimatedShinyTextProps {
  children: React.ReactNode;
  className?: string;
  shimmerWidth?: number;
}

export const AnimatedShinyText: React.FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 100,
}) => {
  return (
    <span
      style={{ '--shimmer-width': `${shimmerWidth}px` } as React.CSSProperties}
      className={cn(
        'shiny-text-anim',
        'animate-shiny-text bg-clip-text bg-no-repeat [background-position:0_0]',
        'bg-[length:var(--shimmer-width)_100%]',
        'inline-block',
        className
      )}
    >
      {children}
    </span>
  );
};
