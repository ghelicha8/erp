import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, Save, Activity, Ban, Handshake, Wrench, PenTool, Hash, Calendar, Barcode, ShieldAlert, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

import { useLogisticsStore } from '../../../store/logisticsStore';
import type { ToolStatus } from '../../../store/logisticsStore';

// ایمپورت مستقیم از SharedLaborUI
import { GlassInputWrapper, PortalSelect, GlassDatePicker } from '../../../components/ui/SharedLaborUI';

interface ToolFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editToolId?: string;
}

const TOOL_STATUS_OPTIONS = [
  { id: 'ACTIVE', label: 'آماده کار / فعال', icon: Activity },
  { id: 'REPAIR', label: 'در تعمیرگاه', icon: Wrench },
  { id: 'RENTED', label: 'اجاره داده شده', icon: Handshake },
  { id: 'UNAVAILABLE', label: 'مفقود / خارج از دسترس', icon: Ban },
];

export default function ToolFormModal({ isOpen, onClose, editToolId }: ToolFormModalProps) {
  const { tools, addTool, updateTool } = useLogisticsStore();
  const editData = editToolId ? tools.find(t => t.id === editToolId) : null;

  const photoInputRef = useRef<HTMLInputElement>(null);
  const serialPhotoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    serialNumber: '',
    status: 'ACTIVE' as ToolStatus,
    photo: '',
    serialPhoto: '',
    purchaseDate: '',
    warrantyStart: '',
    warrantyEnd: ''
  });

  // قفل کردن اسکرولِ بادی تا فقط لایه مودال اسکرول بخوره
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || '',
        serialNumber: editData.serialNumber || '',
        status: editData.status || 'ACTIVE',
        photo: editData.photo || '',
        serialPhoto: editData.serialPhoto || '',
        purchaseDate: editData.purchaseDate || '',
        warrantyStart: editData.warrantyStart || '',
        warrantyEnd: editData.warrantyEnd || ''
      });
    } else if (isOpen) {
      setFormData({
        name: '',
        serialNumber: '',
        status: 'ACTIVE',
        photo: '',
        serialPhoto: '',
        purchaseDate: '',
        warrantyStart: '',
        warrantyEnd: ''
      });
    }
  }, [editData, isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'serialPhoto') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('لطفاً یک فایل تصویری معتبر انتخاب کنید.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData(prev => ({ ...prev, [field]: base64String }));
      toast.success(field === 'photo' ? 'تصویر دستگاه بارگذاری شد.' : 'تصویر سریال / پلاک بارگذاری شد.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('نام ابزار الزامی است.');
    if (!formData.serialNumber.trim()) return toast.error('شماره سریال الزامی است.');
    if (formData.warrantyStart && formData.warrantyEnd && formData.warrantyStart > formData.warrantyEnd) {
      return toast.error('تاریخ پایان گارانتی نمی‌تواند قبل از شروع آن باشد.');
    }

    const submitData = {
      name: formData.name,
      serialNumber: formData.serialNumber,
      status: formData.status,
      photo: formData.photo,
      serialPhoto: formData.serialPhoto,
      purchaseDate: formData.purchaseDate,
      warrantyStart: formData.warrantyStart,
      warrantyEnd: formData.warrantyEnd
    };

    if (editToolId) {
      updateTool(editToolId, submitData);
      toast.success('اطلاعات ابزار با موفقیت بروزرسانی شد.');
    } else {
      addTool({ ...submitData, isPinned: false });
      toast.success('ابزار جدید با موفقیت ثبت شد.');
    }
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {/* 💡 لایه اسکرول‌دارِ اصلی: مودال در این لایه اسکرول می‌خورد */}
      <div className="fixed inset-0 z-[99999] overflow-y-auto" dir="rtl">
        
        {/* پس‌زمینه تاریک (فیکس شده تا اسکرول نشود) */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-0" 
        />
        
        <div className="relative min-h-[120vh] flex flex-col items-center justify-start pt-[8vh] pb-[50vh] px-4 sm:px-6 z-10 pointer-events-none">
          
          {/* کادر اصلی مودال (بازگشت به سایز بزرگ max-w-2xl) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl p-6 sm:p-10 flex flex-col gap-8 pointer-events-auto !overflow-visible"
          >
            {/* دکمه بستن */}
            <button 
              type="button"
              onClick={onClose} 
              className="absolute top-6 left-6 p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all z-10 shadow-sm"
            >
              <X className="w-6 h-6" />
            </button>

            {/* تایتل */}
            <div className="text-center w-full mt-2 mb-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] mx-auto mb-4">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                {editToolId ? 'ویرایش ابزار و گارانتی' : 'ثبت ابزار و گارانتی جدید'}
              </h2>
              <p className="text-sm font-bold text-slate-500 mt-2">
                اطلاعات دستگاه، سریال و مستندات گارانتی را وارد کنید
              </p>
            </div>

            <form id="tool-form" onSubmit={handleSubmit} className="flex flex-col gap-6 w-full !overflow-visible">
              
              {/* اینپوت‌های مخفی آپلود فایل */}
              <input
                type="file"
                ref={photoInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'photo')}
              />
              <input
                type="file"
                ref={serialPhotoInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'serialPhoto')}
              />

              {/* بخش آپلود تصاویر - سایز استاندارد با پیش‌نمایش زنده */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative group h-32">
                  <button 
                    type="button" 
                    onClick={() => photoInputRef.current?.click()} 
                    className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-blue-300 dark:border-blue-700/50 bg-blue-50/50 dark:bg-blue-900/20 text-blue-500 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors gap-3 overflow-hidden cursor-pointer"
                  >
                    {formData.photo ? (
                      <img src={formData.photo} alt="تصویر دستگاه" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 opacity-80" />
                        <span className="text-xs font-black">تصویر دستگاه</span>
                      </>
                    )}
                  </button>
                  {formData.photo && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, photo: '' })); }}
                      className="absolute top-2 left-2 p-1.5 bg-rose-500 text-white rounded-xl shadow-lg hover:bg-rose-600 transition-colors cursor-pointer"
                      title="حذف تصویر دستگاه"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="relative group h-32">
                  <button 
                    type="button" 
                    onClick={() => serialPhotoInputRef.current?.click()} 
                    className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-purple-300 dark:border-purple-700/50 bg-purple-50/50 dark:bg-purple-900/20 text-purple-500 rounded-2xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors gap-3 overflow-hidden cursor-pointer"
                  >
                    {formData.serialPhoto ? (
                      <img src={formData.serialPhoto} alt="تصویر سریال" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Barcode className="w-8 h-8 opacity-80" />
                        <span className="text-xs font-black">تصویر سریال / پلاک</span>
                      </>
                    )}
                  </button>
                  {formData.serialPhoto && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, serialPhoto: '' })); }}
                      className="absolute top-2 left-2 p-1.5 bg-rose-500 text-white rounded-xl shadow-lg hover:bg-rose-600 transition-colors cursor-pointer"
                      title="حذف تصویر سریال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* گرید فیلدها - بازگشت به ساختار اصلی */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 !overflow-visible">
                
                {/* نام ابزار */}
                <div className="space-y-2 flex flex-col">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5 ml-1">
                    <PenTool className="w-4 h-4" /> نام ابزار / ماشین‌آلات
                  </label>
                  <GlassInputWrapper className="h-[50px] w-full">
                    <input 
                      type="text" required placeholder="مثال: دریل هیلتی"
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full h-full bg-transparent border-none outline-none px-4 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400"
                    />
                  </GlassInputWrapper>
                </div>

                {/* شماره سریال (Ltr) */}
                <div className="space-y-2 flex flex-col">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5 ml-1">
                    <Hash className="w-4 h-4" /> شماره سریال / کد اموال
                  </label>
                  <GlassInputWrapper className="h-[50px] w-full">
                    <input 
                      type="text" required dir="ltr" placeholder="مثال: SN-4589021"
                      value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})}
                      className="w-full h-full bg-transparent border-none outline-none px-4 text-sm font-black tracking-widest text-left text-slate-800 dark:text-white placeholder:text-slate-400"
                    />
                  </GlassInputWrapper>
                </div>

                {/* وضعیت ابزار */}
                <div className="space-y-2 flex flex-col">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5 ml-1">
                    <Activity className="w-4 h-4" /> وضعیت فعلی
                  </label>
                  <PortalSelect 
                    options={TOOL_STATUS_OPTIONS}
                    value={formData.status}
                    onChange={(val: ToolStatus) => setFormData({...formData, status: val})}
                    placeholder="انتخاب وضعیت"
                    className="!h-[50px] !min-h-[50px]"
                  />
                </div>

                {/* تاریخ خرید */}
                <div className="space-y-2 flex flex-col !overflow-visible">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5 ml-1">
                    <Calendar className="w-4 h-4" /> تاریخ خرید
                  </label>
                  <GlassInputWrapper className="h-[50px] w-full !p-0 !overflow-visible">
                     <GlassDatePicker 
                       value={formData.purchaseDate} 
                       onChange={(val: string) => setFormData({...formData, purchaseDate: val})} 
                       placeholder="140X/XX/XX" 
                     />
                  </GlassInputWrapper>
                </div>

                {/* تاریخ شروع گارانتی */}
                <div className="space-y-2 flex flex-col !overflow-visible">
                  <label className="text-xs font-black text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5 ml-1">
                    <ShieldAlert className="w-4 h-4" /> شروع گارانتی
                  </label>
                  <GlassInputWrapper className="h-[50px] w-full !p-0 !overflow-visible !border-emerald-200 dark:!border-emerald-800/50 focus-within:!border-emerald-500/50">
                     <GlassDatePicker 
                       value={formData.warrantyStart} 
                       onChange={(val: string) => setFormData({...formData, warrantyStart: val})} 
                       placeholder="تاریخ شروع" 
                     />
                  </GlassInputWrapper>
                </div>

                {/* تاریخ پایان گارانتی */}
                <div className="space-y-2 flex flex-col !overflow-visible">
                  <label className="text-xs font-black text-rose-600 dark:text-rose-500 flex items-center gap-1.5 ml-1">
                    <ShieldAlert className="w-4 h-4" /> پایان گارانتی
                  </label>
                  <GlassInputWrapper className="h-[50px] w-full !p-0 !overflow-visible !border-rose-200 dark:!border-rose-800/50 focus-within:!border-rose-500/50">
                     <GlassDatePicker 
                       value={formData.warrantyEnd} 
                       onChange={(val: string) => setFormData({...formData, warrantyEnd: val})} 
                       placeholder="تاریخ پایان" 
                     />
                  </GlassInputWrapper>
                </div>

              </div>

              {/* دکمه ذخیره - بزرگ و تمام‌عرض */}
              <button 
                type="submit" 
                className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-base font-black shadow-[0_10px_25px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Save className="w-6 h-6" />
                {editToolId ? 'ذخیره تغییرات ابزار' : 'ذخیره اطلاعات ابزار'}
              </button>
              
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>,
    document.body
  );
}