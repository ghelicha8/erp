import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CalendarDays, Activity, Briefcase, Building2, UserCircle, 
  CheckCircle2, Trash2, ChevronDown, Check, Search,
  CloudRain, Sun, Snowflake, Wind, HardHat, 
  Pickaxe, Clock, SquareActivity, Layers, 
  Zap,
  UserPlus, Hash, Ruler, Tag, FileSignature
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useLaborStore } from '../../../store/laborStore';
import type { WeatherCondition, WorkUnit, LaborRecordType, AttendanceStatus, WorkerProfile, PaymentType } from '../../../store/laborStore';

import { useProjectStore } from '../../projects/store/projectStore';
import { useClientStore } from '../../../store/clientStore';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';

import LaborFormModal from '../../labor/components/LaborFormModal';

// ==========================================
// 💡 الگوریتم مترجم هوشمند اعداد
// ==========================================
const parseAmount = (val?: string | number) => {
  if (!val) return 0;
  const enVal = String(val).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/,/g, '').replace(/\D/g, ''); 
  return Number(enVal) || 0;
};

const formatAmount = (val: string | number) => {
  const num = parseAmount(val);
  return num === 0 ? '' : num.toLocaleString('en-US');
};

// ==========================================
// 💡 ZOD SCHEMA (داینامیک شیفت‌بندی)
// ==========================================
const shiftSchema = z.object({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  specialtyId: z.string().optional(),
  workType: z.string().min(1, 'شرح کار الزامی است'),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  phaseId: z.string().optional(),
  billedUnit: z.string(),
  billedQuantity: z.string().min(1),
  billedRate: z.string().min(1),
  isCoveredByClientMonthly: z.boolean().optional(),
  isBilledAsFullDay: z.boolean().optional(),
});

const logSchema = z.object({
  date: z.string().min(1, 'تاریخ الزامی است'),
  workerUnit: z.string(),
  workerQuantity: z.string().min(1),
  workerRate: z.string().min(1),
  isCoveredByUsMonthly: z.boolean().optional(),
  
  shifts: z.array(shiftSchema).min(1, 'حداقل یک شیفت باید ثبت شود'),

  overtimeHours: z.string().optional(),
  overtimeWage: z.string().optional(),
  foodDeduction: z.string().optional(),
  penaltyDeduction: z.string().optional(),
  bonus: z.string().optional(),
  incidentDescription: z.string().optional(),
});
type LogFormValues = z.infer<typeof logSchema>;

// ==========================================
// 💡 کامپوننت‌ها و استایل‌های پایه
// ==========================================
const GlassScrollStyles = () => (
  <style>{`
    .glass-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .glass-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }
    .glass-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 10px; transition: background 0.3s ease; }
    .glass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.8); }
    .dark .glass-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
    .dark .glass-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.4); }
  `}</style>
);


