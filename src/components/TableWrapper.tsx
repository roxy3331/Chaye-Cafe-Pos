import React from 'react';
import { cn } from '../lib/utils';

// Horizontal-scroll wrapper for wide tables — table keeps natural width via
// min-w-max, container scrolls left/right on mobile and PC.
export const TableWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('w-full overflow-x-auto', className)}>
    <div className="min-w-max">{children}</div>
  </div>
);
