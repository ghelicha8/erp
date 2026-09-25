import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Route, Truck, Wrench, HardHat, Banknote, CheckCircle, Layers, Briefcase, Building2, Calculator, UserPlus, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useProjectStore } from '../store/projectStore';
import { useClientStore } from '../../../store/clientStore'; 
import { useLogisticsStore } from '../../../store/logisticsStore';
import { useLaborStore } from '../../../store/laborStore';

import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import GlassSelect from '../../../components/ui/GlassSelect';

import LaborFormModal from '../../labor/components/LaborFormModal';
import { LuxuryTimePicker } from '../../../components/ui/SharedLaborUI';

const formatNumber = (num: number | string | undefined) => {
  if (num === undefined || num === null || num === '') return '';
  return num.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseNumber = (str: string) => {
  if (!str) return 0;
  return Number(str.replace(/,/g, '')) || 0;
};

const getTodayDate = () => {
  const d = new Date().toLocaleDateString('fa-IR');
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return d.split('').map(c => {
    let pIdx = persianNumbers.indexOf(c);
    return pIdx >= 0 ? pIdx : c;
  }).join('').split('/').map(p => p.padStart(2, '0')).join('/');
};

const GlassInputWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl bg-white/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm focus-within:border-indigo-500/60 transition-all duration-300 overflow-hidden flex items-center ${className}`}>
    {children}
  </div>
);

interface NewLogisticsModalProps {
  projectId?: string; 
  clientId?: string;
}

export default function NewLogisticsModal({ projectId: propProjectId, clientId: propClientId }: NewLogisticsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => { setPortalTarget(document.body); }, []);

  const allProjects = useProjectStore((state) => state.projects);
  const allClients = useClientStore((state) => state.clients); 
  const allWorkers = useLaborStore((state) => state.workers) || [];
  
  const addLog = useLogisticsStore(state => state.addLog);
  const updateLog = useLogisticsStore(state => state.updateLog);
  const internalVehicles = useLogisticsStore(state => state.vehicles) || [];
  const internalTools = useLogisticsStore(state => state.tools) || [];

  const [modalType, setModalType] = useState<'TRANSPORT' | 'EQUIPMENT'>('TRANSPORT');
  const [modalSource, setModalSource] = useState<'INTERNAL' | 'EXTERNAL'>('EXTERNAL');
  const [editId, setEditId] = useState<string | null>(null);
  
  const [lockedClient, setLockedClient] = useState(false);
  const [lockedProject, setLockedProject] = useState(false);
  const [lockedType, setLockedType] = useState(false);
  const [lockedVehicle, setLockedVehicle] = useState(false);

  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);

  const [unit, setUnit] = useState('SERVICE');
  const [qty, setQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [lumpSumPrice, setLumpSumPrice] = useState(''); 
  
  const [splitIntervals, setSplitIntervals] = useState(false);
  
  const [driverWageType, setDriverWageType] = useState<'UNIT' | 'FIXED' | 'NONE'>('UNIT'); 
  const [driverUnitPrice, setDriverUnitPrice] = useState(''); 
  const [driverFixedWage, setDriverFixedWage] = useState(''); 
  
  const [dateFrom, setDateFrom] = useState(getTodayDate());
  const [dateTo, setDateTo] = useState(getTodayDate());
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');

  const [formData, setFormData] = useState({
    title: '', 
    clientId: '', 
    projectId: '', 
    phaseId: 'GENERAL', 
    date: getTodayDate(), 
    provider: '', 
    vehicleInfo: '', 
    internalCost: '', 
    billedCost: '', 
    driverWage: ''
  });

  const calculatedDaysCount = useMemo(() => {
    if (unit === 'DAILY' && dateFrom && dateTo) {
      const df = moment(dateFrom, 'jYYYY/jMM/jDD');
      const dt = moment(dateTo, 'jYYYY/jMM/jDD');
      if (df.isValid() && dt.isValid()) {
        const diff = dt.diff(df, 'days') + 1;
        return diff > 0 ? diff : 1;
      }
    }
    return parseFloat(qty) || 1;
  }, [dateFrom, dateTo, unit, qty]);

  const driverOptions = useMemo(() => {
    const filtered = allWorkers.filter(w => 
      w.specialtyIds?.some(sId => sId.includes('spec_3') || sId.toLowerCase().includes('driver') || sId.toLowerCase().includes('راننده')) || true
    );
    return [
      ...filtered.map((w, idx) => ({ value: w.id || `worker-${idx}`, label: `${w.name || ''} ${w.lastName || ''}`.trim() })),
      { value: 'NEW_DRIVER', label: 'ثبت نیروی جدید...', icon: UserPlus } 
    ];
  }, [allWorkers]);

  const handleDriverChange = (val: string) => {
    if (val === 'NEW_DRIVER') {
      setIsLaborModalOpen(true);
      setFormData(prev => ({ ...prev, provider: '' })); 
    } else {
      setFormData(prev => ({ ...prev, provider: val }));
    }
  };

  useEffect(() => {
    const handleOpenModal = (e: any) => {
      if ((window as any)._isLogisticsModalActive) return;
      (window as any)._isLogisticsModalActive = true;
      setTimeout(() => { (window as any)._isLogisticsModalActive = false; }, 300);

      const record = e.detail || {};

      let initClient = record.clientId || propClientId || '';
      let initProject = record.projectId || propProjectId || '';

      setLockedClient(!!initClient || !!initProject);
      setLockedProject(!!initProject);

      if (initProject && !initClient) {
        const proj = allProjects.find(p => p.id === initProject);
        if (proj) initClient = proj.clientId;
      }
      
      const isEdit = !!record.id;
      const autoLock = !isEdit && !!record.vehicleInfo;
      
      setLockedType(!!record.lockType || autoLock);
      setLockedVehicle(!!record.lockVehicle || autoLock);
      
      const currentSource = record.source || 'EXTERNAL';
      const currentType = record.type || 'TRANSPORT';
      setModalType(currentType);
      setModalSource(currentSource);
      
      setSplitIntervals(false);

      if (isEdit) {
        setEditId(record.id);
        
        // 💡 تشخیص رکوردهای قدیمی برای جلوگیری از صفر شدن اطلاعات موقع ویرایش
        const isLegacy = !record.qty && !record.unitPrice && record.unit !== 'CONTRACT';

        // اگر رکورد قبلاً مبلغ مقطوع بوده یا کلاً قدیمیه (بدون تعداد/قیمت)
        if (record.unit === 'CONTRACT' || isLegacy) {
           setUnit('CONTRACT');
           // برای منابع داخلی از billedCost و برای منابع خارجی از internalCost استفاده می‌کنیم
           setLumpSumPrice(currentSource === 'INTERNAL' ? (record.billedCost?.toString() || '0') : (record.internalCost?.toString() || '0'));
           setUnitPrice('');
           setQty('1');
        } else {
           setUnit(record.unit || 'SERVICE');
           setQty(record.qty?.toString() || '1');
           setUnitPrice(record.unitPrice?.toString() || '0');
           setLumpSumPrice('');
        }

        if (currentSource === 'INTERNAL') {
           if (!record.driverWage || record.driverWage === 0) {
              setDriverWageType('NONE');
              setDriverFixedWage('');
              setDriverUnitPrice('');
           } else if (record.unit === 'CONTRACT' || isLegacy) {
              setDriverWageType('FIXED');
              setDriverFixedWage(record.driverWage.toString());
              setDriverUnitPrice('');
           } else {
              setDriverWageType('UNIT');
              setDriverUnitPrice((record.driverWage / (record.qty || 1)).toString());
              setDriverFixedWage('');
           }
        }

        setFormData({
          title: record.title || '', 
          clientId: record.clientId || initClient, 
          projectId: record.projectId || initProject, 
          phaseId: record.phaseId || 'GENERAL',
          date: record.date || getTodayDate(), 
          provider: record.provider || '',
          vehicleInfo: record.vehicleInfo || '',
          internalCost: record.internalCost?.toString() || '', 
          billedCost: record.billedCost?.toString() || '', 
          driverWage: record.driverWage?.toString() || ''
        });
      } else {
        setEditId(null);
        setUnit(currentType === 'EQUIPMENT' ? 'DAILY' : 'SERVICE');
        setQty('1');
        setUnitPrice('');
        setLumpSumPrice('');
        setDriverUnitPrice('');
        setDriverFixedWage('');
        setDriverWageType('UNIT');
        setFormData({ 
          title: '', clientId: initClient, projectId: initProject, phaseId: 'GENERAL', date: getTodayDate(), provider: '', 
          vehicleInfo: record.vehicleInfo || '', 
          internalCost: '', billedCost: '', driverWage: '' 
        });
      }
      setIsOpen(true);
    };

    document.addEventListener('open-new-logistics-modal', handleOpenModal);
    return () => {
      document.removeEventListener('open-new-logistics-modal', handleOpenModal);
      (window as any)._isLogisticsModalActive = false;
    };
  }, [propProjectId, propClientId, allProjects]);

  const selectedProject = useMemo(() => allProjects.find(p => p.id === formData.projectId), [allProjects, formData.projectId]);
  const phaseOptions = useMemo(() => [
    { value: 'GENERAL', label: 'هزینه‌های عمومی (بدون فاز)' },
    ...(selectedProject?.phases?.map((p, idx) => ({ value: p.id || `phase-${idx}`, label: p.name || `فاز ${idx + 1}` })) || [])
  ], [selectedProject]);

  const clientOptions = useMemo(() => allClients.map((c, idx) => ({ value: c.id || `client-${idx}`, label: `${c.name || ''} ${c.lastName || ''}`.trim() || 'بدون نام' })), [allClients]);
  const projectOptions = useMemo(() => 
    allProjects.filter(p => !formData.clientId || p.clientId === formData.clientId).map((p, idx) => ({ value: p.id || `proj-${idx}`, label: p.name || 'پروژه بی‌نام' })), 
  [allProjects, formData.clientId]);

  const internalVehicleOptions = useMemo(() => internalVehicles.map((v, idx) => ({ value: v.id || `veh-${idx}`, label: `${v.name || 'خودرو'} (پلاک: ${v.plate || '---'})` })), [internalVehicles]);
  const internalToolOptions = useMemo(() => internalTools.map((t, idx) => ({ value: t.id || `tool-${idx}`, label: `${t.name || 'ابزار'} (سریال: ${t.serialNumber || '---'})` })), [internalTools]);

  const transportUnits = [
    { value: 'SERVICE', label: 'سرویسی' }, { value: 'TONNAGE', label: 'تناژ / وزنی' }, { value: 'CONTRACT', label: 'مقطوع / توافقی' }
  ];
  const equipmentUnits = [
    { value: 'DAILY', label: 'روزمزد' }, { value: 'HOURLY', label: 'ساعتی' }, { value: 'MONTHLY', label: 'ماهیانه' }, { value: 'METER', label: 'متری / حجمی' }, { value: 'CONTRACT', label: 'مقطوع / کنترات' }
  ];
  const activeUnits = modalType === 'TRANSPORT' ? transportUnits : equipmentUnits;

  useEffect(() => {
    if (unit === 'CONTRACT') return; 

    if (modalType === 'EQUIPMENT') {
      if (unit === 'DAILY') {
        const dFrom = moment(dateFrom, 'jYYYY/jMM/jDD');
        const dTo = moment(dateTo, 'jYYYY/jMM/jDD');
        if (dFrom.isValid() && dTo.isValid()) {
          const diff = dTo.diff(dFrom, 'days') + 1;
          if (diff > 0) setQty(diff.toString());
        }
      } else if (unit === 'HOURLY') {
        const [h1, m1] = startTime.split(':').map(Number);
        const [h2, m2] = endTime.split(':').map(Number);
        const diffHours = (h2 + m2/60) - (h1 + m1/60);
        if (diffHours > 0) setQty(diffHours.toFixed(2));
      }
    }
  }, [dateFrom, dateTo, startTime, endTime, unit, modalType]);

  useEffect(() => {
    let totalCost = 0;
    
    if (unit === 'CONTRACT') {
      totalCost = parseNumber(lumpSumPrice);
    } else {
      const q = calculatedDaysCount;
      const price = parseNumber(unitPrice);
      totalCost = q * price;
    }
    
    let wage = 0;
    if (modalSource === 'INTERNAL' && modalType === 'TRANSPORT') {
      if (driverWageType === 'NONE') {
        wage = 0;
      } else if (driverWageType === 'FIXED') {
        wage = parseNumber(driverFixedWage);
      } else {
        const q = calculatedDaysCount;
        const dPrice = parseNumber(driverUnitPrice);
        wage = q * dPrice;
      }
      setFormData(prev => ({ ...prev, driverWage: formatNumber(Math.round(wage).toString()) }));
    }

    if (modalSource === 'INTERNAL') {
      setFormData(prev => ({ ...prev, billedCost: formatNumber(Math.round(totalCost).toString()), internalCost: '0' }));
    } else {
      setFormData(prev => ({ ...prev, internalCost: formatNumber(Math.round(totalCost).toString()) }));
    }
  }, [calculatedDaysCount, unitPrice, lumpSumPrice, driverUnitPrice, driverFixedWage, driverWageType, unit, modalSource, modalType]);

  const handleSaveRecord = () => {
    if (!formData.title || !formData.date || !formData.projectId) {
      return toast.error('لطفاً عنوان، تاریخ و پروژه را مشخص کنید.');
    }

    let internal = parseNumber(formData.internalCost);
    let billed = parseNumber(formData.billedCost);
    let wage = parseNumber(formData.driverWage);

    if (modalSource === 'INTERNAL') internal = 0; 

    if (splitIntervals && unit === 'DAILY' && dateFrom && dateTo && !editId) {
      const df = moment(dateFrom, 'jYYYY/jMM/jDD');
      const dt = moment(dateTo, 'jYYYY/jMM/jDD');
      if (df.isValid() && dt.isValid() && dt.isSameOrAfter(df)) {
        let curr = df.clone();
        const unitP = parseNumber(unitPrice);
        const wageP = driverWageType === 'NONE' ? 0 : parseNumber(driverUnitPrice);

        while (curr.isSameOrBefore(dt)) {
          const dayStr = curr.format('jYYYY/jMM/jDD');
          const dayInternal = modalSource === 'INTERNAL' ? 0 : unitP;
          const dayBilled = billed > 0 ? (billed / calculatedDaysCount) : unitP;
          const dayWage = modalSource === 'INTERNAL' ? wageP : 0;

          const intervalData = {
            type: modalType,
            source: modalSource,
            clientId: formData.clientId || undefined, 
            projectId: formData.projectId, 
            phaseId: formData.phaseId === 'GENERAL' ? undefined : formData.phaseId,
            title: `${formData.title} (${dayStr})`,
            provider: formData.provider || (modalSource === 'INTERNAL' ? 'ناوگان داخلی' : 'ناشناس'),
            vehicleInfo: formData.vehicleInfo || '',
            date: dayStr,
            internalCost: dayInternal,
            billedCost: Math.round(dayBilled),
            driverWage: dayWage,
            unit: unit,
            qty: 1,
            unitPrice: unitP
          };
          addLog(intervalData as any);
          curr.add(1, 'days');
        }
        toast.success(`تعداد ${calculatedDaysCount} بازه زمانی به صورت جداگانه ثبت شد.`);
        setIsOpen(false);
        return;
      }
    }
    
    const finalData = {
      type: modalType,
      source: modalSource,
      clientId: formData.clientId || undefined, 
      projectId: formData.projectId, 
      phaseId: formData.phaseId === 'GENERAL' ? undefined : formData.phaseId,
      title: formData.title,
      provider: formData.provider || (modalSource === 'INTERNAL' ? 'ناوگان داخلی' : 'ناشناس'),
      vehicleInfo: formData.vehicleInfo || '',
      date: formData.date,
      internalCost: internal,
      billedCost: billed,
      driverWage: modalSource === 'INTERNAL' ? wage : 0,
      unit: unit,
      qty: unit === 'CONTRACT' ? 0 : parseFloat(qty),
      unitPrice: unit === 'CONTRACT' ? 0 : parseNumber(unitPrice)
    };

    if (editId) {
      updateLog(editId, finalData as any);
      toast.success('سرویس لجستیک با موفقیت ویرایش شد.');
    } else {
      addLog(finalData as any);
      toast.success('سرویس لجستیک با موفقیت ثبت شد.');
    }
    
    setIsOpen(false);
  };

  if (!isOpen || !portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      <div key="logistics-wrapper" className="fixed inset-0 z-[99000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto modal-scrollbar" dir="rtl">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }} 
          className="relative w-full max-w-4xl my-auto p-6 sm:p-8 pb-32 sm:pb-40 rounded-[2.5rem] backdrop-blur-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-6 max-h-[85vh] overflow-x-hidden overflow-y-auto modal-scrollbar z-10 box-border"
          style={{ clipPath: 'inset(0 round 2.5rem)' }}
        >
          
          <div className="flex justify-between items-center px-6 py-4 rounded-2xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-sm sticky top-0 z-[100]">
            <h3 className="text-xl font-black flex items-center gap-3 text-indigo-600 dark:text-indigo-400 drop-shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md">
                <Route className="w-5 h-5" />
              </div>
              {editId ? 'ویرایش سرویس ثبت‌شده' : 'ثبت بارنامه / کارکرد'}
            </h3>
            {/* 💡 کلمه title="بستن" حذف شد تا اون سایه و باگ Tooltip کروم کاملا رفع بشه */}
            <button 
              onClick={() => setIsOpen(false)} 
              className="w-10 h-10 rounded-full bg-slate-200/60 dark:bg-slate-800/80 hover:bg-rose-500 hover:text-white text-slate-500 dark:text-slate-300 flex items-center justify-center transition-all duration-300 shadow-inner group cursor-pointer"
            >
              <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-[80]">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">نوع سرویس</label>
              <div className={`flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700/50 transition-all duration-300 ${lockedType ? 'opacity-60 pointer-events-none grayscale-[30%]' : ''}`}>
                <button onClick={() => {setModalType('TRANSPORT'); setUnit('SERVICE'); setFormData(prev => ({...prev, vehicleInfo: ''}));}} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${modalType === 'TRANSPORT' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>خودرو و باربری</button>
                <button onClick={() => {setModalType('EQUIPMENT'); setUnit('DAILY'); setFormData(prev => ({...prev, vehicleInfo: ''}));}} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${modalType === 'EQUIPMENT' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ابزار و تجهیزات</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">مالکیت ناوگان</label>
              <div className={`flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700/50 transition-all duration-300 ${lockedType ? 'opacity-60 pointer-events-none grayscale-[30%]' : ''}`}>
                <button onClick={() => setModalSource('EXTERNAL')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${modalSource === 'EXTERNAL' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>آزاد (کرایه از بیرون)</button>
                <button onClick={() => setModalSource('INTERNAL')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${modalSource === 'INTERNAL' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>داخلی (شرکتی)</button>
              </div>
            </div>
            <div className="space-y-2 relative z-50">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">تاریخ ثبت عملیات</label>
              <GlassDatePicker value={formData.date} onChange={(val: string) => setFormData(prev => ({...prev, date: val}))} placeholder="تاریخ عملیات" />
            </div>
          </div>

          <div className="space-y-4 relative z-[70]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl">
              <div className={`space-y-2 relative z-[75] transition-all duration-300 ${lockedClient ? 'opacity-60 pointer-events-none grayscale-[30%]' : ''}`}>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Building2 className="w-3.5 h-3.5"/> کارفرما</label>
                <GlassSelect options={[{value: 'NO_CLIENT', label: 'بدون کارفرما (آزاد)'}, ...clientOptions]} value={formData.clientId || 'NO_CLIENT'} onChange={(val: string) => setFormData(prev => ({...prev, clientId: val === 'NO_CLIENT' ? '' : val, projectId: '', phaseId: 'GENERAL'}))} placeholder="انتخاب کارفرما..." hasSearch />
              </div>
              <div className={`space-y-2 relative z-[70] transition-all duration-300 ${lockedProject ? 'opacity-60 pointer-events-none grayscale-[30%]' : ''}`}>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Briefcase className="w-3.5 h-3.5"/> پروژه مربوطه *</label>
                <GlassSelect options={projectOptions} value={formData.projectId} onChange={(val: string) => { const proj = allProjects.find(p => p.id === val); setFormData(prev => ({...prev, projectId: val, clientId: proj ? proj.clientId : prev.clientId, phaseId: 'GENERAL'})); }} placeholder="انتخاب پروژه..." hasSearch />
              </div>
              <div className="space-y-2 relative z-[65]">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Layers className="w-3.5 h-3.5"/> ارتباط با فاز پروژه</label>
                <GlassSelect options={phaseOptions} value={formData.phaseId} onChange={(val: string) => setFormData(prev => ({...prev, phaseId: val}))} placeholder="هزینه عمومی پروژه" disabled={!formData.projectId} hasSearch />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 relative z-[60] sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">شرح بار یا سرویس (مثال: حمل نخاله / گودبرداری) *</label>
                <GlassInputWrapper className="h-[46px] px-4">
                  <input value={formData.title} onChange={e => setFormData(prev => ({...prev, title: e.target.value}))} className="w-full bg-transparent border-none outline-none font-bold text-sm text-slate-900 dark:text-white" placeholder="توضیح کوتاه..." />
                </GlassInputWrapper>
              </div>

              <div className={`space-y-2 relative z-[50] transition-all duration-300 ${lockedVehicle ? 'opacity-60 pointer-events-none grayscale-[30%]' : ''}`}>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  {modalType === 'TRANSPORT' ? <Truck className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />} {modalSource === 'INTERNAL' ? (modalType === 'TRANSPORT' ? 'انتخاب خودرو از ناوگان' : 'انتخاب ابزار از انبار') : 'نام ماشین/ابزار (خارجی)'}
                </label>
                {modalSource === 'INTERNAL' ? (
                  <GlassSelect disabled={lockedVehicle} options={modalType === 'TRANSPORT' ? internalVehicleOptions : internalToolOptions} value={formData.vehicleInfo} onChange={(val: string) => setFormData(prev => ({...prev, vehicleInfo: val}))} placeholder="انتخاب کنید..." />
                ) : (
                  <GlassInputWrapper className="h-[46px] px-4">
                    <input readOnly={lockedVehicle} value={formData.vehicleInfo} onChange={e => setFormData(prev => ({...prev, vehicleInfo: e.target.value}))} className="w-full bg-transparent border-none outline-none font-bold text-sm text-slate-900 dark:text-white" placeholder="تایپ کنید..." />
                  </GlassInputWrapper>
                )}
              </div>
              
              <div className="space-y-2 relative z-[45]">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><HardHat className="w-3.5 h-3.5"/> انتخاب راننده / اپراتور</label>
                <GlassSelect options={driverOptions} value={formData.provider} onChange={handleDriverChange} placeholder="جستجو یا انتخاب راننده..." hasSearch />
              </div>
            </div>
          </div>

          <div className="p-5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-2xl space-y-4 relative z-[40]">
            <h4 className="text-sm font-black text-amber-800 dark:text-amber-500 flex items-center gap-2"><Calculator className="w-4 h-4"/> جزئیات واحد و محاسبات</h4>

            <div className="p-4 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-amber-200/50 dark:border-amber-800/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 overflow-visible relative z-[90]">
              <div className="space-y-1.5 relative z-[100]">
                <label className="text-[10px] font-bold text-slate-500">واحد محاسبه</label>
                <GlassSelect options={activeUnits} value={unit} onChange={(v: string) => {setUnit(v); setQty('1');}} placeholder="انتخاب واحد" />
              </div>
              
              {unit === 'CONTRACT' ? (
                <div className="col-span-3 space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-600">مبلغ کل مقطوع (تومان)</label>
                  <input value={formatNumber(lumpSumPrice)} onChange={e => setLumpSumPrice(e.target.value)} className="w-full h-[42px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 outline-none text-sm font-black text-amber-700 dark:text-amber-400 dir-ltr text-slate-900 dark:text-white" placeholder="مبلغ کل توافقی..." />
                </div>
              ) : (
                <>
                  {modalType === 'EQUIPMENT' && unit === 'DAILY' ? (
                    <div className="col-span-2 grid grid-cols-2 gap-2 relative z-[95]">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500">از تاریخ</label>
                        <GlassDatePicker value={dateFrom} onChange={setDateFrom} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500">تا تاریخ</label>
                        <GlassDatePicker value={dateTo} onChange={setDateTo} />
                      </div>
                    </div>
                  ) : modalType === 'EQUIPMENT' && unit === 'HOURLY' ? (
                    <div className="col-span-2 grid grid-cols-2 gap-2 relative z-[95]">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500">از ساعت</label>
                        <LuxuryTimePicker value={startTime} onChange={setStartTime} placeholder="08:00" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500">تا ساعت</label>
                        <LuxuryTimePicker value={endTime} onChange={setEndTime} placeholder="16:00" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500">تعداد / مقدار</label>
                      <input value={qty} onChange={e => setQty(e.target.value)} className="w-full h-[42px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 outline-none text-sm font-bold dir-ltr text-center text-slate-900 dark:text-white" placeholder="1" />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-amber-600">قیمت واحد (تومان)</label>
                    <input value={formatNumber(unitPrice)} onChange={e => setUnitPrice(e.target.value)} className="w-full h-[42px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 outline-none text-sm font-black text-amber-700 dark:text-amber-400 dir-ltr text-slate-900 dark:text-white" placeholder="0" />
                  </div>
                </>
              )}

              {modalType === 'EQUIPMENT' && unit === 'DAILY' && !editId && (
                <div className="col-span-full pt-2">
                  <motion.div 
                    whileHover={{ scale: 1.01 }} 
                    whileTap={{ scale: 0.99 }} 
                    onClick={() => setSplitIntervals(!splitIntervals)}
                    className={`flex items-center gap-3.5 cursor-pointer p-4 rounded-2xl border transition-all duration-300 select-none shadow-sm ${
                      splitIntervals 
                        ? 'border-indigo-500 bg-indigo-50/90 dark:bg-indigo-900/40 shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                        : 'border-indigo-200/60 dark:border-indigo-800/50 bg-white/70 dark:bg-slate-800/70 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all duration-300 shrink-0 ${
                      splitIntervals ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 border-indigo-400 shadow-md scale-105' : 'bg-white/80 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                    }`}>
                      <AnimatePresence>
                        {splitIntervals && (
                          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                            <CheckCircle className="w-4 h-4 text-white stroke-[3]" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                        <CalendarRange className="w-4 h-4 text-indigo-500" /> ثبت هر روز از بازه زمانی به صورت رکورد مجزا و جداگانه
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                        بازه انتخاب‌شده: <span className="text-indigo-600 dark:text-indigo-400 font-black">{calculatedDaysCount} روز</span> 
                        {unitPrice ? ` | قیمت واحد: ${formatNumber(unitPrice)} تومان | مجموع برآورد: ${(calculatedDaysCount * parseNumber(unitPrice)).toLocaleString()} تومان` : ''}
                      </span>
                    </div>
                  </motion.div>
                </div>
              )}

              {modalType === 'TRANSPORT' && modalSource === 'INTERNAL' && (
                <div className="col-span-full border-t border-amber-200/50 dark:border-amber-700/50 pt-3 mt-1 grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5 relative z-40 sm:col-span-2 md:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500">نحوه محاسبه دستمزد</label>
                    <GlassSelect options={[
                      {value: 'UNIT', label: 'براساس تعداد (سرویسی)'}, 
                      {value: 'FIXED', label: 'مبلغ کل مقطوع'},
                      {value: 'NONE', label: 'بدون دستمزد (روزمزد / محاسبه‌شده)'}
                    ]} value={driverWageType} onChange={(v: any) => setDriverWageType(v)} placeholder="نوع دستمزد" />
                  </div>
                  
                  {driverWageType === 'NONE' ? (
                     <div className="space-y-1.5 sm:col-span-2 md:col-span-3 flex items-end">
                       <div className="w-full h-[42px] bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-3 flex items-center justify-center text-xs font-black text-emerald-600 dark:text-emerald-400">
                         دستمزد صفر در نظر گرفته می‌شود (آمار بارنامه ثبت می‌شود)
                       </div>
                     </div>
                  ) : (
                    <div className="space-y-1.5 sm:col-span-2 md:col-span-3">
                      <label className="text-[10px] font-bold text-fuchsia-600">
                        {driverWageType === 'FIXED' ? 'مبلغ کل مقطوع دستمزد راننده (تومان)' : 'قیمت واحد دستمزد راننده برای هر سرویس (تومان)'}
                      </label>
                      {driverWageType === 'FIXED' ? (
                        <input value={formatNumber(driverFixedWage)} onChange={e => setDriverFixedWage(e.target.value)} className="w-full h-[42px] bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-200 dark:border-fuchsia-700 rounded-xl px-3 outline-none text-sm font-black text-fuchsia-700 dark:text-fuchsia-400 dir-ltr text-slate-900 dark:text-white" placeholder="0" />
                      ) : (
                        <input value={formatNumber(driverUnitPrice)} onChange={e => setDriverUnitPrice(e.target.value)} className="w-full h-[42px] bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-200 dark:border-fuchsia-700 rounded-xl px-3 outline-none text-sm font-black text-fuchsia-700 dark:text-fuchsia-400 dir-ltr text-slate-900 dark:text-white" placeholder="0" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {modalSource === 'EXTERNAL' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-rose-600 dark:text-rose-400">هزینه نهایی پرداختی به بیرون *</label>
                  <input value={formatNumber(formData.internalCost)} readOnly className="w-full h-[46px] bg-slate-50 dark:bg-slate-800 border border-rose-200 dark:border-rose-800/50 rounded-xl px-4 outline-none font-black text-lg text-rose-600 dark:text-rose-400 text-left dir-ltr shadow-inner cursor-not-allowed text-slate-900 dark:text-white" placeholder="0" />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400">جمع دستمزد اپراتور/راننده شما</label>
                  <input value={formatNumber(formData.driverWage)} readOnly className="w-full h-[46px] bg-slate-50 dark:bg-slate-800 border border-fuchsia-200 dark:border-fuchsia-800/50 rounded-xl px-4 outline-none font-black text-lg text-fuchsia-600 dark:text-fuchsia-400 text-left dir-ltr shadow-inner cursor-not-allowed text-slate-900 dark:text-white" placeholder="0" />
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">ارزش کل کارکرد / مبلغ فاکتور کارفرما</label>
                <input value={formatNumber(formData.billedCost)} onChange={e => modalSource === 'EXTERNAL' ? setFormData(prev => ({...prev, billedCost: e.target.value})) : null} readOnly={modalSource === 'INTERNAL'} className={`w-full h-[46px] ${modalSource === 'INTERNAL' ? 'bg-slate-50 dark:bg-slate-800 cursor-not-allowed shadow-inner' : 'bg-white dark:bg-slate-900 shadow-sm'} border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 outline-none font-black text-lg text-emerald-600 dark:text-emerald-400 text-left dir-ltr transition-all text-slate-900 dark:text-white`} placeholder="در صورت خالی بودن = قیمت پرداختی" />
              </div>
            </div>
          </div>

          <div className="pt-4 relative z-20">
            <button onClick={handleSaveRecord} className="w-full py-4 text-white font-black rounded-2xl shadow-[0_10px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_10px_25px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2 active:scale-95 transition-all bg-gradient-to-r from-indigo-500 to-purple-500 cursor-pointer">
              <CheckCircle className="w-5 h-5"/> {editId ? 'ثبت تغییرات و ویرایش' : 'تایید و ثبت نهایی'}
            </button>
          </div>

        </motion.div>
      </div>

      <LaborFormModal key="labor-form-modal" isOpen={isLaborModalOpen} onClose={() => setIsLaborModalOpen(false)} />
    </AnimatePresence>,
    portalTarget
  );
}