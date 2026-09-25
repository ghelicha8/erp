import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, AlertCircle, CheckCircle, ChevronDown, 
  Banknote, FileSignature, UploadCloud, Trash2, Image as ImageIcon,
  ClipboardPaste, AlignLeft, PieChart, Wand2, RefreshCcw, DollarSign, AlertTriangle, Link,
  SplitSquareHorizontal, Wallet, Plus, FileText
} from 'lucide-react';
import { toast } from 'sonner';

import { useFinanceStore } from '../../../store/financeStore';
import type { ChequeStatus, ChequeHistory, TransactionAllocation } from '../../../store/financeStore';
import { useProjectStore } from '../store/projectStore';
import { useInvoiceStore } from '../../../store/invoiceStore'; 

// 💡 فراخوانی دیتابیس‌های مستقل برای بخش تخصیص تراکنش‌ها
import { usePurchaseStore } from '../../../store/purchaseStore';
import { useLaborStore } from '../../../store/laborStore';
import { useLogisticsStore } from '../../../store/logisticsStore';

import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import GlassSelect from '../../../components/ui/GlassSelect'; 

const transactionSchema = z.object({
  phaseId: z.string().optional(),
  amount: z.string().optional(),
  totalAmount: z.string().optional(),
  cashAmount: z.string().optional(),
  date: z.string().min(1, 'تاریخ الزامی است'),
  direction: z.enum(['IN', 'OUT'] as const),
  type: z.enum(['CASH', 'CHEQUE', 'COMBINED'] as const),
  description: z.string().optional(),
  attachments: z.array(z.string()).max(2, 'حداکثر ۲ تصویر مجاز است').default([]),
  textReceipt: z.string().optional(),
  issuer: z.string().optional(),
  sayyadId: z.string().optional(),
  serialNumber: z.string().optional(),
  series: z.string().optional(),
  bank: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.string().optional(), 
}).superRefine((data, ctx) => {
  if (data.type === 'CASH' || data.type === 'CHEQUE') {
    if (!data.amount || data.amount === '0') ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'مبلغ الزامی است', path: ['amount'] });
  }
  if (data.type === 'COMBINED') {
    if (!data.totalAmount || data.totalAmount === '0') ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'مبلغ کل الزامی است', path: ['totalAmount'] });
    if (!data.cashAmount || data.cashAmount === '0') ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'مبلغ نقدی الزامی است', path: ['cashAmount'] });
    if (!data.amount || data.amount === '0') ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'مبلغ چک الزامی است', path: ['amount'] });
  }
  if (data.type === 'CHEQUE' || data.type === 'COMBINED') {
    if (!data.bank) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'انتخاب بانک الزامی است', path: ['bank'] });
    if (!data.serialNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'سریال چک الزامی است', path: ['serialNumber'] });
    if (!data.dueDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'تاریخ وصول الزامی است', path: ['dueDate'] });
  }
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else reject(new Error('خطا'));
      };
    };
  });
};

const formatAmount = (value: string) => value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const parseAmount = (val?: string) => Number((val || '0').replace(/,/g, ''));

const bankOptions = [
  { value: 'بانک ملی', label: 'بانک ملی ایران' }, { value: 'بانک ملت', label: 'بانک ملت' },
  { value: 'بانک صادرات', label: 'بانک صادرات' }, { value: 'بانک تجارت', label: 'بانک تجارت' },
  { value: 'بانک سپه', label: 'بانک سپه' }, { value: 'بانک سامان', label: 'بانک سامان' }, 
  { value: 'بانک پاسارگاد', label: 'بانک پاسارگاد' }, { value: 'سایر', label: 'سایر بانک‌ها' },
];

const chequeStatusOptions = [
  { value: 'PENDING', label: 'در انتظار وصول' },
  { value: 'CASHED', label: 'پاس شده (وصول)' },
  { value: 'BOUNCED', label: 'برگشت خورده' },
  { value: 'RETURNED', label: 'عودت داده شده' },
  { value: 'EXCHANGED', label: 'تعویض شده' },
];

