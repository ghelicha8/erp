import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Plus, Trash2, Edit, 
  Store, Truck, DollarSign, User,
  Star, Pin, Wrench, Mountain, Factory, Boxes, Hammer, Fuel, 
  Coins, LayoutGrid, List, Sparkles, Building,
  Phone, MapPin
} from 'lucide-react';
import { toast } from 'sonner';

import { 
  useProcurementStore, 
  type Supplier, 
  type SupplierCategory, 
  SUPPLIER_CATEGORIES,
  normalizeSupplierCategory
} from '../../store/procurementStore';
import { usePurchaseStore } from '../../store/purchaseStore';
import { useFinanceStore } from '../../store/financeStore';
import { useLogisticsStore } from '../../store/logisticsStore';
import { useSettingsStore } from '../../store/settingsStore';

import ProcurementPurchaseModal from './components/ProcurementPurchaseModal';
import AdvancedPurchaseModal from '../projects/components/AdvancedPurchaseModal';
import SupplierModal from './components/SupplierModal';
import SupplierProfile from './SupplierProfile';
import { AppSearchInput, PortalSelect, FloatingUndoToast } from '../../components/ui/SharedLaborUI';

const CATEGORY_ICONS: Record<string, any> = {
  materialShop: Boxes,
  mine: Mountain,
  ironMarket: Building,
  hardwareStore: Hammer,
  repairShop: Wrench,
  externalLogistics: Truck,
  WORKSHOP_MACHINING: Wrench,
  QUARRY_SAND: Mountain,
  PRECAST_FACTORIES: Factory,
  BUILDING_MATERIALS: Boxes,
  TOOL_HARDWARE: Hammer,
  FUEL_WATER: Fuel,
  EQUIPMENT_RENTAL: Truck,
};

const safeNum = (val: unknown): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/,/g, '').replace(/[^0-9.-]+/g, '');
  const parsed = Number(clean);
  return isNaN(parsed) ? 0 : parsed;
};

type SortOption = 'LATEST' | 'NAME_ASC' | 'PURCHASE_VOLUME' | 'BALANCE_HIGH' | 'RATING';
type PageLimit = 10 | 25 | 50 | 9999;

const SORT_OPTIONS = [
  { value: 'LATEST', label: 'جدیدترین‌ها' },
  { value: 'NAME_ASC', label: 'حروف الفبا (الف تا ی)' },
  { value: 'PURCHASE_VOLUME', label: 'بیشترین حجم خرید' },
  { value: 'BALANCE_HIGH', label: 'بیشترین مانده‌حساب' },
  { value: 'RATING', label: 'بالاترین امتیاز کیفیت' },
];

const PAGE_LIMIT_OPTIONS = [
  { value: '10', label: '۱۰ ردیف' },
  { value: '25', label: '۲۵ ردیف' },
  { value: '50', label: '۵۰ ردیف' },
  { value: '9999', label: 'همه ردیف‌ها' },
];

