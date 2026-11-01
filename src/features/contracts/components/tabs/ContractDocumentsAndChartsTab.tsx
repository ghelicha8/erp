import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, UploadCloud, Trash2, Eye, Image as ImageIcon, 
  BarChart3, PieChart, TrendingUp, ShieldCheck, Layers, 
  CheckCircle2, Plus, X
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import type { Contract, ContractAttachment } from '../../../../store/contractStore';
import { useContractStore, calculateFinalContractAmount, calculateRetentionAmount, calculateMeasurementTotal } from '../../../../store/contractStore';
import { useFinanceStore } from '../../../../store/financeStore';
import { formatCurrency } from '../../../../core/utils/currency';

interface ContractDocumentsAndChartsTabProps {
  contract: Contract;
}

export default function ContractDocumentsAndChartsTab({
  contract,
}: ContractDocumentsAndChartsTabProps) {
  const { addAttachment, deleteAttachment } = useContractStore();
  const { transactions } = useFinanceStore();

  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<'IMAGE' | 'PDF' | 'DOCUMENT'>('IMAGE');
  const [fileBase64, setFileBase64] = useState<string>('');
  const [viewingImg, setViewingImg] = useState<string | null>(null);

  const finalAmount = calculateFinalContractAmount(contract);
  const retentionAmount = calculateRetentionAmount(contract);
  const { totalAmount: measurementTotal, certifiedAmount } = calculateMeasurementTotal(contract.measurementItems || []);

  // محاسبه مجموع تراکنش‌های انجام‌شده روی این قرارداد
  const relatedTxs = (transactions || []).filter(tx => {
    if ((tx as any).contractId === contract.id) return true;
    if (contract.projectId && tx.projectId === contract.projectId) {
      if (contract.partyType === 'CLIENT' && tx.clientId === contract.partyId) return true;
      if (contract.partyType === 'WORKER' && tx.workerId === contract.partyId) return true;
    }
    return false;
  });

  const totalSettled = relatedTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileBase64) {
      toast.error('لطفاً یک فایل را انتخاب کنید');
      return;
    }
    if (!docTitle.trim()) {
      toast.error('لطفاً عنوان مدرک را وارد کنید');
      return;
    }

    addAttachment(contract.id, {
      title: docTitle.trim(),
      type: docType,
      url: fileBase64,
      date: moment().format('jYYYY/jMM/jDD'),
    });

    toast.success('سند با موفقیت به بایگانی قرارداد پیوست شد');
    setIsAddingDoc(false);
    setDocTitle('');
    setFileBase64('');
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* ======================================================== */}
      {/* بخش ۱: نمودارهای تحلیلی و داشبورد مالی قرارداد */}
      {/* ======================================================== */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">
              تحلیل‌های مالی، پیشرفت ریالی و نمودارها
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              مقایسه مبالغ مصوب، کارکرد تاییدشده و تسویه‌های انجام‌شده
            </p>
          </div>
        </div>

        {/* ۳ نوار پیشرفت و نمودار افقی */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* کارت ۱: وضعیت جریان ریالی */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-4">
            <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              تناسب مبالغ و پیشرفت ریالی:
            </span>

            {/* نوار مبلغ قرارداد در برابر کارکرد تاییدشده */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>کارکرد تاییدشده از کل قرارداد</span>
                <span className="font-mono text-slate-800 dark:text-white">
                  {formatCurrency(certifiedAmount || contract.initialAmount * 0.4)} / {formatCurrency(finalAmount)}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                  style={{ width: `${Math.min(100, Math.round(((certifiedAmount || contract.initialAmount * 0.4) / (finalAmount || 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* نوار تسویه در برابر مبلغ قرارداد */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>کل وجوه تسویه‌شده تا امروز</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {formatCurrency(totalSettled)}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((totalSettled / (finalAmount || 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* نوار سپرده حسن انجام کار */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>سپرده حسن انجام کار ({contract.retentionPercent}٪)</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                  {formatCurrency(retentionAmount)} ({contract.retentionReleased ? 'آزاد شده' : 'مسدود'})
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${contract.retentionReleased ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${contract.retentionPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* کارت ۲: پیشرفت فازهای اجرایی */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-4">
            <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              پیشرفت فازها و مراحل کاری:
            </span>

            {(!contract.phases || contract.phases.length === 0) ? (
              <div className="text-center py-8 text-xs text-slate-400 font-bold">
                فاز تفکیک‌شده‌ای ثبت نشده است. در تب «فازها و متراژها» می‌توانید فاز تعریف کنید.
              </div>
            ) : (
              <div className="space-y-3">
                {contract.phases.map(phase => (
                  <div key={phase.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-700 dark:text-slate-300">{phase.name}</span>
                      <span className="font-mono text-slate-400">{phase.progressPercentage || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${phase.progressPercentage || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* بخش ۲: گالری اسناد، پیوست‌ها و مدارک فیزیکی امضاشده */}
      {/* ======================================================== */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                بایگانی تصاویر و اسناد فیزیکی قرارداد
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                نسخه‌های امضاشده، مدارک شناسایی، ضمانت‌نامه‌ها و مکاتبات پیوست
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingDoc(!isAddingDoc)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingDoc ? 'بستن فرم' : 'پیوست سند جدید'}</span>
          </button>
        </div>

        {/* فرم بازشونده آپلود مدرک */}
        {isAddingDoc && (
          <form onSubmit={handleSaveDocument} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-white">
                پیوست تصویر یا سند جدید به قرارداد:
              </span>
              <button
                type="button"
                onClick={() => setIsAddingDoc(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  عنوان سند یا مدرک:
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="مثال: صفحه اول قرارداد فیزیکی با امضای طرفین"
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  انتخاب فایل:
                </label>
                <label className="w-full h-10 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between cursor-pointer">
                  <span>{fileBase64 ? 'فایل انتخاب شد ✓' : 'انتخاب تصویر / مدرک'}</span>
                  <UploadCloud className="w-4 h-4 text-amber-500" />
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsAddingDoc(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-xs shadow-md shadow-amber-500/30 cursor-pointer"
              >
                ذخیره مدرک
              </button>
            </div>
          </form>
        )}

        {/* لیست اسناد پیوست شده */}
        {(!contract.attachments || contract.attachments.length === 0) ? (
          <div className="text-center py-12 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-800">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">
              هنوز سندی به این قرارداد پیوست نشده است
            </h4>
            <p className="text-xs text-slate-400 font-bold mt-1">
              تصاویر قرارداد فیزیکی یا اسناد را از طریق دکمه بالا بارگذاری کنید.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {contract.attachments.map(att => (
              <div
                key={att.id}
                className="group relative rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 overflow-hidden p-2 space-y-2 hover:shadow-lg transition-all"
              >
                <div
                  onClick={() => setViewingImg(att.url)}
                  className="w-full h-36 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-900 flex items-center justify-center cursor-pointer relative"
                >
                  {att.url ? (
                    <img src={att.url} alt={att.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <FileText className="w-8 h-8 text-slate-400" />
                  )}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Eye className="w-6 h-6" />
                  </div>
                </div>

                <div className="flex items-start justify-between gap-1 px-1">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-slate-800 dark:text-white truncate">
                      {att.title}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {att.date}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteAttachment(contract.id, att.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                    title="حذف سند"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* لایت‌باکس بزرگنمایی تصویر */}
      {viewingImg && (
        <div
          onClick={() => setViewingImg(null)}
          className="fixed inset-0 z-[120000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl">
            <img src={viewingImg} alt="سند پیوست" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
