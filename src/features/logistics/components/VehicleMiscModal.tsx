import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  FileText, X, Check, Calendar, Coins, Truck, Lock, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useLogisticsStore, 
  type VehicleMiscExpense,
  type SettlementStatus
} from '../../../store/logisticsStore';
import { 
  GlassDatePicker, 
  PortalSelect 
} from '../../../components/ui/SharedLaborUI';
import { getCurrencyUnit } from '../../../core/utils/currency';

interface VehicleMiscModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVehicleId?: string;
  expenseToEdit?: VehicleMiscExpense | null;
}

const EXPENSE_TYPE_OPTIONS = [
  { value: 'عوارض سالیانه و شهرداری', label: 'عوارض سالیانه و شهرداری' },
  { value: 'سوخت (بنزین / گازوئیل)', label: 'سوخت (بنزین / گازوئیل)' },
  { value: 'جریمه راهنمایی و رانندگی', label: 'جریمه راهنمایی و رانندگی' },
  { value: 'کارواش و نظافت', label: 'کارواش و نظافت' },
  { value: 'پارکینگ و توقفگاه', label: 'پارکینگ و توقفگاه' },
  { value: 'لوازم مصرفی جزئی', label: 'لوازم مصرفی جزئی' },
  { value: 'روغن و روانکار متفرقه', label: 'روغن و روانکار متفرقه' },
  { value: 'سایر هزینه‌های متفرقه', label: 'سایر هزینه‌های متفرقه' },
];

const TOOL_EXPENSE_TYPE_OPTIONS = [
  { value: 'حمل و جابجایی ابزار به کارگاه', label: 'حمل و جابجایی ابزار به کارگاه' },
  { value: 'روغن، روانکار و سوخت ابزار', label: 'روغن، روانکار و سوخت ابزار' },
  { value: 'ابزارآلات و ملزومات جانبی', label: 'ابزارآلات و ملزومات جانبی' },
  { value: 'بسته‌بندی و انبارداری', label: 'بسته‌بندی و انبارداری' },
  { value: 'تست فنی و ایمنی ابزار', label: 'تست فنی و ایمنی ابزار' },
  { value: 'سایر هزینه‌های جانبی ابزار', label: 'سایر هزینه‌های جانبی ابزار' },
];

const SETTLEMENT_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'پرداخت نشده / در انتظار تسویه' },
  { value: 'SETTLED', label: 'تسویه کامل (ثبت پرداخت)' },
];

const formatCommaSeparated = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/[^0-9]/g, '');
  return clean ? Number(clean).toLocaleString('en-US') : '';
};

