import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Wrench, Wallet, ShieldAlert, FileText, Settings, 
  Activity, Edit2, FileDown, FileUp, DollarSign, TrendingUp, TrendingDown,
  Layers, Handshake, PenTool, Hash, Ban, ShieldCheck
} from 'lucide-react';
import moment from 'moment-jalaali';
import { toast } from 'sonner';

import { useLogisticsStore, type ToolStatus } from '../../../store/logisticsStore';
import { useFinanceStore } from '../../../store/financeStore';
import { PortalSelect } from '../../../components/ui/SharedLaborUI';
import ThreeDTabs from '../../../components/ui/ThreeDTabs';

import ToolFormModal from './ToolFormModal';
import ToolRentalTab from './ToolRentalTab';
import ToolRentalModal from './ToolRentalModal';
import VehicleFinanceTab from './VehicleFinanceTab';
import VehicleRepairTab from './VehicleRepairTab';
import VehicleRepairModal from './VehicleRepairModal';
import VehicleInsuranceTab from './VehicleInsuranceTab';
import VehicleInsuranceModal from './VehicleInsuranceModal';
import VehicleMiscTab from './VehicleMiscTab';
import VehicleMiscModal from './VehicleMiscModal';
import PeriodicServiceTab from './PeriodicServiceTab';
import PeriodicServiceModal from './PeriodicServiceModal';
import VehicleAnalyticsTab from './VehicleAnalyticsTab';
import UniversalTransactionModal from '../../../components/shared/UniversalTransactionModal';

import ExportBuilder from '../../../components/shared/ExportBuilder';
import ImportBuilder from '../../../components/shared/ImportBuilder';

const TOOL_TABS = [
  { id: 'finance', label: 'تاریخچه مالی', icon: Wallet, color: 'text-emerald-500', activeClass: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'rentals', label: 'تاریخچه اجاره و اپراتور', icon: Handshake, color: 'text-purple-500', activeClass: 'text-purple-600 dark:text-purple-400' },
  { id: 'repair', label: 'تاریخچه تعمیر', icon: Wrench, color: 'text-rose-500', activeClass: 'text-rose-600 dark:text-rose-400' },
  { id: 'maintenance', label: 'خدمات دوره‌ای', icon: Settings, color: 'text-teal-500', activeClass: 'text-teal-600 dark:text-teal-400' },
  { id: 'incidental', label: 'هزینه‌های جانبی', icon: FileText, color: 'text-orange-500', activeClass: 'text-orange-600 dark:text-orange-400' },
  { id: 'insurance', label: 'گارانتی و بیمه', icon: ShieldAlert, color: 'text-blue-500', activeClass: 'text-blue-600 dark:text-blue-400' },
  { id: 'dashboard', label: 'گزارشات و نمودارها', icon: Activity, color: 'text-indigo-500', activeClass: 'text-indigo-600 dark:text-indigo-400' },
];

