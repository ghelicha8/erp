import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Coins, Calendar, Banknote, FileSignature, 
  Wrench, ShieldAlert, Settings, FileText, Users, ArrowDownRight, 
  Sparkles, CheckCircle2, Clock, AlertTriangle, Info, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useLogisticsStore, 
  REPAIR_TYPE_LABELS,
  INSURANCE_TYPE_LABELS,
  type SettlementStatus 
} from '../../../store/logisticsStore';
import { useFinanceStore } from '../../../store/financeStore';
import { 
  GlassDatePicker, 
  PortalSelect, 
  AnimatedCheckbox 
} from '../../../components/ui/SharedLaborUI';
import { formatCurrency, getCurrencyUnit } from '../../../core/utils/currency';

interface VehiclePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  initialDebtId?: string;
  initialAmount?: number;
}

export type DebtCategory = 'REPAIR' | 'INSURANCE' | 'PERIODIC' | 'MISC' | 'DRIVER_WAGE';

export interface UnpaidDebtItem {
  id: string; // شناسه منحصر‌به‌فرد آیتم در جدول
  rawId: string;
  category: DebtCategory;
  categoryLabel: string;
  title: string;
  date: string; // تاریخ جهت مرتب‌سازی FIFO
  totalCost: number;
  paidAmount: number;
  remainingAmount: number;
  extraMeta?: any;
  sourceRecord: any;
}

const PAYMENT_TYPE_OPTIONS = [
  { value: 'CASH', label: 'نقدی / واریز به حساب' },
  { value: 'CHEQUE', label: 'چک بانکی / صیادی' },
];

