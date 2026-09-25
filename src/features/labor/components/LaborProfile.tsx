import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Phone, Wallet, Layers, Activity, 
  BookOpen, ShieldAlert, Edit2, CalendarDays, CheckCircle2, 
  ChevronDown, Check, Briefcase, CalendarClock, Coffee, PieChart, 
  FileDown, FileUp, ChevronUp, HandCoins, CalendarPlus, FileSignature, 
  PackagePlus, ScrollText, UserCog, Download, Building2, UserCircle, Globe, Search
} from 'lucide-react';
import moment from 'moment-jalaali';

import { useLaborStore } from '../../../store/laborStore'; 
import { useClientStore } from '../../../store/clientStore';
import { useProjectStore } from '../../projects/store/projectStore'; 

import LaborFormModal from './LaborFormModal'; 
import LaborFinanceTab from './LaborFinanceTab';
import LaborPaymentModal from './LaborPaymentModal'; 
import LaborWorkLogsTab from './LaborWorkLogsTab';
import LaborWorkLogModal from './LaborWorkLogModal';
import LaborPriceBookTab from './LaborPriceBookTab';
import LaborPriceBookModal from './LaborPriceBookModal';
import LaborHSETab from './LaborHSETab';
import LaborHSEModal from './LaborHSEModal';
import LaborMiscTab from './LaborMiscTab';
import LaborMiscModal from './LaborMiscModal';

// 💡 ایمپورت‌های جدید برای تب مدیریت ماهانه
import LaborMonthlyTab from './LaborMonthlyTab';
import LaborMonthlyModal from './LaborMonthlyModal';

// 💡 اضافه کردن فایل جدید گزارشات و آمار
import LaborAnalyticsTab from './LaborAnalyticsTab';

// 💡 ایمپورت فایل‌های مادرِ ایمپورت و اکسپورت با مسیر اصلاح شده به پوشه shared
import ExportBuilder from '../../../components/shared/ExportBuilder';
import ImportBuilder from '../../../components/shared/ImportBuilder';

const safeNum = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const parsed = Number(String(val).replace(/\D/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

const GlassScrollStyles = () => (
  <style>{`
    .glass-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
    .glass-scroll::-webkit-scrollbar-track { background: transparent; }
    .glass-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 10px; }
    .glass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.6); }
  `}</style>
);

const AnimatedTooltip = ({ children, content }: { children: React.ReactNode, content: string }) => {
  return (
    <div className="relative group/tooltip flex items-center justify-center">
      {children}
      <div className="absolute bottom-full mb-2.5 w-max bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-800 text-[10px] font-black px-3 py-2 rounded-xl opacity-0 translate-y-3 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all duration-300 pointer-events-none shadow-[0_10px_30px_rgba(0,0,0,0.2)] z-50 scale-95 group-hover/tooltip:scale-100 origin-bottom">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800 dark:border-t-slate-100"></div>
      </div>
    </div>
  );
};

const GlassSelect = ({ value, onChange, options, placeholder, icon: Icon, className = '', searchable = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((o:any) => o.id === value);
  const selectedLabel = selectedOption?.label || placeholder;
  const SelectedItemIcon = selectedOption?.icon;

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((o:any) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
  };

  const openDropdown = () => { updatePosition(); setIsOpen(true); };

  useEffect(() => {
    if (isOpen) { window.addEventListener('scroll', updatePosition, true); window.addEventListener('resize', updatePosition); }
    return () => { window.removeEventListener('scroll', updatePosition, true); window.removeEventListener('resize', updatePosition); };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(event.target as Node)) {
        const portalEl = document.getElementById('portal-dropdown-profile');
        if (portalEl && !portalEl.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchTerm(''); 
        }
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const containerVariants = {
    hidden: { opacity: 0, y: -5, transition: { staggerChildren: 0.02, staggerDirection: -1 } },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.02, delayChildren: 0.05 } }
  };
  const itemVariants = { hidden: { opacity: 0, x: -5 }, visible: { opacity: 1, x: 0 } };

  return (
    <>
      <button 
        ref={btnRef} onClick={() => isOpen ? setIsOpen(false) : openDropdown()} 
        className={`relative bg-white/40 dark:bg-slate-800/40 rounded-full border border-white/60 dark:border-slate-600/40 shadow-sm backdrop-blur-md flex items-center justify-between gap-3 px-4 h-10 text-xs font-black text-slate-700 dark:text-slate-200 transition-all hover:bg-white/70 dark:hover:bg-slate-700/60 hover:shadow-md hover:border-indigo-300/50 ${className}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {SelectedItemIcon ? <SelectedItemIcon className="w-4 h-4 text-indigo-500 shrink-0" /> : (Icon && <Icon className="w-4 h-4 text-indigo-500 shrink-0" />)}
          <span className="truncate pt-0.5">{selectedLabel}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-indigo-500 opacity-70 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div id="portal-dropdown-profile" style={{ top: coords.top, left: coords.left, width: coords.width, minWidth: '240px', position: 'fixed', zIndex: 999999 }}>
          <motion.div 
            variants={containerVariants} initial="hidden" animate="visible" exit="hidden"
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col"
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

            <div className="max-h-56 overflow-y-auto glass-scroll p-1.5">
              {filteredOptions.length > 0 ? filteredOptions.map((option: any) => {
                 const OptIcon = option.icon;
                 return (
                  <motion.button 
                    variants={itemVariants} key={option.id} onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }} 
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${value === option.id ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:pl-4'}`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {OptIcon && <OptIcon className={`w-3.5 h-3.5 shrink-0 ${value === option.id ? 'text-indigo-500' : 'text-slate-400 group-hover:text-indigo-400'}`} />}
                      <span className="truncate pt-0.5">{option.label}</span>
                    </div>
                    {value === option.id && <Check className="w-3.5 h-3.5 text-indigo-500 drop-shadow-sm shrink-0" />}
                  </motion.button>
                 );
              }) : (
                <div className="py-4 text-center text-xs font-bold text-slate-400">موردی یافت نشد!</div>
              )}
            </div>
          </motion.div>
        </div>, document.body
      )}
    </>
  );
};