const GlowSwitch = ({ checked, onChange, label, sublabel, theme = 'indigo' }: any) => {
  const isIndigo = theme === 'indigo';
  return (
    <div onClick={() => onChange(!checked)} className={`flex items-center gap-3 cursor-pointer p-3 rounded-2xl border transition-all duration-300 shadow-sm ${checked ? (isIndigo ? 'border-indigo-400 bg-indigo-50/80 dark:bg-indigo-900/30' : 'border-blue-400 bg-blue-50/80 dark:bg-blue-900/30') : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'}`}>
      <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 shadow-inner shrink-0 ${checked ? (isIndigo ? 'bg-indigo-500' : 'bg-blue-500') : 'bg-slate-300 dark:bg-slate-600'}`}>
         <motion.div animate={{ x: checked ? -20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow-md" />
      </div>
      <div className="flex flex-col">
        <span className={`text-[11px] font-black transition-colors ${checked ? (isIndigo ? 'text-indigo-700 dark:text-indigo-300' : 'text-blue-700 dark:text-blue-300') : 'text-slate-700 dark:text-slate-300'}`}>{label}</span>
        {sublabel && <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{sublabel}</span>}
      </div>
    </div>
  );
};

const LuxuryTimePicker = ({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const [isPM, setIsPM] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const openClock = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 10, left: rect.left + rect.width / 2 });
      setMode('hours');
      setIsOpen(true);
    }
  };

  const handleHourSelect = (h: number) => {
    const formattedHour = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
    const mStr = value ? value.split(':')[1] : '00';
    onChange(`${String(formattedHour).padStart(2, '0')}:${mStr}`);
    setMode('minutes');
  };

  const handleMinuteSelect = (m: number) => {
    const hStr = value ? value.split(':')[0] : '08';
    onChange(`${hStr}:${String(m).padStart(2, '0')}`);
    setIsOpen(false);
  };

  const currentH = value ? parseInt(value.split(':')[0], 10) : 8;
  const currentM = value ? parseInt(value.split(':')[1], 10) : 0;
  const displayH = currentH % 12 || 12;

  return (
    <>
      <button type="button" ref={btnRef} onClick={() => isOpen ? setIsOpen(false) : openClock()} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 h-[48px] text-xs font-black text-slate-700 dark:text-slate-200 flex justify-between items-center outline-none transition-all shadow-inner hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Clock className="w-4 h-4 shrink-0" />
          <span dir="ltr">{value || placeholder}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && mounted && typeof document !== 'undefined' && document.body ? createPortal(
        <>
          <div className="fixed inset-0 z-[999999]" onClick={() => setIsOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: -20, x: '-50%' }} animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, scale: 0.9, y: -20, x: '-50%' }} style={{ top: coords.top, left: coords.left }} className="fixed bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-700 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] z-[1000000] p-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 mb-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl shadow-inner">
               <button type="button" onClick={() => setIsPM(false)} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${!isPM ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-700'}`}>AM (صبح)</button>
               <button type="button" onClick={() => setIsPM(true)} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${isPM ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-700'}`}>PM (عصر)</button>
            </div>
            <div className="relative w-56 h-56 rounded-full bg-slate-50 dark:bg-slate-800 border-[6px] border-slate-200 dark:border-slate-700 shadow-inner flex items-center justify-center">
               <div className="absolute w-3 h-3 bg-indigo-500 rounded-full z-20 shadow-md" />
               <div className="absolute w-1 h-20 bg-indigo-500 rounded-full origin-bottom z-10" style={{ bottom: '50%', transform: `rotate(${mode === 'hours' ? displayH * 30 : currentM * 6}deg)`, transformOrigin: 'bottom center' }} />
               {[...Array(12)].map((_, i) => {
                 const num = mode === 'hours' ? (i === 0 ? 12 : i) : i * 5;
                 const angle = (i * 30 - 90) * (Math.PI / 180);
                 const x = 50 + 38 * Math.cos(angle);
                 const y = 50 + 38 * Math.sin(angle);
                 const isSelected = mode === 'hours' ? displayH === num : currentM === num;
                 return (
                   <button key={i} type="button" onClick={() => mode === 'hours' ? handleHourSelect(num) : handleMinuteSelect(num)} style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }} className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all z-20 ${isSelected ? 'bg-indigo-500 text-white shadow-lg scale-110' : 'text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:scale-110'}`}>
                     {String(num).padStart(2, '0')}
                   </button>
                 );
               })}
            </div>
          </motion.div>
        </>, document.body
      ) : null}
    </>
  );
};

const PortalSelect = ({ value, onChange, options, placeholder, icon: Icon, searchable = false, className = '', disabled = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  
  const selected = options.find((o:any) => o.id === value || o.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((o:any) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  const openDropdown = () => {
    if (disabled) return;
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width });
      setIsOpen(true);
    }
  };

  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return; 
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
      <button type="button" ref={btnRef} onClick={() => isOpen ? setIsOpen(false) : openDropdown()} disabled={disabled} className={`w-full h-[48px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl px-4 flex justify-between items-center outline-none transition-all shadow-inner hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/80 border-slate-300' : ''} ${className}`}>
        <div className="flex items-center gap-2 truncate text-right flex-1">
           {Icon && <Icon className="w-4 h-4 text-indigo-500 shrink-0" />}
           <span className="truncate text-xs font-bold text-slate-700 dark:text-slate-200 pt-0.5">
             {selected ? selected.label : placeholder}
           </span>
        </div>
        {!disabled && <ChevronDown className={`w-4 h-4 text-indigo-500 shrink-0 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {/* 💡 گارد امنیتی DOM برای جلوگیری از ارور Portal */}
      {isOpen && mounted && typeof document !== 'undefined' && document.body ? createPortal(
        <>
          <div className="fixed inset-0 z-[999999]" onClick={() => setIsOpen(false)} />
          <motion.div ref={dropdownRef} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ top: coords.top, left: coords.left, width: coords.width }} className="fixed bg-white/95 dark:bg-slate-800/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] z-[1000000] overflow-hidden flex flex-col max-h-72 min-w-[240px]">
            {searchable && (
              <div className="p-2 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                <div className="relative group rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
                   <div className="absolute inset-0 rounded-xl pointer-events-none group-focus-within:animate-pulse z-0" style={{ padding: '2px', background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', opacity: 0.5 }} />
                   <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 z-10" />
                   <input type="text" autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="جستجو..." className="w-full bg-transparent border-none pr-9 pl-3 py-2.5 text-xs font-bold outline-none text-slate-700 dark:text-slate-200 relative z-10" />
                </div>
              </div>
            )}
            <div className="overflow-y-auto glass-scroll p-2 flex-1 space-y-1">
              {filteredOptions.length > 0 ? filteredOptions.map((opt: any, index: number) => {
                const OptIcon = opt.icon || Check;
                const isSelected = value === opt.id || value === opt.value;
                const isNewAction = opt.id === 'NEW_WORKER'; 
                
                return (
                  <motion.button 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}
                    type="button" 
                    key={opt.id || opt.value} 
                    onClick={() => { onChange(opt.id || opt.value); setIsOpen(false); setSearchTerm(''); }} 
                    className={`w-full text-right px-3 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-between group ${
                      isNewAction 
                        ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500 hover:to-purple-600 text-indigo-600 dark:text-indigo-400 hover:text-white border border-indigo-200 dark:border-indigo-800/50 shadow-sm' 
                        : isSelected 
                        ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg transition-colors ${
                        isNewAction ? 'bg-indigo-500 text-white group-hover:bg-white group-hover:text-indigo-600 shadow-md' 
                        : isSelected ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30'
                      }`}>
                        <OptIcon className="w-4 h-4" />
                      </div>
                      <span className="truncate pt-0.5">{opt.label}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 drop-shadow-md" />}
                  </motion.button>
                )
              }) : (
                <div className="py-8 text-center flex flex-col items-center justify-center gap-2 opacity-50">
                  <Search className="w-8 h-8 text-slate-400" />
                  <span className="text-xs font-bold text-slate-500">موردی یافت نشد!</span>
                </div>
              )}
            </div>
          </motion.div>
        </>, document.body
      ) : null}
    </>
  );
};

interface NewLaborModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  editData?: any; 
  preSelectedDate?: string | null; 
}

export default function NewLaborModal({ projectId, isOpen, onClose, editData, preSelectedDate }: NewLaborModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { workers, addBulkLogs, specialtyTags, updateLog } = useLaborStore();
  const { projects } = useProjectStore();
  const { clients } = useClientStore();

  const project = projects.find(p => p.id === projectId);
  // 💡 تشخیص خودکار کارفرمای این پروژه
  const clientId = project?.clientId || 'FREE';
  const client = clients.find(c => c.id === clientId);

  // 💡 فرم داینامیک ماتریس چند شیفتی
  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: { 
      date: moment().format('jYYYY/jMM/jDD'),
      workerUnit: 'DAY',
      workerQuantity: '1', 
      workerRate: '',
      isCoveredByUsMonthly: false,
      overtimeHours: '', overtimeWage: '',
      foodDeduction: '', penaltyDeduction: '', bonus: '',
      shifts: [{
        projectId: projectId, // قفل روی پروژه فعلی
        phaseId: 'GENERAL',
        startTime: '08:00', endTime: '16:00', 
        specialtyId: '', 
        workType: '',
        billedUnit: 'DAY',
        billedQuantity: '1',
        billedRate: '',
        isCoveredByClientMonthly: false,
        isBilledAsFullDay: false,
      }]
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'shifts' });
  const watchAll = watch();

  // 💡 استیت‌های انتخاب هوشمند نیروی کار
  const [, setWorkerNameInput] = useState('');
  const [, setShowAutocomplete] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  
  // 💡 مودال ایجاد پروفایل جدید کارگر
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const prevWorkersLength = useRef(workers.length);

  const [weather, setWeather] = useState<WeatherCondition>('NORMAL');
  const [hasIncident, setHasIncident] = useState(false);
  const [showTimeInputs, setShowTimeInputs] = useState(false); 
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);

  const [isBulkDate, setIsBulkDate] = useState(false);
  const [dateTo, setDateTo] = useState('');

  // 💡 تشخیص هوشمندانه اینکه آیا این نیروی کار کلا "حقوق‌بگیر ماهانه" است یا خیر
  const hasMonthlyContractWithUs = useMemo(() => {
    if (!selectedWorker) return false;
    if (selectedWorker.defaultPaymentType === 'MONTHLY') return true;
    if (selectedWorker.contractStartDate && selectedWorker.contractEndDate) {
      return watchAll.date >= selectedWorker.contractStartDate && watchAll.date <= selectedWorker.contractEndDate;
    }
    return false;
  }, [watchAll.date, selectedWorker]);

  const hasMonthlyContractWithClient = (_shiftProjectId: string) => {
    if (!selectedWorker) return false;
    if (selectedWorker.defaultPaymentType === 'PROJECT_MONTHLY') return true;
    return false;
  };

  // 💡 اگر کارگر جدیدی ساخته شد، اتوماتیک انتخاب شود
  useEffect(() => {
    if (workers.length > prevWorkersLength.current) {
       const newWorker = workers[0]; 
       if (newWorker) handleSelectWorker(newWorker);
    }
    prevWorkersLength.current = workers.length;
  }, [workers]);

  useEffect(() => {
    if (isOpen) {
      const defaultDate = preSelectedDate || moment().format('jYYYY/jMM/jDD');
      
      if (editData) {
        setWorkerNameInput(editData.workerName || '');
        setSelectedWorker(workers.find(w => w.id === editData.workerId) || null);
        
        setIsBulkDate(false);
        setDateTo('');

        reset({
          date: editData.date || defaultDate,
          workerUnit: editData.workerUnit || 'DAY',
          workerQuantity: editData.workerQuantity?.toString() || '1',
          workerRate: formatAmount(editData.workerRate || 0),
          isCoveredByUsMonthly: editData.isCoveredByUsMonthly || false,
          overtimeHours: editData.overtimeHours?.toString() || '',
          overtimeWage: formatAmount(editData.overtimeWage || 0),
          foodDeduction: formatAmount(editData.foodDeduction || 0),
          penaltyDeduction: formatAmount(editData.penaltyDeduction || 0),
          bonus: formatAmount(editData.bonus || 0),
          incidentDescription: editData.incidentDescription || '',
          shifts: [{
            projectId: editData.projectId || projectId,
            phaseId: editData.phaseId || 'GENERAL',
            startTime: editData.startTime || '08:00',
            endTime: editData.endTime || '16:00',
            specialtyId: editData.specialtyId || '',
            workType: editData.workType || '',
            billedUnit: editData.billedUnit || 'DAY',
            billedQuantity: editData.billedQuantity?.toString() || '1',
            billedRate: formatAmount(editData.billedRate || 0),
            isCoveredByClientMonthly: editData.isCoveredByClientMonthly || false,
            isBilledAsFullDay: editData.isBilledAsFullDay || false,
          }]
        });
        setHasIncident(!!editData.hasIncident);
        setVoiceUrl(editData.voiceMemoUrl || null);
        setWeather(editData.weather || 'NORMAL');
      } else {
        setWorkerNameInput('');
        setSelectedWorker(null);
        setIsBulkDate(false);
        setDateTo('');
        
        reset({
          date: defaultDate,
          workerUnit: 'DAY', workerQuantity: '1', workerRate: '', isCoveredByUsMonthly: false,
          overtimeHours: '', overtimeWage: '', foodDeduction: '', penaltyDeduction: '', bonus: '',
          shifts: [{
            projectId: projectId, // قفل روی پروژه فعلی
            phaseId: 'GENERAL', startTime: '08:00', endTime: '16:00', 
            specialtyId: '', workType: '', billedUnit: 'DAY', billedQuantity: '1', billedRate: '',
            isCoveredByClientMonthly: false, isBilledAsFullDay: false,
          }]
        });
        setHasIncident(false);
        setVoiceUrl(null);
        setWeather('NORMAL');
      }
    }
  }, [isOpen, editData, preSelectedDate, reset, workers, projectId]);

  // 💡 برطرف کردن باگ dateFrom : از watchAll.date استفاده شد
  useEffect(() => {
    if ((isBulkDate) && watchAll.date && dateTo) {
      const start = moment(watchAll.date, 'jYYYY/jMM/jDD');
      const end = moment(dateTo, 'jYYYY/jMM/jDD');
      if (end.isValid() && start.isValid() && end.isSameOrAfter(start)) {
        setValue('workerQuantity', (end.diff(start, 'days') + 1).toString());
      }
    }
  }, [watchAll.date, dateTo, isBulkDate, setValue]);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => { if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) setShowAutocomplete(false); };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  // 💡 لیست کارگران
  const workerOptions = useMemo(() => [
    { id: 'NEW_WORKER', label: 'ثبت پروفایل نیروی جدید', icon: UserPlus },
    ...workers.map(w => ({ id: w.id, label: `${w.name} ${w.lastName || ''}`.trim(), icon: UserCircle }))
  ], [workers]);

  // 💡 قفل گذاری کارفرما و پروژه‌ها (فقط همین پروژه مجاز است)
  const activeClientOptions = [{ id: clientId, label: client ? `${client.name} ${client.lastName}` : (clientId === 'FREE' ? 'بدون کارفرما (آزاد)' : 'کارفرمای پروژه'), icon: Briefcase }];
  
  const shiftProjectOptions = [{ id: projectId, label: project ? project.name || project.title : 'پروژه فعلی', icon: Building2 }];

  // 💡 فیلتر کردن تخصص‌ها فقط بر اساس پروفایل کارگر انتخاب شده
  const filteredSpecialties = useMemo(() => {
    if (!selectedWorker || !selectedWorker.specialtyIds || selectedWorker.specialtyIds.length === 0) return specialtyTags.map(t => ({ id: t.id, label: t.name, icon: Pickaxe }));
    return specialtyTags.filter(t => selectedWorker.specialtyIds.includes(t.id)).map(t => ({ id: t.id, label: t.name, icon: Pickaxe }));
  }, [selectedWorker, specialtyTags]);

  const unitOptions = [
    { id: 'DAY', label: 'روز', icon: CalendarDays }, { id: 'HOUR', label: 'ساعت', icon: Clock }, { id: 'METER', label: 'متر', icon: Ruler }, 
    { id: 'ITEM', label: 'آیتم/عدد', icon: Hash }, { id: 'SERVICE', label: 'سرویس', icon: Activity }, { id: 'CONTRACT', label: 'پروژه‌ای/کنترات', icon: FileSignature }, { id: 'MONTH', label: 'ماهانه', icon: CalendarDays }
  ];


  const weatherIcons: { id: WeatherCondition; icon: any; color: string }[] = [
    { id: 'SUNNY', icon: Sun, color: 'text-amber-500' }, { id: 'CLOUDY', icon: CloudRain, color: 'text-slate-400' }, { id: 'RAINY', icon: CloudRain, color: 'text-blue-500' }, { id: 'SNOWY', icon: Snowflake, color: 'text-cyan-300' }, { id: 'WINDY', icon: Wind, color: 'text-teal-400' }
  ];

  const handleCurrencyChange = (field: string, value: string) => {
    setValue(field as any, formatAmount(value), { shouldValidate: true });
  };

  const handleSelectWorker = (worker: WorkerProfile) => {
    setWorkerNameInput(worker.name);
    setSelectedWorker(worker);
    setValue('workerRate', formatAmount(worker.defaultBaseWage || 0));
    
    if (worker.priceBook && worker.priceBook.length > 0) {
       setValue('workerUnit', worker.priceBook[0].workerUnit);
       setValue('shifts.0.billedUnit', worker.priceBook[0].billedUnit);
       setValue('shifts.0.billedRate', formatAmount(worker.priceBook[0].billedRate));
       setValue('shifts.0.specialtyId', worker.priceBook[0].specialtyId);
    }
    setShowAutocomplete(false);
    toast.success(`نیرو (${worker.name}) انتخاب شد.`);
  };

  const handleSpecialtyChange = (index: number, specId: string) => {
    setValue(`shifts.${index}.specialtyId`, specId);
    if (selectedWorker?.priceBook) {
      const pb = selectedWorker.priceBook.find(p => p.specialtyId === specId);
      if (pb) {
        setValue(`shifts.${index}.billedUnit`, pb.billedUnit);
        setValue(`shifts.${index}.billedRate`, formatAmount(pb.billedRate));
      }
    }
  };

  const toggleFullDayArbitrage = (index: number) => {
    const shift = watchAll.shifts[index];
    if (shift.isBilledAsFullDay) {
      setValue(`shifts.${index}.isBilledAsFullDay`, false);
      setValue(`shifts.${index}.billedUnit`, watchAll.workerUnit);
      setValue(`shifts.${index}.billedQuantity`, watchAll.workerQuantity || '1');
      toast.info('محاسبه فاکتور کارفرما به حالت تناسبی برگشت.');
    } else {
      setValue(`shifts.${index}.isBilledAsFullDay`, true);
      setValue(`shifts.${index}.billedUnit`, 'DAY');
      setValue(`shifts.${index}.billedQuantity`, '1');
      toast.success('🪄 ۱ روز کامل برای این شیفت فاکتور شد.');
    }
  };

  const handleAddShift = () => {
    const N = fields.length;
    if (N === 1) {
      setValue('shifts.0.startTime', '08:00');
      setValue('shifts.0.endTime', '12:00');
    }
    append({
      projectId: projectId, // قفل روی این پروژه
      phaseId: 'GENERAL',
      startTime: N === 1 ? '13:00' : '', 
      endTime: N === 1 ? '17:00' : '',
      specialtyId: filteredSpecialties[0]?.id || '', 
      workType: '',
      billedUnit: 'DAY',
      billedQuantity: '1',
      billedRate: formatAmount(selectedWorker?.defaultBaseWage || 0),
      isCoveredByClientMonthly: false,
      isBilledAsFullDay: false,
    });
    toast.success('یک شیفت کاری جدید به امروز اضافه شد.');
  };


  // Logic: Live 3D Arbitrage Calculator
  const totalWorkerBaseRaw = parseAmount(watchAll.workerRate) * parseAmount(watchAll.workerQuantity);
  const totalWorkerBase = watchAll.isCoveredByUsMonthly ? 0 : totalWorkerBaseRaw;
  const overtimeCost = parseAmount(watchAll.overtimeHours) * parseAmount(watchAll.overtimeWage);
  const liveInternal = totalWorkerBase + overtimeCost + parseAmount(watchAll.bonus) - parseAmount(watchAll.foodDeduction) - parseAmount(watchAll.penaltyDeduction);

  const liveBilled = watchAll.shifts.reduce((sum, shift) => {
    const shiftBilled = parseAmount(shift.billedRate) * parseAmount(shift.billedQuantity);
    return sum + (shift.isCoveredByClientMonthly ? 0 : shiftBilled);
  }, 0) + overtimeCost; 

  const liveProfit = liveBilled - liveInternal;

  const generateDateRange = (startDate: string, endDate: string) => {
    const dates = [];
    let curr = moment(startDate, 'jYYYY/jMM/jDD');
    const end = moment(endDate, 'jYYYY/jMM/jDD');
    while (curr.isSameOrBefore(end)) {
      dates.push(curr.format('jYYYY/jMM/jDD'));
      curr.add(1, 'day');
    }
    return dates;
  };

  // SAVE LOGIC
  const saveWorkLog = (data: LogFormValues) => {
    if (!selectedWorker) return toast.error('لطفاً نیروی کار را از لیست انتخاب کنید.');

    const workerProfile = selectedWorker;

    const N = data.shifts.length;
    const splitDayGroupId = N > 1 ? crypto.randomUUID() : undefined;
    const splitRatio = 1 / N; 

    const baseWorkerQty = parseAmount(data.workerQuantity) * splitRatio;
    const baseWorkerRate = parseAmount(data.workerRate); 

    const createLogsForDate = (targetDate: string) => {
      return data.shifts.map((shift, index) => {
        const specialtyName = specialtyTags.find(s => s.id === shift.specialtyId)?.name || '';
        const finalWorkType = specialtyName ? `[${specialtyName}] ${shift.workType}` : shift.workType;

        return {
          recordType: 'WAGE' as LaborRecordType,
          projectId: shift.projectId || 'FREE',
          clientId: clientId, // 💡 قفل شده روی کارفرما
          phaseId: shift.phaseId === 'GENERAL' ? undefined : shift.phaseId,
          workerId: workerProfile.id,
          workerName: workerProfile.name,
          date: targetDate,
          startTime: shift.startTime || undefined,
          endTime: shift.endTime || undefined,
          specialtyId: shift.specialtyId || undefined,
          workType: finalWorkType,
          attendance: 'PRESENT' as AttendanceStatus,
          paymentType: 'DAILY' as PaymentType,
          
          workerUnit: data.workerUnit as WorkUnit,
          workerQuantity: baseWorkerQty,
          workerRate: baseWorkerRate,
          isCoveredByUsMonthly: data.isCoveredByUsMonthly,

          billedUnit: shift.billedUnit as WorkUnit,
          billedQuantity: parseAmount(shift.billedQuantity),
          billedRate: parseAmount(shift.billedRate),
          isCoveredByClientMonthly: shift.isCoveredByClientMonthly,
          isBilledAsFullDay: shift.isBilledAsFullDay,

          appliedStandardWorkHours: 8,
          
          overtimeHours: parseAmount(data.overtimeHours) * splitRatio,
          overtimeWage: parseAmount(data.overtimeWage),
          foodDeduction: parseAmount(data.foodDeduction) * splitRatio,
          penaltyDeduction: parseAmount(data.penaltyDeduction) * splitRatio,
          bonus: parseAmount(data.bonus) * splitRatio,

          weather: weather,
          hasIncident: hasIncident && index === 0, 
          incidentDescription: hasIncident && index === 0 ? data.incidentDescription : undefined,
          voiceMemoUrl: index === 0 ? (voiceUrl || undefined) : undefined,
          advancePayment: 0, 
          splitDayGroupId: splitDayGroupId
        };
      });
    };

    if (editData && editData.id) {
       const updatedLog = createLogsForDate(data.date)[0];
       updateLog(editData.id, updatedLog);
       toast.success('سابقه کارکرد با موفقیت ویرایش شد.');
    } else {
       if (isBulkDate && dateTo) {
          const dates = generateDateRange(data.date, dateTo);
          const allBulkLogs = dates.flatMap(d => createLogsForDate(d));
          addBulkLogs(allBulkLogs);
          toast.success(`تعداد ${allBulkLogs.length} رکورد برای بازه زمانی ثبت شد.`);
       } else {
          const logsToSave = createLogsForDate(data.date);
          addBulkLogs(logsToSave);
          toast.success(`تعداد ${N} شیفت کاری ثبت شد.`);
       }
    }
    onClose();
  };

  if (!isOpen || !mounted) return null;
  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6" dir="rtl">
        <GlassScrollStyles />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-5xl max-h-[95vh] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/50 dark:border-slate-700/60 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md"><Activity className="w-6 h-6" /></div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">{editData ? 'ویرایش کارکرد' : `ثبت کارکرد (${project?.title || 'پروژه'})`}</h2>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1">مدیریت هوشمند آربیتراژ و شیفت‌بندی</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 bg-white/50 dark:bg-slate-800/50 hover:bg-rose-100 hover:text-rose-500 rounded-xl transition-all shadow-sm"><X className="w-5 h-5" /></button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto glass-scroll p-4 sm:p-7 space-y-6">
            <form className="space-y-6">
              
              {/* 💡 بخش ۱: هویت کارگر و تنظیمات پایه */}
              <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700/50 pb-4 mb-4">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20"><HardHat className="w-5 h-5 text-indigo-500" /></div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">انتخاب نیرو و توافق مالی پایه</h3>
                    <span className="text-[10px] font-bold text-slate-500">این مبالغ هوشمندانه بین شیفت‌ها سرشکن می‌شود.</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
                  <div className="lg:col-span-4 space-y-1.5 relative z-[105]">
                    <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><UserCircle className="w-3.5 h-3.5 text-indigo-500"/> انتخاب نیروی کار *</label>
                    <PortalSelect 
                      options={workerOptions} 
                      value={selectedWorker?.id || ''} 
                      onChange={(val: string) => {
                        if (val === 'NEW_WORKER') setIsWorkerModalOpen(true);
                        else {
                          const w = workers.find(x => x.id === val);
                          if (w) handleSelectWorker(w);
                        }
                      }} 
                      placeholder="انتخاب یا ثبت نیروی جدید..." 
                      icon={UserCircle}
                      searchable={true} 
                    />
                  </div>

                  <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div className="space-y-1.5 min-w-0">
                       <label className="text-[11px] font-bold text-slate-500">مبنای دستمزد کارگر</label>
                       <Controller control={control} name="workerUnit" render={({ field }) => (<PortalSelect options={unitOptions} value={field.value} onChange={field.onChange} icon={Tag} />)} />
                     </div>
                     <div className="space-y-1.5 min-w-0">
                       <label className="text-[11px] font-bold text-slate-500">تعداد / مقدار</label>
                       <input {...register('workerQuantity')} type="number" step="any" className="w-full h-[48px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl px-3 text-sm font-black text-center text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner" />
                     </div>
                     <div className="space-y-1.5 min-w-0">
                       <label className="text-[11px] font-bold text-slate-500">فی دستمزد کل روز (تومان)</label>
                       <input value={watchAll.workerRate || ''} onChange={(e) => handleCurrencyChange('workerRate', e.target.value)} dir="ltr" className="w-full h-[48px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl px-4 text-sm font-black text-indigo-600 dark:text-indigo-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner" />
                     </div>
                  </div>
                </div>

                {/* 💡 هوشمندسازی نمایش دکمه جزو حقوق ثابت */}
                {hasMonthlyContractWithUs && (
                  <div className="mt-5">
                    <GlowSwitch 
                      theme="indigo"
                      checked={watchAll.isCoveredByUsMonthly} 
                      onChange={(val: boolean) => setValue('isCoveredByUsMonthly', val)} 
                      label="جزو حقوق ثابت ماهانه شرکت است" 
                      sublabel="با فعال‌سازی این گزینه، هزینه پایه کارگر صفر و بدهی جدیدی ثبت نمی‌شود (فقط اضافات/کسورات لحاظ می‌گردد)." 
                    />
                  </div>
                )}
              </div>

              {/* 💡 بخش ۲: شیفت‌های کاری */}
              <div className="space-y-4">
                {fields.map((shift, index) => {
                  const shiftProjectId = watchAll.shifts[index].projectId || 'FREE';
                  
                  // 💡 استخراج فازهای پروژه انتخاب شده
                  const activeProject = shiftProjectId !== 'FREE' ? projects.find(p => p.id === shiftProjectId) : null;
                  const shiftPhaseOptions = [
                    { id: 'GENERAL', label: 'عمومی / کل پروژه', icon: Layers },
                    ...(activeProject?.phases?.map((p:any) => ({ id: p.id, label: p.name, icon: Pickaxe })) || [])
                  ];

                  return (
                    <div key={shift.id} className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 border border-indigo-200/50 dark:border-indigo-800/30 rounded-3xl p-5 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between mb-4 border-b border-indigo-200/50 dark:border-indigo-800/30 pb-3">
                         <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500 text-white rounded-lg font-black text-xs">شیفت {index + 1}</div>
                            <span className="text-sm font-black text-indigo-900 dark:text-indigo-300">جزئیات کار و فاکتور کارفرما</span>
                         </div>
                         {fields.length > 1 && (
                           <button type="button" onClick={() => remove(index)} className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                         )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         
                         <div className="space-y-4">
                            <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 h-[48px]">
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-2">ثبت دقیق ساعت</span>
                              <div onClick={() => setShowTimeInputs(!showTimeInputs)} className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${showTimeInputs ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <motion.div animate={{ x: showTimeInputs ? -16 : 0 }} className="bg-white w-4 h-4 rounded-full shadow-md" />
                              </div>
                            </div>

                            <AnimatePresence>
                              {showTimeInputs && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-2 gap-3 relative z-[90] overflow-hidden">
                                  <div className="space-y-1 pt-1">
                                    <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3 text-indigo-500"/> از ساعت</label>
                                    <Controller control={control} name={`shifts.${index}.startTime`} render={({ field }) => (
                                       <LuxuryTimePicker value={field.value || ''} onChange={field.onChange} placeholder="--:--" />
                                    )} />
                                  </div>
                                  <div className="space-y-1 pt-1">
                                    <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3 text-indigo-500"/> تا ساعت</label>
                                    <Controller control={control} name={`shifts.${index}.endTime`} render={({ field }) => (
                                       <LuxuryTimePicker value={field.value || ''} onChange={field.onChange} placeholder="--:--" />
                                    )} />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className="grid grid-cols-2 gap-3 relative z-[85]">
                              <div className="space-y-1 relative min-w-0">
                                <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><UserCircle className="w-3 h-3 text-indigo-500"/> کارفرما</label>
                                <Controller control={control} name={`shifts.${index}.clientId`} render={() => (
                                  <PortalSelect options={activeClientOptions} value={clientId} onChange={() => {}} disabled={true} placeholder="قفل شده" icon={Briefcase} />
                                )} />
                              </div>
                              <div className="space-y-1 relative z-[80] min-w-0">
                                <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Building2 className="w-3 h-3 text-indigo-500"/> پروژه</label>
                                <Controller control={control} name={`shifts.${index}.projectId`} render={({ field }) => (
                                  <PortalSelect 
                                     options={shiftProjectOptions} 
                                     value={field.value} 
                                     onChange={() => {}} 
                                     disabled={true} // 💡 قفل شده روی پروژه فعلی
                                     placeholder="پروژه فعلی" 
                                     icon={Building2}
                                  />
                                )} />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative z-[75]">
                              <div className="space-y-1 relative min-w-0">
                                <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Layers className="w-3 h-3 text-indigo-500"/> فاز پروژه</label>
                                <Controller control={control} name={`shifts.${index}.phaseId`} render={({ field }) => (
                                  <PortalSelect options={shiftPhaseOptions} value={field.value} onChange={field.onChange} disabled={shiftProjectId === 'FREE'} placeholder="فاز عمومی" icon={Layers} />
                                )} />
                              </div>
                              <div className="space-y-1 relative min-w-0">
                                <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Pickaxe className="w-3 h-3 text-indigo-500"/> تخصص اعمال شده</label>
                                <Controller control={control} name={`shifts.${index}.specialtyId`} render={({ field }) => (
                                  <PortalSelect options={filteredSpecialties} value={field.value} onChange={(val: string) => handleSpecialtyChange(index, val)} placeholder={filteredSpecialties.length > 0 ? "انتخاب تخصص" : "بدون تخصص"} icon={Pickaxe} />
                                )} />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Briefcase className="w-3 h-3 text-indigo-500"/> شرح کار *</label>
                              <input {...register(`shifts.${index}.workType` as any)} placeholder="شرح وظایف در این شیفت..." className={`w-full h-[48px] bg-white/80 dark:bg-slate-900/80 border rounded-2xl px-4 text-sm font-bold text-slate-800 dark:text-white outline-none transition-all shadow-inner ${errors.shifts?.[index]?.workType ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'}`} />
                            </div>
                         </div>

                         <div className="space-y-4 flex flex-col h-full">
                            <div className={`flex-1 p-4 rounded-2xl border shadow-sm transition-colors duration-300 flex flex-col justify-center ${watchAll.shifts[index].isCoveredByClientMonthly ? 'bg-blue-50/80 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700'}`}>
                              <div className="flex items-center justify-between mb-2 border-b border-slate-200 dark:border-slate-700/50 pb-2">
                                <div className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-slate-400"/><span className="text-xs font-black text-slate-700 dark:text-slate-300">فاکتور کارفرما</span></div>
                                
                                <button type="button" onClick={() => toggleFullDayArbitrage(index)} className={`px-2 py-1 text-[9px] font-black rounded-lg border transition-all flex items-center justify-center gap-1 ${watchAll.shifts[index].isBilledAsFullDay ? 'bg-indigo-500 text-white border-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 hover:border-indigo-300'}`}>
                                  <Zap className={`w-3 h-3 ${watchAll.shifts[index].isBilledAsFullDay ? 'text-amber-300 animate-pulse' : ''}`}/>
                                  فاکتور ۱ روز کامل
                                </button>
                              </div>

                              {/* 💡 هوشمندسازی نمایش دکمه پوشش ماهانه کارفرما */}
                              {hasMonthlyContractWithClient(shiftProjectId) && (
                                <GlowSwitch 
                                  theme="blue"
                                  checked={watchAll.shifts[index].isCoveredByClientMonthly} 
                                  onChange={(val: boolean) => setValue(`shifts.${index}.isCoveredByClientMonthly`, val)} 
                                  label="تحت پوشش ماهانه کارفرما" 
                                  sublabel="فاکتور مجددی صادر نمی‌شود (پایه: ۰)" 
                                />
                              )}

                              <div className={`grid grid-cols-3 gap-3 mt-4 relative z-[60] transition-all duration-300 ${watchAll.shifts[index].isCoveredByClientMonthly ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                                <div className="space-y-1 min-w-0">
                                  <label className="text-[9px] font-bold text-slate-500">مبنا</label>
                                  <Controller control={control} name={`shifts.${index}.billedUnit`} render={({ field }) => (<PortalSelect options={unitOptions} value={field.value} onChange={field.onChange} disabled={watchAll.shifts[index].isBilledAsFullDay} icon={Tag} />)} />
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <label className="text-[9px] font-bold text-slate-500">مقدار</label>
                                  <input {...register(`shifts.${index}.billedQuantity` as any)} type="number" step="any" disabled={watchAll.shifts[index].isBilledAsFullDay} className={`w-full h-[48px] border border-slate-200 dark:border-slate-700 rounded-2xl px-2 text-sm font-black text-center text-slate-800 dark:text-white outline-none focus:border-indigo-500 ${watchAll.shifts[index].isBilledAsFullDay ? 'bg-slate-200 dark:bg-slate-700 cursor-not-allowed text-slate-500' : 'bg-slate-50 dark:bg-slate-900/50'}`} />
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <label className="text-[9px] font-bold text-slate-500">فی (تومان)</label>
                                  <input value={watchAll.shifts[index].billedRate || ''} onChange={(e) => handleCurrencyChange(`shifts.${index}.billedRate`, e.target.value)} dir="ltr" className="w-full h-[48px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl px-3 text-sm font-black text-slate-700 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-inner" />
                                </div>
                              </div>

                            </div>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button 
                type="button" 
                onClick={handleAddShift}
                className="w-full py-4 border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-3xl font-black text-sm transition-all flex items-center justify-center gap-2 group shadow-sm"
              >
                 <Layers className="w-5 h-5 group-hover:scale-110 transition-transform"/> افزودن شیفت / فاز جدید در همین روز
              </button>

              {/* 💡 مانیتور لایو سود پنهان */}
              <div className="mt-5 p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-indigo-200 dark:border-indigo-700/50 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-xl"><SquareActivity className="w-6 h-6 text-indigo-500 dark:text-indigo-400 animate-pulse" /></div>
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">سود خالص شما (مجموع این روز)</span>
                     <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">تحلیل‌گر لایو آربیتراژ</span>
                   </div>
                 </div>
                 <div className={`text-2xl font-black font-mono tracking-wider ${liveProfit > 0 ? 'text-emerald-500' : liveProfit < 0 ? 'text-rose-500' : 'text-slate-500'}`} dir="ltr">
                   {liveProfit.toLocaleString('fa-IR')} <span className="text-[10px] text-slate-400">تومان</span>
                 </div>
              </div>

              {/* 💡 بخش تاریخ، آب‌وهوا و کسورات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div className="bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/50 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 relative z-[90]">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-1"><CalendarDays className="w-3 h-3 text-indigo-500"/> {isBulkDate ? 'از تاریخ' : 'تاریخ کارکرد'}</label>
                        <Controller control={control} name="date" render={({ field: { onChange, value } }) => (<GlassDatePicker value={value} onChange={onChange} hasError={!!errors.date} />)} />
                      </div>
                      {isBulkDate && (
                        <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} className="flex-1 space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-1"><CalendarDays className="w-3 h-3 text-indigo-500"/> تا تاریخ</label>
                          <GlassDatePicker value={dateTo} onChange={setDateTo} />
                        </motion.div>
                      )}
                    </div>
                    
                    {!editData && (
                      <GlowSwitch theme="indigo" checked={isBulkDate} onChange={setIsBulkDate} label="ثبت بازه زمانی (چند روزه)" sublabel="در صورت فعال بودن، کارکرد برای تمام روزهای بازه به صورت گروهی ثبت می‌شود." />
                    )}

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">وضعیت آب و هوا</label>
                      <div className="flex gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-max shadow-inner">
                        {weatherIcons.map(w => (
                          <button type="button" key={w.id} onClick={() => setWeather(w.id)} className={`p-2 rounded-lg transition-all ${weather === w.id ? 'bg-slate-100 dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-600' : 'opacity-40 hover:opacity-100'}`}>
                            <w.icon className={`w-4 h-4 ${w.color}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                 </div>

                 <div className="bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/50 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-rose-500">کسر ناهار/غذا (تومان)</label>
                        <input value={watchAll.foodDeduction || ''} onChange={(e) => handleCurrencyChange('foodDeduction', e.target.value)} placeholder="0" dir="ltr" className="w-full h-[40px] bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-lg px-3 text-xs font-bold text-rose-600 dark:text-rose-400 outline-none focus:border-rose-500 shadow-inner" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-rose-500">جریمه/کسر کار (تومان)</label>
                        <input value={watchAll.penaltyDeduction || ''} onChange={(e) => handleCurrencyChange('penaltyDeduction', e.target.value)} placeholder="0" dir="ltr" className="w-full h-[40px] bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-lg px-3 text-xs font-bold text-rose-600 dark:text-rose-400 outline-none focus:border-rose-500 shadow-inner" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-emerald-500">پاداش/اضافه‌کار (تومان)</label>
                      <input value={watchAll.bonus || ''} onChange={(e) => handleCurrencyChange('bonus', e.target.value)} placeholder="0" dir="ltr" className="w-full h-[40px] bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-lg px-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500 shadow-inner" />
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
                      <GlowSwitch theme="rose" checked={hasIncident} onChange={setHasIncident} label="ثبت حادثه در این روز (HSE)" />
                      <AnimatePresence>
                        {hasIncident && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3">
                            <textarea {...register('incidentDescription')} placeholder="شرح کامل حادثه..." className="w-full bg-slate-50 dark:bg-slate-900/50 border border-rose-200 dark:border-rose-800/50 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 outline-none focus:ring-2 ring-rose-500/30 resize-none h-16 glass-scroll shadow-inner" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                 </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button type="button" disabled={isSubmitting} onClick={handleSubmit((d) => saveWorkLog(d))} className="w-full py-4 disabled:opacity-50 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-2xl font-black text-sm shadow-[0_10px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_15px_30px_rgba(99,102,241,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  {editData && editData.id ? 'ثبت تغییرات کارکرد' : editData ? 'ثبت کپی به عنوان کارکرد جدید' : (isBulkDate ? 'ثبت گروهی کارکردها در سیستم' : `ثبت نهایی ${fields.length > 1 ? `${fields.length} شیفت` : 'کارکرد'}`)}
                </button>
              </div>

            </form>
          </div>
        </motion.div>

        {/* 💡 رندر مودال ساخت نیروی جدید در صورت انتخاب از لیست کشویی */}
        <AnimatePresence>
          {isWorkerModalOpen && (
            <LaborFormModal 
              isOpen={isWorkerModalOpen} 
              onClose={() => setIsWorkerModalOpen(false)} 
            />
          )}
        </AnimatePresence>

      </div>
    </>,
    document.body
  );
}