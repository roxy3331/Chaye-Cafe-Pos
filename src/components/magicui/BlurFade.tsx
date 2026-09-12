import React from 'react';
import { motion, useInView } from 'motion/react';
import { cn } from '../../lib/utils';

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  yOffset?: number;
  blur?: string;
  inView?: boolean;
}

export const BlurFade: React.FC<BlurFadeProps> = ({
  children,
  className,
  duration = 0.35,
  delay = 0,
  yOffset = 10,
  blur = '8px',
  inView: inViewProp = false,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inViewResult = useInView(ref, { once: true, margin: '0px 0px -20px 0px' });
  const isVisible = inViewProp || inViewResult;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset, filter: `blur(${blur})` }}
      animate={isVisible ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
};
