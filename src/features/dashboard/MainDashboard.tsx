import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Wallet, BarChart3, Activity } from 'lucide-react';

// ایمپورت کامپوننت مالی که قبلاً ساختیم
import FinanceCenter from '../finance/FinanceCenter';

export default function MainDashboard() {
  // تب پیش‌فرض می‌تواند روی GENERAL (نمای کلی) یا FINANCE (مالی) باشد
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'FINANCE' | 'ANALYTICS'>('GENERAL');

  return (
    <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-300 relative">
      
      {/* ================= هدر و ساب‌منوی داشبورد ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-50">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2 drop-shadow-sm">
          <LayoutDashboard className="w-7 h-7 text-indigo-500" /> مرکز داده‌ها و داشبورد
        </h2>

        {/* ساب‌منوی شیشه‌ای برای جابه‌جایی بین بخش‌های داشبورد */}
        <div className="flex bg-white/40 dark:bg-slate-800/60 p-1.5 rounded-2xl shadow-sm border border-white/60 dark:border-slate-700/50 backdrop-blur-xl overflow-x-auto max-w-full">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('GENERAL')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${activeTab === 'GENERAL' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Activity className="w-4 h-4" /> نمای کلی
          </motion.button>
          
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('FINANCE')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${activeTab === 'FINANCE' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Wallet className="w-4 h-4" /> امور مالی و خزانه
          </motion.button>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('ANALYTICS')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${activeTab === 'ANALYTICS' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <BarChart3 className="w-4 h-4" /> نمودارها و آمار
          </motion.button>
        </div>
      </div>

      {/* ================= محتوای متغیر (بر اساس تب انتخابی) ================= */}
      <div className="flex-1 w-full relative z-10">
        <AnimatePresence mode="wait">
          
          {activeTab === 'GENERAL' && (
            <motion.div key="general" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col items-center justify-center p-10 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-[2rem]">
              <h3 className="text-xl font-black text-slate-700 dark:text-slate-300">بخش نمای کلی در حال ساخت است...</h3>
              <p className="text-sm font-bold text-slate-500 mt-2">اینجا می‌توانید خلاصه‌ای از پروژه‌ها و وضعیت کلی شرکت را قرار دهید.</p>
            </motion.div>
          )}

          {activeTab === 'FINANCE' && (
            <motion.div key="finance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* 💡 لود کردن کامپوننت مالی به عنوان یک بخش از داشبورد */}
              <FinanceCenter />
            </motion.div>
          )}

          {activeTab === 'ANALYTICS' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col items-center justify-center p-10 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-[2rem]">
              <h3 className="text-xl font-black text-slate-700 dark:text-slate-300">بخش نمودارها در حال ساخت است...</h3>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}