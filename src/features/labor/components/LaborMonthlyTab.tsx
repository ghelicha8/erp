import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment-jalaali';
import { 
  CalendarDays, Wallet, TrendingDown, TrendingUp, 
  Clock, AlertTriangle, UserX, BadgeInfo, 
  Coins, CheckCircle2, FileText, 
} from 'lucide-react';
import { toast } from 'sonner';

// استورهای گلوبال (ارتباط لاجیک کارگر و مالی)
import { useLaborStore } from '../../../store/laborStore';
import { useFinanceStore } from '../../../store/financeStore';

// کامپوننت‌های گرافیکی یکپارچه
import { PortalSelect, GlassScrollStyles } from '../../../components/ui/SharedLaborUI';

const formatAmount = (amount: number) => new Intl.NumberFormat('fa-IR').format(amount);

export default function LaborMonthlyTab({ workerId }: { workerId: string }) {
  const { workers, logs, addLog, updateWorker } = useLaborStore();
  const { transactions } = useFinanceStore();
  
  const worker = workers.find(w => w.id === workerId);
  const activeContracts = worker?.activeContracts?.filter(c => c.isActive) || [];

  // 💡 انتخابگر قرارداد فعال (اگر چند قرارداد ماهانه همزمان داشت)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(activeContracts[0]?.id || null);
  
  const currentContract = useMemo(() => {
    return activeContracts.find(c => c.id === selectedContractId) || activeContracts[0];
  }, [activeContracts, selectedContractId]);

  // 💡 موتور محاسبات هوشمند قرارداد و مالی
  const contractStats = useMemo(() => {
    if (!currentContract) return null;

    const start = moment(currentContract.startDate, 'jYYYY/jMM/jDD');
    const end = moment(currentContract.endDate, 'jYYYY/jMM/jDD');
    const today = moment();

    // محاسبه بازه زمانی
    const totalDays = Math.max(1, end.diff(start, 'days') + 1); // +1 برای اینکه روز اول هم حساب بشه
    const elapsedDays = Math.max(0, Math.min(totalDays, today.diff(start, 'days')));
    const remainingDays = totalDays - elapsedDays;
    const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

    // محاسبه حقوق پایه (تناسبی - Prorated)
    const dailyWage = Math.round(currentContract.internalMonthlyWage / 30);
    const totalExpectedWage = dailyWage * totalDays; // اگه قرارداد 45 روزه باشه، حقوق 45 روز رو حساب میکنه

    // استخراج تراکنش‌های مالی این کارگر تو این بازه (مساعده، جریمه، پاداش)
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

    // خالص پرداختی (Net Payable)
    const netPayable = totalExpectedWage + totalBonuses - totalAdvances - totalPenalties - deductionForAbsence;

    return {
      totalDays, elapsedDays, remainingDays, progress,
      dailyWage, totalExpectedWage,
      totalAdvances, totalPenalties, totalBonuses,
      absentDays, unpaidLeaves, deductionForAbsence,
      netPayable
    };
  }, [currentContract, transactions, logs, workerId]);

  // اکشن‌های سریع: ثبت غیبت یا مرخصی بدون حقوق
  const handleQuickLog = (type: 'ABSENT' | 'UNPAID_LEAVE') => {
    if (!worker) return;
    const today = moment().format('jYYYY/jMM/jDD');
    
    // جلوگیری از ثبت تکراری
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
      appliedStandardWorkHours: worker.standardWorkHours || 8,
      advancePayment: 0
    });
    
    toast.success(type === 'ABSENT' ? 'غیبت ثبت شد و از حقوق کسر می‌گردد.' : 'مرخصی بدون حقوق ثبت شد.');
  };

  // تسویه و بستن قرارداد
  const handleSettleContract = () => {
    if (!worker || !currentContract) return;
    const updatedContracts = worker.activeContracts?.map(c => 
      c.id === currentContract.id ? { ...c, isActive: false } : c
    );
    updateWorker(workerId, { activeContracts: updatedContracts });
    toast.success('قرارداد ماهانه با موفقیت بسته و تسویه شد.');
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

            {/* نوار پیشرفت زمان (Progress Bar) */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-3xl p-5 relative overflow-hidden">
              <div className="flex justify-between items-end mb-3 relative z-10">
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-500"/> زمان سپری شده از قرارداد</span>
                  <span className="text-[10px] font-bold text-slate-500 mt-1">{currentContract.startDate} تا {currentContract.endDate}</span>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-black ${contractStats.remainingDays <= 3 ? 'text-rose-500 animate-pulse' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {contractStats.remainingDays > 0 ? `${contractStats.remainingDays} روز مانده` : 'پایان قرارداد!'}
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

          {/* داشبورد ۴ تکه‌ی مالی */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* حقوق پایه موظفی */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-3xl p-5 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl"><Wallet className="w-5 h-5" /></div>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">حقوق کل دوره</span>
              </div>
              <div className="text-lg font-black font-mono text-slate-800 dark:text-white" dir="ltr">
                {formatAmount(contractStats.totalExpectedWage)} <span className="text-[10px] text-slate-400">تومان</span>
              </div>
            </div>

            {/* کسورات و مساعده‌ها */}
            <div className="bg-rose-50/50 dark:bg-rose-900/10 backdrop-blur-xl border border-rose-200 dark:border-rose-800/50 shadow-sm rounded-3xl p-5 flex flex-col justify-between hover:shadow-md transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl group-hover:scale-110 transition-transform"><TrendingDown className="w-5 h-5" /></div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-rose-700 dark:text-rose-400">مجموع کسورات</span>
                  <span className="text-[9px] font-bold text-rose-500/70 dark:text-rose-500/70">مساعده، غیبت، جریمه</span>
                </div>
              </div>
              <div className="text-lg font-black font-mono text-rose-600 dark:text-rose-400" dir="ltr">
                {formatAmount(contractStats.totalAdvances + contractStats.deductionForAbsence + contractStats.totalPenalties)} <span className="text-[10px] text-rose-400">تومان</span>
              </div>
            </div>

            {/* اضافات و پاداش */}
            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 backdrop-blur-xl border border-emerald-200 dark:border-emerald-800/50 shadow-sm rounded-3xl p-5 flex flex-col justify-between hover:shadow-md transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform"><TrendingUp className="w-5 h-5" /></div>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">پاداش و اضافات</span>
              </div>
              <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">
                {formatAmount(contractStats.totalBonuses)} <span className="text-[10px] text-emerald-400">تومان</span>
              </div>
            </div>

            {/* مانده قابل پرداخت (Net Payable) */}
            <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-[0_15px_30px_rgba(99,102,241,0.3)] rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-2.5 bg-white/20 text-white rounded-xl"><Coins className="w-5 h-5" /></div>
                <span className="text-xs font-black text-white/90">خالص قابل پرداخت</span>
              </div>
              <div className="text-2xl font-black font-mono text-white relative z-10 drop-shadow-md" dir="ltr">
                {formatAmount(contractStats.netPayable)} <span className="text-xs text-white/70 font-bold">تومان</span>
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
                   <span className="text-[10px] font-bold text-slate-500 mt-0.5">کسر {formatAmount(contractStats.dailyWage)} تومان از حقوق</span>
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

          {/* دکمه تسویه نهایی (فقط روزهای آخر فعال و بولد می‌شه) */}
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
              بستن حساب این ماه و صدور فیش حقوقی
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