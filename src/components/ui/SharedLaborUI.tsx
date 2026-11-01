import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, Search, Check, CheckCircle, Trash2, CalendarDays, Calendar, X } from 'lucide-react';
import moment from 'moment-jalaali';

// ==========================================
// 1. اسکرول‌بارهای شیشه‌ای و انیمیشنی
// ==========================================
export const GlassScrollStyles: React.FC = () => (
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
// 2. جستجوی نئونی و پالس‌دار بهینه‌شده برای پردازنده و کارت گرافیک
// ==========================================
export const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative rounded-2xl group bg-white/60 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 backdrop-blur-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md focus-within:shadow-[0_0_20px_rgba(99,102,241,0.25)] focus-within:border-indigo-500/50 ${className}`}>
    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] opacity-30 group-focus-within:opacity-100 group-focus-within:animate-[spin_4s_linear_infinite] transition-opacity duration-300" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

// ==========================================
// 2.1. کامپوننت جستجوی یکپارچه و استاندارد سیستم (AppSearchInput)
// ==========================================
export interface AppSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const AppSearchInput: React.FC<AppSearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'جستجو...',
  className = '',
  inputClassName = '',
  disabled = false,
  autoFocus = false,
}) => {
  return (
    <div
      className={`relative rounded-2xl group bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md focus-within:shadow-[0_0_20px_rgba(99,102,241,0.25)] focus-within:border-indigo-500/50 ${className}`}
    >
      {/* گرادیانت دور کادر: در حالت عادی ثابت برای صرفه‌جویی CPU/GPU و هنگام فوکوس با چرخش نرم */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
        style={{
          padding: '2px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      >
        <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] opacity-30 group-focus-within:opacity-100 group-focus-within:animate-[spin_4s_linear_infinite] transition-opacity duration-300" />
      </div>

      <div className="relative z-10 w-full h-full bg-transparent flex items-center ps-4 pe-3 py-2 min-h-[44px]">
        <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors shrink-0 me-2.5 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`w-full bg-transparent border-none outline-none text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-start ${inputClassName}`}
        />
        <AnimatePresence>
          {Boolean(value) && !disabled && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange('');
                onClear?.();
              }}
              className="p-1 rounded-full bg-slate-200/70 dark:bg-slate-700/70 hover:bg-rose-500 hover:text-white text-slate-500 dark:text-slate-300 transition-colors shrink-0 ms-1 cursor-pointer"
              title="پاک کردن"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ==========================================
// 3. کادر ورودی شیشه‌ای با افکت Focus
// ==========================================
export const GlassInputWrapper = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative rounded-xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 shadow-sm focus-within:border-indigo-500/60 focus-within:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all duration-300 overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-600/50 ${className}`}>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center">{children}</div>
  </div>
);

