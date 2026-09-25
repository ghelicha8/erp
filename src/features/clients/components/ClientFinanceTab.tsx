import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, CheckCircle, Clock, Banknote, FileSignature, 
  Edit, Trash2, Image as ImageIcon, ArrowLeftRight, AlertTriangle, 
  AlignLeft, Wallet, Layers, SplitSquareHorizontal,
  Archive, History, ChevronDown, Download
} from 'lucide-react';
import { toast } from 'sonner';

// 💡 آدرس‌ها تصحیح شد (سه سطح برگشت به عقب برای دسترسی به store)
import { useFinanceStore } from '../../../store/financeStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useClientStore } from '../../../store/clientStore';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import GlassSelect from '../../../components/ui/GlassSelect';
import NewTransactionModal from '../../projects/components/NewTransactionModal';
import type { Transaction } from '../../../store/financeStore';


const formatAmount = (val: string | number) => Number(val).toLocaleString('fa-IR');

// 💡 استفاده از چک‌باکس انیمیشنی و گرافیکی با تم بنفش/نیلی یکپارچه
const AnimatedCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm ${
      checked 
        ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 border-purple-400 shadow-[0_0_12px_rgba(99,102,241,0.4)] scale-105' 
        : 'bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 hover:border-indigo-400'
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
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse z-0" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

const ChequeStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, any> = {
    PENDING: { label: 'در انتظار وصول', color: 'text-orange-500', bg: 'bg-orange-500/15', border: 'border-orange-500/40', icon: Clock },
    CASH_SETTLED: { label: 'پاس شده', color: 'text-emerald-500', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', icon: CheckCircle },
    CASHED: { label: 'پاس شده (وصول)', color: 'text-emerald-500', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', icon: CheckCircle },
    BOUNCED: { label: 'برگشتی', color: 'text-rose-500', bg: 'bg-rose-500/15', border: 'border-rose-500/40', icon: AlertTriangle },
    RETURNED: { label: 'عودت داده', color: 'text-rose-400', bg: 'bg-rose-400/15', border: 'border-rose-400/40', icon: AlertTriangle },
    EXCHANGED: { label: 'تعویض شده', color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-400/40', icon: ArrowLeftRight },
  };
  const currentConfig = statusConfig[status] || statusConfig['PENDING'];
  const Icon = currentConfig.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${currentConfig.border} ${currentConfig.bg} ${currentConfig.color} text-[11px] sm:text-xs font-bold shadow-sm whitespace-nowrap`}>
      <Icon className="w-3.5 h-3.5" /> {currentConfig.label}
    </span>
  );
};

export default function ClientFinanceTab({ clientId }: { clientId: string }) {
  const client = useClientStore(state => state.clients.find(c => c.id === clientId));
  const allProjects = useProjectStore(state => state.projects);
  const allTransactions = useFinanceStore(state => state.transactions);
  const deleteTransaction = useFinanceStore(state => state.deleteTransaction);
  const deleteChequeHistory = useFinanceStore((state) => state.deleteChequeHistory);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('ALL');
  const [pageSize, setPageSize] = useState<string>('ALL');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [undoItems, setUndoItems] = useState<{ id: string, items: string[], expireAt: number }[]>([]);
  
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<any | null>(null);
  const [selectedArchiveTx, setSelectedArchiveTx] = useState<Transaction | null>(null);
  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);
  const [archiveUndo, setArchiveUndo] = useState<{ txId: string, historyId: string, expireAt: number } | null>(null);
  
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editTransactionData, setEditTransactionData] = useState<Transaction | null>(null);

  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  const clientProjects = useMemo(() => allProjects.filter(p => p.clientId === clientId), [allProjects, clientId]);
  const clientProjectIds = useMemo(() => clientProjects.map(p => p.id), [clientProjects]);

  useEffect(() => {
    const handleEditTransaction = (e: any) => { setEditTransactionData(e.detail); setIsTransactionModalOpen(true); };
    const handleNewTransaction = (e: any) => { setEditTransactionData(e.detail || null); setIsTransactionModalOpen(true); };
    document.addEventListener('open-edit-transaction-modal', handleEditTransaction);
    document.addEventListener('open-new-transaction-modal', handleNewTransaction);
    return () => {
      document.removeEventListener('open-edit-transaction-modal', handleEditTransaction);
      document.removeEventListener('open-new-transaction-modal', handleNewTransaction);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            expired.forEach(u => u.items.forEach(id => deleteTransaction(id)));
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e=>e.items).includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteTransaction]);

  useEffect(() => {
    if (!archiveUndo) return;
    const interval = setInterval(() => {
      if (Date.now() > archiveUndo.expireAt) {
        deleteChequeHistory(archiveUndo.txId, archiveUndo.historyId);
        setArchiveUndo(null);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [archiveUndo, deleteChequeHistory]);

  const projectFilterOptions = useMemo(() => [
    { value: 'ALL', label: 'همه پروژه‌ها' },
    ...clientProjects.map(p => ({ value: p.id, label: p.name }))
  ], [clientProjects]);

  const phaseFilterOptions = useMemo(() => {
    if (selectedProjectFilter === 'ALL') return [{ value: 'ALL', label: 'همه فازها' }];
    const proj = clientProjects.find(p => p.id === selectedProjectFilter);
    return [
      { value: 'ALL', label: 'همه فازها' },
      ...(proj?.phases?.map((p: any) => ({ value: p.id, label: p.name })) || [])
    ];
  }, [selectedProjectFilter, clientProjects]);

  useEffect(() => { setSelectedPhaseFilter('ALL'); }, [selectedProjectFilter]);

  if (!client) return null;

  const calculatedWallet = useMemo(() => {
    const directTxs = allTransactions.filter(t => t.clientId === clientId && t.direction === 'IN');
    return directTxs.reduce((sum, t) => {
      const allocated = t.allocations?.filter(a => a.allocationType !== 'WALLET').reduce((acc, a) => acc + (a.amount || 0), 0) || 0;
      return sum + Math.max(t.amount - allocated, 0);
    }, 0);
  }, [allTransactions, clientId]);

  const visibleTxs = useMemo(() => {
    let txs = allTransactions.filter(t => 
      t.clientId === clientId || 
      t.referenceId === clientId ||
      clientProjectIds.includes(t.referenceId || '') ||
      clientProjectIds.includes(t.projectId || '') ||
      t.allocations?.some(a => clientProjectIds.includes(a.projectId || ''))
    );
    
    txs = txs.filter(t => !pendingDeleteIds.includes(t.id));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      txs = txs.filter(t => 
        t.description?.toLowerCase().includes(q) || 
        t.amount.toString().includes(q) ||
        t.chequeDetails?.serialNumber?.includes(q) ||
        t.chequeDetails?.issuer?.includes(q)
      );
    }

    if (selectedProjectFilter !== 'ALL') {
      txs = txs.filter(t => t.referenceId === selectedProjectFilter || t.allocations?.some(a => a.projectId === selectedProjectFilter));
    }
    if (selectedPhaseFilter !== 'ALL') {
      txs = txs.filter(t => t.phaseId === selectedPhaseFilter || t.allocations?.some(a => a.phaseId === selectedPhaseFilter));
    }
    if (dateFrom) txs = txs.filter(t => t.date >= dateFrom);
    if (dateTo) txs = txs.filter(t => t.date <= dateTo);

    txs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.date.localeCompare(a.date));
    if (pageSize !== 'ALL') txs = txs.slice(0, parseInt(pageSize));

    return txs;
  }, [allTransactions, clientId, clientProjectIds, pendingDeleteIds, searchQuery, selectedProjectFilter, selectedPhaseFilter, dateFrom, dateTo, pageSize]);

  const isAllSelected = selectedIds.length === visibleTxs.length && visibleTxs.length > 0;

  const toggleSelection = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  const handleSelectAll = () => isAllSelected ? setSelectedIds([]) : setSelectedIds(visibleTxs.map(t => t.id));
  const triggerDelete = (ids: string[]) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: ids, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...ids]);
    setSelectedIds([]); 
  };

  const getProjectName = (tx: any) => {
    if (tx.allocations && tx.allocations.length > 1) return 'تخصیص چندگانه (خرید، پروژه...)';
    
    let targetProjectId = null;
    if (tx.allocations && tx.allocations.length === 1 && tx.allocations[0].allocationType === 'PROJECT') {
      targetProjectId = tx.allocations[0].projectId;
    } else if (clientProjectIds.includes(tx.referenceId)) {
      targetProjectId = tx.referenceId;
    }

    if (targetProjectId) {
      const proj = allProjects.find((p:any) => p.id === targetProjectId);
      return proj ? proj.name : 'پروژه نامشخص';
    }
    
    if (tx.allocations && tx.allocations[0]?.allocationType === 'FREELANCE') return 'کار آزاد / متفرقه';
    if (tx.clientId === clientId) return 'انتقال به کیف پول / مستقیم';
    
    return 'بدون دسته‌بندی';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { PENDING: 'در انتظار وصول', CASHED: 'پاس شده', BOUNCED: 'برگشت خورده', RETURNED: 'عودت داده شده', EXCHANGED: 'تعویض شده' };
    return labels[status] || status;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full flex flex-col gap-6 relative overflow-visible">
      
      <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl rounded-[2.5rem] p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-white/80 dark:border-slate-600/50 flex flex-col md:flex-row items-center justify-between gap-6 group z-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-emerald-400/20 transition-colors duration-700" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-indigo-400/10 transition-colors duration-700" />

        <div className="relative z-10 flex items-center gap-5 w-full md:w-auto">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-500 shadow-inner transform group-hover:scale-110 transition-transform duration-500">
            <Wallet className="w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-slate-800 dark:text-white drop-shadow-sm">تخصیص هوشمند موجودی</h3>
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              موجودی آزاد در کیف پول: 
              <span className="text-emerald-600 dark:text-emerald-400 font-black text-lg" dir="ltr">{calculatedWallet.toLocaleString('fa-IR')}</span> 
              <span className="text-[10px]">تومان</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm rounded-[2rem] px-4 sm:px-6 py-4 z-[50] relative overflow-visible mt-2">
        <NeonSearchWrapper className="flex-[1_1_250px] h-[46px]">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input placeholder="جستجو در تراکنش‌ها..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white pl-2 pr-4 transition-colors placeholder:text-slate-500" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /></button>}
        </NeonSearchWrapper>
        
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 flex-[1_1_auto] relative z-[10000] overflow-visible">
          <div className="w-[calc(50%-0.5rem)] sm:w-[110px] shrink-0 h-[46px] relative z-[10005]">
            <GlassSelect options={[{ value: 'ALL', label: 'نمایش همه' }, { value: '10', label: 'نمایش ۱۰' }, { value: '20', label: 'نمایش ۲۰' }, { value: '50', label: 'نمایش ۵۰' }]} value={pageSize} onChange={setPageSize} placeholder="تعداد" />
          </div>
          <div className="w-[calc(50%-0.5rem)] sm:w-[150px] shrink-0 h-[46px] relative z-[10004]">
            <GlassSelect options={projectFilterOptions} value={selectedProjectFilter} onChange={setSelectedProjectFilter} placeholder="همه پروژه‌ها" />
          </div>
          <div className="w-[calc(50%-0.5rem)] sm:w-[130px] shrink-0 h-[46px] relative z-[10003]">
            <GlassSelect options={phaseFilterOptions} value={selectedPhaseFilter} onChange={setSelectedPhaseFilter} placeholder="همه فازها" disabled={selectedProjectFilter === 'ALL'} />
          </div>
          <div className="w-[calc(50%-0.5rem)] sm:w-[176px] shrink-0 h-[46px] relative z-[10002]">
            <GlassDatePicker placeholder="از تاریخ..." value={dateFrom} onChange={setDateFrom} />
          </div>
          <div className="w-[calc(50%-0.5rem)] sm:w-[176px] shrink-0 h-[46px] relative z-[10001]">
            <GlassDatePicker placeholder="تا تاریخ..." value={dateTo} onChange={setDateTo} />
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-xl modal-scrollbar relative min-h-[300px] flex flex-col z-10">
        <table className="w-full text-right border-collapse min-w-[1000px] flex-1">
          <thead>
            <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="w-14 p-5 text-center align-top"><div className="pt-2.5 flex justify-center"><AnimatedCheckbox checked={isAllSelected} onChange={handleSelectAll} /></div></th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">شرح و تاریخ</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center">مبلغ (تومان)</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">نوع / جزئیات پرداخت</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center">وضعیت</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {visibleTxs.map((trx) => {
                const badgeName = getProjectName(trx);
                
                return (
                <motion.tr key={trx.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }} className={`border-b border-slate-100 dark:border-slate-800 transition-colors group ${selectedIds.includes(trx.id) ? 'bg-indigo-500/10' : 'hover:bg-white dark:hover:bg-slate-800/50'}`}>
                  
                  <td className="p-5 text-center align-top w-14">
                    <div className="pt-2.5 flex justify-center">
                      <AnimatedCheckbox checked={selectedIds.includes(trx.id)} onChange={() => toggleSelection(trx.id)} />
                    </div>
                  </td>
                  
                  <td className="p-5 align-top w-[20%]">
                    <div className="flex flex-col pt-1">
                      <span className="font-bold text-slate-800 dark:text-white">{trx.description || 'بدون شرح'}</span>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{trx.date}</span>
                        {badgeName && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                            badgeName.includes('کیف پول') ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30' :
                            badgeName.includes('آزاد') ? 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30' :
                            trx.allocations && trx.allocations.length > 1 ? 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:border-fuchsia-500/30' : 
                            'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30'
                          }`}>
                            {badgeName.includes('کیف پول') ? <Wallet className="w-3 h-3" /> :
                             badgeName.includes('آزاد') ? <AlignLeft className="w-3 h-3" /> :
                             trx.allocations && trx.allocations.length > 1 ? <SplitSquareHorizontal className="w-3 h-3" /> : <Layers className="w-3 h-3" />} 
                            {badgeName}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-5 align-top w-[15%] text-center">
                    <div className="flex flex-col items-center gap-1.5 pt-1">
                      <span className={`font-black text-lg ${trx.direction === 'IN' ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`} dir="ltr">{trx.amount.toLocaleString('fa-IR')}</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md w-max ${trx.direction === 'IN' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>{trx.direction === 'IN' ? 'دریافتی از کارفرما' : 'خروج وجه'}</span>
                    </div>
                  </td>
                  
                  <td className="p-5 align-top w-[40%]">
                    <div className="flex items-start gap-3 pt-1">
                      {trx.type === 'CASH' ? (
                        <><div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><Banknote className="w-5 h-5 text-emerald-500" /></div><div className="flex flex-col justify-center h-full pt-1.5"><span className="text-sm font-black text-slate-700 dark:text-slate-200">پرداخت نقدی / حواله</span></div></>
                      ) : (
                        <><div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0"><FileSignature className="w-5 h-5 text-cyan-500" /></div>
                          <div className="flex flex-col gap-2 w-full"><div className="flex items-center gap-2 pt-1.5"><span className="text-sm font-black text-slate-800 dark:text-white">چک صیادی / عادی</span></div>
                            
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {trx.chequeDetails?.issuer && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300">صاحب: {trx.chequeDetails.issuer}</span>}
                              {trx.chequeDetails?.receiver && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300">در وجه: {trx.chequeDetails.receiver}</span>}
                              {trx.chequeDetails?.bank && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300">بانک: {trx.chequeDetails.bank}</span>}
                              {trx.chequeDetails?.branch && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300">شعبه: {trx.chequeDetails.branch}</span>}
                              {trx.chequeDetails?.accountNumber && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">حساب: {trx.chequeDetails.accountNumber}</span>}
                              {trx.chequeDetails?.sayyadId && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">صیاد: {trx.chequeDetails.sayyadId}</span>}
                              {trx.chequeDetails?.series && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">سری: {trx.chequeDetails.series}</span>}
                              {trx.chequeDetails?.serialNumber && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">سریال: {trx.chequeDetails.serialNumber}</span>}
                              {trx.chequeDetails?.issueDate && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300">صدور: {trx.chequeDetails.issueDate}</span>}
                              {trx.chequeDetails?.dueDate && <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-[10px] font-black text-indigo-600 dark:text-indigo-400">سررسید: {trx.chequeDetails.dueDate}</span>}
                            </div>
                          </div></>
                      )}
                    </div>
                  </td>

                  <td className="p-5 text-center align-top w-[10%]">
                    <div className="pt-2 flex justify-center">
                      {trx.type === 'CHEQUE' ? <ChequeStatusBadge status={trx.chequeDetails?.status || 'PENDING'} /> : <span className="inline-flex items-center px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold"><CheckCircle className="w-3.5 h-3.5 ml-1.5" /> موفق</span>}
                    </div>
                  </td>

                  <td className="p-5 text-center align-top w-[10%]">
                    <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                      
                      {trx.type === 'CHEQUE' && trx.chequeDetails?.history && trx.chequeDetails.history.length > 0 && (
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setSelectedArchiveTx(trx)} title="بایگانی و سوابق" className="p-2 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-500 shadow-sm transition-colors relative">
                          <Archive className="w-4 h-4" />
                          <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-fuchsia-500 text-[8px] items-center justify-center text-white font-black">{trx.chequeDetails.history.length}</span></span>
                        </motion.button>
                      )}

                      <button onClick={() => setSelectedReceiptTx(trx)} title="مشاهده رسید/تصویر" className={`p-2 rounded-xl transition-colors shadow-sm ${(trx.attachments && trx.attachments.length > 0) || trx.textReceipt ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-500 hover:bg-yellow-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-yellow-500'}`}><ImageIcon className="w-4 h-4" /></button>
                      <button onClick={() => document.dispatchEvent(new CustomEvent('open-edit-transaction-modal', { detail: trx }))} title="مشاهده و ویرایش" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-500 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => triggerDelete([trx.id])} title="حذف موقت" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-500 shadow-sm hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>

                </motion.tr>
              )})}
              {visibleTxs.length === 0 && <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}><td colSpan={6} className="p-16 text-center text-slate-500 font-bold">هیچ تراکنشی یافت نشد.</td></motion.tr>}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[999999] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-2xl px-6 py-4 rounded-[2rem] backdrop-blur-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-6">
              <span className="text-slate-800 dark:text-white font-bold text-sm bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10">{selectedIds.length} مورد انتخاب شده</span>
              <button onClick={() => triggerDelete(selectedIds)} className="flex items-center gap-2 text-rose-500 hover:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-4 py-2 rounded-xl transition-colors font-bold text-sm"><Trash2 className="w-5 h-5" /> حذف موقت گروهی</button>
            </motion.div>
          )}
        </AnimatePresence>, document.body
      )}

      {typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
          <AnimatePresence>
            {undoItems.map(undo => (
              <motion.div key={undo.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto" dir="rtl">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0"><Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-500" /></div>
                <div className="flex flex-col flex-1"><span className="text-sm font-black text-slate-800 dark:text-white">{undo.items.length > 1 ? `${undo.items.length} تراکنش در حال حذف` : 'تراکنش در حال حذف'}</span><span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">تا چند ثانیه دیگر پاک می‌شود...</span></div>
                <button onClick={() => { setPendingDeleteIds(prev => prev.filter(id => !undo.items.includes(id))); setUndoItems(prev => prev.filter(u => u.id !== undo.id)); toast.success('عملیات لغو شد'); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-black transition-colors shrink-0 shadow-sm">انصراف</button>
                <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} className="absolute bottom-0 right-0 h-1.5 bg-gradient-to-l from-rose-500 to-rose-400" style={{ transformOrigin: 'right' }} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>, document.body
      )}

      {/* 💡 پاپ‌آپ مشاهده رسیدها + قابلیت بزرگنمایی تصاویر */}
      <AnimatePresence>
        {selectedReceiptTx && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" dir="rtl">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedReceiptTx(null)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] bg-white/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 shadow-2xl p-6 modal-scrollbar z-10">
              <button onClick={() => setSelectedReceiptTx(null)} className="absolute top-4 left-4 p-2 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-500 transition-colors"><X className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2"><ImageIcon className="w-6 h-6 text-indigo-500"/>مدارک پیوست تراکنش</h3>
              {selectedReceiptTx.attachments && selectedReceiptTx.attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {selectedReceiptTx.attachments.map((img: string, i: number) => (
                    <img 
                      key={i} 
                      src={img} 
                      onClick={() => setZoomedImage(img)}
                      className="w-full h-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md cursor-zoom-in hover:opacity-90 transition-opacity" 
                      alt="رسید تراکنش"
                    />
                  ))}
                </div>
              )}
              {selectedReceiptTx.textReceipt && (
                <div className="p-5 bg-violet-500/10 border border-violet-500/20 rounded-2xl mb-6 shadow-inner relative"><h4 className="text-xs font-bold text-violet-600 dark:text-violet-400 mb-3 flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5"/> متن فیش / یادداشت پیوست:</h4><p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedReceiptTx.textReceipt}</p></div>
              )}
              {(!selectedReceiptTx.attachments || selectedReceiptTx.attachments.length === 0) && !selectedReceiptTx.textReceipt && (
                <p className="text-center text-slate-500 py-10 font-bold">هیچ تصویر یا یادداشتی ضمیمه این سند نشده است.</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 💡 پاپ‌آپ بایگانی + قابلیت کلیک روی تصاویر برای بزرگنمایی */}
      <AnimatePresence>
        {selectedArchiveTx && (() => {
          const liveTx = allTransactions.find(t => t.id === selectedArchiveTx.id);
          const historyList = liveTx?.chequeDetails?.history || [];
          return (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedArchiveTx(null)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-2xl p-6 sm:p-8 modal-scrollbar z-10">
                <button onClick={() => setSelectedArchiveTx(null)} className="absolute top-6 left-6 p-2 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-500 transition-colors"><X className="w-5 h-5 text-slate-700 dark:text-slate-300" /></button>
                <div className="flex items-center gap-4 mb-8 border-b border-slate-200 dark:border-slate-700/50 pb-6">
                  <div className="w-12 h-12 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-2xl flex items-center justify-center"><Archive className="w-6 h-6 text-fuchsia-500"/></div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">بایگانی کامل سوابق چک</h3>
                    <p className="text-xs font-bold text-slate-500 mt-1">مشاهده اطلاعات و مدارک کامل چک در زمان قبل از تغییر وضعیت</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {historyList.map((h: any) => {
                    const isUndoActive = archiveUndo?.historyId === h.id;
                    const isExpanded = expandedArchiveId === h.id;

                    if (isUndoActive) {
                      return (
                        <motion.div key="undo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl relative overflow-hidden">
                          <div className="flex items-center gap-3 relative z-10">
                            <Trash2 className="w-5 h-5 text-rose-500" />
                            <span className="text-sm font-bold text-rose-700 dark:text-rose-400">در حال حذف از بایگانی...</span>
                          </div>
                          <button type="button" onClick={() => setArchiveUndo(null)} className="px-4 py-1.5 bg-white dark:bg-slate-800 text-rose-500 rounded-lg text-xs font-bold shadow-sm relative z-10">لغو حذف</button>
                          <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} className="absolute bottom-0 right-0 h-1 bg-rose-500" />
                        </motion.div>
                      );
                    }

                    return (
                      <div key={h.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div onClick={() => setExpandedArchiveId(isExpanded ? null : h.id)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <div className="flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400"><History className="w-4 h-4"/></span>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">تغییر وضعیت به: <span className="text-fuchsia-600">{getStatusLabel(h.newStatus)}</span></span>
                              <span className="text-[10px] text-slate-500 mt-1">{h.date}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setArchiveUndo({ txId: liveTx!.id, historyId: h.id, expireAt: Date.now() + 5000 }); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
                              <div className="p-5 space-y-5">
                                {h.description && (
                                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <span className="text-[10px] font-bold text-slate-400 block mb-1">علت تغییر وضعیت:</span>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{h.description}</p>
                                  </div>
                                )}
                                
                                {h.snapshot && (
                                  <div>
                                    <span className="text-[11px] font-black text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/30 px-2 py-1 rounded-md block mb-3 w-max">اطلاعات این چک قبل از تغییر وضعیت:</span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                                      {h.snapshot.issuer && <div className="text-xs"><span className="text-slate-400 block mb-0.5">صاحب حساب:</span> <span className="font-bold text-slate-700 dark:text-slate-300">{h.snapshot.issuer}</span></div>}
                                      {h.snapshot.receiver && <div className="text-xs"><span className="text-slate-400 block mb-0.5">در وجه:</span> <span className="font-bold text-slate-700 dark:text-slate-300">{h.snapshot.receiver}</span></div>}
                                      {h.snapshot.bank && <div className="text-xs"><span className="text-slate-400 block mb-0.5">بانک:</span> <span className="font-bold text-slate-700 dark:text-slate-300">{h.snapshot.bank}</span></div>}
                                      {h.snapshot.branch && <div className="text-xs"><span className="text-slate-400 block mb-0.5">شعبه:</span> <span className="font-bold text-slate-700 dark:text-slate-300">{h.snapshot.branch}</span></div>}
                                      {h.snapshot.accountNumber && <div className="text-xs"><span className="text-slate-400 block mb-0.5">شماره حساب:</span> <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{h.snapshot.accountNumber}</span></div>}
                                      {h.snapshot.sayyadId && <div className="text-xs"><span className="text-slate-400 block mb-0.5">شناسه صیاد:</span> <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{h.snapshot.sayyadId}</span></div>}
                                      {h.snapshot.series && <div className="text-xs"><span className="text-slate-400 block mb-0.5">سری:</span> <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{h.snapshot.series}</span></div>}
                                      {h.snapshot.serialNumber && <div className="text-xs"><span className="text-slate-400 block mb-0.5">سریال چک:</span> <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{h.snapshot.serialNumber}</span></div>}
                                      {h.snapshot.issueDate && <div className="text-xs"><span className="text-slate-400 block mb-0.5">تاریخ صدور:</span> <span className="font-bold text-slate-700 dark:text-slate-300">{h.snapshot.issueDate}</span></div>}
                                      {h.snapshot.dueDate && <div className="text-xs"><span className="text-slate-400 block mb-0.5">سررسید:</span> <span className="font-bold text-rose-500 dark:text-rose-400">{h.snapshot.dueDate}</span></div>}
                                      {h.snapshot.amount && <div className="text-xs"><span className="text-slate-400 block mb-0.5">مبلغ:</span> <span className="font-black text-emerald-600 dark:text-emerald-400" dir="ltr">{formatAmount(h.snapshot.amount.toString())}</span></div>}
                                    </div>
                                  </div>
                                )}

                                {h.snapshot?.textReceipt && (
                                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] font-bold text-slate-400 block mb-1">متن فیش/توضیحات قبلی:</span>
                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{h.snapshot.textReceipt}</p>
                                  </div>
                                )}

                                {h.snapshot?.attachments && h.snapshot.attachments.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block mb-2 px-1">مدارک و عکس‌های چک قبلی:</span>
                                    <div className="flex flex-wrap gap-3">
                                      {h.snapshot.attachments.map((img: string, idx: number) => (
                                        <img 
                                          key={idx} 
                                          src={img} 
                                          onClick={() => setZoomedImage(img)}
                                          alt="مدرک بایگانی" 
                                          className="w-20 h-20 rounded-xl object-cover border border-slate-300 shadow-sm cursor-zoom-in hover:ring-2 hover:ring-fuchsia-500 transition-all" 
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* 💡 پورتال مرکزی مودال ویرایش/ثبت تراکنش برای جلوگیری از گیر کردن زیر انیمیشن‌ها */}
      {typeof document !== 'undefined' && createPortal(
        <NewTransactionModal 
          projectId={selectedProjectFilter !== 'ALL' ? selectedProjectFilter : ''} 
          isOpen={isTransactionModalOpen} 
          onClose={() => { setIsTransactionModalOpen(false); setEditTransactionData(null); }} 
          editData={editTransactionData} 
        />,
        document.body
      )}

      {/* 💡 لایت‌باکس قدرتمند برای نمایش بزرگ تصاویر با دکمه دانلود */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {zoomedImage && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 sm:p-8 bg-black/95 backdrop-blur-md" 
              onClick={() => setZoomedImage(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} 
                className="relative max-w-5xl w-full flex flex-col items-center gap-6"
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => setZoomedImage(null)} className="absolute -top-12 sm:-top-16 right-0 sm:-right-4 p-2 bg-white/10 hover:bg-rose-500 rounded-full text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
                
                <img src={zoomedImage} alt="بزرگ‌نمایی تصویر" className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/20" />
                
                <a 
                  href={zoomedImage} 
                  download={`Document_${Date.now()}.jpg`} 
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black px-8 py-3 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95"
                >
                  <Download className="w-5 h-5" /> دانلود تصویر
                </a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </motion.div>
  );
}