import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, Upload, Building2, Phone, Link2, Calculator, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useSettingsStore } from '../../store/settingsStore';

export default function SettingsPanel() {
  const { settings, updateSettings, updatePhone } = useSettingsStore();
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // تبدیل عکس به فرمت Base64 برای ذخیره آفلاین
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'signatureUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      updateSettings({ [field]: reader.result as string });
      toast.success('تصویر با موفقیت بارگذاری شد.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6" dir="rtl">
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-indigo-500" />
            تنظیمات اصلی سیستم
          </h1>
          <p className="text-slate-500 font-bold mt-2">این اطلاعات به صورت خودکار روی تمامی فاکتورها و خروجی‌های PDF اعمال می‌شوند.</p>
        </div>
        <button onClick={() => toast.success('تنظیمات با موفقیت ذخیره شد')} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-xl font-black shadow-lg hover:shadow-cyan-500/25 transition-all active:scale-95">
          <Save className="w-5 h-5" /> ذخیره تنظیمات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* اطلاعات پایه و تماس */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
              <Phone className="w-5 h-5 text-cyan-500" /> اطلاعات شرکت و تماس
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-500">نام شرکت / عنوان پیمانکاری</label>
                <input value={settings.companyName} onChange={e => updateSettings({ companyName: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-slate-800 dark:text-white font-bold" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-500">آدرس دقیق (برای درج در هدر فاکتور)</label>
                <input value={settings.address} onChange={e => updateSettings({ address: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-slate-800 dark:text-white" />
              </div>
              
              {/* ۴ شماره تلفن */}
              {settings.phones.map((phone, idx) => (
                <div key={idx} className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">شماره تلفن {idx + 1}</label>
                  <input value={phone} onChange={e => updatePhone(idx, e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-slate-800 dark:text-white font-mono text-left" dir="ltr" placeholder="0912..." />
                </div>
              ))}
            </div>
          </section>

          {/* شبکه‌های اجتماعی */}
          <section className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
              <Link2 className="w-5 h-5 text-indigo-500" /> شبکه‌های اجتماعی (فوتر فاکتور)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">آیدی اینستاگرام</label>
                <input value={settings.instagram} onChange={e => updateSettings({ instagram: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-slate-800 dark:text-white font-mono text-left" dir="ltr" placeholder="@username" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">آیدی تلگرام</label>
                <input value={settings.telegram} onChange={e => updateSettings({ telegram: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-slate-800 dark:text-white font-mono text-left" dir="ltr" placeholder="@channel" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">آدرس وب‌سایت</label>
                <input value={settings.website} onChange={e => updateSettings({ website: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-slate-800 dark:text-white font-mono text-left" dir="ltr" placeholder="www.example.com" />
              </div>
            </div>
          </section>
        </div>

        {/* سایدبار: تصاویر و مالیات */}
        <div className="space-y-6">
          <section className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xl flex flex-col gap-6">
            
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> لوگوی شرکت
              </h2>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-4 flex flex-col items-center justify-center relative bg-slate-50 dark:bg-slate-800/30 min-h-[120px]">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="max-h-20 object-contain mb-2" />
                ) : (
                  <Building2 className="w-10 h-10 text-slate-300 mb-2" />
                )}
                <button onClick={() => logoInputRef.current?.click()} className="text-xs font-bold bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1 z-10">
                  <Upload className="w-3 h-3" /> انتخاب تصویر
                </button>
                <input type="file" ref={logoInputRef} onChange={(e) => handleImageUpload(e, 'logoUrl')} className="hidden" accept="image/*" />
              </div>
            </div>

            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> مهر و امضای دیجیتال
              </h2>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-4 flex flex-col items-center justify-center relative bg-slate-50 dark:bg-slate-800/30 min-h-[120px]">
                {settings.signatureUrl ? (
                  <img src={settings.signatureUrl} alt="Signature" className="max-h-24 mix-blend-multiply mb-2" />
                ) : (
                  <div className="text-xs text-slate-400 font-bold mb-3 text-center">عکسی از مهر و امضای خود با پس‌زمینه سفید آپلود کنید</div>
                )}
                <button onClick={() => signatureInputRef.current?.click()} className="text-xs font-bold bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1 z-10">
                  <Upload className="w-3 h-3" /> انتخاب مهر و امضا
                </button>
                <input type="file" ref={signatureInputRef} onChange={(e) => handleImageUpload(e, 'signatureUrl')} className="hidden" accept="image/*" />
              </div>
            </div>

          </section>

          {/* درصدهای پیش‌فرض مالی */}
          <section className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xl">
            <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Calculator className="w-4 h-4 text-amber-500" /> درصدهای قانونی پیش‌فرض
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">مالیات ارزش افزوده</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={settings.defaultTaxRate} onChange={e => updateSettings({ defaultTaxRate: Number(e.target.value) })} className="w-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-sm font-bold py-1 outline-none" dir="ltr"/>
                  <span className="text-xs text-slate-500">٪</span>
                </div>
              </div>
              <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">سپرده حسن انجام کار</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={settings.defaultRetentionRate} onChange={e => updateSettings({ defaultRetentionRate: Number(e.target.value) })} className="w-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-sm font-bold py-1 outline-none" dir="ltr"/>
                  <span className="text-xs text-slate-500">٪</span>
                </div>
              </div>
              <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">کسورات بیمه</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={settings.defaultInsuranceRate} onChange={e => updateSettings({ defaultInsuranceRate: Number(e.target.value) })} className="w-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-sm font-bold py-1 outline-none" dir="ltr"/>
                  <span className="text-xs text-slate-500">٪</span>
                </div>
              </div>
            </div>
          </section>
        </div>

      </div>
    </motion.div>
  );
}