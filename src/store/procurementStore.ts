import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import moment from 'moment-jalaali';
import { generateUUID } from '../core/utils/uuid';

// ==========================================
// 💡 ۶ دسته‌بندی تخصصی و استاندارد تدارکات
// ==========================================
export type SupplierCategory = 
  | 'materialShop'       // ۱. فروشگاه مصالح و بنکداران
  | 'mine'               // ۲. معادن (شن، ماسه، سنگ، پوکه)
  | 'ironMarket'         // ۳. آهن‌فروشی و مقاطع فولادی
  | 'hardwareStore'      // ۴. ابزارفروشی، الکتریکی و تاسیسات
  | 'repairShop'         // ۵. تعمیرگاه، تراشکاری و خدمات فنی (متصل به ناوگان و ابزار)
  | 'externalLogistics'  // ۶. لجستیک و باربری متفرقه / خارجی (رانندگان و باربری‌های آزاد)
  // کلیدهای سازگاری با رکوردهای قبلی دیتابیس
  | 'BUILDING_MATERIALS'
  | 'QUARRY_SAND'
  | 'WORKSHOP_MACHINING'
  | 'TOOL_HARDWARE'
  | 'PRECAST_FACTORIES'
  | 'FUEL_WATER'
  | 'EQUIPMENT_RENTAL';

export interface SupplierCategoryConfig {
  id: SupplierCategory;
  title: string;
  shortTitle: string;
  description: string;
  accentColor: string;
  bgGradient: string;
}

export const normalizeSupplierCategory = (cat?: string): 'materialShop' | 'mine' | 'ironMarket' | 'hardwareStore' | 'repairShop' | 'externalLogistics' => {
  if (!cat) return 'materialShop';
  if (cat === 'materialShop' || cat === 'BUILDING_MATERIALS' || cat === 'PRECAST_FACTORIES') return 'materialShop';
  if (cat === 'mine' || cat === 'QUARRY_SAND') return 'mine';
  if (cat === 'ironMarket') return 'ironMarket';
  if (cat === 'hardwareStore' || cat === 'TOOL_HARDWARE' || cat === 'FUEL_WATER') return 'hardwareStore';
  if (cat === 'repairShop' || cat === 'WORKSHOP_MACHINING') return 'repairShop';
  if (cat === 'externalLogistics' || cat === 'EQUIPMENT_RENTAL') return 'externalLogistics';
  return 'materialShop';
};

