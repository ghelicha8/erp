import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, Search, Check, CheckCircle, Trash2, CalendarDays, Calendar, X } from 'lucide-react';
import moment from 'moment-jalaali';
import DatePickerPkg from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

const DatePicker = (DatePickerPkg as any).default || DatePickerPkg;

// ==========================================
// 1. اسکرول‌بارهای شیشه‌ای و انیمیشنی
// ==========================================
export const GlassScrollStyles = () => (
  <style>{`
    .glass-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .glass-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }
    .glass-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 10px; transition: background 0.3s ease; }
    .glass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.8); }
    .dark .glass-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
    .dark .glass-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.4); }
    .dark .glass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.8); }
    
    .modal-scrollbar::-webkit-scrollbar { width: 4px; }
    .modal-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .modal-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 10px; }
    .modal-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.6); }
  `}</style>
);

// ==========================================
// 2. جستجوی نئونی و پالس‌دار (چرخان نمایان)
// ==========================================
export const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-2xl group bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 backdrop-blur-md overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md ${className}`}>
    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite]" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

// ==========================================
// 3. کادر ورودی شیشه‌ای با افکت Focus
// ==========================================
export const GlassInputWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 shadow-sm focus-within:border-indigo-500/60 focus-within:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all duration-300 overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-600/50 ${className}`}>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center">{children}</div>
  </div>
);

