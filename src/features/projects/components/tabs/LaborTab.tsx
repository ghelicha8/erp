import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HardHat, Search, X, Layers, Edit, Trash2, CheckCircle, CalendarDays, List, ChevronRight, ChevronLeft, Plus, User, ShieldCheck, Users, Eye, EyeOff, Copy } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useProjectStore } from '../../store/projectStore';
import { useLaborStore } from '../../../../store/laborStore'; 
import { useBulkSelection } from '../../../../hooks/useBulkSelection';

import GlassDatePicker from '../../../../components/ui/GlassDatePicker';
import GlassSelect from '../../../../components/ui/GlassSelect';

// 💡 ایمپورت پاپ‌آپ‌های یکپارچه از فایل مشترک
import { FloatingUndoToast, BulkSelectionToast } from '../../../../components/ui/SharedLaborUI';

// 💡 آدرس‌دهی دقیق و اصلاح‌شده (۳ لایه برگشت به عقب)
import UniversalLaborModal from '../../../labor/components/UniversalLaborModal';

interface LaborTabProps {
  projectId: string;
}

const useCurrency = () => {
  const [currency] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('erp_currency') || 'تومان';
    }
    return 'تومان';
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
  };

  return { currency, formatCurrency };
};

// 💡 استفاده از چک‌باکس انیمیشنی داینامیک (نارنجی برای روزمزد، سبز برای مستمر)
const AnimatedCheckbox = ({ checked, onChange, theme = 'amber' }: { checked: boolean, onChange: () => void, theme?: 'amber' | 'emerald' }) => {
  const activeClass = theme === 'emerald' 
    ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 border-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-105'
    : 'bg-gradient-to-tr from-amber-500 to-orange-500 border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.4)] scale-105';
    
  const hoverClass = theme === 'emerald' ? 'hover:border-emerald-400' : 'hover:border-amber-400';

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`w-6 h-6 mx-auto rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm ${
        checked 
          ? activeClass 
          : `bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 ${hoverClass}`
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

const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

export default function LaborTab({ projectId }: LaborTabProps) {
  const allProjects = useProjectStore((state) => state.projects);
  const project = useMemo(() => allProjects.find(p => p.id === projectId), [allProjects, projectId]);
  
  // 💡 استخراج workers و updateWorker برای خواندن قراردادهای هوشمند ماهانه
  const { logs, workers, updateWorker, deleteMultipleLogs } = useLaborStore();
  const { currency, formatCurrency } = useCurrency();

  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR' | 'MONTHLY'>('LIST');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('ALL');

  const [hideContractorCost, setHideContractorCost] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<any>(null);
  const [preSelectedDate, setPreSelectedDate] = useState<string | null>(null);

  const [undoItems, setUndoItems] = useState<{ id: string, items: string[], expireAt: number }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const { selectedIds, toggleSelection, clearSelection } = useBulkSelection();

  const [currentMonth, setCurrentMonth] = useState(moment());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const projectLogs = useMemo(() => {
    return logs.filter(l => l.projectId === projectId);
  }, [logs, projectId]);

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

  const handleQuickDuplicate = (record: any) => {
    const duplicatedRecord = { ...record, id: undefined }; 
    setRecordToEdit(duplicatedRecord);
    setPreSelectedDate(record.date); 
    setIsModalOpen(true);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            expired.forEach(u => deleteMultipleLogs(u.items));
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e=>e.items).includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteMultipleLogs]);

  const triggerDelete = (ids: string[]) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: ids, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...ids]);
    clearSelection();
  };

  // 💡 متد یکپارچه برای لغو عملیات حذف شناور
  const handleCancelUndo = (undoId: string, items: string[]) => {
    setPendingDeleteIds(prev => prev.filter(id => !(items || []).includes(id)));
    setUndoItems(prev => prev.filter(u => u.id !== undoId));
    toast.success('عملیات لغو شد');
  };

  const phaseOptions = [
    { value: 'ALL', label: 'تمام فازها' },
    { value: 'GENERAL', label: 'هزینه‌های عمومی (بدون فاز)' },
    ...(project?.phases?.map((p: any) => ({ value: p.id, label: p.name })) || [])
  ];

  const filteredLaborRecords = useMemo(() => {
    return projectLogs
      .filter((r: any) => {
        if (pendingDeleteIds.includes(r.id) || r.paymentType === 'PROJECT_MONTHLY') return false;
        const matchSearch = !searchQuery ? true : (r.workerName?.includes(searchQuery) || r.workType?.includes(searchQuery));
        const matchFrom = dateFrom ? r.date >= dateFrom : true;
        const matchTo = dateTo ? r.date <= dateTo : true;
        
        let matchPhase = true;
        if (selectedPhaseFilter !== 'ALL') {
          if (selectedPhaseFilter === 'GENERAL') matchPhase = !r.phaseId;
          else matchPhase = r.phaseId === selectedPhaseFilter;
        }
        return matchSearch && matchFrom && matchTo && matchPhase;
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.date.localeCompare(a.date));
  }, [projectLogs, searchQuery, dateFrom, dateTo, selectedPhaseFilter, pendingDeleteIds]);

  // 💡 جادوی یکپارچه‌سازی: خواندن قراردادهای هوشمند از پروفایل کارگران و ترکیب با لاگ‌های قدیمی
  const monthlyLaborRecords = useMemo(() => {
    const records: any[] = [];
    
    // ۱. لاگ‌های قدیمی (برای سازگاری با گذشته)
    const legacyLogs = projectLogs.filter((r: any) => r.paymentType === 'PROJECT_MONTHLY' && !pendingDeleteIds.includes(r.id));
    records.push(...legacyLogs);

    // ۲. قراردادهای هوشمند ثبت‌شده در پروفایل کارگران برای این پروژه
    workers.forEach(worker => {
      if (!worker.activeContracts) return;
      worker.activeContracts.forEach(contract => {
        if (contract.projectId === projectId && contract.isActive && !pendingDeleteIds.includes(contract.id)) {
          // محاسبه طول دوره
          let months = 1;
          if (contract.startDate && contract.endDate) {
            const s = moment(contract.startDate, 'jYYYY/jMM/jDD');
            const e = moment(contract.endDate, 'jYYYY/jMM/jDD');
            if (s.isValid() && e.isValid()) {
              months = Math.max(1, Math.round(e.diff(s, 'months', true)));
            }
          }

          records.push({
            id: contract.id,
            isSmartContract: true, // فلگ شناسایی
            workerId: worker.id,
            workerName: `${worker.name} ${worker.lastName}`,
            workType: contract.title || 'قرارداد مستمر',
            phaseId: null, 
            date: `${contract.startDate} تا ${contract.endDate}`,
            quantity: months,
            internalCost: contract.internalMonthlyWage,
            billedCost: contract.billedMonthlyWage,
          });
        }
      });
    });

    // مرتب‌سازی بر اساس تاریخ
    return records.sort((a: any, b: any) => {
      const dateA = a.date.includes(' تا ') ? a.date.split(' تا ')[0] : a.date;
      const dateB = b.date.includes(' تا ') ? b.date.split(' تا ')[0] : b.date;
      return new Date(dateB).getTime() - new Date(dateA).getTime() || dateB.localeCompare(dateA);
    });
  }, [projectLogs, workers, pendingDeleteIds, projectId]);

  const getPhaseName = (phaseId?: string) => {
    if (!phaseId) return null;
    return project?.phases?.find((p: any) => p.id === phaseId)?.name || 'فاز نامشخص';
  };

  const calendarDays = useMemo(() => {
    moment.loadPersian({ usePersianDigits: false, dialect: 'persian-modern' });
    const startOfMonth = currentMonth.clone().startOf('jMonth');
    const daysInMonth = moment.jDaysInMonth(currentMonth.jYear(), currentMonth.jMonth());

    let startDayOfWeek = startOfMonth.day() + 1; 
    if (startDayOfWeek === 7) startDayOfWeek = 0;

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentMonth.jYear()}/${String(currentMonth.jMonth() + 1).padStart(2, '0')}/${String(i).padStart(2, '0')}`;
      const dayRecords = projectLogs.filter((r: any) => r.date === dateStr && r.paymentType !== 'PROJECT_MONTHLY' && !pendingDeleteIds.includes(r.id));
      
      const totalWorkers = new Set(dayRecords.map(r => r.workerId)).size; 
      
      const totalCost = dayRecords.reduce((sum: number, r: any) => {
        const costToUse = hideContractorCost ? (Number(r.billedCost) || Number(r.internalCost) || 0) : (Number(r.internalCost) || 0);
        return sum + costToUse;
      }, 0); 
      
      days.push({ day: i, dateStr, totalWorkers, totalCost, records: dayRecords });
    }
    return days;
  }, [currentMonth, projectLogs, pendingDeleteIds, hideContractorCost]);

  const goToNextMonth = () => setCurrentMonth(currentMonth.clone().add(1, 'jMonth'));
  const goToPrevMonth = () => setCurrentMonth(currentMonth.clone().subtract(1, 'jMonth'));

  if (!project) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6 pb-24">
      
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm rounded-[2rem] px-5 py-4 z-[90] relative">
        <div className="flex flex-wrap items-center justify-between w-full lg:w-auto gap-3">
          
          <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1.5 rounded-2xl gap-1 relative z-10">
            {[
              { id: 'LIST', label: 'نمای لیستی', icon: List, activeColor: 'text-indigo-600 dark:text-indigo-300', bg: 'bg-white dark:bg-slate-700', shadow: 'shadow-md shadow-indigo-500/10' },
              { id: 'CALENDAR', label: 'تقویم کارگاه', icon: CalendarDays, activeColor: 'text-white', bg: 'bg-gradient-to-r from-amber-400 to-orange-500', shadow: 'shadow-lg shadow-orange-500/30' },
              { id: 'MONTHLY', label: 'نیروهای مستمر', icon: Users, activeColor: 'text-white', bg: 'bg-gradient-to-r from-emerald-400 to-teal-500', shadow: 'shadow-lg shadow-emerald-500/30' }
            ].map((tab) => {
              const isActive = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as any)}
                  className={`relative flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-colors duration-300 ${isActive ? tab.activeColor : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="laborTabBubble"
                      className={`absolute inset-0 rounded-xl ${tab.bg} ${tab.shadow} -z-10`}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <tab.icon className="w-4 h-4 relative z-10" /> 
                  <span className="relative z-10">{tab.label}</span>
                </button>
              )
            })}
          </div>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setHideContractorCost(!hideContractorCost)}
            className={`p-3 rounded-2xl transition-all duration-300 border flex items-center justify-center shadow-sm relative overflow-hidden group ${
              hideContractorCost 
                ? 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white border-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.4)]' 
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-white'
            }`}
            title={hideContractorCost ? 'حالت امن کارفرما فعال است (مخفی‌سازی هزینه ما)' : 'کلیک برای مخفی کردن هزینه‌های داخلی (مخصوص نشان دادن به کارفرما)'}
          >
            {hideContractorCost && <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute -inset-2 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-50 blur-sm" />}
            {hideContractorCost ? <EyeOff className="w-5 h-5 relative z-10" /> : <Eye className="w-5 h-5 relative z-10" />}
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'LIST' && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="flex-1 flex flex-col lg:flex-row items-center justify-end gap-3 w-full">
              <NeonSearchWrapper className="flex-1 w-full lg:max-w-xs h-[46px]">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input placeholder="جستجوی نام نیرو..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 text-xs placeholder:text-slate-500" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-black/10 rounded-full"><X className="w-3 h-3 text-slate-400" /></button>}
              </NeonSearchWrapper>
              
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
                <div className="w-full sm:w-36 h-[46px]"><GlassSelect options={phaseOptions} value={selectedPhaseFilter} onChange={setSelectedPhaseFilter} placeholder="فازها" /></div>
                <div className="w-full sm:w-32 h-[46px]"><GlassDatePicker placeholder="از تاریخ..." value={dateFrom} onChange={setDateFrom} /></div>
                <div className="w-full sm:w-32 h-[46px]"><GlassDatePicker placeholder="تا تاریخ..." value={dateTo} onChange={setDateTo} /></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {viewMode === 'LIST' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700/50 shadow-2xl modal-scrollbar relative min-h-[300px]">
          <table className="w-full text-right border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-white/40 dark:bg-black/20 border-b border-white/60 dark:border-slate-700/50">
                <th className="w-12 p-5 text-center"><CheckCircle className="w-4 h-4 text-slate-400 mx-auto" /></th>
                <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">نام نیرو / پروفایل</th>
                <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">فاز مربوطه</th>
                <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">تاریخ حضور</th>
                <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">وضعیت حسابداری</th>
                <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">{hideContractorCost ? 'مبلغ قابل نمایش (کارفرما)' : 'هزینه ما / فاکتور کارفرما'}</th>
                <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredLaborRecords.map((record: any) => {
                  const phaseName = getPhaseName(record.phaseId);
                  const isCoveredByMonthly = record.internalCost === 0 && record.baseWage > 0;
                  
                  return (
                    <motion.tr key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`border-b border-white/30 dark:border-slate-700/30 transition-colors group ${selectedIds.includes(record.id) ? 'bg-amber-500/10' : 'hover:bg-white/50 dark:hover:bg-white/5'}`}>
                      <td className="p-5 text-center w-12">
                        <AnimatedCheckbox theme="amber" checked={selectedIds.includes(record.id)} onChange={() => toggleSelection(record.id)} />
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm flex items-center justify-center"><HardHat className="w-5 h-5 text-white" /></div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-white">{record.workerName}</span>
                            <span className="text-xs font-bold text-slate-500 mt-1">{record.workType || 'ثبت نشده'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        {phaseName ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 w-max rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-bold"><Layers className="w-3.5 h-3.5" />{phaseName}</div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 w-max rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold">عمومی / کل پروژه</div>
                        )}
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{record.date}</span>
                          <span className={`text-[10px] font-bold mt-1 ${record.attendance === 'PRESENT' ? 'text-emerald-500' : record.attendance === 'ABSENT' ? 'text-rose-500' : 'text-blue-500'}`}>
                            {record.attendance === 'PRESENT' ? 'حاضر' : record.attendance === 'ABSENT' ? 'غایب' : 'مرخصی'}
                          </span>
                        </div>
                      </td>
                      
                      <td className="p-5">
                        {isCoveredByMonthly ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" /> کسر از حقوق ماهیانه
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black border border-slate-200 dark:border-slate-700">
                            هزینه مستقل (روزمزد/کنترات)
                          </span>
                        )}
                      </td>

                      <td className="p-5">
                        <div className="flex flex-col items-end gap-1.5">
                          {!hideContractorCost && (
                            <div className="flex items-center gap-1.5 font-black text-rose-600 dark:text-rose-500">
                              <span className="text-[10px] text-slate-400 font-bold">هزینه ما:</span>
                              <span dir="ltr">{formatCurrency(record.internalCost)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 font-black text-emerald-600 dark:text-emerald-400">
                            <span className="text-[10px] text-slate-400 font-bold">{hideContractorCost ? 'مبلغ:' : 'کارفرما:'}</span>
                            <span dir="ltr">{formatCurrency(record.billedCost || record.internalCost)}</span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleQuickDuplicate(record)} className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/50 shadow-sm transition-colors" title="تکرار سریع (ثبت دوباره)"><Copy className="w-4 h-4" /></button>
                          <button onClick={() => { setRecordToEdit(record); setIsModalOpen(true); }} className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/50 shadow-sm transition-colors"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => triggerDelete([record.id])} className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/50 shadow-sm transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      )}

      {viewMode === 'MONTHLY' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-emerald-500/20 shadow-2xl modal-scrollbar relative min-h-[300px]">
          <table className="w-full text-right border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-emerald-500/10 border-b border-emerald-500/20">
                <th className="w-12 p-5 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></th>
                <th className="p-5 font-bold text-sm text-emerald-800 dark:text-emerald-400">نام نیرو / سمت</th>
                <th className="p-5 font-bold text-sm text-emerald-800 dark:text-emerald-400">فاز مربوطه</th>
                <th className="p-5 font-bold text-sm text-emerald-800 dark:text-emerald-400">تاریخ شروع / تعداد ماه</th>
                <th className="p-5 font-bold text-sm text-emerald-800 dark:text-emerald-400">{hideContractorCost ? 'مبلغ ماهيانه (کارفرما)' : 'هزینه پرداختی شما / ماه'}</th>
                <th className="p-5 font-bold text-sm text-emerald-800 dark:text-emerald-400">فاکتور کارفرما / سود پنهان</th>
                <th className="p-5 font-bold text-sm text-emerald-800 dark:text-emerald-400 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {monthlyLaborRecords.map((record: any) => {
                  const phaseName = getPhaseName(record.phaseId);
                  const hiddenProfit = record.billedCost - record.internalCost;
                  const displayMonthlyCost = hideContractorCost ? (record.billedCost || record.internalCost) : record.internalCost;
                  
                  return (
                    <motion.tr key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`border-b border-white/30 dark:border-slate-700/30 transition-colors group ${selectedIds.includes(record.id) ? 'bg-emerald-500/10' : 'hover:bg-white/50 dark:hover:bg-white/5'}`}>
                      <td className="p-5 text-center w-12">
                        <AnimatedCheckbox theme="emerald" checked={selectedIds.includes(record.id)} onChange={() => toggleSelection(record.id)} />
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-sm flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-white">{record.workerName}</span>
                            <span className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1">
                              {record.workType || 'نیروی مستمر'}
                              {record.isSmartContract && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded text-[9px] font-black border border-blue-200 dark:border-blue-800">متصل به پروفایل</span>}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        {phaseName ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 w-max rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-bold"><Layers className="w-3.5 h-3.5" />{phaseName}</div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 w-max rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold">عمومی / کل پروژه</div>
                        )}
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{record.date}</span>
                          <span className="text-[10px] font-bold mt-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-max dark:bg-emerald-900/30 dark:border-emerald-800/50">قرارداد: {record.quantity} ماه</span>
                        </div>
                      </td>

                      <td className="p-5">
                        <div className={`flex items-center gap-1.5 font-black text-lg w-max ${hideContractorCost ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          <span dir="ltr">{formatCurrency(displayMonthlyCost)}</span>
                          <span className="text-xs font-bold">{currency}</span>
                        </div>
                      </td>

                      <td className="p-5">
                        <div className="flex flex-col items-end gap-1.5 w-max ml-auto">
                          <div className="flex items-center gap-1.5 font-black text-emerald-600 dark:text-emerald-400">
                            <span className="text-[10px] text-slate-400 font-bold">کارفرما:</span>
                            <span dir="ltr">{formatCurrency(record.billedCost)}</span>
                          </div>
                          {hiddenProfit > 0 && !hideContractorCost && (
                            <div className="flex items-center gap-1.5 font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800/50">
                              <span className="text-[10px] font-bold">سود خالص:</span>
                              <span dir="ltr" className="text-xs">{formatCurrency(hiddenProfit)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* 💡 کنترل عملیات برای قراردادهای هوشمند */}
                          {record.isSmartContract ? (
                            <>
                              <button onClick={() => toast.info('برای ویرایش مبلغ یا تاریخ، به تب "مدیریت ماهانه" در پروفایل این نیرو مراجعه کنید.')} className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/50 shadow-sm transition-colors" title="ویرایش"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => {
                                const worker = workers.find(w => w.id === record.workerId);
                                if (worker) {
                                  const updatedContracts = worker.activeContracts?.filter(c => c.id !== record.id);
                                  updateWorker(worker.id, { activeContracts: updatedContracts });
                                  toast.success('قرارداد ماهانه برای این پروژه با موفقیت لغو شد.');
                                }
                              }} className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/50 shadow-sm transition-colors" title="لغو کامل قرارداد"><Trash2 className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setRecordToEdit(record); setIsModalOpen(true); }} className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/50 shadow-sm transition-colors"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => triggerDelete([record.id])} className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/50 shadow-sm transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>

              {monthlyLaborRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-16 text-center">
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-800">
                      <Users className="w-10 h-10 text-emerald-400 dark:text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-black text-slate-700 dark:text-slate-300">نیروی ماهیانه مستقر یافت نشد.</h3>
                    <p className="text-sm font-bold text-slate-500 mt-2">برای ثبت نیروی ثابت، در مودال "تعریف دوره ماهانه" تخصیص به پروژه را انتخاب کنید.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>
      )}

      {viewMode === 'CALENDAR' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/60 dark:border-slate-700/50 shadow-[0_20px_60px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-4 sm:p-8">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-white/60 dark:bg-slate-800/40 p-4 sm:p-5 rounded-3xl border border-white/80 dark:border-slate-700/50 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-[1.25rem] shadow-lg shadow-orange-500/30 flex items-center justify-center text-white">
                <CalendarDays className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                  {currentMonth.format('jMMMM jYYYY')}
                </h2>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">مدیریت بصری و پیگیری حضور و غیاب کارگاه</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
              <button onClick={goToNextMonth} className="p-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-500 hover:shadow-md transition-all hover:scale-105 active:scale-95">
                <ChevronRight className="w-5 h-5" />
              </button>
              <button onClick={() => setCurrentMonth(moment())} className="px-6 py-3 text-sm font-black bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-xl shadow-sm transition-all hover:scale-105 hover:shadow-md active:scale-95">
                ماه جاری
              </button>
              <button onClick={goToPrevMonth} className="p-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-500 hover:shadow-md transition-all hover:scale-105 active:scale-95">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-3 sm:mb-4">
            {['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'].map((day, idx) => (
              <div key={day} className={`text-center font-black text-[10px] sm:text-sm py-3 rounded-2xl ${idx === 6 ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400'}`}>
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2 sm:gap-4">
            {calendarDays.map((dayData, index) => {
              if (!dayData) return <div key={`empty-${index}`} className="min-h-[90px] sm:min-h-[140px] rounded-3xl bg-white/5 dark:bg-slate-800/5 border-2 border-dashed border-slate-200/50 dark:border-slate-700/50" />;
              
              const isToday = dayData.dateStr === moment().format('jYYYY/jMM/jDD');
              const hasWorkers = dayData.totalWorkers > 0;
              const isFriday = (index + 1) % 7 === 0;

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.01, duration: 0.3 }}
                  key={dayData.day} 
                  onClick={() => setSelectedDate(dayData.dateStr)}
                  className={`relative group overflow-hidden rounded-[1.2rem] sm:rounded-3xl p-3 sm:p-4 flex flex-col justify-between min-h-[90px] sm:min-h-[140px] cursor-pointer transition-all duration-300 ${
                    isToday ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-slate-50 dark:ring-offset-slate-900 z-10' : ''
                  } ${
                    hasWorkers 
                      ? 'bg-gradient-to-br from-white to-amber-50/80 dark:from-slate-800 dark:to-amber-900/30 border border-amber-200/80 dark:border-amber-700/60 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-amber-400 dark:hover:border-amber-500' 
                      : isFriday
                      ? 'bg-rose-50/30 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 hover:bg-rose-100/50 dark:hover:bg-rose-900/20'
                      : 'bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/80'
                  }`}
                >
                  {hasWorkers && <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/0 via-amber-400/0 to-amber-500/10 dark:to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />}
                  
                  <span className={`text-xl sm:text-2xl font-black relative z-10 ${
                    isToday ? 'text-indigo-600 dark:text-indigo-400' : 
                    hasWorkers ? 'text-amber-700 dark:text-amber-500' : 
                    isFriday ? 'text-rose-400 dark:text-rose-500/70' :
                    'text-slate-400 dark:text-slate-500'
                  }`}>
                    {dayData.day}
                  </span>

                  {hasWorkers && (
                    <div className="flex flex-col gap-1.5 mt-auto relative z-10 items-start">
                      <div className="flex items-center gap-1.5 w-max bg-amber-100/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-black shadow-sm border border-amber-200/50 dark:border-amber-500/30 backdrop-blur-md">
                        <HardHat className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> {dayData.totalWorkers} نفر
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 w-max bg-rose-50/80 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-lg text-[10px] font-black shadow-sm border border-rose-200/50 dark:border-rose-500/20 backdrop-blur-md">
                        <span dir="ltr">{formatCurrency(dayData.totalCost)}</span>
                        <span>{currency}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

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
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-900/10 dark:to-orange-900/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-amber-500">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white">لیست کارگران روزانه</h3>
                      <p className="text-sm font-bold text-slate-500 mt-1">مورخ {selectedDate}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedDate(null)} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:text-rose-500 transition-colors relative z-10"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 modal-scrollbar">
                  {(() => {
                    const dayRecords = projectLogs.filter((r: any) => r.date === selectedDate && r.paymentType !== 'PROJECT_MONTHLY' && !pendingDeleteIds.includes(r.id));
                    
                    if (dayRecords.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 mt-20">
                          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                            <User className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                          </div>
                          <p className="font-bold text-lg text-slate-500 dark:text-slate-400">هیچ نیرویی ثبت نشده است.</p>
                          <p className="text-sm font-medium mt-2 text-slate-400">برای افزودن نیرو از دکمه پایین استفاده کنید.</p>
                        </div>
                      );
                    }

                    return dayRecords.map((record: any, idx: number) => {
                      const isCoveredByMonthly = record.internalCost === 0 && record.baseWage > 0;
                      const displayRecordCost = hideContractorCost ? (record.billedCost || record.internalCost) : record.internalCost;

                      return (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={record.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 group relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-full opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center"><HardHat className="w-6 h-6 text-amber-600 dark:text-amber-500" /></div>
                              <div>
                                <h4 className="font-black text-slate-800 dark:text-white text-base">{record.workerName}</h4>
                                <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md mt-1 inline-block border border-slate-200 dark:border-slate-700">{record.workType || 'آزاد'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleQuickDuplicate(record)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors" title="تکرار سریع"><Copy className="w-4 h-4"/></button>
                              <button onClick={() => { setRecordToEdit(record); setIsModalOpen(true); setSelectedDate(null); }} className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-colors"><Edit className="w-4 h-4"/></button>
                              <button onClick={() => { triggerDelete([record.id]); setSelectedDate(null); }} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50 mt-1">
                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                              {isCoveredByMonthly ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Layers className="w-3.5 h-3.5" />}
                              {isCoveredByMonthly ? 'مشمول حقوق ماهیانه' : (getPhaseName(record.phaseId) || 'عمومی')}
                            </span>
                            <div className="flex flex-col items-end">
                              <span className={`flex items-center gap-1 font-black ${hideContractorCost ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                <span dir="ltr">{formatCurrency(displayRecordCost)}</span>
                                <span className="text-[10px]">{currency}</span>
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    });
                  })()}
                </div>

                <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <button 
                    onClick={() => { 
                      setRecordToEdit(null); 
                      document.dispatchEvent(new CustomEvent('open-new-labor-with-date', { detail: selectedDate }));
                      setIsModalOpen(true); 
                      setSelectedDate(null); 
                    }} 
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Plus className="w-5 h-5"/> ثبت نیروی جدید برای این روز
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 💡 جایگزینی کدهای طولانی با کامپوننت‌های یکپارچه و مشترک */}
      <BulkSelectionToast 
        selectedCount={selectedIds.length} 
        onDelete={() => triggerDelete(selectedIds)} 
        isVisible={selectedIds.length > 0 && viewMode !== 'CALENDAR'} 
      />

      <FloatingUndoToast 
        undoItems={undoItems} 
        onCancel={handleCancelUndo} 
      />

      {/* 💡 مودال هوشمند و مادر نیروی کار با قفل شدن پروژه در این تب */}
      <UniversalLaborModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setRecordToEdit(null); setPreSelectedDate(null); }} 
        editData={recordToEdit} 
        preSelectedDate={preSelectedDate}
        lockedProjectId={projectId} 
      />

    </motion.div>
  );
}