export default function ProcurementCenter() {
  const { suppliers, deleteSupplier, togglePinSupplier } = useProcurementStore();
  const { purchases } = usePurchaseStore();
  const { transactions } = useFinanceStore();
  const { repairs } = useLogisticsStore();
  const { currency } = useSettingsStore(state => state.settings);
  const isRial = currency === 'rial' || (currency as any) === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';
  const multiplier = isRial ? 10 : 1;

  // فیلترها و جستجوی تأمین‌کنندگان
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | SupplierCategory>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('LATEST');
  const [pageLimit, setPageLimit] = useState<PageLimit>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // سیستم حذف ایمن ۵ ثانیه‌ای (FloatingUndoToast)
  const [undoItems, setUndoItems] = useState<{ id: string; items: string[]; expireAt: number; supplierName?: string }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  // مودال‌های ثبت و پروفایل
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseModalSupplier, setPurchaseModalSupplier] = useState<Supplier | null>(null);
  const [purchaseModalVendorName, setPurchaseModalVendorName] = useState<string | undefined>(undefined);

  // گوش دادن به ایونت‌های باز کردن مودال خرید در سراسر برنامه
  useEffect(() => {
    const handler = (e: any) => {
      const detail = e.detail || {};
      if (detail.supplierId) {
        const found = suppliers.find(s => s.id === detail.supplierId);
        setPurchaseModalSupplier(found || null);
        setPurchaseModalVendorName(found?.name);
      } else if (detail.vendor) {
        const found = suppliers.find(s => s.name.trim().toLowerCase() === detail.vendor.trim().toLowerCase());
        setPurchaseModalSupplier(found || null);
        setPurchaseModalVendorName(detail.vendor);
      } else {
        setPurchaseModalSupplier(null);
        setPurchaseModalVendorName(undefined);
      }
      setIsPurchaseModalOpen(true);
    };
    document.addEventListener('open-procurement-purchase-modal', handler);
    document.addEventListener('open-new-purchase-modal', handler);
    return () => {
      document.removeEventListener('open-procurement-purchase-modal', handler);
      document.removeEventListener('open-new-purchase-modal', handler);
    };
  }, [suppliers]);

  // تایمر ۵ ثانیه‌ای جهت حذف قطعی پس از انقضا
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
        const expired = prev.filter(u => u.expireAt <= now);
        const active = prev.filter(u => u.expireAt > now);
        if (expired.length > 0) {
          expired.forEach(u => u.items.forEach(id => deleteSupplier(id)));
          setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e => e.items).includes(id)));
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteSupplier]);

  const triggerDeleteSupplier = (id: string, name: string) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: [id], expireAt: Date.now() + 5000, supplierName: name }]);
    setPendingDeleteIds(prev => [...prev, id]);
  };

  const handleCancelUndo = (undoId: string | number) => {
    const target = undoItems.find(u => String(u.id) === String(undoId));
    if (target) {
      setPendingDeleteIds(prev => prev.filter(id => !target.items.includes(id)));
      setUndoItems(prev => prev.filter(u => String(u.id) !== String(undoId)));
      toast.success('حذف تأمین‌کننده لغو شد.');
    }
  };

  // ارتباط خریدها و مانده‌حساب هر تأمین‌کننده (شامل فاکتورهای تعمیرگاه و تراشکاری لجستیک)
  const supplierFinancialStats = useMemo(() => {
    const statsMap: Record<string, { totalSpend: number; invoiceCount: number; paymentsMade: number; balance: number }> = {};

    suppliers.forEach(sup => {
      const supName = sup.name.trim().toLowerCase();
      let totalSpend = 0;
      let invoiceCount = 0;

      purchases.forEach(p => {
        const isMatched = (p.supplierId && p.supplierId === sup.id) ||
          (p.vendor && p.vendor.trim().toLowerCase() === supName);
        if (isMatched) {
          totalSpend += safeNum(p.internalCost);
          invoiceCount++;
        }
      });

      // احتساب فاکتورهای تعمیرات و تراشکاری خودروها
      (repairs || []).forEach(r => {
        const isMatched = 
          r.mechanicInfo?.supplierId === sup.id ||
          (r.mechanicInfo?.mechanicName && r.mechanicInfo.mechanicName.trim().toLowerCase().includes(supName));
        if (isMatched) {
          totalSpend += safeNum(r.totalCost);
          invoiceCount++;
        }
      });

      let paymentsMade = 0;
      transactions.forEach(t => {
        const matchAlloc = t.allocations?.some(a => (a as any).recordType === 'SUPPLIER' && a.recordId === sup.id) || t.allocations?.some(a => (a as any).supplierId === sup.id);
        const matchRef = t.referenceId === sup.id;
        const matchSupplierId = (t as any).supplierId === sup.id;
        const matchDesc = Boolean(t.description && t.description.toLowerCase().includes(supName));

        if (matchAlloc || matchRef || matchSupplierId || matchDesc) {
          if (t.direction === 'OUT') {
            paymentsMade += safeNum(t.amount);
          } else if (t.direction === 'IN') {
            paymentsMade -= safeNum(t.amount);
          }
        }
      });

      // محاسبه ۱۰۰٪ واقعی مانده از تفریق فاکتورها از پرداختی‌های واقعی (بدون عدد ساختگی)
      const balance = totalSpend - paymentsMade;

      statsMap[sup.id] = { totalSpend, invoiceCount, paymentsMade, balance };
    });

    return statsMap;
  }, [suppliers, purchases, repairs, transactions]);

  // فیلتر و مرتب‌سازی تأمین‌کنندگان (بدون آیتم‌های در حال حذف)
  const filteredAndSortedSuppliers = useMemo(() => {
    let list = suppliers.filter(s => !pendingDeleteIds.includes(s.id));

    list = list.filter(s => {
      const matchSearch = 
        s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        (s.managerName && s.managerName.toLowerCase().includes(supplierSearch.toLowerCase())) ||
        s.phone.includes(supplierSearch) ||
        (s.city && s.city.toLowerCase().includes(supplierSearch.toLowerCase())) ||
        (s.address && s.address.toLowerCase().includes(supplierSearch.toLowerCase()));

      const matchCategory = selectedCategoryFilter === 'ALL' || normalizeSupplierCategory(s.category) === selectedCategoryFilter;
      return matchSearch && matchCategory;
    });

    // مرتب‌سازی هوشمند
    list = [...list].sort((a, b) => {
      // ابتدا پین‌شده‌ها
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortBy === 'NAME_ASC') {
        return a.name.localeCompare(b.name, 'fa');
      }
      if (sortBy === 'PURCHASE_VOLUME') {
        const spendA = supplierFinancialStats[a.id]?.totalSpend || 0;
        const spendB = supplierFinancialStats[b.id]?.totalSpend || 0;
        return spendB - spendA;
      }
      if (sortBy === 'BALANCE_HIGH') {
        const balA = supplierFinancialStats[a.id]?.balance || 0;
        const balB = supplierFinancialStats[b.id]?.balance || 0;
        return balB - balA;
      }
      if (sortBy === 'RATING') {
        return (b.rating || 0) - (a.rating || 0);
      }
      // LATEST (پیش‌فرض)
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    return list;
  }, [suppliers, pendingDeleteIds, supplierSearch, selectedCategoryFilter, sortBy, supplierFinancialStats]);

  // صفحه‌بندی تأمین‌کنندگان
  const paginatedSuppliers = useMemo(() => {
    if (pageLimit === 9999) return filteredAndSortedSuppliers;
    const startIndex = (currentPage - 1) * pageLimit;
    return filteredAndSortedSuppliers.slice(startIndex, startIndex + pageLimit);
  }, [filteredAndSortedSuppliers, currentPage, pageLimit]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedSuppliers.length / (pageLimit === 9999 ? 1 : pageLimit)));

  const OFFICIAL_PROCUREMENT_CATEGORIES: ('materialShop' | 'mine' | 'ironMarket' | 'hardwareStore' | 'repairShop' | 'externalLogistics')[] = [
    'materialShop',
    'mine',
    'ironMarket',
    'hardwareStore',
    'repairShop',
    'externalLogistics'
  ];

  // گزینه‌های لیست کشویی سرچدار ۶ صنف تخصصی تدارکات
  const categorySelectOptions = useMemo(() => {
    const list = [
      {
        id: 'ALL',
        value: 'ALL',
        label: `همه تأمین‌کنندگان (${suppliers.length})`,
        icon: Store,
      },
    ];

    OFFICIAL_PROCUREMENT_CATEGORIES.forEach(catId => {
      const cat = SUPPLIER_CATEGORIES[catId];
      if (!cat) return;
      const count = suppliers.filter(s => normalizeSupplierCategory(s.category) === catId).length;
      list.push({
        id: cat.id,
        value: cat.id,
        label: `${cat.shortTitle} (${count})`,
        icon: CATEGORY_ICONS[cat.id] || Boxes,
      });
    });

    return list;
  }, [suppliers]);

  // اکشن‌ها
  const handleOpenNewPurchase = (vendorName?: string) => {
    if (vendorName) {
      const found = suppliers.find(s => s.name.trim().toLowerCase() === vendorName.trim().toLowerCase());
      setPurchaseModalSupplier(found || null);
      setPurchaseModalVendorName(vendorName);
    } else {
      setPurchaseModalSupplier(null);
      setPurchaseModalVendorName(undefined);
    }
    setIsPurchaseModalOpen(true);
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-300 relative pb-16">
      
      {/* مودال خرید پیشرفته */}
      <AdvancedPurchaseModal />

      {/* مودال خرید و باربری مادر تدارکات (ProcurementPurchaseModal) */}
      <ProcurementPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setPurchaseModalSupplier(null);
          setPurchaseModalVendorName(undefined);
        }}
        initialSupplierId={purchaseModalSupplier?.id}
        initialVendorName={purchaseModalVendorName || purchaseModalSupplier?.name}
      />

      {/* مودال ثبت / ویرایش تأمین‌کننده */}
      <SupplierModal 
        isOpen={isSupplierModalOpen} 
        onClose={() => { setIsSupplierModalOpen(false); setSupplierToEdit(null); }}
        supplierToEdit={supplierToEdit}
      />



      <AnimatePresence mode="wait">
        {selectedSupplierId ? (
          <motion.div
            key="supplier-profile-view"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full"
          >
            <SupplierProfile
              supplierId={selectedSupplierId}
              onBack={() => setSelectedSupplierId(null)}
              onEdit={(sup) => {
                setSupplierToEdit(sup);
                setIsSupplierModalOpen(true);
              }}
              onDelete={(id, name) => {
                setSelectedSupplierId(null);
                triggerDeleteSupplier(id, name);
              }}
              onNewPurchaseForSupplier={(vendorName) => {
                handleOpenNewPurchase(vendorName);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="supplier-list-view"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full space-y-6 pb-24"
          >
            {/* ======================================================== */}
            {/* هدر چسبنده یکپارچه و بهینه‌شده به همراه تب‌های اصناف (Sticky Header) */}
            {/* ======================================================== */}
            <div className="sticky top-0 z-30 backdrop-blur-xl bg-slate-100/90 dark:bg-slate-900/90 p-4 rounded-3xl border border-white/60 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* ردیف بالا: عنوان و کنترل‌ها */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
          
          {/* سمت راست: آیکون باکس و عنوان صفحه */}
          <div className="flex items-center gap-3.5 w-full xl:w-auto">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(20,184,166,0.4)] shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-teal-800 dark:from-white dark:to-teal-300 drop-shadow-sm flex items-center gap-2">
                مرکز تأمین‌کنندگان و خرید
              </h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                رجیستری ۶ صنف تخصصی، مدیریت خریدها و وضعیت مانده‌حساب‌ها
              </p>
            </div>
          </div>

          {/* سمت چپ: کنترل‌های جستجو، فیلتر، سوئیچ ویو و دکمه جدید */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-3 w-full xl:w-auto">
            
            {/* جستجوی هوشمند */}
            <div className="w-full sm:w-56 min-w-[180px]">
              <AppSearchInput
                value={supplierSearch}
                onChange={setSupplierSearch}
                placeholder="جستجو در نام، مدیریت، تلفن یا شهر..."
              />
            </div>

            {/* لیست کشویی سرچدار دسته‌بندی اصناف تدارکات */}
            <div className="w-56 shrink-0 h-[46px]">
              <PortalSelect
                options={categorySelectOptions}
                value={selectedCategoryFilter}
                onChange={(val: any) => { setSelectedCategoryFilter(val); setCurrentPage(1); }}
                placeholder="صنف / دسته‌بندی..."
                searchable={true}
                className="!h-[46px] !rounded-2xl"
              />
            </div>

            {/* مرتب‌سازی */}
            <div className="w-40 shrink-0 h-[46px]">
              <PortalSelect
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={(val: any) => setSortBy(val)}
                placeholder="مرتب‌سازی..."
                className="!h-[46px] !rounded-2xl"
              />
            </div>

            {/* تعداد در صفحه */}
            <div className="w-28 shrink-0 h-[46px]">
              <PortalSelect
                options={PAGE_LIMIT_OPTIONS}
                value={String(pageLimit)}
                onChange={(val: string) => { setPageLimit(Number(val) as PageLimit); setCurrentPage(1); }}
                placeholder="تعداد..."
                className="!h-[46px] !rounded-2xl"
              />
            </div>

            {/* سوییچ ویو: شبکه‌ای / لیستی */}
            <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1 rounded-2xl shadow-inner border border-white/50 dark:border-slate-700/50 shrink-0 h-[46px]">
              <button 
                type="button"
                onClick={() => setViewMode('GRID')} 
                className={`p-2 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                title="نمای شبکه‌ای"
              >
                <LayoutGrid className="w-4.5 h-4.5" />
              </button>
              <button 
                type="button"
                onClick={() => setViewMode('LIST')} 
                className={`p-2 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                title="نمای لیستی"
              >
                <List className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* دکمه انیمیشنی تعریف تأمین‌کننده */}
            <motion.button 
              type="button"
              whileHover={{ scale: 1.03 }} 
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.preventDefault();
                setSupplierToEdit(null);
                setIsSupplierModalOpen(true);
              }}
              className="h-[46px] px-5 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(20,184,166,0.35)] border-t border-teal-300/40 transition-all shrink-0 w-full sm:w-auto relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
              <Plus className="w-4 h-4 relative z-10" />
              <span className="relative z-10 text-xs font-black">تعریف تأمین‌کننده</span>
            </motion.button>

          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* لیست و کارت‌های تأمین‌کنندگان */}
      {/* ======================================================== */}
      <div className="space-y-6">

        {paginatedSuppliers.length === 0 ? (
          <div className="p-14 text-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl">
            <Store className="w-14 h-14 text-slate-400 mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-black text-slate-700 dark:text-slate-300">هیچ تأمین‌کننده‌ای یافت نشد</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">
              {supplierSearch ? 'نتیجه‌ای متناسب با جستجوی شما پیدا نشد.' : 'با کلیک روی «تعریف تأمین‌کننده»، اولین بنگاه یا فروشگاه تدارکات را ثبت کنید.'}
            </p>
          </div>
        ) : viewMode === 'GRID' ? (
          
          /* ================= نمای شبکه‌ای (Grid View) ================= */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence>
              {paginatedSuppliers.map((supplier) => {
                const normCat = normalizeSupplierCategory(supplier.category);
                const catMeta = SUPPLIER_CATEGORIES[normCat] || SUPPLIER_CATEGORIES.materialShop;
                const Icon = CATEGORY_ICONS[normCat] || Boxes;
                const fin = supplierFinancialStats[supplier.id] || { totalSpend: 0, invoiceCount: 0, balance: 0 };

                return (
                  <motion.div
                    key={supplier.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedSupplierId(supplier.id)}
                    className={`relative p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border transition-all shadow-sm hover:shadow-xl flex flex-col justify-between gap-4 group overflow-hidden cursor-pointer ${
                      supplier.isPinned 
                        ? 'border-amber-400/60 dark:border-amber-500/50 shadow-amber-500/10' 
                        : 'border-white/80 dark:border-slate-800 hover:border-teal-500/50 hover:bg-white/90 dark:hover:bg-slate-900/80'
                    }`}
                  >
                    {/* هاله زرد طلایی بسیار ملایم در گوشه کارت‌های پین‌شده */}
                    {supplier.isPinned && (
                      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/20 blur-3xl rounded-full pointer-events-none" />
                    )}

                    {/* هدر کارت تأمین‌کننده */}
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {supplier.logo ? (
                            <img 
                              src={supplier.logo} 
                              alt={supplier.name} 
                              className="w-12 h-12 rounded-2xl object-cover shadow-md shrink-0 border border-slate-200 dark:border-slate-700" 
                            />
                          ) : (
                            <div 
                              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                              style={{ backgroundColor: catMeta.accentColor }}
                            >
                              <Icon className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-black text-base text-slate-800 dark:text-white line-clamp-1">
                                {supplier.name}
                              </h4>
                              {supplier.isPinned && (
                                <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                              )}
                            </div>
                            <span 
                              className="text-[10px] font-black px-2 py-0.5 rounded-md inline-block mt-1"
                              style={{ 
                                backgroundColor: `${catMeta.accentColor}15`,
                                color: catMeta.accentColor 
                              }}
                            >
                              {catMeta.shortTitle}
                            </span>
                          </div>
                        </div>

                        {/* دکمه ستاره چرخشی بی‌نهایت و امتیاز */}
                        <div className="flex items-center gap-1">
                          {supplier.rating > 0 && (
                            <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-black">
                              <Star className="w-3 h-3 fill-amber-500" />
                              {supplier.rating}
                            </div>
                          )}

                          {/* ستاره با انیمیشن چرخش بی‌نهایت آرام در حالت پین */}
                          <motion.button 
                            type="button"
                            whileHover={{ scale: 1.15 }} 
                            whileTap={{ scale: 0.85 }}
                            onClick={(e) => { e.stopPropagation(); togglePinSupplier(supplier.id); }}
                            className="relative p-2 rounded-xl transition-all cursor-pointer"
                            title={supplier.isPinned ? 'برداشتن پین' : 'پین کردن'}
                          >
                            {supplier.isPinned && (
                              <motion.div 
                                animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.8, 1.4, 0.8] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute inset-0 bg-amber-400/80 blur-[8px] rounded-full z-0"
                              />
                            )}
                            <motion.div 
                              animate={supplier.isPinned ? { rotate: 360 } : { rotate: 0 }} 
                              transition={supplier.isPinned ? { duration: 8, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
                              className="relative z-10"
                            >
                              <Star className={`w-5 h-5 transition-all duration-300 ${
                                supplier.isPinned 
                                  ? 'fill-amber-300 text-amber-100 drop-shadow-[0_0_10px_rgba(251,191,36,1)]' 
                                  : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                              }`} />
                            </motion.div>
                          </motion.button>
                        </div>
                      </div>

                      {/* اطلاعات تماس و شهر */}
                      <div className="mt-3.5 space-y-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {supplier.managerName && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>مدیریت: <strong className="text-slate-700 dark:text-slate-200">{supplier.managerName}</strong></span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span dir="ltr" className="font-mono text-slate-700 dark:text-slate-300">{supplier.phone}</span>
                          </div>
                          {supplier.city && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {supplier.city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* کپسول وضعیت مالی و مانده‌حساب */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400">حجم خرید مصالح:</span>
                        <span className="text-xs font-black font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                          {(fin.totalSpend * multiplier).toLocaleString('fa-IR')} {currencyLabel}
                        </span>
                      </div>

                      <div className={`p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                        fin.balance > 0 
                          ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40' 
                          : fin.balance < 0 
                            ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40'
                            : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[11px] font-black">
                            {fin.balance > 0 
                              ? 'طلبکار از ما (بدهکاریم)' 
                              : fin.balance < 0 
                                ? 'بدهکار به ما (پیش‌پرداخت)' 
                                : 'تسویه حساب (۰ تومان)'}
                          </span>
                        </div>
                        <span className="text-xs font-black font-mono" dir="ltr">
                          {(Math.abs(fin.balance) * multiplier).toLocaleString('fa-IR')} {currencyLabel}
                        </span>
                      </div>
                    </div>

                    {/* اکشن‌های فوتر کارت */}
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 relative z-10">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenNewPurchase(supplier.name); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-500 hover:bg-teal-500/10 transition-colors cursor-pointer"
                        title="ثبت فاکتور خرید برای این فروشنده"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSupplierToEdit(supplier); setIsSupplierModalOpen(true); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                        title="ویرایش"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); triggerDeleteSupplier(supplier.id, supplier.name); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="حذف با مهلت ۵ ثانیه‌ای"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                    <th className="p-4">نام بنگاه / تأمین‌کننده</th>
                    <th className="p-4">صنف و رسته</th>
                    <th className="p-4">مدیریت / رابط</th>
                    <th className="p-4">تلفن تماس</th>
                    <th className="p-4">شهر / منطقه</th>
                    <th className="p-4 text-center">حجم خرید</th>
                    <th className="p-4 text-center">وضعیت حساب</th>
                    <th className="p-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <AnimatePresence>
                    {paginatedSuppliers.map((supplier) => {
                      const normCat = normalizeSupplierCategory(supplier.category);
                      const catMeta = SUPPLIER_CATEGORIES[normCat] || SUPPLIER_CATEGORIES.materialShop;
                      const Icon = CATEGORY_ICONS[normCat] || Boxes;
                      const fin = supplierFinancialStats[supplier.id] || { totalSpend: 0, invoiceCount: 0, balance: 0 };

                      return (
                        <motion.tr 
                          key={supplier.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setSelectedSupplierId(supplier.id)}
                          className={`hover:bg-teal-500/10 dark:hover:bg-teal-500/10 transition-colors cursor-pointer ${supplier.isPinned ? 'bg-amber-500/[0.04]' : ''}`}
                        >
                          {/* ستون پین با ستاره انیمیشنی */}
                          <td className="p-4 text-center">
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.85 }}
                              onClick={() => togglePinSupplier(supplier.id)}
                              className="cursor-pointer"
                              title={supplier.isPinned ? 'برداشتن پین' : 'پین کردن'}
                            >
                              <motion.div
                                animate={supplier.isPinned ? { rotate: 360 } : { rotate: 0 }}
                                transition={supplier.isPinned ? { duration: 8, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
                              >
                                <Star className={`w-4 h-4 ${supplier.isPinned ? 'fill-amber-400 text-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'}`} />
                              </motion.div>
                            </motion.button>
                          </td>

                          {/* نام تأمین‌کننده */}
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              {supplier.logo ? (
                                <img
                                  src={supplier.logo}
                                  alt={supplier.name}
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
                              <span className="font-black text-slate-800 dark:text-white text-sm">
                                {supplier.name}
                              </span>
                            </div>
                          </td>

                          {/* صنف */}
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

                          {/* مدیریت */}
                          <td className="p-4 text-slate-600 dark:text-slate-300">
                            {supplier.managerName || '-'}
                          </td>

                          {/* تلفن */}
                          <td className="p-4 font-mono text-slate-600 dark:text-slate-300" dir="ltr">
                            {supplier.phone}
                          </td>

                          {/* شهر */}
                          <td className="p-4 text-slate-500 dark:text-slate-400">
                            {supplier.city || '-'}
                          </td>

                          {/* حجم خرید */}
                          <td className="p-4 text-center font-mono font-black" dir="ltr">
                            {(fin.totalSpend * multiplier).toLocaleString('fa-IR')} {currencyLabel}
                          </td>

                          {/* وضعیت حساب */}
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black ${
                              fin.balance > 0 
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' 
                                : fin.balance < 0 
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}>
                              {fin.balance > 0 ? 'طلبکار از ما (بدهکاریم)' : fin.balance < 0 ? 'بدهکار به ما (پیش‌پرداخت)' : 'تسویه حساب (۰ تومان)'}
                            </span>
                          </td>

                          {/* دکمه‌های عملیات */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleOpenNewPurchase(supplier.name); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-500 hover:bg-teal-500/10 transition-colors cursor-pointer"
                                title="ثبت فاکتور خرید"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSupplierToEdit(supplier); setIsSupplierModalOpen(true); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                                title="ویرایش"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); triggerDeleteSupplier(supplier.id, supplier.name); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="حذف با مهلت ۵ ثانیه‌ای"
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

        {/* پیجینیشن صفحه‌بندی */}
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

      {/* سیستم پاپ‌آپ شناور تایمردار ۵ ثانیه‌ای (FloatingUndoToast) */}
      <FloatingUndoToast 
        undoItems={undoItems} 
        onCancel={handleCancelUndo} 
      />

    </div>
  );
}
