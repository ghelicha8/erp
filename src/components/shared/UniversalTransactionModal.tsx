import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Banknote, FileSignature, UploadCloud, Trash2, Image as ImageIcon,
  ClipboardPaste, AlignLeft, Layers, Wallet, Plus, SplitSquareHorizontal,
  Wrench, ShieldAlert, Settings, FileText, Users, Handshake, Truck,
  CheckCircle2, Clock, Sparkles, Building2, UserSquare, Calendar, ChevronDown,
  Lock, ArrowRight, CornerDownLeft, ShieldCheck, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useFinanceStore } from '../../store/financeStore';
import type { ChequeStatus, ChequeHistory, TransactionAllocation } from '../../store/financeStore';
import { useProjectStore } from '../../features/projects/store/projectStore';
import { useClientStore } from '../../store/clientStore';
import { useLaborStore } from '../../store/laborStore';
import { usePurchaseStore } from '../../store/purchaseStore';
import { useInvoiceStore } from '../../store/invoiceStore';
import { 
  useLogisticsStore, 
  REPAIR_TYPE_LABELS, 
  INSURANCE_TYPE_LABELS, 
  TOOL_RENTAL_UNIT_LABELS 
} from '../../store/logisticsStore';

import GlassDatePicker from '../ui/GlassDatePicker';
import { PortalSelect, AnimatedCheckbox } from '../ui/SharedLaborUI';
import { generateUUID } from '../../core/utils/uuid';
import { formatCurrency, getCurrencyUnit } from '../../core/utils/currency';

export type TransactionContext = 'PROJECT' | 'CLIENT' | 'LABOR' | 'VEHICLE' | 'TOOL' | 'SUPPLIER' | 'INVOICE' | 'INVENTORY' | 'CONTRACT' | 'GLOBAL';

export interface UniversalTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: TransactionContext;
  projectId?: string;
  clientId?: string;
  workerId?: string;
  vehicleId?: string;
  toolId?: string;
  supplierId?: string;
  invoiceId?: string;
  contractId?: string;
  initialDebtId?: string;
  initialAmount?: number;
  initialDirection?: 'IN' | 'OUT';
  editTransaction?: any | null;
  onSuccess?: (txId: string) => void;
}

export interface DebtAllocationItem {
  id: string; // unique key in table
  rawId: string;
  category: 'REPAIR' | 'INSURANCE' | 'PERIODIC' | 'MISC' | 'DRIVER_WAGE' | 'FREIGHT' | 'RENTAL' | 'PURCHASE' | 'LABOR' | 'INVOICE';
  categoryLabel: string;
  title: string;
  date: string;
  totalCost: number;
  paidAmount: number;
  remainingAmount: number;
  extraMeta?: any;
  sourceRecord?: any;
}

const BANK_OPTIONS = [
  { value: 'بانک ملت', label: 'بانک ملت' },
  { value: 'بانک ملی', label: 'بانک ملی ایران' },
  { value: 'بانک صادرات', label: 'بانک صادرات ایران' },
  { value: 'بانک تجارت', label: 'بانک تجارت' },
  { value: 'بانک سپه', label: 'بانک سپه' },
  { value: 'بانک سامان', label: 'بانک سامان' },
  { value: 'بانک پاسارگاد', label: 'بانک پاسارگاد' },
  { value: 'بانک پارسیان', label: 'بانک پارسیان' },
  { value: 'بانک آینده', label: 'بانک آینده' },
  { value: 'بانک شهر', label: 'بانک شهر' },
  { value: 'بانک رسالت', label: 'بانک قرض‌الحسنه رسالت' },
  { value: 'بانک مهر ایران', label: 'بانک قرض‌الحسنه مهر ایران' },
  { value: 'سایر بانک‌ها', label: 'سایر بانک‌ها' },
];

const CHEQUE_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'در جریان (در انتظار وصول)' },
  { value: 'CASHED', label: 'پاس شده (وصول قطعی)' },
  { value: 'BOUNCED', label: 'برگشت خورده' },
  { value: 'RETURNED', label: 'عودت داده شده' },
  { value: 'EXCHANGED', label: 'تعویض شده' },
];

const DESCRIPTION_PRESETS: Record<TransactionContext, string[]> = {
  VEHICLE: [
    'بابت هزینه تعمیرات و قطعات یدکی خودرو',
    'بابت حق بیمه شخص ثالث و بدنه خودرو',
    'بابت سرویس دوره‌ای و تعویض روغن ناوگان',
    'بابت دستمزد و کارکرد راننده',
    'بابت عوارض و هزینه‌های جانبی ناوگان',
    'تسویه حساب مطالبات و کارکرد باربری',
  ],
  TOOL: [
    'بابت تعمیرات و تعویض قطعات یدکی دستگاه',
    'بابت تعویض ذغال، اورهال و سرویس ابزار',
    'بابت دستمزد اپراتور ابزار / دستگاه',
    'بابت اجاره و کرایه ابزارآلات و تجهیزات',
    'بابت هزینه‌های جانبی و نگهداری دستگاه',
  ],
  LABOR: [
    'مساعده هفتگی / علی‌الحساب کارگری',
    'تسویه نهایی دستمزد و کارکرد پرسنل',
    'پرداخت پاداش، اضافه کاری و ایاب‌وذهاب',
    'سود آربیتراژ و مابه‌التفاوت کارفرما',
  ],
  PROJECT: [
    'تسویه صورت‌وضعیت مرحله‌ای پروژه',
    'پیش‌پرداخت قرارداد پیمانکاری',
    'خرید مصالح و فاکتور تامین‌کننده',
    'تسویه خدمات اجرایی و کارگاهی',
    'تنخواه گردان کارگاه و هزینه‌های جاری',
  ],
  CLIENT: [
    'دریافت پیش‌پرداخت مرحله‌ای از کارفرما',
    'تسویه صورت‌وضعیت و فاکتور نهایی',
    'دریافت مطالبات کرایه باربری و ماشین‌آلات',
    'دریافت علی‌الحساب اجرای پروژه',
  ],
  SUPPLIER: [
    'تسویه فاکتور خرید مصالح',
    'پیش‌پرداخت سفارش کالا به تامین‌کننده',
    'تسویه حساب قطعات و ابزار خریداری شده',
  ],
  INVOICE: [
    'تسویه کامل صورت‌حساب صادره',
    'پرداخت قسط صورت‌وضعیت',
  ],
  CONTRACT: [
    'دریافت قسط قرارداد و صورت‌وضعیت',
    'پرداخت پیش‌پرداخت قرارداد',
    'تسویه کارکرد مرحله‌ای و تاییدشده',
    'تسویه متمم قرارداد',
    'آزادسازی و استرداد سپرده حسن انجام کار',
  ],
  GLOBAL: [
    'واریز به حساب بانکی / صندوق',
    'تسویه بدهی معوقه',
    'پرداخت تنخواه گردان',
  ],
};

const formatNumber = (val: string | number | undefined) => {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/\D/g, '');
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const parseNumber = (val: string | number | undefined): number => {
  if (!val) return 0;
  const clean = String(val).replace(/\D/g, '');
  return Number(clean) || 0;
};

const compressImage = (file: File, maxWidth = 900, quality = 0.75): Promise<string> => {
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
        } else reject(new Error('Canvas context error'));
      };
    };
    reader.onerror = reject;
  });
};

