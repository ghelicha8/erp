import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, DollarSign, Wrench, ShieldAlert, 
  Settings, FileText, Users, Truck, Calendar, Activity, 
  PieChart as PieIcon, BarChart3, Layers, Filter, CheckCircle2
} from 'lucide-react';
import moment from 'moment-jalaali';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

import { 
  useLogisticsStore, 
  calculateSmartDriverCostForVehicle 
} from '../../../store/logisticsStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useLaborStore } from '../../../store/laborStore';
import { 
  GlassDatePicker, 
  PortalSelect 
} from '../../../components/ui/SharedLaborUI';
import { formatCurrency, getCurrencyUnit } from '../../../core/utils/currency';

interface VehicleAnalyticsTabProps {
  vehicleId: string;
}

const PIE_COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'];

export default function VehicleAnalyticsTab({ vehicleId }: VehicleAnalyticsTabProps) {
  const { vehicles, logs, toolRentals, repairs, insurances, periodicServices, miscExpenses } = useLogisticsStore();
  const projects = useProjectStore(state => state.projects) || [];
  const workers = useLaborStore(state => state.workers) || [];

  const vehicle = vehicles.find(v => v.id === vehicleId);

  // فیلترها
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');

  // گزینه‌های دراپ‌داون راننده و پروژه
  const driverOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'همه رانندگان / اپراتورها' },
      ...workers.filter(w => w.status === 'ACTIVE').map(w => ({
        value: w.id,
        label: `${w.name} ${w.lastName}`
      }))
    ];
  }, [workers]);

  const projectOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'همه پروژه‌ها' },
      ...projects.map(p => ({
        value: p.id,
        label: p.name
      }))
    ];
  }, [projects]);

  // فیلتر لاگ‌های باربری
  const filteredLogs = useMemo(() => {
    return (logs || []).filter(l => {
      if (l.type !== 'TRANSPORT' || l.vehicleInfo !== vehicleId) return false;
      if (dateFrom && (l.date || '') < dateFrom) return false;
      if (dateTo && (l.date || '') > dateTo) return false;
      if (selectedDriverId !== 'ALL' && l.provider !== selectedDriverId) return false;
      if (selectedProjectId !== 'ALL' && l.projectId !== selectedProjectId) return false;
      return true;
    });
  }, [logs, vehicleId, dateFrom, dateTo, selectedDriverId, selectedProjectId]);

  // فیلتر اجاره ابزارآلات
  const filteredRentals = useMemo(() => {
    return (toolRentals || []).filter(r => {
      if (r.toolId !== vehicleId) return false;
      if (dateFrom && (r.startDate || '') < dateFrom) return false;
      if (dateTo && (r.startDate || '') > dateTo) return false;
      if (selectedDriverId !== 'ALL' && r.operatorId !== selectedDriverId) return false;
      if (selectedProjectId !== 'ALL' && r.projectId !== selectedProjectId) return false;
      return true;
    });
  }, [toolRentals, vehicleId, dateFrom, dateTo, selectedDriverId, selectedProjectId]);

  // فیلتر تعمیرات
  const filteredRepairs = useMemo(() => {
    return (repairs || []).filter(r => {
      if (r.vehicleId !== vehicleId) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [repairs, vehicleId, dateFrom, dateTo]);

  // فیلتر بیمه‌ها
  const filteredInsurances = useMemo(() => {
    return (insurances || []).filter(i => {
      if (i.vehicleId !== vehicleId) return false;
      if (dateFrom && i.startDate < dateFrom) return false;
      if (dateTo && i.startDate > dateTo) return false;
      return true;
    });
  }, [insurances, vehicleId, dateFrom, dateTo]);

  // فیلتر سرویس‌های دوره‌ای
  const filteredPeriodicServices = useMemo(() => {
    return (periodicServices || []).filter(p => {
      if (p.vehicleId !== vehicleId) return false;
      if (dateFrom && p.serviceDate < dateFrom) return false;
      if (dateTo && p.serviceDate > dateTo) return false;
      return true;
    });
  }, [periodicServices, vehicleId, dateFrom, dateTo]);

  // فیلتر هزینه‌های جانبی
  const filteredMisc = useMemo(() => {
    return (miscExpenses || []).filter(m => {
      if (m.vehicleId !== vehicleId) return false;
      if (dateFrom && m.date < dateFrom) return false;
      if (dateTo && m.date > dateTo) return false;
      return true;
    });
  }, [miscExpenses, vehicleId, dateFrom, dateTo]);

  // محاسبه دستمزد راننده با موتور هوشمند
  const driverCostData = useMemo(() => {
    return calculateSmartDriverCostForVehicle(vehicleId, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    });
  }, [vehicleId, dateFrom, dateTo]);

  // محاسبات کلان مالی
  const financialSummary = useMemo(() => {
    const freightRevenue = filteredLogs.reduce((sum, l) => sum + (l.billedCost || 0), 0);
    const rentalRevenue = filteredRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const totalRevenue = freightRevenue + rentalRevenue;
    const repairCost = filteredRepairs.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const insuranceCost = filteredInsurances.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const periodicCost = filteredPeriodicServices.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const miscCost = filteredMisc.reduce((sum, m) => sum + (m.amount || 0), 0);
    const operatorWages = filteredRentals.reduce((sum, r) => sum + (r.hasOperator ? (r.operatorTotalWage || 0) : 0), 0);
    const driverCost = driverCostData.totalDriverCost + operatorWages;

    const totalExpense = repairCost + insuranceCost + periodicCost + miscCost + driverCost;
    const netProfit = totalRevenue - totalExpense;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

    return {
      totalRevenue,
      repairCost,
      insuranceCost,
      periodicCost,
      miscCost,
      driverCost,
      totalExpense,
      netProfit,
      profitMargin,
      totalTrips: filteredLogs.reduce((sum, l) => sum + (l.qty || 1), 0) + filteredRentals.reduce((sum, r) => sum + (r.unitCount || 1), 0),
    };
  }, [filteredLogs, filteredRentals, filteredRepairs, filteredInsurances, filteredPeriodicServices, filteredMisc, driverCostData]);

  // داده‌های نمودار دایره‌ای (ترکیب هزینه‌ها)
  const pieData = useMemo(() => {
    const items = [
      { name: 'تعمیرات و قطعات', value: financialSummary.repairCost },
      { name: 'بیمه و گارانتی', value: financialSummary.insuranceCost },
      { name: 'سرویس‌های دوره‌ای', value: financialSummary.periodicCost },
      { name: 'هزینه‌های جانبی و سوخت', value: financialSummary.miscCost },
      { name: 'دستمزد راننده / اپراتور', value: financialSummary.driverCost },
    ].filter(i => i.value > 0);

    return items;
  }, [financialSummary]);

  // داده‌های ماهانه برای AreaChart و BarChart
  const monthlyTimelineData = useMemo(() => {
    const monthsMap = new Map<string, { month: string; income: number; expense: number; profit: number }>();

    // ماه‌های پیش‌فرض شش ماه اخیر
    const currentMom = moment();
    for (let i = 5; i >= 0; i--) {
      const mKey = moment(currentMom).subtract(i, 'jMonth').format('jYYYY/jMM');
      const mLabel = moment(currentMom).subtract(i, 'jMonth').format('jMMMM jYYYY');
      monthsMap.set(mKey, { month: mLabel, income: 0, expense: 0, profit: 0 });
    }

    // تجمیع درآمد باربری
    filteredLogs.forEach(l => {
      if (l.date && l.date.length >= 7) {
        const mKey = l.date.substring(0, 7);
        if (!monthsMap.has(mKey)) {
          const mLabel = moment(l.date, 'jYYYY/jMM/jDD').format('jMMMM jYYYY');
          monthsMap.set(mKey, { month: mLabel, income: 0, expense: 0, profit: 0 });
        }
        monthsMap.get(mKey)!.income += (l.billedCost || 0);
      }
    });

    // تجمیع درآمد اجاره ابزار
    filteredRentals.forEach(r => {
      if (r.startDate && r.startDate.length >= 7) {
        const mKey = r.startDate.substring(0, 7);
        if (!monthsMap.has(mKey)) {
          const mLabel = moment(r.startDate, 'jYYYY/jMM/jDD').format('jMMMM jYYYY');
          monthsMap.set(mKey, { month: mLabel, income: 0, expense: 0, profit: 0 });
        }
        monthsMap.get(mKey)!.income += (r.totalAmount || 0);
        if (r.hasOperator && r.operatorTotalWage) {
          monthsMap.get(mKey)!.expense += r.operatorTotalWage;
        }
      }
    });

    // تجمیع هزینه‌های تعمیرات
    filteredRepairs.forEach(r => {
      if (r.date && r.date.length >= 7) {
        const mKey = r.date.substring(0, 7);
        if (monthsMap.has(mKey)) {
          monthsMap.get(mKey)!.expense += (r.totalCost || 0);
        }
      }
    });

    // تجمیع بیمه
    filteredInsurances.forEach(ins => {
      if (ins.startDate && ins.startDate.length >= 7) {
        const mKey = ins.startDate.substring(0, 7);
        if (monthsMap.has(mKey)) {
          monthsMap.get(mKey)!.expense += (ins.totalAmount || 0);
        }
      }
    });

    // تجمیع سرویس‌های دوره‌ای
    filteredPeriodicServices.forEach(p => {
      if (p.serviceDate && p.serviceDate.length >= 7) {
        const mKey = p.serviceDate.substring(0, 7);
        if (monthsMap.has(mKey)) {
          monthsMap.get(mKey)!.expense += (p.totalCost || 0);
        }
      }
    });

    // تجمیع هزینه‌های جانبی
    filteredMisc.forEach(m => {
      if (m.date && m.date.length >= 7) {
        const mKey = m.date.substring(0, 7);
        if (monthsMap.has(mKey)) {
          monthsMap.get(mKey)!.expense += (m.amount || 0);
        }
      }
    });

    // محاسبه سود ماهانه
    const sortedList = Array.from(monthsMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, val]) => ({
        ...val,
        profit: val.income - val.expense
      }));

    return sortedList;
  }, [filteredLogs, filteredRepairs, filteredInsurances, filteredPeriodicServices, filteredMisc]);

  const isProfitable = financialSummary.netProfit >= 0;

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* نوار فیلترهای تحلیلی هوشمند */}
      <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/80 dark:border-slate-700/80 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 w-full xl:w-auto">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white">فیلترهای تحلیل و گزارش</h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">محدوده زمانی، راننده و پروژه مربوطه</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto">
          <div className="w-full sm:w-44">
            <label className="text-[10px] font-bold text-slate-400 block mb-1">از تاریخ:</label>
            <GlassDatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="شروع دوره"
            />
          </div>

          <div className="w-full sm:w-44">
            <label className="text-[10px] font-bold text-slate-400 block mb-1">تا تاریخ:</label>
            <GlassDatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="پایان دوره"
            />
          </div>

          <div className="w-full sm:w-44">
            <label className="text-[10px] font-bold text-slate-400 block mb-1">فیلتر راننده:</label>
            <PortalSelect
              value={selectedDriverId}
              onChange={(val) => setSelectedDriverId(String(val))}
              options={driverOptions}
              className="!h-[42px] !rounded-xl"
            />
          </div>

          <div className="w-full sm:w-44">
            <label className="text-[10px] font-bold text-slate-400 block mb-1">فیلتر پروژه:</label>
            <PortalSelect
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(String(val))}
              options={projectOptions}
              className="!h-[42px] !rounded-xl"
            />
          </div>
        </div>
      </div>



      {/* ردیف اول نمودارها: مقایسه روند درآمد و هزینه در طول زمان + سهم دسته‌بندی مخارج */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* نمودار مساحتی: روند زمانی درآمد در برابر هزینه (AreaChart) */}
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/80 dark:border-slate-700/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" /> روند ماهانه درآمد و هزینه‌ها
              </h3>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">مقایسه کارکرد باربری در مقابل کل مخارج دوره‌ای</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> درآمد
              </div>
              <div className="flex items-center gap-1.5 text-rose-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> مخارج
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTimelineData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  formatter={(val: any) => [`${Number(val).toLocaleString('fa-IR')} ${getCurrencyUnit()}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid #334155', color: '#fff', fontSize: '11px', direction: 'rtl' }}
                />
                <Area type="monotone" dataKey="income" name="درآمد باربری" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" name="مخارج خودرو" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* نمودار دونات: تفکیک سهم مخارج خودرو (PieChart) */}
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/80 dark:border-slate-700/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-500" /> ترکیب و سهم‌بندی مخارج خودرو
              </h3>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">تفکیک هزینه‌ها بر اساس دسته‌بندی فنی و عملیاتی</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              کل: {formatCurrency(financialSummary.totalExpense)}
            </span>
          </div>

          {pieData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs font-bold">
              هنوز هزینه‌ای برای این خودرو در بازه انتخابی ثبت نشده است.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-64">
              <div className="h-full w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`${Number(val).toLocaleString('fa-IR')} ${getCurrencyUnit()}`, '']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid #334155', color: '#fff', fontSize: '11px', direction: 'rtl' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full sm:w-1/2 space-y-2">
                {pieData.map((entry, idx) => {
                  const share = financialSummary.totalExpense > 0 
                    ? ((entry.value / financialSummary.totalExpense) * 100).toFixed(0)
                    : 0;
                  return (
                    <div key={entry.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="font-bold text-slate-700 dark:text-slate-200">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400 text-[10px]">({share}%)</span>
                        <span className="font-black text-slate-800 dark:text-white">{formatCurrency(entry.value)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ردیف دوم نمودارها: سود / زیان خالص ماهانه (BarChart) */}
      <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/80 dark:border-slate-700/80 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" /> تراز سود / زیان ماهانه خودرو
            </h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">میله‌های سبز نشانگر سوددهی و میله‌های قرمز نشانگر هزینه‌بر بودن خودرو هستند</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTimelineData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip 
                formatter={(val: any) => [`${Number(val).toLocaleString('fa-IR')} ${getCurrencyUnit()}`, 'سود خالص']}
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid #334155', color: '#fff', fontSize: '11px', direction: 'rtl' }}
              />
              <Bar dataKey="profit" name="سود/زیان خالص" radius={[8, 8, 0, 0]}>
                {monthlyTimelineData.map((entry, index) => (
                  <Cell 
                    key={`bar-${index}`} 
                    fill={entry.profit >= 0 ? '#10b981' : '#f43f5e'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
