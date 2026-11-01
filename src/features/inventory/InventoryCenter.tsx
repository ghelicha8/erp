import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, Trash2, Edit, 
  Store, Truck, DollarSign, 
  Star, Pin, Wrench, Mountain, Boxes, Hammer, 
  Coins, LayoutGrid, List, Sparkles, Building,
  Layers, AlertTriangle, ArrowUpRight, ArrowDownRight,
  FileDown, FileUp, Scale, Zap, Grid, Paintbrush,
  TrendingUp, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useInventoryStore, 
  type InventoryItem, 
  INVENTORY_CATEGORIES,
  convertQuantity 
} from '../../store/inventoryStore';
import { useSettingsStore } from '../../store/settingsStore';
import { 
  AppSearchInput, 
  PortalSelect, 
  FloatingUndoToast,
  ThreeDTabs,
  type TabItem 
} from '../../components/ui/SharedLaborUI';

import InventoryItemModal from './components/InventoryItemModal';
import InventoryItemProfile, { AnimatedFuelGauge } from './InventoryItemProfile';
import InventoryEntryModal from './components/InventoryEntryModal';
import InventoryExitModal from './components/InventoryExitModal';
import InventoryMovementModal from './components/InventoryMovementModal';
import ExportBuilder from '../../components/shared/ExportBuilder';
import ImportBuilder from '../../components/shared/ImportBuilder';

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

type SortOption = 'LATEST' | 'NAME_ASC' | 'STOCK_HIGH' | 'STOCK_LOW' | 'VALUE_HIGH';
type StockStatusFilter = 'ALL' | 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVER_STOCK' | 'EXPIRING';
type PageLimit = 10 | 25 | 50 | 9999;

const SORT_OPTIONS = [
  { value: 'LATEST', label: 'جدیدترین‌ها' },
  { value: 'NAME_ASC', label: 'حروف الفبا (الف تا ی)' },
  { value: 'STOCK_HIGH', label: 'بیشترین موجودی' },
  { value: 'STOCK_LOW', label: 'کمترین موجودی (نیازمند خرید)' },
  { value: 'VALUE_HIGH', label: 'بیشترین ارزش ریالی' },
];

const STOCK_STATUS_OPTIONS = [
  { value: 'ALL', label: 'همه وضعیت‌های موجودی' },
  { value: 'NORMAL', label: 'نرمال و مطلوب' },
  { value: 'LOW_STOCK', label: 'کمبود / زیر حداقل' },
  { value: 'OUT_OF_STOCK', label: 'ناموجود (موجودی صفر)' },
  { value: 'OVER_STOCK', label: 'بیش از حداکثر (انباشت)' },
  { value: 'EXPIRING', label: 'نزدیک به انقضا (زیر ۱۰ روز)' },
];

const PAGE_LIMIT_OPTIONS = [
  { value: '10', label: '۱۰ ردیف' },
  { value: '25', label: '۲۵ ردیف' },
  { value: '50', label: '۵۰ ردیف' },
  { value: '9999', label: 'همه ردیف‌ها' },
];

