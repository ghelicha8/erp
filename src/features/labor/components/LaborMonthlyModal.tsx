import React, { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CalendarDays, Wallet, Building2, Calculator, 
  CheckCircle2, AlertCircle, FileText, UserCircle, Target
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useLaborStore } from '../../../store/laborStore';
import { useClientStore } from '../../../store/clientStore';
import { useProjectStore } from '../../projects/store/projectStore';
import type { LaborMonthlyContract } from '../../../store/laborStore';

import { GlassScrollStyles, PortalSelect } from '../../../components/ui/SharedLaborUI';
// 💡 اضافه کردن تقویم اصلی و قدرتمند
import GlassDatePicker from '../../../components/ui/GlassDatePicker'; 

// ==========================================
// 💡 توابع کمکی
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

// ==========================================
// 💡 اعتبارسنجی هوشمند (Zod)
// ==========================================
const monthlySchema = z.object({
  title: z.string().min(1, 'عنوان دوره الزامی است'),
  targetType: z.enum(['US', 'CLIENT', 'PROJECT']),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  startDate: z.string().regex(/^[1-4]\d{3}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/, 'فرمت 140X/XX/XX'),
  endDate: z.string().regex(/^[1-4]\d{3}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/, 'فرمت 140X/XX/XX'),
  internalMonthlyWage: z.string().min(1, 'مبلغ نیروی کار الزامی است'),
  billedMonthlyWage: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.targetType === 'CLIENT' && !data.clientId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'انتخاب کارفرما الزامی است', path: ['clientId'] });
  }
  if (data.targetType === 'PROJECT') {
    if (!data.clientId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'انتخاب کارفرما الزامی است', path: ['clientId'] });
    if (!data.projectId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'انتخاب پروژه الزامی است', path: ['projectId'] });
  }
});

type MonthlyFormValues = z.infer<typeof monthlySchema>;

interface LaborMonthlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
}

