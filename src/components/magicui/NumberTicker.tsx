import React from 'react';
import { useInView, useMotionValue, useSpring, motion } from 'motion/react';

interface NumberTickerProps {
  value: number;
  decimalPlaces?: number;
  className?: string;
  prefix?: string;
}

export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  decimalPlaces = 0,
  className = '',
  prefix = '',
}) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });

  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { stiffness: 90, damping: 22, mass: 0.8 });

  React.useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  // Write the animated value straight to the DOM instead of via React state.
  // Animating 7–10 tickers together previously caused one React re-render per frame.
  React.useEffect(() => {
    const format = (v: number) => decimalPlaces > 0
      ? v.toFixed(decimalPlaces)
      : Math.floor(v).toLocaleString();
    const unsub = springVal.on('change', (v) => {
      if (ref.current) ref.current.textContent = `${prefix}${format(v)}`;
    });
    return unsub;
  }, [springVal, decimalPlaces, prefix]);

  return (
    <motion.span ref={ref} className={className}>
      {prefix}0
    </motion.span>
  );
};
