import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wrench, CalendarDays, Flag, Store } from 'lucide-react';
import moment from 'moment-jalaali';
import { toast } from 'sonner';

import { useLogisticsStore } from '../../../store/logisticsStore';
import { useFinanceStore } from '../../../store/financeStore';
import { useProcurementStore } from '../../../store/procurementStore';
import { GlassDatePicker, PortalSelect } from '../../../components/ui/SharedLaborUI';
import RepairShopFormModal from '../../procurement/components/repairshops/RepairShopFormModal';

interface VehicleRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  editRepairId?: string | null;
}

export default function VehicleRepairModal({ isOpen, onClose, vehicleId, editRepairId }: VehicleRepairModalProps) {
  const vehicle = useLogisticsStore(s => s.vehicles.find(v => v.id === vehicleId));
  const repairs = useLogisticsStore(s => s.repairs);
  const addRepair = useLogisticsStore(s => s.addRepair);
  const updateRepair = useLogisticsStore(s => s.updateRepair);
  const addTransaction = useFinanceStore(s => s.addTransaction);
  const updateTransaction = useFinanceStore(s => s.updateTransaction);
  const allTransactions = useFinanceStore(s => s.transactions);
  const repairShopVendors = useProcurementStore(s => s.vendors.filter(v => v.section === 'REPAIR_SHOPS'));

  const today = moment().format('jYYYY/jMM/jDD');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState(today);
  const [shopKey, setShopKey] = useState('FREE');
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editRepairId) {
      const r = repairs.find(x => x.id === editRepairId);
      if (r) {
        setCost(String(r.cost || ''));
        setDescription(r.description || '');
        setStartDate(r.startDate || today);
        setHasEndDate(!!r.endDate);
        setEndDate(r.endDate || r.startDate || today);
        setShopKey(r.repairShopVendorId || 'FREE');
        return;
      }
    }
    setCost(''); setDescription(''); setStartDate(today);
    setHasEndDate(false); setEndDate(today); setShopKey('FREE');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editRepairId]);

  const shopOptions = useMemo(() => [
    { value: 'FREE', label: 'آزاد (بدون تعمیرگاه ثبت‌شده)' },
    ...repairShopVendors.map(v => ({
      value: v.id,
      label: v.name,
      subLabel: `${v.address || ''} ${(v.phones || [])[0] || ''}`.trim() || 'تعمیرگاه',
    })),
  ], [repairShopVendors]);

  const handleDigits = (raw: string) => {
    const fa = '۰۱۲۳۴۵۶۷۸۹';
    const en = raw.replace(/[۰-۹]/g, d => String(fa.indexOf(d))).replace(/[^0-9]/g, '');
    setCost(en);
  };

  const handleSubmit = () => {
    const amount = Number(cost) || 0;
    if (amount <= 0) return toast.error('مبلغ هزینه تعمیر را وارد کنید.');
    if (!description.trim()) return toast.error('شرح تعمیر را بنویسید.');
    if (!startDate) return toast.error('تاریخ هزینه را انتخاب کنید.');
    if (hasEndDate && endDate < startDate) return toast.error('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.');

    const repairShopVendorId = shopKey !== 'FREE' ? shopKey : undefined;
    const shopName = shopKey !== 'FREE' ? (repairShopVendors.find(v => v.id === shopKey)?.name || '') : '';
    const vehicleName = vehicle?.name || 'خودرو';
    const txDescription = `هزینه تعمیر ${vehicleName}${shopName ? ` — ${shopName}` : ''}: ${description.trim()}`;

    // 💡 تخصیص مالی هم‌قالب با تراکنش دستی خودرو تا در «تاریخچه مالی» و دسته «تعمیرات» دیده شود
    const repairAllocations = [{
      id: crypto.randomUUID(),
      amount,
      allocationType: 'NONE' as any,
      recordType: 'LOGISTICS' as const,
      recordId: vehicleId,
      description: 'REPAIR',
    }];

    if (editRepairId) {
      updateRepair(editRepairId, {
        cost: amount,
        description: description.trim(),
        startDate,
        endDate: hasEndDate ? endDate : undefined,
        repairShopVendorId,
      });
      const linkedTx = allTransactions.find(t => t.linkedRepairId === editRepairId);
      if (linkedTx) {
        updateTransaction(linkedTx.id, { amount, date: startDate, description: txDescription, allocations: repairAllocations });
      } else {
        addTransaction({ referenceId: vehicleId, direction: 'OUT', type: 'CASH', amount, date: startDate, description: txDescription, linkedRepairId: editRepairId, allocations: repairAllocations });
      }
      toast.success('تعمیر ویرایش شد. سند مالی همگام‌سازی شد.');
    } else {
      const newId = addRepair({
        vehicleId,
        cost: amount,
        description: description.trim(),
        startDate,
        endDate: hasEndDate ? endDate : undefined,
        repairShopVendorId,
      });
      addTransaction({ referenceId: vehicleId, direction: 'OUT', type: 'CASH', amount, date: startDate, description: txDescription, linkedRepairId: newId, allocations: repairAllocations });
      toast.success(`تعمیر ثبت شد و سند مالی خودکار صادر شد.`);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 rounded-[2rem] shadow-2xl overflow-hidden my-8"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <motion.div animate={{ rotate: [0, 45, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg">
                  <Wrench className="w-5 h-5" />
                </motion.div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">{editRepairId ? 'ویرایش تعمیر' : 'ثبت تعمیر جدید'}</h3>
                  <p className="text-[11px] font-bold text-slate-500">{vehicle?.name || ''} — سند مالی خودکار صادر می‌شود</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300">مبلغ هزینه (تومان) *</label>
                  <input
                    value={cost ? Number(cost).toLocaleString('fa-IR') : ''}
                    onChange={(e) => handleDigits(e.target.value)}
                    placeholder="۰"
                    inputMode="numeric"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all text-slate-800 dark:text-white placeholder:text-slate-400 text-center tracking-wider"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-rose-500" /> تاریخ هزینه *</label>
                  <GlassDatePicker value={startDate} onChange={setStartDate} placeholder="انتخاب تاریخ..." />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 dark:text-slate-300">شرح تعمیر *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: تعویض لنت ترمز و دیسک چرخ جلو..."
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all text-slate-800 dark:text-white placeholder:text-slate-400 resize-none"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><Flag className="w-4 h-4 text-amber-500" /> توقف چندروزه در تعمیرگاه؟ (تاریخ پایان اختیاری)</span>
                  <button
                    onClick={() => setHasEndDate(!hasEndDate)}
                    className={`relative w-12 h-6.5 p-1 rounded-full transition-colors shrink-0 ${hasEndDate ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    style={{ height: 26 }}
                  >
                    <motion.span animate={{ x: hasEndDate ? -20 : 0 }} className="block w-[18px] h-[18px] bg-white rounded-full shadow" />
                  </button>
                </div>
                {hasEndDate && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                    <label className="text-xs font-black text-slate-600 dark:text-slate-300">تاریخ پایان تعمیر</label>
                    <GlassDatePicker value={endDate} onChange={setEndDate} placeholder="انتخاب تاریخ پایان..." />
                  </motion.div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><Store className="w-4 h-4 text-indigo-500" /> تعمیرگاه (از بخش خرید و تدارکات)</label>
                <PortalSelect
                  options={shopOptions}
                  value={shopKey}
                  onChange={setShopKey}
                  placeholder="انتخاب تعمیرگاه..."
                  searchable
                  onAddNew={() => setIsShopModalOpen(true)}
                  addNewLabel="ثبت تعمیرگاه جدید"
                />
                <p className="text-[10px] font-bold text-slate-400">اگر تعمیرگاه در لیست نیست، همین‌جا ثبتش کنید؛ به بخش تعمیرگاه‌ها اضافه می‌شود.</p>
              </div>

              <button onClick={handleSubmit} className="w-full py-4 rounded-2xl font-black text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 shadow-[0_10px_25px_rgba(244,63,94,0.35)] transition-all active:scale-[0.98]">
                {editRepairId ? 'ثبت ویرایش + همگام‌سازی سند مالی' : 'ثبت تعمیر + صدور خودکار سند مالی'}
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}

      <RepairShopFormModal isOpen={isShopModalOpen} onClose={() => setIsShopModalOpen(false)} />
    </AnimatePresence>
  );
}
