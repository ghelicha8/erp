import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Check, CreditCard, Package, CalendarClock, ShieldCheck } from 'lucide-react';
import type { Alert } from '../../../store/useAlertStore';

interface ArchivingEnvelopeProps {
  alert: Alert | null;
  onComplete: () => void;
  archiveButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

const CATEGORY_NAMES: Record<string, string> = {
  CHEQUE: 'چک و مالی',
  INVENTORY: 'انبار و متریال',
  CUSTOM: 'یادآور سیستمی',
  PROJECT: 'پروژه و کارگاه',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  CHEQUE: CreditCard,
  INVENTORY: Package,
  CUSTOM: CalendarClock,
  PROJECT: ShieldCheck,
};

export default function ArchivingEnvelope({ alert, onComplete, archiveButtonRef }: ArchivingEnvelopeProps) {
  const [phase, setPhase] = useState<'FOLDING' | 'SEALING' | 'FLYING' | 'ENTERED'>('FOLDING');
  const [targetCoords, setTargetCoords] = useState<{ x: number; y: number }>({ x: 140, y: -320 });
  const isCompletedRef = useRef(false);

  const safeComplete = () => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
    onComplete();
  };

  // محاسبه مختصات دقیق دکمه بایگانی در صفحه برای پرواز مستقیم و پیکسل‌پرفکت
  useEffect(() => {
    if (archiveButtonRef?.current) {
      const rect = archiveButtonRef.current.getBoundingClientRect();
      const btnCenterX = rect.left + rect.width / 2;
      const btnCenterY = rect.top + rect.height / 2;
      const windowCenterX = window.innerWidth / 2;
      const windowCenterY = window.innerHeight / 2;
      setTargetCoords({
        x: btnCenterX - windowCenterX,
        y: btnCenterY - windowCenterY,
      });
    }
  }, [archiveButtonRef]);