export const SUPPLIER_CATEGORIES: Record<string, SupplierCategoryConfig> = {
  materialShop: {
    id: 'materialShop',
    title: 'فروشگاه مصالح و بنکداران',
    shortTitle: 'مصالح و بنکداری',
    description: 'تأمین سیمان، گچ، آجر، سفال، سرامیک، پودر سنگ و مصالح سفت‌کاری و نازک‌کاری',
    accentColor: '#3b82f6',
    bgGradient: 'from-blue-500/15 to-indigo-500/10'
  },
  mine: {
    id: 'mine',
    title: 'معادن (شن، ماسه، سنگ، پوکه)',
    shortTitle: 'معادن و دانه‌بندی',
    description: 'استخراج مستقیم ماسه شسته، شن شکسته، بیس، ساب‌بیس، سنگ لاشه، مالون و پوکه معدنی',
    accentColor: '#84cc16',
    bgGradient: 'from-lime-500/15 to-emerald-500/10'
  },
  ironMarket: {
    id: 'ironMarket',
    title: 'آهن‌فروشی و مقاطع فولادی',
    shortTitle: 'آهن و مقاطع فولادی',
    description: 'میلگرد آجدار، تیرآهن، قوطی، نبشی، ناودانی، ورق سیاه و گالوانیزه و میلگرد بستر',
    accentColor: '#f97316',
    bgGradient: 'from-orange-500/15 to-amber-500/10'
  },
  hardwareStore: {
    id: 'hardwareStore',
    title: 'ابزارفروشی، الکتریکی و تاسیسات',
    shortTitle: 'ابزار، برق و تاسیسات',
    description: 'ابزارآلات برقی و شارژی، اتصالات لوله، کابل و سیم، کلید و پریز و تجهیزات ایمنی',
    accentColor: '#8b5cf6',
    bgGradient: 'from-purple-500/15 to-violet-500/10'
  },
  repairShop: {
    id: 'repairShop',
    title: 'تعمیرگاه، تراشکاری و خدمات فنی',
    shortTitle: 'تعمیرگاه و تراشکاری',
    description: 'تراشکاری قطعات، تعمیر موتور، گیربکس، پمپ هیدرولیک، آهنگری و سرویس ماشین‌آلات',
    accentColor: '#f59e0b',
    bgGradient: 'from-amber-500/15 to-orange-500/10'
  },
  externalLogistics: {
    id: 'externalLogistics',
    title: 'لجستیک و باربری متفرقه / خارجی',
    shortTitle: 'باربری و رانندگان آزاد',
    description: 'رانندگان خاور، کمپرسی، تریلی، وانت نیسان و باربری‌های آزاد جهت حمل بار و مصالح پروژه‌ها',
    accentColor: '#10b981',
    bgGradient: 'from-emerald-500/15 to-teal-500/10'
  },
  // پشتیبانی از کلیدهای قبلی
  BUILDING_MATERIALS: {
    id: 'materialShop',
    title: 'فروشگاه مصالح و بنکداران',
    shortTitle: 'مصالح و بنکداری',
    description: 'تأمین سیمان، گچ، آجر، سفال و مصالح بنایی',
    accentColor: '#3b82f6',
    bgGradient: 'from-blue-500/15 to-indigo-500/10'
  },
  QUARRY_SAND: {
    id: 'mine',
    title: 'معادن (شن، ماسه، سنگ، پوکه)',
    shortTitle: 'معادن و دانه‌بندی',
    description: 'استخراج مستقیم ماسه شسته و شن',
    accentColor: '#84cc16',
    bgGradient: 'from-lime-500/15 to-emerald-500/10'
  },
  WORKSHOP_MACHINING: {
    id: 'repairShop',
    title: 'تعمیرگاه، تراشکاری و خدمات فنی',
    shortTitle: 'تعمیرگاه و تراشکاری',
    description: 'تراشکاری و بازسازی قطعات',
    accentColor: '#f59e0b',
    bgGradient: 'from-amber-500/15 to-orange-500/10'
  },
  TOOL_HARDWARE: {
    id: 'hardwareStore',
    title: 'ابزارفروشی، الکتریکی و تاسیسات',
    shortTitle: 'ابزار و یراق‌فروشی',
    description: 'ابزارآلات و یراق‌آلات',
    accentColor: '#8b5cf6',
    bgGradient: 'from-purple-500/15 to-violet-500/10'
  },
  EQUIPMENT_RENTAL: {
    id: 'externalLogistics',
    title: 'لجستیک و باربری متفرقه / خارجی',
    shortTitle: 'باربری و رانندگان آزاد',
    description: 'حمل بار و اجاره ماشین‌آلات',
    accentColor: '#10b981',
    bgGradient: 'from-emerald-500/15 to-teal-500/10'
  }
};

export interface SupplierBankAccount {
  bankName?: string;
  accountNumber?: string;
  shabaNumber?: string;
  cardHolder?: string;
}

export interface SupplierCatalogItem {
  id: string;
  name: string;
  unit: string;
  price: number;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;             // نام واحد یا بنگاه یا فروشگاه یا راننده
  managerName?: string;     // نام مدیریت یا رابط / راننده
  category: SupplierCategory;
  phone: string;
  phone2?: string;
  address?: string;
  city?: string;
  logo?: string;            // تصویر/لوگو یا کارت ویزیت (Base64)
  bankAccount?: SupplierBankAccount;
  initialBalance: number;   // مانده اولیه (مثبت: طلبکار از ما، منفی: بدهکار به ما)
  creditLimit?: number;     // سقف اعتبار اعطایی
  rating: number;           // رتبه کیفیت کالا، خوش‌قولی و خدمات (1 تا 5)
  notes?: string;
  isPinned?: boolean;
  catalog?: SupplierCatalogItem[];
  createdAt: string;
  updatedAt: string;
}

