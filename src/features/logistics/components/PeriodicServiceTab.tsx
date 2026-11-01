import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Calendar, Gauge, Trash2, Edit, CheckCircle2, 
  AlertTriangle, Wrench, ShieldAlert, Sparkles, Clock, Coins
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useLogisticsStore, 
  type VehiclePeriodicServiceRecord 
} from '../../../store/logisticsStore';
import { 
  AppSearchInput, 
  GlassDatePicker, 
  PortalSelect,
  FloatingUndoToast,
  AnimatedCheckbox
} from '../../../components/ui/SharedLaborUI';
import { formatCurrency, getCurrencyUnit } from '../../../core/utils/currency';
import PeriodicServiceModal from './PeriodicServiceModal';

interface PeriodicServiceTabProps {
  vehicleId: string;
}

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '۱۰ ردیف' },
  { value: '25', label: '۲۵ ردیف' },
  { value: '50', label: '۵۰ ردیف' },
  { value: '100', label: '۱۰۰ ردیف' },
  { value: 'ALL', label: 'نمایش همه' },
];

export default function PeriodicServiceTab({ vehicleId }: PeriodicServiceTabProps) {
  const { periodicServices, deletePeriodicService, deleteMultiplePeriodicServices, vehicles } = useLogisticsStore();
  const vehicle = vehicles.find(v => v.id === vehicleId);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState('25');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<VehiclePeriodicServiceRecord | null>(null);

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
          deleteMultiplePeriodicServices(expiredIds);
          setPendingDeleteIds(curr => curr.filter(id => !expiredIds.includes(id)));
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteMultiplePeriodicServices]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleRemoveWithUndo = (id: string, date: string) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: [id], expireAt: Date.now() + 5000, title: `سرویس مورخ ${date}` }]);
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
        title: `${selectedIds.length} ردیف سرویس دوره‌ای`
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
      toast.success('حذف ردیف لغو شد.');
    }
  };

  const currentOdo = vehicle?.odometerOrHours || 0;

  const vehicleServices = useMemo(() => {
    return (periodicServices || []).filter(p => p.vehicleId === vehicleId && !pendingDeleteIds.includes(p.id));
  }, [periodicServices, vehicleId, pendingDeleteIds]);

  const filteredServices = useMemo(() => {
    let result = vehicleServices;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        (p.notes || '').toLowerCase().includes(q) ||
        p.services?.some(s => s.serviceType.toLowerCase().includes(q))
      );
    }

    if (dateFrom) {
      result = result.filter(p => p.serviceDate >= dateFrom);
    }

    if (dateTo) {
      result = result.filter(p => p.serviceDate <= dateTo);
    }

    return result.sort((a, b) => 
      (b.serviceDate || '').localeCompare(a.serviceDate || '') ||
      (b.createdAt || '').localeCompare(a.createdAt || '') ||
      (b.id || '').localeCompare(a.id || '')
    );
  }, [vehicleServices, searchQuery, dateFrom, dateTo]);

  const displayServices = useMemo(() => {
    if (pageSize === 'ALL') return filteredServices;
    const limit = parseInt(pageSize, 10) || 25;
    return filteredServices.slice(0, limit);
  }, [filteredServices, pageSize]);

  // آمار کل
  const stats = useMemo(() => {
    const totalSpent = vehicleServices.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);
    const totalItems = vehicleServices.reduce((acc, curr) => acc + (curr.services?.length || 0), 0);
    
    // تعداد سرویس‌های نزدیک به سررسید
    let dueSoonCount = 0;
    const todayMom = moment();

    vehicleServices.forEach(record => {
      (record.services || []).forEach(svc => {
        if (svc.nextDueDate) {
          const dueMom = moment(svc.nextDueDate, 'jYYYY/jMM/jDD');
          const diffDays = dueMom.diff(todayMom, 'days');
          if (diffDays <= 7) dueSoonCount++;
        } else if (svc.nextDueKm && currentOdo > 0) {
          if (currentOdo >= svc.nextDueKm * 0.9) dueSoonCount++;
        }
      });
    });

    return {
      totalServices: vehicleServices.length,
      totalSpent,
      totalItems,
      dueSoonCount,
    };
  }, [vehicleServices, currentOdo]);

  return (
    <div className="space-y-6">
      
      {/* پیام بازگردانی حذف تایمردار */}
      <FloatingUndoToast undoItems={undoItems} onCancel={handleCancelUndo} />

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">سرویس‌های ثبت‌شده</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.totalServices} <span className="text-xs font-bold text-slate-400">نوبت ({stats.totalItems} خدمت)</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">کل مخارج سرویس‌های دوره‌ای</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {formatCurrency(stats.totalSpent)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">موارد نزدیک به سررسید</span>
            <div className={`text-xl font-black mt-1 ${stats.dueSoonCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
              {stats.dueSoonCount} <span className="text-xs font-bold text-slate-400">سرویس نیازمند اقدام</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* نوار جستجو و فیلتر */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm">
        
        <div className="flex-1 min-w-[240px]">
          <AppSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="جستجو در نوع خدمات (روغن، لنت، فیلتر و...)..."
            className="w-full h-[46px]"
          />
        </div>

        <div className="flex items-center gap-2">
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

      {/* لیست کارت‌های سرویس */}
      {filteredServices.length === 0 ? (
        <div className="p-14 text-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl">
          <Settings className="w-14 h-14 text-slate-400 mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-black text-slate-700 dark:text-slate-300">هیچ سرویس دوره‌ای یافت نشد</h3>
          <p className="text-xs font-bold text-slate-500 mt-1">
            {searchQuery || dateFrom || dateTo ? 'موردی با فیلترهای مشخص‌شده همخوانی ندارد.' : 'با زدن کلید Ctrl+N یا دکمه «سرویس دوره‌ای» در هدر صفحه، تعویض روغن یا سرویس جدید را ثبت کنید.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {displayServices.map((record) => {
              const todayMom = moment();
              const isSelected = selectedIds.includes(record.id);

              return (
                <motion.div
                  key={record.id}
                  layout="position"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`backdrop-blur-xl p-5 rounded-3xl border shadow-sm hover:shadow-md transition-all space-y-4 ${
                    isSelected
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-600'
                      : 'bg-white/70 dark:bg-slate-800/70 border-white/80 dark:border-slate-700/80'
                  }`}
                >
                  {/* هدر رکورد سرویس */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <AnimatedCheckbox
                        checked={isSelected}
                        onChange={() => toggleSelect(record.id)}
                        theme="amber"
                      />
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-800 dark:text-white">
                            سرویس مورخ {record.serviceDate}
                          </span>
                          {record.currentOdometer > 0 && (
                            <span className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1">
                              <Gauge className="w-3 h-3 text-emerald-500" />
                              {record.currentOdometer.toLocaleString('fa-IR')} کیلومتر
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-bold block mt-0.5">
                          شامل {record.services?.length || 0} خدمت مجزا
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* وضعیت تسویه */}
                      {record.settlementStatus === 'SETTLED' ? (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> تسویه کامل
                        </span>
                      ) : record.settlementStatus === 'PARTIAL' ? (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> تسویه بخشی
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> تسویه‌نشده
                        </span>
                      )}

                      {/* جمع هزینه */}
                      <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(record.totalCost || 0)}
                      </span>

                      {/* عملیات */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setServiceToEdit(record);
                            setIsModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-emerald-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                          title="ویرایش این سرویس"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveWithUndo(record.id, record.serviceDate)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* اقلام سرویس */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(record.services || []).map(svc => {
                      // محاسبه وضعیت سررسید
                      let dueBadge = null;
                      if (svc.nextDueDate) {
                        const dueMom = moment(svc.nextDueDate, 'jYYYY/jMM/jDD');
                        const diffDays = dueMom.diff(todayMom, 'days');
                        if (diffDays < 0) {
                          dueBadge = <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">منقضی شده ({Math.abs(diffDays)} روز قبل)</span>;
                        } else if (diffDays <= 7) {
                          dueBadge = <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">{diffDays === 0 ? 'امروز' : `${diffDays} روز مانده`}</span>;
                        } else {
                          dueBadge = <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">{diffDays} روز دیگر</span>;
                        }
                      } else if (svc.nextDueKm && currentOdo > 0) {
                        const diffKm = svc.nextDueKm - currentOdo;
                        if (diffKm <= 0) {
                          dueBadge = <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">سررسید کارکرد رد شده!</span>;
                        } else if (diffKm <= 1000) {
                          dueBadge = <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">{diffKm.toLocaleString('fa-IR')} کیلومتر مانده</span>;
                        }
                      }

                      return (
                        <div
                          key={svc.id}
                          className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-700/50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs text-slate-800 dark:text-white">
                              {svc.serviceType}
                            </span>
                            <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(svc.cost || 0)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {svc.nextDueKm && (
                              <span className="flex items-center gap-1 font-mono">
                                <Gauge className="w-3 h-3 text-slate-400" /> هدف: {svc.nextDueKm.toLocaleString('fa-IR')} km
                              </span>
                            )}
                            {svc.nextDueDate && (
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3 text-slate-400" /> {svc.nextDueDate}
                              </span>
                            )}
                          </div>

                          {dueBadge && (
                            <div className="pt-1 flex items-center justify-end">
                              {dueBadge}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* یادداشت رکورد */}
                  {record.notes && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 font-medium">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">یادداشت سرویس:</span>
                      {record.notes}
                    </div>
                  )}

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* مودال ثبت و ویرایش */}
      <PeriodicServiceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setServiceToEdit(null);
        }}
        defaultVehicleId={vehicleId}
        serviceToEdit={serviceToEdit}
      />

    </div>
  );
}
