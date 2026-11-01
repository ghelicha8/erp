import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Package, Layers, MapPin, Barcode, Scale, 
  DollarSign, Wallet, ArrowUpRight, ArrowDownRight, RotateCcw, 
  AlertTriangle, Truck, Activity, Edit, Trash2, FileDown, 
  FileUp, Sparkles, Plus, Calendar, Check, CheckCircle2,
  TrendingUp, TrendingDown, Clock, Building2, Store
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';

import { 
  useInventoryStore, 
  type InventoryItem, 
  type InventoryTransaction,
  INVENTORY_CATEGORIES 
} from '../../../store/inventoryStore';
import { useFinanceStore } from '../../../store/financeStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useLogisticsStore } from '../../../store/logisticsStore';
import { useSettingsStore } from '../../../store/settingsStore';

import { 
  PortalSelect, 
  AppSearchInput, 
  AnimatedCheckbox, 
  FloatingUndoToast,
  ThreeDTabs,
  type TabItem 
} from '../../../components/ui/SharedLaborUI';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import UniversalTransactionModal from '../../../components/shared/UniversalTransactionModal';
import InventoryMovementModal from './InventoryMovementModal';
import ExportBuilder from '../../../components/shared/ExportBuilder';
import ImportBuilder from '../../../components/shared/ImportBuilder';

interface InventoryItemProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string, name: string) => void;
}

const safeNum = (val: unknown): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/,/g, '')
    .replace(/[^0-9.-]+/g, '');
  const parsed = Number(clean);
  return isNaN(parsed) ? 0 : parsed;
};

const PAGE_LIMIT_OPTIONS = [
  { value: '10', label: '۱۰ ردیف' },
  { value: '25', label: '۲۵ ردیف' },
  { value: '50', label: '۵۰ ردیف' },
  { value: '9999', label: 'همه ردیف‌ها' },
];

