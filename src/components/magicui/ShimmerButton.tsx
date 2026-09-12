import React from 'react';
import { cn } from '../../lib/utils';

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = 'rgba(255,255,255,0.4)',
      shimmerSize = '0.1em',
      shimmerDuration = '1.6s',
      borderRadius = '14px',
      background = 'rgba(15, 118, 110, 1)',
      className,
      children,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        style={
          {
            '--shimmer-color': shimmerColor,
            '--shimmer-size': shimmerSize,
            '--shimmer-duration': shimmerDuration,
            '--border-radius': borderRadius,
            '--background': background,
          } as React.CSSProperties
        }
        className={cn(
          'shimmer-button relative cursor-pointer overflow-hidden whitespace-nowrap',
          'flex items-center justify-center gap-2',
          'transition-all duration-200 active:scale-[0.97]',
          className
        )}
        {...rest}
      >
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </button>
    );
  }
);
ShimmerButton.displayName = 'ShimmerButton';
