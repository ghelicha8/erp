import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShoppingBag, Store, Truck, Building2, Package, Wrench, 
  DollarSign, Calculator, Layers, AlertCircle, CheckCircle2, 
  HelpCircle, Sparkles, Plus, Image as ImageIcon, Trash2, 
  ArrowLeftRight, FileText, Check, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useProcurementStore } from '../../../store/procurementStore';
import { usePurchaseStore, type PurchaseRecord } from '../../../store/purchaseStore';
import { useInventoryStore } from '../../../store/inventoryStore';
import { useLogisticsStore } from '../../../store/logisticsStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useClientStore } from '../../../store/clientStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { PortalSelect } from '../../../components/ui/SharedLaborUI';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import UniversalTransactionModal from '../../../components/shared/UniversalTransactionModal';
import { generateUUID } from '../../../core/utils/uuid';

export const PROCUREMENT_UNITS = [
  { value: 'سرویس', label: 'سرویس' },
  { value: 'خاور', label: 'خاور' },
  { value: 'کمپرسی', label: 'کمپرسی' },
  { value: 'تریلی', label: 'تریلی' },
  { value: 'وانت', label: 'وانت / نیسان' },
  { value: 'تن', label: 'تن' },
  { value: 'کیلوگرم', label: 'کیلوگرم' },
  { value: 'مترمکعب', label: 'مترمکعب' },
  { value: 'مترمربع', label: 'مترمربع' },
  { value: 'مترطول', label: 'متر طول' },
  { value: 'شاخه', label: 'شاخه' },
  { value: 'ورق', label: 'ورق' },
  { value: 'پاکت/کیسه', label: 'پاکت / کیسه' },
  { value: 'پالت', label: 'پالت' },
  { value: 'عدد', label: 'عدد' },
  { value: 'قالب', label: 'قالب' },
  { value: 'ساعت', label: 'ساعت کار' },
  { value: 'روز', label: 'روز' },
];

interface ProcurementPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSupplierId?: string;
  initialVendorName?: string;
  initialDestination?: 'PROJECT' | 'INVENTORY' | 'INTERNAL';
  editRecord?: PurchaseRecord | null;
  onSaved?: (recordId: string) => void;
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

