import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion} from 'framer-motion';
import { 
  X, Briefcase, Building2, CheckCircle2,
  HardHat, Pickaxe, Calculator, FileSignature, Clock, Percent, Activity,
  Sun, Puzzle, Ruler, CalendarDays, Box, Truck, Target, 
} from 'lucide-react';
import { toast } from 'sonner';

import { useLaborStore } from '../../../store/laborStore';
import type { PaymentType, WorkUnit, PriceBookEntry } from '../../../store/laborStore';

// 💡 استفاده از کامپوننت‌های گرافیکی یکپارچه
import { PortalSelect, GlassScrollStyles, LuxuryTimePicker } from '../../../components/ui/SharedLaborUI';

// ==========================================
// 💡 الگوریتم مترجم اعداد
// ==========================================
const parseAmount = (val?: string | number) => {
  if (!val) return 0;
  const enVal = String(val)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()) 
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()) 
    .replace(/,/g, '') 
    .replace(/\D/g, ''); 
  return Number(enVal) || 0;
};

const formatAmount = (val: string | number) => {
  const num = parseAmount(val);
  return num === 0 ? '' : num.toLocaleString('en-US');
};

const priceBookSchema = z.object({
  specialtyId: z.string().min(1, 'انتخاب تخصص الزامی است'),
  paymentType: z.string(),
  workerUnit: z.string(),
  workerRate: z.string().min(1, 'دستمزد الزامی است'),
  billedUnit: z.string(),
  billedRate: z.string().min(1, 'فاکتور الزامی است'),
  standardWorkHours: z.number().optional(),
  maxAdvanceLimit: z.string().optional(),
  guaranteeRetained: z.number().optional(),
});

type PriceBookFormValues = z.infer<typeof priceBookSchema>;

interface LaborPriceBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  editEntryId?: string | null;
}

