import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, Search, Trash2, Calendar, Clock, Gauge, 
  Settings, AlertTriangle, UserCheck, Package,
  TrendingDown, CheckCircle2, Phone, MapPin, Edit2
} from 'lucide-react';
import { toast } from 'sonner';

import { 
  useLogisticsStore, 
  REPAIR_TYPE_LABELS, 
  DOWNTIME_STATUS_LABELS, 
  SCRAP_STATUS_LABELS,
  type VehicleRepairRecord 
} from '../../../store/logisticsStore';
import { 
  AppSearchInput, 
  PortalSelect, 
  GlassDatePicker,
  FloatingUndoToast, 
  AnimatedCheckbox 
} from '../../../components/ui/SharedLaborUI';
import { formatCurrency } from '../../../core/utils/currency';
import VehicleRepairModal from './VehicleRepairModal';

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '۱۰ ردیف' },
  { value: '25', label: '۲۵ ردیف' },
  { value: '50', label: '۵۰ ردیف' },
  { value: '100', label: '۱۰۰ ردیف' },
  { value: 'ALL', label: 'نمایش همه' },
];

interface VehicleRepairTabProps {
  vehicleId: string;
}

const REPAIR_FILTER_OPTIONS = [
  { value: 'ALL', label: 'همه دسته‌بندی‌های فنی' },
  { value: 'ENGINE_GEARBOX', label: 'موتور و گیربکس' },
  { value: 'HYDRAULIC', label: 'سیستم هیدرولیک' },
  { value: 'SUSPENSION_CHASSIS', label: 'تعلیق و زیربندی' },
  { value: 'ELECTRICAL', label: 'برق و الکترونیک' },
  { value: 'ACCIDENT', label: 'تصادف و سانحه کارگاهی' },
  { value: 'OVERHAUL', label: 'سرویس اساسی و اورهال' },
];

