import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { 
  Filter, AlertTriangle, TrendingUp, Gem, PieChart as PieChartIcon, Briefcase, Percent
} from 'lucide-react';
import moment from 'moment-jalaali';

import { useFinanceStore } from '../../../../store/financeStore';
import { useProjectStore } from '../../../projects/store/projectStore';
import { usePurchaseStore } from '../../../../store/purchaseStore';
import { useLogisticsStore } from '../../../../store/logisticsStore';
import { useLaborStore } from '../../../../store/laborStore';

import GlassDatePicker from '../../../../components/ui/GlassDatePicker';
import GlassSelect from '../../../../components/ui/GlassSelect';

const colorMap: Record<string, string> = {
  'دریافتی قطعی': '#10b981',
  'چک در راه': '#f59e0b',
  'بدهی باز کارفرما': '#f43f5e',
  'پیش‌دریافت (بستانکاری ما)': '#3b82f6'
};

const safeNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleanString = String(val).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/,/g, '').replace(/[^0-9.-]+/g, ""); 
  const parsed = Number(cleanString);
  return isNaN(parsed) ? 0 : parsed;
};

// 💡 فرمول‌های استخراج مستقیم و ۱۰۰٪ مشابه ReportsTab
const getPurchaseInternal = (p: any) => safeNum(p.internalCost);
const getPurchaseBilled = (p: any) => safeNum(p.billedCost) || getPurchaseInternal(p);

const getLaborInternal = (l: any) => safeNum(l.internalCost) || safeNum(l.totalWage) || safeNum(l.wage) || safeNum(l.salary);
const getLaborBilled = (l: any) => safeNum(l.billedCost) || getLaborInternal(l);

const getLogisticsInternal = (l: any) => safeNum(l.internalCost) || safeNum(l.totalCost) || safeNum(l.fee);
const getLogisticsBilled = (l: any) => safeNum(l.billedCost) || getLogisticsInternal(l);

const isMatchDateFilters = (date: string | undefined, start: string, end: string, year: string) => {
  if (!date) return year === 'ALL';
  if (year !== 'ALL' && !date.startsWith(year)) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};

const getDatesBetween = (start: string, end: string) => {
  if(!start || !end) return [];
  const dates = [];
  let [y, m, d] = start.split('/').map(Number);
  const [ey, em, ed] = end.split('/').map(Number);
  
  while(y < ey || (y === ey && m < em) || (y === ey && m === em && d <= ed)) {
      const mm = m < 10 ? `0${m}` : m;
      const dd = d < 10 ? `0${d}` : d;
      dates.push(`${y}/${mm}/${dd}`);
      d++;
      if ((m <= 6 && d > 31) || (m > 6 && m <= 11 && d > 30) || (m === 12 && d > 29)) {
          d = 1; m++;
          if (m > 12) { m = 1; y++; }
      }
      if (dates.length > 365) break; 
  }
  return dates;
};

