import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, CheckCircle, Clock, Banknote, FileSignature, 
  Edit, Trash2, Image as ImageIcon, ArrowLeftRight, AlertTriangle, 
  Wallet, Layers, Check, ChevronDown, Download, Activity,
  Archive, History, ArrowUpRight, ArrowDownRight, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useFinanceStore } from '../../../store/financeStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useLaborStore } from '../../../store/laborStore';

import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import NewTransactionModal from '../../projects/components/NewTransactionModal'; 
import type { Transaction } from '../../../store/financeStore';

const formatAmount = (val: string | number) => Number(val).toLocaleString('fa-IR');

const AnimatedCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div onClick={(e) => { e.stopPropagation(); onChange(); }} className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm shrink-0 ${checked ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 border-purple-400 shadow-[0_0_12px_rgba(99,102,241,0.4)] scale-105' : 'bg-white/60 dark:bg-slate-800/60 border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}>
    <AnimatePresence>
      {checked && <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}><CheckCircle className="w-3 h-3 text-white stroke-[3]" /></motion.div>}
    </AnimatePresence>
  </div>
);

const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/20 dark:bg-slate-800/40 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all border border-white/50 dark:border-slate-700/50 ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse z-0" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

const GlassSelect = ({ value, onChange, options, placeholder, icon: Icon, className = '' }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  
  const selectedOption = options.find((o:any) => o.id === value);
  const selectedLabel = selectedOption?.label || placeholder;

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
  };

  const openDropdown = () => { updatePosition(); setIsOpen(true); };

  useEffect(() => {
    if (isOpen) { window.addEventListener('scroll', updatePosition, true); window.addEventListener('resize', updatePosition); }
    return () => { window.removeEventListener('scroll', updatePosition, true); window.removeEventListener('resize', updatePosition); };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(event.target as Node)) {
        const portalEl = document.getElementById('portal-dropdown-finance');
        if (portalEl && !portalEl.contains(event.target as Node)) setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const containerVariants = { hidden: { opacity: 0, y: -5, transition: { staggerChildren: 0.03, staggerDirection: -1 } }, visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.03, delayChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, x: -5 }, visible: { opacity: 1, x: 0 } };

  return (
    <>
      <button ref={btnRef} onClick={() => isOpen ? setIsOpen(false) : openDropdown()} className={`relative bg-white/40 dark:bg-slate-800/40 rounded-xl border border-white/60 dark:border-slate-700/50 shadow-sm backdrop-blur-md flex items-center justify-between gap-3 px-4 h-[42px] text-xs font-black text-slate-700 dark:text-slate-200 transition-all hover:bg-white/70 dark:hover:bg-slate-700/60 hover:shadow-md hover:border-indigo-300/50 ${className}`}>
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && <Icon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
          <span className="truncate pt-0.5">{selectedLabel}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-indigo-500 opacity-70 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div id="portal-dropdown-finance" style={{ top: coords.top, left: coords.left, width: coords.width, minWidth: '180px', position: 'fixed', zIndex: 999999 }}>
          <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="hidden" className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden max-h-60 overflow-y-auto glass-scroll p-1.5">
            {options.map((option: any) => (
              <motion.button variants={itemVariants} key={option.id} onClick={() => { onChange(option.id); setIsOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${value === option.id ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'}`}>
                <span className="truncate pt-0.5 pr-2 text-right w-full">{option.label}</span>
                {value === option.id && <Check className="w-3.5 h-3.5 text-indigo-500 drop-shadow-sm shrink-0" />}
              </motion.button>
            ))}
          </motion.div>
        </div>, document.body
      )}
    </>
  );
};

const ChequeStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, any> = {
    PENDING: { label: 'در انتظار وصول', color: 'text-amber-500', bg: 'bg-amber-500/15', border: 'border-amber-500/40', icon: Clock },
    CASH_SETTLED: { label: 'پاس شده', color: 'text-emerald-500', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', icon: CheckCircle },
    CASHED: { label: 'پاس شده (وصول)', color: 'text-emerald-500', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', icon: CheckCircle },
    BOUNCED: { label: 'برگشتی', color: 'text-rose-500', bg: 'bg-rose-500/15', border: 'border-rose-500/40', icon: AlertTriangle },
    RETURNED: { label: 'عودت داده', color: 'text-rose-400', bg: 'bg-rose-400/15', border: 'border-rose-400/40', icon: AlertTriangle },
    EXCHANGED: { label: 'تعویض شده', color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-400/40', icon: ArrowLeftRight },
  };
  const currentConfig = statusConfig[status] || statusConfig['PENDING'];
  const Icon = currentConfig.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${currentConfig.border} ${currentConfig.bg} ${currentConfig.color} text-[11px] font-bold shadow-sm whitespace-nowrap`}>
      <Icon className="w-3.5 h-3.5" /> {currentConfig.label}
    </span>
  );
};

export default function LaborFinanceTab({ workerId }: { workerId: string }) {
  const { workers, logs, deleteLog } = useLaborStore();
  const allProjects = useProjectStore(state => state.projects);
  const { transactions, deleteTransaction, deleteChequeHistory } = useFinanceStore();
  
  const worker = workers.find(w => w.id === workerId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('ALL'); 
  const [pageSize, setPageSize] = useState<string>('ALL');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [undoItems, setUndoItems] = useState<{ id: string, items: { id: string, source: 'FINANCE' | 'LABOR' }[], expireAt: number }[]>([]);
  
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<any | null>(null);
  const [selectedArchiveTx, setSelectedArchiveTx] = useState<Transaction | null>(null);
  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);
  const [archiveUndo, setArchiveUndo] = useState<{ txId: string, historyId: string, expireAt: number } | null>(null);
  
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editTransactionData, setEditTransactionData] = useState<Transaction | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    const handleNewTx = () => { setEditTransactionData(null); setIsTransactionModalOpen(true); };
    document.addEventListener('open-new-transaction-modal', handleNewTx);
    return () => document.removeEventListener('open-new-transaction-modal', handleNewTx);
  }, []);

  // 💡 آپدیت تایمر برای سیستم Undo کپسولی جدید
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            expired.forEach(u => u.items.forEach(item => {
              if (item.source === 'FINANCE') deleteTransaction(item.id);
              if (item.source === 'LABOR') deleteLog(item.id);
            }));
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e=>e.items.map(i=>i.id)).includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteTransaction, deleteLog]);

  useEffect(() => {
    if (!archiveUndo) return;
    const interval = setInterval(() => {
      if (Date.now() > archiveUndo.expireAt) { deleteChequeHistory(archiveUndo.txId, archiveUndo.historyId); setArchiveUndo(null); }
    }, 500);
    return () => clearInterval(interval);
  }, [archiveUndo, deleteChequeHistory]);

  const projectFilterOptions = useMemo(() => [
    { id: 'ALL', label: 'همه پروژه‌ها' },
    { id: 'FREE', label: 'کارهای آزاد (بدون پروژه)' },
    ...allProjects.map(p => ({ id: p.id, label: p.title || p.name }))
  ], [allProjects]);

  const typeFilterOptions = [
    { id: 'ALL', label: 'همه تراکنش‌ها' },
    { id: 'CASH_ONLY', label: 'فقط نقدی و حواله' },
    { id: 'CHEQUE_ALL', label: 'تمامی چک‌ها' },
    { id: 'CHEQUE_PENDING', label: 'چک‌های در انتظار وصول' },
    { id: 'CHEQUE_PASSED', label: 'چک‌های پاس شده' },
  ];

  const unifiedRecords = useMemo(() => {
    const records: any[] = [];
    transactions.forEach(tx => {
      if (tx.referenceId === workerId || tx.clientId === workerId || tx.allocations?.some(a => a.projectId === workerId)) {
        if (pendingDeleteIds.includes(tx.id)) return;
        records.push({
          id: tx.id, originalTx: tx, source: 'FINANCE', date: tx.date, description: tx.description || 'پرداختی مستقیم / حواله',
          amount: tx.amount, direction: tx.direction, type: tx.type === 'CHEQUE' ? 'CHEQUE' : 'CASH',
          projectId: tx.allocations?.[0]?.projectId || tx.projectId || 'FREE', attachments: tx.attachments, textReceipt: tx.textReceipt, chequeDetails: tx.chequeDetails
        });
      }
    });

    logs.forEach(log => {
      if (log.workerId !== workerId || pendingDeleteIds.includes(log.id)) return;
      const pId = log.projectId || 'FREE';
      const logDate = log.date || log.startDate || '';

      if (log.advancePayment > 0) records.push({ id: `adv_${log.id}`, realId: log.id, source: 'LABOR', date: logDate, description: log.description ? `مساعده: ${log.description}` : 'مساعده کارکرد روزانه', amount: log.advancePayment, direction: 'OUT', type: 'CASH', projectId: pId });
      if (log.bonus && log.bonus > 0) records.push({ id: `bon_${log.id}`, realId: log.id, source: 'LABOR', date: logDate, description: log.description ? `پاداش: ${log.description}` : 'پاداش و تشویقی', amount: log.bonus, direction: 'OUT', type: 'CASH', projectId: pId });
      if (log.loanDeduction && log.loanDeduction > 0) records.push({ id: `lded_${log.id}`, realId: log.id, source: 'LABOR', date: logDate, description: 'کسر قسط وام/مساعده', amount: log.loanDeduction, direction: 'IN', type: 'LOAN_DEDUCTION', projectId: pId });
      if (log.penaltyDeduction && log.penaltyDeduction > 0) records.push({ id: `pded_${log.id}`, realId: log.id, source: 'LABOR', date: logDate, description: 'جریمه و کسورات کارگاه', amount: log.penaltyDeduction, direction: 'IN', type: 'PENALTY', projectId: pId });
    });
    return records;
  }, [transactions, logs, workerId, pendingDeleteIds]);

  const visibleRecords = useMemo(() => {
    let result = [...unifiedRecords];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.description?.toLowerCase().includes(q) || r.amount.toString().includes(q) || r.chequeDetails?.serialNumber?.includes(q) || r.chequeDetails?.issuer?.includes(q));
    }

    if (selectedProjectFilter !== 'ALL') result = result.filter(r => r.projectId === selectedProjectFilter);
    
    if (txTypeFilter === 'CASH_ONLY') result = result.filter(r => r.type === 'CASH');
    if (txTypeFilter === 'CHEQUE_ALL') result = result.filter(r => r.type === 'CHEQUE');
    if (txTypeFilter === 'CHEQUE_PENDING') result = result.filter(r => r.type === 'CHEQUE' && r.chequeDetails?.status === 'PENDING');
    if (txTypeFilter === 'CHEQUE_PASSED') result = result.filter(r => r.type === 'CHEQUE' && ['CASHED', 'CASH_SETTLED'].includes(r.chequeDetails?.status || ''));

    if (dateFrom) result = result.filter(r => r.date >= dateFrom);
    if (dateTo) result = result.filter(r => r.date <= dateTo);
    
    result.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.date.localeCompare(a.date));
    if (pageSize !== 'ALL') result = result.slice(0, parseInt(pageSize));
    
    return result;
  }, [unifiedRecords, searchQuery, selectedProjectFilter, txTypeFilter, dateFrom, dateTo, pageSize]);

  const isAllSelected = selectedIds.length === visibleRecords.length && visibleRecords.length > 0;
  const toggleSelection = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  const handleSelectAll = () => isAllSelected ? setSelectedIds([]) : setSelectedIds(visibleRecords.map(t => t.id));
  
  const triggerDeleteGroup = () => {
    const itemsToDelete = selectedIds.map(id => {
      const rec = unifiedRecords.find(r => r.id === id);
      return { id: rec.realId || rec.id, source: rec.source };
    });
    setUndoItems(prev => [...prev, { id: Date.now().toString(), items: itemsToDelete, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...itemsToDelete.map(i => i.id)]);
    setSelectedIds([]); 
  };

  const triggerSingleDelete = (record: any) => {
    const targetId = record.realId || record.id;
    setUndoItems(prev => [...prev, { id: Date.now().toString(), items: [{ id: targetId, source: record.source }], expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, targetId]);
  };

  const getProjectName = (projectId: string) => {
    if (!projectId || projectId === 'FREE') return 'کارهای آزاد / متفرقه';
    const proj = allProjects.find(p => p.id === projectId);
    return proj ? (proj.title || proj.name) : 'پروژه نامشخص';
  };

  if (!worker) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full min-w-0 flex flex-col gap-6 relative px-1 pb-4">
      
      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 shadow-sm rounded-[1.5rem] px-4 py-4 z-[50] relative w-full">
        
        <NeonSearchWrapper className="flex-1 w-full min-w-[200px] h-[42px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input placeholder="جستجو (مبلغ، شرح، سریال چک)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 dark:text-white pl-2 pr-3 transition-colors placeholder:text-slate-500/70" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-3 h-3 text-slate-500 dark:text-slate-400" /></button>}
        </NeonSearchWrapper>
        
        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto flex-[2_1_auto] relative z-[10000]">
          <div className="w-[calc(50%-0.25rem)] sm:w-[150px] shrink-0 h-[42px] relative z-[10005]">
            <GlassSelect options={typeFilterOptions} value={txTypeFilter} onChange={setTxTypeFilter} placeholder="نوع پرداخت" icon={Filter} />
          </div>
          <div className="w-[calc(50%-0.25rem)] sm:w-[140px] shrink-0 h-[42px] relative z-[10004]">
            <GlassSelect options={projectFilterOptions} value={selectedProjectFilter} onChange={setSelectedProjectFilter} placeholder="پروژه‌ها" icon={Layers} />
          </div>
          <div className="w-[calc(50%-0.25rem)] sm:w-[120px] shrink-0 h-[42px] relative z-[10002]">
            <GlassDatePicker placeholder="از تاریخ..." value={dateFrom} onChange={setDateFrom} />
          </div>
          <div className="w-[calc(50%-0.25rem)] sm:w-[120px] shrink-0 h-[42px] relative z-[10001]">
            <GlassDatePicker placeholder="تا تاریخ..." value={dateTo} onChange={setDateTo} />
          </div>
        </div>
      </div>

      <div className="w-full bg-white/60 dark:bg-slate-900/50 backdrop-blur-3xl border border-white/80 dark:border-slate-700/60 shadow-xl rounded-[1.5rem] overflow-hidden z-10 flex flex-col min-w-0">
        <div className="w-full overflow-x-auto glass-scroll">
          <table className="w-full text-right border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80">
                <th className="w-14 p-4 text-center align-middle whitespace-nowrap"><div className="flex justify-center"><AnimatedCheckbox checked={isAllSelected} onChange={handleSelectAll} /></div></th>
                <th className="p-4 font-bold text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">شرح و تاریخ</th>
                <th className="p-4 font-bold text-xs text-slate-700 dark:text-slate-300 text-center whitespace-nowrap">مبلغ (تومان)</th>
                <th className="p-4 font-bold text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[200px]">نوع / جزئیات پرداخت</th>
                <th className="p-4 font-bold text-xs text-slate-700 dark:text-slate-300 text-center whitespace-nowrap">وضعیت سند</th>
                <th className="p-4 font-bold text-xs text-slate-700 dark:text-slate-300 text-center whitespace-nowrap">عملیات</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {visibleRecords.map((rec) => {
                  const projectName = getProjectName(rec.projectId);
                  
                  return (
                  <motion.tr key={rec.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }} className={`border-b border-slate-200/60 dark:border-slate-700/50 transition-colors group ${selectedIds.includes(rec.id) ? 'bg-indigo-500/10' : 'hover:bg-white/80 dark:hover:bg-slate-800/40'}`}>
                    
                    <td className="p-4 text-center align-middle w-14">
                      <div className="flex justify-center">
                        <AnimatedCheckbox checked={selectedIds.includes(rec.id)} onChange={() => toggleSelection(rec.id)} />
                      </div>
                    </td>
                    
                    <td className="p-4 align-middle">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-800 dark:text-white">{rec.description}</span>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 whitespace-nowrap shadow-sm">{rec.date}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30 whitespace-nowrap shadow-sm">
                            <Layers className="w-3 h-3" /> {projectName}
                          </span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-sm border ${rec.source === 'LABOR' ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/30 dark:border-amber-800/50' : 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800/50'}`}>
                            {rec.source === 'LABOR' ? 'ثبت در کارکرد' : 'سند مالی'}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4 align-middle text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`font-black text-base sm:text-lg whitespace-nowrap drop-shadow-sm ${rec.direction === 'OUT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} dir="ltr">{rec.amount.toLocaleString('fa-IR')}</span>
                        <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-md w-max whitespace-nowrap shadow-sm ${rec.direction === 'OUT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20'}`}>
                          {rec.direction === 'OUT' ? <span className="flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> پرداختی به نیرو</span> : <span className="flex items-center gap-1"><ArrowDownRight className="w-3 h-3"/> کسر از نیرو</span>}
                        </span>
                      </div>
                    </td>
                    
                    <td className="p-4 align-middle">
                      <div className="flex items-start gap-3">
                        {rec.type === 'CASH' || rec.type === 'ADVANCE' || rec.type === 'BONUS' ? (
                          <><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm"><Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" /></div><div className="flex flex-col justify-center h-full pt-1.5"><span className="text-sm font-black text-slate-700 dark:text-slate-200 whitespace-nowrap">{rec.type === 'BONUS' ? 'پاداش نقدی' : 'نقد / حواله / مساعده'}</span></div></>
                        ) : rec.type === 'LOAN_DEDUCTION' || rec.type === 'PENALTY' ? (
                          <><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0 shadow-sm"><AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400" /></div><div className="flex flex-col justify-center h-full pt-1.5"><span className="text-sm font-black text-slate-700 dark:text-slate-200 whitespace-nowrap">{rec.type === 'PENALTY' ? 'جریمه کارگاهی' : 'کسر اقساط وام'}</span></div></>
                        ) : (
                          <><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center shrink-0 shadow-sm"><FileSignature className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 dark:text-cyan-400" /></div>
                            <div className="flex flex-col gap-2 w-full"><div className="flex items-center gap-2 pt-1"><span className="text-sm font-black text-slate-800 dark:text-white whitespace-nowrap">چک بانکی</span></div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {rec.chequeDetails?.bank && <span className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">بانک: {rec.chequeDetails.bank}</span>}
                                {rec.chequeDetails?.sayyadId && <span className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-md text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">صیاد: {rec.chequeDetails.sayyadId}</span>}
                                {rec.chequeDetails?.dueDate && <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30 shadow-sm rounded-md text-[10px] font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">سررسید: {rec.chequeDetails.dueDate}</span>}
                              </div>
                            </div></>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-center align-middle">
                      <div className="flex justify-center">
                        {rec.type === 'CHEQUE' ? <ChequeStatusBadge status={rec.chequeDetails?.status || 'PENDING'} /> : <span className="inline-flex items-center px-3 py-1 rounded-xl border border-emerald-500/40 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-bold whitespace-nowrap shadow-sm"><CheckCircle className="w-3.5 h-3.5 ml-1.5" /> قطعی / ثبت شده</span>}
                      </div>
                    </td>

                    <td className="p-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {rec.type === 'CHEQUE' && rec.chequeDetails?.history && rec.chequeDetails.history.length > 0 && (
                          <button onClick={() => setSelectedArchiveTx(rec.originalTx)} title="بایگانی و سوابق" className="p-2 rounded-xl bg-white dark:bg-slate-800 text-fuchsia-500 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors relative hover:scale-110 hover:border-fuchsia-300">
                            <Archive className="w-4 h-4" />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-fuchsia-500 text-[8px] items-center justify-center text-white font-black">{rec.chequeDetails.history.length}</span></span>
                          </button>
                        )}
                        {rec.source === 'FINANCE' && (
                          <button onClick={() => setSelectedReceiptTx(rec.originalTx)} title="مشاهده رسید/تصویر" className={`p-2 rounded-xl transition-colors shadow-sm border hover:scale-110 ${(rec.attachments && rec.attachments.length > 0) || rec.textReceipt ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-700' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-yellow-500'}`}><ImageIcon className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => { if (rec.source === 'FINANCE') { setEditTransactionData(rec.originalTx); setIsTransactionModalOpen(true); } else { toast.info('این مبلغ درون لاگ کارکرد ثبت شده است. برای ویرایش به تب تاریخچه کارکرد مراجعه کنید.'); } }} title={rec.source === 'FINANCE' ? "مشاهده و ویرایش" : "ثبت شده در کارکرد"} className="p-2 rounded-xl bg-white dark:bg-slate-800 text-blue-500 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors hover:scale-110 hover:border-blue-300"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => triggerSingleDelete(rec)} title="حذف موقت" className="p-2 rounded-xl bg-white dark:bg-slate-800 text-rose-500 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors hover:scale-110 hover:border-rose-300"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>

                  </motion.tr>
                )})}
                {visibleRecords.length === 0 && <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}><td colSpan={6} className="p-16 text-center text-slate-500 font-bold bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm rounded-b-[2rem]">هیچ پرداختی یا تراکنشی یافت نشد.</td></motion.tr>}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* 💡 پاپ‌آپ قدرتمندِ کپسولیِ iOS برای حذف */}
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
          <AnimatePresence>
            {undoItems.map(undo => (
              <motion.div key={undo.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="flex items-center justify-between gap-4 p-2 pr-3 bg-white dark:bg-slate-800 rounded-full shadow-2xl border border-slate-200 dark:border-slate-700 w-full pointer-events-auto" dir="rtl">
                <div className="flex items-center gap-3 relative z-10">
                  <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                     <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-md" viewBox="0 0 36 36">
                       <motion.circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-rose-500" strokeDasharray="100" initial={{ strokeDashoffset: 100 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 5, ease: "linear" }} strokeLinecap="round" />
                     </svg>
                     <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center relative z-10">
                       <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                     </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-800 dark:text-white">{undo.items.length > 1 ? `${undo.items.length} سند در حال حذف` : 'سند در حال حذف'}</span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">تا چند ثانیه دیگر پاک می‌شود...</span>
                  </div>
                </div>
                <button onClick={() => { setPendingDeleteIds(prev => prev.filter(id => !undo.items.map(i=>i.id).includes(id))); setUndoItems(prev => prev.filter(u => u.id !== undo.id)); toast.success('عملیات لغو شد'); }} className="px-5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-black rounded-full transition-colors shrink-0 shadow-sm">
                  انصراف
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>, document.body
      )}

      {/* 💡 لایت‌باکس تصاویر */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {zoomedImage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 sm:p-8 bg-black/95 backdrop-blur-md" onClick={() => setZoomedImage(null)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative max-w-5xl w-full flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setZoomedImage(null)} className="absolute -top-12 sm:-top-16 right-0 sm:-right-4 p-2 bg-white/10 hover:bg-rose-500 rounded-full text-white transition-colors"><X className="w-6 h-6" /></button>
                <img src={zoomedImage} alt="بزرگ‌نمایی تصویر" className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/20" />
                <a href={zoomedImage} download={`Document_${Date.now()}.jpg`} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black px-8 py-3 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95"><Download className="w-5 h-5" /> دانلود تصویر</a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>, document.body
      )}

      {/* 💡 پورتال مرکزی مودال اصلی پروژه‌ها */}
      {typeof document !== 'undefined' && createPortal(
        <NewTransactionModal 
          projectId={selectedProjectFilter !== 'ALL' ? selectedProjectFilter : ''} 
          isOpen={isTransactionModalOpen} 
          onClose={() => { setIsTransactionModalOpen(false); setEditTransactionData(null); }} 
          editData={editTransactionData} 
        />,
        document.body
      )}
    </motion.div>
  );
}