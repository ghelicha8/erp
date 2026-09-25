import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarDays, Activity, Eye, EyeOff, LayoutGrid, List as ListIcon, 
  ChevronRight, ChevronLeft, Search, ShieldAlert,
  Copy, Trash2, Building2, UserCircle, CheckCircle, X, Construction, 
  ChevronDown, Check, Clock,
  Edit, Plus // 💡 اضافه شدن آیکون‌های جا افتاده برای رفع ارور
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useLaborStore } from '../../../store/laborStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useClientStore } from '../../../store/clientStore';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';

// 💡 ایمپورت پاپ‌آپ‌های یکپارچه از فایل مشترک
import { FloatingUndoToast, BulkSelectionToast } from '../../../components/ui/SharedLaborUI';

// 💡 فراخوانی مودال یکپارچه و مادر از همین پوشه
import UniversalLaborModal from './UniversalLaborModal';

// ==========================================
// 💡 توابع کمکی
// ==========================================
const formatCurrency = (amount: number) => new Intl.NumberFormat('fa-IR').format(amount);

const parseWorkType = (raw?: string) => {
  if (!raw) return { specialty: null, text: 'نامشخص' };
  const match = raw.match(/^\[(.*?)\]\s*(.*)$/);
  if (match) return { specialty: match[1], text: match[2] };
  return { specialty: null, text: raw };
};

const formatTime = (start?: string, end?: string) => {
  if (start && end) return `${start} تا ${end}`;
  if (start) return `از ${start}`;
  if (end) return `تا ${end}`;
  return null;
};

