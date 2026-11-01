import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSignature, Search, Star, Building2, HardHat, Truck, 
  ShoppingBag, Wallet, Layers, ShieldCheck, Clock, Plus, 
  LayoutGrid, List as ListIcon, ShieldAlert, Trash2, 
  ArrowUpRight, ArrowDownLeft, FileDown, FileUp, AlertTriangle,
  CheckCircle2, DollarSign, Filter, ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useContractStore, calculateFinalContractAmount, calculateRetentionAmount } from '../../store/contractStore';
import type { Contract, ContractCategory, ContractStatus } from '../../store/contractStore';
import { useFinanceStore } from '../../store/financeStore';
import { formatCurrency } from '../../core/utils/currency';

import ThreeDTabs from '../../components/ui/ThreeDTabs';
import type { TabItem } from '../../components/ui/ThreeDTabs';
import { AppSearchInput, PortalSelect } from '../../components/ui/SharedLaborUI';

import ContractCard from './components/ContractCard';
import ContractProfile from './ContractProfile';
import ContractFormModal from './components/ContractFormModal';
import ExportBuilder from '../../components/shared/ExportBuilder';
import ImportBuilder from '../../components/shared/ImportBuilder';

const CATEGORY_TABS: TabItem<string>[] = [
  { id: 'ALL', label: 'همه قراردادها', icon: FileSignature },
  { id: 'CLIENT_PROJECT', label: 'کارفرما و پروژه', icon: Building2 },
  { id: 'SUBCONTRACTOR_LABOR', label: 'پیمانکاران فرعی و کارگری', icon: HardHat },
  { id: 'EQUIPMENT_RENTAL', label: 'اجاره ماشین‌آلات و ابزار', icon: Truck },
  { id: 'MATERIAL_SUPPLY', label: 'تأمین مصالح و بنکداری', icon: ShoppingBag },
];

const STATUS_FILTER_OPTIONS = [
  { id: 'ALL', label: 'همه وضعیت‌ها' },
  { id: 'ACTIVE', label: 'در حال اجرا / فعال' },
  { id: 'COMPLETED', label: 'تکمیل و تسویه شده' },
  { id: 'RETENTION_OPEN', label: 'دارای سپرده حسن انجام کار باز' },
  { id: 'DRAFT', label: 'پیش‌نویس' },
  { id: 'SUSPENDED_OR_TERMINATED', label: 'متوقف یا فسخ شده' },
];

const SORT_OPTIONS = [
  { id: 'PINNED', label: 'ستاره‌دارها در ابتدا' },
  { id: 'NEWEST', label: 'جدیدترین تاریخ ثبت' },
  { id: 'AMOUNT_DESC', label: 'بیشترین مبلغ قرارداد' },
  { id: 'AMOUNT_ASC', label: 'کمترین مبلغ قرارداد' },
  { id: 'EXPIRING_SOON', label: 'نزدیک‌ترین به پایان مهلت' },
];