export default function LaborPriceBookModal({ isOpen, onClose, workerId, editEntryId }: LaborPriceBookModalProps) {
  const { workers, specialtyTags, updateWorker } = useLaborStore();
  const worker = workers.find(w => w.id === workerId);

  const existingEntry = editEntryId ? worker?.priceBook?.find(e => e.id === editEntryId) : null;

  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<PriceBookFormValues>({
    resolver: zodResolver(priceBookSchema),
    defaultValues: {
      specialtyId: existingEntry?.specialtyId || worker?.specialtyIds?.[0] || '',
      paymentType: existingEntry?.paymentType || 'DAILY',
      workerUnit: existingEntry?.workerUnit || 'DAY',
      workerRate: existingEntry ? formatAmount(existingEntry.workerRate) : '',
      billedUnit: existingEntry?.billedUnit || 'DAY',
      billedRate: existingEntry ? formatAmount(existingEntry.billedRate) : '',
      
      standardWorkHours: worker?.standardWorkHours || 8,
      maxAdvanceLimit: worker?.maxAdvanceLimit ? formatAmount(worker.maxAdvanceLimit) : '',
      guaranteeRetained: worker?.guaranteeRetained || 0,
    }
  });

  const watchAll = watch();

  useEffect(() => {
    if (startTime && endTime) {
      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = endTime.split(':').map(Number);
      let diff = (eH + eM / 60) - (sH + sM / 60);
      if (diff < 0) diff += 24; 
      setValue('standardWorkHours', Number(diff.toFixed(2)));
    }
  }, [startTime, endTime, setValue]);

  // 💡 اضافه شدن آیکون‌ها به انواع قرارداد
  const PAYMENT_TYPES = [
    { id: 'DAILY', label: 'روزمزد', icon: Sun },
    { id: 'HOURLY', label: 'ساعتی', icon: Clock },
    { id: 'PIECE_WORK', label: 'تیکه‌ای / آیتمی', icon: Puzzle },
    { id: 'METER', label: 'متراژی / متری', icon: Ruler },
    { id: 'CONTRACT', label: 'کنترات / پروژه‌ای', icon: FileSignature },
    { id: 'MONTHLY', label: 'ماهانه ثابت', icon: CalendarDays },
  ];

  // 💡 اضافه شدن آیکون‌ها به واحدها
  const UNIT_TYPES = [
    { id: 'DAY', label: 'روز', icon: Sun }, 
    { id: 'HOUR', label: 'ساعت', icon: Clock }, 
    { id: 'METER', label: 'متر', icon: Ruler },
    { id: 'ITEM', label: 'آیتم / عدد', icon: Box }, 
    { id: 'SERVICE', label: 'سرویس', icon: Truck },
    { id: 'FIXED', label: 'مقطوع / کنترات', icon: Target }, 
    { id: 'MONTH', label: 'ماه', icon: CalendarDays }
  ];

  const workerSpecialties = useMemo(() => {
    if (!worker || !worker.specialtyIds) return [];
    // 💡 اضافه شدن آیکون به لیست تخصص‌ها
    return specialtyTags.filter(t => worker.specialtyIds.includes(t.id)).map(t => ({ id: t.id, label: t.name, icon: Pickaxe }));
  }, [worker, specialtyTags]);

  const handleCurrencyChange = (field: any, value: string) => {
    setValue(field, formatAmount(value), { shouldValidate: true });
  };

  const onSubmit = (data: PriceBookFormValues) => {
    if (!worker) return;

    const entryToSave: PriceBookEntry = {
      id: editEntryId || crypto.randomUUID(),
      specialtyId: data.specialtyId,
      paymentType: data.paymentType as PaymentType,
      workerUnit: data.workerUnit as WorkUnit,
      billedUnit: data.billedUnit as WorkUnit,
      workerRate: parseAmount(data.workerRate),
      billedRate: parseAmount(data.billedRate),
    };

    const currentBook = worker.priceBook || [];
    let updatedBook;

    if (editEntryId) {
      updatedBook = currentBook.map(e => e.id === editEntryId ? entryToSave : e);
      toast.success('قرارداد / تعرفه با موفقیت ویرایش شد.');
    } else {
      updatedBook = [entryToSave, ...currentBook];
      toast.success('تعرفه جدید با موفقیت به دفترچه اضافه شد.');
    }

    updateWorker(workerId, { 
      priceBook: updatedBook,
      standardWorkHours: data.standardWorkHours,
      maxAdvanceLimit: parseAmount(data.maxAdvanceLimit),
      guaranteeRetained: data.guaranteeRetained
    });

    onClose();
  };

  const expectedProfit = parseAmount(watchAll.billedRate) - parseAmount(watchAll.workerRate);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <GlassScrollStyles />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-3xl max-h-[95vh] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/50 dark:border-slate-700/60 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white shadow-md"><FileSignature className="w-6 h-6" /></div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">{editEntryId ? 'ویرایش تعرفه و قرارداد' : 'ثبت تعرفه و تنظیمات قرارداد'}</h2>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1">مدیریت تعرفه‌های آربیتراژ و ساعات کاری</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/50 dark:bg-slate-800/50 hover:bg-rose-100 hover:text-rose-500 rounded-xl transition-all shadow-sm"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto glass-scroll p-6 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* ردیف اول: تخصص و مدل کار */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
               <div className="space-y-1.5 relative z-[90]">
                  <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><Pickaxe className="w-3.5 h-3.5 text-fuchsia-500"/> تخصص مرتبط *</label>
                  <Controller control={control} name="specialtyId" render={({ field }) => (
                    <PortalSelect options={workerSpecialties} value={field.value} onChange={field.onChange} placeholder={workerSpecialties.length > 0 ? "انتخاب تخصص" : "بدون تخصص"} className="!h-[46px] !min-h-[46px] !rounded-xl" />
                  )} />
               </div>
               <div className="space-y-1.5 relative z-[80]">
                  <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-fuchsia-500"/> نوع قرارداد / مدل کار *</label>
                  <Controller control={control} name="paymentType" render={({ field }) => (
                    <PortalSelect options={PAYMENT_TYPES} value={field.value} onChange={field.onChange} placeholder="انتخاب مدل کار" className="!h-[46px] !min-h-[46px] !rounded-xl" />
                  )} />
               </div>
            </div>

            {/* ردیف دوم: ماتریس قیمت‌گذاری (کارگر و کارفرما) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* ستون نیروی کار */}
              <div className="p-5 rounded-3xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-900/10 shadow-sm space-y-4">
                 <div className="flex items-center gap-2 border-b border-indigo-200/50 dark:border-indigo-800/50 pb-3"><HardHat className="w-5 h-5 text-indigo-500"/><span className="text-sm font-black text-indigo-900 dark:text-indigo-300">نرخ پرداختی به نیروی کار</span></div>
                 <div className="grid grid-cols-3 gap-3">
                   <div className="space-y-1 col-span-1 relative z-[70]">
                      <label className="text-[10px] font-bold text-slate-500">واحد</label>
                      <Controller control={control} name="workerUnit" render={({ field }) => (
                        <PortalSelect options={UNIT_TYPES} value={field.value} onChange={field.onChange} className="!h-[42px] !min-h-[42px] !py-2 !rounded-xl" />
                      )} />
                   </div>
                   <div className="space-y-1 col-span-2">
                      <label className="text-[10px] font-bold text-slate-500">مبلغ (تومان) *</label>
                      <input value={watchAll.workerRate || ''} onChange={(e) => handleCurrencyChange('workerRate', e.target.value)} dir="ltr" className={`w-full h-[42px] bg-white dark:bg-slate-900 border rounded-xl px-4 text-sm font-black text-indigo-600 dark:text-indigo-400 outline-none transition-all shadow-inner ${errors.workerRate ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'}`} placeholder="0" />
                   </div>
                 </div>
              </div>

              {/* ستون کارفرما */}
              <div className="p-5 rounded-3xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/30 dark:bg-blue-900/10 shadow-sm space-y-4">
                 <div className="flex items-center gap-2 border-b border-blue-200/50 dark:border-blue-800/50 pb-3"><Building2 className="w-5 h-5 text-blue-500"/><span className="text-sm font-black text-blue-900 dark:text-blue-300">نرخ فاکتور برای کارفرما</span></div>
                 <div className="grid grid-cols-3 gap-3">
                   <div className="space-y-1 col-span-1 relative z-[60]">
                      <label className="text-[10px] font-bold text-slate-500">واحد فاکتور</label>
                      <Controller control={control} name="billedUnit" render={({ field }) => (
                        <PortalSelect options={UNIT_TYPES} value={field.value} onChange={field.onChange} className="!h-[42px] !min-h-[42px] !py-2 !rounded-xl" />
                      )} />
                   </div>
                   <div className="space-y-1 col-span-2">
                      <label className="text-[10px] font-bold text-slate-500">مبلغ (تومان)</label>
                      <input value={watchAll.billedRate || ''} onChange={(e) => handleCurrencyChange('billedRate', e.target.value)} dir="ltr" className={`w-full h-[42px] bg-white dark:bg-slate-900 border rounded-xl px-4 text-sm font-black text-blue-600 dark:text-blue-400 outline-none transition-all shadow-inner ${errors.billedRate ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'}`} placeholder="0" />
                   </div>
                 </div>
              </div>

            </div>

            {/* مانیتور لایو حاشیه سود */}
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-fuchsia-200 dark:border-fuchsia-700/50 shadow-sm flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-fuchsia-500/10 rounded-xl"><Calculator className="w-5 h-5 text-fuchsia-500" /></div>
                 <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">حاشیه سود مورد انتظار در هر واحد</span>
                   <span className="text-xs font-black text-fuchsia-700 dark:text-fuchsia-300">Expected Arbitrage</span>
                 </div>
               </div>
               <div className={`text-xl font-black font-mono tracking-wider ${expectedProfit > 0 ? 'text-emerald-500' : expectedProfit < 0 ? 'text-rose-500' : 'text-slate-500'}`} dir="ltr">
                 {expectedProfit.toLocaleString('fa-IR')} <span className="text-[10px] text-slate-400">تومان</span>
               </div>
            </div>

            {/* 💡 بخش تنظیمات پایه و کسورات کارگاه */}
            <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/50 rounded-3xl p-5 space-y-5 shadow-sm mt-6">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-3">
                <Clock className="w-5 h-5 text-indigo-500" />
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">تنظیمات پایه و قرارداد نیرو</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5 relative z-[50]">
                   <label className="text-[11px] font-black text-slate-600 dark:text-slate-400">ساعت ورود پیش‌فرض</label>
                   <LuxuryTimePicker value={startTime} onChange={setStartTime} placeholder="08:00" />
                </div>
                <div className="space-y-1.5 relative z-[40]">
                   <label className="text-[11px] font-black text-slate-600 dark:text-slate-400">ساعت خروج پیش‌فرض</label>
                   <LuxuryTimePicker value={endTime} onChange={setEndTime} placeholder="17:00" />
                </div>
                
                <div className="col-span-1 sm:col-span-2 bg-white/60 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-inner">
                   <span className="text-xs font-bold text-slate-500">مجموع ساعت کاری محاسبه شده:</span>
                   <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{watchAll.standardWorkHours} ساعت در روز</span>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><Activity className="w-3.5 h-3.5"/> سقف مجاز مساعده (تومان)</label>
                   <input value={watchAll.maxAdvanceLimit || ''} onChange={(e) => handleCurrencyChange('maxAdvanceLimit', e.target.value)} dir="ltr" className="w-full h-[46px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-black text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 focus:ring-2 ring-indigo-500/20 shadow-inner transition-all" placeholder="بدون سقف..." />
                </div>
                
                <div className="space-y-1.5">
                   <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><Percent className="w-3.5 h-3.5"/> درصد کسر حسن انجام کار</label>
                   <div className="relative">
                     <input type="number" dir="ltr" min="0" max="100" {...register('guaranteeRetained', { valueAsNumber: true })} className="w-full h-[46px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 pr-10 text-sm font-black text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 focus:ring-2 ring-indigo-500/20 shadow-inner transition-all" placeholder="مثلا 5" />
                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">%</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 shrink-0">
              <button type="submit" className="w-full py-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-400 hover:to-purple-500 text-white rounded-2xl font-black text-sm shadow-[0_10px_20px_rgba(217,70,239,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                {editEntryId ? 'ذخیره تغییرات' : 'ثبت تعرفه و تنظیمات'}
              </button>
            </div>

          </form>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}