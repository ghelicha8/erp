import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, X, Check, Calendar, CreditCard, Sparkles, 
  Trash2, Plus, Lock, Truck, Building, FileText, ChevronDown,
  Coins, AlertCircle, RefreshCw, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useLogisticsStore, 
  INSURANCE_COMPANIES, 
  INSURANCE_TYPE_LABELS,
  type InsuranceType, 
  type PaymentMode, 
  type InsuranceInstallment, 
  type VehicleInsuranceRecord,
  type SettlementStatus
} from '../../../store/logisticsStore';
import { 
  GlassDatePicker, 
  PortalSelect 
} from '../../../components/ui/SharedLaborUI';
import { generateUUID } from '../../../core/utils/uuid';
import { formatCurrency, getCurrencyUnit } from '../../../core/utils/currency';

interface VehicleInsuranceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVehicleId?: string;
  insuranceToEdit?: VehicleInsuranceRecord | null;
}

const formatCommaSeparated = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/[^0-9]/g, '');
  return clean ? Number(clean).toLocaleString('en-US') : '';
};

const INSURANCE_TYPE_OPTIONS = Object.entries(INSURANCE_TYPE_LABELS).map(([value, label]) => ({
  value: value as InsuranceType,
  label,
}));

const INSURANCE_COMPANY_OPTIONS = INSURANCE_COMPANIES.map(company => ({
  value: company,
  label: company,
}));