// ==========================================
// 4. چک‌باکس‌های انیمیشنی داینامیک
// ==========================================
export const AnimatedCheckbox = ({ checked, onChange, theme = 'amber' }: { checked: boolean; onChange: () => void; theme?: 'amber' | 'emerald' | 'indigo' | 'rose' | 'blue' }) => {
  const themes = {
    indigo: { active: 'bg-gradient-to-tr from-indigo-500 to-purple-500 border-indigo-400', hover: 'hover:border-indigo-400 text-indigo-500' },
    emerald: { active: 'bg-gradient-to-tr from-emerald-500 to-teal-500 border-teal-400', hover: 'hover:border-emerald-400 text-emerald-500' },
    amber: { active: 'bg-gradient-to-tr from-amber-500 to-orange-500 border-orange-400', hover: 'hover:border-amber-400 text-amber-500' },
    blue: { active: 'bg-gradient-to-tr from-blue-500 to-cyan-500 border-blue-400', hover: 'hover:border-blue-400 text-blue-500' },
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
export interface GlowSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  sublabel?: string;
  theme?: 'indigo' | 'blue' | 'rose' | 'emerald';
}

export const GlowSwitch: React.FC<GlowSwitchProps> = ({ checked, onChange, label, sublabel, theme = 'indigo' }) => {
  const colors: Record<'indigo' | 'blue' | 'rose' | 'emerald', { border: string; bg: string; thumb: string; text: string; glow: string }> = {
    indigo: { border: 'border-indigo-400', bg: 'bg-indigo-50/80 dark:bg-indigo-900/30', thumb: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-300', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.4)]' },
    blue: { border: 'border-blue-400', bg: 'bg-blue-50/80 dark:bg-blue-900/30', thumb: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]' },
    rose: { border: 'border-rose-400', bg: 'bg-rose-50/80 dark:bg-rose-900/30', thumb: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.4)]' },
    emerald: { border: 'border-emerald-400', bg: 'bg-emerald-50/80 dark:bg-emerald-900/30', thumb: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]' }
  };
  const activeColor = colors[theme] || colors.indigo;

  return (
    <div onClick={() => onChange(!checked)} className={`flex items-center gap-3 cursor-pointer p-3 rounded-2xl border transition-all duration-300 ${checked ? `${activeColor.border} ${activeColor.bg}${activeColor.glow}` : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'}`}>
      <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 shadow-inner shrink-0 ${checked ? activeColor.thumb : 'bg-slate-300 dark:bg-slate-600'}`}>
         <motion.div animate={{ x: checked ? -20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow-md flex items-center justify-center">
            {checked && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`w-1.5 h-1.5 rounded-full ${activeColor.thumb}`} />}
         </motion.div>
      </div>
      <div className="flex flex-col">
        <span className={`text-[11px] font-black transition-colors ${checked ? activeColor.text : 'text-slate-700 dark:text-slate-300'}`}>{label}</span>
        {sublabel && <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{sublabel}</span>}
      </div>
    </div>
  );
};

// ==========================================
// 6. لیست کشویی انیمیشنی
// ==========================================
export interface OptionItem {
  id?: any;
  value?: any;
  label: string;
  icon?: any;
  [key: string]: any;
}

export interface PortalSelectProps {
  value?: any;
  onChange: (value: any) => void;
  options: Array<{ id?: any; value?: any; label: string; icon?: any; [key: string]: any }>;
  placeholder?: string;
  icon?: any;
  searchable?: boolean;
  className?: string;
  disabled?: boolean;
}

export const PortalSelect: React.FC<PortalSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'انتخاب کنید...',
  icon: MainIcon,
  searchable = false,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState<{ top: number; bottom: number; left: number; width: number }>({ top: 0, bottom: 0, left: 0, width: 0 });
  const [openUpward, setOpenUpward] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const safeOptions = Array.isArray(options) ? options : [];
  const selected = safeOptions.find((o) => (o.id !== undefined && o.id === value) || (o.value !== undefined && o.value === value));

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return safeOptions;
    return safeOptions.filter((o) => o.label?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [safeOptions, searchTerm]);

  const updateCoords = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      setIsOpen(false);
      return;
    }
    const isUp = rect.bottom + 250 > window.innerHeight;
    setOpenUpward(isUp);
    setCoords({
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const openDropdown = () => {
    if (disabled) return;
    updateCoords();
    setIsOpen(true);
  };

  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return; 
      updateCoords();
    };
    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    }
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, updateCoords]);

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
            <div key="select-overlay" className="fixed inset-0 z-[100000000]" onClick={() => setIsOpen(false)}>
              <motion.div 
                key="select-content" 
                ref={dropdownRef} 
                onClick={(e: React.MouseEvent) => e.stopPropagation()} 
                initial={{ opacity: 0, y: openUpward ? 10 : -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: openUpward ? 10 : -10 }}
                style={{ 
                  top: !openUpward ? coords.bottom + 6 : undefined,
                  bottom: openUpward ? (window.innerHeight - coords.top + 6) : undefined,
                  left: coords.left, 
                  width: coords.width, 
                  clipPath: 'inset(0 round 0.75rem)' 
                }} 
                className="fixed bg-white/95 dark:bg-slate-800/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-700 shadow-[0_30px_60px_rgba(0,0,0,0.4)] z-[100000001] flex flex-col max-h-72 min-w-[200px]"
              >
                {searchable && (
                  <div className="p-2 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800 z-10">
                    <div className="relative">
                       <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                       <input type="text" autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="جستجو..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 pr-9 pl-3 py-2 text-xs font-bold outline-none rounded-lg text-slate-700 dark:text-slate-200 focus:border-indigo-500" />
                    </div>
                  </div>
                )}
                
                <div 
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  className="overflow-y-auto glass-scroll p-1.5 flex-1 relative z-0"
                >
                  {filteredOptions.length > 0 ? filteredOptions.map((opt, idx: number) => {
                    const OptIcon = opt.icon; 
                    const uniqueKey = `portal-opt-${idx}-${String(opt.id ?? opt.value ?? opt.label ?? '')}`;
                    const isSelected = value === opt.id || value === opt.value;
                    
                    return (
                      <button key={uniqueKey} type="button" onClick={() => { onChange(opt.id ?? opt.value ?? ''); setIsOpen(false); setSearchTerm(''); }} 
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
// 7. تقویم ماهانه‌ی اصلی پروژه‌ (GlassDatePicker - پاپ‌آپ گرد لوکس با استانداردهای شمسی)
// ==========================================
export const toEnglishDigits = (str: string): string => {
  if (!str) return '';
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicNumbers  = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '۹'];
  return str.split('').map(c => {
    const pIdx = persianNumbers.indexOf(c);
    if (pIdx >= 0) return String(pIdx);
    const aIdx = arabicNumbers.indexOf(c);
    if (aIdx >= 0) return String(aIdx);
    return c;
  }).join('');
};

export const formatPersianDate = (val: string): string => {
  let cleaned = toEnglishDigits(val).replace(/\D/g, ''); 
  if (cleaned.length > 8) cleaned = cleaned.substring(0, 8);
  let formatted = cleaned;
  if (cleaned.length > 4) { formatted = cleaned.substring(0, 4) + '/' + cleaned.substring(4); }
  if (cleaned.length > 6) { formatted = formatted.substring(0, 7) + '/' + cleaned.substring(6); }
  return formatted;
};

export interface GlassDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
}

const PERSIAN_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

const FULL_WEEKDAY_NAMES = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

export function GlassDatePicker({ value, onChange, placeholder = '140X/XX/XX', hasError }: GlassDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState(value || '');

  const parseDate = (dateStr: string) => {
    if (dateStr && /^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('/').map(Number);
      return { year: y, month: m - 1, day: d };
    }
    const today = (moment as any)();
    return {
      year: typeof today.jYear === 'function' ? today.jYear() : 1403,
      month: typeof today.jMonth === 'function' ? today.jMonth() : 0,
      day: typeof today.jDate === 'function' ? today.jDate() : 1,
    };
  };

  const [viewYear, setViewYear] = useState(() => parseDate(value).year);
  const [viewMonth, setViewMonth] = useState(() => parseDate(value).month);

  useEffect(() => {
    if (value) {
      setTempSelectedDate(value);
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(value)) {
        const [y, m] = value.split('/').map(Number);
        setViewYear(y);
        setViewMonth(m - 1);
      }
    } else {
      setTempSelectedDate('');
    }
  }, [value]);

  const daysInMonth = useMemo(() => {
    return typeof (moment as any).jDaysInMonth === 'function'
      ? (moment as any).jDaysInMonth(viewYear, viewMonth)
      : 30;
  }, [viewYear, viewMonth]);

  const startPadding = useMemo(() => {
    const firstDayMom = (moment as any)(`${viewYear}/${viewMonth + 1}/01`, 'jYYYY/jM/jD');
    return (firstDayMom.day() + 1) % 7;
  }, [viewYear, viewMonth]);

  const todayStr = useMemo(() => (moment as any)().format('jYYYY/jMM/jDD'), []);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewYear(prev => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewYear(prev => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const todayMom = (moment as any)();
    const todayFormatted = todayMom.format('jYYYY/jMM/jDD');
    setTempSelectedDate(todayFormatted);
    setViewYear(typeof todayMom.jYear === 'function' ? todayMom.jYear() : 1403);
    setViewMonth(typeof todayMom.jMonth === 'function' ? todayMom.jMonth() : 0);
    onChange(todayFormatted);
    setIsOpen(false);
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(tempSelectedDate);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPersianDate(e.target.value);
    onChange(formatted);
    setTempSelectedDate(formatted);
  };

  return (
    <div className="relative w-full h-[46px] flex items-center z-10 group" dir="rtl">
      {/* اینپوت ورودی تاریخ با آیکون تقویم و دکمه پاک کردن */}
      <div className="relative w-full h-full flex items-center">
        <Calendar 
          onClick={() => setIsOpen(true)}
          className={`absolute right-3.5 w-4 h-4 transition-colors z-10 cursor-pointer ${
            hasError ? 'text-rose-500' : 'text-indigo-500 dark:text-indigo-400 opacity-80'
          }`} 
        />
        <input
          type="text"
          dir="ltr"
          value={value || ''}
          onChange={handleInputChange}
          onClick={() => setIsOpen(true)}
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
          {Boolean(value) && (
            <motion.button 
              type="button" 
              initial={{ opacity: 0, scale: 0.5 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.5 }} 
              onClick={(e: React.MouseEvent) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                onChange(''); 
                setTempSelectedDate('');
              }} 
              className="absolute left-2.5 p-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700 hover:bg-rose-500 text-slate-500 dark:text-slate-300 hover:text-white transition-colors z-20 shadow-sm cursor-pointer"
              title="پاک کردن تاریخ"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ================= پاپ‌آپ تقویم ماهانه شمسی با گوشه‌های بسیار گرد rounded-[2rem] ================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div 
              className="fixed inset-0 z-[99999999] flex items-center justify-center p-4"
              dir="rtl"
            >
              {/* پس‌زمینه محو نرم با قابلیت کلیک برای بستن */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.45 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm cursor-pointer"
              />

              {/* کادر سفید/تیره با لبه‌های بسیار گرد rounded-[2rem] */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-[360px] sm:max-w-[390px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-700/80 rounded-[2rem] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.25)] select-none z-10"
              >
                {/* هدر تقویم: دکمه‌های دایره‌ای ماه قبل/بعد و عنوان ماه و سال */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                  {/* دکمه دایره‌ای ماه بعد (سمت راست در RTL) */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handlePrevMonth}
                    title="ماه قبل"
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4 rotate-90" />
                  </motion.button>

                  <div className="flex flex-col items-center">
                    <span className="text-base font-black text-slate-800 dark:text-white">
                      {PERSIAN_MONTH_NAMES[viewMonth]} {viewYear}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">تقویم هجری شمسی</span>
                  </div>

                  {/* دکمه دایره‌ای ماه بعد (سمت چپ در RTL) */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleNextMonth}
                    title="ماه بعد"
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </motion.button>
                </div>

                {/* روزهای هفته: ستون قرمز جمعه‌ها - عناوین کامل بدون اختصار */}
                <div className="grid grid-cols-7 gap-1 mb-2.5 text-center">
                  {FULL_WEEKDAY_NAMES.map((wd, idx) => (
                    <div
                      key={wd}
                      className={`text-[10.5px] sm:text-[11px] py-1 select-none whitespace-nowrap tracking-tight font-bold ${
                        idx === 6 ? 'text-rose-500 font-black' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {wd}
                    </div>
                  ))}
                </div>

                {/* شبکه روزهای ماه */}
                <div className="grid grid-cols-7 gap-1.5 mb-5">
                  {/* فاصله‌های خالی روزهای قبل از آغاز ماه */}
                  {Array.from({ length: startPadding }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="w-8 h-8 sm:w-9 sm:h-9" />
                  ))}

                  {/* روزهای ماه: دایره آبی برای روز انتخابی و رنگ قرمز برای جمعه‌ها */}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const colIndex = (startPadding + idx) % 7;
                    const isFriday = colIndex === 6;
                    const currentFormatted = `${viewYear}/${String(viewMonth + 1).padStart(2, '0')}/${String(dayNum).padStart(2, '0')}`;
                    const isSelected = tempSelectedDate === currentFormatted;
                    const isToday = currentFormatted === todayStr;

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => setTempSelectedDate(currentFormatted)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 mx-auto rounded-full flex items-center justify-center text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-500/40 ring-2 ring-blue-400/50 scale-105 z-10'
                            : isFriday
                            ? 'text-rose-500 font-black hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            : 'text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-800'
                        } ${isToday && !isSelected ? 'ring-2 ring-blue-500/30' : ''}`}
                      >
                        <span>{dayNum}</span>
                      </button>
                    );
                  })}
                </div>

                {/* فوتر تقویم: دو دکمه «امروز» و «تایید» */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSelectToday}
                    className="flex-1 py-2.5 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
                  >
                    امروز
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirm}
                    className="flex-1 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                  >
                    تایید
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// ==========================================
// 8. ساعت لوکس آنالوگ و دیجیتال با قابلیت ورود دستی کیبورد
// ==========================================
export interface LuxuryTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const LuxuryTimePicker: React.FC<LuxuryTimePickerProps> = ({
  value,
  onChange,
  placeholder = '۰۰:۰۰',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const [isPM, setIsPM] = useState(false);
  const [manualHour, setManualHour] = useState('08');
  const [manualMinute, setManualMinute] = useState('00');
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const openClock = () => {
    if (disabled) return;
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const popupHeight = 440; // ارتفاع تقریبی پاپ‌آپ ساعت

      let topPos = rect.bottom + 10;
      if (topPos + popupHeight > window.innerHeight) {
        topPos = rect.top - popupHeight - 10;
        if (topPos < 10) topPos = 20;
      }
      
      setCoords({ top: topPos, left: Math.max(160, Math.min(window.innerWidth - 160, rect.left + rect.width / 2)) });
      setMode('hours');
      
      // مقداردهی ساعت و دقیقه از value
      if (value && value.includes(':')) {
        const [hRaw, mRaw] = value.split(':');
        const h = parseInt(hRaw, 10);
        const m = parseInt(mRaw, 10);
        const validH = isNaN(h) ? 8 : h;
        const validM = isNaN(m) ? 0 : m;
        setManualHour(String(validH).padStart(2, '0'));
        setManualMinute(String(validM).padStart(2, '0'));
        setIsPM(validH >= 12);
      } else {
        setManualHour('08');
        setManualMinute('00');
        setIsPM(false);
      }
      
      setIsOpen(true);
    }
  };

  const handleHourSelect = (h: number) => {
    const formattedHour = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
    const hStr = String(formattedHour).padStart(2, '0');
    setManualHour(hStr);
    const mStr = manualMinute || (value && value.includes(':') ? value.split(':')[1] : '00');
    onChange(`${hStr}:${mStr}`);
    setMode('minutes');
  };

  const handleMinuteSelect = (m: number) => {
    const mStr = String(m).padStart(2, '0');
    setManualMinute(mStr);
    const hStr = manualHour || (value && value.includes(':') ? value.split(':')[0] : '08');
    onChange(`${hStr}:${mStr}`);
  };

  const currentH = manualHour ? parseInt(manualHour, 10) : (value ? parseInt(value.split(':')[0], 10) : 8);
  const currentM = manualMinute ? parseInt(manualMinute, 10) : (value ? parseInt(value.split(':')[1], 10) : 0);
  const displayH = (isNaN(currentH) ? 8 : currentH) % 12 || 12;

  const handleManualHourChange = (raw: string) => {
    const digits = toEnglishDigits(raw).replace(/\D/g, '').slice(0, 2);
    setManualHour(digits);
    const num = parseInt(digits, 10);
    if (!isNaN(num) && num >= 0 && num <= 23) {
      setIsPM(num >= 12);
      const mStr = String(Math.min(59, Math.max(0, parseInt(manualMinute || '0', 10)))).padStart(2, '0');
      onChange(`${String(num).padStart(2, '0')}:${mStr}`);
    }
  };

  const handleManualMinuteChange = (raw: string) => {
    const digits = toEnglishDigits(raw).replace(/\D/g, '').slice(0, 2);
    setManualMinute(digits);
    const num = parseInt(digits, 10);
    if (!isNaN(num) && num >= 0 && num <= 59) {
      const hStr = String(Math.min(23, Math.max(0, parseInt(manualHour || '8', 10)))).padStart(2, '0');
      onChange(`${hStr}:${String(num).padStart(2, '0')}`);
    }
  };

  const handleConfirm = () => {
    const finalH = String(Math.min(23, Math.max(0, parseInt(manualHour || '8', 10)))).padStart(2, '0');
    const finalM = String(Math.min(59, Math.max(0, parseInt(manualMinute || '0', 10)))).padStart(2, '0');
    onChange(`${finalH}:${finalM}`);
    setIsOpen(false);
  };

  return (
    <>
      <button 
        type="button" 
        ref={btnRef} 
        onClick={() => isOpen ? setIsOpen(false) : openClock()} 
        disabled={disabled}
        className={`w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 h-[46px] text-xs font-black text-slate-700 dark:text-slate-200 flex justify-between items-center outline-none transition-all shadow-inner hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 group ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      >
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Clock className="w-4 h-4 shrink-0" />
          <span dir="ltr">{value || placeholder}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div key="clock-picker-overlay" className="fixed inset-0 z-[999999]" onClick={() => setIsOpen(false)}>
              <motion.div 
                key="clock-picker-modal" 
                initial={{ opacity: 0, scale: 0.8, y: -30, x: '-50%' }} 
                animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }} 
                exit={{ opacity: 0, scale: 0.8, y: -30, x: '-50%' }} 
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                style={{ top: coords.top, left: coords.left }} 
                className="fixed bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-700 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] z-[1000000] p-6 flex flex-col items-center gap-3 w-80 max-w-[95vw]"
              >
                
                {/* متن راهنما */}
                <div className="text-center w-full">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100 block">
                    {mode === 'hours' ? 'تنظیم ساعت' : 'تنظیم دقیقه'}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-500 mt-0.5 block">
                    امکان تایپ مستقیم یا انتخاب از ساعت آنالوگ
                  </span>
                </div>

                {/* ورودی دستی ساعت و دقیقه با کیبورد */}
                <div className="w-full flex items-center justify-center gap-3 py-2 px-3 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-bold text-slate-400 mb-1">دقیقه (۰۰-۵۹)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={manualMinute}
                      onChange={(e) => handleManualMinuteChange(e.target.value)}
                      onFocus={() => setMode('minutes')}
                      className={`w-14 h-10 text-center font-black text-base bg-white dark:bg-slate-900 border rounded-xl outline-none transition-all text-slate-800 dark:text-white ${mode === 'minutes' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700'}`}
                      placeholder="۰۰"
                    />
                  </div>

                  <span className="text-xl font-black text-indigo-500 mt-4">:</span>

                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-bold text-slate-400 mb-1">ساعت (۰۰-۲۳)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={manualHour}
                      onChange={(e) => handleManualHourChange(e.target.value)}
                      onFocus={() => setMode('hours')}
                      className={`w-14 h-10 text-center font-black text-base bg-white dark:bg-slate-900 border rounded-xl outline-none transition-all text-slate-800 dark:text-white ${mode === 'hours' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700'}`}
                      placeholder="۰۸"
                    />
                  </div>
                </div>

                {/* سوییچ صبح / عصر */}
                <div className="flex items-center gap-2 w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner relative overflow-hidden">
                   <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-indigo-500 rounded-lg shadow-md transition-all duration-300 z-0 ${isPM ? 'translate-x-0 right-1' : '-translate-x-[100%] right-1'}`} />
                   <button 
                     type="button" 
                     onClick={() => {
                       setIsPM(false);
                       const h = parseInt(manualHour || '8', 10);
                       if (h >= 12) {
                         const newH = String(h - 12).padStart(2, '0');
                         setManualHour(newH);
                         onChange(`${newH}:${manualMinute || '00'}`);
                       }
                     }} 
                     className={`px-3 py-1 rounded-lg text-xs font-black transition-colors relative z-10 w-full ${!isPM ? 'text-white' : 'text-slate-500'}`}
                   >
                     صبح (ق.ظ)
                   </button>
                   <button 
                     type="button" 
                     onClick={() => {
                       setIsPM(true);
                       const h = parseInt(manualHour || '8', 10);
                       if (h < 12) {
                         const newH = String(h + 12).padStart(2, '0');
                         setManualHour(newH);
                         onChange(`${newH}:${manualMinute || '00'}`);
                       }
                     }} 
                     className={`px-3 py-1 rounded-lg text-xs font-black transition-colors relative z-10 w-full ${isPM ? 'text-white' : 'text-slate-500'}`}
                   >
                     عصر (ب.ظ)
                   </button>
                </div>
                
                {/* صفحه گرد آنالوگ */}
                <div className="relative w-48 h-48 rounded-full bg-slate-50 dark:bg-slate-800 border-[5px] border-slate-200 dark:border-slate-700 shadow-inner flex items-center justify-center my-1">
                   <div className="absolute w-3 h-3 bg-indigo-500 rounded-full z-20 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                   <motion.div 
                     className="absolute w-1.5 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-full origin-bottom z-10 shadow-lg" 
                     style={{ bottom: '50%', height: mode === 'hours' ? '50px' : '70px' }}
                     animate={{ rotate: mode === 'hours' ? displayH * 30 : (isNaN(currentM) ? 0 : currentM) * 6 }}
                   />
                   {[...Array(12)].map((_, i) => {
                     const num = mode === 'hours' ? (i === 0 ? 12 : i) : i * 5;
                     const angle = (i * 30 - 90) * (Math.PI / 180);
                     const x = 50 + 38 * Math.cos(angle);
                     const y = 50 + 38 * Math.sin(angle);
                     const isSelected = mode === 'hours' ? displayH === num : currentM === num;
                     
                     return (
                       <button 
                         key={`time-val-${mode}-${num}`} 
                         type="button" 
                         onClick={() => mode === 'hours' ? handleHourSelect(num) : handleMinuteSelect(num)}
                         style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', position: 'absolute' }}
                         className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-colors z-20 ${isSelected ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                       >
                         {String(num).padStart(2, '0')}
                       </button>
                     );
                   })}
                </div>

                {/* دکمه تایید نهایی */}
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer mt-1"
                >
                  ثبت و بستن
                </button>
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
export interface UndoItem {
  id: string | number;
  items?: unknown[];
  entryIds?: (string | number)[];
  [key: string]: unknown;
}

export interface FloatingUndoToastProps {
  undoItems: UndoItem[];
  onCancel: (id: string | number, itemsOrIds?: unknown) => void;
}

export const FloatingUndoToast: React.FC<FloatingUndoToastProps> = ({ undoItems, onCancel }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
      <AnimatePresence>
        {undoItems?.map((undo) => (
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
                {undo.items && undo.items.length > 1 ? `${undo.items.length} مورد در حال حذف` : 'مورد در حال حذف'}
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

export const BulkSelectionToast = ({ selectedCount, onDelete, isVisible }: { selectedCount: number; onDelete: () => void; isVisible: boolean }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {isVisible && selectedCount > 0 && (
        <motion.div key="bulk-action-toast" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[999999] shadow-[0_30px_60px_rgba(0,0,0,0.3)] px-6 py-4 rounded-[2rem] backdrop-blur-3xl bg-slate-900/95 dark:bg-white/95 border border-slate-700/50 dark:border-white/50 flex items-center gap-6">
          <span className="text-white dark:text-slate-800 font-black text-sm bg-white/10 dark:bg-slate-900/10 px-4 py-2 rounded-xl">{selectedCount} مورد انتخاب شده</span>
          <button onClick={onDelete} className="flex items-center gap-2 text-rose-400 dark:text-rose-500 hover:text-rose-300 dark:hover:text-rose-600 bg-rose-500/20 dark:bg-rose-50 px-4 py-2 rounded-xl transition-colors font-black text-sm cursor-pointer"><Trash2 className="w-5 h-5" /> حذف موقت گروهی</button>
        </motion.div>
      )}
    </AnimatePresence>, document.body
  );
};

// ==========================================
// 10. تایتل‌های گرافیکی (PageTitle)
// ==========================================
export interface PageTitleProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  colorClass?: string;
}

export const PageTitle: React.FC<PageTitleProps> = ({ title, subtitle, icon: Icon, colorClass = "from-indigo-500 to-purple-500" }) => {
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

// 💡 اکسپورت کامپوننت تب‌های سه‌بعدی یکپارچه
export { ThreeDTabs, TabItem, type TabTheme } from './ThreeDTabs';