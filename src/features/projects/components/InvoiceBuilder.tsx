import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, CheckCircle, Save, X, Eye, EyeOff, 
  Calculator, FileText, User, Layers, Database,
  ToggleLeft, ToggleRight, Banknote, Percent,
  Search, HardHat, Truck, Box, Store, Briefcase, CreditCard, Camera, ClipboardPaste, FileDown, Link as LinkIcon, ChevronDown, Paperclip, Building2, Calendar // 💡 آیکون Calendar اضافه شد
} from 'lucide-react';
import { toast } from 'sonner';

// 💡 استفاده انحصاری از dom-to-image-more (بدون html2canvas)
import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';
import Num2persian from 'num2persian';

import { useInvoiceStore, type Invoice, type InvoiceItem } from '../../../store/invoiceStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { useProjectStore } from '../../projects/store/projectStore'; 
import { useClientStore } from '../../../store/clientStore';

import { useInventoryStore } from '../../../store/inventoryStore';
import { useFinanceStore } from '../../../store/financeStore';

import A4InvoiceTemplate from '../../../components/ui/A4InvoiceTemplate';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';

type ItemCategory = 'INVENTORY' | 'FREE_MARKET' | 'LABOR' | 'LOGISTICS';

interface InvoiceBuilderProps {
  projectId?: string; 
  clientId?: string; 
  onClose: () => void;
  existingInvoiceId?: string; 
}

const DUMMY_LABOR_DB = [
  { id: 'l1', name: 'استادکار بنا', defaultWage: 1200000 },
  { id: 'l2', name: 'کارگر ساده', defaultWage: 800000 },
  { id: 'l3', name: 'اکیپ کناف‌کار', defaultWage: 0 }
];
const DUMMY_LOGISTICS_DB = [
  { id: 'log1', name: 'کامیون کمپرسی', defaultCost: 2500000, defaultUnit: 'سرویس' },
  { id: 'log2', name: 'بیل مکانیکی', defaultCost: 5000000, defaultUnit: 'ساعت' },
  { id: 'log3', name: 'موتور برق (اجاره)', defaultCost: 350000, defaultUnit: 'روز' },
  { id: 'log4', name: 'میکسر بتن (اجاره)', defaultCost: 450000, defaultUnit: 'روز' }
];

const getItemLabels = (category: ItemCategory, currency: string) => {
  switch (category) {
    case 'LABOR':
      return { cost: `دستمزد پرداختی (${currency})`, price: `دستمزد اعلامی (${currency})` };
    case 'LOGISTICS':
      return { cost: `هزینه پرداختی شما (${currency})`, price: `کرایه/اجاره اعلامی (${currency})` };
    case 'INVENTORY':
      return { cost: `بهای تمام‌شده انبار (${currency})`, price: `فروش به کارفرما (${currency})` };
    case 'FREE_MARKET':
    default:
      return { cost: `قیمت خرید آزاد (${currency})`, price: `اعلامی فاکتور (${currency})` };
  }
};

