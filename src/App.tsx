import { useEffect, useMemo, useState } from 'react';
import { Hammer, CheckCircle, AlertCircle } from 'lucide-react';
import { Toaster } from 'sonner';

// ایمپورت کامپوننت‌های اصلی و لی‌آوت
import MainLayout, { MENU_ITEMS } from './layouts/MainLayout';
import ProjectList from './features/projects/components/ProjectList';

// ایمپورت ماژول‌هایی که ساختیم
import SettingsPanel from './features/settings/SettingsPanel';
import InvoiceTab from './features/projects/components/tabs/InvoiceTab';
import AlertsCenter from './features/alerts/AlertsCenter'; 
import ClientCenter from './features/clients/ClientCenter';
import MainDashboard from './features/dashboard/MainDashboard'; 
import LaborDashboard from './features/labor/components/LaborDashboard'; 

// 💡 ایمپورت داشبورد لجستیک
import LogisticsCenter from './features/logistics/LogisticsCenter';

// ایمپورت استورها
import { useAlertStore } from './store/useAlertStore'; 

// ============================================================================
// کامپوننت Placeholder برای صفحاتی که در حال توسعه هستند
// ============================================================================
function UnderConstruction({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 md:py-32 px-4 text-center h-full w-full">
      <div className="w-28 h-28 mb-8 rounded-[2.5rem] bg-white/40 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 flex items-center justify-center shadow-xl">
        <Hammer className="w-14 h-14 text-emerald-500 animate-bounce" style={{ animationDuration: '2.5s' }} />
      </div>
      
      <h2 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400 mb-4 drop-shadow-sm">
        ماژول «{title}»
      </h2>
      
      <p className="text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed text-sm md:text-base font-medium">
        این بخش در حال توسعه است و در به‌روزرسانی‌های بعدی سیستم ERP با استانداردهای کامل و ظاهر یکپارچه اضافه خواهد شد.
      </p>
    </div>
  );
}

