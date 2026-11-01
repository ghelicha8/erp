import React from 'react';
import { motion } from 'framer-motion';
import { 
  Star, Trash2, Building2, HardHat, Truck, ShoppingBag, 
  Calendar, Layers, ShieldCheck, Clock, ArrowUpRight, 
  AlertTriangle, CheckCircle2, TrendingUp, ChevronLeft
} from 'lucide-react';
import moment from 'moment-jalaali';

import type { Contract, ContractCategory } from '../../../store/contractStore';
import { calculateFinalContractAmount, calculateRetentionAmount } from '../../../store/contractStore';
import { formatCurrency } from '../../../core/utils/currency';

interface ContractCardProps {
  contract: Contract;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}

const CATEGORY_META: Record<ContractCategory, { label: string; icon: any; color: string; bgBadge: string }> = {
  CLIENT_PROJECT: {
    label: 'کارفرما و پروژه',
    icon: Building2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgBadge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
  SUBCONTRACTOR_LABOR: {
    label: 'پیمانکار فرعی / اکیپ',
    icon: HardHat,
    color: 'text-blue-600 dark:text-blue-400',
    bgBadge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  },
  EQUIPMENT_RENTAL: {
    label: 'اجاره ماشین و ابزار',
    icon: Truck,
    color: 'text-amber-600 dark:text-amber-400',
    bgBadge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  MATERIAL_SUPPLY: {
    label: 'تأمین مصالح و بنکداری',
    icon: ShoppingBag,
    color: 'text-purple-600 dark:text-purple-400',
    bgBadge: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'پیش‌نویس', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  ACTIVE: { label: 'در حال اجرا', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  COMPLETED: { label: 'تکمیل و تسویه', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  SUSPENDED: { label: 'متوقف / تعلیق', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  TERMINATED: { label: 'فسخ شده', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
};

export default function ContractCard({
  contract,
  onTogglePin,
  onDelete,
  onClick,
}: ContractCardProps) {
  const catMeta = CATEGORY_META[contract.category] || CATEGORY_META.CLIENT_PROJECT;
  const statusMeta = STATUS_META[contract.status] || STATUS_META.ACTIVE;
  const CategoryIcon = catMeta.icon;

  const finalAmount = calculateFinalContractAmount(contract);
  const retentionAmount = calculateRetentionAmount(contract);

  // محاسبه روزهای باقی‌مانده تا پایان قرارداد
  const endDateStr = contract.currentEndDate || contract.initialEndDate;
  let daysRemaining: number | null = null;
  if (endDateStr) {
    try {
      const todayMom = moment().startOf('day');
      const endMom = moment(endDateStr, 'jYYYY/jMM/jDD').startOf('day');
      daysRemaining = endMom.diff(todayMom, 'days');
    } catch {
      daysRemaining = null;
    }
  }

  // محاسبه پیشرفت تقریبی (از روی فازها یا کارکرد تاییدشده)
  let progress = 0;
  if (contract.phases && contract.phases.length > 0) {
    const totalWeight = contract.phases.reduce((sum, p) => sum + (p.weightPercentage || 0), 0) || 100;
    const completedWeight = contract.phases.reduce((sum, p) => sum + ((p.progressPercentage || 0) * (p.weightPercentage || 0)) / 100, 0);
    progress = Math.round((completedWeight / totalWeight) * 100);
  } else if (contract.measurementItems && contract.measurementItems.length > 0) {
    const total = contract.measurementItems.reduce((acc, m) => acc + (m.totalPrice || 0), 0);
    const certified = contract.measurementItems.reduce((acc, m) => acc + ((m.completedQuantity || 0) * (m.unitPrice || 0)), 0);
    if (total > 0) progress = Math.min(100, Math.round((certified / total) * 100));
  } else if (contract.status === 'COMPLETED') {
    progress = 100;
  }

  const guaranteesCount = (contract.guarantees || []).filter(g => g.status === 'HELD').length;
  const addendumsCount = (contract.addendums || []).length;

  return (
    <motion.div
      layout="position"
      transition={{ layout: { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }, opacity: { duration: 0.2 } }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
      onClick={onClick}
      className={`relative backdrop-blur-2xl border rounded-[2rem] p-6 transition-all duration-300 group overflow-hidden cursor-pointer ${
        contract.isPinned
          ? 'bg-white/75 dark:bg-slate-800/80 border-amber-400/60 dark:border-amber-500/60 shadow-[0_15px_40px_rgba(245,158,11,0.18)]'
          : 'bg-white/50 dark:bg-slate-900/50 border-white/60 dark:border-slate-800/60 shadow-lg hover:shadow-[0_20px_45px_rgba(0,0,0,0.08)] hover:border-amber-300/50'
      }`}
      dir="rtl"
    >
      {/* هاله نور در صورت پین بودن */}
      {contract.isPinned && (
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/20 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none"
        />
      )}

      {/* هدر کارت: بج دسته‌بندی، شماره و دکمه‌های پین/حذف */}
      <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-sm">
            <CategoryIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${catMeta.bgBadge}`}>
                {catMeta.label}
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 block mt-1" dir="ltr">
              {contract.contractNumber}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(contract.id);
            }}
            title="حذف قرارداد"
            className="p-1.5 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(contract.id);
            }}
            title={contract.isPinned ? 'برداشتن ستاره' : 'ستاره‌دار کردن'}
            className="p-1.5 rounded-xl transition-all cursor-pointer"
          >
            <Star
              className={`w-5 h-5 transition-all ${
                contract.isPinned
                  ? 'fill-amber-400 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                  : 'text-slate-300 hover:text-amber-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* عنوان قرارداد و طرف حساب */}
      <div className="mb-4 relative z-10">
        <h3 className="text-base font-black text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1 leading-snug">
          {contract.title}
        </h3>
        <div className="flex items-center gap-2 mt-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="font-black text-slate-700 dark:text-slate-300">
            طرف حساب: {contract.partyName}
          </span>
          {contract.projectName && (
            <>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="truncate max-w-[160px] text-indigo-600 dark:text-indigo-400">
                پروژه: {contract.projectName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* مبالغ و نوار پیشرفت */}
      <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 space-y-2.5 mb-4 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">مبلغ نهایی قرارداد:</span>
          <span className="text-sm font-black text-slate-800 dark:text-white font-mono" dir="ltr">
            {formatCurrency(finalAmount)}
          </span>
        </div>

        {addendumsCount > 0 && (
          <div className="flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400 font-bold border-t border-slate-200/50 dark:border-slate-700/50 pt-1.5">
            <span>شامل {addendumsCount} متمم / الحاقیه</span>
            <span>اولیه: {formatCurrency(contract.initialAmount)}</span>
          </div>
        )}

        {/* نوار پیشرفت فیزیکی / ریالی */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>پیشرفت اجرایی</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                progress >= 100
                  ? 'bg-emerald-500'
                  : progress >= 50
                  ? 'bg-amber-500'
                  : 'bg-indigo-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* بج‌های اطلاعاتی پایین کارت */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-bold mb-4 relative z-10">
        {/* تاریخ سررسید و روزهای باقی‌مانده */}
        <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/50 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="truncate">
            <span className="text-slate-400 text-[10px] block">مهلت تا:</span>
            <span className="text-slate-700 dark:text-slate-200 font-mono text-[10px]">
              {endDateStr} {daysRemaining !== null ? `(${daysRemaining > 0 ? `${daysRemaining} روز` : 'منقضی'})` : ''}
            </span>
          </div>
        </div>

        {/* سپرده حسن انجام کار */}
        <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/50 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <div className="truncate">
            <span className="text-slate-400 text-[10px] block">حسن انجام کار:</span>
            <span className="text-slate-700 dark:text-slate-200 font-mono text-[10px]">
              {contract.retentionReleased ? 'آزاد شده' : `${contract.retentionPercent}٪ (${formatCurrency(retentionAmount)})`}
            </span>
          </div>
        </div>
      </div>

      {/* فوتر کارت: تضامین باز و اکشن باز کردن */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-black relative z-10">
        <div className="flex items-center gap-2">
          {guaranteesCount > 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> {guaranteesCount} ضمانت در جریان
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">بدون تضامین مسدود</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 group-hover:translate-x-[-4px] transition-transform">
          <span>مشاهده و پرونده</span>
          <ChevronLeft className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
}
