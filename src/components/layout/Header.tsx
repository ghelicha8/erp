import { useState, useEffect } from 'react';
import { Settings, Bell } from 'lucide-react';
import { useFinanceStore } from '../../store/financeStore';

export default function Header() {
  const transactions = useFinanceStore((state) => state.transactions);
  
  // بررسی هوشمند برای پیدا کردن چک‌های در انتظار پاس شدن (به عنوان هشدار)
  const [hasNotifications, setHasNotifications] = useState(false);

  useEffect(() => {
    // در یک سیستم واقعی می‌توان چک‌های نزدیک به سررسید (مثلاً تا 3 روز آینده) را بررسی کرد
    // در اینجا برای نمونه صرفاً وجود داشتن حداقل یک چک PENDING را به عنوان Notification در نظر می‌گیریم
    const hasPending = transactions.some(t => t.type === 'CHEQUE' && t.chequeDetails?.status === 'PENDING');
    setHasNotifications(hasPending);
  }, [transactions]);

  const today = new Date().toLocaleDateString('fa-IR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="sticky top-0 z-50 w-full mb-6" dir="rtl">
      <div className="mx-auto w-full px-4 sm:px-6">
        <div className="h-20 flex items-center justify-between rounded-b-[2rem] sm:rounded-[2rem] sm:mt-4 backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border-b sm:border border-white/40 dark:border-slate-700/50 shadow-sm transition-colors">
          
          {/* بخش راست: تاریخ */}
          <div className="flex items-center gap-3 px-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">امروز</span>
              <span className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-200 drop-shadow-sm">
                {today}
              </span>
            </div>
          </div>

          {/* بخش چپ: آیکون‌ها و ابزارها */}
          <div className="flex items-center gap-2 sm:gap-4 px-4">
            
            {/* زنگوله هشدارها */}
            <button className="relative p-2.5 rounded-2xl bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 border border-white/50 dark:border-slate-700/50 shadow-sm transition-all active:scale-95 group">
              <Bell className={`w-5 h-5 text-slate-600 dark:text-slate-300 ${hasNotifications ? 'group-hover:animate-none' : ''}`} />
              
              {/* نشانگر انیمیشنی نئونی در صورت وجود هشدار */}
              {hasNotifications && (
                <>
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.8)] z-10"></span>
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full animate-ping z-0 opacity-75"></span>
                </>
              )}
            </button>

            {/* دکمه تنظیمات */}
            <button className="p-2.5 rounded-2xl bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 border border-white/50 dark:border-slate-700/50 shadow-sm transition-all active:scale-95 group">
              <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:rotate-90 transition-transform duration-500" />
            </button>
            
          </div>
        </div>
      </div>
    </header>
  );
}