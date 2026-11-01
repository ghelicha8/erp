import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, FileSignature, Edit3, Printer, Plus, 
  Building2, HardHat, Truck, ShoppingBag, Wallet, 
  Layers, ShieldCheck, Clock, TrendingUp, TrendingDown, 
  FileText, ImageIcon, BarChart3, Star, CheckCircle2, 
  AlertTriangle, DollarSign, Calendar
} from 'lucide-react';
import moment from 'moment-jalaali';

import { useContractStore, calculateFinalContractAmount, calculateRetentionAmount, calculateMeasurementTotal } from '../../store/contractStore';
import type { Contract, ContractCategory } from '../../store/contractStore';
import { useFinanceStore } from '../../store/financeStore';
import { formatCurrency } from '../../core/utils/currency';

import ThreeDTabs from '../../components/ui/ThreeDTabs';
import type { TabItem } from '../../components/ui/ThreeDTabs';

import ContractFormModal from './components/ContractFormModal';
import ContractFinanceTab from './components/tabs/ContractFinanceTab';
import ContractPhasesAndMeasurementTab from './components/tabs/ContractPhasesAndMeasurementTab';
import ContractGuaranteesTab from './components/tabs/ContractGuaranteesTab';
import ContractAddendumsTab from './components/tabs/ContractAddendumsTab';
import ContractLegalAndPrintTab from './components/tabs/ContractLegalAndPrintTab';
import ContractDocumentsAndChartsTab from './components/tabs/ContractDocumentsAndChartsTab';
import UniversalTransactionModal from '../../components/shared/UniversalTransactionModal';

interface ContractProfileProps {
  contractId: string;
  onBack: () => void;
}

