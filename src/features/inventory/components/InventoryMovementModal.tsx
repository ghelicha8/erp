import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Package, ArrowUpRight, ArrowDownRight, RotateCcw, AlertTriangle, 
  Building2, Store, Truck, Calculator, DollarSign, Sparkles, 
  FileText, Check, ShieldCheck, ArrowLeftRight, User
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useInventoryStore, 
  type InventoryItem, 
  type InventoryTransaction,
  type InventoryTransactionType 
} from '../../../store/inventoryStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useClientStore } from '../../../store/clientStore';
import { useProcurementStore } from '../../../store/procurementStore';
import { useLogisticsStore } from '../../../store/logisticsStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { PortalSelect, AnimatedCheckbox } from '../../../components/ui/SharedLaborUI';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import UniversalTransactionModal from '../../../components/shared/UniversalTransactionModal';
import { generateUUID } from '../../../core/utils/uuid';

interface InventoryMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItemId?: string;
  initialType?: InventoryTransactionType;
  editTransaction?: InventoryTransaction | null;
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

export default function InventoryMovementModal({
  isOpen,
  onClose,
  preselectedItemId,
  initialType = 'OUT_PROJECT',
  editTransaction,
  onSaved
}: InventoryMovementModalProps) {
  const { items, addTransaction, updateTransaction } = useInventoryStore();
  const { projects } = useProjectStore();
  const { clients } = useClientStore();
  const { suppliers } = useProcurementStore();
  const { vehicles } = useLogisticsStore();
  const { currency } = useSettingsStore(state => state.settings);

  const isRial = currency === 'rial' || (currency as any) === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';

  // نوع عملیات
  const [movementType, setMovementType] = useState<InventoryTransactionType>(initialType);

  // انتخاب کالا
  const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItemId || '');
  const selectedItem = useMemo(() => {
    return items.find(it => it.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // تاریخ
  const [date, setDate] = useState(() => moment().format('jYYYY/jMM/jDD'));

  // واحد و مقدار ورودی
  const [inputQty, setInputQty] = useState<string>('1');
  const [inputUnit, setInputUnit] = useState<string>('');

  // پروژه و کارفرمای مقصد (قانون سراسری دوطرفه پروژه ⟷ کارفرما)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isClientLocked, setIsClientLocked] = useState<boolean>(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('GENERAL');

  // تأمین‌کننده (در حالت خرید)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  // بخش بهای تمام‌شده ما (Internal Cost)
  const [internalUnitCost, setInternalUnitCost] = useState<string>('');
  const [internalFreightCost, setInternalFreightCost] = useState<string>('');

  // بخش صورتحساب کارفرما و آربیتراژ (Billed Cost)
  const [billedQty, setBilledQty] = useState<string>('1');
  const [billedUnit, setBilledUnit] = useState<string>('');
  const [billedUnitPrice, setBilledUnitPrice] = useState<string>('');
  const [billedFreightCost, setBilledFreightCost] = useState<string>('');

  // حمل و ناوگان
  const [hasFreight, setHasFreight] = useState(false);
  const [transportSource, setTransportSource] = useState<'INTERNAL' | 'EXTERNAL'>('EXTERNAL');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');

  // وضعیت تسویه و توضیحات
  const [settlementStatus, setSettlementStatus] = useState<'SETTLED' | 'PENDING'>('PENDING');
  const [description, setDescription] = useState('');

  // مودال پرداخت پس از تسویه
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);

  // هماهنگ‌سازی فیلدها هنگام انتخاب کالا
  useEffect(() => {
    if (selectedItem) {
      if (!inputUnit) setInputUnit(selectedItem.primaryUnit);
      if (!billedUnit) setBilledUnit(selectedItem.primaryUnit);
      if (!internalUnitCost) setInternalUnitCost(formatNumber(selectedItem.averageUnitCost));
      if (!billedUnitPrice) {
        const defaultBilled = selectedItem.defaultBilledPrice || Math.round(selectedItem.averageUnitCost * 1.15);
        setBilledUnitPrice(formatNumber(defaultBilled));
      }
    }
  }, [selectedItem, inputUnit, billedUnit, internalUnitCost, billedUnitPrice]);

  // هماهنگ‌سازی هنگام ویرایش
  useEffect(() => {
    if (editTransaction) {
      setMovementType(editTransaction.type);
      setSelectedItemId(editTransaction.itemId);
      setDate(editTransaction.date);
      setInputQty(String(editTransaction.inputQty));
      setInputUnit(editTransaction.inputUnit);
      const proj = projects.find(p => p.id === editTransaction.projectId);
      setSelectedProjectId(editTransaction.projectId || '');
      setSelectedClientId(proj?.clientId || editTransaction.clientId || '');
      setIsClientLocked(!!proj?.clientId);
      setSelectedPhaseId(editTransaction.phaseId || 'GENERAL');
      setSelectedSupplierId(editTransaction.supplierId || '');
      setInternalUnitCost(formatNumber(editTransaction.internalUnitCost));
      setInternalFreightCost(formatNumber(editTransaction.internalFreightCost));
      setBilledQty(editTransaction.billedQty ? String(editTransaction.billedQty) : String(editTransaction.inputQty));
      setBilledUnit(editTransaction.billedUnit || editTransaction.inputUnit);
      setBilledUnitPrice(editTransaction.billedUnitPrice ? formatNumber(editTransaction.billedUnitPrice) : '');
      setBilledFreightCost(editTransaction.billedFreightCost ? formatNumber(editTransaction.billedFreightCost) : '');
      setHasFreight((editTransaction.internalFreightCost || 0) > 0);
      setTransportSource(editTransaction.transportSource || 'EXTERNAL');
      setVehicleId(editTransaction.vehicleId || '');
      setDriverName(editTransaction.driverName || '');
      setSettlementStatus(editTransaction.settlementStatus === 'SETTLED' ? 'SETTLED' : 'PENDING');
      setDescription(editTransaction.description || '');
    } else {
      if (preselectedItemId) setSelectedItemId(preselectedItemId);
      if (initialType) setMovementType(initialType);
    }
  }, [editTransaction, preselectedItemId, initialType]);

  // محاسبه مقدار نهایی به واحد پایه (Primary Qty) بر اساس نسبت تبدیل
  const calculatedPrimaryQty = useMemo(() => {
    const rawQty = safeNum(inputQty);
    if (!selectedItem) return rawQty;

    // اگر واحد انتخابی واحد فرعی باشد، در ضریب تبدیل ضرب می‌شود
    if (selectedItem.secondaryUnit && inputUnit === selectedItem.secondaryUnit) {
      const ratio = selectedItem.conversionRatio || 1;
      return rawQty * ratio;
    }

    return rawQty;
  }, [inputQty, inputUnit, selectedItem]);

  // لیست اقلام برای PortalSelect
  const itemOptions = useMemo(() => {
    return items.map(it => {
      const secText = it.secondaryUnit && it.conversionRatio ? ` (معادل ${(it.currentStock / it.conversionRatio).toFixed(1)} ${it.secondaryUnit})` : '';
      return {
        value: it.id,
        label: it.name,
        subLabel: `موجودی: ${it.currentStock.toLocaleString('fa-IR')} ${it.primaryUnit}${secText} • کد: ${it.code}`
      };
    });
  }, [items]);

  // گزینه‌های واحد برای کالا
  const unitOptions = useMemo(() => {
    if (!selectedItem) return [{ value: 'عدد', label: 'عدد' }];
    const list = [{ value: selectedItem.primaryUnit, label: `${selectedItem.primaryUnit} (واحد پایه)` }];
    if (selectedItem.secondaryUnit) {
      list.push({ 
        value: selectedItem.secondaryUnit, 
        label: `${selectedItem.secondaryUnit} (واحد فرعی: هر ۱ ${selectedItem.secondaryUnit} = ${selectedItem.conversionRatio || 1} ${selectedItem.primaryUnit})` 
      });
    }
    return list;
  }, [selectedItem]);

  // قانون دوطرفه پروژه ⟷ کارفرما
  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    if (projId) {
      const p = projects.find(item => item.id === projId);
      if (p?.clientId) {
        setSelectedClientId(p.clientId);
        setIsClientLocked(true);
      } else {
        setIsClientLocked(false);
      }
    } else {
      setIsClientLocked(false);
    }
  };

  const handleClientChange = (cId: string) => {
    setSelectedClientId(cId);
    if (selectedProjectId) {
      const p = projects.find(item => item.id === selectedProjectId);
      if (p && p.clientId !== cId) {
        setSelectedProjectId('');
      }
    }
  };

  const filteredProjects = useMemo(() => {
    if (!selectedClientId) return projects;
    return projects.filter(p => p.clientId === selectedClientId);
  }, [projects, selectedClientId]);

  // پروژه‌ها برای PortalSelect
  const projectOptions = useMemo(() => {
    return filteredProjects.map(p => ({
      value: p.id,
      label: p.name,
      subLabel: p.clientName ? `کارفرما: ${p.clientName}` : undefined
    }));
  }, [filteredProjects]);

  // کارفرمایان برای PortalSelect
  const clientOptions = useMemo(() => {
    return [
      { value: '', label: 'همه کارفرمایان / آزاد' },
      ...clients.map(c => ({
        value: c.id,
        label: `${c.name} ${c.lastName || ''}`.trim(),
        subLabel: c.phone
      }))
    ];
  }, [clients]);

  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const phaseOptions = useMemo(() => {
    const list = [{ value: 'GENERAL', label: 'عمومی (بدون فاز اختصاصی)' }];
    if (currentProject?.phases) {
      currentProject.phases.forEach(ph => list.push({ value: ph.id, label: ph.name }));
    }
    return list;
  }, [currentProject]);

  // تأمین‌کنندگان برای PortalSelect
  const supplierOptions = useMemo(() => {
    return suppliers.map(s => ({
      value: s.id,
      label: s.name,
      subLabel: s.managerName ? `مدیریت: ${s.managerName}` : undefined
    }));
  }, [suppliers]);

  // خودروهای داخلی برای PortalSelect
  const vehicleOptions = useMemo(() => {
    return vehicles.map(v => ({
      value: v.id,
      label: `${v.name} (${v.plate})`,
      subLabel: v.status === 'ACTIVE' ? 'فعال در کارگاه' : 'غیرفعال'
    }));
  }, [vehicles]);

  // ==========================================
  // محاسبات ریاضی حواله و سود پنهان
  // ==========================================
  const math = useMemo(() => {
    const primaryQty = calculatedPrimaryQty;
    const unitCost = safeNum(internalUnitCost);
    const freightCost = hasFreight ? safeNum(internalFreightCost) : 0;
    const totalInternal = (primaryQty * unitCost) + freightCost;

    if (movementType !== 'OUT_PROJECT') {
      return {
        primaryQty,
        totalInternal,
        materialInternal: primaryQty * unitCost,
        freightInternal: freightCost,
        totalBilled: totalInternal,
        materialBilled: primaryQty * unitCost,
        freightBilled: freightCost,
        materialProfit: 0,
        freightProfit: 0,
        netProfit: 0,
        marginPercent: 0
      };
    }

    const bQty = safeNum(billedQty) || primaryQty;
    const bUnitPrice = safeNum(billedUnitPrice) || unitCost;
    const bFreight = hasFreight ? safeNum(billedFreightCost) : 0;
    const materialBilled = bQty * bUnitPrice;
    const totalBilled = materialBilled + bFreight;

    const materialProfit = materialBilled - (primaryQty * unitCost);
    const freightProfit = bFreight - freightCost;
    const netProfit = totalBilled - totalInternal;
    const marginPercent = totalInternal > 0 ? Math.round((netProfit / totalInternal) * 100) : 0;

    return {
      primaryQty,
      totalInternal,
      materialInternal: primaryQty * unitCost,
      freightInternal: freightCost,
      totalBilled,
      materialBilled,
      freightBilled: bFreight,
      materialProfit,
      freightProfit,
      netProfit,
      marginPercent
    };
  }, [
    calculatedPrimaryQty, internalUnitCost, internalFreightCost, hasFreight, 
    movementType, billedQty, billedUnitPrice, billedFreightCost
  ]);

  // بررسی هشدار موجودی ناکافی در هنگام خروج
  const isStockInsufficient = useMemo(() => {
    if (!selectedItem) return false;
    if (movementType === 'OUT_PROJECT' || movementType === 'OUT_WASTE') {
      return calculatedPrimaryQty > selectedItem.currentStock;
    }
    return false;
  }, [selectedItem, movementType, calculatedPrimaryQty]);

  // ذخیره فرم حواله
  const handleSave = () => {
    if (!selectedItem) {
      toast.error('لطفاً کالای مورد نظر را از انبار انتخاب کنید.');
      return;
    }
    if (calculatedPrimaryQty <= 0) {
      toast.error('لطفاً مقدار معتبر وارد کنید.');
      return;
    }
    if (movementType === 'OUT_PROJECT' && !selectedProjectId) {
      toast.error('لطفاً پروژه مقصد حواله را انتخاب کنید.');
      return;
    }
    if (isStockInsufficient) {
      toast.error(`موجودی انبار (${selectedItem.currentStock} ${selectedItem.primaryUnit}) برای خروج ${calculatedPrimaryQty} ${selectedItem.primaryUnit} کافی نیست!`);
      return;
    }

    const resolvedClientId = selectedClientId || currentProject?.clientId || undefined;
    const txPayload = {
      date,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      type: movementType,
      projectId: movementType === 'OUT_PROJECT' || movementType === 'IN_RETURN' ? selectedProjectId : undefined,
      phaseId: selectedPhaseId !== 'GENERAL' ? selectedPhaseId : undefined,
      clientId: resolvedClientId,
      supplierId: movementType === 'IN_PURCHASE' ? selectedSupplierId : undefined,

      inputQty: safeNum(inputQty),
      inputUnit: inputUnit || selectedItem.primaryUnit,
      calculatedPrimaryQty,

      internalUnitCost: safeNum(internalUnitCost),
      internalFreightCost: hasFreight ? safeNum(internalFreightCost) : 0,
      totalInternalCost: math.totalInternal,

      billedQty: movementType === 'OUT_PROJECT' ? (safeNum(billedQty) || calculatedPrimaryQty) : undefined,
      billedUnit: movementType === 'OUT_PROJECT' ? (billedUnit || inputUnit) : undefined,
      billedUnitPrice: movementType === 'OUT_PROJECT' ? safeNum(billedUnitPrice) : undefined,
      billedFreightCost: movementType === 'OUT_PROJECT' && hasFreight ? safeNum(billedFreightCost) : undefined,
      totalBilledAmount: movementType === 'OUT_PROJECT' ? math.totalBilled : undefined,
      hiddenProfit: movementType === 'OUT_PROJECT' ? math.netProfit : undefined,

      settlementStatus: settlementStatus as 'SETTLED' | 'PENDING',
      paidAmount: settlementStatus === 'SETTLED' ? math.totalInternal : 0,

      transportSource: hasFreight ? transportSource : undefined,
      vehicleId: hasFreight && transportSource === 'INTERNAL' ? vehicleId : undefined,
      driverName: hasFreight ? driverName : undefined,

      description: description.trim() || undefined
    };

    let txId = editTransaction?.id;
    if (editTransaction) {
      updateTransaction(editTransaction.id, txPayload);
      toast.success('حواله انبار به‌روزرسانی شد.');
    } else {
      txId = addTransaction(txPayload);
      toast.success('حواله انبار با موفقیت ثبت و اعمال گردید.');
    }

    onSaved?.(txId || '');

    if (settlementStatus === 'SETTLED' && movementType === 'IN_PURCHASE' && selectedSupplierId) {
      setLastTxId(txId || null);
      setIsPaymentModalOpen(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md overflow-y-auto modal-scrollbar">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* هدر مودال */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {editTransaction ? 'ویرایش حواله گردش انبار' : 'ثبت حواله ورود / خروج و ارسال مصالح'}
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                      شبکه عنکبوتی انبار
                    </span>
                  </h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                    کسر یا افزایش خودکار موجودی، ثبت در کاردکس، پروژه و لجستیک
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* بدنه فرم */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto modal-scrollbar">
              
              {/* ۱. انتخاب نوع عملیات (۴ تب گرافیکی) */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-emerald-500" />
                  ۱. نوع عملیات و گردش کالا در انبار:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('OUT_PROJECT')}
                    className={`p-3 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
                      movementType === 'OUT_PROJECT'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 border-emerald-400'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <ArrowUpRight className="w-5 h-5" />
                    خروج و ارسال به پروژه
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovementType('IN_PURCHASE')}
                    className={`p-3 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
                      movementType === 'IN_PURCHASE'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border-blue-400'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <ArrowDownRight className="w-5 h-5" />
                    ورود خرید جدید به انبار
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovementType('IN_RETURN')}
                    className={`p-3 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
                      movementType === 'IN_RETURN'
                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25 border-teal-400'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <RotateCcw className="w-5 h-5" />
                    برگشت مصالح از پروژه
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovementType('OUT_WASTE')}
                    className={`p-3 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
                      movementType === 'OUT_WASTE'
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 border-rose-400'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                    ثبت ضایعات و پرت مصالح
                  </button>
                </div>
              </div>

              {/* ۲. انتخاب کالا، مقدار و تاریخ */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
                {/* ردیف اول: کالا و تاریخ */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-emerald-500" />
                      انتخاب کالای انبار *
                    </label>
                    <PortalSelect
                      options={itemOptions}
                      value={selectedItemId}
                      onChange={setSelectedItemId}
                      placeholder="جستجو و انتخاب کالا..."
                      searchable={true}
                    />
                    {selectedItem && (
                      <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1">
                        <span>موجودی فعلی انبار: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{selectedItem.currentStock.toLocaleString('fa-IR')} {selectedItem.primaryUnit}</strong></span>
                        {selectedItem.secondaryUnit && (
                          <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-mono text-[10px]">
                            واحد فرعی: هر ۱ {selectedItem.secondaryUnit} = {selectedItem.conversionRatio} {selectedItem.primaryUnit}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      تاریخ حواله
                    </label>
                    <GlassDatePicker
                      value={date}
                      onChange={setDate}
                      placeholder="تاریخ ثبت..."
                    />
                  </div>
                </div>

                {/* ردیف دوم: مقدار و واحد تفکیک‌شده با حاشیه بالا جهت جلوگیری کامل از تداخل متنی */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200/70 dark:border-slate-700/60">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      مقدار در این حواله *
                    </label>
                    <input
                      type="number"
                      autoComplete="off"
                      value={inputQty}
                      onChange={e => setInputQty(e.target.value)}
                      className="w-full h-[46px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-sm outline-none text-center"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      واحد انتخابی
                    </label>
                    <PortalSelect
                      options={unitOptions}
                      value={inputUnit}
                      onChange={setInputUnit}
                      placeholder="واحد..."
                      searchable={true}
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <div className="h-[46px] px-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-300">معادل واحد پایه:</span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {calculatedPrimaryQty.toLocaleString('fa-IR')} {selectedItem?.primaryUnit || 'واحد'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* اخطار در صورت کمبود موجودی */}
                {isStockInsufficient && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-black flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
                    <span>هشدار کسری انبار: مقدار خروجی ({calculatedPrimaryQty}) بیشتر از موجودی فعلی انبار ({selectedItem?.currentStock}) است!</span>
                  </div>
                )}
              </div>

              {/* ۳. مقصد / مبدا در شبکه عنکبوتی (پروژه یا تأمین‌کننده) */}
              {(movementType === 'OUT_PROJECT' || movementType === 'IN_RETURN') && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        کارفرما / مشتری
                      </span>
                      {isClientLocked && (
                        <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                          قفل با پروژه
                        </span>
                      )}
                    </label>
                    <PortalSelect
                      options={clientOptions}
                      value={selectedClientId}
                      onChange={handleClientChange}
                      disabled={isClientLocked}
                      placeholder="انتخاب کارفرما..."
                      searchable={true}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      پروژه مقصد *
                    </label>
                    <PortalSelect
                      options={projectOptions}
                      value={selectedProjectId}
                      onChange={handleProjectChange}
                      placeholder="انتخاب پروژه..."
                      searchable={true}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      فاز اجرایی (اختیاری)
                    </label>
                    <PortalSelect
                      options={phaseOptions}
                      value={selectedPhaseId}
                      onChange={setSelectedPhaseId}
                      placeholder="فاز اجرایی..."
                      searchable={true}
                    />
                  </div>
                </div>
              )}

              {movementType === 'IN_PURCHASE' && (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-teal-500" />
                    تأمین‌کننده / فروشنده کالا
                  </label>
                  <PortalSelect
                    options={supplierOptions}
                    value={selectedSupplierId}
                    onChange={setSelectedSupplierId}
                    placeholder="انتخاب فروشنده از تدارکات..."
                    searchable={true}
                  />
                </div>
              )}

              {/* ۴. قیمت تمام‌شده و صورتحساب کارفرما (آربیتراژ انبار) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* ستون بهای تمام‌شده انبار */}
                <div className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-emerald-500" />
                      بهای تمام‌شده انبار (خروج از جیب پیمانکار)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      محرمانه انبار
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      فی تمام‌شده هر {selectedItem?.primaryUnit || 'واحد'} ({currencyLabel}):
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={internalUnitCost}
                      onChange={e => setInternalUnitCost(formatNumber(safeNum(e.target.value)))}
                      placeholder="۰"
                      className="w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-xs outline-none text-left"
                      dir="ltr"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <AnimatedCheckbox
                      checked={hasFreight}
                      onChange={setHasFreight}
                      label="این حواله کرایه حمل دارد"
                    />
                  </div>

                  {hasFreight && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        کرایه حمل واقعی پرداخت‌شده ({currencyLabel}):
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={internalFreightCost}
                        onChange={e => setInternalFreightCost(formatNumber(safeNum(e.target.value)))}
                        placeholder="۰"
                        className="w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-xs outline-none text-left"
                        dir="ltr"
                      />
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">جمع کل تمام‌شده حواله:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm" dir="ltr">
                      {math.totalInternal.toLocaleString('fa-IR')} {currencyLabel}
                    </span>
                  </div>
                </div>

                {/* ستون فاکتور کارفرما (فقط در ارسال به پروژه) */}
                <div className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-indigo-500" />
                      صورتحساب اعلامی به کارفرما
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      صورت‌وضعیت پروژه
                    </span>
                  </div>

                  {movementType !== 'OUT_PROJECT' ? (
                    <div className="py-8 text-center text-xs font-bold text-slate-400">
                      این حواله مربوط به چرخه داخلی انبار است و صورتحساب کارفرما ندارد.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                            مقدار کارفرما:
                          </label>
                          <input
                            type="number"
                            autoComplete="off"
                            value={billedQty}
                            onChange={e => setBilledQty(e.target.value)}
                            className="w-full h-[44px] px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-xs outline-none text-center"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                            فی اعلامی ({currencyLabel}):
                          </label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={billedUnitPrice}
                            onChange={e => setBilledUnitPrice(formatNumber(safeNum(e.target.value)))}
                            placeholder="۰"
                            className="w-full h-[44px] px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-xs outline-none text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      {hasFreight && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                            کرایه حمل اعلامی به کارفرما ({currencyLabel}):
                          </label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={billedFreightCost}
                            onChange={e => setBilledFreightCost(formatNumber(safeNum(e.target.value)))}
                            placeholder="۰"
                            className="w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-xs outline-none text-left"
                            dir="ltr"
                          />
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500">مبلغ کل فاکتور کارفرما:</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400 font-mono text-sm" dir="ltr">
                          {math.totalBilled.toLocaleString('fa-IR')} {currencyLabel}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ۵. لجستیک و ناوگان در صورت وجود کرایه */}
              {hasFreight && (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-white">
                    <Truck className="w-4 h-4 text-amber-500" />
                    انتخاب ناوگان حمل مصالح:
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTransportSource('EXTERNAL')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        transportSource === 'EXTERNAL'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      باربری / راننده آزاد
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransportSource('INTERNAL')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        transportSource === 'INTERNAL'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      ناوگان داخلی خودمان
                    </button>
                  </div>

                  {transportSource === 'INTERNAL' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1">
                        انتخاب خودروی ناوگان داخلی (کرایه به درآمد این ماشین منظور می‌شود):
                      </label>
                      <PortalSelect
                        options={vehicleOptions}
                        value={vehicleId}
                        onChange={setVehicleId}
                        placeholder="انتخاب خودرو..."
                        searchable={true}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        نام راننده یا باربری آزاد:
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={driverName}
                        onChange={e => setDriverName(e.target.value)}
                        placeholder="نام راننده..."
                        className="w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ۶. کارت زنده تحلیل سود و زیان حواله (Live Formula Card) */}
              {movementType === 'OUT_PROJECT' && (
                <div className={`p-4 rounded-3xl border transition-all ${
                  math.netProfit > 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                    : math.netProfit < 0
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
                    : 'bg-sky-500/10 border-sky-500/30 text-sky-950 dark:text-sky-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-current/15 pb-2 mb-2">
                    <span className="text-xs font-black flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      تحلیل زنده سود پنهان (آربیتراژ) ارسال این مصالح:
                    </span>
                    <span className="text-sm font-black font-mono" dir="ltr">
                      {math.netProfit > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          سود خالص: +{math.netProfit.toLocaleString('fa-IR')} {currencyLabel} ({math.marginPercent}٪)
                        </span>
                      ) : math.netProfit < 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          هشدار زیان: {math.netProfit.toLocaleString('fa-IR')} {currencyLabel}
                        </span>
                      ) : (
                        <span className="text-sky-600 dark:text-sky-400">سربه‌سر</span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-bold opacity-90">
                    <div>سود روی مصالح: <span className="font-mono font-black" dir="ltr">{math.materialProfit.toLocaleString('fa-IR')}</span> {currencyLabel}</div>
                    <div>سود روی کرایه: <span className="font-mono font-black" dir="ltr">{math.freightProfit.toLocaleString('fa-IR')}</span> {currencyLabel}</div>
                  </div>
                </div>
              )}

              {/* توضیحات تکمیلی */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  توضیحات و یادداشت حواله:
                </label>
                <textarea
                  autoComplete="off"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="علت خروج، شماره بارنامه، محل تخلیه..."
                  rows={2}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-emerald-500"
                />
              </div>

            </div>

            {/* فوتر مودال */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl text-xs font-black text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {editTransaction ? 'به‌روزرسانی حواله' : 'ثبت قطعی حواله انبار'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* مودال پرداخت مادر در صورت خرید تسویه‌شده */}
      {isPaymentModalOpen && selectedSupplierId && (
        <UniversalTransactionModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            onClose();
          }}
          context="SUPPLIER"
          supplierId={selectedSupplierId}
          initialAmount={math.totalInternal}
          initialDirection="OUT"
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
