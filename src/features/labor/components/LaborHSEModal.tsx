import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShieldAlert, HeartPulse, FileBadge, PhoneCall, 
  CheckCircle2, Globe, Syringe, FileWarning, Fingerprint, CalendarDays,
  UploadCloud, FileText, Trash2, ChevronDown, Check, Search
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useLaborStore } from '../../../store/laborStore';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';

const hseSchema = z.object({
  nationalId: z.string().optional(),
  nationality: z.string().optional(),
  workPermitExpiry: z.string().optional(),
  insuranceCode: z.string().optional(),
  bloodType: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  medicalNotes: z.string().optional(),
});

type HseFormValues = z.infer<typeof hseSchema>;

const GlassScrollStyles = () => (
  <style>{`
    .glass-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .glass-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }
    .glass-scroll::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.3); border-radius: 10px; transition: background 0.3s ease; }
    .glass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.8); }
    .dark .glass-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
    .dark .glass-scroll::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.4); }
  `}</style>
);

const PortalSelect = ({ value, onChange, options, placeholder, icon: Icon, searchable = false, className = '' }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  
  const selected = options.find((o:any) => o.id === value);

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
      <button type="button" ref={btnRef} onClick={() => isOpen ? setIsOpen(false) : openDropdown()} className={`w-full h-[48px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 flex justify-between items-center outline-none transition-all shadow-inner hover:border-amber-400 focus:ring-2 focus:ring-amber-500/30 ${className}`}>
        <div className="flex items-center gap-2 truncate text-right flex-1">
           {Icon && <Icon className="w-4 h-4 text-amber-500 shrink-0" />}
           <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-200 pt-0.5">
             {selected ? selected.label : placeholder}
           </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-amber-500 shrink-0 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[999999]" onClick={() => setIsOpen(false)} />
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ top: coords.top, left: coords.left, width: coords.width }} className="fixed bg-white/95 dark:bg-slate-800/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] z-[1000000] overflow-hidden flex flex-col max-h-72 min-w-[200px]">
            {searchable && (
              <div className="p-2 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="relative group rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
                   <div className="absolute inset-0 rounded-xl pointer-events-none group-focus-within:animate-pulse" style={{ padding: '2px', background: 'linear-gradient(90deg, #f59e0b, #f97316)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', opacity: 0.5 }} />
                   <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 z-10" />
                   <input type="text" autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="جستجو..." className="w-full bg-transparent border-none pr-9 pl-3 py-2.5 text-xs font-bold outline-none text-slate-700 dark:text-slate-200 relative z-10" />
                </div>
              </div>
            )}
            <div className="overflow-y-auto glass-scroll p-1.5 flex-1">
              {filteredOptions.length > 0 ? filteredOptions.map((opt: any) => (
                <button type="button" key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-right px-4 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-between group ${value === opt.id ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                  <span className="truncate pl-2">{opt.label}</span>
                  {value === opt.id && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                </button>
              )) : (
                <div className="py-6 text-center text-xs font-bold text-slate-400">موردی یافت نشد!</div>
              )}
            </div>
          </motion.div>
        </>, document.body
      )}
    </>
  );
};

