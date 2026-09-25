import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
// تقویم شمسی (نیازمند نصب پکیج: npm i react-multi-date-picker)
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

// ایمپورت استور و استفاده از import type برای رفع خطای verbatimModuleSyntax
import { useProjectStore } from '../store/projectStore';
import type { ContractType } from '../types/project.types';

// ============================================================================
// Schema (Zod)
// ============================================================================

// استفاده از as const در enum و defualt([]) در آرایه برای رفع خطاهای TS و Strict Mode
const projectSchema = z.object({
  name: z.string().min(3, 'نام پروژه باید حداقل ۳ حرف باشد'),
  clientId: z.string().min(1, 'انتخاب یا ایجاد کارفرما الزامی است'),
  contractType: z.enum(['METRI', 'CONTRAT', 'PERCENTAGE', 'COST_ONLY', 'CUSTOM'] as const, {
    required_error: 'لطفا نوع قرارداد را مشخص کنید',
  }),
  startDate: z.string().min(1, 'تاریخ شروع الزامی است'),
  profilePhoto: z.string().optional(),
  photos: z.array(z.string()).max(10, 'حداکثر می‌توانید ۱۰ عکس آپلود کنید').default([]),
});

// استخراج مستقیم تایپ از Zod
type ProjectFormValues = z.infer<typeof projectSchema>;

// ============================================================================
// Helpers
// ============================================================================

/**
 * تابع فشرده‌سازی عکس با Canvas API
 * حجم عکس‌ها را پیش از آپلود کاهش داده و به Base64 تبدیل می‌کند
 */
const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          reject(new Error('خطا در فشرده‌سازی تصویر'));
        }
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

// ============================================================================
// Main Component
// ============================================================================