export default function VehicleRepairTab({ vehicleId }: VehicleRepairTabProps) {
  const { repairs, deleteRepair } = useLogisticsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [pageSize, setPageSize] = useState('25');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [repairToEdit, setRepairToEdit] = useState<VehicleRepairRecord | null>(null);
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
          expiredIds.forEach(id => deleteRepair(id));
          setPendingDeleteIds(curr => curr.filter(id => !expiredIds.includes(id)));
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteRepair]);

  const handleRemoveWithUndo = (id: string, repairTitle: string) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [
      ...prev,
      { id: undoId, items: [id], expireAt: Date.now() + 5000, title: `تعمیر «${repairTitle}»` }
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
        title: `${selectedIds.length} رکورد تعمیرات`
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
      toast.success('حذف رکورد تعمیر لغو شد.');
    }
  };

  const vehicleRepairs = useMemo(() => {
    return (repairs || []).filter(r => r.vehicleId === vehicleId && !pendingDeleteIds.includes(r.id));
  }, [repairs, vehicleId, pendingDeleteIds]);

  const filteredRepairs = useMemo(() => {
    let result = vehicleRepairs;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        (r.description || '').toLowerCase().includes(q) ||
        (r.mechanicInfo?.mechanicName || '').toLowerCase().includes(q) ||
        r.replacedParts?.some(p => p.partName.toLowerCase().includes(q))
      );
    }

    if (filterType !== 'ALL') {
      result = result.filter(r => r.repairType === filterType);
    }

    if (dateFrom) {
      result = result.filter(r => (r.date || '') >= dateFrom);
    }

    if (dateTo) {
      result = result.filter(r => (r.date || '') <= dateTo);
    }

    // اولویت ۱: تاریخ نزولی | اولویت ۲: زمان ساخت یا شناسه نزولی
    return result.sort((a, b) => 
      (b.date || '').localeCompare(a.date || '') || 
      (b.createdAt || '').localeCompare(a.createdAt || '') || 
      b.id.localeCompare(a.id)
    );
  }, [vehicleRepairs, searchQuery, filterType, dateFrom, dateTo]);

  const displayRepairs = useMemo(() => {
    if (pageSize === 'ALL') return filteredRepairs;
    const limit = parseInt(pageSize, 10) || 25;
    return filteredRepairs.slice(0, limit);
  }, [filteredRepairs, pageSize]);

  const stats = useMemo(() => {
    const totalCost = vehicleRepairs.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const totalPartsCount = vehicleRepairs.reduce((sum, r) => sum + (r.replacedParts?.length || 0), 0);
    const fullStopCount = vehicleRepairs.filter(r => r.downtimeStatus === 'FULL_STOP').length;
    return {
      totalCost,
      totalCount: vehicleRepairs.length,
      totalPartsCount,
      fullStopCount,
    };
  }, [vehicleRepairs]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayRepairs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayRepairs.map(r => r.id));
    }
  };

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* هدر و کارت‌های آماری سریع */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-amber-200/50 dark:border-amber-800/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">کل هزینه‌های تعمیرات</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {formatCurrency(stats.totalCost)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">دفعات خواب کارگاهی</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {stats.fullStopCount} <span className="text-xs font-bold">بار توقف کامل</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">تعداد قطعات تعویض‌شده</span>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {stats.totalPartsCount} <span className="text-xs font-bold">قلم قطعه</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* نوار جستجو، فیلتر و دکمه‌های کنترلی */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm">
        <div className="flex-1 min-w-[240px]">
          <AppSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="جستجو در قطعات، شرح خرابی یا مکانیک..."
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
              value={filterType}
              onChange={(val) => setFilterType(String(val))}
              options={REPAIR_FILTER_OPTIONS}
              searchable={true}
              icon={Settings}
              placeholder="فیلتر دسته‌بندی..."
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
      {filteredRepairs.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-white/30 dark:bg-slate-800/30 rounded-2xl border border-white/40 dark:border-slate-700/40 text-xs text-slate-500 font-bold">
          <div className="flex items-center gap-2.5">
            <AnimatedCheckbox
              checked={selectedIds.length === displayRepairs.length && displayRepairs.length > 0}
              onChange={toggleSelectAll}
              theme="amber"
            />
            <span>انتخاب موارد نمایش‌داده‌شده ({displayRepairs.length} از {filteredRepairs.length})</span>
          </div>
          <span className="text-[11px] font-mono">مرتب‌سازی: جدیدترین تاریخ</span>
        </div>
      )}

      {/* لیست رکوردهای تعمیر */}
      {filteredRepairs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white/30 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <Wrench className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-500">هیچ سابقه تعمیری برای این خودرو ثبت نشده است.</p>
          <p className="text-xs font-bold text-slate-400 mt-1">با زدن کلید Ctrl+N یا دکمه «ثبت تعمیر» در هدر صفحه، سابقه جدید ثبت کنید.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {displayRepairs.map((repair) => {
              const typeLabel = REPAIR_TYPE_LABELS[repair.repairType] || 'تعمیرات';
              const downtimeLabel = DOWNTIME_STATUS_LABELS[repair.downtimeStatus] || 'نامشخص';
              const isSelected = selectedIds.includes(repair.id);

              return (
                <motion.div
                  key={repair.id}
                  layout="position"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className={`backdrop-blur-xl rounded-3xl p-5 border shadow-md hover:shadow-lg transition-all space-y-4 ${
                    isSelected 
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-600 shadow-md'
                      : 'bg-white/70 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  {/* سربرگ رکورد */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <AnimatedCheckbox
                        checked={isSelected}
                        onChange={() => toggleSelect(repair.id)}
                        theme="amber"
                      />

                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                          {typeLabel}
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            repair.downtimeStatus === 'FULL_STOP'
                              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                              : repair.downtimeStatus === 'LIGHT_LOAD'
                              ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                              : 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                          }`}>
                            {downtimeLabel}
                          </span>
                        </h4>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-400 mt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5" /> {repair.date}
                          </span>
                          {repair.time && (
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5" /> {repair.time}
                            </span>
                          )}
                          {repair.odometerOrHours > 0 && (
                            <span className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-300">
                              <Gauge className="w-3.5 h-3.5 text-amber-500" /> {repair.odometerOrHours.toLocaleString('fa-IR')} کیلومتر/ساعت
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-left font-mono ml-2">
                        <span className="text-xs font-bold text-slate-400 block">هزینه کل:</span>
                        <span className="text-base font-black text-amber-600 dark:text-amber-400">
                          {formatCurrency(repair.totalCost)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRepairToEdit(repair);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-colors cursor-pointer"
                        title="ویرایش رکورد تعمیر"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveWithUndo(repair.id, typeLabel)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                        title="حذف رکورد تعمیر"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* بدنه: اطلاعات مکانیک و قطعات */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* اطلاعات مکانیک */}
                    <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl space-y-2 border border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-[11px] font-black text-slate-500 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-amber-500" /> اطلاعات واحد تعمیراتی:
                      </span>
                      <div className="font-bold text-slate-800 dark:text-white">
                        {repair.mechanicInfo?.mechanicName || 'نامشخص'} 
                        <span className="text-[10px] text-slate-400 mr-2 font-normal">
                          ({repair.mechanicInfo?.mechanicType === 'INTERNAL' ? 'مکانیک مرکزی شرکت' : 'اوستاکار بیرونی'})
                        </span>
                      </div>
                      {repair.mechanicInfo?.mechanicPhone && (
                        <div className="text-slate-500 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-emerald-500" /> {repair.mechanicInfo.mechanicPhone}
                        </div>
                      )}
                      {repair.mechanicInfo?.mechanicAddress && (
                        <div className="text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" /> {repair.mechanicInfo.mechanicAddress}
                        </div>
                      )}
                    </div>

                    {/* قطعات تعویضی */}
                    <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl space-y-2 border border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-[11px] font-black text-slate-500 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-amber-500" /> قطعات تعویض‌شده ({repair.replacedParts?.length || 0}):
                      </span>
                      {(!repair.replacedParts || repair.replacedParts.length === 0) ? (
                        <span className="text-slate-400 font-medium block">قطعه‌ای تعویض نشده است.</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {repair.replacedParts.map(part => (
                            <span
                              key={part.id}
                              className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                            >
                              <span>{part.partName}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded ${part.scrapStatus === 'SCRAP' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'}`}>
                                {SCRAP_STATUS_LABELS[part.scrapStatus]}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* توضیحات و تفکیک هزینه */}
                  {repair.description && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 font-medium">
                      <span className="font-bold text-amber-600 dark:text-amber-400 block mb-0.5">توضیحات:</span>
                      {repair.description}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 font-bold text-slate-500">
                    <div className="flex items-center gap-4">
                      <span>هزینه قطعات: <span className="font-mono text-slate-800 dark:text-white">{formatCurrency(repair.partsCost || 0)}</span></span>
                      <span>دستمزد: <span className="font-mono text-slate-800 dark:text-white">{formatCurrency(repair.wageCost || 0)}</span></span>
                    </div>

                    {repair.autoSendToFinance && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> سند مالی صادر شده
                      </span>
                    )}
                  </div>
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

      {/* مودال ثبت و ویرایش تعمیر */}
      <VehicleRepairModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setRepairToEdit(null);
        }}
        defaultVehicleId={vehicleId}
        repairToEdit={repairToEdit}
      />
    </div>
  );
}