export default function NewTransactionModal({ projectId, isOpen, onClose, editData }: { projectId: string, isOpen: boolean, onClose: () => void, editData?: any | null }) {
  
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const liveTransactions = useFinanceStore(state => state.transactions);
  const allInvoices = useInvoiceStore(state => state.invoices || []); 
  
  // 💡 لود کردن دیتابیس‌های جدید برای تخصیص مبالغ
  const allPurchases = usePurchaseStore(state => state.purchases);
  const allLaborLogs = useLaborStore(state => state.logs);
  const allLogisticsLogs = useLogisticsStore(state => state.logs);

  const projectPurchases = useMemo(() => allPurchases.filter(p => p.projectId === projectId), [allPurchases, projectId]);
  const projectLabor = useMemo(() => allLaborLogs.filter(l => l.projectId === projectId), [allLaborLogs, projectId]);
  const projectLogistics = useMemo(() => allLogisticsLogs.filter(l => l.projectId === projectId), [allLogisticsLogs, projectId]);
  
  const isPurchaseSettlement = editData?.isPurchaseSettlement === true;
  const isEditingExisting = !isPurchaseSettlement && editData?.id ? liveTransactions.some(t => t.id === editData.id) : false;
  const currentTransaction = isEditingExisting ? liveTransactions.find(t => t.id === editData?.id) : null;
  const prefillData = (!isEditingExisting && editData) ? editData : null;

  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);
  const changeChequeStatus = useFinanceStore((state) => state.changeChequeStatus);
  const exchangeChequeForCash = useFinanceStore((state) => state.exchangeChequeForCash);
  
  const project = useProjectStore(state => state.projects.find(p => p.id === projectId));
  const phaseOptions = useMemo(() => [
    { value: 'GENERAL', label: 'هزینه عمومی (بدون فاز)' },
    ...(project?.phases?.map(p => ({ value: p.id, label: p.name })) || [])
  ], [project?.phases]);

  // 💡 فیلتر هوشمند فاکتورهای خرید از استور جدید
  const purchaseOptions = useMemo(() => {
    if (!projectPurchases || projectPurchases.length === 0) return [{ value: 'NONE', label: 'تراکنش آزاد (بدون فاکتور)' }];
    const options = projectPurchases.map((p: any) => {
      const totalPaid = liveTransactions
        .filter(t => t.allocations?.some(a => a.recordId === p.id) && t.id !== currentTransaction?.id) 
        .reduce((sum, t) => sum + (t.allocations?.find(a => a.recordId === p.id)?.amount || 0), 0);
      const itemCost = p.billedCost > 0 ? p.billedCost : (p.internalCost || 0);
      const transportCost = p.hasTransport ? (p.transportBilledCost > 0 ? p.transportBilledCost : (p.transportInternalCost || 0)) : 0;
      const invoiceTotal = itemCost + transportCost; 
      const remaining = invoiceTotal - totalPaid; 
      return { value: p.id, label: `🛒 فاکتور ${p.vendor} - ${p.title} | مانده: ${remaining.toLocaleString()} ت`, remainingAmount: remaining };
    }).filter((opt: any) => opt.remainingAmount > 0);
    return [{ value: 'NONE', label: 'تراکنش آزاد (بدون فاکتور)' }, ...options];
  }, [projectPurchases, liveTransactions, currentTransaction]);

  // 💡 فیلتر هوشمند رکوردهای نیروی کار از استور جدید
  const laborOptions = useMemo(() => {
    if (!projectLabor || projectLabor.length === 0) return [{ value: 'NONE', label: 'تراکنش آزاد (بدون تخصیص نیرو)' }];
    return projectLabor.map((l: any) => ({ 
      value: l.id, 
      label: `👷 ${l.workerName || 'ناشناس'} - ${l.workType || 'آزاد'} (${(l.billedCost || l.internalCost || 0).toLocaleString()} ت)` 
    }));
  }, [projectLabor]);

  // 💡 فیلتر هوشمند رکوردهای لجستیک از استور جدید
  const logisticsOptions = useMemo(() => {
    if (!projectLogistics || projectLogistics.length === 0) return [{ value: 'NONE', label: 'تراکنش آزاد (بدون تخصیص لجستیک)' }];
    return projectLogistics.map((l: any) => ({ 
      value: l.id, 
      label: `🚚 ${l.title || l.vehicleInfo} (${(l.billedCost || l.internalCost || 0).toLocaleString()} ت)` 
    }));
  }, [projectLogistics]);

  const projectInvoices = useMemo(() => {
    return allInvoices.filter(inv => inv.projectId === projectId && inv.status !== 'PROFORMA' && (inv.payment?.debtAmount || 0) > 0);
  }, [allInvoices, projectId]);

  const invoiceOptions = useMemo(() => projectInvoices.map(inv => ({
    value: inv.id, label: `📄 صورت‌وضعیت ${inv.invoiceNumber} (بدهی: ${(inv.payment?.debtAmount || 0).toLocaleString('fa-IR')} ت)`
  })), [projectInvoices]);

  type SpecialMode = 'NORMAL' | 'EXCHANGING' | 'CASHING';
  const [specialMode, setSpecialMode] = useState<SpecialMode>('NORMAL');
  const [pendingHistory, setPendingHistory] = useState<ChequeHistory[]>([]);
  
  const [allocations, setAllocations] = useState<TransactionAllocation[]>([]);

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { direction: 'OUT', type: 'CASH', attachments: [] },
  });

  const txType = watch('type');
  const txDir = watch('direction');
  const txAttachments = watch('attachments') || [];
  const selectedStatus = watch('status'); 

  const totalEnteredAmount = txType === 'COMBINED' ? parseAmount(watch('totalAmount')) : parseAmount(watch('amount'));
  const totalAllocatedAmount = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
  const remainderToWallet = Math.max(totalEnteredAmount - totalAllocatedAmount, 0);

  const resetToNormal = () => {
    setSpecialMode('NORMAL');
    setPendingHistory([]);
    
    if (currentTransaction) {
      setAllocations(currentTransaction.allocations || []); 
      reset({
        phaseId: currentTransaction.phaseId || 'GENERAL', 
        amount: formatAmount(currentTransaction.amount.toString()),
        date: currentTransaction.date, 
        direction: currentTransaction.direction, 
        type: currentTransaction.type,
        description: currentTransaction.description || '', 
        attachments: currentTransaction.attachments || [],
        textReceipt: currentTransaction.textReceipt || '', 
        issuer: currentTransaction.chequeDetails?.issuer || '',
        sayyadId: currentTransaction.chequeDetails?.sayyadId || '', 
        serialNumber: currentTransaction.chequeDetails?.serialNumber || '',
        series: currentTransaction.chequeDetails?.series || '', 
        bank: currentTransaction.chequeDetails?.bank || '',
        issueDate: currentTransaction.chequeDetails?.issueDate || '', 
        dueDate: currentTransaction.chequeDetails?.dueDate || '',
        status: currentTransaction.chequeDetails?.status || 'PENDING',
      });
    } else if (prefillData) {
      const defaultAlloc: TransactionAllocation[] = [];
      if (prefillData.linkedPurchaseId && prefillData.linkedPurchaseId !== 'NONE') {
         defaultAlloc.push({
           id: crypto.randomUUID(),
           amount: parseAmount(prefillData.amount?.toString() || '0'),
           allocationType: 'PROJECT',
           projectId: projectId,
           phaseId: 'GENERAL',
           recordType: 'PURCHASE',
           recordId: prefillData.linkedPurchaseId,
           description: prefillData.description || 'تسویه فاکتور خرید'
         });
      }
      setAllocations(defaultAlloc);
      reset({
        phaseId: 'GENERAL',
        totalAmount: prefillData.type === 'COMBINED' ? formatAmount((prefillData.amount || 0).toString()) : '',
        amount: prefillData.type !== 'COMBINED' ? formatAmount((prefillData.amount || 0).toString()) : '',
        date: prefillData.date || new Date().toLocaleDateString('fa-IR'),
        direction: prefillData.direction || 'OUT', 
        type: prefillData.type || 'CASH',
        description: prefillData.description || '',
        attachments: [], status: 'PENDING'
      });
    } else {
      setAllocations([]);
      reset({ phaseId: 'GENERAL', direction: 'OUT', type: 'CASH', attachments: [], status: 'PENDING' });
    }
  };

  useEffect(() => { 
    if (isOpen) { resetToNormal(); } 
  }, [isOpen, currentTransaction?.id, prefillData]);

  const handleAddAllocation = () => {
    setAllocations([...allocations, { 
      id: crypto.randomUUID(), 
      amount: remainderToWallet || 0, 
      allocationType: 'PROJECT', 
      projectId: projectId, 
      phaseId: 'GENERAL', 
      recordType: 'NONE' 
    }]);
  };

  const updateAllocation = (id: string, field: keyof TransactionAllocation, value: any) => {
    setAllocations(allocations.map(a => {
      if (a.id !== id) return a;
      return { ...a, [field]: value };
    }));
  };

  const handleSplit5050 = () => {
    const total = parseAmount(watch('totalAmount'));
    const half = Math.floor(total / 2);
    setValue('cashAmount', formatAmount(half.toString()), { shouldValidate: true });
    setValue('amount', formatAmount((total - half).toString()), { shouldValidate: true }); 
  };
  const handleRemainderToCheque = () => {
    const total = parseAmount(watch('totalAmount'));
    const cash = parseAmount(watch('cashAmount'));
    setValue('amount', formatAmount(Math.max(total - cash, 0).toString()), { shouldValidate: true });
  };
  const handleRemainderToCash = () => {
    const total = parseAmount(watch('totalAmount'));
    const cheque = parseAmount(watch('amount'));
    setValue('cashAmount', formatAmount(Math.max(total - cheque, 0).toString()), { shouldValidate: true });
  };

  const handlePrepareExchange = () => {
    if (!currentTransaction || !currentTransaction.chequeDetails) return;
    const snapshotData = {
      bank: watch('bank'), serialNumber: watch('serialNumber'), issuer: watch('issuer'), sayyadId: watch('sayyadId'),
      series: watch('series'), dueDate: watch('dueDate'), issueDate: watch('issueDate'), amount: parseAmount(watch('amount')),
      attachments: txAttachments, textReceipt: watch('textReceipt'), description: watch('description')
    };
    const newRecord: ChequeHistory = {
        id: crypto.randomUUID(), date: new Date().toLocaleDateString('fa-IR'), previousStatus: currentTransaction.chequeDetails.status, 
        newStatus: 'EXCHANGED', description: 'بایگانی جهت تعویض با چک جایگزین', attachments: [], snapshot: snapshotData
    };
    setPendingHistory([newRecord]);
    setSpecialMode('EXCHANGING');
    setValue('serialNumber', ''); setValue('bank', ''); setValue('dueDate', ''); setValue('issueDate', ''); setValue('sayyadId', ''); setValue('series', ''); setValue('attachments', []); setValue('status', 'PENDING');
    setValue('description', `چک جایگزین بابت تعویض چک قبلی (سریال ${currentTransaction.chequeDetails.serialNumber})`);
  };

  const handlePrepareCashing = () => {
    if (!currentTransaction) return;
    setSpecialMode('CASHING');
    setValue('type', 'CASH');
    setValue('description', `دریافت/پرداخت نقدی به جای چک (سریال ${currentTransaction.chequeDetails?.serialNumber || 'نامشخص'})`);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (txAttachments.length + files.length > 2) return toast.error('حداکثر ۲ تصویر مجاز است');
    try {
      const compressedFiles = await Promise.all(files.map(f => compressImage(f)));
      setValue('attachments', [...txAttachments, ...compressedFiles], { shouldValidate: true });
    } catch (error) { toast.error('خطا در پردازش تصویر'); }
  };

  const handlePasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) { setValue('textReceipt', text, { shouldValidate: true }); toast.success('متن جایگذاری شد'); }
    } catch (err) { toast.error('دسترسی به کلیپ‌بورد مسدود است.'); }
  };

  const onSubmit = (data: TransactionFormValues) => {
    const rawAmount = parseAmount(data.amount); 
    const rawCash = parseAmount(data.cashAmount); 

    try {
      if (currentTransaction && specialMode === 'CASHING') {
        exchangeChequeForCash(currentTransaction.id, rawAmount, data.date, data.description || 'تبدیل چک به وجه نقد / حواله', data.attachments);
        toast.success('تراکنش نقدی ثبت شد و مشخصات چک قبلی در بایگانی قرار گرفت.');
        onClose(); return;
      }

      const basePayload: any = { 
        referenceId: projectId, 
        phaseId: data.phaseId === 'GENERAL' ? undefined : data.phaseId, 
        allocations: allocations, 
        date: data.date, 
        direction: data.direction, 
        attachments: data.attachments, 
        textReceipt: data.textReceipt 
      };

      const finalHistory = [...(currentTransaction?.chequeDetails?.history || []), ...pendingHistory];
      const chequeData = {
        issuer: data.issuer, sayyadId: data.sayyadId, serialNumber: data.serialNumber, series: data.series, bank: data.bank, issueDate: data.issueDate, dueDate: data.dueDate, status: data.status || 'PENDING', history: finalHistory,
      };

      if (currentTransaction) {
        if (currentTransaction.type === 'CHEQUE' && data.status !== currentTransaction.chequeDetails?.status) {
          changeChequeStatus(currentTransaction.id, data.status as ChequeStatus, data.description || 'تغییر وضعیت', data.date, data.attachments);
        }
        
        updateTransaction(currentTransaction.id, {
          ...basePayload, 
          amount: rawAmount, 
          type: data.type, 
          description: data.description, 
          ...(data.type === 'CHEQUE' && { chequeDetails: chequeData })
        });
        toast.success(specialMode === 'EXCHANGING' ? 'چک جایگزین با موفقیت ثبت شد.' : 'تراکنش با موفقیت به‌روزرسانی شد');

      } else {
        const newIdBase = crypto.randomUUID(); 
        
        if (data.type === 'COMBINED') {
          addTransaction({ ...basePayload, id: newIdBase + '-1', amount: rawCash, type: 'CASH', description: (data.description || 'پرداخت ترکیبی') + ' (بخش نقدی)', status: 'COMPLETED' });
          addTransaction({ ...basePayload, id: newIdBase + '-2', amount: rawAmount, type: 'CHEQUE', description: (data.description || 'پرداخت ترکیبی') + ' (بخش چک)', chequeDetails: chequeData, status: 'PENDING' });
          toast.success('تراکنش ترکیبی با موفقیت در صندوق ثبت شد!');
        } else {
          addTransaction({ ...basePayload, id: newIdBase, amount: rawAmount, type: data.type, description: data.description, status: data.type === 'CHEQUE' ? 'PENDING' : 'COMPLETED', ...(data.type === 'CHEQUE' && { chequeDetails: chequeData }) });
          toast.success(data.direction === 'OUT' ? 'خروج وجه با موفقیت ثبت شد.' : 'ورود وجه به صندوق ثبت شد.');
        }
      }
      onClose();
    } catch (error) { toast.error('بروز خطا در ثبت اطلاعات'); }
  };

  const isStatusChanged = specialMode === 'NORMAL' && currentTransaction && currentTransaction.type === 'CHEQUE' && selectedStatus !== currentTransaction.chequeDetails?.status;

  if (!isOpen || !portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999999] overflow-y-auto modal-scrollbar" dir="rtl">
        <div className="flex min-h-full items-start justify-center p-4 sm:p-8 pt-10 pb-24 relative">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" />
          
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 350 }} className="relative z-[9999999] w-full max-w-4xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-3xl bg-white/80 dark:bg-slate-900/90 border border-white/40 dark:border-slate-700/50 p-6 sm:p-10 overflow-visible">
            <button onClick={onClose} className="absolute top-6 left-6 p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-colors z-10"><X className="w-5 h-5 text-slate-700 dark:text-slate-300" /></button>

            <div className="mb-10 text-center sm:text-right flex flex-col items-center sm:items-start border-b border-slate-200/50 dark:border-slate-700/50 pb-6 relative">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-5 shadow-inner ${specialMode === 'CASHING' ? 'bg-emerald-500/10 border border-emerald-500/20' : specialMode === 'EXCHANGING' ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-violet-500/10 border border-violet-500/20'}`}>
                <Banknote className={`w-8 h-8 drop-shadow-md ${specialMode === 'CASHING' ? 'text-emerald-500' : specialMode === 'EXCHANGING' ? 'text-cyan-500' : 'text-violet-500'}`} />
              </div>
              <h2 className={`text-3xl sm:text-4xl font-black bg-clip-text text-transparent drop-shadow-sm tracking-tight leading-tight bg-gradient-to-r ${specialMode === 'CASHING' ? 'from-emerald-500 to-teal-500' : specialMode === 'EXCHANGING' ? 'from-cyan-500 to-blue-500' : 'from-violet-600 to-indigo-500 dark:from-violet-400 dark:to-indigo-400'}`}>
                {isPurchaseSettlement ? 'ثبت پرداخت و تسویه فاکتور' : currentTransaction ? 'ویرایش تراکنش مالی' : 'ثبت تراکنش در صندوق'}
              </h2>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2">فرم هوشمند مدیریت نقدینگی، صدور چک و تخصیص پرداختی‌ها</p>
            </div>

            <AnimatePresence>
              {specialMode !== 'NORMAL' && (
                <motion.div initial={{ opacity: 0, y: -20, height: 0, overflow: 'hidden' }} animate={{ opacity: 1, y: 0, height: 'auto', overflow: 'visible' }} exit={{ opacity: 0, y: -20, height: 0, overflow: 'hidden' }}>
                  <div className={`mb-6 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-white shadow-lg ${specialMode === 'CASHING' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-8 h-8 animate-pulse opacity-80" />
                      <div className="flex flex-col">
                        <span className="font-black text-lg">
                          {specialMode === 'EXCHANGING' ? 'حالت تعویض (ثبت چک جدید)' : 'حالت تبدیل چک به نقد/حواله'}
                        </span>
                        <span className="text-sm font-medium opacity-90">
                          اطلاعات چک قبلی به طور خودکار در بایگانی سوابق ذخیره گردید. مشخصات پرداختِ جدید را وارد کنید.
                        </span>
                      </div>
                    </div>
                    <button onClick={resetToNormal} className="bg-white/20 hover:bg-white/30 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">انصراف و لغو</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {currentTransaction && currentTransaction.type === 'CHEQUE' && specialMode === 'NORMAL' && (
              <div className="mb-8 flex flex-wrap items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
                <span className="text-sm font-bold text-cyan-800 dark:text-cyan-300 ml-2">عملیات روی این چک:</span>
                <button type="button" onClick={handlePrepareCashing} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-400 transition-colors shadow-sm"><DollarSign className="w-4 h-4"/> تبدیل به وجه نقد</button>
                <button type="button" onClick={handlePrepareExchange} className="flex items-center gap-2 bg-cyan-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-cyan-400 transition-colors shadow-sm"><RefreshCcw className="w-4 h-4"/> تعویض با چک جدید</button>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit, () => toast.error('لطفاً خطاهای فرم را برطرف کنید'))} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-50">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">جهت گردش مالی</label>
                  <div className="flex p-1.5 bg-white/40 dark:bg-black/20 rounded-2xl backdrop-blur-md border border-white/30 dark:border-slate-700/50 shadow-inner">
                    <button type="button" onClick={() => setValue('direction', 'IN')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${txDir === 'IN' ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>دریافت وجه / از کارفرما</button>
                    <button type="button" onClick={() => setValue('direction', 'OUT')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${txDir === 'OUT' ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>خروج / از صندوق</button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">نوع تسویه / پرداخت</label>
                  <div className="flex p-1.5 bg-white/40 dark:bg-black/20 rounded-2xl backdrop-blur-md border border-white/30 dark:border-slate-700/50 shadow-inner">
                    <button type="button" disabled={specialMode !== 'NORMAL'} onClick={() => setValue('type', 'CASH')} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${txType === 'CASH' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.6)]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'} `}><Banknote className="w-4 h-4 hidden sm:block"/>نقدی / حواله</button>
                    <button type="button" disabled={specialMode !== 'NORMAL'} onClick={() => setValue('type', 'CHEQUE')} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${txType === 'CHEQUE' ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'} `}><FileSignature className="w-4 h-4 hidden sm:block"/>چک بانکی</button>
                    <button type="button" disabled={isEditingExisting || specialMode !== 'NORMAL'} onClick={() => setValue('type', 'COMBINED')} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${txType === 'COMBINED' ? 'bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.6)]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'} `}><PieChart className="w-4 h-4 hidden sm:block"/>ترکیبی</button>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {txType !== 'COMBINED' ? (
                  <motion.div key="single" initial={{ opacity: 0, height: 0, overflow: 'hidden' }} animate={{ opacity: 1, height: 'auto', overflow: 'visible' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-40">
                    <div className="space-y-2 relative">
                      <label className={`text-sm font-bold ml-1 flex items-center justify-between ${specialMode !== 'NORMAL' ? 'text-rose-500 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
                        <span>مبلغ پرداختی / دریافتی (تومان) {specialMode !== 'NORMAL' && '*'}</span>
                        {isPurchaseSettlement && <span className="text-[10px] text-violet-500 font-bold bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-md">قابل تغییر برای پرداخت علی‌الحساب</span>}
                      </label>
                      <input {...register('amount', { onChange: (e) => { e.target.value = formatAmount(e.target.value); } })} className={`w-full bg-white/60 dark:bg-black/20 border rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-violet-500 outline-none backdrop-blur-sm transition-all font-black text-xl text-left text-violet-600 dark:text-violet-400 drop-shadow-sm ${errors.amount ? 'border-rose-500/70' : specialMode !== 'NORMAL' ? 'border-rose-500/50 bg-rose-50/50' : 'border-white/40 dark:border-slate-700/50'}`} placeholder="0" dir="ltr" />
                    </div>
                    <div className="space-y-2 relative z-50">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">تاریخ عملیات</label>
                      <Controller control={control} name="date" render={({ field: { onChange, value } }) => (
                        <GlassDatePicker value={value} onChange={onChange} hasError={!!errors.date} />
                      )} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="combined" initial={{ opacity: 0, height: 0, overflow: 'hidden' }} animate={{ opacity: 1, height: 'auto', overflow: 'visible' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="p-6 bg-gradient-to-br from-fuchsia-500/10 to-violet-500/10 border border-fuchsia-500/20 rounded-[2rem] shadow-inner space-y-5 relative z-40">
                    <div className="flex items-center justify-between border-b border-fuchsia-500/20 pb-4">
                      <h3 className="font-black text-fuchsia-700 dark:text-fuchsia-300 flex items-center gap-2"><Wand2 className="w-5 h-5"/> ماشین حساب پرداخت ترکیبی</h3>
                      <button type="button" onClick={handleSplit5050} className="px-3 py-1.5 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-300 rounded-xl text-xs font-bold transition-colors">تقسیم خودکار ۵۰ / ۵۰</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">مبلغ کل پرداختی (تومان)</label>
                        <input {...register('totalAmount', { onChange: (e) => { e.target.value = formatAmount(e.target.value); } })} className={`w-full bg-white/60 dark:bg-black/20 border-white/40 border rounded-xl px-3 py-2.5 outline-none font-black text-lg text-slate-700 dark:text-slate-200 text-left`} placeholder="0" dir="ltr" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">سهم نقدی / حواله</label>
                        <div className="flex gap-2 relative">
                          <input {...register('cashAmount', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} className="w-full bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 rounded-xl px-3 py-2.5 outline-none font-black text-emerald-600 text-left" placeholder="0" dir="ltr" />
                          <button type="button" onClick={handleRemainderToCash} title="باقیمانده به نقد" className="p-2 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors"><Wand2 className="w-5 h-5"/></button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-cyan-600 dark:text-cyan-400">سهم پرداختی با چک</label>
                        <div className="flex gap-2 relative">
                          <input {...register('amount', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} className="w-full bg-cyan-50 border border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-800 rounded-xl px-3 py-2.5 outline-none font-black text-cyan-600 text-left" placeholder="0" dir="ltr" />
                          <button type="button" onClick={handleRemainderToCheque} title="باقیمانده به چک" className="p-2 bg-cyan-100 dark:bg-cyan-900 text-cyan-600 rounded-xl hover:bg-cyan-200 transition-colors"><Wand2 className="w-5 h-5"/></button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2 relative z-50">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">تاریخ عملیات ترکیبی</label>
                      <Controller control={control} name="date" render={({ field: { onChange, value } }) => (
                        <GlassDatePicker value={value} onChange={onChange} />
                      )} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 💡 بخش شاهکار: موتور تخصیص چندگانه (ارتباط با استورهای گلوبال جدید) */}
              <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200/50 dark:border-indigo-800/30 rounded-[2rem] p-6 shadow-inner relative z-[90]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                    <SplitSquareHorizontal className="w-5 h-5"/> تخصیص مبلغ (بابت چیست؟)
                  </h3>
                  <button type="button" onClick={handleAddAllocation} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 shadow-sm transition-all">
                    <Plus className="w-4 h-4"/> افزودن ردیف تخصیص
                  </button>
                </div>

                <AnimatePresence>
                  {allocations.map((alloc, index) => (
                    <motion.div key={alloc.id} style={{ zIndex: 100 - index }} initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, scale: 0.9, height: 0 }} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 mb-4 shadow-sm relative">
                      <div className="absolute top-3 right-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-500">{index + 1}</span>
                      </div>
                      <button type="button" onClick={() => setAllocations(allocations.filter(a => a.id !== alloc.id))} className="absolute top-3 left-4 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-6 relative z-10">
                        
                        <div className="space-y-1.5 md:col-span-3">
                          <label className="text-[10px] font-bold text-slate-500">مبلغ تخصیص (تومان)</label>
                          <input 
                            value={alloc.amount ? formatAmount(alloc.amount.toString()) : ''} 
                            onChange={(e) => updateAllocation(alloc.id, 'amount', parseAmount(e.target.value))} 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 font-black text-sm text-left text-indigo-600" dir="ltr" placeholder="0" 
                          />
                        </div>

                        <div className="space-y-1.5 md:col-span-3 z-50">
                          <label className="text-[10px] font-bold text-slate-500">نوع تخصیص</label>
                          <GlassSelect 
                            options={txDir === 'IN' 
                              ? [
                                  {value: 'INVOICE', label: 'تسویه صورت‌وضعیت / فاکتور'},
                                  {value: 'NONE', label: 'علی‌الحساب (صندوق پروژه)'}
                                ]
                              : [
                                  {value: 'PURCHASE', label: 'تسویه فاکتور خرید مصالح'},
                                  {value: 'LABOR', label: 'تسویه دستمزد نیروی کار'},
                                  {value: 'LOGISTICS', label: 'تسویه لجستیک / ماشین‌آلات'},
                                  {value: 'NONE', label: 'علی‌الحساب (صندوق پروژه)'}
                                ]
                            }
                            value={alloc.recordType || 'NONE'}
                            onChange={(v) => {
                              updateAllocation(alloc.id, 'recordType', v);
                              updateAllocation(alloc.id, 'recordId', undefined);
                              updateAllocation(alloc.id, 'description', '');
                            }}
                            placeholder="دسته‌بندی"
                          />
                        </div>

                        {alloc.recordType === 'INVOICE' && (
                          <div className="space-y-1.5 md:col-span-6 z-40">
                            <label className="text-[10px] font-bold text-slate-500">انتخاب صورت‌وضعیت کارفرما</label>
                            <GlassSelect 
                              options={invoiceOptions.length > 0 ? invoiceOptions : [{value: '', label: 'فاکتور بدهکاری برای این پروژه یافت نشد'}]} 
                              value={alloc.recordId || ''} 
                              onChange={(v) => {
                                updateAllocation(alloc.id, 'recordId', v);
                                const inv = projectInvoices.find(i => i.id === v);
                                if (inv) {
                                  updateAllocation(alloc.id, 'description', `بابت تسویه صورت‌وضعیت شماره ${inv.invoiceNumber}`);
                                  if (!alloc.amount || alloc.amount === 0) {
                                    const unallocated = Math.max(totalEnteredAmount - (totalAllocatedAmount - (alloc.amount || 0)), 0);
                                    const suggestedAmount = Math.min(inv.payment?.debtAmount || 0, unallocated);
                                    if (suggestedAmount > 0) updateAllocation(alloc.id, 'amount', suggestedAmount);
                                  }
                                }
                              }} 
                              placeholder="صورت‌وضعیت را انتخاب کنید..." 
                            />
                          </div>
                        )}

                        {alloc.recordType === 'PURCHASE' && (
                          <div className="space-y-1.5 md:col-span-6 z-40">
                            <label className="text-[10px] font-bold text-slate-500">انتخاب فاکتور خرید مصالح</label>
                            <GlassSelect 
                              options={purchaseOptions.filter(o => o.value !== 'NONE').length > 0 ? purchaseOptions.filter(o => o.value !== 'NONE') : [{value: '', label: 'فاکتور خریدی با بدهی یافت نشد'}]} 
                              value={alloc.recordId || ''} 
                              onChange={(v) => {
                                updateAllocation(alloc.id, 'recordId', v);
                                const p = purchaseOptions.find((i:any) => i.value === v);
                                if (p) {
                                  updateAllocation(alloc.id, 'description', `بابت تسویه ${p.label.split('|')[0]}`);
                                  if (!alloc.amount || alloc.amount === 0) {
                                    const unallocated = Math.max(totalEnteredAmount - (totalAllocatedAmount - (alloc.amount || 0)), 0);
                                    const suggestedAmount = Math.min(p.remainingAmount || 0, unallocated);
                                    if (suggestedAmount > 0) updateAllocation(alloc.id, 'amount', suggestedAmount);
                                  }
                                }
                              }} 
                              placeholder="فاکتور خرید را انتخاب کنید..." 
                            />
                          </div>
                        )}

                        {alloc.recordType === 'LABOR' && (
                          <div className="space-y-1.5 md:col-span-6 z-40">
                            <label className="text-[10px] font-bold text-slate-500">انتخاب رکورد نیروی کار</label>
                            <GlassSelect 
                              options={laborOptions.length > 0 ? laborOptions : [{value: '', label: 'هیچ رکوردی یافت نشد'}]} 
                              value={alloc.recordId || ''} 
                              onChange={(v) => {
                                updateAllocation(alloc.id, 'recordId', v);
                                const l = laborOptions.find((i:any) => i.value === v);
                                if (l) updateAllocation(alloc.id, 'description', `بابت ${l.label}`);
                              }} 
                              placeholder="نیروی کار را انتخاب کنید..." 
                            />
                          </div>
                        )}

                        {alloc.recordType === 'LOGISTICS' && (
                          <div className="space-y-1.5 md:col-span-6 z-40">
                            <label className="text-[10px] font-bold text-slate-500">انتخاب رکورد ماشین‌آلات / لجستیک</label>
                            <GlassSelect 
                              options={logisticsOptions.length > 0 ? logisticsOptions : [{value: '', label: 'هیچ رکوردی یافت نشد'}]} 
                              value={alloc.recordId || ''} 
                              onChange={(v) => {
                                updateAllocation(alloc.id, 'recordId', v);
                                const l = logisticsOptions.find((i:any) => i.value === v);
                                if (l) updateAllocation(alloc.id, 'description', `بابت ${l.label}`);
                              }} 
                              placeholder="لجستیک را انتخاب کنید..." 
                            />
                          </div>
                        )}

                        {alloc.recordType === 'NONE' && (
                          <div className="md:col-span-6 flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-2 h-[42px] mt-[21px]">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">این مبلغ مستقیماً به عنوان علی‌الحساب در صندوق پروژه ذخیره می‌شود.</span>
                          </div>
                        )}

                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {allocations.length === 0 && (
                  <div className="text-center py-6 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800/50">
                    <p className="text-sm font-bold text-indigo-500">هیچ ردیف تخصیصی ثبت نشده است.</p>
                    <p className="text-xs text-slate-500 mt-1">تمام مبلغ تراکنش به صورت خودکار به عنوان «علی‌الحساب (بدون تخصیص)» در صندوق ذخیره خواهد شد.</p>
                  </div>
                )}

                {totalEnteredAmount > 0 && (
                  <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-800/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500">مبلغ کل پرداختی/دریافتی</span>
                        <span className="text-sm font-black text-slate-800 dark:text-white" dir="ltr">{totalEnteredAmount.toLocaleString('fa-IR')}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500">تخصیص داده شده</span>
                        <span className={`text-sm font-black ${totalAllocatedAmount > totalEnteredAmount ? 'text-rose-500 animate-pulse' : 'text-indigo-600 dark:text-indigo-400'}`} dir="ltr">{totalAllocatedAmount.toLocaleString('fa-IR')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-800/50">
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">مانده به عنوان علی‌الحساب پروژه</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400" dir="ltr">{remainderToWallet.toLocaleString('fa-IR')} ت</span>
                      </div>
                      <Wallet className="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-30">
                <div className="space-y-2 relative">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">تخصیص به فاز پروژه</label>
                  <Controller control={control} name="phaseId" render={({ field }) => (
                    <GlassSelect options={phaseOptions} value={field.value || 'GENERAL'} onChange={field.onChange} placeholder="پروژه کلی (هزینه عمومی)" />
                  )} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">شرح تراکنش (بابت)</label>
                  <input {...register('description')} className="w-full bg-white/60 dark:bg-black/20 border border-white/40 dark:border-slate-700/50 rounded-2xl px-4 py-3.5 outline-none backdrop-blur-sm transition-all font-medium" placeholder="مثال: تسویه حساب، پیش پرداخت..." />
                </div>
              </div>

              <AnimatePresence>
                {(txType === 'CHEQUE' || txType === 'COMBINED') && (
                  <motion.div initial={{ opacity: 0, height: 0, overflow: 'hidden' }} animate={{ opacity: 1, height: 'auto', overflow: 'visible' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }}>
                    <div className="p-6 rounded-[2rem] bg-cyan-500/5 border border-cyan-500/20 shadow-inner space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <FileSignature className="w-5 h-5 text-cyan-500"/>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white">
                          {specialMode === 'EXCHANGING' ? 'مشخصات چک جدید (جایگزین)' : 'مشخصات جامع چک'}
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        {specialMode === 'NORMAL' && (
                          <div className="space-y-2 relative md:col-span-2 z-[45]">
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                              وضعیت فعلی چک
                              {isStatusChanged && <span className="text-rose-500 animate-pulse">تغییر وضعیت در بایگانی ثبت خواهد شد!</span>}
                            </label>
                            <Controller control={control} name="status" render={({ field }) => (
                              <GlassSelect options={chequeStatusOptions} value={field.value || 'PENDING'} onChange={field.onChange} placeholder="انتخاب وضعیت..." />
                            )} />
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">صاحب حساب</label>
                          <input {...register('issuer')} className="w-full bg-white/60 dark:bg-black/20 border border-white/40 rounded-2xl px-4 py-3.5 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">شناسه صیاد</label>
                          <input {...register('sayyadId')} className="w-full bg-white/60 dark:bg-black/20 border border-white/40 rounded-2xl px-4 py-3.5 outline-none tracking-widest font-mono text-left" dir="ltr" />
                        </div>
                        <div className="space-y-2">
                          <label className={`text-xs font-bold text-slate-600 dark:text-slate-400`}>شماره سریال چک *</label>
                          <input {...register('serialNumber')} className={`w-full bg-white/60 dark:bg-black/20 border rounded-2xl px-4 py-3.5 outline-none font-mono text-left ${errors.serialNumber ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'}`} dir="ltr" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">سری چک (اختیاری)</label>
                          <input {...register('series')} className="w-full bg-white/60 dark:bg-black/20 border border-white/40 rounded-2xl px-4 py-3.5 outline-none font-mono text-left" dir="ltr" />
                        </div>
                        <div className="space-y-2 relative z-[90]">
                          <label className={`text-xs font-bold text-slate-600 dark:text-slate-400`}>بانک صادرکننده *</label>
                          <Controller control={control} name="bank" render={({ field }) => (<GlassSelect options={bankOptions} value={field.value || ''} onChange={field.onChange} placeholder="انتخاب بانک" hasError={!!errors.bank} />)} />
                        </div>
                        <div className="space-y-2 relative md:col-span-2 border-t border-cyan-500/20 pt-4 z-[80]">
                          <label className={`text-xs font-bold text-slate-600 dark:text-slate-400`}>تاریخ وصول (سررسید) *</label>
                          <Controller control={control} name="dueDate" render={({ field: { onChange, value } }) => (
                            <GlassDatePicker value={value} onChange={onChange} hasError={!!errors.dueDate} />
                          )} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-30">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-violet-500"/>{specialMode === 'EXCHANGING' ? 'عکس چک جایگزین' : specialMode === 'CASHING' ? 'عکس رسید واریز' : 'مدارک (فیش یا چک)'}</label>
                  <div className="flex flex-wrap gap-4">
                    {txAttachments.length < 2 && (
                      <div className="relative border-2 border-dashed border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 rounded-2xl w-full sm:w-48 h-36 flex flex-col items-center justify-center group cursor-pointer transition-colors">
                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <UploadCloud className="w-8 h-8 text-violet-400 mb-3" />
                        <span className="text-xs font-bold text-violet-600">آپلود مدرک</span>
                      </div>
                    )}
                    <AnimatePresence>
                      {txAttachments.map((img, idx) => (
                        <motion.div key={idx} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="relative w-full sm:w-48 h-36 rounded-2xl overflow-hidden shadow-lg group">
                          <img src={img} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <button type="button" onClick={() => setValue('attachments', txAttachments.filter((_, i) => i !== idx))} className="p-3 bg-rose-500 text-white rounded-xl"><Trash2 className="w-5 h-5"/></button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
                
                <div className="space-y-3 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 flex items-center gap-2"><AlignLeft className="w-4 h-4 text-violet-500"/>رسید متنی (کپی پیامک)</label>
                    <button type="button" onClick={handlePasteText} className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 text-violet-600 rounded-xl"><ClipboardPaste className="w-3.5 h-3.5" /> جایگذاری</button>
                  </div>
                  <textarea {...register('textReceipt')} className="w-full flex-1 bg-white/60 dark:bg-black/20 border border-white/40 rounded-2xl px-4 py-3.5 outline-none resize-none min-h-[144px] text-sm" placeholder="توضیحات تکمیلی..." />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200/50 dark:border-slate-700/50 mt-4 relative z-30">
                <button type="submit" disabled={isSubmitting || totalAllocatedAmount > totalEnteredAmount} className="w-full disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-black text-lg py-4 rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.5)] active:scale-95 transition-transform flex items-center justify-center gap-2 group relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  {isSubmitting ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="relative z-10">تایید نهایی و ثبت سند</span><CheckCircle className="w-5 h-5 relative z-10" /></>}
                </button>
                {totalAllocatedAmount > totalEnteredAmount && <p className="text-center text-xs font-bold text-rose-500 mt-3 animate-pulse">مبلغ تخصیص داده شده بیشتر از مبلغ کل دریافتی است!</p>}
              </div>
            </form>
          </motion.div>
        </div>
        
        <style dangerouslySetInnerHTML={{__html: `
          .modal-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .modal-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .modal-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 10px; }
          .dark .modal-scrollbar::-webkit-scrollbar-thumb { background: rgba(75, 85, 99, 0.7); }
          .modal-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(139, 92, 246, 0.8); }
        `}} />
      </div>
    </AnimatePresence>,
    portalTarget
  );
}