export default function VehicleInsuranceModal({
  isOpen,
  onClose,
  defaultVehicleId,
  insuranceToEdit,
}: VehicleInsuranceModalProps) {
  const { vehicles, tools, addInsurance, updateInsurance } = useLogisticsStore();
  const customCompanies = useLogisticsStore(state => state.customInsuranceCompanies) || [];
  const addInsuranceCompany = useLogisticsStore(state => state.addInsuranceCompany);

  const targetVehicleId = defaultVehicleId || insuranceToEdit?.vehicleId || '';
  const isVehicleLocked = Boolean(defaultVehicleId);

  const [vehicleId, setVehicleId] = useState(targetVehicleId);
  const [insuranceType, setInsuranceType] = useState<InsuranceType>('THIRD_PARTY');
  const [companyName, setCompanyName] = useState('بیمه ایران');
  const [policyNumber, setPolicyNumber] = useState('');
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(false);
  const [newCompanyNameInput, setNewCompanyNameInput] = useState('');

  const isTool = useMemo(() => {
    return (tools || []).some(t => t.id === vehicleId) || (tools || []).some(t => t.id === targetVehicleId);
  }, [tools, vehicleId, targetVehicleId]);

  const companyOptions = useMemo(() => {
    const list = Array.from(new Set([...INSURANCE_COMPANIES, ...customCompanies]));
    return [
      ...list.map(c => ({ value: c, label: c })),
      { value: '__ADD_NEW__', label: '+ افزودن شرکت بیمه جدید...', icon: Plus }
    ];
  }, [customCompanies]);

  const handleCompanySelect = (val: string) => {
    if (val === '__ADD_NEW__') {
      setIsAddingNewCompany(true);
      setNewCompanyNameInput('');
    } else {
      setCompanyName(val);
      setIsAddingNewCompany(false);
    }
  };

  const handleSaveNewCompany = () => {
    const trimmed = newCompanyNameInput.trim();
    if (!trimmed) {
      toast.error('لطفاً نام شرکت بیمه را وارد کنید.');
      return;
    }
    addInsuranceCompany(trimmed);
    setCompanyName(trimmed);
    setIsAddingNewCompany(false);
    setNewCompanyNameInput('');
    toast.success(`شرکت بیمه «${trimmed}» با موفقیت ثبت و ذخیره گردید.`);
  };
  
  // تاریخ‌های اعتبار بیمه‌نامه
  const [startDate, setStartDate] = useState(() => moment().format('jYYYY/jMM/jDD'));
  const [endDate, setEndDate] = useState(() => 
    moment().add(1, 'jYear').subtract(1, 'day').format('jYYYY/jMM/jDD')
  );

  const [totalAmount, setTotalAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('LUMP_SUM');
  const [settlementStatus, setSettlementStatus] = useState<SettlementStatus>('PENDING');

  // لاجیک اقساط
  const [installmentCount, setInstallmentCount] = useState('4');
  const [firstDueDate, setFirstDueDate] = useState(() => 
    moment().add(1, 'jMonth').format('jYYYY/jMM/jDD')
  );
  const [installments, setInstallments] = useState<InsuranceInstallment[]>([]);

  const [notes, setNotes] = useState('');

  // بارگذاری داده‌ها در حالت ویرایش یا تغییر خودرو
  useEffect(() => {
    if (insuranceToEdit) {
      setVehicleId(insuranceToEdit.vehicleId);
      setInsuranceType(insuranceToEdit.insuranceType);
      setCompanyName(insuranceToEdit.companyName);
      setPolicyNumber(insuranceToEdit.policyNumber || '');
      setStartDate(insuranceToEdit.startDate);
      setEndDate(insuranceToEdit.endDate);
      setTotalAmount(formatCommaSeparated(insuranceToEdit.totalAmount));
      setPaymentMode(insuranceToEdit.paymentMode);
      setSettlementStatus(insuranceToEdit.settlementStatus || 'PENDING');
      setInstallments(insuranceToEdit.installments || []);
      setInstallmentCount(String(insuranceToEdit.installments?.length || 4));
      setNotes(insuranceToEdit.notes || '');
    } else {
      if (targetVehicleId) {
        setVehicleId(targetVehicleId);
      } else if (vehicles.length > 0 && !vehicleId) {
        setVehicleId(vehicles[0].id);
      }
      setPolicyNumber('');
      setTotalAmount('');
      setPaymentMode('LUMP_SUM');
      setSettlementStatus('PENDING');
      setInstallments([]);
      setNotes('');
    }
  }, [insuranceToEdit, targetVehicleId, vehicles]);

  // تنظیم خودکار تاریخ پایان بر اساس تاریخ شروع (+1 سال)
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(val)) {
      try {
        const nextYear = moment(val, 'jYYYY/jMM/jDD').add(1, 'jYear').subtract(1, 'day').format('jYYYY/jMM/jDD');
        setEndDate(nextYear);
      } catch (e) {
        // ignore
      }
    }
  };

  // محاسبه خودکار اقساط ماهانه بر اساس تقویم شمسی جلالی
  const handleAutoCalculateInstallments = () => {
    const rawTotal = Number(totalAmount.replace(/,/g, '')) || 0;
    if (rawTotal <= 0) {
      toast.error('لطفاً ابتدا کل هزینه بیمه‌نامه را مشخص کنید.');
      return;
    }

    const count = parseInt(installmentCount, 10);
    if (isNaN(count) || count < 2 || count > 24) {
      toast.error('تعداد اقساط باید بین ۲ تا ۲۴ قسط باشد.');
      return;
    }

    if (!firstDueDate || !/^\d{4}\/\d{2}\/\d{2}$/.test(firstDueDate)) {
      toast.error('لطفاً تاریخ سررسید قسط اول را به صورت معتبر وارد کنید.');
      return;
    }

    const baseAmount = Math.floor(rawTotal / count);
    const remainder = rawTotal - (baseAmount * count);

    const generated: InsuranceInstallment[] = [];
    for (let i = 0; i < count; i++) {
      const dueDateMom = moment(firstDueDate, 'jYYYY/jMM/jDD').add(i, 'jMonth');
      const installmentAmount = i === 0 ? (baseAmount + remainder) : baseAmount;

      generated.push({
        id: generateUUID(),
        installmentNumber: i + 1,
        dueDate: dueDateMom.format('jYYYY/jMM/jDD'),
        amount: installmentAmount,
        isPaid: false,
      });
    }

    setInstallments(generated);
    toast.success(`${count} قسط با سررسید ماهانه جلالی محاسبه و تولید گردید.`);
  };

  const handleUpdateInstallmentAmount = (idx: number, newAmtStr: string) => {
    const cleanNum = Number(newAmtStr.replace(/,/g, '')) || 0;
    setInstallments(prev => prev.map((inst, i) => i === idx ? { ...inst, amount: cleanNum } : inst));
  };

  const handleUpdateInstallmentDate = (idx: number, newDate: string) => {
    setInstallments(prev => prev.map((inst, i) => i === idx ? { ...inst, dueDate: newDate } : inst));
  };

  const handleToggleInstallmentPaid = (idx: number) => {
    setInstallments(prev => prev.map((inst, i) => {
      if (i !== idx) return inst;
      const nextPaid = !inst.isPaid;
      return {
        ...inst,
        isPaid: nextPaid,
        paidDate: nextPaid ? moment().format('jYYYY/jMM/jDD') : undefined,
      };
    }));
  };

  const handleRemoveInstallment = (idx: number) => {
    setInstallments(prev => prev.filter((_, i) => i !== idx).map((inst, i) => ({ ...inst, installmentNumber: i + 1 })));
  };

  const handleAddCustomInstallment = () => {
    const lastDate = installments.length > 0 
      ? installments[installments.length - 1].dueDate 
      : firstDueDate;
    const nextDate = moment(lastDate, 'jYYYY/jMM/jDD').add(1, 'jMonth').format('jYYYY/jMM/jDD');

    setInstallments(prev => [
      ...prev,
      {
        id: generateUUID(),
        installmentNumber: prev.length + 1,
        dueDate: nextDate,
        amount: 0,
        isPaid: false,
      }
    ]);
  };

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

  const installmentsSum = useMemo(() => {
    return installments.reduce((acc, inst) => acc + (inst.amount || 0), 0);
  }, [installments]);

  const rawTotalAmount = Number(totalAmount.replace(/,/g, '')) || 0;
  const isAmountMismatch = paymentMode === 'INSTALLMENT' && installments.length > 0 && installmentsSum !== rawTotalAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleId) {
      toast.error('انتخاب خودرو / ماشین‌آلات الزامی است.');
      return;
    }

    if (!companyName.trim()) {
      toast.error('انتخاب یا درج نام شرکت بیمه الزامی است.');
      return;
    }

    if (!startDate || !endDate) {
      toast.error('تعیین تاریخ شروع و پایان اعتبار بیمه‌نامه الزامی است.');
      return;
    }

    if (rawTotalAmount <= 0) {
      toast.error('لطفاً مبلغ معتبر کل بیمه‌نامه را وارد کنید.');
      return;
    }

    if (paymentMode === 'INSTALLMENT' && installments.length === 0) {
      toast.error('در حالت پرداخت اقساطی، حداقل باید یک قسط تولید یا ثبت شود.');
      return;
    }

    // محاسبه وضعیت بیمه‌نامه بر اساس تاریخ جاری
    const todayStr = moment().format('jYYYY/jMM/jDD');
    const daysToExpiry = moment(endDate, 'jYYYY/jMM/jDD').diff(moment(todayStr, 'jYYYY/jMM/jDD'), 'days');
    const status: 'ACTIVE' | 'EXPIRED' | 'NEAR_EXPIRY' = 
      daysToExpiry < 0 ? 'EXPIRED' : daysToExpiry <= 30 ? 'NEAR_EXPIRY' : 'ACTIVE';

    const payload = {
      vehicleId,
      insuranceType,
      companyName: companyName.trim(),
      policyNumber: policyNumber.trim(),
      startDate,
      endDate,
      totalAmount: rawTotalAmount,
      paymentMode,
      installments: paymentMode === 'INSTALLMENT' ? installments : [],
      status,
      settlementStatus: paymentMode === 'LUMP_SUM' ? settlementStatus : undefined,
      paidAmount: paymentMode === 'LUMP_SUM' && settlementStatus === 'SETTLED' ? rawTotalAmount : 0,
      notes: notes.trim() || undefined,
    };

    let newId = insuranceToEdit?.id;
    if (insuranceToEdit) {
      updateInsurance(insuranceToEdit.id, payload);
      toast.success(isTool ? 'اطلاعات بیمه‌نامه ابزار با موفقیت به‌روزرسانی شد.' : 'اطلاعات بیمه‌نامه خودرو با موفقیت به‌روزرسانی شد.');
    } else {
      newId = addInsurance(payload);
      toast.success(isTool ? 'سند بیمه‌نامه ابزار با موفقیت ثبت گردید.' : 'سند بیمه‌نامه خودرو با موفقیت ثبت گردید.');
    }

    onClose();

    if (paymentMode === 'LUMP_SUM' && settlementStatus === 'SETTLED' && rawTotalAmount > 0) {
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('open-vehicle-payment-modal', {
          detail: { vehicleId, targetDebtId: `ins-lump-${newId}`, initialAmount: rawTotalAmount }
        }));
      }, 150);
    }
  };

  if (!isOpen) return null;

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
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border border-amber-300/40 dark:border-amber-500/20 shadow-[0_25px_70px_rgba(245,158,11,0.2)] overflow-hidden z-10"
      >
        {/* هدر مدال تم ناوگان (آمبر/نارنجی) */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                {insuranceToEdit 
                  ? (isTool ? 'ویرایش بیمه‌نامه ابزار / دستگاه' : 'ویرایش بیمه‌نامه خودرو') 
                  : (isTool ? 'ثبت بیمه‌نامه و پوشش تجهیزات و ماشین‌آلات' : 'ثبت بیمه‌نامه و اقساط ناوگان')}
              </h2>
              <p className="text-xs text-amber-100 font-bold mt-0.5">
                {isTool 
                  ? 'مدیریت بیمه مسئولیت مدنی ابزار، شکست ماشین‌آلات، سررسیدها و اقساط' 
                  : 'مدیریت بیمه شخص ثالث، بدنه، سررسیدهای سالانه و تقسیط ماهانه'}
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

        {/* فرم اسکرول‌خور با طراحی شیشه‌ای */}
        <form onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-y-auto p-6 space-y-6 modal-scrollbar">
          
          {/* ردیف اول: خودرو، شرکت بیمه، نوع بیمه */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* انتخاب خودرو */}
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
                  placeholder={isTool ? 'انتخاب ابزار / دستگاه...' : 'انتخاب خودرو...'}
                  disabled={isVehicleLocked}
                  className="!h-[46px] !rounded-2xl"
                />
              </div>
            </div>

            {/* شرکت بیمه‌گر */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-amber-500" /> شرکت بیمه *
                </span>
                {isAddingNewCompany && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCompany(false)}
                    className="text-[10px] text-rose-500 hover:underline font-bold"
                  >
                    انصراف
                  </button>
                )}
              </label>

              {isAddingNewCompany ? (
                <div className="flex items-center gap-1.5 h-[46px]">
                  <input
                    type="text"
                    value={newCompanyNameInput}
                    onChange={(e) => setNewCompanyNameInput(e.target.value)}
                    placeholder="نام شرکت بیمه جدید..."
                    autoComplete="off"
                    className="flex-1 h-full px-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-amber-400 dark:border-amber-500 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveNewCompany();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveNewCompany}
                    className="h-full px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-2xl transition-colors shrink-0 shadow-sm"
                  >
                    ثبت
                  </button>
                </div>
              ) : (
                <div className="h-[46px]">
                  <PortalSelect
                    value={companyName}
                    onChange={(val) => handleCompanySelect(String(val))}
                    options={companyOptions}
                    searchable={true}
                    placeholder="انتخاب شرکت بیمه..."
                    className="!h-[46px] !rounded-2xl"
                  />
                </div>
              )}
            </div>

            {/* نوع بیمه */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-500" /> نوع بیمه‌نامه *
              </label>
              <div className="h-[46px]">
                <PortalSelect
                  value={insuranceType}
                  onChange={(val) => setInsuranceType(val as InsuranceType)}
                  options={INSURANCE_TYPE_OPTIONS}
                  placeholder="انتخاب نوع بیمه..."
                  className="!h-[46px] !rounded-2xl"
                />
              </div>
            </div>

          </div>

          {/* ردیف دوم: شماره بیمه‌نامه، تاریخ صدور، تاریخ پایان */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-amber-50/40 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-800/40">
            
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-500" /> شماره بیمه‌نامه / کد یکتا
              </label>
              <input
                type="text"
                dir="ltr"
                value={policyNumber}
                onChange={e => setPolicyNumber(e.target.value)}
                placeholder="1403/12/34567..."
                autoComplete="off"
                className="w-full h-[46px] px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-black text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 text-left shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-500" /> تاریخ شروع اعتبار *
              </label>
              <GlassDatePicker
                value={startDate}
                onChange={handleStartDateChange}
                placeholder="140X/XX/XX"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-rose-500" /> تاریخ پایان اعتبار (انقضا) *
              </label>
              <GlassDatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="140X/XX/XX"
              />
            </div>

          </div>

          {/* ردیف سوم: مبلغ کل بیمه و سوئیچ حالت پرداخت (یکجا / اقساط) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* کل هزینه بیمه */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" /> کل حق بیمه ({getCurrencyUnit()}) *
              </label>
              <input
                type="text"
                dir="ltr"
                value={totalAmount}
                onChange={e => setTotalAmount(formatCommaSeparated(e.target.value))}
                placeholder="مثلاً: 18,500,000"
                autoComplete="off"
                className="w-full h-[48px] px-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-black text-base text-left placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 shadow-sm"
              />
            </div>

            {/* سوئیچ نقدی / اقساطی */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-500" /> شیوه تسویه حساب
              </label>
              <div className="flex bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-2xl h-[48px] items-center">
                <button
                  type="button"
                  onClick={() => setPaymentMode('LUMP_SUM')}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    paymentMode === 'LUMP_SUM'
                      ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-md'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  نقدی یکجا
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('INSTALLMENT')}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    paymentMode === 'INSTALLMENT'
                      ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-md'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  اقساطی ماهانه
                </button>
              </div>
            </div>

          </div>

          {/* وضعیت تسویه بیمه در حالت نقدی یکجا */}
          {paymentMode === 'LUMP_SUM' && (
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-2 block">
                وضعیت پرداخت و تسویه بیمه‌نامه *
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
          )}

          {/* بخش چهارم: مدیریت اقساط هوشمند (فقط در حالت INSTALLMENT) */}
          <AnimatePresence>
            {paymentMode === 'INSTALLMENT' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 bg-white/70 dark:bg-slate-800/50 p-5 rounded-3xl border border-amber-200/60 dark:border-amber-700/40 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-500" />
                      جدول زمان‌بندی اقساط بیمه‌نامه
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                      محاسبه خودکار تاریخ‌های سررسید ماهانه و قابلیت ویرایش مقادیر
                    </p>
                  </div>

                  {/* جمع مبالغ اقساط */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">جمع اقساط:</span>
                    <span className={`font-mono text-sm font-black ${
                      isAmountMismatch ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {formatCurrency(installmentsSum)}
                    </span>
                    {isAmountMismatch && (
                      <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> مغایرت با مبلغ کل!
                      </span>
                    )}
                  </div>
                </div>

                {/* ابزار تولید خودکار اقساط */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-200/40 dark:border-amber-800/30">
                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">تعداد اقساط</label>
                    <input
                      type="number"
                      min={2}
                      max={24}
                      value={installmentCount}
                      onChange={e => setInstallmentCount(e.target.value)}
                      autoComplete="off"
                      className="w-full h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-center outline-none focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">سررسید قسط اول</label>
                    <GlassDatePicker
                      value={firstDueDate}
                      onChange={setFirstDueDate}
                      placeholder="140X/XX/XX"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <button
                      type="button"
                      onClick={handleAutoCalculateInstallments}
                      className="w-full h-[42px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" /> محاسبه خودکار اقساط
                    </button>
                  </div>
                </div>

                {/* جدول اقساط تولید شده */}
                {installments.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 px-3">
                      <div className="col-span-1 text-center">شماره</div>
                      <div className="col-span-4">تاریخ سررسید (شمسی)</div>
                      <div className="col-span-4">مبلغ قسط ({getCurrencyUnit()})</div>
                      <div className="col-span-2 text-center">وضعیت پرداخت</div>
                      <div className="col-span-1 text-center">حذف</div>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto modal-scrollbar p-0.5">
                      {installments.map((inst, idx) => (
                        <div
                          key={inst.id}
                          className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-2xl border transition-all ${
                            inst.isPaid
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                              : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {/* شماره قسط */}
                          <div className="col-span-1 text-center">
                            <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xs font-black inline-flex items-center justify-center">
                              {inst.installmentNumber}
                            </span>
                          </div>

                          {/* تاریخ سررسید */}
                          <div className="col-span-4">
                            <GlassDatePicker
                              value={inst.dueDate}
                              onChange={(newDate) => handleUpdateInstallmentDate(idx, newDate)}
                              placeholder="140X/XX/XX"
                            />
                          </div>

                          {/* مبلغ قسط */}
                          <div className="col-span-4">
                            <input
                              type="text"
                              dir="ltr"
                              value={formatCommaSeparated(inst.amount)}
                              onChange={(e) => handleUpdateInstallmentAmount(idx, e.target.value)}
                              placeholder="0"
                              autoComplete="off"
                              className="w-full h-[40px] px-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-black text-left outline-none focus:border-amber-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                          </div>

                          {/* وضعیت پرداخت */}
                          <div className="col-span-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleInstallmentPaid(idx)}
                              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 w-full transition-all cursor-pointer ${
                                inst.isPaid
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {inst.isPaid ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> پرداخت شد
                                </>
                              ) : (
                                'پرداخت نشده'
                              )}
                            </button>
                          </div>

                          {/* دکمه حذف قسط */}
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveInstallment(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="حذف این قسط"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleAddCustomInstallment}
                        className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> افزودن قسط جدید به انتهای لیست
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* یادداشت‌ها و توضیحات */}
          <div>
            <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 block">
              توضیحات تکمیلی و شرایط الحاقیه
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="تخفیفات عدم خسارت، شماره پرونده کارگزاری، تعهدات مالی مازاد..."
              autoComplete="off"
              className="w-full h-20 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium outline-none focus:border-amber-500 resize-none shadow-sm"
            />
          </div>

          {/* دکمه‌های فوتر */}
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
              <Check className="w-4 h-4" /> {insuranceToEdit ? 'ذخیره تغییرات بیمه‌نامه' : 'ثبت و صدور بیمه‌نامه'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>,
    document.body
  );
}