interface ProcurementState {
  suppliers: Supplier[];
  
  addSupplier: (data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'isPinned'>) => Supplier;
  updateSupplier: (id: string, data: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  togglePinSupplier: (id: string) => void;
  addCatalogItem: (supplierId: string, item: Omit<SupplierCatalogItem, 'id' | 'updatedAt'>) => void;
  deleteCatalogItem: (supplierId: string, itemId: string) => void;
}

// دیتای اولیه پیش‌فرض برای غنی‌سازی دیتابیس
const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup_1',
    name: 'معدن شن و ماسه کوهسار البرز',
    managerName: 'مهندس حیدری',
    category: 'mine',
    phone: '09121112233',
    phone2: '02165432101',
    address: 'جاده شهریار، نرسیده به وحیدیه، فرعی معدن',
    city: 'شهریار',
    bankAccount: {
      bankName: 'بانک ملت',
      cardHolder: 'شن و ماسه کوهسار',
      shabaNumber: 'IR120120000000001234567890'
    },
    initialBalance: 0,
    creditLimit: 150000000,
    rating: 5,
    notes: 'ماسه شسته دوبار شور با دانه‌بندی دقیق برای بتن‌ریزی سازه',
    isPinned: true,
    catalog: [
      { id: 'cat_1', name: 'ماسه شسته دوبار شور', unit: 'تن', price: 180000, updatedAt: '1403/01/10' },
      { id: 'cat_2', name: 'شن شکسته نخودی', unit: 'تن', price: 165000, updatedAt: '1403/01/10' },
      { id: 'cat_3', name: 'بیس سرندی راهسازی', unit: 'تن', price: 120000, updatedAt: '1403/01/10' }
    ],
    createdAt: '1403/01/10',
    updatedAt: '1403/01/10'
  },
  {
    id: 'sup_2',
    name: 'بنکداری آهن و فولاد پایتخت',
    managerName: 'حاج احمد رضایی',
    category: 'ironMarket',
    phone: '09123334455',
    address: 'بازار آهن شادآباد، بهاران ۲، پلاک ۴۲',
    city: 'تهران',
    bankAccount: {
      bankName: 'بانک ملی',
      cardHolder: 'احمد رضایی',
      shabaNumber: 'IR980170000000009876543210'
    },
    initialBalance: 0,
    creditLimit: 500000000,
    rating: 5,
    notes: 'تأمین میلگرد نیشابور و ذوب آهن با فاکتور رسمی و گواهی استاندارد',
    isPinned: true,
    catalog: [
      { id: 'cat_4', name: 'میلگرد ۱۴ آجدار A3 نیشابور', unit: 'شاخه', price: 340000, updatedAt: '1403/01/15' },
      { id: 'cat_5', name: 'تیرآهن ۱۶ ذوب‌آهن اصفهان', unit: 'شاخه', price: 4200000, updatedAt: '1403/01/15' }
    ],
    createdAt: '1403/01/15',
    updatedAt: '1403/01/15'
  },
  {
    id: 'sup_3',
    name: 'تراشکاری و بازسازی هیدرولیک پیروز',
    managerName: 'استاد علی پیروز',
    category: 'repairShop',
    phone: '09127778899',
    address: 'کیلومتر ۱۲ جاده مخصوص کرج، خیابان صنعت',
    city: 'تهران',
    initialBalance: 0,
    creditLimit: 50000000,
    rating: 4,
    notes: 'تخصص در بازسازی جک‌های تلسکوپی و تراش میل‌لنگ و سنگ‌مغناطیس',
    isPinned: false,
    createdAt: '1403/02/01',
    updatedAt: '1403/02/01'
  },
  {
    id: 'sup_4',
    name: 'فروشگاه مصالح بنایی و سفال صبا',
    managerName: 'مهندس حسینی',
    category: 'materialShop',
    phone: '09125556677',
    address: 'شهرک صنعتی شمس‌آباد، بلوار بوستان',
    city: 'تهران',
    initialBalance: 0,
    creditLimit: 300000000,
    rating: 5,
    notes: 'تأمین سیمان تیپ ۲ تهران، گچ سمنان و آجر لفتون درجه یک',
    isPinned: false,
    catalog: [
      { id: 'cat_6', name: 'سیمان پرتلند تیپ ۲ تهران (کیسه ۵۰ک)', unit: 'پاکت/کیسه', price: 85000, updatedAt: '1403/02/10' },
      { id: 'cat_7', name: 'گچ سفیدکاری سمنان (کیسه ۳۰ک)', unit: 'پاکت/کیسه', price: 42000, updatedAt: '1403/02/10' }
    ],
    createdAt: '1403/02/10',
    updatedAt: '1403/02/10'
  },
  {
    id: 'sup_5',
    name: 'ابزار یراق و لوازم ایمنی البرز',
    managerName: 'محسن کریمی',
    category: 'hardwareStore',
    phone: '09124445566',
    address: 'میدان حسن‌آباد، کوچه شجاعی، پلاک ۱۲',
    city: 'تهران',
    initialBalance: 0,
    creditLimit: 30000000,
    rating: 4,
    notes: 'تأمین دیسک برش، سیم جوش و کلاه و کفش ایمنی پرسنل',
    isPinned: false,
    createdAt: '1403/02/20',
    updatedAt: '1403/02/20'
  },
  {
    id: 'sup_6',
    name: 'باربری و تریلی‌داران آزاد جنوب (برادران کرمی)',
    managerName: 'آقا رضا کرمی',
    category: 'externalLogistics',
    phone: '09128889900',
    address: 'پایانه باربری نسیم‌شهر، غرفه ۵۴',
    city: 'نسیم‌شهر',
    initialBalance: 0,
    creditLimit: 80000000,
    rating: 5,
    notes: 'حمل بار مصالح از مبادی معدن و بازار آهن به کارگاه‌های سراسر کشور با بارنامه رسمی',
    isPinned: false,
    createdAt: '1403/03/01',
    updatedAt: '1403/03/01'
  }
];

