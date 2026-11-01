import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, ShieldCheck, Calendar, Clock, CreditCard, 
  Trash2, Edit, CheckCircle2, Coins, Search, AlertCircle, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useLogisticsStore, 
  INSURANCE_TYPE_LABELS,
  type VehicleInsuranceRecord,
  type InsuranceType 
} from '../../../store/logisticsStore';
import { 
  AppSearchInput, 
  PortalSelect, 
  GlassDatePicker,
  AnimatedCheckbox, 
  FloatingUndoToast 
} from '../../../components/ui/SharedLaborUI';
import { formatCurrency, getCurrencyUnit } from '../../../core/utils/currency';
import VehicleInsuranceModal from './VehicleInsuranceModal';

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '۱۰ ردیف' },
  { value: '25', label: '۲۵ ردیف' },
  { value: '50', label: '۵۰ ردیف' },
  { value: '100', label: '۱۰۰ ردیف' },
  { value: 'ALL', label: 'نمایش همه' },
];

interface VehicleInsuranceTabProps {
  vehicleId: string;
}

const INSURANCE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'همه انواع بیمه‌نامه' },
  { value: 'THIRD_PARTY', label: 'بیمه شخص ثالث' },
  { value: 'BODY', label: 'بیمه بدنه' },
  { value: 'CIVIL_RESPONSIBILITY', label: 'مسئولیت مدنی کارگاهی' },
  { value: 'OTHER', label: 'سایر بیمه‌نامه‌ها' },
];

