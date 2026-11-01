import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import moment from 'moment-jalaali';
import { generateUUID } from '../core/utils/uuid';
import { useProjectStore } from '../features/projects/store/projectStore';
import { useLogisticsStore } from './logisticsStore';
import { useSettingsStore } from './settingsStore';

// ==========================================
// 💡 ۹ دسته‌بندی تخصصی مصالح و اقلام انبار
// ==========================================
export interface InventoryCategoryConfig {
  id: string;
  title: string;
  shortTitle: string;
  accentColor: string;
  bgGradient: string;
  iconName: string;
}

export const INVENTORY_CATEGORIES: Record<string, InventoryCategoryConfig> = {
  cement_mortar: {
    id: 'cement_mortar',
    title: 'سیمان، گچ، پودر و ملات‌ها',
    shortTitle: 'سیمان و ملات',
    accentColor: '#3b82f6',
    bgGradient: 'from-blue-500/15 to-indigo-500/10',
    iconName: 'Boxes'
  },
  steel_iron: {
    id: 'steel_iron',
    title: 'مقاطع فولادی، میلگرد و آهن‌آلات',
    shortTitle: 'آهن و مقاطع فولادی',
    accentColor: '#f97316',
    bgGradient: 'from-orange-500/15 to-amber-500/10',
    iconName: 'Building'
  },
  brick_block: {
    id: 'brick_block',
    title: 'آجر، سفال، بلوک سیمانی و لیکا',
    shortTitle: 'آجر و بلوک',
    accentColor: '#ef4444',
    bgGradient: 'from-red-500/15 to-rose-500/10',
    iconName: 'Layers'
  },
  sand_gravel: {
    id: 'sand_gravel',
    title: 'شن، ماسه، سنگ لاشه و پوکه معدنی',
    shortTitle: 'شن، ماسه و دانه‌بندی',
    accentColor: '#84cc16',
    bgGradient: 'from-lime-500/15 to-emerald-500/10',
    iconName: 'Mountain'
  },
  plumbing: {
    id: 'plumbing',
    title: 'تاسیسات مکانیکی، لوله و اتصالات',
    shortTitle: 'تاسیسات و لوله‌کشی',
    accentColor: '#06b6d4',
    bgGradient: 'from-cyan-500/15 to-teal-500/10',
    iconName: 'Wrench'
  },
  electrical: {
    id: 'electrical',
    title: 'تاسیسات برقی، کابل، لوله برق و روشنایی',
    shortTitle: 'برق و روشنایی',
    accentColor: '#eab308',
    bgGradient: 'from-yellow-500/15 to-amber-500/10',
    iconName: 'Zap'
  },
  tile_ceramic: {
    id: 'tile_ceramic',
    title: 'کاشی، سرامیک، سنگ پلاک و موزاییک',
    shortTitle: 'کاشی، سرامیک و سنگ',
    accentColor: '#8b5cf6',
    bgGradient: 'from-purple-500/15 to-violet-500/10',
    iconName: 'Grid'
  },
  paint_insulation: {
    id: 'paint_insulation',
    title: 'رنگ، رزین، چسب، ایزوگام و عایق‌ها',
    shortTitle: 'رنگ و عایق',
    accentColor: '#ec4899',
    bgGradient: 'from-pink-500/15 to-rose-500/10',
    iconName: 'Paintbrush'
  },
  workshop_consumable: {
    id: 'workshop_consumable',
    title: 'ملزومات مصرفی کارگاه، چوب، فوم و پیچ',
    shortTitle: 'مصرفی کارگاهی',
    accentColor: '#10b981',
    bgGradient: 'from-emerald-500/15 to-teal-500/10',
    iconName: 'Hammer'
  }
};

// ==========================================
// 💡 متدهای ارزش‌گذاری موجودی و قوانین تبدیل واحد
// ==========================================
export type ValuationMethod = 'FIFO' | 'LIFO' | 'WEIGHTED_AVERAGE';
export type ExitPriority = 'STANDARD' | 'FEFO';

export interface UnitConversionRule {
  id: string;
  unitName: string;
  ratioToBase: number;         // هر ۱ واحد فرعی = چند واحد پایه (مثال: هر ۱ تن = ۲۰ کیسه ۵۰ کیلویی)
  isApproximate?: boolean;     // آیا تبدیل تقریبی است؟ (مثلا سرویس نیسان یا کمپرسی)
  notes?: string;              // توضیحات اختیاری
}

// ==========================================
// 💡 مدل دسته‌های ورودی (Batches / Lots)
// ==========================================
export interface InventoryBatch {
  id: string;
  itemId: string;
  batchNumber?: string;        // شماره پارت / لات ورودی
  entryDate: string;           // تاریخ ورود به انبار (شمسی 140X/XX/XX)
  expirationDate?: string;     // تاریخ انقضای اختیاری برای مصالح فاسدشدنی (سیمان، چسب، رنگ)
  initialQtyBase: number;      // مقدار ورودی اولیه بر حسب واحد پایه
  remainingQtyBase: number;    // موجودی باقیمانده بر حسب واحد پایه

  // بهای تمام‌شده و تفکیک هزینه واقعی
  purchaseUnitPrice: number;   // فی خرید واحد
  purchaseQty?: number;
  purchaseUnit?: string;
  entryFreightCost: number;    // کرایه حمل ورودی
  loadingLaborCost: number;    // دستمزد بارگیری
  unloadingLaborCost: number;  // دستمزد تخلیه
  totalLandedCost: number;     // کل بهای تمام‌شده قطعی پارت
  landedUnitCostBase: number;  // بهای تمام‌شده هر واحد پایه (قفل شده)

