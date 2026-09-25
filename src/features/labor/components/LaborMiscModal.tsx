import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { 
  X, CheckCircle2, ChevronDown, Check, Search, 
  Coffee, Shirt, Bus, Package, Banknote, ShieldAlert,
  Building2, UserCircle, Calculator, 
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useLaborStore } from '../../../store/laborStore';
import { useProjectStore } from '../../projects/store/projectStore'; 
import { useClientStore } from '../../../store/clientStore';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';

const miscSchema = z.object({
  title: z.string().min(1, 'عنوان هزینه الزامی است'),
  amount: z.string().min(1, 'مبلغ الزامی است'),
  category: z.string().min(1, 'دسته‌بندی الزامی است'),
  date: z.string().min(1, 'تاریخ الزامی است'),
  isDeducted: z.boolean(),
  isCalculated: z.boolean(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  description: z.string().optional(),
});

type MiscFormValues = z.infer<typeof miscSchema>;

// الگوریتم مترجم اعداد برای جلوگیری از پاک شدن رقم‌ها
const parseAmount = (val?: string | number) => {
  if (!val) return 0;
  const enVal = String(val)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()) 
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()) 
    .replace(/,/g, '') 
    .replace(/\D/g, ''); 
  return Number(enVal) || 0;
};

// فرمت سه‌رقم سه‌رقم استاندارد برای کادرهای ورودی
const formatAmount = (val: string | number) => {
  const num = parseAmount(val);
  return num === 0 ? '' : num.toLocaleString('en-US');
};

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

