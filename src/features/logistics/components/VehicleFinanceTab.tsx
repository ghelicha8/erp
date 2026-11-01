import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, Layers, TrendingDown, TrendingUp, Coins,
  Truck, Wrench, ShieldAlert, Users, Edit, Trash2, Banknote, FileSignature,
  CheckCircle2, Clock, AlertTriangle, Sparkles, Plus, Settings, FileText,
  Image as ImageIcon, AlignLeft, X, ArrowLeftRight, Check, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

import { useFinanceStore, type ChequeStatus } from '../../../store/financeStore';
import { 
  useLogisticsStore, 
  REPAIR_TYPE_LABELS, 
  INSURANCE_TYPE_LABELS 
} from '../../../store/logisticsStore';

import { 
  AppSearchInput, 
  PortalSelect, 
  GlassDatePicker, 
  FloatingUndoToast
} from '../../../components/ui/SharedLaborUI';
import { formatCurrency, getCurrencyUnit } from '../../../core/utils/currency';
import UniversalTransactionModal from '../../../components/shared/UniversalTransactionModal';

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '۱۰ ردیف' },
  { value: '25', label: '۲۵ ردیف' },
  { value: '50', label: '۵۰ ردیف' },
  { value: '100', label: '۱۰۰ ردیف' },
  { value: 'ALL', label: 'نمایش همه' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'همه تراکنش‌ها' },
  { value: 'IN', label: 'فقط درآمد (کرایه باربری)' },
  { value: 'OUT', label: 'فقط پرداخت‌ها و مخارج' },
  { value: 'REPAIR', label: 'تعمیرات و قطعات' },
  { value: 'INSURANCE', label: 'بیمه و اقساط' },
  { value: 'WAGE', label: 'دستمزد راننده' },
  { value: 'INCIDENTAL', label: 'هزینه‌های جانبی' },
];

