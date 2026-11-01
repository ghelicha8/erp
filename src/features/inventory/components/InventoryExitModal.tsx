import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Package, ArrowUpRight, ArrowDownRight, Store, Hammer, RotateCcw, Truck, 
  Users, DollarSign, Calculator, Plus, Trash2, Camera, Image as ImageIcon,
  Check, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Scale,
  Building2, User, Coins, Calendar, ChevronDown, Clock, ShieldCheck, Tag,
  FileText, Printer, Eye, Share2, Layers, CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useInventoryStore, 
  type InventoryItem, 
  type InventoryBatch,
  type InventoryTransaction,
  type ValuationMethod,
  INVENTORY_CATEGORIES,
  convertQuantity 
} from '../../../store/inventoryStore';
import { useInvoiceStore, type Invoice, type InvoiceItem } from '../../../store/invoiceStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useClientStore } from '../../../store/clientStore';
import { useProcurementStore } from '../../../store/procurementStore';
import { useLogisticsStore } from '../../../store/logisticsStore';
import { useLaborStore } from '../../../store/laborStore';
import { useSettingsStore } from '../../../store/settingsStore';
import ClientFormModal from '../../clients/components/ClientFormModal';
import SupplierModal from '../../procurement/components/SupplierModal';
import LaborFormModal from '../../labor/components/LaborFormModal';
import type { WorkerProfile } from '../../../store/laborStore';


import { 
  PortalSelect, 
  AppSearchInput, 
  AnimatedCheckbox 
} from '../../../components/ui/SharedLaborUI';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import UniversalTransactionModal from '../../../components/shared/UniversalTransactionModal';
import A4InvoiceTemplate from '../../../components/ui/A4InvoiceTemplate';
import { generateUUID } from '../../../core/utils/uuid';

export interface InventoryExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItemId?: string;
  onSaved?: (txId: string, invoiceId?: string) => void;
}

const safeNum = (val: unknown): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/,/g, '')
    .replace(/[^0-9.-]+/g, '');
  const parsed = Number(clean);
  return isNaN(parsed) ? 0 : parsed;
};

const formatNumber = (num: number): string => {
  if (!num || isNaN(num)) return '';
  return num.toLocaleString('fa-IR');
};

