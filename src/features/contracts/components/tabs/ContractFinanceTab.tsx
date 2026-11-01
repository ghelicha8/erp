import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, Banknote, ArrowUpRight, ArrowDownLeft, Plus, 
  CheckCircle, Clock, ShieldCheck, Eye, FileText, Check, 
  AlertCircle, Calendar, Filter
} from 'lucide-react';
import moment from 'moment-jalaali';

import type { Contract } from '../../../../store/contractStore';
import { calculateFinalContractAmount, calculateRetentionAmount } from '../../../../store/contractStore';
import { useFinanceStore } from '../../../../store/financeStore';
import UniversalTransactionModal from '../../../../components/shared/UniversalTransactionModal';
import { formatCurrency } from '../../../../core/utils/currency';

interface ContractFinanceTabProps {
  contract: Contract;
}

export default function ContractFinanceTab({ contract }: ContractFinanceTabProps) {
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [includePendingCheques, setIncludePendingCheques] = useState(true);
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  const { transactions } = useFinanceStore();

  // فیلتر تراکنش‌های مرتبط با این قرارداد یا طرف حساب و پروژه
  const relatedTransactions = useMemo(() => {
    return (transactions || []).filter(tx => {
      // تطابق مستقیم با شناسه قرارداد
      if ((tx as any).contractId === contract.id) return true;
      // یا تطابق با پروژه و طرف حساب همزمان
      if (contract.projectId && tx.projectId === contract.projectId) {
        if (contract.partyType === 'CLIENT' && tx.clientId === contract.partyId) return true;
        if (contract.partyType === 'WORKER' && tx.workerId === contract.partyId) return true;
        if (contract.partyType === 'SUPPLIER' && (tx as any).supplierId === contract.partyId) return true;
      }
      return false;
    });
  }, [transactions, contract]);

  const finalAmount = calculateFinalContractAmount(contract);
  const retentionAmount = calculateRetentionAmount(contract);

  // محاسبه مجموع دریافتی‌ها و پرداختی‌ها
  const { totalIn, totalOut } = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;

    relatedTransactions.forEach(tx => {
      // اگر چک است و هنوز پاس نشده و کاربر تیک چک در جریان را نزده، محاسبه نشود
      if (tx.type === 'CHEQUE' && tx.chequeStatus !== 'PASSED' && !includePendingCheques) {
        return;
      }

      if (tx.direction === 'IN') {
        totalIn += (tx.amount || 0);
      } else {
        totalOut += (tx.amount || 0);
      }
    });

    return { totalIn, totalOut };
  }, [relatedTransactions, includePendingCheques]);

  // جهت اصلی قرارداد (درآمدی یا هزینه‌ای)
  const isIncome = contract.category === 'CLIENT_PROJECT' || (contract.category === 'EQUIPMENT_RENTAL' && contract.rentalDirection === 'RENT_OUT');
  const paidOrReceived = isIncome ? totalIn : totalOut;
  const balance = Math.max(0, finalAmount - paidOrReceived);

  // تراکنش‌های فیلترشده بر اساس جهت
  const filteredTxs = useMemo(() => {
    if (filterDirection === 'ALL') return relatedTransactions;
    return relatedTransactions.filter(tx => tx.direction === filterDirection);
  }, [relatedTransactions, filterDirection]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* ردیف ۴ کارت آماری مالی قرارداد */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* کارت ۱: مبلغ نهایی قرارداد */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مبلغ نهایی قرارداد:</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono" dir="ltr">
            {formatCurrency(finalAmount)}
          </div>
          <div className="text-[11px] text-slate-400 font-bold mt-1">
            اولیه: {formatCurrency(contract.initialAmount)} + متمم‌ها
          </div>
        </div>

        {/* کارت ۲: کل دریافتی / پرداختی */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isIncome ? 'مجموع دریافتی تاییدشده:' : 'مجموع پرداختی به طرف حساب:'}
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isIncome ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono" dir="ltr">
            {formatCurrency(paidOrReceived)}
          </div>
          <div className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1">
            <span>{includePendingCheques ? 'شامل چک‌های در جریان' : 'فقط نقد و چک‌های پاس‌شده'}</span>
          </div>
        </div>

        {/* کارت ۳: مانده قابل تسویه */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مانده تسویه نشده:</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono" dir="ltr">
            {formatCurrency(balance)}
          </div>
          <div className="text-[11px] font-bold text-slate-400 mt-1">
            {finalAmount > 0 ? `${Math.round((paidOrReceived / finalAmount) * 100)}٪ تسویه شده` : '۰٪'}
          </div>
        </div>

        {/* کارت ۴: سپرده حسن انجام کار */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">سپرده حسن انجام کار:</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono" dir="ltr">
            {formatCurrency(retentionAmount)}
          </div>
          <div className="text-[11px] font-bold mt-1 flex items-center justify-between">
            <span className="text-slate-400">{contract.retentionPercent}٪ از قرارداد</span>
            <span className={contract.retentionReleased ? 'text-emerald-500' : 'text-amber-500'}>
              {contract.retentionReleased ? 'آزاد شده' : 'مسدود'}
            </span>
          </div>
        </div>
      </div>

      {/* نوار فیلتر و اکشن‌های جدول مالی */}
      <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* سوئیچ وضعیت چک‌ها */}
          <button
            type="button"
            onClick={() => setIncludePendingCheques(!includePendingCheques)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              includePendingCheques
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>{includePendingCheques ? 'چک‌های در جریان: لحاظ شده' : 'چک‌های در جریان: نادیده گرفته شده'}</span>
          </button>

          {/* فیلتر جهت تراکنش */}
          <div className="flex bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setFilterDirection('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filterDirection === 'ALL' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
            >
              همه ({relatedTransactions.length})
            </button>
            <button
              onClick={() => setFilterDirection('IN')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filterDirection === 'IN' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`}
            >
              دریافتی
            </button>
            <button
              onClick={() => setFilterDirection('OUT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filterDirection === 'OUT' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400'}`}
            >
              پرداختی
            </button>
          </div>
        </div>

        {/* دکمه ثبت تراکنش جدید با باز کردن مودال مادر */}
        <button
          type="button"
          onClick={() => setIsTxModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت دریافت / پرداخت وجه</span>
        </button>
      </div>

      {/* جدول تراکنش‌های مالی قرارداد */}
      {filteredTxs.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-50/50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
          <Wallet className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-black text-slate-700 dark:text-slate-300">
            هیچ تراکنش مالی برای این قرارداد ثبت نشده است
          </h4>
          <p className="text-xs text-slate-400 font-bold mt-1">
            با زدن دکمه «ثبت دریافت / پرداخت وجه» اولین سند را در مودال پرداخت مادر صادر کنید.
          </p>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-400 bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="p-4">نوع سند</th>
                  <th className="p-4">تاریخ ثبت</th>
                  <th className="p-4">شرح سند</th>
                  <th className="p-4 text-center">روش پرداخت</th>
                  <th className="p-4 text-center">وضعیت سند</th>
                  <th className="p-4 text-left">مبلغ سند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold">
                {filteredTxs.map((tx) => {
                  const isTxIn = tx.direction === 'IN';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                          isTxIn
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}>
                          {isTxIn ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          {isTxIn ? 'دریافت از کارفرما' : 'پرداخت وجه'}
                        </span>
                      </td>

                      <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                        {tx.date}
                      </td>

                      <td className="p-4 text-slate-800 dark:text-slate-200">
                        {tx.description || 'بدون شرح'}
                      </td>

                      <td className="p-4 text-center">
                        <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {tx.type === 'CASH' ? 'نقدی / واریز' : tx.type === 'CHEQUE' ? 'چک صیادی' : 'حواله بانکی'}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        {tx.type === 'CHEQUE' ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                            tx.chequeStatus === 'PASSED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : tx.chequeStatus === 'REJECTED'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                          }`}>
                            {tx.chequeStatus === 'PASSED' ? 'چک پاس شده' : tx.chequeStatus === 'REJECTED' ? 'برگشتی' : 'چک در جریان'}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-black">
                            تسویه قطعی
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-left font-mono font-black" dir="ltr">
                        <span className={isTxIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {isTxIn ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* اتصال به مودال پرداخت مادر با قفل شدن پروژه و طرف حساب و انتقال شناسه قرارداد */}
      {isTxModalOpen && (
        <UniversalTransactionModal
          isOpen={isTxModalOpen}
          onClose={() => setIsTxModalOpen(false)}
          context="CONTRACT"
          contractId={contract.id}
          projectId={contract.projectId}
          clientId={contract.partyType === 'CLIENT' ? contract.partyId : undefined}
          workerId={contract.partyType === 'WORKER' ? contract.partyId : undefined}
          supplierId={contract.partyType === 'SUPPLIER' ? contract.partyId : undefined}
          initialDirection={isIncome ? 'IN' : 'OUT'}
        />
      )}
    </div>
  );
}
