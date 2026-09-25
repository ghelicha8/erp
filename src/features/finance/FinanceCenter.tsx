import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, ArrowUpRight, ArrowDownRight, CreditCard, 
  Search, Plus, Receipt, Landmark, FileText, CheckCircle, 
  AlertTriangle, X, RefreshCw, Banknote, Clock // 💡 کلمه Clock به آخر این لیست اضافه شد
} from 'lucide-react';
import { toast } from 'sonner';

// ایمپورت استورها (مسیرها را بر اساس پوشه‌بندی خود تنظیم کنید)
import { useFinanceStore } from '../../store/financeStore';
import type { Transaction, ChequeStatus } from '../../store/financeStore';

import { useClientStore } from '../../store/clientStore';

// ============================================================================
// کامپوننت پایه جستجوی نئونی (یکپارچه با کل سیستم)
// ============================================================================
const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

// ============================================================================
// کامپوننت کارت چک صیادی (طراحی گرافیکی و سه‌بعدی)
// ============================================================================
const ChequeCard = ({ tx, onAction }: { tx: Transaction, onAction: (id: string, action: ChequeStatus) => void }) => {
  const details = tx.chequeDetails;
  if (!details) return null;

  const isIncoming = tx.direction === 'IN';
  
  const statusConfig = {
    PENDING: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'در انتظار وصول' },
    CASHED: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'پاس شده' },
    BOUNCED: { color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'برگشت خورده' },
    RETURNED: { color: 'text-slate-500', bg: 'bg-slate-500/10', label: 'عودت داده شده' },
    EXCHANGED: { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'تبدیل به نقد' },
  };

  const config = statusConfig[details.status];

  return (
    <motion.div 
      layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
      className="relative overflow-hidden rounded-[2rem] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-slate-800 dark:to-slate-900 border border-purple-200/50 dark:border-purple-500/20 group"
    >
      {/* پترن پس‌زمینه چک صیادی */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
      
      <div className="relative z-10 flex flex-col h-full justify-between gap-6">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black tracking-wider text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20 px-3 py-1.5 rounded-lg w-max flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" /> بانک {details.bank || 'نامشخص'}
            </span>
            <span className="text-2xl font-black text-slate-800 dark:text-white mt-2">
              {tx.amount.toLocaleString('fa-IR')} <span className="text-sm font-bold text-slate-500">تومان</span>
            </span>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-sm ${config.bg} ${config.color} border-current/20`}>
            {details.status === 'CASHED' ? <CheckCircle className="w-4 h-4" /> : details.status === 'BOUNCED' ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {config.label}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-white/40 dark:bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-white/50 dark:border-slate-700/50">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">شناسه صیادی</span>
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-widest dir-ltr text-right">{details.sayyadId || '---'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">تاریخ سررسید</span>
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{details.dueDate}</span>
          </div>
          <div className="flex flex-col gap-1 col-span-2">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{isIncoming ? 'صادرکننده (پرداخت‌کننده)' : 'در وجه (گیرنده)'}</span>
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{details.issuer || '---'}</span>
          </div>
        </div>

        {/* دکمه‌های اکشن (فقط برای چک‌های در انتظار) */}
        {details.status === 'PENDING' && (
          <div className="flex items-center gap-2 mt-2 pt-4 border-t border-purple-200/50 dark:border-purple-500/20">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onAction(tx.id, 'CASHED')} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-colors">
              اعلام وصول
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onAction(tx.id, 'BOUNCED')} className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-black shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-colors">
              برگشت زدن
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================================
// کامپوننت اصلی مرکز مالی
// ============================================================================
export default function FinanceCenter() {
  const { transactions, changeChequeStatus } = useFinanceStore();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CHEQUES'>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  
  // States for Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  // محاسبات آماری داشبورد
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let pendingChequesIn = 0;
    let pendingChequesOut = 0;

    transactions.forEach(tx => {
      if (tx.direction === 'IN') {
        if (tx.type === 'CASH') totalIn += tx.amount;
        if (tx.type === 'CHEQUE' && tx.chequeDetails?.status === 'CASHED') totalIn += tx.amount;
        if (tx.type === 'CHEQUE' && tx.chequeDetails?.status === 'PENDING') pendingChequesIn += tx.amount;
      } else {
        if (tx.type === 'CASH') totalOut += tx.amount;
        if (tx.type === 'CHEQUE' && tx.chequeDetails?.status === 'CASHED') totalOut += tx.amount;
        if (tx.type === 'CHEQUE' && tx.chequeDetails?.status === 'PENDING') pendingChequesOut += tx.amount;
      }
    });

    return { totalIn, totalOut, balance: totalIn - totalOut, pendingChequesIn, pendingChequesOut };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (activeTab === 'CHEQUES' && tx.type !== 'CHEQUE') return false;
      const matchSearch = tx.description?.includes(searchQuery) || tx.amount.toString().includes(searchQuery);
      return matchSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // سورت نزولی
  }, [transactions, activeTab, searchQuery]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6 pb-24 relative">
      
      {/* ================= HEADER & ACTION BAR ================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm rounded-[2rem] px-6 py-4 z-[90] relative">
        <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1.5 rounded-2xl w-full xl:w-auto shrink-0 shadow-inner border border-white/50 dark:border-slate-700/50">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('OVERVIEW')} className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-colors ${activeTab === 'OVERVIEW' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <Wallet className="w-4 h-4" /> داشبورد و تراکنش‌ها
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('CHEQUES')} className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-colors ${activeTab === 'CHEQUES' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <CreditCard className="w-4 h-4" /> مدیریت چک‌ها (صیادی)
          </motion.button>
        </div>

        <div className="flex-1 flex flex-col xl:flex-row items-center justify-end gap-4 w-full">
          <NeonSearchWrapper className="flex-1 w-full max-w-md h-[46px] sm:h-[48px]">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input placeholder="جستجو در مبالغ یا توضیحات..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 placeholder:text-slate-500 transition-colors" />
            <AnimatePresence>
              {searchQuery && (
                <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </motion.button>
              )}
            </AnimatePresence>
          </NeonSearchWrapper>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setIsTxModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl font-black shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all">
            <Plus className="w-5 h-5"/> ثبت تراکنش جدید
          </motion.button>
        </div>
      </div>

      {/* ================= OVERVIEW CARDS ================= */}
      <AnimatePresence mode="wait">
        {activeTab === 'OVERVIEW' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* کارت موجودی کل */}
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2rem] p-6 text-white shadow-[0_15px_40px_rgba(99,102,241,0.3)] relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center gap-2 opacity-80">
                  <Landmark className="w-5 h-5" /> <span className="font-bold text-sm">موجودی نقدی در گردش</span>
                </div>
                <div className="text-3xl font-black tracking-tight flex items-baseline gap-2">
                  {stats.balance.toLocaleString('fa-IR')} <span className="text-sm opacity-80 font-medium">تومان</span>
                </div>
              </div>
            </div>

            {/* کارت ورودی‌ها */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-[2rem] p-6 border border-emerald-500/20 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-xl"><ArrowDownRight className="w-5 h-5" /></div>
                <span className="font-bold text-sm">کل دریافتی‌های نقد/پاس شده</span>
              </div>
              <div className="text-2xl font-black text-slate-800 dark:text-white">
                {stats.totalIn.toLocaleString('fa-IR')} <span className="text-xs text-slate-500">تومان</span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-between items-center text-xs font-bold text-slate-500">
                <span>چک‌های در انتظار وصول:</span>
                <span className="text-amber-500">{stats.pendingChequesIn.toLocaleString('fa-IR')} تومان</span>
              </div>
            </div>

            {/* کارت خروجی‌ها */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-[2rem] p-6 border border-rose-500/20 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-4">
                <div className="p-2 bg-rose-500/10 rounded-xl"><ArrowUpRight className="w-5 h-5" /></div>
                <span className="font-bold text-sm">کل پرداختی‌های نقد/پاس شده</span>
              </div>
              <div className="text-2xl font-black text-slate-800 dark:text-white">
                {stats.totalOut.toLocaleString('fa-IR')} <span className="text-xs text-slate-500">تومان</span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-between items-center text-xs font-bold text-slate-500">
                <span>چک‌های پرداختی در انتظار:</span>
                <span className="text-amber-500">{stats.pendingChequesOut.toLocaleString('fa-IR')} تومان</span>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="mt-6">
        {activeTab === 'OVERVIEW' ? (
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-[2rem] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-500" /> ریز تراکنش‌های اخیر
            </h3>
            
            <div className="space-y-3">
              {filteredTransactions.length > 0 ? filteredTransactions.map((tx) => (
                <motion.div key={tx.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${tx.direction === 'IN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {tx.direction === 'IN' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-black text-slate-800 dark:text-white">{tx.description || 'تراکنش بدون شرح'}</span>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">{tx.type === 'CASH' ? 'نقدی / حواله' : 'چک صیادی'}</span>
                        <span>{tx.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-black tracking-tight ${tx.direction === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {tx.direction === 'IN' ? '+' : '-'} {tx.amount.toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تومان</span>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-10 text-sm font-bold text-slate-400">تراکنشی یافت نشد.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTransactions.map((tx) => (
              <ChequeCard 
                key={tx.id} 
                tx={tx} 
                onAction={(id, status) => {
                  changeChequeStatus(id, status, 'تغییر وضعیت دستی از داشبورد');
                  toast.success(`وضعیت چک با موفقیت به "${status}" تغییر کرد.`);
                }} 
              />
            ))}
            {filteredTransactions.length === 0 && (
               <div className="col-span-full text-center py-20 text-sm font-bold text-slate-400">هیچ چکی در سیستم ثبت نشده است.</div>
            )}
          </div>
        )}
      </div>

      {/* ================= MODALS ================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isTxModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTxModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg p-6 rounded-[2rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/50 dark:border-slate-700 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-lg font-black flex items-center gap-2 text-indigo-600 dark:text-indigo-400 drop-shadow-sm">
                    <Banknote className="w-6 h-6" /> ثبت تراکنش جدید در سیستم
                  </h3>
                  <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setIsTxModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"><X className="w-4 h-4" /></motion.button>
                </div>
                
                <div className="space-y-8 py-8 text-center">
                   <div className="w-20 h-20 mx-auto bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 mb-4">
                      <Plus className="w-10 h-10 text-indigo-500" />
                   </div>
                   <h4 className="text-xl font-black text-slate-800 dark:text-white">فرم ثبت در حال آماده‌سازی است...</h4>
                   <p className="text-sm font-medium text-slate-500">در مراحل بعدی، فرم پاپ‌آپ کامل با فیلدهای هوشمند برای ثبت نقدی و چک صیادی پیاده‌سازی خواهد شد.</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>, document.body
      )}

    </motion.div>
  );
}