export default function VehiclePaymentModal({ 
  isOpen, 
  onClose, 
  vehicleId,
  initialDebtId,
  initialAmount
}: VehiclePaymentModalProps) {
  const { 
    vehicles, 
    tools,
    toolRentals,
    repairs, 
    insurances, 
    periodicServices, 
    miscExpenses, 
    driverAssignments,
    updateRepair,
    updateInsurance,
    toggleInstallmentPaid,
    updatePeriodicService,
    updateMiscExpense,
    updateDriverAssignment,
    updateToolRental
  } = useLogisticsStore();

  const addTransaction = useFinanceStore(state => state.addTransaction);

  const vehicle = vehicles.find(v => v.id === vehicleId) || (tools || []).find(t => t.id === vehicleId);

  // استیت فرم پرداخت
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [paymentDate, setPaymentDate] = useState(moment().format('jYYYY/jMM/jDD'));
  const [paymentType, setPaymentType] = useState<'CASH' | 'CHEQUE'>('CASH');
  const [description, setDescription] = useState('');
  const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>([]);

  // استیت چک صیادی
  const [chequeBank, setChequeBank] = useState('بانک ملت');
  const [chequeSayyad, setChequeSayyad] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState(() => moment().add(1, 'jMonth').format('jYYYY/jMM/jDD'));

  useEffect(() => {
    if (isOpen) {
      if (initialDebtId) {
        setSelectedDebtIds([initialDebtId]);
      }
      if (initialAmount !== undefined && initialAmount > 0) {
        setPaymentAmountStr(initialAmount.toLocaleString('en-US'));
      }
    }
  }, [isOpen, initialDebtId, initialAmount]);

  // استخراج کل بدهی‌های پرداخت‌نشده این خودرو
  const { unpaidDebts, monthlyDrivers } = useMemo(() => {
    const list: UnpaidDebtItem[] = [];

    // ۱. فاکتورهای تعمیرات
    (repairs || []).filter(r => r.vehicleId === vehicleId).forEach(r => {
      const isSettled = r.settlementStatus === 'SETTLED' && (r.paidAmount || 0) >= r.totalCost;
      if (!isSettled) {
        const paid = r.paidAmount || 0;
        const remaining = Math.max(0, r.totalCost - paid);
        if (remaining > 0) {
          list.push({
            id: `repair-${r.id}`,
            rawId: r.id,
            category: 'REPAIR',
            categoryLabel: 'فاکتور تعمیرات',
            title: `تعمیر: ${REPAIR_TYPE_LABELS[r.repairType] || r.repairType} (${r.mechanicInfo?.mechanicName || 'تعمیرگاه'})`,
            date: r.date,
            totalCost: r.totalCost,
            paidAmount: paid,
            remainingAmount: remaining,
            sourceRecord: r
          });
        }
      }
    });

    // ۲. اقساط بیمه‌نامه
    (insurances || []).filter(ins => ins.vehicleId === vehicleId).forEach(ins => {
      if (ins.paymentMode === 'INSTALLMENT') {
        (ins.installments || []).forEach(inst => {
          if (!inst.isPaid) {
            list.push({
              id: `ins-${ins.id}-${inst.id}`,
              rawId: inst.id,
              category: 'INSURANCE',
              categoryLabel: 'قسط بیمه',
              title: `قسط ${inst.installmentNumber} بیمه ${ins.companyName} (${INSURANCE_TYPE_LABELS[ins.insuranceType] || ins.insuranceType})`,
              date: inst.dueDate,
              totalCost: inst.amount,
              paidAmount: 0,
              remainingAmount: inst.amount,
              extraMeta: { insuranceId: ins.id },
              sourceRecord: inst
            });
          }
        });
      } else {
        // بیمه یکجا
        const isSettled = (ins as any).settlementStatus === 'SETTLED';
        if (!isSettled && (ins.totalAmount || 0) > 0) {
          list.push({
            id: `ins-lump-${ins.id}`,
            rawId: ins.id,
            category: 'INSURANCE',
            categoryLabel: 'بیمه یکجا',
            title: `بیمه ${ins.companyName} (${INSURANCE_TYPE_LABELS[ins.insuranceType] || ins.insuranceType})`,
            date: ins.startDate,
            totalCost: ins.totalAmount,
            paidAmount: 0,
            remainingAmount: ins.totalAmount,
            sourceRecord: ins
          });
        }
      }
    });

    // ۳. خدمات و سرویس‌های دوره‌ای
    (periodicServices || []).filter(p => p.vehicleId === vehicleId).forEach(p => {
      const isSettled = p.settlementStatus === 'SETTLED';
      if (!isSettled) {
        const paid = p.paidAmount || 0;
        const remaining = Math.max(0, p.totalCost - paid);
        if (remaining > 0) {
          const serviceNames = (p.services || []).map(s => s.serviceType).join('، ');
          list.push({
            id: `periodic-${p.id}`,
            rawId: p.id,
            category: 'PERIODIC',
            categoryLabel: 'سرویس دوره‌ای',
            title: `سرویس دوره‌ای (${serviceNames || 'سرویس روغن/فیلتر'})`,
            date: p.serviceDate,
            totalCost: p.totalCost,
            paidAmount: paid,
            remainingAmount: remaining,
            sourceRecord: p
          });
        }
      }
    });

    // ۴. هزینه‌های جانبی (سوخت، جریمه، عوارض و...)
    (miscExpenses || []).filter(m => m.vehicleId === vehicleId).forEach(m => {
      const isSettled = m.settlementStatus === 'SETTLED';
      if (!isSettled) {
        const paid = m.paidAmount || 0;
        const remaining = Math.max(0, m.amount - paid);
        if (remaining > 0) {
          list.push({
            id: `misc-${m.id}`,
            rawId: m.id,
            category: 'MISC',
            categoryLabel: 'هزینه جانبی',
            title: `${m.expenseType} ${m.description ? `(${m.description})` : ''}`,
            date: m.date,
            totalCost: m.amount,
            paidAmount: paid,
            remainingAmount: remaining,
            sourceRecord: m
          });
        }
      }
    });

    // ۵. دستمزد رانندگان سرویسی و روزمزد
    const monthly: any[] = [];
    (driverAssignments || []).filter(d => d.vehicleId === vehicleId).forEach(d => {
      if (d.wageType === 'PER_SERVICE' || d.wageType === 'DAILY') {
        if (!d.isPaid && d.totalWage > 0) {
          list.push({
            id: `driver-${d.id}`,
            rawId: d.id,
            category: 'DRIVER_WAGE',
            categoryLabel: d.wageType === 'DAILY' ? 'دستمزد روزمزد' : 'دستمزد راننده',
            title: d.wageType === 'DAILY' 
              ? `دستمزد روزمزد: ${d.driverName}`
              : `دستمزد راننده: ${d.driverName} (${d.serviceCount} سرویس)`,
            date: d.assignedDate,
            totalCost: d.totalWage,
            paidAmount: 0,
            remainingAmount: d.totalWage,
            sourceRecord: d
          });
        }
      } else {
        monthly.push(d);
      }
    });

    // ۶. دستمزد اپراتورهای اجاره ابزارآلات
    (toolRentals || []).filter(r => r.toolId === vehicleId && r.hasOperator && r.operatorSettlementStatus !== 'SETTLED').forEach(r => {
      const paid = r.operatorPaidAmount || 0;
      const remaining = Math.max(0, (r.operatorTotalWage || 0) - paid);
      if (remaining > 0) {
        list.push({
          id: `rental-op-${r.id}`,
          rawId: r.id,
          category: 'DRIVER_WAGE',
          categoryLabel: 'دستمزد اپراتور',
          title: `دستمزد اپراتور: ${r.operatorName || 'اپراتور'} (${r.counterpartyName})`,
          date: r.startDate,
          totalCost: r.operatorTotalWage || 0,
          paidAmount: paid,
          remainingAmount: remaining,
          extraMeta: { isToolOperator: true },
          sourceRecord: r
        });
      }
    });

    // مرتب‌سازی صعودی بر اساس تاریخ سررسید (FIFO)
    list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    return { unpaidDebts: list, monthlyDrivers: monthly };
  }, [repairs, insurances, periodicServices, miscExpenses, driverAssignments, toolRentals, vehicleId]);

  // کل مانده کل بدهی‌ها
  const totalOutstandingDebt = useMemo(() => {
    return unpaidDebts.reduce((sum, item) => sum + item.remainingAmount, 0);
  }, [unpaidDebts]);

  // مدیریت انتخاب آیتم‌ها و درج مبلغ خودکار بدون قفل کردن فیلد
  const handleToggleSelectDebt = (debtId: string) => {
    setSelectedDebtIds(prev => {
      const next = prev.includes(debtId) ? prev.filter(id => id !== debtId) : [...prev, debtId];
      // محاسبه جمع کل مانده اقلام انتخاب‌شده
      const sum = unpaidDebts
        .filter(d => next.includes(d.id))
        .reduce((acc, d) => acc + d.remainingAmount, 0);
      
      if (sum > 0) {
        setPaymentAmountStr(sum.toLocaleString('en-US'));
      } else if (next.length === 0) {
        setPaymentAmountStr('');
      }
      return next;
    });
  };

  const handleSelectAllDebts = () => {
    if (selectedDebtIds.length === unpaidDebts.length) {
      setSelectedDebtIds([]);
      setPaymentAmountStr('');
    } else {
      const allIds = unpaidDebts.map(d => d.id);
      setSelectedDebtIds(allIds);
      setPaymentAmountStr(totalOutstandingDebt.toLocaleString('en-US'));
    }
  };

  const enteredAmount = useMemo(() => {
    const clean = paymentAmountStr.replace(/[^0-9]/g, '');
    return clean ? parseInt(clean, 10) : 0;
  }, [paymentAmountStr]);

  // پیش‌نمایش زنده تخصیص هوشمند (Allocation Simulation Preview)
  const allocationPreview = useMemo(() => {
    if (enteredAmount <= 0 || unpaidDebts.length === 0) return [];

    let budget = enteredAmount;
    const result: { item: UnpaidDebtItem; willPay: number; nextStatus: 'SETTLED' | 'PARTIAL' }[] = [];

    // فاز ۱: اگر اقلام خاصی انتخاب شده باشند، اولویت با آنهاست
    const priorityItems = selectedDebtIds.length > 0 
      ? unpaidDebts.filter(d => selectedDebtIds.includes(d.id))
      : [];

    priorityItems.forEach(item => {
      if (budget <= 0) return;
      const willPay = Math.min(budget, item.remainingAmount);
      budget -= willPay;
      const isFull = (item.paidAmount + willPay) >= item.totalCost;
      result.push({ item, willPay, nextStatus: isFull ? 'SETTLED' : 'PARTIAL' });
    });

    // فاز ۲: بودجه باقیمانده به روش FIFO روی سایر اقلام بدهی می‌نشیند
    if (budget > 0) {
      const alreadyHandledIds = priorityItems.map(p => p.id);
      const remainingItems = unpaidDebts.filter(d => !alreadyHandledIds.includes(d.id));

      remainingItems.forEach(item => {
        if (budget <= 0) return;
        const willPay = Math.min(budget, item.remainingAmount);
        budget -= willPay;
        const isFull = (item.paidAmount + willPay) >= item.totalCost;
        result.push({ item, willPay, nextStatus: isFull ? 'SETTLED' : 'PARTIAL' });
      });
    }

    return result;
  }, [enteredAmount, unpaidDebts, selectedDebtIds]);

  // ثبت و اجرای موتور تخصیص
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (enteredAmount <= 0) {
      toast.error('لطفاً مبلغ پرداختی معتبری وارد کنید.');
      return;
    }

    if (!paymentDate) {
      toast.error('ثبت تاریخ پرداخت الزامی است.');
      return;
    }

    if (unpaidDebts.length === 0) {
      toast.error('هیچ بدهی پرداخت‌نشده‌ای برای این خودرو یافت نشد.');
      return;
    }

    // ۱. اعمال تغییرات روی استور بر اساس تخصیص انجام‌شده
    allocationPreview.forEach(({ item, willPay, nextStatus }) => {
      if (item.category === 'REPAIR') {
        const newPaid = item.paidAmount + willPay;
        updateRepair(item.rawId, {
          paidAmount: newPaid,
          settlementStatus: nextStatus
        });
      } else if (item.category === 'INSURANCE') {
        if (item.extraMeta?.insuranceId) {
          // قسط بیمه
          if (willPay >= item.remainingAmount) {
            toggleInstallmentPaid(item.extraMeta.insuranceId, item.rawId);
          }
        } else {
          // بیمه یکجا
          const newPaid = item.paidAmount + willPay;
          updateInsurance(item.rawId, {
            paidAmount: newPaid,
            settlementStatus: nextStatus
          });
        }
      } else if (item.category === 'PERIODIC') {
        const newPaid = item.paidAmount + willPay;
        updatePeriodicService(item.rawId, {
          paidAmount: newPaid,
          settlementStatus: nextStatus
        });
      } else if (item.category === 'MISC') {
        const newPaid = item.paidAmount + willPay;
        updateMiscExpense(item.rawId, {
          paidAmount: newPaid,
          settlementStatus: nextStatus
        });
      } else if (item.category === 'DRIVER_WAGE') {
        if (item.extraMeta?.isToolOperator) {
          const newPaid = item.paidAmount + willPay;
          updateToolRental(item.rawId, {
            operatorPaidAmount: newPaid,
            operatorSettlementStatus: nextStatus
          });
        } else if (willPay >= item.remainingAmount) {
          updateDriverAssignment(item.rawId, { isPaid: true });
        }
      }
    });

    // ۲. ثبت سند پرداخت خروجی در ماژول مالی
    addTransaction({
      referenceId: vehicleId,
      direction: 'OUT',
      amount: enteredAmount,
      date: paymentDate,
      type: paymentType,
      description: description.trim() || `تسویه هوشمند بدهی‌های ناوگان (${vehicle?.name || 'خودرو'})`,
      chequeDetails: paymentType === 'CHEQUE' ? {
        bankName: chequeBank.trim() || 'بانک ملت',
        sayyadId: chequeSayyad.trim() || undefined,
        dueDate: chequeDueDate || paymentDate,
        status: 'PENDING',
        history: []
      } : undefined,
      allocations: [
        {
          id: `alloc-${Date.now()}`,
          amount: enteredAmount,
          allocationType: 'PROJECT',
          recordType: 'LOGISTICS',
          recordId: vehicleId,
          description: 'تسویه بدهی و هزینه‌های ناوگان'
        }
      ]
    });

    toast.success(`مبلغ ${formatCurrency(enteredAmount)} با موفقیت پرداخت و بدهی‌های مربوطه تسویه شد.`);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-3 sm:p-5" dir="rtl">
      
      {/* بک‌دراپ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border border-amber-300/40 dark:border-amber-500/20 shadow-[0_25px_70px_rgba(245,158,11,0.2)] overflow-hidden z-10"
      >
        
        {/* هدر مدال تم کهربایی / طلایی مالی */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                موتور هوشمند تسویه بدهی‌های خودرو
              </h2>
              <p className="text-xs text-amber-100 font-bold mt-0.5">
                تخصیص انتخابی یا خودکار بر اساس اولویت تاریخ (FIFO) برای تعمیرات، بیمه، سرویس و راننده
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

        {/* فرم و محتوا */}
        <form onSubmit={handleSubmitPayment} className="p-6 overflow-y-auto modal-scrollbar space-y-6 flex-1">
          
          {/* کارت وضعیت کل بدهی */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                مجموع کل بدهی‌های سررسیدشده و پرداخت‌نشده این خودرو:
              </span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
                {formatCurrency(totalOutstandingDebt)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {unpaidDebts.length} فقره بدهی معوق
              </span>
            </div>
          </div>

          {/* فیلدهای ورودی پرداخت */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* مبلغ پرداختی (قابل ویرایش آزادانه) */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
                مبلغ پرداختی ({getCurrencyUnit()}) *
              </label>
              <input
                type="text"
                dir="ltr"
                value={paymentAmountStr}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setPaymentAmountStr(val ? Number(val).toLocaleString('en-US') : '');
                }}
                placeholder="0"
                className="w-full h-[46px] px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-black text-base text-left outline-none focus:border-amber-500 shadow-sm"
              />
              <span className="text-[10px] text-slate-400 font-bold mt-1 block">
                مبلغ را به دلخواه کم یا زیاد وارد کنید؛ سیستم مازاد را خودکار تخصیص می‌دهد.
              </span>
            </div>

            {/* تاریخ پرداخت */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
                تاریخ پرداخت *
              </label>
              <GlassDatePicker
                value={paymentDate}
                onChange={setPaymentDate}
                placeholder="140X/XX/XX"
              />
            </div>

            {/* روش پرداخت */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
                روش پرداخت
              </label>
              <PortalSelect
                value={paymentType}
                onChange={setPaymentType}
                options={PAYMENT_TYPE_OPTIONS}
                className="!h-[46px] !rounded-2xl"
              />
            </div>

          </div>

          {/* فیلدهای اختصاصی چک صیادی */}
          {paymentType === 'CHEQUE' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"
            >
              <div>
                <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
                  بانک صادرکننده چک
                </label>
                <input
                  type="text"
                  value={chequeBank}
                  onChange={e => setChequeBank(e.target.value)}
                  placeholder="بانک ملت، ملی، صادرات..."
                  className="w-full h-[44px] px-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
                  شناسه ۱۶ رقمی صیادی
                </label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={16}
                  value={chequeSayyad}
                  onChange={e => setChequeSayyad(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="1234567890123456"
                  className="w-full h-[44px] px-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 text-left shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
                  تاریخ سررسید چک *
                </label>
                <GlassDatePicker
                  value={chequeDueDate}
                  onChange={setChequeDueDate}
                  placeholder="140X/XX/XX"
                />
              </div>
            </motion.div>
          )}

          {/* توضیحات */}
          <div>
            <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
              توضیحات و بابت پرداخت
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="مثلاً: تسویه بدهی‌های معوق فصل پاییز..."
              className="w-full h-[44px] px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-amber-500 shadow-sm"
            />
          </div>

          {/* جدول لیست بدهی‌های باز جهت انتخاب یا تخصیص FIFO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span>فهرست فاکتورها و اقساط پرداخت‌نشده</span>
                <span className="text-xs text-slate-400 font-normal">
                  (می‌توانید فاکتورهای مدنظر را تیک بزنید تا مبلغ آنها درج شود)
                </span>
              </h3>

              {unpaidDebts.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllDebts}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  {selectedDebtIds.length === unpaidDebts.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                </button>
              )}
            </div>

            {unpaidDebts.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/40">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                  تمامی بدهی‌ها، اقساط و فاکتورهای این خودرو قبلاً تسویه شده‌اند!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto modal-scrollbar p-1">
                {unpaidDebts.map(debt => {
                  const isChecked = selectedDebtIds.includes(debt.id);
                  const inPreview = allocationPreview.find(p => p.item.id === debt.id);

                  return (
                    <div
                      key={debt.id}
                      onClick={() => handleToggleSelectDebt(debt.id)}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isChecked 
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <AnimatedCheckbox
                          checked={isChecked}
                          onChange={() => handleToggleSelectDebt(debt.id)}
                          theme="amber"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {debt.categoryLabel}
                            </span>
                            <span className="text-xs font-black text-slate-800 dark:text-white">
                              {debt.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                            <span>سررسید: {debt.date}</span>
                            <span>کل: {formatCurrency(debt.totalCost)}</span>
                            {debt.paidAmount > 0 && (
                              <span className="text-emerald-600">پرداخت قبلی: {formatCurrency(debt.paidAmount)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <span className="text-xs font-mono font-black text-rose-600 dark:text-rose-400 block">
                          مانده: {formatCurrency(debt.remainingAmount)}
                        </span>
                        {inPreview && (
                          <span className={`text-[10px] font-bold block mt-0.5 ${
                            inPreview.nextStatus === 'SETTLED' ? 'text-emerald-500' : 'text-amber-500'
                          }`}>
                            +{formatCurrency(inPreview.willPay)} ({inPreview.nextStatus === 'SETTLED' ? 'تسویه کامل' : 'تسویه بخشی'})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ارجاع به رانندگان با حقوق ثابت ماهانه */}
          {monthlyDrivers.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/40 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">رانندگان تحت قرارداد حقوق ماهانه / هفتگی:</span>
                <span>
                  رانندگانی نظیر {monthlyDrivers.map(d => `«${d.driverName}»`).join('، ')} دارای قرارداد حقوق ثابت هستند؛ محاسبه و تسویه حقوق آنها مستقیماً در پروفایل کارکرد پرسنل انجام می‌پذیرد.
                </span>
              </div>
            </div>
          )}

          {/* پیش‌نمایش تخصیص هوشمند در پایین مدال */}
          {allocationPreview.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>نتیجه تخصیص هوشمند مبلغ ({formatCurrency(enteredAmount)}):</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold leading-relaxed">
                مبلغ واردشده روی {allocationPreview.length} فقره بدهی می‌نشیند: {' '}
                {allocationPreview.filter(p => p.nextStatus === 'SETTLED').length} مورد تسویه کامل و {' '}
                {allocationPreview.filter(p => p.nextStatus === 'PARTIAL').length} مورد تسویه بخشی خواهند شد.
              </p>
            </div>
          )}

          {/* فوتر و دکمه‌ها */}
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
              disabled={enteredAmount <= 0}
              className={`px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs shadow-lg shadow-amber-500/30 flex items-center gap-2 transition-all cursor-pointer ${
                enteredAmount <= 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Check className="w-4 h-4" /> ثبت و اجرای تسویه هوشمند
            </button>
          </div>

        </form>

      </motion.div>
    </div>,
    document.body
  );
}
