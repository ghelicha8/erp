import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalTooltip() {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let autoExpireTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (autoExpireTimer) {
        clearTimeout(autoExpireTimer);
        autoExpireTimer = null;
      }
    };

    const immediateDismiss = () => {
      clearTimers();
      setTooltip(null);
      activeElementRef.current = null;
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // بررسی المان تارگت یا نزدیک‌ترین والد دارای صفت title و حذف فوری صفت عنوان پیش‌فرض مرورگر
      const elementWithTitle = target.hasAttribute('title') 
        ? target 
        : (target.closest?.('[title]') as HTMLElement | null);

      if (elementWithTitle) {
        const rawTitle = elementWithTitle.getAttribute('title');
        if (rawTitle && rawTitle.trim()) {
          elementWithTitle.setAttribute('data-custom-tooltip', rawTitle.trim());
        }
        elementWithTitle.removeAttribute('title'); // جلوگیری قطعی از تولتیپ پیش‌فرض مرورگر
      }

      const tooltipElement = (target.getAttribute('data-custom-tooltip') || target.getAttribute('data-tooltip'))
        ? target
        : (target.closest?.('[data-custom-tooltip], [data-tooltip]') as HTMLElement | null);

      if (tooltipElement) {
        const text = tooltipElement.getAttribute('data-custom-tooltip') || tooltipElement.getAttribute('data-tooltip');

        if (text && text.trim()) {
          clearTimers();
          activeElementRef.current = tooltipElement;
          const rect = tooltipElement.getBoundingClientRect();
          setTooltip({ 
            text: text.trim(), 
            x: Math.max(16, Math.min(window.innerWidth - 16, rect.left + rect.width / 2)), 
            y: Math.max(8, rect.top - 8) 
          });

          // انقضای خودکار نهایی حداکثر ۲.۵ ثانیه
          autoExpireTimer = setTimeout(() => {
            immediateDismiss();
          }, 2500);
          return;
        }
      }

      // خروج از روی المنت
      immediateDismiss();
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement;
      if (!related || (!related.hasAttribute('data-custom-tooltip') && !related.hasAttribute('data-tooltip') && !related.closest?.('[data-custom-tooltip], [data-tooltip]'))) {
        immediateDismiss();
      }
    };

    // پاکسازی هرگونه تولتیپ سرگردان قبلی از روی DOM
    document.querySelectorAll('.global-raw-tooltip').forEach(el => el.remove());

    // لیسنرهای فراگیر اجباری برای حذف فوری تولتیپ از DOM در هر رویداد تعاملی
    document.addEventListener('mouseover', handleMouseOver, { capture: true });
    document.addEventListener('mouseout', handleMouseOut, { capture: true });
    document.addEventListener('pointerleave', immediateDismiss, true);
    document.addEventListener('mouseleave', immediateDismiss, true);
    document.addEventListener('click', immediateDismiss, true);
    document.addEventListener('mousedown', immediateDismiss, true);
    document.addEventListener('mouseup', immediateDismiss, true);
    document.addEventListener('blur', immediateDismiss, true);
    window.addEventListener('scroll', immediateDismiss, true);
    window.addEventListener('resize', immediateDismiss, true);

    return () => {
      clearTimers();
      document.removeEventListener('mouseover', handleMouseOver, { capture: true });
      document.removeEventListener('mouseout', handleMouseOut, { capture: true });
      document.removeEventListener('pointerleave', immediateDismiss, true);
      document.removeEventListener('mouseleave', immediateDismiss, true);
      document.removeEventListener('click', immediateDismiss, true);
      document.removeEventListener('mousedown', immediateDismiss, true);
      document.removeEventListener('mouseup', immediateDismiss, true);
      document.removeEventListener('blur', immediateDismiss, true);
      window.removeEventListener('scroll', immediateDismiss, true);
      window.removeEventListener('resize', immediateDismiss, true);
    };
  }, []);

  if (!tooltip) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div 
        key={tooltip.text + tooltip.x + tooltip.y}
        initial={{ opacity: 0, y: 4, scale: 0.92 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.92 }} 
        transition={{ duration: 0.12, ease: 'easeOut' }} 
        style={{ 
          top: tooltip.y, 
          left: tooltip.x, 
          position: 'fixed', 
          transform: 'translate(-50%, -100%)', 
          zIndex: 99999999, 
          pointerEvents: 'none' 
        }}
      >
        <div className="bg-slate-900/95 dark:bg-white/95 backdrop-blur-xl text-white dark:text-slate-900 text-[11px] font-black px-3 py-1.5 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] border border-white/20 dark:border-slate-800/20 whitespace-nowrap select-none">
          {tooltip.text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-slate-900/95 dark:border-t-white/95" />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}