export default function VehicleMiscModal({
  isOpen,
  onClose,
  defaultVehicleId,
  expenseToEdit,
}: VehicleMiscModalProps) {
  const { vehicles, tools, addMiscExpense, updateMiscExpense } = useLogisticsStore();

  const targetVehicleId = defaultVehicleId || expenseToEdit?.vehicleId || '';
  const isVehicleLocked = Boolean(defaultVehicleId);

  const [vehicleId, setVehicleId] = useState(targetVehicleId);
  const isTool = (tools || []).some(t => t.id === vehicleId) || (tools || []).some(t => t.id === targetVehicleId);
  const [expenseType, setExpenseType] = useState('عوارض سالیانه و شهرداری');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => moment().format('jYYYY/jMM/jDD'));
  const [settlementStatus, setSettlementStatus] = useState<SettlementStatus>('SETTLED');
  const [paidAmount, setPaidAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (expenseToEdit) {
      setVehicleId(expenseToEdit.vehicleId);
      setExpenseType(expenseToEdit.expenseType);
      setAmount(formatCommaSeparated(expenseToEdit.amount));
      setDate(expenseToEdit.date || moment().format('jYYYY/jMM/jDD'));
      setSettlementStatus(expenseToEdit.settlementStatus);
      setPaidAmount(expenseToEdit.paidAmount ? formatCommaSeparated(expenseToEdit.paidAmount) : '');
      setDescription(expenseToEdit.description || '');
    } else {
      if (targetVehicleId) {
        setVehicleId(targetVehicleId);
      } else if (vehicles.length > 0 && !vehicleId) {
        setVehicleId(vehicles[0].id);
      }
      setAmount('');
      setDate(moment().format('jYYYY/jMM/jDD'));
      setSettlementStatus('SETTLED');
      setPaidAmount('');
      setDescription('');
    }
  }, [expenseToEdit, targetVehicleId, vehicles]);

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

    const rawAmount = Number(amount.replace(/,/g, '')) || 0;
    if (rawAmount <= 0) {
      toast.error('لطفاً مبلغ معتبر هزینه جانبی را وارد کنید.');
      return;
    }

    if (!date) {
      toast.error('ثبت تاریخ الزامی است.');
      return;
    }

    const rawPaid = settlementStatus === 'PARTIAL' 
      ? (Number(paidAmount.replace(/,/g, '')) || 0)
      : settlementStatus === 'SETTLED' ? rawAmount : 0;

    const payload = {
      vehicleId,
      expenseType,
      amount: rawAmount,
      date,
      settlementStatus,
      paidAmount: rawPaid,
      description: description.trim() || undefined,
    };

    let newId = expenseToEdit?.id;
    if (expenseToEdit) {
      updateMiscExpense(expenseToEdit.id, payload);
      toast.success('هزینه جانبی با موفقیت ویرایش شد.');
    } else {
      newId = addMiscExpense(payload);
      toast.success('هزینه جانبی خودرو با موفقیت ثبت گردید.');
    }

    onClose();

    if (settlementStatus === 'SETTLED' && rawAmount > 0) {
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('open-vehicle-payment-modal', {
          detail: { vehicleId, targetDebtId: `misc-${newId}`, initialAmount: rawAmount }
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
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border border-amber-300/40 dark:border-amber-500/20 shadow-[0_25px_70px_rgba(245,158,11,0.2)] overflow-hidden z-10"
      >
        {/* هدر مدال تم نارنجی / آمبر */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {expenseToEdit ? 'ویرایش هزینه جانبی' : (isTool ? 'ثبت هزینه جانبی ابزار / دستگاه' : 'ثبت هزینه جانبی جدید')}
              </h2>
              <p className="text-xs text-amber-100 font-bold mt-0.5">
                {isTool ? 'ثبت هزینه‌های حمل، روانکارها، ملزومات مصرفی و انبارداری ابزارآلات' : 'ثبت هزینه‌های عوارض، سوخت، جریمه‌ها، پارکینگ و لوازم مصرفی خودرو'}
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

        {/* فرم ثبت */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 modal-scrollbar">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* انتخاب خودرو / دستگاه */}
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

            {/* نوع هزینه */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-500" /> {isTool ? 'سرفصل هزینه ابزار *' : 'سرفصل هزینه جانبی *'}
              </label>
              <div className="h-[46px]">
                <PortalSelect
                  value={expenseType}
                  onChange={(val) => setExpenseType(String(val))}
                  options={isTool ? TOOL_EXPENSE_TYPE_OPTIONS : EXPENSE_TYPE_OPTIONS}
                  searchable={true}
                  placeholder="انتخاب نوع هزینه..."
                  className="!h-[46px] !rounded-2xl"
                />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-50/40 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-800/40">
            
            {/* مبلغ */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" /> مبلغ هزینه ({getCurrencyUnit()}) *
              </label>
              <input
                type="text"
                dir="ltr"
                autoComplete="off"
                value={amount}
                onChange={e => setAmount(formatCommaSeparated(e.target.value))}
                placeholder="مثلاً: ۱,۲۰۰,۰۰۰"
                className="w-full h-[46px] px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-black text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 text-left shadow-sm"
              />
            </div>

            {/* تاریخ */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-500" /> تاریخ وقوع هزینه *
              </label>
              <GlassDatePicker
                value={date}
                onChange={setDate}
                placeholder="140X/XX/XX"
              />
            </div>

          </div>

          {/* وضعیت تسویه */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
                وضعیت تسویه مالی فاکتور
              </label>
              <div className="h-[46px]">
                <PortalSelect
                  value={settlementStatus}
                  onChange={(val) => setSettlementStatus(val as SettlementStatus)}
                  options={SETTLEMENT_STATUS_OPTIONS}
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
                  className="w-full h-[46px] px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-black text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 text-left shadow-sm"
                />
              </div>
            )}

          </div>

          {/* توضیحات */}
          <div>
            <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
              توضیحات و یادداشت (اختیاری)
            </label>
            <textarea
              rows={2}
              autoComplete="off"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="توضیحات تکمیلی پیرامون محل هزینه، قبض یا کد پیگیری..."
              className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 resize-none shadow-sm"
            />
          </div>

          {/* دکمه‌های پایانی */}
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
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" /> {expenseToEdit ? 'ذخیره تغییرات' : 'ثبت هزینه'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>,
    document.body
  );
}
