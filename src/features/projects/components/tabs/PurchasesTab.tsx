import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, CheckCircle, ShoppingCart, Store, Edit, Trash2, Gem, Banknote, Truck } from 'lucide-react';
import { toast } from 'sonner';

import { useProjectStore } from '../../store/projectStore';
import { useFinanceStore } from '../../../../store/financeStore'; 
import { useLogisticsStore } from '../../../../store/logisticsStore'; 
import { usePurchaseStore } from '../../../../store/purchaseStore';
import { useBulkSelection } from '../../../../hooks/useBulkSelection';
import GlassDatePicker from '../../../../components/ui/GlassDatePicker';
import GlassSelect from '../../../../components/ui/GlassSelect';

// 💡 اضافه شدن چک‌باکس انیمیشنی و گرافیکی با تم سرخابی/صورتی (ویژه خریدها)
const AnimatedCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div 
    onClick={onChange}
    className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm ${
      checked 
        ? 'bg-gradient-to-tr from-pink-500 to-rose-500 border-rose-400 shadow-[0_0_12px_rgba(236,72,153,0.4)] scale-105' 
        : 'bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 hover:border-pink-400'
    }`}
  >
    <AnimatePresence>
      {checked && (
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
          <CheckCircle className="w-4 h-4 text-white stroke-[3]" />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

const getTodayDate = () => {
  return new Date().toLocaleDateString('fa-IR');
};

export default function PurchasesTab({ projectId }: { projectId: string }) {
  const allProjects = useProjectStore((state) => state.projects);
  const project = useMemo(() => allProjects.find(p => p.id === projectId), [allProjects, projectId]);
  
  const allTransactions = useFinanceStore(state => state.transactions);
  const allLogs = useLogisticsStore(state => state.logs); 
  const allPurchases = usePurchaseStore(state => state.purchases);
  const deletePurchase = usePurchaseStore(state => state.deletePurchase);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState('ALL');
  
  const [undoItems, setUndoItems] = useState<{ id: string, items: string[], expireAt: number }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const { selectedIds, toggleSelection, clearSelection } = useBulkSelection();

  const projectPurchases = useMemo(() => {
    return allPurchases.filter(p => p.projectId === projectId);
  }, [allPurchases, projectId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            expired.forEach(u => u.items.forEach(id => deletePurchase(id)));
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e=>e.items).includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deletePurchase]);

  const triggerDelete = (ids: string[]) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: ids, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...ids]);
    clearSelection();
  };

  const filteredRecords = useMemo(() => {
    let baseFiltered = projectPurchases
      .filter((r: any) => {
        if (pendingDeleteIds.includes(r.id)) return false;
        const matchSearch = !searchQuery ? true : (r.title?.includes(searchQuery) || r.vendor?.includes(searchQuery));
        const matchFrom = dateFrom ? r.date >= dateFrom : true;
        const matchTo = dateTo ? r.date <= dateTo : true;
        return matchSearch && matchFrom && matchTo;
      })
      .sort((a: any, b: any) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.id.localeCompare(a.id);
      });
      
      return pageSize === 'ALL' ? baseFiltered : baseFiltered.slice(0, Number(pageSize));
  }, [projectPurchases, searchQuery, dateFrom, dateTo, pendingDeleteIds, pageSize]);

  const paginationOptions = [
    { value: 'ALL', label: 'نمایش همه' },
    { value: '10', label: '۱۰ رکورد آخر' },
    { value: '20', label: '۲۰ رکورد آخر' },
    { value: '50', label: '۵۰ رکورد آخر' }
  ];

  if (!project) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6">
      
      <div className="flex flex-wrap items-center gap-4 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm rounded-[2rem] px-6 py-4 z-[90] relative">
        <NeonSearchWrapper className="flex-1 w-full xl:w-auto min-w-[250px] h-[46px]">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input placeholder="جستجوی تامین‌کننده، فاکتور..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 transition-colors placeholder:text-slate-500" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /></button>}
        </NeonSearchWrapper>
        
        <div className="w-full xl:w-px h-px xl:h-8 bg-slate-300 dark:bg-slate-700 hidden xl:block" />
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto relative z-[100]">
          <div className="w-full sm:w-36 h-[46px]">
             <GlassSelect options={paginationOptions} value={pageSize} onChange={setPageSize} placeholder="نمایش..." />
          </div>
          <div className="w-full sm:w-36 h-[46px] relative">
            <GlassDatePicker placeholder="از تاریخ..." value={dateFrom} onChange={setDateFrom} />
          </div>
          <div className="w-full sm:w-36 h-[46px] relative">
            <GlassDatePicker placeholder="تا تاریخ..." value={dateTo} onChange={setDateTo} />
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-2xl modal-scrollbar relative min-h-[300px]">
        <table className="w-full text-right border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="w-12 p-5 text-center"><CheckCircle className="w-4 h-4 text-slate-400 mx-auto" /></th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">شماره و تاریخ فاکتور</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">تامین‌کننده / منبع</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">بهای تمام شده (واقعی)</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">فاکتور کارفرما / سود</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center">وضعیت مالی</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredRecords.map((record: any) => {
                const relatedTransport = allLogs.find((l: any) => l.projectId === projectId && l.date === record.date && (l.title || '').includes(record.vendor))
                                         || project?.logistics?.find((l: any) => l.date === record.date && (l.title || '').includes(record.vendor));
                
                const transportInternal = record.hasTransport ? record.transportInternalCost : (relatedTransport ? (relatedTransport.source === 'INTERNAL' ? relatedTransport.driverWage : relatedTransport.internalCost) : 0);
                const transportBilled = record.hasTransport ? record.transportBilledCost : (relatedTransport ? (relatedTransport.billedCost) : 0);
                const hasTransportFinal = record.hasTransport || !!relatedTransport;

                const totalReal = (record.internalCost || 0) + (transportInternal || 0);
                const totalBilled = (record.billedCost || record.internalCost || 0) + (transportBilled || transportInternal || 0);

                const isProfitable = totalBilled > totalReal;
                const profitAmount = totalBilled - totalReal;

                const relatedTransactions = allTransactions.filter(t => t.linkedPurchaseId === record.id);
                const totalPaidForThisPurchase = relatedTransactions.reduce((sum, t) => sum + t.amount, 0);
                const paymentPercentage = totalBilled > 0 ? Math.min(100, Math.round((totalPaidForThisPurchase / totalBilled) * 100)) : 0;
                
                let paymentStatusText = 'پرداخت نشده (بدهی)';
                let paymentStatusColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
                
                if (paymentPercentage >= 100) {
                  const hasCheque = relatedTransactions.some(t => t.type === 'CHEQUE');
                  paymentStatusText = hasCheque ? 'تسویه کامل (با چک)' : 'تسویه کامل (نقدی)';
                  paymentStatusColor = hasCheque ? 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
                } else if (paymentPercentage > 0) {
                  paymentStatusText = `علی‌الحساب (${paymentPercentage}%)`;
                  paymentStatusColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                }

                return (
                  <motion.tr key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`border-b border-slate-100 dark:border-slate-800 transition-colors group ${selectedIds.includes(record.id) ? 'bg-pink-500/10' : 'hover:bg-white dark:hover:bg-slate-800/50'}`}>
                    <td className="p-5 text-center w-12 align-top">
                      <div className="pt-2">
                        {/* 💡 جایگزینی با چک‌باکس گرافیکی */}
                        <AnimatedCheckbox checked={selectedIds.includes(record.id)} onChange={() => toggleSelection(record.id)} />
                      </div>
                    </td>
                    <td className="p-5 align-top">
                      <div className="flex flex-col gap-1.5 pt-1">
                        <span className="font-mono font-bold text-slate-800 dark:text-white text-sm" dir="ltr">INV-{record.id.substring(0,6).toUpperCase()}</span>
                        <span className="text-xs font-bold text-slate-500">{record.date}</span>
                      </div>
                    </td>
                    <td className="p-5 font-bold flex flex-col gap-1 text-slate-800 dark:text-white align-top">
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center"><Store className="w-4 h-4 text-pink-500" /></div>
                        {record.vendor}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">{record.quantity} {record.unit} خریداری شده</span>
                    </td>
                    
                    <td className="p-5 align-top">
                      <div className="flex flex-col gap-1.5 pt-1">
                        <span className="font-black text-lg text-rose-600 dark:text-rose-400" dir="ltr">
                          {(record.internalCost || 0).toLocaleString()}
                        </span>
                        {hasTransportFinal && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 flex items-center gap-1">
                            <Truck className="w-3 h-3"/> + {(transportInternal || 0).toLocaleString()} کرایه
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-1 border-t border-slate-200 dark:border-slate-700 pt-1 w-max"><Banknote className="w-3 h-3"/> خروج از جیب / بدهی</span>
                      </div>
                    </td>

                    <td className="p-5 align-top">
                      <div className="flex flex-col items-start gap-1.5 pt-1">
                        <span className="font-black text-lg text-emerald-600 dark:text-emerald-400" dir="ltr">
                          {(record.billedCost || record.internalCost || 0).toLocaleString()}
                        </span>
                        {hasTransportFinal && (
                          <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1">
                            <Truck className="w-3 h-3"/> + {(transportBilled || 0).toLocaleString()} کرایه
                          </span>
                        )}
                        {isProfitable ? (
                          <span className="flex items-center gap-1 mt-1 px-2 py-0.5 w-max bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 text-[10px] font-black rounded-md border border-fuchsia-500/20 shadow-[0_0_8px_rgba(217,70,239,0.3)]">
                            <Gem className="w-3 h-3" /> سود مخفی: {profitAmount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 mt-1">بدون سود افزوده</span>
                        )}
                      </div>
                    </td>

                    <td className="p-5 text-center align-top">
                      <div className="flex flex-col items-center gap-2 pt-2">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${paymentStatusColor}`}>
                          {paymentStatusText}
                        </span>
                        {paymentPercentage < 100 && (
                          <button onClick={() => {
                            const detail = {
                               linkedPurchaseId: record.id,
                               amount: totalBilled - totalPaidForThisPurchase,
                               type: 'CASH',
                               direction: 'OUT',
                               date: getTodayDate()
                            };
                            document.dispatchEvent(new CustomEvent('open-new-transaction-modal', { detail }));
                          }} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline decoration-indigo-300 underline-offset-2">
                            ثبت پرداخت جدید
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-5 text-center align-top">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                        <button onClick={() => document.dispatchEvent(new CustomEvent('open-new-purchase-modal', { detail: record }))} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-sm transition-colors"><Edit className="w-4 h-4" /></button>
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
                  <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3 opacity-50" />
                  <p className="text-slate-500 font-bold">هیچ فاکتور خریدی یافت نشد.</p>
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
                className="relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto"
                dir="rtl"
              >
                <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-500" />
                </div>
                
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-black text-slate-800 dark:text-white">
                    {undo.items.length > 1 ? `${undo.items.length} فاکتور در حال حذف` : 'فاکتور خرید در حال حذف'}
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