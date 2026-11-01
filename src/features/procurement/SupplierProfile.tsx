import React, { useMemo, useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Store, User, Phone, MapPin, Building, CreditCard, 
  Coins, Star, CheckCircle, AlertCircle, Sparkles, FileText,
  Wrench, Mountain, Factory, Boxes, Hammer, Fuel, Truck, 
  ShoppingBag, Calendar, ArrowUpRight, Copy, Check, ExternalLink,
  Plus, Edit, Trash2, DollarSign, Wallet, FileDown, FileUp,
  Activity, Tag, Layers, TrendingUp, TrendingDown, Clock,
  CheckCircle2, ShieldCheck, ChevronDown, Eye, CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';

import { 
  type Supplier, 
  type SupplierCategory, 
  type SupplierCatalogItem,
  SUPPLIER_CATEGORIES,
  normalizeSupplierCategory,
  useProcurementStore 
} from '../../store/procurementStore';
import { usePurchaseStore, type PurchaseRecord } from '../../store/purchaseStore';
import { useFinanceStore, type Transaction } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useProjectStore } from '../projects/store/projectStore';
import { useLogisticsStore, REPAIR_TYPE_LABELS } from '../../store/logisticsStore';

import { 
  PortalSelect, 
  AppSearchInput, 
  AnimatedCheckbox, 
  FloatingUndoToast,
  ThreeDTabs,
  type TabItem
} from '../../components/ui/SharedLaborUI';
import GlassDatePicker from '../../components/ui/GlassDatePicker';
import UniversalTransactionModal from '../../components/shared/UniversalTransactionModal';
import ProcurementPurchaseModal from './components/ProcurementPurchaseModal';
import ExportBuilder from '../../components/shared/ExportBuilder';
import ImportBuilder from '../../components/shared/ImportBuilder';
import { generateUUID } from '../../core/utils/uuid';

export interface SupplierProfileProps {
  supplierId: string;
  onBack: () => void;
  onEdit?: (supplier: Supplier) => void;
  onDelete?: (id: string, name: string) => void;
  onNewPurchaseForSupplier?: (supplierName: string) => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  materialShop: Boxes,
  mine: Mountain,
  ironMarket: Building,
  hardwareStore: Hammer,
  repairShop: Wrench,
  externalLogistics: Truck,
  BUILDING_MATERIALS: Boxes,
  QUARRY_SAND: Mountain,
  WORKSHOP_MACHINING: Wrench,
  TOOL_HARDWARE: Hammer,
  PRECAST_FACTORIES: Factory,
  FUEL_WATER: Fuel,
  EQUIPMENT_RENTAL: Truck,
};

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

