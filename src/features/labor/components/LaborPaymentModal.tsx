import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Banknote, FileSignature, UploadCloud, AlignLeft, 
  CalendarDays, Wallet, Plus, Trash2, Check, ChevronDown, 
  CheckCircle2, SplitSquareHorizontal, Image as ImageIcon, 
  PieChart, Wand2, ClipboardPaste, Building2, UserCircle, 
  Briefcase, Activity, Share2 
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useFinanceStore } from '../../../store/financeStore';
import type { ChequeStatus } from '../../../store/financeStore'; 
import { useLaborStore } from '../../../store/laborStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useClientStore } from '../../../store/clientStore';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';

// ==========================================
// 💡 الگوریتم مترجم هوشمند اعداد (رفع باگ پاک شدن و ناعدد)
// ==========================================
const parseAmount = (val?: string | number) => {
  if (!val) return 0;
  const enVal = String(val)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()) 
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()) 
    .replace(/,/g, '') 
    .replace(/\D/g, ''); 
  return Number(enVal) || 0;
};

// 💡 فرمت سه‌رقم سه‌رقم استاندارد برای کادرهای ورودی (جلوگیری از پرش نشانگر موس)
const formatAmount = (val: string | number) => {
  const num = parseAmount(val);
  return num === 0 ? '' : num.toLocaleString('en-US');
};

// ==========================================
// 💡 استایل‌های سراسری برای اسکرول‌بار شیشه‌ای
// ==========================================
const GlassScrollStyles = () => (
  <style>{`
    .glass-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .glass-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }
    .glass-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 10px; transition: background 0.3s ease; }
    .glass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.8); }
    .dark .glass-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
    .dark .glass-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.4); }
    .dark .glass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.9); }
  `}</style>
);

// ==========================================
// 💡 کامپوننت تولتیپ گرافیکی 
// ==========================================
const AnimatedTooltip = ({ children, content }: { children: React.ReactNode, content: string }) => {
  return (
    <div className="relative group/tooltip flex items-center justify-center">
      {children}
      <div className="absolute bottom-full mb-2 w-max bg-slate-800 dark:bg-white text-white dark:text-slate-800 text-[11px] font-black px-3 py-2 rounded-xl opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all duration-300 pointer-events-none shadow-[0_10px_30px_rgba(0,0,0,0.2)] z-[1000000] scale-95 group-hover/tooltip:scale-100 origin-bottom">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800 dark:border-t-white"></div>
      </div>
    </div>
  );
};

// ==========================================
// 💡 ZOD SCHEMA 
// ==========================================
const transactionSchema = z.object({
  amount: z.string().optional(),
  totalAmount: z.string().optional(),
  cashAmount: z.string().optional(),
  date: z.string().min(1, 'تاریخ الزامی است'),
  type: z.enum(['CASH', 'CHEQUE', 'COMBINED'] as const),
  description: z.string().optional(),
  attachments: z.array(z.string()).default([]),
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
    if (!data.amount || parseAmount(data.amount) <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'مبلغ الزامی است', path: ['amount'] });
  }
  if (data.type === 'COMBINED') {
    if (!data.totalAmount || parseAmount(data.totalAmount) <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'مبلغ کل الزامی است', path: ['totalAmount'] });
    if (!data.cashAmount || parseAmount(data.cashAmount) <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'مبلغ نقدی الزامی است', path: ['cashAmount'] });
    if (!data.amount || parseAmount(data.amount) <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'مبلغ چک الزامی است', path: ['amount'] });
  }
  if (data.type === 'CHEQUE' || data.type === 'COMBINED') {
    if (!data.bank) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'انتخاب بانک الزامی است', path: ['bank'] });
    if (!data.serialNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'سریال چک الزامی است', path: ['serialNumber'] });
    if (!data.dueDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'تاریخ وصول الزامی است', path: ['dueDate'] });
  }
});
type TransactionFormValues = z.infer<typeof transactionSchema>;

const bankOptions = [
  { id: 'بانک ملی', label: 'بانک ملی ایران' }, { id: 'بانک ملت', label: 'بانک ملت' },
  { id: 'بانک صادرات', label: 'بانک صادرات' }, { id: 'بانک تجارت', label: 'بانک تجارت' },
  { id: 'بانک سپه', label: 'بانک سپه' }, { id: 'بانک سامان', label: 'بانک سامان' }, 
  { id: 'بانک پاسارگاد', label: 'بانک پاسارگاد' }, { id: 'سایر', label: 'سایر بانک‌ها' },
];

