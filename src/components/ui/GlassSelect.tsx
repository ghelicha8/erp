import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion} from 'framer-motion';
import { ChevronDown, Search, Plus } from 'lucide-react';

export interface GlassSelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface GlassSelectProps {
  options: GlassSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasSearch?: boolean;      
  onAddNew?: (val: string) => void; 
  disabled?: boolean;
  hasError?: boolean;
  icon?: React.ElementType; 
}

export default function GlassSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'انتخاب کنید...', 
  hasSearch,
  onAddNew,
  disabled = false,
  hasError = false,
  icon: Icon
}: GlassSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const showSearch = hasSearch ?? options.length > 5; 

  const openDropdown = () => {
    if (disabled) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // 💡 عرض را کمی بیشتر می‌گیریم تا محتوا مثل عکس شما (کادر قرمز) جا بشود
      setCoords({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: Math.max(rect.width, 300) });
      setIsOpen(true);
    }
  };

  // 💡 لیسنر اسکرول حذف شد تا کاربر بتواند راحت در مودال اسکرول کند و منو بسته نشود!
  useEffect(() => {
    const handleResize = () => setIsOpen(false);
    if (isOpen) window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  const selectedOption = options.find(o => o.value === value);
  const isExactMatch = options.some(o => o.label.toLowerCase() === searchTerm.toLowerCase());

  return (
    <>
      <div 
        ref={triggerRef} 
        onClick={openDropdown} 
        className={`w-full min-h-[46px] border rounded-2xl px-4 py-3 outline-none transition-all duration-300 flex items-center justify-between shadow-sm relative z-10
          ${disabled ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed' : 'bg-white/80 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer'}
          ${hasError ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}
          ${isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-500 dark:border-indigo-400' : ''}
        `}
      >
        <div className="flex items-center gap-2 overflow-hidden w-full">
          {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
          <span className={`truncate text-sm font-bold ${value ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        {!disabled && <ChevronDown className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`} />}
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0" style={{ zIndex: 2147483647 }} onClick={() => setIsOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: coords.top + 8, left: coords.left, width: coords.width }}
            className="backdrop-blur-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden flex flex-col"
          >
            {showSearch && (
              <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl pl-3 pr-9 py-2 text-sm font-bold outline-none focus:border-indigo-500 transition-colors shadow-inner" placeholder="جستجو..." />
                </div>
              </div>
            )}
            
            <div className="max-h-[280px] overflow-y-auto modal-scrollbar p-1.5">
              {filteredOptions.map((opt) => (
                <div 
                  key={opt.value} 
                  onClick={() => { onChange(opt.value); setIsOpen(false); setSearchTerm(''); }} 
                  className={`px-4 py-3 cursor-pointer text-sm font-bold rounded-xl transition-all duration-200 m-0.5
                    ${value === opt.value ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}
                  `}
                >
                  {opt.label}
                  {opt.subLabel && <span className="block text-[10px] text-slate-400 mt-1">{opt.subLabel}</span>}
                </div>
              ))}
              
              {filteredOptions.length === 0 && !searchTerm && (
                <div className="p-4 text-center text-xs font-bold text-slate-400">موردی یافت نشد.</div>
              )}
              
              {searchTerm && !isExactMatch && onAddNew && (
                <button onClick={() => { setIsOpen(false); onAddNew(searchTerm); setSearchTerm(''); }} className="w-[calc(100%-8px)] m-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-black text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 animate-pulse">
                  <Plus className="w-4 h-4" /> افزودن مورد جدید: {searchTerm}
                </button>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
}