export default function NewProjectForm() {
  const addProject = useProjectStore((state) => state.addProject);
  
  // استیت‌های مربوط به Combobox کارفرمایان (دیتای Mock)
  const [mockClients, setMockClients] = useState([
    { id: 'c-1', name: 'شهرداری تهران' },
    { id: 'c-2', name: 'شرکت عمران آلفا' },
  ]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientsDropdown, setShowClientsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      photos: [],
      contractType: 'CONTRAT', // مقدار پیش‌فرض منطبق بر enum
    },
  });

  const profilePhotoValue = watch('profilePhoto');
  const photosValue = watch('photos') || []; // جلوگیری از undefined در رندرهای اولیه
  const selectedClientId = watch('clientId');

  // بستن دراپ‌داون در صورت کلیک بیرون از آن
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowClientsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // هندلر آپلود عکس پروفایل
  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setValue('profilePhoto', compressed, { shouldValidate: true });
    } catch (err) {
      console.error(err);
    }
  };

  // هندلر آپلود گالری عکس (حداکثر ۱۰)
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    if (photosValue.length + files.length > 10) {
      alert('حداکثر مجاز به آپلود ۱۰ عکس هستید.');
      return;
    }

    try {
      const compressedFiles = await Promise.all(files.map(f => compressImage(f)));
      setValue('photos', [...photosValue, ...compressedFiles], { shouldValidate: true });
    } catch (err) {
      console.error(err);
    }
  };

  // تابع ساخت کارفرمای جدید (Mock CRM)
  const createNewClientMock = (name: string) => {
    const newId = `c-new-${Date.now()}`;
    setMockClients([...mockClients, { id: newId, name }]);
    return newId;
  };

  const onSubmit = async (data: ProjectFormValues) => {
    let finalClientId = data.clientId;
    
    // اگر کاربری شناسه‌ای ندارد یعنی کارفرمای جدید تایپ شده است
    if (finalClientId === 'NEW_CLIENT') {
      finalClientId = createNewClientMock(clientSearch);
    }

    // استفاده از ContractType برای اطمینان از صحت نوع داده در Strict Mode
    const contractTypeValue: ContractType = data.contractType;

    // ثبت در Store
    addProject({
      name: data.name,
      clientId: finalClientId,
      startDate: data.startDate,
      status: 'IN_PROGRESS',
      photos: data.photos,
      profilePhoto: data.profilePhoto,
      phases: [
        {
          id: crypto.randomUUID(),
          name: 'فاز اول',
          description: 'فاز اولیه پروژه (ایجاد شده به صورت خودکار)',
          isCompleted: false,
          contractType: contractTypeValue,
          photos: [],
          financials: { expenditure: 0 },
        }
      ]
    });

    alert('پروژه با موفقیت ثبت شد!');
    // در یک اپلیکیشن واقعی اینجا کاربر را ریدایرکت می‌کنیم
  };

  // تنظیمات انیمیشن Stagger
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  // فیلتر کردن لیست کارفرمایان
  const filteredClients = mockClients.filter(c => c.name.includes(clientSearch));
  const exactMatchExists = mockClients.some(c => c.name === clientSearch);

  return (
    <div dir="rtl" className="min-h-screen p-4 md:p-8 flex items-center justify-center font-sans text-gray-800 dark:text-gray-100">
      
      {/* Container با افکت Glassmorphism */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl backdrop-blur-xl bg-white/40 dark:bg-gray-900/40 border border-white/40 dark:border-gray-700/50 shadow-2xl rounded-3xl p-6 md:p-10"
      >
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            ثبت پروژه جدید
          </h2>
          <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
            اطلاعات اولیه پروژه و کارفرما را وارد کنید.
          </p>
        </div>

        <motion.form 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          onSubmit={handleSubmit(onSubmit)} 
          className="space-y-6"
        >
          {/* ردیف اول: نام پروژه و نوع قرارداد */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="space-y-1">
              <label className="text-sm font-semibold">نام پروژه <span className="text-red-500">*</span></label>
              <input
                {...register('name')}
                className="w-full bg-white/50 dark:bg-black/20 border border-gray-300/50 dark:border-gray-600/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                placeholder="مثال: برج مسکونی آسمان"
              />
              {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-1">
              <label className="text-sm font-semibold">نوع کارکرد (قرارداد) <span className="text-red-500">*</span></label>
              <select
                {...register('contractType')}
                className="w-full bg-white/50 dark:bg-black/20 border border-gray-300/50 dark:border-gray-600/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
              >
                <option value="CONTRAT">کنترات (مقطوع)</option>
                <option value="METRI">متری</option>
                <option value="PERCENTAGE">درصدی (پیمان مدیریت)</option>
                <option value="COST_ONLY">فقط هزینه</option>
                <option value="CUSTOM">سفارشی</option>
              </select>
              {errors.contractType && <span className="text-xs text-red-500">{errors.contractType.message}</span>}
            </motion.div>
          </div>

          {/* ردیف دوم: کارفرما (Combobox) و تاریخ شروع */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Combobox هوشمند کارفرما */}
            <motion.div variants={itemVariants} className="space-y-1 relative" ref={dropdownRef}>
              <label className="text-sm font-semibold">کارفرما / مشتری <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientsDropdown(true);
                    // ریست کردن آیدی انتخاب شده وقتی کاربر تایپ می‌کند
                    if (selectedClientId) setValue('clientId', '');
                  }}
                  onFocus={() => setShowClientsDropdown(true)}
                  placeholder="جستجو یا ایجاد مشتری..."
                  className="w-full bg-white/50 dark:bg-black/20 border border-gray-300/50 dark:border-gray-600/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <AnimatePresence>
                  {showClientsDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto"
                    >
                      {filteredClients.map(client => (
                        <div 
                          key={client.id}
                          className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => {
                            setClientSearch(client.name);
                            setValue('clientId', client.id, { shouldValidate: true });
                            setShowClientsDropdown(false);
                          }}
                        >
                          {client.name}
                        </div>
                      ))}
                      
                      {/* دکمه ایجاد مشتری جدید در صورت عدم وجود */}
                      {clientSearch.length > 0 && !exactMatchExists && (
                        <div 
                          className="px-4 py-3 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer font-medium border-t border-gray-100 dark:border-gray-700 flex items-center gap-2"
                          onClick={() => {
                            setValue('clientId', 'NEW_CLIENT', { shouldValidate: true });
                            setShowClientsDropdown(false);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          افزودن "{clientSearch}" به عنوان مشتری جدید
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {errors.clientId && <span className="text-xs text-red-500">{errors.clientId.message}</span>}
            </motion.div>

            {/* DatePicker */}
            <motion.div variants={itemVariants} className="space-y-1">
              <label className="text-sm font-semibold">تاریخ شروع <span className="text-red-500">*</span></label>
              <Controller
                control={control}
                name="startDate"
                defaultValue={new Date().toLocaleDateString('fa-IR')} // مقدار پیش‌فرض شمسی
                render={({ field: { onChange, value } }) => (
                  <DatePicker
                    calendar={persian}
                    locale={persian_fa}
                    value={value}
                    onChange={(date) => {
                      // خروجی DatePicker را به فرمت YYYY/MM/DD تبدیل می‌کنیم
                      onChange(date?.format('YYYY/MM/DD') || '');
                    }}
                    inputClass="w-full bg-white/50 dark:bg-black/20 border border-gray-300/50 dark:border-gray-600/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                    containerClassName="w-full"
                  />
                )}
              />
              {errors.startDate && <span className="text-xs text-red-500">{errors.startDate.message}</span>}
            </motion.div>
          </div>

          {/* آپلود تصاویر */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-300/30 dark:border-gray-700/50">
            
            {/* پروفایل */}
            <motion.div variants={itemVariants} className="flex flex-col space-y-3 col-span-1">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">عکس پروفایل پروژه</label>
              <div className="relative h-40 w-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-white/30 dark:bg-black/20 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleProfilePhotoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                {profilePhotoValue ? (
                  <img src={profilePhotoValue} alt="پروفایل" className="object-cover w-full h-full" />
                ) : (
                  <div className="text-center p-4">
                    <span className="text-3xl">📷</span>
                    <p className="text-xs mt-2 text-gray-500">انتخاب تک عکس</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* گالری */}
            <motion.div variants={itemVariants} className="flex flex-col space-y-3 col-span-1 md:col-span-2">
              <label className="text-sm font-semibold flex justify-between items-center text-gray-700 dark:text-gray-300">
                <span>گالری تصاویر (تا ۱۰ عکس)</span>
                <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg">{photosValue.length} / 10</span>
              </label>
              
              <div className="flex gap-2 overflow-x-auto pb-2 min-h-[10rem]">
                {/* دکمه افزودن عکس */}
                {photosValue.length < 10 && (
                  <div className="relative shrink-0 h-40 w-32 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-white/30 dark:bg-black/20 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <input 
                      type="file" 
                      accept="image/*"
                      multiple
                      onChange={handleGalleryUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    />
                    <span className="text-3xl text-gray-400">+</span>
                  </div>
                )}
                
                {/* لیست عکس‌های آپلود شده */}
                <AnimatePresence>
                  {photosValue.map((photoBase64, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="relative shrink-0 h-40 w-32 rounded-2xl overflow-hidden shadow-md"
                    >
                      <img src={photoBase64} className="object-cover w-full h-full" alt={`گالری ${idx+1}`} />
                      <button
                        type="button"
                        onClick={() => {
                          const newPhotos = [...photosValue];
                          newPhotos.splice(idx, 1);
                          setValue('photos', newPhotos);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-red-600"
                      >
                        ×
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {errors.photos && <span className="text-xs text-red-500">{errors.photos.message}</span>}
            </motion.div>
          </div>

          {/* دکمه سابمیت */}
          <motion.div variants={itemVariants} className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transform transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'در حال ثبت...' : 'ثبت پروژه'}
            </button>
          </motion.div>

        </motion.form>
      </motion.div>
    </div>
  );
}