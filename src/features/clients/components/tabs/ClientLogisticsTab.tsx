import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Search, X, Edit, Trash2, CheckCircle,
  HardHat, Banknote, Wrench, Route, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

import { useProjectStore } from '../../../projects/store/projectStore';
import { useLogisticsStore } from '../../../../store/logisticsStore';
import { useBulkSelection } from '../../../../hooks/useBulkSelection';
// 💡 استور نیروی کار برای پیدا کردن اسم راننده‌ها اضافه شد
import { useLaborStore } from '../../../../store/laborStore';

import GlassDatePicker from '../../../../components/ui/GlassDatePicker';
import GlassSelect from '../../../../components/ui/GlassSelect';

interface ClientLogisticsTabProps {
  clientId: string;
}

const formatNumber = (num: number | string | undefined) => {
  if (num === undefined || num === null || num === '') return '0';
  return num.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseNumber = (str: string) => {
  if (!str) return 0;
  return Number(str.replace(/,/g, '')) || 0;
};


const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center">{children}</div>
  </div>
);

const GlassInputWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl bg-white/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm focus-within:border-indigo-500/60 transition-all duration-300 overflow-hidden flex items-center ${className}`}>
    {children}
  </div>
);

export default function ClientLogisticsTab({ clientId }: ClientLogisticsTabProps) {
  const allProjects = useProjectStore((state) => state.projects);
  const clientProjects = useMemo(() => allProjects.filter(p => p.clientId === clientId), [allProjects, clientId]);
  const clientProjectIds = useMemo(() => clientProjects.map(p => p.id), [clientProjects]);
  
  const allLogs = useLogisticsStore(state => state.logs);
  const updateLog = useLogisticsStore(state => state.updateLog);
  const addLog = useLogisticsStore(state => state.addLog);
  const deleteMultipleLogs = useLogisticsStore(state => state.deleteMultipleLogs);

  // 💡 استخراج لیست ماشین‌ها، ابزارها و راننده‌ها برای جایگزینی UUID با نام واقعی
  const allWorkers = useLaborStore(state => state.workers) || [];
  const internalVehicles = useLogisticsStore(state => state.vehicles) || [];
  const internalTools = useLogisticsStore(state => state.tools) || [];

  const clientLogs = useMemo(() => {
    return allLogs.filter(log => log.projectId && clientProjectIds.includes(log.projectId));
  }, [allLogs, clientProjectIds]);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'TRANSPORT' | 'EQUIPMENT'>('TRANSPORT');
  const [modalSource, setModalSource] = useState<'INTERNAL' | 'EXTERNAL'>('EXTERNAL');
  const [editId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '', projectId: '', phaseId: 'GENERAL', date: '', provider: '', vehicleInfo: '', internalCost: '', billedCost: '', driverWage: ''
  });

  const [undoItems, setUndoItems] = useState<{ id: string, items: string[], expireAt: number }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const { selectedIds, toggleSelection, clearSelection } = useBulkSelection();

  const mockVehicles = [{ value: 'نیسان آبی (پلاک ۱۲ب۳۴)', label: 'نیسان آبی (پلاک ۱۲ب۳۴)' }, { value: 'کامیون بنز ده چرخ', label: 'کامیون بنز ده چرخ' }];
  const mockDrivers = [{ value: 'علی احمدی', label: 'علی احمدی' }, { value: 'رضا کریمی', label: 'رضا کریمی' }];
  const mockEquipments = [{ value: 'بیل مکانیکی', label: 'بیل مکانیکی' }, { value: 'موتور برق', label: 'موتور برق' }];

  // اتصال امن به ایونت سراسری مادر برای هماهنگی با دکمه بالا
  useEffect(() => {
    const handleOpenModal = () => {
      document.dispatchEvent(new CustomEvent('open-new-logistics-modal', { detail: { clientId, targetContext: 'CLIENT' } }));
    };
    document.addEventListener('open-client-logistics-modal', handleOpenModal);
    return () => document.removeEventListener('open-client-logistics-modal', handleOpenModal);
  }, [clientId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setUndoItems(prev => {
        const now = Date.now();
        const expired = prev.filter(u => u.expireAt <= now);
        const active = prev.filter(u => u.expireAt > now);
        if (expired.length > 0) {
          setTimeout(() => {
            expired.forEach(u => deleteMultipleLogs(u.items));
            setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e=>e.items).includes(id)));
          }, 0);
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

  const openEditModal = (record: any) => {
    document.dispatchEvent(new CustomEvent('open-new-logistics-modal', { 
      detail: { ...record, clientId, targetContext: 'CLIENT' } 
    }));
  };

  const handleSaveRecord = () => {
    if (!formData.title || !formData.date || !formData.projectId) return toast.error('لطفاً عنوان، تاریخ و پروژه را وارد کنید.');

    let internal = parseNumber(formData.internalCost);
    let billed = parseNumber(formData.billedCost);
    let wage = parseNumber(formData.driverWage);

    if (modalSource === 'INTERNAL') internal = 0; 
    if (billed === 0) billed = internal + wage;

    const finalData = {
      type: modalType,
      source: modalSource,
      projectId: formData.projectId, 
      phaseId: formData.phaseId === 'GENERAL' ? undefined : formData.phaseId,
      title: formData.title,
      provider: formData.provider || 'ناشناس',
      vehicleInfo: formData.vehicleInfo || '',
      date: formData.date,
      internalCost: internal,
      billedCost: billed,
      driverWage: modalSource === 'INTERNAL' ? wage : 0
    };

    if (editId) {
      updateLog(editId, finalData as any);
      toast.success('سرویس لجستیک ویرایش شد.');
    } else {
      addLog(finalData as any);
      toast.success('سرویس لجستیک جدید با موفقیت ثبت شد.');
    }
    
    setIsModalOpen(false);
  };

  const projectOptions = useMemo(() => [
    { value: 'ALL', label: 'تمام پروژه‌ها' },
    ...clientProjects.map((p, idx) => ({ value: p.id || `proj-${idx}`, label: p.name || 'پروژه' }))
  ], [clientProjects]);

  const filteredRecords = useMemo(() => {
    return clientLogs
      .filter((r: any) => {
        if (pendingDeleteIds.includes(r.id)) return false;
        
        // 💡 پیدا کردن نام راننده و خودرو برای جستجوی دقیق‌تر
        let driverName = r.provider || '';
        const driver = allWorkers.find(w => w.id === r.provider);
        if (driver) driverName = `${driver.name} ${driver.lastName}`;
        
        let vName = r.vehicleInfo || '';
        const vehicle = internalVehicles.find(v => v.id === r.vehicleInfo);
        const tool = internalTools.find(t => t.id === r.vehicleInfo);
        if (vehicle) vName = vehicle.name;
        if (tool) vName = tool.name;

        const matchSearch = !searchQuery ? true : (
          r.title?.includes(searchQuery) || 
          driverName.includes(searchQuery) || 
          vName.includes(searchQuery) ||
          r.provider?.includes(searchQuery) || 
          r.vehicleInfo?.includes(searchQuery)
        );

        const matchFrom = dateFrom ? r.date >= dateFrom : true;
        const matchTo = dateTo ? r.date <= dateTo : true;
        const matchProject = selectedProjectFilter === 'ALL' ? true : r.projectId === selectedProjectFilter;

        return matchSearch && matchFrom && matchTo && matchProject;
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.date.localeCompare(a.date));
  }, [clientLogs, searchQuery, dateFrom, dateTo, selectedProjectFilter, pendingDeleteIds, allWorkers, internalVehicles, internalTools]);

  const kpiData = useMemo(() => {
    let externalCost = 0;
    let internalWage = 0;
    let totalBilled = 0;

    clientLogs.forEach((r: any) => {
      if (!pendingDeleteIds.includes(r.id)) {
        if (r.source === 'EXTERNAL') externalCost += (r.internalCost || 0);
        if (r.source === 'INTERNAL') internalWage += (r.driverWage || 0);
        totalBilled += (r.billedCost || 0);
      }
    });

    const hiddenProfit = totalBilled - (externalCost + internalWage);

    return { totalRecords: clientLogs.length, externalCost, internalWage, totalBilled, hiddenProfit };
  }, [clientLogs, pendingDeleteIds]);

  const getProjectName = (projId: string) => {
    return clientProjects.find(p => p.id === projId)?.name || 'نامشخص';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-[2rem] bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">کل سرویس‌های کارفرما</span>
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center"><Route className="w-5 h-5 text-indigo-500" /></div>
          </div>
          <span className="text-3xl font-black text-slate-800 dark:text-white">{kpiData.totalRecords} <span className="text-sm font-bold text-slate-400">مورد</span></span>
        </div>

        <div className="p-5 rounded-[2rem] bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50 shadow-sm flex flex-col justify-between backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">کرایه پرداختی آزاد</span>
            <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center"><Truck className="w-5 h-5 text-rose-500" /></div>
          </div>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400" dir="ltr">{kpiData.externalCost.toLocaleString()}</span>
        </div>

        <div className="p-5 rounded-[2rem] bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 shadow-sm flex flex-col justify-between backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">دستمزد اپراتور/ناوگان داخلی</span>
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center"><HardHat className="w-5 h-5 text-emerald-500" /></div>
          </div>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400" dir="ltr">{kpiData.internalWage.toLocaleString()}</span>
        </div>

        <div className="p-5 rounded-[2rem] bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 shadow-sm flex flex-col justify-between backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">مجموع فاکتور کارفرما</span>
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center"><Banknote className="w-5 h-5 text-blue-500" /></div>
          </div>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400" dir="ltr">{kpiData.totalBilled.toLocaleString()}</span>
        </div>

      </div>

      <div className="flex flex-wrap items-center gap-4 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm rounded-[2rem] px-6 py-4 z-[90] relative">
        <NeonSearchWrapper className="flex-1 w-full xl:w-auto min-w-[250px] h-[46px]">
          <Search className="w-5 h-5 text-slate-400 shrink-0 ml-3" />
          <input placeholder="جستجوی عنوان بار، ماشین یا راننده..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold transition-colors placeholder:text-slate-500" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /></button>}
        </NeonSearchWrapper>
        
        <div className="w-full xl:w-px h-px xl:h-8 bg-slate-300 dark:bg-slate-700 hidden xl:block" />
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto relative z-[100]">
          <div className="w-full sm:w-44 h-[46px]">
            <GlassSelect options={projectOptions} value={selectedProjectFilter} onChange={setSelectedProjectFilter} placeholder="همه پروژه‌ها" />
          </div>
          <div className="w-full sm:w-44 h-[46px] relative">
            <GlassDatePicker placeholder="از تاریخ..." value={dateFrom} onChange={setDateFrom} />
          </div>
          <div className="w-full sm:w-44 h-[46px] relative">
            <GlassDatePicker placeholder="تا تاریخ..." value={dateTo} onChange={setDateTo} />
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-2xl modal-scrollbar relative min-h-[300px]">
        <table className="w-full text-right border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="w-12 p-5 text-center"><CheckCircle className="w-4 h-4 text-slate-400 mx-auto" /></th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">شرح و نام پروژه</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">نوع / مالکیت</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">ماشین و اپراتور</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">هزینه واقعی (تومان)</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">فاکتور کارفرما</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredRecords.map((record: any) => {
                const projectName = getProjectName(record.projectId);
                const actualCost = record.source === 'INTERNAL' ? (record.driverWage || 0) : (record.internalCost || 0);
                
                // 💡 استخراج نام راننده و خودرو برای نمایش در جدول
                let displayDeviceName = record.vehicleInfo || '---';
                if (record.source === 'INTERNAL') {
                   if (record.type === 'TRANSPORT') {
                      const v = internalVehicles.find(v => v.id === record.vehicleInfo);
                      if (v) displayDeviceName = `${v.name} (${v.plate || 'بدون پلاک'})`;
                   } else {
                      const t = internalTools.find(t => t.id === record.vehicleInfo);
                      if (t) displayDeviceName = `${t.name} (سریال: ${t.serialNumber || '---'})`;
                   }
                }

                const driver = allWorkers.find(w => w.id === record.provider);
                const displayDriverName = driver ? `${driver.name} ${driver.lastName}`.trim() : (record.provider || 'ناشناس');

                return (
                  <motion.tr key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`border-b border-slate-100 dark:border-slate-800 transition-colors group ${selectedIds.includes(record.id) ? 'bg-indigo-500/10' : 'hover:bg-white dark:hover:bg-slate-800/50'}`}>
                    <td className="p-5 text-center w-12">
                      <input type="checkbox" checked={selectedIds.includes(record.id)} onChange={() => toggleSelection(record.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    </td>
                    
                    <td className="p-5">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-bold text-slate-800 dark:text-white">{record.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500">{record.date}</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded flex items-center gap-1"><Briefcase className="w-3 h-3"/> {projectName}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-5">
                      <div className="flex flex-col gap-1.5">
                        {record.type === 'TRANSPORT' ? 
                          <span className="flex items-center gap-1 w-max px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20"><Truck className="w-3.5 h-3.5"/> حمل و نقل</span> :
                          <span className="flex items-center gap-1 w-max px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20"><Wrench className="w-3.5 h-3.5"/> ماشین‌آلات</span>
                        }
                        {record.source === 'INTERNAL' ? 
                           <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">ناوگان داخلی (شرکتی)</span> :
                           <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400">آزاد / کرایه‌ای</span>
                        }
                      </div>
                    </td>

                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{displayDeviceName}</span>
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><HardHat className="w-3.5 h-3.5"/> {displayDriverName}</span>
                      </div>
                    </td>
                    
                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-base text-rose-600 dark:text-rose-400" dir="ltr">{actualCost.toLocaleString()}</span>
                        {record.source === 'INTERNAL' && <span className="text-[10px] font-bold text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-900/30 px-1.5 py-0.5 rounded w-max">سهم دستمزد اپراتور/راننده</span>}
                      </div>
                    </td>

                    <td className="p-5">
                      <span className="font-black text-base text-emerald-600 dark:text-emerald-400" dir="ltr">{(record.billedCost || 0).toLocaleString()}</span>
                    </td>
                    
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(record)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-sm transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => triggerDelete([record.id])} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 shadow-sm transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={7} className="p-16 text-center">
                  <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3 opacity-50" />
                  <p className="text-slate-500 font-bold">هیچ رکورد حمل و نقلی برای پروژه‌های این کارفرما یافت نشد.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
              
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl p-6 sm:p-8 rounded-[2rem] backdrop-blur-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-6 overflow-visible">
                
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
                  <h3 className={`text-xl font-black flex items-center gap-2 text-indigo-600 dark:text-indigo-400`}>
                    <Route className="w-6 h-6" /> {editId ? 'ویرایش سرویس کارفرما' : 'ثبت بارنامه جدید'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-[80]">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">نوع سرویس</label>
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <button onClick={() => setModalType('TRANSPORT')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${modalType === 'TRANSPORT' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-blue-600 shadow-sm' : 'text-slate-500'}`}>حمل بار / نخاله</button>
                      <button onClick={() => setModalType('EQUIPMENT')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${modalType === 'EQUIPMENT' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-amber-600 shadow-sm' : 'text-slate-500'}`}>کارکرد ماشین‌آلات</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">مالکیت (داخلی/آزاد)</label>
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <button onClick={() => setModalSource('EXTERNAL')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${modalSource === 'EXTERNAL' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-rose-500 shadow-sm' : 'text-slate-500'}`}>کرایه آزاد (بیرون)</button>
                      <button onClick={() => setModalSource('INTERNAL')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${modalSource === 'INTERNAL' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>ناوگان داخلی</button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 relative z-[70]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 relative z-[70]">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">پروژه مربوطه *</label>
                      <GlassSelect options={clientProjects.map(p => ({value: p.id, label: p.name}))} value={formData.projectId} onChange={(val: string) => setFormData({...formData, projectId: val})} placeholder="انتخاب پروژه..." />
                    </div>
                    <div className="space-y-2 relative z-[65]">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">تاریخ عملیات *</label>
                      <GlassDatePicker value={formData.date} onChange={(val: string) => setFormData({...formData, date: val})} />
                    </div>
                  </div>

                  <div className="space-y-2 relative z-[60]">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">شرح بار یا سرویس (مثال: حمل نخاله / گودبرداری) *</label>
                    <GlassInputWrapper className="h-[46px] px-4">
                      <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-transparent border-none outline-none font-bold text-sm text-slate-900 dark:text-white" placeholder="توضیح کوتاه..." />
                    </GlassInputWrapper>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-[50]">
                    <div className="space-y-2 relative z-[50]">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">انتخاب وسیله نقلیه / دستگاه</label>
                      <GlassSelect options={modalType === 'TRANSPORT' ? mockVehicles : mockEquipments} value={formData.vehicleInfo} onChange={(val: string) => setFormData({...formData, vehicleInfo: val})} placeholder="جستجو یا تایپ..." hasSearch onAddNew={(v: string) => setFormData({...formData, vehicleInfo: v})} />
                    </div>
                    <div className="space-y-2 relative z-[45]">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">نام راننده / اپراتور</label>
                      <GlassSelect options={mockDrivers} value={formData.provider} onChange={(val: string) => setFormData({...formData, provider: val})} placeholder="جستجو یا تایپ..." hasSearch onAddNew={(v: string) => setFormData({...formData, provider: v})} />
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-2xl space-y-4 relative z-[40]">
                  <h4 className="text-sm font-black text-amber-800 dark:text-amber-500 flex items-center gap-2"><Banknote className="w-4 h-4"/> حسابداری و مالی</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {modalSource === 'EXTERNAL' && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-rose-600 dark:text-rose-400">هزینه واقعی پرداختی به راننده *</label>
                        <input value={formatNumber(formData.internalCost)} onChange={e => setFormData({...formData, internalCost: e.target.value})} className="w-full h-[46px] bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/50 rounded-xl px-4 outline-none font-black text-lg text-rose-600 dark:text-rose-400 text-left dir-ltr shadow-sm focus:border-rose-400" placeholder="0" />
                      </div>
                    )}
                    {modalSource === 'INTERNAL' && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400">سهم دستمزد اپراتور/راننده شما</label>
                        <input value={formatNumber(formData.driverWage)} onChange={e => setFormData({...formData, driverWage: e.target.value})} className="w-full h-[46px] bg-white dark:bg-slate-900 border border-fuchsia-200 dark:border-fuchsia-800/50 rounded-xl px-4 outline-none font-black text-lg text-fuchsia-600 dark:text-fuchsia-400 text-left dir-ltr shadow-sm focus:border-fuchsia-400" placeholder="0" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">مبلغ فاکتور کارفرما</label>
                      <input value={formatNumber(formData.billedCost)} onChange={e => setFormData({...formData, billedCost: e.target.value})} className="w-full h-[46px] bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 outline-none font-black text-lg text-emerald-600 dark:text-emerald-400 text-left dir-ltr shadow-sm focus:border-emerald-400" placeholder="0" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 relative z-20">
                  <button onClick={handleSaveRecord} className="w-full py-4 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-transform bg-gradient-to-r from-indigo-500 to-purple-500">
                    <CheckCircle className="w-5 h-5"/> {editId ? 'ثبت تغییرات' : 'تایید و ثبت'}
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[999999] shadow-2xl px-6 py-4 rounded-full backdrop-blur-2xl bg-slate-900/80 border border-slate-700 flex items-center gap-6">
              <span className="text-white font-bold text-sm bg-white/10 px-3 py-1.5 rounded-full">{selectedIds.length} مورد انتخاب شده</span>
              <button onClick={() => triggerDelete(selectedIds)} className="flex items-center gap-2 text-rose-500 hover:text-rose-400 font-bold text-sm"><Trash2 className="w-5 h-5" /> حذف موقت گروهی</button>
            </motion.div>
          )}
        </AnimatePresence>, document.body
      )}

      {typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
          <AnimatePresence>
            {undoItems.map(undo => (
              <motion.div
                key={undo.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto"
                dir="rtl"
              >
                <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-500" />
                </div>

                <div className="flex flex-col flex-1">
                  <span className="text-sm font-black text-slate-800 dark:text-white">
                    {undo.items.length > 1 ? `${undo.items.length} رکورد در حال حذف` : 'رکورد در حال حذف'}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    تا چند ثانیه دیگر پاک می‌شود...
                  </span>
                </div>

                <button
                  onClick={() => {
                    setPendingDeleteIds(prev => prev.filter(id => !undo.items.includes(id)));
                    setUndoItems(prev => prev.filter(u => u.id !== undo.id));
                    toast.success('عملیات لغو شد');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-black transition-colors shrink-0 shadow-sm"
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
        </div>, document.body
      )}
    </motion.div>
  );
}