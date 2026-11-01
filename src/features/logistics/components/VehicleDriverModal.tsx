import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  Users, X, Check, Calendar, Coins, Truck, Lock, Calculator, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useLogisticsStore, 
  type VehicleDriverAssignment,
  type DriverWageType
} from '../../../store/logisticsStore';
import { useLaborStore } from '../../../store/laborStore';
import { 
  GlassDatePicker, 
  PortalSelect,
  AnimatedCheckbox 
} from '../../../components/ui/SharedLaborUI';
import { formatCurrency, getCurrencyUnit } from '../../../core/utils/currency';

interface VehicleDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVehicleId?: string;
  assignmentToEdit?: VehicleDriverAssignment | null;
}

const WAGE_TYPE_OPTIONS = [
  { value: 'PER_SERVICE', label: 'سرویسی (پرداخت به ازای هر سرویس باربری)' },
  { value: 'DAILY', label: 'روزمزد (دستمزد روزانه - ادغام هوشمند چند بارنامه در یک روز)' },
  { value: 'MONTHLY', label: 'حقوق ماهانه (تسویه در پرونده پرسنلی)' },
  { value: 'WEEKLY', label: 'حقوق هفتگی (تسویه در پرونده پرسنلی)' },
];

const formatCommaSeparated = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/[^0-9]/g, '');
  return clean ? Number(clean).toLocaleString('en-US') : '';
};