export default function InventoryItemProfileModal({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete
}: InventoryItemProfileModalProps) {
  const { transactions, deleteTransaction } = useInventoryStore();
  const { transactions: financeTransactions, deleteTransaction: deleteFinanceTx } = useFinanceStore();
  const { projects } = useProjectStore();
  const { vehicles } = useLogisticsStore();
  const { currency } = useSettingsStore(state => state.settings);

  const isRial = currency === 'rial' || (currency as any) === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';

  // تب فعال
  const [activeTab, setActiveTab] = useState<string>('cardex');

  // فیلتر زمانی و دوحالته چک
  const [chequeMode, setChequeMode] = useState<'REALIZED' | 'COMMITTED'>('REALIZED');
  const currentYear = moment().jYear();
  const [yearFilter, setYearFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [weekFilter, setWeekFilter] = useState('ALL');

  // مودال‌های جانبی
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementModalType, setMovementModalType] = useState<'IN_PURCHASE' | 'OUT_PROJECT' | 'IN_RETURN' | 'OUT_WASTE'>('OUT_PROJECT');
  const [movementToEdit, setMovementToEdit] = useState<InventoryTransaction | null>(null);

  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [financeToEdit, setFinanceToEdit] = useState<any | null>(null);

  // جستجو و صفحه‌بندی تب‌ها
  const [tabSearch, setTabSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // حذف ۵ ثانیه‌ای (FloatingUndoToast)
  const [undoItems, setUndoItems] = useState<{ id: string; items: string[]; expireAt: number; itemType: 'MOVEMENT' | 'FINANCE' }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

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

  // تایمر ۵ ثانیه‌ای حذف
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
        const expired = prev.filter(u => u.expireAt <= now);
        const active = prev.filter(u => u.expireAt > now);
        if (expired.length > 0) {
          expired.forEach(u => {
            if (u.itemType === 'MOVEMENT') {
              u.items.forEach(id => deleteTransaction(id));
            } else if (u.itemType === 'FINANCE') {
              u.items.forEach(id => deleteFinanceTx(id));
            }
          });
          setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e => e.items).includes(id)));
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteTransaction, deleteFinanceTx]);

  const triggerDelete = (id: string, itemType: 'MOVEMENT' | 'FINANCE') => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: [id], expireAt: Date.now() + 5000, itemType }]);
    setPendingDeleteIds(prev => [...prev, id]);
  };

  const handleCancelUndo = (undoId: string | number) => {
    const target = undoItems.find(u => String(u.id) === String(undoId));
    if (target) {
      setPendingDeleteIds(prev => prev.filter(id => !target.items.includes(id)));
      setUndoItems(prev => prev.filter(u => String(u.id) !== String(undoId)));
      toast.success('حذف با موفقیت لغو شد.');
    }
  };

  // بررسی تطابق با فیلتر سال و ماه
  const isDateMatch = (dStr?: string) => {
    if (!dStr) return true;
    if (yearFilter !== 'ALL' && dStr.substring(0, 4) !== yearFilter) return false;
    if (monthFilter !== 'ALL' && dStr.substring(5, 7) !== monthFilter) return false;
    return true;
  };

  // گردش کاردکس مربوط به این کالا
  const itemMovements = useMemo(() => {
    if (!item) return [];
    return transactions.filter(t => {
      if (pendingDeleteIds.includes(t.id)) return false;
      return t.itemId === item.id && isDateMatch(t.date);
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, item, pendingDeleteIds, yearFilter, monthFilter]);

  // تراکنش‌های مالی مربوط به این کالا
  const itemFinanceTransactions = useMemo(() => {
    if (!item) return [];
    const itemName = item.name.trim().toLowerCase();
    return financeTransactions.filter(t => {
      if (pendingDeleteIds.includes(t.id)) return false;
      const matchAlloc = t.allocations?.some(a => a.recordId === item.id);
      const matchRef = t.referenceId === item.id;
      const matchDesc = t.description && t.description.toLowerCase().includes(itemName);
      return (matchAlloc || matchRef || matchDesc) && isDateMatch(t.date);
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [financeTransactions, item, pendingDeleteIds, yearFilter, monthFilter]);

  // ==========================================
  // محاسبات ۴ کارت آماری بالای پروفایل
  // ==========================================
  const stats = useMemo(() => {
    if (!item) return { stockValue: 0, totalInQty: 0, totalInCost: 0, totalOutQty: 0, totalOutBilled: 0, arbitrageProfit: 0 };

    const stockValue = item.currentStock * item.averageUnitCost;

    let totalInQty = 0;
    let totalInCost = 0;
    let totalOutQty = 0;
    let totalOutBilled = 0;
    let arbitrageProfit = 0;

    itemMovements.forEach(m => {
      if (m.type === 'IN_PURCHASE' || m.type === 'IN_RETURN') {
        totalInQty += m.calculatedPrimaryQty;
        totalInCost += m.totalInternalCost;
      } else if (m.type === 'OUT_PROJECT') {
        totalOutQty += m.calculatedPrimaryQty;
        totalOutBilled += (m.totalBilledAmount || m.totalInternalCost);
        arbitrageProfit += (m.hiddenProfit || 0);
      } else if (m.type === 'OUT_WASTE') {
        arbitrageProfit -= m.totalInternalCost;
      }
    });

    return {
      stockValue,
      totalInQty,
      totalInCost,
      totalOutQty,
      totalOutBilled,
      arbitrageProfit
    };
  }, [item, itemMovements]);

  // کنترل میانبر Ctrl+N
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleDynamicAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, item]);

  // اکشن تک‌دکمه داینامیک هدر
  const handleDynamicAction = () => {
    if (!item) return;
    if (activeTab === 'finance') {
      setFinanceToEdit(null);
      setIsFinanceModalOpen(true);
    } else if (activeTab === 'cardex') {
      setMovementToEdit(null);
      setMovementModalType('OUT_PROJECT');
      setIsMovementModalOpen(true);
    } else if (activeTab === 'logistics') {
      setMovementToEdit(null);
      setMovementModalType('OUT_PROJECT');
      setIsMovementModalOpen(true);
    } else {
      setIsExportModalOpen(true);
    }
  };

  if (!isOpen || !item) return null;

  const categoryMeta = INVENTORY_CATEGORIES[item.category] || INVENTORY_CATEGORIES.cement_mortar;
  const isLowStock = item.currentStock <= item.minStockLevel;

  // تب‌های پروفایل کالا
  const profileTabs: TabItem<string>[] = [
    {
      id: 'finance',
      label: 'تاریخچه مالی و پرداختی‌ها',
      icon: Wallet,
      count: itemFinanceTransactions.length,
      accentColor: '#10b981'
    },
    {
      id: 'cardex',
      label: 'کاردکس گردش کالا (ورود، خروج و ارسال به پروژه)',
      icon: Package,
      count: itemMovements.length,
      accentColor: '#3b82f6'
    },
    {
      id: 'logistics',
      label: 'باربری و لجستیک کالا',
      icon: Truck,
      count: itemMovements.filter(m => (m.internalFreightCost || 0) > 0).length,
      accentColor: '#f59e0b'
    },
    {
      id: 'reports',
      label: 'گزارشات و نمودارها',
      icon: Activity,
      accentColor: '#8b5cf6'
    }
  ];

  // فیلتر رکوردهای تب فعال
  const activeTabRecords = () => {
    const sTerm = tabSearch.trim().toLowerCase();

    if (activeTab === 'finance') {
      return itemFinanceTransactions.filter(t => {
        if (!sTerm) return true;
        return (
          t.description?.toLowerCase().includes(sTerm) ||
          t.type?.toLowerCase().includes(sTerm) ||
          String(t.amount).includes(sTerm)
        );
      });
    }

    if (activeTab === 'cardex') {
      return itemMovements.filter(m => {
        if (!sTerm) return true;
        const proj = projects.find(p => p.id === m.projectId);
        return (
          m.description?.toLowerCase().includes(sTerm) ||
          m.type?.toLowerCase().includes(sTerm) ||
          proj?.name.toLowerCase().includes(sTerm)
        );
      });
    }

    if (activeTab === 'logistics') {
      return itemMovements.filter(m => (m.internalFreightCost || 0) > 0).filter(m => {
        if (!sTerm) return true;
        return (
          m.driverName?.toLowerCase().includes(sTerm) ||
          m.description?.toLowerCase().includes(sTerm)
        );
      });
    }

    return [];
  };

  const recordsList = activeTabRecords();
  const paginatedRecords = pageSize === 9999 ? recordsList : recordsList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.max(1, Math.ceil(recordsList.length / (pageSize === 9999 ? 1 : pageSize)));

  return createPortal(
    <div className="fixed inset-0 z-[160] bg-slate-950/70 backdrop-blur-md overflow-y-auto modal-scrollbar flex flex-col p-2 sm:p-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-7xl mx-auto bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col min-h-[92vh] pb-12 relative overflow-hidden"
      >
        {/* ======================================================== */}
        {/* هدر چسبان و اصلی پروفایل کالا */}
        {/* ======================================================== */}
        <div className="sticky top-0 z-[100] flex flex-col lg:flex-row items-center justify-between gap-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800 px-6 py-5">
          
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <button 
              type="button"
              onClick={onClose} 
              className="flex items-center justify-center p-3.5 rounded-[1.25rem] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-inner border border-slate-200 dark:border-slate-600 transition-all shrink-0 group cursor-pointer" 
              title="بازگشت به مرکز انبار"
            >
              <ArrowRight className="w-6 h-6 text-slate-700 dark:text-slate-300 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* عکس / آیکون کالا */}
            <div className="relative shrink-0">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-[72px] h-[72px] rounded-2xl object-cover shadow-lg border-2 border-white dark:border-slate-700" 
                />
              ) : (
                <div 
                  className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-white shadow-lg border-2 border-white/80 dark:border-slate-700"
                  style={{ backgroundColor: categoryMeta.accentColor }}
                >
                  <Package className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h2 className="text-xl font-black text-slate-800 dark:text-white drop-shadow-sm">
                  {item.name}
                </h2>

                <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {item.code}
                </span>

                {/* دکمه‌های ادیت، اکسپورت، ایمپورت */}
                <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button 
                    type="button"
                    onClick={() => onEdit(item)} 
                    title="ویرایش مشخصات کالا" 
                    className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-lg transition-colors text-emerald-600 cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"/>
                  <button 
                    type="button"
                    onClick={() => setIsExportModalOpen(true)} 
                    title="گزارش‌گیری (Export)" 
                    className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors text-blue-600 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsImportModalOpen(true)} 
                    title="ورودی اطلاعات (Import)" 
                    className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-500/20 rounded-lg transition-colors text-purple-600 cursor-pointer"
                  >
                    <FileUp className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* مشخصات فرعی کالا */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-black text-white" style={{ backgroundColor: categoryMeta.accentColor }}>
                  {categoryMeta.shortTitle}
                </span>
                {item.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {item.location}
                  </span>
                )}
                {item.secondaryUnit && (
                  <span className="flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    <Scale className="w-3 h-3 text-emerald-500" />
                    هر ۱ {item.secondaryUnit} = {item.conversionRatio} {item.primaryUnit}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* تک‌دکمه ثبت داینامیک در هدر (Ctrl+N) */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <AnimatePresence mode="wait">
              {activeTab === 'finance' && (
                <motion.button
                  key="btn-finance"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDynamicAction}
                  className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer"
                >
                  <DollarSign className="w-5 h-5 animate-bounce" />
                  <span className="text-xs">ثبت تراکنش مالی کالا (Ctrl+N)</span>
                </motion.button>
              )}

              {activeTab === 'cardex' && (
                <motion.button
                  key="btn-cardex"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDynamicAction}
                  className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-blue-500/30 flex items-center gap-2 cursor-pointer"
                >
                  <Package className="w-5 h-5 animate-pulse" />
                  <span className="text-xs">ثبت حواله ورود / خروج (Ctrl+N)</span>
                </motion.button>
              )}

              {activeTab === 'logistics' && (
                <motion.button
                  key="btn-logistics"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDynamicAction}
                  className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-2xl font-black shadow-lg shadow-amber-500/30 flex items-center gap-2 cursor-pointer"
                >
                  <Truck className="w-5 h-5" />
                  <span className="text-xs">ثبت بارنامه حمل انبار (Ctrl+N)</span>
                </motion.button>
              )}

              {activeTab === 'reports' && (
                <motion.button
                  key="btn-reports"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsExportModalOpen(true)}
                  className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-purple-500/30 flex items-center gap-2 cursor-pointer"
                >
                  <FileDown className="w-5 h-5" />
                  <span className="text-xs">خروجی اکسل و PDF</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ۴ کارت آماری بالای پروفایل کالا */}
        {/* ======================================================== */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                داشبورد کاردکس و گردش ریالی کالا
              </h3>
            </div>

            {/* کنترل‌های فیلتر زمانی و سوئیچ چک */}
            <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
              <div className="w-full md:w-[130px] h-[40px]">
                <PortalSelect options={yearOptions} value={yearFilter} onChange={setYearFilter} placeholder="سال" searchable={true} />
              </div>
              <div className="w-full md:w-[130px] h-[40px]">
                <PortalSelect options={monthOptions} value={monthFilter} onChange={setMonthFilter} placeholder="ماه" searchable={true} />
              </div>
              <div className="w-full md:w-[130px] h-[40px]">
                <PortalSelect options={weekOptions} value={weekFilter} onChange={setWeekFilter} placeholder="هفته" searchable={true} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            
            {/* کارت ۱: موجودی لحظه‌ای و ارزش موجودی */}
            <div className={`p-5 rounded-3xl border shadow-sm flex flex-col justify-between ${
              isLowStock
                ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/60'
                : 'bg-slate-50/80 dark:bg-slate-800/60 border-emerald-200/50 dark:border-emerald-900/40'
            }`}>
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">موجودی فعلی در انبار</span>
                <div className={`p-2.5 rounded-2xl ${isLowStock ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono" dir="ltr">
                  {item.currentStock.toLocaleString('fa-IR')} <span className="text-xs font-normal">{item.primaryUnit}</span>
                  {item.secondaryUnit && item.conversionRatio && (
                    <span className="text-xs text-slate-400 block font-normal">
                      (معادل {(item.currentStock / item.conversionRatio).toFixed(1)} {item.secondaryUnit})
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-bold block mt-1">
                  ارزش موجودی: {(stats.stockValue).toLocaleString('fa-IR')} {currencyLabel}
                </span>
              </div>
            </div>

            {/* کارت ۲: کل ورودی کالا */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-3xl border border-blue-200/50 dark:border-blue-900/40 p-5 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">کل ورودی و خرید</span>
                <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono" dir="ltr">
                {stats.totalInQty.toLocaleString('fa-IR')} <span className="text-xs font-normal">{item.primaryUnit}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-bold block mt-1">
                بهای خرید: {(stats.totalInCost).toLocaleString('fa-IR')} {currencyLabel}
              </span>
            </div>

            {/* کارت ۳: کل خروجی به پروژه‌ها */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-3xl border border-indigo-200/50 dark:border-indigo-900/40 p-5 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">کل ارسال به پروژه‌ها</span>
                <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono" dir="ltr">
                {stats.totalOutQty.toLocaleString('fa-IR')} <span className="text-xs font-normal">{item.primaryUnit}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-bold block mt-1">
                فاکتور کارفرمایان: {(stats.totalOutBilled).toLocaleString('fa-IR')} {currencyLabel}
              </span>
            </div>

            {/* کارت ۴: سود خالص (آربیتراژ) */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-3xl border border-teal-200/50 dark:border-teal-900/40 p-5 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">سود خالص (آربیتراژ انبار)</span>
                <div className="p-2.5 rounded-2xl bg-teal-100 dark:bg-teal-900/40 text-teal-600">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <div className={`text-2xl font-black font-mono ${stats.arbitrageProfit >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600'}`} dir="ltr">
                {stats.arbitrageProfit >= 0 ? '+' : ''}{stats.arbitrageProfit.toLocaleString('fa-IR')} <span className="text-xs font-normal">{currencyLabel}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-bold block mt-1">
                مازاد قیمت کارفرما منهای ضایعات
              </span>
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* تب‌های سه‌بعدی پروفایل کالا */}
        {/* ======================================================== */}
        <div className="px-6 pt-3">
          <ThreeDTabs
            tabs={profileTabs}
            activeTab={activeTab}
            onChange={(tabId) => {
              setActiveTab(tabId);
              setCurrentPage(1);
              setSelectedRowIds([]);
            }}
          />
        </div>

        {/* نوار جستجو و تعداد ردیف‌ها */}
        {activeTab !== 'reports' && (
          <div className="px-6 py-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-full sm:w-72">
              <AppSearchInput
                value={tabSearch}
                onChange={setTabSearch}
                placeholder="جستجو در گردش این کالا..."
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="w-32 h-[42px]">
                <PortalSelect
                  options={PAGE_LIMIT_OPTIONS}
                  value={String(pageSize)}
                  onChange={(val: string) => { setPageSize(Number(val)); setCurrentPage(1); }}
                  placeholder="تعداد نمایش..."
                />
              </div>

              {selectedRowIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    selectedRowIds.forEach(id => {
                      if (activeTab === 'cardex' || activeTab === 'logistics') triggerDelete(id, 'MOVEMENT');
                      else if (activeTab === 'finance') triggerDelete(id, 'FINANCE');
                    });
                    setSelectedRowIds([]);
                    toast.info(`${selectedRowIds.length} ردیف آماده حذف است.`);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:bg-rose-600 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف انتخاب‌شده‌ها ({selectedRowIds.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* محتوای تب‌ها */}
        <div className="px-6 py-4 flex-1">
          
          {/* تب ۱: تاریخچه مالی */}
          {activeTab === 'finance' && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3.5 w-10 text-center">
                        <AnimatedCheckbox
                          checked={paginatedRecords.length > 0 && selectedRowIds.length === paginatedRecords.length}
                          onChange={() => {
                            if (selectedRowIds.length === paginatedRecords.length) setSelectedRowIds([]);
                            else setSelectedRowIds(paginatedRecords.map((r: any) => r.id));
                          }}
                        />
                      </th>
                      <th className="p-3.5">تاریخ</th>
                      <th className="p-3.5">نوع پرداخت</th>
                      <th className="p-3.5">شرح تراکنش</th>
                      <th className="p-3.5">مبلغ ({currencyLabel})</th>
                      <th className="p-3.5">وضعیت سند</th>
                      <th className="p-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                          هیچ سند مالی برای این کالا ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 text-center">
                            <AnimatedCheckbox
                              checked={selectedRowIds.includes(t.id)}
                              onChange={() => {
                                setSelectedRowIds(prev =>
                                  prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]
                                );
                              }}
                            />
                          </td>
                          <td className="p-3.5 font-mono font-bold">{t.date}</td>
                          <td className="p-3.5 font-bold">
                            {t.type === 'CHEQUE' ? 'چک صیادی' : t.type === 'CASH' ? 'نقدی' : 'انتقال بانکی'}
                          </td>
                          <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300">
                            {t.description || 'تراکنش مالی انبار'}
                          </td>
                          <td className="p-3.5 font-mono font-black text-emerald-600 dark:text-emerald-400" dir="ltr">
                            {safeNum(t.amount).toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600">
                              قطعی
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setFinanceToEdit(t);
                                  setIsFinanceModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="ویرایش"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerDelete(t.id, 'FINANCE')}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="حذف ۵ ثانیه‌ای"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* تب ۲: کاردکس گردش کالا */}
          {activeTab === 'cardex' && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3.5 w-10 text-center">
                        <AnimatedCheckbox
                          checked={paginatedRecords.length > 0 && selectedRowIds.length === paginatedRecords.length}
                          onChange={() => {
                            if (selectedRowIds.length === paginatedRecords.length) setSelectedRowIds([]);
                            else setSelectedRowIds(paginatedRecords.map((r: any) => r.id));
                          }}
                        />
                      </th>
                      <th className="p-3.5">تاریخ</th>
                      <th className="p-3.5">نوع حواله</th>
                      <th className="p-3.5">پروژه / طرف حساب</th>
                      <th className="p-3.5">مقدار ورودی / خروجی</th>
                      <th className="p-3.5">بهای تمام‌شده ({currencyLabel})</th>
                      <th className="p-3.5">مبلغ کارفرما ({currencyLabel})</th>
                      <th className="p-3.5">سود پنهان (آربیتراژ)</th>
                      <th className="p-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                          هیچ حواله ورود یا خروجی برای این کالا ثبت نشده است. از دکمه «ثبت حواله ورود / خروج (Ctrl+N)» استفاده کنید.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((m: any) => {
                        const proj = projects.find(p => p.id === m.projectId);
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-3.5 text-center">
                              <AnimatedCheckbox
                                checked={selectedRowIds.includes(m.id)}
                                onChange={() => {
                                  setSelectedRowIds(prev =>
                                    prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]
                                  );
                                }}
                              />
                            </td>
                            <td className="p-3.5 font-mono font-bold">{m.date}</td>
                            <td className="p-3.5">
                              {m.type === 'OUT_PROJECT' ? (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 w-max">
                                  <ArrowUpRight className="w-3 h-3" /> ارسال به پروژه
                                </span>
                              ) : m.type === 'IN_PURCHASE' ? (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center gap-1 w-max">
                                  <ArrowDownRight className="w-3 h-3" /> ورود خرید
                                </span>
                              ) : m.type === 'IN_RETURN' ? (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center gap-1 w-max">
                                  <RotateCcw className="w-3 h-3" /> برگشت مصالح
                                </span>
                              ) : m.type === 'OUT_WASTE' ? (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center gap-1 w-max">
                                  <AlertTriangle className="w-3 h-3" /> ضایعات و پرت
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 w-max">
                                  تعدیل انبار
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                              {proj ? proj.name : m.description || 'انبار مرکزی'}
                            </td>
                            <td className="p-3.5 font-mono font-black" dir="ltr">
                              {safeNum(m.calculatedPrimaryQty).toLocaleString('fa-IR')} {item.primaryUnit}
                              {m.inputUnit !== item.primaryUnit && (
                                <span className="text-[10px] text-slate-400 block font-normal">
                                  ({m.inputQty} {m.inputUnit})
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-mono font-bold" dir="ltr">
                              {safeNum(m.totalInternalCost).toLocaleString('fa-IR')}
                            </td>
                            <td className="p-3.5 font-mono font-bold" dir="ltr">
                              {m.totalBilledAmount ? safeNum(m.totalBilledAmount).toLocaleString('fa-IR') : '—'}
                            </td>
                            <td className="p-3.5 font-mono font-black">
                              {safeNum(m.hiddenProfit) > 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400" dir="ltr">
                                  +{safeNum(m.hiddenProfit).toLocaleString('fa-IR')}
                                </span>
                              ) : safeNum(m.hiddenProfit) < 0 ? (
                                <span className="text-rose-600 dark:text-rose-400" dir="ltr">
                                  {safeNum(m.hiddenProfit).toLocaleString('fa-IR')}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMovementToEdit(m);
                                    setIsMovementModalOpen(true);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title="ویرایش حواله"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => triggerDelete(m.id, 'MOVEMENT')}
                                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="حذف ۵ ثانیه‌ای"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* تب ۳: لجستیک و باربری کالا */}
          {activeTab === 'logistics' && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3.5">تاریخ</th>
                      <th className="p-3.5">حواله / محموله</th>
                      <th className="p-3.5">ناوگان حمل</th>
                      <th className="p-3.5">راننده / متصدی</th>
                      <th className="p-3.5">مقدار بار</th>
                      <th className="p-3.5">کرایه پرداختی ما ({currencyLabel})</th>
                      <th className="p-3.5">کرایه کارفرما ({currencyLabel})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                          هیچ سرویس باربری برای این کالا ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((m: any) => {
                        const veh = vehicles.find(v => v.id === m.vehicleId);
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-3.5 font-mono font-bold">{m.date}</td>
                            <td className="p-3.5 font-black text-slate-900 dark:text-white">
                              {m.description || `حمل ${item.name}`}
                            </td>
                            <td className="p-3.5 font-bold">
                              {veh ? `${veh.name} (${veh.plate})` : 'باربری آزاد / خارجی'}
                            </td>
                            <td className="p-3.5 font-bold text-slate-600 dark:text-slate-400">
                              {m.driverName || '—'}
                            </td>
                            <td className="p-3.5 font-mono font-bold" dir="ltr">
                              {safeNum(m.calculatedPrimaryQty).toLocaleString('fa-IR')} {item.primaryUnit}
                            </td>
                            <td className="p-3.5 font-mono font-black text-amber-600 dark:text-amber-400" dir="ltr">
                              {safeNum(m.internalFreightCost).toLocaleString('fa-IR')}
                            </td>
                            <td className="p-3.5 font-mono font-black text-indigo-600 dark:text-indigo-400" dir="ltr">
                              {m.billedFreightCost ? safeNum(m.billedFreightCost).toLocaleString('fa-IR') : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* تب ۴: گزارشات و نمودارها */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* نمودار ۱: روند گردش کالا */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    روند ورودی و خروجی کالا ({item.primaryUnit})
                  </h4>
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'ورودی خرید', مقدار: stats.totalInQty },
                        { name: 'خروجی پروژه', مقدار: stats.totalOutQty },
                        { name: 'موجودی فعلی', مقدار: item.currentStock }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="مقدار" fill="#10b981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* نمودار ۲: سهم سود و ارزش کالا */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-500" />
                    تراز ارزش ریالی و سودآوری کالا ({currencyLabel})
                  </h4>
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'ارزش موجودی', مبلغ: stats.stockValue },
                        { name: 'بهای خرید', مبلغ: stats.totalInCost },
                        { name: 'فاکتور کارفرما', مبلغ: stats.totalOutBilled },
                        { name: 'سود آربیتراژ', مبلغ: Math.max(0, stats.arbitrageProfit) }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="مبلغ" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* صفحه‌بندی مشترک جدول‌ها */}
          {activeTab !== 'reports' && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs font-bold text-slate-500">
              <span>صفحه {currentPage} از {totalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  قبلی
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  بعدی
                </button>
              </div>
            </div>
          )}

        </div>

      </motion.div>

      {/* مودال ثبت / ویرایش حواله گردش انبار */}
      {isMovementModalOpen && (
        <InventoryMovementModal
          isOpen={isMovementModalOpen}
          onClose={() => {
            setIsMovementModalOpen(false);
            setMovementToEdit(null);
          }}
          preselectedItemId={item.id}
          initialType={movementModalType}
          editTransaction={movementToEdit}
        />
      )}

      {/* مودال تراکنش مالی انبار */}
      {isFinanceModalOpen && (
        <UniversalTransactionModal
          isOpen={isFinanceModalOpen}
          onClose={() => {
            setIsFinanceModalOpen(false);
            setFinanceToEdit(null);
          }}
          context="INVENTORY"
          editTransaction={financeToEdit}
          initialDirection="OUT"
          onSuccess={() => {
            setIsFinanceModalOpen(false);
            setFinanceToEdit(null);
            toast.success('سند مالی کالا ثبت شد.');
          }}
        />
      )}

      {/* خروجی گزارشات */}
      {isExportModalOpen && (
        <ExportBuilder
          context="INVENTORY"
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* ورودی اطلاعات */}
      {isImportModalOpen && (
        <ImportBuilder
          context="INVENTORY"
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      {/* تست لغو ۵ ثانیه‌ای */}
      <FloatingUndoToast
        undoItems={undoItems.map(u => ({ id: u.id, items: u.items, expireAt: u.expireAt }))}
        onCancel={handleCancelUndo}
      />
    </div>,
    document.body
  );
}
