import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment-jalaali';
import { 
  CalendarDays, Wallet, TrendingDown, TrendingUp, 
  Clock, AlertTriangle, UserX, ShieldAlert, BadgeInfo, 
  Coins, CheckCircle2, FileText, ChevronLeft, ShieldCheck, 
  Percent, Printer, Receipt, Building, Check, ArrowDownRight,
  Layers, User, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

// استورهای گلوبال (ارتباط لاجیک کارگر و مالی)
import { useLaborStore } from '../../../store/laborStore';
import { useFinanceStore } from '../../../store/financeStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { generateUUID } from '../../../core/utils/uuid';

// کامپوننت‌های گرافیکی یکپارچه
import { PortalSelect, GlassScrollStyles } from '../../../components/ui/SharedLaborUI';

const formatAmount = (amount: number) => new Intl.NumberFormat('fa-IR').format(amount);

export default function LaborMonthlyTab({ workerId }: { workerId: string }) {
  const { workers, logs, addLog, updateWorker } = useLaborStore();
  const { transactions, addTransaction } = useFinanceStore();
  const { currency } = useSettingsStore(state => state.settings);
  const isRial = currency === 'rial' || (currency as any) === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';
  const multiplier = isRial ? 10 : 1;
  
  const worker = workers.find(w => w.id === workerId);
  const activeContracts = worker?.activeContracts?.filter(c => c.isActive) || [];

  // انتخابگر قرارداد فعال
  const [selectedContractId, setSelectedContractId] = useState<string | null>(activeContracts[0]?.id || null);
  const [isPaySlipOpen, setIsPaySlipOpen] = useState(false);
  const [isEditingRates, setIsEditingRates] = useState(false);
  const [tempEmpRate, setTempEmpRate] = useState<number>(7);
  const [tempEmplyrRate, setTempEmplyrRate] = useState<number>(23);

  const currentContract = useMemo(() => {
    return activeContracts.find(c => c.id === selectedContractId) || activeContracts[0];
  }, [activeContracts, selectedContractId]);

  // هماهنگی استیت موقت با قرارداد جاری
  React.useEffect(() => {
    if (currentContract) {
      setTempEmpRate(currentContract.employeeInsuranceRate ?? 7);
      setTempEmplyrRate(currentContract.employerInsuranceRate ?? 23);
    }
  }, [currentContract?.id, currentContract?.employeeInsuranceRate, currentContract?.employerInsuranceRate]);

  // موتور محاسبات هوشمند قرارداد و مالی با احتساب کسورات و سهم بیمه
  const contractStats = useMemo(() => {
    if (!currentContract) return null;

    const start = moment(currentContract.startDate, 'jYYYY/jMM/jDD');
    const end = moment(currentContract.endDate, 'jYYYY/jMM/jDD');
    const today = moment();

    // محاسبه بازه زمانی
    const totalDays = Math.max(1, end.diff(start, 'days') + 1);
    const elapsedDays = Math.max(0, Math.min(totalDays, today.diff(start, 'days')));
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

    // نرخ موظفی روزانه و حقوق پایه کل دوره
    const dailyWage = Math.round(currentContract.internalMonthlyWage / 30);
    const totalExpectedWage = dailyWage * totalDays;

    // استخراج تراکنش‌های مالی این کارگر در این بازه (مساعده، جریمه، پاداش)
    let totalAdvances = 0;
    let totalPenalties = 0;
    let totalBonuses = 0;

    const relevantTxs = transactions.filter(tx => 
      tx.allocations?.some(al => al.recordType === 'LABOR' && al.recordId === workerId) &&
      tx.date >= currentContract.startDate && tx.date <= currentContract.endDate
    );

    relevantTxs.forEach(tx => {
      const desc = tx.description || '';
      if (desc.includes('مساعده')) totalAdvances += tx.amount;
      else if (desc.includes('پاداش')) totalBonuses += tx.amount;
      else if (desc.includes('جریمه') || desc.includes('کسورات')) totalPenalties += tx.amount;
    });

    // استخراج لاگ‌های حضور و غیاب برای کسر کارکرد
    let absentDays = 0;
    let unpaidLeaves = 0;

    const relevantLogs = logs.filter(l => 
      l.workerId === workerId && 
      l.date >= currentContract.startDate && l.date <= currentContract.endDate
    );

    relevantLogs.forEach(l => {
      if (l.attendance === 'ABSENT') absentDays++;
      if (l.attendance === 'UNPAID_LEAVE') unpaidLeaves++;
    });

    // کسر غیبت‌ها از حقوق پایه
    const deductionForAbsence = (absentDays + unpaidLeaves) * dailyWage;

    // 💡 حقوق ناخالص مشمول بیمه (Gross Wage)
    const grossWage = Math.max(0, totalExpectedWage + totalBonuses - deductionForAbsence);

    // 💡 محاسبات قانونی بیمه تأمین اجتماعی
    const employeeInsuranceRate = currentContract.employeeInsuranceRate ?? 7;
    const employerInsuranceRate = currentContract.employerInsuranceRate ?? 23;

    // کسر سهم بیمه کارگر (۷٪ از حقوق ناخالص)
    const employeeInsuranceAmount = Math.round(grossWage * (employeeInsuranceRate / 100));

    // سهم بیمه کارفرما (۲۳٪ از حقوق ناخالص - هزینه سربار شرکت)
    const employerInsuranceAmount = Math.round(grossWage * (employerInsuranceRate / 100));

    // مجموع کل کسورات از کارگر
    const totalDeductions = employeeInsuranceAmount + totalAdvances + totalPenalties;

    // خالص پرداختی نهایی به کارگر (Net Take-home)
    const netPayable = Math.max(0, grossWage - employeeInsuranceAmount - totalAdvances - totalPenalties);

    // بهای تمام‌شده و هزینه قطعی شرکت در دفاتر حسابداری
    const companyTotalCost = grossWage + employerInsuranceAmount;

    return {
      totalDays, elapsedDays, remainingDays, progress,
      dailyWage, totalExpectedWage, grossWage,
      totalAdvances, totalPenalties, totalBonuses,
      absentDays, unpaidLeaves, deductionForAbsence,
      employeeInsuranceRate, employerInsuranceRate,
      employeeInsuranceAmount, employerInsuranceAmount,
      totalDeductions,
      netPayable, companyTotalCost
    };
  }, [currentContract, transactions, logs, workerId]);

  // ثبت سریع نرخ‌های جدید بیمه
  const handleSaveInsuranceRates = () => {
    if (!worker || !currentContract) return;
    const updatedContracts = worker.activeContracts?.map(c => 
      c.id === currentContract.id ? { 
        ...c, 
        employeeInsuranceRate: Number(tempEmpRate), 
        employerInsuranceRate: Number(tempEmplyrRate) 
      } : c
    );
    updateWorker(workerId, { activeContracts: updatedContracts });
    setIsEditingRates(false);
    toast.success('درصدهای بیمه برای این قرارداد به‌روزرسانی شد.');
  };

  // اکشن‌های سریع: ثبت غیبت یا مرخصی بدون حقوق
  const handleQuickLog = (type: 'ABSENT' | 'UNPAID_LEAVE') => {
    if (!worker) return;
    const today = moment().format('jYYYY/jMM/jDD');
    
    const exists = logs.some(l => l.workerId === workerId && l.date === today);
    if (exists) {
      toast.error('برای امروز قبلاً وضعیت حضور ثبت شده است!');
      return;
    }

    addLog({
      workerId: worker.id,
      workerName: `${worker.name} ${worker.lastName}`,
      date: today,
      projectId: currentContract?.projectId || 'FREE',
      attendance: type,
      paymentType: 'MONTHLY',
      workerUnit: 'DAY',
      workerQuantity: 1,
      workerRate: contractStats?.dailyWage || 0,
      billedUnit: 'DAY',
      billedQuantity: 1,
      billedRate: 0,
      isCoveredByUsMonthly: true,
      workType: type === 'ABSENT' ? 'غیبت در طول قرارداد ماهانه' : 'مرخصی بدون حقوق',
      appliedStandardWorkHours: worker.standardWorkHours || 8
    });
    
    toast.success(type === 'ABSENT' ? 'غیبت ثبت شد و از حقوق کسر می‌گردد.' : 'مرخصی بدون حقوق ثبت شد.');
  };

  // تسویه و بستن حساب این ماه و ثبت خودکار در دفاتر مالی
  const handleSettleContract = () => {
    if (!worker || !currentContract || !contractStats) return;

    const today = moment().format('jYYYY/jMM/jDD');
    const txId = generateUUID();

    // ثبت تراکنش در استور مالی
    addTransaction({
      referenceId: `LABOR-SETTLE-${Date.now().toString().slice(-6)}`,
      amount: contractStats.netPayable,
      date: today,
      direction: 'OUT',
      type: 'CASH',
      description: `تسویه حقوق ماهانه ${worker.name} ${worker.lastName} (${currentContract.title}) - ناخالص: ${formatAmount(contractStats.grossWage)} | بیمه کارگر: ${formatAmount(contractStats.employeeInsuranceAmount)} | سهم کارفرما: ${formatAmount(contractStats.employerInsuranceAmount)}`,
      allocations: [{
        id: generateUUID(),
        amount: contractStats.netPayable,
        allocationType: currentContract.projectId !== 'FREE' ? 'PROJECT' : 'FREELANCE',
        projectId: currentContract.projectId !== 'FREE' ? currentContract.projectId : undefined,
        recordType: 'LABOR',
        recordId: workerId,
        description: `حقوق ماهانه تسویه‌شده - ${currentContract.title}`
      }]
    });

    // بستن وضعیت قرارداد و ثبت اطلاعات تسویه
    const updatedContracts = worker.activeContracts?.map(c => 
      c.id === currentContract.id ? { 
        ...c, 
        isActive: false,
        settledAt: today,
        settledNetPayable: contractStats.netPayable,
        settledEmployerCost: contractStats.companyTotalCost,
        financeTransactionId: txId
      } : c
    );

    updateWorker(workerId, { activeContracts: updatedContracts });
    toast.success('قرارداد ماهانه تسویه شد و سند مالی به دفاتر حسابداری ارسال گردید.');
  };

  // پرینت فیش حقوقی
  const handlePrintSlip = () => {
    window.print();
  };

  if (!worker) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full flex flex-col gap-6 relative z-0 pb-10">
      <GlassScrollStyles />

      {/* اگر هیچ قراردادی نبود */}
      {!currentContract || !contractStats ? (
        <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[2.5rem] bg-white/40 dark:bg-slate-800/40">
           <CalendarDays className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
           <h3 className="text-base font-black text-slate-700 dark:text-slate-300 mb-1">قرارداد ماهانه فعالی یافت نشد</h3>
           <p className="text-xs font-bold text-slate-500">جهت مدیریت ماهانه، ابتدا یک قرارداد در تب مربوطه ثبت کنید.</p>
        </div>
      ) : (
        <>
          {/* هدر: انتخاب قرارداد و هشدار پایان ماه */}
          <div className="flex flex-col gap-4">
            {activeContracts.length > 1 && (
              <div className="w-full sm:w-1/2 lg:w-1/3 relative z-50">
                <PortalSelect 
                  options={activeContracts.map(c => ({ id: c.id, label: c.title, icon: FileText }))} 
                  value={selectedContractId || currentContract.id} 
                  onChange={(val: string) => setSelectedContractId(val)} 
                  placeholder="انتخاب قرارداد ماهانه"
                />
              </div>
            )}

            {/* نوار پیشرفت زمان */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-3xl p-5 relative overflow-hidden">
              <div className="flex justify-between items-end mb-3 relative z-10">
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500"/> زمان سپری شده از قرارداد: {currentContract.title}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 mt-1">{currentContract.startDate} تا {currentContract.endDate}</span>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-black ${contractStats.remainingDays <= 3 ? 'text-rose-500 animate-pulse' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {contractStats.remainingDays > 0 ? `${contractStats.remainingDays} روز مانده` : 'پایان دوره قرارداد!'}
                  </span>
                </div>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative z-10 shadow-inner">
                <motion.div 
                  initial={{ width: 0 }} animate={{ width: `${contractStats.progress}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${contractStats.remainingDays <= 3 ? 'bg-gradient-to-r from-rose-500 to-red-500' : 'bg-gradient-to-r from-indigo-500 to-fuchsia-500'}`} 
                />
              </div>
              
              {/* هشدار داینامیک روزهای پایانی */}
              <AnimatePresence>
                {contractStats.remainingDays <= 5 && contractStats.remainingDays > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300">توجه: تنها {contractStats.remainingDays} روز تا پایان قرارداد باقیست. جهت تمدید یا تسویه حساب اقدام کنید.</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* کارت تنظیم سریع درصدهای بیمه (Quick Adjust Bar) */}
          <div className="bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-3xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                    تنظیمات کسورات و سهم بیمه تأمین اجتماعی
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                      محاسبه خودکار
                    </span>
                  </h4>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                    سهم کارگر از حقوق کسر شده و سهم کارفرما به عنوان هزینه سربار دفاتر مالی ثبت می‌شود.
                  </p>
                </div>
              </div>

              {!isEditingRates ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-xs font-black text-rose-600 dark:text-rose-400">
                    <span>سهم کارگر:</span>
                    <span className="font-mono">{contractStats.employeeInsuranceRate}٪</span>
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 text-xs font-black text-indigo-600 dark:text-indigo-400">
                    <span>سهم کارفرما:</span>
                    <span className="font-mono">{contractStats.employerInsuranceRate}٪</span>
                  </div>
                  <button 
                    onClick={() => setIsEditingRates(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-all shadow-sm"
                  >
                    تغییر درصدها
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">کارگر:</span>
                    <input 
                      type="number" 
                      min={0} 
                      max={100} 
                      step={0.5}
                      value={tempEmpRate} 
                      onChange={e => setTempEmpRate(Number(e.target.value))}
                      className="w-16 h-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-black"
                    />
                    <span className="text-xs font-bold text-slate-400">٪</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">کارفرما:</span>
                    <input 
                      type="number" 
                      min={0} 
                      max={100} 
                      step={0.5}
                      value={tempEmplyrRate} 
                      onChange={e => setTempEmplyrRate(Number(e.target.value))}
                      className="w-16 h-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-black"
                    />
                    <span className="text-xs font-bold text-slate-400">٪</span>
                  </div>

                  <button 
                    onClick={handleSaveInsuranceRates}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-black hover:bg-emerald-600 shadow-sm transition-all"
                  >
                    ذخیره
                  </button>
                  <button 
                    onClick={() => setIsEditingRates(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 transition-all"
                  >
                    انصراف
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* داشبورد ۵ تکه‌ی مالی و بیمه */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* ناخالص کل دوره */}
            <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-3xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">حقوق ناخالص دوره</span>
              </div>
              <div>
                <div className="text-lg font-black font-mono text-slate-800 dark:text-white" dir="ltr">
                  {formatAmount(contractStats.grossWage * multiplier)} <span className="text-[10px] text-slate-400">{currencyLabel}</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 block mt-1">
                  پایه موظفی + پاداش‌ها - غیبت
                </span>
              </div>
            </div>

            {/* کسر سهم بیمه کارگر */}
            <div className="bg-rose-50/50 dark:bg-rose-950/20 backdrop-blur-xl border border-rose-200 dark:border-rose-900/40 shadow-sm rounded-3xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl">
                  <Percent className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-rose-700 dark:text-rose-400">کسر بیمه کارگر ({contractStats.employeeInsuranceRate}٪)</span>
              </div>
              <div>
                <div className="text-lg font-black font-mono text-rose-600 dark:text-rose-400" dir="ltr">
                  - {formatAmount(contractStats.employeeInsuranceAmount * multiplier)} <span className="text-[10px]">{currencyLabel}</span>
                </div>
                <span className="text-[9px] font-bold text-rose-500/70 block mt-1">
                  کسر از دریافتی پرسنل
                </span>
              </div>
            </div>

            {/* سایر کسورات (مساعده، جریمه) */}
            <div className="bg-slate-50 dark:bg-slate-800/40 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-3xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-amber-700 dark:text-amber-400">مساعده و جریمه</span>
              </div>
              <div>
                <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400" dir="ltr">
                  - {formatAmount((contractStats.totalAdvances + contractStats.totalPenalties) * multiplier)} <span className="text-[10px]">{currencyLabel}</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 block mt-1">
                  مساعده: {formatAmount(contractStats.totalAdvances * multiplier)} | جریمه: {formatAmount(contractStats.totalPenalties * multiplier)}
                </span>
              </div>
            </div>

            {/* خالص دریافتی پرسنل (Net Payable) */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20 rounded-3xl p-5 flex flex-col justify-between text-white relative overflow-hidden">
              <div className="flex items-center gap-2.5 mb-3 relative z-10">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Coins className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-white/95">خالص پرداختی به کارگر</span>
              </div>
              <div className="relative z-10">
                <div className="text-xl font-black font-mono" dir="ltr">
                  {formatAmount(contractStats.netPayable * multiplier)} <span className="text-xs text-white/80">{currencyLabel}</span>
                </div>
                <span className="text-[9px] font-bold text-white/75 block mt-1">
                  دریافتی نهایی پرسنل
                </span>
              </div>
            </div>

            {/* سهم بیمه کارفرما و بهای تمام‌شده شرکت */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/20 rounded-3xl p-5 flex flex-col justify-between text-white relative overflow-hidden">
              <div className="flex items-center gap-2.5 mb-3 relative z-10">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Building className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-white/95">هزینه تمام‌شده شرکت</span>
              </div>
              <div className="relative z-10">
                <div className="text-xl font-black font-mono" dir="ltr">
                  {formatAmount(contractStats.companyTotalCost * multiplier)} <span className="text-xs text-white/80">{currencyLabel}</span>
                </div>
                <span className="text-[9px] font-bold text-white/75 block mt-1">
                  شامل {contractStats.employerInsuranceRate}٪ سهم کارفرما ({formatAmount(contractStats.employerInsuranceAmount * multiplier)})
                </span>
              </div>
            </div>

          </div>

          {/* بخش پیش‌نمایش و صدور فیش حقوقی رسمی (Pay Slip) */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    فیش رسمی حقوق و دستمزد پرسنلی
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    شناسه قرارداد: {currentContract.id.slice(0, 8)} | بازه: {currentContract.startDate} تا {currentContract.endDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintSlip}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-black transition-all shadow-sm"
                >
                  <Printer className="w-4 h-4" /> چاپ فیش
                </button>
              </div>
            </div>

            {/* برگه فیش حقوقی شیشه‌ای استاندارد */}
            <div className="mt-5 p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 print:border-black">
              
              {/* هدر فیش */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-300 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white">
                      {worker.name} {worker.lastName}
                    </h4>
                    <span className="text-[11px] font-bold text-slate-500">
                      کد ملی: {worker.nationalId || 'ثبت‌نشده'} | شماره بیمه: {worker.insuranceCode || 'دارای قرارداد کاری'}
                    </span>
                  </div>
                </div>

                <div className="text-left text-xs font-bold text-slate-500">
                  <span>سیستم یکپارچه پیمان ERP</span>
                  <div className="text-[10px] font-mono mt-0.5 text-slate-400">تاریخ صدور: {moment().format('jYYYY/jMM/jDD')}</div>
                </div>
              </div>

              {/* جدول دو ستونه درآمدها و کسورات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                
                {/* ستون راست: درآمدها و مزایا */}
                <div className="space-y-3">
                  <h5 className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 pb-2 border-b border-emerald-200 dark:border-emerald-900/40">
                    <TrendingUp className="w-4 h-4" /> درآمدها و مزایای کارکرد
                  </h5>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span>حقوق پایه موظفی ({contractStats.totalDays} روز):</span>
                    <span className="font-mono font-black" dir="ltr">{formatAmount(contractStats.totalExpectedWage * multiplier)} {currencyLabel}</span>
                  </div>

                  {contractStats.totalBonuses > 0 && (
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <span>پاداش و اضافات کارگاهی:</span>
                      <span className="font-mono font-black" dir="ltr">+ {formatAmount(contractStats.totalBonuses * multiplier)} {currencyLabel}</span>
                    </div>
                  )}

                  {contractStats.deductionForAbsence > 0 && (
                    <div className="flex items-center justify-between text-xs font-bold text-rose-500">
                      <span>کسر غیبت ({contractStats.absentDays + contractStats.unpaidLeaves} روز):</span>
                      <span className="font-mono font-black" dir="ltr">- {formatAmount(contractStats.deductionForAbsence * multiplier)} {currencyLabel}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-black text-slate-800 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>مجموع ناخالص حقوق مشمول:</span>
                    <span className="font-mono text-sm text-blue-600 dark:text-blue-400" dir="ltr">
                      {formatAmount(contractStats.grossWage * multiplier)} {currencyLabel}
                    </span>
                  </div>
                </div>

                {/* ستون چپ: کسورات قانونی و مالی */}
                <div className="space-y-3">
                  <h5 className="text-xs font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5 pb-2 border-b border-rose-200 dark:border-rose-900/40">
                    <TrendingDown className="w-4 h-4" /> کسورات قانونی، بیمه و مساعده
                  </h5>

                  <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400">
                    <span>کسر حق بیمه سهم کارگر ({contractStats.employeeInsuranceRate}٪):</span>
                    <span className="font-mono font-black" dir="ltr">- {formatAmount(contractStats.employeeInsuranceAmount * multiplier)} {currencyLabel}</span>
                  </div>

                  {contractStats.totalAdvances > 0 && (
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                      <span>مساعده‌های دریافتی بین ماه:</span>
                      <span className="font-mono font-black" dir="ltr">- {formatAmount(contractStats.totalAdvances * multiplier)} {currencyLabel}</span>
                    </div>
                  )}

                  {contractStats.totalPenalties > 0 && (
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                      <span>جریمه یا سایر کسورات:</span>
                      <span className="font-mono font-black" dir="ltr">- {formatAmount(contractStats.totalPenalties * multiplier)} {currencyLabel}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-black text-slate-800 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>مجموع کل کسورات از پرسنل:</span>
                    <span className="font-mono text-sm text-rose-600 dark:text-rose-400" dir="ltr">
                      - {formatAmount(contractStats.totalDeductions * multiplier)} {currencyLabel}
                    </span>
                  </div>
                </div>

              </div>

              {/* باکس جمع‌بندی نهایی فیش حقوقی */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* کارت سبز: خالص پرداختی به پرسنل */}
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">خالص قابل پرداخت به نیرو:</span>
                    <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">حقوق ناخالص منهای ۷٪ بیمه و مساعده</span>
                  </div>
                  <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400" dir="ltr">
                    {formatAmount(contractStats.netPayable * multiplier)} <span className="text-xs">{currencyLabel}</span>
                  </div>
                </div>

                {/* کارت بنفش: بهای تمام‌شده و سهم کارفرما برای شرکت */}
                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 block">هزینه قطعی دفاتر شرکت:</span>
                    <span className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400">ناخالص + {contractStats.employerInsuranceRate}٪ سهم کارفرما ({formatAmount(contractStats.employerInsuranceAmount * multiplier)})</span>
                  </div>
                  <div className="text-lg font-black font-mono text-indigo-700 dark:text-indigo-400" dir="ltr">
                    {formatAmount(contractStats.companyTotalCost * multiplier)} <span className="text-xs">{currencyLabel}</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* ابزارهای عملیات سریع */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <UserX className="w-8 h-8 text-rose-400" />
                 <div className="flex flex-col">
                   <span className="text-sm font-black text-slate-800 dark:text-slate-200">ثبت غیبت امروز</span>
                   <span className="text-[10px] font-bold text-slate-500 mt-0.5">کسر {formatAmount(contractStats.dailyWage * multiplier)} {currencyLabel} از حقوق</span>
                 </div>
               </div>
               <button onClick={() => handleQuickLog('ABSENT')} className="px-4 py-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black transition-colors shadow-sm">ثبت غیبت</button>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
               <div className="flex items-center gap-3">
                 <BadgeInfo className="w-8 h-8 text-amber-500" />
                 <div className="flex flex-col">
                   <span className="text-sm font-black text-slate-800 dark:text-slate-200">عملیات مالی و مساعده</span>
                   <span className="text-[10px] font-bold text-slate-500 mt-0.5">ثبت در تب «مدیریت مالی»</span>
                 </div>
               </div>
               <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-800/50 rounded-xl text-[10px] font-bold text-center leading-relaxed">
                 جهت اعمال خودکار مساعده، پاداش یا جریمه در اینجا،<br/>کافیست در تب مالی کلمات (مساعده، پاداش، جریمه) را در شرح بنویسید.
               </div>
            </div>
          </div>

          {/* دکمه تسویه نهایی و ثبت سند مالی */}
          <div className="pt-4">
            <button 
              onClick={handleSettleContract}
              disabled={contractStats.remainingDays > 5}
              className={`w-full py-5 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-lg ${
                contractStats.remainingDays <= 5 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_15px_30px_rgba(16,185,129,0.3)] active:scale-[0.98]' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-6 h-6" />
              بستن حساب این ماه، صدور فیش و ثبت سند مالی ({formatAmount(contractStats.netPayable * multiplier)} {currencyLabel})
            </button>
            {contractStats.remainingDays > 5 && (
              <p className="text-center text-[10px] font-bold text-slate-500 mt-3">دکمه تسویه حساب، ۵ روز مانده به پایان قرارداد فعال خواهد شد.</p>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}