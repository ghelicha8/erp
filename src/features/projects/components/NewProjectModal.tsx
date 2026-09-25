import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, AlertCircle, Plus, CheckCircle, ChevronDown, Trash2, Building2, UploadCloud, Calculator, Percent, Ruler } from 'lucide-react';
import { toast } from 'sonner';

import { useProjectStore } from '../store/projectStore';
import { useClientStore } from '../../../store/clientStore'; 
import type { ContractType, Project } from '../types/project.types';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import ClientFormModal from '../../clients/components/ClientFormModal';

const projectSchema = z.object({
  name: z.string().min(3, 'نام پروژه باید حداقل ۳ حرف باشد'),
  clientId: z.string().min(1, 'انتخاب کارفرما از لیست الزامی است'),
  contractType: z.enum(['METRI', 'CONTRAT', 'PERCENTAGE', 'COST_ONLY', 'CUSTOM'] as const, {
    error: 'لطفاً نوع قرارداد را مشخص کنید',
  }),
  startDate: z.string().min(1, 'انتخاب تاریخ شروع الزامی است'),
  profilePhoto: z.string().optional(),
  photos: z.array(z.string()).max(10, 'حداکثر می‌توانید ۱۰ عکس آپلود کنید').optional(),
  phasePhotos: z.array(z.string()).max(5, 'حداکثر ۵ تصویر قرارداد').optional(),
  area: z.string().optional(),
  unitPrice: z.string().optional(),
  fixedPrice: z.string().optional(),
  contractorPercentage: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const contractTypeOptions = [
  { value: 'CONTRAT', label: 'مقطوع (کنترات)' },
  { value: 'METRI', label: 'متری' },
  { value: 'PERCENTAGE', label: 'درصدی (پیمان مدیریت)' },
  { value: 'COST_ONLY', label: 'فقط هزینه' },
  { value: 'CUSTOM', label: 'سفارشی / متفرقه' },
];

const formatAmount = (value: string) => value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const parseAmount = (val?: string) => Number((val || '0').replace(/,/g, ''));

const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else reject(new Error('خطا در فشرده‌سازی'));
      };
    };
  });
};

const getClientFullName = (client: any) => {
  if (!client) return '';
  return `${client.name} ${client.lastName || ''}`.trim();
};

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: Project | null; 
  preSelectedClientId?: string; 
}