const chequeStatusOptions = [
  { id: 'PENDING', label: 'در انتظار وصول' },
  { id: 'CASHED', label: 'پاس شده (وصول)' },
  { id: 'BOUNCED', label: 'برگشت خورده' },
  { id: 'RETURNED', label: 'عودت داده شده' },
  { id: 'EXCHANGED', label: 'تعویض شده' },
];

// ==========================================
// 💡 PortalSelect (لیست کشویی شیشه‌ای)
// ==========================================
const PortalSelect = ({ value, onChange, options, placeholder, icon: Icon, hasError }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((o:any) => o.id === value);

  const openDropdown = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width });
      setIsOpen(true);
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsOpen(false);
    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    }
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  return (
    <>
      <button 
        type="button" ref={btnRef} onClick={() => isOpen ? setIsOpen(false) : openDropdown()} 
        className={`w-full bg-white/60 dark:bg-slate-900/60 border rounded-2xl px-4 py-3 text-sm font-black text-slate-700 dark:text-slate-200 flex justify-between items-center outline-none transition-all shadow-inner backdrop-blur-md ${hasError ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/30'}`}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-4 h-4 text-indigo-500 shrink-0"/>}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-indigo-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[999999]" onClick={() => setIsOpen(false)} />
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            className="fixed bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-[1000000] overflow-hidden max-h-60 overflow-y-auto glass-scroll py-2"
          >
            {options.map((opt: any) => (
              <button type="button" key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} className={`w-full text-right px-4 py-3 text-sm font-bold transition-colors flex items-center justify-between group ${value === opt.id ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                <span className="truncate pl-2">{opt.label}</span>
                {value === opt.id && <Check className="w-4 h-4 text-indigo-500 shrink-0" />}
              </button>
            ))}
          </motion.div>
        </>,
        document.body
      )}
    </>
  );
};

// ==========================================
// 💡 کامپوننت چک‌باکس انیمیشنی لاکچری 
// ==========================================
const AnimatedCheckbox = ({ checked, onChange, label, subLabel, icon: Icon, colorClass="indigo" }: any) => (
  <label className={`flex items-center gap-4 cursor-pointer group p-4 rounded-2xl border bg-white/40 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all shadow-sm ${checked ? `border-${colorClass}-300 dark:border-${colorClass}-700/50` : 'border-slate-200 dark:border-slate-700'}`}>
    <div className={`w-6 h-6 shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors ${checked ? `bg-${colorClass}-500 border-${colorClass}-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]` : 'bg-transparent border-slate-300 dark:border-slate-600'}`}>
      <AnimatePresence>{checked && <motion.div initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}><Check className="w-4 h-4 text-white" /></motion.div>}</AnimatePresence>
    </div>
    <div className="flex flex-col flex-1">
      <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">{Icon && <Icon className={`w-4 h-4 text-${colorClass}-500`}/>} {label}</span>
      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{subLabel}</span>
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  </label>
);

// ==========================================
// 💡 MAIN MODAL COMPONENT
// ==========================================
interface LaborPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
}

export default function LaborPaymentModal({ isOpen, onClose, workerId }: LaborPaymentModalProps) {
  const { addTransaction } = useFinanceStore();
  const { logs, updateLog } = useLaborStore(); 
  const { projects } = useProjectStore();
  const { clients } = useClientStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: 'CASH', date: moment().format('jYYYY/jMM/jDD'), attachments: [] },
  });

  const txType = watch('type');
  const txAttachments = watch('attachments') || [];
  
  const [allocations, setAllocations] = useState<{ id: string; logId: string; amount: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('FREE');
  const [selectedClientId, setSelectedClientId] = useState<string>('FREE');
  
  const [syncWithClientProfile, setSyncWithClientProfile] = useState<boolean>(false);
  const [includeHiddenProfit, setIncludeHiddenProfit] = useState<boolean>(false);
  const [payHiddenProfitToWorker, setPayHiddenProfitToWorker] = useState<boolean>(false);

  const totalEnteredAmount = txType === 'COMBINED' ? parseAmount(watch('totalAmount')) : parseAmount(watch('amount'));
  const totalAllocatedAmount = allocations.reduce((sum, a) => sum + parseAmount(a.amount), 0);
  const remainderToAutoAllocate = Math.max(totalEnteredAmount - totalAllocatedAmount, 0);

  const workerLogsOptions = useMemo(() => {
    return logs.filter(l => l.workerId === workerId).map(l => {
      const netOwed = (l.internalCost || 0) - ((l.advancePayment || 0) + (l.loanDeduction || 0) + (l.penaltyDeduction || 0));
      return { id: l.id, date: l.date, label: `${l.date} | بابت: ${l.workType || 'کارکرد روزانه'} | طلب: ${netOwed.toLocaleString('fa-IR')} تومان`, netOwed };
    }).filter(l => l.netOwed > 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [logs, workerId]);

  const totalDebtOfWorker = workerLogsOptions.reduce((sum, l) => sum + l.netOwed, 0);

  const projectOptions = useMemo(() => [{ id: 'FREE', label: 'تخصیص آزاد (بدون پروژه)' }, ...projects.map(p => ({ id: p.id, label: p.title || p.name }))], [projects]);
  const clientOptions = useMemo(() => [{ id: 'FREE', label: 'تخصیص آزاد (بدون کارفرما)' }, ...clients.map(c => ({ id: c.id, label: `${c.name || ''} ${c.lastName || ''}`.trim() }))], [clients]);

  const handleSplit5050 = () => {
    const total = parseAmount(watch('totalAmount'));
    const half = Math.floor(total / 2);
    setValue('cashAmount', formatAmount(half), { shouldValidate: true });
    setValue('amount', formatAmount(total - half), { shouldValidate: true }); 
  };
  const handleRemainderToCheque = () => setValue('amount', formatAmount(Math.max(parseAmount(watch('totalAmount')) - parseAmount(watch('cashAmount')), 0)), { shouldValidate: true });
  const handleRemainderToCash = () => setValue('cashAmount', formatAmount(Math.max(parseAmount(watch('totalAmount')) - parseAmount(watch('amount')), 0)), { shouldValidate: true });

  const addAllocationRow = () => setAllocations(prev => [...prev, { id: crypto.randomUUID(), logId: '', amount: remainderToAutoAllocate > 0 ? remainderToAutoAllocate.toString() : '' }]);
  const removeAllocationRow = (id: string) => setAllocations(prev => prev.filter(a => a.id !== id));
  
  const selectLogForAllocation = (allocId: string, logId: string) => {
    const log = workerLogsOptions.find(l => l.id === logId);
    setAllocations(prev => prev.map(a => a.id === allocId ? { ...a, logId, amount: log ? log.netOwed.toString() : '0' } : a));
  };
  
  // 💡 استفاده از تبدیل‌گر جدید در تغییر مبالغ لیست
  const handleAllocationAmountChange = (id: string, val: string) => {
    const formattedVal = formatAmount(val);
    setAllocations(prev => prev.map(a => a.id === id ? { ...a, amount: formattedVal } : a));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 2 * 1024 * 1024) return toast.error('حجم عکس نباید بیشتر از ۲ مگابایت باشد.');
      const reader = new FileReader();
      reader.onloadend = () => setValue('attachments', [...txAttachments, reader.result as string]);
      reader.readAsDataURL(file);
    });
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

    const manualAllocations = allocations.filter(a => a.logId && a.amount).map(a => ({
      id: crypto.randomUUID(),
      amount: parseAmount(a.amount),
      allocationType: 'FREELANCE' as const, 
      recordType: 'LABOR' as const,
      recordId: a.logId,
      description: `تسویه دستی کارکرد: ${workerLogsOptions.find(l => l.id === a.logId)?.label.split('|')[0]}`
    }));

    const autoAllocations: any[] = [];
    let currentRemainder = Math.max(totalEnteredAmount - manualAllocations.reduce((sum, a) => sum + a.amount, 0), 0);

    if (currentRemainder > 0) {
      for (const log of workerLogsOptions) {
        if (manualAllocations.some(a => a.recordId === log.id)) continue; 
        if (currentRemainder <= 0) break;

        const paymentForThisLog = Math.min(log.netOwed, currentRemainder);
        currentRemainder -= paymentForThisLog;
        
        autoAllocations.push({
          id: crypto.randomUUID(),
          amount: paymentForThisLog,
          allocationType: 'FREELANCE' as const,
          recordType: 'LABOR' as const,
          recordId: log.id,
          description: `تسویه هوشمند کارکرد (${paymentForThisLog >= log.netOwed ? 'تسویه کامل' : 'علی‌الحساب / ناقص'}): ${log.label.split('|')[0]}`
        });
      }
    }

    const finalAllocations = [...manualAllocations, ...autoAllocations];

    const chequeData = {
      issuer: data.issuer, sayyadId: data.sayyadId, serialNumber: data.serialNumber, series: data.series, 
      bank: data.bank, issueDate: data.issueDate, dueDate: data.dueDate, status: (data.status as ChequeStatus) || 'PENDING', history: [],
    };

    const transactionClientId = (syncWithClientProfile && selectedClientId !== 'FREE') ? selectedClientId : undefined;
    const transactionProjectId = (syncWithClientProfile && selectedProjectId !== 'FREE') ? selectedProjectId : undefined;

    const basePayload: any = { 
      referenceId: workerId, 
      clientId: transactionClientId, 
      projectId: transactionProjectId, 
      allocations: finalAllocations.length > 0 ? finalAllocations : undefined, 
      date: data.date, direction: 'OUT', attachments: data.attachments, textReceipt: data.textReceipt 
    };

    const newIdBase = crypto.randomUUID(); 
    if (data.type === 'COMBINED') {
      addTransaction({ ...basePayload, id: newIdBase + '-1', amount: rawCash, type: 'CASH', description: (data.description || 'تسویه حساب ترکیبی') + ' (بخش نقدی)' });
      addTransaction({ ...basePayload, id: newIdBase + '-2', amount: rawAmount, type: 'CHEQUE', description: (data.description || 'تسویه حساب ترکیبی') + ' (بخش چک)', chequeDetails: chequeData });
    } else {
      addTransaction({ ...basePayload, id: newIdBase, amount: rawAmount, type: data.type, description: data.description || 'تسویه حساب / مساعده نیروی کار', chequeDetails: data.type === 'CHEQUE' ? chequeData : undefined });
    }

    finalAllocations.forEach(alloc => {
      const targetLog = logs.find(l => l.id === alloc.recordId);
      if (targetLog) updateLog(targetLog.id, { advancePayment: (targetLog.advancePayment || 0) + alloc.amount });
    });

    toast.success('سند پرداختی ثبت و بر اساس موتور هوشمند تخصیص یافت.');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <GlassScrollStyles />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl max-h-[95vh] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/50 dark:border-slate-700/60 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]"><Wallet className="w-7 h-7" /></div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">ثبت پرداختی به نیروی کار</h2>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">مدیریت نقدینگی، صدور چک و تخصیص هوشمند به کارکردها</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/50 dark:bg-slate-800/50 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:text-rose-600 rounded-xl transition-colors shadow-sm"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto glass-scroll p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Type Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-slate-700 dark:text-slate-200">نوع تسویه / پرداخت</label>
              <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                <button type="button" onClick={() => setValue('type', 'CASH')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-black rounded-xl transition-all ${txType === 'CASH' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><Banknote className="w-5 h-5 hidden sm:block"/> نقدی / حواله</button>
                <button type="button" onClick={() => setValue('type', 'CHEQUE')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-black rounded-xl transition-all ${txType === 'CHEQUE' ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><FileSignature className="w-5 h-5 hidden sm:block"/> چک بانکی</button>
                <button type="button" onClick={() => setValue('type', 'COMBINED')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-black rounded-xl transition-all ${txType === 'COMBINED' ? 'bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)] scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><PieChart className="w-5 h-5 hidden sm:block"/> ترکیبی</button>
              </div>
            </div>

            {/* Amount & Date */}
            <AnimatePresence mode="wait">
              {txType !== 'COMBINED' ? (
                <motion.div key="single" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 relative z-[100]">
                    <label className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-1"><CalendarDays className="w-4 h-4 text-indigo-500"/> تاریخ عملیات</label>
                    <Controller control={control} name="date" render={({ field: { onChange, value } }) => (<GlassDatePicker value={value} onChange={onChange} hasError={!!errors.date} />)} />
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center justify-between gap-1 w-full">
                      <span className="flex items-center gap-1"><Banknote className="w-4 h-4 text-emerald-500"/> مبلغ کل پرداختی (تومان) *</span>
                      {totalDebtOfWorker > 0 && (
                        <AnimatedTooltip content={`کل طلب محاسبه شده: ${totalDebtOfWorker.toLocaleString('fa-IR')} تومان`}>
                          <button type="button" onClick={() => setValue('amount', formatAmount(totalDebtOfWorker), { shouldValidate: true })} className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded-lg text-xs font-black hover:scale-105 transition-transform border border-amber-200 dark:border-amber-800/50 shadow-sm">
                            تسویه کل طلب
                          </button>
                        </AnimatedTooltip>
                      )}
                    </label>
                    {/* 💡 استفاده از تبدیل‌گر جدید در اینپوت برای رفع باگ NaN */}
                    <input {...register('amount', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} dir="ltr" placeholder="0" className={`w-full bg-white/60 dark:bg-slate-900/60 border rounded-2xl px-4 py-3 text-xl font-black outline-none transition-all shadow-inner ${errors.amount ? 'border-rose-500 text-rose-500 focus:ring-rose-500/20' : 'border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:ring-2 ring-emerald-500/20'}`} />
                  </div>
                </motion.div>
              ) : (
                <motion.div key="combined" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-6 bg-gradient-to-br from-fuchsia-500/10 to-violet-500/10 border border-fuchsia-500/20 rounded-[2rem] shadow-inner space-y-5">
                  <div className="flex items-center justify-between border-b border-fuchsia-500/20 pb-4">
                    <h3 className="font-black text-lg text-fuchsia-700 dark:text-fuchsia-300 flex items-center gap-2"><Wand2 className="w-5 h-5"/> ماشین حساب پرداخت ترکیبی</h3>
                    <button type="button" onClick={handleSplit5050} className="px-4 py-2 bg-white/50 hover:bg-white dark:bg-fuchsia-900/40 dark:hover:bg-fuchsia-900/80 text-fuchsia-700 dark:text-fuchsia-300 rounded-xl text-sm font-black transition-colors shadow-sm">تقسیم خودکار ۵۰ / ۵۰</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-700 dark:text-slate-200 flex justify-between items-center">
                         مبلغ کل (تومان)
                         {totalDebtOfWorker > 0 && (
                           <AnimatedTooltip content="جایگذاری کل طلب در مبلغ کل">
                             <button type="button" onClick={() => setValue('totalAmount', formatAmount(totalDebtOfWorker), { shouldValidate: true })} className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-md hover:bg-amber-200 transition-colors border border-amber-200 dark:border-amber-800">کل طلب</button>
                           </AnimatedTooltip>
                         )}
                      </label>
                      <input {...register('totalAmount', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} dir="ltr" placeholder="0" className="w-full bg-white/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 outline-none font-black text-xl text-slate-800 dark:text-slate-100 text-left shadow-inner focus:ring-2 ring-fuchsia-500/30" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-emerald-600 dark:text-emerald-400">سهم نقدی / حواله</label>
                      <div className="flex gap-2 relative">
                        <input {...register('cashAmount', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} dir="ltr" placeholder="0" className="w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 outline-none font-black text-lg text-emerald-600 dark:text-emerald-400 text-left shadow-inner" />
                        <AnimatedTooltip content="باقیمانده به نقد">
                          <button type="button" onClick={handleRemainderToCash} className="p-3 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors shadow-sm"><Wand2 className="w-5 h-5"/></button>
                        </AnimatedTooltip>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-cyan-600 dark:text-cyan-400">سهم چک</label>
                      <div className="flex gap-2 relative">
                        <input {...register('amount', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} dir="ltr" placeholder="0" className="w-full bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl px-4 py-3 outline-none font-black text-lg text-cyan-600 dark:text-cyan-400 text-left shadow-inner" />
                        <AnimatedTooltip content="باقیمانده به چک">
                          <button type="button" onClick={handleRemainderToCheque} className="p-3 bg-cyan-100 dark:bg-cyan-900/60 text-cyan-600 dark:text-cyan-400 rounded-xl hover:bg-cyan-200 dark:hover:bg-cyan-800 transition-colors shadow-sm"><Wand2 className="w-5 h-5"/></button>
                        </AnimatedTooltip>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 relative z-50">
                    <label className="text-sm font-black text-slate-700 dark:text-slate-200">تاریخ عملیات ترکیبی</label>
                    <Controller control={control} name="date" render={({ field: { onChange, value } }) => (<GlassDatePicker value={value} onChange={onChange} />)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 💡 بخش شاهکار تخصیص مبلغ به کارکردها (بابت چیست؟) */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 dark:border-slate-700/50 pb-4">
                <label className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"><SplitSquareHorizontal className="w-5 h-5"/></span>
                  تخصیص مبلغ دستی (بابت چیست؟)
                </label>
                <button type="button" onClick={addAllocationRow} className="px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-black shadow-md transition-colors flex items-center gap-1.5 active:scale-95">
                  <Plus className="w-4 h-4"/> افزودن ردیف تسویه
                </button>
              </div>

              {allocations.length === 0 ? (
                <div className="text-center py-8 bg-white/50 dark:bg-slate-900/50 border border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-2xl shadow-inner">
                  <p className="text-base font-black text-indigo-600 dark:text-indigo-400">هیچ تخصیص دستی وارد نشده است.</p>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2">سیستم به طور خودکار <strong className="text-emerald-600 dark:text-emerald-400 px-1">از قدیمی‌ترین کارکرد تا جدیدترین</strong> مبلغ را تسویه هوشمند می‌کند (FIFO).</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {allocations.map((alloc, idx) => (
                      <motion.div key={alloc.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative group overflow-visible">
                        <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden md:block">
                          <button type="button" onClick={() => removeAllocationRow(alloc.id)} className="w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><Trash2 className="w-4 h-4"/></button>
                        </div>
                        
                        <div className="flex-1 w-full space-y-2 relative z-[80]">
                          <label className="text-sm font-black text-slate-600 dark:text-slate-400 px-1">انتخاب کارکرد معوقه</label>
                          <PortalSelect options={workerLogsOptions} value={alloc.logId} onChange={(val: string) => selectLogForAllocation(alloc.id, val)} placeholder="انتخاب کنید..." />
                        </div>

                        <div className="w-full md:w-[220px] shrink-0 space-y-2 flex flex-col justify-end">
                          <label className="text-sm font-black text-slate-600 dark:text-slate-400 px-1">مبلغ تسویه (تومان)</label>
                          <input type="text" dir="ltr" value={alloc.amount ? Number(alloc.amount).toLocaleString('en-US') : ''} onChange={(e) => handleAllocationAmountChange(alloc.id, e.target.value)} placeholder="0" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base font-black text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500 focus:ring-2 shadow-inner transition-all" />
                        </div>
                        
                        <button type="button" onClick={() => removeAllocationRow(alloc.id)} className="w-full mt-2 md:hidden py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center gap-2 text-sm font-black"><Trash2 className="w-5 h-5"/> حذف این ردیف</button>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <div className="pt-2 px-1">
                    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-4 rounded-xl shadow-sm">
                      <span className="text-amber-500 text-xl">💡</span>
                      <p className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                        چنانچه مبلغ پرداختی را بیشتر از طلب کارگر وارد کنید، مازاد پرداختی به عنوان <strong className="font-black px-1">«مساعده یا اضافه کار»</strong> در حساب وی ذخیره شده و در سیستم <strong className="font-black px-1">سود پنهان</strong> کسر می‌گردد.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 💡 بخش اعجازِ کارفرما و پروژه‌ها (آربیتراژ و سود پنهان) */}
            <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 rounded-[2rem] p-6 shadow-sm space-y-6 relative z-[80]">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700/50 pb-4 mb-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20"><Briefcase className="w-5 h-5 text-indigo-500" /></div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">ارتباط با کارفرما و سود پنهان (آربیتراژ)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                <div className="space-y-2 relative z-[90]">
                  <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1"><Building2 className="w-4 h-4 text-indigo-500"/> مرتبط با کدام پروژه؟</label>
                  <PortalSelect options={projectOptions} value={selectedProjectId} onChange={setSelectedProjectId} placeholder="انتخاب پروژه..." />
                </div>
                <div className="space-y-2 relative z-[80]">
                  <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1"><UserCircle className="w-4 h-4 text-indigo-500"/> مرتبط با کدام کارفرما؟</label>
                  <PortalSelect options={clientOptions} value={selectedClientId} onChange={setSelectedClientId} placeholder="انتخاب کارفرما..." />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <AnimatedCheckbox 
                  checked={syncWithClientProfile} 
                  onChange={setSyncWithClientProfile} 
                  icon={Share2} colorClass="indigo"
                  label="ثبت این پرداختی در پروفایل کارفرما / پروژه مرتبط" 
                  subLabel="در صورت انتخاب، این سند مالی به عنوان دریافتی از کارفرما در داشبورد کارفرما نیز منظور می‌شود."
                />
                <AnimatedCheckbox 
                  checked={includeHiddenProfit} 
                  onChange={setIncludeHiddenProfit} 
                  icon={Activity} colorClass="fuchsia"
                  label="دریافت سود پنهان (آربیتراژ) از کارفرما در این تراکنش" 
                  subLabel="در صورت انتخاب، سیستم سود پنهانِ ثبت شده در کارکردهای نیروی کار را محاسبه کرده و به عنوان بدهیِ کارفرما به فاکتور نهایی او اضافه می‌کند."
                />
                <AnimatedCheckbox 
                  checked={payHiddenProfitToWorker} 
                  onChange={setPayHiddenProfitToWorker} 
                  icon={Wallet} colorClass="emerald"
                  label="واریز کامل سود پنهان به حساب نیروی کار" 
                  subLabel="اگر این تیک فعال باشد، تمام سود آربیتراژی که از کارفرما دریافت می‌شود، مستقیماً به موجودی و طلبِ نیروی کار اضافه خواهد شد."
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1"><AlignLeft className="w-4 h-4 text-indigo-500"/> شرح تراکنش (بابت)</label>
              <input {...register('description')} placeholder="مثال: تسویه حساب دو روز کاری آخر..." className="w-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-4 text-base font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 ring-indigo-500/20 shadow-inner placeholder-slate-400 dark:placeholder-slate-500 transition-all" />
            </div>

            {/* فیلدهای کامل و بی‌نقص چک */}
            <AnimatePresence>
              {(txType === 'CHEQUE' || txType === 'COMBINED') && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-visible">
                  <div className="col-span-1 md:col-span-2 p-6 sm:p-8 rounded-[2rem] bg-cyan-500/5 border border-cyan-500/30 shadow-inner space-y-6 overflow-visible">
                    <div className="flex items-center gap-3 mb-4 border-b border-cyan-500/20 pb-4">
                      <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20"><FileSignature className="w-6 h-6 text-cyan-500"/></div>
                      <h3 className="text-lg font-black text-cyan-800 dark:text-cyan-300">مشخصات جامع چک بانکی</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                      <div className="space-y-2 relative md:col-span-2 z-[45]">
                        <label className="text-sm font-black text-slate-700 dark:text-slate-300">وضعیت فعلی چک</label>
                        <Controller control={control} name="status" render={({ field }) => (<PortalSelect options={chequeStatusOptions} value={field.value || 'PENDING'} onChange={field.onChange} placeholder="انتخاب وضعیت..." />)} />
                      </div>
                      <div className="space-y-2"><label className="text-sm font-black text-slate-700 dark:text-slate-300">صاحب حساب</label><input {...register('issuer')} className="w-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 ring-cyan-500/30 text-slate-800 dark:text-white shadow-inner font-bold" /></div>
                      <div className="space-y-2"><label className="text-sm font-black text-slate-700 dark:text-slate-300">شناسه صیاد (۱۶ رقمی)</label><input {...register('sayyadId')} className="w-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 outline-none tracking-widest font-mono text-left focus:ring-2 ring-cyan-500/30 text-slate-800 dark:text-white shadow-inner font-bold" dir="ltr" /></div>
                      <div className="space-y-2"><label className="text-sm font-black text-slate-700 dark:text-slate-300">شماره سریال چک *</label><input {...register('serialNumber')} className={`w-full bg-white/80 dark:bg-slate-900/80 border rounded-2xl px-4 py-3.5 outline-none font-mono text-left text-slate-800 dark:text-white shadow-inner font-black ${errors.serialNumber ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700 focus:ring-2 ring-cyan-500/30'}`} dir="ltr" /></div>
                      <div className="space-y-2"><label className="text-sm font-black text-slate-700 dark:text-slate-300">سری چک (اختیاری)</label><input {...register('series')} className="w-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 outline-none font-mono text-left focus:ring-2 ring-cyan-500/30 text-slate-800 dark:text-white shadow-inner font-bold" dir="ltr" /></div>
                      <div className="space-y-2 relative z-[90]"><label className="text-sm font-black text-slate-700 dark:text-slate-300">بانک صادرکننده *</label><Controller control={control} name="bank" render={({ field }) => (<PortalSelect options={bankOptions} value={field.value || ''} onChange={field.onChange} placeholder="انتخاب بانک" hasError={!!errors.bank} />)} /></div>
                      <div className="space-y-2 relative md:col-span-2 border-t border-cyan-500/20 pt-5 z-[80]"><label className="text-sm font-black text-slate-700 dark:text-slate-300">تاریخ وصول (سررسید) *</label><Controller control={control} name="dueDate" render={({ field: { onChange, value } }) => (<GlassDatePicker value={value} onChange={onChange} hasError={!!errors.dueDate} />)} /></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* آپلود رسیدها */}
            <div className="space-y-4 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex-1 w-full space-y-2">
                   <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1"><AlignLeft className="w-4 h-4 text-indigo-500"/> رسید متنی (کپی پیامک)</label>
                   <div className="relative mt-2">
                     <textarea {...register('textReceipt')} rows={4} placeholder="متن پیامک واریز یا توضیحات تراکنش را اینجا پیست کنید..." className="glass-scroll w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 ring-indigo-500/20 shadow-inner resize-none placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed transition-all" />
                     <button type="button" onClick={handlePasteText} className="absolute top-3 left-3 text-[10px] font-black flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"><ClipboardPaste className="w-3.5 h-3.5" /> جایگذاری</button>
                   </div>
                </div>

                <div className="shrink-0 space-y-2 w-full sm:w-auto">
                   <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1"><ImageIcon className="w-4 h-4 text-indigo-500"/> مدارک پیوست</label>
                   <div className="relative group cursor-pointer w-full sm:w-36 h-28 mt-2 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border-2 border-dashed border-indigo-300 dark:border-indigo-700 flex flex-col items-center justify-center gap-2 transition-all group-hover:border-indigo-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 shadow-inner" onClick={() => fileInputRef.current?.click()}>
                     <UploadCloud className="w-7 h-7 text-indigo-500" />
                     <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">آپلود فیش/چک</span>
                   </div>
                   <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                </div>
              </div>

              {txAttachments.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-5 p-5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-inner">
                  {txAttachments.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl border-2 border-white dark:border-slate-700 shadow-md overflow-hidden group">
                      <img src={img} alt="رسید" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setValue('attachments', txAttachments.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-rose-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-6 h-6 text-white"/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Section */}
            <div className="p-6 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-5 backdrop-blur-xl mt-8 shadow-lg">
              <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-start">
                 <div className="flex flex-col text-right bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black text-slate-500 mb-0.5">کل مبلغ فرم</span>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400" dir="ltr">{totalEnteredAmount.toLocaleString('fa-IR')} <span className="text-[10px] opacity-70">تومان</span></span>
                 </div>
                 {remainderToAutoAllocate > 0 && (
                   <div className="flex flex-col text-right pl-4 sm:pr-4 sm:pl-0 sm:border-r border-slate-300 dark:border-slate-600">
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                         <Activity className="w-3 h-3 animate-pulse"/> تخصیص هوشمند FIFO
                      </span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-500 mt-0.5" dir="ltr">{remainderToAutoAllocate.toLocaleString('fa-IR')} <span className="text-[10px] opacity-70">تومان</span></span>
                   </div>
                 )}
              </div>
              
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <button type="submit" disabled={isSubmitting || totalAllocatedAmount > totalEnteredAmount} className="w-full sm:w-auto px-10 py-4 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-2xl font-black text-lg shadow-[0_10px_25px_rgba(99,102,241,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 group overflow-hidden relative">
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative z-10">تایید و ثبت سند</span>
                  <CheckCircle2 className="w-6 h-6 relative z-10" />
                </button>
                {totalAllocatedAmount > totalEnteredAmount && <p className="text-center text-[10px] font-black text-rose-500 animate-pulse bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-md">مجموع مبالغ دستی بیشتر از کل پرداختی است!</p>}
              </div>
            </div>

          </form>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}