// ==========================================
// 4. چک‌باکس‌های انیمیشنی داینامیک
// ==========================================
export const AnimatedCheckbox = ({ checked, onChange, theme = 'amber' }: { checked: boolean, onChange: () => void, theme?: 'amber' | 'emerald' | 'indigo' | 'rose' }) => {
  const themes = {
    indigo: { active: 'bg-gradient-to-tr from-indigo-500 to-purple-500 border-indigo-400', hover: 'hover:border-indigo-400 text-indigo-500' },
    emerald: { active: 'bg-gradient-to-tr from-emerald-500 to-teal-500 border-teal-400', hover: 'hover:border-emerald-400 text-emerald-500' },
    amber: { active: 'bg-gradient-to-tr from-amber-500 to-orange-500 border-orange-400', hover: 'hover:border-amber-400 text-amber-500' },
    rose: { active: 'bg-gradient-to-tr from-rose-500 to-pink-500 border-pink-400', hover: 'hover:border-rose-400 text-rose-500' },
  };
  const currentTheme = themes[theme] || themes.indigo;

  return (
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`w-6 h-6 mx-auto rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all duration-300 ${
        checked ? `${currentTheme.active} scale-105 shadow-md` : `bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 ${currentTheme.hover}`
      }`}
    >
      <AnimatePresence>
        {checked && (
          <motion.div key="check-icon" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
            <CheckCircle className="w-4 h-4 text-white stroke-[3]" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ==========================================
// 5. سوییچ‌های درخشان (Glow Switch)
// ==========================================
export const GlowSwitch = ({ checked, onChange, label, sublabel, theme = 'indigo' }: any) => {
  const colors: any = {
    indigo: { border: 'border-indigo-400', bg: 'bg-indigo-50/80 dark:bg-indigo-900/30', thumb: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-300', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.4)]' },
    blue: { border: 'border-blue-400', bg: 'bg-blue-50/80 dark:bg-blue-900/30', thumb: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]' },
    rose: { border: 'border-rose-400', bg: 'bg-rose-50/80 dark:bg-rose-900/30', thumb: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.4)]' },
    emerald: { border: 'border-emerald-400', bg: 'bg-emerald-50/80 dark:bg-emerald-900/30', thumb: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]' }
  }[theme] || { border: 'border-indigo-400', bg: 'bg-indigo-50/80 dark:bg-indigo-900/30', thumb: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-300', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.4)]' };

  return (
    <div onClick={() => onChange(!checked)} className={`flex items-center gap-3 cursor-pointer p-3 rounded-2xl border transition-all duration-300 ${checked ? `${colors.border} ${colors.bg}${colors.glow}` : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'}`}>
      <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 shadow-inner shrink-0 ${checked ? colors.thumb : 'bg-slate-300 dark:bg-slate-600'}`}>
         <motion.div animate={{ x: checked ? -20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow-md flex items-center justify-center">
            {checked && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`w-1.5 h-1.5 rounded-full ${colors.thumb}`} />}
         </motion.div>
      </div>
      <div className="flex flex-col">
        <span className={`text-[11px] font-black transition-colors ${checked ? colors.text : 'text-slate-700 dark:text-slate-300'}`}>{label}</span>
        {sublabel && <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{sublabel}</span>}
      </div>
    </div>
  );
};

// ==========================================
// 6. لیست کشویی انیمیشنی
// ==========================================
export const PortalSelect = ({ value, onChange, options, placeholder, icon: MainIcon, searchable = false, className = '', disabled = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const safeOptions = Array.isArray(options) ? options : [];
  const selected = safeOptions.find((o:any) => o.id === value || o.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return safeOptions;
    return safeOptions.filter((o:any) => o.label?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [safeOptions, searchTerm]);

  const openDropdown = () => {
    if (disabled) return;
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const popupHeight = 288; // Approximate max height (max-h-72)
      
      // سیستم هوشمند تشخیص برخورد با پایین صفحه
      let topPos = rect.bottom + 8;
      if (topPos + popupHeight > window.innerHeight) {
        topPos = rect.top - popupHeight - 8;
      }
      
      setCoords({ top: topPos, left: rect.left, width: rect.width });
      setIsOpen(true);
    }
  };

  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return; 
      setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    }
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  return (
    <>
      <button type="button" ref={btnRef} onClick={() => isOpen ? setIsOpen(false) : openDropdown()} disabled={disabled} 
        className={`w-full h-full min-h-[42px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 flex justify-between items-center outline-none transition-all shadow-inner hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 group ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      >
        <div className="flex items-center gap-2 truncate text-right flex-1">
           {MainIcon && <MainIcon className="w-4 h-4 shrink-0 text-indigo-500 group-hover:text-indigo-600" />}
           {!MainIcon && selected?.icon && <selected.icon className="w-4 h-4 shrink-0 text-indigo-500" />}
           <span className="truncate text-xs font-bold pt-0.5 text-slate-700 dark:text-slate-200">
             {selected ? selected.label : placeholder}
           </span>
        </div>
        {!disabled && <ChevronDown className={`w-4 h-4 text-indigo-500 shrink-0 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div key="select-overlay" className="fixed inset-0 z-[999999]" onClick={() => setIsOpen(false)}>
              <motion.div 
                key="select-content" 
                ref={dropdownRef} 
                onClick={e => e.stopPropagation()} 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                // ClipPath باعث میشه اسکرول‌بار دقیقاً روی لبه‌های گرد بُریده بشه و بیرون نزنه
                style={{ top: coords.top, left: coords.left, width: coords.width, clipPath: 'inset(0 round 0.75rem)' }} 
                className="fixed bg-white/95 dark:bg-slate-800/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-700 shadow-[0_30px_60px_rgba(0,0,0,0.4)] z-[1000000] flex flex-col max-h-72 min-w-[200px]"
              >
                {searchable && (
                  <div className="p-2 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800 z-10">
                    <div className="relative">
                       <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                       <input type="text" autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="جستجو..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 pr-9 pl-3 py-2 text-xs font-bold outline-none rounded-lg text-slate-700 dark:text-slate-200 focus:border-indigo-500" />
                    </div>
                  </div>
                )}
                
                <div className="overflow-y-auto glass-scroll p-1.5 flex-1 relative z-0">
                  {filteredOptions.length > 0 ? filteredOptions.map((opt: any, idx: number) => {
                    const OptIcon = opt.icon; 
                    const uniqueKey = `portal-opt-${opt.id || opt.value || opt.label || idx}`;
                    const isSelected = value === opt.id || value === opt.value;
                    
                    return (
                      <button key={uniqueKey} type="button" onClick={() => { onChange(opt.id || opt.value); setIsOpen(false); setSearchTerm(''); }} 
                        className={`w-full text-right px-3 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-between group ${isSelected ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80'}`}
                      >
                        <div className="flex items-center gap-2">
                          {OptIcon && <OptIcon className="w-4 h-4" />}
                          <span className="truncate pt-0.5">{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    )
                  }) : (
                    <div className="py-6 text-center text-xs font-bold text-slate-400">موردی یافت نشد!</div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>, document.body
      )}
    </>
  );
};

// ==========================================
// 7. تقویم ماهانه‌ی اصلی پروژه‌ (GlassDatePicker)
// ==========================================
const toEnglishDigits = (str: string) => {
  if (!str) return '';
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicNumbers  = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '۹'];
  return str.split('').map(c => {
    let pIdx = persianNumbers.indexOf(c);
    if (pIdx >= 0) return pIdx;
    let aIdx = arabicNumbers.indexOf(c);
    if (aIdx >= 0) return aIdx;
    return c;
  }).join('');
};

const formatPersianDate = (val: string) => {
  let cleaned = toEnglishDigits(val).replace(/\D/g, ''); 
  if (cleaned.length > 8) cleaned = cleaned.substring(0, 8);
  let formatted = cleaned;
  if (cleaned.length > 4) { formatted = cleaned.substring(0, 4) + '/' + cleaned.substring(4); }
  if (cleaned.length > 6) { formatted = formatted.substring(0, 7) + '/' + cleaned.substring(6); }
  return formatted;
};

interface GlassDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
}

export function GlassDatePicker({ value, onChange, placeholder = '140X/XX/XX', hasError }: GlassDatePickerProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatPersianDate(e.target.value));
  };

  const handleCalendarChange = (d: any) => {
    if (d) {
      const englishDateStr = toEnglishDigits(d.format('YYYY/MM/DD'));
      onChange(englishDateStr);
    } else {
      onChange('');
    }
  };

  return (
    <div className="relative w-full h-[46px] flex items-center z-10 group">
      <DatePicker 
        portal
        fixMainPosition={true} 
        zIndex={2147483647} 
        calendar={persian} 
        locale={persian_fa} 
        value={value} 
        onChange={handleCalendarChange} 
        containerClassName="w-full h-full" 
        style={{ zIndex: 2147483647 }} 
        containerStyle={{ zIndex: 2147483647 }}
        render={(val: any, openCalendar: any) => (
          <div className="relative w-full h-full flex items-center">
            <Calendar className={`absolute right-3.5 w-4 h-4 transition-colors z-10 cursor-pointer pointer-events-none ${hasError ? 'text-rose-500' : 'text-indigo-500 dark:text-indigo-400 opacity-80'}`} />
            <input
              type="text"
              dir="ltr"
              value={val || ''}
              onChange={handleInputChange}
              onClick={openCalendar}
              placeholder={placeholder}
              maxLength={10}
              className={`w-full h-full py-3 pr-10 pl-10 rounded-2xl outline-none transition-all font-black text-sm text-left tracking-widest relative z-0
                bg-white/80 text-slate-800 placeholder:text-slate-400 border border-slate-200 shadow-sm
                dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:border-slate-700
                hover:bg-white dark:hover:bg-slate-800
                focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 dark:focus:border-indigo-400/50 dark:focus:ring-indigo-400/20
                ${hasError ? '!border-rose-500/50 !ring-2 !ring-rose-500/20 dark:!border-rose-500/80 dark:!ring-rose-500/20' : ''}
              `}
            />

            <AnimatePresence>
              {value && (
                <motion.button 
                  type="button" 
                  initial={{ opacity: 0, scale: 0.5 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.5 }} 
                  onClick={(e: React.MouseEvent) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    onChange(''); 
                  }} 
                  className="absolute left-2.5 p-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700 hover:bg-rose-500 text-slate-500 dark:text-slate-300 hover:text-white transition-colors z-[100] shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      />

      <style dangerouslySetInnerHTML={{__html: `
        .rmdp-wrapper, .rmdp-container, .ep-arrow { z-index: 2147483647 !important; }
        .rmdp-wrapper {
          background: rgba(15, 23, 42, 0.95) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 1.75rem !important;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.2) !important;
          padding: 12px !important;
        }
        .rmdp-day:not(.rmdp-selected):not(.rmdp-today) span { color: #06b6d4 !important; text-shadow: 0 0 8px rgba(6, 182, 212, 0.7) !important; font-weight: 800 !important; }
        .rmdp-panel-body::-webkit-scrollbar { width: 4px; }
        .rmdp-panel-body::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 10px; }
        .rmdp-header-values { color: #ffffff !important; font-weight: 900 !important; text-shadow: 0 0 6px rgba(255,255,255,0.3); }
        .rmdp-arrow-container:hover { box-shadow: 0 0 12px rgba(6,182,212,0.6) !important; background-color: rgba(6,182,212,0.15) !important; }
        .rmdp-arrow { border: solid #06b6d4 !important; border-width: 0 2px 2px 0 !important; }
        .rmdp-week-day { color: #94a3b8 !important; font-weight: 700 !important; }
        .rmdp-day:not(.rmdp-disabled):not(.rmdp-day-hidden) span:hover { background-color: rgba(6, 182, 212, 0.25) !important; color: #ffffff !important; border-radius: 12px !important; box-shadow: 0 0 10px rgba(6, 182, 212, 0.5) !important; }
        .rmdp-day.rmdp-today span { border: 1px solid #8b5cf6 !important; color: #c4b5fd !important; border-radius: 12px !important; text-shadow: 0 0 8px rgba(139, 92, 246, 0.6) !important; }
        .rmdp-day.rmdp-selected span:not(.highlight) { background-color: #8b5cf6 !important; box-shadow: 0 0 20px #8b5cf6 !important; color: white !important; border-radius: 12px !important; font-weight: 900; text-shadow: none !important; }
      `}} />
    </div>
  );
}

// ==========================================
// 8. ساعت لوکس آنالوگ 
// ==========================================
export const LuxuryTimePicker = ({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const [isPM, setIsPM] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const openClock = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const popupHeight = 360; // ارتفاع تقریبی پاپ‌آپ ساعت

      // سیستم هوشمند تشخیص جای خالی در پایین صفحه برای جلوگیری از نصفه ماندن
      let topPos = rect.bottom + 10;
      if (topPos + popupHeight > window.innerHeight) {
        topPos = rect.top - popupHeight - 10;
        if (topPos < 10) topPos = 20; // محافظ برای بیرون نزدن از بالای صفحه
      }
      
      setCoords({ top: topPos, left: rect.left + rect.width / 2 });
      setMode('hours');
      
      // تنظیم خودکار صبح یا عصر بر اساس مقدار قبلی
      if (value) {
        const h = parseInt(value.split(':')[0], 10);
        setIsPM(h >= 12);
      }
      
      setIsOpen(true);
    }
  };

  const handleHourSelect = (h: number) => {
    const formattedHour = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
    const mStr = value ? value.split(':')[1] : '00';
    onChange(`${String(formattedHour).padStart(2, '0')}:${mStr}`);
    setMode('minutes');
  };

  const handleMinuteSelect = (m: number) => {
    const hStr = value ? value.split(':')[0] : '08';
    onChange(`${hStr}:${String(m).padStart(2, '0')}`);
    setIsOpen(false);
  };

  const currentH = value ? parseInt(value.split(':')[0], 10) : 8;
  const currentM = value ? parseInt(value.split(':')[1], 10) : 0;
  const displayH = currentH % 12 || 12;

  return (
    <>
      <button type="button" ref={btnRef} onClick={() => isOpen ? setIsOpen(false) : openClock()} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 h-[48px] text-xs font-black text-slate-700 dark:text-slate-200 flex justify-between items-center outline-none transition-all shadow-inner hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 group">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Clock className="w-4 h-4 shrink-0" />
          <span dir="ltr">{value || placeholder}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div key="clock-picker-overlay" className="fixed inset-0 z-[999999]" onClick={() => setIsOpen(false)}>
              <motion.div key="clock-picker-modal" initial={{ opacity: 0, scale: 0.8, y: -30, x: '-50%' }} animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, scale: 0.8, y: -30, x: '-50%' }} 
                onClick={e => e.stopPropagation()}
                style={{ top: coords.top, left: coords.left }} 
                className="fixed bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-700 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] z-[1000000] p-6 flex flex-col items-center gap-4"
              >
                
                {/* 💡 متن راهنمای انتخاب پویا */}
                <div className="text-center w-full mb-1">
                  <span className="text-[13px] font-black text-slate-700 dark:text-slate-200 block">
                    {mode === 'hours' ? 'انتخاب ساعت' : 'انتخاب دقیقه'}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-500 mt-1 block h-4">
                    {mode === 'hours' 
                      ? 'لطفاً ساعت را مشخص کنید' 
                      : `ساعت ${displayH} ${isPM ? 'عصر' : 'صبح'} انتخاب شد`
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full mb-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl shadow-inner relative overflow-hidden">
                   <div className={`absolute top-1 bottom-1 w-[calc(50%-6px)] bg-indigo-500 rounded-lg shadow-md transition-all duration-300 z-0 ${isPM ? 'translate-x-0 right-1' : '-translate-x-[100%] right-1'}`} />
                   {/* 💡 فارسی سازی AM و PM */}
                   <button type="button" onClick={() => setIsPM(false)} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-colors relative z-10 w-full ${!isPM ? 'text-white' : 'text-slate-500'}`}>ق.ظ (صبح)</button>
                   <button type="button" onClick={() => setIsPM(true)} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-colors relative z-10 w-full ${isPM ? 'text-white' : 'text-slate-500'}`}>ب.ظ (عصر)</button>
                </div>
                
                <div className="relative w-56 h-56 rounded-full bg-slate-50 dark:bg-slate-800 border-[6px] border-slate-200 dark:border-slate-700 shadow-inner flex items-center justify-center">
                   <div className="absolute w-3 h-3 bg-indigo-500 rounded-full z-20 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                   <motion.div className="absolute w-1.5 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-full origin-bottom z-10 shadow-lg" 
                     style={{ bottom: '50%', height: mode === 'hours' ? '60px' : '85px' }}
                     animate={{ rotate: mode === 'hours' ? displayH * 30 : currentM * 6 }}
                   />
                   {[...Array(12)].map((_, i) => {
                     const num = mode === 'hours' ? (i === 0 ? 12 : i) : i * 5;
                     const angle = (i * 30 - 90) * (Math.PI / 180);
                     const x = 50 + 38 * Math.cos(angle);
                     const y = 50 + 38 * Math.sin(angle);
                     const isSelected = mode === 'hours' ? displayH === num : currentM === num;
                     
                     return (
                       <button key={`time-val-${mode}-${num}`} type="button" onClick={() => mode === 'hours' ? handleHourSelect(num) : handleMinuteSelect(num)}
                         style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', position: 'absolute' }}
                         className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-colors z-20 ${isSelected ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                       >
                         {String(num).padStart(2, '0')}
                       </button>
                     );
                   })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>, document.body
      )}
    </>
  );
};

