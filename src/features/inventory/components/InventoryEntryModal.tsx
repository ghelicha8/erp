import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Package, ArrowDownRight, Store, Hammer, RotateCcw, Truck, 
  Users, DollarSign, Calculator, Plus, Trash2, Camera, Image as ImageIcon,
  Check, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Scale,
  Building2, User, Coins, Calendar, ChevronDown, Clock, ShieldCheck, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useInventoryStore, 
  type InventoryItem, 
  type InventoryBatch,
  type InventoryTransaction,
  INVENTORY_CATEGORIES,
  convertQuantity 
} from '../../../store/inventoryStore';
import { useProcurementStore, type Supplier, type SupplierCategory } from '../../../store/procurementStore';
import { useLogisticsStore } from '../../../store/logisticsStore';
import { useLaborStore, type WorkerProfile } from '../../../store/laborStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useClientStore } from '../../../store/clientStore';
import { useSettingsStore } from '../../../store/settingsStore';
import ClientFormModal from '../../clients/components/ClientFormModal';
import SupplierModal from '../../procurement/components/SupplierModal';
import LaborFormModal from '../../labor/components/LaborFormModal';

import { 
  PortalSelect, 
  AppSearchInput, 
  AnimatedCheckbox 
} from '../../../components/ui/SharedLaborUI';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import UniversalTransactionModal from '../../../components/shared/UniversalTransactionModal';
import { generateUUID } from '../../../core/utils/uuid';

export interface InventoryEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItemId?: string;
  onSaved?: (txId: string) => void;
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
  if (!num || isNaN(num)) return '';
  return num.toLocaleString('fa-IR');
};

// تابع کمکی برای تولید لیست واحدهای کاملاً یکتا و بدون تکرار
export const buildUniqueUnitOptions = (item: InventoryItem | null | undefined) => {
  const map = new Map<string, string>();
  if (item?.primaryUnit) {
    map.set(item.primaryUnit, `${item.primaryUnit} (واحد پایه)`);
  }
  if ((item as any)?.baseUnit && !map.has((item as any).baseUnit)) {
    map.set((item as any).baseUnit, `${(item as any).baseUnit} (واحد پایه)`);
  }
  if (item?.secondaryUnit && !map.has(item.secondaryUnit)) {
    map.set(item.secondaryUnit, `${item.secondaryUnit} (واحد فرعی)`);
  }
  if (item?.unitConversions) {
    item.unitConversions.forEach((u: any) => {
      const name = u.unitName || u.fromUnit || u.toUnit;
      if (name && !map.has(name)) {
        map.set(name, `${name} ${u.isApproximate ? '(تقریبی)' : ''}`);
      }
    });
  }
  const common = [
    { value: 'کیسه', label: 'کیسه / پاکت' },
    { value: 'تن', label: 'تن (۱۰۰۰ کیلو)' },
    { value: 'کیلوگرم', label: 'کیلوگرم' },
    { value: 'عدد', label: 'عدد / قالب / شاخه' },
    { value: 'متر', label: 'متر طول' },
    { value: 'مترمربع', label: 'متر مربع' },
    { value: 'مترمکعب', label: 'متر مکعب' },
    { value: 'پالت', label: 'پالت' },
    { value: 'سرویس نیسان', label: 'سرویس نیسان' },
    { value: 'سرویس خاور', label: 'سرویس خاور' },
    { value: 'سرویس کمپرسی', label: 'سرویس کمپرسی / ده چرخ' },
  ];
  common.forEach(u => {
    if (!map.has(u.value)) map.set(u.value, u.label);
  });
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
};

// اینترفیس سطر کارگری بارگیری / تخلیه
// ============================================================================
interface LaborWorkerRow {
  rowId: string;
  workerId: string;
  operationType: 'LOADING' | 'UNLOADING' | 'BOTH';
  wageType: 'PER_ITEM' | 'PER_BAG' | 'PER_TON' | 'PER_SERVICE' | 'DAILY' | 'FIXED';
  quantity: string;
  rate: string;
  totalWage: number;
}

