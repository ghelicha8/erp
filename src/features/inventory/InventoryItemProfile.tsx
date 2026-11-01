import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Package, Boxes, Building, Mountain, Layers, Wrench, Zap, Grid, 
  Paintbrush, Hammer, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, RotateCcw, 
  AlertTriangle, Truck, Activity, Edit, Trash2, FileDown, FileUp, Sparkles, Plus, 
  Calendar, Check, CheckCircle2, TrendingUp, TrendingDown, Clock, Building2, Store, 
  Fuel, Scale, Bell, Printer, User, Coins, ShieldCheck, Tag, Info, AlertCircle,
  BarChart3, RefreshCw, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';
import { 
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';

import { 
  useInventoryStore, 
  type InventoryItem, 
  type InventoryTransaction,
  type InventoryBatch,
  type UnitConversionRule,
  type ValuationMethod,
  type ExitPriority,
  INVENTORY_CATEGORIES,
  convertQuantity
} from '../../store/inventoryStore';
import { useFinanceStore } from '../../store/financeStore';
import { useProjectStore } from '../projects/store/projectStore';
import { useLogisticsStore } from '../../store/logisticsStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useProcurementStore } from '../../store/procurementStore';
import { useClientStore } from '../../store/clientStore';

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
import InventoryEntryModal from './components/InventoryEntryModal';
import InventoryExitModal from './components/InventoryExitModal';
import InventoryMovementModal from './components/InventoryMovementModal';
import ExportBuilder from '../../components/shared/ExportBuilder';
import ImportBuilder from '../../components/shared/ImportBuilder';
import { generateUUID } from '../../core/utils/uuid';

export interface InventoryItemProfileProps {
  itemId: string;
  onBack: () => void;
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (id: string, name: string) => void;
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

const formatNumber = (num: number): string => {
  if (!num || isNaN(num)) return '۰';
  return num.toLocaleString('fa-IR');
};

const CATEGORY_ICONS: Record<string, any> = {
  cement_mortar: Boxes,
  steel_iron: Building,
  brick_block: Layers,
  sand_gravel: Mountain,
  plumbing: Wrench,
  electrical: Zap,
  tile_ceramic: Grid,
  paint_insulation: Paintbrush,
  workshop_consumable: Hammer,
};

const PAGE_LIMIT_OPTIONS = [
  { value: '10', label: '۱۰ ردیف' },
  { value: '25', label: '۲۵ ردیف' },
  { value: '50', label: '۵۰ ردیف' },
  { value: '9999', label: 'همه ردیف‌ها' },
];

// ============================================================================
// ویجت اختصاصی عقربه نیم‌دایره آمپر بنزین انیمیشنی (Animated Fuel-Gauge Meter)
// ============================================================================
export const AnimatedFuelGauge = ({
  currentStock,
  minStockLevel,
  maxStockLevel,
  unitLabel
}: {
  currentStock: number;
  minStockLevel: number;
  maxStockLevel?: number;
  unitLabel: string;
}) => {
  const maxCap = maxStockLevel && maxStockLevel > minStockLevel ? maxStockLevel : Math.max(minStockLevel * 4, 100);
  const percentage = Math.min(100, Math.max(0, (currentStock / maxCap) * 100));
  
  // زاویه عقربه: از منفی ۹۰ درجه (E: خالی) تا مثبت ۹۰ درجه (F: پر)
  const needleAngle = -90 + (percentage / 100) * 180;
  
  const isCritical = currentStock <= minStockLevel;
  const isZero = currentStock <= 0;

  return (
    <div className={`relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-500 overflow-hidden ${
      isCritical 
        ? 'bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 dark:drop-shadow-[0_0_15px_rgba(244,63,94,0.9)]'
        : 'bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-slate-700/60'
    }`}>
      <svg viewBox="0 0 180 110" className="w-36 h-22 overflow-visible">
        {/* قوس پس‌زمینه کامل نیم‌دایره */}
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          className="text-slate-200 dark:text-slate-800"
        />

        {/* منطقه قرمز بحرانی (از E تا خط قرمز حداقل موجودی) */}
        <path
          d="M 20 90 A 70 70 0 0 1 50 45"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          className="text-rose-500"
        />

        {/* منطقه امن سبز/زمردی */}
        <path
          d="M 55 40 A 70 70 0 0 1 160 90"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          className="text-emerald-500"
        />

        {/* برچسب‌های E (خالی)، ۱/۲، و F (پر) */}
        <text x="14" y="106" className="text-[11px] font-black fill-rose-500">E</text>
        <text x="86" y="22" className="text-[9px] font-black fill-slate-400">1/2</text>
        <text x="156" y="106" className="text-[11px] font-black fill-emerald-500">F</text>

        {/* محور پایه مرکزی */}
        <circle cx="90" cy="90" r="7" className="fill-slate-700 dark:fill-white" />

        {/* عقربه متحرک فنری انیمیشنی (Animated Spring Needle) */}
        <motion.g
          key={`needle-${percentage}`}
          initial={{ rotate: -90 }}
          animate={{ rotate: needleAngle }}
          transition={{ type: "spring", stiffness: 120, damping: 14, mass: 0.8 }}
          style={{ originX: "90px", originY: "90px" }}
        >
          <line
            x1="90"
            y1="90"
            x2="90"
            y2="30"
            strokeWidth="3.5"
            strokeLinecap="round"
            className={isCritical ? "stroke-rose-500" : "stroke-indigo-600 dark:stroke-indigo-400"}
          />
          <circle 
            cx="90" 
            cy="30" 
            r="2.5" 
            className={isCritical ? "fill-rose-500" : "fill-indigo-600 dark:fill-indigo-400"} 
          />
        </motion.g>
      </svg>

      {/* چراغ بنزین / هشدار آمپر (Fuel Alert Light) */}
      <div className="flex items-center gap-1.5 -mt-2">
        {isCritical ? (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center gap-1 text-[10px] font-black text-rose-600 dark:text-rose-400"
          >
            <Fuel className="w-4 h-4 fill-rose-500 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
            <span>{isZero ? 'موجودی خالی (E)' : 'هشدار سوخت انبار'}</span>
          </motion.div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <Fuel className="w-3.5 h-3.5 text-emerald-500" />
            <span>مطلوب ({Math.round(percentage)}%)</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// کامپوننت مادر صفحه پرونده کامل کالا
// ============================================================================
export default function InventoryItemProfile({
  itemId,
  onBack,
  onEdit,
  onDelete
}: InventoryItemProfileProps) {
  const item = useInventoryStore(state => state.items.find(it => it.id === itemId));
  const { 
    transactions, 
    batches, 
    updateItem, 
    addBatch, 
    deleteBatch, 
    deleteTransaction 
  } = useInventoryStore();

  const { transactions: financeTransactions, deleteTransaction: deleteFinanceTx } = useFinanceStore();
  const { projects } = useProjectStore();
  const { clients } = useClientStore();
  const { suppliers } = useProcurementStore();
  const { vehicles } = useLogisticsStore();
  const { currency } = useSettingsStore(state => state.settings);

  const isRial = currency === 'rial' || (currency as any) === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';

  // تب فعال از میان ۷ تب تخصصی
  const [activeTab, setActiveTab] = useState<string>('finance');

  // سوئیچ دوحالته چک‌ها و فیلترهای زمانی
  const [chequeMode, setChequeMode] = useState<'REALIZED' | 'COMMITTED'>('REALIZED');
  const currentYear = moment().jYear();
  const [yearFilter, setYearFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');

  // استیت‌های مودال‌های جانبی
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementModalType, setMovementModalType] = useState<'PURCHASE' | 'SALE_OR_PROJECT' | 'RETURN_FROM_CLIENT' | 'WASTE_OR_EXPIRED'>('SALE_OR_PROJECT');
  const [movementToEdit, setMovementToEdit] = useState<InventoryTransaction | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [financeTxToEdit, setFinanceTxToEdit] = useState<any | null>(null);

  // مودال پارت جدید
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchLotNum, setBatchLotNum] = useState('');
  const [batchEntryDate, setBatchEntryDate] = useState(() => moment().format('jYYYY/jMM/jDD'));
  const [batchExpDate, setBatchExpDate] = useState('');
  const [batchQty, setBatchQty] = useState('100');
  const [batchPurchasePrice, setBatchPurchasePrice] = useState('');
  const [batchFreight, setBatchFreight] = useState('0');
  const [batchLabor, setBatchLabor] = useState('0');
  const [batchNotes, setBatchNotes] = useState('');

  // مودال ضریب تبدیل جدید
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitRatio, setNewUnitRatio] = useState('');
  const [newUnitApprox, setNewUnitApprox] = useState(false);
  const [newUnitNotes, setNewUnitNotes] = useState('');

  // مودال هشدارهای کالا
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [alertMinStock, setAlertMinStock] = useState<string>(item ? String(item.minStockLevel || 10) : '10');
  const [alertMaxStock, setAlertMaxStock] = useState<string>(item ? String(item.maxStockLevel || 1000) : '1000');

  // استیت‌های جدول مشترک تب‌ها
  const [tabSearch, setTabSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // سیستم حذف ایمن ۵ ثانیه‌ای
  const [undoItems, setUndoItems] = useState<{ id: string; items: string[]; expireAt: number; itemType: 'TX' | 'BATCH' | 'FINANCE' }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
        const expired = prev.filter(u => u.expireAt <= now);
        const active = prev.filter(u => u.expireAt > now);
        if (expired.length > 0) {
          expired.forEach(u => {
            if (u.itemType === 'TX') {
              u.items.forEach(id => deleteTransaction(id));
            } else if (u.itemType === 'BATCH') {
              u.items.forEach(id => deleteBatch(id));
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
  }, [deleteTransaction, deleteBatch, deleteFinanceTx]);

  const triggerDelete = (id: string, itemType: 'TX' | 'BATCH' | 'FINANCE') => {
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

  // فیلتر تاریخ
  const isDateMatch = (dStr?: string) => {
    if (!dStr) return true;
    if (yearFilter !== 'ALL' && dStr.substring(0, 4) !== yearFilter) return false;
    if (monthFilter !== 'ALL' && dStr.substring(5, 7) !== monthFilter) return false;
    return true;
  };

  // تراکنش‌های فیلترشده کالا
  const itemTransactions = useMemo(() => {
    if (!item) return [];
    return transactions.filter(t => {
      if (pendingDeleteIds.includes(t.id)) return false;
      return t.itemId === item.id && isDateMatch(t.date);
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, item, pendingDeleteIds, yearFilter, monthFilter]);

  // پارت‌های اختصاصی کالا
  const itemBatches = useMemo(() => {
    if (!item) return [];
    return batches.filter(b => {
      if (pendingDeleteIds.includes(b.id)) return false;
      return b.itemId === item.id && isDateMatch(b.entryDate);
    }).sort((a, b) => (b.entryDate || '').localeCompare(a.entryDate || ''));
  }, [batches, item, pendingDeleteIds, yearFilter, monthFilter]);

  // تراکنش‌های مالی مرتبط با کالا
  const itemFinanceTransactions = useMemo(() => {
    if (!item) return [];
    const txIds = new Set(itemTransactions.map(t => t.id));
    return financeTransactions.filter(f => {
      if (pendingDeleteIds.includes(f.id)) return false;
      const matchRef = f.referenceId === item.id || txIds.has(f.referenceId || '');
      const matchDesc = f.description?.includes(item.name);
      return (matchRef || matchDesc) && isDateMatch(f.date);
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [financeTransactions, item, itemTransactions, pendingDeleteIds, yearFilter, monthFilter]);

  // ============================================================================
  // ۵ کارت آماری دوحالته بالای پروفایل
  // ============================================================================
  const stats = useMemo(() => {
    if (!item) return {
      stockValue: 0,
      totalReceived: 0,
      totalPaid: 0,
      cashBalance: 0,
      netArbitrage: 0,
      supplierDebt: 0,
      clientCredit: 0
    };

    // ۱. ارزش موجودی
    const stockVal = item.currentStock * item.averageUnitCost;

    // ۲. مجموع دریافتی‌ها و فاکتورهای خروجی
    let totalBilledSum = 0;
    let totalArbitrageSum = 0;
    let totalOutPaidAmount = 0;

    itemTransactions.forEach(t => {
      const isOut = t.type === 'SALE_OR_PROJECT' || t.type === 'OUT_PROJECT';
      if (isOut) {
        totalBilledSum += (t.totalBilledAmount || t.totalInternalCost || 0);
        totalArbitrageSum += (t.hiddenProfit || 0);
        if (t.settlementStatus === 'SETTLED') {
          totalOutPaidAmount += (t.totalBilledAmount || 0);
        } else if (t.paidAmount) {
          totalOutPaidAmount += t.paidAmount;
        }
      }
    });

    // ۳. مجموع پرداختی‌های ما و هزینه‌های خرید ورودی
    let totalIncomingInternalSum = 0;
    let totalInPaidAmount = 0;

    itemTransactions.forEach(t => {
      const isIn = t.type === 'PURCHASE' || t.type === 'PRODUCTION' || t.type === 'RETURN_FROM_CLIENT' || t.type === 'IN_PURCHASE' || t.type === 'IN_RETURN';
      if (isIn) {
        totalIncomingInternalSum += (t.totalInternalCost || (t.calculatedPrimaryQty * t.internalUnitCost));
        if (t.settlementStatus === 'SETTLED') {
          totalInPaidAmount += t.totalInternalCost;
        } else if (t.paidAmount) {
          totalInPaidAmount += t.paidAmount;
        }
      }
    });

    // بررسی اسناد مالی جهت محاسبه اثر سوئیچ دوحالته چک
    itemFinanceTransactions.forEach(ft => {
      const isCashed = ft.type === 'CASH' || (ft.type === 'CHEQUE' && ['CASHED', 'EXCHANGED', 'CASH_SETTLED'].includes(ft.chequeDetails?.status || ''));
      const isPending = ft.type === 'CHEQUE' && ['PENDING', 'GUARANTEE'].includes(ft.chequeDetails?.status || '');

      const shouldCount = chequeMode === 'COMMITTED' ? (isCashed || isPending) : isCashed;
      if (!shouldCount) return;

      if (ft.direction === 'IN') {
        totalOutPaidAmount += ft.amount;
      } else if (ft.direction === 'OUT') {
        totalInPaidAmount += ft.amount;
      }
    });

    const cashBalance = totalOutPaidAmount - totalInPaidAmount;
    const supplierDebt = Math.max(0, totalIncomingInternalSum - totalInPaidAmount);
    const clientCredit = Math.max(0, totalBilledSum - totalOutPaidAmount);

    return {
      stockValue: stockVal,
      totalReceived: totalOutPaidAmount,
      totalPaid: totalInPaidAmount,
      cashBalance,
      netArbitrage: totalArbitrageSum,
      supplierDebt,
      clientCredit
    };
  }, [item, itemTransactions, itemFinanceTransactions, chequeMode]);

  // کلید میانبر کیبورد Ctrl+N
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleDynamicHeaderAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  if (!item) return null;

  const catMeta = INVENTORY_CATEGORIES[item.category] || INVENTORY_CATEGORIES.cement_mortar;
  const CategoryIcon = CATEGORY_ICONS[item.category] || Boxes;

  // محاسبه موجودی بر اساس واحد نمایش
  const displayConversion = convertQuantity(
    item.currentStock,
    item.baseUnit || item.primaryUnit,
    item.displayUnit || item.primaryUnit,
    item
  );

  // تب‌های ۷گانه سه‌بعدی
  const profileTabs: TabItem<string>[] = [
    {
      id: 'finance',
      label: 'تاریخچه پرداخت‌ها و مالی',
      icon: Wallet,
      count: itemFinanceTransactions.length,
      accentColor: '#10b981'
    },
    {
      id: 'incoming',
      label: 'تاریخچه ورود به انبار',
      icon: ArrowDownRight,
      count: itemTransactions.filter(t => ['PURCHASE', 'PRODUCTION', 'RETURN_FROM_CLIENT', 'IN_PURCHASE', 'IN_RETURN'].includes(t.type)).length,
      accentColor: '#3b82f6'
    },
    {
      id: 'outgoing',
      label: 'تاریخچه خروج از انبار',
      icon: ArrowUpRight,
      count: itemTransactions.filter(t => ['SALE_OR_PROJECT', 'INTERNAL_USE', 'WASTE_OR_EXPIRED', 'RETURN_TO_SUPPLIER', 'OUT_PROJECT', 'OUT_WASTE'].includes(t.type)).length,
      accentColor: '#f59e0b'
    },
    {
      id: 'batches',
      label: 'پارت‌ها، تاریخ انقضا و قیمت‌ها',
      icon: Boxes,
      count: itemBatches.length,
      accentColor: '#8b5cf6'
    },
    {
      id: 'units',
      label: 'تعریف واحدها و ضرایب تبدیل',
      icon: Scale,
      count: (item.unitConversions || []).length + 1,
      accentColor: '#06b6d4'
    },
    {
      id: 'alerts',
      label: 'تنظیمات هشدار (حداقل / حداکثر و انقضا)',
      icon: Bell,
      accentColor: '#f43f5e'
    },
    {
      id: 'reports',
      label: 'گزارشات و نمودارها',
      icon: BarChart3,
      accentColor: '#6366f1'
    }
  ];

  // دکمه داینامیک هدر متناسب با تب فعال
  const getHeaderActionButtonMeta = () => {
    switch (activeTab) {
      case 'finance':
        return {
          label: 'ثبت پرداخت / سند مالی',
          icon: Wallet,
          colorClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25',
          action: () => {
            setFinanceTxToEdit(null);
            setIsTransactionModalOpen(true);
          }
        };
      case 'incoming':
        return {
          label: 'ثبت ورود به انبار',
          icon: ArrowDownRight,
          colorClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25',
          action: () => {
            setIsEntryModalOpen(true);
          }
        };
      case 'outgoing':
        return {
          label: 'ثبت حواله خروج',
          icon: ArrowUpRight,
          colorClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25',
          action: () => {
            setIsExitModalOpen(true);
          }
        };
      case 'batches':
        return {
          label: 'ثبت پارت / دسته جدید',
          icon: Boxes,
          colorClass: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/25',
          action: () => {
            setIsEntryModalOpen(true);
          }
        };
      case 'units':
        return {
          label: 'تعریف ضریب تبدیل جدید',
          icon: Scale,
          colorClass: 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-500/25',
          action: () => {
            setNewUnitName('');
            setNewUnitRatio('');
            setNewUnitApprox(false);
            setNewUnitNotes('');
            setIsUnitModalOpen(true);
          }
        };
      case 'alerts':
        return {
          label: 'به‌روزرسانی تنظیمات هشدار',
          icon: Bell,
          colorClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/25',
          action: () => {
            setAlertMinStock(String(item.minStockLevel || 10));
            setAlertMaxStock(String(item.maxStockLevel || 1000));
            setIsAlertsModalOpen(true);
          }
        };
      case 'reports':
        return {
          label: 'چاپ گزارش تحلیلی',
          icon: Printer,
          colorClass: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25',
          action: () => {
            window.print();
          }
        };
      default:
        return {
          label: 'ثبت عملیات جدید',
          icon: Plus,
          colorClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25',
          action: () => setIsMovementModalOpen(true)
        };
    }
  };

  const dynamicAction = getHeaderActionButtonMeta();
  const handleDynamicHeaderAction = dynamicAction.action;

  // گزینه‌های واحدهای کالا برای سلکتور هدر
  const allAvailableUnits = useMemo(() => {
    const list = [
      { value: item.baseUnit || item.primaryUnit, label: `${item.baseUnit || item.primaryUnit} (واحد پایه)` }
    ];
    if (item.secondaryUnit && item.secondaryUnit !== item.baseUnit) {
      list.push({
        value: item.secondaryUnit,
        label: `${item.secondaryUnit} (واحد فرعی اول)`
      });
    }
    (item.unitConversions || []).forEach(uc => {
      if (!list.some(l => l.value === uc.unitName)) {
        list.push({
          value: uc.unitName,
          label: `${uc.unitName} (${uc.isApproximate ? 'تقریبی: ' : ''}هر ۱ = ${uc.ratioToBase} ${item.baseUnit})`
        });
      }
    });
    return list;
  }, [item]);

  // ثبت پارت جدید
  const handleSaveBatch = () => {
    const qtyNum = safeNum(batchQty);
    const priceNum = safeNum(batchPurchasePrice);
    const freightNum = safeNum(batchFreight);
    const laborNum = safeNum(batchLabor);

    if (qtyNum <= 0) {
      toast.error('لطفاً مقدار معتبر وارد کنید.');
      return;
    }

    addBatch({
      itemId: item.id,
      batchNumber: batchLotNum.trim() || `LOT-${Date.now().toString().slice(-6)}`,
      entryDate: batchEntryDate,
      expirationDate: batchExpDate ? batchExpDate : undefined,
      initialQtyBase: qtyNum,
      purchaseUnitPrice: priceNum,
      entryFreightCost: freightNum,
      loadingLaborCost: laborNum,
      unloadingLaborCost: 0,
      totalLandedCost: (qtyNum * priceNum) + freightNum + laborNum,
      landedUnitCostBase: qtyNum > 0 ? Math.round(((qtyNum * priceNum) + freightNum + laborNum) / qtyNum) : priceNum,
      notes: batchNotes.trim() || undefined
    });

    toast.success('پارت جدید با بهای تمام‌شده قطعی ثبت شد.');
    setIsBatchModalOpen(false);
  };

  // ثبت ضریب تبدیل جدید
  const handleSaveUnitConversion = () => {
    if (!newUnitName.trim() || safeNum(newUnitRatio) <= 0) {
      toast.error('لطفاً نام واحد و ضریب تبدیل معتبر وارد کنید.');
      return;
    }

    const currentConversions = item.unitConversions || [];
    const newRule: UnitConversionRule = {
      id: generateUUID(),
      unitName: newUnitName.trim(),
      ratioToBase: safeNum(newUnitRatio),
      isApproximate: newUnitApprox,
      notes: newUnitNotes.trim() || undefined
    };

    updateItem(item.id, {
      unitConversions: [...currentConversions, newRule]
    });

    toast.success(`واحد جدید «${newUnitName}» با موفقیت تعریف شد.`);
    setIsUnitModalOpen(false);
  };

  // حذف ضریب تبدیل
  const handleDeleteUnitRule = (ruleId: string) => {
    const updated = (item.unitConversions || []).filter(u => u.id !== ruleId);
    updateItem(item.id, { unitConversions: updated });
    toast.success('ضریب تبدیل حذف شد.');
  };

  // ذخیره تنظیمات هشدار
  const handleSaveAlerts = () => {
    updateItem(item.id, {
      minStockLevel: safeNum(alertMinStock) || 10,
      maxStockLevel: safeNum(alertMaxStock) || undefined
    });
    toast.success('تنظیمات هشدارهای انبار با موفقیت ذخیره شد.');
    setIsAlertsModalOpen(false);
  };

  // گزینه‌های سال
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

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full flex flex-col gap-6 pb-24 h-full relative"
    >
      {/* ======================================================== */}
      {/* ۱. هدر چسبان و ابزارهای بالایی پروفایل (Sticky Top-4) */}
      {/* ======================================================== */}
      <div className="sticky top-4 z-[100] flex flex-col xl:flex-row items-center justify-between gap-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/80 dark:border-slate-700/80 shadow-[0_15px_40px_rgba(0,0,0,0.08)] rounded-[2.5rem] px-6 py-5">
        
        {/* سمت راست: دکمه بازگشت + تصویر کالا + نام و کد */}
        <div className="flex items-center gap-4 w-full xl:w-auto">
          <button 
            type="button"
            onClick={onBack} 
            className="flex items-center justify-center p-3.5 rounded-[1.25rem] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-inner border border-slate-200 dark:border-slate-600 transition-all shrink-0 group cursor-pointer" 
            title="بازگشت به لیست انبار"
          >
            <ArrowRight className="w-6 h-6 text-slate-700 dark:text-slate-300 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* تصویر کالا */}
          <div className="relative shrink-0">
            {item.image ? (
              <img 
                src={item.image} 
                alt={item.name} 
                className="w-16 h-16 rounded-2xl object-cover shadow-lg border-2 border-white dark:border-slate-700" 
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg border-2 border-white/80 dark:border-slate-700"
                style={{ backgroundColor: catMeta.accentColor }}
              >
                <CategoryIcon className="w-8 h-8" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h2 className="text-xl font-black text-slate-800 dark:text-white drop-shadow-sm">
                {item.name}
              </h2>
              <span className="text-xs font-mono font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {item.code}
              </span>
              <span 
                className="px-2.5 py-0.5 rounded-lg text-xs font-black text-white shadow-sm"
                style={{ backgroundColor: catMeta.accentColor }}
              >
                {catMeta.shortTitle}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              {item.location && (
                <span className="flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-slate-400" />
                  محل انبار: {item.location}
                </span>
              )}
              <span>
                روش ارزش‌گذاری: <strong>{item.valuationMethod || 'میانگین موزون'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* سمت چپ: تغییر واحد نمایش + اکسپورت/ایمپورت + دکمه داینامیک هدر */}
        <div className="flex items-center gap-3 w-full xl:w-auto justify-end flex-wrap">
          
          {/* انتخابگر سریع واحد نمایش موجودی */}
          <div className="w-44 h-[44px]">
            <PortalSelect
              options={allAvailableUnits}
              value={item.displayUnit || item.baseUnit || item.primaryUnit}
              onChange={(val: string) => {
                updateItem(item.id, { displayUnit: val });
                toast.success(`واحد نمایش موجودی به «${val}» تغییر یافت.`);
              }}
              placeholder="واحد نمایش..."
              className="!h-[44px] !rounded-2xl"
            />
          </div>

          {/* ابزارهای اکسپورت و ایمپورت */}
          <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button 
              type="button"
              onClick={() => onEdit?.(item)} 
              title="ویرایش مشخصات کالا" 
              className="p-2 hover:bg-teal-50 dark:hover:bg-teal-500/20 rounded-xl transition-colors text-teal-600 cursor-pointer"
            >
              <Edit className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-0.5"/>
            <button 
              type="button"
              onClick={() => setIsExportModalOpen(true)} 
              title="خروجی گزارش کالا (Excel / PDF)" 
              className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-xl transition-colors text-emerald-600 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={() => setIsImportModalOpen(true)} 
              title="ورودی اطلاعات کالا" 
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-xl transition-colors text-blue-600 cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
            </button>
          </div>

          {/* تک‌دکمه ثبت داینامیک در هدر (با پشتیبانی از Ctrl+N) */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDynamicHeaderAction}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs shadow-lg transition-all cursor-pointer ${dynamicAction.colorClass}`}
            title="کلید میانبر: Ctrl+N"
          >
            {React.createElement(dynamicAction.icon, { className: 'w-4 h-4' })}
            <span>{dynamicAction.label}</span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-black/15 text-[10px] font-mono">
              Ctrl+N
            </span>
          </motion.button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ۲. ردیف کنترلرهای بالای کارت‌ها (سوئیچ دوحالته چک و فیلتر سال/ماه) */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/40 p-4 rounded-3xl border border-white/60 dark:border-slate-800">
        
        {/* سوئیچ دوحالته چک‌ها */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-2xl border border-slate-300/50 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setChequeMode('REALIZED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              chequeMode === 'REALIZED'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            حالت ۱: نقد + چک‌های پاس‌شده
          </button>
          <button
            type="button"
            onClick={() => setChequeMode('COMMITTED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              chequeMode === 'COMMITTED'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            حالت ۲: نقد + پاس‌شده + در انتظار وصول
          </button>
        </div>

        {/* فیلتر سال و ماه */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="w-32 h-[38px]">
            <PortalSelect
              options={yearOptions}
              value={yearFilter}
              onChange={setYearFilter}
              placeholder="سال..."
              className="!h-[38px] !rounded-xl text-xs"
            />
          </div>
          <div className="w-32 h-[38px]">
            <PortalSelect
              options={monthOptions}
              value={monthFilter}
              onChange={setMonthFilter}
              placeholder="ماه..."
              className="!h-[38px] !rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ۳. ردیف ۵ کارت آماری تحلیلی کالا به همراه آمپر بنزین */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* کارت ۱: موجودی و آمپر بنزین انیمیشنی */}
        <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-white/80 dark:border-slate-800 shadow-sm backdrop-blur-xl flex flex-col justify-between gap-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-500" /> موجودی انبار
            </span>
            <span className="text-[10px] font-black font-mono text-slate-400">
              {item.code}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-2xl font-black font-mono text-slate-800 dark:text-white" dir="ltr">
                {displayConversion.convertedQty.toLocaleString('fa-IR')} <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{item.displayUnit || item.primaryUnit}</span>
              </div>
              <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                معادل: {item.currentStock.toLocaleString('fa-IR')} {item.baseUnit || item.primaryUnit}
              </div>
            </div>

            {/* مینی آمپر بنزین */}
            <AnimatedFuelGauge
              currentStock={item.currentStock}
              minStockLevel={item.minStockLevel || 10}
              maxStockLevel={item.maxStockLevel}
              unitLabel={item.displayUnit || item.primaryUnit}
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>ارزش ریالی موجودی:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-black" dir="ltr">
              {stats.stockValue.toLocaleString('fa-IR')} {currencyLabel}
            </span>
          </div>
        </div>

        {/* کارت ۲: مجموع دریافتی‌ها / فروش خروجی‌ها */}
        <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-white/80 dark:border-slate-800 shadow-sm backdrop-blur-xl flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-blue-500" /> کل دریافتی از خروجی‌ها
            </span>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
              فروش و پروژه
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400" dir="ltr">
            {stats.totalReceived.toLocaleString('fa-IR')} <span className="text-xs font-bold">{currencyLabel}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>وضعیت چک:</span>
            <span>{chequeMode === 'REALIZED' ? 'صرفاً وصول‌شده' : 'شامل در انتظار وصول'}</span>
          </div>
        </div>

        {/* کارت ۳: مجموع پرداختی‌های ما */}
        <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-white/80 dark:border-slate-800 shadow-sm backdrop-blur-xl flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4 text-rose-500" /> کل پرداختی‌های ما
            </span>
            <span className="text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
              خرید و کرایه
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400" dir="ltr">
            {stats.totalPaid.toLocaleString('fa-IR')} <span className="text-xs font-bold">{currencyLabel}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>تعداد پارت‌های خرید:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-black">{itemBatches.length} پارت</span>
          </div>
        </div>

        {/* کارت ۴: تراز نقدینگی و سود خالص آربیتراژ */}
        <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-white/80 dark:border-slate-800 shadow-sm backdrop-blur-xl flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> تراز نقدینگی و سود
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
              stats.netArbitrage >= 0 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
            }`}>
              {stats.netArbitrage >= 0 ? 'سودآور' : 'زیان‌ده'}
            </span>
          </div>
          <div className={`text-2xl font-black font-mono ${stats.cashBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} dir="ltr">
            {stats.cashBalance >= 0 ? '+' : ''}{stats.cashBalance.toLocaleString('fa-IR')} <span className="text-xs font-bold">{currencyLabel}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>سود پنهان آربیتراژ:</span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400" dir="ltr">
              +{stats.netArbitrage.toLocaleString('fa-IR')} {currencyLabel}
            </span>
          </div>
        </div>

        {/* کارت ۵: بدهکاری و بستانکاری تعهدی */}
        <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-white/80 dark:border-slate-800 shadow-sm backdrop-blur-xl flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" /> تعهدات و مانده‌ها
            </span>
            <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
              مانده‌حساب‌ها
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">بدهی ما به فروشنده:</span>
              <span className="font-mono font-black text-rose-600" dir="ltr">
                {stats.supplierDebt.toLocaleString('fa-IR')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">طلب ما از خریداران:</span>
              <span className="font-mono font-black text-emerald-600" dir="ltr">
                {stats.clientCredit.toLocaleString('fa-IR')}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>واحد پولی:</span>
            <span>{currencyLabel}</span>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* ۴. تب‌های ۷گانه سه‌بعدی تخصصی کالا (ThreeDTabs) */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <ThreeDTabs
          tabs={profileTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* فیلترها و سرچ نوار ابزار داخل تب */}
        {activeTab !== 'alerts' && activeTab !== 'reports' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/50 dark:bg-slate-900/50 p-3 rounded-2xl border border-white/60 dark:border-slate-800">
            <div className="w-full sm:w-72">
              <AppSearchInput
                value={tabSearch}
                onChange={setTabSearch}
                placeholder="جستجو در رکوردهای این تب..."
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32 h-[38px]">
                <PortalSelect
                  options={PAGE_LIMIT_OPTIONS}
                  value={String(pageSize)}
                  onChange={(val: string) => { setPageSize(Number(val)); setCurrentPage(1); }}
                  placeholder="تعداد نمایش..."
                  className="!h-[38px] !rounded-xl text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* محتوای تب‌های ۷گانه */}
        {/* ======================================================== */}

        {/* ۱. تب تاریخچه مالی و پرداخت‌ها */}
        {activeTab === 'finance' && (
          <div className="bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto modal-scrollbar">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/75 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">تاریخ</th>
                    <th className="p-3.5">جهت سند</th>
                    <th className="p-3.5">روش پرداخت</th>
                    <th className="p-3.5">مبلغ سند ({currencyLabel})</th>
                    <th className="p-3.5">مشخصات چک / پیگیری</th>
                    <th className="p-3.5">شرح و توضیحات</th>
                    <th className="p-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {itemFinanceTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                        هیچ تراکنش مالی برای این کالا ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    itemFinanceTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">{tx.date}</td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black ${
                            tx.direction === 'IN' 
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' 
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}>
                            {tx.direction === 'IN' ? 'دریافت از مشتری' : 'پرداخت بابت خرید'}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold">
                          {tx.type === 'CASH' ? 'نقدی / واریز' : tx.type === 'CHEQUE' ? 'چک صیادی' : 'ترکیبی'}
                        </td>
                        <td className="p-3.5 font-mono font-black text-slate-800 dark:text-white" dir="ltr">
                          {tx.amount.toLocaleString('fa-IR')}
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                          {tx.chequeDetails?.sayyadId ? `صیاد: ${tx.chequeDetails.sayyadId}` : tx.referenceId || '-'}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">{tx.description || '-'}</td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => { setFinanceTxToEdit(tx); setIsTransactionModalOpen(true); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 cursor-pointer"
                              title="ویرایش سند مالی"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerDelete(tx.id, 'FINANCE')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
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

        {/* ۲. تب تاریخچه ورود به انبار */}
        {activeTab === 'incoming' && (
          <div className="bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto modal-scrollbar">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/75 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">تاریخ</th>
                    <th className="p-3.5">نوع ورود</th>
                    <th className="p-3.5">مبداء / فروشنده</th>
                    <th className="p-3.5">مقدار ورودی</th>
                    <th className="p-3.5">فی خرید واحد</th>
                    <th className="p-3.5">کرایه حمل</th>
                    <th className="p-3.5">بهای تمام‌شده واحد</th>
                    <th className="p-3.5">کل بهای تمام‌شده</th>
                    <th className="p-3.5">وضعیت تسویه</th>
                    <th className="p-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {itemTransactions.filter(t => ['PURCHASE', 'PRODUCTION', 'RETURN_FROM_CLIENT', 'IN_PURCHASE', 'IN_RETURN'].includes(t.type)).length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                        هیچ رکورد ورودی برای این کالا ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    itemTransactions
                      .filter(t => ['PURCHASE', 'PRODUCTION', 'RETURN_FROM_CLIENT', 'IN_PURCHASE', 'IN_RETURN'].includes(t.type))
                      .map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">{t.date}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                              {t.type === 'RETURN_FROM_CLIENT' || t.type === 'IN_RETURN' ? 'مرجوعی از پروژه' : 'خرید تدارکات'}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                            {t.supplierName || (t.supplierId ? 'تأمین‌کننده سیستم' : 'بازار')}
                          </td>
                          <td className="p-3.5 font-mono font-black" dir="ltr">
                            {t.calculatedPrimaryQty.toLocaleString('fa-IR')} {item.primaryUnit}
                          </td>
                          <td className="p-3.5 font-mono" dir="ltr">{t.internalUnitCost.toLocaleString('fa-IR')}</td>
                          <td className="p-3.5 font-mono" dir="ltr">{(t.internalFreightCost || 0).toLocaleString('fa-IR')}</td>
                          <td className="p-3.5 font-mono font-black text-emerald-600 dark:text-emerald-400" dir="ltr">
                            {(t.calculatedPrimaryQty > 0 ? Math.round(t.totalInternalCost / t.calculatedPrimaryQty) : t.internalUnitCost).toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3.5 font-mono font-black text-slate-800 dark:text-white" dir="ltr">
                            {t.totalInternalCost.toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                              t.settlementStatus === 'SETTLED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            }`}>
                              {t.settlementStatus === 'SETTLED' ? 'تسویه شده' : 'پرداخت نشده'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => { setMovementToEdit(t); setIsMovementModalOpen(true); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 cursor-pointer"
                                title="ویرایش حواله ورود"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerDelete(t.id, 'TX')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
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

        {/* ۳. تب تاریخچه خروج از انبار */}
        {activeTab === 'outgoing' && (
          <div className="bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto modal-scrollbar">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/75 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">تاریخ</th>
                    <th className="p-3.5">نوع خروج</th>
                    <th className="p-3.5">پروژه / کارفرما</th>
                    <th className="p-3.5">مقدار خروجی</th>
                    <th className="p-3.5">بهای تمام‌شده داخلی</th>
                    <th className="p-3.5">فاکتور اعلامی کارفرما</th>
                    <th className="p-3.5">سود پنهان (آربیتراژ)</th>
                    <th className="p-3.5">وضعیت تسویه</th>
                    <th className="p-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {itemTransactions.filter(t => ['SALE_OR_PROJECT', 'INTERNAL_USE', 'WASTE_OR_EXPIRED', 'RETURN_TO_SUPPLIER', 'OUT_PROJECT', 'OUT_WASTE'].includes(t.type)).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                        هیچ حواله خروجی برای این کالا ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    itemTransactions
                      .filter(t => ['SALE_OR_PROJECT', 'INTERNAL_USE', 'WASTE_OR_EXPIRED', 'RETURN_TO_SUPPLIER', 'OUT_PROJECT', 'OUT_WASTE'].includes(t.type))
                      .map(t => {
                        const targetProj = projects.find(p => p.id === t.projectId);
                        return (
                          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">{t.date}</td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                t.type === 'OUT_WASTE' || t.type === 'WASTE_OR_EXPIRED'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              }`}>
                                {t.type === 'OUT_WASTE' || t.type === 'WASTE_OR_EXPIRED' ? 'ضایعات / پرت' : 'ارسال به پروژه'}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                              {targetProj?.name || (t.projectId ? 'پروژه اختصاصی' : 'مصرف آزاد')}
                            </td>
                            <td className="p-3.5 font-mono font-black" dir="ltr">
                              {t.calculatedPrimaryQty.toLocaleString('fa-IR')} {item.primaryUnit}
                            </td>
                            <td className="p-3.5 font-mono" dir="ltr">
                              {t.totalInternalCost.toLocaleString('fa-IR')}
                            </td>
                            <td className="p-3.5 font-mono font-black text-slate-800 dark:text-white" dir="ltr">
                              {(t.totalBilledAmount || t.totalInternalCost).toLocaleString('fa-IR')}
                            </td>
                            <td className="p-3.5 font-mono font-black" dir="ltr">
                              <span className={`px-2 py-0.5 rounded-lg text-xs ${
                                (t.hiddenProfit || 0) >= 0 
                                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                  : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                              }`}>
                                {(t.hiddenProfit || 0) >= 0 ? '+' : ''}{(t.hiddenProfit || 0).toLocaleString('fa-IR')}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                t.settlementStatus === 'SETTLED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              }`}>
                                {t.settlementStatus === 'SETTLED' ? 'تسویه شده' : 'در انتظار تسویه'}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => window.print()}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                                  title="چاپ فاکتور حواله"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setMovementToEdit(t); setIsMovementModalOpen(true); }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 cursor-pointer"
                                  title="ویرایش حواله خروج"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => triggerDelete(t.id, 'TX')}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
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

        {/* ۴. تب پارت‌ها، تاریخ انقضا و تاریخچه قیمت‌ها */}
        {activeTab === 'batches' && (
          <div className="space-y-5">
            {/* کارت انتخاب استراتژی خروج */}
            <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-purple-500" /> روش ارزش‌گذاری و اولویت خروج انبار
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  تعیین روش کسر خودکار موجودی پارت‌ها بدون تغییر در قیمت خریدهای قبلی
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateItem(item.id, { valuationMethod: 'FIFO' });
                    toast.success('روش ارزش‌گذاری کالا به FIFO (اولین وارده، اولین صادره) تنظیم شد.');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    item.valuationMethod === 'FIFO'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  فایفو (FIFO)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateItem(item.id, { valuationMethod: 'LIFO' });
                    toast.success('روش ارزش‌گذاری کالا به LIFO (آخرین وارده، اولین صادره) تنظیم شد.');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    item.valuationMethod === 'LIFO'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  لایفو (LIFO)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateItem(item.id, { valuationMethod: 'WEIGHTED_AVERAGE' });
                    toast.success('روش ارزش‌گذاری کالا به میانگین موزون تنظیم شد.');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    item.valuationMethod === 'WEIGHTED_AVERAGE'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  میانگین موزون
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextPri = item.exitPriority === 'FEFO' ? 'STANDARD' : 'FEFO';
                    updateItem(item.id, { exitPriority: nextPri });
                    toast.success(`اولویت FEFO (خروج نزدیک‌ترین تاریخ انقضا) ${nextPri === 'FEFO' ? 'فعال' : 'غیرفعال'} شد.`);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    item.exitPriority === 'FEFO'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                  title="First-Expiring-First-Out"
                >
                  اولویت انقضا (FEFO)
                </button>
              </div>
            </div>

            {/* جدول پارت‌های ورودی */}
            <div className="bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h5 className="font-black text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-purple-500" />
                  لیست پارت‌ها و دسته‌های ورودی (Batches / Lots)
                </h5>
                <button
                  type="button"
                  onClick={() => {
                    setBatchLotNum(`LOT-${Date.now().toString().slice(-5)}`);
                    setBatchEntryDate(moment().format('jYYYY/jMM/jDD'));
                    setBatchPurchasePrice(String(item.averageUnitCost || ''));
                    setIsBatchModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> ثبت پارت ورودی
                </button>
              </div>

              <div className="overflow-x-auto modal-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100/75 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3.5">شماره پارت / لات</th>
                      <th className="p-3.5">تاریخ ورود</th>
                      <th className="p-3.5">تاریخ انقضا</th>
                      <th className="p-3.5">روزهای باقیمانده</th>
                      <th className="p-3.5">مقدار ورودی اولیه</th>
                      <th className="p-3.5">موجودی باقیمانده</th>
                      <th className="p-3.5">بهای تمام‌شده واحد پایه</th>
                      <th className="p-3.5">وضعیت پارت</th>
                      <th className="p-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {itemBatches.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                          هیچ پارتی برای این کالا تعریف نشده است.
                        </td>
                      </tr>
                    ) : (
                      itemBatches.map(b => {
                        let daysRemaining: number | null = null;
                        if (b.expirationDate) {
                          try {
                            const todayMom = moment().startOf('day');
                            const expMom = moment(b.expirationDate, 'jYYYY/jMM/jDD').startOf('day');
                            daysRemaining = expMom.diff(todayMom, 'days');
                          } catch (e) {
                            daysRemaining = null;
                          }
                        }

                        return (
                          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-3.5 font-mono font-black text-slate-800 dark:text-white">{b.batchNumber || b.id}</td>
                            <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{b.entryDate}</td>
                            <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{b.expirationDate || 'بدون انقضا'}</td>
                            <td className="p-3.5">
                              {daysRemaining !== null ? (
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                  daysRemaining <= 0
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                    : daysRemaining <= 10
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                }`}>
                                  {daysRemaining <= 0 ? 'منقضی شده' : `${daysRemaining} روز مانده`}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-3.5 font-mono" dir="ltr">{b.initialQtyBase.toLocaleString('fa-IR')} {item.primaryUnit}</td>
                            <td className="p-3.5 font-mono font-black text-slate-800 dark:text-white" dir="ltr">
                              {b.remainingQtyBase.toLocaleString('fa-IR')} {item.primaryUnit}
                            </td>
                            <td className="p-3.5 font-mono font-black text-purple-600 dark:text-purple-400" dir="ltr">
                              {b.landedUnitCostBase.toLocaleString('fa-IR')} {currencyLabel}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                b.status === 'ACTIVE' && b.remainingQtyBase > 0
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {b.status === 'ACTIVE' && b.remainingQtyBase > 0 ? 'فعال و دارای موجودی' : 'تخلیه‌شده / راکد'}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => triggerDelete(b.id, 'BATCH')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                title="حذف پارت ۵ ثانیه‌ای"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ۵. تب تعریف واحدها و ضرایب تبدیل */}
        {activeTab === 'units' && (
          <div className="space-y-5">
            {/* کارت ماشین‌حساب زنده موجودی به تمام واحدها */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-200 dark:border-cyan-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-cyan-900 dark:text-cyan-300 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-cyan-600" /> ماشین‌حساب زنده تبدیل موجودی انبار
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setNewUnitName('');
                    setNewUnitRatio('');
                    setNewUnitApprox(false);
                    setNewUnitNotes('');
                    setIsUnitModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> افزودن ضریب تبدیل جدید
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-cyan-100 dark:border-cyan-900/40">
                  <span className="text-[11px] font-bold text-slate-400 block">واحد پایه محاسباتی:</span>
                  <span className="text-lg font-black font-mono text-cyan-600 dark:text-cyan-400 mt-1 block">
                    {item.currentStock.toLocaleString('fa-IR')} {item.baseUnit || item.primaryUnit}
                  </span>
                </div>

                {item.secondaryUnit && (
                  <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-cyan-100 dark:border-cyan-900/40">
                    <span className="text-[11px] font-bold text-slate-400 block">معادل در {item.secondaryUnit}:</span>
                    <span className="text-lg font-black font-mono text-slate-800 dark:text-white mt-1 block">
                      {(item.conversionRatio ? item.currentStock / item.conversionRatio : item.currentStock).toFixed(1)} {item.secondaryUnit}
                    </span>
                  </div>
                )}

                {(item.unitConversions || []).map(uc => {
                  const res = convertQuantity(item.currentStock, item.baseUnit || item.primaryUnit, uc.unitName, item);
                  return (
                    <div key={uc.id} className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-cyan-100 dark:border-cyan-900/40">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 block">معادل در {uc.unitName}:</span>
                        {uc.isApproximate && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/40 font-black">
                            تقریبی
                          </span>
                        )}
                      </div>
                      <span className="text-lg font-black font-mono text-slate-800 dark:text-white mt-1 block">
                        {res.convertedQty.toLocaleString('fa-IR')} {uc.unitName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* جدول قوانین تبدیل تعریف‌شده */}
            <div className="bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h5 className="font-black text-xs text-slate-800 dark:text-white">
                  جدول ضرایب تبدیل تعریف‌شده برای {item.name}
                </h5>
              </div>

              <div className="overflow-x-auto modal-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100/75 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3.5">نام واحد فرعی</th>
                      <th className="p-3.5">ضریب نسبت به واحد پایه ({item.baseUnit || item.primaryUnit})</th>
                      <th className="p-3.5">نوع تبدیل</th>
                      <th className="p-3.5">فرمول و یادداشت</th>
                      <th className="p-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-cyan-600">{item.baseUnit || item.primaryUnit}</td>
                      <td className="p-3.5 font-mono">۱ (واحد پایه مبنا)</td>
                      <td className="p-3.5"><span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40">پایه قطعی</span></td>
                      <td className="p-3.5 text-slate-500">مبنای تمامی محاسبات انبارداری و ارزش ریالی</td>
                      <td className="p-3.5 text-center text-slate-400">غیرقابل حذف</td>
                    </tr>
                    {(item.unitConversions || []).map(uc => (
                      <tr key={uc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-slate-800 dark:text-white">{uc.unitName}</td>
                        <td className="p-3.5 font-mono font-black" dir="ltr">هر ۱ {uc.unitName} = {uc.ratioToBase} {item.baseUnit || item.primaryUnit}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                            uc.isApproximate ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40'
                          }`}>
                            {uc.isApproximate ? 'تبدیل تقریبی' : 'دقیق و قطعی'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">{uc.notes || '-'}</td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteUnitRule(uc.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            title="حذف ضریب تبدیل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ۶. تب تنظیمات هشدار (حداقل / حداکثر و انقضا) */}
        {activeTab === 'alerts' && (
          <div className="bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-800 dark:text-white">
                  تنظیمات هشدارهای هوشمند برای {item.name}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  پایش خودکار خط قرمزها، نقطه سفارش و تاریخ انقضا در مرکز هشدارها
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  حداقل موجودی (نقطه سفارش هشدار) بر حسب {item.primaryUnit}:
                </label>
                <input
                  type="number"
                  value={alertMinStock}
                  onChange={e => setAlertMinStock(e.target.value)}
                  className="w-full h-[46px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-sm outline-none text-left"
                  dir="ltr"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  در صورت رسیدن موجودی به این عدد، سیستم هشدار کسری صادر می‌کند.
                </span>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  حداکثر مجاز موجودی انبار (سقف ظرفیت):
                </label>
                <input
                  type="number"
                  value={alertMaxStock}
                  onChange={e => setAlertMaxStock(e.target.value)}
                  className="w-full h-[46px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-sm outline-none text-left"
                  dir="ltr"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  جهت جلوگیری از انباشت بیش از حد سرمایه و تکمیل ظرفیت سوله.
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs space-y-2">
                <span className="font-black text-rose-700 dark:text-rose-400 block flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> زمان‌بندی خودکار هشدارهای انقضا
                </span>
                <p className="text-slate-600 dark:text-slate-300">
                  سیستم به صورت خودکار پارت‌های ورودی دارای تاریخ انقضا را در بازه‌های ۱۰، ۵، ۳، ۲، ۱ روز مانده به انقضا پایش کرده و هشدارهای اولویت خروج صادر می‌نماید.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveAlerts}
                className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
              >
                ذخیره تنظیمات هشدار
              </button>
            </div>
          </div>
        )}

        {/* ۷. تب گزارشات و نمودارها */}
        {activeTab === 'reports' && (
          <div key={`reports-view-${activeTab}`} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* نمودار مقایسه ورود و خروج */}
              <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h5 className="font-black text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  روند ماهانه ورود و خروج کالا ({item.primaryUnit})
                </h5>
                <div className="h-64 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { month: 'فروردین', in: 120, out: 80 },
                      { month: 'اردیبهشت', in: 200, out: 150 },
                      { month: 'خرداد', in: 180, out: 220 },
                      { month: 'تیر', in: 300, out: 260 },
                      { month: 'مرداد', in: 250, out: 280 },
                      { month: 'شهریور', in: 400, out: 310 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="in" name="ورود به انبار" fill="#3b82f6" radius={[6, 6, 0, 0]} animationDuration={1000} />
                      <Bar dataKey="out" name="خروج از انبار" fill="#f59e0b" radius={[6, 6, 0, 0]} animationDuration={1200} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* نمودار سود پنهان آربیتراژ ماهانه */}
              <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h5 className="font-black text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  روند کسب سود پنهان آربیتراژ ماهانه ({currencyLabel})
                </h5>
                <div className="h-64 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { month: 'فروردین', profit: 4500000 },
                      { month: 'اردیبهشت', profit: 8200000 },
                      { month: 'خرداد', profit: 12500000 },
                      { month: 'تیر', profit: 18000000 },
                      { month: 'مرداد', profit: 21500000 },
                      { month: 'شهریور', profit: 29000000 },
                    ]}>
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip />
                      <Area type="monotone" dataKey="profit" name="سود آربیتراژ" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#profitGrad)" animationDuration={1200} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* مودال‌های عملیاتی */}
      {/* ======================================================== */}

      {/* مودال‌های تخصصی ورود به انبار و خروج با صدور فاکتور */}
      <InventoryEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        preselectedItemId={item.id}
      />

      <InventoryExitModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        preselectedItemId={item.id}
      />

      {/* مودال حواله ورود و خروج انبار */}
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
          onSaved={() => {
            setIsMovementModalOpen(false);
            setMovementToEdit(null);
          }}
        />
      )}

      {/* مودال تراکنش مالی مادر */}
      {isTransactionModalOpen && (
        <UniversalTransactionModal
          isOpen={isTransactionModalOpen}
          onClose={() => {
            setIsTransactionModalOpen(false);
            setFinanceTxToEdit(null);
          }}
          context="INVENTORY"
          editTransaction={financeTxToEdit}
          initialDirection="OUT"
          onSuccess={() => {
            setIsTransactionModalOpen(false);
            setFinanceTxToEdit(null);
            toast.success('سند مالی با موفقیت ثبت شد.');
          }}
        />
      )}

      {/* مودال ثبت پارت ورودی جدید */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-purple-500" />
                ثبت پارت ورودی جدید (Lot / Batch)
              </h4>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 mb-1">شماره پارت / لات:</label>
                <input
                  type="text"
                  value={batchLotNum}
                  onChange={e => setBatchLotNum(e.target.value)}
                  className="w-full h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none"
                  placeholder="LOT-1001"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">مقدار ورودی ({item.primaryUnit}):</label>
                <input
                  type="number"
                  value={batchQty}
                  onChange={e => setBatchQty(e.target.value)}
                  className="w-full h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">فی خرید هر {item.primaryUnit}:</label>
                <input
                  type="text"
                  value={batchPurchasePrice}
                  onChange={e => setBatchPurchasePrice(e.target.value)}
                  className="w-full h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">کرایه حمل ورودی:</label>
                <input
                  type="text"
                  value={batchFreight}
                  onChange={e => setBatchFreight(e.target.value)}
                  className="w-full h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">تاریخ ورود:</label>
                <GlassDatePicker
                  value={batchEntryDate}
                  onChange={setBatchEntryDate}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">تاریخ انقضا (اختیاری):</label>
                <GlassDatePicker
                  value={batchExpDate}
                  onChange={setBatchExpDate}
                  placeholder="بدون انقضا"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveBatch}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md shadow-purple-500/25 transition-all cursor-pointer"
              >
                ثبت و محاسبه بهای تمام‌شده قطعی
              </button>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* مودال تعریف ضریب تبدیل واحد جدید */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-cyan-600" />
                تعریف واحد و ضریب تبدیل جدید
              </h4>
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 mb-1">نام واحد فرعی (مثلاً پالت، خاور، تن):</label>
                <input
                  type="text"
                  value={newUnitName}
                  onChange={e => setNewUnitName(e.target.value)}
                  className="w-full h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                  placeholder="پالت"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">
                  ضریب تبدیل به واحد پایه (هر ۱ {newUnitName || 'واحد'} = چند {item.baseUnit || item.primaryUnit} است؟):
                </label>
                <input
                  type="number"
                  value={newUnitRatio}
                  onChange={e => setNewUnitRatio(e.target.value)}
                  className="w-full h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none text-left"
                  dir="ltr"
                  placeholder="40"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="approxCheck"
                  checked={newUnitApprox}
                  onChange={e => setNewUnitApprox(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-600"
                />
                <label htmlFor="approxCheck" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  این تبدیل تقریبی است (مانند سرویس نیسان یا کمپرسی)
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">توضیحات و فرمول (اختیاری):</label>
                <input
                  type="text"
                  value={newUnitNotes}
                  onChange={e => setNewUnitNotes(e.target.value)}
                  className="w-full h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                  placeholder="هر پالت سیمان شامل ۴۰ کیسه ۵۰ کیلویی"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveUnitConversion}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs shadow-md shadow-cyan-500/25 transition-all cursor-pointer"
              >
                ثبت ضریب تبدیل
              </button>
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </motion.div>
        </div>
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

      {/* پاپ‌آپ لغو حذف ۵ ثانیه‌ای */}
      <FloatingUndoToast
        undoItems={undoItems.map(u => ({ id: u.id, items: u.items, expireAt: u.expireAt }))}
        onCancel={handleCancelUndo}
      />
    </motion.div>
  );
}