export const useProcurementStore = create<ProcurementState>()(
  persist(
    (set, get) => ({
      suppliers: DEFAULT_SUPPLIERS,

      addSupplier: (data) => {
        const today = moment().format('jYYYY/jMM/jDD');
        const newSupplier: Supplier = {
          ...data,
          category: normalizeSupplierCategory(data.category),
          id: generateUUID(),
          isPinned: false,
          createdAt: today,
          updatedAt: today,
        };
        set((state) => ({
          suppliers: [newSupplier, ...state.suppliers]
        }));
        return newSupplier;
      },

      updateSupplier: (id, data) => {
        const today = moment().format('jYYYY/jMM/jDD');
        set((state) => ({
          suppliers: state.suppliers.map((s) =>
            s.id === id ? { 
              ...s, 
              ...data, 
              category: data.category ? normalizeSupplierCategory(data.category) : s.category,
              updatedAt: today 
            } : s
          )
        }));
      },

      deleteSupplier: (id) => {
        set((state) => ({
          suppliers: state.suppliers.filter((s) => s.id !== id)
        }));
      },

      togglePinSupplier: (id) => {
        set((state) => ({
          suppliers: state.suppliers.map((s) =>
            s.id === id ? { ...s, isPinned: !s.isPinned } : s
          )
        }));
      },

      addCatalogItem: (supplierId, item) => {
        const today = moment().format('jYYYY/jMM/jDD');
        const newItem: SupplierCatalogItem = {
          ...item,
          id: generateUUID(),
          updatedAt: today
        };
        set((state) => ({
          suppliers: state.suppliers.map((s) =>
            s.id === supplierId ? {
              ...s,
              catalog: [...(s.catalog || []), newItem],
              updatedAt: today
            } : s
          )
        }));
      },

      deleteCatalogItem: (supplierId, itemId) => {
        const today = moment().format('jYYYY/jMM/jDD');
        set((state) => ({
          suppliers: state.suppliers.map((s) =>
            s.id === supplierId ? {
              ...s,
              catalog: (s.catalog || []).filter(c => c.id !== itemId),
              updatedAt: today
            } : s
          )
        }));
      }
    }),
    {
      name: 'erp-procurement-storage'
    }
  )
);