export default function UniversalTransactionModal({
  isOpen,
  onClose,
  context,
  projectId,
  clientId,
  workerId,
  vehicleId,
  toolId,
  supplierId,
  invoiceId,
  contractId,
  initialDebtId,
  initialAmount,
  initialDirection,
  editTransaction,
  onSuccess
}: UniversalTransactionModalProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setPortalTarget(document.body); }, []);

  // Store hooks
  const { transactions, addTransaction, updateTransaction, changeChequeStatus } = useFinanceStore();
  const allProjects = useProjectStore(state => state.projects) || [];
  const allClients = useClientStore(state => state.clients) || [];
  const allWorkers = useLaborStore(state => state.workers) || [];
  const allLaborLogs = useLaborStore(state => state.logs) || [];
  const updateLaborLog = useLaborStore(state => state.updateLog);
  const { purchases: allPurchases, updatePurchase } = usePurchaseStore();
  const { invoices: allInvoices, updateInvoice } = useInvoiceStore();
  const {
    vehicles: allVehicles,
    tools: allTools,
    toolRentals: allToolRentals,
    repairs: allRepairs,
    insurances: allInsurances,
    periodicServices: allPeriodicServices,
    miscExpenses: allMiscExpenses,
    driverAssignments: allDriverAssignments,
    logs: allLogisticsLogs,
    updateRepair,
    updateInsurance,
    toggleInstallmentPaid,
    updatePeriodicService,
    updateMiscExpense,
    updateDriverAssignment,
    updateToolRental,
    updateLog: updateLogisticsLog
  } = useLogisticsStore();

  // Resolved entities & Smart Context Locking
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
  const [selectedClientId, setSelectedClientId] = useState<string>(clientId || '');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(workerId || '');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicleId || '');
  const [selectedToolId, setSelectedToolId] = useState<string>(toolId || '');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(supplierId || '');

  const effectiveVehicleId = vehicleId || selectedVehicleId || (context === 'VEHICLE' ? editTransaction?.referenceId : undefined);
  const effectiveToolId = toolId || selectedToolId || (context === 'TOOL' ? editTransaction?.referenceId : undefined);
  const effectiveWorkerId = workerId || selectedWorkerId || (context === 'LABOR' ? editTransaction?.referenceId : undefined);
  const effectiveProjectId = projectId || selectedProjectId || (context === 'PROJECT' ? editTransaction?.referenceId : undefined);
  const effectiveClientId = clientId || selectedClientId || (context === 'CLIENT' ? editTransaction?.clientId || editTransaction?.referenceId : undefined);
  const effectiveSupplierId = supplierId || selectedSupplierId || (context === 'SUPPLIER' ? editTransaction?.referenceId : undefined);

  const targetVehicle = allVehicles.find(v => v.id === effectiveVehicleId);
  const targetTool = allTools.find(t => t.id === effectiveToolId);
  const targetWorker = allWorkers.find(w => w.id === effectiveWorkerId);
  const targetProject = allProjects.find(p => p.id === effectiveProjectId);
  const targetClient = allClients.find(c => c.id === effectiveClientId);

  // Form State
  const defaultDir: 'IN' | 'OUT' = initialDirection 
    ? initialDirection 
    : (context === 'CLIENT' ? 'IN' : 'OUT');

  const [direction, setDirection] = useState<'IN' | 'OUT'>(defaultDir);
  const [paymentType, setPaymentType] = useState<'CASH' | 'CHEQUE' | 'COMBINED'>('CASH');

  const [amountStr, setAmountStr] = useState('');
  const [totalAmountStr, setTotalAmountStr] = useState('');
  const [cashPartStr, setCashPartStr] = useState('');
  const [chequePartStr, setChequePartStr] = useState('');

  const [date, setDate] = useState(moment().format('jYYYY/jMM/jDD'));
  const [description, setDescription] = useState('');
  const [textReceipt, setTextReceipt] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  // Presets popover state
  const [showDescriptionPresets, setShowDescriptionPresets] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);

  // Labor Arbitrage State
  const [laborProjectId, setLaborProjectId] = useState<string>('FREE');
  const [laborClientId, setLaborClientId] = useState<string>('FREE');
  const [syncWithClientProfile, setSyncWithClientProfile] = useState<boolean>(false);
  const [includeHiddenProfit, setIncludeHiddenProfit] = useState<boolean>(false);
  const [payHiddenProfitToWorker, setPayHiddenProfitToWorker] = useState<boolean>(false);

  // قانون سراسری دوطرفه پروژه ⟷ کارفرما
  const isLaborClientLocked = useMemo(() => {
    if (!laborProjectId || laborProjectId === 'FREE') return false;
    const proj = allProjects.find(p => p.id === laborProjectId);
    return !!proj?.clientId;
  }, [laborProjectId, allProjects]);

  const handleLaborProjectChange = (projId: string) => {
    setLaborProjectId(projId);
    if (projId && projId !== 'FREE') {
      const proj = allProjects.find(p => p.id === projId);
      if (proj?.clientId) {
        setLaborClientId(proj.clientId);
      }
    }
  };

  const handleLaborClientChange = (cId: string) => {
    setLaborClientId(cId);
    if (laborProjectId && laborProjectId !== 'FREE') {
      const currentP = allProjects.find(p => p.id === laborProjectId);
      if (currentP && currentP.clientId !== cId) {
        setLaborProjectId('FREE');
      }
    }
  };

  const filteredLaborProjects = useMemo(() => {
    if (!laborClientId || laborClientId === 'FREE') return allProjects;
    return allProjects.filter(p => p.clientId === laborClientId);
  }, [allProjects, laborClientId]);

  // Cheque State
  const [sayyadId, setSayyadId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [series, setSeries] = useState('');
  const [bank, setBank] = useState('بانک ملت');
  const [branch, setBranch] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [issuer, setIssuer] = useState('');
  const [receiver, setReceiver] = useState('');
  const [issueDate, setIssueDate] = useState(moment().format('jYYYY/jMM/jDD'));
  const [dueDate, setDueDate] = useState(() => moment().add(1, 'jMonth').format('jYYYY/jMM/jDD'));
  const [chequeStatus, setChequeStatus] = useState<ChequeStatus>('PENDING');

  // Allocation State
  const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close presets on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowDescriptionPresets(false);
      }
    };
    if (showDescriptionPresets) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDescriptionPresets]);

  // Initialize or Reset on Open
  useEffect(() => {
    if (!isOpen) return;

    if (editTransaction) {
      setDirection(editTransaction.direction || 'OUT');
      setPaymentType(editTransaction.type === 'CHEQUE' ? 'CHEQUE' : 'CASH');
      setAmountStr(formatNumber(editTransaction.amount));
      setDate(editTransaction.date || moment().format('jYYYY/jMM/jDD'));
      setDescription(editTransaction.description || '');
      setTextReceipt(editTransaction.textReceipt || '');
      setAttachments(editTransaction.attachments || []);

      if (editTransaction.chequeDetails) {
        const c = editTransaction.chequeDetails;
        setSayyadId(c.sayyadId || '');
        setSerialNumber(c.serialNumber || '');
        setSeries(c.series || '');
        setBank(c.bank || c.bankName || 'بانک ملت');
        setBranch(c.branch || '');
        setAccountNumber(c.accountNumber || '');
        setIssuer(c.issuer || '');
        setReceiver(c.receiver || '');
        setIssueDate(c.issueDate || moment().format('jYYYY/jMM/jDD'));
        setDueDate(c.dueDate || moment().add(1, 'jMonth').format('jYYYY/jMM/jDD'));
        setChequeStatus(c.status || 'PENDING');
      }

      if (editTransaction.allocations && editTransaction.allocations.length > 0) {
        setSelectedDebtIds(editTransaction.allocations.map((a: any) => a.recordId || a.id).filter(Boolean));
      }
    } else {
      setDirection(defaultDir);
      setPaymentType('CASH');
      setDate(moment().format('jYYYY/jMM/jDD'));
      setDescription('');
      setTextReceipt('');
      setAttachments([]);

      setSayyadId('');
      setSerialNumber('');
      setSeries('');
      setBank('بانک ملت');
      setBranch('');
      setAccountNumber('');
      setIssuer('');
      setReceiver(
        context === 'VEHICLE' && targetVehicle ? targetVehicle.name :
        context === 'TOOL' && targetTool ? targetTool.name :
        context === 'LABOR' && targetWorker ? `${targetWorker.name} ${targetWorker.lastName || ''}`.trim() :
        context === 'CLIENT' && targetClient ? `${targetClient.name} ${targetClient.lastName || ''}`.trim() : ''
      );
      setIssueDate(moment().format('jYYYY/jMM/jDD'));
      setDueDate(moment().add(1, 'jMonth').format('jYYYY/jMM/jDD'));
      setChequeStatus('PENDING');

      if (initialDebtId) {
        setSelectedDebtIds([initialDebtId]);
      } else {
        setSelectedDebtIds([]);
      }

      if (initialAmount && initialAmount > 0) {
        setAmountStr(formatNumber(initialAmount));
        setTotalAmountStr(formatNumber(initialAmount));
      } else {
        setAmountStr('');
        setTotalAmountStr('');
        setCashPartStr('');
        setChequePartStr('');
      }
    }
  }, [isOpen, editTransaction, initialDebtId, initialAmount, defaultDir, context, targetVehicle, targetTool, targetWorker, targetClient]);

  // Combined calculations
  const handleTotalAmountChange = (val: string) => {
    setTotalAmountStr(formatNumber(val));
    const total = parseNumber(val);
    const cash = parseNumber(cashPartStr);
    const chq = Math.max(0, total - cash);
    setChequePartStr(formatNumber(chq));
  };

  const handleCashPartChange = (val: string) => {
    setCashPartStr(formatNumber(val));
    const total = parseNumber(totalAmountStr);
    const cash = parseNumber(val);
    const chq = Math.max(0, total - cash);
    setChequePartStr(formatNumber(chq));
  };

  const handleSplit5050 = () => {
    const total = parseNumber(totalAmountStr);
    const half = Math.floor(total / 2);
    setCashPartStr(formatNumber(half));
    setChequePartStr(formatNumber(total - half));
  };

  // Image Upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (attachments.length + files.length > 3) {
      toast.error('حداکثر ۳ تصویر مجاز است.');
      return;
    }
    try {
      const compressed = await Promise.all(files.map(f => compressImage(f)));
      setAttachments(prev => [...prev, ...compressed]);
      toast.success('تصویر فیش/چک افزوده شد.');
    } catch {
      toast.error('خطا در پردازش تصویر.');
    }
  };

  const handlePasteSMS = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTextReceipt(text);
        toast.success('متن پیامک بانک جای‌گذاری شد.');
      }
    } catch {
      toast.error('دسترسی به کلیپ‌بورد مسدود است.');
    }
  };

  // 💡 استخراج هوشمند و فیلتر دقیق بدهی‌ها و مطالبات بر اساس کانتکست (فقط موارد SETTLED نشده و remainingAmount > 0)
  const availableDebts: DebtAllocationItem[] = useMemo(() => {
    const list: DebtAllocationItem[] = [];

    // ۱. ناوگان خودرویی
    if (context === 'VEHICLE' && effectiveVehicleId) {
      if (direction === 'OUT') {
        allRepairs.filter(r => r.vehicleId === effectiveVehicleId).forEach(r => {
          const paid = r.paidAmount || 0;
          const rem = Math.max(0, r.totalCost - paid);
          if (rem > 0 && r.settlementStatus !== 'SETTLED') {
            list.push({
              id: `repair-${r.id}`, rawId: r.id, category: 'REPAIR', categoryLabel: 'تعمیرات',
              title: `تعمیر: ${REPAIR_TYPE_LABELS[r.repairType] || r.repairType} (${r.mechanicInfo?.mechanicName || 'تعمیرگاه'})`,
              date: r.date, totalCost: r.totalCost, paidAmount: paid, remainingAmount: rem, sourceRecord: r
            });
          }
        });

        allInsurances.filter(ins => ins.vehicleId === effectiveVehicleId).forEach(ins => {
          if (ins.paymentMode === 'INSTALLMENT') {
            ins.installments?.forEach(inst => {
              if (!inst.isPaid) {
                list.push({
                  id: `ins-${ins.id}-${inst.id}`, rawId: inst.id, category: 'INSURANCE', categoryLabel: 'قسط بیمه',
                  title: `قسط ${inst.installmentNumber} بیمه ${ins.companyName}`,
                  date: inst.dueDate, totalCost: inst.amount, paidAmount: 0, remainingAmount: inst.amount,
                  extraMeta: { insuranceId: ins.id }, sourceRecord: inst
                });
              }
            });
          } else if ((ins as any).settlementStatus !== 'SETTLED' && (ins.totalAmount || 0) > 0) {
            list.push({
              id: `ins-${ins.id}`, rawId: ins.id, category: 'INSURANCE', categoryLabel: 'بیمه‌نامه',
              title: `بیمه ${ins.companyName}`, date: ins.startDate, totalCost: ins.totalAmount, paidAmount: 0, remainingAmount: ins.totalAmount, sourceRecord: ins
            });
          }
        });

        allPeriodicServices.filter(p => p.vehicleId === effectiveVehicleId).forEach(p => {
          const paid = p.paidAmount || 0;
          const rem = Math.max(0, p.totalCost - paid);
          if (rem > 0 && p.settlementStatus !== 'SETTLED') {
            list.push({
              id: `periodic-${p.id}`, rawId: p.id, category: 'PERIODIC', categoryLabel: 'سرویس دوره‌ای',
              title: `سرویس مورخ ${p.serviceDate}`, date: p.serviceDate, totalCost: p.totalCost, paidAmount: paid, remainingAmount: rem, sourceRecord: p
            });
          }
        });

        allMiscExpenses.filter(m => m.vehicleId === effectiveVehicleId).forEach(m => {
          const paid = m.paidAmount || 0;
          const rem = Math.max(0, m.amount - paid);
          if (rem > 0 && m.settlementStatus !== 'SETTLED') {
            list.push({
              id: `misc-${m.id}`, rawId: m.id, category: 'MISC', categoryLabel: 'هزینه جانبی',
              title: `${m.expenseType} ${m.description ? `(${m.description})` : ''}`,
              date: m.date, totalCost: m.amount, paidAmount: paid, remainingAmount: rem, sourceRecord: m
            });
          }
        });

        allDriverAssignments.filter(d => d.vehicleId === effectiveVehicleId && !d.isPaid).forEach(d => {
          list.push({
            id: `driver-${d.id}`, rawId: d.id, category: 'DRIVER_WAGE', categoryLabel: 'دستمزد راننده',
            title: `دستمزد راننده: ${d.driverName}`, date: d.assignedDate, totalCost: d.totalWage, paidAmount: 0, remainingAmount: d.totalWage, sourceRecord: d
          });
        });
      } else {
        allLogisticsLogs.filter(l => l.type === 'TRANSPORT' && l.vehicleInfo === effectiveVehicleId).forEach(l => {
          const total = l.billedCost || 0;
          const paid = l.paidAmount || 0;
          const rem = Math.max(0, total - paid);
          if (rem > 0 && l.settlementStatus !== 'SETTLED') {
            list.push({
              id: `freight-${l.id}`, rawId: l.id, category: 'FREIGHT', categoryLabel: 'بارنامه / کارکرد',
              title: `باربری: ${l.title || 'سرویس'} (${l.date})`, date: l.date, totalCost: total, paidAmount: paid, remainingAmount: rem, sourceRecord: l
            });
          }
        });
      }
    } 
    // ۲. بخش ابزارآلات و ماشین‌آلات
    else if (context === 'TOOL' && effectiveToolId) {
      if (direction === 'OUT') {
        allRepairs.filter(r => r.vehicleId === effectiveToolId).forEach(r => {
          const paid = r.paidAmount || 0;
          const rem = Math.max(0, r.totalCost - paid);
          if (rem > 0 && r.settlementStatus !== 'SETTLED') {
            list.push({
              id: `repair-${r.id}`, rawId: r.id, category: 'REPAIR', categoryLabel: 'تعمیرات ابزار',
              title: `تعمیر: ${REPAIR_TYPE_LABELS[r.repairType] || r.repairType}`, date: r.date, totalCost: r.totalCost, paidAmount: paid, remainingAmount: rem, sourceRecord: r
            });
          }
        });

        allMiscExpenses.filter(m => m.vehicleId === effectiveToolId).forEach(m => {
          const paid = m.paidAmount || 0;
          const rem = Math.max(0, m.amount - paid);
          if (rem > 0 && m.settlementStatus !== 'SETTLED') {
            list.push({
              id: `misc-${m.id}`, rawId: m.id, category: 'MISC', categoryLabel: 'هزینه جانبی',
              title: m.expenseType, date: m.date, totalCost: m.amount, paidAmount: paid, remainingAmount: rem, sourceRecord: m
            });
          }
        });

        allToolRentals.filter(r => r.toolId === effectiveToolId && r.hasOperator && !r.operatorPaid).forEach(r => {
          const paid = (r as any).operatorPaidAmount || (r.operatorPaid ? (r.operatorTotalWage || 0) : 0);
          const rem = Math.max(0, (r.operatorTotalWage || 0) - paid);
          if (rem > 0) {
            list.push({
              id: `rental-op-${r.id}`, rawId: r.id, category: 'DRIVER_WAGE', categoryLabel: 'دستمزد اپراتور',
              title: `دستمزد اپراتور: ${r.operatorName || 'اپراتور'} (${r.clientName || 'مشتری'})`, date: r.startDate, totalCost: r.operatorTotalWage || 0, paidAmount: paid, remainingAmount: rem,
              extraMeta: { isToolOperator: true }, sourceRecord: r
            });
          }
        });
      } else {
        allToolRentals.filter(r => r.toolId === effectiveToolId && r.settlementStatus !== 'SETTLED').forEach(r => {
          const total = r.totalAmount || 0;
          const paid = r.paidAmount || 0;
          const rem = Math.max(0, total - paid);
          if (rem > 0) {
            list.push({
              id: `rental-${r.id}`, rawId: r.id, category: 'RENTAL', categoryLabel: 'قرارداد اجاره ابزار',
              title: `اجاره: ${r.clientName || 'مشتری'} (${TOOL_RENTAL_UNIT_LABELS[r.rentalUnit] || r.rentalUnit})`, date: r.startDate, totalCost: total, paidAmount: paid, remainingAmount: rem, sourceRecord: r
            });
          }
        });
      }
    }
    // ۳. نیروی کار (LABOR)
    else if ((context === 'LABOR' || targetWorker) && effectiveWorkerId) {
      if (direction === 'OUT') {
        allLaborLogs.filter(l => l.workerId === effectiveWorkerId).forEach(l => {
          const cost = l.internalCost || 0;
          const paid = l.advancePayment || 0;
          const rem = Math.max(0, cost - paid);
          if (rem > 0) {
            list.push({
              id: `labor-${l.id}`, rawId: l.id, category: 'LABOR', categoryLabel: 'کارکرد / دستمزد',
              title: `کارکرد: ${l.workType || 'کارکرد'} (${l.date})`, date: l.date, totalCost: cost, paidAmount: paid, remainingAmount: rem, sourceRecord: l
            });
          }
        });
      }
    }
    // ۴. پروژه (PROJECT)
    else if (context === 'PROJECT' && effectiveProjectId) {
      if (direction === 'OUT') {
        allPurchases.filter(p => p.projectId === effectiveProjectId).forEach(p => {
          const cost = (p.billedCost && p.billedCost > 0) ? p.billedCost : (p.internalCost || 0);
          const paid = (p as any).paidAmount || 0;
          const rem = Math.max(0, cost - paid);
          if (rem > 0 && (p as any).settlementStatus !== 'SETTLED') {
            list.push({
              id: `purchase-${p.id}`, rawId: p.id, category: 'PURCHASE', categoryLabel: 'فاکتور خرید',
              title: `${p.title} (${p.vendor || 'تامین‌کننده'})`, date: p.date, totalCost: cost, paidAmount: paid, remainingAmount: rem, sourceRecord: p
            });
          }
        });

        allLogisticsLogs.filter(l => l.projectId === effectiveProjectId && l.type === 'TRANSPORT').forEach(l => {
          const cost = l.internalCost || 0;
          const paid = l.paidAmount || 0;
          const rem = Math.max(0, cost - paid);
          if (rem > 0 && l.settlementStatus !== 'SETTLED') {
            list.push({
              id: `freight-${l.id}`, rawId: l.id, category: 'FREIGHT', categoryLabel: 'کرایه باربری',
              title: `باربری: ${l.title || 'حمل'} (${l.provider || ''})`, date: l.date, totalCost: cost, paidAmount: paid, remainingAmount: rem, sourceRecord: l
            });
          }
        });

        allLaborLogs.filter(l => l.projectId === effectiveProjectId).forEach(l => {
          const cost = l.internalCost || 0;
          const paid = l.advancePayment || 0;
          const rem = Math.max(0, cost - paid);
          if (rem > 0) {
            list.push({
              id: `labor-${l.id}`, rawId: l.id, category: 'LABOR', categoryLabel: 'دستمزد نیرو',
              title: `دستمزد: ${l.workerName || 'نیرو'} (${l.workType})`, date: l.date, totalCost: cost, paidAmount: paid, remainingAmount: rem, sourceRecord: l
            });
          }
        });
      } else {
        allLogisticsLogs.filter(l => l.projectId === effectiveProjectId && (l.billedCost || 0) > 0).forEach(l => {
          const total = l.billedCost || 0;
          const paid = l.paidAmount || 0;
          const rem = Math.max(0, total - paid);
          if (rem > 0 && l.settlementStatus !== 'SETTLED') {
            list.push({
              id: `freight-${l.id}`, rawId: l.id, category: 'FREIGHT', categoryLabel: 'مطالبات باربری',
              title: `مطالبه باربری: ${l.title || 'سرویس'} (${l.date})`, date: l.date, totalCost: total, paidAmount: paid, remainingAmount: rem, sourceRecord: l
            });
          }
        });

        // فاکتورهای باز پروژه
        allInvoices.filter(inv => inv.projectId === effectiveProjectId && inv.status !== 'PAID').forEach(inv => {
          const total = inv.grandTotal || inv.finalAmount || inv.totalAmount || 0;
          const rem = inv.payment?.debtAmount !== undefined ? inv.payment.debtAmount : Math.max(0, total - (inv.payment?.paidAmount || 0));
          const paid = Math.max(0, total - rem);
          if (rem > 0) {
            list.push({
              id: `invoice-${inv.id}`, rawId: inv.id, category: 'INVOICE', categoryLabel: 'فاکتور کارفرما',
              title: `فاکتور: ${inv.invoiceNumber} (${inv.clientName || 'پروژه'})`, date: inv.date, totalCost: total, paidAmount: paid, remainingAmount: rem,
              extraMeta: { isInvoice: true }, sourceRecord: inv
            });
          }
        });
      }
    }
    // ۵. کارفرما (CLIENT)
    else if (context === 'CLIENT' && effectiveClientId) {
      if (direction === 'IN') {
        allLogisticsLogs.filter(l => l.clientId === effectiveClientId && (l.billedCost || 0) > 0).forEach(l => {
          const total = l.billedCost || 0;
          const paid = l.paidAmount || 0;
          const rem = Math.max(0, total - paid);
          if (rem > 0 && l.settlementStatus !== 'SETTLED') {
            list.push({
              id: `freight-${l.id}`, rawId: l.id, category: 'FREIGHT', categoryLabel: 'مطالبات باربری',
              title: `باربری: ${l.title || 'سرویس'} (${l.date})`, date: l.date, totalCost: total, paidAmount: paid, remainingAmount: rem, sourceRecord: l
            });
          }
        });

        allToolRentals.filter(r => r.clientId === effectiveClientId && r.settlementStatus !== 'SETTLED').forEach(r => {
          const total = r.totalAmount || 0;
          const paid = r.paidAmount || 0;
          const rem = Math.max(0, total - paid);
          if (rem > 0) {
            list.push({
              id: `rental-${r.id}`, rawId: r.id, category: 'RENTAL', categoryLabel: 'قرارداد اجاره ابزار',
              title: `اجاره دستگاه: ${TOOL_RENTAL_UNIT_LABELS[r.rentalUnit] || r.rentalUnit} (${r.toolName || 'ابزار'})`, date: r.startDate, totalCost: total, paidAmount: paid, remainingAmount: rem, sourceRecord: r
            });
          }
        });

        allPurchases.filter(p => p.clientId === effectiveClientId && (p.billedCost || 0) > 0).forEach(p => {
          const cost = p.billedCost || 0;
          const paid = (p as any).paidAmount || 0;
          const rem = Math.max(0, cost - paid);
          if (rem > 0 && (p as any).settlementStatus !== 'SETTLED') {
            list.push({
              id: `purchase-${p.id}`, rawId: p.id, category: 'PURCHASE', categoryLabel: 'فاکتور خرید مصالح',
              title: `فاکتور: ${p.title} (${p.vendor || 'تامین‌کننده'})`, date: p.date, totalCost: cost, paidAmount: paid, remainingAmount: rem, sourceRecord: p
            });
          }
        });

        // فاکتورهای باز کارفرما
        allInvoices.filter(inv => inv.clientId === effectiveClientId && inv.status !== 'PAID').forEach(inv => {
          const total = inv.grandTotal || inv.finalAmount || inv.totalAmount || 0;
          const rem = inv.payment?.debtAmount !== undefined ? inv.payment.debtAmount : Math.max(0, total - (inv.payment?.paidAmount || 0));
          const paid = Math.max(0, total - rem);
          if (rem > 0) {
            list.push({
              id: `invoice-${inv.id}`, rawId: inv.id, category: 'INVOICE', categoryLabel: 'فاکتور کارفرما',
              title: `فاکتور: ${inv.invoiceNumber} (${inv.clientName || 'کارفرما'})`, date: inv.date, totalCost: total, paidAmount: paid, remainingAmount: rem,
              extraMeta: { isInvoice: true }, sourceRecord: inv
            });
          }
        });
      }
    }
    // ۶. تامین‌کننده (SUPPLIER)
    else if (context === 'SUPPLIER') {
      allPurchases.filter(p => {
        if (effectiveSupplierId) {
          return p.vendor === effectiveSupplierId || (p.vendor && p.vendor.toLowerCase().includes(effectiveSupplierId.toLowerCase()));
        }
        return true;
      }).forEach(p => {
        const cost = p.internalCost || 0;
        const paid = (p as any).paidAmount || 0;
        const rem = Math.max(0, cost - paid);
        if (rem > 0 && (p as any).settlementStatus !== 'SETTLED') {
          list.push({
            id: `purchase-${p.id}`, rawId: p.id, category: 'PURCHASE', categoryLabel: 'فاکتور خرید تامین‌کننده',
            title: `${p.title} (${p.vendor || 'تامین‌کننده'})`, date: p.date, totalCost: cost, paidAmount: paid, remainingAmount: rem, sourceRecord: p
          });
        }
      });
    }
    // ۷. انبار و مصالح (INVENTORY)
    else if (context === 'INVENTORY') {
      allPurchases.filter(p => !p.projectId || p.items?.some(i => !!i.inventoryId)).forEach(p => {
        const cost = p.internalCost || 0;
        const paid = (p as any).paidAmount || 0;
        const rem = Math.max(0, cost - paid);
        if (rem > 0 && (p as any).settlementStatus !== 'SETTLED') {
          list.push({
            id: `purchase-${p.id}`, rawId: p.id, category: 'PURCHASE', categoryLabel: 'خرید انبار',
            title: `${p.title} (${p.vendor || 'انبار مرکزی'})`, date: p.date, totalCost: cost, paidAmount: paid, remainingAmount: rem, sourceRecord: p
          });
        }
      });
    }

    // مرتب‌سازی اکیداً به ترتیب تاریخ صعودی (قدیمی‌ترین بدهی در ابتدا) جهت تضمین FIFO واقعی
    return list.sort((a, b) => {
      const dateDiff = (a.date || '').localeCompare(b.date || '');
      if (dateDiff !== 0) return dateDiff;
      return (a.id || '').localeCompare(b.id || '');
    });
  }, [
    context, effectiveVehicleId, effectiveToolId, effectiveWorkerId, effectiveProjectId, effectiveClientId, effectiveSupplierId, direction,
    allRepairs, allInsurances, allPeriodicServices, allMiscExpenses, allDriverAssignments, allLogisticsLogs, allToolRentals, allPurchases, allLaborLogs, allInvoices, targetWorker
  ]);

  // Toggle selection
  const handleToggleDebt = (debtId: string) => {
    setSelectedDebtIds(prev => {
      const next = prev.includes(debtId) ? prev.filter(id => id !== debtId) : [...prev, debtId];
      const sum = availableDebts
        .filter(d => next.includes(d.id))
        .reduce((acc, d) => acc + d.remainingAmount, 0);

      if (paymentType === 'COMBINED') {
        if (sum > 0) handleTotalAmountChange(sum.toString());
      } else {
        if (sum > 0) setAmountStr(formatNumber(sum));
      }
      return next;
    });
  };

  const handleSelectAllDebts = () => {
    if (selectedDebtIds.length === availableDebts.length) {
      setSelectedDebtIds([]);
      setAmountStr('');
      setTotalAmountStr('');
    } else {
      const allIds = availableDebts.map(d => d.id);
      setSelectedDebtIds(allIds);
      const sum = availableDebts.reduce((acc, d) => acc + d.remainingAmount, 0);
      if (paymentType === 'COMBINED') {
        handleTotalAmountChange(sum.toString());
      } else {
        setAmountStr(formatNumber(sum));
      }
    }
  };

  const activeAmount = paymentType === 'COMBINED' ? parseNumber(totalAmountStr) : parseNumber(amountStr);

  // FIFO Allocation Simulator
  const simulatedAllocations = useMemo(() => {
    if (activeAmount <= 0 || availableDebts.length === 0) return [];

    let budget = activeAmount;
    const result: { item: DebtAllocationItem; willPay: number; nextStatus: 'SETTLED' | 'PARTIAL' }[] = [];

    // Phase 1: selected debts have priority
    const priority = selectedDebtIds.length > 0 
      ? availableDebts.filter(d => selectedDebtIds.includes(d.id))
      : [];

    priority.forEach(item => {
      if (budget <= 0) return;
      const willPay = Math.min(budget, item.remainingAmount);
      budget -= willPay;
      const isFull = (item.paidAmount + willPay) >= item.totalCost;
      result.push({ item, willPay, nextStatus: isFull ? 'SETTLED' : 'PARTIAL' });
    });

    // Phase 2: FIFO remainder
    if (budget > 0) {
      const handled = priority.map(p => p.id);
      const remaining = availableDebts.filter(d => !handled.includes(d.id));

      remaining.forEach(item => {
        if (budget <= 0) return;
        const willPay = Math.min(budget, item.remainingAmount);
        budget -= willPay;
        const isFull = (item.paidAmount + willPay) >= item.totalCost;
        result.push({ item, willPay, nextStatus: isFull ? 'SETTLED' : 'PARTIAL' });
      });
    }

    return result;
  }, [activeAmount, availableDebts, selectedDebtIds]);

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeAmount <= 0) {
      toast.error('لطفاً مبلغ معتبری وارد کنید.');
      return;
    }
    if (!date) {
      toast.error('ثبت تاریخ الزامی است.');
      return;
    }

    if (paymentType === 'CHEQUE' || paymentType === 'COMBINED') {
      if (!serialNumber.trim()) {
        toast.error('شماره سریال چک الزامی است.');
        return;
      }
      if (!dueDate) {
        toast.error('تاریخ سررسید چک الزامی است.');
        return;
      }
    }

    // 1. Execute allocation status updates on source records
    simulatedAllocations.forEach(({ item, willPay, nextStatus }) => {
      if (item.category === 'REPAIR') {
        updateRepair(item.rawId, {
          paidAmount: item.paidAmount + willPay,
          settlementStatus: nextStatus
        });
      } else if (item.category === 'INSURANCE') {
        if (item.extraMeta?.insuranceId) {
          if (willPay >= item.remainingAmount) {
            toggleInstallmentPaid(item.extraMeta.insuranceId, item.rawId);
          }
        } else {
          updateInsurance(item.rawId, {
            paidAmount: item.paidAmount + willPay,
            settlementStatus: nextStatus
          });
        }
      } else if (item.category === 'PERIODIC') {
        updatePeriodicService(item.rawId, {
          paidAmount: item.paidAmount + willPay,
          settlementStatus: nextStatus
        });
      } else if (item.category === 'MISC') {
        updateMiscExpense(item.rawId, {
          paidAmount: item.paidAmount + willPay,
          settlementStatus: nextStatus
        });
      } else if (item.category === 'DRIVER_WAGE') {
        if (item.extraMeta?.isToolOperator) {
          updateToolRental(item.rawId, {
            operatorPaid: nextStatus === 'SETTLED',
            ...( { operatorPaidAmount: item.paidAmount + willPay } as any )
          });
        } else if (willPay >= item.remainingAmount) {
          updateDriverAssignment(item.rawId, { isPaid: true });
        }
      } else if (item.category === 'RENTAL') {
        updateToolRental(item.rawId, {
          paidAmount: item.paidAmount + willPay,
          settlementStatus: nextStatus
        });
      } else if (item.category === 'FREIGHT') {
        updateLogisticsLog(item.rawId, {
          paidAmount: item.paidAmount + willPay,
          settlementStatus: nextStatus
        });
      } else if (item.category === 'PURCHASE') {
        updatePurchase(item.rawId, {
          paidAmount: item.paidAmount + willPay,
          settlementStatus: nextStatus
        } as any);
      } else if (item.category === 'INVOICE' || item.extraMeta?.isInvoice) {
        const inv = allInvoices.find(i => i.id === item.rawId);
        if (inv) {
          const newDebt = Math.max(0, item.remainingAmount - willPay);
          const newPaid = (inv.payment?.paidAmount || 0) + willPay;
          updateInvoice(item.rawId, {
            status: nextStatus === 'SETTLED' ? 'PAID' : 'SUBMITTED',
            payment: {
              ...inv.payment,
              debtAmount: newDebt,
              paidAmount: newPaid,
            }
          });
        }
      } else if (item.category === 'LABOR') {
        updateLaborLog(item.rawId, {
          advancePayment: item.paidAmount + willPay
        });
      }
    });

    // 2. Prepare transaction allocations array
    const allocsPayload: TransactionAllocation[] = simulatedAllocations.map(({ item, willPay }) => ({
      id: generateUUID(),
      amount: willPay,
      allocationType: 'PROJECT',
      projectId: effectiveProjectId || 'FREE',
      recordType: (item.category === 'PURCHASE' ? 'PURCHASE' : item.category === 'LABOR' ? 'LABOR' : 'LOGISTICS'),
      recordId: item.rawId,
      description: item.category
    }));

    if (allocsPayload.length === 0) {
      allocsPayload.push({
        id: generateUUID(),
        amount: activeAmount,
        allocationType: 'PROJECT',
        projectId: effectiveProjectId || 'FREE',
        recordType: (context === 'LABOR' ? 'LABOR' : context === 'PROJECT' ? 'NONE' : 'LOGISTICS'),
        recordId: effectiveVehicleId || effectiveToolId || effectiveWorkerId || effectiveProjectId || 'GENERAL',
        description: direction === 'IN' ? 'دریافت مالی' : 'پرداخت مالی'
      });
    }

    const referenceId = effectiveVehicleId || effectiveToolId || effectiveWorkerId || effectiveProjectId || effectiveClientId || 'GENERAL';
    const finalClientId = (context === 'LABOR' && syncWithClientProfile && laborClientId !== 'FREE') 
      ? laborClientId 
      : effectiveClientId;

    const chequeData = {
      sayyadId,
      serialNumber,
      series,
      bank,
      branch,
      accountNumber,
      issuer,
      receiver,
      issueDate,
      dueDate,
      status: chequeStatus,
      history: []
    };

    if (editTransaction) {
      if (editTransaction.type === 'CHEQUE' && chequeStatus !== editTransaction.chequeDetails?.status) {
        changeChequeStatus(editTransaction.id, chequeStatus, 'تغییر وضعیت در ویرایش سند', date, attachments);
      }

      updateTransaction(editTransaction.id, {
        referenceId,
        clientId: finalClientId,
        direction,
        type: paymentType === 'COMBINED' ? 'CASH' : paymentType,
        amount: activeAmount,
        date,
        description,
        textReceipt,
        attachments,
        allocations: allocsPayload,
        ...(paymentType === 'CHEQUE' && { chequeDetails: chequeData })
      });
      toast.success('سند مالی با موفقیت به‌روزرسانی شد.');
      if (onSuccess) onSuccess(editTransaction.id);
    } else {
      if (paymentType === 'COMBINED') {
        const cashAmt = parseNumber(cashPartStr);
        const chqAmt = parseNumber(chequePartStr);
        const baseId = generateUUID();

        // Cash portion
        addTransaction({
          referenceId,
          clientId: finalClientId,
          direction,
          type: 'CASH',
          amount: cashAmt,
          date,
          description: (description || 'پرداخت ترکیبی') + ' (بخش نقدی)',
          textReceipt,
          attachments,
          allocations: allocsPayload
        });

        // Cheque portion
        addTransaction({
          referenceId,
          clientId: finalClientId,
          direction,
          type: 'CHEQUE',
          amount: chqAmt,
          date,
          description: (description || 'پرداخت ترکیبی') + ' (بخش چک صیادی)',
          textReceipt,
          attachments,
          chequeDetails: chequeData,
          allocations: allocsPayload
        });

        toast.success('تراکنش ترکیبی (نقد + چک) با موفقیت در سیستم ثبت شد.');
        if (onSuccess) onSuccess(baseId);
      } else {
        const newId = generateUUID();
        addTransaction({
          referenceId,
          clientId: finalClientId,
          direction,
          type: paymentType,
          amount: activeAmount,
          date,
          description,
          textReceipt,
          attachments,
          allocations: allocsPayload,
          ...(paymentType === 'CHEQUE' && { chequeDetails: chequeData })
        });

        toast.success(direction === 'IN' ? 'ورود وجه به صندوق ثبت شد.' : 'سند پرداخت خروجی با موفقیت ثبت شد.');
        if (onSuccess) onSuccess(newId);
      }
    }

    onClose();
  };

  if (!isOpen || !portalTarget) return null;

  const currentPresets = DESCRIPTION_PRESETS[context] || DESCRIPTION_PRESETS.GLOBAL;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto modal-scrollbar" dir="rtl">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-4xl my-auto rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 border border-white/60 dark:border-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.5)] overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                direction === 'IN' 
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white' 
                  : 'bg-gradient-to-tr from-rose-500 to-amber-500 text-white'
              }`}>
                {direction === 'IN' ? <Wallet className="w-6 h-6" /> : <Banknote className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <span>{editTransaction ? 'ویرایش سند مالی' : 'مودال تراکنش و پرداخت مادر'}</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    Universal
                  </span>
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-slate-500">کانتکست:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-[11px] font-black text-slate-700 dark:text-slate-300">
                    <Lock className="w-3 h-3 text-indigo-500" />
                    {
                      context === 'VEHICLE' ? `خودرو: ${targetVehicle?.name || 'انتخاب نشده'}` :
                      context === 'TOOL' ? `ابزار: ${targetTool?.name || 'انتخاب نشده'}` :
                      context === 'LABOR' ? `پرسنل: ${targetWorker?.name || 'انتخاب نشده'} ${targetWorker?.lastName || ''}` :
                      context === 'PROJECT' ? `پروژه: ${targetProject?.name || targetProject?.title || 'انتخاب نشده'}` :
                      context === 'CLIENT' ? `کارفرما: ${targetClient?.name || 'انتخاب نشده'} ${targetClient?.lastName || ''}` : 'جامع سازمانی'
                    }
                  </span>
                </div>
              </div>
            </div>

            <button onClick={onClose} className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto modal-scrollbar p-6 space-y-6">
            
            {/* ۱. جهت تراکنش و روش پرداخت */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* سوئیچ جهت (ورودی / خروجی) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">جهت گردش نقدینگی</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-200/50 dark:bg-slate-800/60 p-1.5 rounded-2xl h-[50px] items-center">
                  <button
                    type="button"
                    onClick={() => setDirection('OUT')}
                    className={`h-full rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      direction === 'OUT'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>پرداخت / خروج وجه</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('IN')}
                    className={`h-full rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      direction === 'IN'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>دریافت / ورود وجه</span>
                  </button>
                </div>
              </div>

              {/* ۳ روش پرداخت: نقدی، چک، ترکیبی */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">روش پرداخت و ابزار تسویه</label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-200/50 dark:bg-slate-800/60 p-1.5 rounded-2xl h-[50px] items-center">
                  <button
                    type="button"
                    onClick={() => setPaymentType('CASH')}
                    className={`h-full rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentType === 'CASH'
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                    <span>نقدی / واریز</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('CHEQUE')}
                    className={`h-full rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentType === 'CHEQUE'
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <FileSignature className="w-3.5 h-3.5 text-indigo-500" />
                    <span>چک صیادی</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('COMBINED')}
                    className={`h-full rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentType === 'COMBINED'
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <SplitSquareHorizontal className="w-3.5 h-3.5 text-amber-500" />
                    <span>نقد + چک</span>
                  </button>
                </div>
              </div>

            </div>

            {/* ۲. بخش ویژه آربیتراژ نیروی کار (فقط در کانتکست LABOR) */}
            {(context === 'LABOR' || targetWorker) && (
              <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 dark:from-slate-800/90 dark:to-slate-800/60 p-5 rounded-3xl border border-indigo-200/70 dark:border-indigo-900/50 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-slate-700">
                  <span className="text-xs font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-indigo-600" />
                    <span>ارتباط با کارفرما و سود پنهان (آربیتراژ کارگری)</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-100/60 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                    هوشمندسازی مالی
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">پروژه مرتبط</label>
                    <div className="h-[42px]">
                      <PortalSelect
                        options={[
                          { value: 'FREE', label: 'کارهای آزاد (بدون پروژه)' },
                          ...filteredLaborProjects.map(p => ({ value: p.id, label: p.title || p.name }))
                        ]}
                        value={laborProjectId}
                        onChange={(v: any) => handleLaborProjectChange(v)}
                        searchable={true}
                        className="!h-[42px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span>کارفرمای طرف‌حساب</span>
                      {isLaborClientLocked && (
                        <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                          قفل با انتخاب پروژه
                        </span>
                      )}
                    </label>
                    <div className="h-[42px]">
                      <PortalSelect
                        options={[
                          { value: 'FREE', label: 'بدون کارفرما (آزاد)' },
                          ...allClients.map(c => ({ value: c.id, label: `${c.name} ${c.lastName || ''}`.trim() }))
                        ]}
                        value={laborClientId}
                        onChange={(v: any) => handleLaborClientChange(v)}
                        disabled={isLaborClientLocked}
                        searchable={true}
                        className="!h-[42px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                    <AnimatedCheckbox checked={syncWithClientProfile} onChange={() => setSyncWithClientProfile(!syncWithClientProfile)} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">همگام‌سازی با پرونده کارفرما</span>
                  </div>

                  <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                    <AnimatedCheckbox checked={includeHiddenProfit} onChange={() => setIncludeHiddenProfit(!includeHiddenProfit)} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">تفکیک سود پنهان آربیتراژ</span>
                  </div>

                  <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                    <AnimatedCheckbox checked={payHiddenProfitToWorker} onChange={() => setPayHiddenProfitToWorker(!payHiddenProfitToWorker)} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">واریز آربیتراژ به کارگر</span>
                  </div>
                </div>
              </div>
            )}

            {/* ۳. فیلدهای مبالغ و تاریخ (با کنتراست ۱۰۰٪ در دارک‌مود) */}
            <div className="bg-white dark:bg-slate-800/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
              
              {paymentType !== 'COMBINED' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      مبلغ تراکنش ({getCurrencyUnit()}) *
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      autoComplete="off"
                      value={amountStr}
                      onChange={e => setAmountStr(formatNumber(e.target.value))}
                      placeholder="مثلاً ۵۰,۰۰۰,۰۰۰"
                      className="w-full h-[48px] px-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 font-mono font-black text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-all text-center"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">تاریخ تراکنش / سند *</label>
                    <div className="h-[48px]">
                      <GlassDatePicker value={date} onChange={setDate} />
                    </div>
                  </div>
                </div>
              ) : (
                /* حالت ترکیبی: مبلغ کل، بخش نقدی، بخش چک */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">مبلغ کل قرارداد/فاکتور</label>
                        <button type="button" onClick={handleSplit5050} className="text-[10px] text-indigo-500 font-bold hover:underline">
                          تقسیم ۵۰-۵۰
                        </button>
                      </div>
                      <input
                        type="text"
                        dir="ltr"
                        autoComplete="off"
                        value={totalAmountStr}
                        onChange={e => handleTotalAmountChange(e.target.value)}
                        placeholder="جمع کل..."
                        className="w-full h-[48px] px-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 font-mono font-black text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 text-center"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">بخش نقدی (واریز مستقیم)</label>
                      <input
                        type="text"
                        dir="ltr"
                        autoComplete="off"
                        value={cashPartStr}
                        onChange={e => handleCashPartChange(e.target.value)}
                        placeholder="مبلغ نقد..."
                        className="w-full h-[48px] px-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 font-mono font-black text-base text-emerald-600 dark:text-emerald-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none text-center"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400">بخش چک صیادی (تعهدی)</label>
                      <input
                        type="text"
                        dir="ltr"
                        autoComplete="off"
                        value={chequePartStr}
                        readOnly
                        placeholder="مبلغ چک..."
                        className="w-full h-[48px] px-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 font-mono font-black text-base text-indigo-600 dark:text-indigo-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none text-center"
                      />
                    </div>
                  </div>

                  <div className="w-full md:w-1/2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">تاریخ ثبت سند</label>
                    <div className="h-[48px]">
                      <GlassDatePicker value={date} onChange={setDate} />
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* ۴. مشخصات چک صیادی (در حالت CHEQUE یا COMBINED) */}
            {(paymentType === 'CHEQUE' || paymentType === 'COMBINED') && (
              <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-slate-800/90 dark:to-slate-800/60 p-5 rounded-3xl border border-indigo-200/70 dark:border-indigo-900/50 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-slate-700">
                  <span className="text-xs font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-indigo-600" />
                    <span>مشخصات چک صیادی بنفش</span>
                  </span>
                  <div className="w-48">
                    <PortalSelect
                      options={CHEQUE_STATUS_OPTIONS}
                      value={chequeStatus}
                      onChange={(val: any) => setChequeStatus(val)}
                      className="!h-[38px] !text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">شناسه صیاد (۱۶ رقم)</label>
                    <input
                      type="text"
                      dir="ltr"
                      maxLength={16}
                      autoComplete="off"
                      value={sayyadId}
                      onChange={e => setSayyadId(e.target.value.replace(/\D/g, ''))}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      className="w-full h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">شماره سریال چک *</label>
                    <input
                      type="text"
                      dir="ltr"
                      autoComplete="off"
                      value={serialNumber}
                      onChange={e => setSerialNumber(e.target.value)}
                      placeholder="سریال چک..."
                      className="w-full h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">بانک صادرکننده *</label>
                    <div className="h-[42px]">
                      <PortalSelect
                        options={BANK_OPTIONS}
                        value={bank}
                        onChange={(v: any) => setBank(v)}
                        searchable={true}
                        className="!h-[42px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">شعبه بانک / کد</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={branch}
                      onChange={e => setBranch(e.target.value)}
                      placeholder="نام یا کد شعبه..."
                      className="w-full h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">صاحب حساب / صادرکننده</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={issuer}
                      onChange={e => setIssuer(e.target.value)}
                      placeholder="نام صادرکننده..."
                      className="w-full h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">در وجه</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={receiver}
                      onChange={e => setReceiver(e.target.value)}
                      placeholder="در وجه شخص/شرکت..."
                      className="w-full h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">تاریخ سررسید (وصول) *</label>
                    <div className="h-[42px]">
                      <GlassDatePicker value={dueDate} onChange={setDueDate} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">تاریخ صدور چک</label>
                    <div className="h-[42px]">
                      <GlassDatePicker value={issueDate} onChange={setIssueDate} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">سری چک</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={series}
                      onChange={e => setSeries(e.target.value)}
                      placeholder="سری الف / ..."
                      className="w-full h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ۵. موتور تخصیص و تسویه هوشمند بدهی‌ها و مطالبات (FIFO Engine) */}
            {availableDebts.length > 0 && (
              <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="text-xs font-black text-slate-800 dark:text-white">
                      موتور تخصیص و تسویه هوشمند بدهی‌ها ({availableDebts.length} ردیف باز)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllDebts}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {selectedDebtIds.length === availableDebts.length ? 'لغو انتخاب همه' : 'انتخاب همه اقلام'}
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto modal-scrollbar space-y-2.5">
                  {availableDebts.map(debt => {
                    const isChecked = selectedDebtIds.includes(debt.id);
                    const sim = simulatedAllocations.find(s => s.item.id === debt.id);

                    return (
                      <div
                        key={debt.id}
                        onClick={() => handleToggleDebt(debt.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-400 dark:border-amber-600'
                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <AnimatedCheckbox
                            checked={isChecked}
                            onChange={() => handleToggleDebt(debt.id)}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {debt.categoryLabel}
                              </span>
                              <span className="text-xs font-bold text-slate-800 dark:text-white">
                                {debt.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block mt-0.5">
                              سررسید: {debt.date} | مبلغ کل: {formatCurrency(debt.totalCost)}
                              {debt.paidAmount > 0 && (
                                <span className="text-amber-600 dark:text-amber-400 font-bold mr-1.5">
                                  | پرداختی قبلی: {formatCurrency(debt.paidAmount)}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 text-xs font-mono font-black text-rose-600 dark:text-rose-400">
                            مانده: {formatCurrency(debt.remainingAmount)} {getCurrencyUnit()}
                          </div>
                          {sim && (
                            <span className={`text-[10px] font-black block mt-1 ${
                              sim.nextStatus === 'SETTLED' ? 'text-emerald-500' : 'text-amber-500'
                            }`}>
                              تخصیص: {formatCurrency(sim.willPay)} ({sim.nextStatus === 'SETTLED' ? 'تسویه کامل' : 'تسویه بخشی'})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ۶. رسید متنی بانک، پیوست تصاویر و توضیحات با پیش‌نویس‌های شیشه‌ای */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* پیامک بانک و توضیحات */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <ClipboardPaste className="w-3.5 h-3.5 text-indigo-500" />
                      <span>متن پیامک بانک / رسید متنی</span>
                    </label>
                    <button type="button" onClick={handlePasteSMS} className="text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer">
                      جای‌گذاری از کلیپ‌بورد
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    autoComplete="off"
                    value={textReceipt}
                    onChange={e => setTextReceipt(e.target.value)}
                    placeholder="متن پیامک واریز یا برداشت بانک..."
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="space-y-1 relative" ref={presetsRef}>
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-indigo-500" />
                      <span>توضیحات و بابت سند</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDescriptionPresets(!showDescriptionPresets)}
                      className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      پیش‌نویس‌های آماده
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      autoComplete="off"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="مثال: بابت تعمیر موتور، حق‌العمل..."
                      className="w-full h-[42px] px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500"
                    />

                    {/* پاپ‌آپ شیشه‌ای پیش‌نویس‌ها (Glass Animated Popover) */}
                    <AnimatePresence>
                      {showDescriptionPresets && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full mb-2 right-0 left-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-2 z-50 max-h-48 overflow-y-auto modal-scrollbar"
                        >
                          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 px-2 py-1 mb-1">
                            انتخاب سریع شرح بابت سند:
                          </div>
                          <div className="space-y-1">
                            {currentPresets.map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setDescription(preset);
                                  setShowDescriptionPresets(false);
                                }}
                                className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-colors flex items-center justify-between"
                              >
                                <span>{preset}</span>
                                <CornerDownLeft className="w-3.5 h-3.5 opacity-40" />
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* آپلودر تصاویر فیش / چک */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>پیوست تصویر فیش واریز یا چک (حداکثر ۳ تصویر)</span>
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {attachments.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 flex flex-col items-center justify-center text-indigo-500 transition-colors cursor-pointer shrink-0"
                    >
                      <UploadCloud className="w-6 h-6" />
                      <span className="text-[10px] font-bold mt-1">افزودن</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 overflow-x-auto modal-scrollbar">
                    {attachments.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group shrink-0">
                        <img src={img} alt="پیوست" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-rose-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                className={`flex-1 py-4 rounded-2xl font-black text-sm text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 ${
                  direction === 'IN'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 shadow-rose-500/25'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{editTransaction ? 'ذخیره تغییرات سند' : (direction === 'IN' ? 'ثبت ورود وجه به صندوق' : 'ثبت سند پرداخت خروجی')}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-4 rounded-2xl font-bold text-sm bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                انصراف
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    portalTarget
  );
}