const PortalSelect = ({ value, onChange, options, placeholder, icon: Icon, searchable = false, className = '' }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  
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
    const handleScroll = () => setIsOpen(false);
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
      <button type="button" ref={btnRef} onClick={() => isOpen ? setIsOpen(false) : openDropdown()} className={`w-full h-[48px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 flex justify-between items-center outline-none transition-all shadow-inner hover:border-pink-400 focus:ring-2 focus:ring-pink-500/30 ${className}`}>
        <div className="flex items-center gap-2 truncate text-right flex-1">
           {Icon && <Icon className="w-4 h-4 text-pink-500 shrink-0" />}
           <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-200 pt-0.5">
             {selected ? selected.label : placeholder}
           </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-pink-500 shrink-0 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[999999]" onClick={() => setIsOpen(false)} />
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ top: coords.top, left: coords.left, width: coords.width }} className="fixed bg-white/95 dark:bg-slate-800/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] z-[1000000] overflow-hidden flex flex-col max-h-72 min-w-[200px]">
            {searchable && (
              <div className="p-2 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="relative group rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
                   <div className="absolute inset-0 rounded-xl pointer-events-none group-focus-within:animate-pulse" style={{ padding: '2px', background: 'linear-gradient(90deg, #ec4899, #f43f5e)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', opacity: 0.5 }} />
                   <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500 z-10" />
                   <input type="text" autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="جستجو..." className="w-full bg-transparent border-none pr-9 pl-3 py-2.5 text-xs font-bold outline-none text-slate-700 dark:text-slate-200 relative z-10" />
                </div>
              </div>
            )}
            <div className="overflow-y-auto glass-scroll p-1.5 flex-1">
              {filteredOptions.length > 0 ? filteredOptions.map((opt: any) => {
                const OptIcon = opt.icon || Check;
                return (
                  <button type="button" key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-right px-4 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-between group ${String(value) === String(opt.id) ? 'bg-pink-50 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
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

const CATEGORIES = [
  { id: 'FOOD', label: 'خورد و خوراک (ناهار، شام...)', icon: Coffee },
  { id: 'CLOTHING', label: 'پوشاک و لباس کار', icon: Shirt },
  { id: 'TRANSPORT', label: 'ایاب و ذهاب (اسنپ، کرایه)', icon: Bus },
  { id: 'OTHER', label: 'سایر اقلام مصرفی', icon: Package },
];

const generateId = () => `misc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 💡 پراپ‌های جدید برای دریافت آیدی ویرایش
interface LaborMiscModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  editEntryId?: string | null;
}

export default function LaborMiscModal({ isOpen, onClose, workerId, editEntryId }: LaborMiscModalProps) {
  const { workers, updateWorker } = useLaborStore();
  const { projects } = useProjectStore();
  const { clients } = useClientStore();
  const worker = workers.find(w => w.id === workerId);

  // 💡 استخراج اطلاعات قبلی در صورت وجود `editEntryId`
  const existingEntry = useMemo(() => {
    if (!editEntryId || !worker) return null;
    return (worker as any).miscExpenses?.find((e: any) => e.id === editEntryId) || null;
  }, [editEntryId, worker]);

  const projectOptions = useMemo(() => [
    { id: 'FREE', label: 'آزاد (بدون پروژه مربوطه)', icon: Package },
    ...(projects || []).map(p => ({ id: p.id, label: p.title || p.name || 'بدون عنوان', icon: Building2 }))
  ], [projects]);

  const clientOptions = useMemo(() => [
    { id: 'FREE', label: 'آزاد (بدون کارفرمای مربوطه)', icon: Package },
    ...(clients || []).map(c => ({ id: c.id, label: `${c.name || ''} ${c.lastName || ''}`.trim(), icon: UserCircle }))
  ], [clients]);

  // 💡 قرار دادن اطلاعات قبلی به عنوان مقادیر پیش‌فرض
  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<MiscFormValues>({
    resolver: zodResolver(miscSchema),
    defaultValues: {
      title: existingEntry?.title || '',
      amount: existingEntry ? formatAmount(existingEntry.amount) : '',
      category: existingEntry?.category || 'FOOD',
      date: existingEntry?.date || moment().format('jYYYY/jMM/jDD'),
      isDeducted: existingEntry ? existingEntry.isDeducted : true,
      isCalculated: existingEntry ? (existingEntry.isCalculated !== false) : true,
      projectId: existingEntry?.projectId || 'FREE',
      clientId: existingEntry?.clientId || 'FREE',
      description: existingEntry?.description || '',
    }
  });

  const isDeducted = watch('isDeducted');

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmount(e.target.value);
    setValue('amount', formatted, { shouldValidate: true });
  };

  const onSubmit = (data: MiscFormValues) => {
    if (!worker) return;

    const entryToSave = {
      id: editEntryId || generateId(),
      title: data.title,
      amount: parseAmount(data.amount),
      category: data.category,
      date: data.date,
      isDeducted: data.isDeducted,
      isCalculated: data.isCalculated,
      projectId: data.projectId === 'FREE' ? undefined : data.projectId,
      clientId: data.clientId === 'FREE' ? undefined : data.clientId,
      description: data.description || '',
    };

    const currentMisc = (worker as any).miscExpenses || [];
    let updatedMisc;

    // 💡 منطق آپدیت در صورت ویرایش یا اضافه کردن به لیست در صورت ایجاد جدید
    if (editEntryId) {
      updatedMisc = currentMisc.map((e: any) => e.id === editEntryId ? entryToSave : e);
      toast.success('تغییرات هزینه متفرقه با موفقیت ذخیره شد.');
    } else {
      updatedMisc = [entryToSave, ...currentMisc];
      toast.success('هزینه متفرقه جدید با موفقیت ثبت شد.');
    }

    updateWorker(workerId, { miscExpenses: updatedMisc } as any);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <GlassScrollStyles />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-3xl flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/50 dark:border-slate-700/60 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-hidden max-h-[95vh]">
        
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-md"><Package className="w-6 h-6" /></div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">
                {editEntryId ? 'ویرایش هزینه متفرقه' : 'ثبت هزینه متفرقه جدید'}
              </h2>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1">مدیریت هزینه‌های رفاهی، خوراک و پوشاک نیروی کار</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/50 dark:bg-slate-800/50 hover:bg-rose-100 hover:text-rose-500 rounded-xl transition-all shadow-sm"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto glass-scroll p-6 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl flex relative overflow-hidden border border-slate-200 dark:border-slate-700">
              <div className="absolute inset-y-1.5 w-[calc(50%-6px)] bg-white dark:bg-slate-700 rounded-xl shadow-sm transition-all duration-300 ease-out" style={{ left: isDeducted ? 'calc(50% + 3px)' : '3px' }} />
              
              <button type="button" onClick={() => setValue('isDeducted', true)} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black relative z-10 transition-colors ${isDeducted ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                <Banknote className="w-4 h-4" /> کسر از حقوق (بدهی)
              </button>
              
              <button type="button" onClick={() => setValue('isDeducted', false)} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black relative z-10 transition-colors ${!isDeducted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                <ShieldAlert className="w-4 h-4" /> رفاهی / پای کارفرما
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-600 dark:text-slate-400">عنوان کالا / هزینه *</label>
                <input {...register('title')} placeholder="مثال: خرید لباس کار، ناهار..." className={`w-full h-[48px] bg-white dark:bg-slate-900 border rounded-2xl px-4 text-sm font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none transition-all shadow-inner ${errors.title ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-pink-500'}`} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-600 dark:text-slate-400">مبلغ هزینه (تومان) *</label>
                <input value={watch('amount')} onChange={handleCurrencyChange} dir="ltr" placeholder="0" className={`w-full h-[48px] bg-white dark:bg-slate-900 border rounded-2xl px-4 text-sm font-black text-slate-800 dark:text-slate-200 outline-none transition-all shadow-inner ${errors.amount ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-pink-500'}`} />
              </div>

              <div className="space-y-1.5 relative z-50">
                <label className="text-[11px] font-black text-slate-600 dark:text-slate-400">تاریخ ثبت هزینه *</label>
                <div className="h-[48px] relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-inner group focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-pink-500/20 transition-all [&_input]:bg-transparent [&_input]:border-none [&_input]:shadow-none text-slate-800 dark:text-slate-200 [&_input]:text-slate-800 dark:[&_input]:text-slate-200">
                  <Controller control={control} name="date" render={({ field: { onChange, value } }) => (
                    <GlassDatePicker value={value} onChange={onChange} />
                  )} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-600 dark:text-slate-400">دسته‌بندی</label>
                <Controller control={control} name="category" render={({ field }) => (
                  <PortalSelect options={CATEGORIES} value={field.value} onChange={field.onChange} icon={Package} placeholder="انتخاب دسته‌بندی" />
                )} />
              </div>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-200/80 dark:border-slate-700/50 space-y-5">
              
              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                 <div className="flex flex-col pr-2 border-r-4 border-emerald-500">
                   <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                     <Calculator className="w-4 h-4 text-emerald-500"/> ورود به حساب‌و‌کتاب (تراز مالی)
                   </span>
                   <span className="text-[9px] font-bold text-slate-500 mt-1">در صورت غیرفعال بودن، فقط جهت اطلاع ثبت می‌شود.</span>
                 </div>
                 <Controller control={control} name="isCalculated" render={({field}) => (
                   <button type="button" onClick={() => field.onChange(!field.value)} className={`w-12 h-6 rounded-full relative transition-colors shadow-inner ${field.value ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${field.value ? 'right-1' : 'right-7'}`} />
                   </button>
                 )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-blue-500"/> اتصال به پروژه (جهت گزارش پروژه)</label>
                  <Controller control={control} name="projectId" render={({ field }) => (
                    <PortalSelect searchable={true} options={projectOptions} value={field.value} onChange={field.onChange} placeholder="بدون پروژه" className="!bg-white dark:!bg-slate-800" />
                  )} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><UserCircle className="w-3.5 h-3.5 text-amber-500"/> اتصال به کارفرما (جهت گزارش کارفرما)</label>
                  <Controller control={control} name="clientId" render={({ field }) => (
                    <PortalSelect searchable={true} options={clientOptions} value={field.value} onChange={field.onChange} placeholder="بدون کارفرما" className="!bg-white dark:!bg-slate-800" />
                  )} />
                </div>
              </div>

            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600 dark:text-slate-400">توضیحات تکمیلی (اختیاری)</label>
              <input {...register('description')} placeholder="نکته خاصی اگر دارد بنویسید..." className="w-full h-[48px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-pink-500 shadow-inner" />
            </div>

            <div className="pt-4 shrink-0">
              <button disabled={isSubmitting} type="submit" className="w-full py-5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white rounded-[2rem] font-black text-base shadow-[0_15px_30px_rgba(236,72,153,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2">
                <CheckCircle2 className="w-6 h-6" /> 
                {editEntryId ? 'ذخیره تغییرات هزینه' : 'تایید و ثبت هزینه متفرقه'}
              </button>
            </div>

          </form>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}