// 💡 سازنده اختصاصی آیدی برای جلوگیری از خطای ریکت
const generateSecureId = () => `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface LaborHSEModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
}

export default function LaborHSEModal({ isOpen, onClose, workerId }: LaborHSEModalProps) {
  const { workers, updateWorker } = useLaborStore();
  const worker = workers.find(w => w.id === workerId);

  const [newFiles, setNewFiles] = useState<any[]>([]);

  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<HseFormValues>({
    resolver: zodResolver(hseSchema),
    defaultValues: {
      nationalId: worker?.nationalId || '',
      nationality: worker?.nationality || 'ایرانی',
      workPermitExpiry: worker?.workPermitExpiry || '',
      insuranceCode: worker?.insuranceCode || '',
      bloodType: worker?.bloodType || '',
      emergencyContactName: worker?.emergencyContactName || '',
      emergencyContactPhone: worker?.emergencyContactPhone || '',
      medicalNotes: worker?.medicalNotes || '',
    }
  });

  const NATIONALITY_OPTIONS = [
    { id: 'ایرانی', label: 'ایرانی' },
    { id: 'افغانستانی', label: 'افغانستانی' },
    { id: 'پاکستانی', label: 'پاکستانی' },
    { id: 'سایر', label: 'سایر' },
  ];

  const BLOOD_TYPE_OPTIONS = [
    { id: '', label: 'نامشخص' },
    { id: 'A+', label: 'A+' }, { id: 'A-', label: 'A-' },
    { id: 'B+', label: 'B+' }, { id: 'B-', label: 'B-' },
    { id: 'O+', label: 'O+' }, { id: 'O-', label: 'O-' },
    { id: 'AB+', label: 'AB+' }, { id: 'AB-', label: 'AB-' },
  ];

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1920; 
          const MAX_HEIGHT = 1920;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85)); 
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      toast.loading('در حال پردازش فایل‌ها (بدون محدودیت حجم)...', { id: 'uploading' });
      
      const filesArray = await Promise.all(
        Array.from(e.target.files).map(async (file) => {
          if (file.type.startsWith('image/')) {
            const compressedBase64 = await compressImage(file);
            return {
              id: generateSecureId(),
              title: file.name,
              type: 'image/jpeg',
              uploadDate: moment().format('jYYYY/jMM/jDD'),
              url: compressedBase64,
            };
          } else {
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            return {
              id: generateSecureId(),
              title: file.name,
              type: file.type,
              uploadDate: moment().format('jYYYY/jMM/jDD'),
              url: base64,
            };
          }
        })
      );

      setNewFiles(prev => [...prev, ...filesArray]);
      toast.success('فایل‌ها برای ذخیره آماده شدند.', { id: 'uploading' });
    }
  };

  const removeFile = (id: string) => {
    setNewFiles(prev => prev.filter(f => f.id !== id));
  };

  const onSubmit = (data: HseFormValues) => {
    if (!worker) return;
    const updatedDocuments = [...(worker.documents || []), ...newFiles];

    updateWorker(workerId, {
      nationalId: data.nationalId,
      nationality: data.nationality,
      workPermitExpiry: data.workPermitExpiry,
      insuranceCode: data.insuranceCode,
      bloodType: data.bloodType,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      medicalNotes: data.medicalNotes,
      documents: updatedDocuments,
    });

    toast.success('پرونده ایمنی و مدارک آپلود شد.');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <GlassScrollStyles />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-3xl flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/50 dark:border-slate-700/60 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-hidden max-h-[90vh]">
        
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md"><ShieldAlert className="w-6 h-6" /></div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">بروزرسانی پرونده حراست و HSE</h2>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1">مدیریت سوابق پزشکی، هویت و مدارک</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/50 dark:bg-slate-800/50 hover:bg-rose-100 hover:text-rose-500 rounded-xl transition-all shadow-sm"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto glass-scroll p-6 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 rounded-3xl p-5 shadow-sm">
               <div className="flex items-center gap-2 mb-4 border-b border-amber-200/50 dark:border-amber-800/30 pb-3">
                 <FileBadge className="w-5 h-5 text-amber-500" />
                 <h3 className="text-sm font-black text-amber-900 dark:text-amber-400">اطلاعات حقوقی و مهاجرتی</h3>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><Fingerprint className="w-3.5 h-3.5 text-amber-500"/> کد ملی / شماره پاسپورت</label>
                   <input {...register('nationalId')} className="w-full h-[48px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 text-sm font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-inner" />
                 </div>
                 
                 <div className="space-y-1.5">
                   <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-amber-500"/> ملیت / تابعیت</label>
                   <Controller control={control} name="nationality" render={({ field }) => (
                     <PortalSelect options={NATIONALITY_OPTIONS} value={field.value} onChange={field.onChange} placeholder="انتخاب ملیت" />
                   )} />
                 </div>
                 
                 <div className="space-y-1.5 relative z-50">
                   <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-amber-500"/> تاریخ انقضای پروانه کار / ویزا</label>
                   <div className="h-[48px] relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-inner group focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all [&_input]:bg-transparent [&_input]:border-none [&_input]:shadow-none text-slate-800 dark:text-slate-200 [&_input]:text-slate-800 dark:[&_input]:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500">
                     <Controller control={control} name="workPermitExpiry" render={({ field: { onChange, value } }) => (
                       <GlassDatePicker value={value || ''} onChange={onChange} />
                     )} />
                   </div>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5 text-amber-500"/> شماره بیمه تامین اجتماعی</label>
                   <input {...register('insuranceCode')} className="w-full h-[48px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 text-sm font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-inner" />
                 </div>
               </div>
            </div>

            <div className="bg-rose-50/50 dark:bg-rose-900/10 border border-rose-200/50 dark:border-rose-800/30 rounded-3xl p-5 shadow-sm">
               <div className="flex items-center gap-2 mb-4 border-b border-rose-200/50 dark:border-rose-800/30 pb-3">
                 <HeartPulse className="w-5 h-5 text-rose-500" />
                 <h3 className="text-sm font-black text-rose-900 dark:text-rose-400">پرونده پزشکی و اورژانس (SOS)</h3>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                 <div className="space-y-1.5">
                   <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><PhoneCall className="w-3.5 h-3.5 text-rose-500"/> نام شخص رابط اضطراری</label>
                   <input {...register('emergencyContactName')} className="w-full h-[48px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 text-sm font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-inner" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><PhoneCall className="w-3.5 h-3.5 text-rose-500"/> شماره تماس اضطراری</label>
                   <input {...register('emergencyContactPhone')} dir="ltr" placeholder="09..." className="w-full h-[48px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 text-sm font-black text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-inner" />
                 </div>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 
                 <div className="space-y-1.5 sm:col-span-1">
                   <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><Syringe className="w-3.5 h-3.5 text-rose-500"/> گروه خونی</label>
                   <Controller control={control} name="bloodType" render={({ field }) => (
                     <PortalSelect options={BLOOD_TYPE_OPTIONS} value={field.value} onChange={field.onChange} placeholder="نامشخص" />
                   )} />
                 </div>
                 
                 <div className="space-y-1.5 sm:col-span-2">
                   <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1"><FileWarning className="w-3.5 h-3.5 text-rose-500"/> سوابق بیماری / حساسیت دارویی</label>
                   <input {...register('medicalNotes')} placeholder="مثال: دیابت، حساسیت به پنی‌سیلین..." className="w-full h-[48px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 text-sm font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-inner" />
                 </div>
               </div>
            </div>

            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 rounded-3xl p-5 shadow-sm">
               <div className="flex items-center gap-2 mb-4 border-b border-blue-200/50 dark:border-blue-800/30 pb-3">
                 <FileText className="w-5 h-5 text-blue-500" />
                 <h3 className="text-sm font-black text-blue-900 dark:text-blue-400">آپلود مدارک (گاوصندوق)</h3>
               </div>
               
               <div className="space-y-4">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-2xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-800/30 hover:border-blue-500 transition-colors bg-white dark:bg-slate-900">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">فایل‌ها را اینجا رها کنید (عکس، ویدیو، PDF و...)</p>
                      <p className="text-[10px] font-bold text-emerald-500 mt-1">بدون محدودیت حجم برای اپلیکیشن دسکتاپ</p>
                    </div>
                    <input type="file" className="hidden" multiple onChange={handleFileSelect} />
                  </label>

                  {newFiles.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <AnimatePresence>
                        {newFiles.map(file => (
                          <motion.div key={file.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm flex flex-col group">
                            <div className="h-16 bg-slate-100 dark:bg-slate-900 flex items-center justify-center w-full relative">
                              {file.type?.startsWith('image/') || file.type?.startsWith('video/') ? (
                                <img src={file.url} alt={file.title} className="w-full h-full object-cover" />
                              ) : (
                                <FileText className="w-8 h-8 text-slate-400" />
                              )}
                              <button type="button" onClick={() => removeFile(file.id)} className="absolute top-1 right-1 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg shadow-md transition-colors" title="حذف فایل">
                                <Trash2 className="w-3.5 h-3.5"/>
                              </button>
                            </div>
                            <div className="p-2 text-center">
                              <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate" dir="ltr">{file.title}</p>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
               </div>
            </div>

            <div className="pt-4 shrink-0">
              <button disabled={isSubmitting} type="submit" className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-[2rem] font-black text-base shadow-[0_15px_30px_rgba(245,158,11,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2">
                <CheckCircle2 className="w-6 h-6" /> ذخیره پرونده و مدارک آپلودی
              </button>
            </div>

          </form>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}