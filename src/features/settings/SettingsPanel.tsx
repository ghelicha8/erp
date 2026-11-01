import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, Upload, Building2, Phone, Link2, Calculator, ShieldCheck, 
  Sparkles, Mail, Sun, Sliders, Coins, Info, Award, UserCheck, 
  Layers, HardHat, Truck, FileText, Database, CheckCircle2, Cpu
} from 'lucide-react';
import { toast } from 'sonner';
import { useSettingsStore } from '../../store/settingsStore';

export default function SettingsPanel() {
  const { settings, updateSettings, updatePhone } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'ANIMATIONS' | 'ABOUT'>('GENERAL');
  
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
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-indigo-500" />
            تنظیمات اصلی سیستم
          </h1>
          <p className="text-slate-500 font-bold mt-2">مدیریت اطلاعات پایه، قالب‌ها و جلوه‌های بصری نرم‌افزار پیمان ERP</p>
        </div>
        <button onClick={() => toast.success('تنظیمات با موفقیت ذخیره شد')} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-xl font-black shadow-lg hover:shadow-cyan-500/25 transition-all active:scale-95 self-start sm:self-auto cursor-pointer">
          <Save className="w-5 h-5" /> ذخیره تنظیمات
        </button>
      </div>

      {/* نوار تب‌های تنظیمات (iOS Glassmorphism) */}
      <div className="flex items-center gap-2 p-1.5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl w-fit shadow-sm overflow-x-auto glass-scroll">
        <button
          type="button"
          onClick={() => setActiveTab('GENERAL')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'GENERAL'
              ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          اطلاعات پایه و شرکت
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ANIMATIONS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'ANIMATIONS'
              ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          جلوه‌های بصری و انیمیشن‌ها
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ABOUT')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'ABOUT'
              ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Info className="w-4 h-4 text-cyan-400" />
          درباره سامانه
        </button>
      </div>

      {/* ================= تب اطلاعات پایه و شرکت ================= */}
      {activeTab === 'GENERAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* اطلاعات پایه، تماس و حقوقی */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xl space-y-6">
              <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                <Phone className="w-5 h-5 text-cyan-500" /> مشخصات رسمی، حقوقی و تماس
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500">نام شرکت / عنوان پیمانکاری</label>
                  <input value={settings.companyName} onChange={e => updateSettings({ companyName: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-slate-800 dark:text-white font-bold" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500">آدرس دقیق کارگاه / دفتر مرکزی (درج در سربرگ فاکتور)</label>
                  <input value={settings.address} onChange={e => updateSettings({ address: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-slate-800 dark:text-white" />
                </div>
                
                {/* ۴ شماره تلفن */}
                {settings.phones.map((phone, idx) => (
                  <div key={idx} className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">شماره تلفن {idx + 1}</label>
                    <input value={phone} onChange={e => updatePhone(idx, e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-slate-800 dark:text-white font-mono text-left" dir="ltr" placeholder="0912..." />
                  </div>
                ))}

                {/* سوئیچ واحد پول رسمی سیستم (تومان / ریال) */}
                <div className="space-y-4 md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/40">
                    <div>
                      <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-500" />
                        واحد پول رسمی نمایش سیستم
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                        در صورت انتخاب ریال، تمامی ارقام و مبالغ در سراسر فاکتورها، گزارش‌ها و ماژول‌ها در ۱۰ ضرب شده و با برچسب ریال نمایش می‌یابند.
                      </p>
                    </div>
                    
                    <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-white/50 dark:border-slate-700 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          updateSettings({ currency: 'toman' });
                          toast.success('واحد پول سامانه به «تومان» تنظیم شد.');
                        }}
                        className={`px-5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          (settings.currency || 'toman') === 'toman'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        تومان
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateSettings({ currency: 'rial' });
                          toast.success('واحد پول سامانه به «ریال» (ضربدر ۱۰) تنظیم شد.');
                        }}
                        className={`px-5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          settings.currency === 'rial'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        ریال
                      </button>
                    </div>
                  </div>

                  {/* اطلاعات حقوقی و بانکی شرکت */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">شناسه ملی شرکت / پیمانکار</label>
                      <input
                        value={settings.nationalId || ''}
                        onChange={e => updateSettings({ nationalId: e.target.value })}
                        placeholder="1400..."
                        className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none text-slate-800 dark:text-white font-mono text-left text-xs"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">شماره ثبت رسمی</label>
                      <input
                        value={settings.registrationNumber || ''}
                        onChange={e => updateSettings({ registrationNumber: e.target.value })}
                        placeholder="54321..."
                        className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none text-slate-800 dark:text-white font-mono text-left text-xs"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">شماره شبا بانکی (جهت تسویه)</label>
                      <input
                        value={settings.shebaNumber || ''}
                        onChange={e => updateSettings({ shebaNumber: e.target.value })}
                        placeholder="IR000000000000000000000000"
                        className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none text-slate-800 dark:text-white font-mono text-left text-xs"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

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
                  <button onClick={() => logoInputRef.current?.click()} className="text-xs font-bold bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1 z-10 cursor-pointer">
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
                  <button onClick={() => signatureInputRef.current?.click()} className="text-xs font-bold bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1 z-10 cursor-pointer">
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
      )}

      {/* ================= تب جلوه‌های بصری و انیمیشن‌ها ================= */}
      {activeTab === 'ANIMATIONS' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* کارت انیمیشن پاکت بایگانی */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white">انیمیشن پاکت بایگانی (Envelope Archive)</h3>
                      <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400">مرکز اعلان‌ها و هشدارها</span>
                    </div>
                  </div>

                  {/* سوئیچ iOS */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !settings.enableEnvelopeAnimation;
                      updateSettings({ enableEnvelopeAnimation: nextState });
                      toast.success(nextState ? 'انیمیشن پاکت بایگانی فعال شد.' : 'انیمیشن پاکت بایگانی غیرفعال شد.');
                    }}
                    className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center cursor-pointer ${
                      settings.enableEnvelopeAnimation ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="w-6 h-6 rounded-full bg-white shadow-md"
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-4">
                  هنگامی که روی دکمه «انتقال به بایگانی» در مرکز هشدارها کلیک می‌کنید، کارت اعلان با جلوه سه‌بعدی تا شده، داخل پاکت نامه گرافیکی لوکس قرار گرفته و همراه با انیمیشن کشویی کرکره‌ای وارد تب بایگانی می‌شود.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>وضعیت جلوه:</span>
                <span className={`px-3 py-1 rounded-full text-[11px] font-black ${
                  settings.enableEnvelopeAnimation
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {settings.enableEnvelopeAnimation ? 'فعال و پویا' : 'غیرفعال (آرشیو فوری)'}
                </span>
              </div>
            </div>

            {/* کارت انیمیشن طلوع و غروب تم */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-sm">
                      <Sun className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white">انیمیشن طلوع و غروب تم</h3>
                      <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400">سوئیچ حالت شب و روز</span>
                    </div>
                  </div>

                  {/* سوئیچ iOS */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !settings.enableThemeTransitions;
                      updateSettings({ enableThemeTransitions: nextState });
                      toast.success(nextState ? 'انیمیشن طلوع/غروب تم فعال شد.' : 'انیمیشن طلوع/غروب تم غیرفعال شد.');
                    }}
                    className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center cursor-pointer ${
                      settings.enableThemeTransitions ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="w-6 h-6 rounded-full bg-white shadow-md"
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-4">
                  در هنگام تغییر تم برنامه، دکمه سوئیچ با حرکت مداری روان خورشید درخشان و غروب هلال ماه نئونی همراه با ذرات نور انیمیت می‌شود. با غیرفعال کردن، تم به شکل آنی و ساده تغییر خواهد کرد.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>وضعیت جلوه:</span>
                <span className={`px-3 py-1 rounded-full text-[11px] font-black ${
                  settings.enableThemeTransitions
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {settings.enableThemeTransitions ? 'فعال و پویا' : 'غیرفعال (تغییر آنی)'}
                </span>
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* ================= تب درباره سامانه ================= */}
      {activeTab === 'ABOUT' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* کارت هدر معرفی رسمی سامانه */}
          <div className="bg-gradient-to-br from-indigo-900/90 via-slate-900/95 to-slate-950/95 text-white p-8 rounded-[2.5rem] border border-indigo-500/30 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 text-xs font-bold">
                  <Cpu className="w-3.5 h-3.5" /> سامانه جامع سازمانی و کارگاهی
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  سامانه یکپارچه مدیریت پروژه‌ها و منابع (Peyman ERP)
                </h2>
                <p className="text-slate-300 text-sm max-w-2xl leading-relaxed font-medium">
                  نرم‌افزار جامع مدیریت پروژه‌های عمرانی، پیمانکاری و ساختمانی، طراحی‌شده با رویکرد ۱۰۰٪ آفلاین (Zero Cloud Dependency)، رابط کاربری شیشه‌ای مدرن iOS و امنیت پایگاه‌داده محلی.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center shrink-0 min-w-[140px]">
                <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">نسخه سیستم</span>
                <span className="text-2xl font-black text-white font-mono mt-0.5">v2.5.0</span>
                <span className="text-[9px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> استیبل و آفلاین
                </span>
              </div>
            </div>
          </div>

          {/* کارت لوکس طراح و معمار ارشد سیستم */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-700/80 rounded-[2rem] p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 w-full sm:w-auto">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-500/25 border-2 border-white dark:border-slate-700 shrink-0">
                  <Award className="w-10 h-10 text-amber-300 drop-shadow" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1 rounded-full shadow border-2 border-white dark:border-slate-800">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                    معمار ارشد سیستم و طراح نرم‌افزار
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                  امیر محمد قلیچ
                </h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  طراح و توسعه‌دهنده معماری یکپارچه Peyman ERP بر بستر وب، دسکتاپ و موبایل
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto flex sm:flex-col justify-end items-end gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 border-t sm:border-t-0 sm:border-r border-slate-200 dark:border-slate-800 pt-3 sm:pt-0 sm:pr-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>طراحی اختصاصی موتور داده‌های آفلاین</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>رابط کاربری لوکس Glassmorphic iOS</span>
              </div>
            </div>
          </div>

          {/* تفکیک و معرفی زیرسیستم‌های فعال */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              زیرسیستم‌های فعال و ماژول‌های سامانه
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* ماژول ۱: مالی و چک‌ها */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-5 shadow-md flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Coins className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-slate-800 dark:text-white">۱. مدیریت مالی و چک‌ها</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    ثبت و ردیابی چک‌های صیادی دریافتی و پرداختی، هشدار هوشمند سررسید، راس‌گیری دقیق، مدیریت تنخواه‌گردان و اسناد مالی پروژه.
                  </p>
                </div>
                <div className="pt-3 mt-4 border-t border-slate-200/60 dark:border-slate-800 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> فعال و در گردش
                </div>
              </div>

              {/* ماژول ۲: کارکرد و دستمزد پرسنل */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-5 shadow-md flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <HardHat className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-slate-800 dark:text-white">۲. کارکرد و دستمزد پرسنل</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    ثبت هوشمند تردد با تایم‌پیکر لوکس، محاسبه خودکار دستمزد، اضافه‌کاری، کسر مساعده، کنترل بیومتریک و تسویه‌حساب نهایی استادکاران.
                  </p>
                </div>
                <div className="pt-3 mt-4 border-t border-slate-200/60 dark:border-slate-800 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> فعال و یکپارچه
                </div>
              </div>

              {/* ماژول ۳: لجستیک و انبارداری */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-5 shadow-md flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-slate-800 dark:text-white">۳. لجستیک و انبارداری کارگاه</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    پایش ناوگان خودرویی و ماشین‌آلات، حواله ورود و خروج مصالح، مدیریت ابزارآلات و کنترل استهلاک و مخارج تجهیزات سنگین.
                  </p>
                </div>
                <div className="pt-3 mt-4 border-t border-slate-200/60 dark:border-slate-800 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> فعال با مدیریت موجودی
                </div>
              </div>

              {/* ماژول ۴: پروژه‌ها و فاکتورها */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-5 shadow-md flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-slate-800 dark:text-white">۴. پروژه‌ها و صورت‌وضعیت A4</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    داشبورد جامع قراردادها، پیشرفت فیزیکی، صدور فاکتورهای رسمی و پیش‌فاکتور با قالب A4 استاندارد همراه با مهر و امضای دیجیتال.
                  </p>
                </div>
                <div className="pt-3 mt-4 border-t border-slate-200/60 dark:border-slate-800 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> آماده صدور و خروجی PDF
                </div>
              </div>

              {/* ماژول ۵: معماری ۱۰۰٪ آفلاین */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-5 shadow-md flex flex-col justify-between md:col-span-2 lg:col-span-2">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                    <Database className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-slate-800 dark:text-white">۵. هسته ۱۰۰٪ آفلاین (Offline-First Architecture)</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    ذخیره‌سازی کامل و ماندگار در پایگاه‌داده محلی و IndexedDB بدون کوچکترین نیاز به اینترنت یا سرور خارجی. قابلیت پشتیبان‌گیری کامل با یک کلیک (JSON Export/Import) و تضمین عدم مفقودی اطلاعات در شرایط سخت کارگاهی.
                  </p>
                </div>
                <div className="pt-3 mt-4 border-t border-slate-200/60 dark:border-slate-800 text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ایمن، ایزوله و بدون وابستگی
                </div>
              </div>

            </div>
          </div>

        </motion.div>
      )}

    </motion.div>
  );
}