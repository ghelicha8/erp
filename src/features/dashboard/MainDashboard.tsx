import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Wallet, BarChart3, Activity, Briefcase, 
  Users, HardHat, Truck, TrendingUp, TrendingDown,
  Clock, CheckCircle2, AlertCircle, ShoppingBag, Receipt, ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

import FinanceCenter from '../finance/FinanceCenter';
import { useProjectStore } from '../projects/store/projectStore';
import { useClientStore } from '../../store/clientStore';
import { useFinanceStore } from '../../store/financeStore';
import { useLaborStore } from '../../store/laborStore';
import { useLogisticsStore } from '../../store/logisticsStore';
import { usePurchaseStore } from '../../store/purchaseStore';
import { useInvoiceStore } from '../../store/invoiceStore';

const safeNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/,/g, '').replace(/[^0-9.-]+/g, '');
  const parsed = Number(clean);
  return isNaN(parsed) ? 0 : parsed;
};

const CHART_COLORS = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'FINANCE' | 'ANALYTICS'>('GENERAL');

  // داده‌های استورها
  const projects = useProjectStore(state => state.projects) || [];
  const clients = useClientStore(state => state.clients) || [];
  const transactions = useFinanceStore(state => state.transactions) || [];
  const workers = useLaborStore(state => state.workers) || [];
  const vehicles = useLogisticsStore(state => state.vehicles) || [];
  const tools = useLogisticsStore(state => state.tools) || [];
  const purchases = usePurchaseStore(state => state.purchases) || [];
  const invoices = useInvoiceStore(state => state.invoices) || [];

  // محاسبات آمار کلان
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS').length;
    const finishedProjects = projects.filter(p => p.status === 'FINISHED').length;

    let totalIncome = 0;
    let totalExpense = 0;
    let pendingChequesCount = 0;
    let pendingChequesAmount = 0;

    transactions.forEach(t => {
      const amt = safeNum(t.amount);
      if (t.direction === 'IN') totalIncome += amt;
      else if (t.direction === 'OUT') totalExpense += amt;

      if (t.type === 'CHEQUE' && t.chequeDetails?.status === 'PENDING') {
        pendingChequesCount++;
        pendingChequesAmount += amt;
      }
    });

    const totalPurchasesCost = purchases.reduce((sum, p) => sum + (safeNum(p.internalCost) || safeNum(p.billedCost)), 0);
    const totalInvoicesValue = invoices.reduce((sum, inv) => sum + safeNum(inv.totalBilled), 0);

    return {
      activeProjects,
      finishedProjects,
      totalProjects: projects.length,
      totalClients: clients.length,
      totalWorkers: workers.length,
      totalEquipment: vehicles.length + tools.length,
      totalIncome,
      totalExpense,
      netCashFlow: totalIncome - totalExpense,
      pendingChequesCount,
      pendingChequesAmount,
      totalPurchasesCost,
      totalInvoicesValue
    };
  }, [projects, clients, transactions, workers, vehicles, tools, purchases, invoices]);

  // دسته‌بندی هزینه‌ها برای نمودار دونات
  const expenseBreakdown = useMemo(() => {
    const purchaseSum = purchases.reduce((sum, p) => sum + safeNum(p.internalCost), 0);
    const laborSum = transactions
      .filter(t => t.direction === 'OUT' && (t.description?.includes('حقوق') || t.description?.includes('مزد') || t.description?.includes('کارگر')))
      .reduce((sum, t) => sum + safeNum(t.amount), 0);
    const logisticsSum = transactions
      .filter(t => t.direction === 'OUT' && (t.description?.includes('کرایه') || t.description?.includes('تعمیر') || t.description?.includes('سوخت')))
      .reduce((sum, t) => sum + safeNum(t.amount), 0);
    const otherSum = Math.max(0, stats.totalExpense - (purchaseSum + laborSum + logisticsSum));

    return [
      { name: 'خرید مصالح', value: purchaseSum || 1 },
      { name: 'دستمزد نیروی کار', value: laborSum || 1 },
      { name: 'لجستیک و ماشین‌آلات', value: logisticsSum || 1 },
      { name: 'سایر هزینه‌های جاری', value: otherSum || 1 },
    ].filter(i => i.value > 0);
  }, [purchases, transactions, stats.totalExpense]);

  // آخرین پروژه‌ها
  const recentProjects = useMemo(() => {
    return [...projects].slice(0, 4);
  }, [projects]);

  // آخرین تراکنش‌ها
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [transactions]);

  return (
    <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-300 relative">
      
      {/* ================= هدر و ساب‌منوی داشبورد ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-50">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2 drop-shadow-sm">
            <LayoutDashboard className="w-7 h-7 text-indigo-500" /> مرکز فرماندهی و داشبورد
          </h2>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            خلاصه شاخص‌های کلیدی، وضعیت عملیات میدانی و تراز مالی کل مجموعه
          </p>
        </div>

        {/* ساب‌منوی شیشه‌ای */}
        <div className="flex bg-white/40 dark:bg-slate-800/60 p-1.5 rounded-2xl shadow-sm border border-white/60 dark:border-slate-700/50 backdrop-blur-xl overflow-x-auto max-w-full">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('GENERAL')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${activeTab === 'GENERAL' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Activity className="w-4 h-4" /> نمای کلی و عملیات
          </motion.button>
          
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('FINANCE')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${activeTab === 'FINANCE' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Wallet className="w-4 h-4" /> امور مالی و چک‌ها
          </motion.button>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('ANALYTICS')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${activeTab === 'ANALYTICS' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <BarChart3 className="w-4 h-4" /> نمودارهای تحلیلی
          </motion.button>
        </div>
      </div>

      {/* ================= محتوای متغیر ================= */}
      <div className="flex-1 w-full relative z-10">
        <AnimatePresence mode="wait">
          
          {/* تب نمای کلی و عملیات */}
          {activeTab === 'GENERAL' && (
            <motion.div 
              key="general" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="space-y-6 pb-8"
            >
              {/* کارت‌های شاخص‌های کلیدی (KPIs) */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                
                <div className="p-4 rounded-3xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">پروژه‌ها</span>
                    <Briefcase className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{stats.activeProjects}</span>
                    <span className="text-[10px] text-slate-400 mr-1.5 font-bold">از {stats.totalProjects} پروژه</span>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">کارفرمایان</span>
                    <Users className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{stats.totalClients}</span>
                    <span className="text-[10px] text-emerald-500 mr-1.5 font-bold">فعال</span>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">نیروی کار</span>
                    <HardHat className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{stats.totalWorkers}</span>
                    <span className="text-[10px] text-slate-400 mr-1.5 font-bold">استادکار و کارگر</span>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">ماشین و ابزار</span>
                    <Truck className="w-5 h-5 text-teal-500" />
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{stats.totalEquipment}</span>
                    <span className="text-[10px] text-slate-400 mr-1.5 font-bold">دستگاه ثبت‌شده</span>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">چک‌های معوق</span>
                    <Clock className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.pendingChequesCount}</span>
                    <span className="text-[10px] text-slate-400 mr-1.5 font-bold">فقره چک در جریان</span>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">صورت‌وضعیت‌ها</span>
                    <Receipt className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{invoices.length}</span>
                    <span className="text-[10px] text-slate-400 mr-1.5 font-bold">فاکتور ثبت‌شده</span>
                  </div>
                </div>

              </div>

              {/* خلاصه گردش مالی و تراز نقدی */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 backdrop-blur-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">کل دریافتی‌های نقدی (IN)</span>
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <ArrowDownRight className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {stats.totalIncome.toLocaleString('fa-IR')} <span className="text-xs font-bold">تومان</span>
                    </div>
                    <p className="text-xs text-slate-400 font-bold mt-1">واریزی‌های کارفرمایان و وصولی‌ها</p>
                  </div>
                </div>

                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/20 backdrop-blur-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">کل پرداختی‌ها و هزینه‌ها (OUT)</span>
                    <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      {stats.totalExpense.toLocaleString('fa-IR')} <span className="text-xs font-bold">تومان</span>
                    </div>
                    <p className="text-xs text-slate-400 font-bold mt-1">مصالح، دستمزدها، کرایه‌ها و تنخواه</p>
                  </div>
                </div>

                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 backdrop-blur-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">تراز نقدینگی صندوق</span>
                    <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                      <Wallet className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className={`text-2xl font-black ${stats.netCashFlow >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-500'}`}>
                      {stats.netCashFlow.toLocaleString('fa-IR')} <span className="text-xs font-bold">تومان</span>
                    </div>
                    <p className="text-xs text-slate-400 font-bold mt-1">مانده نقدی خالص شرکت</p>
                  </div>
                </div>

              </div>

              {/* ردیف دوتایی: پروژه‌های جاری + آخرین تراکنش‌ها */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* پروژه‌های فعال اخیر */}
                <div className="p-6 rounded-[2rem] bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-indigo-500" /> وضعیت پروژه‌های اخیر
                    </h3>
                    <span className="text-xs font-bold text-slate-400">{projects.length} کل</span>
                  </div>

                  {recentProjects.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm font-bold">
                      هنوز پروژه‌ای ثبت نشده است. از منوی «مدیریت پروژه‌ها» اولین پروژه را تعریف کنید.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentProjects.map(proj => (
                        <div key={proj.id} className="p-4 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-slate-700/50 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-black text-sm text-slate-800 dark:text-slate-100">{proj.name}</span>
                            <span className="text-xs text-slate-500 font-bold mt-0.5">{proj.location || 'محل نامشخص'}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-xl text-xs font-black ${
                            proj.status === 'IN_PROGRESS' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                              : proj.status === 'FINISHED' 
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                              : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {proj.status === 'IN_PROGRESS' ? 'در حال کار' : proj.status === 'FINISHED' ? 'تکمیل‌شده' : 'متوقف'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* آخرین تراکنش‌های مالی */}
                <div className="p-6 rounded-[2rem] bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-emerald-500" /> جریان مالی اخیر
                    </h3>
                    <span className="text-xs font-bold text-slate-400">{transactions.length} تراکنش</span>
                  </div>

                  {recentTransactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm font-bold">
                      هنوز تراکنش مالی ثبت نشده است.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentTransactions.map(tx => (
                        <div key={tx.id} className="p-3.5 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-slate-700/50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${tx.direction === 'IN' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                              {tx.direction === 'IN' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate max-w-[180px]">
                                {tx.description || (tx.direction === 'IN' ? 'دریافتی' : 'پرداختی')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold mt-0.5">{tx.date}</span>
                            </div>
                          </div>
                          <span className={`font-black text-xs ${tx.direction === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {safeNum(tx.amount).toLocaleString('fa-IR')} ت
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </motion.div>
          )}

          {/* تب امور مالی و خزانه */}
          {activeTab === 'FINANCE' && (
            <motion.div key="finance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <FinanceCenter />
            </motion.div>
          )}

          {/* تب نمودارها و آمار */}
          {activeTab === 'ANALYTICS' && (
            <motion.div 
              key="analytics" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="space-y-6 pb-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* نمودار ساختار هزینه‌های جاری */}
                <div className="p-6 rounded-[2rem] bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex flex-col">
                  <h3 className="text-base font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-indigo-500" /> ترکیب هزینه‌ها و مخارج
                  </h3>
                  <p className="text-xs text-slate-500 mb-6 font-bold">سهم مصالح، حقوق نیروی کار و لجستیک در کل مخارج</p>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                        >
                          {expenseBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(val: any) => [`${Number(val).toLocaleString('fa-IR')} تومان`, 'مبلغ']}
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid #334155', color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {expenseBreakdown.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                        <span className="truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* مقایسه دریافتی و پرداختی */}
                <div className="p-6 rounded-[2rem] bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex flex-col">
                  <h3 className="text-base font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-500" /> تراز کل ورودی و خروجی صندوق
                  </h3>
                  <p className="text-xs text-slate-500 mb-6 font-bold">مقایسه تجمعی کل واریزی‌ها در برابر مخارج جاری</p>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'دریافتی (IN)', amount: stats.totalIncome, fill: '#10b981' },
                        { name: 'هزینه‌ها (OUT)', amount: stats.totalExpense, fill: '#f43f5e' },
                        { name: 'مانده نقدی', amount: Math.max(0, stats.netCashFlow), fill: '#6366f1' }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip 
                          formatter={(val: any) => [`${Number(val).toLocaleString('fa-IR')} تومان`, 'مبلغ']}
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid #334155', color: '#fff' }}
                        />
                        <Bar dataKey="amount" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}