  supplierId?: string;
  supplierName?: string;
  status: 'ACTIVE' | 'DEPLETED' | 'EXPIRED';
  notes?: string;
  createdAt?: number;
}

// ==========================================
// 💡 مدل جامع کالای انبار (InventoryItem)
// ==========================================
export interface InventoryItem {
  id: string;
  name: string;
  code: string;                 // کد کالا یا بارکد (مثلا: INV-101)
  category: string;             // یکی از ۹ دسته بالا
  image?: string;               // تصویر Base64 کالا
  
  // سیستم چندواحدی هوشمند
  baseUnit: string;             // واحد پایه محاسباتی (مثلا: کیلوگرم، کیسه، عدد، متر)
  displayUnit: string;          // واحد نمایش پیش‌فرض موجودی در کارت‌ها
  unitConversions?: UnitConversionRule[]; // آرایه واحدهای فرعی و تقریبی

  // فیلدهای سازگاری دوگانه عقب‌رو
  primaryUnit: string;          // = baseUnit
  secondaryUnit?: string;       // واحد فرعی اول
  conversionRatio?: number;     // ضریب واحد فرعی اول

  currentStock: number;         // موجودی فعلی بر اساس واحد پایه
  minStockLevel: number;        // حداقل موجودی جهت هشدار و نقطه سفارش
  maxStockLevel?: number;       // حداکثر موجودی جهت جلوگیری از انباشت غیرضروری
  
  averageUnitCost: number;      // میانگین وزنی بهای تمام‌شده واحد برای ما
  defaultBilledPrice?: number;  // فی پیش‌فرض اعلامی به کارفرما
  
  // تنظیمات اختصاصی ارزش‌گذاری کالا
  valuationMethod?: ValuationMethod; // فایفو / لایفو / میانگین موزون
  exitPriority?: ExitPriority;       // اولویت خروج بر اساس نزدیک‌ترین تاریخ انقضا (FEFO)

  location?: string;            // قفسه / انبار / سوله / دپو
  isPinned?: boolean;
  createdAt?: string | number;
  updatedAt?: string | number;

  // فیلدهای سازگاری کامل با کدهای قبلی (Backward Compatibility)
  unit: string;
  costPrice: number;
}

export type MaterialItem = InventoryItem;

// ==========================================
// 💡 انواع تراکنش و گردش انبار (InventoryLog)
// ==========================================
export type InventoryLogType = 
  // ورود (IN)
  | 'PURCHASE'            // خرید از تأمین‌کنندگان تدارکات
  | 'PRODUCTION'          // ورود از بخش تولیدی کارگاه
  | 'RETURN_FROM_CLIENT'  // مرجوعی از پروژه / کارفرما به انبار
  // خروج (OUT)
  | 'SALE_OR_PROJECT'     // فروش یا ارسال به پروژه / کارفرما / آزاد
  | 'INTERNAL_USE'        // مصرف داخلی کارگاه خودمان
  | 'WASTE_OR_EXPIRED'    // خرابی، پرت، شکسته یا تاریخ‌گذشته
  | 'RETURN_TO_SUPPLIER'  // مرجوعی کالای معیوب به فروشنده
  // سازگاری با تایپ‌های قبلی
  | 'IN_PURCHASE'
  | 'OUT_PROJECT'
  | 'IN_RETURN'
  | 'OUT_WASTE'
  | 'ADJUSTMENT';

export type InventoryTransactionType = InventoryLogType;

export type SupplierReturnResolution = 'REPLACE_GOODS' | 'REFUND_OR_CREDIT';

export interface InventoryTransaction {
  id: string;
  date: string;                     // تاریخ شمسی 140X/XX/XX
  itemId: string;                   // شناسه کالا در انبار
  itemName: string;                 // نام کالا در زمان ثبت
  type: InventoryTransactionType;
  
  // طرف‌های حساب در شبکه عنکبوتی
  projectId?: string;
  phaseId?: string;
  clientId?: string;
  supplierId?: string;
  supplierName?: string;
  
  // مقادیر ورودی و واحد
  inputQty: number;                 // مقداری که کاربر در فرم تایپ کرده
  inputUnit: string;                // واحدی که کاربر انتخاب کرده (پایه یا فرعی)
  calculatedPrimaryQty: number;     // مقدار نهایی بر حسب واحد پایه که از انبار کسر یا اضافه می‌شود
  
  // هزینه‌های داخلی ما (بهای تمام‌شده واقعی)
  internalUnitCost: number;         // فی تمام‌شده هر واحد برای ما
  internalFreightCost: number;      // هزینه حمل و باربری واقعی
  loadingLaborCost?: number;        // دستمزد بارگیری
  unloadingLaborCost?: number;      // دستمزد تخلیه
  totalInternalCost: number;        // جمع کل بهای تمام‌شده
  
  // صورتحساب کارفرما و آربیتراژ (فقط برای خروج به پروژه / فروش)
  billedQty?: number;
  billedUnit?: string;
  billedUnitPrice?: number;
  billedFreightCost?: number;
  totalBilledAmount?: number;
  hiddenProfit?: number;            // سود پنهان = totalBilledAmount - totalInternalCost
  
  // وضعیت مرجوعی به تأمین‌کننده
  returnResolution?: SupplierReturnResolution; // تعویض با جنس سالم یا استرداد وجه

  // وضعیت تسویه
  settlementStatus?: 'SETTLED' | 'PENDING' | 'PARTIAL';
  paidAmount?: number;
  
  // ناوگان و راننده
  transportSource?: 'INTERNAL' | 'EXTERNAL';
  vehicleId?: string;
  driverId?: string;
  driverName?: string;
  
  description?: string;
  photos?: string[];
  
