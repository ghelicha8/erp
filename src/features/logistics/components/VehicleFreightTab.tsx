import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Calendar, Trash2, Edit, CheckCircle2, Clock, AlertTriangle, 
  Coins, FileText, Building2, User, Layers, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useLogisticsStore, 
  type LogisticsLog,
  type SettlementStatus 
} from '../../../store/logisticsStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useClientStore } from '../../../store/clientStore';
import { useLaborStore } from '../../../store/laborStore';

import { 
  AppSearchInput, 
  GlassDatePicker, 
  PortalSelect, 
  FloatingUndoToast,
  AnimatedCheckbox 
} from '../../../components/ui/SharedLaborUI';
import { formatCurrency, getCurrencyUnit } from '../../../core/utils/currency';

interface VehicleFreightTabProps {
  vehicleId: string;
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

export default function VehicleFreightTab({ vehicleId }: VehicleFreightTabProps) {
  const { logs, deleteLog, deleteMultipleLogs, updateLog } = useLogisticsStore();
  const projects = useProjectStore(state => state.projects) || [];
  const clients = useClientStore(state => state.clients) || [];
  const workers = useLaborStore(state => state.workers) || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState('25');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
          deleteMultipleLogs(expiredIds);
          setPendingDeleteIds(curr => curr.filter(id => !expiredIds.includes(id)));
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteMultipleLogs]);

  // فیلتر بارنامه‌های این خودرو
  const vehicleFreightLogs = useMemo(() => {
    return (logs || []).filter(l => 
      l.type === 'TRANSPORT' && 
      l.vehicleInfo === vehicleId && 
      !pendingDeleteIds.includes(l.id)
    );
  }, [logs, vehicleId, pendingDeleteIds]);

  // محاسبات آماری تراز باربری (درآمد خودرو)
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalServices = 0;
    let settledAmount = 0;
    let pendingAmount = 0;

    vehicleFreightLogs.forEach(l => {
      const cost = l.billedCost || 0;
      totalRevenue += cost;
      totalServices += (l.qty || 1);

      const status = l.settlementStatus || 'SETTLED';
      if (status === 'SETTLED') {
        settledAmount += cost;
      } else if (status === 'PARTIAL') {
        const paid = l.paidAmount || 0;
        settledAmount += paid;
        pendingAmount += Math.max(0, cost - paid);
      } else {
        pendingAmount += cost;
      }
    });

    return { totalRevenue, totalServices, settledAmount, pendingAmount, totalCount: vehicleFreightLogs.length };
  }, [vehicleFreightLogs]);

  // اعمال فیلترها
  const filteredLogs = useMemo(() => {
    let result = vehicleFreightLogs;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => {
        const titleMatch = (l.title || '').toLowerCase().includes(q);
        const proj = projects.find(p => p.id === l.projectId);
        const projMatch = proj && proj.name.toLowerCase().includes(q);
        const worker = workers.find(w => w.id === l.provider);
        const workerMatch = worker && `${worker.name} ${worker.lastName}`.toLowerCase().includes(q);
        return titleMatch || projMatch || workerMatch;
      });
    }

    if (dateFrom) {
      result = result.filter(l => (l.date || '') >= dateFrom);
    }

    if (dateTo) {
      result = result.filter(l => (l.date || '') <= dateTo);
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(l => (l.settlementStatus || 'SETTLED') === statusFilter);
    }

    return result.sort((a, b) => 
      (b.date || '').localeCompare(a.date || '') || 
      (b.id || '').localeCompare(a.id || '')
    );
  }, [vehicleFreightLogs, searchQuery, dateFrom, dateTo, statusFilter, projects, workers]);

  const displayLogs = useMemo(() => {
    if (pageSize === 'ALL') return filteredLogs;
    const limit = parseInt(pageSize, 10) || 25;
    return filteredLogs.slice(0, limit);
  }, [filteredLogs, pageSize]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayLogs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayLogs.map(l => l.id));
    }
  };

  const handleRemoveWithUndo = (id: string, title: string) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [
      ...prev,
      { id: undoId, items: [id], expireAt: Date.now() + 5000, title: `بارنامه «${title}»` }
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
        title: `${selectedIds.length} فقره بارنامه`
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
      toast.success('حذف بارنامه لغو شد.');
    }
  };

  const handleEditLog = (log: LogisticsLog) => {
    document.dispatchEvent(new CustomEvent('open-new-logistics-modal', {
      detail: log
    }));
  };

  const handleCycleSettlementStatus = (log: LogisticsLog) => {
    const current = log.settlementStatus || 'SETTLED';
    const nextStatus: SettlementStatus = 
      current === 'SETTLED' ? 'PENDING' : 
      current === 'PENDING' ? 'PARTIAL' : 'SETTLED';
    
    updateLog(log.id, {
      settlementStatus: nextStatus,
      paidAmount: nextStatus === 'SETTLED' ? log.billedCost : nextStatus === 'PENDING' ? 0 : Math.round((log.billedCost || 0) / 2)
    });
    toast.success('وضعیت تسویه کارفرما به‌روزرسانی شد.');
  };

  return (
    <div className="space-y-6">
      
      {/* کارت‌های خلاصه وضعیت مالی باربری */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">کل درآمد باربری (کرایه‌ها)</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {formatCurrency(stats.totalRevenue)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">تعداد سرویس و بارنامه‌ها</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats.totalServices} <span className="text-xs font-bold text-slate-400">سرویس ({stats.totalCount} بارنامه)</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">تسویه‌شده توسط کارفرما</span>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
              {formatCurrency(stats.settledAmount)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">مانده مطالبات از کارفرما</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
              {formatCurrency(stats.pendingAmount)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* نوار جستجو، فیلترها و دکمه حذف گروهی */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm">
        
        <div className="flex-1 min-w-[220px]">
          <AppSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="جستجو در عنوان بارنامه، پروژه یا راننده..."
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
              value={statusFilter}
              onChange={(val) => setStatusFilter(String(val))}
              options={SETTLEMENT_STATUS_OPTIONS}
              className="!h-[46px] !rounded-2xl"
            />
          </div>

          <div className="w-40 h-[46px]">
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

      {/* جدول بارنامه‌ها */}
      {filteredLogs.length === 0 ? (
        <div className="p-14 text-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl">
          <Truck className="w-14 h-14 text-slate-400 mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-black text-slate-700 dark:text-slate-300">هیچ بارنامه‌ای ثبت نشده است</h3>
          <p className="text-xs font-bold text-slate-500 mt-1">
            {searchQuery || dateFrom || dateTo ? 'موردی با فیلترهای مشخص‌شده همخوانی ندارد.' : 'با فشردن کلید Ctrl+N یا دکمه «ثبت بارنامه» در هدر صفحه، بارنامه جدید ثبت کنید.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          
          {/* هدر ستون‌های جدول در دسکتاپ */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 text-[11px] font-black text-slate-400 bg-white/30 dark:bg-slate-800/30 rounded-2xl border border-white/50 dark:border-slate-700/50">
            <div className="col-span-1 flex items-center gap-2">
              <AnimatedCheckbox
                checked={displayLogs.length > 0 && selectedIds.length === displayLogs.length}
                onChange={toggleSelectAll}
                theme="amber"
              />
              <span>#</span>
            </div>
            <div className="col-span-2">تاریخ بارگیری</div>
            <div className="col-span-2">پروژه / کارفرما</div>
            <div className="col-span-2">شرح محموله و مقصد</div>
            <div className="col-span-1 text-center">راننده</div>
            <div className="col-span-1 text-center">سرویس/تناژ</div>
            <div className="col-span-1 text-center">کرایه کل</div>
            <div className="col-span-1 text-center">وضعیت تسویه</div>
            <div className="col-span-1 text-left">عملیات</div>
          </div>

          <AnimatePresence>
            {displayLogs.map((log, idx) => {
              const isSelected = selectedIds.includes(log.id);
              const project = projects.find(p => p.id === log.projectId);
              const client = project ? clients.find(c => c.id === project.clientId) : null;
              const driver = workers.find(w => w.id === log.provider);
              const settlementStatus = log.settlementStatus || 'SETTLED';

              return (
                <motion.div
                  key={log.id}
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
                    
                    {/* چک‌باکس و شماره ردیف */}
                    <div className="lg:col-span-1 flex items-center gap-3">
                      <AnimatedCheckbox
                        checked={isSelected}
                        onChange={() => toggleSelect(log.id)}
                        theme="amber"
                      />
                      <span className="font-mono text-xs font-bold text-slate-400">{idx + 1}</span>
                    </div>

                    {/* تاریخ بارگیری */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        <span>{log.date}</span>
                      </div>
                    </div>

                    {/* پروژه و کارفرما */}
                    <div className="lg:col-span-2">
                      <div className="font-black text-xs text-slate-800 dark:text-white flex items-center gap-1 truncate">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{project?.name || 'پروژه عمومی'}</span>
                      </div>
                      {client && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                          کارفرما: {client.name} {client.lastName}
                        </span>
                      )}
                    </div>

                    {/* شرح محموله */}
                    <div className="lg:col-span-2">
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{log.title || 'بارنامه باربری'}</span>
                      </div>
                    </div>

                    {/* راننده */}
                    <div className="lg:col-span-1 text-center">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate block">
                        {driver ? `${driver.name} ${driver.lastName}` : (log.provider || 'نامشخص')}
                      </span>
                    </div>

                    {/* تعداد سرویس / تناژ */}
                    <div className="lg:col-span-1 text-center">
                      <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300">
                        {log.qty || 1} <span className="text-[10px] font-normal text-slate-400">سرویس</span>
                      </span>
                    </div>

                    {/* کرایه کل باربری (درآمد) */}
                    <div className="lg:col-span-1 text-center">
                      <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                        {formatCurrency(log.billedCost || 0)}
                      </span>
                    </div>

                    {/* وضعیت تسویه کارفرما */}
                    <div className="lg:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleCycleSettlementStatus(log)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black inline-flex items-center gap-1 transition-all cursor-pointer ${
                          settlementStatus === 'SETTLED'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                            : settlementStatus === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                        }`}
                        title="جهت تغییر وضعیت کلیک کنید"
                      >
                        {settlementStatus === 'SETTLED' && <CheckCircle2 className="w-3 h-3" />}
                        {settlementStatus === 'PARTIAL' && <AlertTriangle className="w-3 h-3" />}
                        {settlementStatus === 'PENDING' && <Clock className="w-3 h-3" />}
                        <span>
                          {settlementStatus === 'SETTLED' ? 'تسویه کامل' : settlementStatus === 'PARTIAL' ? 'تسویه بخشی' : 'مانده'}
                        </span>
                      </button>
                    </div>

                    {/* عملیات */}
                    <div className="lg:col-span-1 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditLog(log)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-blue-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="ویرایش بارنامه"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveWithUndo(log.id, log.title)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="حذف بارنامه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

        </div>
      )}

      {/* سیستم توست شناور ۵ ثانیه‌ای */}
      <FloatingUndoToast
        undoItems={undoItems}
        onCancel={handleCancelUndo}
      />

    </div>
  );
}