export default function ClientAnalyticsTab({ clientId }: { clientId: string }) {
  const allTransactions = useFinanceStore((state) => state.transactions) || [];
  const allProjects = useProjectStore((state) => state.projects) || [];
  const allPurchases = usePurchaseStore((state) => state.purchases) || [];
  const allLogisticsLogs = useLogisticsStore((state) => state.logs) || [];
  const allLaborLogs = useLaborStore((state) => state.logs) || [];

  const currentYear = moment().jYear().toString();
  const [yearFilter, setYearFilter] = useState('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [phaseFilter, setPhaseFilter] = useState('ALL');

  useEffect(() => {
    setPhaseFilter('ALL');
  }, [projectFilter]);

  const yearOptions = [
    { value: 'ALL', label: 'تمام سال‌ها' },
    { value: currentYear, label: `سال ${currentYear}` },
    { value: (parseInt(currentYear) - 1).toString(), label: `سال ${parseInt(currentYear) - 1}` },
    { value: (parseInt(currentYear) - 2).toString(), label: `سال ${parseInt(currentYear) - 2}` },
  ];

  // 💡 جستجوگر سوپر-هوشمند
  const clientProjects = useMemo(() => {
    return allProjects.filter((p: any) => {
      if (p.clientId === clientId || p.employerId === clientId || p.customerId === clientId || p.client_id === clientId) return true;
      if (p.client?.id === clientId || p.employer?.id === clientId) return true;
      const hasLinkedTx = allTransactions.some(t => 
        (t.clientId === clientId || t.referenceId === clientId) && 
        (t.referenceId === p.id || t.allocations?.some(a => a.projectId === p.id))
      );
      if (hasLinkedTx) return true;
      return false;
    });
  }, [allProjects, clientId, allTransactions]);

  const isClientRelated = (item: any) => {
    return item.clientId === clientId || item.employerId === clientId || item.personId === clientId || item.customerId === clientId;
  };

  const projectOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'تمامی پروژه‌ها و کارهای آزاد' },
      { value: 'FREE', label: 'فقط کارهای آزاد (بدون پروژه)' },
      ...clientProjects.map(p => ({ value: p.id, label: p.name }))
    ];
  }, [clientProjects]);

  const phaseOptions = useMemo(() => {
    if (projectFilter === 'ALL' || projectFilter === 'FREE') return [{ value: 'ALL', label: 'همه فازها' }];
    const proj = clientProjects.find(p => p.id === projectFilter);
    if (!proj || !proj.phases) return [{ value: 'ALL', label: 'همه فازها' }];
    return [
      { value: 'ALL', label: 'همه فازها' },
      ...proj.phases.map((ph: any) => ({ value: ph.id, label: ph.name }))
    ];
  }, [projectFilter, clientProjects]);

  // 💡 تجمیع‌کننده یکپارچه اطلاعات
  const analyticsData = useMemo(() => {
    let totalHiddenProfit = 0;
    let totalBilled = 0;
    const barData: any[] = [];
    
    let targetProjects = clientProjects;
    if (projectFilter === 'FREE') targetProjects = [];
    else if (projectFilter !== 'ALL') targetProjects = clientProjects.filter(p => p.id === projectFilter);

    // ۱. پردازش پروژه‌ها
    targetProjects.forEach(proj => {
      let pInternal = 0;
      let pBilled = 0;
      
      allPurchases.filter(p => p.projectId === proj.id && isMatchDateFilters(p.date, startDate, endDate, yearFilter)).forEach(p => {
        if (phaseFilter === 'ALL' || p.phaseId === phaseFilter) {
          pInternal += getPurchaseInternal(p);
          pBilled += getPurchaseBilled(p);
        }
      });
      allLaborLogs.filter(l => l.projectId === proj.id && isMatchDateFilters(l.date || l.startDate, startDate, endDate, yearFilter)).forEach(l => {
        if (phaseFilter === 'ALL' || l.phaseId === phaseFilter) {
          pInternal += getLaborInternal(l);
          pBilled += getLaborBilled(l);
        }
      });
      allLogisticsLogs.filter(l => l.projectId === proj.id && isMatchDateFilters(l.date, startDate, endDate, yearFilter)).forEach(l => {
        if (phaseFilter === 'ALL' || l.phaseId === phaseFilter) {
          pInternal += getLogisticsInternal(l);
          pBilled += getLogisticsBilled(l);
        }
      });

      let pValuation = 0;
      const targetPhases = phaseFilter === 'ALL' ? (proj.phases || []) : (proj.phases || []).filter((p:any) => p.id === phaseFilter);
      const hasContract = targetPhases.some((p:any) => ['CONTRAT', 'FIXED', 'METRI', 'METRE', 'PERCENTAGE', 'COST_ONLY'].includes(p.contractType));
      
      if (hasContract) {
        pValuation = targetPhases.reduce((acc: number, phase: any) => {
          if (['METRE', 'METRI'].includes(phase.contractType)) {
            const area = phase.dimensions?.reduce((sum: number, d: any) => sum + safeNum(d.area), 0) || safeNum(phase.area) || 0;
            return acc + Math.floor((area * safeNum(phase.unitPrice)) / 10);
          }
          if (['FIXED', 'CONTRAT'].includes(phase.contractType)) return acc + Math.floor(safeNum(phase.fixedPrice) / 10);
          if (phase.contractType === 'PERCENTAGE') return acc + pBilled + Math.floor((pBilled * safeNum(phase.contractorPercentage)) / 100);
          if (phase.contractType === 'COST_ONLY') return acc + pBilled;
          return acc;
        }, 0);
      } else {
        pValuation = pBilled;
      }

      totalBilled += pValuation;
      totalHiddenProfit += (pBilled - pInternal);

      if (pValuation > 0 || pInternal > 0) {
        barData.push({ name: proj.name, ارزش_قرارداد: pValuation, هزینه_پای_کار: pInternal, سود_پیمانکار: Math.max(0, pValuation - pInternal) });
      }
    });

    // ۲. پردازش کارهای آزاد
    if (projectFilter === 'ALL' || projectFilter === 'FREE') {
      let fInternal = 0; let fBilled = 0;
      
      allPurchases.filter(p => (!p.projectId || p.projectId === 'FREE') && isClientRelated(p) && isMatchDateFilters(p.date, startDate, endDate, yearFilter)).forEach(p => {
        fInternal += getPurchaseInternal(p); fBilled += getPurchaseBilled(p);
      });
      allLaborLogs.filter(l => (!l.projectId || l.projectId === 'FREE') && isClientRelated(l) && isMatchDateFilters(l.date || l.startDate, startDate, endDate, yearFilter)).forEach(l => {
        fInternal += getLaborInternal(l); fBilled += getLaborBilled(l);
      });
      allLogisticsLogs.filter(l => (!l.projectId || l.projectId === 'FREE') && isClientRelated(l) && isMatchDateFilters(l.date, startDate, endDate, yearFilter)).forEach(l => {
        fInternal += getLogisticsInternal(l); fBilled += getLogisticsBilled(l);
      });

      totalBilled += fBilled;
      totalHiddenProfit += (fBilled - fInternal);

      if (fBilled > 0 || fInternal > 0) {
        barData.push({ name: 'کارهای آزاد', ارزش_قرارداد: fBilled, هزینه_پای_کار: fInternal, سود_پیمانکار: Math.max(0, fBilled - fInternal) });
      }
    }

    // ۳. پردازش چک‌ها و پرداخت‌ها
    let confirmedPaid = 0;
    let pendingCheques = 0;
    const clientProjectIds = clientProjects.map(p => p.id);

    allTransactions.filter(t => t.direction === 'IN' && isMatchDateFilters(t.date, startDate, endDate, yearFilter)).forEach(t => {
      const isPending = t.type === 'CHEQUE' && t.chequeDetails?.status === 'PENDING';
      const isCashed = !isPending;
      
      let amt = 0;
      if (projectFilter === 'ALL') {
          if (t.clientId === clientId || t.referenceId === clientId || clientProjectIds.includes(t.referenceId)) amt = safeNum(t.amount);
          else if (t.allocations?.some(a => clientProjectIds.includes(a.projectId || ''))) {
              amt = t.allocations.reduce((sum, a) => clientProjectIds.includes(a.projectId || '') ? sum + safeNum(a.amount) : sum, 0);
          }
      } else if (projectFilter === 'FREE') {
          if ((t.clientId === clientId || t.referenceId === clientId) && (!t.allocations || t.allocations.length === 0)) amt = safeNum(t.amount);
      } else {
          if (t.referenceId === projectFilter) amt = safeNum(t.amount);
          else if (t.allocations?.some(a => a.projectId === projectFilter)) {
              amt = t.allocations.reduce((sum, a) => a.projectId === projectFilter ? sum + safeNum(a.amount) : sum, 0);
          }
      }

      if (amt > 0) {
          if (isCashed) confirmedPaid += amt;
          if (isPending) pendingCheques += amt;
      }
    });

    const remainingDebt = totalBilled - confirmedPaid;
    const debt = remainingDebt > 0 ? remainingDebt : 0;
    const overpaid = remainingDebt < 0 ? Math.abs(remainingDebt) : 0;

    const pieData = [
      { name: 'دریافتی قطعی', value: confirmedPaid },
      { name: 'چک در راه', value: pendingCheques },
      { name: 'بدهی باز کارفرما', value: debt },
      { name: 'پیش‌دریافت (بستانکاری ما)', value: overpaid }
    ].filter(i => i.value > 0);

    // 💡 محاسبه کارت سوم (درصد حاشیه سود)
    const profitMargin = totalBilled > 0 ? (totalHiddenProfit / totalBilled) * 100 : 0;

    return {
      hiddenProfit: totalHiddenProfit,
      pendingCheques,
      totalBilled,
      profitMargin,
      pieData,
      barData: barData.sort((a, b) => b.ارزش_قرارداد - a.ارزش_قرارداد)
    };
  }, [clientProjects, allPurchases, allLaborLogs, allLogisticsLogs, allTransactions, projectFilter, phaseFilter, startDate, endDate, yearFilter, clientId]);

  const cashflowData = useMemo(() => {
    const grouped: Record<string, any> = {};

    if (startDate && endDate) {
      const dates = getDatesBetween(startDate, endDate);
      dates.forEach(d => { grouped[d] = { date: d, cashIn: 0, chequeIn: 0 }; });
    }

    const getOrInit = (date: string) => {
      if (!grouped[date]) grouped[date] = { date, cashIn: 0, chequeIn: 0 };
      return grouped[date];
    };

    allTransactions.filter(t => t.direction === 'IN' && isMatchDateFilters(t.date, startDate, endDate, yearFilter)).forEach(tx => {
      const isClientMatch = tx.clientId === clientId || tx.referenceId === clientId || 
                            (tx.allocations && tx.allocations.some(a => clientProjects.map(p=>p.id).includes(a.projectId || '')));
      if (isClientMatch && tx.date) {
        if (tx.type !== 'CHEQUE') getOrInit(tx.date).cashIn += safeNum(tx.amount);
        if (tx.type === 'CHEQUE') getOrInit(tx.date).chequeIn += safeNum(tx.amount);
      }
    });

    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [allTransactions, startDate, endDate, yearFilter, clientId, clientProjects]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-4 rounded-2xl shadow-2xl text-right z-50" dir="rtl">
          <p className="text-slate-800 dark:text-slate-200 font-black mb-3 pb-2 border-b border-slate-200 dark:border-slate-700/50">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-8 my-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{entry.name}:</span>
              <span className="font-mono text-slate-900 dark:text-white font-black text-sm" style={{ color: entry.color || colorMap[entry.name] || entry.fill }}>
                {entry.value.toLocaleString('fa-IR')}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-4 sm:p-6 bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl backdrop-saturate-150 rounded-[2rem] border border-white/60 dark:border-white/10 shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-wrap items-end gap-3 relative z-[100]">
        <div className="flex items-center gap-2 w-full sm:w-auto mb-2 sm:mb-0 ml-2">
          <Filter className="w-5 h-5 text-indigo-500 drop-shadow-md" />
          <span className="font-black text-slate-800 dark:text-slate-100">فیلترهای پیشرفته</span>
        </div>
        
        <div className="flex-1 min-w-[120px] flex flex-col gap-1 z-[99]">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mr-2">سال مالی:</label>
          <GlassSelect options={yearOptions} value={yearFilter} onChange={setYearFilter} placeholder="انتخاب سال" />
        </div>

        <div className="flex-1 min-w-[180px] flex flex-col gap-1 z-[97]">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mr-2">پروژه:</label>
          <GlassSelect options={projectOptions} value={projectFilter} onChange={setProjectFilter} placeholder="پروژه یا آزاد" />
        </div>

        {projectFilter !== 'ALL' && projectFilter !== 'FREE' && (
          <div className="flex-1 min-w-[150px] flex flex-col gap-1 z-[96]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mr-2">فاز اجرایی:</label>
            <GlassSelect options={phaseOptions} value={phaseFilter} onChange={setPhaseFilter} placeholder="انتخاب فاز" />
          </div>
        )}

        <div className="flex-1 min-w-[130px] flex flex-col gap-1 z-[50]">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mr-2">از تاریخ:</label>
          <GlassDatePicker value={startDate} onChange={setStartDate} />
        </div>
        
        <div className="flex-1 min-w-[130px] flex flex-col gap-1 z-[40]">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mr-2">تا تاریخ:</label>
          <GlassDatePicker value={endDate} onChange={setEndDate} />
        </div>

        {(startDate || endDate || yearFilter !== 'ALL' || projectFilter !== 'ALL' || phaseFilter !== 'ALL') && (
          <button onClick={() => { setStartDate(''); setEndDate(''); setYearFilter('ALL'); setProjectFilter('ALL'); setPhaseFilter('ALL'); }} className="px-4 py-2.5 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-black rounded-xl hover:bg-rose-200 dark:hover:bg-rose-500/30 transition-colors text-xs border border-rose-200 dark:border-rose-500/30 mt-2 xl:mt-0">
            حذف فیلترها
          </button>
        )}
      </motion.div>

      {/* 💡 داشبورد ۳ کارته */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="p-6 rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br from-fuchsia-500/10 to-purple-600/5 border border-fuchsia-200 dark:border-fuchsia-500/20 shadow-lg dark:shadow-none flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-sm font-bold text-fuchsia-800 dark:text-fuchsia-300">سود پنهان (خالص)</span>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-fuchsia-400 to-purple-500 text-white shadow-md"><Gem className="w-5 h-5" /></div>
          </div>
          <span className="text-3xl font-black text-fuchsia-700 dark:text-fuchsia-400 font-mono drop-shadow-sm relative z-10" dir="ltr">{analyticsData.hiddenProfit.toLocaleString('fa-IR')}</span>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, delay: 0.05 }} className="p-6 rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-200 dark:border-orange-500/20 shadow-lg dark:shadow-none flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-sm font-bold text-orange-800 dark:text-orange-300">بدهی معوق (چک‌های سررسید نشده)</span>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md"><AlertTriangle className="w-5 h-5" /></div>
          </div>
          <span className="text-3xl font-black text-orange-700 dark:text-orange-400 font-mono drop-shadow-sm relative z-10" dir="ltr">{analyticsData.pendingCheques.toLocaleString('fa-IR')}</span>
        </motion.div>

        {/* 💡 بازگشت کارت سوم (حاشیه سود واقعی) */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, delay: 0.1 }} className="p-6 rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br from-sky-500/10 to-blue-600/5 border border-sky-200 dark:border-sky-500/20 shadow-lg dark:shadow-none flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-sm font-bold text-sky-800 dark:text-sky-300">حاشیه سود واقعی</span>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-md"><Percent className="w-5 h-5" /></div>
          </div>
          <div className="flex items-end gap-2 relative z-10">
            <span className="text-3xl font-black text-sky-700 dark:text-sky-400 font-mono drop-shadow-sm" dir="ltr">٪{analyticsData.profitMargin.toFixed(1)}</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="lg:col-span-2 w-full bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl backdrop-saturate-150 rounded-[2rem] border border-white/60 dark:border-white/10 p-6 shadow-xl dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200/50 dark:border-white/10 pb-4">
            <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">روند واریزی‌های کارفرما (نقد و چک)</h3>
          </div>
          <div className="w-full h-[400px]">
            {cashflowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashflowData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" opacity={0.15} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} fontFamily="Vazirmatn" angle={-35} textAnchor="end" tickMargin={15} minTickGap={30} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(value) => `${(value / 1000000)}M`} fontFamily="Vazirmatn" width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={50} wrapperStyle={{ paddingBottom: '20px' }} iconType="circle" />
                  
                  {/* 💡 بازگشت انیمیشن‌ها */}
                  <Line type="monotone" dataKey="cashIn" name="واریزی نقدی / حواله" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8, strokeWidth: 0 }} isAnimationActive={true} animationBegin={0} animationDuration={700} animationEasing="ease-out" />
                  <Line type="monotone" dataKey="chequeIn" name="دریافت چک" stroke="#f59e0b" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8, strokeWidth: 0 }} isAnimationActive={true} animationBegin={0} animationDuration={700} animationEasing="ease-out" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
               <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-sm bg-slate-100/50 dark:bg-slate-800/30 rounded-xl">تراکنشی در این بازه یافت نشد.</div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, delay: 0.05 }} className="w-full bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl backdrop-saturate-150 rounded-[2rem] border border-white/60 dark:border-white/10 p-6 shadow-xl dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200/50 dark:border-white/10 pb-4">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl"><PieChartIcon className="w-5 h-5" /></div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">وضعیت تسویه حساب</h3>
          </div>
          <div className="w-full h-[300px] relative">
            {analyticsData.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {/* 💡 انیمیشن Pie به خاطر باگ کرش کردن Recharts خاموش است، اما فرم container با انیمیشن لود می‌شود */}
                <PieChart>
                  <Pie 
                    data={analyticsData.pieData} 
                    cx="50%" cy="50%" 
                    innerRadius={80} outerRadius={110} 
                    paddingAngle={analyticsData.pieData.length > 1 ? 5 : 0} 
                    dataKey="value" 
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {analyticsData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colorMap[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-sm bg-slate-100/50 dark:bg-slate-800/30 rounded-xl">داده‌ای برای نمایش وجود ندارد.</div>
            )}
            
            {analyticsData.pieData.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-36px]">
                 <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">ارزش کل</span>
                 <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono" dir="ltr">
                   {(analyticsData.totalBilled / 1000000).toFixed(1)}M
                 </span>
              </motion.div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, delay: 0.1 }} className="w-full bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl backdrop-saturate-150 rounded-[2rem] border border-white/60 dark:border-white/10 p-6 shadow-xl dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200/50 dark:border-white/10 pb-4">
            <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl"><Briefcase className="w-5 h-5" /></div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
              مقایسه مالی پروژه‌ها و کارهای آزاد
            </h3>
          </div>
          <div className="w-full h-[300px]">
            {analyticsData.barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.barData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" opacity={0.15} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontFamily="Vazirmatn" angle={-25} textAnchor="end" tickMargin={15} height={50} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(value) => `${(value / 1000000)}M`} fontFamily="Vazirmatn" width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  
                  {/* 💡 بازگشت انیمیشن‌ها */}
                  <Bar dataKey="ارزش_قرارداد" fill="#3b82f6" radius={[6, 6, 0, 0]} isAnimationActive={true} animationBegin={0} animationDuration={700} animationEasing="ease-out" />
                  <Bar dataKey="هزینه_پای_کار" fill="#f43f5e" radius={[6, 6, 0, 0]} isAnimationActive={true} animationBegin={0} animationDuration={700} animationEasing="ease-out" />
                  <Bar dataKey="سود_پیمانکار" fill="#10b981" radius={[6, 6, 0, 0]} isAnimationActive={true} animationBegin={0} animationDuration={700} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-sm bg-slate-100/50 dark:bg-slate-800/30 rounded-xl">داده‌ای برای این فیلتر یافت نشد.</div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}