export default function VehicleInsuranceTab({ vehicleId }: VehicleInsuranceTabProps) {
  const { insurances, deleteInsurance, toggleInstallmentPaid, vehicles } = useLogisticsStore();
  const vehicle = vehicles.find(v => v.id === vehicleId);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState('25');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [insuranceToEdit, setInsuranceToEdit] = useState<VehicleInsuranceRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // سیستم ۵ ثانیه‌ای حذف شناور و انصراف (Zero window.confirm)
  const [undoItems, setUndoItems] = useState<{ id: string; items: string[]; expireAt: number; title?: string }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
        const expired = prev.filter(u => u.expireAt <= now);
        const active = prev.filter(u => u.expireAt > now);
        if (expired.length > 0) {
          const expiredIds = expired.flatMap(e => e.items);
          expiredIds.forEach(id => deleteInsurance(id));
          setPendingDeleteIds(curr => curr.filter(id => !expiredIds.includes(id)));
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteInsurance]);

  const handleRemoveWithUndo = (id: string, company: string) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [
      ...prev,
      { id: undoId, items: [id], expireAt: Date.now() + 5000, title: `بیمه «${company}»` }
    ]);
    setPendingDeleteIds(prev => [...prev, id]);
    setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const handleBulkDeleteWithUndo = () => {
    if (selectedIds.length === 0) return;
    const undoId = Date.now().toString();
    setUndoItems(prev => [
      ...prev,
      {
        id: undoId,
        items: [...selectedIds],
        expireAt: Date.now() + 5000,
        title: `${selectedIds.length} فقره بیمه‌نامه`
      }
    ]);
    setPendingDeleteIds(prev => [...prev, ...selectedIds]);
    setSelectedIds([]);
  };

  const handleCancelUndo = (undoId: string | number) => {
    const target = undoItems.find(u => String(u.id) === String(undoId));
    if (target) {
      setPendingDeleteIds(prev => prev.filter(id => !target.items.includes(id)));
      setUndoItems(prev => prev.filter(u => String(u.id) !== String(undoId)));
      toast.success('حذف بیمه‌نامه لغو شد.');
    }
  };

  const vehicleInsurances = useMemo(() => {
    return (insurances || []).filter(ins => ins.vehicleId === vehicleId && !pendingDeleteIds.includes(ins.id));
  }, [insurances, vehicleId, pendingDeleteIds]);

  const filteredInsurances = useMemo(() => {
    let result = vehicleInsurances;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(ins => 
        ins.companyName.toLowerCase().includes(q) ||
        (ins.policyNumber || '').toLowerCase().includes(q) ||
        (ins.notes || '').toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'ALL') {
      result = result.filter(ins => ins.insuranceType === typeFilter);
    }

    if (dateFrom) {
      result = result.filter(ins => (ins.startDate || '') >= dateFrom);
    }

    if (dateTo) {
      result = result.filter(ins => (ins.startDate || '') <= dateTo);
    }

    // اولویت ۱: تاریخ صدور نزولی | اولویت ۲: زمان ساخت یا شناسه نزولی
    return result.sort((a, b) => 
      (b.startDate || '').localeCompare(a.startDate || '') || 
      (b.createdAt || '').localeCompare(a.createdAt || '') || 
      b.id.localeCompare(a.id)
    );
  }, [vehicleInsurances, searchQuery, typeFilter, dateFrom, dateTo]);

  const displayInsurances = useMemo(() => {
    if (pageSize === 'ALL') return filteredInsurances;
    const limit = parseInt(pageSize, 10) || 25;
    return filteredInsurances.slice(0, limit);
  }, [filteredInsurances, pageSize]);

  // آمار کلی بیمه‌های این خودرو
  const stats = useMemo(() => {
    const today = moment().format('jYYYY/jMM/jDD');
    let totalSpend = 0;
    let pendingInstallmentsCount = 0;
    let pendingInstallmentsAmount = 0;
    let activePoliciesCount = 0;

    vehicleInsurances.forEach(ins => {
      totalSpend += ins.totalAmount || 0;
      
      const daysToExpiry = moment(ins.endDate, 'jYYYY/jMM/jDD').diff(moment(today, 'jYYYY/jMM/jDD'), 'days');
      if (daysToExpiry >= 0) {
        activePoliciesCount++;
      }

      if (ins.paymentMode === 'INSTALLMENT' && ins.installments) {
        ins.installments.forEach(inst => {
          if (!inst.isPaid) {
            pendingInstallmentsCount++;
            pendingInstallmentsAmount += inst.amount || 0;
          }
        });
      }
    });

    return {
      totalSpend,
      activePoliciesCount,
      pendingInstallmentsCount,
      pendingInstallmentsAmount,
      totalPoliciesCount: vehicleInsurances.length,
    };
  }, [vehicleInsurances]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayInsurances.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayInsurances.map(ins => ins.id));
    }
  };

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {/* کارت‌های آماری سریع بیمه */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-amber-200/50 dark:border-amber-800/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">بیمه‌نامه‌های فعال</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.activePoliciesCount} <span className="text-xs font-bold text-slate-400">فقره بیمه‌نامه</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">کل هزینه‌های حق بیمه</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {formatCurrency(stats.totalSpend)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">اقساط پرداخت‌نشده</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {stats.pendingInstallmentsCount} <span className="text-xs font-bold text-slate-400">قسط ({formatCurrency(stats.pendingInstallmentsAmount)})</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* نوار جستجو، فیلتر و دکمه حذف گروهی */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm">
        
        <div className="flex-1 min-w-[240px]">
          <AppSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="جستجو در شرکت بیمه، شماره بیمه‌نامه یا توضیحات..."
            className="w-full h-[46px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40 h-[46px]">
            <GlassDatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="از تاریخ"
            />
          </div>

          <div className="w-40 h-[46px]">
            <GlassDatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="تا تاریخ"
            />
          </div>

          <div className="w-52 shrink-0 h-[46px]">
            <PortalSelect
              value={typeFilter}
              onChange={(val) => setTypeFilter(String(val))}
              options={INSURANCE_FILTER_OPTIONS}
              searchable={true}
              icon={ShieldAlert}
              placeholder="نوع بیمه‌نامه..."
              className="!h-[46px] !rounded-2xl border-white/60 dark:border-slate-700/60"
            />
          </div>

          <div className="w-36 h-[46px]">
            <PortalSelect
              value={pageSize}
              onChange={(val) => setPageSize(String(val))}
              options={PAGE_SIZE_OPTIONS}
              placeholder="تعداد نمایش"
              className="!h-[46px] !rounded-2xl"
            />
          </div>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDeleteWithUndo}
              className="h-[46px] px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-rose-500/25 shrink-0 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> حذف گروهی ({selectedIds.length})
            </button>
          )}
        </div>

      </div>

      {/* هدر انتخاب همه در صورت وجود آیتم */}
      {filteredInsurances.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-white/30 dark:bg-slate-800/30 rounded-2xl border border-white/40 dark:border-slate-700/40 text-xs text-slate-500 font-bold">
          <div className="flex items-center gap-2.5">
            <AnimatedCheckbox
              checked={selectedIds.length === displayInsurances.length && displayInsurances.length > 0}
              onChange={toggleSelectAll}
              theme="amber"
            />
            <span>انتخاب موارد نمایش‌داده‌شده ({displayInsurances.length} از {filteredInsurances.length})</span>
          </div>
          <span className="text-[11px] font-mono">مرتب‌سازی: جدیدترین تاریخ</span>
        </div>
      )}

      {/* لیست کارت‌های تاریخچه بیمه‌نامه‌ها */}
      {filteredInsurances.length === 0 ? (
        <div className="p-14 text-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl">
          <ShieldAlert className="w-14 h-14 text-slate-400 mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-black text-slate-700 dark:text-slate-300">هیچ بیمه‌نامه‌ای یافت نشد</h3>
          <p className="text-xs font-bold text-slate-500 mt-1">
            {searchQuery ? 'نتیجه‌ای با عبارت جستجو شده تطابق ندارد.' : 'با فشردن کلید Ctrl+N یا دکمه «ثبت بیمه‌نامه» در هدر صفحه، سوابق بیمه شخص ثالث یا بدنه این خودرو را ثبت کنید.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {displayInsurances.map((ins) => {
              const todayStr = moment().format('jYYYY/jMM/jDD');
              const daysLeft = moment(ins.endDate, 'jYYYY/jMM/jDD').diff(moment(todayStr, 'jYYYY/jMM/jDD'), 'days');
              const isExpired = daysLeft < 0;
              const isNearExpiry = daysLeft >= 0 && daysLeft <= 30;

              const totalInst = ins.installments?.length || 0;
              const paidInst = ins.installments?.filter(i => i.isPaid).length || 0;
              const progressPercent = totalInst > 0 ? Math.round((paidInst / totalInst) * 100) : 100;
              const isSelected = selectedIds.includes(ins.id);

              return (
                <motion.div
                  key={ins.id}
                  layout="position"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative p-5 rounded-3xl backdrop-blur-2xl border transition-all shadow-sm hover:shadow-md flex flex-col gap-4 overflow-hidden ${
                    isSelected
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-600 shadow-md'
                      : isExpired 
                      ? 'bg-white/70 dark:bg-slate-900/60 border-rose-300/60 dark:border-rose-900/50' 
                      : isNearExpiry 
                        ? 'bg-white/70 dark:bg-slate-900/60 border-amber-400/60 dark:border-amber-600/50' 
                        : 'bg-white/70 dark:bg-slate-900/60 border-white/80 dark:border-slate-800'
                  }`}
                >
                  {/* ردیف سربرگ کارت */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    
                    <div className="flex items-center gap-3">
                      <AnimatedCheckbox
                        checked={isSelected}
                        onChange={() => toggleSelect(ins.id)}
                        theme="amber"
                      />

                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${
                        isExpired 
                          ? 'bg-rose-500' 
                          : isNearExpiry 
                            ? 'bg-amber-500' 
                            : 'bg-emerald-500'
                      }`}>
                        <ShieldCheck className="w-6 h-6" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-base text-slate-800 dark:text-white">
                            {ins.companyName}
                          </h4>
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            {INSURANCE_TYPE_LABELS[ins.insuranceType] || ins.insuranceType}
                          </span>
                          
                          {/* تگ وضعیت اعتبار */}
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            isExpired
                              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                              : isNearExpiry
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}>
                            {isExpired ? 'منقضی شده' : isNearExpiry ? `نزدیک به انقضا (${daysLeft} روز باقیمانده)` : `معتبر (${daysLeft} روز تا پایان)`}
                          </span>
                        </div>

                        {ins.policyNumber && (
                          <span className="text-xs font-mono text-slate-400 mt-0.5 block" dir="ltr">
                            کد بیمه‌نامه: #{ins.policyNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* دکمه‌های عملیات و هزینه کل */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-slate-400 block">حق بیمه کل:</span>
                        <span className="font-mono text-base font-black text-slate-800 dark:text-white">
                          {formatCurrency(ins.totalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2">
                        <button
                          type="button"
                          onClick={() => {
                            setInsuranceToEdit(ins);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-colors cursor-pointer"
                          title="ویرایش بیمه‌نامه"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveWithUndo(ins.id, ins.companyName)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                          title="حذف بیمه‌نامه"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* بازه زمانی و شیوه تسویه */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 text-xs font-bold border border-slate-200/40 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-500">تاریخ صدور:</span>
                      <span className="text-slate-700 dark:text-slate-200">{ins.startDate}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-500">تاریخ انقضا:</span>
                      <span className={isExpired ? 'text-rose-500 font-black' : 'text-slate-700 dark:text-slate-200'}>
                        {ins.endDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-500">روش پرداخت:</span>
                      <span className="text-slate-700 dark:text-slate-200">
                        {ins.paymentMode === 'LUMP_SUM' ? 'نقدی یکجا' : `اقساطی (${totalInst} قسط)`}
                      </span>
                    </div>
                  </div>

                  {/* وضعیت اقساط در حالت INSTALLMENT */}
                  {ins.paymentMode === 'INSTALLMENT' && ins.installments && ins.installments.length > 0 && (
                    <div className="space-y-3 pt-1">
                      
                      {/* نوار درصد تسویه اقساط */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-600 dark:text-slate-300">
                            پیشرفت تسویه اقساط: {paidInst} از {totalInst} قسط پرداخت شده
                          </span>
                          <span className="font-mono text-amber-600 dark:text-amber-400">{progressPercent}٪</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/60 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                          />
                        </div>
                      </div>

                      {/* ریزاقساط با چک‌باکس پرداخت */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                        {ins.installments.map((inst) => (
                          <div
                            key={inst.id}
                            className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                              inst.isPaid
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/40'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">
                                قسط {inst.installmentNumber}
                              </span>
                              <AnimatedCheckbox
                                checked={inst.isPaid}
                                onChange={() => toggleInstallmentPaid(ins.id, inst.id)}
                                theme="amber"
                              />
                            </div>

                            <div className="text-[11px] space-y-1">
                              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                                <span>سررسید:</span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{inst.dueDate}</span>
                              </div>
                              <div className="flex items-center justify-between font-mono font-black text-slate-800 dark:text-white">
                                <span>مبلغ:</span>
                                <span>{formatCurrency(inst.amount)}</span>
                              </div>
                            </div>

                            <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[10px]">
                              {inst.isPaid ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> تسویه شده {inst.paidDate ? `(${inst.paidDate})` : ''}
                                </span>
                              ) : (
                                <span className="text-rose-500 font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> در انتظار پرداخت
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  )}

                  {/* توضیحات تکمیلی */}
                  {ins.notes && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                      <span className="font-bold text-amber-600 dark:text-amber-400 block mb-0.5">یادداشت:</span>
                      {ins.notes}
                    </div>
                  )}

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* سیستم توست شناور ۵ ثانیه‌ای حذف با دکمه انصراف */}
      <FloatingUndoToast 
        undoItems={undoItems} 
        onCancel={handleCancelUndo} 
      />

      {/* مودال ثبت و ویرایش بیمه‌نامه */}
      <VehicleInsuranceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setInsuranceToEdit(null);
        }}
        defaultVehicleId={vehicleId}
        insuranceToEdit={insuranceToEdit}
      />

    </div>
  );
}