export default function ContractsCenter() {
  const { contracts, deleteContract, togglePinContract } = useContractStore();
  const { transactions } = useFinanceStore();

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // سوئیچ دوحالته چک‌ها در محاسبات کلان
  const [includePendingCheques, setIncludePendingCheques] = useState(true);

  // سیستم حذف با قابلیت لغو ۵ ثانیه‌ای (Undo Toast/Portal)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [undoItems, setUndoItems] = useState<{ id: string; items: string[] }[]>([]);

  const triggerDelete = (id: string, title?: string) => {
    setPendingDeleteIds(prev => [...prev, id]);
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: [id] }]);

    setTimeout(() => {
      setPendingDeleteIds(prev => {
        if (prev.includes(id)) {
          deleteContract(id);
          return prev.filter(item => item !== id);
        }
        return prev;
      });
      setUndoItems(prev => prev.filter(u => u.id !== undoId));
    }, 5000);
  };

  // ۴ کارت آماری کلان بالای صفحه قراردادها
  const statistics = useMemo(() => {
    const activeContracts = contracts.filter(c => c.status === 'ACTIVE' && !pendingDeleteIds.includes(c.id));

    // ۱. ارزش کل قراردادهای فعال با احتساب متمم‌ها
    const totalActiveAmount = activeContracts.reduce((sum, c) => sum + calculateFinalContractAmount(c), 0);

    // ۲. مجموع دریافتی‌ها و پرداختی‌ها
    let totalPaidOrReceived = 0;
    (transactions || []).forEach(tx => {
      if (tx.type === 'CHEQUE' && tx.chequeStatus !== 'PASSED' && !includePendingCheques) {
        return;
      }
      totalPaidOrReceived += (tx.amount || 0);
    });

    // ۳. مجموع سپرده‌های حسن انجام کار مسدودشده
    let totalRetentionBlocked = 0;
    contracts.filter(c => !c.retentionReleased && !pendingDeleteIds.includes(c.id)).forEach(c => {
      totalRetentionBlocked += calculateRetentionAmount(c);
    });

    // ۴. تعداد قراردادهای فعال، در آستانه اتمام (کمتر از ۱۵ روز)، و تضامین باز
    const todayMom = moment().startOf('day');
    let expiringCount = 0;
    let heldGuaranteesCount = 0;

    activeContracts.forEach(c => {
      const endStr = c.currentEndDate || c.initialEndDate;
      if (endStr) {
        try {
          const endMom = moment(endStr, 'jYYYY/jMM/jDD').startOf('day');
          const diff = endMom.diff(todayMom, 'days');
          if (diff >= 0 && diff <= 15) {
            expiringCount++;
          }
        } catch {}
      }

      const heldInThis = (c.guarantees || []).filter(g => g.status === 'HELD').length;
      heldGuaranteesCount += heldInThis;
    });

    return {
      activeContractsCount: activeContracts.length,
      totalActiveAmount,
      totalPaidOrReceived,
      totalRetentionBlocked,
      expiringCount,
      heldGuaranteesCount,
    };
  }, [contracts, transactions, includePendingCheques, pendingDeleteIds]);

  // فیلتر و سورت قراردادها
  const filteredContracts = useMemo(() => {
    let result = contracts.filter(c => !pendingDeleteIds.includes(c.id));

    // فیلتر دسته‌بندی
    if (activeCategory !== 'ALL') {
      result = result.filter(c => c.category === activeCategory);
    }

    // فیلتر وضعیت
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE') {
        result = result.filter(c => c.status === 'ACTIVE');
      } else if (statusFilter === 'COMPLETED') {
        result = result.filter(c => c.status === 'COMPLETED');
      } else if (statusFilter === 'RETENTION_OPEN') {
        result = result.filter(c => !c.retentionReleased && c.retentionPercent > 0);
      } else if (statusFilter === 'DRAFT') {
        result = result.filter(c => c.status === 'DRAFT');
      } else if (statusFilter === 'SUSPENDED_OR_TERMINATED') {
        result = result.filter(c => c.status === 'SUSPENDED' || c.status === 'TERMINATED');
      }
    }

    // فیلتر جستجو
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.contractNumber.toLowerCase().includes(q) ||
        c.partyName.toLowerCase().includes(q) ||
        (c.projectName && c.projectName.toLowerCase().includes(q))
      );
    }

    // سورتینگ
    result.sort((a, b) => {
      if (sortBy.id === 'PINNED') {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      }
      if (sortBy.id === 'AMOUNT_DESC') {
        return calculateFinalContractAmount(b) - calculateFinalContractAmount(a);
      }
      if (sortBy.id === 'AMOUNT_ASC') {
        return calculateFinalContractAmount(a) - calculateFinalContractAmount(b);
      }
      if (sortBy.id === 'EXPIRING_SOON') {
        const dateA = a.currentEndDate || a.initialEndDate || '9999';
        const dateB = b.currentEndDate || b.initialEndDate || '9999';
        return dateA.localeCompare(dateB);
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    return result;
  }, [contracts, activeCategory, statusFilter, searchQuery, sortBy, pendingDeleteIds]);

  return (
    <div className="w-full relative min-h-screen">
      <AnimatePresence mode="wait">
        {selectedContractId ? (
          /* ======================================================== */
          /* نمای تمام‌صفحه پرونده قرارداد (بدون مودال چشم) */
          /* ======================================================== */
          <motion.div
            key="contract-profile-view"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full"
          >
            <ContractProfile
              contractId={selectedContractId}
              onBack={() => setSelectedContractId(null)}
            />
          </motion.div>
        ) : (
          /* ======================================================== */
          /* نمای اصلی لیست و مرکز قراردادها */
          /* ======================================================== */
          <motion.div
            key="contracts-center-view"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full space-y-6 pb-24"
            dir="rtl"
          >
            {/* هدر گرافیکی صفحه قراردادها */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-5 bg-white/20 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] px-6 py-5 relative overflow-visible">
              <div className="flex items-center gap-4 w-full xl:w-auto">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 flex items-center justify-center text-white shadow-[0_0_25px_rgba(245,158,11,0.4)] shrink-0">
                  <FileSignature className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-amber-700 dark:from-white dark:to-amber-300 drop-shadow-sm">
                    مرکز مدیریت قراردادها و پیمان‌ها
                  </h2>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                    مدیریت یکپارچه قراردادهای کارفرمایی، پیمانکاران فرعی، اجاره ابزار و تأمین مصالح
                  </p>
                </div>
              </div>

              {/* دکمه‌های اکشن بالا: اکسپورت، ایمپورت و دکمه درخشان ثبت قرارداد */}
              <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsExportOpen(true)}
                  className="h-12 px-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  title="خروجی اکسل و PDF"
                >
                  <FileDown className="w-4 h-4 text-amber-500" />
                  <span className="hidden sm:inline">خروجی</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsImportOpen(true)}
                  className="h-12 px-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  title="ورود اطلاعات از اکسل"
                >
                  <FileUp className="w-4 h-4 text-blue-500" />
                  <span className="hidden sm:inline">ورودی</span>
                </button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setIsNewModalOpen(true)}
                  className="h-12 px-7 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(245,158,11,0.35)] transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span>+ تنظیم قرارداد جدید</span>
                </motion.button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* ۴ کارت آماری کلان با سوئیچ دوحالته چک‌ها */}
            {/* ======================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* کارت ۱: ارزش کل قراردادهای فعال */}
              <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/80 dark:border-slate-700/80 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>ارزش کل قراردادهای فعال:</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <FileSignature className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono" dir="ltr">
                  {formatCurrency(statistics.totalActiveAmount)}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                  {statistics.activeContractsCount} قرارداد جاری (با احتساب متمم‌ها)
                </div>
              </div>

              {/* کارت ۲: کل دریافتی / پرداختی با سوئیچ دوحالته چک */}
              <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/80 dark:border-slate-700/80 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>مجموع تسویه‌های مالی:</span>
                  <button
                    type="button"
                    onClick={() => setIncludePendingCheques(!includePendingCheques)}
                    className="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer"
                    title="تغییر وضعیت لحاظ چک‌های در جریان"
                  >
                    {includePendingCheques ? 'شامل چک در جریان' : 'فقط نقد'}
                  </button>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono" dir="ltr">
                  {formatCurrency(statistics.totalPaidOrReceived)}
                </div>
                <div className="text-xs text-slate-400 font-bold">
                  {includePendingCheques ? 'شامل کلیه چک‌های پاس‌شده و در جریان' : 'فقط اسناد نقدی و پاس‌شده'}
                </div>
              </div>

              {/* کارت ۳: مجموع سپرده‌های حسن انجام کار مسدودشده */}
              <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/80 dark:border-slate-700/80 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>سپرده حسن انجام کار مسدود:</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono" dir="ltr">
                  {formatCurrency(statistics.totalRetentionBlocked)}
                </div>
                <div className="text-xs text-slate-400 font-bold">
                  سپرده‌های آزادنشده نزد کارفرمایان یا نزد ما
                </div>
              </div>

              {/* کارت ۴: سررسیدها و تضامین در جریان */}
              <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/80 dark:border-slate-700/80 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>قراردادها و تضامین در آستانه سررسید:</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono flex items-center gap-3">
                  <span className={statistics.expiringCount > 0 ? 'text-rose-500 font-black' : ''}>
                    {statistics.expiringCount} در آستانه اتمام
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-bold">
                  {statistics.heldGuaranteesCount} ضمانت‌نامه و چک صیادی مسدود
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* تب‌های دسته‌بندی با ThreeDTabs */}
            {/* ======================================================== */}
            <ThreeDTabs
              tabs={CATEGORY_TABS}
              activeTab={activeCategory}
              onChange={(id) => setActiveCategory(id)}
              theme="amber"
            />

            {/* ======================================================== */}
            {/* نوار جستجو، فیلترها، سورت و نمای شبکه/جدول */}
            {/* ======================================================== */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              {/* جستجو با کامپوننت نئونی استاندارد */}
              <div className="w-full lg:w-96">
                <AppSearchInput
                  value={searchQuery}
                  onChange={(val) => setSearchQuery(val)}
                  onClear={() => setSearchQuery('')}
                  placeholder="جستجوی عنوان، شماره قرارداد، طرف حساب یا پروژه..."
                  className="!h-[52px]"
                />
              </div>

              {/* فیلترها و تغییر ویو */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                {/* فیلتر وضعیت با PortalSelect */}
                <div className="w-52">
                  <PortalSelect
                    options={STATUS_FILTER_OPTIONS}
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    placeholder="فیلتر وضعیت..."
                    className="!h-[52px] !rounded-2xl"
                  />
                </div>

                {/* مرتب‌سازی */}
                <div className="w-52">
                  <PortalSelect
                    options={SORT_OPTIONS}
                    value={sortBy.id}
                    onChange={(val) => {
                      const found = SORT_OPTIONS.find(o => o.id === val);
                      if (found) setSortBy(found);
                    }}
                    placeholder="مرتب‌سازی..."
                    className="!h-[52px] !rounded-2xl"
                  />
                </div>

                {/* سوئیچ ویو مد: گرید / جدول */}
                <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1 rounded-2xl shadow-inner border border-white/50 dark:border-slate-700/50 shrink-0 h-[52px]">
                  <button
                    onClick={() => setViewMode('GRID')}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                      viewMode === 'GRID'
                        ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-md scale-105'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="نمای شبکه"
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('LIST')}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                      viewMode === 'LIST'
                        ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-md scale-105'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="نمای جدول"
                  >
                    <ListIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* لیست قراردادها (نمای شبکه یا نمای جدول) */}
            {/* ======================================================== */}
            {filteredContracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white/20 dark:bg-slate-900/20 backdrop-blur-3xl rounded-[3rem] border-2 border-dashed border-amber-200/50 dark:border-slate-800">
                <ShieldAlert className="w-20 h-20 text-amber-300 dark:text-amber-900/50 mb-4 drop-shadow-xl" />
                <h3 className="text-xl font-black text-slate-700 dark:text-slate-200">
                  هیچ قراردادی با این مشخصات یافت نشد!
                </h3>
                <p className="text-sm font-bold text-slate-400 mt-2">
                  جستجو یا فیلترهای خود را تغییر دهید یا روی دکمه «تنظیم قرارداد جدید» کلیک کنید.
                </p>
              </div>
            ) : viewMode === 'GRID' ? (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                <AnimatePresence>
                  {filteredContracts.map((contract) => (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      onTogglePin={togglePinContract}
                      onDelete={(id) => triggerDelete(id, contract.title)}
                      onClick={() => setSelectedContractId(contract.id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* نمای جدول پیشرفته قراردادها */
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-400 bg-slate-50/60 dark:bg-slate-800/40">
                        <th className="p-4 text-center w-12">ستاره</th>
                        <th className="p-4">شماره و عنوان قرارداد</th>
                        <th className="p-4">طرف حساب</th>
                        <th className="p-4">پروژه مرتبط</th>
                        <th className="p-4 text-center">دسته‌بندی</th>
                        <th className="p-4 text-left">مبلغ نهایی (تومان)</th>
                        <th className="p-4 text-center">سررسید مهلت</th>
                        <th className="p-4 text-center">وضعیت</th>
                        <th className="p-4 text-center w-28">اقدامات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                      {filteredContracts.map((contract) => {
                        const finalAmt = calculateFinalContractAmount(contract);
                        return (
                          <tr
                            key={contract.id}
                            onClick={() => setSelectedContractId(contract.id)}
                            className="hover:bg-amber-500/[0.04] dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                          >
                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => togglePinContract(contract.id)}
                                className="cursor-pointer"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    contract.isPinned
                                      ? 'fill-amber-400 text-amber-500'
                                      : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                                  }`}
                                />
                              </button>
                            </td>

                            <td className="p-4">
                              <div className="font-black text-slate-900 dark:text-white text-sm">
                                {contract.title}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400" dir="ltr">
                                {contract.contractNumber}
                              </span>
                            </td>

                            <td className="p-4 text-slate-700 dark:text-slate-300">
                              {contract.partyName}
                            </td>

                            <td className="p-4 text-indigo-600 dark:text-indigo-400">
                              {contract.projectName || '-'}
                            </td>

                            <td className="p-4 text-center">
                              <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {contract.category === 'CLIENT_PROJECT' ? 'کارفرما' :
                                 contract.category === 'SUBCONTRACTOR_LABOR' ? 'پیمانکار' :
                                 contract.category === 'EQUIPMENT_RENTAL' ? 'اجاره ابزار' : 'تأمین مصالح'}
                              </span>
                            </td>

                            <td className="p-4 text-left font-mono font-black text-slate-900 dark:text-white text-sm" dir="ltr">
                              {formatCurrency(finalAmt)}
                            </td>

                            <td className="p-4 text-center font-mono text-slate-500">
                              {contract.currentEndDate || contract.initialEndDate}
                            </td>

                            <td className="p-4 text-center">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                                contract.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {contract.status === 'ACTIVE' ? 'در حال اجرا' : contract.status}
                              </span>
                            </td>

                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedContractId(contract.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                  title="مشاهده پرونده قرارداد"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => triggerDelete(contract.id, contract.title)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                  title="حذف ۵ ثانیه‌ای"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* پورتال Undo حذف ۵ ثانیه‌ای */}
            {typeof document !== 'undefined' && createPortal(
              <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
                <AnimatePresence>
                  {undoItems.map(undo => (
                    <motion.div
                      key={undo.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className="relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 shadow-2xl rounded-[2rem] p-3.5 flex items-center gap-4 pointer-events-auto"
                      dir="rtl"
                    >
                      <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0">
                        <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-500" />
                      </div>

                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-black text-slate-800 dark:text-white">
                          قرارداد در حال حذف
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                          تا ۵ ثانیه دیگر پاک می‌شود...
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setPendingDeleteIds(prev => prev.filter(id => !undo.items.includes(id)));
                          setUndoItems(prev => prev.filter(u => u.id !== undo.id));
                          toast.success('عملیات حذف لغو شد');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-colors shrink-0 shadow-sm cursor-pointer"
                      >
                        انصراف
                      </button>

                      <motion.div
                        initial={{ width: '100%' }}
                        animate={{ width: '0%' }}
                        transition={{ duration: 5, ease: 'linear' }}
                        className="absolute bottom-0 right-0 h-1 bg-rose-500"
                        style={{ transformOrigin: 'right' }}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>,
              document.body
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* مودال تنظیم قرارداد جدید */}
      {isNewModalOpen && (
        <ContractFormModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
        />
      )}

      {/* مودال‌های خروجی و ورودی */}
      <AnimatePresence>
        {isExportOpen && (
          <ExportBuilder
            context="GLOBAL"
            onClose={() => setIsExportOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isImportOpen && (
          <ImportBuilder
            context="GLOBAL"
            onClose={() => setIsImportOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
