import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Coffee, Shirt, Bus, Banknote, ShieldAlert, 
  Trash2, CalendarClock, Building2, UserCircle, Calculator, Info,
  Search, ChevronDown, Check, Edit2, SlidersHorizontal, ListFilter,
  CheckCircle, X
} from 'lucide-react';
import { toast } from 'sonner';
import { useLaborStore } from '../../../store/laborStore';
import { useProjectStore } from '../../projects/store/projectStore'; 
import { useClientStore } from '../../../store/clientStore';

import LaborMiscModal from './LaborMiscModal';
import GlassDatePicker from '../../../components/ui/GlassDatePicker'; // 💡 ایمپورت کامپوننت تقویم

// ==========================================
// 💡 استایل اسکرول شیشه‌ای
// ==========================================
const GlassScrollStyles = () => (
  <style>{`
    .glass-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .glass-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }
    .glass-scroll::-webkit-scrollbar-thumb { background: rgba(236, 72, 153, 0.3); border-radius: 10px; transition: background 0.3s ease; }
    .glass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(236, 72, 153, 0.8); }
    .dark .glass-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
    .dark .glass-scroll::-webkit-scrollbar-thumb { background: rgba(236, 72, 153, 0.4); }
  `}</style>
);

// ==========================================
// 💡 کامپوننت چک‌باکس انیمیشنی
// ==========================================
const AnimatedCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div onClick={(e) => { e.stopPropagation(); onChange(); }} className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm shrink-0 ${checked ? 'bg-gradient-to-tr from-pink-500 to-rose-500 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)] scale-105' : 'bg-white/60 dark:bg-slate-800/60 border-slate-300 dark:border-slate-600 hover:border-pink-400'}`}>
    <AnimatePresence>
      {checked && <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}><CheckCircle className="w-3 h-3 text-white stroke-[3]" /></motion.div>}
    </AnimatePresence>
  </div>
);

// ==========================================
// 💡 سرچ‌باکس نئونی
// ==========================================
const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/20 dark:bg-slate-800/40 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-[0_0_20px_rgba(236,72,153,0.15)] transition-all border border-white/50 dark:border-slate-700/50 ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse z-0" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ec4899,#f43f5e,#8b5cf6,#06b6d4,#10b981,#ec4899,#f43f5e,#8b5cf6,#06b6d4,#10b981,#ec4899)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-pink-500 group-focus-within:to-rose-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

// ==========================================
// 💡 کامپوننت سلکتِ انیمیشنی شیشه‌ای (رفع باگ بسته شدن هنگام اسکرول)
// ==========================================
const PortalSelect = ({ value, onChange, options, placeholder, icon: Icon, searchable = false, className = '' }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selected = options.find((o:any) => String(o.id) === String(value));

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((o:any) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  const openDropdown = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width });
      setIsOpen(true);
    }
  };

  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return; 
      }
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
      <button type="button" ref={btnRef} onClick={() => isOpen ? setIsOpen(false) : openDropdown()} className={`h-[42px] bg-white/60 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 flex justify-between items-center outline-none transition-all shadow-sm hover:border-pink-400 focus:ring-2 focus:ring-pink-500/30 ${className}`}>
        <div className="flex items-center gap-2 truncate text-right flex-1">
           {Icon && <Icon className="w-4 h-4 text-pink-500 shrink-0" />}
           <span className="truncate text-[11px] font-bold text-slate-700 dark:text-slate-200 pt-0.5">
             {selected ? selected.label : placeholder}
           </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-pink-500 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[999999]" onClick={() => setIsOpen(false)} />
          <motion.div 
            ref={dropdownRef} 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
            style={{ top: coords.top, left: coords.left, width: coords.width }} 
            className="fixed bg-white/95 dark:bg-slate-800/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] z-[1000000] overflow-hidden flex flex-col max-h-72 min-w-[200px]"
          >
            {searchable && (
              <div className="p-2 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="relative group rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
                   <div className="absolute inset-0 rounded-xl pointer-events-none group-focus-within:animate-pulse" style={{ padding: '2px', background: 'linear-gradient(90deg, #ec4899, #f43f5e)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', opacity: 0.5 }} />
                   <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500 z-10" />
                   <input type="text" autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="جستجو..." className="w-full bg-transparent border-none pr-9 pl-3 py-2 text-xs font-bold outline-none text-slate-700 dark:text-slate-200 relative z-10" />
                </div>
              </div>
            )}
            <div className="overflow-y-auto glass-scroll p-1.5 flex-1">
              {filteredOptions.length > 0 ? filteredOptions.map((opt: any) => {
                const OptIcon = opt.icon || Check;
                return (
                  <button type="button" key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-right px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-between group ${String(value) === String(opt.id) ? 'bg-pink-50 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    <div className="flex items-center gap-2">
                      <OptIcon className={`w-4 h-4 ${String(value) === String(opt.id) ? 'text-pink-500' : 'text-slate-400 group-hover:text-pink-400'}`} />
                      <span className="truncate pt-0.5">{opt.label}</span>
                    </div>
                    {String(value) === String(opt.id) && <Check className="w-4 h-4 text-pink-500 shrink-0" />}
                  </button>
                )
              }) : (
                <div className="py-6 text-center text-xs font-bold text-slate-400">موردی یافت نشد!</div>
              )}
            </div>
          </motion.div>
        </>, document.body
      )}
    </>
  );
};

export default function LaborMiscTab({ workerId }: { workerId: string }) {
  const { workers } = useLaborStore();
  const { projects } = useProjectStore();
  const { clients } = useClientStore();
  
  const worker = workers.find(w => w.id === workerId);

  // استیت‌های فیلتر و جستجو
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [displayLimit, setDisplayLimit] = useState<number | 'ALL'>(20);
  
  // 💡 اضافه شدن استیت‌های فیلتر بازه زمانی
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // استیت‌های سیستم حذف شناور
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [undoItems, setUndoItems] = useState<{ id: string, items: { id: string }[], expireAt: number }[]>([]);

  const [editEntryId, setEditEntryId] = useState<string | null>(null);

  // فقط هزینه‌هایی که تو صف حذف نیستن رو نشون بده
  const activeMiscExpenses = useMemo(() => {
    return ((worker as any)?.miscExpenses || []).filter((e: any) => !pendingDeleteIds.includes(e.id));
  }, [worker, pendingDeleteIds]);

  // ریست فیلتر پروژه با تغییر کارفرما
  useEffect(() => {
    setProjectFilter('ALL');
  }, [clientFilter]);

  // تایمر اجرایی برای حذف قطعی اسناد بعد از ۵ ثانیه
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            const latestWorker = useLaborStore.getState().workers.find(w => w.id === workerId);
            const currentMisc = (latestWorker as any)?.miscExpenses || [];
            const idsToDelete = expired.flatMap(u => u.items.map(i => i.id));
            const remaining = currentMisc.filter((e: any) => !idsToDelete.includes(e.id));
            
            useLaborStore.getState().updateWorker(workerId, { miscExpenses: remaining } as any);
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !idsToDelete.includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [workerId]);

  const CLIENT_OPTIONS = useMemo(() => [
    { id: 'ALL', label: 'همه کارفرماها', icon: ListFilter },
    { id: 'FREE', label: 'آزاد (بدون کارفرما)', icon: UserCircle },
    ...clients.map(c => ({ id: c.id, label: `${c.name} ${c.lastName}`.trim(), icon: UserCircle }))
  ], [clients]);

  const PROJECT_OPTIONS = useMemo(() => {
    let filteredProjects = projects;
    if (clientFilter === 'FREE') {
      filteredProjects = projects.filter(p => !p.clientId || p.clientId === 'FREE');
    } else if (clientFilter !== 'ALL') {
      filteredProjects = projects.filter(p => p.clientId === clientFilter);
    }
    return [
      { id: 'ALL', label: 'همه پروژه‌ها', icon: ListFilter },
      { id: 'FREE', label: 'آزاد (بدون پروژه)', icon: Building2 },
      ...filteredProjects.map(p => ({ id: p.id, label: p.title || p.name, icon: Building2 }))
    ];
  }, [projects, clientFilter]);

  const CATEGORY_OPTIONS = [
    { id: 'ALL', label: 'همه دسته‌بندی‌ها', icon: ListFilter },
    { id: 'FOOD', label: 'خورد و خوراک', icon: Coffee },
    { id: 'CLOTHING', label: 'پوشاک و لباس', icon: Shirt },
    { id: 'TRANSPORT', label: 'ایاب و ذهاب', icon: Bus },
    { id: 'OTHER', label: 'سایر اقلام', icon: Package },
  ];

  const LIMIT_OPTIONS = [
    { id: 10, label: '۱۰ رکورد', icon: SlidersHorizontal },
    { id: 20, label: '۲۰ رکورد', icon: SlidersHorizontal },
    { id: 50, label: '۵۰ رکورد', icon: SlidersHorizontal },
    { id: 'ALL', label: 'نمایش همه', icon: SlidersHorizontal },
  ];

  // 💡 فیلتر کردن هوشمند لیست با در نظر گرفتن بازه زمانی
  const filteredExpenses = useMemo(() => {
    let result = [...activeMiscExpenses];

    if (searchTerm) {
      result = result.filter(e => e.title.includes(searchTerm) || e.description?.includes(searchTerm));
    }
    if (categoryFilter !== 'ALL') {
      result = result.filter(e => e.category === categoryFilter);
    }
    if (clientFilter !== 'ALL') {
      if (clientFilter === 'FREE') result = result.filter(e => !e.clientId || e.clientId === 'FREE');
      else result = result.filter(e => e.clientId === clientFilter);
    }
    if (projectFilter !== 'ALL') {
      if (projectFilter === 'FREE') result = result.filter(e => !e.projectId || e.projectId === 'FREE');
      else result = result.filter(e => e.projectId === projectFilter);
    }
    
    if (dateFrom) {
      result = result.filter(e => e.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(e => e.date <= dateTo);
    }

    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return result;
  }, [activeMiscExpenses, searchTerm, categoryFilter, clientFilter, projectFilter, dateFrom, dateTo]);

  const displayedExpenses = displayLimit === 'ALL' ? filteredExpenses : filteredExpenses.slice(0, displayLimit as number);

  const stats = useMemo(() => {
    let totalDeducted = 0;
    let totalEmployerPaid = 0;
    let totalUncalculated = 0;
    
    activeMiscExpenses.forEach((exp: any) => {
      if (exp.isCalculated !== false) {
        if (exp.isDeducted) totalDeducted += exp.amount;
        else totalEmployerPaid += exp.amount;
      } else {
        totalUncalculated += exp.amount;
      }
    });

    return { totalDeducted, totalEmployerPaid, totalUncalculated, count: activeMiscExpenses.length };
  }, [activeMiscExpenses]);

  // هندلرهای حذف متصل به سیستم Undo
  const triggerSingleDelete = (id: string) => {
    setUndoItems(prev => [...prev, { id: Date.now().toString(), items: [{ id }], expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, id]);
  };

  const triggerDeleteGroup = () => {
    const itemsToDelete = selectedIds.map(id => ({ id }));
    setUndoItems(prev => [...prev, { id: Date.now().toString(), items: itemsToDelete, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...selectedIds]);
    setSelectedIds([]); 
  };

  const toggleSelection = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'FOOD': return Coffee;
      case 'CLOTHING': return Shirt;
      case 'TRANSPORT': return Bus;
      default: return Package;
    }
  };

  if (!worker) return null;

  return (
    <>
      <GlassScrollStyles />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full flex flex-col gap-6 relative z-0 pb-10">
        
        {/* داشبورد آمار بالا */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-rose-200 dark:border-rose-800/50 shadow-sm rounded-[2rem] p-5 flex flex-col justify-between hover:shadow-lg transition-all">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-black text-rose-600 dark:text-rose-400">کسر از حقوق (بدهی نیروی کار)</span>
              <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 text-rose-500 rounded-xl"><Banknote className="w-4 h-4" /></div>
            </div>
            <div className="text-xl lg:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono" dir="ltr">
              {stats.totalDeducted.toLocaleString('fa-IR')} <span className="text-[10px] font-bold text-rose-400 dark:text-rose-500">تومان</span>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-emerald-200 dark:border-emerald-800/50 shadow-sm rounded-[2rem] p-5 flex flex-col justify-between hover:shadow-lg transition-all">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">هزینه رفاهی (پای کارفرما)</span>
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-xl"><ShieldAlert className="w-4 h-4" /></div>
            </div>
            <div className="text-xl lg:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
              {stats.totalEmployerPaid.toLocaleString('fa-IR')} <span className="text-[10px] font-bold text-emerald-400 dark:text-emerald-500">تومان</span>
            </div>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800/50 shadow-sm rounded-[2rem] p-5 flex flex-col justify-between hover:shadow-lg transition-all">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">فقط نمایشی (بدون تأثیر در تراز)</span>
              <div className="p-2.5 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-xl"><Info className="w-4 h-4" /></div>
            </div>
            <div className="text-xl lg:text-2xl font-black text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
              {stats.totalUncalculated.toLocaleString('fa-IR')} <span className="text-[10px] font-bold opacity-70">تومان</span>
            </div>
          </div>
        </div>

        {/* 💡 بخش فیلترها (چیدمان گرید دو ردیفه و اضافه شدن تقویم بازه زمانی) */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-[2rem] p-4 flex flex-col gap-4 z-50">
           <NeonSearchWrapper className="w-full h-[42px] shrink-0">
              <Search className="w-4 h-4 text-pink-500 shrink-0" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="جستجو در عنوان و توضیحات..." className="w-full h-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 dark:text-white pl-2 pr-3 transition-colors placeholder:text-slate-500/70" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-3 h-3 text-slate-500 dark:text-slate-400" /></button>}
           </NeonSearchWrapper>

           {/* ردیف پایین فیلترها با گرید ۶ ستونه */}
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <PortalSelect options={CLIENT_OPTIONS} value={clientFilter} onChange={setClientFilter} placeholder="کارفرما" icon={UserCircle} searchable />
              <PortalSelect options={PROJECT_OPTIONS} value={projectFilter} onChange={setProjectFilter} placeholder="پروژه" icon={Building2} searchable />
              <PortalSelect options={CATEGORY_OPTIONS} value={categoryFilter} onChange={setCategoryFilter} placeholder="دسته‌بندی" icon={ListFilter} />
              <div className="h-[42px] relative z-[100]">
                 <GlassDatePicker placeholder="از تاریخ..." value={dateFrom} onChange={setDateFrom} />
              </div>
              <div className="h-[42px] relative z-[90]">
                 <GlassDatePicker placeholder="تا تاریخ..." value={dateTo} onChange={setDateTo} />
              </div>
              <PortalSelect options={LIMIT_OPTIONS} value={displayLimit} onChange={setDisplayLimit} placeholder="تعداد" icon={SlidersHorizontal} />
           </div>
        </div>

        {/* لیست هزینه‌ها با پشتیبانی از چک‌باکس */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-[2rem] p-5 flex-1 relative z-0">
           <div className="flex items-center justify-between mb-5 border-b border-slate-200 dark:border-slate-700/50 pb-4">
             <div className="flex items-center gap-3">
               <div className="p-2.5 bg-pink-500/10 rounded-xl border border-pink-500/20"><Package className="w-5 h-5 text-pink-500" /></div>
               <h3 className="text-sm font-black text-slate-800 dark:text-white">ریز هزینه‌های مصرفی و رفاهی</h3>
               <span className="bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 px-3 py-1 rounded-lg text-[10px] font-black border border-pink-200 dark:border-pink-800/50 hidden sm:block">
                 نمایش {displayedExpenses.length} از {filteredExpenses.length} رکورد
               </span>
             </div>
           </div>

           <div className="flex flex-col gap-3 relative z-0">
             <AnimatePresence>
               {displayedExpenses.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-10 opacity-50">
                    <Package className="w-16 h-16 text-slate-400 mb-3" />
                    <p className="text-xs font-bold text-slate-500">موردی با این فیلترها یافت نشد.</p>
                  </motion.div>
               ) : (
                  displayedExpenses.map((exp: any) => {
                    const Icon = getCategoryIcon(exp.category);
                    const isDeducted = exp.isDeducted;
                    const isCalculated = exp.isCalculated !== false; 
                    const isSelected = selectedIds.includes(exp.id);
                    
                    const projName = exp.projectId ? projects.find(p => p.id === exp.projectId)?.title : null;
                    const client = exp.clientId ? clients.find(c => c.id === exp.clientId) : null;
                    const clientName = client ? `${client.name} ${client.lastName}` : null;

                    return (
                      <motion.div key={exp.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
                        onClick={() => toggleSelection(exp.id)}
                        className={`group flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] bg-pink-50 dark:bg-pink-900/20' : !isCalculated ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50 hover:border-slate-300' : isDeducted ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/30 hover:border-rose-300 dark:hover:border-rose-700' : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30 hover:border-emerald-300 dark:hover:border-emerald-700'}`}>
                        
                        <div className="flex items-start lg:items-center gap-4">
                          
                          <div className="pt-2 lg:pt-0">
                            <AnimatedCheckbox checked={isSelected} onChange={() => toggleSelection(exp.id)} />
                          </div>

                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-1 lg:mt-0 ${!isCalculated ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : isDeducted ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-500' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500'}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          
                          <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-black text-slate-800 dark:text-slate-200">{exp.title}</span>
                            
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1"><CalendarClock className="w-3 h-3"/> {exp.date}</span>
                              
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 border ${isCalculated ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700/50 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                {isCalculated ? <Calculator className="w-3 h-3"/> : <Info className="w-3 h-3"/>}
                                {isCalculated ? 'مؤثر در تراز' : 'فقط نمایشی'}
                              </span>

                              {projName && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                  <Building2 className="w-3 h-3"/> {projName}
                                </span>
                              )}
                              {clientName && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                  <UserCircle className="w-3 h-3"/> {clientName}
                                </span>
                              )}
                            </div>

                            {exp.description && <span className="text-[10px] font-bold text-slate-500 mt-0.5">{exp.description}</span>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 border-slate-200/50 dark:border-slate-700/50 pt-3 lg:pt-0 mt-1 lg:mt-0">
                          <div className="flex flex-col text-left">
                            <span className={`text-lg font-black font-mono tracking-widest ${!isCalculated ? 'text-slate-500' : isDeducted ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} dir="ltr">
                              {exp.amount.toLocaleString('fa-IR')} <span className="text-[10px] font-bold opacity-70">تومان</span>
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                              {isDeducted ? 'کسر از حقوق' : 'رفاهی پای کارفرما'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button onClick={(e) => { e.stopPropagation(); setEditEntryId(exp.id); }} className="p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-pink-500 hover:text-white dark:hover:bg-pink-500 shadow-sm" title="ویرایش">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); triggerSingleDelete(exp.id); }} className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 shadow-sm ${!isCalculated ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-rose-500 hover:text-white' : isDeducted ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 hover:bg-rose-500 hover:text-white' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`} title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                      </motion.div>
                    )
                  })
               )}
             </AnimatePresence>
           </div>
        </div>

      </motion.div>

      {/* 💡 منوی انتخاب گروهی (Action Bar) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[999999] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-2xl px-6 py-4 rounded-[2rem] backdrop-blur-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-6 w-[90%] sm:w-auto max-w-[400px]">
              <span className="text-slate-800 dark:text-white font-bold text-sm bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10">{selectedIds.length} مورد انتخاب شده</span>
              <button onClick={triggerDeleteGroup} className="flex items-center justify-center flex-1 gap-2 text-rose-500 hover:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-4 py-2 rounded-xl transition-colors font-bold text-sm"><Trash2 className="w-5 h-5" /> حذف موقت گروهی</button>
            </motion.div>
          )}
        </AnimatePresence>, document.body
      )}

      {/* 💡 صف نوتیفیکیشن‌های حذف (Undo Toast) */}
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
          <AnimatePresence>
            {undoItems.map(undo => (
              <motion.div key={undo.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_15px_40px_rgba(0,0,0,0.15)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto" dir="rtl">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0"><Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-500" /></div>
                <div className="flex flex-col flex-1"><span className="text-sm font-black text-slate-800 dark:text-white">{undo.items.length > 1 ? `${undo.items.length} هزینه در حال حذف` : 'هزینه در حال حذف'}</span><span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">تا چند ثانیه دیگر پاک می‌شود...</span></div>
                <button onClick={() => { setPendingDeleteIds(prev => prev.filter(id => !undo.items.map(i=>i.id).includes(id))); setUndoItems(prev => prev.filter(u => u.id !== undo.id)); toast.success('عملیات لغو شد'); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-black transition-colors shrink-0 shadow-sm">انصراف</button>
                <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} className="absolute bottom-0 right-0 h-1.5 bg-gradient-to-l from-rose-500 to-rose-400" style={{ transformOrigin: 'right' }} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>, document.body
      )}

      {/* مودال ویرایش */}
      {editEntryId && (
        <LaborMiscModal isOpen={!!editEntryId} onClose={() => setEditEntryId(null)} workerId={workerId} editEntryId={editEntryId} />
      )}
    </>
  );
}