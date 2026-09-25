import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Phone, Briefcase, HardHat, 
  CreditCard, ShieldAlert, Camera, UploadCloud, 
  Plus, CheckCircle2, Check, Info
} from 'lucide-react';
import { toast } from 'sonner';

import { useLaborStore } from '../../../store/laborStore'; 
import type { WorkerStatus, PriceBookEntry } from '../../../store/laborStore'; 

// 💡 اتصال مستقیم به فایل استایل‌ها و کامپوننت‌های گرافیکیِ یکپارچه
import { PortalSelect, GlassScrollStyles } from '../../../components/ui/SharedLaborUI';

// ==========================================
// 💡 دیتاهای لیست‌های کشویی
// ==========================================
const nationalityOptions = [
  { id: 'IRANIAN', label: 'ایرانی' },
  { id: 'AFGHAN_LEGAL', label: 'افغانستانی (دارای مجوز)' },
  { id: 'AFGHAN_ILLEGAL', label: 'افغانستانی (بدون مجوز)' },
  { id: 'OTHER', label: 'سایر اتباع' }
];

// ==========================================
// 💡 MAIN FORM MODAL (تک‌مرحله‌ای، سریع و مینیمال)
// ==========================================
export default function LaborFormModal({ isOpen, onClose, editWorkerId }: any) {
  const { workers, specialtyTags, addWorker, updateWorker } = useLaborStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const existingWorker = editWorkerId ? workers.find(w => w.id === editWorkerId) : null;

  const [localSpecialties, setLocalSpecialties] = useState<{id: string, name: string}[]>([]);
  const [isAddingSpecialty, setIsAddingSpecialty] = useState(false);
  const [newSpecialtyName, setNewSpecialtyName] = useState('');

  const allSpecialties = [...specialtyTags, ...localSpecialties];

  const [formData, setFormData] = useState({
    profilePhoto: existingWorker?.profilePhoto || '',
    name: existingWorker?.name || '',
    lastName: existingWorker?.lastName || '',
    phone1: existingWorker?.phone1 || '',
    phone2: existingWorker?.phone2 || '',
    nationalId: existingWorker?.nationalId || '',
    nationality: existingWorker?.nationality || 'IRANIAN',
    insuranceCode: existingWorker?.insuranceCode || '', 
    specialtyIds: existingWorker?.specialtyIds || ([] as string[]),
    priceBook: existingWorker?.priceBook || ([] as PriceBookEntry[]),
    
    // 💡 این فیلدها در بک‌گراند مقدار پیش‌فرض می‌گیرند تا ساختار دیتابیس حفظ شود
    defaultPaymentType: existingWorker?.defaultPaymentType || 'DAILY',
    defaultBaseWage: existingWorker?.defaultBaseWage || 0,
    standardWorkHours: existingWorker?.standardWorkHours || 8,
    maxAdvanceLimit: existingWorker?.maxAdvanceLimit || 0,
    guaranteeRetained: existingWorker?.guaranteeRetained || 0, 
    bloodType: existingWorker?.bloodType || 'UNKNOWN',
    emergencyContactName: existingWorker?.emergencyContactName || '',
    emergencyContactPhone: existingWorker?.emergencyContactPhone || '',
    medicalNotes: existingWorker?.medicalNotes || '',
    status: existingWorker?.status || ('ACTIVE' as WorkerStatus),
  });

  const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const toggleSpecialty = (specId: string) => {
    setFormData(prev => {
      const isSelected = prev.specialtyIds.includes(specId);
      const newSpecialties = isSelected ? prev.specialtyIds.filter(id => id !== specId) : [...prev.specialtyIds, specId];
      // اگر تخصصی حذف شد، تعرفه مربوط به آن هم پاک شود (در صورت وجود از قبل)
      const newPriceBook = isSelected ? prev.priceBook.filter(pb => pb.specialtyId !== specId) : prev.priceBook;
      return { ...prev, specialtyIds: newSpecialties, priceBook: newPriceBook };
    });
  };

  const handleAddCustomSpecialty = () => {
    if (!newSpecialtyName.trim()) return;
    const newTag = { id: crypto.randomUUID(), name: newSpecialtyName.trim() };
    setLocalSpecialties(prev => [...prev, newTag]); 
    setFormData(prev => ({ ...prev, specialtyIds: [...prev.specialtyIds, newTag.id] })); 
    setNewSpecialtyName('');
    setIsAddingSpecialty(false);
    toast.success('تخصص جدید به لیست اضافه شد.');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { toast.error('حجم عکس بیش از ۲ مگابایت است.'); return; }
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, profilePhoto: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone1.trim()) { toast.error('وارد کردن نام و موبایل اصلی الزامی است.'); return; }
    if (formData.specialtyIds.length === 0) { toast.error('لطفا حداقل یک تخصص برای نیرو انتخاب کنید.'); return; }
    
    if (existingWorker) {
      updateWorker(existingWorker.id, formData);
      toast.success('پروفایل با موفقیت بروزرسانی شد.');
    } else {
      addWorker(formData);
      toast.success('نیروی جدید با موفقیت در سیستم ثبت شد.');
    }
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <GlassScrollStyles />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-3xl max-h-[95vh] flex flex-col bg-white/90 dark:bg-slate-800/95 backdrop-blur-3xl border border-white/50 dark:border-slate-700/50 rounded-[2.5rem] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 z-20 relative">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"><HardHat className="w-7 h-7" /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">{existingWorker ? 'ویرایش پروفایل نیروی کار' : 'ثبت نیروی کار جدید'}</h2>
              <p className="text-sm font-bold text-slate-500 mt-1">تکمیل اطلاعات پایه و مشخصات هویتی</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/50 dark:bg-slate-800/50 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:text-rose-600 rounded-xl transition-colors shadow-sm"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto glass-scroll p-8 bg-slate-50/30 dark:bg-slate-900/30 relative z-0">
          <div className="space-y-6">
            
            {/* عکس پرسنلی */}
            <div className="flex flex-col items-center justify-center gap-3 pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
               <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                 <div className="w-24 h-24 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 border-2 border-dashed border-indigo-200 dark:border-indigo-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-500 shadow-inner">
                    {formData.profilePhoto ? <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-indigo-300 dark:text-indigo-600 group-hover:text-indigo-500 transition-colors" />}
                 </div>
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"><UploadCloud className="w-6 h-6 text-white" /></div>
               </div>
               <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
               <span className="text-[10px] font-bold text-slate-500">آپلود عکس پرسنلی (اختیاری)</span>
            </div>

            {/* فیلدهای شخصی */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><User className="w-3.5 h-3.5"/> نام <span className="text-rose-500">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="مثلا: علی" className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 ring-indigo-500/20 shadow-sm transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><User className="w-3.5 h-3.5"/> نام خانوادگی</label>
                <input type="text" value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} placeholder="مثلا: محمدی" className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 ring-indigo-500/20 shadow-sm transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5"/> شماره موبایل (اصلی) <span className="text-rose-500">*</span></label>
                <input type="tel" dir="ltr" value={formData.phone1} onChange={(e) => handleChange('phone1', e.target.value)} placeholder="0912..." className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 ring-indigo-500/20 shadow-sm transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5"/> شماره اضطراری</label>
                <input type="tel" dir="ltr" value={formData.phone2} onChange={(e) => handleChange('phone2', e.target.value)} placeholder="09..." className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 ring-indigo-500/20 shadow-sm transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5"/> کد ملی / شناسه اتباع</label>
                <input type="text" dir="ltr" value={formData.nationalId} onChange={(e) => handleChange('nationalId', e.target.value)} placeholder="کد 10 رقمی..." className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 ring-indigo-500/20 shadow-sm transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5"/> کد بیمه تامین اجتماعی</label>
                <input type="text" dir="ltr" value={formData.insuranceCode} onChange={(e) => handleChange('insuranceCode', e.target.value)} placeholder="شماره بیمه..." className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 ring-indigo-500/20 shadow-sm transition-all" />
              </div>
              
              <div className="col-span-1 md:col-span-2 space-y-1.5 relative z-[80]">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">ملیت</label>
                {/* 💡 استفاده از PortalSelect یکپارچه */}
                <PortalSelect value={formData.nationality} onChange={(v:any) => handleChange('nationality', v)} options={nationalityOptions} placeholder="انتخاب ملیت" />
              </div>

              {/* 💡 بخش انتخاب تخصص‌ها */}
              <div className="col-span-1 md:col-span-2 space-y-4 bg-white/40 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-sm mt-2">
                <label className="text-sm font-black text-slate-700 dark:text-white flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-500"/> تخصص‌های نیرو <span className="text-rose-500 text-xs">*</span></span>
                </label>
                <div className="flex flex-wrap items-center gap-2 relative z-10">
                  {allSpecialties.map(spec => {
                    const isSelected = formData.specialtyIds.includes(spec.id);
                    return (
                      <button key={spec.id} type="button" onClick={() => toggleSpecialty(spec.id)} className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-300 border shadow-sm flex items-center gap-1.5 ${isSelected ? 'bg-indigo-500 border-indigo-600 text-white shadow-indigo-500/30' : 'bg-white/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'}`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />} {spec.name}
                      </button>
                    )
                  })}
                  
                  {isAddingSpecialty ? (
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-indigo-200 dark:border-indigo-700 shadow-sm">
                      <input type="text" autoFocus value={newSpecialtyName} onChange={(e) => setNewSpecialtyName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSpecialty()} placeholder="نام تخصص..." className="w-28 text-xs font-bold px-2 py-1 outline-none bg-transparent" />
                      <button type="button" onClick={handleAddCustomSpecialty} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"><Check className="w-3 h-3"/></button>
                      <button type="button" onClick={() => setIsAddingSpecialty(false)} className="p-1.5 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors"><X className="w-3 h-3"/></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setIsAddingSpecialty(true)} className="px-4 py-2.5 rounded-xl text-xs font-black text-indigo-600 border border-dashed border-indigo-300 hover:bg-indigo-50 transition-colors flex items-center gap-1"><Plus className="w-3.5 h-3.5"/> افزودن تخصص</button>
                  )}
                </div>
              </div>
            </div>

            {/* 💡 پیام راهنمای اضافه شدن تنظیمات در پروفایل */}
            <div className="bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-200/80 dark:border-indigo-800/80 rounded-2xl p-4 flex items-start gap-3 mt-8 shadow-sm">
              <Info className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[13px] font-black text-indigo-800 dark:text-indigo-300 mb-1.5">ساعات کاری، کسورات و تعرفه‌ها</h4>
                <p className="text-xs font-bold text-indigo-700/80 dark:text-indigo-400/80 leading-relaxed text-justify">
                  برای سادگی و سرعت در ثبت‌نام، در این مرحله فقط اطلاعات هویتی و تخصص دریافت می‌شود. پس از ثبت و ایجاد نیرو، می‌توانید از طریق <span className="font-black text-indigo-600 dark:text-indigo-300">«پروفایل کارگر»</span>، ساعات کاری اختصاصی، شرایط ایمنی (HSE) و دفترچه تعرفه‌های شخصی (روز‌مزد، متری و...) را با جزئیات کامل تنظیم کنید.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-end z-20 relative">
          <button onClick={handleSubmit} className="w-full sm:w-auto px-10 py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white shadow-[0_10px_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all">
            {existingWorker ? 'ذخیره تغییرات' : 'ثبت نهایی نیرو'}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}