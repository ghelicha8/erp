import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { 
  Activity, Filter, Gem, Wallet, HardHat, Briefcase, TrendingUp
} from 'lucide-react';
import moment from 'moment-jalaali';

import { useLaborStore } from '../../../store/laborStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useClientStore } from '../../../store/clientStore';

// 💡 استفاده از تقویم اصلی و اختصاصیِ GlassDatePicker که خواسته بودی
import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import { PortalSelect } from '../../../components/ui/SharedLaborUI';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];

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

export default function LaborAnalyticsTab({ workerId }: { workerId: string }) {
  const { logs } = useLaborStore();
  const { projects } = useProjectStore();
  const { clients } = useClientStore();

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedClientFilter, setSelectedClientFilter] = useState('ALL');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('ALL');

  const workerLogs = useMemo(() => {
    return logs.filter(l => l.workerId === workerId);
  }, [logs, workerId]);

  const getLogClientId = (log: any) => {
    if (log.clientId && log.clientId !== 'FREE') return log.clientId;
    if (log.projectId && log.projectId !== 'FREE') {
      const p = projects.find(x => x.id === log.projectId);
      return p?.clientId || 'FREE';
    }
    return 'FREE';
  };

  const clientOptions = useMemo(() => {
    const uniqueClientIds = new Set(workerLogs.map(getLogClientId));
    const opts = [{ value: 'ALL', label: 'همه کارفرماها' }];
    if (uniqueClientIds.has('FREE')) opts.push({ value: 'FREE', label: 'کارهای آزاد / متفرقه' });
    
    clients.forEach(c => {
      if (uniqueClientIds.has(c.id)) {
        opts.push({ value: c.id, label: `${c.name} ${c.lastName}`.trim() });
      }
    });
    return opts;
  }, [workerLogs, clients, projects]);

  const projectOptions = useMemo(() => {
    let validLogs = workerLogs;
    if (selectedClientFilter !== 'ALL') {
      validLogs = validLogs.filter(l => getLogClientId(l) === selectedClientFilter);
    }
    const uniqueProjectIds = new Set(validLogs.map(l => l.projectId || 'FREE'));
    
    const opts = [{ value: 'ALL', label: 'همه پروژه‌ها' }];
    if (uniqueProjectIds.has('FREE')) opts.push({ value: 'FREE', label: 'کار آزاد / متفرقه' });
    
    projects.forEach(p => {
      if (uniqueProjectIds.has(p.id)) {
        opts.push({ value: p.id, label: p.name || p.title || 'بدون نام' });
      }
    });
    return opts;
  }, [workerLogs, selectedClientFilter, projects]);

  const getDetailedLocationName = (log: any) => {
    if (log.projectId === 'FREE' || !log.projectId) {
      const cId = getLogClientId(log);
      if (cId !== 'FREE') {
        const client = clients.find(c => c.id === cId);
        return client ? `آزاد (${client.name} ${client.lastName})` : 'کار آزاد';
      }
      return 'کار آزاد / متفرقه';
    }
    const proj = projects.find(p => p.id === log.projectId);
    const projName = proj?.name || proj?.title || 'نامشخص';
    if (log.phaseId && log.phaseId !== 'GENERAL') {
      const phase = proj?.phases?.find((ph:any) => ph.id === log.phaseId);
      if (phase) return `${projName} (${phase.name})`;
    }
    return projName;
  };

  const filteredLogs = useMemo(() => {
    return workerLogs.filter((l:any) => {
      const matchDate = isDateInRange(l.date || l.startDate, startDate, endDate);
      const matchClient = selectedClientFilter === 'ALL' || getLogClientId(l) === selectedClientFilter;
      const matchProject = selectedProjectFilter === 'ALL' || (l.projectId || 'FREE') === selectedProjectFilter;
      return matchDate && matchClient && matchProject;
    });
  }, [workerLogs, startDate, endDate, selectedClientFilter, selectedProjectFilter, projects]);

  const advancedStats = useMemo(() => {
    let totalEarned = 0; 
    let totalBilled = 0; 
    let totalShifts = 0;

    filteredLogs.forEach((l: any) => {
      const internal = safeNum(l.internalCost) || safeNum(l.totalWage) || safeNum(l.wage) || safeNum(l.salary);
      const billed = safeNum(l.billedCost) || internal;
      
      totalEarned += internal;
      totalBilled += billed;
      if (l.paymentType !== 'PROJECT_MONTHLY' && l.paymentType !== 'MONTHLY') {
        totalShifts += 1;
      } else {
        totalShifts += safeNum(l.quantity) * 30;
      }
    });

    return { totalEarned, totalBilled, hiddenProfit: totalBilled - totalEarned, totalShifts };
  }, [filteredLogs]);

  const cashflowData = useMemo(() => {
    const grouped: Record<string, any> = {};

    if (startDate && endDate) {
      const dates = getDatesBetween(startDate, endDate);
      dates.forEach(d => { grouped[d] = { date: d, internal: 0, billed: 0, profit: 0 }; });
    }

    filteredLogs.forEach(log => {
      const d = log.date || '';
      if (!d) return;
      if (!grouped[d]) grouped[d] = { date: d, internal: 0, billed: 0, profit: 0 };
      
      const internal = safeNum(log.internalCost);
      const billed = safeNum(log.billedCost) || internal;

      grouped[d].internal += internal;
      grouped[d].billed += billed;
      grouped[d].profit += (billed - internal);
    });

    let result = Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));

    if (result.length === 1) {
      const firstDate = result[0].date;
      const prevDate = moment(firstDate, 'jYYYY/jMM/jDD').subtract(1, 'days').format('jYYYY/jMM/jDD');
      result.unshift({ date: prevDate, internal: 0, billed: 0, profit: 0 });
    } else if (result.length === 0) {
      result = [
        { date: 'شروع', internal: 0, billed: 0, profit: 0 },
        { date: 'پایان', internal: 0, billed: 0, profit: 0 }
      ];
    }

    return result;
  }, [filteredLogs, startDate, endDate]);

  const projectBreakdown = useMemo(() => {
    const projCount: Record<string, number> = {};
    
    filteredLogs.forEach((l:any) => {
      const pName = getDetailedLocationName(l);
      if (!projCount[pName]) projCount[pName] = 0;
      
      const shiftValue = (l.paymentType === 'MONTHLY' || l.paymentType === 'PROJECT_MONTHLY') 
        ? Math.max(1, safeNum(l.quantity) * 30) 
        : 1;
        
      projCount[pName] += shiftValue;
    });
    
    return Object.entries(projCount)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0) 
      .sort((a, b) => b.value - a.value);
  }, [filteredLogs, projects, clients]);

  const profitByProjectData = useMemo(() => {
    const projData: Record<string, any> = {};

    filteredLogs.forEach((l:any) => {
      const pName = getDetailedLocationName(l);
      if (!projData[pName]) projData[pName] = { name: pName, سود_خالص: 0, فاکتور_کارفرما: 0, دستمزد_پرداختی: 0 };
      
      const internal = safeNum(l.internalCost) || safeNum(l.totalWage) || safeNum(l.wage) || safeNum(l.salary);
      const billed = safeNum(l.billedCost) || internal;

      projData[pName].دستمزد_پرداختی += internal;
      projData[pName].فاکتور_کارفرما += billed;
      projData[pName].سود_خالص += (billed - internal);
    });

    return Object.values(projData).sort((a: any, b: any) => b.سود_خالص - a.سود_خالص);
  }, [filteredLogs, projects, clients]);

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
      
      {/* 💡 پنل فیلترها با تقویم اصلی GlassDatePicker */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative z-[100]">
        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 w-full">
          
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-2 bg-indigo-500/10 rounded-xl"><Filter className="w-5 h-5 text-indigo-500" /></div>
            <span className="font-black text-sm text-slate-700 dark:text-slate-200">فیلتر تحلیل کارکرد</span>
          </div>
          
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <div className="flex flex-col gap-1.5 relative z-[99]">
              <PortalSelect options={clientOptions} value={selectedClientFilter} onChange={(val: string) => { setSelectedClientFilter(val); setSelectedProjectFilter('ALL'); }} placeholder="فیلتر کارفرما" searchable={true} className="bg-white dark:bg-slate-900" />
            </div>
            <div className="flex flex-col gap-1.5 relative z-[98]">
              <PortalSelect options={projectOptions} value={selectedProjectFilter} onChange={setSelectedProjectFilter} placeholder="فیلتر پروژه" searchable={true} className="bg-white dark:bg-slate-900" />
            </div>
            {/* 💡 تقویم اصلی پروژه */}
            <div className="flex flex-col gap-1.5 relative z-[50]">
              <GlassDatePicker value={startDate} onChange={setStartDate} placeholder="از تاریخ..." />
            </div>
            <div className="flex flex-col gap-1.5 relative z-[40]">
              <GlassDatePicker value={endDate} onChange={setEndDate} placeholder="تا تاریخ..." />
            </div>
          </div>

          {(startDate || endDate || selectedProjectFilter !== 'ALL' || selectedClientFilter !== 'ALL') && (
            <button onClick={() => { setStartDate(''); setEndDate(''); setSelectedProjectFilter('ALL'); setSelectedClientFilter('ALL'); }} className="shrink-0 w-full xl:w-auto px-4 py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold rounded-xl border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/30 transition-colors text-xs flex items-center justify-center">
              حذف فیلترها
            </button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        <div className="p-5 rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-200 dark:border-indigo-500/30 shadow-sm flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold text-indigo-700 dark:text-indigo-300">کل روزهای کارکرد</span>
            <div className="p-2 rounded-xl bg-indigo-500 text-white shadow-sm"><HardHat className="w-4 h-4" /></div>
          </div>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono" dir="ltr">{advancedStats.totalShifts.toLocaleString()} <span className="text-sm">شیفت</span></span>
        </div>

        <div className="p-5 rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-200 dark:border-rose-500/30 shadow-sm flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold text-rose-700 dark:text-rose-300">دستمزد کسب شده (خالص)</span>
            <div className="p-2 rounded-xl bg-rose-500 text-white shadow-sm"><Wallet className="w-4 h-4" /></div>
          </div>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono" dir="ltr">{advancedStats.totalEarned.toLocaleString()}</span>
        </div>

        <div className="p-5 rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-200 dark:border-cyan-500/30 shadow-sm flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold text-cyan-700 dark:text-cyan-300">ارزش فاکتور شده کارفرما</span>
            <div className="p-2 rounded-xl bg-cyan-500 text-white shadow-sm"><Briefcase className="w-4 h-4" /></div>
          </div>
          <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono" dir="ltr">{advancedStats.totalBilled.toLocaleString()}</span>
        </div>

        <div className="p-5 rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-500/30 shadow-sm flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold text-emerald-700 dark:text-emerald-300">سود پنهان (آربیتراژ)</span>
            <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-sm"><Gem className="w-4 h-4" /></div>
          </div>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">{advancedStats.hiddenProfit.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        
        {/* 💡 نمودار خطی با انیمیشن سریع و روان (۳۰۰ میلی‌ثانیه) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl"><Activity className="w-5 h-5" /></div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">روند حضور و درآمدزایی (بازه زمانی انتخاب شده)</h3>
          </div>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashflowData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" opacity={0.2} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} fontFamily="Vazirmatn" angle={-35} textAnchor="end" tickMargin={15} minTickGap={30} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(value) => `${(value / 1000000)}M`} fontFamily="Vazirmatn" width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={50} wrapperStyle={{ paddingBottom: '20px' }} iconType="circle" />
                
                <Line type="monotone" dataKey="billed" name="فاکتور کارفرما" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} isAnimationActive={true} animationBegin={0} animationDuration={300} animationEasing="ease-out" />
                <Line type="monotone" dataKey="internal" name="دستمزد کارگر" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} isAnimationActive={true} animationBegin={0} animationDuration={300} animationEasing="ease-out" />
                <Line type="monotone" dataKey="profit" name="سود خالص روزانه" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} isAnimationActive={true} animationBegin={0} animationDuration={300} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* 💡 نمودار دونات گرافیکی با انیمیشن فوق‌العاده نرم */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><PieChart className="w-5 h-5" /></div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">توزیع استقرار نیرو (بر اساس روز کارکرد)</h3>
          </div>
          <div className="w-full h-[300px]">
            {projectBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={projectBreakdown} 
                    cx="50%" cy="50%" 
                    innerRadius={65} outerRadius={90} 
                    paddingAngle={5} 
                    dataKey="value" 
                    nameKey="name"
                    stroke="none"
                    isAnimationActive={true} 
                    animationBegin={0}
                    animationDuration={400}
                    animationEasing="ease-out"
                  >
                    {projectBreakdown.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">اطلاعاتی ثبت نشده است.</div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">سودآوری این نیرو به تفکیک استقرار</h3>
          </div>
          <div className="w-full h-[300px]">
            {profitByProjectData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitByProjectData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontFamily="Vazirmatn" angle={-25} textAnchor="end" tickMargin={15} height={50} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(value) => `${(value / 1000000)}M`} fontFamily="Vazirmatn" width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="سود_خالص" name="سود خالص (تومان)" fill="#10b981" radius={[6, 6, 0, 0]} isAnimationActive={true} animationBegin={0} animationDuration={300} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">اطلاعات مالی یافت نشد.</div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}