export default function SupplierProfile({
  supplierId,
  onBack,
  onEdit,
  onDelete,
  onNewPurchaseForSupplier
}: SupplierProfileProps) {
  const supplier = useProcurementStore(state => state.suppliers.find(s => s.id === supplierId));
  const { purchases, deletePurchase } = usePurchaseStore();
  const { transactions, deleteTransaction } = useFinanceStore();
  const { projects } = useProjectStore();
  const { repairs, vehicles } = useLogisticsStore();
  const { addCatalogItem, deleteCatalogItem, updateCatalogItem } = useProcurementStore();
  const { currency } = useSettingsStore(state => state.settings);

  const isRial = currency === 'rial' || (currency as any) === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';

  // تب فعال
  const [activeTab, setActiveTab] = useState<string>('finance');

  // فیلتر دوحالته چک و زمان
  const [chequeMode, setChequeMode] = useState<'REALIZED' | 'COMMITTED'>('REALIZED');
  const currentYear = moment().jYear();
  const [yearFilter, setYearFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [weekFilter, setWeekFilter] = useState('ALL');

  // مودال‌های جانبی
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseModalMode, setPurchaseModalMode] = useState<'MATERIAL_ONLY' | 'FREIGHT_ONLY' | 'COMBINED'>('COMBINED');
  const [editPurchaseRecord, setEditPurchaseRecord] = useState<PurchaseRecord | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<any | null>(null);

  // مودال افزودن قلم به کاتالوگ
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogItemToEdit, setCatalogItemToEdit] = useState<SupplierCatalogItem | null>(null);
  const [catalogName, setCatalogName] = useState('');
  const [catalogUnit, setCatalogUnit] = useState('تن');
  const [catalogPrice, setCatalogPrice] = useState('');
  const [catalogCode, setCatalogCode] = useState('');

  // استیت‌های جستجو و صفحه‌بندی مشترک تب‌ها
  const [tabSearch, setTabSearch] = useState('');
  const [tabDateRange, setTabDateRange] = useState('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // سیستم حذف ۵ ثانیه‌ای (FloatingUndoToast)
  const [undoItems, setUndoItems] = useState<{ id: string; items: string[]; expireAt: number; itemType: 'TRANSACTION' | 'PURCHASE' | 'CATALOG' }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const normCategory = useMemo(() => {
    return normalizeSupplierCategory(supplier?.category);
  }, [supplier?.category]);

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

  // تایمر ۵ ثانیه‌ای جهت حذف قطعی پس از انقضا
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
        const expired = prev.filter(u => u.expireAt <= now);
        const active = prev.filter(u => u.expireAt > now);
        if (expired.length > 0) {
          expired.forEach(u => {
            if (u.itemType === 'TRANSACTION') {
              u.items.forEach(id => deleteTransaction(id));
            } else if (u.itemType === 'PURCHASE') {
              u.items.forEach(id => deletePurchase(id));
            } else if (u.itemType === 'CATALOG' && supplier) {
              u.items.forEach(id => deleteCatalogItem(supplier.id, id));
            }
          });
          setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e => e.items).includes(id)));
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteTransaction, deletePurchase, deleteCatalogItem, supplier]);

  const triggerDelete = (id: string, itemType: 'TRANSACTION' | 'PURCHASE' | 'CATALOG') => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: [id], expireAt: Date.now() + 5000, itemType }]);
    setPendingDeleteIds(prev => [...prev, id]);
  };

  const handleCancelUndo = (undoId: string | number) => {
    const target = undoItems.find(u => String(u.id) === String(undoId));
    if (target) {
      setPendingDeleteIds(prev => prev.filter(id => !target.items.includes(id)));
      setUndoItems(prev => prev.filter(u => String(u.id) !== String(undoId)));
      toast.success('عملیات حذف لغو شد.');
    }
  };

  // بررسی همخوانی تاریخ با فیلترهای سال/ماه
  const isDateMatch = (dStr?: string) => {
    if (!dStr) return true;
    if (yearFilter !== 'ALL' && dStr.substring(0, 4) !== yearFilter) return false;
    if (monthFilter !== 'ALL' && dStr.substring(5, 7) !== monthFilter) return false;
    return true;
  };

  // استخراج فاکتورهای خرید این تأمین‌کننده
  const supplierPurchases = useMemo(() => {
    if (!supplier) return [];
    const supName = supplier.name.trim().toLowerCase();
    return purchases.filter(p => {
      if (pendingDeleteIds.includes(p.id)) return false;
      const isMatched = (p.supplierId && p.supplierId === supplier.id) ||
        (p.vendor && p.vendor.trim().toLowerCase() === supName);
      return isMatched && isDateMatch(p.date);
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [purchases, supplier, pendingDeleteIds, yearFilter, monthFilter]);

  // استخراج فاکتورهای تعمیرات لجستیک برای این تعمیرگاه
  const supplierRepairs = useMemo(() => {
    if (!supplier) return [];
    const supName = supplier.name.trim().toLowerCase();
    return (repairs || []).filter(r => {
      const isMatched = r.mechanicInfo?.supplierId === supplier.id ||
        (r.mechanicInfo?.mechanicName && r.mechanicInfo.mechanicName.trim().toLowerCase().includes(supName));
      return isMatched && isDateMatch(r.date);
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [repairs, supplier, yearFilter, monthFilter]);

  // تراکنش‌های مالی مربوط به این تأمین‌کننده
  const supplierTransactions = useMemo(() => {
    if (!supplier) return [];
    const supName = supplier.name.trim().toLowerCase();
    return transactions.filter(t => {
      if (pendingDeleteIds.includes(t.id)) return false;
      const matchAlloc = t.allocations?.some(a => a.recordType === 'SUPPLIER' && a.recordId === supplier.id);
      const matchRef = t.referenceId === supplier.id;
      const matchDesc = t.description && t.description.toLowerCase().includes(supName);
      return (matchAlloc || matchRef || matchDesc) && isDateMatch(t.date);
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, supplier, pendingDeleteIds, yearFilter, monthFilter]);

  // ==========================================
  // محاسبات ۴ کارت آماری بالای پروفایل
  // ==========================================
  const stats = useMemo(() => {
    if (!supplier) return { totalVolume: 0, paymentsMade: 0, balance: 0, arbitrageProfit: 0 };

    let totalVolume = 0;
    let totalArbitrageProfit = 0;

    supplierPurchases.forEach(p => {
      totalVolume += safeNum(p.internalCost);
      totalArbitrageProfit += safeNum(p.arbitrageProfit || 0);
    });

    if (normCategory === 'repairShop') {
      supplierRepairs.forEach(r => {
        totalVolume += safeNum(r.totalCost);
      });
    }

    let paymentsMade = 0;
    supplierTransactions.forEach(t => {
      if (t.type === 'CHEQUE') {
        const cStatus = t.chequeDetails?.status || 'PENDING';
        if (cStatus === 'BOUNCED' || cStatus === 'RETURNED') return;
        if (chequeMode === 'REALIZED' && cStatus !== 'CASHED' && cStatus !== 'EXCHANGED') return;
      }
      if (t.direction === 'OUT') {
        paymentsMade += safeNum(t.amount);
      } else if (t.direction === 'IN') {
        // بازگشت وجه یا بستانکاری از تأمین‌کننده
        paymentsMade -= safeNum(t.amount);
      }
    });

    // تراز نهایی: تفریق کل فاکتورها از کل پرداختی‌های واقعی
    const balance = totalVolume - paymentsMade;

    return {
      totalVolume,
      paymentsMade,
      balance,
      arbitrageProfit: totalArbitrageProfit
    };
  }, [supplier, supplierPurchases, supplierRepairs, supplierTransactions, chequeMode, normCategory]);

  // کنترل کلید میانبر Ctrl+N
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
  }, [isOpen, activeTab, supplier]);

  // اکشن داینامیک دکمه هدر
  const handleDynamicAction = () => {
    if (!supplier) return;
    if (activeTab === 'finance') {
      setTransactionToEdit(null);
      setIsTransactionModalOpen(true);
    } else if (activeTab === 'invoices') {
      setEditPurchaseRecord(null);
      setPurchaseModalMode('COMBINED');
      setIsPurchaseModalOpen(true);
    } else if (activeTab === 'catalog') {
      setCatalogItemToEdit(null);
      setCatalogName('');
      setCatalogPrice('');
      setCatalogCode('');
      setCatalogUnit('تن');
      setIsCatalogModalOpen(true);
    } else if (activeTab === 'repairs') {
      setEditPurchaseRecord(null);
      setPurchaseModalMode('COMBINED');
      setIsPurchaseModalOpen(true);
    } else if (activeTab === 'freight') {
      setEditPurchaseRecord(null);
      setPurchaseModalMode('FREIGHT_ONLY');
      setIsPurchaseModalOpen(true);
    } else {
      setIsExportModalOpen(true);
    }
  };

  // ذخیره آیتم کاتالوگ
  const handleSaveCatalogItem = () => {
    if (!catalogName.trim() || !supplier) {
      toast.error('لطفاً عنوان کالا را وارد کنید.');
      return;
    }
    const priceNum = safeNum(catalogPrice);
    if (catalogItemToEdit) {
      updateCatalogItem(supplier.id, catalogItemToEdit.id, {
        name: catalogName.trim(),
        unit: catalogUnit,
        price: priceNum,
        code: catalogCode.trim() || undefined,
        updatedAt: moment().format('jYYYY/jMM/jDD')
      });
      toast.success('قلم کاتالوگ به‌روزرسانی شد.');
    } else {
      addCatalogItem(supplier.id, {
        name: catalogName.trim(),
        unit: catalogUnit,
        price: priceNum,
        code: catalogCode.trim() || undefined
      });
      toast.success('کالای جدید به کاتالوگ تأمین‌کننده افزوده شد.');
    }
    setIsCatalogModalOpen(false);
  };

  if (!supplier) return null;

  const categoryMeta = SUPPLIER_CATEGORIES[normCategory] || SUPPLIER_CATEGORIES.materialShop;
  const CategoryIcon = CATEGORY_ICONS[normCategory] || Boxes;

  // تب‌های داینامیک متناسب با صنف
  const dynamicTabs: TabItem<string>[] = [
    {
      id: 'finance',
      label: 'تاریخچه مالی و پرداختی‌ها',
      icon: Wallet,
      count: supplierTransactions.length,
      accentColor: '#10b981'
    }
  ];

  if (normCategory === 'repairShop') {
    dynamicTabs.push({
      id: 'repairs',
      label: 'تاریخچه تعمیرات ناوگان و ابزارآلات',
      icon: Wrench,
      count: supplierRepairs.length,
      accentColor: '#f59e0b'
    });
    dynamicTabs.push({
      id: 'reports',
      label: 'گزارشات و نمودارها',
      icon: Activity,
      accentColor: '#8b5cf6'
    });
  } else if (normCategory === 'externalLogistics') {
    dynamicTabs.push({
      id: 'freight',
      label: 'تاریخچه باربری و خرید بار',
      icon: Truck,
      count: supplierPurchases.length,
      accentColor: '#10b981'
    });
    dynamicTabs.push({
      id: 'reports',
      label: 'گزارشات و نمودارها',
      icon: Activity,
      accentColor: '#8b5cf6'
    });
  } else {
    // اصناف مصالح، معادن، آهن و ابزار
    dynamicTabs.push({
      id: 'invoices',
      label: 'فاکتورهای خرید و ارسال بار',
      icon: FileText,
      count: supplierPurchases.length,
      accentColor: '#3b82f6'
    });
    dynamicTabs.push({
      id: 'catalog',
      label: 'کاتالوگ و لیست قیمت مصالح',
      icon: Tag,
      count: (supplier.catalog || []).length,
      accentColor: '#f97316'
    });
    dynamicTabs.push({
      id: 'reports',
      label: 'گزارشات و نمودارها',
      icon: Activity,
      accentColor: '#8b5cf6'
    });
  }

  // داده‌های فیلترشده تب فعال برای جدول
  const activeTabRecords = () => {
    const sTerm = tabSearch.trim().toLowerCase();

    if (activeTab === 'finance') {
      return supplierTransactions.filter(t => {
        if (!sTerm) return true;
        return (
          t.description?.toLowerCase().includes(sTerm) ||
          t.type?.toLowerCase().includes(sTerm) ||
          String(t.amount).includes(sTerm)
        );
      });
    }

    if (activeTab === 'invoices' || activeTab === 'freight') {
      return supplierPurchases.filter(p => {
        if (!sTerm) return true;
        return (
          p.title?.toLowerCase().includes(sTerm) ||
          p.unit?.toLowerCase().includes(sTerm) ||
          p.driverName?.toLowerCase().includes(sTerm)
        );
      });
    }

    if (activeTab === 'catalog') {
      return (supplier.catalog || []).filter(c => {
        if (!sTerm) return true;
        return (
          c.name?.toLowerCase().includes(sTerm) ||
          c.code?.toLowerCase().includes(sTerm) ||
          c.unit?.toLowerCase().includes(sTerm)
        );
      });
    }

    if (activeTab === 'repairs') {
      return supplierRepairs.filter(r => {
        if (!sTerm) return true;
        const veh = vehicles.find(v => v.id === r.vehicleId);
        const vehText = veh ? `${veh.name} ${veh.plate}` : '';
        return (
          vehText.toLowerCase().includes(sTerm) ||
          r.description?.toLowerCase().includes(sTerm)
        );
      });
    }

    return [];
  };

  const recordsList = activeTabRecords();
  const paginatedRecords = pageSize === 9999 ? recordsList : recordsList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.max(1, Math.ceil(recordsList.length / (pageSize === 9999 ? 1 : pageSize)));

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full flex flex-col gap-6 pb-24 h-full relative"
    >
      {/* ======================================================== */}
      {/* هدر چسبان و اصلی پروفایل تأمین‌کننده */}
      {/* ======================================================== */}
      <div className="sticky top-4 z-[100] flex flex-col lg:flex-row items-center justify-between gap-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/80 dark:border-slate-700/80 shadow-[0_15px_40px_rgba(0,0,0,0.08)] rounded-[2.5rem] px-6 py-5">
          
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <button 
              type="button"
              onClick={onBack} 
              className="flex items-center justify-center p-3.5 rounded-[1.25rem] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-inner border border-slate-200 dark:border-slate-600 transition-all shrink-0 group cursor-pointer" 
              title="بازگشت به لیست تأمین‌کنندگان"
            >
              <ArrowRight className="w-6 h-6 text-slate-700 dark:text-slate-300 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* عکس / لوگوی تأمین‌کننده */}
            <div className="relative shrink-0">
              {supplier.logo ? (
                <img 
                  src={supplier.logo} 
                  alt={supplier.name} 
                  className="w-[72px] h-[72px] rounded-2xl object-cover shadow-lg border-2 border-white dark:border-slate-700" 
                />
              ) : (
                <div 
                  className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-white shadow-lg border-2 border-white/80 dark:border-slate-700"
                  style={{ backgroundColor: categoryMeta.accentColor }}
                >
                  <CategoryIcon className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h2 className="text-xl font-black text-slate-800 dark:text-white drop-shadow-sm">
                  {supplier.name}
                </h2>

                {/* رتبه کیفیت کالا و خوش‌قولی (Quality Rating) */}
                <div className="flex items-center gap-0.5 px-2 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-500" title={`رتبه کیفیت و خدمات: ${supplier.rating || 5} از ۵`}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${star <= (supplier.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                    />
                  ))}
                </div>

                {/* دکمه‌های ادیت، اکسپورت، ایمپورت */}
                <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button 
                    type="button"
                    onClick={() => onEdit?.(supplier)} 
                    title="ویرایش پروفایل تأمین‌کننده" 
                    className="p-1.5 hover:bg-teal-50 dark:hover:bg-teal-500/20 rounded-lg transition-colors text-teal-600 cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"/>
                  <button 
                    type="button"
                    onClick={() => setIsExportModalOpen(true)} 
                    title="گزارش‌گیری (Export)" 
                    className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-lg transition-colors text-emerald-600 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsImportModalOpen(true)} 
                    title="ورودی اطلاعات (Import)" 
                    className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors text-blue-600 cursor-pointer"
                  >
                    <FileUp className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* مشخصات تأمین‌کننده */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-black text-white" style={{ backgroundColor: categoryMeta.accentColor }}>
                  {categoryMeta.shortTitle}
                </span>
                {supplier.managerName && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {supplier.managerName}
                  </span>
                )}
                {supplier.phone && (
                  <span className="flex items-center gap-1 font-mono" dir="ltr">
                    <Phone className="w-3.5 h-3.5" />
                    {supplier.phone}
                  </span>
                )}
                {supplier.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {supplier.city}
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
                  <span className="text-xs">ثبت تراکنش و پرداخت (Ctrl+N)</span>
                </motion.button>
              )}

              {activeTab === 'invoices' && (
                <motion.button
                  key="btn-invoices"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDynamicAction}
                  className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-blue-500/30 flex items-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-5 h-5 animate-pulse" />
                  <span className="text-xs">ثبت فاکتور خرید (Ctrl+N)</span>
                </motion.button>
              )}

              {activeTab === 'catalog' && (
                <motion.button
                  key="btn-catalog"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDynamicAction}
                  className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-2xl font-black shadow-lg shadow-orange-500/30 flex items-center gap-2 cursor-pointer"
                >
                  <Tag className="w-5 h-5" />
                  <span className="text-xs">افزودن به کاتالوگ (Ctrl+N)</span>
                </motion.button>
              )}

              {activeTab === 'repairs' && (
                <motion.button
                  key="btn-repairs"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDynamicAction}
                  className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-2xl font-black shadow-lg shadow-amber-500/30 flex items-center gap-2 cursor-pointer"
                >
                  <Wrench className="w-5 h-5" />
                  <span className="text-xs">ثبت خدمات تعمیرگاه (Ctrl+N)</span>
                </motion.button>
              )}

              {activeTab === 'freight' && (
                <motion.button
                  key="btn-freight"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDynamicAction}
                  className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer"
                >
                  <Truck className="w-5 h-5" />
                  <span className="text-xs">ثبت بارنامه / کرایه حمل (Ctrl+N)</span>
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
        {/* داشبورد ۴ کارت آماری بالا + فیلترهای زمانی و چک */}
        {/* ======================================================== */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-500" />
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                داشبورد عملکرد مالی و حجم معاملات
              </h3>
            </div>

            {/* کنترل‌های فیلتر تاریخ و چک */}
            <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
              {/* کلید دوحالته چک */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl h-[40px] border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setChequeMode('REALIZED')}
                  className={`px-3 py-1 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    chequeMode === 'REALIZED'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="فقط تراکنش‌های نقدی و چک‌های وصول‌شده"
                >
                  وصول‌شده (نقدی)
                </button>
                <button
                  type="button"
                  onClick={() => setChequeMode('COMMITTED')}
                  className={`px-3 py-1 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    chequeMode === 'COMMITTED'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="تعهدات کامل شامل چک‌های در جریان و اسناد معوق"
                >
                  تعهدی (شامل چک‌های در جریان)
                </button>
              </div>

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

          {/* ۴ کارت آماری */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            
            {/* کارت ۱: کل حجم خرید / کارکرد */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-3xl border border-blue-200/50 dark:border-blue-900/40 p-5 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">کل حجم خرید / کارکرد</span>
                <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono" dir="ltr">
                {stats.totalVolume.toLocaleString('fa-IR')} <span className="text-xs font-normal">{currencyLabel}</span>
              </div>
            </div>

            {/* کارت ۲: کل پرداختی‌های ما */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-3xl border border-emerald-200/50 dark:border-emerald-900/40 p-5 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">کل پرداختی ما ({chequeMode === 'REALIZED' ? 'نقدی' : 'تعهدی'})</span>
                <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
                {stats.paymentsMade.toLocaleString('fa-IR')} <span className="text-xs font-normal">{currencyLabel}</span>
              </div>
            </div>

            {/* کارت ۳: تراز و مانده حساب نهایی */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">تراز و مانده‌حساب نهایی</span>
                <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${stats.balance > 0 ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600'}`}>
                  {stats.balance > 0 ? 'بدهکاریم' : stats.balance < 0 ? 'بستانکاریم' : 'تسویه کامل'}
                </div>
              </div>
              <div className={`text-2xl font-black font-mono ${stats.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} dir="ltr">
                {Math.abs(stats.balance).toLocaleString('fa-IR')} <span className="text-xs font-normal">{currencyLabel}</span>
              </div>
            </div>

            {/* کارت ۴: مجموع سود پنهان (آربیتراژ) */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-3xl border border-teal-200/50 dark:border-teal-900/40 p-5 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">سود پنهان (آربیتراژ) کسب‌شده</span>
                <div className="p-2.5 rounded-2xl bg-teal-100 dark:bg-teal-900/40 text-teal-600">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono" dir="ltr">
                +{stats.arbitrageProfit.toLocaleString('fa-IR')} <span className="text-xs font-normal">{currencyLabel}</span>
              </div>
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* تب‌های سه‌بعدی و هوشمند اصناف تدارکات */}
        {/* ======================================================== */}
        <div className="px-6 pt-3">
          <ThreeDTabs
            tabs={dynamicTabs}
            activeTab={activeTab}
            onChange={(tabId) => {
              setActiveTab(tabId);
              setCurrentPage(1);
              setSelectedRowIds([]);
            }}
          />
        </div>

        {/* نوار فیلتر و جستجوی استاندارد داخل تب */}
        {activeTab !== 'reports' && (
          <div className="px-6 py-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-full sm:w-72">
              <AppSearchInput
                value={tabSearch}
                onChange={setTabSearch}
                placeholder="جستجو در رکوردهای این تب..."
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
                      if (activeTab === 'finance') triggerDelete(id, 'TRANSACTION');
                      else if (activeTab === 'invoices' || activeTab === 'freight') triggerDelete(id, 'PURCHASE');
                      else if (activeTab === 'catalog') triggerDelete(id, 'CATALOG');
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

        {/* محتوای اختصاصی هر تب */}
        <div className="px-6 py-4 flex-1">
          
          {/* تب ۱: تاریخچه مالی و پرداختی‌ها */}
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
                      <th className="p-3.5">وضعیت سند / چک</th>
                      <th className="p-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                          هیچ سند مالی یا پرداختی ثبت نشده است.
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
                            {t.type === 'CHEQUE' ? 'چک صیادی' : t.type === 'CASH' ? 'نقدی' : t.type === 'CARD' ? 'کارت به کارت' : 'پایا / ساتنا'}
                          </td>
                          <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300">
                            {t.description || 'پرداخت به تأمین‌کننده'}
                          </td>
                          <td className="p-3.5 font-mono font-black text-emerald-600 dark:text-emerald-400" dir="ltr">
                            {safeNum(t.amount).toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3.5">
                            {t.type === 'CHEQUE' ? (
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                t.chequeDetails?.status === 'CASHED'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                                  : t.chequeDetails?.status === 'BOUNCED'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                              }`}>
                                {t.chequeDetails?.status === 'CASHED' ? 'وصول شده' : t.chequeDetails?.status === 'BOUNCED' ? 'برگشتی' : 'در جریان وصول'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                قطعی
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setTransactionToEdit(t);
                                  setIsTransactionModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="ویرایش"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerDelete(t.id, 'TRANSACTION')}
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

          {/* تب ۲: فاکتورهای خرید و ارسال بار (یا باربری) */}
          {(activeTab === 'invoices' || activeTab === 'freight') && (
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
                      <th className="p-3.5">عنوان مصالح / خدمات</th>
                      <th className="p-3.5">مقصد</th>
                      <th className="p-3.5">مقدار و واحد</th>
                      <th className="p-3.5">کرایه حمل ({currencyLabel})</th>
                      <th className="p-3.5">مبلغ کل ({currencyLabel})</th>
                      <th className="p-3.5">سود پنهان (آربیتراژ)</th>
                      <th className="p-3.5">وضعیت تسویه</th>
                      <th className="p-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                          هیچ فاکتور خریدی برای این تأمین‌کننده یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((p: any) => {
                        const proj = projects.find(x => x.id === p.projectId);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-3.5 text-center">
                              <AnimatedCheckbox
                                checked={selectedRowIds.includes(p.id)}
                                onChange={() => {
                                  setSelectedRowIds(prev =>
                                    prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                                  );
                                }}
                              />
                            </td>
                            <td className="p-3.5 font-mono font-bold">{p.date}</td>
                            <td className="p-3.5 font-black text-slate-900 dark:text-white">
                              {p.title}
                            </td>
                            <td className="p-3.5 font-bold">
                              {p.destinationType === 'INVENTORY' ? (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                                  انبار مرکزی
                                </span>
                              ) : p.destinationType === 'INTERNAL' ? (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  مصرف داخلی
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                                  {proj ? proj.name : 'پروژه'}
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-mono font-bold">
                              {safeNum(p.quantity || p.internalQty).toLocaleString('fa-IR')} {p.unit || p.internalUnit}
                            </td>
                            <td className="p-3.5 font-mono font-bold" dir="ltr">
                              {safeNum(p.transportInternalCost || p.internalFreightCost).toLocaleString('fa-IR')}
                            </td>
                            <td className="p-3.5 font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                              {safeNum(p.internalCost).toLocaleString('fa-IR')}
                            </td>
                            <td className="p-3.5 font-mono font-black">
                              {safeNum(p.arbitrageProfit) > 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400" dir="ltr">
                                  +{safeNum(p.arbitrageProfit).toLocaleString('fa-IR')}
                                </span>
                              ) : safeNum(p.arbitrageProfit) < 0 ? (
                                <span className="text-rose-600 dark:text-rose-400" dir="ltr">
                                  {safeNum(p.arbitrageProfit).toLocaleString('fa-IR')}
                                </span>
                              ) : (
                                <span className="text-slate-400">سربه‌سر</span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                p.settlementStatus === 'SETTLED'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                              }`}>
                                {p.settlementStatus === 'SETTLED' ? 'تسویه کامل' : 'پرداخت‌نشده / نسیه'}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditPurchaseRecord(p);
                                    setPurchaseModalMode('COMBINED');
                                    setIsPurchaseModalOpen(true);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title="ویرایش فاکتور"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => triggerDelete(p.id, 'PURCHASE')}
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

          {/* تب ۳: کاتالوگ و لیست قیمت مصالح */}
          {activeTab === 'catalog' && (
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
                      <th className="p-3.5">کد / مشخصات</th>
                      <th className="p-3.5">نام کالا / مصالح</th>
                      <th className="p-3.5">واحد سنجش</th>
                      <th className="p-3.5">قیمت واحد فعلی ({currencyLabel})</th>
                      <th className="p-3.5">آخرین تاریخ به‌روزرسانی</th>
                      <th className="p-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                          هیچ کالایی در کاتالوگ این تأمین‌کننده ثبت نشده است. از دکمه «افزودن به کاتالوگ (Ctrl+N)» استفاده کنید.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 text-center">
                            <AnimatedCheckbox
                              checked={selectedRowIds.includes(c.id)}
                              onChange={() => {
                                setSelectedRowIds(prev =>
                                  prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]
                                );
                              }}
                            />
                          </td>
                          <td className="p-3.5 font-mono text-slate-500">{c.code || '—'}</td>
                          <td className="p-3.5 font-black text-slate-900 dark:text-white">{c.name}</td>
                          <td className="p-3.5 font-bold">{c.unit}</td>
                          <td className="p-3.5 font-mono font-black text-orange-600 dark:text-orange-400" dir="ltr">
                            {safeNum(c.price).toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-slate-400">{c.updatedAt || '—'}</td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setCatalogItemToEdit(c);
                                  setCatalogName(c.name);
                                  setCatalogUnit(c.unit);
                                  setCatalogPrice(safeNum(c.price).toLocaleString('fa-IR'));
                                  setCatalogCode(c.code || '');
                                  setIsCatalogModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="ویرایش قلم"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerDelete(c.id, 'CATALOG')}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="حذف"
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

          {/* تب تعمیرات برای صنف repairShop */}
          {activeTab === 'repairs' && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3.5">تاریخ</th>
                      <th className="p-3.5">خودرو / ماشین‌آلات</th>
                      <th className="p-3.5">نوع تعمیر</th>
                      <th className="p-3.5">توضیحات و قطعات تعویضی</th>
                      <th className="p-3.5">مبلغ کل هزینه ({currencyLabel})</th>
                      <th className="p-3.5">وضعیت پرداخت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                          هیچ رکورد تعمیراتی برای این تعمیرگاه ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((r: any) => {
                        const veh = vehicles.find(v => v.id === r.vehicleId);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-3.5 font-mono font-bold">{r.date}</td>
                            <td className="p-3.5 font-black text-slate-900 dark:text-white">
                              {veh ? `${veh.name} (${veh.plate})` : 'ماشین‌آلات کارگاه'}
                            </td>
                            <td className="p-3.5 font-bold">
                              {REPAIR_TYPE_LABELS[r.repairType] || 'تعمیرات و بازسازی'}
                            </td>
                            <td className="p-3.5 font-bold text-slate-600 dark:text-slate-400">
                              {r.description || `${r.replacedParts?.length || 0} قلم قطعه تعویضی`}
                            </td>
                            <td className="p-3.5 font-mono font-black text-amber-600 dark:text-amber-400" dir="ltr">
                              {safeNum(r.totalCost).toLocaleString('fa-IR')}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                r.isPaid
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                              }`}>
                                {r.isPaid ? 'تسویه شده' : 'معوق / بدهی'}
                              </span>
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
                
                {/* نمودار ۱: روند خریدهای ماهانه */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-500" />
                    روند حجم خرید و خدمات ماهانه ({currencyLabel})
                  </h4>
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { month: 'فروردین', amount: stats.totalVolume * 0.1 },
                        { month: 'اردیبهشت', amount: stats.totalVolume * 0.2 },
                        { month: 'خرداد', amount: stats.totalVolume * 0.15 },
                        { month: 'تیر', amount: stats.totalVolume * 0.25 },
                        { month: 'مرداد', amount: stats.totalVolume * 0.3 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="amount" fill="#0d9488" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* نمودار ۲: نسبت خرید به پرداخت‌ها */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    تراز خرید در برابر تسویه و پرداختی‌ها
                  </h4>
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'حجم کل', value: stats.totalVolume },
                        { name: 'پرداختی ما', value: stats.paymentsMade },
                        { name: 'مانده‌حساب', value: Math.abs(stats.balance) },
                        { name: 'سود آربیتراژ', value: stats.arbitrageProfit }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
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


      {/* مودال ثبت / ویرایش تراکنش مالی مادر */}
      {isTransactionModalOpen && (
        <UniversalTransactionModal
          isOpen={isTransactionModalOpen}
          onClose={() => {
            setIsTransactionModalOpen(false);
            setTransactionToEdit(null);
          }}
          context="SUPPLIER"
          supplierId={supplier.id}
          editTransaction={transactionToEdit}
          initialDirection="OUT"
          onSuccess={() => {
            setIsTransactionModalOpen(false);
            setTransactionToEdit(null);
            toast.success('سند مالی با موفقیت ثبت شد.');
          }}
        />
      )}

      {/* مودال مادر ثبت / ویرایش فاکتور خرید و باربری */}
      {isPurchaseModalOpen && (
        <ProcurementPurchaseModal
          isOpen={isPurchaseModalOpen}
          onClose={() => {
            setIsPurchaseModalOpen(false);
            setEditPurchaseRecord(null);
          }}
          initialSupplierId={supplier.id}
          initialVendorName={supplier.name}
          initialDestination="PROJECT"
          editRecord={editPurchaseRecord}
        />
      )}

      {/* مودال افزودن / ویرایش قلم کاتالوگ */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-500" />
                {catalogItemToEdit ? 'ویرایش قلم کاتالوگ' : 'افزودن قلم جدید به کاتالوگ'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  نام کالا / مصالح *
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={catalogName}
                  onChange={e => setCatalogName(e.target.value)}
                  placeholder="مثال: سیمان پاکتی تیپ ۲، میلگرد ۱۶..."
                  className="w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    کد / مشخصه فنی
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={catalogCode}
                    onChange={e => setCatalogCode(e.target.value)}
                    placeholder="کد کالا..."
                    className="w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    واحد سنجش
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={catalogUnit}
                    onChange={e => setCatalogUnit(e.target.value)}
                    placeholder="تن، پاکت، شاخه..."
                    className="w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  قیمت واحد ({currencyLabel})
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={catalogPrice}
                  onChange={e => setCatalogPrice(safeNum(e.target.value).toLocaleString('fa-IR'))}
                  placeholder="۰"
                  className="w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white font-mono font-black text-xs outline-none focus:border-teal-500 text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveCatalogItem}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-md cursor-pointer"
              >
                ذخیره در کاتالوگ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* خروجی گزارشات */}
      {isExportModalOpen && (
        <ExportBuilder
          context="SUPPLIER"
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* ورودی اطلاعات */}
      {isImportModalOpen && (
        <ImportBuilder
          context="SUPPLIER"
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      {/* تست لغو حذف ۵ ثانیه‌ای */}
      <FloatingUndoToast
        undoItems={undoItems.map(u => ({ id: u.id, items: u.items, expireAt: u.expireAt }))}
        onCancel={handleCancelUndo}
      />
    </motion.div>
  );
}