export default function InventoryCenter() {
  const { items, transactions, batches, deleteItem, togglePinItem } = useInventoryStore();
  const { currency } = useSettingsStore(state => state.settings);
  const isRial = currency === 'rial' || (currency as any) === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';

  // فیلترها و جستجو
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockStatus, setStockStatus] = useState<StockStatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('LATEST');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [pageLimit, setPageLimit] = useState<PageLimit>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // مودال‌ها
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);

  // ناوبری درون‌صفحه‌ای تمام‌صفحه به پرونده کالا
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // مودال‌های ورود و خروج هوشمند
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [actionPreselectedItemId, setActionPreselectedItemId] = useState<string | undefined>(undefined);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementPreselectedItem, setMovementPreselectedItem] = useState<InventoryItem | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // سیستم حذف ایمن ۵ ثانیه‌ای (FloatingUndoToast)
  const [undoItems, setUndoItems] = useState<{ id: string; items: string[]; expireAt: number; itemName?: string }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  // تایمر ۵ ثانیه‌ای حذف
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
        const expired = prev.filter(u => u.expireAt <= now);
        const active = prev.filter(u => u.expireAt > now);
        if (expired.length > 0) {
          expired.forEach(u => u.items.forEach(id => deleteItem(id)));
          setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e => e.items).includes(id)));
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteItem]);

  const triggerDeleteItem = (id: string, name: string) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: [id], expireAt: Date.now() + 5000, itemName: name }]);
    setPendingDeleteIds(prev => [...prev, id]);
  };

  const handleCancelUndo = (undoId: string | number) => {
    const target = undoItems.find(u => String(u.id) === String(undoId));
    if (target) {
      setPendingDeleteIds(prev => prev.filter(id => !target.items.includes(id)));
      setUndoItems(prev => prev.filter(u => String(u.id) !== String(undoId)));
      toast.success('حذف کالای انبار لغو شد.');
    }
  };

  // ==========================================
  // محاسبات ۴ کارت آماری کلان انبار
  // ==========================================
  const macroStats = useMemo(() => {
    // ۱. ارزش کل موجودی فعلی انبار بر اساس میانگین بهای تمام‌شده
    const totalInventoryValue = items.reduce((sum, it) => {
      return sum + (safeNum(it.currentStock) * safeNum(it.averageUnitCost));
    }, 0);

    // ۲. تعداد اقلام فعال و کالاهای بحرانی (زیر نقطه سفارش)
    const totalItemCount = items.length;
    const criticalStockCount = items.filter(it => it.currentStock <= it.minStockLevel).length;

    // ۳. ارزش کل مصالح ارسال‌شده به پروژه‌ها
    let totalSentToProjectsValue = 0;
    let totalArbitrageProfit = 0;

    transactions.forEach(t => {
      if (t.type === 'OUT_PROJECT') {
        totalSentToProjectsValue += (t.totalBilledAmount || t.totalInternalCost);
        totalArbitrageProfit += (t.hiddenProfit || 0);
      } else if (t.type === 'OUT_WASTE') {
        // کسر ضایعات از سود انبار
        totalArbitrageProfit -= t.totalInternalCost;
      }
    });

    return {
      totalInventoryValue,
      totalItemCount,
      criticalStockCount,
      totalSentToProjectsValue,
      totalArbitrageProfit
    };
  }, [items, transactions]);

  // تب‌های سه‌بعدی دسته‌بندی
  const categoryTabs: TabItem<string>[] = useMemo(() => {
    const list: TabItem<string>[] = [
      {
        id: 'ALL',
        label: 'همه دسته‌بندی‌ها',
        icon: Package,
        count: items.length
      }
    ];

    Object.values(INVENTORY_CATEGORIES).forEach(cat => {
      const count = items.filter(it => it.category === cat.id).length;
      list.push({
        id: cat.id,
        label: cat.shortTitle,
        icon: CATEGORY_ICONS[cat.id] || Boxes,
        count,
        accentColor: cat.accentColor
      });
    });

    return list;
  }, [items]);

  // فیلتر و مرتب‌سازی اقلام
  const filteredAndSortedItems = useMemo(() => {
    let list = items.filter(it => !pendingDeleteIds.includes(it.id));

    list = list.filter(it => {
      const matchSearch = 
        it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        it.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (it.location && it.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        it.primaryUnit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (it.secondaryUnit && it.secondaryUnit.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = selectedCategory === 'ALL' || it.category === selectedCategory;

      let matchStock = true;
      if (stockStatus === 'NORMAL') {
        matchStock = it.currentStock > it.minStockLevel && (!it.maxStockLevel || it.currentStock <= it.maxStockLevel);
      } else if (stockStatus === 'LOW_STOCK') {
        matchStock = it.currentStock > 0 && it.currentStock <= it.minStockLevel;
      } else if (stockStatus === 'OUT_OF_STOCK') {
        matchStock = it.currentStock <= 0;
      } else if (stockStatus === 'OVER_STOCK') {
        matchStock = !!(it.maxStockLevel && it.currentStock > it.maxStockLevel);
      } else if (stockStatus === 'EXPIRING') {
        const now = moment();
        const itemBatches = batches.filter(b => b.itemId === it.id && b.remainingQuantity > 0 && b.expirationDate);
        matchStock = itemBatches.some(b => {
          const exp = moment(b.expirationDate, 'YYYY/MM/DD');
          const diff = exp.diff(now, 'days');
          return diff >= 0 && diff <= 10;
        });
      }

      return matchSearch && matchCategory && matchStock;
    });

    // مرتب‌سازی
    return [...list].sort((a, b) => {
      // ابتدا پین‌شده‌ها
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortBy === 'NAME_ASC') {
        return a.name.localeCompare(b.name, 'fa');
      }
      if (sortBy === 'STOCK_HIGH') {
        return b.currentStock - a.currentStock;
      }
      if (sortBy === 'STOCK_LOW') {
        return a.currentStock - b.currentStock;
      }
      if (sortBy === 'VALUE_HIGH') {
        const valA = a.currentStock * a.averageUnitCost;
        const valB = b.currentStock * b.averageUnitCost;
        return valB - valA;
      }
      // LATEST
      return (String(b.createdAt || '')).localeCompare(String(a.createdAt || ''));
    });
  }, [items, batches, pendingDeleteIds, searchQuery, selectedCategory, stockStatus, sortBy]);

  // صفحه‌بندی
  const paginatedItems = useMemo(() => {
    if (pageLimit === 9999) return filteredAndSortedItems;
    const startIndex = (currentPage - 1) * pageLimit;
    return filteredAndSortedItems.slice(startIndex, startIndex + pageLimit);
  }, [filteredAndSortedItems, currentPage, pageLimit]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / (pageLimit === 9999 ? 1 : pageLimit)));

  return (
    <div className="w-full relative min-h-screen">
      <AnimatePresence mode="wait">
        {selectedItemId ? (
          <motion.div
            key="profile-view"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full"
          >
            <InventoryItemProfile
              itemId={selectedItemId}
              onBack={() => setSelectedItemId(null)}
              onEdit={(it) => {
                setItemToEdit(it);
                setIsItemModalOpen(true);
              }}
              onDelete={(id, name) => {
                setSelectedItemId(null);
                triggerDeleteItem(id, name);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full h-full flex flex-col space-y-6 relative pb-16"
          >
      
      {/* ======================================================== */}
      {/* هدر چسبنده مرکز انبار مصالح (Sticky Header) */}
      {/* ======================================================== */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-slate-100/90 dark:bg-slate-900/90 p-4 rounded-3xl border border-white/60 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* ردیف بالا: عنوان و کنترل‌ها */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
          
          {/* سمت راست: آیکون باکس و عنوان */}
          <div className="flex items-center gap-3.5 w-full xl:w-auto">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.35)] shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-emerald-800 dark:from-white dark:to-emerald-300 drop-shadow-sm flex items-center gap-2">
                مرکز انبار مصالح و کاردکس
              </h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                مدیریت موجودی دوگانه، بهای تمام‌شده، حواله به پروژه‌ها و سود پنهان آربیتراژ
              </p>
            </div>
          </div>

          {/* سمت چپ: ابزارهای جستجو، فیلتر، سوئیچ ویو و دکمه‌های ثبت */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2.5 w-full xl:w-auto">
            
            {/* جستجوی هوشمند */}
            <div className="w-full sm:w-60 min-w-[180px]">
              <AppSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="جستجو در نام، بارکد، محل..."
              />
            </div>

            {/* فیلتر وضعیت موجودی */}
            <div className="w-40 shrink-0 h-[44px]">
              <PortalSelect
                options={STOCK_STATUS_OPTIONS}
                value={stockStatus}
                onChange={(val: any) => { setStockStatus(val); setCurrentPage(1); }}
                placeholder="وضعیت انبار..."
                className="!h-[44px] !rounded-2xl"
              />
            </div>

            {/* مرتب‌سازی */}
            <div className="w-36 shrink-0 h-[44px]">
              <PortalSelect
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={(val: any) => setSortBy(val)}
                placeholder="مرتب‌سازی..."
                className="!h-[44px] !rounded-2xl"
              />
            </div>

            {/* تعداد در صفحه */}
            <div className="w-24 shrink-0 h-[44px]">
              <PortalSelect
                options={PAGE_LIMIT_OPTIONS}
                value={String(pageLimit)}
                onChange={(val: string) => { setPageLimit(Number(val) as PageLimit); setCurrentPage(1); }}
                placeholder="تعداد..."
                className="!h-[44px] !rounded-2xl"
              />
            </div>

            {/* سوییچ ویو: شبکه‌ای / لیستی */}
            <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1 rounded-2xl shadow-inner border border-white/50 dark:border-slate-700/50 shrink-0 h-[44px]">
              <button 
                type="button"
                onClick={() => setViewMode('GRID')} 
                className={`p-2 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                title="نمای شبکه‌ای"
              >
                <LayoutGrid className="w-4.5 h-4.5" />
              </button>
              <button 
                type="button"
                onClick={() => setViewMode('LIST')} 
                className={`p-2 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                title="نمای لیستی"
              >
                <List className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* دکمه ثبت ورود کالا */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setActionPreselectedItemId(undefined);
                setIsEntryModalOpen(true);
              }}
              className="h-[44px] px-3.5 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/25 text-xs transition-all shrink-0 cursor-pointer"
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>ثبت ورود کالا</span>
            </motion.button>

            {/* دکمه ثبت حواله خروج */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setActionPreselectedItemId(undefined);
                setIsExitModalOpen(true);
              }}
              className="h-[44px] px-3.5 flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-blue-500/25 text-xs transition-all shrink-0 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>ثبت حواله خروج</span>
            </motion.button>

            {/* دکمه تعریف کالای جدید */}
            <motion.button 
              type="button"
              whileHover={{ scale: 1.03 }} 
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setItemToEdit(null);
                setIsItemModalOpen(true);
              }}
              className="h-[44px] px-4 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl font-black shadow-md text-xs transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تعریف کالای جدید</span>
            </motion.button>

          </div>
        </div>

        {/* ردیف دوم چسبنده: تب‌های سه‌بعدی ۹ دسته‌بندی مصالح */}
        <div className="w-full pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
          <ThreeDTabs<string>
            tabs={categoryTabs}
            activeTab={selectedCategory}
            onChange={(catId) => {
              setSelectedCategory(catId);
              setCurrentPage(1);
            }}
            theme="emerald"
            layoutId="inventoryCategoryTabsIndicator"
          />
        </div>

      </div>

      {/* ======================================================== */}
      {/* ۴ کارت آماری کلان بالای صفحه انبار */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* کارت ۱: ارزش کل موجودی فعلی */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-900/40 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center w-full mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">ارزش کل موجودی انبار</span>
            <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
            {macroStats.totalInventoryValue.toLocaleString('fa-IR')} <span className="text-xs font-normal">{currencyLabel}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-bold block mt-1">
            بر اساس بهای تمام‌شده میانگین
          </span>
        </div>

        {/* کارت ۲: تنوع اقلام و کالاهای بحرانی */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-blue-200/50 dark:border-blue-900/40 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center w-full mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">تنوع اقلام انبار</span>
            <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
              {macroStats.totalItemCount}
            </span>
            <span className="text-xs font-bold text-slate-400">قلم فعال</span>
          </div>
          <div className="text-[11px] font-bold mt-1 flex items-center gap-1 text-rose-500">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{macroStats.criticalStockCount} قلم در وضعیت بحرانی یا ناموجود</span>
          </div>
        </div>

        {/* کارت ۳: ارزش کل مصالح ارسال‌شده به پروژه‌ها */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-indigo-200/50 dark:border-indigo-900/40 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center w-full mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">کل مصالح ارسال‌شده به پروژه‌ها</span>
            <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono" dir="ltr">
            {macroStats.totalSentToProjectsValue.toLocaleString('fa-IR')} <span className="text-xs font-normal">{currencyLabel}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-bold block mt-1">
            مجموع صورت‌وضعیت مصالح کارفرمایان
          </span>
        </div>

        {/* کارت ۴: مجموع سود خالص آربیتراژ انبار */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-teal-200/50 dark:border-teal-900/40 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center w-full mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">مجموع سود خالص (آربیتراژ انبار)</span>
            <div className="p-2.5 rounded-2xl bg-teal-100 dark:bg-teal-900/40 text-teal-600">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${macroStats.totalArbitrageProfit >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600'}`} dir="ltr">
            {macroStats.totalArbitrageProfit >= 0 ? '+' : ''}{macroStats.totalArbitrageProfit.toLocaleString('fa-IR')} <span className="text-xs font-normal">{currencyLabel}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-bold block mt-1">
            مازاد فاکتور کارفرما نسبت به بهای تمام‌شده
          </span>
        </div>

      </div>

      {/* ======================================================== */}
      {/* لیست و کارت‌های اقلام انبار */}
      {/* ======================================================== */}
      <div className="space-y-6">

        {paginatedItems.length === 0 ? (
          <div className="p-14 text-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl">
            <Package className="w-14 h-14 text-slate-400 mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-black text-slate-700 dark:text-slate-300">هیچ کالایی در انبار یافت نشد</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">
              {searchQuery ? 'نتیجه‌ای متناسب با جستجوی شما پیدا نشد.' : 'با کلیک روی «تعریف کالای جدید»، اولین قلم کالای انبار را ثبت کنید.'}
            </p>
          </div>
        ) : viewMode === 'GRID' ? (
          
          /* ================= نمای شبکه‌ای (Grid View) ================= */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence>
              {paginatedItems.map((item) => {
                const catMeta = INVENTORY_CATEGORIES[item.category] || INVENTORY_CATEGORIES.cement_mortar;
                const Icon = CATEGORY_ICONS[item.category] || Boxes;
                const isCritical = item.currentStock <= item.minStockLevel;
                const isOutOfStock = item.currentStock <= 0;
                const totalItemVal = item.currentStock * item.averageUnitCost;

                // واحد انتخابی برای نمایش با تبدیل خودکار
                const displayUnit = item.displayUnit || item.primaryUnit;
                const convertedStock = convertQuantity(item.currentStock, item.primaryUnit, displayUnit, item);

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`relative p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between gap-4 group overflow-hidden cursor-pointer ${
                      item.isPinned 
                        ? 'border-amber-400/60 dark:border-amber-500/50 shadow-amber-500/10' 
                        : isCritical
                        ? 'border-rose-300 dark:border-rose-900/60'
                        : 'border-white/80 dark:border-slate-800 hover:border-emerald-500/40'
                    }`}
                  >
                    {/* هاله طلایی در کارت‌های پین‌شده */}
                    {item.isPinned && (
                      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/15 blur-3xl rounded-full pointer-events-none" />
                    )}

                    {/* هدر کارت کالا */}
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-13 h-13 rounded-2xl object-cover shadow-md shrink-0 border border-slate-200 dark:border-slate-700" 
                            />
                          ) : (
                            <div 
                              className="w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                              style={{ backgroundColor: catMeta.accentColor }}
                            >
                              <Icon className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-black text-base text-slate-800 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {item.name}
                              </h4>
                              {item.isPinned && (
                                <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span 
                                className="text-[10px] font-black px-2 py-0.5 rounded-md inline-block"
                                style={{ 
                                  backgroundColor: `${catMeta.accentColor}15`,
                                  color: catMeta.accentColor 
                                }}
                              >
                                {catMeta.shortTitle}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {item.code}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* دکمه پین با چرخش انیمیشنی ۳۶۰ درجه مداوم */}
                        <motion.button 
                          type="button"
                          whileHover={{ scale: 1.2, rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinItem(item.id);
                          }}
                          className="relative p-2 rounded-xl transition-all cursor-pointer"
                          title={item.isPinned ? 'برداشتن پین' : 'پین کردن'}
                        >
                          <Star className={`w-5 h-5 transition-all duration-300 ${
                            item.isPinned 
                              ? 'fill-amber-400 text-amber-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-[spin_6s_linear_infinite]' 
                              : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                          }`} />
                        </motion.button>
                      </div>

                      {/* نمایش موجودی دوگانه و آمپر بنزین */}
                      <div className="mt-4 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-500">موجودی فعلی ({displayUnit}):</span>
                          <span className={`font-mono font-black text-sm ${
                            isOutOfStock 
                              ? 'text-rose-600' 
                              : isCritical 
                              ? 'text-amber-500' 
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`} dir="ltr">
                            {convertedStock.toLocaleString('fa-IR')} {displayUnit}
                          </span>
                        </div>

                        {/* اگر واحد نمایش با واحد پایه متفاوت است، معادل پایه را نمایش بده */}
                        {displayUnit !== item.primaryUnit ? (
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold border-t border-slate-200/50 dark:border-slate-700/50 pt-1.5">
                            <span>معادل واحد پایه ({item.primaryUnit}):</span>
                            <span className="font-mono text-slate-600 dark:text-slate-300" dir="ltr">
                              {item.currentStock.toLocaleString('fa-IR')} {item.primaryUnit}
                            </span>
                          </div>
                        ) : item.secondaryUnit ? (
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold border-t border-slate-200/50 dark:border-slate-700/50 pt-1.5">
                            <span>معادل واحد فرعی ({item.secondaryUnit}):</span>
                            <span className="font-mono text-slate-600 dark:text-slate-300" dir="ltr">
                              {convertQuantity(item.currentStock, item.primaryUnit, item.secondaryUnit, item).toLocaleString('fa-IR')} {item.secondaryUnit}
                            </span>
                          </div>
                        ) : null}

                        {/* نوار وضعیت موجودی */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOutOfStock 
                                ? 'bg-rose-500 w-0' 
                                : isCritical 
                                ? 'bg-rose-500 animate-pulse' 
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, (item.currentStock / (item.maxStockLevel || (item.minStockLevel * 3 || 100))) * 100))}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-0.5">
                          <span>حداقل هشدار: {item.minStockLevel} {item.primaryUnit}</span>
                          <span>ارزش ریالی: {totalItemVal.toLocaleString('fa-IR')} {currencyLabel}</span>
                        </div>
                      </div>

                    </div>

                    {/* قیمت‌ها و فوتر کارت - بدون آیکون چشم */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 relative z-10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                        <span>مشاهده پرونده و کاردکس کالا</span>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionPreselectedItemId(item.id);
                            setIsEntryModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          title="ثبت ورود کالا (خرید / تولید)"
                        >
                          <ArrowDownRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionPreselectedItemId(item.id);
                            setIsExitModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer"
                          title="ثبت حواله خروج (فروش / پروژه)"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToEdit(item);
                            setIsItemModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                          title="ویرایش مشخصات"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerDeleteItem(item.id, item.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="حذف ۵ ثانیه‌ای"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          
          /* ================= نمای لیستی (List View) ================= */
          <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-black text-slate-500 dark:text-slate-400">
                    <th className="p-4 w-12 text-center">پین</th>
                    <th className="p-4">کد / نام کالا</th>
                    <th className="p-4">دسته‌بندی</th>
                    <th className="p-4 text-center">موجودی پایه</th>
                    <th className="p-4 text-center">معادل فرعی</th>
                    <th className="p-4 text-center">فی تمام‌شده ({currencyLabel})</th>
                    <th className="p-4 text-center">ارزش کل ({currencyLabel})</th>
                    <th className="p-4 text-center">وضعیت انبار</th>
                    <th className="p-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <AnimatePresence>
                    {paginatedItems.map((item) => {
                      const catMeta = INVENTORY_CATEGORIES[item.category] || INVENTORY_CATEGORIES.cement_mortar;
                      const Icon = CATEGORY_ICONS[item.category] || Boxes;
                      const isCritical = item.currentStock <= item.minStockLevel;
                      const isOutOfStock = item.currentStock <= 0;
                      const totalItemVal = item.currentStock * item.averageUnitCost;

                      return (
                        <motion.tr
                          key={item.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setSelectedItemId(item.id)}
                          className={`hover:bg-emerald-500/5 transition-colors cursor-pointer ${item.isPinned ? 'bg-amber-500/[0.04]' : ''}`}
                        >
                          <td className="p-4 text-center">
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.2, rotate: 360 }}
                              transition={{ duration: 0.5 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinItem(item.id);
                              }}
                              className="cursor-pointer"
                              title={item.isPinned ? 'برداشتن پین' : 'پین کردن'}
                            >
                              <Star className={`w-4 h-4 ${item.isPinned ? 'fill-amber-400 text-amber-500 animate-[spin_6s_linear_infinite]' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'}`} />
                            </motion.button>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-8 h-8 rounded-xl object-cover shadow-sm shrink-0 border border-slate-200 dark:border-slate-700"
                                />
                              ) : (
                                <div 
                                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                                  style={{ backgroundColor: catMeta.accentColor }}
                                >
                                  <Icon className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <span className="font-black text-slate-800 dark:text-white text-sm block">
                                  {item.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {item.code}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <span 
                              className="text-[10px] font-black px-2.5 py-1 rounded-lg inline-block"
                              style={{ 
                                backgroundColor: `${catMeta.accentColor}15`,
                                color: catMeta.accentColor 
                              }}
                            >
                              {catMeta.shortTitle}
                            </span>
                          </td>

                          <td className="p-4 text-center font-mono font-black" dir="ltr">
                            {item.currentStock.toLocaleString('fa-IR')} {item.primaryUnit}
                          </td>

                          <td className="p-4 text-center font-mono text-slate-500" dir="ltr">
                            {item.secondaryUnit ? (
                              `${convertQuantity(item.currentStock, item.primaryUnit, item.secondaryUnit, item).toLocaleString('fa-IR')} ${item.secondaryUnit}`
                            ) : '—'}
                          </td>

                          <td className="p-4 text-center font-mono text-slate-600 dark:text-slate-300" dir="ltr">
                            {item.averageUnitCost.toLocaleString('fa-IR')}
                          </td>

                          <td className="p-4 text-center font-mono font-black text-emerald-600 dark:text-emerald-400" dir="ltr">
                            {totalItemVal.toLocaleString('fa-IR')}
                          </td>

                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                : isCritical
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}>
                              {isOutOfStock ? 'ناموجود' : isCritical ? 'زیر نقطه سفارش' : 'موجود نرمال'}
                            </span>
                          </td>

                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionPreselectedItemId(item.id);
                                  setIsEntryModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                title="ثبت ورود کالا"
                              >
                                <ArrowDownRight className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionPreselectedItemId(item.id);
                                  setIsExitModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer"
                                title="ثبت حواله خروج"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setItemToEdit(item);
                                  setIsItemModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                                title="ویرایش"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerDeleteItem(item.id, item.name);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="حذف ۵ ثانیه‌ای"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* صفحه‌بندی */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              قبلی
            </button>
            <span className="text-xs font-black text-slate-500">
              صفحه {currentPage} از {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              بعدی
            </button>
          </div>
        )}

      </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* مودال‌های اختصاصی ورود و خروج هوشمند انبار */}
      <InventoryEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => {
          setIsEntryModalOpen(false);
          setActionPreselectedItemId(undefined);
        }}
        preselectedItemId={actionPreselectedItemId}
      />

      <InventoryExitModal
        isOpen={isExitModalOpen}
        onClose={() => {
          setIsExitModalOpen(false);
          setActionPreselectedItemId(undefined);
        }}
        preselectedItemId={actionPreselectedItemId}
      />

      {/* مودال تعریف / ویرایش کالای انبار */}
      <InventoryItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setItemToEdit(null);
        }}
        itemToEdit={itemToEdit}
      />

      {/* مودال ثبت حواله ورود / خروج و ارسال مصالح */}
      <InventoryMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => {
          setIsMovementModalOpen(false);
          setMovementPreselectedItem(null);
        }}
        preselectedItemId={movementPreselectedItem?.id}
      />

      {/* خروجی گزارشات اکسل و PDF */}
      {isExportModalOpen && (
        <ExportBuilder
          context="INVENTORY"
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* ورودی اطلاعات اکسل */}
      {isImportModalOpen && (
        <ImportBuilder
          context="INVENTORY"
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      {/* تست لغو حذف ۵ ثانیه‌ای */}
      <FloatingUndoToast
        undoItems={undoItems.map(u => ({ id: u.id, items: u.items, expireAt: u.expireAt }))}
        onCancel={handleCancelUndo}
      />

    </div>
  );
}