// ==========================================
// 💡 کامپوننت چک‌باکس انیمیشنی داینامیک 
// ==========================================
const AnimatedCheckbox = ({ checked, onChange, theme = 'amber' }: { checked: boolean, onChange: () => void, theme?: 'amber' | 'emerald' | 'indigo' }) => {
  let activeClass = 'bg-gradient-to-tr from-indigo-500 to-purple-500 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)] scale-105';
  let hoverClass = 'hover:border-indigo-400';
  
  if (theme === 'emerald') {
    activeClass = 'bg-gradient-to-tr from-emerald-500 to-teal-500 border-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-105';
    hoverClass = 'hover:border-emerald-400';
  } else if (theme === 'amber') {
    activeClass = 'bg-gradient-to-tr from-amber-500 to-orange-500 border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.4)] scale-105';
    hoverClass = 'hover:border-amber-400';
  }

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`w-6 h-6 mx-auto rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm ${
        checked ? activeClass : `bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 ${hoverClass}`
      }`}
    >
      <AnimatePresence>
        {checked && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
            <CheckCircle className="w-4 h-4 text-white stroke-[3]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 💡 Wrapper جستجوی نئونی
// ==========================================
const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/40 dark:bg-slate-800/30 border border-white/60 dark:border-slate-700 backdrop-blur-md overflow-hidden ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

// ==========================================
// 💡 PortalSelect (با سرچ‌باکس و حل مشکل اسکرول)
// ==========================================
const PortalSelect = ({ value, onChange, options, placeholder, className = '', searchable = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  
  const selected = options.find((o:any) => o.id === value || o.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((o:any) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
  };

  const openDropdown = () => {
    updatePosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  return (
    <>
      <button type="button" ref={btnRef} onClick={() => isOpen ? setIsOpen(false) : openDropdown()} className={`w-full h-full min-h-[48px] bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 flex justify-between items-center outline-none transition-all shadow-inner backdrop-blur-md focus:ring-2 focus:ring-indigo-500/30 ${className}`}>
        <span className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-indigo-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[999999]" onClick={() => setIsOpen(false)} />
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ top: coords.top, left: coords.left, width: coords.width }} className="fixed bg-white/95 dark:bg-slate-800/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] z-[1000000] overflow-hidden flex flex-col max-h-72">
            
            {searchable && (
              <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="جستجو..." className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg pr-9 pl-3 py-2 text-xs font-bold outline-none text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:ring-1 ring-indigo-500/30" />
                </div>
              </div>
            )}

            <div className="overflow-y-auto glass-scroll p-1.5 flex-1">
              {filteredOptions.length > 0 ? filteredOptions.map((opt: any) => (
                <button type="button" key={opt.id || opt.value} onClick={() => { onChange(opt.id || opt.value); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-right px-4 py-3 text-xs font-bold transition-colors flex items-center justify-between group rounded-xl ${(value === opt.id || value === opt.value) ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                  <span className="truncate pl-2">{opt.label}</span>
                  {(value === opt.id || value === opt.value) && <Check className="w-4 h-4 text-indigo-500 shrink-0" />}
                </button>
              )) : (
                <div className="py-6 text-center text-xs font-bold text-slate-400">موردی یافت نشد!</div>
              )}
            </div>
          </motion.div>
        </>, document.body
      )}
    </>
  );
};

// ==========================================
// 💡 MAIN TAB COMPONENT
// ==========================================
interface LaborWorkLogsTabProps {
  workerId: string;
}

export default function LaborWorkLogsTab({ workerId }: LaborWorkLogsTabProps) {
  const { logs, deleteMultipleLogs } = useLaborStore();
  const { projects } = useProjectStore();
  const { clients } = useClientStore();

  const [viewMode, setViewMode] = useState<'GRID' | 'CARD' | 'CALENDAR'>('GRID');
  const [showHiddenProfit, setShowHiddenProfit] = useState(true);
  
  // فیلترها
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('ALL');
  const [selectedClientFilter, setSelectedClientFilter] = useState('ALL');
  const [displayLimit, setDisplayLimit] = useState<number>(20);

  // استیت‌های تقویم و انتخاب
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [selectedDateFilter] = useState<string | null>(null);
  
  // 💡 استیت جدید برای باز شدن دراور (منوی کناری) در تقویم
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // استیت‌های حذف گروهی
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [undoItems, setUndoItems] = useState<{ id: string, items: string[], expireAt: number }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  // 💡 استیت‌های جاافتاده برای مدیریت مودال واحد نیروی کار
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<any>(null);
  const [preSelectedDate, setPreSelectedDate] = useState<string | null>(null);

  // ==========================================
  // پردازش داده‌ها
  // ==========================================
  const workerLogs = useMemo(() => logs.filter(l => l.workerId === workerId && !pendingDeleteIds.includes(l.id)), [logs, workerId, pendingDeleteIds]);

  const filteredLogs = useMemo(() => {
    let result = workerLogs;
    if (selectedDateFilter) result = result.filter(l => l.date === selectedDateFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => (l.workType || '').toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q));
    }
    if (dateFrom) result = result.filter(l => l.date >= dateFrom);
    if (dateTo) result = result.filter(l => l.date <= dateTo);
    if (selectedProjectFilter !== 'ALL') result = result.filter(l => l.projectId === selectedProjectFilter);
    if (selectedClientFilter !== 'ALL') result = result.filter(l => l.clientId === selectedClientFilter);

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workerLogs, selectedDateFilter, searchQuery, dateFrom, dateTo, selectedProjectFilter, selectedClientFilter]);

  const paginatedLogs = useMemo(() => filteredLogs.slice(0, displayLimit), [filteredLogs, displayLimit]);

  const projectOptions = useMemo(() => [{ value: 'ALL', label: 'همه پروژه‌ها' }, { value: 'FREE', label: 'آزاد (بدون پروژه)' }, ...projects.map(p => ({ value: p.id, label: p.title || p.name }))], [projects]);
  const clientOptions = useMemo(() => [{ value: 'ALL', label: 'همه کارفرماها' }, { value: 'FREE', label: 'آزاد (بدون کارفرما)' }, ...clients.map(c => ({ value: c.id, label: `${c.name} ${c.lastName}`.trim() }))], [clients]);
  
  const limitOptions = [
    { value: 10, label: '۱۰ رکورد' },
    { value: 20, label: '۲۰ رکورد' },
    { value: 50, label: '۵۰ رکورد' },
    { value: 999999, label: 'نمایش همه' }
  ];

  // ==========================================
  // توابع تقویم
  // ==========================================
  const goToNextMonth = () => setCurrentMonth(currentMonth.clone().add(1, 'jMonth'));
  const goToPrevMonth = () => setCurrentMonth(currentMonth.clone().subtract(1, 'jMonth'));

  const calendarDays = useMemo(() => {
    moment.loadPersian({ usePersianDigits: false, dialect: 'persian-modern' });
    const startOfMonth = currentMonth.clone().startOf('jMonth');
    const daysInMonth = moment.jDaysInMonth(currentMonth.jYear(), currentMonth.jMonth());

    let startDayOfWeek = startOfMonth.day() + 1; 
    if (startDayOfWeek === 7) startDayOfWeek = 0;

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentMonth.jYear()}/${String(currentMonth.jMonth() + 1).padStart(2, '0')}/${String(i).padStart(2, '0')}`;
      const dayRecords = workerLogs.filter(r => r.date === dateStr);
      days.push({ day: i, dateStr, records: dayRecords, hasIncident: dayRecords.some(r => r.hasIncident) });
    }
    return days;
  }, [currentMonth, workerLogs]);

  // ==========================================
  // توابع کمکی
  // ==========================================
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const triggerDelete = (ids: string[]) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: ids, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...ids]);
    setSelectedIds([]);
  };

  // 💡 متد یکپارچه برای لغو عملیات حذف شناور
  const handleCancelUndo = (undoId: string, items: string[]) => {
    setPendingDeleteIds(prev => prev.filter(id => !(items || []).includes(id)));
    setUndoItems(prev => prev.filter(u => u.id !== undoId));
    toast.success('عملیات لغو شد');
  };

  const handleQuickDuplicate = (record: any) => {
    const duplicatedRecord = { ...record, id: undefined }; 
    setRecordToEdit(duplicatedRecord);
    setPreSelectedDate(record.date); 
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (undoItems.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const expired = undoItems.filter(u => u.expireAt <= now);
      if (expired.length > 0) {
        const idsToDelete = expired.flatMap(e => e.items);
        deleteMultipleLogs(idsToDelete);
        setUndoItems(curr => curr.filter(u => u.expireAt > now));
        setPendingDeleteIds(curr => curr.filter(id => !idsToDelete.includes(id)));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [undoItems, deleteMultipleLogs]);

  useEffect(() => {
    const handleOpenModal = (e?: any) => {
      if (typeof e?.detail === 'string') {
        setRecordToEdit(null);
        setPreSelectedDate(e.detail);
      } else {
        setRecordToEdit(e?.detail || null);
        setPreSelectedDate(null);
      }
      setIsModalOpen(true);
    };
    document.addEventListener('open-new-labor-modal', handleOpenModal);
    return () => document.removeEventListener('open-new-labor-modal', handleOpenModal);
  }, []);

  const getSettlementStatus = (internalCost: number, advancePayment: number) => {
    const netOwed = internalCost - advancePayment;
    if (netOwed <= 0) return { label: 'تسویه کامل', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' };
    if (advancePayment > 0 && netOwed > 0) return { label: 'علی‌الحساب', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
    return { label: 'تسویه نشده', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-800' };
  };

  const getProjectName = (id: string) => id === 'FREE' ? 'آزاد/متفرقه' : (projects.find(p => p.id === id)?.title || projects.find(p => p.id === id)?.name || 'نامشخص');
  const getClientName = (id: string) => id === 'FREE' ? 'بدون کارفرما' : (() => { const c = clients.find(x => x.id === id); return c ? `${c.name} ${c.lastName}` : 'نامشخص'; })();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full flex flex-col gap-6 relative z-0 pb-12">

      {/* 💡 بخش کنترل‌پنل و فیلترها */}
      <div className="w-full flex flex-col gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm rounded-[2rem] p-4 sm:p-5 z-[90] relative">
        
        {/* ردیف بالا: سوییچ‌ها، دکمه چشم و جستجو */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          
          <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1.5 rounded-2xl gap-1 shrink-0 w-full md:w-auto justify-center relative z-10">
            {[
              { id: 'GRID', label: 'نمای جدولی', icon: LayoutGrid, activeColor: 'text-indigo-600 dark:text-indigo-300', bg: 'bg-white dark:bg-slate-700', shadow: 'shadow-md shadow-indigo-500/10' },
              { id: 'CARD', label: 'نمای کارتی', icon: ListIcon, activeColor: 'text-indigo-600 dark:text-indigo-300', bg: 'bg-white dark:bg-slate-700', shadow: 'shadow-md shadow-indigo-500/10' },
              { id: 'CALENDAR', label: 'هیت‌مپ تقویمی', icon: CalendarDays, activeColor: 'text-white', bg: 'bg-gradient-to-r from-amber-400 to-orange-500', shadow: 'shadow-lg shadow-orange-500/30' }
            ].map((tab) => {
              const isActive = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as any)}
                  className={`relative flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-colors duration-300 ${isActive ? tab.activeColor : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="projectLaborTabBubble"
                      className={`absolute inset-0 rounded-xl ${tab.bg} ${tab.shadow} -z-10`}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <tab.icon className="w-4 h-4 relative z-10" /> 
                  <span className="hidden sm:inline relative z-10">{tab.label}</span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-1 w-full md:w-auto items-center justify-end gap-3">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHiddenProfit(!showHiddenProfit)} 
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm border shrink-0 relative overflow-hidden group ${showHiddenProfit ? 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white border-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.4)]' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700 hover:text-slate-800 dark:hover:text-white'}`}
            >
              {showHiddenProfit && <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute -inset-2 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-50 blur-sm" />}
              {showHiddenProfit ? <Eye className="w-4 h-4 shrink-0 relative z-10"/> : <EyeOff className="w-4 h-4 shrink-0 relative z-10"/>}
              <span className="hidden sm:inline relative z-10">{showHiddenProfit ? 'مخفی کردن سود' : 'نمایش سود'}</span>
            </motion.button>

            <NeonSearchWrapper className="w-full md:max-w-[300px] h-[46px]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input placeholder="جستجو در شرح کار..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-800 dark:text-white font-bold pl-2 pr-3 text-xs placeholder:text-slate-500" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-black/10 rounded-full"><X className="w-3.5 h-3.5 text-slate-500" /></button>}
            </NeonSearchWrapper>
          </div>
        </div>

        {/* ردیف پایین: فیلترها (5 ستونه و هم‌عرض) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
          <div className="w-full h-[48px]"><PortalSelect options={projectOptions} value={selectedProjectFilter} onChange={setSelectedProjectFilter} placeholder="فیلتر پروژه" searchable={true} /></div>
          <div className="w-full h-[48px]"><PortalSelect options={clientOptions} value={selectedClientFilter} onChange={setSelectedClientFilter} placeholder="فیلتر کارفرما" searchable={true} /></div>
          <div className="w-full h-[48px]"><GlassDatePicker placeholder="از تاریخ..." value={dateFrom} onChange={setDateFrom} /></div>
          <div className="w-full h-[48px]"><GlassDatePicker placeholder="تا تاریخ..." value={dateTo} onChange={setDateTo} /></div>
          <div className="w-full h-[48px]"><PortalSelect options={limitOptions} value={displayLimit} onChange={setDisplayLimit} placeholder="تعداد نمایش" /></div>
        </div>
      </div>

      {/* 💡 نمای تقویم هیت‌مپ */}
      <AnimatePresence mode="wait">
        {viewMode === 'CALENDAR' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full h-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl p-4 sm:p-6 z-10 relative">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-[1.25rem] shadow-lg flex items-center justify-center text-white shrink-0"><CalendarDays className="w-6 h-6 sm:w-7 sm:h-7" /></div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">{currentMonth.format('jMMMM jYYYY')}</h2>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1">هیت‌مپ حضور و غیاب اختصاصی نیروی کار</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shrink-0 shadow-inner">
                <button onClick={goToNextMonth} className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-50 hover:shadow-md transition-all active:scale-95"><ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                <button onClick={() => setCurrentMonth(moment())} className="px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-black bg-slate-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-xl shadow-sm transition-all active:scale-95">ماه جاری</button>
                <button onClick={goToPrevMonth} className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-50 hover:shadow-md transition-all active:scale-95"><ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-3 mb-2 sm:mb-3">
              {['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'].map((day, idx) => (
                <div key={day} className={`text-center font-black text-[9px] sm:text-xs py-2 sm:py-3 rounded-xl sm:rounded-2xl ${idx === 6 ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400'}`}>{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1 sm:gap-3">
              {calendarDays.map((dayData, index) => {
                if (!dayData) return <div key={`empty-${index}`} className="min-h-[80px] sm:min-h-[110px] rounded-xl sm:rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200/50 dark:border-slate-700/50" />;
                
                const isToday = dayData.dateStr === moment().format('jYYYY/jMM/jDD');
                const isFriday = (index + 1) % 7 === 0;
                const hasLogs = dayData.records.length > 0;

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: index * 0.01, duration: 0.3 }}
                    key={dayData.day} 
                    onClick={() => setSelectedDate(dayData.dateStr)}
                    className={`relative group overflow-hidden rounded-xl sm:rounded-2xl p-2 sm:p-3 flex flex-col min-h-[80px] sm:min-h-[110px] cursor-pointer transition-all duration-300 ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2 sm:ring-offset-4 ring-offset-white dark:ring-offset-slate-900 z-10' : ''} ${hasLogs ? 'bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/30 dark:to-purple-900/20 border border-indigo-200/80 dark:border-indigo-700/60 shadow-sm hover:shadow-lg hover:-translate-y-1' : isFriday ? 'bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30' : 'bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/80'}`}
                  >
                    <div className="flex justify-between items-start">
                       <span className={`text-base sm:text-xl font-black relative z-10 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : hasLogs ? 'text-indigo-700 dark:text-indigo-400' : isFriday ? 'text-rose-400' : 'text-slate-400'}`}>{dayData.day}</span>
                       {dayData.hasIncident && <ShieldAlert data-tooltip="ثبت حادثه" className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500 animate-pulse" />}
                    </div>
                    {hasLogs && (
                      <div className="flex flex-col gap-0.5 sm:gap-1 mt-auto relative z-10">
                        {dayData.records.slice(0,2).map((r:any) => {
                           const parsed = parseWorkType(r.workType);
                           return (
                             <div key={r.id} className="text-[8px] sm:text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-white/80 dark:bg-slate-900/80 px-1 sm:px-1.5 py-0.5 rounded truncate border border-indigo-100 dark:border-indigo-800/50">
                               {parsed.specialty ? `[${parsed.specialty}] ${parsed.text}` : parsed.text}
                             </div>
                           );
                        })}
                        {dayData.records.length > 2 && <div className="text-[8px] sm:text-[9px] font-black text-indigo-500 text-center">+{dayData.records.length - 2} کارکرد دیگر</div>}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💡 نمای جدولی (GRID) */}
      <AnimatePresence mode="wait">
        {viewMode === 'GRID' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="w-full max-w-full rounded-[2rem] backdrop-blur-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/50 shadow-2xl relative z-10 h-auto">
            <div className="w-full overflow-x-auto glass-scroll min-h-[300px]">
              {paginatedLogs.length === 0 ? (
                <div className="w-full flex flex-col items-center justify-center py-20">
                  <Activity className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                  <p className="text-sm font-black text-slate-500 dark:text-slate-400">هیچ کارکردی با این فیلترها یافت نشد.</p>
                </div>
              ) : (
                <table className="w-full text-right border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-black/20 border-b border-slate-200 dark:border-slate-700/50">
                      <th className="w-12 p-4 text-center"><CheckCircle className="w-4 h-4 text-slate-400 mx-auto" /></th>
                      <th className="p-4 font-black text-xs text-slate-500 dark:text-slate-400">تاریخ حضور / زمان</th>
                      <th className="p-4 font-black text-xs text-slate-500 dark:text-slate-400">پروژه و کارفرما</th>
                      <th className="p-4 font-black text-xs text-slate-500 dark:text-slate-400">تخصص / شرح کار / مبنا</th>
                      <th className="p-4 font-black text-xs text-slate-500 dark:text-slate-400">هزینه ما (تومان)</th>
                      <th className={`p-4 font-black text-xs text-slate-500 dark:text-slate-400 transition-all ${!showHiddenProfit ? 'opacity-30 blur-sm select-none' : ''}`}>فاکتور کارفرما / آربیتراژ</th>
                      <th className="p-4 font-black text-xs text-slate-500 dark:text-slate-400">وضعیت تسویه</th>
                      <th className="p-4 font-black text-xs text-slate-500 dark:text-slate-400 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {paginatedLogs.map((log: any) => {
                        const status = getSettlementStatus(log.internalCost, log.advancePayment || 0);
                        const parsedWork = parseWorkType(log.workType);
                        const timeStr = formatTime(log.startTime, log.endTime);
                        
                        return (
                          <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`border-b border-slate-100 dark:border-slate-700/30 transition-colors group ${selectedIds.includes(log.id) ? 'bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                            <td className="p-4 text-center">
                              <AnimatedCheckbox theme="indigo" checked={selectedIds.includes(log.id)} onChange={() => toggleSelection(log.id)} />
                            </td>
                            
                            {/* 💡 تاریخ و ساعت */}
                            <td className="p-4">
                              <div className="flex flex-col gap-1.5 items-start">
                                <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-indigo-500 shrink-0" /> {log.date}</span>
                                {timeStr && (
                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-indigo-100 dark:border-indigo-800/50">
                                    <Clock className="w-3 h-3" /> {timeStr}
                                  </span>
                                )}
                                {log.hasIncident && <span className="text-[10px] font-bold text-rose-500 mt-0.5 flex items-center gap-1"><ShieldAlert className="w-3 h-3 shrink-0"/> گزارش حادثه</span>}
                              </div>
                            </td>
                            
                            {/* پروژه و کارفرما */}
                            <td className="p-4">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 w-max flex items-center gap-1"><Building2 className="w-3 h-3 text-cyan-500 shrink-0"/> {getProjectName(log.projectId)}</span>
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><UserCircle className="w-3 h-3 text-emerald-500 shrink-0"/> {getClientName(log.clientId)}</span>
                              </div>
                            </td>
                            
                            {/* 💡 تخصص و شرح کار */}
                            <td className="p-4">
                              <div className="flex flex-col gap-1.5 items-start">
                                <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                                  <Construction className="w-3.5 h-3.5 text-amber-500 shrink-0"/> 
                                  {parsedWork.specialty && (
                                    <span className="text-[9px] font-black text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/30 px-1.5 py-0.5 rounded-md border border-fuchsia-200 dark:border-fuchsia-800/50">
                                      {parsedWork.specialty}
                                    </span>
                                  )}
                                  {parsedWork.text}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">مبنا: {log.workerQuantity} {log.workerUnit}</span>
                              </div>
                            </td>
                            
                            {/* 💡 هزینه ما (با تگ ماهانه) */}
                            <td className="p-4">
                              <div className="flex flex-col items-start gap-1">
                                <span className="text-sm font-black text-rose-600 dark:text-rose-400" dir="ltr">{formatCurrency(log.internalCost)}</span>
                                {log.isCoveredByUsMonthly && (
                                  <span className="text-[9px] font-black text-rose-500 px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 w-max">
                                    جزو حقوق ماهانه ما
                                  </span>
                                )}
                                {((log.foodDeduction || 0) + (log.penaltyDeduction || 0)) > 0 && (
                                  <span className="text-[9px] font-bold text-rose-500">شامل {(log.foodDeduction || 0) + (log.penaltyDeduction || 0)}ت کسورات</span>
                                )}
                                {log.foodDeduction < 0 && (
                                  <span className="text-[9px] font-bold text-emerald-500">شامل {Math.abs(log.foodDeduction)}ت هزینه غذا</span>
                                )}
                              </div>
                            </td>
                            
                            {/* 💡 فاکتور کارفرما (با تگ ماهانه) */}
                            <td className={`p-4 transition-all duration-300 ${!showHiddenProfit ? 'opacity-30 blur-md select-none' : ''}`}>
                              <div className="flex flex-col items-start gap-1">
                                <span className="text-sm font-black text-blue-600 dark:text-blue-400" dir="ltr">{formatCurrency(log.billedCost)}</span>
                                
                                {log.isCoveredByClientMonthly ? (
                                  <span className="text-[9px] font-black text-blue-500 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 w-max">
                                    قرارداد ماهانه کارفرما
                                  </span>
                                ) : (
                                  <span className={`text-[10px] font-black ${log.hiddenProfit > 0 ? 'text-emerald-500' : 'text-rose-500'}`} dir="ltr">
                                    سود: {formatCurrency(log.hiddenProfit)}
                                  </span>
                                )}
                              </div>
                            </td>
                            
                            <td className="p-4">
                              <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border ${status.color}`}>{status.label}</span>
                            </td>
                            
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button data-tooltip="تکرار در تاریخ جدید" onClick={() => handleQuickDuplicate(log)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/50 shadow-sm transition-colors border border-slate-200 dark:border-slate-700"><Copy className="w-4 h-4" /></button>
                                <button data-tooltip="ویرایش" onClick={() => { setRecordToEdit(log); setIsModalOpen(true); }} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/50 shadow-sm transition-colors border border-slate-200 dark:border-slate-700"><Edit className="w-4 h-4" /></button>
                                <button data-tooltip="حذف" onClick={() => triggerDelete([log.id])} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/50 shadow-sm transition-colors border border-slate-200 dark:border-slate-700"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
            
            {/* نمایش وضعیت Pagination در پایین جدول */}
            {filteredLogs.length > displayLimit && (
               <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-center">
                 <span className="text-xs font-bold text-slate-500">نمایش {displayLimit} مورد از کل {filteredLogs.length} رکورد</span>
               </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💡 نمای کارتی (CARD) */}
      <AnimatePresence mode="wait">
        {viewMode === 'CARD' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 relative z-10 h-auto">
            {paginatedLogs.map(log => {
              const status = getSettlementStatus(log.internalCost, log.advancePayment || 0);
              const parsedWork = parseWorkType(log.workType);
              const timeStr = formatTime(log.startTime, log.endTime);
              
              return (
                <div key={log.id} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all rounded-[2rem] p-5 relative group overflow-hidden">
                  <div className="flex justify-between items-start mb-4 border-b border-slate-200 dark:border-slate-700/50 pb-4">
                     <div className="flex items-center gap-3">
                       <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><Activity className="w-5 h-5 text-indigo-500" /></div>
                       <div>
                         <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                            {parsedWork.specialty && <span className="text-[9px] bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 px-1.5 py-0.5 rounded border border-fuchsia-200 dark:border-fuchsia-800/50">{parsedWork.specialty}</span>}
                            {parsedWork.text}
                         </span>
                         <div className="flex items-center gap-2 mt-1">
                             <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><CalendarDays className="w-3 h-3"/> {log.date}</span>
                             {timeStr && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/50 flex items-center gap-1"><Clock className="w-3 h-3"/> {timeStr}</span>}
                         </div>
                       </div>
                     </div>
                     <AnimatedCheckbox theme="indigo" checked={selectedIds.includes(log.id)} onChange={() => toggleSelection(log.id)} />
                  </div>
                  
                  <div className="space-y-2.5 mb-5 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                    <div className="flex justify-between text-xs font-bold"><span className="text-slate-500">پروژه:</span> <span className="text-slate-800 dark:text-slate-200">{getProjectName(log.projectId)}</span></div>
                    
                    <div className="flex justify-between items-center text-xs font-bold">
                       <span className="text-slate-500 flex items-center gap-1">هزینه ما: 
                         {log.isCoveredByUsMonthly && <span className="text-[8px] bg-rose-50 text-rose-500 px-1 rounded border border-rose-200 ml-1">ماهانه</span>}
                       </span> 
                       <span className="text-rose-600 dark:text-rose-400 font-black" dir="ltr">{formatCurrency(log.internalCost)} ت</span>
                    </div>

                    <div className={`flex justify-between items-center text-xs font-bold transition-all ${!showHiddenProfit ? 'opacity-30 blur-sm select-none' : ''}`}>
                       <span className="text-slate-500 flex items-center gap-1">فاکتور کارفرما: 
                         {log.isCoveredByClientMonthly && <span className="text-[8px] bg-blue-50 text-blue-500 px-1 rounded border border-blue-200 ml-1">ماهانه</span>}
                       </span> 
                       <span className="text-blue-600 dark:text-blue-400 font-black" dir="ltr">{formatCurrency(log.billedCost)} ت</span>
                    </div>

                    <div className={`flex justify-between text-xs font-black pt-2 border-t border-slate-200 dark:border-slate-700 transition-all ${!showHiddenProfit ? 'opacity-30 blur-sm select-none' : ''}`}>
                       <span className="text-slate-500">سود خالص:</span> 
                       <span className={log.hiddenProfit > 0 ? 'text-emerald-500' : 'text-rose-500'} dir="ltr">{formatCurrency(log.hiddenProfit)} ت</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                     <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${status.color}`}>{status.label}</span>
                     <div className="flex gap-2">
                       <button onClick={() => handleQuickDuplicate(log)} className="p-2 bg-slate-100 dark:bg-slate-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-xl transition-colors"><Copy className="w-4 h-4"/></button>
                       <button onClick={() => { setRecordToEdit(log); setIsModalOpen(true); }} className="p-2 bg-slate-100 dark:bg-slate-800 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/50 rounded-xl transition-colors"><Edit className="w-4 h-4"/></button>
                       <button onClick={() => triggerDelete([log.id])} className="p-2 bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/50 rounded-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                     </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💡 پورتال منوی کناری (Drawer) برای کلیک روی تقویم روزانه */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedDate && (
            <div className="fixed inset-0 z-[9999999] flex justify-start" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedDate(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
              
              <motion.div 
                initial={{ x: '100%' }} 
                animate={{ x: 0 }} 
                exit={{ x: '100%' }} 
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-l border-white/50 dark:border-slate-700 shadow-[-20px_0_60px_rgba(0,0,0,0.1)] flex flex-col"
              >
                {/* Header منوی کناری */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-900/10 dark:to-orange-900/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-amber-500">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white">لیست کارکردهای روزانه</h3>
                      <p className="text-sm font-bold text-slate-500 mt-1">مورخ {selectedDate}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedDate(null)} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:text-rose-500 transition-colors relative z-10"><X className="w-5 h-5" /></button>
                </div>

                {/* لیست رکوردهای این روز خاص */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 modal-scrollbar">
                  {(() => {
                    const dayRecords = workerLogs.filter(r => r.date === selectedDate);
                    
                    if (dayRecords.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 mt-20">
                          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                            <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                          </div>
                          <p className="font-bold text-lg text-slate-500 dark:text-slate-400">هیچ کارکردی ثبت نشده است.</p>
                        </div>
                      );
                    }

                    return dayRecords.map((record: any, idx: number) => {
                      const parsedWork = parseWorkType(record.workType);
                      const timeStr = formatTime(record.startTime, record.endTime);
                      const status = getSettlementStatus(record.internalCost, record.advancePayment || 0);

                      return (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={record.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 group relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-full opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center"><Building2 className="w-5 h-5 text-amber-600 dark:text-amber-500" /></div>
                              <div>
                                <h4 className="font-black text-slate-800 dark:text-white text-sm">{getProjectName(record.projectId)}</h4>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md mt-1 inline-block border border-slate-200 dark:border-slate-700">{parsedWork.text}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { handleQuickDuplicate(record); setSelectedDate(null); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"><Copy className="w-4 h-4"/></button>
                              <button onClick={() => { setRecordToEdit(record); setIsModalOpen(true); setSelectedDate(null); }} className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-colors"><Edit className="w-4 h-4"/></button>
                              <button onClick={() => { triggerDelete([record.id]); setSelectedDate(null); }} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50 mt-1">
                            <div className="flex flex-col gap-1 w-max">
                              {timeStr && <span className="flex items-center gap-1 w-max px-2 py-0.5 rounded border bg-indigo-50 border-indigo-200 text-indigo-700 text-[10px] font-bold"><Clock className="w-3 h-3" /> {timeStr}</span>}
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${status.color}`}>{status.label}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="flex items-center gap-1 font-black text-rose-600 dark:text-rose-400 text-xs">
                                <span className="text-[9px] text-slate-400 font-bold">هزینه ما:</span>
                                <span dir="ltr">{formatCurrency(record.internalCost)}</span><span className="text-[9px]">تومان</span>
                              </span>
                              {showHiddenProfit && (
                                <span className="flex items-center gap-1 font-black text-blue-600 dark:text-blue-400 text-xs">
                                  <span className="text-[9px] text-slate-400 font-bold">فاکتور کارفرما:</span>
                                  <span dir="ltr">{formatCurrency(record.billedCost)}</span><span className="text-[9px]">تومان</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    });
                  })()}
                </div>

                {/* 💡 دکمه ثبت رکورد جدید برای همین تاریخ از تقویم */}
                <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <button 
                    onClick={() => { 
                      setRecordToEdit(null); 
                      setPreSelectedDate(selectedDate);
                      setIsModalOpen(true); 
                      setSelectedDate(null); 
                    }} 
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Plus className="w-5 h-5"/> ثبت کارکرد جدید برای این روز
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 💡 جایگزین شدن کامپوننت‌های یکپارچه (SharedLaborUI) */}
      <BulkSelectionToast 
        selectedCount={selectedIds.length} 
        onDelete={() => triggerDelete(selectedIds)} 
        isVisible={selectedIds.length > 0 && viewMode !== 'CALENDAR'} 
      />

      <FloatingUndoToast 
        undoItems={undoItems} 
        onCancel={handleCancelUndo} 
      />

      {/* 💡 مودال هوشمند و مادر نیروی کار با قفل شدن نیروی کار در این تب */}
      <UniversalLaborModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setRecordToEdit(null); setPreSelectedDate(null); }} 
        editData={recordToEdit} 
        preSelectedDate={preSelectedDate}
        lockedWorkerId={workerId} 
      />

    </motion.div>
  );
}