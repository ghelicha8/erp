import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useFinanceStore } from '../../../../store/financeStore';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { 
  Activity, Filter, Gem, Wallet, AlertTriangle, Briefcase, 
} from 'lucide-react';
import GlassDatePicker from '../../../../components/ui/GlassDatePicker';
import GlassSelect from '../../../../components/ui/GlassSelect';

// 💡 ایمپورت استورهای گلوبال برای یکپارچگی محاسبات گزارشات
import { usePurchaseStore } from '../../../../store/purchaseStore';
import { useLaborStore } from '../../../../store/laborStore';
import { useLogisticsStore } from '../../../../store/logisticsStore';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const safeNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleanString = String(val).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/,/g, '').replace(/[^0-9.-]+/g, ""); 
  const parsed = Number(cleanString);
  return isNaN(parsed) ? 0 : parsed;
};

const isDateInRange = (date: string, start: string, end: string) => {
  if (!date) return true;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};
const isPhaseMatch = (itemPhaseId: string, selectedPhase: string) => {
  if (selectedPhase === 'ALL') return true;
  return itemPhaseId === selectedPhase;
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

export default function ReportsTab({ project }: { project: any }) {
  const allTransactions = useFinanceStore((state) => state.transactions);
  
  // 💡 فراخوانی دیتابیس‌های کل سیستم
  const allPurchases = usePurchaseStore((state) => state.purchases);
  const allLaborLogs = useLaborStore((state) => state.logs);
  const allLogisticsLogs = useLogisticsStore((state) => state.logs);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState('ALL');

  const phases = project?.phases || [];
  const phaseOptions = useMemo(() => [{ value: 'ALL', label: 'تمامی فازها' }, ...phases.map((p: any) => ({ value: p.id, label: p.name }))], [phases]);

  const filteredTxs = useMemo(() => {
    return allTransactions.filter(t => t.referenceId === project.id && isDateInRange(t.date, startDate, endDate) && isPhaseMatch(t.phaseId || 'GENERAL', selectedPhaseFilter));
  }, [allTransactions, project.id, startDate, endDate, selectedPhaseFilter]);

  // 💡 فیلتر هوشمند دیتابیس‌های مستقل بدون تداخل اطلاعاتی
  const filteredPurchases = useMemo(() => {
    const projectPurchases = allPurchases.filter(p => p.projectId === project.id);
    return projectPurchases.filter((p:any) => isDateInRange(p.date, startDate, endDate) && isPhaseMatch(p.phaseId || 'GENERAL', selectedPhaseFilter));
  }, [allPurchases, project.id, startDate, endDate, selectedPhaseFilter]);

  const filteredLabor = useMemo(() => {
    const projectLabor = allLaborLogs.filter(l => l.projectId === project.id);
    return projectLabor.filter((l:any) => isDateInRange(l.date || l.startDate, startDate, endDate) && isPhaseMatch(l.phaseId || 'GENERAL', selectedPhaseFilter));
  }, [allLaborLogs, project.id, startDate, endDate, selectedPhaseFilter]);

  const filteredLogistics = useMemo(() => {
    const projectLogistics = allLogisticsLogs.filter(l => l.projectId === project.id);
    return projectLogistics.filter((l:any) => isDateInRange(l.date, startDate, endDate) && isPhaseMatch(l.phaseId || 'GENERAL', selectedPhaseFilter));
  }, [allLogisticsLogs, project.id, startDate, endDate, selectedPhaseFilter]);

  // 💡 ۱. محاسبات مربوط به سود مخفی و جریان نقدینگی کلان
  const advancedStats = useMemo(() => {
    const contractorOutofPocket = filteredTxs.filter(t => t.direction === 'OUT').reduce((acc, t) => acc + safeNum(t.amount), 0);
    const pendingCheques = filteredTxs.filter(t => t.type === 'CHEQUE' && t.chequeDetails?.status === 'PENDING').reduce((acc, t) => acc + safeNum(t.amount), 0);

    let profit = 0;
    
    // 💡 فرمول ضدگلوله: مبلغ فاکتور شده برای کارفرما منهای هزینه واقعی پای کار پیمانکار
    filteredPurchases.forEach((p: any) => { 
      const internal = safeNum(p.internalCost);
      const billed = safeNum(p.billedCost) || internal;
      profit += (billed - internal); 
    });
    
    filteredLabor.forEach((l: any) => {
      const internal = safeNum(l.internalCost) || safeNum(l.totalWage) || safeNum(l.wage) || safeNum(l.salary);
      const billed = safeNum(l.billedCost) || internal;
      profit += (billed - internal);
    });
    
    filteredLogistics.forEach((l: any) => {
      const internal = safeNum(l.internalCost) || safeNum(l.totalCost) || safeNum(l.fee);
      const billed = safeNum(l.billedCost) || internal;
      profit += (billed - internal);
    });

    return { contractorOutofPocket, pendingCheques, hiddenProfit: profit };
  }, [filteredTxs, filteredPurchases, filteredLabor, filteredLogistics]);

  // 💡 ۲. محاسبات نمودار خطی جریان نقدینگی و هزینه‌های روزانه
  const cashflowData = useMemo(() => {
    const grouped: Record<string, any> = {};

    if (startDate && endDate) {
      const dates = getDatesBetween(startDate, endDate);
      dates.forEach(d => { grouped[d] = { date: d, income: 0, expense: 0, workshopCost: 0 }; });
    }

    const getOrInit = (date: string) => {
      if (!grouped[date]) grouped[date] = { date, income: 0, expense: 0, workshopCost: 0 };
      return grouped[date];
    };

    filteredTxs.forEach(tx => {
      const d = tx.date;
      if (!d) return;
      if (tx.direction === 'IN') getOrInit(d).income += safeNum(tx.amount);
      if (tx.direction === 'OUT') getOrInit(d).expense += safeNum(tx.amount);
    });

    // 💡 رفع مشکل دوبل شدن هزینه‌ها (فقط internalCost خالص رو می‌خونیم)
    filteredPurchases.forEach((p:any) => {
      if (p.date) getOrInit(p.date).workshopCost += safeNum(p.internalCost);
    });
    filteredLabor.forEach((l:any) => {
      const d = l.date || l.startDate;
      if (d) getOrInit(d).workshopCost += safeNum(l.internalCost) || safeNum(l.totalWage) || safeNum(l.wage) || safeNum(l.salary);
    });
    filteredLogistics.forEach((l:any) => {
      if (l.date) getOrInit(l.date).workshopCost += safeNum(l.internalCost) || safeNum(l.totalCost) || safeNum(l.fee);
    });

    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredTxs, filteredPurchases, filteredLabor, filteredLogistics, startDate, endDate]);

  // 💡 ۳. ساختار نمودار دایره‌ای (Pie Chart) بدون دوبل شدن کرایه‌ها
  const expenseBreakdown = useMemo(() => {
    let mats = 0, labor = 0, log = 0;
    filteredPurchases.forEach((p:any) => mats += safeNum(p.internalCost));
    filteredLabor.forEach((l:any) => labor += safeNum(l.internalCost) || safeNum(l.totalWage) || safeNum(l.wage) || safeNum(l.salary));
    filteredLogistics.forEach((l:any) => log += safeNum(l.internalCost) || safeNum(l.totalCost) || safeNum(l.fee));
    
    return [
      { name: 'مصالح و خرید', value: mats },
      { name: 'دستمزد پرسنل', value: labor },
      { name: 'ماشین‌آلات و لجستیک', value: log }
    ].filter(i => i.value > 0);
  }, [filteredPurchases, filteredLabor, filteredLogistics]);

  // 💡 ۴. ارزش‌گذاری و محاسبه دقیق فازها (با استفاده از مبلغ صورت‌وضعیت/فاکتور کارفرما)
  const phaseChartData = useMemo(() => {
    let costSum = 0;
    
    // در قراردادهای درصدی، مبلغ فاکتور کارفرما مبنای محاسبه سود است
    filteredPurchases.forEach((p:any) => costSum += safeNum(p.billedCost) || safeNum(p.internalCost));
    filteredLabor.forEach((l:any) => costSum += safeNum(l.billedCost) || safeNum(l.internalCost) || safeNum(l.totalWage) || safeNum(l.wage) || safeNum(l.salary));
    filteredLogistics.forEach((l:any) => costSum += safeNum(l.billedCost) || safeNum(l.internalCost) || safeNum(l.totalCost) || safeNum(l.fee));

    const targetPhases = selectedPhaseFilter === 'ALL' ? (project.phases || []) : (project.phases || []).filter((p:any) => p.id === selectedPhaseFilter);

    return targetPhases.map((phase: any) => {
      let phaseValue = 0;
      if (phase.contractType === 'METRE' || phase.contractType === 'METRI') {
        const area = phase.dimensions?.reduce((sum: number, d: any) => sum + safeNum(d.area), 0) || safeNum(phase.area) || 0;
        phaseValue = Math.floor((area * safeNum(phase.unitPrice)) / 10);
      } else if (phase.contractType === 'FIXED' || phase.contractType === 'CONTRAT') {
        phaseValue = Math.floor(safeNum(phase.fixedPrice) / 10);
      } else if (phase.contractType === 'PERCENTAGE') {
        phaseValue = costSum + Math.floor((costSum * safeNum(phase.contractorPercentage)) / 100);
      } else if (phase.contractType === 'COST_ONLY') {
        phaseValue = costSum;
      }
      return { name: phase.name, ارزش_قراردادی: phaseValue };
    });
  }, [project, filteredPurchases, filteredLabor, filteredLogistics, selectedPhaseFilter]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl text-right" dir="rtl">
          <p className="text-slate-300 font-bold mb-2 pb-2 border-b border-slate-700">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6 my-1">
              <span className="text-xs font-bold text-slate-300">{entry.name}:</span>
              <span className="font-mono text-white font-black" style={{ color: entry.color }}>
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto mb-2 sm:mb-0">
          <Filter className="w-5 h-5 text-indigo-500" />
          <span className="font-black text-slate-700 dark:text-slate-200">فیلتر پیشرفته گزارشات</span>
        </div>
        
        <div className="flex-1 min-w-[150px] flex flex-col gap-1 z-[99]">
          <label className="text-[10px] font-bold text-slate-500 mr-2">فاز اجرایی:</label>
          <GlassSelect options={phaseOptions} value={selectedPhaseFilter} onChange={setSelectedPhaseFilter} placeholder="تمامی فازها" />
        </div>

        <div className="flex-1 min-w-[150px] flex flex-col gap-1 z-[50]">
          <label className="text-[10px] font-bold text-slate-500 mr-2">از تاریخ:</label>
          <GlassDatePicker value={startDate} onChange={setStartDate} />
        </div>
        
        <div className="flex-1 min-w-[150px] flex flex-col gap-1 z-[40]">
          <label className="text-[10px] font-bold text-slate-500 mr-2">تا تاریخ:</label>
          <GlassDatePicker value={endDate} onChange={setEndDate} />
        </div>

        {(startDate || endDate || selectedPhaseFilter !== 'ALL') && (
          <button onClick={() => { setStartDate(''); setEndDate(''); setSelectedPhaseFilter('ALL'); }} className="px-4 py-2.5 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-xl hover:bg-rose-200 dark:hover:bg-rose-500/30 transition-colors text-xs">
            حذف فیلترها
          </button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="p-5 rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br from-fuchsia-500/10 to-fuchsia-500/5 border border-fuchsia-200 dark:border-fuchsia-500/30 shadow-sm flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold text-fuchsia-700 dark:text-fuchsia-300">سود مخفی (مواد/لجستیک/نیرو)</span>
            <div className="p-2 rounded-xl bg-fuchsia-500 text-white shadow-sm"><Gem className="w-4 h-4" /></div>
          </div>
          <span className="text-2xl font-black text-fuchsia-600 dark:text-fuchsia-400 font-mono" dir="ltr">{advancedStats.hiddenProfit.toLocaleString()}</span>
        </div>
        
        <div className="p-5 rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-200 dark:border-cyan-500/30 shadow-sm flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold text-cyan-700 dark:text-cyan-300">خروج نقدینگی از جیب پیمانکار</span>
            <div className="p-2 rounded-xl bg-cyan-500 text-white shadow-sm"><Wallet className="w-4 h-4" /></div>
          </div>
          <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono" dir="ltr">{advancedStats.contractorOutofPocket.toLocaleString()}</span>
        </div>

        <div className="p-5 rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-200 dark:border-orange-500/30 shadow-sm flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold text-orange-700 dark:text-orange-300">بدهی معوق (چک‌های سررسید نشده)</span>
            <div className="p-2 rounded-xl bg-orange-500 text-white shadow-sm"><AlertTriangle className="w-4 h-4" /></div>
          </div>
          <span className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono" dir="ltr">{advancedStats.pendingCheques.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 shadow-sm z-30">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl"><Activity className="w-5 h-5" /></div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">روند جریان نقدینگی (در بازه زمانی انتخاب شده)</h3>
          </div>
          <div className="w-full h-[400px]">
            {cashflowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashflowData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" opacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    fontSize={11} 
                    fontFamily="Vazirmatn" 
                    angle={-35} 
                    textAnchor="end" 
                    tickMargin={15} 
                    minTickGap={30} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickFormatter={(value) => `${(value / 1000000)}M`} 
                    fontFamily="Vazirmatn" 
                    width={60} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={50} wrapperStyle={{ paddingBottom: '20px' }} iconType="circle" />
                  
                  <Line type="monotone" dataKey="income" name="دریافتی از کارفرما" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="expense" name="خروجی از جیب پیمانکار" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="workshopCost" name="هزینه پای کار (خرید/نیرو/حمل)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
               <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">تراکنشی در این بازه ثبت نشده است.</div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 shadow-sm z-30">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><PieChart className="w-5 h-5" /></div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">ساختار هزینه‌های واقعی (پای کار)</h3>
          </div>
          <div className="w-full h-[300px]">
            {expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                    {expenseBreakdown.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">هزینه‌ای ثبت نشده است.</div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 shadow-sm z-30">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl"><Briefcase className="w-5 h-5" /></div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">ارزش‌گذاری قراردادی به تفکیک فاز</h3>
          </div>
          <div className="w-full h-[300px]">
            {phaseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={phaseChartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontFamily="Vazirmatn" angle={-25} textAnchor="end" tickMargin={15} height={50} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(value) => `${(value / 1000000)}M`} fontFamily="Vazirmatn" width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ارزش_قراردادی" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">فازی در این بازه یافت نشد.</div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}