  useEffect(() => {
    if (!alert) return;

    // تایمر گارد ۱.۵ ثانیه‌ای قطعی برای جلوگیری از هرگونه فریز یا معلق ماندن صفحه
    const guardTimer = setTimeout(() => {
      safeComplete();
    }, 1500);

    // توالی تک‌مسیره استاندارد:
    // ۱. کارت با scale: 0.9 تا شده و درون پاکت قرار می‌گیرد (۰ تا ۳۰۰ میلی‌ثانیه)
    const t1 = setTimeout(() => setPhase('SEALING'), 300);

    // ۲. درب پاکت بسته شده و مهر قرمز روی درز می‌نشیند (۳۰۰ تا ۵۵۰ میلی‌ثانیه - ۲۵۰ms)
    const t2 = setTimeout(() => setPhase('FLYING'), 550);

    // ۳. پاکت مقیاس خود را کوچک کرده (scale: 0.2) و به سمت دکمه پرواز می‌کند (۵۵۰ تا ۹۵۰ میلی‌ثانیه - ۴۰۰ms)
    const t3 = setTimeout(() => setPhase('ENTERED'), 950);

    // ۴. ورود پاکت به دکمه بایگانی و پایان پروسه (۹۵۰ تا ۱۲۰۰ میلی‌ثانیه - ۲۵۰ms)
    const t4 = setTimeout(() => {
      safeComplete();
    }, 1200);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        safeComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(guardTimer);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [alert]);

  if (!alert) return null;

  const categoryName = CATEGORY_NAMES[alert.category] || 'اعلان عمومی';
  const IconComponent = CATEGORY_ICONS[alert.category] || Mail;

  return (
    <div className="fixed inset-0 z-[99999999] pointer-events-none flex items-center justify-center p-4" dir="rtl">
      {/* پس‌زمینه شیشه‌ای محو با قابلیت کلیک اضطراری برای خروج فوری */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        exit={{ opacity: 0 }}
        onClick={safeComplete}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto cursor-pointer"
        title="کلیک برای رد کردن انیمیشن"
      />

      <div className="relative w-full max-w-lg flex flex-col items-center justify-center perspective-[1200px]">
        
        {/* ۱. کارت اعلان در حال فشرده‌سازی و تا شدن سبک (Folding Card) */}
        <AnimatePresence>
          {phase === 'FOLDING' && (
            <motion.div
              initial={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
              animate={{
                opacity: 0.9,
                scale: 0.9,
                rotateX: 45,
                y: 40,
                scaleY: 0.55,
              }}
              exit={{ opacity: 0, scale: 0.6, y: 55 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="w-full bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-indigo-500/30 overflow-hidden transform-origin-bottom"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <IconComponent className="w-5 h-5" />
                </span>
                <span className="text-sm font-black text-slate-800 dark:text-white truncate">
                  {alert.title}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                {alert.description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ۲. پاکت نامه شیشه‌ای لوکس و پرواز به هدف دکمه بایگانی */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={
            phase === 'FLYING' || phase === 'ENTERED'
              ? {
                  opacity: phase === 'ENTERED' ? 0 : [1, 0.85, 0.2],
                  scale: [1, 0.45, 0.2],
                  x: targetCoords.x,
                  y: targetCoords.y,
                  rotate: [0, -6, -14],
                  transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] },
                }
              : {
                  opacity: 1,
                  scale: 1,
                  x: 0,
                  y: 0,
                  rotate: 0,
                  transition: { type: 'spring', stiffness: 450, damping: 26 },
                }
          }
          className="relative w-84 sm:w-96 h-56 sm:h-64 rounded-3xl overflow-visible shadow-[0_25px_60px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]"
        >
          {/* بدنه اصلی پاکت نامه (Envelope Base) */}
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200 dark:border-indigo-500/30 shadow-xl overflow-hidden flex flex-col justify-end p-6">
            
            {/* بافت نوری ظریف روی بدنه پاکت */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
            
            {/* شیار داخلی پاکت که نامه داخلش سر می‌خورد */}
            <div className="relative z-10 flex items-center justify-between border-t border-slate-200/80 dark:border-white/10 pt-4 text-slate-700 dark:text-white/80">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-black tracking-wide text-slate-800 dark:text-indigo-200">بایگانی هوشمند پیمان ERP</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-white/40">{alert.date}</span>
            </div>
          </div>

          {/* محتوای در حال لغزش به درون پاکت نامه */}
          <AnimatePresence>
            {phase === 'FOLDING' && (
              <motion.div
                initial={{ y: -40, opacity: 0.8, scale: 0.7 }}
                animate={{ y: 14, opacity: 0.4, scale: 0.65 }}
                transition={{ duration: 0.28, ease: 'easeInOut' }}
                className="absolute inset-x-8 top-4 h-28 bg-white/90 dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-white/20 p-4 z-0 pointer-events-none"
              >
                <div className="h-2 w-24 bg-indigo-500/40 rounded mb-2" />
                <div className="h-2 w-40 bg-slate-300 dark:bg-slate-600 rounded" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* درب بالایی پاکت نامه (Top Flap with 3D Fold) */}
          <motion.div
            initial={{ rotateX: 0 }}
            animate={
              phase === 'SEALING' || phase === 'FLYING' || phase === 'ENTERED'
                ? { rotateX: 180 }
                : { rotateX: 0 }
            }
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d' }}
            className="absolute inset-x-0 top-0 h-28 sm:h-32 z-20 pointer-events-none"
          >
            {/* شکل مثلثی درپوش پاکت */}
            <div className="w-full h-full bg-gradient-to-b from-slate-100 to-white dark:from-indigo-700/90 dark:to-indigo-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-indigo-400/40 shadow-md [clip-path:polygon(0_0,100%_0,50%_100%)] flex items-start justify-center pt-2" />
          </motion.div>

          {/* ۳. مهر مومی گرافیکی شاهانه و برچسب بایگانی (Wax Stamp) */}
          <AnimatePresence>
            {(phase === 'SEALING' || phase === 'FLYING' || phase === 'ENTERED') && (
              <motion.div
                initial={{ scale: 2.2, opacity: 0, rotate: -25 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none"
              >
                {/* مدال مهر زرشکی سلطنتی */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-rose-600 via-rose-700 to-amber-900 shadow-[0_10px_25px_rgba(225,29,72,0.45)] border-2 border-amber-300/80 flex flex-col items-center justify-center text-white p-1">
                  <div className="w-full h-full rounded-full border border-dashed border-amber-200/60 flex flex-col items-center justify-center gap-0.5">
                    <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200 drop-shadow" />
                    <span className="text-[8.5px] sm:text-[9px] font-black tracking-tight text-amber-100 text-center px-1 truncate max-w-[65px]">
                      {categoryName}
                    </span>
                  </div>
                </div>

                {/* ریبون تگ کوچک زیر مهر */}
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 px-3 py-0.5 bg-amber-400 text-slate-950 font-black text-[9px] rounded-full shadow-md border border-amber-200 flex items-center gap-1"
                >
                  <Check className="w-3 h-3 text-slate-950" />
                  بایگانی شد
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>

        {/* متن وضعیت انیمیشن */}
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 text-xs font-bold text-slate-700 dark:text-white/90 bg-white/90 dark:bg-slate-900/90 px-4 py-1.5 rounded-full border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-lg pointer-events-none"
        >
          {phase === 'FOLDING' && 'در حال قرارگیری کارت در پاکت نامه...'}
          {phase === 'SEALING' && `بستن پاکت و مهر دسته‌بندی «${categoryName}»...`}
          {(phase === 'FLYING' || phase === 'ENTERED') && 'پرواز به مخزن بایگانی...'}
        </motion.span>

      </div>
    </div>
  );
}