export default function LaborMonthlyModal({ isOpen, onClose, workerId }: LaborMonthlyModalProps) {
  const { workers, updateWorker } = useLaborStore();
  const { clients } = useClientStore();
  const { projects } = useProjectStore();
  
  const worker = workers.find(w => w.id === workerId);

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<MonthlyFormValues>({
    resolver: zodResolver(monthlySchema),
    defaultValues: {
      title: 'قرارداد ماهانه جدید',
      targetType: 'US', 
      clientId: '',
      projectId: '',
      startDate: moment().format('jYYYY/jMM/01'), 
      endDate: moment().endOf('jMonth').format('jYYYY/jMM/jDD'), 
      internalMonthlyWage: '',
      billedMonthlyWage: '',
    }
  });

  const watchAll = watch();

  const filteredProjects = useMemo(() => {
    if (!watchAll.clientId) return [];
    return projects.filter(p => p.clientId === watchAll.clientId);
  }, [projects, watchAll.clientId]);

  useEffect(() => {
    if (watchAll.targetType === 'PROJECT' && watchAll.projectId) {
      const projStillValid = filteredProjects.some(p => p.id === watchAll.projectId);
      if (!projStillValid) setValue('projectId', '', { shouldValidate: true });
    }
  }, [watchAll.clientId, filteredProjects, watchAll.targetType, setValue]);

  const handleCurrencyChange = (field: any, value: string) => {
    setValue(field, formatAmount(value), { shouldValidate: true });
  };

  const onSubmit = (data: MonthlyFormValues) => {
    if (!worker) return;

    let finalClientId = 'FREE';
    let finalProjectId = 'FREE';
    let finalBilledWage = parseAmount(data.internalMonthlyWage); 

    if (data.targetType === 'CLIENT') {
      finalClientId = data.clientId || 'FREE';
      finalBilledWage = parseAmount(data.billedMonthlyWage) || parseAmount(data.internalMonthlyWage);
    } else if (data.targetType === 'PROJECT') {
      finalClientId = data.clientId || 'FREE';
      finalProjectId = data.projectId || 'FREE';
      finalBilledWage = parseAmount(data.billedMonthlyWage) || parseAmount(data.internalMonthlyWage);
    }

    const newContract: LaborMonthlyContract = {
      id: crypto.randomUUID(),
      title: data.title,
      projectId: finalProjectId,
      clientId: finalClientId,
      startDate: data.startDate,
      endDate: data.endDate,
      internalMonthlyWage: parseAmount(data.internalMonthlyWage),
      billedMonthlyWage: finalBilledWage,
      isActive: true,
    };

    const updatedContracts = [...(worker.activeContracts || []), newContract];
    updateWorker(workerId, { activeContracts: updatedContracts });
    
    toast.success('دوره ماهانه با موفقیت در پرونده ثبت شد.');
    onClose();
  };

  const expectedArbitrage = parseAmount(watchAll.billedMonthlyWage) - parseAmount(watchAll.internalMonthlyWage);

  let durationDays = 0;
  if (watchAll.startDate?.length === 10 && watchAll.endDate?.length === 10) {
    const s = moment(watchAll.startDate, 'jYYYY/jMM/jDD');
    const e = moment(watchAll.endDate, 'jYYYY/jMM/jDD');
    if (s.isValid() && e.isValid()) {
      durationDays = Math.max(0, e.diff(s, 'days') + 1);
    }
  }

  const clientOptions = clients.map(c => ({ id: c.id, label: `${c.name || ''} ${c.lastName || ''}`.trim(), icon: UserCircle }));
  const projectOptions = filteredProjects.map(p => ({ id: p.id, label: p.title || p.name || 'بدون عنوان', icon: Building2 }));

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <GlassScrollStyles />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl max-h-[95vh] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/50 dark:border-slate-700/60 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-hidden overflow-visible">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md"><CalendarDays className="w-6 h-6" /></div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">تعریف قرارداد / دوره ماهانه</h2>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1">ایجاد قرارداد مستمر با محاسبه خودکار بازه‌ها</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/50 dark:bg-slate-800/50 hover:bg-rose-100 hover:text-rose-500 rounded-xl transition-all shadow-sm"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto glass-scroll p-6 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-1.5 relative z-[100]">
              <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-cyan-500"/> عنوان قرارداد (مثلاً حضور در کارگاه مرکزی)</label>
              <input {...register('title')} className="w-full h-[46px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-black text-slate-700 dark:text-slate-300 outline-none focus:border-cyan-500 focus:ring-2 ring-cyan-500/20 shadow-inner transition-all" placeholder="عنوان توافق..." />
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-3xl p-5 shadow-sm space-y-4 relative z-[95]">
               <div className="flex items-center gap-2 mb-2">
                 <Target className="w-4 h-4 text-indigo-500" />
                 <span className="text-sm font-black text-slate-800 dark:text-slate-200">طرف قرارداد و تخصیص</span>
               </div>
               
               <div className="grid grid-cols-3 gap-2">
                 {[
                   { id: 'US', label: 'داخلی (برای خودمان)' },
                   { id: 'CLIENT', label: 'در اختیار کارفرما' },
                   { id: 'PROJECT', label: 'تخصیص به پروژه' }
                 ].map((type) => (
                   <button
                     key={type.id} type="button" onClick={() => setValue('targetType', type.id as any, { shouldValidate: true })}
                     className={`py-2.5 px-2 rounded-xl text-[10px] sm:text-xs font-black transition-all duration-300 border ${
                       watchAll.targetType === type.id 
                        ? 'bg-indigo-500 border-indigo-600 text-white shadow-md scale-[1.02]' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-800'
                     }`}
                   >
                     {type.label}
                   </button>
                 ))}
               </div>

               <AnimatePresence mode="wait">
                 {watchAll.targetType !== 'US' && (
                   <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-2 flex flex-col sm:flex-row gap-4 relative z-[90]">
                     <div className="flex-1 space-y-1.5 relative z-[90]">
                        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">انتخاب کارفرما *</label>
                        <Controller control={control} name="clientId" render={({ field }) => (
                          <PortalSelect options={clientOptions} value={field.value} onChange={field.onChange} placeholder="انتخاب کنید..." searchable className={`!h-[42px] !rounded-xl ${errors.clientId ? '!border-rose-500' : ''}`} />
                        )} />
                     </div>
                     
                     {watchAll.targetType === 'PROJECT' && (
                       <div className="flex-1 space-y-1.5 relative z-[80]">
                          <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">انتخاب پروژه *</label>
                          <Controller control={control} name="projectId" render={({ field }) => (
                            <PortalSelect 
                              options={projectOptions} value={field.value} onChange={field.onChange} 
                              placeholder={watchAll.clientId ? (projectOptions.length > 0 ? "انتخاب پروژه..." : "بدون پروژه") : "ابتدا کارفرما را انتخاب کنید"} 
                              searchable className={`!h-[42px] !rounded-xl ${errors.projectId ? '!border-rose-500' : ''}`} 
                              disabled={!watchAll.clientId || projectOptions.length === 0} 
                            />
                          )} />
                       </div>
                     )}
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {/* 💡 بخش بازه زمانی اصلاح شد و تقویم اصلی GlassDatePicker اضافه شد */}
            <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/50 rounded-3xl p-5 shadow-sm relative z-[80]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-cyan-500" /> بازه زمانی قرارداد</span>
                {durationDays > 0 && <span className="px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-lg text-xs font-black">طول دوره: {durationDays} روز</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-[70]">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-500">تاریخ شروع</label>
                   <Controller control={control} name="startDate" render={({ field }) => (
                     <GlassDatePicker value={field.value} onChange={field.onChange} placeholder="140X/XX/XX" hasError={!!errors.startDate} />
                   )} />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-500">تاریخ پایان</label>
                   <Controller control={control} name="endDate" render={({ field }) => (
                     <GlassDatePicker value={field.value} onChange={field.onChange} placeholder="140X/XX/XX" hasError={!!errors.endDate} />
                   )} />
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${watchAll.targetType !== 'US' ? 'sm:grid-cols-2' : ''} gap-5 relative z-[60]`}>
              <div className={`p-5 rounded-3xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-900/10 shadow-sm space-y-3 ${watchAll.targetType === 'US' ? 'sm:w-1/2 mx-auto' : ''}`}>
                 <label className="text-xs font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5"><Wallet className="w-4 h-4 text-indigo-500"/> حقوق ماهانه نیروی کار *</label>
                 <div className="relative">
                   <input value={watchAll.internalMonthlyWage || ''} onChange={(e) => handleCurrencyChange('internalMonthlyWage', e.target.value)} dir="ltr" className={`w-full h-[46px] bg-white dark:bg-slate-900 border rounded-xl px-4 pr-12 text-sm font-black text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500 focus:ring-2 ring-indigo-500/20 shadow-inner transition-all ${errors.internalMonthlyWage ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'}`} placeholder="0" />
                   <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">تومان</span>
                 </div>
              </div>

              <AnimatePresence>
                {watchAll.targetType !== 'US' && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="p-5 rounded-3xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10 shadow-sm space-y-3">
                     <label className="text-xs font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5"><Building2 className="w-4 h-4 text-emerald-500"/> رقم فاکتور ماهانه کارفرما</label>
                     <div className="relative">
                       <input value={watchAll.billedMonthlyWage || ''} onChange={(e) => handleCurrencyChange('billedMonthlyWage', e.target.value)} dir="ltr" className="w-full h-[46px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 pr-12 text-sm font-black text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500 focus:ring-2 ring-emerald-500/20 shadow-inner transition-all" placeholder="اختیاری..." />
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">تومان</span>
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {watchAll.targetType !== 'US' && (
              <div className="p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-2"><Calculator className="w-4 h-4 text-slate-400" /> حاشیه سود پنهان (آربیتراژ) ماهانه:</span>
                <span className={`text-sm font-black font-mono tracking-widest ${expectedArbitrage > 0 ? 'text-emerald-500' : 'text-slate-400'}`} dir="ltr">{expectedArbitrage > 0 ? formatAmount(expectedArbitrage) : '0'} <span className="text-[9px]">تومان</span></span>
              </div>
            )}

            <div className="pt-2">
              <button type="submit" className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-2xl font-black text-sm shadow-[0_10px_20px_rgba(6,182,212,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                ثبت دوره ماهانه (بدون ایجاد تراکنش مالی)
              </button>
            </div>
            
            <div className="flex items-center gap-2 justify-center opacity-60">
               <AlertCircle className="w-4 h-4 text-slate-500" />
               <span className="text-[9px] font-bold text-slate-500 text-center">این عملیات فقط برای سیستم حسابداری روزها و هشدارهای ماهانه ثبت می‌شود.</span>
            </div>

          </form>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}