  // پارت اختصاصی و رکوردهای متصل در سایر استورها
  batchId?: string;
  depletedBatchAllocations?: Array<{ batchId: string; qty: number; unitCost: number }>;
  linkedConsumeRecordId?: string;
  linkedLogisticsId?: string;
  linkedPurchaseId?: string;
  
  createdAt?: number;
  updatedAt?: number;
}

export type InventoryLog = InventoryTransaction;

// ==========================================
// 💡 موتور تبدیل واحد چندگانه و تقریبی
// ==========================================
export function convertQuantity(
  qty: number,
  fromUnit: string,
  toUnit: string,
  item: InventoryItem
): { convertedQty: number; isApproximate: boolean; notes?: string } {
  if (!qty || isNaN(qty)) return { convertedQty: 0, isApproximate: false };
  if (!fromUnit || !toUnit || fromUnit === toUnit) {
    return { convertedQty: qty, isApproximate: false };
  }

  const baseUnit = item.baseUnit || item.primaryUnit || 'عدد';

  // ۱. تبدیل از fromUnit به واحد پایه (BaseUnit)
  let fromRatio = 1;
  let fromApprox = false;
  let notes = '';

  if (fromUnit === baseUnit || fromUnit === item.primaryUnit) {
    fromRatio = 1;
  } else if (item.secondaryUnit && fromUnit === item.secondaryUnit) {
    fromRatio = item.conversionRatio || 1;
  } else {
    const rule = item.unitConversions?.find(u => u.unitName === fromUnit);
    if (rule) {
      fromRatio = rule.ratioToBase || 1;
      fromApprox = !!rule.isApproximate;
      if (rule.notes) notes = rule.notes;
    }
  }

  const qtyInBase = qty * fromRatio;

  // ۲. تبدیل از واحد پایه به toUnit
  let toRatio = 1;
  let toApprox = false;

  if (toUnit === baseUnit || toUnit === item.primaryUnit) {
    toRatio = 1;
  } else if (item.secondaryUnit && toUnit === item.secondaryUnit) {
    toRatio = item.conversionRatio || 1;
  } else {
    const rule = item.unitConversions?.find(u => u.unitName === toUnit);
    if (rule) {
      toRatio = rule.ratioToBase || 1;
      toApprox = !!rule.isApproximate;
      if (rule.notes) notes = notes ? `${notes} • ${rule.notes}` : rule.notes;
    }
  }

  const convertedQty = toRatio !== 0 ? qtyInBase / toRatio : qtyInBase;

  return {
    convertedQty: Math.round(convertedQty * 1000) / 1000,
    isApproximate: fromApprox || toApprox,
    notes: notes || undefined
  };
}

// ==========================================
// 💡 اینترفیس استور انبار
// ==========================================
interface InventoryState {
  items: InventoryItem[];
  batches: InventoryBatch[];
  transactions: InventoryTransaction[];

  // فیلد سازگاری
  materials: InventoryItem[];

