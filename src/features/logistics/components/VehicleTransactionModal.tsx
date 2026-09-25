import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle, Banknote, FileSignature, UploadCloud, Trash2, Image as ImageIcon,
  ClipboardPaste, AlignLeft, PieChart, ArrowDownRight, ArrowUpRight,
  Truck, Wrench, Building2, Layers, Plus, SplitSquareHorizontal, Users,
  Archive, RefreshCcw, AlertTriangle, Combine, Split, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

import { useFinanceStore } from '../../../store/financeStore';
import type { ChequeStatus, ChequeHistory, TransactionAllocation } from '../../../store/financeStore';
import { useProjectStore } from '../../projects/store/projectStore'; 
import { useClientStore } from '../../../store/clientStore';
import { useLaborStore } from '../../../store/laborStore';

import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import GlassSelect from '../../../components/ui/GlassSelect';

const formatAmount = (value: string) => value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const parseAmount = (val?: string) => Number((val || '0').replace(/,/g, ''));

const transactionSchema = z.object({
  amount: z.string().optional(),
  totalAmount: z.string().optional(),
  cashAmount: z.string().optional(),
  date: z.string().min(1, 'تاریخ الزامی است'),
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

// تابع کمکی برای نام کامل کارفرما
const getClientName = (c: any) => `${c.name || ''} ${c.lastName || ''}`.trim();

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(800 / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else reject(new Error('خطا در فشرده‌سازی'));
      };
    };
  });
};

const bankOptions = [
  { value: 'بانک ملی', label: 'بانک ملی ایران' }, { value: 'بانک ملت', label: 'بانک ملت' },
  { value: 'بانک صادرات', label: 'بانک صادرات' }, { value: 'بانک تجارت', label: 'بانک تجارت' },
  { value: 'بانک سپه', label: 'بانک سپه' }, { value: 'بانک سامان', label: 'بانک سامان' }
];

const chequeStatusOptions = [
  { value: 'PENDING', label: 'در انتظار وصول' },
  { value: 'CASHED', label: 'پاس شده (وصول)' },
  { value: 'BOUNCED', label: 'برگشت خورده' },
  { value: 'RETURNED', label: 'عودت داده شده' },
  { value: 'EXCHANGED', label: 'تعویض شده' },
];