const PROFILE_TABS = [
  { id: 'finance', label: 'تاریخچه پرداختی‌ها', icon: Wallet, color: 'text-emerald-500', activeClass: 'text-emerald-600 dark:text-emerald-400', btnText: 'ثبت پرداختی / مساعده', btnIcon: HandCoins, btnColor: 'from-emerald-500 to-teal-500', borderColor: 'border-emerald-400/50' },
  { id: 'work_logs', label: 'تاریخچه کارکرد', icon: Activity, color: 'text-indigo-500', activeClass: 'text-indigo-600 dark:text-indigo-400', btnText: 'ثبت کارکرد روزانه', btnIcon: CalendarPlus, btnColor: 'from-indigo-500 to-purple-500', borderColor: 'border-indigo-400/50' },
  { id: 'monthly', label: 'مدیریت ماهانه', icon: CalendarClock, color: 'text-cyan-500', activeClass: 'text-cyan-600 dark:text-cyan-400', btnText: 'ثبت/تمدید قرارداد', btnIcon: FileSignature, btnColor: 'from-cyan-500 to-blue-500', borderColor: 'border-cyan-400/50' },
  { id: 'misc', label: 'متفرقه (رفاهی و مصرفی)', icon: Coffee, color: 'text-pink-500', activeClass: 'text-pink-600 dark:text-pink-400', btnText: 'ثبت هزینه متفرقه', btnIcon: PackagePlus, btnColor: 'from-pink-500 to-rose-500', borderColor: 'border-pink-400/50' },
  { id: 'price_book', label: 'تعرفه‌ها و قراردادها', icon: BookOpen, color: 'text-purple-500', activeClass: 'text-purple-600 dark:text-purple-400', btnText: 'ثبت تعرفه / قرارداد جدید', btnIcon: ScrollText, btnColor: 'from-fuchsia-500 to-purple-600', borderColor: 'border-purple-400/50' },
  { id: 'hse_info', label: 'اطلاعات و ایمنی', icon: ShieldAlert, color: 'text-amber-500', activeClass: 'text-amber-600 dark:text-amber-400', btnText: 'بروزرسانی حراست', btnIcon: UserCog, btnColor: 'from-amber-500 to-orange-500', borderColor: 'border-amber-400/50' },
  { id: 'analytics', label: 'گزارشات و آمار', icon: PieChart, color: 'text-blue-500', activeClass: 'text-blue-600 dark:text-blue-400', btnText: 'خروجی گزارش', btnIcon: Download, btnColor: 'from-blue-600 to-indigo-600', borderColor: 'border-blue-400/50' },
];

