import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Trash2, Edit2, ReceiptText, Store, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { useLogisticsStore, type VehicleRepair } from '../../../store/logisticsStore';
import { useFinanceStore } from '../../../store/financeStore';
import { useProcurementStore } from '../../../store/procurementStore';
import { NeonSearchWrapper, PortalSelect, GlassDatePicker, AnimatedCheckbox, FloatingUndoToast } from '../../../components/ui/SharedLaborUI';
import NeonPagination, { PAGE_SIZE_OPTIONS, paginate, pageCountOf } from '../../procurement/components/shared/NeonPagination';
import { useUndoDelete } from '../../procurement/components/shared/useUndoDelete';
import VehicleRepairModal from './VehicleRepairModal';


function formatDate(d?: string) {
  if (!d) return '—';
  return d;
}

export default function VehicleRepairsTab({ vehicleId }: { vehicleId: string }) {
  const repairs = useLogisticsStore(s => s.repairs.filter(r => r.vehicleId === vehicleId));
  const allTransactions = useFinanceStore(s => s.transactions);
  const shopVendors = useProcurementStore(s => s.vendors);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState('10');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);

  const doDelete = useCallback((id: string) => {
    useLogisticsStore.getState().deleteRepair(id);
    const tx = useFinanceStore.getState().transactions.find(t => t.linkedRepairId === id);
    if (tx) useFinanceStore.getState().deleteTransaction(tx.id);
  }, []);

  const { undoItems, pendingDeleteIds, triggerDelete, cancelUndo } = useUndoDelete(doDelete);

  const shopNameOf = useCallback((r: VehicleRepair) => {
    if (!r.repairShopVendorId) return 'آزاد';
    return shopVendors.find(v => v.id === r.repairShopVendorId)?.name || 'نامشخص';
  }, [shopVendors]);

  const filtered = useMemo(() => {
    return repairs.filter(r => {
      if (pendingDeleteIds.includes(r.id)) return false;
      if (search.trim()) {
        const q = search.trim();
        const hay = `${r.description} ${shopNameOf(r)}`;
        if (!hay.includes(q)) return false;
      }
      if (dateFrom && r.startDate < dateFrom) return false;
      if (dateTo && r.startDate > dateTo) return false;
      return true;
    }).sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  }, [repairs, search, dateFrom, dateTo, pendingDeleteIds, shopNameOf]);

  const totalCost = useMemo(() => filtered.reduce((s, r) => s + (r.cost || 0), 0), [filtered]);

  const pageCount = pageCountOf(filtered.length, pageSize);
  const safePage = Math.min(page, pageCount);
  const rows = paginate(filtered, safePage, pageSize);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    triggerDelete(Array.from(selected));
    setSelected(new Set());
    toast.success('موارد انتخاب‌شده در حال حذف هستند. برای انصراف عجله کنید!');
  };

  const hasFilter = search.trim() || dateFrom || dateTo;

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
        <NeonSearchWrapper className="flex-1 min-w-[200px] h-[52px]">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            placeholder="جستجو در شرح یا نام تعمیرگاه..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 transition-colors placeholder:text-slate-500"
          />
          {search && <button onClick={() => setSearch('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500" /></button>}
        </NeonSearchWrapper>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-[150px]"><GlassDatePicker value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} placeholder="از تاریخ" /></div>
          <div className="w-[150px]"><GlassDatePicker value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} placeholder="تا تاریخ" /></div>
          <div className="w-[130px]">
            <PortalSelect options={PAGE_SIZE_OPTIONS} value={pageSize} onChange={(v: string) => { setPageSize(v); setPage(1); }} placeholder="تعداد" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <Wrench className="w-4 h-4 text-rose-500" />
          <span className="text-slate-600 dark:text-slate-300">تعداد تعمیرات:</span>
          <span className="font-black text-rose-600 dark:text-rose-400">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-slate-600 dark:text-slate-300">جمع هزینه:</span>
          <span className="font-black text-amber-600 dark:text-amber-400" dir="ltr">{totalCost.toLocaleString('fa-IR')} تومان</span>
        </div>
        {selected.size > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            onClick={handleBulkDelete}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500 text-white text-xs font-black shadow-lg hover:bg-rose-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> حذف {selected.size} مورد انتخاب‌شده
          </motion.button>
        )}
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-black text-slate-500 dark:text-slate-400">
              <th className="p-3 w-10">
                <AnimatedCheckbox
                  checked={rows.length > 0 && rows.every(r => selected.has(r.id))}
                  onChange={(v: boolean) => {
                    setSelected(prev => {
                      const next = new Set(prev);
                      rows.forEach(r => { if (v) next.add(r.id); else next.delete(r.id); });
                      return next;
                    });
                  }}
                />
              </th>
              <th className="p-3 text-right">تاریخ شروع</th>
              <th className="p-3 text-right">تاریخ پایان</th>
              <th className="p-3 text-right">شرح تعمیر</th>
              <th className="p-3 text-right">تعمیرگاه</th>
              <th className="p-3 text-left">مبلغ (تومان)</th>
              <th className="p-3 text-center">سند مالی</th>
              <th className="p-3 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {rows.map(r => {
                const linked = allTransactions.some(t => t.linkedRepairId === r.id);
                return (
                  <motion.tr
                    key={r.id}
                    layout="position"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={`border-t border-slate-100 dark:border-slate-800 transition-colors ${selected.has(r.id) ? 'bg-rose-50/60 dark:bg-rose-500/5' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}
                  >
                    <td className="p-3"><AnimatedCheckbox checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                    <td className="p-3 font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDate(r.startDate)}</td>
                    <td className="p-3 font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {r.endDate ? <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-black">{formatDate(r.endDate)}</span> : <span className="text-[11px] text-slate-400">تک‌روزه</span>}
                    </td>
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-200 max-w-[220px] truncate" title={r.description}>{r.description}</td>
                    <td className="p-3">
                      {r.repairShopVendorId ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-black"><Store className="w-3 h-3" />{shopNameOf(r)}</span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">آزاد</span>
                      )}
                    </td>
                    <td className="p-3 text-left font-black text-slate-800 dark:text-white font-mono" dir="ltr">{(r.cost || 0).toLocaleString('fa-IR')}</td>
                    <td className="p-3 text-center">
                      {linked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-black"><ReceiptText className="w-3 h-3" /> صادر شده</span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setEditId(r.id)} title="ویرایش" className="p-2 rounded-xl hover:bg-indigo-500/10 text-indigo-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => triggerDelete([r.id])} title="حذف" className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <Wrench className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-black">{hasFilter ? 'تعمیرای با این مشخصات پیدا نشد.' : 'هنوز تعمیری برای این خودرو ثبت نشده.'}</p>
          </div>
        )}
      </div>

      <NeonPagination id="vehicle-repairs" page={safePage} pageCount={pageCount} totalItems={filtered.length} pageSize={pageSize} onChange={setPage} />

      <VehicleRepairModal isOpen={editId !== null} onClose={() => setEditId(null)} vehicleId={vehicleId} editRepairId={editId} />
      <FloatingUndoToast undoItems={undoItems} onCancel={cancelUndo} />
    </div>
  );
}
