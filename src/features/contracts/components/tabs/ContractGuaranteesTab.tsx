import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Banknote, Plus, Trash2, CheckCircle2, 
  AlertTriangle, Clock, UploadCloud, Eye, Image as ImageIcon,
  Check, X, FileSignature, ArrowRightLeft, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import type { 
  Contract, 
  ContractGuarantee, 
  GuaranteeType, 
  GuaranteeStatus 
} from '../../../../store/contractStore';
import { useContractStore, calculateRetentionAmount } from '../../../../store/contractStore';
import GlassDatePicker from '../../../../components/ui/GlassDatePicker';
import { formatCurrency } from '../../../../core/utils/currency';

interface ContractGuaranteesTabProps {
  contract: Contract;
}

const GUARANTEE_TYPE_LABELS: Record<GuaranteeType, string> = {
  CHEQUE: 'چک صیادی ضمانت',
  PROMISSORY_NOTE: 'سفته حسن تعهدات',
  BANK_GUARANTEE: 'ضمانت‌نامه بانکی',
  CASH: 'ودیعه نقدی / سپرده',
  OTHER: 'سایر تضامین رسمی',
};

const GUARANTEE_STATUS_META: Record<GuaranteeStatus, { label: string; className: string; bg: string }> = {
  HELD: { 
    label: 'مسدود و در جریان', 
    className: 'text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/10',
    bg: 'border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/20' 
  },
  RELEASED: { 
    label: 'آزاد و مسترد شده ✓', 
    className: 'text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
    bg: 'border-emerald-400/40 bg-emerald-50/50 dark:bg-emerald-950/20' 
  },
  EXECUTED: { 
    label: 'به اجرا گذاشته شده ⚠️', 
    className: 'text-rose-700 dark:text-rose-300 border-rose-500/30 bg-rose-500/10',
    bg: 'border-rose-400/40 bg-rose-50/50 dark:bg-rose-950/20' 
  },
};