// ============================================================================
// کامپوننت مادر مودال ثبت ورود به انبار (InventoryEntryModal)
// ============================================================================
export default function InventoryEntryModal({
  isOpen,
  onClose,
  preselectedItemId,
  onSaved
}: InventoryEntryModalProps) {
  const { items, addBatch, addTransaction, updateItem } = useInventoryStore();
  const { suppliers } = useProcurementStore();
  const { vehicles, addLog: addLogisticsLog } = useLogisticsStore();
  const { workers, addLog: addLaborLog } = useLaborStore();
  const { projects } = useProjectStore();
  const { clients } = useClientStore();
  const { currency } = useSettingsStore(state => state.settings);

  const isRial = currency === 'rial' || (currency as any) === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';

  // ۱. انتخاب کالا
  const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItemId || '');
  useEffect(() => {
    if (preselectedItemId) setSelectedItemId(preselectedItemId);
    else if (!selectedItemId && items.length > 0) setSelectedItemId(items[0].id);
  }, [preselectedItemId, items]);

  const selectedItem = useMemo(() => {
    return items.find(it => it.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // ۲. منبع ورود کالا (۳ حالت)
  const [entrySource, setEntrySource] = useState<'PURCHASE' | 'PRODUCTION' | 'RETURN_FROM_CLIENT'>('PURCHASE');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isClientLocked, setIsClientLocked] = useState(false);
  const [returnResolution, setReturnResolution] = useState<'REPLACE_GOODS' | 'REFUND_OR_CREDIT'>('REPLACE_GOODS');

  // ۳. مقادیر، واحد، فی خرید و تاریخ‌ها
  const [inputQty, setInputQty] = useState<string>('1');
  const [inputUnit, setInputUnit] = useState<string>('');
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState<string>('');
  const [entryDate, setEntryDate] = useState(() => moment().format('jYYYY/jMM/jDD'));
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState(() => `LOT-${Date.now().toString().slice(-6)}`);

  // همگام‌سازی واحد ورودی بر اساس کالای انتخاب شده
  useEffect(() => {
    if (selectedItem) {
      setInputUnit(selectedItem.displayUnit || selectedItem.baseUnit || selectedItem.primaryUnit || 'عدد');
      if (selectedItem.averageUnitCost) {
        setPurchaseUnitPrice(String(selectedItem.averageUnitCost));
      }
    }
  }, [selectedItem]);

  // کنترل قفل پروژه ⟷ کارفرما در حالت مرجوعی
  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    if (projId) {
      const proj = projects.find(p => p.id === projId);
      if (proj && proj.clientId) {
        setSelectedClientId(proj.clientId);
        setIsClientLocked(true);
      }
    } else {
      setIsClientLocked(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    if (!clientId) {
      setIsClientLocked(false);
    }
  };

  // ۴. لجستیک و حمل ورودی
  const [hasLogistics, setHasLogistics] = useState(false);
  const [transportType, setTransportType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [internalVehicleId, setInternalVehicleId] = useState('');
  const [internalDriverId, setInternalDriverId] = useState('');
  const [driverContractType, setDriverContractType] = useState<'PER_SERVICE' | 'DAILY' | 'MONTHLY'>('PER_SERVICE');
  const [totalFreightAmount, setTotalFreightAmount] = useState<string>('');
  const [driverServiceWage, setDriverServiceWage] = useState<string>('');
  const [externalCarrierSupplierId, setExternalCarrierSupplierId] = useState('');

  // ۵. نیروی کار بارگیری و تخلیه
  const [hasLabor, setHasLabor] = useState(false);
  const [laborRows, setLaborRows] = useState<LaborWorkerRow[]>([]);

  const handleAddLaborRow = (preselectedWorkerId?: string) => {
    const defaultWorker = workers.length > 0 ? (preselectedWorkerId || workers[0].id) : '';
    setLaborRows(prev => [
      ...prev,
      {
        rowId: generateUUID(),
        workerId: defaultWorker,
        operationType: 'UNLOADING',
        wageType: 'PER_BAG',
        quantity: inputQty || '1',
        rate: '5000',
        totalWage: safeNum(inputQty || '1') * 5000
      }
    ]);
  };

  const handleUpdateLaborRow = (rowId: string, updates: Partial<LaborWorkerRow>) => {
    setLaborRows(prev => prev.map(row => {
      if (row.rowId !== rowId) return row;
      const merged = { ...row, ...updates };
      const q = safeNum(merged.quantity);
      const r = safeNum(merged.rate);
      merged.totalWage = q * r;
      return merged;
    }));
  };

  const handleRemoveLaborRow = (rowId: string) => {
    setLaborRows(prev => prev.filter(r => r.rowId !== rowId));
  };

  // ۶. پیوست تصویر بارنامه / باسکول
  const [waybillPhotos, setWaybillPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setWaybillPhotos(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // ۷. مودال پرداخت مادر همزمان
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [settlementStatus, setSettlementStatus] = useState<'SETTLED' | 'PENDING' | 'PARTIAL'>('PENDING');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // ۸. استیت‌های ساب‌مودال‌های ساخت سریع
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierModalCategory, setSupplierModalCategory] = useState<SupplierCategory>('materialShop');
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // ۹. توضیحات اختیاری
  const [description, setDescription] = useState('');

  // ==========================================
  // محاسبات زنده بهای تمام‌شده واقعی (Landed Cost Engine)
  // ==========================================
  const math = useMemo(() => {
    const qty = safeNum(inputQty);
    const unitPrice = safeNum(purchaseUnitPrice);
    const totalPurchase = qty * unitPrice;

    // کرایه حمل
    const freightCost = hasLogistics ? safeNum(totalFreightAmount) : 0;

    // دستمزدهای بارگیری و تخلیه
    let totalLoadingLabor = 0;
    let totalUnloadingLabor = 0;

    if (hasLabor && laborRows.length > 0) {
      laborRows.forEach(row => {
        if (row.operationType === 'LOADING') {
          totalLoadingLabor += row.totalWage;
        } else if (row.operationType === 'UNLOADING') {
          totalUnloadingLabor += row.totalWage;
        } else if (row.operationType === 'BOTH') {
          totalLoadingLabor += Math.round(row.totalWage / 2);
          totalUnloadingLabor += Math.round(row.totalWage / 2);
        }
      });
    }

    const totalLaborCost = totalLoadingLabor + totalUnloadingLabor;
    const totalLandedCost = totalPurchase + freightCost + totalLaborCost;

    // تبدیل به مقدار واحد پایه
    let primaryQty = qty;
    if (selectedItem && inputUnit) {
      const baseUnit = selectedItem.baseUnit || selectedItem.primaryUnit || 'عدد';
      primaryQty = convertQuantity(qty, inputUnit, baseUnit, selectedItem).convertedQty;
    }

    const landedUnitCostBase = primaryQty > 0 ? Math.round(totalLandedCost / primaryQty) : unitPrice;

    // بهای تمام‌شده در واحد نمایشی کالا
    let landedCostDisplayUnit = landedUnitCostBase;
    if (selectedItem) {
      const displayUnit = selectedItem.displayUnit || selectedItem.primaryUnit;
      const baseUnit = selectedItem.baseUnit || selectedItem.primaryUnit;
      if (displayUnit !== baseUnit) {
        const ratio = convertQuantity(1, displayUnit, baseUnit, selectedItem).convertedQty;
        landedCostDisplayUnit = Math.round(landedUnitCostBase * (ratio || 1));
      }
    }

    // درصد سهم هزینه‌ها
    const purchasePct = totalLandedCost > 0 ? Math.round((totalPurchase / totalLandedCost) * 100) : 100;
    const freightPct = totalLandedCost > 0 ? Math.round((freightCost / totalLandedCost) * 100) : 0;
    const laborPct = totalLandedCost > 0 ? Math.max(0, 100 - purchasePct - freightPct) : 0;

    return {
      qty,
      unitPrice,
      totalPurchase,
      freightCost,
      totalLoadingLabor,
      totalUnloadingLabor,
      totalLaborCost,
      totalLandedCost,
      primaryQty,
      landedUnitCostBase,
      landedCostDisplayUnit,
      purchasePct,
      freightPct,
      laborPct
    };
  }, [inputQty, purchaseUnitPrice, hasLogistics, totalFreightAmount, hasLabor, laborRows, selectedItem, inputUnit]);

  // ثبت نهایی فرم
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItem) {
      toast.error('لطفاً یک کالا را انتخاب کنید.');
      return;
    }
    if (math.qty <= 0) {
      toast.error('لطفاً مقدار ورودی معتبر وارد کنید.');
      return;
    }
    if (entrySource === 'PURCHASE' && !selectedSupplierId) {
      toast.error('لطفاً تأمین‌کننده یا فروشنده را مشخص کنید.');
      return;
    }
    if (entrySource === 'RETURN_FROM_CLIENT' && !selectedProjectId && !selectedClientId) {
      toast.error('لطفاً پروژه یا کارفرمای مرجوع‌کننده را انتخاب کنید.');
      return;
    }

    // ۱. ثبت دسته ورودی (Batch) با بهای تمام‌شده قفل‌شده
    const batchId = addBatch({
      itemId: selectedItem.id,
      batchNumber: batchNumber.trim() || `LOT-${Date.now().toString().slice(-6)}`,
      entryDate,
      expirationDate: expirationDate || undefined,
      initialQtyBase: math.primaryQty,
      purchaseUnitPrice: math.unitPrice,
      purchaseQty: math.qty,
      purchaseUnit: inputUnit,
      entryFreightCost: math.freightCost,
      loadingLaborCost: math.totalLoadingLabor,
      unloadingLaborCost: math.totalUnloadingLabor,
      totalLandedCost: math.totalLandedCost,
      landedUnitCostBase: math.landedUnitCostBase,
      supplierId: entrySource === 'PURCHASE' ? selectedSupplierId : undefined,
      supplierName: entrySource === 'PURCHASE' ? suppliers.find(s => s.id === selectedSupplierId)?.name : undefined,
      notes: description
    });

    // ۲. به‌روزرسانی میانگین وزنی بهای تمام‌شده و موجودی کالا
    const currentTotalVal = selectedItem.currentStock * selectedItem.averageUnitCost;
    const newTotalVal = currentTotalVal + math.totalLandedCost;
    const newTotalStock = selectedItem.currentStock + math.primaryQty;
    const newAvgCost = newTotalStock > 0 ? Math.round(newTotalVal / newTotalStock) : math.landedUnitCostBase;

    updateItem(selectedItem.id, {
      currentStock: newTotalStock,
      averageUnitCost: newAvgCost
    });

    // ۳. ثبت تراکنش در کاردکس انبار
    const txId = addTransaction({
      date: entryDate,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      type: entrySource,
      supplierId: entrySource === 'PURCHASE' ? selectedSupplierId : undefined,
      supplierName: entrySource === 'PURCHASE' ? suppliers.find(s => s.id === selectedSupplierId)?.name : undefined,
      projectId: entrySource === 'RETURN_FROM_CLIENT' ? selectedProjectId : undefined,
      clientId: entrySource === 'RETURN_FROM_CLIENT' ? selectedClientId : undefined,
      inputQty: math.qty,
      inputUnit: inputUnit || selectedItem.primaryUnit,
      calculatedPrimaryQty: math.primaryQty,
      internalUnitCost: math.landedUnitCostBase,
      internalFreightCost: math.freightCost,
      loadingLaborCost: math.totalLoadingLabor,
      unloadingLaborCost: math.totalUnloadingLabor,
      totalInternalCost: math.totalLandedCost,
      batchId,
      settlementStatus,
      paidAmount: paidAmount > 0 ? paidAmount : (settlementStatus === 'SETTLED' ? math.totalLandedCost : 0),
      transportSource: hasLogistics ? transportType : undefined,
      vehicleId: hasLogistics && transportType === 'INTERNAL' ? internalVehicleId : undefined,
      driverId: hasLogistics && transportType === 'INTERNAL' ? internalDriverId : undefined,
      photos: waybillPhotos,
      description: description.trim() || undefined
    });

    // ۴. ثبت کارکرد ناوگان و راننده در لجستیک در صورت حمل داخلی
    if (hasLogistics && transportType === 'INTERNAL' && internalVehicleId) {
      const v = vehicles.find(veh => veh.id === internalVehicleId);
      const totalFreight = safeNum(totalFreightAmount);
      const driverWage = driverContractType === 'PER_SERVICE' ? safeNum(driverServiceWage) : 0;
      const vehicleNetIncome = Math.max(0, totalFreight - driverWage);

      addLogisticsLog({
        projectId: null,
        type: 'TRANSPORT',
        source: 'INTERNAL',
        title: `حمل بار ورودی انبار: ${selectedItem.name} (${math.qty} ${inputUnit})`,
        provider: internalDriverId,
        vehicleInfo: v ? `${v.name} (${v.plate})` : internalVehicleId,
        date: entryDate,
        internalCost: vehicleNetIncome,
        billedCost: totalFreight,
        driverWage
      });

      // ثبت در کارکرد راننده در laborStore اگر سرویسی باشد
      if (internalDriverId && driverContractType === 'PER_SERVICE' && driverWage > 0) {
        const drv = workers.find(w => w.id === internalDriverId);
        addLaborLog({
          workerId: internalDriverId,
          workerName: drv ? `${drv.name} ${drv.lastName}` : 'راننده ناوگان',
          date: entryDate,
          projectId: 'FREE',
          workType: `رانندگی و حمل بار ورودی انبار (${selectedItem.name})`,
          attendance: 'PRESENT',
          paymentType: 'COMMISSION',
          workerUnit: 'SERVICE',
          workerQuantity: 1,
          workerRate: driverWage,
          billedUnit: 'SERVICE',
          billedQuantity: 1,
          billedRate: driverWage,
          appliedStandardWorkHours: 8
        });
      }
    }

    // ۵. ثبت کارکرد نیروهای کارگری بارگیری/تخلیه در laborStore
    if (hasLabor && laborRows.length > 0) {
      laborRows.forEach(row => {
        if (!row.workerId || row.totalWage <= 0) return;
        const wrk = workers.find(w => w.id === row.workerId);
        const opLabel = row.operationType === 'LOADING' ? 'بارگیری' : row.operationType === 'UNLOADING' ? 'تخلیه' : 'بارگیری و تخلیه';
        
        addLaborLog({
          workerId: row.workerId,
          workerName: wrk ? `${wrk.name} ${wrk.lastName}` : 'کارگر کارگاه',
          date: entryDate,
          projectId: 'FREE',
          workType: `${opLabel} محموله ورودی انبار: ${selectedItem.name} (${row.quantity} ${row.wageType})`,
          attendance: 'PRESENT',
          paymentType: 'PIECE_WORK',
          workerUnit: 'ITEM',
          workerQuantity: safeNum(row.quantity),
          workerRate: safeNum(row.rate),
          billedUnit: 'ITEM',
          billedQuantity: safeNum(row.quantity),
          billedRate: safeNum(row.rate),
          appliedStandardWorkHours: 8
        });
      });
    }

    toast.success(`ورود ${math.qty} ${inputUnit} «${selectedItem.name}» به انبار با موفقیت ثبت شد.`);
    if (onSaved) onSaved(txId);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-300">
      
      {/* بدنه اصلی مودال ورود */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[2.5rem] bg-white/95 dark:bg-slate-900/95 border border-white/60 dark:border-slate-800 shadow-2xl backdrop-blur-2xl overflow-hidden text-right"
        dir="rtl"
      >
        
        {/* ======================================================== */}
        {/* هدر مودال ورود به انبار */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <ArrowDownRight className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                ثبت ورود کالا و بهای تمام‌شده واقعی (Landed Cost)
              </h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                تخصیص پارت، کرایه حمل، دستمزد بارگیری/تخلیه و ثبت دفاتر مالی
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* فرم اسکرول‌خور محتوا */}
        {/* ======================================================== */}
        <form onSubmit={handleFinalSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 modal-scrollbar glass-scroll">
          
          {/* بخش ۱: انتخاب کالا و خلاصه موجودی */}
          <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  کالای مورد نظر جهت ورود به انبار <span className="text-rose-500">*</span>
                </label>
                <PortalSelect searchable 
                  options={items.map(it => ({
                    value: it.id,
                    label: `${it.name} (${it.code}) - موجودی فعلی: ${it.currentStock} ${it.primaryUnit}`
                  }))}
                  value={selectedItemId}
                  onChange={setSelectedItemId}
                  placeholder="انتخاب کالا از لیست انبار..."
                  searchable
                  className="!h-12"
                />
              </div>

              {selectedItem && (
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">موجودی فعلی کالا</span>
                    <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-300" dir="ltr">
                      {selectedItem.currentStock.toLocaleString('fa-IR')} {selectedItem.primaryUnit}
                    </span>
                  </div>
                  <div className="text-right border-r border-emerald-200 dark:border-emerald-800 pr-3">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">میانگین فی تمام‌شده فعلی</span>
                    <span className="text-xs font-black font-mono text-slate-700 dark:text-slate-200" dir="ltr">
                      {selectedItem.averageUnitCost.toLocaleString('fa-IR')} {currencyLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* بخش ۲: منبع ورود کالا (۳ حالت) */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              منبع و نحوه ورود کالا به انبار <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              <button
                type="button"
                onClick={() => setEntrySource('PURCHASE')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
                  entrySource === 'PURCHASE'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-sm'
                    : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100/60'
                }`}
              >
                <div className={`p-2 rounded-xl ${entrySource === 'PURCHASE' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black block">خرید از تأمین‌کننده / فروشنده</span>
                  <span className="text-[10px] opacity-70">فاکتور خرید، بازار یا معدن</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEntrySource('PRODUCTION')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
                  entrySource === 'PRODUCTION'
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-500 text-indigo-800 dark:text-indigo-300 shadow-sm'
                    : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100/60'
                }`}
              >
                <div className={`p-2 rounded-xl ${entrySource === 'PRODUCTION' ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  <Hammer className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black block">ورود از بخش تولیدی خودمان</span>
                  <span className="text-[10px] opacity-70">کارگاه بتن، بلوک‌زنی یا تیرچه</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEntrySource('RETURN_FROM_CLIENT')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
                  entrySource === 'RETURN_FROM_CLIENT'
                    ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-500 text-amber-800 dark:text-amber-300 shadow-sm'
                    : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100/60'
                }`}
              >
                <div className={`p-2 rounded-xl ${entrySource === 'RETURN_FROM_CLIENT' ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black block">مرجوعی از کارگاه / پروژه</span>
                  <span className="text-[10px] opacity-70">بازگشت مصالح مازاد یا معیوب</span>
                </div>
              </button>

            </div>

            {/* جزئیات منبع خرید */}
            {entrySource === 'PURCHASE' && (
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    انتخاب تأمین‌کننده / فروشنده <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSupplierModalCategory('materialShop');
                      setIsSupplierModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ساخت سریع پروفایل تأمین‌کننده جدید</span>
                  </button>
                </div>
                <PortalSelect searchable 
                  options={suppliers.map(s => ({
                    value: s.id,
                    label: `${s.name} ${s.managerName ? `(${s.managerName})` : ''} - تلفن: ${s.phone}`
                  }))}
                  value={selectedSupplierId}
                  onChange={setSelectedSupplierId}
                  placeholder="جستجو و انتخاب تأمین‌کننده..."
                  searchable
                  className="!h-11"
                />
              </div>
            )}

            {/* جزئیات مرجوعی از پروژه */}
            {entrySource === 'RETURN_FROM_CLIENT' && (
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      پروژه مبدأ مرجوعی
                    </label>
                    <PortalSelect searchable 
                      options={[
                        { value: '', label: 'انتخاب پروژه...' },
                        ...projects
                          .filter(p => !selectedClientId || p.clientId === selectedClientId)
                          .map(p => ({ value: p.id, label: p.name }))
                      ]}
                      value={selectedProjectId}
                      onChange={handleProjectChange}
                      searchable
                      className="!h-11"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        کارفرمای طرف حساب
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="flex items-center gap-1 text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ ساخت کارفرما جدید</span>
                      </button>
                    </div>
                    <PortalSelect searchable 
                      options={[
                        { value: '', label: 'انتخاب کارفرما...' },
                        ...clients.map(c => ({ value: c.id, label: `${c.name} (${c.phone || 'بدون شماره'})` }))
                      ]}
                      value={selectedClientId}
                      onChange={handleClientChange}
                      disabled={isClientLocked}
                      searchable
                      className="!h-11"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">روش حل‌وفصل مالی مرجوعی:</span>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="returnResolution"
                      checked={returnResolution === 'REPLACE_GOODS'}
                      onChange={() => setReturnResolution('REPLACE_GOODS')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>تعویض با جنس سالم / جایگزینی</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="returnResolution"
                      checked={returnResolution === 'REFUND_OR_CREDIT'}
                      onChange={() => setReturnResolution('REFUND_OR_CREDIT')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>برگشت وجه یا بستانکاری حساب کارفرما</span>
                  </label>
                </div>
              </div>
            )}

          </div>

          {/* بخش ۳: مقادیر خرید، فی واحد، واحد و تاریخ‌ها */}
          <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
            <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>مشخصات مقداری، واحد و قیمت خرید محموله</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* مقدار خرید */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  مقدار ورودی <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={inputQty}
                  onChange={(e) => setInputQty(e.target.value)}
                  placeholder="مثال: ۵۰"
                  className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* واحد خرید */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  واحد خرید <span className="text-rose-500">*</span>
                </label>
                <PortalSelect
                  options={buildUniqueUnitOptions(selectedItem)}
                  value={inputUnit}
                  onChange={setInputUnit}
                  placeholder="انتخاب واحد..."
                  searchable
                  className="!h-11"
                />
              </div>

              {/* فی واحد خرید */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  فی خرید هر {inputUnit || 'واحد'} ({currencyLabel}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={purchaseUnitPrice ? formatNumber(safeNum(purchaseUnitPrice)) : ''}
                  onChange={(e) => setPurchaseUnitPrice(e.target.value.replace(/,/g, ''))}
                  placeholder="۰"
                  className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* تاریخ ورود، انقضا و شماره پارت */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  تاریخ ورود به انبار <span className="text-rose-500">*</span>
                </label>
                <GlassDatePicker
                  value={entryDate}
                  onChange={setEntryDate}
                  className="!h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  تاریخ انقضای این پارت (اختیاری)
                </label>
                <GlassDatePicker
                  value={expirationDate}
                  onChange={setExpirationDate}
                  placeholder="اختیاری جهت هشدارهای FEFO..."
                  className="!h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  شماره پارت ورودی (Lot Number)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

          </div>

          {/* بخش ۴: لجستیک و حمل ورودی (داخلی یا خارجی) */}
          <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">بخش لجستیک و هزینه حمل بار</h4>
                  <p className="text-[11px] font-bold text-slate-400">آیا برای ورود این محموله کرایه باربری یا حمل پرداخت شده است؟</p>
                </div>
              </div>
              <AnimatedCheckbox
                checked={hasLogistics}
                onChange={setHasLogistics}
                label="کرایه حمل دارد"
              />
            </div>

            {hasLogistics && (
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-4 animate-in fade-in duration-200">
                {/* سوئیچ ناوگان داخلی یا خارجی */}
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">نوع ناوگان باربری:</span>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="transportType"
                      checked={transportType === 'INTERNAL'}
                      onChange={() => setTransportType('INTERNAL')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>ناوگان داخلی خودمان (خودرو و راننده شرکت)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="transportType"
                      checked={transportType === 'EXTERNAL'}
                      onChange={() => setTransportType('EXTERNAL')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>باربری بیرونی / راننده آزاد</span>
                  </label>
                </div>

                {transportType === 'INTERNAL' ? (
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          انتخاب خودروی شرکت <span className="text-rose-500">*</span>
                        </label>
                        <PortalSelect searchable 
                          options={vehicles.map(v => ({
                            value: v.id,
                            label: `${v.name} (${v.plate})`
                          }))}
                          value={internalVehicleId}
                          onChange={setInternalVehicleId}
                          placeholder="انتخاب خودرو..."
                          className="!h-11"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          انتخاب راننده <span className="text-rose-500">*</span>
                        </label>
                        <PortalSelect searchable 
                          options={workers.map(w => ({
                            value: w.id,
                            label: `${w.name} ${w.lastName} - ${w.phone1}`
                          }))}
                          value={internalDriverId}
                          onChange={setInternalDriverId}
                          placeholder="انتخاب راننده..."
                          searchable
                          className="!h-11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          نوع قرارداد راننده
                        </label>
                        <PortalSelect searchable 
                          options={[
                            { value: 'PER_SERVICE', label: 'سرویسی / بارنامه‌ای' },
                            { value: 'DAILY', label: 'روزمزد (حقوق ثابت روزانه)' },
                            { value: 'MONTHLY', label: 'ماهانه شرکتی' },
                          ]}
                          value={driverContractType}
                          onChange={(v) => setDriverContractType(v as any)}
                          className="!h-11"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          کل کرایه بار محموله ({currencyLabel}) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={totalFreightAmount ? formatNumber(safeNum(totalFreightAmount)) : ''}
                          onChange={(e) => setTotalFreightAmount(e.target.value.replace(/,/g, ''))}
                          placeholder="مثال: ۶۰۰,۰۰۰"
                          className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </div>

                      {driverContractType === 'PER_SERVICE' ? (
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                            دستمزد سرویسی راننده ({currencyLabel})
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            value={driverServiceWage ? formatNumber(safeNum(driverServiceWage)) : ''}
                            onChange={(e) => setDriverServiceWage(e.target.value.replace(/,/g, ''))}
                            placeholder="مثال: ۱۰۰,۰۰۰"
                            className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-5">
                          <span>حقوق راننده بر اساس شیفت روزانه/ماهانه محاسبه می‌شود.</span>
                        </div>
                      )}
                    </div>

                    {driverContractType === 'PER_SERVICE' && safeNum(totalFreightAmount) > 0 && (
                      <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-blue-200/50 dark:border-blue-800/40 text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center justify-between">
                        <span>سود خالص خودرو از این سرویس:</span>
                        <span className="font-mono font-black" dir="ltr">
                          {(safeNum(totalFreightAmount) - safeNum(driverServiceWage)).toLocaleString('fa-IR')} {currencyLabel}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        انتخاب باربری یا راننده آزاد بیرونی
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setSupplierModalCategory('externalLogistics');
                          setIsSupplierModalOpen(true);
                        }}
                        className="flex items-center gap-1 text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ساخت سریع پروفایل باربری / راننده آزاد</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <PortalSelect searchable 
                          options={suppliers
                            .filter(s => s.category === 'externalLogistics' || s.category === 'materialShop')
                            .map(s => ({
                              value: s.id,
                              label: `${s.name} ${s.managerName ? `(${s.managerName})` : ''} - ${s.phone}`
                            }))}
                          value={externalCarrierSupplierId}
                          onChange={setExternalCarrierSupplierId}
                          placeholder="انتخاب باربری یا راننده..."
                          searchable
                          className="!h-11"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          dir="ltr"
                          value={totalFreightAmount ? formatNumber(safeNum(totalFreightAmount)) : ''}
                          onChange={(e) => setTotalFreightAmount(e.target.value.replace(/,/g, ''))}
                          placeholder="مبلغ کل کرایه حمل پرداختی به باربری..."
                          className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* بخش ۵: نیروی کار بارگیری و تخلیه (Loading & Unloading Labor) */}
          <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">نیروی کار بارگیری و تخلیه</h4>
                  <p className="text-[11px] font-bold text-slate-400">آیا برای این محموله کارگر جهت تخلیه یا بارگیری به کار گرفته‌اید؟</p>
                </div>
              </div>
              <AnimatedCheckbox
                checked={hasLabor}
                onChange={(checked) => {
                  setHasLabor(checked);
                  if (checked && laborRows.length === 0) handleAddLaborRow();
                }}
                label="دستمزد کارگری دارد"
              />
            </div>

            {hasLabor && (
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">لیست نیروهای کارگر اختصاص‌یافته به بار:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLaborModalOpen(true)}
                      className="flex items-center gap-1 text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ ساخت سریع کارگر جدید</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddLaborRow()}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن کارگر دیگر</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {laborRows.map((row, index) => (
                    <div 
                      key={row.rowId}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-center gap-2.5 shadow-sm"
                    >
                      <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-xs font-black flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>

                      {/* انتخاب کارگر */}
                      <div className="w-full md:w-56 shrink-0">
                        <PortalSelect searchable 
                          options={workers.map(w => ({
                            value: w.id,
                            label: `${w.name} ${w.lastName}`
                          }))}
                          value={row.workerId}
                          onChange={(wId) => handleUpdateLaborRow(row.rowId, { workerId: wId })}
                          placeholder="انتخاب کارگر..."
                          searchable
                          className="!h-10"
                        />
                      </div>

                      {/* نوع عملیات */}
                      <div className="w-full md:w-40 shrink-0">
                        <PortalSelect searchable 
                          options={[
                            { value: 'UNLOADING', label: 'تخلیه بار (خالی کردن)' },
                            { value: 'LOADING', label: 'بارگیری (بار زدن)' },
                            { value: 'BOTH', label: 'بارگیری و تخلیه (هر دو)' },
                          ]}
                          value={row.operationType}
                          onChange={(op) => handleUpdateLaborRow(row.rowId, { operationType: op as any })}
                          className="!h-10"
                        />
                      </div>

                      {/* نوع دستمزد */}
                      <div className="w-full md:w-36 shrink-0">
                        <PortalSelect searchable 
                          options={[
                            { value: 'PER_BAG', label: 'کیسه‌ای / پاکتی' },
                            { value: 'PER_TON', label: 'تنی' },
                            { value: 'PER_ITEM', label: 'دونه‌ای / عددی' },
                            { value: 'PER_SERVICE', label: 'سرویسی / باری' },
                            { value: 'DAILY', label: 'روزمزد' },
                            { value: 'FIXED', label: 'مقطوع / کنترات' },
                          ]}
                          value={row.wageType}
                          onChange={(wt) => handleUpdateLaborRow(row.rowId, { wageType: wt as any })}
                          className="!h-10"
                        />
                      </div>

                      {/* تعداد / کارکرد */}
                      <div className="w-full md:w-24 shrink-0">
                        <input
                          type="text"
                          dir="ltr"
                          value={row.quantity}
                          onChange={(e) => handleUpdateLaborRow(row.rowId, { quantity: e.target.value })}
                          placeholder="تعداد..."
                          className="w-full h-10 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-center font-mono"
                        />
                      </div>

                      {/* نرخ دستمزد واحد */}
                      <div className="w-full md:flex-1">
                        <input
                          type="text"
                          dir="ltr"
                          value={row.rate ? formatNumber(safeNum(row.rate)) : ''}
                          onChange={(e) => handleUpdateLaborRow(row.rowId, { rate: e.target.value.replace(/,/g, '') })}
                          placeholder="نرخ دستمزد..."
                          className="w-full h-10 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-center font-mono"
                        />
                      </div>

                      {/* جمع دستمزد کارگر */}
                      <div className="w-full md:w-32 shrink-0 text-left font-mono font-black text-indigo-600 dark:text-indigo-400 text-xs px-2" dir="ltr">
                        {row.totalWage.toLocaleString('fa-IR')} <span className="text-[10px] font-normal">{currencyLabel}</span>
                      </div>

                      {/* حذف سطر */}
                      <button
                        type="button"
                        onClick={() => handleRemoveLaborRow(row.rowId)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                        title="حذف این نیرو"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 pt-1">
                  <span>مجموع هزینه دستمزد کارگران بارگیری و تخلیه:</span>
                  <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400" dir="ltr">
                    {math.totalLaborCost.toLocaleString('fa-IR')} {currencyLabel}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* بخش ۶: باکس هوشمند محاسبه زنده قیمت تمام‌شده واقعی (True Landed Cost) */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-blue-500/10 border border-emerald-500/30 dark:border-emerald-500/20 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  محاسبه زنده قیمت تمام‌شده واقعی پارت (True Landed Cost)
                </h4>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2.5 py-1 rounded-xl">
                فرمولاسیون هوشمند
              </span>
            </div>

            {/* تفکیک مقادیر در ۳ کارت کوچک */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-right">
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">۱. بهای خرید مصالح ({math.purchasePct}٪)</span>
                <span className="text-base font-black font-mono text-slate-800 dark:text-white" dir="ltr">
                  {math.totalPurchase.toLocaleString('fa-IR')} <span className="text-[10px] font-normal">{currencyLabel}</span>
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">۲. کرایه حمل ({math.freightPct}٪)</span>
                <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400" dir="ltr">
                  {math.freightCost.toLocaleString('fa-IR')} <span className="text-[10px] font-normal">{currencyLabel}</span>
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">۳. بارگیری و تخلیه ({math.laborPct}٪)</span>
                <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400" dir="ltr">
                  {math.totalLaborCost.toLocaleString('fa-IR')} <span className="text-[10px] font-normal">{currencyLabel}</span>
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                <span className="text-[11px] font-bold text-emerald-100 block mb-0.5">کل بهای تمام‌شده پارت</span>
                <span className="text-lg font-black font-mono" dir="ltr">
                  {math.totalLandedCost.toLocaleString('fa-IR')} <span className="text-xs font-normal">{currencyLabel}</span>
                </span>
              </div>
            </div>

            {/* قیمت تمام‌شده هر واحد پایه و هر واحد نمایش */}
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/70 dark:border-emerald-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  قیمت تمام‌شده هر {selectedItem?.baseUnit || selectedItem?.primaryUnit || 'واحد پایه'} برای ما:
                </span>
                <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">
                  {math.landedUnitCostBase.toLocaleString('fa-IR')} {currencyLabel}
                </span>
              </div>

              {selectedItem && selectedItem.displayUnit && selectedItem.displayUnit !== selectedItem.primaryUnit && (
                <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3">
                  <span className="text-xs font-bold text-slate-500">
                    معادل هر {selectedItem.displayUnit}:
                  </span>
                  <span className="text-sm font-black font-mono text-teal-600 dark:text-teal-400" dir="ltr">
                    {math.landedCostDisplayUnit.toLocaleString('fa-IR')} {currencyLabel}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* بخش ۷: پیوست تصویر بارنامه و توضیحات */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* تصویر بارنامه / قبض باسکول */}
            <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>پیوست عکس بارنامه / رسید باسکول</span>
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> انتخاب تصویر
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              {waybillPhotos.length === 0 ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1 opacity-50" />
                  <span className="text-xs font-bold text-slate-500">کلیک جهت آپلود تصویر بارنامه یا قبض باسکول</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {waybillPhotos.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                      <img src={img} alt="بارنامه" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setWaybillPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-rose-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* توضیحات تکمیلی */}
            <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                توضیحات اختیاری و مشخصات فنی بار
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات در مورد کیفیت بار، تخلیه، محل دپو در انبار..."
                className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

          </div>

          {/* بخش ۸: پرداخت همزمان و اتصال به مودال پرداخت مادر */}
          <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800 dark:text-white">وضعیت تسویه مالی این خرید:</span>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
                    settlementStatus === 'SETTLED'
                      ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                      : settlementStatus === 'PARTIAL'
                      ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                      : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                  }`}>
                    {settlementStatus === 'SETTLED' ? 'تسویه شده' : settlementStatus === 'PARTIAL' ? 'پرداخت ناقص' : 'در انتظار تسویه / نسیه'}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                  امکان ثبت همزمان واریز بانکی، چک صیادی یا پرداخت نقدی به تأمین‌کننده
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <DollarSign className="w-4 h-4" />
              <span>ثبت پرداخت همزمان به تأمین‌کننده</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* فوتر چسبنده دکمه‌های عملیات */}
          {/* ======================================================== */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="submit"
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-xl shadow-emerald-500/25 transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>ثبت قطعی ورود به انبار و تخصیص پارت</span>
            </button>
          </div>

        </form>

      </motion.div>

      {/* مودال‌های اصلی ساخت تأمین‌کننده، کارگر و کارفرما */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        defaultCategory={supplierModalCategory}
        onSuccess={(newSupp) => {
          if (supplierModalCategory === 'externalLogistics') {
            setExternalCarrierSupplierId(newSupp.id);
          } else {
            setSelectedSupplierId(newSupp.id);
          }
          setIsSupplierModalOpen(false);
        }}
      />

      <LaborFormModal
        isOpen={isLaborModalOpen}
        onClose={() => setIsLaborModalOpen(false)}
        onSuccess={(newWorker: WorkerProfile) => {
          handleAddLaborRow(newWorker.id);
          setIsLaborModalOpen(false);
        }}
      />

      <ClientFormModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={(newClient) => {
          setSelectedClientId(newClient.id);
          setIsClientLocked(true);
          setIsClientModalOpen(false);
        }}
      />

      {/* اتصال مستقیم به مودال پرداخت مادر (UniversalTransactionModal) */}
      {isPaymentModalOpen && (
        <UniversalTransactionModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          context={selectedSupplierId ? 'SUPPLIER' : 'INVENTORY'}
          supplierId={selectedSupplierId || undefined}
          initialAmount={math.totalLandedCost}
          initialDirection="OUT"
          onSuccess={() => {
            setSettlementStatus('SETTLED');
            setPaidAmount(math.totalLandedCost);
            setIsPaymentModalOpen(false);
            toast.success('سند پرداخت مادر با موفقیت ثبت شد.');
          }}
        />
      )}

    </div>,
    document.body
  );
}
