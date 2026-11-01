import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Handshake, Calendar, Trash2, Edit2, CheckCircle2, Clock, AlertTriangle, 
  Coins, FileText, Building2, User, Users
} from 'lucide-react';
import { toast } from 'sonner';

import { 
  useLogisticsStore, 
  TOOL_RENTAL_UNIT_LABELS,
  type ToolRentalRecord,
  type SettlementStatus 
} from '../../../store/logisticsStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useClientStore } from '../../../store/clientStore';

import { 
  AppSearchInput, 
  GlassDatePicker, 
  PortalSelect, 
  FloatingUndoToast,
  AnimatedCheckbox 
} from '../../../components/ui/SharedLaborUI';
import { formatCurrency } from '../../../core/utils/currency';
import ToolRentalModal from './ToolRentalModal';

interface ToolRentalTabProps {
  toolId: string;
}

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '۱۰ ردیف' },
  { value: '25', label: '۲۵ ردیف' },
  { value: '50', label: '۵۰ ردیف' },
  { value: '100', label: '۱۰۰ ردیف' },
  { value: 'ALL', label: 'نمایش همه' },
];

const SETTLEMENT_STATUS_OPTIONS = [
  { value: 'ALL', label: 'همه وضعیت‌های تسویه' },
  { value: 'SETTLED', label: 'تسویه کامل' },
  { value: 'PENDING', label: 'مانده (تسویه‌نشده)' },
  { value: 'PARTIAL', label: 'تسویه بخشی' },
];