export default function VehicleDriverModal({
  isOpen,
  onClose,
  defaultVehicleId,
  assignmentToEdit,
}: VehicleDriverModalProps) {
  const { vehicles, assignDriver, updateDriverAssignment } = useLogisticsStore();
  const allWorkers = useLaborStore(state => state.workers) || [];

  const targetVehicleId = defaultVehicleId || assignmentToEdit?.vehicleId || '';
  const isVehicleLocked = Boolean(defaultVehicleId);

  const [vehicleId, setVehicleId] = useState(targetVehicleId);
  const [driverId, setDriverId] = useState('');
  const [wageType, setWageType] = useState<DriverWageType>('PER_SERVICE');
  const [serviceCount, setServiceCount] = useState('1');
  const [unitRate, setUnitRate] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [assignedDate, setAssignedDate] = useState(() => moment().format('jYYYY/jMM/jDD'));
  const [notes, setNotes] = useState('');

  // استخراج رانندگان از استور نیروی کار (laborStore)
  const driverOptions = React.useMemo(() => {
    // نیروهای فعال که تخصص رانندگی دارند یا کلیه نیروهای فعال در صورت نبود تگ
    const activeWorkers = allWorkers.filter(w => w.status === 'ACTIVE');
    return activeWorkers.map(w => ({
      value: w.id,
      label: `${w.name} ${w.lastName} ${w.phone1 ? `(${w.phone1})` : ''}`,
    }));
  }, [allWorkers]);

  useEffect(() => {
    if (assignmentToEdit) {
      setVehicleId(assignmentToEdit.vehicleId);
      setDriverId(assignmentToEdit.driverId);
      setWageType(assignmentToEdit.wageType);
      setServiceCount(String(assignmentToEdit.serviceCount || 1));
      setUnitRate(formatCommaSeparated(assignmentToEdit.unitRate));
      setIsPaid(assignmentToEdit.isPaid);
      setAssignedDate(assignmentToEdit.assignedDate || moment().format('jYYYY/jMM/jDD'));
      setNotes(assignmentToEdit.notes || '');
    } else {
      if (targetVehicleId) {
        setVehicleId(targetVehicleId);
      } else if (vehicles.length > 0 && !vehicleId) {
        setVehicleId(vehicles[0].id);
      }
      if (driverOptions.length > 0 && !driverId) {
        setDriverId(driverOptions[0].value);
      }
      setWageType('PER_SERVICE');
      setServiceCount('1');
      setUnitRate('');
      setIsPaid(false);
      setAssignedDate(moment().format('jYYYY/jMM/jDD'));
      setNotes('');
    }
  }, [assignmentToEdit, targetVehicleId, vehicles, driverOptions]);

  // محاسبه خودکار دستمزد کل سرویسی یا روزمزد
  const totalWage = React.useMemo(() => {
    const rate = Number(unitRate.replace(/,/g, '')) || 0;
    if (wageType === 'PER_SERVICE') {
      const count = Number(serviceCount) || 0;
      return count * rate;
    }
    if (wageType === 'DAILY') {
      return rate;
    }
    return 0;
  }, [wageType, serviceCount, unitRate]);

  if (!isOpen) return null;

  const vehicleOptions = vehicles.map(v => ({
    value: v.id,
    label: `${v.name} (${v.plate || 'بدون پلاک'})`,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleId) {
      toast.error('انتخاب خودرو الزامی است.');
      return;
    }

    if (!driverId) {
      toast.error('انتخاب راننده الزامی است.');
      return;
    }

    const selectedWorker = allWorkers.find(w => w.id === driverId);
    const driverName = selectedWorker 
      ? `${selectedWorker.name} ${selectedWorker.lastName}`.trim()
      : 'راننده ثبت‌شده';

    const sCount = Number(serviceCount) || 1;
    const uRate = Number(unitRate.replace(/,/g, '')) || 0;

    const payload = {
      vehicleId,
      driverId,
      driverName,
      wageType,
      serviceCount: wageType === 'PER_SERVICE' ? sCount : (wageType === 'DAILY' ? 1 : 0),
      unitRate: (wageType === 'PER_SERVICE' || wageType === 'DAILY') ? uRate : 0,
      totalWage,
      isPaid: (wageType === 'PER_SERVICE' || wageType === 'DAILY') ? isPaid : true,
      assignedDate,
      notes: notes.trim() || undefined,
    };

    if (assignmentToEdit) {
      updateDriverAssignment(assignmentToEdit.id, payload);
      toast.success('اطلاعات انتساب راننده ویرایش شد.');
    } else {
      assignDriver(payload);
      toast.success('راننده با موفقیت به این خودرو منتسب گردید.');
    }

    onClose();
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
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border border-blue-300/40 dark:border-blue-500/20 shadow-[0_25px_70px_rgba(37,99,235,0.2)] overflow-hidden z-10"
      >
        {/* هدر مدال تم آبی / نیلی */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {assignmentToEdit ? 'ویرایش انتساب راننده' : 'انتساب راننده به خودرو'}
              </h2>
              <p className="text-xs text-blue-100 font-bold mt-0.5">
                تعیین شیوه تسویه حساب و اتصال به دیتابیس جامع پرسنلی
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

        {/* فرم */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 modal-scrollbar">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* خودرو */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-500" /> خودرو / ماشین‌آلات *
                </span>
                {isVehicleLocked && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                    <Lock className="w-3 h-3" /> قفل پرونده
                  </span>
                )}
              </label>
              <div className="h-[46px]">
                <PortalSelect
                  value={vehicleId}
                  onChange={(val) => setVehicleId(String(val))}
                  options={vehicleOptions}
                  placeholder="انتخاب خودرو..."
                  disabled={isVehicleLocked}
                  className="!h-[46px] !rounded-2xl"
                />
              </div>
            </div>

            {/* راننده از laborStore */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" /> راننده (از مرکز پرسنلی) *
              </label>
              <div className="h-[46px]">
                <PortalSelect
                  value={driverId}
                  onChange={(val) => setDriverId(String(val))}
                  options={driverOptions}
                  searchable={true}
                  placeholder="جستجو و انتخاب راننده..."
                  className="!h-[46px] !rounded-2xl"
                />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/40 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200/50 dark:border-blue-800/40">
            
            {/* نوع دستمزد */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
                ساختار پرداخت و قرارداد راننده *
              </label>
              <div className="h-[46px]">
                <PortalSelect
                  value={wageType}
                  onChange={(val) => setWageType(val as DriverWageType)}
                  options={WAGE_TYPE_OPTIONS}
                  className="!h-[46px] !rounded-2xl"
                />
              </div>
            </div>

            {/* تاریخ انتساب */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-500" /> تاریخ انتساب / شیفت *
              </label>
              <GlassDatePicker
                value={assignedDate}
                onChange={setAssignedDate}
                placeholder="140X/XX/XX"
              />
            </div>

          </div>

          {/* فیلدهای اختصاصی راننده سرویسی یا روزمزد */}
          {wageType === 'PER_SERVICE' ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
                    تعداد سرویس‌های انجام‌شده
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={serviceCount}
                    onChange={e => setServiceCount(e.target.value)}
                    className="w-full h-[46px] px-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white text-center outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-blue-500" /> نرخ هر سرویس ({getCurrencyUnit()})
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={unitRate}
                    onChange={e => setUnitRate(formatCommaSeparated(e.target.value))}
                    placeholder="مثلاً: 450,000"
                    className="w-full h-[46px] px-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-black text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 text-left shadow-sm"
                  />
                </div>

              </div>

              {/* محاسبه کل */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">مجموع دستمزد سرویس‌ها:</span>
                  <span className="font-mono text-base font-black text-blue-600 dark:text-blue-400">
                    {formatCurrency(totalWage)}
                  </span>
                </div>

                <div 
                  onClick={() => setIsPaid(!isPaid)}
                  className="flex items-center gap-2.5 cursor-pointer select-none bg-white/70 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 transition-colors"
                >
                  <AnimatedCheckbox
                    checked={isPaid}
                    onChange={() => setIsPaid(!isPaid)}
                    theme="amber"
                  />
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                    دستمزد سرویس تسویه و پرداخت شده است
                  </span>
                </div>
              </div>

            </div>
          ) : wageType === 'DAILY' ? (
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 space-y-4">
              <div>
                <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-500" /> نرخ دستمزد هر روز کاری ({getCurrencyUnit()})
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={unitRate}
                  onChange={e => setUnitRate(formatCommaSeparated(e.target.value))}
                  placeholder="مثلاً: 800,000"
                  className="w-full h-[46px] px-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800/60 text-xs font-mono font-black text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-amber-500 text-left shadow-sm"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-200 leading-relaxed">
                  هوشمندسازی ادغام لاگ‌ها: اگر در یک تاریخ، چند بارنامه یا تردد توسط این راننده برای این خودرو ثبت شود، موتور مالی سیستم به صورت خودکار آنها را در یک شیفت کاری محاسبه کرده و دستمزد روزانه را فقط یک‌بار اعمال می‌کند.
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/40">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">دستمزد هر روز:</span>
                  <span className="font-mono text-base font-black text-amber-600 dark:text-amber-400">
                    {formatCurrency(totalWage)}
                  </span>
                </div>

                <div 
                  onClick={() => setIsPaid(!isPaid)}
                  className="flex items-center gap-2.5 cursor-pointer select-none bg-white/70 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 hover:border-amber-400 transition-colors"
                >
                  <AnimatedCheckbox
                    checked={isPaid}
                    onChange={() => setIsPaid(!isPaid)}
                    theme="amber"
                  />
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                    دستمزد روزانه تسویه و پرداخت شده است
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs font-bold text-amber-800 dark:text-amber-200 leading-relaxed">
                راننده به عنوان حقوق‌بگیر {wageType === 'MONTHLY' ? 'ماهانه' : 'هفتگی'} ثبت می‌شود. محاسبات حقوق و تسویه حساب مالی به صورت تجمیعی در پرونده پرسنلی وی در بخش «نیروی کار» مدیریت خواهد شد.
              </div>
            </div>
          )}

          {/* یادداشت */}
          <div>
            <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
              توضیحات و شیفت کاری (اختیاری)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="توضیحات تکمیلی، مسیرهای تردد یا شماره بارنامه..."
              className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 resize-none shadow-sm"
            />
          </div>

          {/* دکمه‌ها */}
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
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" /> {assignmentToEdit ? 'ذخیره تغییرات' : 'انتساب راننده'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>,
    document.body
  );
}
