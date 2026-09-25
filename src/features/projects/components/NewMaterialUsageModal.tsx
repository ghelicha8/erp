import { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, AlertCircle, CheckCircle, ChevronDown, 
  Package, ShoppingCart, Hammer, Info
} from 'lucide-react';
import { toast } from 'sonner';

import { useInventoryStore } from '../../../store/inventoryStore';
import { useProjectStore } from '../store/projectStore';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';

// ============================================================================
// Schema (Zod) - اعتبارسنجی شرطی و هوشمند
// ============================================================================
const materialUsageSchema = z.object({
  sourceType: z.enum(['INVENTORY', 'MARKET']),
  
  // فیلدهای انبار
  materialId: z.string().optional(),
  
  // فیلدهای بازار آزاد
  materialName: z.string().optional(),
  unit: z.string().optional(),
  costPrice: z.string().optional(), // قیمت خرید از بازار
  
  // فیلدهای مشترک
  quantity: z.string().min(1, 'وارد کردن مقدار/تعداد الزامی است'),
  declaredPrice: z.string().min(1, 'تعیین قیمت اعلامی به کارفرما الزامی است'),
  date: z.string().min(1, 'تاریخ مصرف الزامی است'),
  deductFromInventory: z.boolean().optional(),
  description: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.sourceType === 'INVENTORY' && !data.materialId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'انتخاب مصالح از انبار الزامی است', path: ['materialId'] });
  }
  if (data.sourceType === 'MARKET') {
    if (!data.materialName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'نام مصالح الزامی است', path: ['materialName'] });
    if (!data.unit) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'واحد اندازه‌گیری الزامی است', path: ['unit'] });
    if (!data.costPrice) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'قیمت تمام‌شده (خرید) الزامی است', path: ['costPrice'] });
  }
});

type MaterialFormValues = z.infer<typeof materialUsageSchema>;