  // اکشن‌های کالا
  addItem: (item: Omit<InventoryItem, 'id' | 'unit' | 'costPrice'>) => string;
  updateItem: (id: string, data: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  togglePinItem: (id: string) => void;

  // اکشن‌های پارت‌ها / دسته‌های ورودی
  addBatch: (batch: Omit<InventoryBatch, 'id' | 'remainingQtyBase' | 'status' | 'createdAt'>) => string;
  updateBatch: (id: string, updates: Partial<InventoryBatch>) => void;
  deleteBatch: (id: string) => void;
  depleteStock: (itemId: string, qtyBase: number, method?: ValuationMethod) => {
    depletedBatches: Array<{ batchId: string; qty: number; unitCost: number }>;
    totalCalculatedCost: number;
  };

  // اکشن‌های حواله و کاردکس
  addTransaction: (tx: Omit<InventoryTransaction, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTransaction: (id: string, updates: Partial<InventoryTransaction>) => void;
  deleteTransaction: (id: string) => void;

  // متدهای سازگاری عقب‌رو
  addMaterial: (material: any) => void;
  updateMaterial: (id: string, data: any) => void;
  deleteMaterial: (id: string) => void;
  addStock: (id: string, amount: number) => void;
  deductStock: (id: string, amount: number) => void;
}

// دیتای اولیه استاندارد با پارت‌های ورودی و واحدهای پیشرفته
const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: 'mat-1',
    name: 'سیمان تیپ ۲ فیروزکوه',
    code: 'CEM-01',
    category: 'cement_mortar',
    baseUnit: 'کیسه',
    displayUnit: 'کیسه',
    primaryUnit: 'کیسه',
    secondaryUnit: 'پالت',
    conversionRatio: 40,
    unitConversions: [
      { id: 'uc-1', unitName: 'پالت', ratioToBase: 40, isApproximate: false, notes: 'هر پالت استاندارد شامل ۴۰ کیسه ۵۰ کیلویی' },
      { id: 'uc-2', unitName: 'تن', ratioToBase: 20, isApproximate: false, notes: 'هر تن سیمان شامل ۲۰ پاکت ۵۰ کیلویی' }
    ],
    currentStock: 480,
    minStockLevel: 100,
    maxStockLevel: 1200,
    averageUnitCost: 75000,
    defaultBilledPrice: 85000,
    valuationMethod: 'FIFO',
    exitPriority: 'FEFO',
    location: 'سوله اصلی - راهرو A',
    isPinned: true,
    unit: 'کیسه',
    costPrice: 75000
  },
  {
    id: 'mat-2',
    name: 'میلگرد ۱۶ آجدار نیشابور A3',
    code: 'STL-16',
    category: 'steel_iron',
    baseUnit: 'شاخه',
    displayUnit: 'شاخه',
    primaryUnit: 'شاخه',
    secondaryUnit: 'بندیل',
    conversionRatio: 120,
    unitConversions: [
      { id: 'uc-3', unitName: 'بندیل', ratioToBase: 120, isApproximate: false, notes: 'هر بندیل کارخانه‌ای ۱۲۰ شاخه ۱۲ متری' },
      { id: 'uc-4', unitName: 'تن', ratioToBase: 52.6, isApproximate: true, notes: 'هر شاخه تقریبا ۱۹ کیلوگرم' }
    ],
    currentStock: 180,
    minStockLevel: 50,
    maxStockLevel: 500,
    averageUnitCost: 520000,
    defaultBilledPrice: 580000,
    valuationMethod: 'FIFO',
    location: 'محوطه باز - دپوی آهن‌آلات',
    isPinned: true,
    unit: 'شاخه',
    costPrice: 520000
  },
  {
    id: 'mat-3',
    name: 'ماسه دوبار شور شکسته شهریار',
    code: 'SND-01',
    category: 'sand_gravel',
    baseUnit: 'تن',
    displayUnit: 'تن',
    primaryUnit: 'تن',
    secondaryUnit: 'کمپرسی',
    conversionRatio: 12,
    unitConversions: [
      { id: 'uc-5', unitName: 'کمپرسی ده چرخ', ratioToBase: 12, isApproximate: true, notes: 'ظرفیت اسمی ۱۰ الی ۱۲ تن' },
      { id: 'uc-6', unitName: 'نیسان', ratioToBase: 2.5, isApproximate: true, notes: 'ظرفیت بارگیری حدود ۲.۵ تن' }
    ],
    currentStock: 36,
    minStockLevel: 20,
    maxStockLevel: 150,
    averageUnitCost: 240000,
    defaultBilledPrice: 290000,
    valuationMethod: 'WEIGHTED_AVERAGE',
    location: 'محوطه باز - باکس شماره ۱',
    unit: 'تن',
    costPrice: 240000
  },
  {
    id: 'mat-4',
    name: 'لوله پلیکا فشاری ۴ اینچ پلیمر گلپایگان',
    code: 'PLB-04',
    category: 'plumbing',
    baseUnit: 'شاخه',
    displayUnit: 'شاخه',
    primaryUnit: 'شاخه',
    secondaryUnit: 'بسته',
    conversionRatio: 10,
    unitConversions: [
      { id: 'uc-7', unitName: 'بسته', ratioToBase: 10, isApproximate: false, notes: 'بسته‌بندی کارخانه‌ای ۱۰ شاخه ۶ متری' }
    ],
    currentStock: 65,
    minStockLevel: 20,
    maxStockLevel: 200,
    averageUnitCost: 380000,
    defaultBilledPrice: 440000,
    valuationMethod: 'FIFO',
    location: 'انبار شماره ۲ - قفسه C3',
    unit: 'شاخه',
    costPrice: 380000
  }
];

