import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, BarChart3, Target, ShoppingBag, BellRing, 
  CalendarDays, FileSignature, Receipt, Briefcase, Users, 
  HardHat, Truck, Package, Factory, Settings,
  Menu, X, Sun, Moon, Calendar as CalendarIcon, UserCircle, Activity, ChevronLeft
} from 'lucide-react';

// ============================================================================
// Types & Interfaces
// ============================================================================
interface MainLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  activeMenu: string;
  setActiveMenu: (menuId: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

// 💡 ۱۵ رنگ کاملاً متمایز و اختصاصی برای ۱۴ منوی مختلف (بدون هیچ تکراری!)
type ThemeColor = 'indigo' | 'fuchsia' | 'rose' | 'teal' | 'orange' | 'sky' | 'amber' | 'emerald' | 'blue' | 'cyan' | 'violet' | 'yellow' | 'lime' | 'pink' | 'slate';

const colorThemes: Record<ThemeColor, { bg: string, shadow: string, hoverText: string, hoverBg: string }> = {
  indigo: { bg: 'from-indigo-400 to-indigo-600', shadow: 'shadow-indigo-500/40', hoverText: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400', hoverBg: 'hover:bg-indigo-500/10' },
  fuchsia: { bg: 'from-fuchsia-400 to-fuchsia-600', shadow: 'shadow-fuchsia-500/40', hoverText: 'group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400', hoverBg: 'hover:bg-fuchsia-500/10' },
  rose: { bg: 'from-rose-400 to-rose-600', shadow: 'shadow-rose-500/40', hoverText: 'group-hover:text-rose-600 dark:group-hover:text-rose-400', hoverBg: 'hover:bg-rose-500/10' },
  teal: { bg: 'from-teal-400 to-teal-600', shadow: 'shadow-teal-500/40', hoverText: 'group-hover:text-teal-600 dark:group-hover:text-teal-400', hoverBg: 'hover:bg-teal-500/10' },
  orange: { bg: 'from-orange-400 to-orange-600', shadow: 'shadow-orange-500/40', hoverText: 'group-hover:text-orange-600 dark:group-hover:text-orange-400', hoverBg: 'hover:bg-orange-500/10' },
  sky: { bg: 'from-sky-400 to-sky-600', shadow: 'shadow-sky-500/40', hoverText: 'group-hover:text-sky-600 dark:group-hover:text-sky-400', hoverBg: 'hover:bg-sky-500/10' },
  amber: { bg: 'from-amber-400 to-amber-600', shadow: 'shadow-amber-500/40', hoverText: 'group-hover:text-amber-600 dark:group-hover:text-amber-400', hoverBg: 'hover:bg-amber-500/10' },
  emerald: { bg: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/40', hoverText: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400', hoverBg: 'hover:bg-emerald-500/10' },
  blue: { bg: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-500/40', hoverText: 'group-hover:text-blue-600 dark:group-hover:text-blue-400', hoverBg: 'hover:bg-blue-500/10' },
  cyan: { bg: 'from-cyan-400 to-cyan-600', shadow: 'shadow-cyan-500/40', hoverText: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400', hoverBg: 'hover:bg-cyan-500/10' },
  violet: { bg: 'from-violet-400 to-violet-600', shadow: 'shadow-violet-500/40', hoverText: 'group-hover:text-violet-600 dark:group-hover:text-violet-400', hoverBg: 'hover:bg-violet-500/10' },
  yellow: { bg: 'from-yellow-400 to-yellow-600', shadow: 'shadow-yellow-500/40', hoverText: 'group-hover:text-yellow-600 dark:group-hover:text-yellow-400', hoverBg: 'hover:bg-yellow-500/10' },
  lime: { bg: 'from-lime-400 to-lime-600', shadow: 'shadow-lime-500/40', hoverText: 'group-hover:text-lime-600 dark:group-hover:text-lime-400', hoverBg: 'hover:bg-lime-500/10' },
  pink: { bg: 'from-pink-400 to-pink-600', shadow: 'shadow-pink-500/40', hoverText: 'group-hover:text-pink-600 dark:group-hover:text-pink-400', hoverBg: 'hover:bg-pink-500/10' },
  slate: { bg: 'from-slate-500 to-slate-700', shadow: 'shadow-slate-500/40', hoverText: 'group-hover:text-slate-700 dark:group-hover:text-slate-300', hoverBg: 'hover:bg-slate-500/10' },
};

export const MENU_ITEMS: { id: string, label: string, icon: any, theme: ThemeColor }[] = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard, theme: 'indigo' },
  { id: 'reports', label: 'گزارشات جامع', icon: BarChart3, theme: 'fuchsia' },
  { id: 'crm', label: 'crm مدیریت سر نخ ها', icon: Target, theme: 'rose' },
  { id: 'procurement', label: 'خرید و تداروکات', icon: ShoppingBag, theme: 'teal' },
  { id: 'alerts', label: 'مرکز هشدار ها', icon: BellRing, theme: 'orange' },
  { id: 'calendar', label: 'تقویم و یاد اور', icon: CalendarDays, theme: 'sky' },
  { id: 'contracts', label: 'قرارداد', icon: FileSignature, theme: 'amber' },
  { id: 'invoices', label: 'فاکتور', icon: Receipt, theme: 'emerald' },
  { id: 'projects', label: 'مدیریت پروژه ها', icon: Briefcase, theme: 'blue' },
  { id: 'customers', label: 'مشتری و کارفرما', icon: Users, theme: 'cyan' },
  { id: 'hr', label: 'نیروی کار', icon: HardHat, theme: 'violet' },
  { id: 'equipment', label: 'خودروها و ابزار الات', icon: Truck, theme: 'yellow' },
  { id: 'inventory', label: 'انبار مصالح', icon: Package, theme: 'lime' },
  { id: 'manufacturing', label: 'تولیدی', icon: Factory, theme: 'pink' },
  { id: 'settings', label: 'تنظیمات', icon: Settings, theme: 'slate' },
];

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'URGENT', title: 'سررسید چک پرداختی شرکت سیمان', time: '۱۰ دقیقه پیش', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { id: 2, type: 'WARNING', title: 'موجودی میلگرد ۱۴ رو به اتمام است', time: '۱ ساعت پیش', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 3, type: 'INFO', title: 'یادآور: جلسه با کارفرما فردا ساعت ۱۰', time: '۲ ساعت پیش', color: 'text-blue-500', bg: 'bg-blue-500/10' },
];

export default function MainLayout({ 
  children, 
  pageTitle, 
  activeMenu, 
  setActiveMenu,
  isDarkMode,
  toggleDarkMode
}: MainLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isBellHovered, setIsBellHovered] = useState(false);

  const todayShamsi = new Date().toLocaleDateString('fa-IR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div dir="rtl" className="h-screen bg-slate-100 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-hidden flex relative font-sans transition-colors duration-500">
      
      {/* پس‌زمینه تزئینی (Glow) */}
      <div className="absolute top-[-15%] right-[-10%] w-[800px] h-[800px] bg-blue-500/15 dark:bg-blue-500/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[800px] h-[800px] bg-purple-500/15 dark:bg-purple-500/20 rounded-full blur-[120px] pointer-events-none z-0" />

      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={`
          fixed lg:static inset-y-0 right-0 z-50 flex-shrink-0 flex flex-col 
          w-72 m-4 rounded-[2rem] shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)]
          backdrop-blur-3xl backdrop-saturate-150 bg-white/50 dark:bg-slate-900/40 
          border border-white/60 dark:border-white/10
          transform transition-transform duration-300 ease-in-out
          ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-[120%] lg:translate-x-0'}
        `}
      >
        {/* هدرِ سایدبار با استایل تکنولوژیک */}
        <div className="h-24 flex items-center gap-4 px-6 shrink-0 border-b border-white/40 dark:border-white/5">
          <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 drop-shadow-sm">
            Peyman ERP
          </span>
        </div>

        {/* لیست منوها */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1 custom-scrollbar">
          {MENU_ITEMS.map((item) => {
            const isActive = activeMenu === item.id;
            const Icon = item.icon;
            const theme = colorThemes[item.theme];
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveMenu(item.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden group
                  ${isActive 
                    ? `shadow-lg ${theme.shadow}` 
                    : `${theme.hoverBg}`}
                `}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-menu-bg"
                    className={`absolute inset-0 bg-gradient-to-r ${theme.bg}`}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                
                <div className="relative z-10 flex items-center gap-3 w-full">
                  <Icon className={`w-5 h-5 shrink-0 transition-transform duration-300 
                    ${isActive 
                      ? 'scale-110 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' 
                      : `text-slate-500 dark:text-slate-400 group-hover:scale-110 ${theme.hoverText}`
                    }`} 
                  />
                  {/* 💡 حل مشکل خوانایی: رنگ پایه ملایم، اما در حالت فعال، رنگ سفید با سایه‌ی مشکی غلیظ تا روی هر رنگی خوانا باشد */}
                  <span className={`truncate tracking-wide transition-all 
                    ${isActive 
                      ? 'text-[15px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' 
                      : `text-[14px] font-bold text-slate-600 dark:text-slate-400 ${theme.hoverText}`
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* فوتر سایدبار (پروفایل) */}
        <div className="p-4 shrink-0 border-t border-white/40 dark:border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-white/10 hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group shadow-sm">
            <UserCircle className="w-11 h-11 text-slate-400 dark:text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
            <div className="flex flex-col overflow-hidden">
              <span className="text-[15px] font-black truncate text-slate-800 dark:text-slate-100">مدیر سیستم</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate mt-0.5">admin@peyman.com</span>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* بخش سمت چپ (محتوای اصلی) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        <header className="mt-4 mx-4 md:mr-0 h-20 shrink-0 flex items-center justify-between px-6 lg:px-8 rounded-[2rem] backdrop-blur-3xl backdrop-saturate-150 bg-white/50 dark:bg-slate-900/40 border border-white/60 dark:border-white/10 shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] relative z-[100]">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/50 dark:border-white/10 text-slate-800 dark:text-slate-200 shadow-sm"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-black tracking-tight drop-shadow-sm text-slate-800 dark:text-white">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/60 dark:bg-slate-800/50 backdrop-blur-md border border-white/60 dark:border-white/10 text-sm font-bold shadow-sm text-slate-800 dark:text-slate-200">
              <CalendarIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span>{todayShamsi}</span>
            </div>

            <div 
              className="relative"
              onMouseEnter={() => setIsBellHovered(true)}
              onMouseLeave={() => setIsBellHovered(false)}
            >
              <button
                onClick={() => setActiveMenu('alerts')}
                className="relative p-3 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-md bg-white/60 dark:bg-slate-800/50 border border-white/60 dark:border-white/10 text-slate-800 dark:text-slate-200 shadow-sm overflow-hidden"
              >
                <motion.div
                  animate={{ rotate: MOCK_NOTIFICATIONS.length > 0 ? [0, -15, 15, -15, 15, 0] : 0 }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 5 }}
                >
                  <BellRing className="w-5 h-5" />
                </motion.div>
                
                {MOCK_NOTIFICATIONS.length > 0 && (
                  <span className="absolute top-2 right-2.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isBellHovered && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-3 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/60 dark:border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden z-[9999]"
                    dir="rtl"
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/50">
                      <span className="font-black text-slate-800 dark:text-white text-sm">هشدارهای اخیر</span>
                      <span className="bg-rose-500/10 text-rose-500 text-[10px] font-black px-2 py-1 rounded-md">{MOCK_NOTIFICATIONS.length} مورد جدید</span>
                    </div>
                    
                    <div className="flex flex-col max-h-[60vh] overflow-y-auto custom-scrollbar">
                      {MOCK_NOTIFICATIONS.length > 0 ? MOCK_NOTIFICATIONS.map((notif, index) => (
                        <div key={notif.id} className={`flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${index !== MOCK_NOTIFICATIONS.length - 1 ? 'border-b border-slate-50 dark:border-slate-800/50' : ''}`} onClick={() => setActiveMenu('alerts')}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.bg.split('/')[0].replace('bg-', 'bg-')}`} />
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{notif.title}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{notif.time}</span>
                          </div>
                        </div>
                      )) : (
                        <div className="p-8 text-center text-xs font-bold text-slate-500">پیام جدیدی ندارید!</div>
                      )}
                    </div>

                    <button 
                      onClick={() => setActiveMenu('alerts')} 
                      className="w-full py-3.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-indigo-600 dark:text-indigo-400 text-xs font-black transition-colors flex items-center justify-center gap-1 border-t border-slate-100 dark:border-slate-800/50"
                    >
                      ورود به مرکز هشدارها <ChevronLeft className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={toggleDarkMode}
              className="relative p-3 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95
                         backdrop-blur-xl bg-white/60 dark:bg-slate-800/50 
                         border border-white/60 dark:border-white/10 
                         text-slate-800 dark:text-yellow-400 shadow-sm overflow-hidden flex items-center justify-center w-[46px] h-[46px]"
              title="تغییر تم (تاریک/روشن)"
            >
              <AnimatePresence mode="wait">
                {isDarkMode ? (
                  <motion.div
                    key="moon"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute"
                  >
                    <Moon className="w-5 h-5 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute"
                  >
                    <Sun className="w-5 h-5 drop-shadow-sm" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </header>

        {/* ناحیه محتوای اصلی */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0, y: 15, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.99 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full h-full max-w-[1400px] mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

      {/* 💡 استایل‌های فوق مدرن و اختصاصی برای اسکرول‌بار (Tech/Neon Style) */}
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* اسکرول‌بار فوق باریک و معلق */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          /* استایل لایت‌مود: طوسی ملایم */
          background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
          border-radius: 10px;
        }
        
        /* 🌟 استایل دارک‌مود: گرادیانت سایبرپانک و نئونی (نیلی تا صورتی) */
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #6366f1, #a855f7, #ec4899);
        }
        .dark .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #818cf8, #c084fc, #f472b6);
        }
      `}} />
    </div>
  );
}