export default function LaborProfile({ workerId, onBack }: { workerId: string, onBack: () => void }) {
  const { workers, logs, specialtyTags } = useLaborStore();
  const { clients } = useClientStore();
  const { projects } = useProjectStore();
  const worker = workers.find(w => w.id === workerId);
  
  const [activeTab, setActiveTab] = useState('finance');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false); 

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isWorkLogModalOpen, setIsWorkLogModalOpen] = useState(false);
  const [isPriceBookModalOpen, setIsPriceBookModalOpen] = useState(false);
  const [isHseModalOpen, setIsHseModalOpen] = useState(false);
  const [isMiscModalOpen, setIsMiscModalOpen] = useState(false);
  
  // 💡 استیت جدید برای پاپ‌آپ دوره‌های ماهانه
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);

  // 💡 استیت‌های جدید ایمپورت و اکسپورت
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const currentYear = moment().jYear();
  const [yearFilter, setYearFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');

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

  const stats = useMemo(() => {
    const filteredLogs = (logs || []).filter(l => {
        if (l.workerId !== workerId) return false;
        
        if (yearFilter !== 'ALL' && !(l.date || '').startsWith(yearFilter)) return false;
        
        if (projectFilter !== 'ALL') {
            if (projectFilter === 'FREE' && l.projectId && l.projectId !== 'FREE') return false;
            if (projectFilter !== 'FREE' && l.projectId !== projectFilter) return false;
        }

        if (clientFilter !== 'ALL') {
            const proj = (projects || []).find(p => p.id === l.projectId);
            const logClientId = l.clientId || (proj && proj.clientId);

            if (clientFilter === 'FREE' && logClientId && logClientId !== 'FREE') return false;
            if (clientFilter !== 'FREE' && logClientId !== clientFilter) return false;
        }

        return true;
    });
    
    let totalEarned = 0; 
    let totalPaid = 0;   
    
    filteredLogs.forEach(log => {
      totalEarned += (safeNum(log.internalCost) || 0);
      totalPaid += safeNum(log.advancePayment) || 0;
      totalPaid += safeNum(log.loanDeduction) || 0;
    });

    const balance = totalEarned - totalPaid; 

    return { logCount: filteredLogs.length, totalEarned, totalPaid, balance };
  }, [logs, workerId, yearFilter, projectFilter, clientFilter, projects]);

  if (!worker) return null;

  const mappedSpecialties = (worker.specialtyIds || []).map(id => specialtyTags.find(t => t.id === id)).filter(Boolean);
  const isCreditor = stats.balance >= 0; 
  const activeTabData = PROFILE_TABS.find(t => t.id === activeTab) || PROFILE_TABS[0];

  return (
    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.3, ease: "easeOut" }} className="w-full flex flex-col gap-6 pb-24 h-auto min-h-full relative">
      <GlassScrollStyles /> 

      <div className="sticky top-4 z-[100] flex flex-col md:flex-row items-center justify-between gap-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/80 dark:border-slate-700/80 shadow-[0_15px_40px_rgba(0,0,0,0.08)] rounded-[2.5rem] px-6 py-5">
        
        <div className="flex items-start md:items-center gap-4 w-full md:w-auto">
          <button onClick={onBack} className="flex items-center justify-center p-3.5 mt-1 md:mt-0 rounded-[1.25rem] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-inner border border-slate-200 dark:border-slate-600 transition-all shrink-0 group" title="بازگشت به لیست">
            <ArrowRight className="w-6 h-6 text-slate-700 dark:text-slate-300 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="relative shrink-0 ml-1">
            {worker.profilePhoto ? (
              <img src={worker.profilePhoto} alt={worker.name} className="w-[72px] h-[72px] rounded-2xl object-cover shadow-lg border-2 border-white dark:border-slate-700" />
            ) : (
              <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-lg border-2 border-white/80 dark:border-slate-700">
                {(worker.name || '؟').substring(0, 1)}{(worker.lastName || '').substring(0, 1)}
              </div>
            )}
            <div className={`absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 rounded-lg px-1.5 py-0.5 shadow-md border border-slate-100 dark:border-slate-700 flex items-center gap-1 text-[10px] font-black ${worker.status === 'ACTIVE' ? 'text-emerald-500' : 'text-rose-500'}`}>
               {worker.status === 'ACTIVE' ? 'فعال' : 'لیست سیاه'}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <h2 className="text-xl font-black text-slate-800 dark:text-white drop-shadow-sm">
                {worker.name} <span className="text-indigo-600 dark:text-indigo-400">{worker.lastName}</span>
              </h2>
              
              <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <AnimatedTooltip content="ویرایش مشخصات پایه">
                  <button onClick={() => setIsEditModalOpen(true)} className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg transition-all text-indigo-500 hover:scale-110">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </AnimatedTooltip>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600/50 mx-1"/>
                
                {/* 💡 اتصال دکمه اکسپورت با پاس دادن workerId */}
                <AnimatedTooltip content="خروجی گزارش مالی (اکسپورت)">
                  <button onClick={() => setIsExportOpen(true)} className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-lg transition-all text-emerald-500 hover:scale-110">
                    <FileDown className="w-4 h-4" />
                  </button>
                </AnimatedTooltip>
                
                {/* 💡 اتصال دکمه ایمپورت با پاس دادن workerId */}
                <AnimatedTooltip content="ورود اطلاعات از اکسل (ایمپورت)">
                  <button onClick={() => setIsImportOpen(true)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-all text-blue-500 hover:scale-110">
                    <FileUp className="w-4 h-4" />
                  </button>
                </AnimatedTooltip>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/50 dark:border-slate-600 shadow-sm shrink-0">
                <Phone className="w-3.5 h-3.5" /> <span dir="ltr" className="tracking-widest">{worker.phone1 || 'ثبت نشده'}</span>
              </span>
              <div className="flex flex-wrap gap-1 items-center">
                 <AnimatePresence>
                   {mappedSpecialties.slice(0, isTagsExpanded ? mappedSpecialties.length : 2).map((spec: any) => (
                      <motion.span 
                        key={spec.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                        className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-800 flex items-center gap-1"
                      >
                        <Briefcase className="w-3 h-3"/> {spec.name}
                      </motion.span>
                   ))}
                 </AnimatePresence>
                 {mappedSpecialties.length > 2 && (
                   <button 
                     onClick={() => setIsTagsExpanded(!isTagsExpanded)} 
                     className="text-[9px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 transition-colors flex items-center gap-0.5"
                   >
                     {isTagsExpanded ? <><ChevronUp className="w-3 h-3"/> بستن</> : `+${mappedSpecialties.length - 2} تخصص`}
                   </button>
                 )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end w-full md:w-auto shrink-0">
          <AnimatePresence mode="wait">
            <motion.button 
              key={activeTabData.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} 
              onClick={() => {
                if (activeTab === 'finance') setIsPaymentModalOpen(true);
                if (activeTab === 'work_logs') setIsWorkLogModalOpen(true);
                if (activeTab === 'price_book') setIsPriceBookModalOpen(true);
                if (activeTab === 'hse_info') setIsHseModalOpen(true);
                if (activeTab === 'misc') setIsMiscModalOpen(true);
                if (activeTab === 'monthly') setIsMonthlyModalOpen(true);
              }}
              className={`group w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r ${activeTabData.btnColor} text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2.5 border ${activeTabData.borderColor} overflow-hidden relative`}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <activeTabData.btnIcon className="w-5 h-5 relative z-10 group-hover:animate-bounce" />
              <span className="text-sm whitespace-nowrap relative z-10 pt-0.5">{activeTabData.btnText}</span>
            </motion.button>
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full relative z-[80] -mt-2">
        <div className="flex flex-col lg:flex-row justify-between items-end gap-4 mb-3 px-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500 drop-shadow-md" />
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 drop-shadow-sm">داشبورد مالی و کارکرد {worker.name}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto z-[90]">
            <GlassSelect options={yearOptions} value={yearFilter} onChange={setYearFilter} placeholder="سال مالی" icon={CalendarDays} className="w-full lg:w-auto min-w-[130px]" />
            <GlassSelect options={projectOptions} value={projectFilter} onChange={setProjectFilter} placeholder="فیلتر پروژه‌ها" icon={Layers} searchable={true} className="w-full lg:w-auto min-w-[180px]" />
            <GlassSelect options={clientOptions} value={clientFilter} onChange={setClientFilter} placeholder="فیلتر کارفرما" icon={UserCog} searchable={true} className="w-full lg:w-auto min-w-[180px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full">
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-white/80 dark:border-slate-600/40 p-5 flex flex-col justify-between min-h-[120px] shadow-sm transition-all hover:shadow-md">
            <div className="flex justify-between items-center w-full mb-3">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">کل روزهای کارکرد (فیلتر شده)</span>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-500/20 dark:to-indigo-500/10 text-indigo-500 border border-indigo-200 dark:border-indigo-500/30 shadow-inner"><Layers className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-slate-700 dark:text-slate-300 text-left font-mono" dir="ltr">{stats.logCount} <span className="text-sm">رکورد</span></div>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-white/80 dark:border-slate-600/40 p-5 flex flex-col justify-between min-h-[120px] shadow-sm transition-all hover:shadow-md">
            <div className="flex justify-between items-center w-full mb-3">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">مجموع دستمزد ناخالص</span>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-500/20 dark:to-blue-500/10 text-blue-500 border border-blue-200 dark:border-blue-500/30 shadow-inner"><Activity className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-blue-600 dark:text-blue-400 text-left font-mono" dir="ltr">{stats.totalEarned.toLocaleString('fa-IR')}</div>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-white/80 dark:border-slate-600/40 p-5 flex flex-col justify-between min-h-[120px] shadow-sm transition-all hover:shadow-md">
            <div className="flex justify-between items-center w-full mb-3">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">کل پرداختی به نیرو (مساعده/تسویه)</span>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/20 dark:to-emerald-500/10 text-emerald-500 border border-emerald-200 dark:border-emerald-500/30 shadow-inner"><Wallet className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 text-left font-mono" dir="ltr">{stats.totalPaid.toLocaleString('fa-IR')}</div>
          </div>

          <div className={`bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border ${isCreditor ? 'border-amber-400/50 shadow-[0_8px_30px_rgba(245,158,11,0.15)]' : 'border-rose-400/50 shadow-[0_8px_30px_rgba(244,63,94,0.15)]'} p-5 flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.02]`}>
            <div className="flex justify-between items-center w-full mb-3">
              <span className={`text-[11px] font-bold ${isCreditor ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isCreditor ? 'مانده طلب کارگر از ما' : 'اضافه دریافتی (بدهکار به ما)'}
              </span>
              <div className={`p-2.5 rounded-xl shadow-inner ${isCreditor ? 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/10 text-amber-500 border border-amber-200 dark:border-amber-500/30' : 'bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-500/20 dark:to-rose-500/10 text-rose-500 border border-rose-200 dark:border-rose-500/30'}`}><CheckCircle2 className="w-5 h-5" /></div>
            </div>
            <div className={`text-2xl lg:text-3xl font-black text-left font-mono ${isCreditor ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`} dir="ltr">{Math.abs(stats.balance).toLocaleString('fa-IR')}</div>
          </div>
        </div>
      </div>

      <div className="w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl border border-white/60 dark:border-slate-700/50 shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-[1.5rem] p-2.5 z-[90] sticky top-[130px] overflow-x-auto glass-scroll flex items-center gap-2 mt-4 transition-all">
        {PROFILE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-all duration-300 shrink-0 ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-white hover:shadow-sm'}`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeLaborTabIndicator" 
                  transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }} 
                  className="absolute inset-0 bg-gradient-to-b from-white/90 to-white/50 dark:from-slate-700/90 dark:to-slate-800/50 backdrop-blur-xl rounded-xl border border-white dark:border-slate-500 shadow-[0_8px_16px_rgba(0,0,0,0.1),inset_0_4px_8px_rgba(255,255,255,0.8)] dark:shadow-[0_8px_16px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.15)] z-0" 
                />
              )}
              <Icon className={`w-4 h-4 relative z-10 transition-colors duration-300 ${isActive ? tab.activeClass : tab.color}`} />
              <span className="relative z-10 pt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-full flex flex-col h-auto min-h-[400px] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 shadow-xl rounded-[2.5rem] p-4 sm:p-8 z-[70] relative">
        <AnimatePresence mode="wait">

          {activeTab === 'finance' ? (
            <motion.div key="tab-finance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-auto flex flex-col">
              <LaborFinanceTab workerId={worker.id} />
            </motion.div>
          ) : activeTab === 'work_logs' ? (
            <motion.div key="tab-work_logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-auto flex flex-col">
              <LaborWorkLogsTab workerId={worker.id} />
            </motion.div>
          ) : activeTab === 'monthly' ? (
            <motion.div key="tab-monthly" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-auto flex flex-col">
              <LaborMonthlyTab workerId={worker.id} />
            </motion.div>
          ) : activeTab === 'price_book' ? (
            <motion.div key="tab-price_book" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-auto flex flex-col">
              <LaborPriceBookTab workerId={worker.id} />
            </motion.div>
          ) : activeTab === 'hse_info' ? (
            <motion.div key="tab-hse_info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-auto flex flex-col">
              <LaborHSETab workerId={worker.id} />
            </motion.div>
          ) : activeTab === 'misc' ? (
            <motion.div key="tab-misc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-auto flex flex-col">
              <LaborMiscTab workerId={worker.id} />
            </motion.div>
          ) : activeTab === 'analytics' ? (
            <motion.div key="tab-analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-auto flex flex-col">
              <LaborAnalyticsTab workerId={worker.id} />
            </motion.div>
          ) : (
            <motion.div key={`placeholder-${activeTab}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="flex flex-col items-center justify-center w-full h-full text-slate-400 py-10 lg:py-20">
              <div className={`w-24 h-24 bg-white/50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center mb-6 shadow-inner ${activeTabData.color}`}>
                 <activeTabData.icon className="w-10 h-10 opacity-60" />
              </div>
              <h3 className="text-xl font-black text-slate-600 dark:text-slate-300 drop-shadow-sm mb-2">محتوای تب «{activeTabData.label}»</h3>

              {!['monthly', 'misc', 'analytics'].includes(activeTab) && (
                <p className="text-sm font-bold mt-2 text-center max-w-md leading-relaxed opacity-80">جداول و جزئیات این بخش به زودی طراحی و متصل می‌شود.</p>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {isEditModalOpen && <LaborFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} editWorkerId={worker.id} />}
      
      {/* پاپ‌آپ‌های سراسری */}
      {isPaymentModalOpen && <LaborPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} workerId={worker.id} />}
      {isWorkLogModalOpen && <LaborWorkLogModal isOpen={isWorkLogModalOpen} onClose={() => setIsWorkLogModalOpen(false)} workerId={worker.id} />}
      {isPriceBookModalOpen && <LaborPriceBookModal isOpen={isPriceBookModalOpen} onClose={() => setIsPriceBookModalOpen(false)} workerId={worker.id} />}
      {isHseModalOpen && <LaborHSEModal isOpen={isHseModalOpen} onClose={() => setIsHseModalOpen(false)} workerId={worker.id} />}
      {isMiscModalOpen && <LaborMiscModal isOpen={isMiscModalOpen} onClose={() => setIsMiscModalOpen(false)} workerId={worker.id} />}
      {isMonthlyModalOpen && <LaborMonthlyModal isOpen={isMonthlyModalOpen} onClose={() => setIsMonthlyModalOpen(false)} workerId={worker.id} />}
      
      {/* 💡 پاپ‌آپ‌های ایمپورت و اکسپورت همراه با پاس دادن دقیق workerId */}
      <AnimatePresence>
        {isExportOpen && <ExportBuilder context="LABOR" workerId={worker.id} onClose={() => setIsExportOpen(false)} />}
        {isImportOpen && <ImportBuilder context="LABOR" workerId={worker.id} onClose={() => setIsImportOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
