import React from 'react';
import { motion, useInView } from 'motion/react';
import { cn } from '../../lib/utils';

interface FlipInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export const FlipIn: React.FC<FlipInProps> = ({
  children,
  className,
  delay = 0,
  duration = 0.55,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -30px 0px' });

  return (
    <div ref={ref} style={{ perspective: '800px' }} className={cn('w-full', className)}>
      <motion.div
        initial={{ rotateX: 12, opacity: 0, y: 10 }}
        animate={inView ? { rotateX: 0, opacity: 1, y: 0 } : {}}
        transition={{
          duration,
          delay,
          type: 'spring',
          stiffness: 130,
          damping: 16,
        }}
        style={{ transformOrigin: 'top center' }}
      >
        {children}
      </motion.div>
    </div>
  );
};