const CATEGORY_META: Record<ContractCategory, { label: string; icon: any; color: string; bgBadge: string }> = {
  CLIENT_PROJECT: {
    label: 'کارفرما و پروژه (درآمدی)',
    icon: Building2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgBadge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
  SUBCONTRACTOR_LABOR: {
    label: 'پیمانکار فرعی / اکیپ (هزینه‌ای)',
    icon: HardHat,
    color: 'text-blue-600 dark:text-blue-400',
    bgBadge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  },
  EQUIPMENT_RENTAL: {
    label: 'اجاره ماشین‌آلات و ابزار',
    icon: Truck,
    color: 'text-amber-600 dark:text-amber-400',
    bgBadge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  MATERIAL_SUPPLY: {
    label: 'تأمین مصالح و بنکداری',
    icon: ShoppingBag,
    color: 'text-purple-600 dark:text-purple-400',
    bgBadge: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'پیش‌نویس', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  ACTIVE: { label: 'در حال اجرا / فعال', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  COMPLETED: { label: 'تکمیل و تسویه شده', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  SUSPENDED: { label: 'متوقف / تعلیق', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  TERMINATED: { label: 'فسخ شده', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
};

const PROFILE_TABS: TabItem<string>[] = [
  { id: 'finance', label: 'تاریخچه مالی و صورت‌وضعیت‌ها', icon: Wallet },
  { id: 'phases', label: 'فازها، متراژها و ریز متره', icon: Layers },
  { id: 'guarantees', label: 'تضامین، چک‌های ضمانت و حسن انجام کار', icon: ShieldCheck },
  { id: 'addendums', label: 'متمم‌ها و الحاقیه‌ها (Addendums)', icon: FileSignature },
  { id: 'legal', label: 'متن حقوقی و چاپ رسمی قرارداد', icon: FileText },
  { id: 'documents', label: 'اسناد، پیوست‌ها و نمودارها', icon: BarChart3 },
];

export default function ContractProfile({
  contractId,
  onBack,
}: ContractProfileProps) {
  const contract = useContractStore((state) => state.contracts.find((c) => c.id === contractId));
  const { togglePinContract } = useContractStore();
  const { transactions } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<string>('finance');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [includePendingCheques, setIncludePendingCheques] = useState(true);

  if (!contract) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <h3 className="text-lg font-black text-slate-800 dark:text-white">
          قرارداد مورد نظر یافت نشد یا حذف شده است!
        </h3>
        <button
          onClick={onBack}
          className="mt-4 px-6 py-2.5 rounded-xl bg-amber-500 text-white font-black text-xs"
        >
          بازگشت به مرکز قراردادها
        </button>
      </div>
    );
  }

  const catMeta = CATEGORY_META[contract.category] || CATEGORY_META.CLIENT_PROJECT;
  const statusMeta = STATUS_META[contract.status] || STATUS_META.ACTIVE;
  const CategoryIcon = catMeta.icon;

  const finalAmount = calculateFinalContractAmount(contract);
  const retentionAmount = calculateRetentionAmount(contract);
  const { totalAmount: measurementTotal, certifiedAmount } = calculateMeasurementTotal(contract.measurementItems || []);

  // محاسبه تراکنش‌های مالی مرتبط
  const relatedTxs = useMemo(() => {
    return (transactions || []).filter(tx => {
      if ((tx as any).contractId === contract.id) return true;
      if (contract.projectId && tx.projectId === contract.projectId) {
        if (contract.partyType === 'CLIENT' && tx.clientId === contract.partyId) return true;
        if (contract.partyType === 'WORKER' && tx.workerId === contract.partyId) return true;
        if (contract.partyType === 'SUPPLIER' && (tx as any).supplierId === contract.partyId) return true;
      }
      return false;
    });
  }, [transactions, contract]);

  const isIncome = contract.category === 'CLIENT_PROJECT' || (contract.category === 'EQUIPMENT_RENTAL' && contract.rentalDirection === 'RENT_OUT');

  const { totalPaidOrReceived } = useMemo(() => {
    let sum = 0;
    relatedTxs.forEach(tx => {
      if (tx.type === 'CHEQUE' && tx.chequeStatus !== 'PASSED' && !includePendingCheques) {
        return;
      }
      if (isIncome && tx.direction === 'IN') sum += (tx.amount || 0);
      else if (!isIncome && tx.direction === 'OUT') sum += (tx.amount || 0);
    });
    return { totalPaidOrReceived: sum };
  }, [relatedTxs, includePendingCheques, isIncome]);

  const balanceAmount = Math.max(0, finalAmount - totalPaidOrReceived);

  // محاسبه پیشرفت مالی / کارکرد تاییدشده
  const progressPercent = finalAmount > 0 
    ? Math.min(100, Math.round(((certifiedAmount || totalPaidOrReceived) / finalAmount) * 100))
    : 0;

  // محاسبه روزشمار سررسید آزادسازی حسن انجام کار
  let daysToRelease: number | null = null;
  if (contract.retentionReleaseDate) {
    try {
      const todayMom = moment().startOf('day');
      const relMom = moment(contract.retentionReleaseDate, 'jYYYY/jMM/jDD').startOf('day');
      daysToRelease = relMom.diff(todayMom, 'days');
    } catch {
      daysToRelease = null;
    }
  }

  // کلید میانبر هوشمند Ctrl+N
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleHeaderDynamicAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // متن و اکشن دکمه داینامیک هدر متناسب با تب فعال
  const getHeaderActionMeta = () => {
    switch (activeTab) {
      case 'finance':
        return { label: 'ثبت سند مالی', icon: Plus, action: () => setIsTxModalOpen(true) };
      case 'phases':
        return { label: 'افزودن ریزمتره', icon: Plus, action: () => {
          // جابجایی تب یا فوکوس
        }};
      case 'guarantees':
        return { label: 'ثبت ضمانت‌نامه', icon: Plus, action: () => {
          // اکشن تب تضامین
        }};
      case 'addendums':
        return { label: 'ثبت متمم جدید', icon: Plus, action: () => {
          // اکشن تب متمم
        }};
      case 'legal':
        return { label: 'چاپ قرارداد (A4)', icon: Printer, action: () => window.print() };
      case 'documents':
        return { label: 'پیوست مدرک', icon: Plus, action: () => {} };
      default:
        return { label: 'اقدام جدید', icon: Plus, action: () => setIsTxModalOpen(true) };
    }
  };

  const dynamicAction = getHeaderActionMeta();
  const DynamicIcon = dynamicAction.icon;

  const handleHeaderDynamicAction = () => {
    if (activeTab === 'finance') {
      setIsTxModalOpen(true);
    } else if (activeTab === 'legal') {
      window.print();
    } else {
      dynamicAction.action();
    }
  };

  return (
    <div className="w-full space-y-6 pb-20 animate-in fade-in duration-300" dir="rtl">
      {/* ======================================================== */}
      {/* هدر چسبان پروفایل قرارداد (Sticky Top-4) */}
      {/* ======================================================== */}
      <div className="sticky top-4 z-40 backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80 border border-white/60 dark:border-slate-800/80 rounded-[2.5rem] p-4 sm:p-5 shadow-xl transition-all">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* سمت راست: دکمه بازگشت و مشخصات اصلی قرارداد */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onBack}
              className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shadow-sm"
              title="بازگشت به مرکز قراردادها"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 shrink-0">
              <CategoryIcon className="w-6 h-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">
                  {contract.title}
                </h1>
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${catMeta.bgBadge}`}>
                  {catMeta.label}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusMeta.className}`}>
                  {statusMeta.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                <span className="font-mono text-slate-400" dir="ltr">
                  شماره: {contract.contractNumber}
                </span>
                <span>•</span>
                <span>
                  {contract.employers && contract.employers.length > 1 ? (
                    <>کارفرمایان ({contract.employers.length}): <strong className="text-slate-700 dark:text-slate-200">{contract.employers.map(e => e.name).join('، ')}</strong></>
                  ) : (
                    <>طرف حساب: <strong className="text-slate-700 dark:text-slate-200">{contract.partyName}</strong></>
                  )}
                </span>
                {contract.projectName && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">پروژه: {contract.projectName}</span>
                  </>
                )}
                {contract.scopeType === 'SPECIFIC_PHASE' && contract.phaseName && (
                  <>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md">فاز: {contract.phaseName}</span>
                  </>
                )}
                {contract.contractorCompany && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">مجری: {contract.contractorCompany}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* سمت چپ: دکمه‌های اقدام، پرینت، ویرایش و تک‌دکمه داینامیک */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => togglePinContract(contract.id)}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
              title={contract.isPinned ? 'برداشتن ستاره' : 'ستاره‌دار کردن'}
            >
              <Star className={`w-5 h-5 ${contract.isPinned ? 'fill-amber-400 text-amber-500' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="ویرایش مشخصات قرارداد"
            >
              <Edit3 className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('legal')}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="چاپ رسمی قرارداد (A4)"
            >
              <Printer className="w-5 h-5" />
            </button>

            {/* تک‌دکمه ثبت داینامیک در هدر */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleHeaderDynamicAction}
              className="h-11 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xs shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <DynamicIcon className="w-4 h-4" />
              <span>{dynamicAction.label}</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-white/20 rounded-md font-mono">
                Ctrl+N
              </kbd>
            </motion.button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ۵ کارت آماری اختصاصی بالای پروفایل قرارداد */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* کارت ۱: مبلغ اولیه + جمع متمم‌ها = مبلغ نهایی */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>مبلغ نهایی قرارداد:</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono" dir="ltr">
            {formatCurrency(finalAmount)}
          </div>
          <div className="text-[10px] text-slate-400 font-bold truncate">
            پایه: {formatCurrency(contract.initialAmount)} + متمم
          </div>
        </div>

        {/* کارت ۲: پیشرفت مالی / کارکرد تاییدشده با نوار انیمیشنی */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>پیشرفت مالی / کارکرد:</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">{progressPercent}%</span>
          </div>
          <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono" dir="ltr">
            {formatCurrency(certifiedAmount || totalPaidOrReceived)}
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-indigo-500 rounded-full"
            />
          </div>
        </div>

        {/* کارت ۳: کل دریافتی / پرداختی با سوئیچ دوحالته چک */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{isIncome ? 'کل دریافتی:' : 'کل پرداختی:'}</span>
            <button
              type="button"
              onClick={() => setIncludePendingCheques(!includePendingCheques)}
              className="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer"
            >
              {includePendingCheques ? 'با چک' : 'فقط نقد'}
            </button>
          </div>
          <div className={`text-base sm:text-lg font-black font-mono ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} dir="ltr">
            {formatCurrency(totalPaidOrReceived)}
          </div>
          <div className="text-[10px] text-slate-400 font-bold truncate">
            {includePendingCheques ? 'شامل چک‌های در جریان' : 'نقد و چک پاس‌شده'}
          </div>
        </div>

        {/* کارت ۴: سپرده حسن انجام کار + شمارش معکوس */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>حسن انجام کار ({contract.retentionPercent}٪):</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono" dir="ltr">
            {formatCurrency(retentionAmount)}
          </div>
          <div className="text-[10px] font-bold truncate">
            {contract.retentionReleased ? (
              <span className="text-emerald-500">آزاد و مسترد شده ✓</span>
            ) : daysToRelease !== null ? (
              <span className={daysToRelease <= 0 ? 'text-rose-600 font-black' : 'text-amber-600'}>
                {daysToRelease <= 0 ? 'سررسید فرا رسیده' : `${daysToRelease} روز تا سررسید`}
              </span>
            ) : (
              <span className="text-slate-400">بدون تاریخ سررسید</span>
            )}
          </div>
        </div>

        {/* کارت ۵: مانده قابل مطالبه / تسویه */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>مانده تسویه نشده:</span>
            <Wallet className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono" dir="ltr">
            {formatCurrency(balanceAmount)}
          </div>
          <div className="text-[10px] text-slate-400 font-bold truncate">
            قابل {isIncome ? 'دریافت' : 'پرداخت'}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* تب‌های ۶ گانه تخصصی داخل پروفایل قرارداد */}
      {/* ======================================================== */}
      <ThreeDTabs
        tabs={PROFILE_TABS}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id)}
        theme="amber"
      />

      {/* محتوای تب انتخاب‌شده */}
      <div className="pt-2">
        {activeTab === 'finance' && <ContractFinanceTab contract={contract} />}
        {activeTab === 'phases' && <ContractPhasesAndMeasurementTab contract={contract} />}
        {activeTab === 'guarantees' && <ContractGuaranteesTab contract={contract} />}
        {activeTab === 'addendums' && <ContractAddendumsTab contract={contract} />}
        {activeTab === 'legal' && <ContractLegalAndPrintTab contract={contract} />}
        {activeTab === 'documents' && <ContractDocumentsAndChartsTab contract={contract} />}
      </div>

      {/* مودال ویرایش قرارداد */}
      {isEditModalOpen && (
        <ContractFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          contractToEdit={contract}
        />
      )}

      {/* مودال ثبت سند مالی مادر */}
      {isTxModalOpen && (
        <UniversalTransactionModal
          isOpen={isTxModalOpen}
          onClose={() => setIsTxModalOpen(false)}
          context="CONTRACT"
          contractId={contract.id}
          projectId={contract.projectId}
          clientId={contract.partyType === 'CLIENT' ? contract.partyId : undefined}
          workerId={contract.partyType === 'WORKER' ? contract.partyId : undefined}
          supplierId={contract.partyType === 'SUPPLIER' ? contract.partyId : undefined}
          initialDirection={isIncome ? 'IN' : 'OUT'}
        />
      )}
    </div>
  );
}