const CHEQUE_STATUSES: { value: ChequeStatus; label: string; color: string; bg: string; border: string }[] = [
  { value: 'PENDING', label: 'در جریان (در انتظار)', color: 'text-amber-500', bg: 'bg-amber-500/15', border: 'border-amber-500/40' },
  { value: 'CASHED', label: 'پاس شده (وصول قطعی)', color: 'text-emerald-500', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40' },
  { value: 'BOUNCED', label: 'برگشتی', color: 'text-rose-500', bg: 'bg-rose-500/15', border: 'border-rose-500/40' },
  { value: 'RETURNED', label: 'عودت داده شده', color: 'text-rose-400', bg: 'bg-rose-400/15', border: 'border-rose-400/40' },
  { value: 'EXCHANGED', label: 'تعویض شده', color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-400/40' },
];

export default function VehicleFinanceTab({ vehicleId }: { vehicleId: string }) {
  const vehicle = useLogisticsStore(state => state.vehicles.find(v => v.id === vehicleId) || state.tools.find(t => t.id === vehicleId)) || { id: vehicleId, name: 'خودرو / ابزار' };
  const isTool = useLogisticsStore(state => state.tools.some(t => t.id === vehicleId));
  
  const { 
    logs, 
    toolRentals, 
    repairs, 
    insurances, 
    periodicServices, 
    miscExpenses, 
    driverAssignments,
    updateRepair,
    updateMiscExpense,
    updatePeriodicService,
    updateToolRental,
    updateLog
  } = useLogisticsStore();

  const { transactions, deleteTransaction, changeChequeStatus } = useFinanceStore();
  
  const [subTab, setSubTab] = useState<'TRANSACTIONS' | 'OUTSTANDING_DEBTS'>('TRANSACTIONS');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); 
  const [pageSize, setPageSize] = useState('25'); 
  
  // Universal Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTransactionData, setEditTransactionData] = useState<any | null>(null);
  const [targetDebtId, setTargetDebtId] = useState<string | undefined>(undefined);
  const [targetAmount, setTargetAmount] = useState<number | undefined>(undefined);

  // Gallery & SMS Lightbox State
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [viewingReceiptText, setViewingReceiptText] = useState<{ title: string; text: string } | null>(null);
  const [activeChequeMenuTxId, setActiveChequeMenuTxId] = useState<string | null>(null);

  // 5-second Floating Undo Toast State
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
          expiredIds.forEach(id => {
            const tx = transactions.find(t => t.id === id);
            if (tx?.allocations) {
              tx.allocations.forEach(alloc => {
                if (alloc.recordId) {
                  const rep = repairs.find(r => r.id === alloc.recordId);
                  if (rep) {
                    updateRepair(rep.id, {
                      paidAmount: Math.max(0, (rep.paidAmount || 0) - alloc.amount),
                      settlementStatus: 'UNPAID'
                    });
                  }
                  const misc = miscExpenses.find(m => m.id === alloc.recordId);
                  if (misc) {
                    updateMiscExpense(misc.id, {
                      paidAmount: Math.max(0, (misc.paidAmount || 0) - alloc.amount),
                      settlementStatus: 'UNPAID'
                    });
                  }
                  const ps = periodicServices.find(p => p.id === alloc.recordId);
                  if (ps) {
                    updatePeriodicService(ps.id, {
                      paidAmount: Math.max(0, (ps.paidAmount || 0) - alloc.amount),
                      settlementStatus: 'UNPAID'
                    });
                  }
                  const tr = toolRentals.find(r => r.id === alloc.recordId);
                  if (tr) {
                    if (alloc.description === 'DRIVER_WAGE') {
                      updateToolRental(tr.id, {
                        operatorPaidAmount: Math.max(0, (tr.operatorPaidAmount || 0) - alloc.amount),
                        operatorSettlementStatus: 'UNPAID'
                      });
                    } else {
                      updateToolRental(tr.id, {
                        paidAmount: Math.max(0, (tr.paidAmount || 0) - alloc.amount),
                        settlementStatus: 'UNPAID'
                      });
                    }
                  }
                  const lg = logs.find(l => l.id === alloc.recordId);
                  if (lg) {
                    updateLog(lg.id, {
                      paidAmount: Math.max(0, (lg.paidAmount || 0) - alloc.amount),
                      settlementStatus: 'UNPAID'
                    });
                  }
                }
              });
            }
            deleteTransaction(id);
          });
          setPendingDeleteIds(curr => curr.filter(id => !expiredIds.includes(id)));
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteTransaction, transactions, repairs, miscExpenses, periodicServices, toolRentals, logs, updateRepair, updateMiscExpense, updatePeriodicService, updateToolRental, updateLog]);

  const handleDeleteWithUndo = (trx: any) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [
      ...prev,
      { id: undoId, items: [trx.id], expireAt: Date.now() + 5000, title: `سند «${trx.description || 'مالی'}»` }
    ]);
    setPendingDeleteIds(prev => [...prev, trx.id]);
  };

  const handleCancelUndo = (undoId: string | number) => {
    const target = undoItems.find(u => String(u.id) === String(undoId));
    if (target) {
      setPendingDeleteIds(prev => prev.filter(id => !target.items.includes(id)));
      setUndoItems(prev => prev.filter(u => String(u.id) !== String(undoId)));
      toast.success('حذف سند مالی لغو شد.');
    }
  };

  // گوش دادن به کلید میانبر Ctrl+N یا فراخوانی مودال از هدر پروفایل
  useEffect(() => {
    const handleOpenModal = () => { 
      setEditTransactionData(null); 
      setTargetDebtId(undefined);
      setTargetAmount(undefined);
      setIsModalOpen(true); 
    };
    document.addEventListener('open-new-vehicle-transaction-modal', handleOpenModal);
    return () => document.removeEventListener('open-new-vehicle-transaction-modal', handleOpenModal);
  }, []);

  // محاسبات بدهی‌های باز و پرداخت‌نشده
  const debtBreakdown = useMemo(() => {
    const list: Array<{
      id: string;
      rawId: string;
      category: 'REPAIR' | 'INSURANCE' | 'PERIODIC' | 'MISC' | 'DRIVER_WAGE';
      categoryLabel: string;
      title: string;
      date: string;
      totalCost: number;
      paidAmount: number;
      remainingAmount: number;
    }> = [];

    // تعمیرات
    (repairs || []).filter(r => r.vehicleId === vehicleId).forEach(r => {
      const paid = r.paidAmount || 0;
      const rem = Math.max(0, r.totalCost - paid);
      if (rem > 0 && r.settlementStatus !== 'SETTLED') {
        list.push({
          id: `repair-${r.id}`,
          rawId: r.id,
          category: 'REPAIR',
          categoryLabel: 'تعمیرات',
          title: `تعمیر: ${REPAIR_TYPE_LABELS[r.repairType] || r.repairType} (${r.mechanicInfo?.mechanicName || 'تعمیرگاه'})`,
          date: r.date,
          totalCost: r.totalCost,
          paidAmount: paid,
          remainingAmount: rem,
        });
      }
    });

    // اقساط بیمه
    (insurances || []).filter(ins => ins.vehicleId === vehicleId).forEach(ins => {
      if (ins.paymentMode === 'INSTALLMENT') {
        (ins.installments || []).forEach(inst => {
          if (!inst.isPaid) {
            list.push({
              id: `ins-${ins.id}-${inst.id}`,
              rawId: inst.id,
              category: 'INSURANCE',
              categoryLabel: 'قسط بیمه',
              title: `قسط ${inst.installmentNumber} بیمه ${ins.companyName}`,
              date: inst.dueDate,
              totalCost: inst.amount,
              paidAmount: 0,
              remainingAmount: inst.amount,
            });
          }
        });
      } else if ((ins as any).settlementStatus !== 'SETTLED' && (ins.totalAmount || 0) > 0) {
        list.push({
          id: `ins-${ins.id}`,
          rawId: ins.id,
          category: 'INSURANCE',
          categoryLabel: 'بیمه‌نامه',
          title: `بیمه ${ins.companyName}`,
          date: ins.startDate,
          totalCost: ins.totalAmount,
          paidAmount: 0,
          remainingAmount: ins.totalAmount,
        });
      }
    });

    // خدمات دوره‌ای
    (periodicServices || []).filter(p => p.vehicleId === vehicleId).forEach(p => {
      const paid = p.paidAmount || 0;
      const rem = Math.max(0, p.totalCost - paid);
      if (rem > 0 && p.settlementStatus !== 'SETTLED') {
        list.push({
          id: `periodic-${p.id}`,
          rawId: p.id,
          category: 'PERIODIC',
          categoryLabel: 'سرویس دوره‌ای',
          title: `سرویس مورخ ${p.serviceDate}`,
          date: p.serviceDate,
          totalCost: p.totalCost,
          paidAmount: paid,
          remainingAmount: rem,
        });
      }
    });

    // هزینه‌های جانبی
    (miscExpenses || []).filter(m => m.vehicleId === vehicleId).forEach(m => {
      const paid = m.paidAmount || 0;
      const rem = Math.max(0, m.amount - paid);
      if (rem > 0 && m.settlementStatus !== 'SETTLED') {
        list.push({
          id: `misc-${m.id}`,
          rawId: m.id,
          category: 'MISC',
          categoryLabel: 'هزینه جانبی',
          title: `${m.expenseType} ${m.description ? `(${m.description})` : ''}`,
          date: m.date,
          totalCost: m.amount,
          paidAmount: paid,
          remainingAmount: rem,
        });
      }
    });

    // دستمزد راننده یا اپراتور
    (driverAssignments || []).filter(d => d.vehicleId === vehicleId && !d.isPaid).forEach(d => {
      list.push({
        id: `driver-${d.id}`,
        rawId: d.id,
        category: 'DRIVER_WAGE',
        categoryLabel: 'دستمزد راننده',
        title: `دستمزد راننده: ${d.driverName}`,
        date: d.assignedDate,
        totalCost: d.totalWage,
        paidAmount: 0,
        remainingAmount: d.totalWage,
      });
    });

    (toolRentals || []).filter(r => r.toolId === vehicleId && r.hasOperator && r.operatorSettlementStatus !== 'SETTLED').forEach(r => {
      const paid = r.operatorPaidAmount || 0;
      const rem = Math.max(0, (r.operatorTotalWage || 0) - paid);
      if (rem > 0) {
        list.push({
          id: `rental-op-${r.id}`,
          rawId: r.id,
          category: 'DRIVER_WAGE',
          categoryLabel: 'دستمزد اپراتور',
          title: `دستمزد اپراتور: ${r.operatorName || 'اپراتور'} (${r.counterpartyName})`,
          date: r.startDate,
          totalCost: r.operatorTotalWage || 0,
          paidAmount: paid,
          remainingAmount: rem,
        });
      }
    });

    list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const totalRemaining = list.reduce((sum, item) => sum + item.remainingAmount, 0);

    return { list, totalRemaining };
  }, [repairs, insurances, periodicServices, miscExpenses, driverAssignments, toolRentals, vehicleId]);

  // تراکنش‌های دفتر مالی
  const visibleTxs = useMemo(() => {
    let txs = transactions.filter(t => 
      !pendingDeleteIds.includes(t.id) &&
      (
        t.referenceId === vehicleId ||
        t.allocations?.some(a => (a.recordType === 'LOGISTICS' || a.recordType === 'NONE') && a.recordId === vehicleId)
      )
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      txs = txs.filter(t => 
        t.description?.toLowerCase().includes(q) || 
        t.amount.toString().includes(q) ||
        t.chequeDetails?.bank?.toLowerCase().includes(q) ||
        t.chequeDetails?.serialNumber?.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'ALL') {
      if (typeFilter === 'IN') txs = txs.filter(t => t.direction === 'IN');
      if (typeFilter === 'OUT') txs = txs.filter(t => t.direction === 'OUT');
      if (['REPAIR', 'INSURANCE', 'WAGE', 'INCIDENTAL'].includes(typeFilter)) {
        txs = txs.filter(t => t.allocations?.some(a => a.description === typeFilter));
      }
    }

    if (dateFrom) txs = txs.filter(t => t.date >= dateFrom);
    if (dateTo) txs = txs.filter(t => t.date <= dateTo);

    return txs.sort((a, b) => 
      (b.date || '').localeCompare(a.date || '') || 
      (b.id || '').localeCompare(a.id || '')
    );
  }, [transactions, vehicleId, searchQuery, typeFilter, dateFrom, dateTo, pendingDeleteIds]);

  const displayTxs = useMemo(() => {
    if (pageSize === 'ALL') return visibleTxs;
    const limit = parseInt(pageSize, 10) || 25;
    return visibleTxs.slice(0, limit);
  }, [visibleTxs, pageSize]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full flex flex-col gap-5 relative">
      
      {/* نوار سوییچ زیرتب‌ها (بدون دکمه‌های تکراری، مینیمال و استاندارد) */}
      <div className="flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSubTab('TRANSACTIONS')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              subTab === 'TRANSACTIONS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            دفتر تراکنش‌های مالی ({visibleTxs.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('OUTSTANDING_DEBTS')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              subTab === 'OUTSTANDING_DEBTS'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>بدهی‌های معوق و پرداختنی</span>
            {debtBreakdown.list.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-rose-600 text-[10px] font-mono font-black flex items-center justify-center shadow-sm">
                {debtBreakdown.list.length}
              </span>
            )}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400 px-3">
          <span>ثبت تراکنش جدید با کلید میانبر</span>
          <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-black text-indigo-500">
            Ctrl+N
          </kbd>
        </div>
      </div>

      {/* محتوای زیرتب‌ها */}
      {subTab === 'TRANSACTIONS' ? (
        <div className="space-y-4">
          
          {/* نوار فیلتر و جستجو */}
          <div className="flex flex-wrap items-center gap-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl p-3.5">
            <div className="flex-1 min-w-[220px]">
              <AppSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="جستجو در شرح، مبلغ یا شماره سریال چک..."
                className="w-full h-[44px]"
              />
            </div>

            <div className="w-48 h-[44px]">
              <PortalSelect
                options={TYPE_FILTER_OPTIONS}
                value={typeFilter}
                onChange={(val) => setTypeFilter(String(val))}
                className="!h-[44px] !rounded-2xl"
              />
            </div>

            <div className="w-36 h-[44px]">
              <GlassDatePicker
                placeholder="از تاریخ"
                value={dateFrom}
                onChange={setDateFrom}
              />
            </div>

            <div className="w-36 h-[44px]">
              <GlassDatePicker
                placeholder="تا تاریخ"
                value={dateTo}
                onChange={setDateTo}
              />
            </div>

            <div className="w-32 h-[44px]">
              <PortalSelect
                options={PAGE_SIZE_OPTIONS}
                value={pageSize}
                onChange={(val) => setPageSize(String(val))}
                className="!h-[44px] !rounded-2xl"
              />
            </div>
          </div>

          {/* جدول تراکنش‌ها */}
          <div className="w-full overflow-x-auto rounded-[2rem] bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xl modal-scrollbar">
            <table className="w-full text-right border-collapse min-w-[880px]">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black">
                  <th className="p-4">شرح سند و تاریخ</th>
                  <th className="p-4 text-center">مبلغ و ابزار تسویه ({getCurrencyUnit()})</th>
                  <th className="p-4">وضعیت سند / چک صیادی</th>
                  <th className="p-4 text-center">مستندات و پیوست</th>
                  <th className="p-4 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {displayTxs.map((trx: any) => {
                    const isIncome = trx.direction === 'IN';
                    const isCheque = trx.type === 'CHEQUE';
                    const chequeInfo = trx.chequeDetails;
                    const hasAttachments = trx.attachments && trx.attachments.length > 0;
                    const hasTextReceipt = !!trx.textReceipt;

                    const curStatusConf = isCheque 
                      ? (CHEQUE_STATUSES.find(s => s.value === (chequeInfo?.status || 'PENDING')) || CHEQUE_STATUSES[0])
                      : null;

                    return (
                      <motion.tr
                        key={trx.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* ۱. شرح و تاریخ */}
                        <td className="p-4 align-top w-[30%]">
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-slate-800 dark:text-white leading-relaxed">
                              {trx.description || (isIncome ? 'دریافت وجه' : 'پرداخت وجه')}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-mono font-bold text-slate-400">
                                {trx.date}
                              </span>
                              {isCheque && chequeInfo?.bank && (
                                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                                  {chequeInfo.bank}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* ۲. مبلغ و نوع پرداخت */}
                        <td className="p-4 align-top w-[22%] text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-black font-mono text-base ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`} dir="ltr">
                              {isIncome ? '+' : '-'}{formatCurrency(trx.amount)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              isIncome 
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            }`}>
                              {isCheque ? <FileSignature className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                              <span>{isCheque ? 'چک صیادی' : 'نقدی / واریز'}</span>
                            </span>
                          </div>
                        </td>

                        {/* ۳. وضعیت چک صیادی و تغییر سریع چرخه حیات */}
                        <td className="p-4 align-top w-[25%]">
                          {isCheque && curStatusConf ? (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveChequeMenuTxId(activeChequeMenuTxId === trx.id ? null : trx.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${curStatusConf.border} ${curStatusConf.bg} ${curStatusConf.color} text-xs font-black shadow-sm cursor-pointer hover:scale-102 transition-all`}
                                title="کلیک برای تغییر چرخه حیات چک"
                              >
                                <span>{curStatusConf.label}</span>
                                <ChevronDown className="w-3 h-3 opacity-70" />
                              </button>

                              {chequeInfo?.dueDate && (
                                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                                  سررسید: {chequeInfo.dueDate}
                                </span>
                              )}

                              {/* منوی دراپ‌داون وضعیت چک */}
                              <AnimatePresence>
                                {activeChequeMenuTxId === trx.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-1.5 z-50 space-y-1"
                                  >
                                    <div className="text-[10px] font-black text-slate-400 px-2 py-1 border-b border-slate-100 dark:border-slate-700">
                                      تغییر چرخه حیات چک:
                                    </div>
                                    {CHEQUE_STATUSES.map(st => (
                                      <button
                                        key={st.value}
                                        type="button"
                                        onClick={() => {
                                          changeChequeStatus(trx.id, st.value, `تغییر وضعیت به ${st.label}`);
                                          setActiveChequeMenuTxId(null);
                                          toast.success(`وضعیت چک به «${st.label}» تغییر کرد.`);
                                        }}
                                        className={`w-full text-right px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                                          st.value === chequeInfo?.status
                                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                      >
                                        <span>{st.label}</span>
                                        {st.value === chequeInfo?.status && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>تسویه قطعی نقدی</span>
                            </span>
                          )}
                        </td>

                        {/* ۴. گالری پیوست‌ها و رسید متنی پیامک */}
                        <td className="p-4 align-top w-[13%] text-center">
                          <div className="flex items-center justify-center gap-2">
                            {hasAttachments && (
                              <button
                                type="button"
                                onClick={() => setZoomedImage(trx.attachments[0])}
                                className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-colors cursor-pointer relative"
                                title="مشاهده تصویر فیش / چک"
                              >
                                <ImageIcon className="w-4 h-4" />
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-mono flex items-center justify-center font-bold">
                                  {trx.attachments.length}
                                </span>
                              </button>
                            )}

                            {hasTextReceipt && (
                              <button
                                type="button"
                                onClick={() => setViewingReceiptText({ title: trx.description || 'رسید متنی', text: trx.textReceipt })}
                                className="p-2 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors cursor-pointer"
                                title="مشاهده متن پیامک بانک"
                              >
                                <AlignLeft className="w-4 h-4" />
                              </button>
                            )}

                            {!hasAttachments && !hasTextReceipt && (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                            )}
                          </div>
                        </td>

                        {/* ۵. دکمه‌های عملیات (ویرایش و حذف استاندارد با Undo) */}
                        <td className="p-4 align-top w-[10%] text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditTransactionData(trx);
                                setTargetDebtId(undefined);
                                setTargetAmount(undefined);
                                setIsModalOpen(true);
                              }}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              title="ویرایش سند در مودال مادر"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWithUndo(trx)}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              title="حذف سند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}

                  {visibleTxs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-14 text-center text-slate-400 font-bold text-xs">
                        هیچ تراکنش مالی برای فیلتر انتخابی یافت نشد.
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

        </div>
      ) : (
        /* ویو بدهی‌های معوق خودرو / ابزار */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>فهرست فاکتورها، اقساط و دستمزدهای پرداخت‌نشده:</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditTransactionData(null);
                setTargetDebtId(undefined);
                setTargetAmount(debtBreakdown.totalRemaining);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>تسویه همه اقلام در مودال مادر</span>
            </button>
          </div>

          {debtBreakdown.list.length === 0 ? (
            <div className="p-14 text-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">
                تبریک! هیچ بدهی یا فاکتور پرداخت‌نشده‌ای برای این دارایی ثبت نشده است.
              </h3>
            </div>
          ) : (
            <div className="space-y-3">
              {debtBreakdown.list.map((debt, idx) => (
                <div
                  key={debt.id}
                  className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/80 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-400">{idx + 1}</span>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">
                      {debt.category === 'REPAIR' && <Wrench className="w-4 h-4 text-rose-500" />}
                      {debt.category === 'INSURANCE' && <ShieldAlert className="w-4 h-4 text-blue-500" />}
                      {debt.category === 'PERIODIC' && <Settings className="w-4 h-4 text-teal-500" />}
                      {debt.category === 'MISC' && <FileText className="w-4 h-4 text-orange-500" />}
                      {debt.category === 'DRIVER_WAGE' && <Users className="w-4 h-4 text-indigo-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {debt.categoryLabel}
                        </span>
                        <span className="text-xs font-black text-slate-800 dark:text-white">
                          {debt.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 block mt-1">
                        سررسید: {debt.date} | کل: {formatCurrency(debt.totalCost)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <div className="text-left">
                      <span className="text-[11px] text-slate-400 block font-bold">مانده قابل پرداخت:</span>
                      <span className="font-mono font-black text-sm text-rose-600 dark:text-rose-400">
                        {formatCurrency(debt.remainingAmount)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditTransactionData(null);
                        setTargetDebtId(debt.rawId);
                        setTargetAmount(debt.remainingAmount);
                        setIsModalOpen(true);
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shrink-0"
                    >
                      تسویه اختصاصی
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* مودال تراکنش و پرداخت مادر */}
      <UniversalTransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditTransactionData(null);
          setTargetDebtId(undefined);
          setTargetAmount(undefined);
        }}
        context={isTool ? 'TOOL' : 'VEHICLE'}
        vehicleId={!isTool ? vehicleId : undefined}
        toolId={isTool ? vehicleId : undefined}
        initialDebtId={targetDebtId}
        initialAmount={targetAmount}
        editTransaction={editTransactionData}
      />

      {/* مودال Lightbox تصویر فیش و چک */}
      <AnimatePresence>
        {zoomedImage && (
          <div className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md" onClick={() => setZoomedImage(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative max-w-3xl max-h-[90vh] rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
              <button onClick={() => setZoomedImage(null)} className="absolute top-4 left-4 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors cursor-pointer z-10">
                <X className="w-5 h-5" />
              </button>
              <img src={zoomedImage} alt="تصویر پیوست" className="w-full h-full object-contain max-h-[85vh]" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* مودال نمایش رسید متنی پیامک بانک */}
      <AnimatePresence>
        {viewingReceiptText && (
          <div className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" onClick={() => setViewingReceiptText(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={e => e.stopPropagation()} className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-indigo-500" />
                  <span>{viewingReceiptText.title}</span>
                </h4>
                <button onClick={() => setViewingReceiptText(null)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
                {viewingReceiptText.text}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* سیستم اعلان و لغو ۵ ثانیه‌ای حذف شناور */}
      <FloatingUndoToast undoItems={undoItems} onCancel={handleCancelUndo} />

    </motion.div>
  );
}