export default function ProcurementPurchaseModal({
  isOpen,
  onClose,
  initialSupplierId,
  initialVendorName,
  initialDestination = 'PROJECT',
  editRecord,
  onSaved
}: ProcurementPurchaseModalProps) {
  const { suppliers } = useProcurementStore();
  const { addPurchase, updatePurchase } = usePurchaseStore();
  const { materials, addStock, addMaterial } = useInventoryStore();
  const { vehicles, addLog } = useLogisticsStore();
  const { projects } = useProjectStore();
  const { clients } = useClientStore();
  const { currency } = useSettingsStore(state => state.settings);

  const isRial = currency === 'rial' || (currency as any) === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';

  // مقصد
  const [destinationType, setDestinationType] = useState<'PROJECT' | 'INVENTORY' | 'INTERNAL'>(initialDestination);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isClientLocked, setIsClientLocked] = useState<boolean>(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('GENERAL');

  // تأمین‌کننده
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(initialSupplierId || '');
  const [customVendorName, setCustomVendorName] = useState<string>(initialVendorName || '');

  // عنوان و تاریخ
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => moment().format('jYYYY/jMM/jDD'));

  // حالت محاسبه (3 حالت)
  const [calculationMode, setCalculationMode] = useState<'MATERIAL_ONLY' | 'FREIGHT_ONLY' | 'COMBINED'>('COMBINED');
  const [freightPricingMode, setFreightPricingMode] = useState<'SEPARATE' | 'LUMP_SUM'>('SEPARATE');
  const [transportSource, setTransportSource] = useState<'EXTERNAL' | 'INTERNAL'>('EXTERNAL');
  const [internalVehicleId, setInternalVehicleId] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');

  // ستون الف: خرید واقعی ما (Internal Cost)
  const [internalQty, setInternalQty] = useState<string>('1');
  const [internalUnit, setInternalUnit] = useState<string>('تن');
  const [internalUnitPrice, setInternalUnitPrice] = useState<string>('');
  const [internalFreightCost, setInternalFreightCost] = useState<string>('');
  const [lumpSumInternalTotal, setLumpSumInternalTotal] = useState<string>('');

  // ستون ب: فاکتور اعلامی به کارفرما (Billed Cost & Unit Conversion)
  const [applyBilledMarkup, setApplyBilledMarkup] = useState<boolean>(true);
  const [billedQty, setBilledQty] = useState<string>('1');
  const [billedUnit, setBilledUnit] = useState<string>('تن');
  const [billedUnitPrice, setBilledUnitPrice] = useState<string>('');
  const [billedFreightCost, setBilledFreightCost] = useState<string>('');

  // وضعیت تسویه
  const [settlementStatus, setSettlementStatus] = useState<'PENDING' | 'SETTLED'>('PENDING');

  // ضمیمه تصویر و یادداشت
  const [notes, setNotes] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  // مودال پرداخت پس از ثبت فاکتور تسویه‌شده
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastCreatedRecordId, setLastCreatedRecordId] = useState<string | null>(null);
  const [paymentAmountToPass, setPaymentAmountToPass] = useState<number>(0);

  // هماهنگ‌سازی هنگام ویرایش یا باز شدن با مشخصات اولیه
  useEffect(() => {
    if (editRecord) {
      setTitle(editRecord.title || '');
      setDate(editRecord.date || moment().format('jYYYY/jMM/jDD'));
      setDestinationType(editRecord.destinationType || 'PROJECT');
      const proj = projects.find(p => p.id === editRecord.projectId);
      setSelectedProjectId(editRecord.projectId || '');
      setSelectedClientId(proj?.clientId || (editRecord as any).clientId || '');
      setIsClientLocked(!!proj?.clientId);
      setSelectedPhaseId(editRecord.phaseId || 'GENERAL');

      if (editRecord.supplierId) {
        setSelectedSupplierId(editRecord.supplierId);
      } else {
        const found = suppliers.find(s => s.name.trim().toLowerCase() === (editRecord.vendor || '').trim().toLowerCase());
        if (found) setSelectedSupplierId(found.id);
        else setCustomVendorName(editRecord.vendor || '');
      }

      setCalculationMode(editRecord.calculationMode || (editRecord.hasTransport ? 'COMBINED' : 'MATERIAL_ONLY'));
      setFreightPricingMode(editRecord.freightPricingMode || 'SEPARATE');
      setTransportSource(editRecord.transportSource || 'EXTERNAL');
      setInternalVehicleId(editRecord.internalVehicleId || '');
      setDriverName(editRecord.driverName || '');

      setInternalQty(editRecord.internalQty ? String(editRecord.internalQty) : String(editRecord.quantity || 1));
      setInternalUnit(editRecord.internalUnit || editRecord.unit || 'تن');
      setInternalUnitPrice(editRecord.internalUnitPrice ? formatNumber(editRecord.internalUnitPrice) : '');
      setInternalFreightCost(editRecord.internalFreightCost ? formatNumber(editRecord.internalFreightCost) : (editRecord.transportInternalCost ? formatNumber(editRecord.transportInternalCost) : ''));
      setLumpSumInternalTotal(editRecord.totalInternalCost ? formatNumber(editRecord.totalInternalCost) : '');

      setBilledQty(editRecord.billedQty ? String(editRecord.billedQty) : String(editRecord.quantity || 1));
      setBilledUnit(editRecord.billedUnit || editRecord.unit || 'تن');
      setBilledUnitPrice(editRecord.billedUnitPrice ? formatNumber(editRecord.billedUnitPrice) : '');
      setBilledFreightCost(editRecord.billedFreightCost ? formatNumber(editRecord.billedFreightCost) : (editRecord.transportBilledCost ? formatNumber(editRecord.transportBilledCost) : ''));

      setSettlementStatus(editRecord.settlementStatus === 'SETTLED' ? 'SETTLED' : 'PENDING');
      setNotes(editRecord.notes || '');
      if (editRecord.photos && editRecord.photos.length > 0) {
        setPhotoBase64(editRecord.photos[0]);
      }
    } else {
      if (initialSupplierId) setSelectedSupplierId(initialSupplierId);
      if (initialVendorName) setCustomVendorName(initialVendorName);
      if (initialDestination) setDestinationType(initialDestination);
    }
  }, [editRecord, initialSupplierId, initialVendorName, initialDestination, suppliers]);

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

  // لیست پروژه‌ها برای PortalSelect
  const projectOptions = useMemo(() => {
    return filteredProjects.map(p => ({
      value: p.id,
      label: p.name,
      subLabel: p.clientName ? `کارفرما: ${p.clientName}` : undefined
    }));
  }, [filteredProjects]);

  // لیست کارفرمایان برای PortalSelect
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

  // فازهای پروژه انتخابی
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const phaseOptions = useMemo(() => {
    const list = [{ value: 'GENERAL', label: 'عمومی (بدون فاز اختصاصی)' }];
    if (currentProject?.phases) {
      currentProject.phases.forEach(ph => {
        list.push({ value: ph.id, label: ph.name });
      });
    }
    return list;
  }, [currentProject]);

  // لیست تأمین‌کنندگان برای PortalSelect
  const supplierOptions = useMemo(() => {
    const opts = suppliers.map(s => ({
      value: s.id,
      label: s.name,
      subLabel: s.managerName ? `مدیریت: ${s.managerName}` : undefined
    }));
    opts.push({ value: '__CUSTOM__', label: '➕ تأمین‌کننده متفرقه / آزاد' });
    return opts;
  }, [suppliers]);

  // لیست خودروهای داخلی ناوگان
  const vehicleOptions = useMemo(() => {
    return vehicles.map(v => ({
      value: v.id,
      label: `${v.name} (${v.plate})`,
      subLabel: v.status === 'ACTIVE' ? 'فعال در کارگاه' : 'غیرفعال'
    }));
  }, [vehicles]);

  // تأمین‌کننده انتخاب شده
  const activeSupplier = useMemo(() => {
    if (!selectedSupplierId || selectedSupplierId === '__CUSTOM__') return null;
    return suppliers.find(s => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // نام نهایی تأمین‌کننده
  const resolvedVendorName = useMemo(() => {
    if (activeSupplier) return activeSupplier.name;
    return customVendorName.trim() || 'تأمین‌کننده عمومی';
  }, [activeSupplier, customVendorName]);

  // ==========================================
  // محاسبات ریاضی ستون الف (خرید ما)
  // ==========================================
  const mathInternal = useMemo(() => {
    const qty = safeNum(internalQty);
    const unitP = safeNum(internalUnitPrice);
    const freight = calculationMode === 'MATERIAL_ONLY' ? 0 : safeNum(internalFreightCost);

    if (calculationMode === 'FREIGHT_ONLY') {
      const totalCost = freight;
      return {
        qty: qty || 1,
        unitPrice: 0,
        materialTotal: 0,
        freightCost: freight,
        totalCost
      };
    }

    if (calculationMode === 'COMBINED' && freightPricingMode === 'LUMP_SUM') {
      const lump = safeNum(lumpSumInternalTotal);
      return {
        qty: qty || 1,
        unitPrice: qty > 0 ? lump / qty : lump,
        materialTotal: lump,
        freightCost: 0,
        totalCost: lump
      };
    }

    const materialTotal = qty * unitP;
    const totalCost = materialTotal + freight;
    return {
      qty,
      unitPrice: unitP,
      materialTotal,
      freightCost: freight,
      totalCost
    };
  }, [internalQty, internalUnitPrice, internalFreightCost, calculationMode, freightPricingMode, lumpSumInternalTotal]);

  // ==========================================
  // محاسبات ریاضی ستون ب (اعلام به کارفرما)
  // ==========================================
  const mathBilled = useMemo(() => {
    if (destinationType !== 'PROJECT' || !applyBilledMarkup) {
      // در انبار مرکزی یا مصرف داخلی، مبلغ کارفرما دقیقاً معادل بهای تمام‌شده است
      return {
        qty: mathInternal.qty,
        unit: internalUnit,
        unitPrice: mathInternal.unitPrice,
        materialTotal: mathInternal.materialTotal,
        freightCost: mathInternal.freightCost,
        totalAmount: mathInternal.totalCost
      };
    }

    const bQty = safeNum(billedQty);
    const bUnitP = safeNum(billedUnitPrice);
    const bFreight = calculationMode === 'MATERIAL_ONLY' ? 0 : safeNum(billedFreightCost);

    if (calculationMode === 'FREIGHT_ONLY') {
      return {
        qty: bQty || 1,
        unit: billedUnit,
        unitPrice: 0,
        materialTotal: 0,
        freightCost: bFreight,
        totalAmount: bFreight
      };
    }

    const materialTotal = bQty * bUnitP;
    const totalAmount = materialTotal + bFreight;

    return {
      qty: bQty,
      unit: billedUnit,
      unitPrice: bUnitP,
      materialTotal,
      freightCost: bFreight,
      totalAmount
    };
  }, [destinationType, applyBilledMarkup, mathInternal, internalUnit, billedQty, billedUnitPrice, billedFreightCost, calculationMode, billedUnit]);

  // ==========================================
  // موتور تحلیل زنده سود پنهان، آربیتراژ و بالاسری
  // ==========================================
  const arbitrageAnalysis = useMemo(() => {
    const totalInternal = mathInternal.totalCost;
    const totalBilled = mathBilled.totalAmount;

    const unitCostForUs = totalInternal / (mathBilled.qty || mathInternal.qty || 1);
    const materialProfit = mathBilled.materialTotal - mathInternal.materialTotal;
    const freightProfit = mathBilled.freightCost - mathInternal.freightCost;
    const netProfit = totalBilled - totalInternal;

    const marginPercent = totalInternal > 0 ? Math.round((netProfit / totalInternal) * 100) : 0;

    return {
      unitCostForUs,
      materialProfit,
      freightProfit,
      netProfit,
      marginPercent
    };
  }, [mathInternal, mathBilled]);

  // آپلود عکس
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('حجم عکس فاکتور نباید بیشتر از ۴ مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result as string);
      toast.success('تصویر فاکتور ضمیمه شد.');
    };
    reader.readAsDataURL(file);
  };

  // ذخیره فرم
  const handleSave = () => {
    if (!title.trim()) {
      toast.error('لطفاً عنوان مصالح یا کالا را وارد کنید.');
      return;
    }
    if (destinationType === 'PROJECT' && !selectedProjectId) {
      toast.error('لطفاً پروژه مقصد را انتخاب کنید.');
      return;
    }
    if (mathInternal.totalCost <= 0) {
      toast.error('لطفاً مقادیر و مبالغ معتبر وارد کنید.');
      return;
    }

    const resolvedClientId = selectedClientId || currentProject?.clientId || undefined;
    const recordPayload = {
      projectId: destinationType === 'PROJECT' ? selectedProjectId : undefined,
      phaseId: destinationType === 'PROJECT' && selectedPhaseId !== 'GENERAL' ? selectedPhaseId : undefined,
      clientId: resolvedClientId,
      title: title.trim(),
      vendor: resolvedVendorName,
      supplierId: activeSupplier?.id || undefined,
      date,
      quantity: mathInternal.qty,
      unit: internalUnit,
      internalCost: mathInternal.totalCost,
      billedCost: mathBilled.totalAmount,
      paidAmount: settlementStatus === 'SETTLED' ? mathInternal.totalCost : 0,
      settlementStatus: settlementStatus as 'PENDING' | 'SETTLED',
      destinationType,
      calculationMode,
      freightPricingMode,
      transportSource,
      internalVehicleId: transportSource === 'INTERNAL' ? internalVehicleId : undefined,
      driverName: driverName.trim() || undefined,

      // فیلدهای دقیق ریاضی
      internalQty: mathInternal.qty,
      internalUnit,
      internalUnitPrice: mathInternal.unitPrice,
      internalMaterialCost: mathInternal.materialTotal,
      internalFreightCost: mathInternal.freightCost,
      totalInternalCost: mathInternal.totalCost,

      billedQty: mathBilled.qty,
      billedUnit: mathBilled.unit,
      billedUnitPrice: mathBilled.unitPrice,
      billedMaterialCost: mathBilled.materialTotal,
      billedFreightCost: mathBilled.freightCost,
      totalBilledAmount: mathBilled.totalAmount,

      arbitrageProfit: arbitrageAnalysis.netProfit,
      materialProfit: arbitrageAnalysis.materialProfit,
      freightProfit: arbitrageAnalysis.freightProfit,
      unitCostForUs: arbitrageAnalysis.unitCostForUs,

      hasTransport: calculationMode !== 'MATERIAL_ONLY' && mathInternal.freightCost > 0,
      transportInternalCost: mathInternal.freightCost,
      transportBilledCost: mathBilled.freightCost,

      photos: photoBase64 ? [photoBase64] : [],
      notes: notes.trim() || undefined,
    };

    let recordId = editRecord?.id;

    if (editRecord) {
      updatePurchase(editRecord.id, recordPayload);
      toast.success('فاکتور خرید با موفقیت به‌روزرسانی شد.');
    } else {
      recordId = generateUUID();
      addPurchase({
        ...recordPayload,
        id: recordId,
      } as any);
      toast.success('فاکتور خرید و باربری با موفقیت ثبت شد.');
    }

    // اتصال شبکه عنکبوتی به انبار مرکزی مصالح
    if (destinationType === 'INVENTORY') {
      const existingMat = materials.find(m => m.name.trim().toLowerCase() === title.trim().toLowerCase());
      if (existingMat) {
        addStock(existingMat.id, mathInternal.qty);
        toast.info(`موجودی ${existingMat.name} در انبار مرکزی افزایش یافت.`);
      } else {
        addMaterial({
          name: title.trim(),
          unit: internalUnit,
          currentStock: mathInternal.qty,
          costPrice: mathInternal.unitPrice || mathInternal.totalCost / (mathInternal.qty || 1)
        });
        toast.info(`کالای ${title} به موجودی انبار مرکزی افزوده شد.`);
      }
    }

    // اتصال ناوگان داخلی: ثبت درآمد کرایه برای خودروی منتخب شرکت
    if (transportSource === 'INTERNAL' && internalVehicleId && mathInternal.freightCost > 0) {
      addLog({
        id: generateUUID(),
        vehicleInfo: internalVehicleId,
        date,
        type: 'TRANSPORT',
        description: `حمل بار فاکتور: ${title} (${resolvedVendorName})`,
        billedCost: mathInternal.freightCost,
        status: 'PAID'
      } as any);
      toast.info('کرایه حمل به عنوان درآمد ناوگان داخلی شرکت منظور شد.');
    }

    onSaved?.(recordId || '');

    // اگر کاربر وضعیت «تسویه کامل» را انتخاب کرده، بلافاصله مودال پرداخت مادر را باز می‌کنیم
    if (settlementStatus === 'SETTLED') {
      setLastCreatedRecordId(recordId || null);
      setPaymentAmountToPass(mathInternal.totalCost);
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
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* هدر مودال */}
            <div className="px-6 py-5 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/25">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {editRecord ? 'ویرایش فاکتور خرید و باربری' : 'ثبت فاکتور خرید، مصالح و باربری'}
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                      موتور تبدیل واحد و آربیتراژ
                    </span>
                  </h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                    شبکه عنکبوتی تدارکات: ثبت همزمان هزینه، کرایه حمل و سود بالاسری کارفرما
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
              
              {/* ۱. تعیین مقصد بار / خرید (شبکه عنکبوتی) */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-500" />
                    ۱. تعیین مقصد بار و خرید (شبکه عنکبوتی):
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {destinationType === 'PROJECT' ? 'پروژه و کارفرمای مشخص' : destinationType === 'INVENTORY' ? 'انبار مرکزی' : 'کارگاه و دفتر'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDestinationType('PROJECT')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      destinationType === 'PROJECT'
                        ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    پروژه و کارفرما
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinationType('INVENTORY')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      destinationType === 'INVENTORY'
                        ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    انبار مرکزی مصالح
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinationType('INTERNAL')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      destinationType === 'INTERNAL'
                        ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                    مصرف داخلی / کارگاهی
                  </button>
                </div>

                {destinationType === 'PROJECT' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                        <span>کارفرما / مشتری</span>
                        {isClientLocked && (
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded">
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
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        انتخاب پروژه مقصد *
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
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        انتخاب فاز اجرایی (اختیاری)
                      </label>
                      <PortalSelect
                        options={phaseOptions}
                        value={selectedPhaseId}
                        onChange={setSelectedPhaseId}
                        placeholder="فاز اجرایی..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ۲. اطلاعات پایه: فروشنده، عنوان و تاریخ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-teal-500" />
                    تأمین‌کننده / فروشنده *
                  </label>
                  <PortalSelect
                    options={supplierOptions}
                    value={selectedSupplierId || (customVendorName ? '__CUSTOM__' : '')}
                    onChange={(val: string) => {
                      if (val === '__CUSTOM__') {
                        setSelectedSupplierId('');
                      } else {
                        setSelectedSupplierId(val);
                        setCustomVendorName('');
                      }
                    }}
                    placeholder="انتخاب تأمین‌کننده..."
                    searchable={true}
                  />
                  {(!selectedSupplierId || selectedSupplierId === '__CUSTOM__') && (
                    <input
                      type="text"
                      autoComplete="off"
                      value={customVendorName}
                      onChange={e => setCustomVendorName(e.target.value)}
                      placeholder="نام فروشنده یا راننده آزاد را وارد کنید..."
                      className="mt-2 w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-500" />
                    عنوان مصالح یا خدمات *
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="مثال: ماسه بادی دوبار شور، میلگرد ۱۶، کرایه حمل..."
                    className="w-full h-[46px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    تاریخ فاکتور
                  </label>
                  <GlassDatePicker
                    value={date}
                    onChange={setDate}
                    placeholder="تاریخ صدور..."
                  />
                </div>
              </div>

              {/* ۳. سه حالت محاسبه بار و کرایه حمل */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-500" />
                    ۲. حالت محاسبه بار و کرایه حمل:
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCalculationMode('MATERIAL_ONLY')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      calculationMode === 'MATERIAL_ONLY'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    فقط بار / مصالح (بدون کرایه)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalculationMode('FREIGHT_ONLY')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      calculationMode === 'FREIGHT_ONLY'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    فقط کرایه حمل / باربری
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalculationMode('COMBINED')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      calculationMode === 'COMBINED'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    ترکیبی (بار + کرایه حمل)
                  </button>
                </div>

                {/* تفکیک نحوه قیمت‌گذاری و ناوگان در حالت ترکیبی یا فقط کرایه */}
                {calculationMode !== 'MATERIAL_ONLY' && (
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 dark:border-slate-700/60 mt-2">
                    {calculationMode === 'COMBINED' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          شیوه درج مبلغ کرایه:
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFreightPricingMode('SEPARATE')}
                            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                              freightPricingMode === 'SEPARATE'
                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                                : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            مبلغ بار جدا + کرایه جدا
                          </button>
                          <button
                            type="button"
                            onClick={() => setFreightPricingMode('LUMP_SUM')}
                            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                              freightPricingMode === 'LUMP_SUM'
                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                                : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            مبلغ کل یکجا با کرایه
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        ناوگان حمل بار:
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTransportSource('EXTERNAL')}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                            transportSource === 'EXTERNAL'
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                              : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          باربری / راننده خارجی
                        </button>
                        <button
                          type="button"
                          onClick={() => setTransportSource('INTERNAL')}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                            transportSource === 'INTERNAL'
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                              : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          ناوگان داخلی خودمان
                        </button>
                      </div>
                    </div>

                    {transportSource === 'INTERNAL' && (
                      <div className="sm:col-span-2 pt-1">
                        <label className="block text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1">
                          انتخاب خودروی ناوگان داخلی (کرایه حمل به درآمد این خودرو افزوده می‌شود):
                        </label>
                        <PortalSelect
                          options={vehicleOptions}
                          value={internalVehicleId}
                          onChange={setInternalVehicleId}
                          placeholder="انتخاب خودروی داخلی..."
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ۴. موتور فرمولاسیون تبدیل واحد و بهای تمام‌شده (Unit Conversion Engine) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* ستون الف: خرید واقعی ما (Internal Cost) */}
                <div className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/80 space-y-3.5 relative">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-emerald-500" />
                      ستون الف: خرید واقعی ما (بهای تمام‌شده)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      محرمانه پیمانکار
                    </span>
                  </div>

                  {calculationMode === 'COMBINED' && freightPricingMode === 'LUMP_SUM' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        مبلغ کل یکجا (خرید بار + کرایه حمل با هم) ({currencyLabel}):
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={lumpSumInternalTotal}
                        onChange={e => setLumpSumInternalTotal(formatNumber(safeNum(e.target.value)))}
                        placeholder="۰"
                        className="w-full h-[46px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-sm outline-none text-left"
                        dir="ltr"
                      />
                    </div>
                  ) : (
                    <>
                      {calculationMode !== 'FREIGHT_ONLY' && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                              مقدار خرید:
                            </label>
                            <input
                              type="number"
                              autoComplete="off"
                              value={internalQty}
                              onChange={e => setInternalQty(e.target.value)}
                              className="w-full h-[46px] px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-sm outline-none text-center"
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                              واحد خرید:
                            </label>
                            <PortalSelect
                              options={PROCUREMENT_UNITS}
                              value={internalUnit}
                              onChange={setInternalUnit}
                              placeholder="واحد..."
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                              فی واحد خرید:
                            </label>
                            <input
                              type="text"
                              autoComplete="off"
                              value={internalUnitPrice}
                              onChange={e => setInternalUnitPrice(formatNumber(safeNum(e.target.value)))}
                              placeholder="۰"
                              className="w-full h-[46px] px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-xs outline-none text-left"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      )}

                      {calculationMode !== 'MATERIAL_ONLY' && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                            کرایه حمل واقعی ما ({currencyLabel}):
                          </label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={internalFreightCost}
                            onChange={e => setInternalFreightCost(formatNumber(safeNum(e.target.value)))}
                            placeholder="۰"
                            className="w-full h-[46px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-sm outline-none text-left"
                            dir="ltr"
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-400">جمع کل تمام‌شده برای ما:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm" dir="ltr">
                      {mathInternal.totalCost.toLocaleString('fa-IR')} {currencyLabel}
                    </span>
                  </div>
                </div>

                {/* ستون ب: فاکتور اعلامی به کارفرما (Billed Cost & Unit Conversion) */}
                <div className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/80 space-y-3.5 relative">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
                      ستون ب: فاکتور و تبدیل واحد کارفرما
                    </span>
                    {destinationType === 'PROJECT' && (
                      <label className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyBilledMarkup}
                          onChange={e => setApplyBilledMarkup(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-indigo-600"
                        />
                        اعمال سود و تبدیل
                      </label>
                    )}
                  </div>

                  {destinationType !== 'PROJECT' ? (
                    <div className="py-6 text-center text-xs font-bold text-slate-400">
                      خرید برای انبار مرکزی یا مصرف کارگاهی است؛ فاکتور کارفرما صادر نمی‌شود.
                    </div>
                  ) : !applyBilledMarkup ? (
                    <div className="py-6 text-center text-xs font-bold text-slate-400">
                      سربه‌سر (دقیقاً به قیمت تمام‌شده در صورتحساب کارفرما لحاظ می‌شود).
                    </div>
                  ) : (
                    <>
                      {calculationMode !== 'FREIGHT_ONLY' && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                              مقدار کارفرما:
                            </label>
                            <input
                              type="number"
                              autoComplete="off"
                              value={billedQty}
                              onChange={e => setBilledQty(e.target.value)}
                              className="w-full h-[46px] px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-sm outline-none text-center"
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                              واحد کارفرما:
                            </label>
                            <PortalSelect
                              options={PROCUREMENT_UNITS}
                              value={billedUnit}
                              onChange={setBilledUnit}
                              placeholder="واحد..."
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                              فی اعلامی:
                            </label>
                            <input
                              type="text"
                              autoComplete="off"
                              value={billedUnitPrice}
                              onChange={e => setBilledUnitPrice(formatNumber(safeNum(e.target.value)))}
                              placeholder="۰"
                              className="w-full h-[46px] px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-xs outline-none text-left"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      )}

                      {calculationMode !== 'MATERIAL_ONLY' && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                            کرایه اعلامی به کارفرما ({currencyLabel}):
                          </label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={billedFreightCost}
                            onChange={e => setBilledFreightCost(formatNumber(safeNum(e.target.value)))}
                            placeholder="۰"
                            className="w-full h-[46px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-sm outline-none text-left"
                            dir="ltr"
                          />
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600 dark:text-slate-400">جمع کل اعلامی به کارفرما:</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400 font-mono text-sm" dir="ltr">
                          {mathBilled.totalAmount.toLocaleString('fa-IR')} {currencyLabel}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ۵. کارت تحلیل زنده فرمولاسیون سود، زیان و قیمت تمام‌شده (Live Formula Card) */}
              <div
                className={`p-4 rounded-3xl border transition-all ${
                  arbitrageAnalysis.netProfit > 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                    : arbitrageAnalysis.netProfit < 0
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
                    : 'bg-sky-500/10 border-sky-500/30 text-sky-950 dark:text-sky-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 pb-2 border-b border-current/15">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-xs font-black">تحلیل زنده سود پنهان، بالاسری و قیمت تمام‌شده واحد:</span>
                  </div>
                  <div className="text-sm font-black font-mono" dir="ltr">
                    {arbitrageAnalysis.netProfit > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        سود خالص (آربیتراژ): +{arbitrageAnalysis.netProfit.toLocaleString('fa-IR')} {currencyLabel} ({arbitrageAnalysis.marginPercent}٪)
                      </span>
                    ) : arbitrageAnalysis.netProfit < 0 ? (
                      <span className="text-rose-600 dark:text-rose-400">
                        هشدار زیان فاکتور: {arbitrageAnalysis.netProfit.toLocaleString('fa-IR')} {currencyLabel}
                      </span>
                    ) : (
                      <span className="text-sky-600 dark:text-sky-400">سربه‌سر (به بهای تمام‌شده خالص)</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-bold opacity-90">
                  <div>
                    بهای تمام‌شده هر واحد برای ما:
                    <span className="font-mono font-black mr-1" dir="ltr">
                      {Math.round(arbitrageAnalysis.unitCostForUs).toLocaleString('fa-IR')} {currencyLabel}
                    </span>
                  </div>
                  <div>
                    سود روی بار/مصالح:
                    <span className="font-mono font-black mr-1" dir="ltr">
                      {arbitrageAnalysis.materialProfit.toLocaleString('fa-IR')} {currencyLabel}
                    </span>
                  </div>
                  <div>
                    سود روی کرایه حمل:
                    <span className="font-mono font-black mr-1" dir="ltr">
                      {arbitrageAnalysis.freightProfit.toLocaleString('fa-IR')} {currencyLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* ۶. وضعیت تسویه فاکتور و ضمائم */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* وضعیت تسویه */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-teal-500" />
                    وضعیت تسویه فاکتور:
                  </label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSettlementStatus('PENDING')}
                      className={`py-2 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        settlementStatus === 'PENDING'
                          ? 'bg-amber-500 text-white shadow-md'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                      پرداخت‌نشده / نسیه
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettlementStatus('SETTLED')}
                      className={`py-2 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        settlementStatus === 'SETTLED'
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      تسویه کامل (ثبت پرداخت)
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    {settlementStatus === 'PENDING'
                      ? 'این مبلغ به مانده‌بدهی شما به تأمین‌کننده اضافه می‌شود و از مودال پرداخت قابل تسویه است.'
                      : 'پس از ثبت فاکتور، بلافاصله سند پرداخت مالی (چک صیادی یا نقد) ثبت می‌گردد.'}
                  </p>
                </div>

                {/* تصویر فاکتور و بارنامه */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-teal-500" />
                    تصویر فاکتور یا قبض باسکول:
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    {photoBase64 ? (
                      <div className="relative group w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                        <img src={photoBase64} alt="پیش‌نمایش" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotoBase64(null)}
                          className="absolute inset-0 bg-rose-950/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="h-16 flex-1 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-teal-600 text-xs font-bold transition-all bg-white dark:bg-slate-900">
                        <Plus className="w-4 h-4" />
                        انتخاب عکس فاکتور / بارنامه
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

              </div>

              {/* توضیحات تکمیلی */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  توضیحات و مشخصات محموله (اختیاری):
                </label>
                <textarea
                  autoComplete="off"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="شماره پلاک خاور، محل دقیق تخلیه در کارگاه، نام بارنامه و..."
                  rows={2}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

            </div>

            {/* فوتر مودال */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl text-xs font-black text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white rounded-2xl text-xs font-black shadow-lg shadow-teal-500/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {editRecord ? 'به‌روزرسانی فاکتور' : 'ثبت قطعی فاکتور خرید'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* مودال پرداخت مادر (در صورت انتخاب تسویه کامل) */}
      {isPaymentModalOpen && (
        <UniversalTransactionModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            onClose();
          }}
          context={selectedSupplierId ? 'SUPPLIER' : 'GLOBAL'}
          supplierId={selectedSupplierId || undefined}
          initialDebtId={lastCreatedRecordId || undefined}
          initialAmount={paymentAmountToPass}
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