export default function ToolRentalTab({ toolId }: ToolRentalTabProps) {
  const { toolRentals, deleteMultipleToolRentals, updateToolRental } = useLogisticsStore();
  const projects = useProjectStore(state => state.projects) || [];
  const clients = useClientStore(state => state.clients) || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState('25');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rentalToEdit, setRentalToEdit] = useState<ToolRentalRecord | null>(null);

  // سیستم ۵ ثانیه‌ای حذف شناور و انصراف
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
          deleteMultipleToolRentals(expiredIds);
          setPendingDeleteIds(curr => curr.filter(id => !expiredIds.includes(id)));
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteMultipleToolRentals]);

  const rentalsForTool = useMemo(() => {
    return (toolRentals || []).filter(r => r.toolId === toolId && !pendingDeleteIds.includes(r.id));
  }, [toolRentals, toolId, pendingDeleteIds]);

  const filteredRentals = useMemo(() => {
    let result = rentalsForTool;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => {
        const proj = projects.find(p => p.id === r.projectId);
        const projName = (proj?.title || proj?.name || '').toLowerCase();
        const clientName = (r.clientName || '').toLowerCase();
        const opName = (r.operatorName || '').toLowerCase();
        const notesMatch = (r.notes || '').toLowerCase();
        return projName.includes(q) || clientName.includes(q) || opName.includes(q) || notesMatch.includes(q);
      });
    }

    if (dateFrom) {
      result = result.filter(r => (r.startDate || '') >= dateFrom);
    }

    if (dateTo) {
      result = result.filter(r => (r.startDate || '') <= dateTo);
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(r => (r.settlementStatus || 'PENDING') === statusFilter);
    }

    return result.sort((a, b) => 
      (b.startDate || '').localeCompare(a.startDate || '') ||
      (b.createdAt || '').localeCompare(a.createdAt || '') ||
      b.id.localeCompare(a.id)
    );
  }, [rentalsForTool, searchQuery, dateFrom, dateTo, statusFilter, projects]);

  const displayRentals = useMemo(() => {
    if (pageSize === 'ALL') return filteredRentals;
    const limit = parseInt(pageSize, 10) || 25;
    return filteredRentals.slice(0, limit);
  }, [filteredRentals, pageSize]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let settledAmount = 0;
    let pendingAmount = 0;
    let totalOperatorWages = 0;

    rentalsForTool.forEach(r => {
      const amt = r.totalAmount || 0;
      totalRevenue += amt;
      if (r.hasOperator && r.operatorTotalWage) {
        totalOperatorWages += r.operatorTotalWage;
      }

      if (r.settlementStatus === 'SETTLED') {
        settledAmount += amt;
      } else if (r.settlementStatus === 'PARTIAL') {
        const paid = r.paidAmount || 0;
        settledAmount += paid;
        pendingAmount += Math.max(0, amt - paid);
      } else {
        pendingAmount += amt;
      }
    });

    return {
      totalRevenue,
      settledAmount,
      pendingAmount,
      totalOperatorWages,
      count: rentalsForTool.length
    };
  }, [rentalsForTool]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayRentals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayRentals.map(r => r.id));
    }
  };

  const handleRemoveWithUndo = (id: string, label: string) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [
      ...prev,
      { id: undoId, items: [id], expireAt: Date.now() + 5000, title: `اجاره «${label}»` }
    ]);
    setPendingDeleteIds(prev => [...prev, id]);
    setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const handleBulkDeleteWithUndo = () => {
    if (selectedIds.length === 0) return;
    const undoId = Date.now().toString();
    setUndoItems(prev => [
      ...prev,
      { id: undoId, items: [...selectedIds], expireAt: Date.now() + 5000, title: `${selectedIds.length} قرارداد اجاره` }
    ]);
    setPendingDeleteIds(prev => [...prev, ...selectedIds]);
    setSelectedIds([]);
  };

  const handleCancelUndo = (undoId: string | number) => {
    const target = undoItems.find(u => String(u.id) === String(undoId));
    if (target) {
      setPendingDeleteIds(prev => prev.filter(id => !target.items.includes(id)));
      setUndoItems(prev => prev.filter(u => String(u.id) !== String(undoId)));
      toast.success('حذف قرارداد اجاره لغو شد.');
    }
  };

  const handleCycleStatus = (rental: ToolRentalRecord) => {
    const nextStatus: SettlementStatus = 
      rental.settlementStatus === 'PENDING' ? 'SETTLED' : 'PENDING';
    updateToolRental(rental.id, {
      settlementStatus: nextStatus,
      paidAmount: nextStatus === 'SETTLED' ? rental.totalAmount : 0
    });
    toast.success(nextStatus === 'SETTLED' ? 'وضعیت به «تسویه کامل» تغییر یافت.' : 'وضعیت به «در انتظار تسویه» تغییر یافت.');
  };

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* کارت‌های آماری */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-purple-200/50 dark:border-purple-800/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">کل درآمد اجاره ابزار</span>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">
              {formatCurrency(stats.totalRevenue)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Handshake className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">وصول‌شده از اجاره</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {formatCurrency(stats.settledAmount)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-rose-200/50 dark:border-rose-800/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">مانده طلب از کارفرمایان</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
              {formatCurrency(stats.pendingAmount)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">دستمزد اپراتورهای همراه</span>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
              {formatCurrency(stats.totalOperatorWages)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* نوار فیلترها */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm">
        <div className="flex-1 min-w-[220px]">
          <AppSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="جستجو در پروژه، کارفرما، اپراتور یا توضیحات..."
            className="w-full h-[46px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40 h-[46px]">
            <GlassDatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="از تاریخ..."
            />
          </div>
          <div className="w-40 h-[46px]">
            <GlassDatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="تا تاریخ..."
            />
          </div>
          <div className="w-48 h-[46px]">
            <PortalSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(String(val))}
              options={SETTLEMENT_STATUS_OPTIONS}
              placeholder="وضعیت تسویه"
              className="!h-[46px] !rounded-2xl"
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

      {/* هدر انتخاب همه */}
      {filteredRentals.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-white/30 dark:bg-slate-800/30 rounded-2xl border border-white/40 dark:border-slate-700/40 text-xs text-slate-500 font-bold">
          <div className="flex items-center gap-2.5">
            <AnimatedCheckbox
              checked={selectedIds.length === displayRentals.length && displayRentals.length > 0}
              onChange={toggleSelectAll}
              theme="indigo"
            />
            <span>انتخاب موارد نمایش‌داده‌شده ({displayRentals.length} از {filteredRentals.length})</span>
          </div>
          <span className="text-[11px] font-mono">مرتب‌سازی: جدیدترین قرارداد اجاره</span>
        </div>
      )}

      {/* لیست قراردادهای اجاره */}
      {filteredRentals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white/30 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <Handshake className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-500">هیچ سابقه اجاره یا کارکردی برای این ابزار ثبت نشده است.</p>
          <p className="text-xs font-bold text-slate-400 mt-1">با زدن دکمه «ثبت اجاره ابزار» در هدر صفحه یا کلید Ctrl+N، قرارداد جدید ثبت کنید.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {displayRentals.map((rental) => {
              const proj = projects.find(p => p.id === rental.projectId);
              const client = clients.find(c => c.id === rental.clientId);
              const unitLabel = TOOL_RENTAL_UNIT_LABELS[rental.rentalUnit] || 'روزانه';
              const isSelected = selectedIds.includes(rental.id);

              return (
                <motion.div
                  key={rental.id}
                  layout="position"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className={`backdrop-blur-xl rounded-3xl p-5 border shadow-md hover:shadow-lg transition-all space-y-4 ${
                    isSelected
                      ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-300 dark:border-purple-600'
                      : 'bg-white/70 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <AnimatedCheckbox
                        checked={isSelected}
                        onChange={() => toggleSelect(rental.id)}
                        theme="indigo"
                      />

                      <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/30">
                        <Handshake className="w-5 h-5" />
                      </div>

                      <div>
                        <h4 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                          <span>{proj?.title || proj?.name || 'اجاره آزاد (بدون پروژه)'}</span>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                            {rental.rentalUnit === 'FIXED' ? 'قرارداد مقطوع' : `${rental.unitCount} ${unitLabel}`}
                          </span>
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400 mt-1">
                          <span className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-purple-500" />
                            از {rental.startDate} {rental.endDate ? `تا ${rental.endDate}` : '(در حال کارکرد)'}
                          </span>
                          {(client || rental.clientName) && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <User className="w-3.5 h-3.5" />
                              کارفرما: {client ? `${client.name} ${client.lastName || ''}` : rental.clientName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-left font-mono ml-2">
                        <span className="text-[11px] font-bold text-slate-400 block">مبلغ کل اجاره:</span>
                        <span className="text-base font-black text-purple-600 dark:text-purple-400">
                          {formatCurrency(rental.totalAmount)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCycleStatus(rental)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black inline-flex items-center gap-1 transition-all cursor-pointer ${
                          rental.settlementStatus === 'SETTLED'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                            : rental.settlementStatus === 'PARTIAL'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                        }`}
                      >
                        {rental.settlementStatus === 'SETTLED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {rental.settlementStatus === 'PARTIAL' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {rental.settlementStatus === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                        <span>
                          {rental.settlementStatus === 'SETTLED' ? 'تسویه کامل' : rental.settlementStatus === 'PARTIAL' ? 'تسویه بخشی' : 'مانده'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRentalToEdit(rental);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-colors cursor-pointer"
                        title="ویرایش قرارداد اجاره"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveWithUndo(rental.id, proj?.title || proj?.name || rental.startDate)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                        title="حذف قرارداد اجاره"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* جزئیات اپراتور و یادداشت */}
                  {(rental.hasOperator || rental.notes) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                      {rental.hasOperator && (
                        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-3 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/40 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-500" />
                            <div>
                              <span className="font-black text-slate-800 dark:text-white block">
                                اپراتور همراه: {rental.operatorName || 'پرسنل شرکت'}
                              </span>
                              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                                دستمزد: {formatCurrency(rental.operatorTotalWage || 0)}
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                            rental.operatorPaid
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}>
                            {rental.operatorPaid ? 'دستمزد تسویه شد' : 'دستمزد در انتظار'}
                          </span>
                        </div>
                      )}

                      {rental.notes && (
                        <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 flex items-start gap-2 text-slate-600 dark:text-slate-300">
                          <FileText className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                          <span>{rental.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <FloatingUndoToast
        undoItems={undoItems}
        onCancel={handleCancelUndo}
      />

      <ToolRentalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setRentalToEdit(null);
        }}
        defaultToolId={toolId}
        rentalToEdit={rentalToEdit}
      />
    </div>
  );
}
