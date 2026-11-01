import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSignature, Plus, Trash2, Calendar, TrendingUp, 
  TrendingDown, Clock, UploadCloud, Eye, FileText, 
  AlertCircle, Check, X, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import type { Contract, ContractAddendum } from '../../../../store/contractStore';
import { useContractStore, calculateFinalContractAmount } from '../../../../store/contractStore';
import GlassDatePicker from '../../../../components/ui/GlassDatePicker';
import { formatCurrency } from '../../../../core/utils/currency';

interface ContractAddendumsTabProps {
  contract: Contract;
}

export default function ContractAddendumsTab({
  contract,
}: ContractAddendumsTabProps) {
  const { addAddendum, deleteAddendum } = useContractStore();

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(moment().format('jYYYY/jMM/jDD'));
  const [amountDelta, setAmountDelta] = useState<number>(0);
  const [isAmountIncrease, setIsAmountIncrease] = useState(true);
  const [quantityDelta, setQuantityDelta] = useState<string>('');
  const [newEndDate, setNewEndDate] = useState<string>('');
  const [hasExtension, setHasExtension] = useState(false);
  const [desc, setDesc] = useState('');

  const finalAmount = calculateFinalContractAmount(contract);
  const totalAddendumsAmount = (contract.addendums || []).reduce((acc, a) => acc + (a.amountDelta || 0), 0);

  const handleSaveAddendum = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('لطفاً عنوان متمم را وارد کنید');
      return;
    }

    const calculatedDelta = isAmountIncrease ? Math.abs(amountDelta) : -Math.abs(amountDelta);

    addAddendum(contract.id, {
      title: title.trim(),
      date,
      amountDelta: calculatedDelta,
      quantityDelta: quantityDelta ? parseFloat(quantityDelta) : undefined,
      newEndDate: hasExtension && newEndDate ? newEndDate : undefined,
      description: desc.trim(),
    });

    toast.success('الحاقیه و متمم با موفقیت به قرارداد اضافه شد');
    setIsAdding(false);
    setTitle('');
    setAmountDelta(0);
    setQuantityDelta('');
    setNewEndDate('');
    setHasExtension(false);
    setDesc('');
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* بنر مقایسه‌ای وضعیت متمم‌ها */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
              مبلغ اولیه قرارداد:
            </span>
            <div className="text-lg font-black text-slate-800 dark:text-white font-mono" dir="ltr">
              {formatCurrency(contract.initialAmount)}
            </div>
            <span className="text-[11px] text-slate-400 font-bold mt-1 block">
              تاریخ پایان اولیه: {contract.initialEndDate}
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
              مجموع تغییرات متمم‌ها:
            </span>
            <div className={`text-lg font-black font-mono flex items-center gap-1 ${
              totalAddendumsAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`} dir="ltr">
              {totalAddendumsAmount >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {totalAddendumsAmount >= 0 ? '+' : ''} {formatCurrency(totalAddendumsAmount)}
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1 block">
              شامل {(contract.addendums || []).length} الحاقیه رسمی
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
              مبلغ نهایی با متمم‌ها:
            </span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono" dir="ltr">
              {formatCurrency(finalAmount)}
            </div>
            <span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold mt-1 block">
              سررسید جاری: {contract.currentEndDate || contract.initialEndDate}
            </span>
          </div>
        </div>
      </div>

      {/* بخش تایم‌لاین و لیست متمم‌ها */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                تایم‌لاین متمم‌ها و الحاقیه‌های قرارداد
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                ثبت افزایش یا کاهش متراژ و مبالغ، و تمدید مهلت‌های اجرایی
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'بستن فرم' : 'تنظیم الحاقیه جدید'}</span>
          </button>
        </div>

        {/* فرم بازشونده ثبت الحاقیه جدید */}
        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSaveAddendum}
              className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-800 dark:text-amber-300">
                  مشخصات متمم شماره {((contract.addendums || []).length + 1)}:
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    عنوان متمم / موضوع الحاقیه <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: افزایش متراژ تیغه‌چینی و تمدید ۲۰ روزه مهلت اجرا"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    تاریخ انعقاد الحاقیه:
                  </label>
                  <GlassDatePicker
                    value={date}
                    onChange={(val) => setDate(val)}
                    placeholder="تاریخ ثبت متمم"
                  />
                </div>
              </div>

              {/* مبلغ متمم و افزایش/کاهش */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    نوع اثر بر مبلغ:
                  </label>
                  <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 h-10">
                    <button
                      type="button"
                      onClick={() => setIsAmountIncrease(true)}
                      className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                        isAmountIncrease ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      افزایش مبلغ (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAmountIncrease(false)}
                      className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                        !isAmountIncrease ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      کاهش مبلغ (-)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    میزان تغییر مبلغ (تومان):
                  </label>
                  <input
                    type="text"
                    value={amountDelta ? amountDelta.toLocaleString('fa-IR') : ''}
                    onChange={(e) => setAmountDelta(Number(e.target.value.replace(/\D/g, '')) || 0)}
                    placeholder="۰"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    تغییر متراژ / احجام (اختیاری):
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={quantityDelta}
                    onChange={(e) => setQuantityDelta(e.target.value)}
                    placeholder="مثلاً: +۳۵۰ متر"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                  />
                </div>
              </div>

              {/* تمدید تاریخ پایان */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasExtension}
                    onChange={(e) => setHasExtension(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>تمدید مدت قرارداد در این الحاقیه (تغییر تاریخ پایان)</span>
                </label>

                {hasExtension && (
                  <div className="max-w-xs">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">
                      تاریخ پایان جدید:
                    </label>
                    <GlassDatePicker
                      value={newEndDate}
                      onChange={(val) => setNewEndDate(val)}
                      placeholder="تاریخ جدید پایان"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  شرح و دلایل متمم:
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={2}
                  placeholder="دلایل کارشناسی، تغییرات نقشه‌ها یا درخواست کتبی طرفین..."
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-amber-200/50 dark:border-amber-800/50">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-xs shadow-md shadow-amber-500/30 cursor-pointer"
                >
                  ثبت رسمی متمم
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* تایم‌لاین بصری الحاقیه‌ها */}
        <div className="relative pr-6 before:absolute before:top-3 before:bottom-3 before:right-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 space-y-6">
          {/* گره اول: قرارداد اولیه */}
          <div className="relative">
            <div className="absolute -right-6 top-1 w-5 h-5 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-900 shadow-sm" />
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                  انعقاد قرارداد اولیه
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {contract.startDate}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">
                مبلغ اولیه: <span className="font-mono">{formatCurrency(contract.initialAmount)}</span> • مهلت اولیه تا: {contract.initialEndDate}
              </div>
            </div>
          </div>

          {/* گره‌های متمم‌ها */}
          {(contract.addendums || []).map((addendum, idx) => {
            const isIncrease = addendum.amountDelta >= 0;
            return (
              <div key={addendum.id} className="relative">
                <div className={`absolute -right-6 top-1 w-5 h-5 rounded-full border-4 border-white dark:border-slate-900 shadow-sm ${
                  isIncrease ? 'bg-amber-500' : 'bg-rose-500'
                }`} />

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          متمم شماره {addendum.number || (idx + 1)}
                        </span>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white">
                          {addendum.title}
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                        تاریخ انعقاد الحاقیه: {addendum.date}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteAddendum(contract.id, addendum.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 transition-colors"
                      title="حذف متمم"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 font-mono text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] font-sans block mb-0.5">اثر بر مبلغ:</span>
                      <span className={`font-black ${isIncrease ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} dir="ltr">
                        {isIncrease ? '+' : ''} {formatCurrency(addendum.amountDelta)}
                      </span>
                    </div>

                    {addendum.newEndDate && (
                      <div>
                        <span className="text-slate-400 text-[10px] font-sans block mb-0.5">تمدید مهلت تا:</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          {addendum.newEndDate}
                        </span>
                      </div>
                    )}

                    {addendum.quantityDelta && (
                      <div>
                        <span className="text-slate-400 text-[10px] font-sans block mb-0.5">تغییر متراژ / حجم:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">
                          {addendum.quantityDelta > 0 ? `+${addendum.quantityDelta}` : addendum.quantityDelta}
                        </span>
                      </div>
                    )}
                  </div>

                  {addendum.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {addendum.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
