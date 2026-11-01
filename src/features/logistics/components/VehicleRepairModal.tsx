import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, X, Check, Plus, Trash2, Calendar, Clock, Gauge, 
  Settings, AlertTriangle, UserCheck, DollarSign, 
  Package, Phone, MapPin, Truck, Lock, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useLogisticsStore, 
  REPAIR_TYPE_LABELS, 
  DOWNTIME_STATUS_LABELS, 
  SCRAP_STATUS_LABELS,
  type RepairType, 
  type DowntimeStatus, 
  type ScrapStatus,
  type ReplacedPart,
  type SettlementStatus,
  type VehicleRepairRecord
} from '../../../store/logisticsStore';
import { useProcurementStore } from '../../../store/procurementStore';
import { 
  GlassDatePicker, 
  LuxuryTimePicker, 
  PortalSelect, 
  FloatingUndoToast,
  AnimatedCheckbox
} from '../../../components/ui/SharedLaborUI';
import { generateUUID } from '../../../core/utils/uuid';
import { formatCurrency, getCurrencyUnit } from '../../../core/utils/currency';

interface VehicleRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVehicleId?: string;
  vehicleId?: string;
  repairToEdit?: VehicleRepairRecord | null;
}

const formatCommaSeparated = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/[^0-9]/g, '');
  return clean ? Number(clean).toLocaleString('en-US') : '';
};

