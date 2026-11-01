import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, X, Check, Plus, Trash2, Calendar, Gauge, 
  Coins, Truck, Lock, AlertCircle, Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useLogisticsStore, 
  type VehiclePeriodicServiceRecord, 
  type PeriodicServiceItem,
  type SettlementStatus
} from '../../../store/logisticsStore';
import { 
  GlassDatePicker, 
  PortalSelect 
} from '../../../components/ui/SharedLaborUI';
import { generateUUID } from '../../../core/utils/uuid';
import { formatCurrency, getCurrencyUnit } from '../../../core/utils/currency';

interface PeriodicServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVehicleId?: string;
  serviceToEdit?: VehiclePeriodicServiceRecord | null;
}

const COMMON_SERVICE_TYPES = [
  'تعویض روغن موتور',
  'تعویض فیلتر روغن',
  'تعویض فیلتر هوا',
  'تعویض فیلتر گازوئیل / بنزین',
  'تعویض لنت ترمز',
  'تعویض روغن گیربکس و دیفرانسیل',
  'تعویض تسمه تایم و دینام',
  'مایع رادیاتور و ضدیخ',
  'لاستیک، بالانس و تنظیم باد',
  'گریس‌کاری و آچارکشی اتصالات',
  'سایر سرویس‌های دوره‌ای',
];

const TOOL_SERVICE_TYPES = [
  'تعویض ذغال و کلکتور',
  'گریسکاری و تعویض اورینگ',
  'تیزکاری / تعویض تیغه و مته',
  'تست عایق و کابل برق',
  'کالیبراسیون دقیق دستگاه',
  'سایر سرویس‌های دوره‌ای ابزار',
];

const SETTLEMENT_OPTIONS = [
  { value: 'PENDING', label: 'پرداخت نشده / در انتظار تسویه' },
  { value: 'SETTLED', label: 'تسویه کامل (ثبت پرداخت)' },
];

const formatCommaSeparated = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/[^0-9]/g, '');
  return clean ? Number(clean).toLocaleString('en-US') : '';
};

