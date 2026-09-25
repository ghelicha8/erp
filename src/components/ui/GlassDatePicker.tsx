import React from 'react';
import DatePickerPkg from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DatePicker = (DatePickerPkg as any).default || DatePickerPkg;

interface GlassDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
}

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

export default function GlassDatePicker({ value, onChange, placeholder = '140X/XX/XX', hasError }: GlassDatePickerProps) {
  
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
        fixMainPosition={true} /* 💡 حل مشکل جابجا شدن تقویم هنگام اسکرول */
        zIndex={2147483647} /* 💡 پراپ اختصاصی و قطعی کتابخانه برای بالاترین لایه ممکن */
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