const ModernSelect = ({ value, onChange, options, placeholder, icon: Icon, disabled }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o: any) => o.value === value);

  return (
    <div className="relative w-full z-[100]">
      <button 
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-slate-800 dark:text-white text-sm flex items-center justify-between transition-colors shadow-inner ${disabled ? 'opacity-50 cursor-not-allowed' : 'focus:border-cyan-500'}`}
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-4 h-4 text-slate-400"/>}
          {selectedOption ? selectedOption.label : <span className="text-slate-500">{placeholder}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}></div>
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl z-[110] max-h-60 overflow-y-auto modal-scrollbar"
            >
              {options.map((opt: any) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full text-right px-4 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0 ${opt.color || 'text-slate-800 dark:text-white'}`}
                >
                  {opt.label}
                </button>
              ))}
              {options.length === 0 && <div className="p-4 text-center text-xs text-slate-500">موردی یافت نشد</div>}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function InvoiceBuilder({ projectId, clientId, onClose, existingInvoiceId }: InvoiceBuilderProps) {
  const addInvoice = useInvoiceStore(state => state.addInvoice);
  const updateInvoice = useInvoiceStore(state => state.updateInvoice);
  const invoices = useInvoiceStore(state => state.invoices);
  const userSettings = useSettingsStore(state => state.settings);
  
  const allProjectsDB = useProjectStore?.(state => state.projects) || [];
  const addProjectDB = useProjectStore?.(state => state.addProject); 
  
  const clientsDB = useClientStore?.(state => state.clients) || [];
  const addClientDB = useClientStore?.(state => state.addClient); 
  
  const inventoryDB = useInventoryStore?.(state => state.materials) || [];
  const deductStock = useInventoryStore?.(state => state.deductStock);
  const addTransactionDB = useFinanceStore?.(state => state.addTransaction);

  const isRial = userSettings?.currency === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';
  const currencyMultiplier = isRial ? 10 : 1; 

  const parseNum = (val: string | number) => {
    if (val === undefined || val === null || val === '') return 0;
    const strVal = val.toString();
    const enStr = strVal
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/,/g, '')
      .replace(/[^0-9.-]/g, ''); 
    return (Number(enStr) || 0) / currencyMultiplier;
  };

  const formatNum = (val: number | string) => {
    if (val === 0 || val === '0') return '0';
    if (!val) return '';
    const num = parseNum(val) * currencyMultiplier;
    return num.toLocaleString('fa-IR');
  };

  const [taxRate, setTaxRate] = useState(userSettings?.defaultTaxRate || 9); 
  const [retentionRate, setRetentionRate] = useState(userSettings?.defaultRetentionRate || 10); 
  const [insuranceRate, setInsuranceRate] = useState(userSettings?.defaultInsuranceRate || 5); 

  const [syncClient, setSyncClient] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const cashImageRef = useRef<HTMLInputElement>(null);

  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', lastName: '', phone: '', type: 'PERSON' as 'PERSON'|'COMPANY' });
  
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const [draft, setDraft] = useState<any>({
    status: 'DRAFT',
    isOfficial: true, 
    isGlobalSyncEnabled: true,
    projectId: '',
    clientId: '', 
    clientName: '',
    clientPhone: '',
    terms: '', 
    signatures: { preparer: 'مدیر سیستم', approver: '', client: '' }, 
    items: [],
    payment: {
      type: 'COMBO', 
      isSyncedWithFinance: true,
      cashAmount: 0, cashReceiptText: '', cashReceiptImage: '',
      chequeAmount: 0, debtAmount: 0,
      retentionAmount: 0, insuranceAmount: 0, taxAmount: 0, 
      globalDiscount: 0, globalDiscountType: 'AMOUNT',
      totalDiscount: 0, cheques: []
    },
    attachments: [] 
  });

  const projectsDB = useMemo(() => {
    if (draft.clientId) {
      return allProjectsDB.filter((p:any) => p.clientId === draft.clientId);
    }
    return allProjectsDB;
  }, [allProjectsDB, draft.clientId]);

  useEffect(() => {
    if (existingInvoiceId) {
      const inv = invoices.find(i => i.id === existingInvoiceId);
      if (inv) {
        setDraft(inv);
        setSyncClient(inv.isGlobalSyncEnabled || false);
      }
    } else {
      let preProjectId = projectId || '';
      let preClientId = clientId || '';
      let preClientName = '';
      let preClientPhone = '';

      if (preProjectId) {
        const proj = allProjectsDB.find(p => p.id === preProjectId);
        if (proj && proj.clientId) preClientId = proj.clientId;
      }
      
      if (preClientId) {
        const client = clientsDB.find((c:any) => c.id === preClientId);
        if (client) {
          preClientName = `${client.name} ${client.lastName || ''}`.trim();
          preClientPhone = client.phone || '';
        }
      }

      setDraft((prev: any) => ({
        ...prev,
        projectId: preProjectId,
        clientId: preClientId,
        clientName: preClientName,
        clientPhone: preClientPhone,
        date: new Date().toLocaleDateString('fa-IR'),
        invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}` 
      }));
    }
  }, [existingInvoiceId, projectId, clientId, invoices, allProjectsDB, clientsDB]);

  const selectedProject = projectsDB.find((p:any) => p.id === draft.projectId);
  const projectPhases = selectedProject?.phases || [];

  useEffect(() => {
    const subTotal = (draft.items || []).reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
    
    const totalRowDiscounts = (draft.items || []).reduce((sum: number, item: any) => {
       const rawTotal = (item.quantity || 0) * (item.unitPrice || 0);
       const d = item.discountType === 'PERCENT' ? Math.floor(rawTotal * ((item.discount || 0) / 100)) : (item.discount || 0);
       return sum + d;
    }, 0);
    
    const totalHiddenProfit = (draft.items || []).reduce((sum: number, item: any) => sum + (item.hiddenProfit || 0), 0);
    
    const tax = draft.isOfficial ? (draft.payment?.taxAmount || 0) : 0;
    const retention = draft.payment?.retentionAmount || 0;
    const insurance = draft.payment?.insuranceAmount || 0;
    
    const globalDiscountAmount = draft.payment?.globalDiscountType === 'PERCENT'
        ? Math.floor(subTotal * ((draft.payment?.globalDiscount || 0) / 100))
        : (draft.payment?.globalDiscount || 0);
    
    const totalDiscount = totalRowDiscounts + globalDiscountAmount;
    const grandTotal = subTotal + tax - retention - insurance - globalDiscountAmount;
    
    const cash = draft.payment?.cashAmount || 0;
    const cheques = (draft.payment?.cheques || []).reduce((sum: number, chq: any) => sum + (chq.amount || 0), 0);
    const debt = Math.max(0, grandTotal - cash - cheques);

    setDraft((prev: any) => ({
      ...prev,
      subTotal, grandTotal, totalHiddenProfit,
      payment: {
        ...prev.payment!,
        chequeAmount: cheques,
        debtAmount: prev.payment.type === 'CASH' ? 0 : debt,
        totalDiscount,
        taxAmount: prev.isOfficial ? prev.payment.taxAmount : 0 
      }
    }));
  }, [draft.items, draft.payment?.taxAmount, draft.payment?.retentionAmount, draft.payment?.insuranceAmount, draft.payment?.cashAmount, draft.payment?.cheques, draft.payment?.globalDiscount, draft.payment?.globalDiscountType, draft.payment?.type, draft.isOfficial]);

  const handleAddItem = (category: ItemCategory) => {
    const defaultDate = new Date().toLocaleDateString('fa-IR');
    const newItem: any = {
      id: crypto.randomUUID(), type: 'CUSTOM', category,
      title: '', quantity: 1, 
      unit: category === 'LABOR' ? 'روز' : category === 'LOGISTICS' ? 'سرویس' : 'عدد', 
      unitPrice: 0, costPrice: 0, 
      discount: 0, discountType: 'AMOUNT', hiddenProfit: 0, totalPrice: 0,
      isSyncedWithSystem: draft.isGlobalSyncEnabled,
      referenceRecordId: '', 
      startDate: defaultDate, 
      endDate: '', 
      daysCount: 1,
      dates: [defaultDate], 
      availableUnits: [],
      phaseId: '', 
      attachment: '' 
    };
    setDraft((prev: any) => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const handleResourceSelect = (id: string, resourceId: string, category: ItemCategory) => {
    let title = '', cost = 0, unit = '';
    let availableUnits: string[] = [];

    if (category === 'INVENTORY') {
      const p = inventoryDB.find((i:any) => i.id === resourceId);
      if (p) { title = p.name; cost = p.costPrice || 0; unit = p.unit; availableUnits = [p.unit]; }
    } else if (category === 'LABOR') {
      const l = DUMMY_LABOR_DB.find(i => i.id === resourceId);
      if (l) { title = l.name; cost = l.defaultWage || 0; unit = 'روز'; }
    } else if (category === 'LOGISTICS') {
      const v = DUMMY_LOGISTICS_DB.find(i => i.id === resourceId);
      if (v) { title = v.name; cost = v.defaultCost || 0; unit = v.defaultUnit || 'سرویس'; }
    }

    setDraft((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any) => {
        if (item.id === id) {
          return { ...item, title, costPrice: cost, unit, availableUnits: availableUnits.length ? availableUnits : item.availableUnits, referenceRecordId: resourceId };
        }
        return item;
      })
    }));
    handleUpdateItem(id, 'quantity', 1); 
  };

  const handleUpdateItem = (id: string, field: string, value: any) => {
    setDraft((prev: any) => ({
      ...prev,
      items: prev.items?.map((item: any) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        
        if (updated.category === 'LABOR' && (field === 'startDate' || field === 'endDate' || field === 'daysCount' || field === 'dates')) {
           updated.quantity = updated.daysCount || 1; 
        }

        if (['quantity', 'unitPrice', 'costPrice', 'discount', 'discountType', 'daysCount'].includes(field)) {
          const qty = updated.quantity || 0;
          const uPrice = updated.unitPrice || 0;
          const cPrice = updated.costPrice || 0;

          const rawTotal = qty * uPrice; 
          const rawCost = qty * cPrice;  
          
          const discAmount = updated.discountType === 'PERCENT' 
              ? Math.floor(rawTotal * ((updated.discount || 0) / 100))
              : (updated.discount || 0);

          updated.totalPrice = Math.max(0, rawTotal - discAmount);
          updated.hiddenProfit = updated.totalPrice - rawCost;
        }
        return updated;
      })
    }));
  };

  const handleRemoveItem = (id: string) => {
    setDraft((prev: any) => ({ ...prev, items: prev.items?.filter((i: any) => i.id !== id) }));
  };

  const handlePaymentTypeChange = (type: string) => {
    setDraft((p: any) => {
      const newPayment = { ...p.payment, type };
      const total = p.grandTotal || 0;
      if (type === 'CASH') { newPayment.cashAmount = total; newPayment.cheques = []; }
      else if (type === 'CREDIT') { newPayment.cashAmount = 0; newPayment.cheques = []; }
      else if (type === 'CHEQUE') { newPayment.cashAmount = 0; }
      return { ...p, payment: newPayment };
    });
  };

  const addCheque = () => {
    const today = new Date().toLocaleDateString('fa-IR');
    const newCheque = { id: crypto.randomUUID(), bank: '', amount: 0, issuer: '', issueDate: today, dueDate: today, sayyadId: '', serialNumber: '', hasImage: false };
    setDraft((p: any) => ({ ...p, payment: { ...p.payment, cheques: [...(p.payment.cheques || []), newCheque] } }));
  };
  
  const updateCheque = (id: string, field: string, value: any) => {
    setDraft((p: any) => ({ ...p, payment: { ...p.payment, cheques: p.payment.cheques.map((c: any) => c.id === id ? { ...c, [field]: value } : c) } }));
  };

  // 💡 موتور جدید فشرده‌سازی هوشمند تصاویر برای جلوگیری از پر شدن حافظه (QuotaExceededError)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800; // محدودسازی ابعاد برای جلوگیری از کرش پایگاه داده
        
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // تبدیل به فرمت JPEG با کیفیت ۶۰٪ برای کاهش شدید حجم عکس
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        callback(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const applySmartDeductions = () => {
    const sub = (draft.items || []).reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
    if (sub === 0) return toast.error('مبلغ کل صفر است! ابتدا ردیف‌های هزینه‌ای را وارد کنید.');
    
    setDraft((prev: any) => ({
      ...prev,
      payment: {
        ...prev.payment!,
        taxAmount: prev.isOfficial ? Math.floor(sub * (taxRate / 100)) : 0, 
        retentionAmount: Math.floor(sub * (retentionRate / 100)),
        insuranceAmount: Math.floor(sub * (insuranceRate / 100)),
      }
    }));
    toast.success('کسورات و درصدها با موفقیت محاسبه شد.');
  };

  const handleSave = () => {
    if (!draft.clientName) return toast.error('لطفاً نام مشتری/کارفرما را وارد کنید.');
    if (!draft.items || draft.items.length === 0) return toast.error('حداقل یک ردیف در فاکتور الزامی است.');

    const allAttachments: string[] = [];
    draft.items.forEach((i: any) => {
      if (i.attachment && i.attachment.startsWith('data:image')) allAttachments.push(i.attachment);
    });
    if (draft.payment?.cashReceiptImage && draft.payment.cashReceiptImage.startsWith('data:image')) {
      allAttachments.push(draft.payment.cashReceiptImage);
    }
    draft.payment?.cheques?.forEach((c: any) => {
      if (c.hasImage && typeof c.hasImage === 'string' && c.hasImage.startsWith('data:image')) {
        allAttachments.push(c.hasImage);
      }
    });

    const finalDraft = { ...draft, attachments: allAttachments };

    try {
      if (!existingInvoiceId) {
        const newInvoiceId = addInvoice(finalDraft as any);
        
        // همگام‌سازی واقعی با انبار (کسر کالاها) 
        if (finalDraft.isGlobalSyncEnabled && deductStock) {
          let deductedCount = 0;
          finalDraft.items.forEach((item: any) => {
            if (item.category === 'INVENTORY' && item.isSyncedWithSystem && item.referenceRecordId) {
              deductStock(item.referenceRecordId, item.quantity);
              deductedCount++;
            }
          });
          if (deductedCount > 0) {
            toast.success(`${deductedCount} قلم کالا با موفقیت از انبار کسر شد.`);
          }
        }

        // همگام‌سازی واقعی با صندوق مالی
        if (finalDraft.payment?.isSyncedWithFinance && finalDraft.status !== 'PROFORMA' && addTransactionDB) {
          let financeSynced = false;
          
          if (finalDraft.payment.cashAmount > 0) {
            addTransactionDB({
              referenceId: newInvoiceId,
              clientId: finalDraft.clientId,
              amount: finalDraft.payment.cashAmount,
              date: finalDraft.date,
              description: `دریافت نقدی بابت فاکتور ${finalDraft.invoiceNumber}`,
              direction: 'IN',
              type: 'CASH',
              attachments: finalDraft.payment.cashReceiptImage && finalDraft.payment.cashReceiptImage !== 'UPLOADED' ? [finalDraft.payment.cashReceiptImage] : [],
              textReceipt: finalDraft.payment.cashReceiptText,
              allocations: finalDraft.projectId ? [{ id: crypto.randomUUID(), amount: finalDraft.payment.cashAmount, allocationType: 'PROJECT', projectId: finalDraft.projectId }] : []
            });
            financeSynced = true;
          }

          if (finalDraft.payment.cheques && finalDraft.payment.cheques.length > 0) {
            finalDraft.payment.cheques.forEach((chq: any) => {
              addTransactionDB({
                referenceId: newInvoiceId,
                clientId: finalDraft.clientId,
                amount: chq.amount,
                date: chq.issueDate || finalDraft.date,
                description: `دریافت چک بابت فاکتور ${finalDraft.invoiceNumber}`,
                direction: 'IN',
                type: 'CHEQUE',
                attachments: chq.hasImage && chq.hasImage !== true ? [chq.hasImage] : [],
                chequeDetails: {
                  bank: chq.bank || '',
                  dueDate: chq.dueDate || '',
                  issueDate: chq.issueDate || '',
                  issuer: chq.issuer || '',
                  sayyadId: chq.sayyadId || '',
                  serialNumber: chq.serialNumber || '',
                  status: 'PENDING',
                  history: [{
                    id: crypto.randomUUID(),
                    date: new Date().toLocaleDateString('fa-IR'),
                    previousStatus: 'PENDING',
                    newStatus: 'PENDING',
                    description: 'ثبت اولیه چک در سیستم هنگام صدور فاکتور'
                  }]
                },
                allocations: finalDraft.projectId ? [{ id: crypto.randomUUID(), amount: chq.amount, allocationType: 'PROJECT', projectId: finalDraft.projectId }] : []
              });
            });
            financeSynced = true;
          }

          if (financeSynced) {
             toast.success('مبالغ و چک‌های دریافتی با موفقیت در صندوق مالی سیستم ثبت شدند.');
          }
        }
        
        toast.success('فاکتور جدید با موفقیت صادر و ذخیره شد.');
      } else {
        updateInvoice(existingInvoiceId, finalDraft as any, 'ویرایش دستی صورت‌وضعیت');
        toast.success('فاکتور با موفقیت بروزرسانی شد.');
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('حجم عکس‌های پیوست شده بیش از حد مجاز است! لطفاً عکس‌های کمتری انتخاب کنید.');
    }
  };

  const handleQuickCreateClient = () => {
    if (!newClientData.name) return toast.error('وارد کردن نام الزامی است.');
    const newId = crypto.randomUUID();
    if (addClientDB) {
      addClientDB({
        id: newId,
        name: newClientData.name,
        lastName: newClientData.lastName,
        phone: newClientData.phone,
        type: newClientData.type,
        status: 'ACTIVE',
        creditScore: 100,
        projects: [],
        joinDate: new Date().toLocaleDateString('fa-IR')
      });
      setDraft((p:any) => ({
        ...p,
        clientId: newId,
        clientName: `${newClientData.name} ${newClientData.lastName}`.trim(),
        clientPhone: newClientData.phone,
        projectId: '' 
      }));
      setIsNewClientModalOpen(false);
      setNewClientData({ name: '', lastName: '', phone: '', type: 'PERSON' });
      toast.success('مشتری جدید ساخته و انتخاب شد.');
    }
  };

  const handleQuickCreateProject = () => {
    if (!draft.clientId) return toast.error('ابتدا یک کارفرما انتخاب کنید.');
    if (!newProjectName) return toast.error('نام پروژه را وارد کنید.');
    
    const newId = crypto.randomUUID();
    if (addProjectDB) {
      addProjectDB({
        id: newId,
        name: newProjectName,
        clientId: draft.clientId,
        status: 'IN_PROGRESS',
        startDate: new Date().toLocaleDateString('fa-IR'),
        phases: [{ 
          id: crypto.randomUUID(), 
          name: 'فاز اول (پیش‌فرض)', 
          contractType: 'CONTRAT', 
          fixedPrice: 0, 
          isCompleted: false 
        }],
        archive: [],
        purchases: [],
        logistics: [],
        laborRecords: []
      });
      setDraft((p:any) => ({ ...p, projectId: newId }));
      setIsNewProjectModalOpen(false);
      setNewProjectName('');
      toast.success('پروژه جدید ساخته و انتخاب شد.');
    }
  };

  // 🚀 موتور جدید خروجی PDF (پاکسازی کامل html2canvas)
  const exportPDF = async () => {
    setIsExporting(true);
    const element = document.getElementById('a4-print-area');
    const wrapper = element?.parentElement;

    if (!element || !wrapper) {
      toast.error('برگه برای چاپ آماده نیست!');
      setIsExporting(false);
      return;
    }

    try {
      toast.loading('در حال پردازش و تولید فایل PDF...', { id: 'pdf-gen' });
      
      const originalTransform = wrapper.style.transform;
      const originalTransition = wrapper.style.transition;

      wrapper.style.transition = 'none';
      wrapper.style.transform = 'scale(1)';

      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await domtoimage.toJpeg(element, { 
        quality: 1, 
        bgcolor: '#ffffff',
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });
      
      wrapper.style.transform = originalTransform || '';
      requestAnimationFrame(() => {
        wrapper.style.transition = originalTransition || '';
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${draft.invoiceNumber}.pdf`);
      
      toast.dismiss('pdf-gen');
      toast.success('فایل PDF با کیفیت بالا ذخیره شد!');
    } catch (err) {
      toast.dismiss('pdf-gen');
      console.error('PDF Generation Error:', err);
      if (wrapper) {
         wrapper.style.transform = '';
         wrapper.style.transition = '';
      }
      toast.error('خطا در تولید PDF! لطفاً مجددا تلاش کنید.');
    } finally {
      setIsExporting(false);
    }
  };

  const getUnitOptions = (category: ItemCategory, availableUnits: string[]) => {
    if (category === 'INVENTORY' && availableUnits.length > 0) return availableUnits.map(u => ({label: u, value: u}));
    if (category === 'LABOR') return ['روز', 'ساعت', 'شیفت', 'مقطوع (پروژه‌ای)', 'متر مربع'].map(u => ({label: u, value: u}));
    if (category === 'LOGISTICS') return ['سرویس', 'روزی', 'ساعت', 'کنترات', 'دستگاه', 'تن', 'کیلومتر'].map(u => ({label: u, value: u}));
    return ['عدد', 'متر', 'کیلوگرم', 'تن', 'شاخه', 'متر مربع', 'پاکت', 'لیتر', 'دستگاه', 'سرویس'].map(u => ({label: u, value: u}));
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl" dir="rtl">
      
      <div className="w-full xl:w-[55%] h-full flex flex-col bg-slate-50/80 dark:bg-slate-900/50 border-l border-slate-200 dark:border-slate-700 relative z-10 shadow-2xl">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 relative z-[100]">
          <div className="flex items-center gap-4">
            <button type="button" onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-500 text-slate-500 dark:text-slate-400 dark:hover:bg-rose-500/20 dark:hover:text-rose-500 rounded-xl transition-colors"><X className="w-5 h-5"/></button>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                {existingInvoiceId ? 'ویرایش صورت‌وضعیت' : 'صدور صورت‌وضعیت هوشمند'}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button type="button" onClick={() => setDraft((p: any) => ({ ...p, isOfficial: !p.isOfficial }))} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${draft.isOfficial ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
               <Building2 className="w-4 h-4"/>
               {draft.isOfficial ? 'فاکتور رسمی (دارایی)' : 'فاکتور داخلی (غیررسمی)'}
             </button>

             <button type="button" onClick={() => setDraft((p: any) => ({ ...p, status: p.status === 'PROFORMA' ? 'DRAFT' : 'PROFORMA' }))} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${draft.status === 'PROFORMA' ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
               {draft.status === 'PROFORMA' ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
               {draft.status === 'PROFORMA' ? 'حالت پیش‌فاکتور' : 'فاکتور قطعی'}
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-visible p-6 space-y-8 relative z-[40] pb-[500px] modal-scrollbar">
          
          <section className="space-y-4 bg-white/50 dark:bg-slate-800/30 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/50 relative z-[90]">
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><Briefcase className="w-4 h-4 text-emerald-500 dark:text-emerald-400"/> مشخصات پروژه و کارفرما</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative">
              
              <div className="space-y-2 sm:col-span-2 relative z-[95]">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">اختصاص به پروژه (اختیاری)</label>
                <ModernSelect 
                  options={[
                    {value: '', label: 'بدون پروژه (عمومی)'}, 
                    {value: 'NEW', label: '+ ثبت پروژه‌ی جدید برای این شخص', color: 'text-blue-600 dark:text-blue-400'},
                    ...projectsDB.map((p:any) => ({value: p.id, label: p.name}))
                  ]}
                  value={draft.projectId}
                  onChange={(v:string) => {
                    if (v === 'NEW') {
                      if (!draft.clientId) toast.error('اول یک کارفرما/مشتری رو از کادر پایین انتخاب کن.');
                      else setIsNewProjectModalOpen(true);
                    } else {
                      setDraft((p: any) => ({ ...p, projectId: v }));
                    }
                  }}
                  placeholder="انتخاب پروژه..."
                />
              </div>

              <div className="space-y-2 relative z-[94]">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">نام کارفرما / مشتری *</label>
                  <button type="button" onClick={() => setSyncClient(!syncClient)} className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold transition-colors border ${syncClient ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'}`}>
                    <Database className="w-3 h-3"/> {syncClient ? 'ذخیره CRM' : 'گرافیکی'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                     <ModernSelect 
                        options={[{value: 'NEW', label: '+ ثبت مشتری جدید', color: 'text-emerald-600 dark:text-emerald-400'}, ...clientsDB.map((c:any) => ({value: c.id, label: `${c.name} ${c.lastName || ''}`.trim()}))]}
                        value={draft.clientId || ''} 
                        onChange={(v:string) => {
                           if(v === 'NEW') setIsNewClientModalOpen(true); 
                           else {
                             const client = clientsDB.find((c:any) => c.id === v);
                             if(client) setDraft((p:any) => ({...p, clientId: client.id, clientName: `${client.name} ${client.lastName || ''}`.trim(), clientPhone: client.phone, projectId: ''}));
                           }
                        }}
                        placeholder="انتخاب از لیست..."
                     />
                  </div>
                  <input value={draft.clientName || ''} onChange={e => setDraft((p: any) => ({ ...p, clientName: e.target.value }))} placeholder="یا تایپ دستی..." className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 outline-none text-slate-800 dark:text-white text-sm focus:border-cyan-500" />
                </div>
              </div>

              <div className="space-y-2 relative z-[93]">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-[26px] block">شماره تماس</label>
                <input value={draft.clientPhone || ''} onChange={e => setDraft((p: any) => ({ ...p, clientPhone: e.target.value }))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-[11px] outline-none text-slate-800 dark:text-white font-mono text-left focus:border-emerald-500" placeholder="0912..." dir="ltr" />
              </div>
              
              <div className="space-y-2 sm:col-span-2 relative z-[92]">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">تاریخ صدور فاکتور</label>
                <div className="relative">
                  <GlassDatePicker value={draft.date || ''} onChange={d => setDraft((p: any) => ({ ...p, date: d }))} />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 relative z-[80]">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 flex-wrap gap-2">
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-500 dark:text-cyan-400"/> ردیف‌های هزینه‌ای</h3>
              <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => handleAddItem('INVENTORY')} className="text-[10px] font-bold bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-cyan-200 dark:hover:bg-cyan-500/30 transition-colors"><Box className="w-3.5 h-3.5"/> انبار مصالح</button>
                <button type="button" onClick={() => handleAddItem('FREE_MARKET')} className="text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"><Store className="w-3.5 h-3.5"/> بازار آزاد</button>
                <button type="button" onClick={() => handleAddItem('LABOR')} className="text-[10px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors"><HardHat className="w-3.5 h-3.5"/> پرسنل</button>
                <button type="button" onClick={() => handleAddItem('LOGISTICS')} className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors"><Truck className="w-3.5 h-3.5"/> ابزار/لجستیک</button>
              </div>
            </div>
            
            <AnimatePresence>
              {(draft.items || []).map((item: any, idx: number) => {
                const labels = getItemLabels(item.category, currencyLabel);

                return (
                <motion.div key={item.id} style={{ zIndex: 80 - idx }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="p-5 bg-white/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl relative group shadow-lg">
                  <button type="button" onClick={() => handleRemoveItem(item.id)} className="absolute -top-3 -left-3 p-2 bg-rose-500 text-white rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-20"><Trash2 className="w-4 h-4"/></button>
                  <span className="absolute -right-3 -top-3 w-7 h-7 bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center rounded-xl font-black text-xs border-2 border-white dark:border-slate-900 shadow-md">{idx + 1}</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-2 relative">
                    <div className="md:col-span-12 flex justify-between items-center border-b border-slate-200 dark:border-slate-700/50 pb-3 mb-1">
                      <span className="text-[11px] font-black px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700/50">
                        {item.category === 'INVENTORY' && <><Box className="w-4 h-4 text-cyan-500 dark:text-cyan-400"/> مصالح انبار</>}
                        {item.category === 'FREE_MARKET' && <><Store className="w-4 h-4 text-amber-500 dark:text-amber-400"/> خرید بازار آزاد</>}
                        {item.category === 'LABOR' && <><HardHat className="w-4 h-4 text-purple-500 dark:text-purple-400"/> دستمزد نیروی کار</>}
                        {item.category === 'LOGISTICS' && <><Truck className="w-4 h-4 text-emerald-500 dark:text-emerald-400"/> ماشین‌آلات و ابزار</>}
                      </span>
                      <button 
                        type="button"
                        onClick={() => handleUpdateItem(item.id, 'isSyncedWithSystem', !item.isSyncedWithSystem)} 
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors border shadow-sm ${item.isSyncedWithSystem ? 'bg-indigo-100 text-indigo-600 border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30' : 'bg-white text-slate-500 border-slate-300 dark:bg-slate-900 dark:border-slate-700'}`}
                      >
                        <Database className="w-3 h-3"/> {item.isSyncedWithSystem ? 'ثبت DB' : 'فقط گرافیکی'}
                      </button>
                    </div>

                    <div className="md:col-span-6 space-y-2 relative z-[85]">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">شرح / عنوان</label>
                      {item.category === 'INVENTORY' ? (
                        <ModernSelect 
                          options={inventoryDB.map((inv:any) => ({value: inv.id, label: inv.name}))}
                          value={item.referenceRecordId || inventoryDB.find((i:any) => i.name === item.title)?.id || ''}
                          onChange={(v:string) => handleResourceSelect(item.id, v, 'INVENTORY')}
                          placeholder="انتخاب از انبار..."
                        />
                      ) : item.category === 'LABOR' ? (
                        <ModernSelect 
                          options={[{value: 'NEW', label: '+ ثبت پرسنل جدید', color: 'text-emerald-600 dark:text-emerald-400'}, ...DUMMY_LABOR_DB.map((l:any) => ({value: l.id, label: l.name}))]}
                          value=""
                          onChange={(v:string) => v === 'NEW' ? toast.info('باز شدن مودال پرسنل') : handleResourceSelect(item.id, v, 'LABOR')}
                          placeholder="انتخاب پرسنل..."
                        />
                      ) : item.category === 'LOGISTICS' ? (
                        <ModernSelect 
                          options={[{value: 'NEW', label: '+ ثبت ماشین/ابزار جدید', color: 'text-emerald-600 dark:text-emerald-400'}, ...DUMMY_LOGISTICS_DB.map((l:any) => ({value: l.id, label: l.name}))]}
                          value=""
                          onChange={(v:string) => v === 'NEW' ? toast.info('باز شدن مودال ناوگان و ابزار') : handleResourceSelect(item.id, v, 'LOGISTICS')}
                          placeholder="انتخاب ابزار / ماشین..."
                        />
                      ) : (
                        <input value={item.title} onChange={e => handleUpdateItem(item.id, 'title', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-[11px] outline-none text-slate-800 dark:text-white text-sm focus:border-cyan-500" placeholder="تایپ دستی بازار آزاد..." />
                      )}
                    </div>

                    <div className="md:col-span-6 space-y-2 relative z-[84]">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">تخصیص به فاز پروژه</label>
                      <ModernSelect 
                        disabled={!draft.projectId || projectPhases.length === 0}
                        options={projectPhases.map((p:any) => ({value: p.id, label: p.name}))}
                        value={item.phaseId}
                        onChange={(v:string) => handleUpdateItem(item.id, 'phaseId', v)}
                        placeholder={!draft.projectId ? 'ابتدا پروژه را انتخاب کنید' : projectPhases.length === 0 ? 'این پروژه فازبندی نشده' : 'انتخاب فاز...'}
                      />
                    </div>

                    {item.category === 'LABOR' ? (
                      <>
                        <div className="md:col-span-4 space-y-2 relative z-[83]">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">تاریخ‌های کارکرد</label>
                            <button type="button" onClick={() => handleUpdateItem(item.id, 'dates', [...(item.dates || [item.startDate]), ''])} className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded transition-colors hover:bg-emerald-200 dark:hover:bg-emerald-500/20">+ افزودن روز</button>
                          </div>
                          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto modal-scrollbar pr-1 pb-2">
                            {(item.dates || [item.startDate]).map((d: string, dIdx: number) => (
                              <div key={dIdx} className="relative flex items-center gap-2" style={{ zIndex: 100 - dIdx }}>
                                <div className="flex-1 relative">
                                  {dIdx === 0 && <label className="text-[8px] text-slate-500 dark:text-slate-400 absolute -top-2 right-2 bg-slate-100 dark:bg-slate-800 px-1 rounded z-10">تاریخ شروع</label>}
                                  {dIdx > 0 && <label className="text-[8px] text-slate-500 dark:text-slate-400 absolute -top-2 right-2 bg-slate-100 dark:bg-slate-800 px-1 rounded z-10">تاریخ {dIdx + 1}</label>}
                                  <GlassDatePicker value={d} onChange={newD => {
                                     const newDates = [...(item.dates || [item.startDate])];
                                     newDates[dIdx] = newD;
                                     handleUpdateItem(item.id, 'dates', newDates);
                                     if (dIdx === 0) handleUpdateItem(item.id, 'startDate', newD);
                                     handleUpdateItem(item.id, 'daysCount', newDates.filter(Boolean).length);
                                  }} />
                                </div>
                                {dIdx > 0 && (
                                  <button type="button" onClick={() => {
                                     const newDates = (item.dates || [item.startDate]).filter((_:any, i:number) => i !== dIdx);
                                     handleUpdateItem(item.id, 'dates', newDates);
                                     handleUpdateItem(item.id, 'daysCount', newDates.filter(Boolean).length);
                                  }} className="p-2.5 bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 rounded-xl hover:bg-rose-200 dark:hover:bg-rose-500/20 transition-colors mt-auto">
                                    <Trash2 className="w-4 h-4"/>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">تعداد روز</label>
                          <input type="number" value={item.daysCount} onChange={e => handleUpdateItem(item.id, 'daysCount', Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-[11px] outline-none text-slate-800 dark:text-white font-mono text-center focus:border-purple-500" dir="ltr" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="md:col-span-3 space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                             {['روز', 'روزی', 'ساعت', 'شیفت', 'سرویس'].includes(item.unit) ? 'مدت / تعداد' : 'مقدار / تعداد'}
                          </label>
                          <input value={formatNum(item.quantity)} onChange={e => handleUpdateItem(item.id, 'quantity', parseNum(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-[11px] outline-none text-slate-800 dark:text-white font-mono text-center focus:border-cyan-500" dir="ltr" />
                        </div>
                        <div className="md:col-span-3 space-y-2 relative z-[82]">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">واحد سنجش</label>
                          <ModernSelect 
                            options={getUnitOptions(item.category, item.availableUnits || [])}
                            value={item.unit}
                            onChange={(v:string) => handleUpdateItem(item.id, 'unit', v)}
                            placeholder="انتخاب واحد"
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{labels.cost}</label>
                      <input value={formatNum(item.costPrice)} onChange={e => handleUpdateItem(item.id, 'costPrice', parseNum(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-[11px] outline-none text-slate-500 dark:text-slate-300 font-mono text-left focus:border-indigo-500" dir="ltr" placeholder="مبلغ..." />
                    </div>

                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{labels.price}</label>
                      <input value={formatNum(item.unitPrice)} onChange={e => handleUpdateItem(item.id, 'unitPrice', parseNum(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-900/50 rounded-xl px-3 py-[11px] outline-none text-emerald-600 dark:text-emerald-400 font-mono text-left focus:border-emerald-500 shadow-inner" dir="ltr" placeholder="مبلغ..." />
                    </div>
                    
                    <div className="md:col-span-3 space-y-2">
                      <div className="flex justify-between items-center">
                         <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400">تخفیف به کارفرما</label>
                         <div className="flex bg-slate-100 dark:bg-slate-800 rounded p-0.5 shadow-inner border border-slate-200 dark:border-slate-700">
                           <button type="button" onClick={() => handleUpdateItem(item.id, 'discountType', 'PERCENT')} className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${item.discountType === 'PERCENT' ? 'bg-amber-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>٪</button>
                           <button type="button" onClick={() => handleUpdateItem(item.id, 'discountType', 'AMOUNT')} className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${item.discountType !== 'PERCENT' ? 'bg-amber-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>{currencyLabel}</button>
                        </div>
                      </div>
                      <input 
                        value={item.discountType === 'PERCENT' ? item.discount : formatNum(item.discount || 0)} 
                        onChange={e => handleUpdateItem(item.id, 'discount', parseNum(e.target.value))} 
                        className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-900/50 rounded-xl px-3 py-[11px] outline-none text-amber-600 dark:text-amber-400 font-mono text-left focus:border-amber-500" 
                        dir="ltr" 
                      />
                    </div>
                    
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[10px] font-bold text-rose-500 dark:text-rose-400">سود پنهان (چاپ نمی‌شود)</label>
                      <div className="w-full bg-slate-50 dark:bg-slate-900/50 border border-rose-200 dark:border-rose-900/30 rounded-xl px-3 py-[11px] text-rose-500 dark:text-rose-400 font-mono text-left opacity-80 cursor-not-allowed" dir="ltr">
                         {formatNum(item.hiddenProfit || 0)}
                      </div>
                    </div>

                    <div className="md:col-span-12 flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 mt-1">
                      <div className="flex flex-wrap items-center gap-2">
                          <label className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold transition-colors border ${item.attachment && item.attachment !== 'UPLOADED' ? 'bg-emerald-100 border-emerald-300 text-emerald-600 dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-400' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                             <Paperclip className="w-3.5 h-3.5"/> {(item.attachment && item.attachment !== 'UPLOADED') ? 'سند ضمیمه شد' : 'آپلود سند / رسید'}
                             <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => { 
                                handleFileUpload(e, (base64) => {
                                  handleUpdateItem(item.id, 'attachment', base64); 
                                  toast.success('سند ضمیمه شد.'); 
                                });
                             }} />
                          </label>

                          <button 
                             type="button" 
                             onClick={() => handleAddItem(item.category)} 
                             className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold transition-colors bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                          >
                             <Plus className="w-3.5 h-3.5"/> ردیف مشابه
                          </button>
                      </div>

                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 font-bold text-[11px]">جمع خالص ردیف:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-black font-mono text-xl">{formatNum(item.totalPrice)} <span className="text-[10px] text-emerald-500/70 dark:text-emerald-500/50">{currencyLabel}</span></span>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )})}
            </AnimatePresence>
          </section>

          {/* ================= درصدها و کسورات ================= */}
          {draft.status !== 'PROFORMA' && (
            <section className="space-y-4 bg-white/50 dark:bg-slate-800/30 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/50 relative z-[70]">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><Calculator className="w-4 h-4 text-rose-500 dark:text-rose-400"/> مالیات، کسورات و تخفیف کل</h3>
                <button type="button" onClick={applySmartDeductions} className="text-[10px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-lg hover:bg-rose-200 dark:hover:bg-rose-500/30 transition-colors shadow-sm">محاسبه خودکار درصدها</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                     <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400">تخفیف کل فاکتور</label>
                     <div className="flex bg-slate-100 dark:bg-slate-800 rounded p-0.5 shadow-inner border border-slate-200 dark:border-slate-700">
                       <button type="button" onClick={() => setDraft((p:any) => ({...p, payment: {...p.payment, globalDiscountType: 'PERCENT'}}))} className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${draft.payment?.globalDiscountType === 'PERCENT' ? 'bg-amber-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>٪</button>
                       <button type="button" onClick={() => setDraft((p:any) => ({...p, payment: {...p.payment, globalDiscountType: 'AMOUNT'}}))} className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${draft.payment?.globalDiscountType !== 'PERCENT' ? 'bg-amber-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>{currencyLabel}</button>
                    </div>
                  </div>
                  <input 
                    value={draft.payment?.globalDiscountType === 'PERCENT' ? (draft.payment?.globalDiscount || '') : formatNum(draft.payment?.globalDiscount || 0)} 
                    onChange={e => setDraft((p: any) => ({ ...p, payment: { ...p.payment!, globalDiscount: parseNum(e.target.value) } }))} 
                    className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-900/50 rounded-xl px-3 py-2.5 outline-none text-amber-600 dark:text-amber-400 font-mono text-left focus:border-amber-500" dir="ltr" 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className={`text-[10px] font-bold ${draft.isOfficial ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'}`}>ارزش افزوده (+)</label>
                    <div className="flex items-center gap-1">
                      <input disabled={!draft.isOfficial} value={formatNum(taxRate)} onChange={e => setTaxRate(parseNum(e.target.value))} className="w-8 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 text-[10px] text-center text-slate-800 dark:text-white outline-none disabled:opacity-50" dir="ltr" />
                      <span className="text-[10px] text-slate-500">٪</span>
                    </div>
                  </div>
                  <input disabled={!draft.isOfficial} value={formatNum(draft.payment?.taxAmount || 0)} onChange={e => setDraft((p: any) => ({ ...p, payment: { ...p.payment!, taxAmount: parseNum(e.target.value) } }))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 outline-none text-slate-800 dark:text-white font-mono text-left disabled:opacity-50 disabled:cursor-not-allowed" dir="ltr" placeholder={draft.isOfficial ? '' : 'فقط در فاکتور رسمی'} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-rose-500 dark:text-rose-400">حسن انجام کار (-)</label>
                    <div className="flex items-center gap-1">
                      <input value={formatNum(retentionRate)} onChange={e => setRetentionRate(parseNum(e.target.value))} className="w-8 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 text-[10px] text-center text-slate-800 dark:text-white outline-none" dir="ltr" />
                      <span className="text-[10px] text-slate-500">٪</span>
                    </div>
                  </div>
                  <input value={formatNum(draft.payment?.retentionAmount || 0)} onChange={e => setDraft((p: any) => ({ ...p, payment: { ...p.payment!, retentionAmount: parseNum(e.target.value) } }))} className="w-full bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/50 rounded-xl px-3 py-2.5 outline-none text-rose-600 dark:text-rose-400 font-mono text-left focus:border-rose-500" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-rose-500 dark:text-rose-400">کسورات بیمه (-)</label>
                    <div className="flex items-center gap-1">
                      <input value={formatNum(insuranceRate)} onChange={e => setInsuranceRate(parseNum(e.target.value))} className="w-8 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 text-[10px] text-center text-slate-800 dark:text-white outline-none" dir="ltr" />
                      <span className="text-[10px] text-slate-500">٪</span>
                    </div>
                  </div>
                  <input value={formatNum(draft.payment?.insuranceAmount || 0)} onChange={e => setDraft((p: any) => ({ ...p, payment: { ...p.payment!, insuranceAmount: parseNum(e.target.value) } }))} className="w-full bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/50 rounded-xl px-3 py-2.5 outline-none text-rose-600 dark:text-rose-400 font-mono text-left focus:border-rose-500" dir="ltr" />
                </div>
              </div>
            </section>
          )}

          {/* ================= شرایط و امضاها ================= */}
          <section className="space-y-4 bg-white/50 dark:bg-slate-800/30 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/50 relative z-[60]">
             <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500 dark:text-emerald-400"/> شرایط، توضیحات و امضاها</h3>
             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">توضیحات اختصاصی (چاپ در پایین فاکتور)</label>
                   <textarea value={draft.terms || ''} onChange={e => setDraft((p:any) => ({...p, terms: e.target.value}))} placeholder="مثلاً: اعتبار این قیمت‌ها تا ۴۸ ساعت می‌باشد..." className="w-full h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none text-slate-800 dark:text-white text-[11px] resize-none focus:border-emerald-500"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-700/50 pt-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">نام تنظیم‌کننده</label>
                      <input value={draft.signatures?.preparer || ''} onChange={e => setDraft((p:any) => ({...p, signatures: {...p.signatures, preparer: e.target.value}}))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 outline-none text-slate-800 dark:text-white text-xs text-center focus:border-indigo-500" placeholder="مدیر سیستم"/>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">نام تاییدکننده (مدیر/سرپرست)</label>
                      <input value={draft.signatures?.approver || ''} onChange={e => setDraft((p:any) => ({...p, signatures: {...p.signatures, approver: e.target.value}}))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 outline-none text-slate-800 dark:text-white text-xs text-center focus:border-indigo-500" placeholder="مثال: مهندس محمدی"/>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">نام کارفرما / خریدار</label>
                      <input value={draft.signatures?.client || ''} onChange={e => setDraft((p:any) => ({...p, signatures: {...p.signatures, client: e.target.value}}))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 outline-none text-slate-800 dark:text-white text-xs text-center focus:border-indigo-500" placeholder="مثال: شرکت آرمان"/>
                   </div>
                </div>
             </div>
          </section>

          {/* ================= سیستم جامع پرداخت ================= */}
          {draft.status !== 'PROFORMA' && (
            <section className="space-y-4 bg-white/50 dark:bg-slate-800/30 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/50 relative z-[50]">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-500 dark:text-emerald-400"/> پرداخت و تسویه</h3>
                  <button 
                    type="button"
                    onClick={() => setDraft((p: any) => ({ ...p, payment: { ...p.payment, isSyncedWithFinance: !p.payment.isSyncedWithFinance } }))} 
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors border shadow-sm ${draft.payment?.isSyncedWithFinance ? 'bg-indigo-100 text-indigo-600 border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30' : 'bg-white text-slate-500 border-slate-300 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-700'}`}
                  >
                    <Database className="w-3 h-3"/> {draft.payment?.isSyncedWithFinance ? 'ثبت در صندوق' : 'فقط گرافیکی'}
                  </button>
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-full md:w-auto overflow-x-auto modal-scrollbar">
                  {[
                    {id: 'COMBO', label: 'ترکیبی'}, 
                    {id: 'CASH', label: 'نقدی کامل'}, 
                    {id: 'CHEQUE', label: 'چکی کامل'}, 
                    {id: 'CREDIT', label: 'نسیه کامل'}
                  ].map((type) => (
                    <button 
                      type="button"
                      key={type.id}
                      onClick={() => handlePaymentTypeChange(type.id)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${draft.payment?.type === type.id ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'}`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  {(draft.payment?.type === 'CASH' || draft.payment?.type === 'COMBO') && (
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">مبلغ واریزی ({currencyLabel})</label>
                        <input value={formatNum(draft.payment?.cashAmount || 0)} onChange={e => setDraft((p: any) => ({ ...p, payment: { ...p.payment!, cashAmount: parseNum(e.target.value) } }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-emerald-300 dark:border-emerald-900/50 rounded-xl px-4 py-3 outline-none text-emerald-600 dark:text-emerald-400 font-mono text-left text-lg focus:border-emerald-500" dir="ltr" />
                      </div>
                      
                      <div className="space-y-2">
                         <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">اطلاعات فیش / رسید</label>
                            <button type="button" onClick={async () => {
                              try { const text = await navigator.clipboard.readText(); setDraft((p:any) => ({...p, payment: {...p.payment, cashReceiptText: text}})); toast.success('رسید الصاق شد.'); } catch (err) { toast.error('خطا در دسترسی کلیپ‌بورد'); }
                            }} className="text-[9px] text-cyan-600 dark:text-cyan-400 flex items-center gap-1 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors"><ClipboardPaste className="w-3 h-3"/> پیست از کلیپ‌بورد</button>
                         </div>
                         <textarea value={draft.payment?.cashReceiptText || ''} onChange={e => setDraft((p:any) => ({...p, payment: {...p.payment, cashReceiptText: e.target.value}}))} placeholder="شماره پیگیری فیش..." className="w-full h-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none text-slate-800 dark:text-white text-[11px] resize-none focus:border-cyan-500"/>
                      </div>

                      <div className="flex items-center gap-3">
                         <input type="file" ref={cashImageRef} className="hidden" accept="image/*" onChange={(e) => { 
                            handleFileUpload(e, (base64) => {
                               setDraft((p:any) => ({...p, payment: {...p.payment, cashReceiptImage: base64}})); 
                               toast.success('عکس فیش پیوست شد.'); 
                            });
                         }} />
                         <button type="button" onClick={() => cashImageRef.current?.click()} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold transition-colors border ${(draft.payment?.cashReceiptImage && draft.payment.cashReceiptImage !== 'UPLOADED') ? 'bg-emerald-100 border-emerald-300 text-emerald-600 dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
                           <Camera className="w-4 h-4"/> {(draft.payment?.cashReceiptImage && draft.payment.cashReceiptImage !== 'UPLOADED') ? 'فیش آپلود شد' : 'آپلود عکس رسید'}
                         </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-4 rounded-xl flex justify-between items-center shadow-inner mt-auto">
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">مانده بدهی (نسیه):</span>
                    <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-500" dir="ltr">{formatNum(draft.payment?.debtAmount || 0)}</span>
                  </div>
                </div>

                {(draft.payment?.type === 'CHEQUE' || draft.payment?.type === 'COMBO') && (
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner flex flex-col h-full max-h-[500px]">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                      <h4 className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">چک‌ها <span className="text-slate-500 text-[10px]">(جمع: {formatNum(draft.payment?.chequeAmount || 0)})</span></h4>
                      <button type="button" onClick={addCheque} className="text-[9px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg transition-colors hover:bg-indigo-200 dark:hover:bg-indigo-500/30">+ ثبت چک جدید</button>
                    </div>
                    
                    <div className="space-y-4 overflow-y-auto modal-scrollbar pr-2 flex-1 pb-4">
                      {(draft.payment?.cheques || []).map((cheque: any, cIdx: number) => (
                        <div key={cheque.id} style={{ zIndex: 50 - cIdx }} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 relative group shadow-md">
                          <button type="button" onClick={() => setDraft((p: any) => ({ ...p, payment: { ...p.payment, cheques: p.payment.cheques.filter((c: any) => c.id !== cheque.id) } }))} className="absolute -top-2 -left-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-[90]"><Trash2 className="w-3 h-3"/></button>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 relative">
                            <div className="space-y-1">
                               <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">نام بانک</label>
                               <input value={cheque.bank} onChange={e => updateCheque(cheque.id, 'bank', e.target.value)} placeholder="مثال: بانک ملی" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs px-3 py-2.5 rounded-xl outline-none border border-slate-200 dark:border-slate-700 focus:border-indigo-500"/>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">مبلغ چک ({currencyLabel})</label>
                               <input value={formatNum(cheque.amount)} onChange={e => updateCheque(cheque.id, 'amount', parseNum(e.target.value))} placeholder="مبلغ چک..." className="w-full bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 text-xs px-3 py-2.5 rounded-xl outline-none border border-slate-200 dark:border-slate-700 font-mono text-left focus:border-emerald-500" dir="ltr"/>
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                               <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">در وجه / صادرکننده</label>
                               <input value={cheque.issuer} onChange={e => updateCheque(cheque.id, 'issuer', e.target.value)} placeholder="نام صادرکننده..." className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs px-3 py-2.5 rounded-xl outline-none border border-slate-200 dark:border-slate-700 sm:col-span-2 focus:border-indigo-500"/>
                            </div>
                            
                            <div className="space-y-1 relative z-[60]">
                               <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">تاریخ صدور</label>
                               <GlassDatePicker value={cheque.issueDate} onChange={d => updateCheque(cheque.id, 'issueDate', d)} />
                            </div>
                            <div className="space-y-1 relative z-[50]">
                               <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400">تاریخ وصول (سررسید)</label>
                               <GlassDatePicker value={cheque.dueDate} onChange={d => updateCheque(cheque.id, 'dueDate', d)} />
                            </div>
                            
                            <div className="space-y-1">
                               <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">شناسه صیاد (۱۶ رقمی)</label>
                               <input value={cheque.sayyadId} onChange={e => updateCheque(cheque.id, 'sayyadId', e.target.value)} placeholder="1234567890123456" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[11px] px-3 py-2.5 rounded-xl outline-none border border-slate-200 dark:border-slate-700 text-center font-mono focus:border-indigo-500"/>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">سریال چک</label>
                               <input value={cheque.serialNumber} onChange={e => updateCheque(cheque.id, 'serialNumber', e.target.value)} placeholder="مثال: 12345" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[11px] px-3 py-2.5 rounded-xl outline-none border border-slate-200 dark:border-slate-700 text-center font-mono focus:border-indigo-500"/>
                            </div>
                            
                            <div className="sm:col-span-2 mt-1">
                               <label className={`cursor-pointer w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold transition-colors border ${(cheque.hasImage && cheque.hasImage !== true) ? 'bg-emerald-100 border-emerald-300 text-emerald-600 dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-400' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                                 <Camera className="w-4 h-4"/> {(cheque.hasImage && cheque.hasImage !== true) ? 'عکس چک ضمیمه شد' : 'آپلود تصویر چک'}
                                 <input type="file" className="hidden" accept="image/*" onChange={(e) => { 
                                    handleFileUpload(e, (base64) => {
                                       updateCheque(cheque.id, 'hasImage', base64); 
                                       toast.success('عکس چک ضمیمه شد.'); 
                                    });
                                 }} />
                               </label>
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

        </div>

        {/* 💡 فوتر ثابت با Z-Index بسیار بالا */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-bl-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-[100] relative">
          
          <div className="flex justify-between items-center mb-2 px-2">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px]">سود شما:</span>
            <span className="font-black text-amber-500 dark:text-amber-400 font-mono text-sm">{formatNum(draft.totalHiddenProfit || 0)} <span className="text-[9px] text-amber-500/50">{currencyLabel}</span></span>
          </div>
          
          <div className="flex justify-between items-end mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 dark:from-indigo-500/10 to-transparent"></div>
            <div className="relative z-10 flex flex-col gap-1">
               <span className="text-slate-700 dark:text-slate-300 font-black text-sm">مبلغ نهایی فاکتور:</span>
               <span className="text-[10px] text-indigo-600 dark:text-indigo-300 font-bold max-w-[200px] truncate" title={Num2persian(draft.grandTotal * currencyMultiplier)}>
                  {Num2persian(draft.grandTotal * currencyMultiplier)} {currencyLabel}
               </span>
            </div>
            <span className="relative z-10 text-3xl font-black text-indigo-700 dark:text-white font-mono drop-shadow-md">
              {formatNum(draft.grandTotal || 0)} <span className="text-sm text-slate-500">{currencyLabel}</span>
            </span>
          </div>

          <div className="flex gap-3 relative z-50">
             <button type="button" onClick={handleSave} className="flex-1 py-4 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all active:scale-95">
               <Save className="w-6 h-6"/> {existingInvoiceId ? 'ثبت تغییرات' : 'ذخیره فاکتور'}
             </button>
             
             <button type="button" onClick={exportPDF} disabled={isExporting} className="px-5 py-4 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" title="دانلود نسخه PDF با کیفیت بالا">
               <FileDown className={`w-6 h-6 ${isExporting ? 'animate-bounce' : ''}`}/>
             </button>

             <button type="button" onClick={() => toast.success('لینک امن در کلیپ‌بورد کپی شد')} className="px-5 py-4 bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-500/50 rounded-2xl font-black flex items-center justify-center transition-all active:scale-95" title="ساخت لینک امن اشتراک‌گذاری">
               <LinkIcon className="w-6 h-6"/>
             </button>
          </div>
        </div>

      </div>

      {/* ========================================== */}
      {/* پنل پیش‌نمایش گرافیکی سمت چپ (برگه A4) */}
      {/* ========================================== */}
      <div className="hidden xl:block w-[45%] h-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden z-0">
        <div className="absolute inset-0 opacity-[0.05] dark:opacity-10" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
        <div className="relative z-10 w-full h-full overflow-y-auto modal-scrollbar py-12 flex justify-center items-start">
          <div className="transform scale-[0.55] 2xl:scale-[0.70] origin-top h-max transition-transform duration-500 flex flex-col gap-8 pb-32">
            <div id="a4-print-area" className="bg-white">
               <A4InvoiceTemplate invoice={draft} userSettings={userSettings} />
            </div>
          </div>
        </div>
      </div>

      {/* 💡 مودال‌های مینیاتوری برای ساخت سریع در لحظه */}
      <AnimatePresence>
        {isNewClientModalOpen && (
          <div className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
             <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.9 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2"><User className="w-5 h-5 text-indigo-500"/> ثبت سریع کارفرما</h3>
                  <button onClick={() => setIsNewClientModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X className="w-5 h-5 text-slate-500"/></button>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1">
                     <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">نام شخص / عنوان شرکت *</label>
                     <input value={newClientData.name} onChange={e => setNewClientData(p => ({...p, name: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 outline-none text-sm text-slate-800 dark:text-white focus:border-indigo-500" placeholder="مثال: امیر" autoFocus />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">نام خانوادگی</label>
                     <input value={newClientData.lastName} onChange={e => setNewClientData(p => ({...p, lastName: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 outline-none text-sm text-slate-800 dark:text-white focus:border-indigo-500" placeholder="مثال: علی‌زاده" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">شماره موبایل / تماس</label>
                     <input value={newClientData.phone} onChange={e => setNewClientData(p => ({...p, phone: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 outline-none text-sm font-mono text-left text-slate-800 dark:text-white focus:border-indigo-500" placeholder="09..." dir="ltr" />
                   </div>
                   <button onClick={handleQuickCreateClient} className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm transition-all active:scale-95 shadow-md">
                     ثبت مشتری و اعمال در فاکتور
                   </button>
                </div>
             </motion.div>
          </div>
        )}

        {isNewProjectModalOpen && (
          <div className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
             <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.9 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2"><Briefcase className="w-5 h-5 text-blue-500"/> ثبت سریع پروژه</h3>
                  <button onClick={() => setIsNewProjectModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X className="w-5 h-5 text-slate-500"/></button>
                </div>
                <div className="space-y-4">
                   <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl mb-2">
                     <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 leading-relaxed">
                       پروژه جدید برای کارفرما «{draft.clientName}» ثبت خواهد شد. برای تنظیمات قرارداد و فازها بعداً به داشبورد پروژه‌ها مراجعه کنید.
                     </p>
                   </div>
                   <div className="space-y-1">
                     <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">نام پروژه *</label>
                     <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 outline-none text-sm text-slate-800 dark:text-white focus:border-blue-500" placeholder="مثال: بازسازی ویلای لواسان" autoFocus />
                   </div>
                   <button onClick={handleQuickCreateProject} className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm transition-all active:scale-95 shadow-md">
                     ثبت پروژه و اعمال در فاکتور
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>,
    document.body
  );
}