// ============================================================================
// مودال پیش‌نمایش و چاپ فاکتور صادره (Invoice Print Preview Modal)
// ============================================================================
interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ isOpen, onClose, invoice }) => {
  const { settings } = useSettingsStore();
  const [printSize, setPrintSize] = useState<'A4' | 'A5' | 'POS_80MM'>('A4');

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[95vh] flex flex-col rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-right"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-black text-slate-800 dark:text-white">
              پیش‌نمایش فاکتور رسمی صادره ({invoice.invoiceNumber})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintSize('A4')}
                className={`px-3 py-1 rounded-lg transition-all ${printSize === 'A4' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setPrintSize('A5')}
                className={`px-3 py-1 rounded-lg transition-all ${printSize === 'A5' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}
              >
                A5
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ فاکتور</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/50 dark:bg-slate-950/50 flex justify-center modal-scrollbar">
          <div className="w-full max-w-[210mm] shadow-2xl rounded-2xl overflow-hidden bg-white print:shadow-none print:w-full">
            <A4InvoiceTemplate
              invoice={invoice}
              userSettings={{
                companyName: settings.companyName || 'شرکت پیمانکاری و ساختمانی پیمان',
                phones: [settings.supportPhone || '۰۲۱-۸۸۸۸۸۸۸۸'],
                address: settings.companyAddress || 'دفتر مرکزی پروژه',
                currency: (settings.currency === 'rial' || (settings.currency as any) === 'RIAL') ? 'rial' : 'toman'
              }}
              pageSize={printSize}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// کامپوننت مادر مودال ثبت خروج از انبار (InventoryExitModal)
// ============================================================================
// تابع کمکی برای تولید لیست واحدهای کاملاً یکتا و بدون تکرار
const buildUniqueUnitOptions = (item: InventoryItem | null | undefined) => {
  const map = new Map<string, string>();
  if (item?.primaryUnit) {
    map.set(item.primaryUnit, `${item.primaryUnit} (واحد پایه)`);
  }
  if ((item as any)?.baseUnit && !map.has((item as any).baseUnit)) {
    map.set((item as any).baseUnit, `${(item as any).baseUnit} (واحد پایه)`);
  }
  if (item?.secondaryUnit && !map.has(item.secondaryUnit)) {
    map.set(item.secondaryUnit, `${item.secondaryUnit} (واحد فرعی)`);
  }
  if (item?.unitConversions) {
    item.unitConversions.forEach((u: any) => {
      const name = u.unitName || u.fromUnit || u.toUnit;
      if (name && !map.has(name)) {
        map.set(name, `${name} ${u.isApproximate ? '(تقریبی)' : ''}`);
      }
    });
  }
  const common = [
    { value: 'کیسه', label: 'کیسه / پاکت' },
    { value: 'تن', label: 'تن (۱۰۰۰ کیلو)' },
    { value: 'کیلوگرم', label: 'کیلوگرم' },
    { value: 'عدد', label: 'عدد / قالب / شاخه' },
    { value: 'متر', label: 'متر طول' },
    { value: 'مترمربع', label: 'متر مربع' },
    { value: 'مترمکعب', label: 'متر مکعب' },
    { value: 'پالت', label: 'پالت' },
    { value: 'سرویس نیسان', label: 'سرویس نیسان' },
    { value: 'سرویس خاور', label: 'سرویس خاور' },
    { value: 'سرویس کمپرسی', label: 'سرویس کمپرسی / ده چرخ' },
  ];
  common.forEach(u => {
    if (!map.has(u.value)) map.set(u.value, u.label);
  });
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
};

export default function InventoryExitModal({
  isOpen,
  onClose,
  preselectedItemId,
  onSaved
}: InventoryExitModalProps) {
  const { items, batches, depleteStock, addTransaction, updateItem } = useInventoryStore();
  const { projects } = useProjectStore();
  const { clients } = useClientStore();
  const { suppliers } = useProcurementStore();
  const { vehicles, addLog: addLogisticsLog } = useLogisticsStore();
  const { workers, addLog: addLaborLog } = useLaborStore();
  const { addInvoice } = useInvoiceStore();
  const { currency, valuationMethod: globalValuation } = useSettingsStore(state => state.settings);

  const isRial = currency === 'rial' || (currency as any) === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';

  // ۱. انتخاب کالا
  const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItemId || '');
  useEffect(() => {
    if (preselectedItemId) setSelectedItemId(preselectedItemId);
    else if (!selectedItemId && items.length > 0) setSelectedItemId(items[0].id);
  }, [preselectedItemId, items]);

  const selectedItem = useMemo(() => {
    return items.find(it => it.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // ۲. نوع خروج و مقصد
  const [exitType, setExitType] = useState<'SALE_OR_PROJECT' | 'FREE_SALE' | 'INTERNAL_USE' | 'WASTE_OR_EXPIRED'>('SALE_OR_PROJECT');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isClientLocked, setIsClientLocked] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('GENERAL');
  const [freeBuyerName, setFreeBuyerName] = useState('');
  const [freeBuyerPhone, setFreeBuyerPhone] = useState('');

  // ۳. مقادیر، واحد و تاریخ خروج
  const [inputQty, setInputQty] = useState<string>('1');
  const [inputUnit, setInputUnit] = useState<string>('');
  const [exitDate, setExitDate] = useState(() => moment().format('jYYYY/jMM/jDD'));

  // ۴. روش ارزش‌گذاری فعال (FIFO / LIFO / WEIGHTED_AVERAGE)
  const [activeValuation, setActiveValuation] = useState<ValuationMethod>(
    selectedItem?.valuationMethod || globalValuation || 'FIFO'
  );

  useEffect(() => {
    if (selectedItem) {
      setInputUnit(selectedItem.displayUnit || selectedItem.baseUnit || selectedItem.primaryUnit || 'عدد');
      if (selectedItem.valuationMethod) {
        setActiveValuation(selectedItem.valuationMethod);
      }
    }
  }, [selectedItem]);

  // کنترل قفل پروژه ⟷ کارفرما
  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    if (projId) {
      const proj = projects.find(p => p.id === projId);
      if (proj && proj.clientId) {
        setSelectedClientId(proj.clientId);
        setIsClientLocked(true);
      }
    } else {
      setIsClientLocked(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    if (!clientId) {
      setIsClientLocked(false);
    }
  };

  // ۵. بخش لجستیک و کارگری خروجی
  const [hasOutLogistics, setHasOutLogistics] = useState(false);
  const [transportType, setTransportType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [internalVehicleId, setInternalVehicleId] = useState('');
  const [internalDriverId, setInternalDriverId] = useState('');
  const [externalCarrierSupplierId, setExternalCarrierSupplierId] = useState('');
  const [outFreightInternalCost, setOutFreightInternalCost] = useState<string>(''); // کرایه پرداختی ما
  const [outFreightBilledCost, setOutFreightBilledCost] = useState<string>(''); // کرایه اعلامی به کارفرما

  const [hasOutLabor, setHasOutLabor] = useState(false);
  const [outLaborWorkerId, setOutLaborWorkerId] = useState('');
  const [outLaborCost, setOutLaborCost] = useState<string>('');

  // ۶. قیمت اعلامی به کارفرما / مشتری (Billed Unit Price)
  const [billedUnitPrice, setBilledUnitPrice] = useState<string>('');

  useEffect(() => {
    if (selectedItem) {
      if (selectedItem.defaultBilledPrice) {
        setBilledUnitPrice(String(selectedItem.defaultBilledPrice));
      } else if (selectedItem.averageUnitCost) {
        // حاشیه سود پیش‌فرض ۱۵٪
        setBilledUnitPrice(String(Math.round(selectedItem.averageUnitCost * 1.15)));
      }
    }
  }, [selectedItem]);

  // ۷. سوئیچ طلایی صدور خودکار فاکتور رسمی
  const [autoGenerateInvoice, setAutoGenerateInvoice] = useState(true);
  const [freightInvoiceDisplay, setFreightInvoiceDisplay] = useState<'SEPARATE_ROW' | 'MERGED_IN_PRICE' | 'FREE_CLIENT'>('SEPARATE_ROW');
  const [laborInvoiceDisplay, setLaborInvoiceDisplay] = useState<'SEPARATE_ROW' | 'MERGED_IN_PRICE' | 'HIDDEN'>('HIDDEN');
  const [hideLogisticsDetails, setHideLogisticsDetails] = useState(true);
  const [hideWorkerNames, setHideWorkerNames] = useState(true);

  // ۸. پیش‌نمایش فاکتور ساخته شده
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);

  // ۹. پیوست تصویر بارنامه خروج / رسید کارگاه
  const [exitPhotos, setExitPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setExitPhotos(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // ۱۰. اتصال به مودال پرداخت مادر جهت دریافت همزمان وجه
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [settlementStatus, setSettlementStatus] = useState<'SETTLED' | 'PENDING' | 'PARTIAL'>('PENDING');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);

  // ۱۱. توضیحات
  const [description, setDescription] = useState('');

  // ==========================================
  // محاسبات بهای تمام‌شده و آربیتراژ (Arbitrage Engine)
  // ==========================================
  const math = useMemo(() => {
    const qty = safeNum(inputQty);
    const unitPriceBilled = safeNum(billedUnitPrice);

    // ۱. تبدیل به مقدار واحد پایه
    let primaryQty = qty;
    if (selectedItem && inputUnit) {
      const baseUnit = selectedItem.baseUnit || selectedItem.primaryUnit || 'عدد';
      primaryQty = convertQuantity(qty, inputUnit, baseUnit, selectedItem).convertedQty;
    }

    // ۲. شبیه‌سازی کسر پارت‌ها جهت استخراج دقیق بهای خرید
    let simulatedMaterialCost = 0;
    const itemBatches = batches
      .filter(b => b.itemId === selectedItemId && b.remainingQtyBase > 0 && b.status === 'ACTIVE');

    // مرتب‌سازی بر اساس متد ارزش‌گذاری
    if (activeValuation === 'LIFO') {
      itemBatches.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
    } else {
      itemBatches.sort((a, b) => a.entryDate.localeCompare(b.entryDate));
    }

    let needed = primaryQty;
    const batchBreakdown: Array<{ batchNumber?: string; qty: number; unitCost: number }> = [];

    for (const b of itemBatches) {
      if (needed <= 0) break;
      const take = Math.min(needed, b.remainingQtyBase);
      simulatedMaterialCost += take * (b.landedUnitCostBase || b.purchaseUnitPrice);
      batchBreakdown.push({
        batchNumber: b.batchNumber,
        qty: take,
        unitCost: b.landedUnitCostBase || b.purchaseUnitPrice
      });
      needed -= take;
    }

    // اگر موجودی پارت‌ها کمتر بود، بقیه را با میانگین کالا حساب کن
    if (needed > 0 && selectedItem) {
      simulatedMaterialCost += needed * selectedItem.averageUnitCost;
    }

    // ۳. هزینه‌های داخلی باربری و کارگری
    const internalFreight = hasOutLogistics ? safeNum(outFreightInternalCost) : 0;
    const internalLabor = hasOutLabor ? safeNum(outLaborCost) : 0;

    // بهای تمام‌شده کل برای شرکت
    const totalInternalCost = Math.round(simulatedMaterialCost + internalFreight + internalLabor);
    const internalUnitCostBilled = qty > 0 ? Math.round(totalInternalCost / qty) : 0;

    // ۴. صورتحساب کارفرما
    const billedMaterialTotal = Math.round(qty * unitPriceBilled);
    const billedFreight = hasOutLogistics ? safeNum(outFreightBilledCost) : 0;
    const totalBilledAmount = (exitType === 'SALE_OR_PROJECT' || exitType === 'FREE_SALE')
      ? billedMaterialTotal + billedFreight
      : 0;

    // ۵. سود پنهان آربیتراژ انبار
    const hiddenProfit = totalBilledAmount - totalInternalCost;
    const profitMarginPct = totalBilledAmount > 0 ? Math.round((hiddenProfit / totalBilledAmount) * 100) : 0;

    // ۶. بررسی کسری موجودی
    const isOverStock = selectedItem ? primaryQty > selectedItem.currentStock : false;
    const stockDeficit = selectedItem ? Math.max(0, primaryQty - selectedItem.currentStock) : 0;

    return {
      qty,
      primaryQty,
      unitPriceBilled,
      simulatedMaterialCost,
      batchBreakdown,
      internalFreight,
      internalLabor,
      totalInternalCost,
      internalUnitCostBilled,
      billedMaterialTotal,
      billedFreight,
      totalBilledAmount,
      hiddenProfit,
      profitMarginPct,
      isOverStock,
      stockDeficit
    };
  }, [
    inputQty, billedUnitPrice, selectedItem, inputUnit, batches, selectedItemId,
    activeValuation, hasOutLogistics, outFreightInternalCost, outFreightBilledCost,
    hasOutLabor, outLaborCost, exitType
  ]);

  // ثبت نهایی خروج از انبار
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItem) {
      toast.error('لطفاً یک کالا را انتخاب کنید.');
      return;
    }
    if (math.qty <= 0) {
      toast.error('لطفاً مقدار خروجی معتبر وارد کنید.');
      return;
    }
    if (math.isOverStock) {
      toast.error(`موجودی انبار کافی نیست! کسری موجودی: ${math.stockDeficit.toLocaleString('fa-IR')} ${selectedItem.primaryUnit}`);
      return;
    }
    if (exitType === 'SALE_OR_PROJECT' && !selectedProjectId && !selectedClientId) {
      toast.error('لطفاً پروژه یا کارفرمای مقصد را انتخاب کنید.');
      return;
    }

    // ۱. کسر پارت‌ها بر اساس متد ارزش‌گذاری از استور
    const depletionResult = depleteStock(selectedItem.id, math.primaryQty, activeValuation);

    // ۲. به‌روزرسانی موجودی انبار
    const newStock = Math.max(0, selectedItem.currentStock - math.primaryQty);
    updateItem(selectedItem.id, {
      currentStock: newStock
    });

    // ۳. صدور خودکار فاکتور رسمی در پس‌زمینه در صورت فعال بودن سوئیچ
    let createdInvoiceId: string | undefined = undefined;
    if (autoGenerateInvoice && (exitType === 'SALE_OR_PROJECT' || exitType === 'FREE_SALE')) {
      const clientObj = clients.find(c => c.id === selectedClientId);
      const projectObj = projects.find(p => p.id === selectedProjectId);

      const clientName = clientObj?.name || freeBuyerName.trim() || 'مشتری آزاد / متفرقه';
      const clientPhone = clientObj?.phone || freeBuyerPhone.trim() || '—';

      // تنظیم ردیف‌های فاکتور بر اساس سوئیچ‌های ادغام/تفکیک
      const invoiceItems: InvoiceItem[] = [];

      let itemUnitPriceToBill = math.unitPriceBilled;
      if (freightInvoiceDisplay === 'MERGED_IN_PRICE' && math.qty > 0) {
        itemUnitPriceToBill += Math.round(math.billedFreight / math.qty);
      }

      // ردیف کالا
      invoiceItems.push({
        id: generateUUID(),
        type: 'MATERIAL',
        title: selectedItem.name,
        description: hideLogisticsDetails ? undefined : `حواله خروج انبار - کد: ${selectedItem.code}`,
        quantity: math.qty,
        unit: inputUnit || selectedItem.primaryUnit,
        unitPrice: itemUnitPriceToBill,
        discount: 0,
        totalPrice: math.qty * itemUnitPriceToBill,
        isSyncedWithSystem: true
      });

      // ردیف مجزای حمل
      if (freightInvoiceDisplay === 'SEPARATE_ROW' && math.billedFreight > 0) {
        const v = vehicles.find(veh => veh.id === internalVehicleId);
        invoiceItems.push({
          id: generateUUID(),
          type: 'LOGISTICS',
          title: 'کرایه حمل و ارسال محموله',
          description: hideLogisticsDetails ? undefined : (v ? `ناوگان: ${v.name} (${v.plate})` : 'حمل بار به مقصد پروژه'),
          quantity: 1,
          unit: 'سرویس',
          unitPrice: math.billedFreight,
          discount: 0,
          totalPrice: math.billedFreight,
          isSyncedWithSystem: true
        });
      }

      // ساخت فاکتور در invoiceStore
      createdInvoiceId = addInvoice({
        date: exitDate,
        projectId: selectedProjectId || undefined,
        clientId: selectedClientId || undefined,
        clientName,
        clientPhone,
        status: settlementStatus === 'SETTLED' ? 'PAID' : 'SUBMITTED',
        items: invoiceItems,
        subTotal: math.totalBilledAmount,
        grandTotal: math.totalBilledAmount,
        payment: {
          cashAmount: settlementStatus === 'SETTLED' ? math.totalBilledAmount : receivedAmount,
          chequeAmount: 0,
          debtAmount: settlementStatus === 'SETTLED' ? 0 : Math.max(0, math.totalBilledAmount - receivedAmount),
          globalDiscount: 0,
          totalDiscount: 0,
          retentionAmount: 0,
          insuranceAmount: 0,
          taxAmount: 0,
          cheques: []
        },
        isGlobalSyncEnabled: true,
        attachments: exitPhotos,
        notes: description
      });

      // بارگذاری فاکتور برای پیش‌نمایش در صورت درخواست
      const invFromStore = useInvoiceStore.getState().invoices.find(inv => inv.id === createdInvoiceId);
      if (invFromStore) {
        setGeneratedInvoice(invFromStore);
      }
    }

    // ۴. ثبت تراکنش در کاردکس انبار
    const txId = addTransaction({
      date: exitDate,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      type: exitType === 'FREE_SALE' ? 'SALE_OR_PROJECT' : exitType,
      projectId: selectedProjectId || undefined,
      clientId: selectedClientId || undefined,
      inputQty: math.qty,
      inputUnit: inputUnit || selectedItem.primaryUnit,
      calculatedPrimaryQty: math.primaryQty,
      internalUnitCost: math.internalUnitCostBilled,
      internalFreightCost: math.internalFreight,
      loadingLaborCost: math.internalLabor,
      totalInternalCost: math.totalInternalCost,
      billedQty: math.qty,
      billedUnit: inputUnit || selectedItem.primaryUnit,
      billedUnitPrice: math.unitPriceBilled,
      billedFreightCost: math.billedFreight,
      totalBilledAmount: math.totalBilledAmount,
      hiddenProfit: math.hiddenProfit,
      settlementStatus,
      paidAmount: receivedAmount > 0 ? receivedAmount : (settlementStatus === 'SETTLED' ? math.totalBilledAmount : 0),
      transportSource: hasOutLogistics ? transportType : undefined,
      vehicleId: hasOutLogistics && transportType === 'INTERNAL' ? internalVehicleId : undefined,
      driverId: hasOutLogistics && transportType === 'INTERNAL' ? internalDriverId : undefined,
      photos: exitPhotos,
      depletedBatchAllocations: depletionResult.depletedBatches,
      description: description.trim() || undefined
    });

    // ۵. ثبت لاگ ناوگان و کارگران در صورت وجود
    if (hasOutLogistics && transportType === 'INTERNAL' && internalVehicleId) {
      const v = vehicles.find(veh => veh.id === internalVehicleId);
      addLogisticsLog({
        projectId: selectedProjectId || null,
        type: 'TRANSPORT',
        source: 'INTERNAL',
        title: `ارسال مصالح از انبار: ${selectedItem.name} (${math.qty} ${inputUnit})`,
        provider: internalDriverId,
        vehicleInfo: v ? `${v.name} (${v.plate})` : internalVehicleId,
        date: exitDate,
        internalCost: math.internalFreight,
        billedCost: math.billedFreight,
        driverWage: 0
      });
    }

    if (hasOutLabor && outLaborWorkerId && safeNum(outLaborCost) > 0) {
      const wrk = workers.find(w => w.id === outLaborWorkerId);
      addLaborLog({
        workerId: outLaborWorkerId,
        workerName: wrk ? `${wrk.name} ${wrk.lastName}` : 'کارگر کارگاه',
        date: exitDate,
        projectId: selectedProjectId || 'FREE',
        workType: `بارگیری محموله خروجی انبار (${selectedItem.name})`,
        attendance: 'PRESENT',
        paymentType: 'PIECE_WORK',
        workerUnit: 'ITEM',
        workerQuantity: math.qty,
        workerRate: safeNum(outLaborCost),
        billedUnit: 'ITEM',
        billedQuantity: math.qty,
        billedRate: safeNum(outLaborCost),
        appliedStandardWorkHours: 8
      });
    }

    // توست موفقیت به همراه اکشن مشاهده فاکتور
    toast.success(
      `حواله خروج ${math.qty} ${inputUnit} «${selectedItem.name}» با موفقیت ثبت گردید.`,
      {
        action: createdInvoiceId ? {
          label: 'مشاهده فاکتور',
          onClick: () => setIsInvoicePreviewOpen(true)
        } : undefined,
        duration: 8000
      }
    );

    if (onSaved) onSaved(txId, createdInvoiceId);
    if (!createdInvoiceId) onClose();
    else {
      // اگر فاکتور ساخته شد، مودال پیش‌نمایش را باز نگه‌دار یا بپرس
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-300">
      
      {/* بدنه اصلی مودال خروج */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[2.5rem] bg-white/95 dark:bg-slate-900/95 border border-white/60 dark:border-slate-800 shadow-2xl backdrop-blur-2xl overflow-hidden text-right"
        dir="rtl"
      >
        
        {/* ======================================================== */}
        {/* هدر مودال خروج از انبار */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                ثبت حواله خروج از انبار و صدور فاکتور رسمی
              </h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                کسر هوشمند پارت‌ها بر اساس FIFO/LIFO، محاسبه آربیتراژ و صدور خودکار فاکتور چاپی
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* فرم اسکرول‌خور محتوا */}
        {/* ======================================================== */}
        <form onSubmit={handleFinalSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 modal-scrollbar glass-scroll">
          
          {/* بخش ۱: انتخاب کالا و نمایش پارت‌ها */}
          <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  کالای مورد نظر جهت خروج و صدور حواله <span className="text-rose-500">*</span>
                </label>
                <PortalSelect searchable 
                  options={items.map(it => ({
                    value: it.id,
                    label: `${it.name} (${it.code}) - موجودی: ${it.currentStock} ${it.primaryUnit}`
                  }))}
                  value={selectedItemId}
                  onChange={setSelectedItemId}
                  placeholder="انتخاب کالا از لیست انبار..."
                  searchable
                  className="!h-12"
                />
              </div>

              {selectedItem && (
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block">موجودی فعلی انبار</span>
                    <span className="text-sm font-black font-mono text-blue-700 dark:text-blue-300" dir="ltr">
                      {selectedItem.currentStock.toLocaleString('fa-IR')} {selectedItem.primaryUnit}
                    </span>
                  </div>
                  <div className="text-right border-r border-blue-200 dark:border-blue-800 pr-3">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">میانگین فی تمام‌شده خرید</span>
                    <span className="text-xs font-black font-mono text-slate-700 dark:text-slate-200" dir="ltr">
                      {selectedItem.averageUnitCost.toLocaleString('fa-IR')} {currencyLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* هشدار کسری موجودی */}
            {math.isOverStock && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-black animate-pulse">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>
                  موجودی فعلی انبار برای این خروج کافی نیست! موجودی: {selectedItem?.currentStock} {selectedItem?.primaryUnit} (کسری: {math.stockDeficit.toLocaleString('fa-IR')} {selectedItem?.primaryUnit})
                </span>
              </div>
            )}
          </div>

          {/* بخش ۲: نوع خروج و مقصد محموله */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              نوع خروج و مقصد مصرف <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              
              <button
                type="button"
                onClick={() => setExitType('SALE_OR_PROJECT')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-2.5 cursor-pointer ${
                  exitType === 'SALE_OR_PROJECT'
                    ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500 text-blue-800 dark:text-blue-300 shadow-sm'
                    : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100/60'
                }`}
              >
                <div className={`p-2 rounded-xl ${exitType === 'SALE_OR_PROJECT' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block">ارسال به پروژه و کارفرما</span>
                  <span className="text-[10px] opacity-70">صورت‌وضعیت کارگاه</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExitType('FREE_SALE')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-2.5 cursor-pointer ${
                  exitType === 'FREE_SALE'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-sm'
                    : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100/60'
                }`}
              >
                <div className={`p-2 rounded-xl ${exitType === 'FREE_SALE' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block">فروش آزاد مصالح</span>
                  <span className="text-[10px] opacity-70">فروش به مشتری متفرقه</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExitType('INTERNAL_USE')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-2.5 cursor-pointer ${
                  exitType === 'INTERNAL_USE'
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-500 text-indigo-800 dark:text-indigo-300 shadow-sm'
                    : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100/60'
                }`}
              >
                <div className={`p-2 rounded-xl ${exitType === 'INTERNAL_USE' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  <Hammer className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block">مصرف داخلی خودمان</span>
                  <span className="text-[10px] opacity-70">تعمیرگاه یا انبار مرکزی</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExitType('WASTE_OR_EXPIRED')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-2.5 cursor-pointer ${
                  exitType === 'WASTE_OR_EXPIRED'
                    ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-500 text-rose-800 dark:text-rose-300 shadow-sm'
                    : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100/60'
                }`}
              >
                <div className={`p-2 rounded-xl ${exitType === 'WASTE_OR_EXPIRED' ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block">خرابی، ضایعات و انقضا</span>
                  <span className="text-[10px] opacity-70">ثبت خسارت و پرت</span>
                </div>
              </button>

            </div>

            {/* جزئیات ارسال به پروژه (قفل پروژه ⟷ کارفرما) */}
            {exitType === 'SALE_OR_PROJECT' && (
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      پروژه مقصد <span className="text-rose-500">*</span>
                    </label>
                    <PortalSelect searchable 
                      options={[
                        { value: '', label: 'انتخاب پروژه...' },
                        ...projects
                          .filter(p => !selectedClientId || p.clientId === selectedClientId)
                          .map(p => ({ value: p.id, label: p.name }))
                      ]}
                      value={selectedProjectId}
                      onChange={handleProjectChange}
                      searchable
                      className="!h-11"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        کارفرمای طرف حساب <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ ساخت کارفرما جدید</span>
                      </button>
                    </div>
                    <PortalSelect searchable 
                      options={[
                        { value: '', label: 'انتخاب کارفرما...' },
                        ...clients.map(c => ({ value: c.id, label: `${c.name} (${c.phone || 'بدون شماره'})` }))
                      ]}
                      value={selectedClientId}
                      onChange={handleClientChange}
                      disabled={isClientLocked}
                      searchable
                      className="!h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      فاز / بخش اجرایی پروژه
                    </label>
                    <PortalSelect searchable 
                      options={[
                        { value: 'GENERAL', label: 'عمومی و کلی پروژه' },
                        { value: 'STRUCTURE', label: 'فونداسیون و اسکلت' },
                        { value: 'MASONRY', label: 'دیوارچینی و سفت‌کاری' },
                        { value: 'FINISHING', label: 'نازک‌کاری و نما' },
                        { value: 'MEP', label: 'تاسیسات مکانیکی و برقی' },
                      ]}
                      value={selectedPhaseId}
                      onChange={setSelectedPhaseId}
                      className="!h-11"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* جزئیات فروش آزاد */}
            {exitType === 'FREE_SALE' && (
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        انتخاب از لیست مشتریان (اختیاری)
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ ساخت مشتری جدید</span>
                      </button>
                    </div>
                    <PortalSelect searchable 
                      options={[
                        { value: '', label: 'مشتری آزاد بدون پرونده' },
                        ...clients.map(c => ({ value: c.id, label: c.name }))
                      ]}
                      value={selectedClientId}
                      onChange={setSelectedClientId}
                      searchable
                      className="!h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      نام خریدار آزاد
                    </label>
                    <input
                      type="text"
                      value={freeBuyerName}
                      onChange={(e) => setFreeBuyerName(e.target.value)}
                      placeholder="مثال: آقای مهندس حسینی"
                      className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      شماره تماس خریدار
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={freeBuyerPhone}
                      onChange={(e) => setFreeBuyerPhone(e.target.value)}
                      placeholder="۰۹۱۲..."
                      className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* بخش ۳: مقدار خروج، واحد، استراتژی ارزش‌گذاری و تاریخ */}
          <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-blue-600" />
                <span>مقدار خروجی، واحد سنجش و روش ارزش‌گذاری</span>
              </h4>

              {/* انتخابگر روش ارزش‌گذاری کسر موجودی */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <span className="text-[10px] text-slate-400 px-1">استراتژی:</span>
                <button
                  type="button"
                  onClick={() => setActiveValuation('FIFO')}
                  className={`px-2 py-0.5 rounded-lg transition-all ${activeValuation === 'FIFO' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                >
                  FIFO
                </button>
                <button
                  type="button"
                  onClick={() => setActiveValuation('LIFO')}
                  className={`px-2 py-0.5 rounded-lg transition-all ${activeValuation === 'LIFO' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                >
                  LIFO
                </button>
                <button
                  type="button"
                  onClick={() => setActiveValuation('WEIGHTED_AVERAGE')}
                  className={`px-2 py-0.5 rounded-lg transition-all ${activeValuation === 'WEIGHTED_AVERAGE' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                >
                  میانگین
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* مقدار خروج */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  مقدار خروجی <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={inputQty}
                  onChange={(e) => setInputQty(e.target.value)}
                  placeholder="مثال: ۳۰"
                  className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* واحد خروج */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  واحد خروج <span className="text-rose-500">*</span>
                </label>
                <PortalSelect
                  options={buildUniqueUnitOptions(selectedItem)}
                  value={inputUnit}
                  onChange={setInputUnit}
                  searchable
                  className="!h-11"
                />
              </div>

              {/* تاریخ خروج */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  تاریخ حواله خروج <span className="text-rose-500">*</span>
                </label>
                <GlassDatePicker
                  value={exitDate}
                  onChange={setExitDate}
                  className="!h-11"
                />
              </div>
            </div>

            {/* تفکیک پارت‌های در حال کسر */}
            {math.batchBreakdown.length > 0 && (
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 text-xs space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 block">پارت‌های در حال کسر ({activeValuation}):</span>
                <div className="flex flex-wrap gap-2">
                  {math.batchBreakdown.map((b, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40 text-[11px] font-mono text-blue-700 dark:text-blue-300">
                      {b.batchNumber || `پارت ${idx + 1}`}: {b.qty} {selectedItem?.primaryUnit} با فی {b.unitCost.toLocaleString('fa-IR')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* بخش ۴: لجستیک و کارگری خروجی */}
          <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">لجستیک و بارگیری این حواله</h4>
                  <p className="text-[11px] font-bold text-slate-400">آیا برای ارسال یا بارگیری این محموله هزینه ناوگان و کارگر صرف شده است؟</p>
                </div>
              </div>
              <AnimatedCheckbox
                checked={hasOutLogistics}
                onChange={setHasOutLogistics}
                label="حمل و کارگری دارد"
              />
            </div>

            {hasOutLogistics && (
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      ناوگان حمل بار
                    </label>
                    <PortalSelect searchable 
                      options={[
                        { value: '', label: 'انتخاب خودروی داخلی...' },
                        ...vehicles.map(v => ({ value: v.id, label: `${v.name} (${v.plate})` }))
                      ]}
                      value={internalVehicleId}
                      onChange={setInternalVehicleId}
                      className="!h-11"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        راننده ناوگان
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsSupplierModalOpen(true)}
                        className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ باربری / راننده جدید</span>
                      </button>
                    </div>
                    <PortalSelect searchable 
                      options={[
                        { value: '', label: 'انتخاب راننده...' },
                        ...workers.map(w => ({ value: w.id, label: `${w.name} ${w.lastName}` }))
                      ]}
                      value={internalDriverId}
                      onChange={setInternalDriverId}
                      searchable
                      className="!h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      کرایه تمام‌شده ما ({currencyLabel})
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={outFreightInternalCost ? formatNumber(safeNum(outFreightInternalCost)) : ''}
                      onChange={(e) => setOutFreightInternalCost(e.target.value.replace(/,/g, ''))}
                      placeholder="هزینه واقعی حمل برای ما..."
                      className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      کرایه فاکتورشده مشتری ({currencyLabel})
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={outFreightBilledCost ? formatNumber(safeNum(outFreightBilledCost)) : ''}
                      onChange={(e) => setOutFreightBilledCost(e.target.value.replace(/,/g, ''))}
                      placeholder="مبلغ اعلامی در فاکتور..."
                      className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        دستمزد کارگر بارگیری ({currencyLabel})
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsLaborModalOpen(true)}
                        className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ کارگر جدید</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      dir="ltr"
                      value={outLaborCost ? formatNumber(safeNum(outLaborCost)) : ''}
                      onChange={(e) => setOutLaborCost(e.target.value.replace(/,/g, ''))}
                      placeholder="دستمزد بار زدن..."
                      className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* بخش ۵: قیمت اعلامی به کارفرما و ماشین‌حساب زنده آربیتراژ */}
          {(exitType === 'SALE_OR_PROJECT' || exitType === 'FREE_SALE') && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-teal-500/10 border border-indigo-500/30 dark:border-indigo-500/20 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    قیمت‌گذاری مشتری و موتور محاسبه سود پنهان (آربیتراژ انبار)
                  </h4>
                </div>
                {math.hiddenProfit >= 0 ? (
                  <span className="flex items-center gap-1 text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-xl shadow-sm">
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <span>سود خالص: +{math.hiddenProfit.toLocaleString('fa-IR')} {currencyLabel} ({math.profitMarginPct}٪)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-3 py-1 rounded-xl">
                    <AlertTriangle className="w-4 h-4" />
                    <span>فروش با زیان: {math.hiddenProfit.toLocaleString('fa-IR')} {currencyLabel}</span>
                  </span>
                )}
              </div>

              {/* فیلد فی اعلامی به کارفرما */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    فی اعلامی هر {inputUnit || 'واحد'} به مشتری ({currencyLabel}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={billedUnitPrice ? formatNumber(safeNum(billedUnitPrice)) : ''}
                    onChange={(e) => setBilledUnitPrice(e.target.value.replace(/,/g, ''))}
                    placeholder="۰"
                    className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 block mb-0.5">بهای تمام‌شده واقعی برای شما (خرید + حمل + کارگری):</span>
                  <span className="text-sm font-black font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                    {math.totalInternalCost.toLocaleString('fa-IR')} <span className="text-[10px] font-normal">{currencyLabel}</span>
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                  <span className="text-[11px] font-bold text-indigo-100 block mb-0.5">مبلغ کل فاکتور مشتری (مصالح + حمل):</span>
                  <span className="text-base font-black font-mono" dir="ltr">
                    {math.totalBilledAmount.toLocaleString('fa-IR')} <span className="text-xs font-normal">{currencyLabel}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* بخش ۶: سوئیچ طلایی صدور خودکار فاکتور رسمی چاپی در پس‌زمینه */}
          {(exitType === 'SALE_OR_PROJECT' || exitType === 'FREE_SALE') && (
            <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      صدور خودکار فاکتور رسمی / گرافیکی برای چاپ
                    </h4>
                    <p className="text-[11px] font-bold text-slate-400">
                      تولید خودکار سند و صورت‌وضعیت در دفتر فاکتورها همزمان با خروج کالا
                    </p>
                  </div>
                </div>

                <AnimatedCheckbox
                  checked={autoGenerateInvoice}
                  onChange={setAutoGenerateInvoice}
                  label="صدور فاکتور رسمی"
                />
              </div>

              {autoGenerateInvoice && (
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* تنظیم نمایش حمل */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        نحوه نمایش کرایه حمل در فاکتور مشتری:
                      </label>
                      <PortalSelect searchable 
                        options={[
                          { value: 'SEPARATE_ROW', label: 'ردیف مجزا در جدول اقلام فاکتور' },
                          { value: 'MERGED_IN_PRICE', label: 'ادغام در قیمت واحد کالا (بدون ردیف حمل)' },
                          { value: 'FREE_CLIENT', label: 'عدم نمایش (حمل رایگان برای مشتری)' },
                        ]}
                        value={freightInvoiceDisplay}
                        onChange={(v) => setFreightInvoiceDisplay(v as any)}
                        className="!h-10"
                      />
                    </div>

                    {/* تنظیم نمایش بارگیری */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        نحوه نمایش هزینه کارگری بارگیری:
                      </label>
                      <PortalSelect searchable 
                        options={[
                          { value: 'HIDDEN', label: 'عدم نمایش در فاکتور مشتری' },
                          { value: 'SEPARATE_ROW', label: 'ردیف مجزا در جدول اقلام فاکتور' },
                          { value: 'MERGED_IN_PRICE', label: 'ادغام در فی مصالح' },
                        ]}
                        value={laborInvoiceDisplay}
                        onChange={(v) => setLaborInvoiceDisplay(v as any)}
                        className="!h-10"
                      />
                    </div>
                  </div>

                  {/* چک‌باکس‌های مخفی‌سازی اطلاعات حساس */}
                  <div className="flex flex-wrap items-center gap-6 pt-2">
                    <AnimatedCheckbox
                      checked={hideLogisticsDetails}
                      onChange={setHideLogisticsDetails}
                      label="مخفی کردن نام راننده و پلاک خودرو در فاکتور"
                    />
                    <AnimatedCheckbox
                      checked={hideWorkerNames}
                      onChange={setHideWorkerNames}
                      label="مخفی کردن نام کارگران بارگیری در فاکتور"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* بخش ۷: پیوست تصویر بارنامه خروج و توضیحات */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* تصویر بارنامه خروج / رسید تحویل کارگاه */}
            <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>پیوست تصویر بارنامه خروج / رسید تحویل کارگاه</span>
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> انتخاب تصویر
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              {exitPhotos.length === 0 ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1 opacity-50" />
                  <span className="text-xs font-bold text-slate-500">کلیک جهت آپلود رسید تحویل یا بارنامه</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {exitPhotos.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                      <img src={img} alt="بارنامه خروج" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setExitPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-rose-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* توضیحات تکمیلی */}
            <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                توضیحات حواله خروج
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات در مورد تحویل‌گیرنده کارگاه، نحوه بارگیری، محل تخلیه..."
                className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

          </div>

          {/* بخش ۸: دریافت همزمان وجه از مشتری */}
          {(exitType === 'SALE_OR_PROJECT' || exitType === 'FREE_SALE') && (
            <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white">وضعیت تسویه این خروجی:</span>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
                      settlementStatus === 'SETTLED'
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                        : settlementStatus === 'PARTIAL'
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                        : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                    }`}>
                      {settlementStatus === 'SETTLED' ? 'تسویه شده' : settlementStatus === 'PARTIAL' ? 'دریافت ناقص' : 'در انتظار تسویه / بدهکاری'}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                    ثبت دریافت نقدی، چک صیادی یا واریز بانکی از کارفرما
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <DollarSign className="w-4 h-4" />
                <span>ثبت دریافت همزمان وجه از مشتری</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* فوتر چسبنده دکمه‌های عملیات */}
          {/* ======================================================== */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={math.isOverStock}
              className={`px-8 py-3 rounded-2xl text-white text-xs font-black shadow-xl transition-all flex items-center gap-2 cursor-pointer ${
                math.isOverStock
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>ثبت قطعی حواله خروج و کسر از پارت‌ها</span>
            </button>
          </div>

        </form>

      </motion.div>

      {/* اتصال مستقیم به مودال پرداخت مادر (UniversalTransactionModal) جهت دریافت وجه */}
      {isPaymentModalOpen && (
        <UniversalTransactionModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          context={selectedClientId ? 'CLIENT' : (selectedProjectId ? 'PROJECT' : 'INVENTORY')}
          clientId={selectedClientId || undefined}
          projectId={selectedProjectId || undefined}
          initialAmount={math.totalBilledAmount}
          initialDirection="IN"
          onSuccess={() => {
            setSettlementStatus('SETTLED');
            setReceivedAmount(math.totalBilledAmount);
            setIsPaymentModalOpen(false);
            toast.success('سند دریافت وجه مادر با موفقیت ثبت شد.');
          }}
        />
      )}

      {/* مودال‌های اصلی ساخت کارفرما، تأمین‌کننده و کارگر/راننده */}
      <ClientFormModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={(newClient) => {
          setSelectedClientId(newClient.id);
          setIsClientLocked(true);
          setIsClientModalOpen(false);
        }}
      />

      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        defaultCategory="externalLogistics"
        onSuccess={(newSupp) => {
          setExternalCarrierSupplierId(newSupp.id);
          setIsSupplierModalOpen(false);
        }}
      />

      <LaborFormModal
        isOpen={isLaborModalOpen}
        onClose={() => setIsLaborModalOpen(false)}
        onSuccess={(newWorker: WorkerProfile) => {
          setInternalDriverId(newWorker.id);
          setIsLaborModalOpen(false);
        }}
      />

      {/* مودال پیش‌نمایش چاپ فاکتور در صورت تولید خودکار */}
      <InvoicePrintModal
        isOpen={isInvoicePreviewOpen}
        onClose={() => setIsInvoicePreviewOpen(false)}
        invoice={generatedInvoice}
      />

    </div>,
    document.body
  );
}
