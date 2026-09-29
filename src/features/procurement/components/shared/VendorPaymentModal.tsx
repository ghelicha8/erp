import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Banknote, Receipt, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useFinanceStore } from '../../../../store/financeStore';
import { usePurchaseStore } from '../../../../store/purchaseStore';
import GlassDatePicker from '../../../../components/ui/GlassDatePicker';
import { PortalSelect } from '../../../../components/ui/SharedLaborUI';

export interface PaymentPrefill {
  amount?: number;
  linkedPurchaseId?: string;
  description?: string;
}

interface VendorPaymentModalProps {
  vendorId: string;
  vendorName: string;
  isOpen: boolean;
  onClose: () => void;
  editTxId?: string | null;
  prefill?: PaymentPrefill | null;
}

const getTodayJalali = () => moment().format('jYYYY/jMM/jDD');

export default function VendorPaymentModal({ vendorId, vendorName, isOpen, onClose, editTxId, prefill }: VendorPaymentModalProps) {
  const addTransaction = useFinanceStore(s => s.addTransaction);
  const updateTransaction = useFinanceStore(s => s.updateTransaction);
  const allTransactions = useFinanceStore(s => s.transactions);
  const allPurchases = usePurchaseStore(s => s.purchases);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayJalali());
  const [description, setDescription] = useState('');
  const [payType, setPayType] = useState<'CASH' | 'CHEQUE'>('CASH');
  const [chequeSerial, setChequeSerial] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState('');
  const [linkedPurchaseId, setLinkedPurchaseId] = useState('');

  const vendorPurchases = useMemo(() =>
    allPurchases.filter(p => (p as any).vendor === vendorName),
    [allPurchases, vendorName]);

  const purchaseOptions = useMemo(() => {
    const opts = [{ value: '', label: 'پرداخت عمومی (بدون فاکتور خاص)' }];
    vendorPurchases.forEach(p => {
      const billed = (p as any).billedCost || (p as any).internalCost || 0;
      const paid = allTransactions.filter(t => t.linkedPurchaseId === p.id).reduce((s, t) => s + (t.amount || 0), 0);
      const remain = Math.max(0, billed - paid);
      opts.push({
        value: p.id,
        label: `${(p as any).title || 'فاکتور'} — ${((p as any).date || '')}`,
        subLabel: `مبلغ: ${billed.toLocaleString()} | مانده: ${remain.toLocaleString()}`,
      } as any);
    });
    return opts;
  }, [vendorPurchases, allTransactions]);

  useEffect(() => {
    if (!isOpen) return;
    if (editTxId) {
      const tx = allTransactions.find(t => t.id === editTxId);
      if (tx) {
        setAmount(String(tx.amount || ''));
        setDate(tx.date || getTodayJalali());
        setDescription(tx.description || '');
        setPayType(tx.type === 'CHEQUE' ? 'CHEQUE' : 'CASH');
        setChequeSerial(tx.chequeDetails?.serialNumber || '');
        setChequeDueDate(tx.chequeDetails?.dueDate || '');
        setLinkedPurchaseId(tx.linkedPurchaseId || '');
        return;
      }
    }
    setAmount(prefill?.amount ? String(Math.round(prefill.amount)) : '');
    setDate(getTodayJalali());
    setDescription(prefill?.description || '');
    setPayType('CASH');
    setChequeSerial('');
    setChequeDueDate('');
    setLinkedPurchaseId(prefill?.linkedPurchaseId || '');
  }, [isOpen, editTxId, prefill, allTransactions]);

  const amountNum = Number((amount || '').replace(/\D/g, '')) || 0;

  const handleSubmit = () => {
    if (!amountNum || amountNum <= 0) return toast.error('مبلغ پرداخت را وارد کنید.');
    if (!date) return toast.error('تاریخ پرداخت را انتخاب کنید.');

    const base: any = {
      referenceId: vendorId,
      direction: 'OUT',
      type: payType,
      amount: amountNum,
      date,
      description: description || `پرداخت به ${vendorName}`,
      linkedPurchaseId: linkedPurchaseId || undefined,
    };
    if (payType === 'CHEQUE') {
      const prev = editTxId ? allTransactions.find(t => t.id === editTxId)?.chequeDetails : undefined;
      base.chequeDetails = {
        serialNumber: chequeSerial,
        dueDate: chequeDueDate || date,
        status: prev?.status || 'PENDING',
        history: prev?.history || [],
      };
    }

    if (editTxId) {
      updateTransaction(editTxId, base);
      toast.success('پرداخت ویرایش شد.');
    } else {
      addTransaction(base);
      toast.success(`پرداخت ${amountNum.toLocaleString()} تومانی به ${vendorName} ثبت شد.`);
    }
    onClose();
  };

  return (
    <>{typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 rounded-[2rem] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">{editTxId ? 'ویرایش پرداخت' : 'ثبت پرداخت جدید'}</h3>
                  <p className="text-[11px] font-bold text-slate-500">طرف حساب: {vendorName}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><Banknote className="w-4 h-4 text-emerald-500" /> مبلغ پرداخت (تومان)</label>
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  placeholder="مثال: 15000000"
                  dir="ltr"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 font-mono font-black text-lg text-slate-800 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-center tracking-wider"
                />
                {amountNum > 0 && <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 text-center">{amountNum.toLocaleString()} تومان</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300">تاریخ پرداخت</label>
                  <GlassDatePicker value={date} onChange={setDate} placeholder="انتخاب تاریخ..." />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300">نوع پرداخت</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                    <button onClick={() => setPayType('CASH')} className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${payType === 'CASH' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500'}`}>نقدی</button>
                    <button onClick={() => setPayType('CHEQUE')} className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${payType === 'CHEQUE' ? 'bg-cyan-500 text-white shadow' : 'text-slate-500'}`}>چک</button>
                  </div>
                </div>
              </div>

              {payType === 'CHEQUE' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-4 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5 text-cyan-500" /> شماره چک / صیاد</label>
                    <input value={chequeSerial} onChange={(e) => setChequeSerial(e.target.value)} placeholder="..." dir="ltr" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-cyan-500 transition-all text-slate-800 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-600 dark:text-slate-300">سررسید چک</label>
                    <GlassDatePicker value={chequeDueDate} onChange={setChequeDueDate} placeholder="سررسید..." />
                  </div>
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><Receipt className="w-4 h-4 text-indigo-500" /> فاکتور مرتبط (اختیاری)</label>
                <PortalSelect options={purchaseOptions} value={linkedPurchaseId} onChange={setLinkedPurchaseId} placeholder="پرداخت عمومی..." searchable />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 dark:text-slate-300">شرح پرداخت</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={`مثال: پرداخت بابت خرید از ${vendorName}`} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none text-slate-800 dark:text-white placeholder:text-slate-400" />
              </div>

              <button onClick={handleSubmit} className="w-full py-4 rounded-2xl font-black text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_10px_25px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98]">
                {editTxId ? 'ثبت ویرایش' : 'ثبت پرداخت'}
              </button>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>, document.body
    )}</>
  );
}