export default function ToolProfile({ toolId, onBack }: { toolId: string, onBack: () => void }) {
  const tool = useLogisticsStore(state => state.tools.find(t => t.id === toolId)) || {
    id: toolId,
    name: 'ابزار صنعتی',
    serialNumber: 'SN-0000',
    photo: '',
    status: 'ACTIVE' as ToolStatus,
    isPinned: false,
    createdAt: new Date().toISOString()
  };

  const toolRentals = useLogisticsStore(state => state.toolRentals) || [];
  const repairs = useLogisticsStore(state => state.repairs) || [];
  const insurances = useLogisticsStore(state => state.insurances) || [];
  const miscExpenses = useLogisticsStore(state => state.miscExpenses) || [];
  const periodicServices = useLogisticsStore(state => state.periodicServices) || [];
  const transactions = useFinanceStore(state => state.transactions) || [];

  const [activeTab, setActiveTab] = useState('finance');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [isInsuranceModalOpen, setIsInsuranceModalOpen] = useState(false);
  const [isMiscModalOpen, setIsMiscModalOpen] = useState(false);
  const [isPeriodicModalOpen, setIsPeriodicModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // موتور هوشمند تسویه و پرداخت
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetDebtId, setPaymentTargetDebtId] = useState<string | undefined>(undefined);
  const [paymentInitialAmount, setPaymentInitialAmount] = useState<number | undefined>(undefined);

  // سوئیچ دوحالته چک: REALIZED (وصول‌شده نقدی) یا COMMITTED (تعهدی)
  const [chequeMode, setChequeMode] = useState<'REALIZED' | 'COMMITTED'>('REALIZED');

  useEffect(() => {
    const handler = (e: any) => {
      const { vehicleId: targetVid, targetDebtId, initialAmount } = e.detail || {};
      if (targetVid === toolId) {
        setPaymentTargetDebtId(targetDebtId);
        setPaymentInitialAmount(initialAmount);
        setIsPaymentModalOpen(true);
      }
    };
    document.addEventListener('open-vehicle-payment-modal', handler);
    return () => document.removeEventListener('open-vehicle-payment-modal', handler);
  }, [toolId]);

  const currentYear = moment().jYear();
  const [yearFilter, setYearFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [weekFilter, setWeekFilter] = useState('ALL');

  const yearOptions = [
    { value: 'ALL', label: 'تمام سال‌ها' },
    { value: currentYear.toString(), label: `سال ${currentYear}` },
    { value: (currentYear - 1).toString(), label: `سال ${currentYear - 1}` },
    { value: (currentYear - 2).toString(), label: `سال ${currentYear - 2}` },
  ];

  const monthOptions = [
    { value: 'ALL', label: 'تمام ماه‌ها' },
    { value: '01', label: 'فروردین' },
    { value: '02', label: 'اردیبهشت' },
    { value: '03', label: 'خرداد' },
    { value: '04', label: 'تیر' },
    { value: '05', label: 'مرداد' },
    { value: '06', label: 'شهریور' },
    { value: '07', label: 'مهر' },
    { value: '08', label: 'آبان' },
    { value: '09', label: 'آذر' },
    { value: '10', label: 'دی' },
    { value: '11', label: 'بهمن' },
    { value: '12', label: 'اسفند' },
  ];

  const weekOptions = [
    { value: 'ALL', label: 'تمام هفته‌ها' },
    { value: '1', label: 'هفته اول' },
    { value: '2', label: 'هفته دوم' },
    { value: '3', label: 'هفته سوم' },
    { value: '4', label: 'هفته چهارم' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (activeTab === 'rentals') {
          setIsRentalModalOpen(true);
        } else if (activeTab === 'finance') {
          document.dispatchEvent(new CustomEvent('open-new-vehicle-transaction-modal'));
        } else if (activeTab === 'repair') {
          setIsRepairModalOpen(true);
        } else if (activeTab === 'insurance') {
          setIsInsuranceModalOpen(true);
        } else if (activeTab === 'incidental') {
          setIsMiscModalOpen(true);
        } else if (activeTab === 'maintenance') {
          setIsPeriodicModalOpen(true);
        } else {
          toast.info(`باز کردن مودال ثبت برای تب: ${activeTab}`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // محاسبه هوشمند وضعیت ابزار (Auto-Status) بر اساس تعمیرات و اجاره فعال
  const computedStatus: ToolStatus = useMemo(() => {
    const todayStr = moment().format('jYYYY/jMM/jDD');
    const hasActiveStopRepair = repairs.some(
      r => r.vehicleId === toolId && r.downtimeStatus === 'FULL_STOP' && r.date === todayStr
    );
    if (hasActiveStopRepair || tool.status === 'REPAIR') return 'REPAIR';

    const hasOngoingRental = toolRentals.some(
      r => r.toolId === toolId && (!r.endDate || r.endDate >= todayStr)
    );
    if (hasOngoingRental && tool.status !== 'UNAVAILABLE') return 'RENTED';

    return tool.status || 'ACTIVE';
  }, [tool.status, repairs, toolRentals, toolId]);

  const stats = useMemo(() => {
    const isDateMatch = (dStr?: string) => {
      if (!dStr) return true;
      if (yearFilter !== 'ALL' && dStr.substring(0, 4) !== yearFilter) return false;
      if (monthFilter !== 'ALL' && dStr.substring(5, 7) !== monthFilter) return false;
      return true;
    };

    const activeRentals = toolRentals.filter(r => r.toolId === toolId && isDateMatch(r.startDate));
    const rentalIncome = activeRentals.reduce((acc, r) => acc + (r.totalAmount || 0), 0);
    const operatorWages = activeRentals.reduce((acc, r) => acc + (r.hasOperator ? (r.operatorTotalWage || 0) : 0), 0);

    const toolRepairs = repairs.filter(r => r.vehicleId === toolId && isDateMatch(r.date));
    const repairCosts = toolRepairs.reduce((acc, r) => acc + (r.totalCost || 0), 0);

    const toolMisc = miscExpenses.filter(m => m.vehicleId === toolId && isDateMatch(m.date));
    const incidentalCosts = toolMisc.reduce((acc, m) => acc + (m.amount || 0), 0);

    const toolPeriodic = periodicServices.filter(p => p.vehicleId === toolId && isDateMatch(p.serviceDate));
    const maintenanceCosts = toolPeriodic.reduce((acc, p) => acc + (p.totalCost || 0), 0);

    const toolInsurances = insurances.filter(ins => ins.vehicleId === toolId && isDateMatch(ins.startDate));
    const insuranceCosts = toolInsurances.reduce((acc, ins) => acc + (ins.totalAmount || 0), 0);

    const toolTxs = transactions.filter(t => 
      (t.allocations?.some(a => a.recordType === 'LOGISTICS' && a.recordId === toolId) || t.referenceId === toolId) &&
      isDateMatch(t.date)
    );

    let financeIncome = 0;
    let financeExpense = 0;

    toolTxs.forEach(t => {
      if (t.type === 'CHEQUE') {
        const cStatus = t.chequeDetails?.status || 'PENDING';
        if (cStatus === 'BOUNCED' || cStatus === 'RETURNED') return;
        if (chequeMode === 'REALIZED' && cStatus !== 'CASHED' && cStatus !== 'EXCHANGED') return;
      }

      const tAlloc = t.allocations?.find(a => a.recordType === 'LOGISTICS' && a.recordId === toolId);
      const amt = tAlloc?.amount || t.amount;

      if (t.direction === 'IN') financeIncome += amt;
      else if (t.direction === 'OUT') financeExpense += amt;
    });

    const totalIncome = rentalIncome + financeIncome;
    const totalCosts = repairCosts + incidentalCosts + maintenanceCosts + insuranceCosts + operatorWages + financeExpense;
    const netProfit = totalIncome - totalCosts;

    return { totalIncome, repairCosts, totalCosts, netProfit, rentalIncome, operatorWages };
  }, [yearFilter, monthFilter, weekFilter, toolId, toolRentals, repairs, miscExpenses, periodicServices, insurances, transactions, chequeMode]);

  const isProfitable = stats.netProfit >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full flex flex-col gap-6 pb-24 h-full relative"
    >
      {/* هدر چسبان پروفایل ابزار */}
      <div className="sticky top-4 z-[100] flex flex-col lg:flex-row items-center justify-between gap-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/80 dark:border-slate-700/80 shadow-[0_15px_40px_rgba(0,0,0,0.08)] rounded-[2.5rem] px-6 py-5">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <button
            onClick={onBack}
            className="flex items-center justify-center p-3.5 rounded-[1.25rem] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-inner border border-slate-200 dark:border-slate-600 transition-all shrink-0 group cursor-pointer"
            title="بازگشت به لیست ابزارآلات"
          >
            <ArrowRight className="w-6 h-6 text-slate-700 dark:text-slate-300 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="relative shrink-0 ml-1">
            {tool.photo ? (
              <img src={tool.photo} alt={tool.name} className="w-[72px] h-[72px] rounded-2xl object-cover shadow-lg border-2 border-white dark:border-slate-700" />
            ) : (
              <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg border-2 border-white/80 dark:border-slate-700">
                <PenTool className="w-8 h-8" />
              </div>
            )}
            <div className={`absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 rounded-lg px-2 py-0.5 shadow-md border border-slate-100 dark:border-slate-700 flex items-center gap-1 text-[10px] font-black ${
              computedStatus === 'ACTIVE'
                ? 'text-emerald-500'
                : computedStatus === 'REPAIR'
                ? 'text-amber-500'
                : computedStatus === 'RENTED'
                ? 'text-purple-500'
                : 'text-rose-500'
            }`}>
              {computedStatus === 'ACTIVE' && <Activity className="w-3 h-3" />}
              {computedStatus === 'REPAIR' && <Wrench className="w-3 h-3" />}
              {computedStatus === 'RENTED' && <Handshake className="w-3 h-3" />}
              {computedStatus === 'UNAVAILABLE' && <Ban className="w-3 h-3" />}
              <span>
                {computedStatus === 'ACTIVE' ? 'آماده کار' : computedStatus === 'REPAIR' ? 'در تعمیرگاه' : computedStatus === 'RENTED' ? 'در اجاره' : 'خارج از دسترس'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <h2 className="text-xl font-black text-slate-800 dark:text-white drop-shadow-sm">
                {tool.name}
              </h2>
              <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button onClick={() => setIsEditModalOpen(true)} title="ویرایش پروفایل ابزار" className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-500/20 rounded-lg transition-colors text-purple-500 cursor-pointer">
                  <Edit2 className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
                <button onClick={() => setIsExportModalOpen(true)} title="گزارش‌گیری (Export)" className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-lg transition-colors text-emerald-500 cursor-pointer">
                  <FileDown className="w-4 h-4" />
                </button>
                <button onClick={() => setIsImportModalOpen(true)} title="ورودی اطلاعات (Import)" className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors text-blue-500 cursor-pointer">
                  <FileUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700" dir="ltr">
                <Hash className="w-3 h-3 text-purple-500" />
                {tool.serialNumber || 'بدون سریال'}
              </span>
              {tool.warrantyEnd && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> گارانتی تا: {tool.warrantyEnd}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* دکمه‌های ثبت داینامیک در هدر */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto justify-end">
          <AnimatePresence mode="wait">
            {activeTab === 'rentals' && (
              <motion.button
                key="btn-rental"
                initial={{ opacity: 0, scale: 0.9, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                exit={{ opacity: 0, scale: 0.9, width: 0 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsRentalModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(168,85,247,0.35)] flex items-center justify-center gap-2.5 relative overflow-hidden border border-purple-400/50 cursor-pointer"
              >
                <Handshake className="w-5 h-5" />
                <span className="text-sm whitespace-nowrap">ثبت اجاره ابزار (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'finance' && (
              <motion.button
                key="btn-finance"
                initial={{ opacity: 0, scale: 0.9, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                exit={{ opacity: 0, scale: 0.9, width: 0 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => document.dispatchEvent(new CustomEvent('open-new-vehicle-transaction-modal'))}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2.5 relative overflow-hidden border border-emerald-400/50 cursor-pointer"
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-sm whitespace-nowrap">ثبت تراکنش (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'repair' && (
              <motion.button
                key="btn-repair"
                initial={{ opacity: 0, scale: 0.9, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                exit={{ opacity: 0, scale: 0.9, width: 0 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsRepairModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(244,63,94,0.35)] flex items-center justify-center gap-2.5 relative overflow-hidden border border-rose-400/50 cursor-pointer"
              >
                <Wrench className="w-5 h-5" />
                <span className="text-sm whitespace-nowrap">ثبت تعمیر (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'insurance' && (
              <motion.button
                key="btn-insure"
                initial={{ opacity: 0, scale: 0.9, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                exit={{ opacity: 0, scale: 0.9, width: 0 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsInsuranceModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(99,102,241,0.35)] flex items-center justify-center gap-2.5 relative overflow-hidden border border-indigo-400/50 cursor-pointer"
              >
                <ShieldAlert className="w-5 h-5" />
                <span className="text-sm whitespace-nowrap">ثبت بیمه‌نامه (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'incidental' && (
              <motion.button
                key="btn-incidental"
                initial={{ opacity: 0, scale: 0.9, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                exit={{ opacity: 0, scale: 0.9, width: 0 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsMiscModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(249,115,22,0.35)] flex items-center justify-center gap-2.5 border border-amber-400/50 cursor-pointer"
              >
                <FileText className="w-5 h-5" />
                <span className="text-sm whitespace-nowrap">ثبت هزینه جانبی (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'maintenance' && (
              <motion.button
                key="btn-maint"
                initial={{ opacity: 0, scale: 0.9, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                exit={{ opacity: 0, scale: 0.9, width: 0 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsPeriodicModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2.5 border border-emerald-400/50 cursor-pointer"
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm whitespace-nowrap">سرویس دوره‌ای (Ctrl+N)</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* داشبورد آمار و فیلترهای سه‌گانه */}
      <div className="w-full relative z-[80] -mt-2">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4 px-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-500 drop-shadow-md" />
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 drop-shadow-sm">داشبورد مالی و کارکرد ابزار</h3>
          </div>

          <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full xl:w-auto relative z-[90]">
            {/* کلید دوحالته چک */}
            <div className="flex items-center bg-white/80 dark:bg-slate-800/80 p-1 rounded-2xl h-[40px] border border-slate-200 dark:border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => setChequeMode('REALIZED')}
                className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  chequeMode === 'REALIZED'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                وصول‌شده (نقدی)
              </button>
              <button
                type="button"
                onClick={() => setChequeMode('COMMITTED')}
                className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  chequeMode === 'COMMITTED'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                تعهدی (شامل چک‌های در جریان)
              </button>
            </div>

            <div className="w-full md:w-[130px] h-[40px]"><PortalSelect options={yearOptions} value={yearFilter} onChange={setYearFilter} placeholder="سال" searchable={true} /></div>
            <div className="w-full md:w-[130px] h-[40px]"><PortalSelect options={monthOptions} value={monthFilter} onChange={setMonthFilter} placeholder="ماه" searchable={true} /></div>
            <div className="w-full md:w-[130px] h-[40px]"><PortalSelect options={weekOptions} value={weekFilter} onChange={setWeekFilter} placeholder="هفته" searchable={true} /></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full">
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-purple-200/50 dark:border-purple-900/50 p-5 flex flex-col justify-between min-h-[120px] shadow-[0_8px_30px_rgba(168,85,247,0.05)]">
            <div className="flex justify-between items-center w-full mb-3">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">درآمد اجاره و کارکرد ابزار</span>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-500/20 dark:to-purple-500/10 text-purple-600 border border-purple-200 dark:border-purple-500/30 shadow-inner"><Handshake className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-purple-600 dark:text-purple-400 text-left font-mono" dir="ltr">{stats.totalIncome.toLocaleString('fa-IR')}</div>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-amber-200/50 dark:border-amber-900/50 p-5 flex flex-col justify-between min-h-[120px] shadow-[0_8px_30px_rgba(245,158,11,0.05)]">
            <div className="flex justify-between items-center w-full mb-3">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">هزینه‌های تعمیر و قطعات</span>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-500/30 shadow-inner"><Wrench className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-amber-600 dark:text-amber-400 text-left font-mono" dir="ltr">{stats.repairCosts.toLocaleString('fa-IR')}</div>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-rose-200/50 dark:border-rose-900/50 p-5 flex flex-col justify-between min-h-[120px] shadow-[0_8px_30px_rgba(244,63,94,0.05)]">
            <div className="flex justify-between items-center w-full mb-3">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">هزینه‌های کلی (تعمیر، اپراتور، سرویس)</span>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-500/20 dark:to-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-500/30 shadow-inner"><Layers className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-rose-600 dark:text-rose-400 text-left font-mono" dir="ltr">{stats.totalCosts.toLocaleString('fa-IR')}</div>
          </div>

          <div className={`bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border ${
            isProfitable
              ? 'border-emerald-300/60 dark:border-emerald-800/60 shadow-[0_8px_30px_rgba(16,185,129,0.1)]'
              : 'border-rose-400/60 dark:border-rose-800/60 shadow-[0_8px_30px_rgba(244,63,94,0.15)]'
          } p-5 flex flex-col justify-between min-h-[120px]`}>
            <div className="flex justify-between items-center w-full mb-3">
              <div>
                <span className={`text-[11px] font-black ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {isProfitable ? 'بستانکار / سودده' : 'بدهکار / زیانده'}
                </span>
                <span className="text-[10px] text-slate-400 block font-bold mt-0.5">
                  {chequeMode === 'REALIZED' ? 'بر مبنای وصولی قطعی' : 'بر مبنای تعهد کل'}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl shadow-inner ${
                isProfitable
                  ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/20 dark:to-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-500/20 dark:to-rose-500/10 text-rose-500 border border-rose-200 dark:border-rose-500/30'
              }`}>
                {isProfitable ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
            </div>
            <div className={`text-2xl lg:text-3xl font-black text-left font-mono ${
              isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`} dir="ltr">
              {Math.abs(stats.netProfit).toLocaleString('fa-IR')}
            </div>
          </div>
        </div>
      </div>

      {/* نوار تب‌های سه‌بعدی */}
      <div className="w-full z-[90] sticky top-[130px] mt-4">
        <ThreeDTabs
          tabs={TOOL_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          theme="indigo"
          layoutId="activeTabToolIndicator"
        />
      </div>

      {/* محتوای تب‌ها */}
      <div className="w-full flex-1 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 shadow-xl rounded-[2.5rem] p-6 sm:p-8 z-[70] relative min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'rentals' ? (
            <motion.div key="tab-rentals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <ToolRentalTab toolId={toolId} />
            </motion.div>
          ) : activeTab === 'finance' ? (
            <motion.div key="tab-finance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <VehicleFinanceTab vehicleId={toolId} />
            </motion.div>
          ) : activeTab === 'repair' ? (
            <motion.div key="tab-repair" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <VehicleRepairTab vehicleId={toolId} />
            </motion.div>
          ) : activeTab === 'maintenance' ? (
            <motion.div key="tab-maintenance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <PeriodicServiceTab vehicleId={toolId} />
            </motion.div>
          ) : activeTab === 'incidental' ? (
            <motion.div key="tab-incidental" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <VehicleMiscTab vehicleId={toolId} />
            </motion.div>
          ) : activeTab === 'insurance' ? (
            <motion.div key="tab-insurance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <VehicleInsuranceTab vehicleId={toolId} />
            </motion.div>
          ) : activeTab === 'dashboard' ? (
            <motion.div key="tab-dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <VehicleAnalyticsTab vehicleId={toolId} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* مودال‌ها */}
      <ToolFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} editToolId={toolId} />
      <ToolRentalModal isOpen={isRentalModalOpen} onClose={() => setIsRentalModalOpen(false)} defaultToolId={toolId} />
      <VehicleRepairModal isOpen={isRepairModalOpen} onClose={() => setIsRepairModalOpen(false)} defaultVehicleId={toolId} />
      <VehicleInsuranceModal isOpen={isInsuranceModalOpen} onClose={() => setIsInsuranceModalOpen(false)} defaultVehicleId={toolId} />
      <VehicleMiscModal isOpen={isMiscModalOpen} onClose={() => setIsMiscModalOpen(false)} defaultVehicleId={toolId} />
      <PeriodicServiceModal isOpen={isPeriodicModalOpen} onClose={() => setIsPeriodicModalOpen(false)} defaultVehicleId={toolId} />

      <UniversalTransactionModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentTargetDebtId(undefined);
          setPaymentInitialAmount(undefined);
        }}
        context="TOOL"
        toolId={toolId}
        initialDebtId={paymentTargetDebtId}
        initialAmount={paymentInitialAmount}
      />

      <AnimatePresence>
        {isExportModalOpen && <ExportBuilder toolId={toolId} context="TOOL" onClose={() => setIsExportModalOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {isImportModalOpen && <ImportBuilder toolId={toolId} context="TOOL" onClose={() => setIsImportModalOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