const INITIAL_BATCHES: InventoryBatch[] = [
  {
    id: 'batch-1',
    itemId: 'mat-1',
    batchNumber: 'LOT-CEM-01',
    entryDate: moment().subtract(10, 'days').format('jYYYY/jMM/jDD'),
    expirationDate: moment().add(80, 'days').format('jYYYY/jMM/jDD'),
    initialQtyBase: 480,
    remainingQtyBase: 480,
    purchaseUnitPrice: 70000,
    purchaseQty: 12,
    purchaseUnit: 'پالت',
    entryFreightCost: 2000000,
    loadingLaborCost: 200000,
    unloadingLaborCost: 200000,
    totalLandedCost: 36000000,
    landedUnitCostBase: 75000,
    status: 'ACTIVE',
    notes: 'خرید اولیه سیمان فیروزکوه',
    createdAt: Date.now() - 10 * 86400000
  },
  {
    id: 'batch-2',
    itemId: 'mat-2',
    batchNumber: 'LOT-STL-01',
    entryDate: moment().subtract(15, 'days').format('jYYYY/jMM/jDD'),
    initialQtyBase: 180,
    remainingQtyBase: 180,
    purchaseUnitPrice: 510000,
    entryFreightCost: 1500000,
    loadingLaborCost: 150000,
    unloadingLaborCost: 150000,
    totalLandedCost: 93600000,
    landedUnitCostBase: 520000,
    status: 'ACTIVE',
    notes: 'پارت اول میلگرد ۱۶',
    createdAt: Date.now() - 15 * 86400000
  }
];

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: INITIAL_ITEMS,
      materials: INITIAL_ITEMS,
      batches: INITIAL_BATCHES,
      transactions: [
        {
          id: 'tx-init-1',
          date: moment().subtract(10, 'days').format('jYYYY/jMM/jDD'),
          itemId: 'mat-1',
          itemName: 'سیمان تیپ ۲ فیروزکوه',
          type: 'PURCHASE',
          inputQty: 12,
          inputUnit: 'پالت',
          calculatedPrimaryQty: 480,
          internalUnitCost: 75000,
          internalFreightCost: 2000000,
          loadingLaborCost: 200000,
          unloadingLaborCost: 200000,
          totalInternalCost: 36000000,
          batchId: 'batch-1',
          settlementStatus: 'SETTLED',
          description: 'خرید ۱۲ پالت سیمان فیروزکوه از بازرگانی مصالح',
          createdAt: Date.now() - 10 * 86400000
        }
      ],

      // ==========================================
      // اکشن‌های کالا
      // ==========================================
      addItem: (itemData) => {
        const id = generateUUID();
        const primaryUnit = itemData.baseUnit || itemData.primaryUnit || 'عدد';
        const displayUnit = itemData.displayUnit || primaryUnit;
        const averageUnitCost = Number(itemData.averageUnitCost) || 0;
        const currentStock = Number(itemData.currentStock) || 0;
        const minStockLevel = Number(itemData.minStockLevel) || 10;
        const maxStockLevel = itemData.maxStockLevel ? Number(itemData.maxStockLevel) : undefined;

        const newItem: InventoryItem = {
          ...itemData,
          id,
          baseUnit: primaryUnit,
          displayUnit,
          primaryUnit,
          averageUnitCost,
          currentStock,
          minStockLevel,
          maxStockLevel,
          unit: primaryUnit,
          costPrice: averageUnitCost,
          createdAt: moment().format('jYYYY/jMM/jDD')
        };

        // ایجاد پارت اولیه در صورت وجود موجودی ابتدای دوره
        let initialBatches: InventoryBatch[] = [];
        if (currentStock > 0) {
          const batchId = generateUUID();
          initialBatches.push({
            id: batchId,
            itemId: id,
            batchNumber: `LOT-${Date.now().toString().slice(-6)}`,
            entryDate: moment().format('jYYYY/jMM/jDD'),
            initialQtyBase: currentStock,
            remainingQtyBase: currentStock,
            purchaseUnitPrice: averageUnitCost,
            entryFreightCost: 0,
            loadingLaborCost: 0,
            unloadingLaborCost: 0,
            totalLandedCost: currentStock * averageUnitCost,
            landedUnitCostBase: averageUnitCost,
            status: 'ACTIVE',
            notes: 'موجودی اولیه هنگام تعریف کالا',
            createdAt: Date.now()
          });
        }

        set((state) => {
          const nextItems = [newItem, ...state.items];
          return { 
            items: nextItems, 
            materials: nextItems,
            batches: [...initialBatches, ...state.batches]
          };
        });

        return id;
      },

      updateItem: (id, data) => {
        set((state) => {
          const nextItems = state.items.map((it) => {
            if (it.id !== id) return it;
            const updated = { ...it, ...data, updatedAt: moment().format('jYYYY/jMM/jDD') };
            if (data.baseUnit) {
              updated.primaryUnit = data.baseUnit;
              updated.unit = data.baseUnit;
            } else if (data.primaryUnit) {
              updated.baseUnit = data.primaryUnit;
              updated.unit = data.primaryUnit;
            }
            if (data.averageUnitCost !== undefined) updated.costPrice = data.averageUnitCost;
            return updated;
          });
          return { items: nextItems, materials: nextItems };
        });
      },

      deleteItem: (id) => {
        set((state) => {
          const nextItems = state.items.filter((it) => it.id !== id);
          const nextBatches = state.batches.filter((b) => b.itemId !== id);
          const nextTxs = state.transactions.filter((tx) => tx.itemId !== id);
          return { items: nextItems, materials: nextItems, batches: nextBatches, transactions: nextTxs };
        });
      },

      togglePinItem: (id) => {
        set((state) => {
          const nextItems = state.items.map((it) =>
            it.id === id ? { ...it, isPinned: !it.isPinned } : it
          );
          return { items: nextItems, materials: nextItems };
        });
      },

      // ==========================================
      // اکشن‌های پارت‌ها و دسته‌های ورودی
      // ==========================================
      addBatch: (batchData) => {
        const id = generateUUID();
        const initQty = Number(batchData.initialQtyBase) || 0;
        const purchaseUnitPrice = Number(batchData.purchaseUnitPrice) || 0;
        const freight = Number(batchData.entryFreightCost) || 0;
        const loading = Number(batchData.loadingLaborCost) || 0;
        const unloading = Number(batchData.unloadingLaborCost) || 0;

        // فرمول بهای تمام‌شده واقعی پارت:
        // Total Landed Cost = (Purchase Qty * Purchase Unit Price) + Freight + Loading + Unloading
        const totalLanded = (initQty * purchaseUnitPrice) + freight + loading + unloading;
        const landedCostBase = initQty > 0 ? Math.round(totalLanded / initQty) : purchaseUnitPrice;

        const newBatch: InventoryBatch = {
          ...batchData,
          id,
          initialQtyBase: initQty,
          remainingQtyBase: initQty,
          purchaseUnitPrice,
          entryFreightCost: freight,
          loadingLaborCost: loading,
          unloadingLaborCost: unloading,
          totalLandedCost: totalLanded,
          landedUnitCostBase: landedCostBase,
          status: 'ACTIVE',
          createdAt: Date.now()
        };

        set((state) => ({
          batches: [newBatch, ...state.batches]
        }));

        return id;
      },

      updateBatch: (id, updates) => {
        set((state) => ({
          batches: state.batches.map((b) => (b.id === id ? { ...b, ...updates } : b))
        }));
      },

      deleteBatch: (id) => {
        set((state) => ({
          batches: state.batches.filter((b) => b.id !== id)
        }));
      },

      // ==========================================
      // موتور کسر هوشمند پارت‌ها بر اساس FIFO / LIFO / FEFO / AVERAGE
      // ==========================================
      depleteStock: (itemId, qtyBase, explicitMethod) => {
        const state = get();
        const item = state.items.find((it) => it.id === itemId);
        const globalValuation = useSettingsStore.getState().settings.valuationMethod || 'WEIGHTED_AVERAGE';
        const globalPriority = useSettingsStore.getState().settings.exitPriority || 'FEFO';

        const method = explicitMethod || item?.valuationMethod || globalValuation;
        const priority = item?.exitPriority || globalPriority;

        // دریافت پارت‌های فعال دارای موجودی
        let activeBatches = state.batches.filter(
          (b) => b.itemId === itemId && b.remainingQtyBase > 0 && b.status === 'ACTIVE'
        );

        // مرتب‌سازی بر اساس استراتژی خروج
        if (priority === 'FEFO' && activeBatches.some((b) => !!b.expirationDate)) {
          // اولویت با خروج تاریخ انقضای نزدیک‌تر (FEFO)
          activeBatches.sort((a, b) => {
            if (a.expirationDate && b.expirationDate) {
              return a.expirationDate.localeCompare(b.expirationDate);
            }
            if (a.expirationDate) return -1;
            if (b.expirationDate) return 1;
            return a.entryDate.localeCompare(b.entryDate);
          });
        } else if (method === 'LIFO') {
          // اولین صادره از آخرین وارده (LIFO)
          activeBatches.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
        } else {
          // پیش‌فرض فایفو (FIFO): اولین صادره از اولین وارده
          activeBatches.sort((a, b) => a.entryDate.localeCompare(b.entryDate));
        }

        let needed = qtyBase;
        const depletedAllocations: Array<{ batchId: string; qty: number; unitCost: number }> = [];
        let totalCalculatedCost = 0;

        const updatedBatches = state.batches.map((b) => {
          if (b.itemId !== itemId || b.remainingQtyBase <= 0 || needed <= 0) return b;

          // آیا این پارت در صف خروج قرار دارد؟
          const isTarget = activeBatches.some((ab) => ab.id === b.id);
          if (!isTarget) return b;

          const take = Math.min(b.remainingQtyBase, needed);
          const nextRemaining = b.remainingQtyBase - take;
          needed -= take;

          depletedAllocations.push({
            batchId: b.id,
            qty: take,
            unitCost: b.landedUnitCostBase
          });

          if (method === 'WEIGHTED_AVERAGE') {
            totalCalculatedCost += take * (item?.averageUnitCost || b.landedUnitCostBase);
          } else {
            totalCalculatedCost += take * b.landedUnitCostBase;
          }

          return {
            ...b,
            remainingQtyBase: nextRemaining,
            status: nextRemaining === 0 ? ('DEPLETED' as const) : ('ACTIVE' as const)
          };
        });

        // به‌روزرسانی پارت‌ها در استور
        set({ batches: updatedBatches });

        return {
          depletedBatches: depletedAllocations,
          totalCalculatedCost: Math.round(totalCalculatedCost)
        };
      },

      // ==========================================
      // اکشن‌های حواله و گردش انبار (شبکه عنکبوتی)
      // ==========================================
      addTransaction: (txData) => {
        const txId = generateUUID();
        const now = Date.now();
        const calcQty = Number(txData.calculatedPrimaryQty) || 0;

        let linkedConsumeRecordId: string | undefined = undefined;
        let linkedLogisticsId: string | undefined = undefined;
        let batchId = txData.batchId;
        let depletedBatchAllocations: Array<{ batchId: string; qty: number; unitCost: number }> | undefined = undefined;

        const isIncoming =
          txData.type === 'PURCHASE' ||
          txData.type === 'PRODUCTION' ||
          txData.type === 'RETURN_FROM_CLIENT' ||
          txData.type === 'IN_PURCHASE' ||
          txData.type === 'IN_RETURN';

        const isOutgoing =
          txData.type === 'SALE_OR_PROJECT' ||
          txData.type === 'INTERNAL_USE' ||
          txData.type === 'WASTE_OR_EXPIRED' ||
          txData.type === 'RETURN_TO_SUPPLIER' ||
          txData.type === 'OUT_PROJECT' ||
          txData.type === 'OUT_WASTE';

        // ۱. در صورت ورود خرید، پارت اختصاصی ساخته و بهای تمام‌شده قطعی قفل می‌شود
        if (isIncoming && (txData.type === 'PURCHASE' || txData.type === 'IN_PURCHASE')) {
          batchId = get().addBatch({
            itemId: txData.itemId,
            batchNumber: `LOT-${Date.now().toString().slice(-6)}`,
            entryDate: txData.date,
            initialQtyBase: calcQty,
            purchaseUnitPrice: txData.internalUnitCost,
            purchaseQty: txData.inputQty,
            purchaseUnit: txData.inputUnit,
            entryFreightCost: txData.internalFreightCost || 0,
            loadingLaborCost: txData.loadingLaborCost || 0,
            unloadingLaborCost: txData.unloadingLaborCost || 0,
            totalLandedCost: txData.totalInternalCost,
            landedUnitCostBase: calcQty > 0 ? Math.round(txData.totalInternalCost / calcQty) : txData.internalUnitCost,
            supplierId: txData.supplierId,
            supplierName: txData.supplierName,
            notes: txData.description
          });
        }

        // ۲. در صورت خروج، موتور کسر هوشمند پارت‌ها فراخوانی می‌شود
        if (isOutgoing && calcQty > 0) {
          const res = get().depleteStock(txData.itemId, calcQty);
          depletedBatchAllocations = res.depletedBatches;
        }

        // ۳. تزریق به مصرف پروژه در صورت ارسال به پروژه
        if (
          (txData.type === 'SALE_OR_PROJECT' || txData.type === 'OUT_PROJECT') &&
          txData.projectId &&
          txData.projectId !== 'FREE'
        ) {
          try {
            linkedConsumeRecordId = generateUUID();
            useProjectStore.getState().addConsumeRecord(txData.projectId, {
              phaseId: txData.phaseId,
              itemId: txData.itemId,
              title: `مصرف از انبار مرکزی: ${txData.itemName}`,
              date: txData.date,
              quantity: txData.billedQty || calcQty,
              unit: txData.billedUnit || txData.inputUnit,
              reason: 'USE',
              isBillable: true,
              internalCost: txData.totalInternalCost,
              billedCost: txData.totalBilledAmount || txData.totalInternalCost,
              note: txData.description || 'حواله خروج انبار مرکزی'
            });
          } catch (e) {
            console.error('Error logging consumption to projectStore:', e);
          }
        }

        // ۴. تزریق به ناوگان در صورت حمل بار داخلی
        if (txData.transportSource === 'INTERNAL' && txData.vehicleId && txData.internalFreightCost > 0) {
          try {
            linkedLogisticsId = generateUUID();
            useLogisticsStore.getState().addLog({
              id: linkedLogisticsId,
              vehicleInfo: txData.vehicleId,
              date: txData.date,
              type: 'TRANSPORT',
              description: `حمل بار انبار: ${txData.itemName}`,
              billedCost: txData.internalFreightCost,
              status: 'PAID'
            } as any);
          } catch (e) {
            console.error('Error logging transport to logisticsStore:', e);
          }
        }

        const newTx: InventoryTransaction = {
          ...txData,
          id: txId,
          batchId,
          depletedBatchAllocations,
          linkedConsumeRecordId,
          linkedLogisticsId,
          createdAt: now,
          updatedAt: now
        };

        set((state) => {
          // به‌روزرسانی موجودی و قیمت تمام‌شده کالا
          const nextItems = state.items.map((it) => {
            if (it.id !== txData.itemId) return it;

            let updatedStock = it.currentStock;
            let updatedAverageCost = it.averageUnitCost;

            if (isIncoming) {
              const oldVal = updatedStock * updatedAverageCost;
              const newVal = txData.totalInternalCost || (calcQty * txData.internalUnitCost);
              updatedStock += calcQty;
              if (updatedStock > 0) {
                updatedAverageCost = Math.round((oldVal + newVal) / updatedStock);
              }
            } else if (isOutgoing) {
              updatedStock = Math.max(0, updatedStock - calcQty);
            } else if (txData.type === 'ADJUSTMENT') {
              updatedStock = calcQty;
            }

            return {
              ...it,
              currentStock: updatedStock,
              averageUnitCost: updatedAverageCost,
              costPrice: updatedAverageCost
            };
          });

          return {
            items: nextItems,
            materials: nextItems,
            transactions: [newTx, ...state.transactions]
          };
        });

        return txId;
      },

      updateTransaction: (id, updates) => {
        set((state) => {
          const oldTx = state.transactions.find((t) => t.id === id);
          if (!oldTx) return state;

          const updatedTx: InventoryTransaction = {
            ...oldTx,
            ...updates,
            updatedAt: Date.now()
          };

          const oldQty = Number(oldTx.calculatedPrimaryQty) || 0;
          const newQty = Number(updatedTx.calculatedPrimaryQty) || 0;
          const qtyDiff = newQty - oldQty;

          const isIncoming =
            updatedTx.type === 'PURCHASE' ||
            updatedTx.type === 'PRODUCTION' ||
            updatedTx.type === 'RETURN_FROM_CLIENT' ||
            updatedTx.type === 'IN_PURCHASE' ||
            updatedTx.type === 'IN_RETURN';

          const isOutgoing =
            updatedTx.type === 'SALE_OR_PROJECT' ||
            updatedTx.type === 'INTERNAL_USE' ||
            updatedTx.type === 'WASTE_OR_EXPIRED' ||
            updatedTx.type === 'RETURN_TO_SUPPLIER' ||
            updatedTx.type === 'OUT_PROJECT' ||
            updatedTx.type === 'OUT_WASTE';

          const nextItems = state.items.map((it) => {
            if (it.id !== updatedTx.itemId) return it;
            let updatedStock = it.currentStock;

            if (isIncoming) {
              updatedStock += qtyDiff;
            } else if (isOutgoing) {
              updatedStock = Math.max(0, updatedStock - qtyDiff);
            } else if (updatedTx.type === 'ADJUSTMENT') {
              updatedStock = newQty;
            }

            return { ...it, currentStock: updatedStock };
          });

          const nextTxs = state.transactions.map((t) => (t.id === id ? updatedTx : t));
          return { items: nextItems, materials: nextItems, transactions: nextTxs };
        });
      },

      deleteTransaction: (id) => {
        const state = get();
        const tx = state.transactions.find((t) => t.id === id);
        if (!tx) return;

        // لغو اثرات در پروژه و لجستیک (Cascade Undo)
        if (tx.linkedConsumeRecordId && tx.projectId) {
          try {
            useProjectStore.getState().deleteConsumeRecord(tx.projectId, tx.linkedConsumeRecordId);
          } catch (e) {
            console.error('Error undoing project consumption:', e);
          }
        }

        if (tx.linkedLogisticsId) {
          try {
            useLogisticsStore.getState().deleteLog(tx.linkedLogisticsId);
          } catch (e) {
            console.error('Error undoing logistics log:', e);
          }
        }

        const calcQty = Number(tx.calculatedPrimaryQty) || 0;
        const isIncoming =
          tx.type === 'PURCHASE' ||
          tx.type === 'PRODUCTION' ||
          tx.type === 'RETURN_FROM_CLIENT' ||
          tx.type === 'IN_PURCHASE' ||
          tx.type === 'IN_RETURN';

        const isOutgoing =
          tx.type === 'SALE_OR_PROJECT' ||
          tx.type === 'INTERNAL_USE' ||
          tx.type === 'WASTE_OR_EXPIRED' ||
          tx.type === 'RETURN_TO_SUPPLIER' ||
          tx.type === 'OUT_PROJECT' ||
          tx.type === 'OUT_WASTE';

        // بازگرداندن پارت‌های مصرف‌شده در صورت خروج
        let nextBatches = state.batches;
        if (tx.depletedBatchAllocations && tx.depletedBatchAllocations.length > 0) {
          nextBatches = state.batches.map((b) => {
            const alloc = tx.depletedBatchAllocations?.find((a) => a.batchId === b.id);
            if (alloc) {
              const restoredRemaining = b.remainingQtyBase + alloc.qty;
              return {
                ...b,
                remainingQtyBase: restoredRemaining,
                status: 'ACTIVE' as const
              };
            }
            return b;
          });
        } else if (tx.batchId && isIncoming) {
          // اگر ورود بود و پارت اختصاصی داشت، پارت حذف می‌شود
          nextBatches = state.batches.filter((b) => b.id !== tx.batchId);
        }

        set((curr) => {
          // بازگرداندن موجودی کالا
          const nextItems = curr.items.map((it) => {
            if (it.id !== tx.itemId) return it;
            let restoredStock = it.currentStock;

            if (isOutgoing) {
              restoredStock += calcQty;
            } else if (isIncoming) {
              restoredStock = Math.max(0, restoredStock - calcQty);
            }

            return { ...it, currentStock: restoredStock };
          });

          const nextTxs = curr.transactions.filter((t) => t.id !== id);
          return { items: nextItems, materials: nextItems, batches: nextBatches, transactions: nextTxs };
        });
      },

      // ==========================================
      // متدهای سازگاری معکوس (Backward Compatibility)
      // ==========================================
      addMaterial: (mat) => {
        get().addItem({
          name: mat.name,
          code: mat.code || `INV-${Date.now().toString().slice(-4)}`,
          category: mat.category || 'cement_mortar',
          baseUnit: mat.unit || 'عدد',
          displayUnit: mat.unit || 'عدد',
          primaryUnit: mat.unit || 'عدد',
          currentStock: Number(mat.currentStock) || 0,
          minStockLevel: 10,
          averageUnitCost: Number(mat.costPrice) || 0,
          unit: mat.unit || 'عدد',
          costPrice: Number(mat.costPrice) || 0
        });
      },

      updateMaterial: (id, data) => {
        get().updateItem(id, {
          name: data.name,
          baseUnit: data.unit,
          primaryUnit: data.unit,
          currentStock: data.currentStock !== undefined ? Number(data.currentStock) : undefined,
          averageUnitCost: data.costPrice !== undefined ? Number(data.costPrice) : undefined
        });
      },

      deleteMaterial: (id) => {
        get().deleteItem(id);
      },

      addStock: (id, amount) => {
        const item = get().items.find((it) => it.id === id);
        if (!item) return;
        get().addTransaction({
          date: moment().format('jYYYY/jMM/jDD'),
          itemId: id,
          itemName: item.name,
          type: 'PURCHASE',
          inputQty: amount,
          inputUnit: item.primaryUnit,
          calculatedPrimaryQty: amount,
          internalUnitCost: item.averageUnitCost,
          internalFreightCost: 0,
          totalInternalCost: amount * item.averageUnitCost,
          description: 'افزایش دستی موجودی انبار'
        });
      },

      deductStock: (id, amount) => {
        const item = get().items.find((it) => it.id === id);
        if (!item) return;
        get().addTransaction({
          date: moment().format('jYYYY/jMM/jDD'),
          itemId: id,
          itemName: item.name,
          type: 'WASTE_OR_EXPIRED',
          inputQty: amount,
          inputUnit: item.primaryUnit,
          calculatedPrimaryQty: amount,
          internalUnitCost: item.averageUnitCost,
          internalFreightCost: 0,
          totalInternalCost: amount * item.averageUnitCost,
          description: 'کسر دستی موجودی انبار'
        });
      }
    }),
    {
      name: 'inventory-storage',
      migrate: (persistedState: any) => {
        if (!persistedState) return persistedState;
        const rawItems = persistedState.items || persistedState.materials || [];
        const migratedItems: InventoryItem[] = rawItems.map((raw: any) => ({
          id: raw.id || generateUUID(),
          name: raw.name || 'کالای انبار',
          code: raw.code || `INV-${raw.id?.slice(0, 4) || '01'}`,
          category: raw.category || 'cement_mortar',
          image: raw.image,
          baseUnit: raw.baseUnit || raw.primaryUnit || raw.unit || 'عدد',
          displayUnit: raw.displayUnit || raw.primaryUnit || raw.unit || 'عدد',
          unitConversions: raw.unitConversions || [],
          primaryUnit: raw.primaryUnit || raw.unit || 'عدد',
          secondaryUnit: raw.secondaryUnit,
          conversionRatio: raw.conversionRatio || 1,
          currentStock: Number(raw.currentStock) || 0,
          minStockLevel: Number(raw.minStockLevel) || 10,
          maxStockLevel: raw.maxStockLevel ? Number(raw.maxStockLevel) : undefined,
          averageUnitCost: Number(raw.averageUnitCost || raw.costPrice) || 0,
          defaultBilledPrice: Number(raw.defaultBilledPrice) || undefined,
          valuationMethod: raw.valuationMethod || 'FIFO',
          exitPriority: raw.exitPriority || 'FEFO',
          location: raw.location,
          isPinned: !!raw.isPinned,
          unit: raw.primaryUnit || raw.unit || 'عدد',
          costPrice: Number(raw.averageUnitCost || raw.costPrice) || 0,
          createdAt: raw.createdAt || moment().format('jYYYY/jMM/jDD')
        }));

        return {
          ...persistedState,
          items: migratedItems,
          materials: migratedItems,
          batches: persistedState.batches || [],
          transactions: persistedState.transactions || []
        };
      }
    }
  )
);