// ============================================================================
// توابع کمکی و کامپوننت GlassSelect
// ============================================================================
const formatAmount = (value: string) => value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function GlassSelect({ options, value, onChange, placeholder, hasError }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const selectedLabel = options.find((o: any) => o.value === value)?.label || placeholder;

  return (
    <div className="relative w-full" ref={ref}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`cursor-pointer w-full bg-white/60 dark:bg-black/20 border rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-cyan-500 outline-none backdrop-blur-sm transition-all flex items-center justify-between shadow-sm ${hasError ? 'border-rose-500/70 ring-1 ring-rose-500/50' : 'border-white/40 dark:border-slate-700/50'}`}
      >
        <span className="font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-cyan-500' : ''}`} />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ type: 'spring', damping: 25, stiffness: 400 }} className="absolute z-50 w-full mt-2 backdrop-blur-3xl bg-white/95 dark:bg-slate-800/95 border border-white/50 dark:border-slate-600 shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-2xl max-h-56 overflow-y-auto modal-scrollbar">
            {options.map((opt: any) => (
              <div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`px-4 py-3.5 cursor-pointer text-sm font-bold border-b border-slate-100/50 dark:border-slate-700/50 last:border-0 transition-colors ${value === opt.value ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : 'hover:bg-cyan-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}>
                {opt.label}
              </div>
            ))}
            {options.length === 0 && <div className="px-4 py-3.5 text-sm font-bold text-slate-400 text-center">انباری ثبت نشده است</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Main Modal Component
// ============================================================================
interface NewMaterialUsageModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function NewMaterialUsageModal({ projectId, isOpen, onClose }: NewMaterialUsageModalProps) {
  // اتصال به استور انبار
  const inventoryMaterials = useInventoryStore((state) => state.materials);
  const deductStock = useInventoryStore((state) => state.deductStock);
  
  // اتصال به استور پروژه (استفاده از متد دلخواه برای ثبت هزینه متریال)
  const recalculateProjectFinancials = useProjectStore((state) => state.recalculateProjectFinancials);

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialUsageSchema),
    defaultValues: { sourceType: 'INVENTORY', deductFromInventory: true },
  });

  const sourceType = watch('sourceType');
  const deductChecked = watch('deductFromInventory');
  const selectedMaterialId = watch('materialId');

  useEffect(() => { if (isOpen) reset(); }, [isOpen, reset]);

  // لیست آپشن‌های انبار با نمایش موجودی
  const inventoryOptions = inventoryMaterials.map(m => ({
    value: m.id,
    label: `${m.name} (${m.currentStock} ${m.unit} موجود)`
  }));

  const selectedInventoryItem = inventoryMaterials.find(m => m.id === selectedMaterialId);

  const onSubmit = (data: MaterialFormValues) => {
    const rawQuantity = Number(data.quantity.replace(/,/g, ''));

    if (rawQuantity <= 0) { toast.error('مقدار مصرفی نامعتبر است'); return; }

    try {
      // ۱. اگر منبع انبار است و تیک کسر خورده، از انبار مرکزی کم کن
      if (data.sourceType === 'INVENTORY' && data.deductFromInventory && data.materialId) {
        if (selectedInventoryItem && selectedInventoryItem.currentStock < rawQuantity) {
          toast.error('موجودی انبار برای این مصرف کافی نیست!');
          return;
        }
        deductStock(data.materialId, rawQuantity);
      }

      // ۲. ساخت رکورد مصرف جهت ارسال به استور پروژه (کد زیر به صورت مفهومی پیاده شده است.
      // شما می‌توانید این آبجکت را در آرایه‌ی materialRecords پروژه خودتان Push کنید)

      // TODO: اینجا تابع addMaterialRecord را به projectStore اضافه کرده و فراخوانی کنید
      // useProjectStore.getState().addMaterialRecord(projectId, usageRecord);
      
      // آپدیت هزینه‌ها
      recalculateProjectFinancials(projectId);
      
      toast.success('مصرف مصالح با موفقیت در پروژه ثبت شد');
      onClose();
    } catch (error) { 
      toast.error('بروز خطا در ثبت مصرف مصالح'); 
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto modal-scrollbar" dir="rtl">
          <div className="flex min-h-full items-start justify-center p-4 py-10 sm:p-6 relative">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto" />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative z-10 w-full max-w-4xl m-auto rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)] backdrop-blur-3xl bg-white/75 dark:bg-slate-900/80 border border-white/40 dark:border-slate-700/50 p-6 sm:p-10 overflow-visible pointer-events-auto"
            >
              <button onClick={onClose} className="absolute top-6 left-6 p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-colors z-10"><X className="w-5 h-5 text-slate-700 dark:text-slate-300" /></button>

              <div className="mb-8 text-center sm:text-right flex flex-col items-center sm:items-start">
                <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                  <Hammer className="w-7 h-7 text-cyan-500 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                </div>
                <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-500 drop-shadow-sm">
                  ثبت مصرف مصالح پروژه
                </h2>
                <p className="text-sm mt-2 text-slate-500 dark:text-slate-400 font-medium">مصالح مصرفی را از انبار شخصی کسر کرده یا خرید بازار را ثبت کنید.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit, () => toast.error('لطفاً خطاهای فرم را بررسی کنید'))} className="space-y-8">
                
                {/* ----------------------------------------------------------------------
                    انتخابگر استراتژی تأمین مصالح (رادیوباتن‌های نئونی)
                    ---------------------------------------------------------------------- */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">منبع تأمین مصالح</label>
                  <div className="flex p-1.5 bg-white/40 dark:bg-black/20 rounded-2xl backdrop-blur-md border border-white/30 dark:border-slate-700/50 shadow-inner">
                    <button type="button" onClick={() => setValue('sourceType', 'INVENTORY')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-xl transition-all ${sourceType === 'INVENTORY' ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                      <Package className="w-5 h-5"/> موجود در انبار شخصی
                    </button>
                    <button type="button" onClick={() => setValue('sourceType', 'MARKET')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-xl transition-all ${sourceType === 'MARKET' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                      <ShoppingCart className="w-5 h-5"/> خرید از بازار آزاد
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/20 dark:border-slate-700/30 w-full my-6" />

                {/* ----------------------------------------------------------------------
                    بخش فیلدهای متغیر بر اساس منبع تامین (AnimatePresence)
                    ---------------------------------------------------------------------- */}
                <AnimatePresence mode="wait">
                  {sourceType === 'INVENTORY' ? (
                    <motion.div key="inventory-fields" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 relative z-50">
                          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">انتخاب مصالح از انبار</label>
                          <Controller control={control} name="materialId" render={({ field }) => (<GlassSelect options={inventoryOptions} value={field.value || ''} onChange={field.onChange} placeholder="یک مورد انتخاب کنید..." hasError={!!errors.materialId} />)} />
                          {errors.materialId && <span className="text-rose-500 text-xs font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.materialId.message}</span>}
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">مقدار مصرف ({selectedInventoryItem?.unit || 'واحد'})</label>
                          <input type="text" {...register('quantity', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} className={`w-full bg-white/60 dark:bg-black/20 border rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-cyan-500 outline-none backdrop-blur-sm transition-all font-black text-xl text-left text-cyan-600 dark:text-cyan-400 drop-shadow-sm ${errors.quantity ? 'border-rose-500/70' : 'border-white/40 dark:border-slate-700/50'}`} placeholder="0" dir="ltr" />
                          {errors.quantity && <span className="text-rose-500 text-xs font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.quantity.message}</span>}
                        </div>
                      </div>

                      {/* چک‌باکس نئونی برای کسر از انبار */}
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-5 flex items-start gap-4 shadow-inner">
                        <div 
                          onClick={() => setValue('deductFromInventory', !deductChecked)}
                          className={`w-6 h-6 rounded flex items-center justify-center shrink-0 cursor-pointer mt-0.5 transition-all ${deductChecked ? 'bg-cyan-500 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.8)] text-white' : 'border-2 border-slate-400 dark:border-slate-500 text-transparent hover:border-cyan-500'}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col cursor-pointer select-none" onClick={() => setValue('deductFromInventory', !deductChecked)}>
                          <span className="text-sm font-black text-cyan-700 dark:text-cyan-400">آیا این مقدار از موجودی انبار شما کسر شود؟</span>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">با تیک زدن این گزینه، موجودی کالا در سیستم انبارداری آپدیت خواهد شد. قیمت خرید قبلاً در سیستم ثبت شده است و محاسبه سود پنهان به صورت خودکار انجام می‌پذیرد.</span>
                        </div>
                      </div>

                    </motion.div>
                  ) : (
                    <motion.div key="market-fields" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">نام مصالح خریداری شده</label>
                          <input {...register('materialName')} className={`w-full bg-white/60 dark:bg-black/20 border rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none backdrop-blur-sm transition-all font-medium ${errors.materialName ? 'border-rose-500/70' : 'border-white/40 dark:border-slate-700/50'}`} placeholder="مثال: گچ وایت..." />
                          {errors.materialName && <span className="text-rose-500 text-xs font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.materialName.message}</span>}
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">واحد اندازه‌گیری</label>
                          <input {...register('unit')} className={`w-full bg-white/60 dark:bg-black/20 border rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none backdrop-blur-sm transition-all font-medium ${errors.unit ? 'border-rose-500/70' : 'border-white/40 dark:border-slate-700/50'}`} placeholder="کیسه، تن..." />
                          {errors.unit && <span className="text-rose-500 text-xs font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.unit.message}</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[2rem] bg-blue-500/5 border border-blue-500/20 shadow-inner">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 flex items-center gap-1"><Info className="w-4 h-4 text-blue-500"/> قیمت تمام‌شده (خرید شما)</label>
                          <input type="text" {...register('costPrice', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} className={`w-full bg-white/70 dark:bg-slate-800/80 border rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none backdrop-blur-sm transition-all font-black text-xl text-left text-slate-700 dark:text-slate-200 ${errors.costPrice ? 'border-rose-500/70' : 'border-white/50 dark:border-slate-600'}`} placeholder="0" dir="ltr" />
                          {errors.costPrice && <span className="text-rose-500 text-xs font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.costPrice.message}</span>}
                          <p className="text-[10px] font-bold text-slate-400 mt-1">این قیمت فقط برای خود پیمانکار است و از کارفرما مخفی می‌ماند.</p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">مقدار / تعداد خریداری شده</label>
                          <input type="text" {...register('quantity', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} className={`w-full bg-white/70 dark:bg-slate-800/80 border rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none backdrop-blur-sm transition-all font-black text-xl text-left text-blue-600 dark:text-blue-400 drop-shadow-sm ${errors.quantity ? 'border-rose-500/70' : 'border-white/50 dark:border-slate-600'}`} placeholder="0" dir="ltr" />
                          {errors.quantity && <span className="text-rose-500 text-xs font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.quantity.message}</span>}
                        </div>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ----------------------------------------------------------------------
                    بخش فیلدهای ثابت پایینی (قیمت اعلامی و تاریخ)
                    ---------------------------------------------------------------------- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 flex items-center gap-1"><Info className="w-4 h-4 text-emerald-500"/> قیمت اعلامی به کارفرما (تومان)</label>
                    <input type="text" {...register('declaredPrice', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} className={`w-full bg-emerald-500/10 border rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-emerald-500 outline-none backdrop-blur-sm transition-all font-black text-xl text-left text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] ${errors.declaredPrice ? 'border-rose-500/70' : 'border-emerald-500/30'}`} placeholder="0" dir="ltr" />
                    {errors.declaredPrice && <span className="text-rose-500 text-xs font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.declaredPrice.message}</span>}
                    <p className="text-[10px] font-bold text-slate-400 mt-1">این مبلغ وارد صورت وضعیت پروژه می‌شود.</p>
                  </div>

                  <div className="space-y-2 relative z-40">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">تاریخ مصرف در پروژه</label>
                    <Controller control={control} name="date" render={({ field: { onChange, value } }) => (
                      <GlassDatePicker value={value} onChange={onChange} hasError={!!errors.date} placeholder="انتخاب تاریخ" />
                    )} />
                    {errors.date && <span className="text-rose-500 text-xs font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.date.message}</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">توضیحات تکمیلی (دلخواه)</label>
                  <input {...register('description')} className="w-full bg-white/60 dark:bg-black/20 border border-white/40 dark:border-slate-700/50 rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-cyan-500 outline-none backdrop-blur-sm transition-all font-medium" placeholder="شرح مصرف در پروژه..." />
                </div>

                {/* دکمه نئونی ثبت نهایی */}
                <div className="pt-6 border-t border-slate-200/50 dark:border-slate-700/50 mt-4">
                  <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-lg py-4 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transform transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {isSubmitting ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="relative z-10 drop-shadow-md">ثبت قطعی در سیستم</span><CheckCircle className="w-5 h-5 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" /></>}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}