export default function NewProjectModal({ isOpen, onClose, editData, preSelectedClientId }: NewProjectModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const addProject = useProjectStore((state) => state.addProject);
  const updateProject = useProjectStore((state) => state.updateProject);
  const storeClients = useClientStore((state) => state.clients);
  
  const [clientSearch, setClientSearch] = useState('');
  const [showClientsDropdown, setShowClientsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contractDropdownRef = useRef<HTMLDivElement>(null);
  const [showContractDropdown, setShowContractDropdown] = useState(false);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const prevClientIds = useRef(new Set(storeClients.map(c => c.id)));

  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { photos: [], phasePhotos: [], contractType: 'CONTRAT' },
  });

  const profilePhotoValue = watch('profilePhoto');
  const photosValue = watch('photos') || [];
  const phasePhotosValue = watch('phasePhotos') || [];
  const currentContractType = watch('contractType'); 

  useEffect(() => {
    const currentIds = new Set(storeClients.map(c => c.id));
    if (currentIds.size > prevClientIds.current.size) {
      const newClient = storeClients.find(c => !prevClientIds.current.has(c.id));
      if (newClient && !preSelectedClientId) {
        setValue('clientId', newClient.id, { shouldValidate: true });
        setClientSearch(getClientFullName(newClient));
        toast.success(`کارفرما "${getClientFullName(newClient)}" تنظیم شد.`);
      }
    }
    prevClientIds.current = currentIds;
  }, [storeClients, setValue, preSelectedClientId]);

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        const client = storeClients.find(c => c.id === editData.clientId);
        setClientSearch(client ? getClientFullName(client) : editData.clientId);
        setShowContractDropdown(false);
        
        // 💡 ردیاب هوشمند: پیدا کردن فاز فعال به جای هاردکد کردن فاز اول
        const targetPhaseIndex = editData.phases?.findIndex((p: any) => p.phaseStatus === 'IN_PROGRESS' || !p.isCompleted);
        const activeIdx = targetPhaseIndex !== undefined && targetPhaseIndex >= 0 ? targetPhaseIndex : 0;
        const activePhase = editData.phases?.[activeIdx];

        // 💡 فراخوانی هوشمند (اولویت با فاز فعال، اگر نبود استفاده از دیتای قدیمی ریشه پروژه)
        reset({
          name: editData.name || '',
          clientId: editData.clientId || '',
          startDate: editData.startDate || '',
          profilePhoto: editData.profilePhoto || '',
          photos: editData.photos || [],
          contractType: activePhase?.contractType || (editData as any).contractType || 'CONTRAT',
          phasePhotos: activePhase?.photos || [],
          area: activePhase?.area?.toString() || (editData as any).area?.toString() || '',
          unitPrice: activePhase?.unitPrice ? formatAmount(activePhase.unitPrice.toString()) : ((editData as any).unitPrice ? formatAmount((editData as any).unitPrice.toString()) : ''),
          fixedPrice: activePhase?.fixedPrice ? formatAmount(activePhase.fixedPrice.toString()) : ((editData as any).fixedPrice ? formatAmount((editData as any).fixedPrice.toString()) : ''),
          contractorPercentage: activePhase?.contractorPercentage?.toString() || (editData as any).contractorPercentage?.toString() || '',
        });
      } else if (preSelectedClientId) {
        const client = storeClients.find(c => c.id === preSelectedClientId);
        if (client) {
          setClientSearch(getClientFullName(client)); 
          setValue('clientId', client.id, { shouldValidate: true });
        }
        reset({ name: '', startDate: '', profilePhoto: '', photos: [], phasePhotos: [], contractType: 'CONTRAT', area: '', unitPrice: '', fixedPrice: '', contractorPercentage: '', clientId: preSelectedClientId });
        setShowContractDropdown(false);
      } else {
        reset({ name: '', clientId: '', startDate: '', profilePhoto: '', photos: [], phasePhotos: [], contractType: 'CONTRAT', area: '', unitPrice: '', fixedPrice: '', contractorPercentage: '' });
        setClientSearch('');
        setShowContractDropdown(false);
      }
    }
  }, [isOpen, reset, editData, storeClients, preSelectedClientId, setValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowClientsDropdown(false);
      if (contractDropdownRef.current && !contractDropdownRef.current.contains(event.target as Node)) setShowContractDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setValue('profilePhoto', compressed, { shouldValidate: true });
      } catch (error) { toast.error('خطا در پردازش تصویر'); }
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photosValue.length + files.length > 10) {
      toast.error('حداکثر مجاز به آپلود ۱۰ عکس هستید.');
      return;
    }
    try {
      const compressedFiles = await Promise.all(files.map(f => compressImage(f)));
      setValue('photos', [...photosValue, ...compressedFiles], { shouldValidate: true });
    } catch (error) { toast.error('خطا در پردازش تصاویر گالری'); }
  };

  const handlePhasePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (phasePhotosValue.length + files.length > 5) {
      toast.error('حداکثر ۵ سند برای هر قرارداد مجاز است.');
      return;
    }
    try {
      const compressedFiles = await Promise.all(files.map(f => compressImage(f)));
      setValue('phasePhotos', [...phasePhotosValue, ...compressedFiles], { shouldValidate: true });
    } catch (error) { toast.error('خطا در پردازش تصویر'); }
  };

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      const isValidClient = storeClients.some(c => c.id === data.clientId);
      if (!isValidClient) {
        toast.error('لطفاً کارفرما را از لیست انتخاب کنید یا از طریق دکمه ثبت، کارفرمای جدید بسازید.');
        return;
      }
      
      const parsedArea = Number(data.area) || 0;
      const parsedUnitPrice = parseAmount(data.unitPrice);
      const parsedFixedPrice = parseAmount(data.fixedPrice);
      const parsedPercentage = Number(data.contractorPercentage) || 0;

      if (editData) {
        const hasPhases = editData.phases && editData.phases.length > 0;
        
        // 💡 پیدا کردن اندیس فاز فعال برای جایگذاری دقیق اطلاعات
        const targetPhaseIndex = editData.phases?.findIndex((p: any) => p.phaseStatus === 'IN_PROGRESS' || !p.isCompleted);
        const activeIdx = targetPhaseIndex !== undefined && targetPhaseIndex >= 0 ? targetPhaseIndex : 0;

        const updatedPhases = hasPhases 
          ? editData.phases?.map((p, idx) => idx === activeIdx ? { 
              ...p, 
              contractType: data.contractType, 
              photos: data.phasePhotos,
              area: parsedArea,
              unitPrice: parsedUnitPrice,
              fixedPrice: parsedFixedPrice,
              contractorPercentage: parsedPercentage
            } : p)
          : [{ 
              id: crypto.randomUUID(), 
              name: 'فاز اول', 
              description: 'فاز اولیه پروژه', 
              isCompleted: false, 
              contractType: data.contractType, 
              photos: data.phasePhotos, 
              financials: { expenditure: 0 },
              phaseStatus: 'IN_PROGRESS',
              area: parsedArea, 
              length: 0, width: 0, height: 0, 
              unitPrice: parsedUnitPrice, 
              contractorPercentage: parsedPercentage, 
              fixedPrice: parsedFixedPrice
            }];

        // 💡 بمباران اطلاعات قدیمیِ ریشه پروژه (Legacy Root Fields Cleanup)
        updateProject(editData.id, {
          name: data.name,
          clientId: data.clientId,
          startDate: data.startDate,
          photos: data.photos,
          profilePhoto: data.profilePhoto,
          phases: updatedPhases,
          
          contractType: undefined,
          area: undefined,
          unitPrice: undefined,
          fixedPrice: undefined,
          contractorPercentage: undefined
        } as any);
        toast.success('تغییرات پروژه با موفقیت ثبت شد');
      } else {
        addProject({
          name: data.name, 
          clientId: data.clientId, 
          startDate: data.startDate, 
          status: 'IN_PROGRESS', 
          photos: data.photos, 
          profilePhoto: data.profilePhoto,
          phases: [{ 
            id: crypto.randomUUID(), 
            name: 'فاز اول', 
            description: 'فاز اولیه پروژه', 
            isCompleted: false, 
            contractType: data.contractType, 
            photos: data.phasePhotos, 
            financials: { expenditure: 0 },
            phaseStatus: 'IN_PROGRESS',
            area: parsedArea, 
            length: 0, width: 0, height: 0, 
            unitPrice: parsedUnitPrice, 
            contractorPercentage: parsedPercentage, 
            fixedPrice: parsedFixedPrice
          }]
        });
        toast.success('پروژه با موفقیت ایجاد شد');
      }
      onClose();
    } catch (error) { toast.error('خطا در ثبت اطلاعات.'); }
  };

  if (!isMounted) return null;

  const neonInputClass = "w-full bg-white/60 dark:bg-black/20 border border-white/40 dark:border-slate-700/50 rounded-2xl px-4 py-3.5 outline-none backdrop-blur-sm focus:border-purple-500 focus:shadow-[0_0_15px_#8b5cf6] transition-all duration-300 font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400";

  const modalContent = (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .rmdp-wrapper, .rmdp-container, .ep-arrow, .date-picker-wrapper, .react-datepicker-popper, .MuiPopover-root { 
          z-index: 2147483647 !important; 
        }
        .modal-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .modal-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .modal-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 10px; }
        .dark .modal-scrollbar::-webkit-scrollbar-thumb { background: rgba(75, 85, 99, 0.7); }
        .modal-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.8); }
      `}} />

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-slate-900/40 backdrop-blur-md p-4 overflow-y-auto modal-scrollbar" dir="rtl">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0" />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative z-[10000] w-full max-w-4xl my-auto bg-white/70 dark:bg-slate-900/80 rounded-[2.5rem] shadow-2xl p-6 sm:p-10 border border-white/50 dark:border-slate-700/50 pointer-events-auto overflow-visible"
            >
              <button onClick={onClose} className="absolute top-6 left-6 p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-colors z-10">
                <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </button>

              <div className="mb-8 text-center sm:text-right flex flex-col items-center sm:items-start">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-4">
                  <Building2 className="w-7 h-7 text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                </div>
                <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-600 drop-shadow-sm">
                  {editData ? 'ویرایش پروژه' : 'ثبت پروژه جدید'}
                </h2>
                <p className="text-sm mt-2 text-slate-500 dark:text-slate-400 font-medium">اطلاعات قرارداد و کارفرما را با دقت وارد کنید.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit, () => toast.error('لطفاً خطاهای فرم را برطرف کنید'))} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative" style={{ zIndex: 10 }}>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">نام پروژه</label>
                    <input {...register('name')} className={`${neonInputClass} ${errors.name ? 'border-rose-500/70 ring-1 ring-rose-500/50' : ''}`} placeholder="مثال: برج مسکونی آسمان" />
                    {errors.name && <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 mt-1.5 text-rose-500 text-xs font-bold"><AlertCircle className="w-3.5 h-3.5" /><span>{errors.name.message}</span></motion.div>}
                  </div>

                  <div className="space-y-2 relative" ref={contractDropdownRef}>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">نوع قرارداد (فاز فعلی)</label>
                    <div tabIndex={0} onClick={() => setShowContractDropdown(!showContractDropdown)} className={`cursor-pointer w-full flex items-center justify-between ${neonInputClass} ${errors.contractType ? 'border-rose-500/70 ring-1 ring-rose-500/50' : ''}`}>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{contractTypeOptions.find(o => o.value === watch('contractType'))?.label || 'انتخاب کنید...'}</span>
                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${showContractDropdown ? 'rotate-180 text-violet-500' : ''}`} />
                    </div>
                    {errors.contractType && <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 mt-1.5 text-rose-500 text-xs font-bold"><AlertCircle className="w-3.5 h-3.5" /><span>{errors.contractType.message}</span></motion.div>}

                    <AnimatePresence>
                      {showContractDropdown && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ type: 'spring', damping: 25, stiffness: 400 }} className="absolute z-[999] w-full mt-2 backdrop-blur-2xl bg-white/95 dark:bg-slate-800/95 border border-white/50 dark:border-slate-700/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl max-h-56 overflow-y-auto modal-scrollbar">
                          {contractTypeOptions.map(option => (
                            <div key={option.value} className={`px-4 py-3.5 cursor-pointer font-bold border-b border-slate-100/50 dark:border-slate-700/50 last:border-0 transition-colors ${watch('contractType') === option.value ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'hover:bg-violet-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`} onClick={() => { setValue('contractType', option.value as ContractType, { shouldValidate: true }); setShowContractDropdown(false); }}>
                              {option.label}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {currentContractType === 'METRI' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl relative" style={{ zIndex: 9 }}>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 ml-1 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5"/> فی قرارداد (هر متر به تومان)</label>
                        <input {...register('unitPrice', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} className={`${neonInputClass} font-mono`} placeholder="مثال: 5,000,000" dir="ltr" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 ml-1 flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5"/> متراژ فعلی (اختیاری - متر مربع)</label>
                        <input {...register('area')} type="number" className={`${neonInputClass} font-mono`} placeholder="مثال: 250" dir="ltr" />
                      </div>
                    </motion.div>
                  )}

                  {currentContractType === 'PERCENTAGE' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 gap-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl relative" style={{ zIndex: 9 }}>
                      <div className="space-y-2 md:w-1/2">
                        <label className="text-xs font-bold text-amber-700 dark:text-amber-400 ml-1 flex items-center gap-1.5"><Percent className="w-3.5 h-3.5"/> درصد پیمان مدیریت (سود شما)</label>
                        <div className="relative">
                          <input {...register('contractorPercentage')} type="number" step="0.1" className={`${neonInputClass} font-mono pr-10`} placeholder="مثال: 15" dir="ltr" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 font-bold">%</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentContractType === 'CONTRAT' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 gap-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl relative" style={{ zIndex: 9 }}>
                      <div className="space-y-2 md:w-1/2">
                        <label className="text-xs font-bold text-blue-700 dark:text-blue-400 ml-1 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5"/> مبلغ کل مقطوع (تومان)</label>
                        <input {...register('fixedPrice', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} className={`${neonInputClass} font-mono`} placeholder="مبلغ کل توافق شده..." dir="ltr" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="w-full bg-violet-50/50 dark:bg-violet-900/10 border border-violet-200/50 dark:border-violet-800/50 rounded-2xl p-5 mb-4 shadow-inner relative" style={{ zIndex: 8 }}>
                  <label className="text-sm font-bold flex justify-between text-violet-700 dark:text-violet-300 ml-1 mb-3">
                    اسناد و تصاویر قرارداد این فاز (اختیاری)
                    <span className="px-2.5 py-0.5 bg-violet-200/50 dark:bg-violet-800/50 rounded-lg text-xs">{phasePhotosValue.length} / ۵</span>
                  </label>
                  <div className="flex gap-3 overflow-x-auto pb-2 modal-scrollbar">
                    {phasePhotosValue.length < 5 && (
                      <div className="relative shrink-0 h-28 w-28 rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-600 flex flex-col items-center justify-center bg-white/40 dark:bg-black/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors group cursor-pointer">
                        <input type="file" accept="image/*" multiple onChange={handlePhasePhotosUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <UploadCloud className="w-6 h-6 text-violet-400 group-hover:text-violet-500 transition-colors mb-1" />
                        <span className="text-[10px] font-black text-violet-500 text-center px-1">آپلود عکس قرارداد</span>
                      </div>
                    )}
                    <AnimatePresence>
                      {phasePhotosValue.map((p, i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="relative shrink-0 h-28 w-28 rounded-2xl overflow-hidden shadow-lg border border-white/20 group">
                          <img src={p} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110" alt="قرارداد فاز" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <button type="button" onClick={() => setValue('phasePhotos', phasePhotosValue.filter((_, idx) => idx !== i), { shouldValidate: true })} className="p-2 bg-rose-500 text-white rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.8)] hover:scale-110 transition-transform">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative" style={{ zIndex: 999999 }}>
                  
                  <div className="space-y-2 relative" ref={dropdownRef}>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">مشتری / کارفرما</label>
                    <input 
                      type="text" 
                      value={clientSearch} 
                      onChange={(e) => { const val = e.target.value; setClientSearch(val); setValue('clientId', val, { shouldValidate: true }); setShowClientsDropdown(true); }} 
                      onFocus={() => setShowClientsDropdown(true)} 
                      placeholder="جستجو در لیست کارفرمایان..." 
                      className={`${neonInputClass} ${errors.clientId ? 'border-rose-500/70 ring-1 ring-rose-500/50' : ''} ${preSelectedClientId ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-80' : ''}`} 
                      disabled={!!preSelectedClientId} 
                    />
                    {errors.clientId && <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 mt-1.5 text-rose-500 text-xs font-bold"><AlertCircle className="w-3.5 h-3.5" /><span>{errors.clientId.message}</span></motion.div>}
                    
                    <AnimatePresence>
                      {showClientsDropdown && !preSelectedClientId && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ type: 'spring', damping: 25, stiffness: 400 }} className="absolute z-[9999] w-full mt-2 backdrop-blur-2xl bg-white/95 dark:bg-slate-800/95 border border-white/50 dark:border-slate-700/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-h-48 overflow-y-auto modal-scrollbar">
                          {storeClients.filter(c => getClientFullName(c).toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                            <div key={c.id} className="px-4 py-3.5 hover:bg-violet-50 dark:hover:bg-slate-700/50 cursor-pointer font-bold border-b border-slate-100/50 dark:border-slate-700/50 last:border-0 transition-colors" onClick={() => { setClientSearch(getClientFullName(c)); setValue('clientId', c.id, { shouldValidate: true }); setShowClientsDropdown(false); }}>
                              {getClientFullName(c)}
                            </div>
                          ))}
                          
                          <div className="sticky bottom-0 px-4 py-3.5 bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-slate-700/50 cursor-pointer font-black border-t border-slate-200 dark:border-slate-600 transition-colors flex items-center justify-center gap-2 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]" 
                               onClick={(e) => { e.stopPropagation(); setIsClientModalOpen(true); setShowClientsDropdown(false); }}>
                            <Plus className="w-5 h-5" /><span>+ ثبت کارفرمای جدید</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-2 relative" style={{ zIndex: 999999 }}>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">تاریخ شروع</label>
                    <Controller control={control} name="startDate" render={({ field: { onChange, value } }) => (
                      <GlassDatePicker value={value} onChange={onChange} hasError={!!errors.startDate} />
                    )} />
                    {errors.startDate && <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 mt-1.5 text-rose-500 text-xs font-bold"><AlertCircle className="w-3.5 h-3.5" /><span>{errors.startDate.message}</span></motion.div>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 relative" style={{ zIndex: 1 }}>
                  <div className="flex flex-col space-y-2 col-span-1">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">عکس کاور اصلی پروژه</label>
                    <div className="relative h-40 w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/40 transition-colors group cursor-pointer">
                      <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      {profilePhotoValue ? <img src={profilePhotoValue} alt="کاور" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" /> : <div className="flex flex-col items-center text-slate-400 group-hover:text-emerald-500 transition-colors"><Camera className="w-10 h-10 mb-2 drop-shadow-md" /><span className="text-xs font-bold">آپلود کاور</span></div>}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 col-span-1 md:col-span-2">
                    <label className="text-sm font-bold flex justify-between text-slate-700 dark:text-slate-300 ml-1">
                      گالری اسناد و تصاویر عمومی پروژه 
                      <span className="px-2.5 py-0.5 bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 rounded-lg text-xs flex items-center shadow-inner">{photosValue.length} / ۱۰</span>
                    </label>
                    <div className="flex gap-3 overflow-x-auto pb-2 modal-scrollbar">
                      {photosValue.length < 10 && (
                        <div className="relative shrink-0 h-40 w-32 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/40 transition-colors group cursor-pointer">
                          <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <Plus className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors mb-1 drop-shadow-md" />
                          <span className="text-[10px] font-black text-slate-400 group-hover:text-emerald-500">افزودن عکس</span>
                        </div>
                      )}
                      <AnimatePresence>
                        {photosValue.map((p, i) => (
                          <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="relative shrink-0 h-40 w-32 rounded-2xl overflow-hidden shadow-lg border border-white/20 group">
                            <img src={p} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110" alt="گالری" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                              <button type="button" onClick={() => setValue('photos', photosValue.filter((_, idx) => idx !== i), { shouldValidate: true })} className="p-2 bg-rose-500 text-white rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.8)] hover:scale-110 transition-transform">
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200/50 dark:border-slate-700/50 mt-4 relative" style={{ zIndex: 0 }}>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-lg py-4 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:shadow-[0_0_30px_rgba(16,185,129,0.7)] transform transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {isSubmitting ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="relative z-10 drop-shadow-md">{editData ? 'ثبت تغییرات' : 'ثبت نهایی پروژه'}</span>
                        <CheckCircle className="w-5 h-5 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
            
          </div>
        )}
      </AnimatePresence>

      <ClientFormModal 
        isOpen={isClientModalOpen} 
        onClose={() => setIsClientModalOpen(false)} 
      />
    </>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}