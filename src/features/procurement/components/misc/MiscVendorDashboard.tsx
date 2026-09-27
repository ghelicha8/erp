import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Search, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useProcurementStore } from '../../../../store/procurementStore';
import { useFinanceStore } from '../../../../store/financeStore';
import { usePurchaseStore } from '../../../../store/purchaseStore';
import { SECTION_CONFIG } from '../shared/vendorTypes';
import VendorCard from '../shared/VendorCard';
import { useUndoDelete } from '../shared/useUndoDelete';
import { NeonSearchWrapper, PortalSelect } from '../../../../components/ui/SharedLaborUI';
import MiscVendorFormModal from './MiscVendorFormModal';
import MiscVendorProfile from './MiscVendorProfile';

const SORT_OPTIONS = [
  { id: 'NEWEST', label: 'جدیدترین' },
  { id: 'ALPHA', label: 'حروف الفبا' },
  { id: 'MOST_PURCHASE', label: 'بیشترین خرید' },
  { id: 'MOST_PAID', label: 'بیشترین پرداختی' },
];

interface MiscVendorDashboardProps {
  onBack: () => void;
}

export default function MiscVendorDashboard({ onBack }: MiscVendorDashboardProps) {
  const cfg = SECTION_CONFIG.MISC;
  const SectionIcon = cfg.icon;

  const vendors = useProcurementStore(s => s.vendors);
  const toggleVendorPin = useProcurementStore(s => s.toggleVendorPin);
  const deleteVendor = useProcurementStore(s => s.deleteVendor);
  const allTransactions = useFinanceStore(s => s.transactions);
  const allPurchases = usePurchaseStore(s => s.purchases);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const { undoItems, pendingDeleteIds, triggerDelete, cancelUndo } = useUndoDelete(deleteVendor);

  const vendorStats = useMemo(() => {
    const map: Record<string, { purchaseCount: number, totalPaid: number }> = {};
    vendors.forEach(v => {
      if (v.section !== 'MISC') return;
      const purchaseCount = allPurchases.filter((p: any) => p.vendor === v.name).length;
      const totalPaid = allTransactions.filter(t => t.referenceId === v.id && t.direction === 'OUT').reduce((s, t) => s + (t.amount || 0), 0);
      map[v.id] = { purchaseCount, totalPaid };
    });
    return map;
  }, [vendors, allPurchases, allTransactions]);

  const processedVendors = useMemo(() => {
    const list = vendors.filter(v => {
      if (v.section !== 'MISC') return false;
      if (pendingDeleteIds.includes(v.id)) return false;
      if (!searchQuery) return true;
      const q = searchQuery;
      return (v.name || '').includes(q) || (v.phones || []).some(p => p.includes(q)) || (v.address || '').includes(q);
    });
    list.sort((a, b) => {
      if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
      if (sortBy === 'ALPHA') return (a.name || '').localeCompare(b.name || '', 'fa');
      if (sortBy === 'MOST_PURCHASE') return (vendorStats[b.id]?.purchaseCount || 0) - (vendorStats[a.id]?.purchaseCount || 0);
      if (sortBy === 'MOST_PAID') return (vendorStats[b.id]?.totalPaid || 0) - (vendorStats[a.id]?.totalPaid || 0);
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
    return list;
  }, [vendors, searchQuery, sortBy, pendingDeleteIds, vendorStats]);

  if (selectedVendorId) {
    return <MiscVendorProfile vendorId={selectedVendorId} onBack={() => setSelectedVendorId(null)} />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="w-full flex flex-col gap-6 pb-24">
      <div className="sticky top-4 z-[100] flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/80 dark:border-slate-700/80 shadow-[0_15px_40px_rgba(0,0,0,0.08)] rounded-[2rem] px-6 py-5">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center justify-center p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-inner border border-slate-200 dark:border-slate-600 transition-all shrink-0 group" title="بازگشت">
            <ArrowRight className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:translate-x-1 transition-transform" />
          </button>
          <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 3 }} className={`p-3 rounded-2xl bg-gradient-to-br ${cfg.gradient} text-white shadow-lg shrink-0`}>
            <SectionIcon className="w-6 h-6" />
          </motion.div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white">{cfg.label}</h2>
            <p className="text-[11px] font-bold text-slate-500">{processedVendors.length} پروفایل فعال</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
          <NeonSearchWrapper className="flex-1 min-w-[200px] h-[52px]">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input placeholder={`جستجو در ${cfg.label}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 transition-colors placeholder:text-slate-500" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500" /></button>}
          </NeonSearchWrapper>

          <div className="w-full md:w-[190px] h-[52px] shrink-0">
            <PortalSelect options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} placeholder="مرتب‌سازی" className="!rounded-2xl" />
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setIsFormOpen(true)}
            className={`h-[52px] px-6 flex items-center justify-center gap-2 bg-gradient-to-r ${cfg.gradient} ${cfg.gradientHover} text-white rounded-2xl font-black ${cfg.glowShadow} transition-all shrink-0 relative overflow-hidden group border ${cfg.border}`}
          >
            <motion.div animate={{ rotate: [0, -14, 14, 0], scale: [1, 1.18, 1] }} transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }} className="relative z-10 flex">
              <cfg.icon className="w-5 h-5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]" />
            </motion.div>
            <span className="relative z-10 text-sm whitespace-nowrap">ثبت {cfg.singular} جدید</span>
          </motion.button>
        </div>
      </div>

      {processedVendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white/20 dark:bg-slate-900/20 border border-dashed border-slate-300 dark:border-slate-700 rounded-[2rem]">
          <div className={`w-20 h-20 rounded-[1.75rem] bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white shadow-xl mb-5 opacity-80`}>
            <SectionIcon className="w-9 h-9" />
          </div>
          <h3 className="text-xl font-black text-slate-700 dark:text-slate-200">پروفایلی ثبت نشده است</h3>
          <p className="text-sm font-bold text-slate-400 mt-2 mb-6">اولین {cfg.singular} را ثبت کنید.</p>
          <button onClick={() => setIsFormOpen(true)} className={`px-8 py-3.5 rounded-2xl font-black text-white bg-gradient-to-r ${cfg.gradient} ${cfg.glowShadow} transition-all hover:scale-105 active:scale-95`}>
            ثبت {cfg.singular} جدید
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {processedVendors.map(v => (
              <VendorCard
                key={v.id}
                vendor={v}
                purchaseCount={vendorStats[v.id]?.purchaseCount || 0}
                totalPaid={vendorStats[v.id]?.totalPaid || 0}
                onTogglePin={toggleVendorPin}
                onDelete={(id) => triggerDelete([id])}
                onClick={() => setSelectedVendorId(v.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <MiscVendorFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

      {typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
          <AnimatePresence>
            {undoItems.map(undo => (
              <motion.div
                key={undo.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 shadow-xl rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto"
                dir="rtl"
              >
                <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-500" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-black text-slate-800 dark:text-white">پروفایل در حال حذف</span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">تا چند ثانیه دیگر پاک می‌شود...</span>
                </div>
                <button onClick={() => { cancelUndo(undo.id); toast.success('عملیات لغو شد'); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-black transition-colors shrink-0 shadow-sm">
                  انصراف
                </button>
                <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} className="absolute bottom-0 right-0 h-1 bg-rose-500" style={{ transformOrigin: 'right' }} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>, document.body
      )}
    </motion.div>
  );
}