export default function ContractGuaranteesTab({
  contract,
}: ContractGuaranteesTabProps) {
  const { 
    updateContract, 
    addGuarantee, 
    updateGuaranteeStatus, 
    deleteGuarantee 
  } = useContractStore();

  const [isAddingGuar, setIsAddingGuar] = useState(false);
  const [guarType, setGuarType] = useState<GuaranteeType>('CHEQUE');
  const [serialNumber, setSerialNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState(moment().add(6, 'jMonth').format('jYYYY/jMM/jDD'));
  const [direction, setDirection] = useState<'GIVEN' | 'RECEIVED'>('RECEIVED');
  const [issuerName, setIssuerName] = useState(contract.partyName);
  const [receiverName, setReceiverName] = useState('شرکت پیمان');
  const [desc, setDesc] = useState('');
  const [imageBase64, setImageBase64] = useState<string>('');

  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const retentionAmount = calculateRetentionAmount(contract);

  // محاسبه روزشمار آزادسازی سپرده حسن انجام کار
  let daysToRetentionRelease: number | null = null;
  if (contract.retentionReleaseDate) {
    try {
      const todayMom = moment().startOf('day');
      const retMom = moment(contract.retentionReleaseDate, 'jYYYY/jMM/jDD').startOf('day');
      daysToRetentionRelease = retMom.diff(todayMom, 'days');
    } catch {
      daysToRetentionRelease = null;
    }
  }

  // آزادسازی سپرده حسن انجام کار
  const handleToggleRetentionRelease = () => {
    if (contract.retentionReleased) {
      updateContract(contract.id, {
        retentionReleased: false,
        retentionReleasedAmount: 0,
      });
      toast.info('وضعیت سپرده به مسدود بازگردانده شد');
    } else {
      updateContract(contract.id, {
        retentionReleased: true,
        retentionReleasedAmount: retentionAmount,
      });
      toast.success('سپرده حسن انجام کار با موفقیت آزاد و مسترد گردید');
    }
  };

  // آپلود عکس مدرک
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ثبت ضمانت جدید
  const handleSaveGuarantee = (e: React.FormEvent) => {
    e.preventDefault();

    if (!serialNumber.trim()) {
      toast.error('لطفاً شماره صیادی یا شناسه سند ضمانت را وارد کنید');
      return;
    }
    if (amount <= 0) {
      toast.error('مبلغ ضمانت باید بزرگتر از صفر باشد');
      return;
    }

    addGuarantee(contract.id, {
      type: guarType,
      serialNumber: serialNumber.trim(),
      bankName: bankName.trim() || undefined,
      amount,
      dueDate,
      issueDate: moment().format('jYYYY/jMM/jDD'),
      issuerName: issuerName.trim(),
      receiverName: receiverName.trim(),
      direction,
      status: 'HELD',
      image: imageBase64 || undefined,
      description: desc.trim() || undefined,
    });

    toast.success('ضمانت‌نامه جدید با موفقیت ثبت شد');
    setIsAddingGuar(false);
    setSerialNumber('');
    setBankName('');
    setAmount(0);
    setDesc('');
    setImageBase64('');
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* ======================================================== */}
      {/* بخش ۱: سپرده حسن انجام کار (روزشمار + دکمه آزادسازی) */}
      {/* ======================================================== */}
      <div className={`p-6 rounded-3xl border transition-all ${
        contract.retentionReleased 
          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
          : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
              contract.retentionReleased ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-amber-500 shadow-amber-500/30'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  سپرده حسن انجام کار ({contract.retentionPercent}٪ از کل مبالغ)
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                  contract.retentionReleased 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-500/40'
                }`}>
                  {contract.retentionReleased ? 'آزاد و مسترد شده ✓' : 'مسدود نزد کارفرما / صندوق'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 mt-1.5">
                <span>
                  مبلغ مسدودشده: <strong className="text-slate-800 dark:text-white font-mono">{formatCurrency(retentionAmount)}</strong>
                </span>
                <span>•</span>
                <span>
                  سررسید آزادسازی: <strong className="text-slate-800 dark:text-white font-mono">{contract.retentionReleaseDate || 'تعیین نشده'}</strong>
                </span>
                {daysToRetentionRelease !== null && !contract.retentionReleased && (
                  <>
                    <span>•</span>
                    <span className={`font-black ${daysToRetentionRelease <= 0 ? 'text-rose-600 animate-pulse' : 'text-amber-600'}`}>
                      {daysToRetentionRelease <= 0 ? 'موعد آزادسازی فرا رسیده است!' : `${daysToRetentionRelease} روز مانده تا سررسید`}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleRetentionRelease}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer ${
              contract.retentionReleased
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/30'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{contract.retentionReleased ? 'بازگردانی به حالت مسدود' : 'آزادسازی و استرداد سپرده'}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* بخش ۲: چک‌های ضمانت صیادی و سفته‌ها */}
      {/* ======================================================== */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                تضامین، چک‌های صیادی و سفته‌های قرارداد
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                مدیریت امانات، چک‌های ضمانت حسن اجرای تعهدات، سررسیدها و استرداد
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingGuar(!isAddingGuar)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingGuar ? 'بستن فرم' : 'ثبت ضمانت جدید'}</span>
          </button>
        </div>

        {/* فرم بازشونده ثبت ضمانت */}
        <AnimatePresence>
          {isAddingGuar && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSaveGuarantee}
              className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-amber-500" /> ثبت چک صیادی یا سفته ضمانت:
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingGuar(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    نوع ضمانت:
                  </label>
                  <select
                    value={guarType}
                    onChange={(e) => setGuarType(e.target.value as GuaranteeType)}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="CHEQUE">چک صیادی بنفش</option>
                    <option value="PROMISSORY_NOTE">سفته حسن تعهدات</option>
                    <option value="BANK_GUARANTEE">ضمانت‌نامه بانکی</option>
                    <option value="CASH">ودیعه نقدی</option>
                    <option value="OTHER">سایر تضامین</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    شماره صیاد ۱۶ رقمی / شماره سند <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    dir="ltr"
                    placeholder="8920145623019842"
                    className="w-full h-10 px-3 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    نام بانک و شعبه:
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="مثلاً: ملت شعبه بهاران"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    مبلغ ضمانت (تومان) <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={amount ? amount.toLocaleString('fa-IR') : ''}
                    onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
                    placeholder="۰"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    تاریخ سررسید ضمانت:
                  </label>
                  <GlassDatePicker
                    value={dueDate}
                    onChange={(val) => setDueDate(val)}
                    placeholder="سررسید ضمانت"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    جهت تحویل سند:
                  </label>
                  <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 h-10">
                    <button
                      type="button"
                      onClick={() => setDirection('RECEIVED')}
                      className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                        direction === 'RECEIVED' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      ما دریافت کرده‌ایم
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('GIVEN')}
                      className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                        direction === 'GIVEN' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      ما تحویل داده‌ایم
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    صادرکننده / متعهد:
                  </label>
                  <input
                    type="text"
                    value={issuerName}
                    onChange={(e) => setIssuerName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    در وجه / ذینفع:
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* آپلود تصویر سند */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  تصویر فیزیکی چک یا سفته:
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer shadow-sm">
                    <UploadCloud className="w-4 h-4 text-amber-500" />
                    <span>انتخاب فایل تصویر</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {imageBase64 && (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                      <span>تصویر بارگذاری شد ✓</span>
                      <button
                        type="button"
                        onClick={() => setImageBase64('')}
                        className="text-rose-500 hover:underline text-[10px]"
                      >
                        حذف
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddingGuar(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-xs shadow-md shadow-amber-500/30 cursor-pointer"
                >
                  ثبت ضمانت‌نامه
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* لیست کارت‌های تضامین */}
        {(!contract.guarantees || contract.guarantees.length === 0) ? (
          <div className="text-center py-12 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-800">
            <ShieldCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">
              هیچ سند یا چک ضمانتی ثبت نشده است
            </h4>
            <p className="text-xs text-slate-400 font-bold mt-1">
              جهت کنترل ریسک قرارداد، اسناد تضمینی را ثبت کنید.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contract.guarantees.map((guar) => {
              const statusMeta = GUARANTEE_STATUS_META[guar.status] || GUARANTEE_STATUS_META.HELD;
              return (
                <div
                  key={guar.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 relative overflow-hidden ${statusMeta.bg}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-amber-500 shadow-sm">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-800 dark:text-white">
                            {GUARANTEE_TYPE_LABELS[guar.type]}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                          {guar.direction === 'RECEIVED' ? 'تحویل گرفته شده از طرف حساب' : 'تحویل داده شده به طرف حساب'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteGuarantee(contract.id, guar.id)}
                      className="p-1 rounded-lg text-slate-300 hover:text-rose-500 transition-colors"
                      title="حذف ضمانت"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* شماره صیاد و مشخصات بانک */}
                  <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px] font-sans font-bold">شماره صیاد / سریال:</span>
                      <span className="text-slate-900 dark:text-white font-bold tracking-wider" dir="ltr">
                        {guar.serialNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px] font-sans font-bold">مبلغ ضمانت:</span>
                      <span className="text-amber-600 dark:text-amber-400 font-black text-sm" dir="ltr">
                        {formatCurrency(guar.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-sans font-bold">تاریخ سررسید:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-bold">
                        {guar.dueDate}
                      </span>
                    </div>
                  </div>

                  {/* متعهد و ذینفع */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>صادرکننده: {guar.issuerName || '-'}</span>
                    <span>ذینفع: {guar.receiverName || '-'}</span>
                  </div>

                  {/* اکشن‌های تغییر وضعیت ضمانت و مشاهده عکس */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {guar.status !== 'RELEASED' && (
                        <button
                          type="button"
                          onClick={() => updateGuaranteeStatus(contract.id, guar.id, 'RELEASED', moment().format('jYYYY/jMM/jDD'))}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-black transition-colors"
                        >
                          آزادسازی و عودت ✓
                        </button>
                      )}

                      {guar.status !== 'EXECUTED' && (
                        <button
                          type="button"
                          onClick={() => updateGuaranteeStatus(contract.id, guar.id, 'EXECUTED')}
                          className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-black transition-colors"
                        >
                          به اجرا گذاشتن ⚠️
                        </button>
                      )}

                      {guar.status !== 'HELD' && (
                        <button
                          type="button"
                          onClick={() => updateGuaranteeStatus(contract.id, guar.id, 'HELD')}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-black transition-colors"
                        >
                          بازگشت به مسدود
                        </button>
                      )}
                    </div>

                    {guar.image && (
                      <button
                        type="button"
                        onClick={() => setViewingImage(guar.image || null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                        title="مشاهده تصویر سند"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* مودال بزرگنمایی تصویر سند */}
      {viewingImage && (
        <div 
          onClick={() => setViewingImage(null)}
          className="fixed inset-0 z-[120000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl">
            <img src={viewingImage} alt="سند ضمانت" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
