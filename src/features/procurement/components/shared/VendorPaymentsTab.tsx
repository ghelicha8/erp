import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, CheckCircle, Wallet, Edit, Trash2, Banknote, Receipt } from 'lucide-react';
import { toast } from 'sonner';

import { useFinanceStore } from '../../../../store/financeStore';
import { usePurchaseStore } from '../../../../store/purchaseStore';
import { useBulkSelection } from '../../../../hooks/useBulkSelection';
import GlassDatePicker from '../../../../components/ui/GlassDatePicker';
import { NeonSearchWrapper, AnimatedCheckbox, PortalSelect } from '../../../../components/ui/SharedLaborUI';

interface VendorPaymentsTabProps {
  vendorId: string;
  vendorName: string;
  onEditPayment: (txId: string) => void;
}

export default function VendorPaymentsTab({ vendorId, vendorName, onEditPayment }: VendorPaymentsTabProps) {
  const allTransactions = useFinanceStore(state => state.transactions);
  const deleteTransaction = useFinanceStore(state => state.deleteTransaction);
  const allPurchases = usePurchaseStore(state => state.purchases);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState('ALL');

  const [undoItems, setUndoItems] = useState<{ id: string, items: string[], expireAt: number }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const { selectedIds, toggleSelection, clearSelection } = useBulkSelection();

  const vendorTxs = useMemo(() => {
    return allTransactions.filter(t => t.referenceId === vendorId);
  }, [allTransactions, vendorId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
        const expired = prev.filter(u => u.expireAt <= now);
        const active = prev.filter(u => u.expireAt > now);
        if (expired.length > 0) {
          expired.forEach(u => u.items.forEach(id => deleteTransaction(id)));
          setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e => e.items).includes(id))), 0);
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteTransaction]);

  const triggerDelete = (ids: string[]) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: ids, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...ids]);
    clearSelection();
  };

  const filteredRecords = useMemo(() => {
    const base = vendorTxs
      .filter((r) => {
        if (pendingDeleteIds.includes(r.id)) return false;
        const matchSearch = !searchQuery ? true : ((r.description || '').includes(searchQuery) || (r.date || '').includes(searchQuery));
        const matchFrom = dateFrom ? (r.date || '') >= dateFrom : true;
        const matchTo = dateTo ? (r.date || '') <= dateTo : true;
        return matchSearch && matchFrom && matchTo;
      })
      .sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.id.localeCompare(a.id);
      });
    return pageSize === 'ALL' ? base : base.slice(0, Number(pageSize));
  }, [vendorTxs, searchQuery, dateFrom, dateTo, pendingDeleteIds, pageSize]);

  const totalPaid = useMemo(() =>
    vendorTxs.filter(t => t.direction === 'OUT' && !pendingDeleteIds.includes(t.id)).reduce((s, t) => s + (t.amount || 0), 0),
    [vendorTxs, pendingDeleteIds]);

  const paginationOptions = [
    { value: 'ALL', label: 'نمایش همه' },
    { value: '10', label: '۱۰ رکورد آخر' },
    { value: '20', label: '۲۰ رکورد آخر' },
    { value: '50', label: '۵۰ رکورد آخر' }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6">
      <div className="flex flex-wrap items-center gap-4 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm rounded-[2rem] px-6 py-4 z-[90] relative">
        <NeonSearchWrapper className="flex-1 w-full xl:w-auto min-w-[200px] h-[46px]">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input placeholder={`جستجو در پرداختی‌های ${vendorName}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 transition-colors placeholder:text-slate-500" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /></button>}
        </NeonSearchWrapper>

        <div className="w-full xl:w-px h-px xl:h-8 bg-slate-300 dark:bg-slate-700 hidden xl:block" />

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto relative z-[100]">
          <div className="w-full sm:w-36 h-[46px]">
            <PortalSelect options={paginationOptions} value={pageSize} onChange={setPageSize} placeholder="نمایش..." />
          </div>
          <div className="w-full sm:w-36 h-[46px] relative">
            <GlassDatePicker placeholder="از تاریخ..." value={dateFrom} onChange={setDateFrom} />
          </div>
          <div className="w-full sm:w-36 h-[46px] relative">
            <GlassDatePicker placeholder="تا تاریخ..." value={dateTo} onChange={setDateTo} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-2">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <Banknote className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">مجموع پرداختی:</span>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400" dir="ltr">{totalPaid.toLocaleString()} تومان</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-2xl modal-scrollbar relative min-h-[300px]">
        <table className="w-full text-right border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="w-12 p-5 text-center"><CheckCircle className="w-4 h-4 text-slate-400 mx-auto" /></th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">تاریخ</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">شرح پرداخت</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">فاکتور مرتبط</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">مبلغ (تومان)</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center">نوع</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredRecords.map((record) => {
                const linkedPurchase = record.linkedPurchaseId ? allPurchases.find(p => p.id === record.linkedPurchaseId) : undefined;
                return (
                  <motion.tr key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`border-b border-slate-100 dark:border-slate-800 transition-colors group ${selectedIds.includes(record.id) ? 'bg-emerald-500/10' : 'hover:bg-white dark:hover:bg-slate-800/50'}`}>
                    <td className="p-5 text-center w-12 align-top">
                      <div className="pt-2">
                        <AnimatedCheckbox checked={selectedIds.includes(record.id)} onChange={() => toggleSelection(record.id)} />
                      </div>
                    </td>
                    <td className="p-5 align-top">
                      <span className="font-mono font-bold text-slate-800 dark:text-white text-sm">{record.date}</span>
                    </td>
                    <td className="p-5 align-top">
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><Wallet className="w-4 h-4 text-emerald-500" /></div>
                        <span className="font-bold text-sm text-slate-800 dark:text-white line-clamp-2">{record.description || '—'}</span>
                      </div>
                    </td>
                    <td className="p-5 align-top">
                      {linkedPurchase ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-black">
                          <Receipt className="w-3.5 h-3.5" /> {(linkedPurchase as any).title || `INV-${linkedPurchase.id.substring(0, 6).toUpperCase()}`}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">عمومی</span>
                      )}
                    </td>
                    <td className="p-5 align-top">
                      <span className={`font-black text-lg ${record.direction === 'OUT' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} dir="ltr">
                        {(record.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-5 text-center align-top">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${record.type === 'CHEQUE' ? 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'}`}>
                        {record.type === 'CHEQUE' ? 'چک' : 'نقدی'}
                      </span>
                    </td>
                    <td className="p-5 text-center align-top">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                        <button onClick={() => onEditPayment(record.id)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-sm transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => triggerDelete([record.id])} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 shadow-sm transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={7} className="p-16 text-center">
                  <Wallet className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3 opacity-50" />
                  <p className="text-slate-500 font-bold">هیچ پرداختی برای این پروفایل ثبت نشده است.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[999999] shadow-2xl px-6 py-4 rounded-full backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 flex items-center gap-6">
              <span className="text-slate-800 dark:text-white font-bold text-sm bg-slate-100 dark:bg-white/10 px-3 py-1.5 rounded-full">{selectedIds.length} مورد انتخاب شده</span>
              <button onClick={() => triggerDelete(selectedIds)} className="flex items-center gap-2 text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-sm"><Trash2 className="w-5 h-5" /> حذف موقت گروهی</button>
            </motion.div>
          )}
        </AnimatePresence>, document.body
      )}

      {typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
          <AnimatePresence>
            {undoItems.map(undo => (
              <motion.div
                key={undo.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto"
                dir="rtl"
              >
                <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-500" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-black text-slate-800 dark:text-white">
                    {undo.items.length > 1 ? `${undo.items.length} پرداخت در حال حذف` : 'پرداخت در حال حذف'}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    تا چند ثانیه دیگر پاک می‌شود...
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPendingDeleteIds(prev => prev.filter(id => !undo.items.includes(id)));
                    setUndoItems(prev => prev.filter(u => u.id !== undo.id));
                    toast.success('عملیات لغو شد');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-black transition-colors shrink-0 shadow-sm"
                >
                  انصراف
                </button>
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className="absolute bottom-0 right-0 h-1 bg-rose-500"
                  style={{ transformOrigin: 'right' }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>, document.body
      )}
    </motion.div>
  );
}
