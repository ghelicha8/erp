import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Calendar, Truck, Trash2, Edit, CheckCircle2, Clock, 
  Coins, Phone, FileText, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

import { 
  useLogisticsStore, 
  type VehicleDriverAssignment 
} from '../../../store/logisticsStore';
import { useLaborStore } from '../../../store/laborStore';
import { 
  AppSearchInput, 
  GlassDatePicker,
  PortalSelect,
  FloatingUndoToast,
  AnimatedCheckbox
} from '../../../components/ui/SharedLaborUI';
import { formatCurrency, getCurrencyUnit } from '../../../core/utils/currency';
import VehicleDriverModal from './VehicleDriverModal';

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '۱۰ ردیف' },
  { value: '25', label: '۲۵ ردیف' },
  { value: '50', label: '۵۰ ردیف' },
  { value: '100', label: '۱۰۰ ردیف' },
  { value: 'ALL', label: 'نمایش همه' },
];

interface VehicleDriversTabProps {
  vehicleId: string;
}

export default function VehicleDriversTab({ vehicleId }: VehicleDriversTabProps) {
  const { driverAssignments, removeDriverAssignment, updateDriverAssignment } = useLogisticsStore();
  const allWorkers = useLaborStore(state => state.workers) || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState('25');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignmentToEdit, setAssignmentToEdit] = useState<VehicleDriverAssignment | null>(null);

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
          expiredIds.forEach(id => removeDriverAssignment(id));
          setPendingDeleteIds(curr => curr.filter(id => !expiredIds.includes(id)));
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [removeDriverAssignment]);

  const handleRemoveWithUndo = (id: string, name: string) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: [id], expireAt: Date.now() + 5000, title: `انتساب «${name}»` }]);
    setPendingDeleteIds(prev => [...prev, id]);
  };

  const handleCancelUndo = (undoId: string | number) => {
    const target = undoItems.find(u => String(u.id) === String(undoId));
    if (target) {
      setPendingDeleteIds(prev => prev.filter(id => !target.items.includes(id)));
      setUndoItems(prev => prev.filter(u => String(u.id) !== String(undoId)));
      toast.success('لغو حذف انجام شد.');
    }
  };

  const vehicleAssignments = useMemo(() => {
    return (driverAssignments || []).filter(d => d.vehicleId === vehicleId && !pendingDeleteIds.includes(d.id));
  }, [driverAssignments, vehicleId, pendingDeleteIds]);

  const filteredAssignments = useMemo(() => {
    let result = vehicleAssignments;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => 
        d.driverName.toLowerCase().includes(q) ||
        (d.notes || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      result = result.filter(d => (d.assignedDate || '') >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(d => (d.assignedDate || '') <= dateTo);
    }
    return result.sort((a, b) => 
      (b.assignedDate || '').localeCompare(a.assignedDate || '') ||
      (b.id || '').localeCompare(a.id || '')
    );
  }, [vehicleAssignments, searchQuery, dateFrom, dateTo]);

  const displayAssignments = useMemo(() => {
    if (pageSize === 'ALL') return filteredAssignments;
    const limit = parseInt(pageSize, 10) || 25;
    return filteredAssignments.slice(0, limit);
  }, [filteredAssignments, pageSize]);

  // آمار کل رانندگان
  const stats = useMemo(() => {
    const totalDrivers = vehicleAssignments.length;
    const directWageAssignments = vehicleAssignments.filter(d => d.wageType === 'PER_SERVICE' || d.wageType === 'DAILY');
    const totalServices = vehicleAssignments.filter(d => d.wageType === 'PER_SERVICE').reduce((acc, curr) => acc + (curr.serviceCount || 0), 0);
    const totalWages = directWageAssignments.reduce((acc, curr) => acc + (curr.totalWage || 0), 0);
    const paidWages = directWageAssignments.filter(d => d.isPaid).reduce((acc, curr) => acc + (curr.totalWage || 0), 0);

    return {
      totalDrivers,
      totalServices,
      totalWages,
      paidWages,
    };
  }, [vehicleAssignments]);

  const handleTogglePaid = (assignment: VehicleDriverAssignment) => {
    updateDriverAssignment(assignment.id, { isPaid: !assignment.isPaid });
    toast.success(assignment.isPaid ? 'وضعیت به تسویه‌نشده تغییر یافت.' : 'دستمزد به عنوان تسویه‌شده ثبت شد.');
  };

  return (
    <div className="space-y-6">
      
      {/* پیام بازگردانی حذف تایمردار */}
      <FloatingUndoToast undoItems={undoItems} onCancel={handleCancelUndo} />

      {/* کارت‌های آماری رانندگان */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-blue-200/50 dark:border-blue-800/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">رانندگان منتسب</span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {stats.totalDrivers} <span className="text-xs font-bold text-slate-400">نفر فعال</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">سرویس‌های باربری برده‌شده</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats.totalServices} <span className="text-xs font-bold text-slate-400">سرویس</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500">مجموع دستمزد مستقیم (سرویسی/روزمزد)</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {formatCurrency(stats.totalWages)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* نوار جستجو و فیلتر */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm">
        <div className="flex-1 min-w-[240px]">
          <AppSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="جستجو در نام راننده یا یادداشت‌ها..."
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

          <div className="w-36 h-[46px]">
            <PortalSelect
              value={pageSize}
              onChange={(val) => setPageSize(String(val))}
              options={PAGE_SIZE_OPTIONS}
              placeholder="تعداد نمایش"
              className="!h-[46px] !rounded-2xl"
            />
          </div>
        </div>
      </div>

      {/* لیست رانندگان */}
      {filteredAssignments.length === 0 ? (
        <div className="p-14 text-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl">
          <Users className="w-14 h-14 text-slate-400 mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-black text-slate-700 dark:text-slate-300">هیچ راننده‌ای برای این خودرو منتسب نشده است</h3>
          <p className="text-xs font-bold text-slate-500 mt-1">
            {searchQuery || dateFrom || dateTo ? 'راننده‌ای با فیلترهای مشخص‌شده یافت نشد.' : 'با زدن کلید Ctrl+N یا دکمه «انتساب راننده» در هدر صفحه، راننده جدیدی به این خودرو اضافه کنید.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {displayAssignments.map((assignment) => {
              const workerProfile = allWorkers.find(w => w.id === assignment.driverId);

              return (
                <motion.div
                  key={assignment.id}
                  layout="position"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-5 rounded-3xl border border-white/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all space-y-4"
                >
                  {/* اطلاعات راننده */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md">
                        {assignment.driverName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-base text-slate-800 dark:text-white">
                          {assignment.driverName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
                          <span>انتساب: {assignment.assignedDate}</span>
                          {workerProfile?.phone1 && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-emerald-500" />
                              {workerProfile.phone1}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* دکمه‌های ویرایش / حذف */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAssignmentToEdit(assignment);
                          setIsModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-blue-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                        title="ویرایش"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveWithUndo(assignment.id, assignment.driverName)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* وضعیت قرارداد و دستمزد */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-700/50 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">نوع قرارداد:</span>
                      <span className="text-slate-800 dark:text-white font-black">
                        {assignment.wageType === 'PER_SERVICE' 
                          ? 'سرویسی (باربری)' 
                          : assignment.wageType === 'DAILY' 
                          ? 'روزمزد (ادغام لاگ‌ها)' 
                          : assignment.wageType === 'MONTHLY' 
                          ? 'حقوق‌بگیر ماهانه' 
                          : 'حقوق‌بگیر هفتگی'}
                      </span>
                    </div>

                    {assignment.wageType === 'PER_SERVICE' ? (
                      <>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <span>کارکرد و نرخ:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {assignment.serviceCount} سرویس × {formatCurrency(assignment.unitRate)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-black pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-700 dark:text-slate-300">مجموع دستمزد:</span>
                          <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
                            {formatCurrency(assignment.totalWage)}
                          </span>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AnimatedCheckbox
                              checked={assignment.isPaid}
                              onChange={() => handleTogglePaid(assignment)}
                              theme="amber"
                            />
                            <span className="text-xs font-bold text-slate-500">وضعیت تسویه دستمزد:</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTogglePaid(assignment)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                              assignment.isPaid
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 hover:bg-rose-200'
                            }`}
                          >
                            {assignment.isPaid ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> تسویه شده
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5" /> پرداخت نشده (جهت تسویه کلیک کنید)
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    ) : assignment.wageType === 'DAILY' ? (
                      <>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <span>نرخ روزانه:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {formatCurrency(assignment.unitRate || assignment.totalWage)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-black pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-700 dark:text-slate-300">دستمزد هر شیفت:</span>
                          <span className="font-mono text-sm text-amber-600 dark:text-amber-400">
                            {formatCurrency(assignment.totalWage)}
                          </span>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AnimatedCheckbox
                              checked={assignment.isPaid}
                              onChange={() => handleTogglePaid(assignment)}
                              theme="amber"
                            />
                            <span className="text-xs font-bold text-slate-500">وضعیت تسویه شیفت:</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTogglePaid(assignment)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                              assignment.isPaid
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 hover:bg-rose-200'
                            }`}
                          >
                            {assignment.isPaid ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> تسویه شده
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5" /> پرداخت نشده (جهت تسویه کلیک کنید)
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                        <span>تسویه حقوق:</span>
                        <span className="bg-amber-100 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800/40">
                          مدیریت در پرونده پرسنلی کارگر
                        </span>
                      </div>
                    )}
                  </div>

                  {/* یادداشت */}
                  {assignment.notes && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                      <span className="font-bold block mb-0.5 text-slate-700 dark:text-slate-300">یادداشت:</span>
                      {assignment.notes}
                    </div>
                  )}

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* مودال انتساب راننده */}
      <VehicleDriverModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setAssignmentToEdit(null);
        }}
        defaultVehicleId={vehicleId}
        assignmentToEdit={assignmentToEdit}
      />

    </div>
  );
}
