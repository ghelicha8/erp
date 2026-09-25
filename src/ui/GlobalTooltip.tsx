import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalTooltip() {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tooltipElement = target.closest('[data-tooltip]') as HTMLElement;
      if (tooltipElement) {
        const text = tooltipElement.getAttribute('data-tooltip');
        if (text) {
          const rect = tooltipElement.getBoundingClientRect();
          setTooltip({ text, x: rect.left + rect.width / 2, y: rect.top - 8 });
        }
      } else { setTooltip(null); }
    };
    const handleMouseOut = () => setTooltip(null);

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    return () => { document.removeEventListener('mouseover', handleMouseOver); document.removeEventListener('mouseout', handleMouseOut); };
  }, []);

  if (!tooltip) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 5, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }} style={{ top: tooltip.y, left: tooltip.x, position: 'fixed', transform: 'translate(-50%, -100%)', zIndex: 9999999, pointerEvents: 'none' }}>
        <div className="bg-slate-800/95 dark:bg-white/95 backdrop-blur-md text-white dark:text-slate-800 text-[11px] font-black px-3 py-2 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] whitespace-nowrap">
          {tooltip.text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800/95 dark:border-t-white/95" />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}GlobalTooltip.tsx