// ============================================================================
// Main App Component (یکپارچه شده)
// ============================================================================
export default function App() {
  // 💡 مدیریت هوشمند دارک‌مود با LocalStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('erp_theme') === 'DARK';
    }
    return false;
  });

  // 💡 حل مشکل رفرش: ذخیره آخرین منوی انتخاب شده تو حافظه مرورگر! (پیش‌فرض: dashboard انگلیسی)
  const [activeMenu, setActiveMenu] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('erp_active_menu') || 'dashboard';
    }
    return 'dashboard';
  });

  const { scanSystemAlerts } = useAlertStore();

  // اعمال تم
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('erp_theme', 'DARK');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('erp_theme', 'LIGHT');
    }
  }, [isDarkMode]);

  // 💡 ذخیره منوی فعال با هر بار تغییر
  useEffect(() => {
    localStorage.setItem('erp_active_menu', activeMenu);
  }, [activeMenu]);

  useEffect(() => {
    scanSystemAlerts();
    const interval = setInterval(scanSystemAlerts, 1000 * 60 * 60 * 3); 
    return () => clearInterval(interval);
  }, [scanSystemAlerts]);

  // 💡 اسکریپت سراسری برای تبدیل خودکار تمام تایتل‌های مرورگری (Tooltipها) به راهنمای شیشه‌ایِ انیمیشنی
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const titleText = target.getAttribute('title') || target.closest('[title]')?.getAttribute('title');
      
      if (titleText) {
        const element = (target.getAttribute('title') ? target : target.closest('[title]')) as HTMLElement;
        element.setAttribute('data-tooltip', titleText);
        element.removeAttribute('title'); // حذف تایتل پیش‌فرض مرورگر

        // ایجاد کادر شیشه‌ای و انیمیشن‌دارِ مدرن
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute z-[99999999] px-3.5 py-2 text-xs font-black text-slate-800 dark:text-white bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 rounded-xl shadow-2xl pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-200';
        tooltip.textContent = titleText;
        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        tooltip.style.top = `${rect.top - 40 + window.scrollY}px`;
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + window.scrollX}px`;

        const removeTooltip = () => {
          tooltip.remove();
          element.setAttribute('data-tooltip', titleText);
          element.removeEventListener('mouseleave', removeTooltip);
        };
        element.addEventListener('mouseleave', removeTooltip);
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, []);

  const currentMenuItem = useMemo(() => MENU_ITEMS?.find(m => m.id === activeMenu || m.label === activeMenu), [activeMenu]);
  const currentPageTitle = currentMenuItem ? currentMenuItem.label : 'داشبورد';

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // سیستم رندرینگ هوشمند محتوا (بدون هدر اضافه و مزاحم)
  const renderContent = () => {
    if (activeMenu === 'داشبورد' || activeMenu === 'dashboard') {
      return <div className="w-full flex flex-col h-full relative animate-in fade-in zoom-in-95 duration-300"><MainDashboard /></div>;
    }
    if (activeMenu === 'مدیریت پروژه ها' || activeMenu === 'projects') {
      return <div className="w-full flex flex-col h-full relative animate-in fade-in zoom-in-95 duration-300"><ProjectList /></div>;
    }
    if (activeMenu === 'تنظیمات سیستم' || activeMenu === 'settings') {
      return <div className="w-full flex flex-col h-full relative animate-in fade-in zoom-in-95 duration-300"><SettingsPanel /></div>;
    }
    if (activeMenu === 'صورت‌وضعیت‌ها' || activeMenu === 'invoices') {
      return <div className="w-full flex flex-col h-full relative animate-in fade-in zoom-in-95 duration-300"><InvoiceTab projectId="ALL" /></div>;
    }
    if (activeMenu === 'مرکز هشدار ها' || activeMenu === 'alerts') {
      return <div className="w-full flex flex-col h-full relative animate-in fade-in zoom-in-95 duration-300"><AlertsCenter /></div>;
    }
    if (activeMenu.includes('کارفرما') || activeMenu === 'customers' || currentPageTitle.includes('کارفرما')) {
      return <div className="w-full flex flex-col h-full relative animate-in fade-in zoom-in-95 duration-300"><ClientCenter /></div>;
    }
    if (activeMenu.includes('نیروی کار') || activeMenu === 'labor' || currentPageTitle.includes('نیروی کار')) {
      return <div className="w-full flex flex-col h-full relative animate-in fade-in zoom-in-95 duration-300"><LaborDashboard /></div>;
    }
    if (activeMenu.includes('خودرو') || activeMenu.includes('ابزار') || activeMenu.includes('لجستیک') || activeMenu === 'logistics' || currentPageTitle.includes('خودرو')) {
      return <div className="w-full flex flex-col h-full relative animate-in fade-in zoom-in-95 duration-300"><LogisticsCenter /></div>;
    }
    
    return <UnderConstruction title={currentPageTitle} />;
  };

  return (
    <>
      <Toaster 
        position="top-center" 
        theme={isDarkMode ? 'dark' : 'light'} 
        toastOptions={{
          unstyled: true,
          duration: 5000,
          classNames: {
            toast: "backdrop-blur-2xl bg-white/60 dark:bg-slate-900/70 border border-white/50 dark:border-slate-700/50 shadow-2xl rounded-2xl p-4 flex items-center gap-4 overflow-hidden relative w-full font-sans transform transition-all toast-timer-bar z-[110000]",
            title: "text-base font-bold",
            description: "text-sm mt-1 opacity-90",
            success: "text-emerald-700 dark:text-emerald-400 toast-success",
            error: "text-rose-700 dark:text-rose-400 toast-error",
          },
        }}
        icons={{
          success: <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />,
          error: <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />,
        }}
      />

      <MainLayout
        pageTitle={currentPageTitle}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      >
        {renderContent()}
      </MainLayout>
    </>
  );
}