export default function VehicleRepairModal({ 
  isOpen, 
  onClose, 
  defaultVehicleId, 
  vehicleId: vehicleIdProp,
  repairToEdit
}: VehicleRepairModalProps) {
  const { vehicles, tools, addRepair, updateRepair } = useLogisticsStore();
  const { suppliers } = useProcurementStore();

  const targetVehicleId = defaultVehicleId || vehicleIdProp || '';
  const isVehicleLocked = Boolean(targetVehicleId);

  const [vehicleId, setVehicleId] = useState(targetVehicleId);
  const [date, setDate] = useState(() => moment().format('jYYYY/jMM/jDD'));
  const [time, setTime] = useState(() => moment().format('HH:mm'));
  
  const [repairType, setRepairType] = useState<RepairType>('ENGINE_GEARBOX');
  const [downtimeStatus, setDowntimeStatus] = useState<DowntimeStatus>('FULL_STOP');
  const [odometerOrHours, setOdometerOrHours] = useState<string>('');
  
  // قطعات تعویضی
  const [replacedParts, setReplacedParts] = useState<ReplacedPart[]>([]);
  const [newPartName, setNewPartName] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newPartScrapStatus, setNewPartScrapStatus] = useState<ScrapStatus>('SCRAP');
  const [newPartCost, setNewPartCost] = useState('');

  // سیستم حذف ایمن ۵ ثانیه‌ای قطعات تعویضی (FloatingUndoToast)
  const [undoItems, setUndoItems] = useState<{ id: string; items: string[]; expireAt: number; partName?: string }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  // هویت تعمیرکار و اتصال به تدارکات
  const [mechanicType, setMechanicType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<'CUSTOM' | string>('CUSTOM');
  const [mechanicName, setMechanicName] = useState('تعمیرگاه مرکزی شرکت');
  const [mechanicPhone, setMechanicPhone] = useState('');
  const [mechanicAddress, setMechanicAddress] = useState('');

  // هزینه‌ها
  const [wageCost, setWageCost] = useState<string>('');
  const [description, setDescription] = useState('');
  const [settlementStatus, setSettlementStatus] = useState<SettlementStatus>('PENDING');

  // تأمین‌کنندگان صنف تراشکاری و تعمیرگاه‌ها از استور تدارکات
  const workshopSuppliers = useMemo(() => {
    return suppliers.filter(s => s.category === 'WORKSHOP_MACHINING');
  }, [suppliers]);

  useEffect(() => {
    if (repairToEdit && isOpen) {
      setVehicleId(repairToEdit.vehicleId || targetVehicleId);
      setDate(repairToEdit.date || moment().format('jYYYY/jMM/jDD'));
      setTime(repairToEdit.time || moment().format('HH:mm'));
      setRepairType(repairToEdit.repairType || 'ENGINE_GEARBOX');
      setDowntimeStatus(repairToEdit.downtimeStatus || 'FULL_STOP');
      setOdometerOrHours(repairToEdit.odometerOrHours ? formatCommaSeparated(repairToEdit.odometerOrHours) : '');
      setReplacedParts(repairToEdit.replacedParts || []);
      setMechanicType(repairToEdit.mechanicInfo?.mechanicType || 'INTERNAL');
      setSelectedWorkshopId(repairToEdit.mechanicInfo?.supplierId || 'CUSTOM');
      setMechanicName(repairToEdit.mechanicInfo?.mechanicName || 'تعمیرگاه مرکزی شرکت');
      setMechanicPhone(repairToEdit.mechanicInfo?.mechanicPhone || '');
      setMechanicAddress(repairToEdit.mechanicInfo?.mechanicAddress || '');
      setWageCost(repairToEdit.wageCost ? formatCommaSeparated(repairToEdit.wageCost) : '');
      setDescription(repairToEdit.description || '');
      setSettlementStatus(repairToEdit.settlementStatus || 'PENDING');
      setPendingDeleteIds([]);
      setUndoItems([]);
    } else if (isOpen) {
      setVehicleId(targetVehicleId || vehicles[0]?.id || tools[0]?.id || '');
      setDate(moment().format('jYYYY/jMM/jDD'));
      setTime(moment().format('HH:mm'));
      setRepairType('ENGINE_GEARBOX');
      setDowntimeStatus('FULL_STOP');
      setOdometerOrHours('');
      setReplacedParts([]);
      setMechanicType('INTERNAL');
      setSelectedWorkshopId('CUSTOM');
      setMechanicName('تعمیرگاه مرکزی شرکت');
      setMechanicPhone('');
      setMechanicAddress('');
      setWageCost('');
      setDescription('');
      setSettlementStatus('PENDING');
      setPendingDeleteIds([]);
      setUndoItems([]);
    }
  }, [repairToEdit, isOpen, targetVehicleId, vehicles, tools]);

  // تایمر ۵ ثانیه‌ای جهت حذف دائمی قطعات پس از انقضا
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
        const expired = prev.filter(u => u.expireAt <= now);
        const active = prev.filter(u => u.expireAt > now);
        if (expired.length > 0) {
          const expiredPartIds = expired.flatMap(e => e.items);
          setReplacedParts(curr => curr.filter(p => !expiredPartIds.includes(p.id)));
          setPendingDeleteIds(curr => curr.filter(id => !expiredPartIds.includes(id)));
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleRemovePartWithUndo = (partId: string, partName: string) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: [partId], expireAt: Date.now() + 5000, partName }]);
    setPendingDeleteIds(prev => [...prev, partId]);
  };

  const handleCancelUndoPart = (undoId: string | number) => {
    const target = undoItems.find(u => String(u.id) === String(undoId));
    if (target) {
      setPendingDeleteIds(prev => prev.filter(id => !target.items.includes(id)));
      setUndoItems(prev => prev.filter(u => String(u.id) !== String(undoId)));
      toast.success('حذف قطعه لغو شد.');
    }
  };

  const handleWorkshopChange = (val: string | number) => {
    const strVal = String(val);
    setSelectedWorkshopId(strVal);
    if (strVal === 'CUSTOM') {
      setMechanicName('');
      setMechanicPhone('');
      setMechanicAddress('');
    } else {
      const found = workshopSuppliers.find(w => w.id === strVal);
      if (found) {
        setMechanicName(found.name + (found.managerName ? ` (${found.managerName})` : ''));
        setMechanicPhone(found.phone || '');
        setMechanicAddress(found.address || found.city || '');
        toast.info(`اطلاعات «${found.name}» از مرکز تدارکات بارگذاری شد.`);
      }
    }
  };

  if (!isOpen) return null;

  const isTool = (tools || []).some(t => t.id === vehicleId) || (tools || []).some(t => t.id === targetVehicleId);

  const vehicleOptions = [
    ...vehicles.map(v => ({
      value: v.id,
      label: `🚚 ${v.name} (${v.plate || 'بدون پلاک'})`,
    })),
    ...(tools || []).map(t => ({
      value: t.id,
      label: `🔧 ${t.name} (${t.serialNumber || 'بدون سریال'})`,
    })),
  ];

  const TOOL_REPAIR_TYPE_OPTIONS = [
    { value: 'ELECTRICAL_MOTOR', label: 'موتور الکتریکی / آرمیچر و بالشتک' },
    { value: 'GEARBOX_MECHANICAL', label: 'گیربکس و کلگی مکانیکی' },
    { value: 'ELECTRONIC_BOARD', label: 'برد الکترونیکی، کلید و کابل' },
    { value: 'HAMMER_HYDRAULIC', label: 'سیستم ضربه‌زن / پمپ هیدرولیک' },
    { value: 'GENERAL_OVERHAUL', label: 'سرویس کامل و جنرال اورهال' },
  ];

  const repairTypeOptions = Object.entries(REPAIR_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const downtimeOptions = Object.entries(DOWNTIME_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const scrapStatusOptions = Object.entries(SCRAP_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const workshopOptions = [
    { value: 'CUSTOM', label: 'ورود دستی / اوستاکار متفرقه' },
    ...workshopSuppliers.map(w => ({
      value: w.id,
      label: `${w.name} ${w.managerName ? `(مدیریت: ${w.managerName})` : ''}`,
    }))
  ];

  const activeReplacedParts = replacedParts.filter(p => !pendingDeleteIds.includes(p.id));
  const partsTotalCost = activeReplacedParts.reduce((acc, part) => acc + (part.cost || part.unitCost || 0), 0);
  const wageNum = Number(wageCost.replace(/,/g, '')) || 0;
  const grandTotalCost = partsTotalCost + wageNum;

  const handleAddPart = () => {
    if (!newPartName.trim()) {
      toast.error('لطفاً نام قطعه تعویضی را وارد کنید.');
      return;
    }
    const costNum = Number(newPartCost.replace(/,/g, '')) || 0;
    const newPart: ReplacedPart = {
      id: generateUUID(),
      partName: newPartName.trim(),
      partNumber: newPartNumber.trim() || undefined,
      scrapStatus: newPartScrapStatus,
      cost: costNum,
      unitCost: costNum,
      quantity: 1,
    };
    setReplacedParts(prev => [...prev, newPart]);
    setNewPartName('');
    setNewPartNumber('');
    setNewPartCost('');
    toast.success('قطعه تعویضی به لیست اضافه شد.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleId) {
      toast.error('انتخاب خودرو / ماشین‌آلات الزامی است.');
      return;
    }

    if (!date) {
      toast.error('ثبت تاریخ تعمیر الزامی است.');
      return;
    }

    const odoNum = Number(odometerOrHours.replace(/,/g, '')) || 0;
    const finalParts = replacedParts.filter(p => !pendingDeleteIds.includes(p.id));

    const payload = {
      vehicleId,
      date,
      time,
      repairType,
      downtimeStatus,
      replacedParts: finalParts,
      mechanicInfo: {
        mechanicType,
        mechanicName: mechanicName.trim() || 'نامشخص',
        mechanicPhone: mechanicPhone.trim() || undefined,
        mechanicAddress: mechanicAddress.trim() || undefined,
        supplierId: selectedWorkshopId !== 'CUSTOM' ? selectedWorkshopId : undefined,
      },
      odometerOrHours: odoNum,
      partsCost: partsTotalCost,
      wageCost: wageNum,
      totalCost: grandTotalCost,
      description: description.trim() || undefined,
      settlementStatus,
      paidAmount: settlementStatus === 'SETTLED' ? grandTotalCost : (repairToEdit?.paidAmount || 0),
      autoSendToFinance: false,
    };

    if (repairToEdit) {
      updateRepair(repairToEdit.id, payload);
      toast.success('سند تعمیر و نگهداری با موفقیت بروزرسانی شد.');
      onClose();
      return;
    }

    const newId = addRepair(payload);

    toast.success('سند تعمیر و نگهداری با موفقیت ثبت شد.');
    onClose();

    if (settlementStatus === 'SETTLED' && grandTotalCost > 0) {
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('open-vehicle-payment-modal', {
          detail: { vehicleId, targetDebtId: `repair-${newId}`, initialAmount: grandTotalCost }
        }));
      }, 150);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-3 sm:p-5" dir="rtl">
      {/* بک‌دراپ شیشه‌ای محو */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border border-amber-300/40 dark:border-amber-500/20 shadow-[0_25px_70px_rgba(245,158,11,0.2)] overflow-hidden z-10"
      >
        {/* سربرگ تم نارنجی / آمبر */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                {repairToEdit ? 'ویرایش سابقه تعمیر و نگهداری' : (isTool ? 'ثبت تعمیرات و سرویس ابزار / دستگاه' : 'ثبت تعمیرات و استهلاک ماشین‌آلات')}
              </h2>
              <p className="text-xs text-amber-100 font-bold mt-0.5">
                {isTool ? 'مدیریت عیوب فنی، تعویض قطعات، آرمیچر و اورهال ابزارآلات' : 'مدیریت عیوب فنی، تعویض قطعات و ثبت استهلاک ناوگان'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* بدنه فرم با اسکرولبار شیشه‌ای */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 modal-scrollbar">
          
          {/* ردیف اول: خودرو، تاریخ، ساعت */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-500" /> {isTool ? 'ابزار / دستگاه *' : 'خودرو / ماشین‌آلات *'}
                </span>
                {isVehicleLocked && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                    <Lock className="w-3 h-3" /> قفل شده از پرونده
                  </span>
                )}
              </label>
              <div className="h-[46px]">
                <PortalSelect
                  value={vehicleId}
                  onChange={(val) => setVehicleId(String(val))}
                  options={vehicleOptions}
                  placeholder={isTool ? 'انتخاب ابزار...' : 'انتخاب خودرو...'}
                  disabled={isVehicleLocked}
                  className="!h-[46px] !rounded-2xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-500" /> تاریخ وقوع عیب / ورود *
              </label>
              <GlassDatePicker
                value={date}
                onChange={setDate}
                placeholder="140X/XX/XX"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" /> ساعت ثبت
              </label>
              <LuxuryTimePicker
                value={time}
                onChange={setTime}
              />
            </div>
          </div>

          {/* ردیف دوم: دسته‌بندی فنی، وضعیت توقف، کارکرد کیلومتر/ساعت */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-800/40">
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" /> دسته‌بندی فنی تعمیر *
              </label>
              <div className="h-[46px]">
                <PortalSelect
                  value={repairType}
                  onChange={(val) => setRepairType(val as RepairType)}
                  options={isTool ? TOOL_REPAIR_TYPE_OPTIONS : repairTypeOptions}
                  placeholder="انتخاب نوع عیب..."
                  className="!h-[46px] !rounded-2xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-orange-500" /> وضعیت توقف دستگاه *
              </label>
              <div className="h-[46px]">
                <PortalSelect
                  value={downtimeStatus}
                  onChange={(val) => setDowntimeStatus(val as DowntimeStatus)}
                  options={downtimeOptions}
                  placeholder="وضعیت توقف..."
                  className="!h-[46px] !rounded-2xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-amber-600 dark:text-amber-400" /> {isTool ? 'ساعت کارکرد فعلی دستگاه' : 'کیلومتر / ساعت‌شمار کارکرد'}
              </label>
              <input
                type="text"
                dir="ltr"
                autoComplete="off"
                value={odometerOrHours}
                onChange={e => setOdometerOrHours(formatCommaSeparated(e.target.value))}
                placeholder={isTool ? 'مثلاً: 250 ساعت' : 'مثلاً: 124,500'}
                className="w-full h-[46px] px-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono font-black text-left outline-none focus:border-amber-500 shadow-sm"
              />
            </div>
          </div>

          {/* بخش سوم: اقلام و قطعات تعویضی */}
          <div className="space-y-3 bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                اقلام و قطعات تعویضی (داغی و نو)
              </h3>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                مجموع قطعات: <span className="font-mono text-amber-600 dark:text-amber-400 font-black">{formatCurrency(partsTotalCost)}</span>
              </span>
            </div>

            {/* ورودی قطعه جدید با گرید ۱۲ ستونه بدون بیرون‌زدگی دکمه */}
            <div className="grid grid-cols-12 gap-3 items-end pt-2">
              <div className="col-span-12 sm:col-span-4">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 block">نام قطعه *</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={newPartName}
                  onChange={e => setNewPartName(e.target.value)}
                  placeholder={isTool ? 'مثلاً: آرمیچر، بالشتک، ذغال، تیغه' : 'مثلاً: دیسک و صفحه، پمپ باد'}
                  className="w-full h-[46px] px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 shadow-sm"
                />
              </div>

              <div className="col-span-12 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 block">شماره فنی</label>
                <input
                  type="text"
                  dir="ltr"
                  autoComplete="off"
                  value={newPartNumber}
                  onChange={e => setNewPartNumber(e.target.value)}
                  placeholder="اختیاری"
                  className="w-full h-[46px] px-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white text-left placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 shadow-sm"
                />
              </div>

              <div className="col-span-12 sm:col-span-3">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 block">وضعیت داغی *</label>
                <div className="h-[46px]">
                  <PortalSelect
                    value={newPartScrapStatus}
                    onChange={(val) => setNewPartScrapStatus(val as ScrapStatus)}
                    options={scrapStatusOptions}
                    placeholder="وضعیت داغی..."
                    className="!h-[46px] !rounded-2xl"
                  />
                </div>
              </div>

              <div className="col-span-12 sm:col-span-3 flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 block">قیمت ({getCurrencyUnit()})</label>
                  <input
                    type="text"
                    dir="ltr"
                    autoComplete="off"
                    value={newPartCost}
                    onChange={e => setNewPartCost(formatCommaSeparated(e.target.value))}
                    placeholder="0"
                    className="w-full h-[46px] px-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white text-left placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 shadow-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddPart}
                  className="h-[46px] px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 transition-all shrink-0 cursor-pointer"
                  title="افزودن قطعه"
                >
                  <Plus className="w-4 h-4" /> افزودن
                </button>
              </div>
            </div>

            {/* لیست قطعات اضافه شده */}
            {activeReplacedParts.length > 0 && (
              <div className="space-y-2 mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
                {activeReplacedParts.map((part) => (
                  <div key={part.id} className="flex items-center justify-between p-3 bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl text-xs font-bold border border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-800 dark:text-white font-black">{part.partName}</span>
                      {part.partNumber && <span className="font-mono text-[10px] text-slate-400">#{part.partNumber}</span>}
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-lg font-black ${part.scrapStatus === 'SCRAP' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'}`}>
                        {SCRAP_STATUS_LABELS[part.scrapStatus]}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-amber-600 dark:text-amber-400 font-black">{formatCurrency(part.cost || part.unitCost || 0)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePartWithUndo(part.id, part.partName)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="حذف با مهلت ۵ ثانیه‌ای"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* بخش چهارم: هویت تعمیرکار و اتصال به تدارکات */}
          <div className="space-y-3 bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-500" />
                {isTool ? 'اطلاعات سرویس‌کار و تعمیرگاه ابزار' : 'اطلاعات مکانیک و تعمیرگاه'}
              </h3>
              {mechanicType === 'EXTERNAL' && workshopSuppliers.length > 0 && (
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {workshopSuppliers.length} تعمیرگاه ثبت‌شده در تدارکات
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">نوع واحد تعمیراتی</label>
                <div className="flex bg-slate-200/60 dark:bg-slate-900/60 p-1 rounded-xl h-[46px] items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMechanicType('INTERNAL');
                      setSelectedWorkshopId('CUSTOM');
                      setMechanicName(isTool ? 'کارگاه فنی شرکت' : 'تعمیرگاه مرکزی شرکت');
                      setMechanicPhone('');
                      setMechanicAddress('');
                    }}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                      mechanicType === 'INTERNAL'
                        ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isTool ? 'سرویس‌کار شرکت' : 'مکانیک شرکت'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMechanicType('EXTERNAL');
                      setMechanicName('');
                    }}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                      mechanicType === 'EXTERNAL'
                        ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isTool ? 'تعمیرکار بیرونی' : 'اوستاکار بیرونی'}
                  </button>
                </div>
              </div>

              {mechanicType === 'EXTERNAL' && (
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    انتخاب از تأمین‌کنندگان تدارکات (صنف تراشکاری و تعمیرگاه)
                  </label>
                  <div className="h-[46px]">
                    <PortalSelect
                      value={selectedWorkshopId}
                      onChange={handleWorkshopChange}
                      options={workshopOptions}
                      placeholder="انتخاب تعمیرگاه..."
                      className="!h-[46px] !rounded-2xl"
                    />
                  </div>
                </div>
              )}

              <div className={mechanicType === 'INTERNAL' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">نام تعمیرکار / نام تعمیرگاه *</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={mechanicName}
                  onChange={e => setMechanicName(e.target.value)}
                  readOnly={selectedWorkshopId !== 'CUSTOM' && mechanicType === 'EXTERNAL'}
                  placeholder="نام تعمیرکار..."
                  className={`w-full h-[46px] px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 shadow-sm ${
                    selectedWorkshopId !== 'CUSTOM' ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">شماره تماس</label>
                <input
                  type="text"
                  dir="ltr"
                  autoComplete="off"
                  value={mechanicPhone}
                  onChange={e => setMechanicPhone(e.target.value)}
                  readOnly={selectedWorkshopId !== 'CUSTOM' && mechanicType === 'EXTERNAL'}
                  placeholder="0912..."
                  className={`w-full h-[46px] px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 text-left shadow-sm ${
                    selectedWorkshopId !== 'CUSTOM' ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                  }`}
                />
              </div>
            </div>

            {mechanicType === 'EXTERNAL' && (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">نشانی تعمیرگاه / شهرک صنفی</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={mechanicAddress}
                  onChange={e => setMechanicAddress(e.target.value)}
                  readOnly={selectedWorkshopId !== 'CUSTOM'}
                  placeholder="تهران، جاده مخصوص، منطقه صنعتی..."
                  className={`w-full h-[46px] px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 shadow-sm ${
                    selectedWorkshopId !== 'CUSTOM' ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                  }`}
                />
              </div>
            )}
          </div>

          {/* بخش پنجم: دستمزد، شرح و اتصال مالی */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
                اجرت و دستمزد تعمیرکار ({getCurrencyUnit()})
              </label>
              <input
                type="text"
                dir="ltr"
                autoComplete="off"
                value={wageCost}
                onChange={e => setWageCost(formatCommaSeparated(e.target.value))}
                placeholder="0"
                className="w-full h-[46px] px-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-black text-left outline-none focus:border-amber-500 shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
                کل هزینه تعمیرات (قطعات + اجرت)
              </label>
              <div className="w-full h-[46px] px-4 rounded-2xl bg-amber-100/50 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-700/60 flex items-center justify-between text-amber-700 dark:text-amber-300 font-mono font-black text-base">
                <span>جمع کل:</span>
                <span>{formatCurrency(grandTotalCost)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
              توضیحات تکمیلی و شرح خرابی
            </label>
            <textarea
              autoComplete="off"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="علائم اولیه خرابی، نحوه تست و قطعات بازسازی‌شده..."
              className="w-full h-20 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium outline-none focus:border-amber-500 resize-none shadow-sm"
            />
          </div>

          {/* وضعیت تسویه فاکتور تعمیرات */}
          <div>
            <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-2 block">
              وضعیت پرداخت و تسویه فاکتور تعمیرات *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSettlementStatus('PENDING')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                  settlementStatus === 'PENDING'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div>
                  <span className="text-xs font-black block">پرداخت نشده / در انتظار تسویه</span>
                  <span className="text-[10px] opacity-75 font-medium mt-0.5 block">
                    ثبت به عنوان بدهی معوق خودرو بدون صدور سند پرداخت مالی
                  </span>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  settlementStatus === 'PENDING' ? 'border-amber-500 bg-amber-500' : 'border-slate-400'
                }`}>
                  {settlementStatus === 'PENDING' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSettlementStatus('SETTLED')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                  settlementStatus === 'SETTLED'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div>
                  <span className="text-xs font-black block">تسویه کامل (ثبت پرداخت)</span>
                  <span className="text-[10px] opacity-75 font-medium mt-0.5 block">
                    انتقال مستقیم به فرم پرداخت جهت ثبت نقدی یا چک در ماژول مالی
                  </span>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  settlementStatus === 'SETTLED' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-400'
                }`}>
                  {settlementStatus === 'SETTLED' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            </div>
          </div>

          {/* دکمه‌های پایین */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs shadow-lg shadow-amber-500/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" /> {repairToEdit ? 'ذخیره تغییرات تعمیر' : 'ثبت و صدور سند تعمیر'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* سیستم پاپ‌آپ شناور تایمردار ۵ ثانیه‌ای برای حذف قطعات (FloatingUndoToast) */}
      <FloatingUndoToast 
        undoItems={undoItems} 
        onCancel={handleCancelUndoPart} 
      />
    </div>,
    document.body
  );
}