export default function PeriodicServiceModal({
  isOpen,
  onClose,
  defaultVehicleId,
  serviceToEdit,
}: PeriodicServiceModalProps) {
  const { vehicles, tools, addPeriodicService, updatePeriodicService } = useLogisticsStore();

  const targetVehicleId = defaultVehicleId || serviceToEdit?.vehicleId || '';
  const isVehicleLocked = Boolean(defaultVehicleId);

  const [vehicleId, setVehicleId] = useState(targetVehicleId);
  const isTool = (tools || []).some(t => t.id === vehicleId) || (tools || []).some(t => t.id === targetVehicleId);
  const [serviceDate, setServiceDate] = useState(() => moment().format('jYYYY/jMM/jDD'));
  const [currentOdometer, setCurrentOdometer] = useState('');
  const [settlementStatus, setSettlementStatus] = useState<SettlementStatus>('SETTLED');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<PeriodicServiceItem[]>([]);

  useEffect(() => {
    if (serviceToEdit) {
      setVehicleId(serviceToEdit.vehicleId);
      setServiceDate(serviceToEdit.serviceDate || moment().format('jYYYY/jMM/jDD'));
      setCurrentOdometer(formatCommaSeparated(serviceToEdit.currentOdometer));
      setSettlementStatus(serviceToEdit.settlementStatus);
      setPaidAmount(serviceToEdit.paidAmount ? formatCommaSeparated(serviceToEdit.paidAmount) : '');
      setNotes(serviceToEdit.notes || '');
      setItems(serviceToEdit.services || []);
    } else {
      if (targetVehicleId) {
        setVehicleId(targetVehicleId);
        const v = vehicles.find(vec => vec.id === targetVehicleId);
        if (v?.odometerOrHours) {
          setCurrentOdometer(formatCommaSeparated(v.odometerOrHours));
        }
      } else if (vehicles.length > 0 && !vehicleId) {
        setVehicleId(vehicles[0].id);
        if (vehicles[0].odometerOrHours) {
          setCurrentOdometer(formatCommaSeparated(vehicles[0].odometerOrHours));
        }
      }
      setServiceDate(moment().format('jYYYY/jMM/jDD'));
      setSettlementStatus('SETTLED');
      setPaidAmount('');
      setNotes('');
      // به عنوان پیش‌فرض ۱ ردیف اولیه سرویس ایجاد می‌کنیم
      setItems([{
        id: generateUUID(),
        serviceType: 'تعویض روغن موتور',
        cost: 0,
        currentKm: 0,
        nextDueKm: undefined,
        nextDueDate: moment().add(3, 'jMonth').format('jYYYY/jMM/jDD'),
      }]);
    }
  }, [serviceToEdit, targetVehicleId, vehicles]);

  // محاسبه مجموع کل هزینه‌ها
  const totalCost = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.cost || 0), 0);
  }, [items]);

  const handleAddItem = () => {
    const odoNum = Number(currentOdometer.replace(/,/g, '')) || 0;
    const newItem: PeriodicServiceItem = {
      id: generateUUID(),
      serviceType: 'تعویض فیلتر روغن',
      cost: 0,
      currentKm: odoNum,
      nextDueKm: odoNum > 0 ? odoNum + 5000 : undefined,
      nextDueDate: moment().add(3, 'jMonth').format('jYYYY/jMM/jDD'),
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      toast.error('حداقل یک سرفصل سرویس باید در فرم وجود داشته باشد.');
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof PeriodicServiceItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, [field]: value };
    }));
  };

  if (!isOpen) return null;

  const vehicleOptions = [
    ...vehicles.map(v => ({
      value: v.id,
      label: `${v.name} (${v.plate || 'بدون پلاک'})`,
    })),
    ...(tools || []).map(t => ({
      value: t.id,
      label: `${t.name} (سریال: ${t.serialNumber || 'نامشخص'})`,
    })),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleId) {
      toast.error('انتخاب خودرو الزامی است.');
      return;
    }

    if (!serviceDate) {
      toast.error('ثبت تاریخ سرویس الزامی است.');
      return;
    }

    if (items.length === 0) {
      toast.error('حداقل یک ردیف سرویس باید اضافه شود.');
      return;
    }

    const odoNum = Number(currentOdometer.replace(/,/g, '')) || 0;
    const rawPaid = settlementStatus === 'PARTIAL'
      ? (Number(paidAmount.replace(/,/g, '')) || 0)
      : settlementStatus === 'SETTLED' ? totalCost : 0;

    const sanitizedItems = items.map(item => ({
      ...item,
      currentKm: odoNum,
      cost: Number(item.cost) || 0,
      nextDueKm: item.nextDueKm ? Number(item.nextDueKm) : undefined,
      nextDueDate: item.nextDueDate || undefined,
    }));

    const payload = {
      vehicleId,
      serviceDate,
      currentOdometer: odoNum,
      services: sanitizedItems,
      totalCost,
      settlementStatus,
      paidAmount: rawPaid,
      notes: notes.trim() || undefined,
    };

    let newId = serviceToEdit?.id;
    if (serviceToEdit) {
      updatePeriodicService(serviceToEdit.id, payload);
      toast.success('سرویس دوره‌ای با موفقیت ویرایش شد.');
    } else {
      newId = addPeriodicService(payload);
      toast.success('سوابق سرویس دوره‌ای با موفقیت در سامانه ذخیره گردید.');
    }

    onClose();

    if (settlementStatus === 'SETTLED' && totalCost > 0) {
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('open-vehicle-payment-modal', {
          detail: { vehicleId, targetDebtId: `periodic-${newId}`, initialAmount: totalCost }
        }));
      }, 150);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-3 sm:p-5" dir="rtl">
      {/* بک‌دراپ شیشه‌ای */}
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
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border border-emerald-300/40 dark:border-emerald-500/20 shadow-[0_25px_70px_rgba(16,185,129,0.2)] overflow-hidden z-10"
      >
        {/* هدر مدال تم زمردی / سبز */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                {serviceToEdit ? 'ویرایش سرویس دوره‌ای' : (isTool ? 'ثبت سرویس و نگهداری دوره‌ای ابزار / دستگاه' : 'ثبت خدمات و سرویس‌های دوره‌ای همزمان')}
              </h2>
              <p className="text-xs text-emerald-100 font-bold mt-0.5">
                {isTool ? 'ثبت تعویض ذغال، گریس‌کاری، تیزکاری تیغه‌ها و تست‌های دوره‌ای ابزار' : 'ثبت تعویض روغن، فیلترها، لنت‌ها و پایش هوشمند سررسیدهای آتی'}
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

        {/* فرم اسکرول‌خور */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 modal-scrollbar">
          
          {/* ردیف اول: خودرو، تاریخ سرویس، کیلومتر فعلی */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/40">
            
            {/* انتخاب خودرو / دستگاه */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" /> {isTool ? 'ابزار / دستگاه *' : 'خودرو / ماشین‌آلات *'}
                </span>
                {isVehicleLocked && (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">
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

            {/* تاریخ سرویس */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" /> تاریخ انجام سرویس *
              </label>
              <GlassDatePicker
                value={serviceDate}
                onChange={setServiceDate}
                placeholder="140X/XX/XX"
              />
            </div>

            {/* کیلومتر یا ساعت فعلی دستگاه */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-emerald-600" /> {isTool ? 'کارکرد فعلی (ساعت) *' : 'کارکرد فعلی (کیلومتر) *'}
              </label>
              <input
                type="text"
                dir="ltr"
                autoComplete="off"
                value={currentOdometer}
                onChange={e => setCurrentOdometer(formatCommaSeparated(e.target.value))}
                placeholder={isTool ? 'مثلاً: 250 ساعت' : 'مثلاً: 125,000'}
                className="w-full h-[46px] px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-black text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500 text-left shadow-sm"
              />
            </div>

          </div>

          {/* جدول اقلام چندگانه سرویس */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-600" /> سرفصل‌های سرویس همزمان ({items.length} ردیف)
                </h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  می‌توانید چند خدمت را با هزینه‌ها و سررسیدهای مجزا ثبت کنید.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> افزودن ردیف سرویس
              </button>
            </div>

            {/* لیست ردیف‌های سرویس */}
            <div className="space-y-3">
              <AnimatePresence>
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout="position"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        ردیف #{index + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="حذف این ردیف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      
                      {/* نوع سرویس */}
                      <div className="sm:col-span-4">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                          نوع سرویس / تعویض
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          value={item.serviceType}
                          onChange={e => handleUpdateItem(item.id, 'serviceType', e.target.value)}
                          placeholder={isTool ? 'مثلاً: تعویض ذغال و اورهال' : 'مثلاً: تعویض روغن موتور'}
                          list={`service-types-${item.id}`}
                          className="w-full h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500"
                        />
                        <datalist id={`service-types-${item.id}`}>
                          {(isTool ? TOOL_SERVICE_TYPES : COMMON_SERVICE_TYPES).map(st => (
                            <option key={st} value={st} />
                          ))}
                        </datalist>
                      </div>

                      {/* هزینه این سرویس */}
                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                          هزینه ({getCurrencyUnit()})
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          autoComplete="off"
                          value={formatCommaSeparated(item.cost)}
                          onChange={e => handleUpdateItem(item.id, 'cost', Number(e.target.value.replace(/,/g, '')) || 0)}
                          placeholder="0"
                          className="w-full h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-black text-left text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* کیلومتر یا ساعت سررسید بعدی */}
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                          {isTool ? 'ساعت بعدی' : 'کیلومتر بعدی'}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          autoComplete="off"
                          value={item.nextDueKm ? formatCommaSeparated(item.nextDueKm) : ''}
                          onChange={e => handleUpdateItem(item.id, 'nextDueKm', Number(e.target.value.replace(/,/g, '')) || undefined)}
                          placeholder="اختیاری"
                          className="w-full h-[42px] px-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-left text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* تاریخ سررسید بعدی */}
                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                          تاریخ سررسید بعدی
                        </label>
                        <GlassDatePicker
                          value={item.nextDueDate || ''}
                          onChange={(d) => handleUpdateItem(item.id, 'nextDueDate', d)}
                          placeholder="140X/XX/XX"
                        />
                      </div>

                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* جمع کل، وضعیت تسویه و یادداشت‌ها */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">مجموع کل هزینه‌های سرویس‌ها:</span>
              <div className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalCost)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
                  وضعیت تسویه فاکتور سرویس
                </label>
                <div className="h-[46px]">
                  <PortalSelect
                    value={settlementStatus}
                    onChange={(val) => setSettlementStatus(val as SettlementStatus)}
                    options={SETTLEMENT_OPTIONS}
                    className="!h-[46px] !rounded-2xl"
                  />
                </div>
              </div>

              {settlementStatus === 'PARTIAL' && (
                <div>
                  <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-500" /> مبلغ پرداخت‌شده ({getCurrencyUnit()})
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    autoComplete="off"
                    value={paidAmount}
                    onChange={e => setPaidAmount(formatCommaSeparated(e.target.value))}
                    placeholder="مبلغ پرداختی..."
                    className="w-full h-[46px] px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-black text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500 text-left shadow-sm"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
                توضیحات و نکات سرویس (اختیاری)
              </label>
              <textarea
                rows={2}
                autoComplete="off"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={isTool ? 'توضیحات قطعات تعویضی، روغن و گریس استفاده‌شده...' : 'توضیحات برند روغن، شماره فاکتور، تعویض‌روغنی مربوطه...'}
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500 resize-none shadow-sm"
              />
            </div>

          </div>

          {/* دکمه‌های تایید و بستن */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              انصراف
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" /> {serviceToEdit ? 'ذخیره تغییرات' : 'ثبت سرویس‌ها'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>,
    document.body
  );
}
