import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, Camera,  
} from 'lucide-react';
import { toast } from 'sonner';

import { useLogisticsStore } from '../../../store/logisticsStore';
import { GlassInputWrapper } from '../../../components/ui/SharedLaborUI';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editVehicleId?: string;
}

export default function VehicleFormModal({ isOpen, onClose, editVehicleId }: VehicleFormModalProps) {
  const { vehicles, addVehicle, updateVehicle } = useLogisticsStore();
  const editData = editVehicleId ? vehicles.find(v => v.id === editVehicleId) : null;

  const [formData, setFormData] = useState({
    name: '',         // نام خودرو (مثلاً نیسان)
    modelYear: '',    // مدل / سال ساخت (مثلاً 81)
    color: '',        // رنگ ماشین
    platePart1: '',   // دو رقم اول
    plateLetter: '',  // حرف
    platePart2: '',   // سه رقم
    plateIran: '',    // ایران و کد شهر
    photo: ''
  });

  const part1Ref = useRef<HTMLInputElement>(null);
  const letterRef = useRef<HTMLInputElement>(null);
  const part2Ref = useRef<HTMLInputElement>(null);
  const iranRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editData) {
      const plateParts = (editData.plate || '').split(' ');
      setFormData({
        name: editData.name || '',
        modelYear: (editData as any).modelYear || '',
        color: (editData as any).color || '',
        platePart1: plateParts[0] || '',
        plateLetter: plateParts[1] || '',
        platePart2: plateParts[2] || '',
        plateIran: plateParts[4] || plateParts[3] || '',
        photo: editData.photo || ''
      });
    }
  }, [editData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
        toast.success('تصویر خودرو با موفقیت بارگذاری شد.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('نام خودرو الزامی است.');
    if (!formData.modelYear.trim()) return toast.error('مدل (سال ساخت) خودرو الزامی است.');
    
    const fullPlate = `${formData.platePart1} ${formData.plateLetter} ${formData.platePart2} ایران ${formData.plateIran}`.trim();
    if (!formData.platePart1 || !formData.platePart2 || !formData.plateIran) {
      return toast.error('لطفاً شماره پلاک را به طور کامل وارد کنید.');
    }

    const payload = {
      name: `${formData.name} - مدل ${formData.modelYear}`, // ترکیب نام و مدل برای نمایش در کارت
      modelYear: formData.modelYear,
      color: formData.color,
      plate: fullPlate,
      status: 'ACTIVE' as const, // حالت پیش‌فرض اولیه
      photo: formData.photo
    };

    if (editVehicleId) {
      updateVehicle(editVehicleId, payload);
      toast.success('اطلاعات خودرو با موفقیت بروزرسانی شد.');
    } else {
      addVehicle({ ...payload, isPinned: false });
      toast.success('خودروی جدید با موفقیت به ناوگان اضافه شد.');
    }
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6" dir="rtl">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
        
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center text-center">
            <button onClick={onClose} className="absolute left-6 top-6 p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-500 hover:text-rose-600 rounded-2xl transition-all shadow-sm cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">{editVehicleId ? 'ویرایش مشخصات خودرو' : 'ثبت خودروی جدید'}</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">مشخصات پایه، مدل، رنگ و پلاک ماشین‌آلات را وارد کنید.</p>

            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

            <div className="mt-5">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-500 transition-all shadow-inner group overflow-hidden cursor-pointer"
              >
                {formData.photo ? (
                  <img src={formData.photo} alt="Vehicle Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 group-hover:scale-110 transition-transform text-blue-500" />
                    <span className="text-[9px] font-black">آپلود عکس</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-8 overflow-y-auto modal-scrollbar flex-1">
            <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* نام خودرو */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 mr-1">نام خودرو یا ماشین‌آلات</label>
                  <GlassInputWrapper className="h-[46px]">
                    <input type="text" required placeholder="مثال: نیسان، بیل مکانیکی" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full h-full bg-transparent border-none outline-none px-4 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400" />
                  </GlassInputWrapper>
                </div>

                {/* مدل / سال ساخت */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 mr-1">مدل (سال ساخت)</label>
                  <GlassInputWrapper className="h-[46px]">
                    <input type="text" required placeholder="مثال: 1381 یا 2022" value={formData.modelYear} onChange={e => setFormData({...formData, modelYear: e.target.value})} className="w-full h-full bg-transparent border-none outline-none px-4 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400" />
                  </GlassInputWrapper>
                </div>

                {/* رنگ ماشین */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 mr-1">رنگ خودرو</label>
                  <GlassInputWrapper className="h-[46px]">
                    <input type="text" placeholder="مثال: آبی، زرد، سفید" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="w-full h-full bg-transparent border-none outline-none px-4 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400" />
                  </GlassInputWrapper>
                </div>

                {/* شماره پلاک ملی (چپ به راست) */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 mr-1">شماره پلاک ملی</label>
                  <div className="h-[46px] bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 flex items-center justify-start gap-2 shadow-sm" dir="ltr">
                    
                    <input 
                      ref={part1Ref}
                      type="text" maxLength={2} placeholder="۷۷"
                      value={formData.platePart1}
                      onChange={e => {
                        setFormData({...formData, platePart1: e.target.value});
                        if(e.target.value.length === 2) letterRef.current?.focus();
                      }}
                      className="w-9 bg-transparent text-center text-sm font-black outline-none text-slate-800 dark:text-white tracking-widest"
                    />
                    
                    <input 
                      ref={letterRef}
                      type="text" maxLength={1} placeholder="س"
                      value={formData.plateLetter}
                      onChange={e => {
                        setFormData({...formData, plateLetter: e.target.value});
                        if(e.target.value.length === 1) part2Ref.current?.focus();
                      }}
                      className="w-6 bg-transparent text-center text-sm font-black outline-none text-blue-600 dark:text-blue-400"
                    />
                    
                    <input 
                      ref={part2Ref}
                      type="text" maxLength={3} placeholder="۷۷۷"
                      value={formData.platePart2}
                      onChange={e => {
                        setFormData({...formData, platePart2: e.target.value});
                        if(e.target.value.length === 3) iranRef.current?.focus();
                      }}
                      className="w-12 bg-transparent text-center text-sm font-black outline-none text-slate-800 dark:text-white tracking-widest"
                    />
                    
                    <div className="flex items-center gap-1 border-l border-slate-300 dark:border-slate-700 pl-2 text-[10px] font-black text-slate-500">
                      <span className="text-[9px]">ایران</span>
                      <input 
                        ref={iranRef}
                        type="text" maxLength={2} placeholder="۶۸"
                        value={formData.plateIran}
                        onChange={e => setFormData({...formData, plateIran: e.target.value})}
                        className="w-7 bg-transparent text-center text-xs font-black outline-none text-slate-800 dark:text-white"
                      />
                    </div>

                  </div>
                </div>

              </div>

            </form>
          </div>

          <div className="p-6 border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 flex justify-center">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" form="vehicle-form" className="w-full max-w-sm py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black shadow-[0_10px_25px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer">
              <Save className="w-5 h-5" /> {editVehicleId ? 'ذخیره تغییرات خودرو' : 'ثبت اطلاعات خودرو'}
            </motion.button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}