// ==========================================
// 9. پاپ‌آپ شناور تایمردار گرافیکی (با نوار پیشرفت انیمیشنی)
// ==========================================
export const FloatingUndoToast = ({ undoItems, onCancel }: any) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
      <AnimatePresence>
        {undoItems?.map((undo: any) => (
          <motion.div 
            key={`undo-${undo.id}`} 
            initial={{ opacity: 0, y: 20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
            className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto" 
            dir="rtl"
          >
            <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0">
              <Trash2 className="w-5 h-5 text-rose-600" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-black text-slate-800 dark:text-white">
                {undo.items?.length > 1 ? `${undo.items.length} مورد در حال حذف` : 'خودرو در حال حذف'}
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-0.5">تا چند ثانیه دیگر پاک می‌شود...</span>
            </div>
            <button 
              onClick={() => onCancel(undo.id, undo.entryIds || undo.items)} 
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-colors shrink-0 cursor-pointer"
            >
              انصراف
            </button>
            <motion.div 
              initial={{ width: '100%' }} 
              animate={{ width: '0%' }} 
              transition={{ duration: 5, ease: 'linear' }} 
              className="absolute bottom-0 right-0 h-1 bg-rose-500" 
              style={{ transformOrigin: 'right' }} 
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>, 
    document.body
  );
};

export const BulkSelectionToast = ({ selectedCount, onDelete, isVisible }: { selectedCount: number, onDelete: () => void, isVisible: boolean }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {isVisible && selectedCount > 0 && (
        <motion.div key="bulk-action-toast" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[999999] shadow-[0_30px_60px_rgba(0,0,0,0.3)] px-6 py-4 rounded-[2rem] backdrop-blur-3xl bg-slate-900/95 dark:bg-white/95 border border-slate-700/50 dark:border-white/50 flex items-center gap-6">
          <span className="text-white dark:text-slate-800 font-black text-sm bg-white/10 dark:bg-slate-900/10 px-4 py-2 rounded-xl">{selectedCount} مورد انتخاب شده</span>
          <button onClick={onDelete} className="flex items-center gap-2 text-rose-400 dark:text-rose-500 hover:text-rose-300 dark:hover:text-rose-600 bg-rose-500/20 dark:bg-rose-50 px-4 py-2 rounded-xl transition-colors font-black text-sm"><Trash2 className="w-5 h-5" /> حذف موقت گروهی</button>
        </motion.div>
      )}
    </AnimatePresence>, document.body
  );
};

// ==========================================
// 10. تایتل‌های گرافیکی (PageTitle)
// ==========================================
export const PageTitle = ({ title, subtitle, icon: Icon, colorClass = "from-indigo-500 to-purple-500" }: { title: string, subtitle?: string, icon?: any, colorClass?: string }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="flex flex-col sm:flex-row items-center gap-4 mb-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/60 p-5 rounded-[2rem] shadow-sm"
    >
      {Icon && (
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      )}
      <div className="flex-1 w-full text-center sm:text-right">
        <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-indigo-800 dark:from-white dark:to-indigo-300 drop-shadow-sm">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
};