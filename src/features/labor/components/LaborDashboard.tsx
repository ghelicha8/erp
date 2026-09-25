import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Star, Phone, Wallet, LayoutGrid, List as ListIcon, 
  ShieldAlert, Plus, ChevronDown, Check, X, Trash2, HardHat, 
  Activity, Briefcase, Users, Calculator, CalendarDays, Layers, 
  CheckCircle2, FileText, Globe, Building2, UserCircle, UserCog
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useLaborStore } from '../../../store/laborStore'; 
import { useClientStore } from '../../../store/clientStore';     
import { useProjectStore } from '../../projects/store/projectStore'; 

import LaborFormModal from './LaborFormModal'; 
import LaborProfile from './LaborProfile'; 

const safeNum = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const parsed = Number(String(val).replace(/\D/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

// ==========================================
// 💡 استایل‌های سراسری برای اسکرول‌بار شیشه‌ای
// ==========================================
const GlassScrollStyles = () => (
  <style>{`
    .glass-scroll::-webkit-scrollbar { width: 4px; }
    .glass-scroll::-webkit-scrollbar-track { background: transparent; }
    .glass-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 10px; }
    .glass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.6); }
    .dark .glass-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.5); }
  `}</style>
);

// ==========================================
// 💡 COMPONENT: Animated Dropdown (Fully Upgraded & Searchable)
// ==========================================
const GlassDropdown = ({ options, value, onChange, icon: Icon, placeholder, className="", searchable=false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find((o:any) => o.id === value);
  const selectedLabel = selectedOption?.label || placeholder;
  const SelectedItemIcon = selectedOption?.icon;

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((o:any) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative z-20 shrink-0 ${className}`} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="h-[52px] w-full bg-white/40 dark:bg-slate-800/50 rounded-2xl border border-white/60 dark:border-slate-600/50 shadow-[0_8px_16px_rgba(0,0,0,0.03)] backdrop-blur-2xl flex items-center justify-between gap-3 px-5 text-sm font-black text-slate-700 dark:text-slate-200 transition-all hover:bg-white/80 dark:hover:bg-slate-700/80 hover:border-indigo-300/50 focus:ring-2 focus:ring-indigo-500/50"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {SelectedItemIcon ? <SelectedItemIcon className="w-4 h-4 text-indigo-500 shrink-0" /> : (Icon && <Icon className="w-4 h-4 text-indigo-500 shrink-0" />)}
          <span className="truncate pt-0.5">{selectedLabel}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-indigo-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-[calc(100%+8px)] w-full min-w-[240px] right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/80 dark:border-slate-700/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100] flex flex-col"
          >
            {searchable && (
              <div className="p-2 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="relative">
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="جستجو..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-8 pl-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 focus:ring-1 ring-indigo-500/20 text-slate-700 dark:text-slate-200 transition-all shadow-inner"
                  />
                </div>
              </div>
            )}
            <div className="max-h-60 overflow-y-auto glass-scroll py-2">
              {filteredOptions.length > 0 ? filteredOptions.map((option: any) => {
                const OptIcon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }}
                    className={`w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold transition-all relative overflow-hidden group ${value === option.id ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <div className="flex items-center gap-2.5 truncate w-full text-right relative z-10">
                      {OptIcon && <OptIcon className={`w-4 h-4 shrink-0 ${value === option.id ? 'text-indigo-500' : 'text-slate-400 group-hover:text-indigo-400'}`} />}
                      <span className="truncate pt-0.5">{option.label}</span>
                    </div>
                    {value === option.id && <Check className="w-4 h-4 relative z-10 drop-shadow-sm shrink-0" />}
                  </button>
                )
              }) : (
                <div className="py-6 text-center flex flex-col items-center justify-center text-slate-400">
                  <Search className="w-6 h-6 mb-2 opacity-50" />
                  <span className="text-xs font-bold">موردی یافت نشد!</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 💡 COMPONENT: Neon Search Wrapper
// ==========================================
const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

// ==========================================
// 💡 COMPONENT: Worker Card
// ==========================================
const WorkerCard = ({ worker, onTogglePin, onDelete, onClick }: { worker: any, onTogglePin: (id: string) => void, onDelete: (id: string) => void, onClick: () => void }) => {
  return (
    <motion.div 
      layout="position" 
      onClick={onClick} 
      transition={{ layout: { type: "spring", stiffness: 400, damping: 30, mass: 0.8 }, opacity: { duration: 0.2 } }}
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
      className={`relative backdrop-blur-2xl border rounded-[2rem] p-6 transition-colors duration-300 group overflow-hidden cursor-pointer ${
        worker.isPinned 
          ? 'bg-white/70 dark:bg-slate-800/70 border-amber-400/60 dark:border-amber-500/60 shadow-[0_15px_40px_rgba(245,158,11,0.2)]' 
          : 'bg-white/50 dark:bg-slate-900/50 border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:border-indigo-300/50'
      }`}
    >
      {worker.isPinned && (
        <motion.div 
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.25, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/20 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none" 
        />
      )}

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            {worker.profilePhoto ? (
              <img src={worker.profilePhoto} alt={worker.name} className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-700" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg border-2 border-white/80 dark:border-slate-700">
                {(worker.name || '؟').substring(0, 1)}{(worker.lastName || '').substring(0, 1)}
              </div>
            )}
            <div className={`absolute -bottom-2 -right-2 rounded-lg px-1.5 py-0.5 shadow-md border border-white dark:border-slate-800 flex items-center gap-0.5 text-[9px] font-black text-white ${worker.status === 'ACTIVE' ? 'bg-emerald-500' : worker.status === 'BLACKLISTED' ? 'bg-rose-500' : 'bg-slate-500'}`}>
              {worker.status === 'ACTIVE' ? 'فعال' : worker.status === 'BLACKLISTED' ? 'لیست سیاه' : 'غیرفعال'}
            </div>
          </div>
          
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {worker.name} <span className="text-indigo-600 dark:text-indigo-400">{worker.lastName}</span>
            </h3>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/50 dark:border-slate-600 shadow-sm">
                <span dir="ltr" className="tracking-widest">{worker.phone1 || 'ثبت نشده'}</span>
              </span>
              {worker.phone1 && (
                <div className="relative group/tooltip flex items-center">
                  <a href={`tel:${worker.phone1}`} onClick={(e)=>e.stopPropagation()} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 rounded-md transition-colors shadow-sm cursor-pointer z-20">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-max bg-slate-800 dark:bg-white text-white dark:text-slate-800 text-[10px] font-bold px-2.5 py-1.5 rounded-lg opacity-0 translate-y-1 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none shadow-xl z-50">
                    تماس مستقیم
                    <div className="absolute top-full right-1/2 translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-white"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 z-20">
          <div className="relative group/del flex items-center">
            <motion.button 
              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onDelete(worker.id); }} 
              className="relative p-2 rounded-xl transition-all text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-5 h-5 transition-all" />
            </motion.button>
            <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-max bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg opacity-0 translate-y-1 group-hover/del:opacity-100 group-hover/del:translate-y-0 transition-all pointer-events-none shadow-xl z-50">
              حذف پرسنل
              <div className="absolute top-full right-1/2 translate-x-1/2 border-4 border-transparent border-t-rose-600"></div>
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onTogglePin(worker.id); }} 
            className="relative p-2 rounded-xl transition-all cursor-pointer"
          >
            {worker.isPinned && (
              <motion.div animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.5, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-amber-400/80 blur-[10px] rounded-full z-0" />
            )}
            <motion.div animate={worker.isPinned ? { rotate: 360 } : { rotate: 0 }} transition={worker.isPinned ? { duration: 8, repeat: Infinity, ease: "linear" } : { duration: 0.3 }} className="relative z-10">
              <Star className={`w-6 h-6 transition-all duration-300 ${worker.isPinned ? 'fill-amber-300 text-amber-100 drop-shadow-[0_0_12px_rgba(251,191,36,1)]' : 'text-slate-300 hover:text-amber-400 drop-shadow-sm'}`} />
            </motion.div>
          </motion.button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2 mb-2 relative z-10">
        {worker.mappedSpecialties.slice(0, 3).map((spec: any) => (
          <span key={spec.id} className="px-2 py-1 rounded-md bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-600 text-[10px] font-black text-slate-600 dark:text-slate-300 shadow-sm flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-indigo-500"/> {spec.name}
          </span>
        ))}
        {worker.mappedSpecialties.length > 3 && (
          <span className="px-2 py-1 rounded-md bg-slate-100/50 dark:bg-slate-700/50 border border-slate-200/50 dark:border-slate-600 text-[10px] font-black text-slate-500">
            +{worker.mappedSpecialties.length - 3}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/50 relative z-10">
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-xl border border-white/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-bold text-slate-500 block mb-1">کارکرد ثبت شده</span>
          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <Activity className="w-4 h-4" /> {worker.logCount} <span className="text-[10px] font-bold">رکورد</span>
          </span>
        </div>
        
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-xl border border-white/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-bold text-slate-500 block mb-1">وضعیت حساب</span>
          <span className={`text-sm font-black flex items-center gap-1 ${worker.balance > 0 ? 'text-amber-600 dark:text-amber-400' : worker.balance < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
            <Wallet className="w-4 h-4" /> {Math.abs(worker.balance).toLocaleString('fa-IR')} <span className="text-[10px] opacity-80 font-bold">تومان</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const SORT_OPTIONS = [
  { id: 'ALPHABETICAL', label: 'حروف الفبا (اولویت فامیلی)' },
  { id: 'LAST_ACTIVE', label: 'آخرین حضور در کارگاه' },
  { id: 'MOST_WORK', label: 'بیشترین تعداد کارکرد' },
  { id: 'MAX_DEBT', label: 'بیشترین طلبکاری از ما' }
];

// ==========================================
// 💡 MAIN DASHBOARD COMPONENT
// ==========================================
export default function LaborDashboard() {
  const { workers, logs, specialtyTags, togglePinWorker, removeWorkers } = useLaborStore();
  const { clients } = useClientStore();   
  const { projects } = useProjectStore(); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0].id);
  const [specialtyFilter, setSpecialtyFilter] = useState('ALL');

  // 💡 استیت‌های فیلتر (تفکیک کامل پروژه و کارفرما)
  const [yearFilter, setYearFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const [undoItems, setUndoItems] = useState<{ id: string, items: string[], expireAt: number }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, specialtyFilter, sortBy]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            expired.forEach(u => removeWorkers(u.items));
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e=>e.items).includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [removeWorkers]);

  const triggerDelete = (ids: string[]) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: ids, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...ids]);
  };

  // 💡 آپشن‌های فیلتر (مجهز به آیکون‌های گرافیکی و حذف undefined)
  const currentYear = moment().jYear();
  const yearOptions = [
    { id: 'ALL', label: 'تمام سال‌ها', icon: Globe },
    { id: currentYear.toString(), label: `سال ${currentYear}`, icon: CalendarDays },
    { id: (currentYear - 1).toString(), label: `سال ${currentYear - 1}`, icon: CalendarDays },
  ];

  const projectOptions = useMemo(() => [
    { id: 'ALL', label: 'همه پروژه‌ها', icon: Globe },
    { id: 'FREE', label: 'کارهای آزاد (بدون پروژه)', icon: Activity },
    ...(projects || []).map(p => ({ id: p.id, label: p.title || p.name || 'بدون عنوان', icon: Building2 }))
  ], [projects]);

  const clientOptions = useMemo(() => [
    { id: 'ALL', label: 'همه کارفرماها', icon: Globe },
    { id: 'FREE', label: 'کارهای آزاد (بدون کارفرما)', icon: Activity },
    ...(clients || []).map(c => ({ id: c.id, label: `${c.name || ''} ${c.lastName || ''}`.trim(), icon: UserCircle }))
  ], [clients]);

  const specialtyOptions = useMemo(() => [
    { id: 'ALL', label: 'تمامی تخصص‌ها' },
    ...(specialtyTags || []).map(t => ({ id: t.id, label: t.name }))
  ], [specialtyTags]);

  const enrichedWorkers = useMemo(() => {
    return (workers || []).map(worker => {
      const workerLogs = (logs || []).filter(l => l.workerId === worker.id);
      let totalEarned = 0; 
      let totalPaid = 0;   
      workerLogs.forEach(log => {
        totalEarned += (log.internalCost || 0);
        totalPaid += (log.advancePayment || 0) + (log.loanDeduction || 0);
      });
      const safeSpecialtyIds = worker.specialtyIds || [];
      const mappedSpecialties = safeSpecialtyIds.map(id => specialtyTags.find(t => t.id === id)).filter(Boolean);

      return { ...worker, totalEarned, totalPaid, balance: totalEarned - totalPaid, logCount: workerLogs.length, mappedSpecialties };
    });
  }, [workers, logs, specialtyTags]);

  const processedWorkers = useMemo(() => {
    let result = enrichedWorkers.filter(w => !pendingDeleteIds.includes(w.id));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w => 
        (w.name || '').toLowerCase().includes(q) || 
        (w.lastName || '').toLowerCase().includes(q) ||
        (w.phone1 || '').includes(q) ||
        w.mappedSpecialties.some((s:any) => (s.name || '').toLowerCase().includes(q))
      );
    }

    if (specialtyFilter !== 'ALL') {
      result = result.filter(w => (w.specialtyIds || []).includes(specialtyFilter));
    }

    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      if (sortBy === 'ALPHABETICAL') {
        const lastCmp = (a.lastName || '').localeCompare(b.lastName || '', 'fa');
        return lastCmp !== 0 ? lastCmp : (a.name || '').localeCompare(b.name || '', 'fa');
      }
      if (sortBy === 'LAST_ACTIVE') return (b.lastActiveDate || '').localeCompare(a.lastActiveDate || '');
      if (sortBy === 'MOST_WORK') return b.logCount - a.logCount;
      if (sortBy === 'MAX_DEBT') return b.balance - a.balance; 
      return 0;
    });

    return result;
  }, [enrichedWorkers, searchQuery, sortBy, specialtyFilter, pendingDeleteIds]);

  const totalPages = Math.ceil(processedWorkers.length / itemsPerPage);
  const currentTableData = processedWorkers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 💡 محاسبه آمار KPIها بر اساس فیلترهای جدید (پروژه و کارفرما کاملاً تفکیک شدن)
  const kpiStats = useMemo(() => {
    const today = moment().format('jYYYY/jMM/jDD');
    let totalLaborCost = 0;
    let totalArbitrageProfit = 0;
    let presentTodayCount = 0;
    const activeWorkersInContext = new Set();
    
    const filteredLogs = (logs || []).filter(log => {
        if (yearFilter !== 'ALL' && !(log.date || '').startsWith(yearFilter)) return false;
        
        if (projectFilter !== 'ALL') {
            if (projectFilter === 'FREE' && log.projectId && log.projectId !== 'FREE') return false;
            if (projectFilter !== 'FREE' && log.projectId !== projectFilter) return false;
        }

        if (clientFilter !== 'ALL') {
            const proj = (projects || []).find(p => p.id === log.projectId);
            const logClientId = log.clientId || (proj && proj.clientId);
            if (clientFilter === 'FREE' && logClientId && logClientId !== 'FREE') return false;
            if (clientFilter !== 'FREE' && logClientId !== clientFilter) return false;
        }
        return true;
    });

    filteredLogs.forEach(log => {
        totalLaborCost += (safeNum(log.internalCost) || 0);
        totalArbitrageProfit += safeNum(log.hiddenProfit);
        
        const logDate = log.date || '';
        if (logDate === today && log.attendance === 'PRESENT') {
            presentTodayCount++;
        }
        activeWorkersInContext.add(log.workerId);
    });

    const totalDebt = enrichedWorkers.filter(w => w.balance < 0).reduce((sum, w) => sum + Math.abs(w.balance), 0);
    
    return {
        activeWorkers: projectFilter === 'ALL' && clientFilter === 'ALL' && yearFilter === 'ALL' ? (workers || []).filter(w => w.status === 'ACTIVE').length : activeWorkersInContext.size,
        presentToday: presentTodayCount,
        totalLaborCost,
        totalArbitrageProfit,
        totalDebt
    };
  }, [logs, workers, enrichedWorkers, yearFilter, projectFilter, clientFilter, projects]);

  return (
    <div className="w-full relative min-h-screen">
      <GlassScrollStyles /> {/* تزریق استایل‌های اسکرول‌بار شیشه‌ای */}
      <AnimatePresence mode="wait">
        
        {selectedWorkerId ? (
          <LaborProfile key="profile-view" workerId={selectedWorkerId} onBack={() => setSelectedWorkerId(null)} />
        ) : (
          
          <motion.div
            key="list-view"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full space-y-6 pb-24"
          >
            <div className="flex flex-col xl:flex-row items-center justify-between gap-5 bg-white/20 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] px-6 py-5 z-50 relative overflow-visible">
              <div className="flex items-center gap-4 w-full xl:w-auto">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-[0_0_25px_rgba(99,102,241,0.5)]">
                  <HardHat className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-indigo-800 dark:from-white dark:to-indigo-300 drop-shadow-sm">نیروی کار و پرسنل</h2>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">مدیریت هوشمند نیروی کار، تخصص‌ها و آربیتراژ</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-4 w-full">
                <NeonSearchWrapper className="flex-1 w-full xl:w-auto min-w-[200px] h-[52px]">
                  <Search className="w-5 h-5 text-slate-400 shrink-0" />
                  <input placeholder="جستجو در نام، موبایل یا تخصص..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 transition-colors placeholder:text-slate-500" />
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4 text-slate-500 dark:text-slate-400" /></button>}
                </NeonSearchWrapper>

                {/* 💡 فیلترهای بالا، الان به سرچ مجهز شدن */}
                <GlassDropdown options={specialtyOptions} value={specialtyFilter} onChange={setSpecialtyFilter} icon={Briefcase} placeholder="تخصص‌ها" className="w-full md:w-[180px]" searchable={true} />
                <GlassDropdown options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} icon={LayoutGrid} placeholder="مرتب‌سازی" className="w-full md:w-[180px]" />

                <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1.5 rounded-2xl shadow-inner border border-white/50 dark:border-slate-700/50 shrink-0 h-[52px] z-20">
                  <button onClick={() => setViewMode('GRID')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-5 h-5" /></button>
                  <button onClick={() => setViewMode('LIST')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}><ListIcon className="w-5 h-5" /></button>
                </div>

                <motion.button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsModalOpen(true); }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  className="h-[52px] px-7 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(16,185,129,0.4)] border-t-2 border-emerald-300/50 transition-all shrink-0 w-full md:w-auto relative overflow-hidden group z-20"
                >
                  <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                  <Plus className="w-5 h-5 relative z-10"/> <span className="relative z-10">نیروی جدید</span>
                </motion.button>
              </div>
            </div>

            {/* 💡 بخش فیلترهای آماری (با آیکون‌های گرافیکی و سرچ‌باکس و تفکیک کامل) */}
            <div className="flex flex-col lg:flex-row justify-between items-start md:items-center gap-4 z-[60] relative mt-6 mb-4 px-1">
               <div className="flex items-center gap-2 px-2 shrink-0">
                 <Activity className="w-5 h-5 text-indigo-500 drop-shadow-md" />
                 <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 drop-shadow-sm">داشبورد مالی و کارکرد کل سیستم</h3>
               </div>
               <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full lg:w-auto">
                 <GlassDropdown options={yearOptions} value={yearFilter} onChange={setYearFilter} placeholder="سال مالی" icon={CalendarDays} className="w-full sm:w-[150px]" />
                 <GlassDropdown options={projectOptions} value={projectFilter} onChange={setProjectFilter} placeholder="فیلتر پروژه‌ها" icon={Layers} searchable={true} className="w-full sm:w-[190px]" />
                 <GlassDropdown options={clientOptions} value={clientFilter} onChange={setClientFilter} placeholder="فیلتر کارفرما" icon={UserCog} searchable={true} className="w-full sm:w-[190px]" />
               </div>
            </div>

            {/* نوار آماری */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 z-40 relative">
              <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 p-4 rounded-2xl flex flex-col justify-center gap-2 shadow-sm transition-all hover:bg-white/60">
                <div className="flex items-center gap-2 text-slate-500">
                   <Users className="w-4 h-4 text-indigo-500" />
                   <span className="text-[10px] font-bold">پرسنل درگیر</span>
                </div>
                <span className="text-lg font-black text-slate-800 dark:text-white">{kpiStats.activeWorkers} <span className="text-[10px] opacity-70">نفر</span></span>
              </div>

              <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 p-4 rounded-2xl flex flex-col justify-center gap-2 shadow-sm transition-all hover:bg-white/60">
                <div className="flex items-center gap-2 text-slate-500">
                   <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                   <span className="text-[10px] font-bold">حاضرین امروز</span>
                </div>
                <span className="text-lg font-black text-slate-800 dark:text-white">{kpiStats.presentToday} <span className="text-[10px] opacity-70">نفر</span></span>
              </div>

              <div className="bg-indigo-50/80 dark:bg-indigo-900/30 backdrop-blur-xl border border-indigo-200/50 dark:border-indigo-700/50 p-4 rounded-2xl flex flex-col justify-center gap-2 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl"></div>
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                   <FileText className="w-4 h-4" />
                   <span className="text-[10px] font-bold">مجموع هزینه نیروی کار</span>
                </div>
                <span className="text-lg font-black text-indigo-700 dark:text-indigo-300 font-mono" dir="ltr">{kpiStats.totalLaborCost.toLocaleString('fa-IR')} <span className="text-[10px] font-bold opacity-80">تومان</span></span>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-2xl flex flex-col justify-center gap-2 shadow-[0_10px_20px_rgba(99,102,241,0.2)] text-white relative overflow-hidden transition-all hover:shadow-[0_10px_30px_rgba(99,102,241,0.4)]">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/20 rounded-full blur-xl"></div>
                <div className="flex items-center gap-2 text-indigo-100">
                   <Calculator className="w-4 h-4" />
                   <span className="text-[10px] font-bold">سود خالص آربیتراژ</span>
                </div>
                <span className="text-lg font-black drop-shadow-sm font-mono" dir="ltr">{kpiStats.totalArbitrageProfit.toLocaleString('fa-IR')} <span className="text-[10px] font-bold opacity-90">تومان</span></span>
              </div>

              <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 p-4 rounded-2xl flex flex-col justify-center gap-2 shadow-sm transition-all hover:bg-white/60">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                   <Wallet className="w-4 h-4" />
                   <span className="text-[10px] font-bold">بدهی کل به پرسنل</span>
                </div>
                <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono" dir="ltr">{kpiStats.totalDebt.toLocaleString('fa-IR')} <span className="text-[10px] font-bold opacity-80">تومان</span></span>
              </div>
            </div>

            {processedWorkers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white/20 dark:bg-slate-900/20 backdrop-blur-3xl rounded-[3rem] border-2 border-dashed border-indigo-200/50 dark:border-slate-700">
                <ShieldAlert className="w-24 h-24 text-indigo-300 dark:text-indigo-900/50 mb-6 drop-shadow-xl" />
                <h3 className="text-2xl font-black text-slate-700 dark:text-slate-200">هیچ پرسنلی یافت نشد!</h3>
                <p className="text-base font-bold text-slate-400 mt-2">جستجوی خود را تغییر دهید یا یک نیروی جدید ثبت کنید.</p>
              </div>
            ) : (
              <motion.div layout className={`grid gap-6 ${viewMode === 'GRID' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                <AnimatePresence>
                  {currentTableData.map(worker => (
                    <WorkerCard 
                      key={worker.id} 
                      worker={worker}
                      onTogglePin={togglePinWorker} 
                      onDelete={(id) => triggerDelete([id])}
                      onClick={() => setSelectedWorkerId(worker.id)} 
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-8 pb-4">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p=>p-1)} className="px-4 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-all hover:bg-white dark:hover:bg-slate-700 shadow-sm border border-white/50 dark:border-slate-600">قبلی</button>
                <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl font-black text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  صفحه {currentPage} از {totalPages}
                </div>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p=>p+1)} className="px-4 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-all hover:bg-white dark:hover:bg-slate-700 shadow-sm border border-white/50 dark:border-slate-600">بعدی</button>
              </div>
            )}

            {typeof document !== 'undefined' && createPortal(
              <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
                <AnimatePresence>
                  {undoItems.map(undo => (
                    <motion.div 
                      key={undo.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                      className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto"
                      dir="rtl"
                    >
                      <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0"><Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-500" /></div>
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-black text-slate-800 dark:text-white">{undo.items.length > 1 ? `${undo.items.length} پرسنل در حال حذف` : 'پرسنل در حال حذف'}</span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">تا چند ثانیه دیگر پاک می‌شود...</span>
                      </div>
                      <button onClick={() => { setPendingDeleteIds(prev => prev.filter(id => !undo.items.includes(id))); setUndoItems(prev => prev.filter(u => u.id !== undo.id)); toast.success('عملیات لغو شد'); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-black transition-colors shrink-0 shadow-sm cursor-pointer">انصراف</button>
                      <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} className="absolute bottom-0 right-0 h-1 bg-rose-500" style={{ transformOrigin: 'right' }} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>, document.body
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {isModalOpen && <LaborFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}