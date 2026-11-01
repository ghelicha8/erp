import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Coins, Calendar, Trash2, Edit, CheckCircle2, Clock, 
  AlertCircle, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

import { 
  useLogisticsStore, 
  type VehicleMiscExpense 
} from '../../../store/logisticsStore';
import { 
  AppSearchInput, 
  GlassDatePicker, 
  PortalSelect, 
  FloatingUndoToast, 
  AnimatedCheckbox 
} from '../../../components/ui/SharedLaborUI';
import { formatCurrency, getCurrencyUnit } from '../../../core/utils/currency';
import VehicleMiscModal from './VehicleMiscModal';

interface VehicleMiscTabProps {
  vehicleId: string;
}

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '۱۰ ردیف' },
  { value: '25', label: '۲۵ ردیف' },
  { value: '50', label: '۵۰ ردیف' },
  { value: '100', label: '۱۰۰ ردیف' },
  { value: 'ALL', label: 'نمایش همه' },
];

export default function VehicleMiscTab({ vehicleId }: VehicleMiscTabProps) {
  const { miscExpenses, deleteMiscExpense, deleteMultipleMiscExpenses } = useLogisticsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState('25');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<VehicleMiscExpense | null>(null);

  // سیستم ۵ ثانیه‌ای حذف شناور
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
          deleteMultipleMiscExpenses(expiredIds);
          setPendingDeleteIds(curr => curr.filter(id => !expiredIds.includes(id)));
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteMultipleMiscExpenses]);

  const handleRemoveWithUndo = (id: string, title: string) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: [id], expireAt: Date.now() + 5000, title }]);
    setPendingDeleteIds(prev => [...prev, id]);
    setSelectedIds(prev => prev.filter(item => item !== id));
  };

  const handleBulkDeleteWithUndo = () => {
    if (selectedIds.length === 0) return;
    const undoId = Date.now().toString();
    const count = selectedIds.length;
    setUndoItems(prev => [...prev, { 
      id: undoId, 
      items: [...selectedIds], 
      expireAt: Date.now() + 5000, 
      title: `${count} ردیف هزینه جانبی` 
    }]);
    setPendingDeleteIds(prev => [...prev, ...selectedIds]);
    setSelectedIds([]);
  };

  const handleCancelUndo = (undoId: string | number) => {
    const target = undoItems.find(u => String(u.id) === String(undoId));
    if (target) {
      setPendingDeleteIds(prev => prev.filter(id => !target.items.includes(id)));
      setUndoItems(prev => prev.filter(u => String(u.id) !== String(undoId)));
      toast.success('حذف ردیف لغو شد.');
    }
  };

  // تمام رکوردهای این خودرو به جز رکوردهای در انتظار حذف
  const vehicleExpenses = useMemo(() => {
    return (miscExpenses || []).filter(m => m.vehicleId === vehicleId && !pendingDeleteIds.includes(m.id));
  }, [miscExpenses, vehicleId, pendingDeleteIds]);

  // فیلتر جستجو و تاریخ
  const filteredExpenses = useMemo(() => {
    let result = vehicleExpenses;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.expenseType.toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
      );
    }

    if (dateFrom) {
      result = result.filter(m => m.date >= dateFrom);
    }

    if (dateTo) {
      result = result.filter(m => m.date <= dateTo);
    }

    return result.sort((a, b) => 
      (b.date || '').localeCompare(a.date || '') ||
      (b.createdAt || '').localeCompare(a.createdAt || '') ||
      (b.id || '').localeCompare(a.id || '')
    );
  }, [vehicleExpenses, searchQuery, dateFrom, dateTo]);

  // محدودیت تعداد صفحه
  const displayExpenses = useMemo(() => {
    if (pageSize === 'ALL') return filteredExpenses;
    const limit = parseInt(pageSize, 10) || 25;
    return filteredExpenses.slice(0, limit);
  }, [filteredExpenses, pageSize]);

  // کارت‌های آماری
  const stats = useMemo(() => {
    const totalAmount = vehicleExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const settledAmount = vehicleExpenses.reduce((acc, curr) => {
      if (curr.settlementStatus === 'SETTLED') return acc + curr.amount;
      if (curr.settlementStatus === 'PARTIAL') return acc + (curr.paidAmount || 0);
      return acc;
    }, 0);
    const pendingAmount = Math.max(0, totalAmount - settledAmount);

    return {
      totalCount: vehicleExpenses.length,
      totalAmount,
      settledAmount,
      pendingAmount,
    };
  }, [vehicleExpenses]);

  const toggleSelectAll = () => {
    if (selectedIds.length === displayExpenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayExpenses.map(d => d.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      
      {/* پیام بازگردانی حذف تایمردار */}
      <FloatingUndoToast undoItems={undoItems} onCancel={handleCancelUndo} />

      {/* کارت‌های آماری هزینه‌های جانبی */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-amber-200/50 dark:border-amber-800/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">کل هزینه‌های جانبی</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {formatCurrency(stats.totalAmount)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">مبالغ تسویه‌شده</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {formatCurrency(stats.settledAmount)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">مانده تسویه‌نشده</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
              {formatCurrency(stats.pendingAmount)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* نوار جستجو، فیلتر بازه زمانی و انتخاب اندازه صفحه */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm">
        
        <div className="flex-1 min-w-[220px]">
          <AppSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="جستجو در سرفصل هزینه یا توضیحات..."
            className="w-full h-[46px]"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          
          <div className="w-36 h-[46px]">
            <GlassDatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="از تاریخ"
            />
          </div>

          <div className="w-36 h-[46px]">
            <GlassDatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="تا تاریخ"
            />
          </div>

          <div className="w-44 h-[46px]">
            <PortalSelect
              value={pageSize}
              onChange={(val) => setPageSize(String(val))}
              options={PAGE_SIZE_OPTIONS}
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

      {/* لیست هزینه‌های جانبی */}
      {filteredExpenses.length === 0 ? (
        <div className="p-14 text-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl">
          <FileText className="w-14 h-14 text-slate-400 mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-black text-slate-700 dark:text-slate-300">هیچ هزینه جانبی یافت نشد</h3>
          <p className="text-xs font-bold text-slate-500 mt-1">
            {searchQuery || dateFrom || dateTo ? 'موردی با فیلترهای مشخص‌شده همخوانی ندارد.' : 'با زدن کلید Ctrl+N یا دکمه «ثبت هزینه جانبی» در هدر صفحه، هزینه جدید ثبت کنید.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          
          {/* هدر جدول در سایز بزرگ */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-2.5 text-[11px] font-black text-slate-400 bg-white/30 dark:bg-slate-800/30 rounded-2xl border border-white/50 dark:border-slate-700/50">
            <div className="col-span-1 flex items-center gap-2">
              <AnimatedCheckbox
                checked={displayExpenses.length > 0 && selectedIds.length === displayExpenses.length}
                onChange={toggleSelectAll}
                theme="amber"
              />
              <span>#</span>
            </div>
            <div className="col-span-3">سرفصل هزینه</div>
            <div className="col-span-2">تاریخ وقوع</div>
            <div className="col-span-2">مبلغ ({getCurrencyUnit()})</div>
            <div className="col-span-2 text-center">وضعیت تسویه</div>
            <div className="col-span-2 text-left">عملیات</div>
          </div>

          <AnimatePresence>
            {displayExpenses.map((expense, idx) => {
              const isSelected = selectedIds.includes(expense.id);

              return (
                <motion.div
                  key={expense.id}
                  layout="position"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSelected 
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-600 shadow-md'
                      : 'bg-white/70 dark:bg-slate-800/70 border-white/80 dark:border-slate-700/80 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                    
                    {/* چک‌باکس و ردیف */}
                    <div className="lg:col-span-1 flex items-center gap-3">
                      <AnimatedCheckbox
                        checked={isSelected}
                        onChange={() => toggleSelect(expense.id)}
                        theme="amber"
                      />
                      <span className="font-mono text-xs font-bold text-slate-400">{idx + 1}</span>
                    </div>

                    {/* سرفصل هزینه و توضیحات */}
                    <div className="lg:col-span-3">
                      <div className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                        {expense.expenseType}
                      </div>
                      {expense.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          {expense.description}
                        </p>
                      )}
                    </div>

                    {/* تاریخ */}
                    <div className="lg:col-span-2 flex items-center gap-1.5 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {expense.date}
                    </div>

                    {/* مبلغ */}
                    <div className="lg:col-span-2">
                      <div className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">
                        {formatCurrency(expense.amount)}
                      </div>
                      {expense.settlementStatus === 'PARTIAL' && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono block">
                          پرداخت: {formatCurrency(expense.paidAmount || 0)}
                        </span>
                      )}
                    </div>

                    {/* وضعیت تسویه */}
                    <div className="lg:col-span-2 flex items-center justify-start lg:justify-center">
                      {expense.settlementStatus === 'SETTLED' ? (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> تسویه کامل
                        </span>
                      ) : expense.settlementStatus === 'PARTIAL' ? (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> تسویه بخشی
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> مانده تسویه‌نشده
                        </span>
                      )}
                    </div>

                    {/* دکمه‌های عملیات */}
                    <div className="lg:col-span-2 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setExpenseToEdit(expense);
                          setIsModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-amber-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                        title="ویرایش"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveWithUndo(expense.id, expense.expenseType)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                        title="حذف با مهلت بازگردانی"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

        </div>
      )}

      {/* مودال ثبت / ویرایش */}
      <VehicleMiscModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setExpenseToEdit(null);
        }}
        defaultVehicleId={vehicleId}
        expenseToEdit={expenseToEdit}
      />

    </div>
  );
}