const RichItemSelect = ({ options, value, onChange, placeholder, disabled }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o: any) => o.id === value);

  return (
    <div className="relative w-full" ref={ref}>
      <div onClick={() => !disabled && setIsOpen(!isOpen)} className={`w-full h-[46px] bg-white dark:bg-slate-800 border ${disabled ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-700' : 'cursor-pointer border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-400'} rounded-xl px-4 flex items-center justify-between transition-colors shadow-inner`}>
        {selected ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`p-1 rounded-md ${selected.direction === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {selected.direction === 'IN' ? <Truck className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{selected.title}</span>
          </div>
        ) : <span className="text-sm font-medium text-slate-400">{placeholder}</span>}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-[calc(100%+8px)] left-0 w-full max-h-[250px] overflow-y-auto modal-scrollbar bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-[0_15px_40px_rgba(0,0,0,0.15)] rounded-2xl z-[100] py-2 flex flex-col">
            
            <div onClick={() => { onChange(''); setIsOpen(false); }} className="p-3 text-sm font-bold text-slate-500 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
              ثبت دستی (بدون انتخاب از لیست معوقات)
            </div>

            {options.map((opt: any) => (
              <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} className={`flex flex-col p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0 ${value === opt.id ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200">{opt.title}</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md ${opt.direction === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`} dir="ltr">{(opt.amount || 0).toLocaleString('fa-IR')} تومان</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                  {opt.projectName && <span className="flex items-center gap-1"><Layers className="w-3 h-3"/> {opt.projectName}</span>}
                  {opt.clientName && <span className="flex items-center gap-1"><Building2 className="w-3 h-3"/> {opt.clientName}</span>}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface AllocationRow {
  id: string;
  amount: number;
  type: 'FREIGHT' | 'REPAIR' | 'INSURANCE' | 'WAGE' | 'INCIDENTAL';
  recordId: string; 
  clientId?: string;  
  projectId?: string; 
  driverId?: string;
  driverShareAmount?: number; 
  isWageDeducted?: boolean;    
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  editData?: any;
}

export default function VehicleTransactionModal({ isOpen, onClose, vehicleId, editData }: Props) {
  
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setPortalTarget(document.body); }, []);

  const { addTransaction, updateTransaction, changeChequeStatus, exchangeChequeForCash } = useFinanceStore();
  const allProjects = useProjectStore(state => state.projects) || [];
  const allClients = useClientStore(state => state.clients) || [];
  const laborStoreData = useLaborStore(state => state.laborers || (state as any).logs || []);
  const drivers = Array.isArray(laborStoreData) ? laborStoreData : [];

  const [txDirection, setTxDirection] = useState<'IN' | 'OUT'>('IN');
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [isAggregated, setIsAggregated] = useState(true);

  type SpecialMode = 'NORMAL' | 'EXCHANGING' | 'CASHING';
  const [specialMode, setSpecialMode] = useState<SpecialMode>('NORMAL');
  const [pendingHistory, setPendingHistory] = useState<ChequeHistory[]>([]);

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: 'CASH', attachments: [] },
  });

  const payMethodType = watch('type');
  const txAttachments = watch('attachments') || [];
  const selectedStatus = watch('status');

  const pendingRecords = useMemo(() => [
    { id: 'REC-1', title: 'کرایه بار میلگرد (اصفهان)', type: 'FREIGHT', direction: 'IN', amount: 12500000, projectId: allProjects[0]?.id, clientId: allProjects[0]?.clientId, defaultDriverId: drivers[0]?.id, defaultShare: 2000000 },
    { id: 'REC-2', title: 'فاکتور تعویض روغن و فیلتر', type: 'REPAIR', direction: 'OUT', amount: 2300000 },
    { id: 'REC-3', title: 'کرایه حمل خاک', type: 'FREIGHT', direction: 'IN', amount: 4500000, clientId: allClients[0]?.id },
    { id: 'REC-4', title: 'بیمه بدنه خودرو', type: 'INSURANCE', direction: 'OUT', amount: 15000000 },
    { id: 'REC-5', title: 'حقوق معوقه راننده (تستی)', type: 'WAGE', direction: 'OUT', amount: 6500000, defaultDriverId: drivers[0]?.id },
  ], [allProjects, allClients, drivers]);

  useEffect(() => {
    if (!editData) {
      const sum = allocations.reduce((acc, row) => acc + (row.amount || 0), 0);
      if (sum > 0) {
        if (payMethodType === 'COMBINED') setValue('totalAmount', formatAmount(sum.toString()));
        else setValue('amount', formatAmount(sum.toString()));
      }
    }
  }, [allocations, payMethodType, editData, setValue]);

  const resetToNormal = () => {
    setSpecialMode('NORMAL');
    setPendingHistory([]);

    if (editData) {
      setTxDirection(editData.direction);
      const mappedAllocations = (editData.allocations || []).map((a: any) => ({
        id: a.id, amount: a.amount, type: a.description || 'FREIGHT', clientId: a.clientId || '', projectId: a.projectId || '', recordId: a.recordId || ''
      }));
      setAllocations(mappedAllocations.length > 0 ? mappedAllocations : [{ id: crypto.randomUUID(), amount: editData.amount, type: editData.direction === 'IN' ? 'FREIGHT' : 'REPAIR', recordId: '' }]);
      
      reset({
        amount: formatAmount(editData.amount.toString()),
        date: editData.date, type: editData.type, description: editData.description || '', attachments: editData.attachments || [], textReceipt: editData.textReceipt || '', 
        issuer: editData.chequeDetails?.issuer || '', sayyadId: editData.chequeDetails?.sayyadId || '', serialNumber: editData.chequeDetails?.serialNumber || '',
        series: editData.chequeDetails?.series || '', bank: editData.chequeDetails?.bank || '', issueDate: editData.chequeDetails?.issueDate || '', 
        dueDate: editData.chequeDetails?.dueDate || '', status: editData.chequeDetails?.status || 'PENDING',
      });
    } else {
      setAllocations([{ id: crypto.randomUUID(), amount: 0, type: 'FREIGHT', recordId: '' }]); 
      setTxDirection('IN');
      setIsAggregated(true);
      reset({ type: 'CASH', attachments: [], status: 'PENDING', date: new Date().toLocaleDateString('fa-IR'), amount: '' });
    }
  };

  useEffect(() => { if (isOpen) resetToNormal(); }, [isOpen, editData]);

  const updateAllocationRow = (id: string, field: keyof AllocationRow, value: any) => {
    setAllocations(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: value };

      if (txDirection === 'IN') {
        if (field === 'projectId' && value) {
          const proj = allProjects.find(p => p.id === value);
          if (proj) { updated.clientId = proj.clientId; updated.recordId = ''; }
        }
        if (field === 'clientId') { updated.projectId = ''; updated.recordId = ''; }
      }

      if (txDirection === 'OUT') {
        if (field === 'type') {
          updated.recordId = ''; 
          updated.driverId = '';
        }
      }

      if (field === 'recordId' && value) {
        const record = pendingRecords.find(r => r.id === value);
        if (record) {
          updated.amount = record.amount;
          updated.type = record.type as any;
          if (txDirection === 'IN') {
            if (record.projectId) {
              updated.projectId = record.projectId;
              const p = allProjects.find(pr => pr.id === record.projectId);
              if (p) updated.clientId = p.clientId;
            } else if (record.clientId) {
              updated.clientId = record.clientId;
            }
            if (record.defaultShare) {
              updated.driverShareAmount = record.defaultShare;
              updated.isWageDeducted = true; 
            }
            if (record.defaultDriverId) updated.driverId = record.defaultDriverId;
          }
          if (txDirection === 'OUT' && record.type === 'WAGE') {
            if (record.defaultDriverId) updated.driverId = record.defaultDriverId;
          }
        }
      }

      return updated;
    }));
  };

  const handleAddAllocation = () => {
    setAllocations([...allocations, { id: crypto.randomUUID(), amount: 0, type: txDirection === 'IN' ? 'FREIGHT' : 'REPAIR', recordId: '' }]);
  };

  const handleRemoveAllocation = (id: string) => {
    if (allocations.length > 1) setAllocations(allocations.filter(a => a.id !== id));
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
    if (!editData || !editData.chequeDetails) return;
    const snapshotData = {
      bank: watch('bank'), serialNumber: watch('serialNumber'), issuer: watch('issuer'), sayyadId: watch('sayyadId'),
      series: watch('series'), dueDate: watch('dueDate'), issueDate: watch('issueDate'), amount: parseAmount(watch('amount')),
      attachments: txAttachments, textReceipt: watch('textReceipt'), description: watch('description')
    };
    const newRecord: ChequeHistory = {
        id: crypto.randomUUID(), date: new Date().toLocaleDateString('fa-IR'), previousStatus: editData.chequeDetails.status, 
        newStatus: 'EXCHANGED', description: 'بایگانی جهت تعویض با چک جایگزین', attachments: [], snapshot: snapshotData
    };
    setPendingHistory([newRecord]);
    setSpecialMode('EXCHANGING');
    setValue('serialNumber', ''); setValue('bank', ''); setValue('dueDate', ''); setValue('issueDate', ''); setValue('sayyadId', ''); setValue('series', ''); setValue('attachments', []); setValue('status', 'PENDING');
    setValue('description', `چک جایگزین بابت تعویض چک قبلی (سریال ${editData.chequeDetails.serialNumber})`);
  };

  const handlePrepareCashing = () => {
    if (!editData) return;
    setSpecialMode('CASHING');
    setValue('type', 'CASH');
    setValue('description', `دریافت نقدی به جای چک (سریال ${editData.chequeDetails?.serialNumber || 'نامشخص'})`);
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
      if (editData && specialMode === 'CASHING') {
        exchangeChequeForCash(editData.id, rawAmount, data.date, data.description || 'تبدیل چک به وجه نقد', data.attachments);
        toast.success('تراکنش نقدی ثبت شد و چک قبلی بایگانی گردید.');
        onClose(); return;
      }

      let finalAllocations: any[] = [];
      let extraTransactions: any[] = []; 

      allocations.forEach(row => {
        if (!row.amount) return;
        finalAllocations.push({
          id: row.id, amount: row.amount, allocationType: row.projectId ? 'PROJECT' : row.clientId ? 'FREELANCE' : 'NONE',
          projectId: row.projectId || undefined, clientId: row.clientId || undefined, recordType: 'LOGISTICS', recordId: row.recordId || vehicleId, description: row.type
        });

        if (txDirection === 'IN' && row.isWageDeducted && row.driverShareAmount && row.driverShareAmount > 0 && row.driverId) {
          extraTransactions.push({
            referenceId: vehicleId, direction: 'OUT', type: 'CASH', amount: row.driverShareAmount, date: data.date, description: `کسر دستمزد راننده بابت کرایه`, status: 'COMPLETED',
            allocations: [
              { id: crypto.randomUUID(), amount: row.driverShareAmount, recordType: 'LOGISTICS', recordId: vehicleId, description: 'WAGE_DEDUCTION' },
              { id: crypto.randomUUID(), amount: row.driverShareAmount, recordType: 'LABOR', recordId: row.driverId, description: 'WAGE' }
            ]
          });
        }
        
        if (txDirection === 'OUT' && row.type === 'WAGE' && row.driverId) {
          finalAllocations.push({ id: crypto.randomUUID(), amount: row.amount, allocationType: 'FREELANCE', recordType: 'LABOR', recordId: row.driverId, description: 'WAGE' });
        }
      });

      const basePayload: any = { 
        referenceId: vehicleId, allocations: finalAllocations, date: data.date, direction: txDirection, description: data.description, type: data.type, attachments: data.attachments, textReceipt: data.textReceipt 
      };

      const finalHistory = [...(editData?.chequeDetails?.history || []), ...pendingHistory];
      const chequeData = { issuer: data.issuer, sayyadId: data.sayyadId, serialNumber: data.serialNumber, series: data.series, bank: data.bank, issueDate: data.issueDate, dueDate: data.dueDate, status: data.status as ChequeStatus || 'PENDING', history: finalHistory };

      if (editData) {
        if (editData.type === 'CHEQUE' && data.status !== editData.chequeDetails?.status) {
          changeChequeStatus(editData.id, data.status as ChequeStatus, data.description || 'تغییر وضعیت', data.date, data.attachments);
        }
        updateTransaction(editData.id, { ...basePayload, amount: rawAmount, ...(data.type === 'CHEQUE' && { chequeDetails: chequeData }) });
        toast.success(specialMode === 'EXCHANGING' ? 'چک جایگزین در سیستم ثبت شد.' : 'تراکنش با موفقیت ویرایش شد.');
      } else {
        const newIdBase = crypto.randomUUID(); 
        
        if (!isAggregated && allocations.length > 1) {
          allocations.forEach(alloc => {
            if (alloc.amount > 0) {
              const itemTitle = pendingRecords.find(p => p.id === alloc.recordId)?.title || '';
              addTransaction({
                id: crypto.randomUUID(), referenceId: vehicleId, direction: txDirection, type: data.type, amount: alloc.amount, date: data.date,
                description: `بابت: ${itemTitle} ${data.description ? ' - ' + data.description : ''}`, status: data.type === 'CHEQUE' ? 'PENDING' : 'COMPLETED', ...(data.type === 'CHEQUE' && { chequeDetails: chequeData }),
                allocations: [{ id: crypto.randomUUID(), amount: alloc.amount, allocationType: alloc.projectId ? 'PROJECT' : alloc.clientId ? 'FREELANCE' : 'NONE', projectId: alloc.projectId || undefined, clientId: alloc.clientId || undefined, recordType: 'LOGISTICS', recordId: alloc.recordId || vehicleId, description: alloc.type }]
              } as any);
            }
          });
          toast.success(`${allocations.length} تراکنش تفکیکی ثبت شد.`);
        } else {
          if (data.type === 'COMBINED') {
            addTransaction({ ...basePayload, id: newIdBase + '-1', amount: rawCash, type: 'CASH', description: (data.description || 'تراکنش ترکیبی') + ' (نقدی)', status: 'COMPLETED' } as any);
            addTransaction({ ...basePayload, id: newIdBase + '-2', amount: rawAmount, type: 'CHEQUE', description: (data.description || 'تراکنش ترکیبی') + ' (چک)', chequeDetails: chequeData, status: 'PENDING' } as any);
          } else {
            addTransaction({ ...basePayload, id: newIdBase, amount: rawAmount, status: data.type === 'CHEQUE' ? 'PENDING' : 'COMPLETED', ...(data.type === 'CHEQUE' && { chequeDetails: chequeData }) } as any);
          }
          toast.success('تراکنش و تخصیص‌ها با موفقیت در شبکه ثبت شدند.');
        }

        extraTransactions.forEach(tx => addTransaction(tx));
      }
      onClose();
    } catch (error) { toast.error('خطا در ثبت اطلاعات'); }
  };

  const isStatusChanged = specialMode === 'NORMAL' && editData && editData.type === 'CHEQUE' && selectedStatus !== editData.chequeDetails?.status;

  if (!isOpen || !portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999999] overflow-y-auto modal-scrollbar" dir="rtl">
        <div className="flex min-h-full items-start justify-center p-4 sm:p-8 pt-10 pb-24 relative">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" />
          
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative z-[9999999] w-full max-w-5xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-3xl bg-white/95 dark:bg-slate-900/95 border border-white/40 dark:border-slate-700/50 p-6 sm:p-10 overflow-visible">
            <button onClick={onClose} className="absolute top-6 left-6 p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-colors z-10"><X className="w-5 h-5 text-slate-700 dark:text-slate-300" /></button>

            <div className="mb-10 text-center flex flex-col items-center border-b border-slate-200/50 dark:border-slate-700/50 pb-6 relative">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-4 shadow-inner ${txDirection === 'IN' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}>
                {txDirection === 'IN' ? <Truck className="w-8 h-8 drop-shadow-md" /> : <Wrench className="w-8 h-8 drop-shadow-md" />}
              </div>
              <h2 className={`text-2xl sm:text-3xl font-black bg-clip-text text-transparent drop-shadow-sm tracking-tight ${txDirection === 'IN' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-rose-600 to-pink-600'}`}>
                {editData ? 'ویرایش تراکنش خودرو' : 'ثبت تراکنش و تسویه هوشمند'}
              </h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-full relative z-[105]">
                <button type="button" disabled={!!editData} onClick={() => { setTxDirection('IN'); setAllocations([{ id: crypto.randomUUID(), amount: 0, type: 'FREIGHT', recordId: '' }]); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${txDirection === 'IN' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400 disabled:opacity-50 hover:text-slate-700'} `}><ArrowDownRight className="w-4 h-4"/> دریافت کرایه ماشین (درآمد)</button>
                <button type="button" disabled={!!editData} onClick={() => { setTxDirection('OUT'); setAllocations([{ id: crypto.randomUUID(), amount: 0, type: 'REPAIR', recordId: '' }]); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${txDirection === 'OUT' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-400 disabled:opacity-50 hover:text-slate-700'} `}><ArrowUpRight className="w-4 h-4"/> ثبت هزینه‌های ماشین (خرج‌کرد)</button>
              </div>

              <AnimatePresence>
                {editData && editData.type === 'CHEQUE' && specialMode === 'NORMAL' && (
                  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-4 bg-gradient-to-r from-indigo-50 to-cyan-50 dark:from-indigo-900/20 dark:to-cyan-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-500/30 mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm"><Archive className="w-5 h-5 text-indigo-500"/></div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white">عملیات پیشرفته چک</h4>
                        <p className="text-xs font-bold text-slate-500">نقد کردن یا تعویض این چک با چک جدید (بایگانی خودکار در تاریخچه)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button type="button" onClick={handlePrepareCashing} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"><Banknote className="w-4 h-4"/> دریافت نقدی این چک</button>
                      <button type="button" onClick={handlePrepareExchange} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl text-xs font-bold transition-all shadow-sm"><RefreshCcw className="w-4 h-4"/> تعویض با چک جدید</button>
                    </div>
                  </motion.div>
                )}
                {specialMode !== 'NORMAL' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${specialMode === 'EXCHANGING' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    <div className="flex items-center gap-2 font-black text-sm"><AlertTriangle className="w-5 h-5 animate-pulse"/> {specialMode === 'EXCHANGING' ? 'در حال ثبت چک جدید جایگزین. چک قبلی به بایگانی منتقل خواهد شد.' : 'در حال ثبت دریافت نقدی. چک قبلی به بایگانی منتقل خواهد شد.'}</div>
                    <button type="button" onClick={resetToNormal} className="px-4 py-2 bg-white rounded-xl text-xs font-bold shadow-sm">انصراف از عملیات</button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-[100] bg-indigo-50/30 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800/30">
                <div className="space-y-3 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">نوع تسویه / پرداخت</label>
                  <div className="flex p-1.5 bg-white/60 dark:bg-black/20 rounded-2xl backdrop-blur-md border border-white/50 dark:border-slate-700/50 shadow-inner">
                    <button type="button" disabled={editData && specialMode === 'NORMAL'} onClick={() => setValue('type', 'CASH')} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${payMethodType === 'CASH' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'} `}><Banknote className="w-4 h-4 hidden sm:block"/>نقدی/حواله</button>
                    <button type="button" disabled={editData && specialMode === 'NORMAL'} onClick={() => setValue('type', 'CHEQUE')} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${payMethodType === 'CHEQUE' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'} `}><FileSignature className="w-4 h-4 hidden sm:block"/>چک بانکی</button>
                    <button type="button" disabled={editData && specialMode === 'NORMAL'} onClick={() => setValue('type', 'COMBINED')} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${payMethodType === 'COMBINED' ? 'bg-fuchsia-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'} `}><PieChart className="w-4 h-4 hidden sm:block"/>ترکیبی</button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {payMethodType !== 'COMBINED' ? (
                    <motion.div key="single" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 relative">
                      <label className="text-sm font-bold ml-1 text-slate-700 dark:text-slate-300">مبلغ کل تراکنش (تومان) - قابل ویرایش *</label>
                      <input {...register('amount', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} className={`w-full bg-white dark:bg-slate-800 border rounded-2xl px-4 py-3.5 outline-none font-black text-xl text-left text-indigo-600 dark:text-indigo-400 shadow-inner ${errors.amount ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'}`} placeholder="0" dir="ltr" />
                    </motion.div>
                  ) : (
                    <motion.div key="combined" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 md:col-span-2 bg-fuchsia-50/50 dark:bg-fuchsia-900/10 border border-fuchsia-200 dark:border-fuchsia-800/50 p-4 rounded-2xl">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300 ml-1">جمع کل (نقد + چک) *</label>
                        <input {...register('totalAmount', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 outline-none font-black text-lg text-fuchsia-600 text-left shadow-inner" placeholder="0" dir="ltr" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">مبلغ نقدی</label>
                          <input {...register('cashAmount', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-3 py-2 outline-none font-bold text-slate-800 text-left shadow-inner" placeholder="0" dir="ltr" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">مبلغ چک</label>
                          <input {...register('amount', { onChange: (e) => e.target.value = formatAmount(e.target.value) })} className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-3 py-2 outline-none font-bold text-slate-800 text-left shadow-inner" placeholder="0" dir="ltr" />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-center pt-2 border-t border-fuchsia-200 dark:border-fuchsia-800/50 mt-2">
                        <button type="button" onClick={handleSplit5050} className="px-3 py-1.5 text-[10px] font-bold bg-fuchsia-100 text-fuchsia-700 rounded-lg hover:bg-fuchsia-200 transition-colors">تقسیم ۵۰/۵۰</button>
                        <button type="button" onClick={handleRemainderToCash} className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">الباقی به نقد</button>
                        <button type="button" onClick={handleRemainderToCheque} className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">الباقی به چک</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2 relative z-50">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">تاریخ عملیات</label>
                  <Controller control={control} name="date" render={({ field: { onChange, value } }) => (
                    <GlassDatePicker value={value} onChange={onChange} hasError={!!errors.date} />
                  )} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">تخصیص‌ها و جزئیات تسویه</h3>
                  <button type="button" onClick={handleAddAllocation} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 shadow-md transition-all active:scale-95">
                    <Plus className="w-4 h-4"/> افزودن ردیف
                  </button>
                </div>

                <AnimatePresence>
                  {allocations.map((alloc, index) => {
                    const availableItems = pendingRecords.filter(item => {
                      if (item.direction !== txDirection) return false;
                      if (txDirection === 'IN') {
                        if (alloc.clientId && item.clientId && item.clientId !== alloc.clientId) return false;
                        if (alloc.projectId && item.projectId && item.projectId !== alloc.projectId) return false;
                      } else {
                        if (item.type !== alloc.type) return false;
                      }
                      return true;
                    }).map(item => ({
                      ...item,
                      projectName: allProjects.find(p => p.id === item.projectId)?.name,
                      clientName: getClientName(allClients.find(c => c.id === item.clientId) || {})
                    }));

                    const expenseTypeLabel = alloc.type === 'REPAIR' ? 'تعمیرات' : alloc.type === 'INSURANCE' ? 'بیمه' : alloc.type === 'WAGE' ? 'حقوق' : 'جانبی';

                    return (
                      <motion.div key={alloc.id} style={{ zIndex: 100 - index }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={`bg-white dark:bg-slate-800 border rounded-2xl p-5 shadow-sm relative z-40 ${txDirection === 'IN' ? 'border-emerald-200 dark:border-emerald-700' : 'border-rose-200 dark:border-rose-700'}`}>
                        {allocations.length > 1 && <button type="button" onClick={() => handleRemoveAllocation(alloc.id)} className="absolute top-4 left-4 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors z-[100]"><Trash2 className="w-4 h-4"/></button>}
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-2 relative z-10">
                          
                          {txDirection === 'IN' && (
                            <div className="md:col-span-12 p-4 bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-500/30 rounded-xl mb-2">
                              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 mb-3"><Building2 className="w-3.5 h-3.5" /> ارتباط با کارفرما و پروژه</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 z-50 relative">
                                <div className="z-[55] space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-500">کارفرما</label>
                                  <GlassSelect options={[{value:'', label:'آزاد (بدون کارفرما)'}, ...allClients.map(c => ({value: c.id, label: getClientName(c)}))]} value={alloc.clientId || ''} onChange={(v) => updateAllocationRow(alloc.id, 'clientId', v)} placeholder="انتخاب کارفرما" />
                                </div>
                                <div className="z-50 space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-500">پروژه (خودکار کارفرما را ست می‌کند)</label>
                                  <GlassSelect options={[{value:'', label:'آزاد (بدون پروژه)'}, ...allProjects.filter(p => !alloc.clientId || p.clientId === alloc.clientId).map(p => ({value: p.id, label: p.name}))]} value={alloc.projectId || ''} onChange={(v) => updateAllocationRow(alloc.id, 'projectId', v)} placeholder="انتخاب پروژه" disabled={alloc.clientId && !allProjects.some(p => p.clientId === alloc.clientId)} />
                                </div>
                              </div>
                            </div>
                          )}

                          {txDirection === 'OUT' && (
                            <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-4 z-50 relative mb-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                              <div className="space-y-1.5 z-50 sm:col-span-2">
                                <label className="text-[10px] font-bold text-rose-600">دسته‌بندی خرج‌کرد ماشین</label>
                                <GlassSelect options={[{value:'REPAIR', label:'تعمیرات و قطعات'}, {value:'INSURANCE', label:'بیمه ماشین'}, {value:'WAGE', label:'پرداخت حقوق راننده'}, {value:'INCIDENTAL', label:'هزینه‌های جانبی'}]} value={alloc.type || 'REPAIR'} onChange={(v) => updateAllocationRow(alloc.id, 'type', v)} placeholder="نوع هزینه" />
                              </div>
                              {alloc.type === 'WAGE' && (
                                <div className="space-y-1.5 z-[45] sm:col-span-2">
                                  <label className="text-[10px] font-bold text-indigo-500">راننده دریافت‌کننده حقوق</label>
                                  <GlassSelect options={drivers.map((d:any) => ({value: d.id, label: d.name || d.fullName || 'راننده'}))} value={alloc.driverId || ''} onChange={(v) => updateAllocationRow(alloc.id, 'driverId', v)} placeholder="انتخاب راننده" />
                                </div>
                              )}
                            </div>
                          )}

                          <div className="space-y-1.5 md:col-span-8 z-[45]">
                            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Layers className="w-3 h-3"/> انتخاب {txDirection === 'IN' ? 'بارنامه معوقه' : `فاکتور معوقه (${expenseTypeLabel})`}</label>
                            <RichItemSelect options={availableItems} value={alloc.recordId || ''} onChange={(v: string) => updateAllocationRow(alloc.id, 'recordId', v)} placeholder={txDirection === 'IN' ? "انتخاب بارنامه..." : `انتخاب فاکتور ${expenseTypeLabel} پرداخت‌نشده...`} />
                          </div>

                          <div className="space-y-1.5 md:col-span-4 z-40">
                            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">مبلغ تسویه این ردیف (تومان)</label>
                            <input value={alloc.amount ? formatAmount(alloc.amount.toString()) : ''} onChange={(e) => updateAllocationRow(alloc.id, 'amount', parseAmount(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 h-[46px] outline-none focus:border-indigo-400 font-black text-lg text-left text-indigo-600 dark:text-indigo-400 shadow-inner" dir="ltr" placeholder="0" />
                          </div>

                          {txDirection === 'IN' && (
                            <div className="md:col-span-12 mt-2 pt-4 border-t border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 rounded-xl">
                              <div className="flex items-center justify-between mb-3">
                                <label className="text-xs font-bold text-rose-600 flex items-center gap-1.5 cursor-pointer">
                                  <input type="checkbox" checked={alloc.isWageDeducted || false} onChange={(e) => updateAllocationRow(alloc.id, 'isWageDeducted', e.target.checked)} className="w-4 h-4 rounded text-rose-600 accent-rose-500" />
                                  <span>احتساب و کسر خودکار دستمزد راننده از این کرایه (ثبت اتوماتیک در حساب راننده)</span>
                                </label>
                                <Users className="w-4 h-4 text-rose-500"/>
                              </div>

                              {alloc.isWageDeducted && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 z-[35] relative">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 block mb-1">انتخاب راننده سرویس</label>
                                    <GlassSelect options={drivers.map((d:any) => ({value: d.id, label: d.name || d.fullName || 'راننده'}))} value={alloc.driverId || ''} onChange={(v) => updateAllocationRow(alloc.id, 'driverId', v)} placeholder="راننده" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 block mb-1">مبلغ دستمزد سرویسی (تومان)</label>
                                    <input value={alloc.driverShareAmount ? formatAmount(alloc.driverShareAmount.toString()) : ''} onChange={(e) => updateAllocationRow(alloc.id, 'driverShareAmount', parseAmount(e.target.value))} className="w-full h-[46px] bg-white dark:bg-slate-800 border border-rose-200 rounded-xl px-3 outline-none font-black text-xs text-left shadow-inner" dir="ltr" placeholder="مبلغ سهم" />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                <AnimatePresence>
                  {allocations.length > 1 && !editData && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-500/30 rounded-2xl mt-4">
                      <span className="text-sm font-bold text-indigo-800 dark:text-indigo-300">نحوه ثبت تراکنش‌ها در تاریخچه:</span>
                      <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={() => setIsAggregated(true)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${isAggregated ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}><Combine className="w-4 h-4" /> تجمیعی (یک فیش)</button>
                        <button type="button" onClick={() => setIsAggregated(false)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${!isAggregated ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}><Split className="w-4 h-4" /> تفکیکی (مجزا)</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {(payMethodType === 'CHEQUE' || payMethodType === 'COMBINED') && (
                  <motion.div initial={{ opacity: 0, height: 0, overflow: 'hidden' }} animate={{ opacity: 1, height: 'auto', overflow: 'visible' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }}>
                    <div className="p-6 rounded-[2rem] bg-cyan-500/5 border border-cyan-500/20 shadow-inner space-y-6">
                      <div className="flex items-center gap-2 mb-2"><FileSignature className="w-5 h-5 text-cyan-500"/><h3 className="text-sm font-black text-slate-800 dark:text-white">مشخصات چک</h3></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        {/* 💡 فیلد وضعیت چک که حالا همیشه نمایش داده میشه */}
                        {specialMode === 'NORMAL' && (
                          <div className="space-y-2 relative md:col-span-2 z-[45]">
                            <label className="text-xs font-bold text-slate-600 flex justify-between">وضعیت چک {isStatusChanged && <span className="text-rose-500 animate-pulse">ذخیره در بایگانی!</span>}</label>
                            <Controller control={control} name="status" render={({ field }) => (<GlassSelect options={chequeStatusOptions} value={field.value || 'PENDING'} onChange={field.onChange} placeholder="وضعیت..." />)} />
                          </div>
                        )}
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-600">صادرکننده چک</label><input {...register('issuer')} className="w-full bg-white/60 border border-white/40 rounded-2xl px-4 py-3.5 outline-none" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-600">شناسه صیاد</label><input {...register('sayyadId')} className="w-full bg-white/60 border border-white/40 rounded-2xl px-4 py-3.5 outline-none tracking-widest font-mono text-left" dir="ltr" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-600">شماره سریال چک *</label><input {...register('serialNumber')} className={`w-full bg-white/60 border rounded-2xl px-4 py-3.5 outline-none font-mono text-left ${errors.serialNumber ? 'border-rose-500' : 'border-slate-200'}`} dir="ltr" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-600">سری چک</label><input {...register('series')} className="w-full bg-white/60 border border-white/40 rounded-2xl px-4 py-3.5 outline-none font-mono text-left" dir="ltr" /></div>
                        <div className="space-y-2 relative z-[90]"><label className="text-xs font-bold text-slate-600">بانک *</label><Controller control={control} name="bank" render={({ field }) => (<GlassSelect options={bankOptions} value={field.value || ''} onChange={field.onChange} placeholder="انتخاب بانک" hasError={!!errors.bank} />)} /></div>
                        <div className="space-y-2 relative md:col-span-2 border-t border-cyan-500/20 pt-4 z-[80]"><label className="text-xs font-bold text-slate-600">تاریخ سررسید (وصول) *</label><Controller control={control} name="dueDate" render={({ field: { onChange, value } }) => (<GlassDatePicker value={value} onChange={onChange} hasError={!!errors.dueDate} />)} /></div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-30 pt-4 border-t border-slate-200/50">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-indigo-500"/>مدارک ضمیمه</label>
                  <div className="flex flex-wrap gap-4">
                    {txAttachments.length < 2 && (
                      <div className="relative border-2 border-dashed border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-2xl w-full sm:w-48 h-36 flex flex-col items-center justify-center group cursor-pointer transition-colors">
                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <UploadCloud className="w-8 h-8 text-indigo-400 mb-3" />
                        <span className="text-xs font-bold text-indigo-600">آپلود عکس مدرک</span>
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
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 flex items-center gap-2"><AlignLeft className="w-4 h-4 text-indigo-500"/>رسید متنی</label>
                    <button type="button" onClick={handlePasteText} className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-600 rounded-xl"><ClipboardPaste className="w-3.5 h-3.5" /> جایگذاری پیامک</button>
                  </div>
                  <textarea {...register('textReceipt')} className="w-full flex-1 bg-white/60 dark:bg-black/20 border border-white/40 rounded-2xl px-4 py-3.5 outline-none resize-none min-h-[144px] text-sm" placeholder="توضیحات یا کپی پیامک بانکی..." />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">شرح کلی و بابت (اختیاری)</label>
                <input {...register('description')} className="w-full bg-white/60 dark:bg-black/20 border border-white/40 dark:border-slate-700/50 rounded-2xl px-4 py-3.5 outline-none font-medium" placeholder="توضیحات تکمیلی تراکنش..." />
              </div>

              <div className="pt-6 border-t border-slate-200/50 dark:border-slate-700/50 mt-4 relative z-30">
                <button type="submit" disabled={isSubmitting} className={`w-full disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.2)] active:scale-95 transition-transform flex items-center justify-center gap-2 group relative overflow-hidden ${txDirection === 'IN' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-rose-500 to-pink-600'}`}>
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  {isSubmitting ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="relative z-10">{allocations.length > 1 && !isAggregated ? `ثبت ${allocations.length} تراکنش تفکیکی در سیستم` : 'تایید و ثبت نهایی در حساب‌ها'}</span><CheckCircle className="w-5 h-5 relative z-10" /></>}
                </button>
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