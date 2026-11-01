import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, Printer, FileDown, Calendar, Briefcase, 
  TrendingUp, TrendingDown, DollarSign, Wallet, Users, 
  HardHat, Truck, ShoppingBag, CheckCircle, Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

import { useProjectStore } from '../projects/store/projectStore';
import { useClientStore } from '../../store/clientStore';
import { useFinanceStore } from '../../store/financeStore';
import { useLaborStore } from '../../store/laborStore';
import { useLogisticsStore } from '../../store/logisticsStore';
import { usePurchaseStore } from '../../store/purchaseStore';
import { useInvoiceStore } from '../../store/invoiceStore';
import { useSettingsStore } from '../../store/settingsStore';
import { PortalSelect } from '../../components/ui/SharedLaborUI';

const safeNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/,/g, '').replace(/[^0-9.-]+/g, '');
  const parsed = Number(clean);
  return isNaN(parsed) ? 0 : parsed;
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

export default function ReportsCenter() {
  const projects = useProjectStore(state => state.projects) || [];
  const clients = useClientStore(state => state.clients) || [];
  const transactions = useFinanceStore(state => state.transactions) || [];
  const purchases = usePurchaseStore(state => state.purchases) || [];
  const laborLogs = useLaborStore(state => state.logs) || [];
  const logisticsLogs = useLogisticsStore(state => state.logs) || [];
  const invoices = useInvoiceStore(state => state.invoices) || [];
  const { currency } = useSettingsStore(state => state.settings);
  const isRial = currency === 'rial' || (currency as any) === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';
  const multiplier = isRial ? 10 : 1;

  const [selectedProjectId, setSelectedProjectId] = useState('ALL');

  const projectOptions = useMemo(() => [
    { value: 'ALL', label: 'گزارش کل پروژه‌های شرکت' },
    ...projects.map(p => ({ value: p.id, label: p.name }))
  ], [projects]);

  // محاسبات جامع گزارش
  const reportData = useMemo(() => {
    // فیلتر خریدها
    const pPurchases = purchases.filter(p => selectedProjectId === 'ALL' || p.projectId === selectedProjectId);
    const purchasesCost = pPurchases.reduce((sum, p) => sum + (safeNum(p.internalCost) || safeNum(p.billedCost)), 0);

    // فیلتر نیروی کار
    const pLabor = laborLogs.filter(l => selectedProjectId === 'ALL' || l.projectId === selectedProjectId);
    const laborCost = pLabor.reduce((sum, l) => sum + (safeNum(l.totalWage) || safeNum(l.billedCost) || safeNum(l.internalCost)), 0);

    // فیلتر لجستیک
    const pLogistics = logisticsLogs.filter(l => selectedProjectId === 'ALL' || l.projectId === selectedProjectId);
    const logisticsCost = pLogistics.reduce((sum, l) => sum + (safeNum(l.internalCost) || safeNum(l.billedCost) || safeNum(l.driverWage)), 0);

    // تراکنش‌های نقدی
    const pTxs = transactions.filter(t => {
      if (selectedProjectId === 'ALL') return true;
      return t.referenceId === selectedProjectId || t.allocations?.some(a => a.projectId === selectedProjectId);
    });

    const totalIncome = pTxs.filter(t => t.direction === 'IN').reduce((sum, t) => sum + safeNum(t.amount), 0);
    const totalExpense = purchasesCost + laborCost + logisticsCost;

    // فاکتورها
    const pInvoices = invoices.filter(inv => selectedProjectId === 'ALL' || inv.projectId === selectedProjectId);
    const totalInvoicesBilled = pInvoices.reduce((sum, inv) => sum + safeNum(inv.totalBilled), 0);
    const totalInvoicesPaid = pInvoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + safeNum(inv.totalBilled), 0);

    const estimatedProfit = (totalInvoicesBilled || totalIncome) - totalExpense;
    const profitMargin = (totalInvoicesBilled || totalIncome) > 0 
      ? Math.round((estimatedProfit / (totalInvoicesBilled || totalIncome)) * 100) 
      : 0;

    return {
      purchasesCost,
      laborCost,
      logisticsCost,
      totalIncome,
      totalExpense,
      totalInvoicesBilled,
      totalInvoicesPaid,
      estimatedProfit,
      profitMargin,
      projectsCount: selectedProjectId === 'ALL' ? projects.length : 1
    };
  }, [projects, purchases, laborLogs, logisticsLogs, transactions, invoices, selectedProjectId]);

  const costBreakdownData = useMemo(() => [
    { name: 'خرید مصالح', value: reportData.purchasesCost || 1 },
    { name: 'دستمزد نیروی کار', value: reportData.laborCost || 1 },
    { name: 'کرایه و لجستیک', value: reportData.logisticsCost || 1 },
  ].filter(i => i.value > 0), [reportData]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-300 relative pb-10 print:p-0 print:m-0">
      
      {/* هدر بخش گزارشات */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2 drop-shadow-sm">
            <BarChart3 className="w-7 h-7 text-fuchsia-500" /> گزارشات جامع و سود و زیان (P&L)
          </h2>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            تحلیل تراز مالی، مقایسه مخارج با صورت‌وضعیت‌ها و حاشیه سود تفکیکی پروژه‌ها
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-64 shrink-0">
            <PortalSelect
              options={projectOptions}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              placeholder="انتخاب پروژه..."
              className="!h-[46px]"
            />
          </div>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white font-black text-sm shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 transition-all shrink-0"
          >
            <Printer className="w-4 h-4" /> چاپ گزارش
          </button>
        </div>
      </div>

      {/* کارت‌های خلاصه شاخص‌های گزارش */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-3xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">کل صورت‌وضعیت اعلامی</span>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-2">
              {(reportData.totalInvoicesBilled * multiplier).toLocaleString('fa-IR')} <span className="text-xs font-bold">{currencyLabel}</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">مجموع کل هزینه‌ها و مخارج</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
              {(reportData.totalExpense * multiplier).toLocaleString('fa-IR')} <span className="text-xs font-bold">{currencyLabel}</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-500">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">سود ناخالص برآوردی</span>
            <div className={`text-2xl font-black mt-2 ${reportData.estimatedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              {(reportData.estimatedProfit * multiplier).toLocaleString('fa-IR')} <span className="text-xs font-bold">{currencyLabel}</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">حاشیه سود ناخالص</span>
            <div className="text-2xl font-black text-fuchsia-600 dark:text-fuchsia-400 mt-2">
              {reportData.profitMargin}٪
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-fuchsia-500/10 text-fuchsia-500">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* نمودارها و تفکیک هزینه‌ها */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* نمودار دایره‌ای تفکیک هزینه‌ها */}
        <div className="p-6 rounded-[2rem] bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="text-base font-black text-slate-800 dark:text-white mb-2">
            تفکیک سرفصل‌های هزینه
          </h3>
          <p className="text-xs text-slate-500 mb-6 font-bold">مقایسه سهم مصالح، دستمزد کارگران و ماشین‌آلات</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costBreakdownData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {costBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any) => [`${Number(val).toLocaleString('fa-IR')} تومان`, 'مبلغ']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid #334155', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {costBreakdownData.map((item, idx) => (
              <div key={item.name} className="p-3 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-slate-700/40">
                <span className="text-[10px] text-slate-400 block font-bold">{item.name}</span>
                <span className="text-xs font-black text-slate-800 dark:text-white mt-1 block">
                  {item.value.toLocaleString('fa-IR')} ت
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* مقایسه درآمد، هزینه و سود */}
        <div className="p-6 rounded-[2rem] bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="text-base font-black text-slate-800 dark:text-white mb-2">
            مقایسه صورت‌وضعیت در برابر هزینه‌ها
          </h3>
          <p className="text-xs text-slate-500 mb-6 font-bold">تراز عملیاتی و سود ناخالص</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'کل صورت‌وضعیت', amount: reportData.totalInvoicesBilled, fill: '#6366f1' },
                { name: 'کل هزینه‌ها', amount: reportData.totalExpense, fill: '#f43f5e' },
                { name: 'سود ناخالص', amount: Math.max(0, reportData.estimatedProfit), fill: '#10b981' }
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

    </div>
  );
}
