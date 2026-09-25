import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 💡 ریزترین جزئیات برای آیتم‌های هر فاکتور خرید
export interface PurchaseItem {
  id: string;
  name: string;             // نام کالا / مصالح
  quantity: number;         // مقدار
  unit: string;             // واحد (کیلو، تن، عدد، متر و...)
  unitPrice: number;        // قیمت واحد
  totalPrice: number;       // قیمت کل این ردیف
  inventoryId?: string;     // اتصال به انبار: در صورت ورود به انبار مرکزی
}

// 💡 ساختار جامع و فوق‌هوشمند هر رکورد (فاکتور) خرید
export interface PurchaseRecord {
  id: string;
  
  // 🔗 اتصالات کلیدی (Relations)
  projectId?: string;       // اتصال به پروژه (اگر خالی باشد یعنی خرید عمومی برای انبار/دفتر است)
  phaseId?: string;         // اتصال به فاز خاصی از پروژه
  clientId?: string;        // اتصال مستقیم به کارفرما (جهت فیلتر سریع)
  
  // 📄 اطلاعات پایه فاکتور
  title: string;            // عنوان خرید (مثلا: خرید سیمان تیپ ۲)
  vendor: string;           // فروشنده / تامین‌کننده
  date: string;             // تاریخ صدور فاکتور (فرمت شمسی 140X/XX/XX)
  
  // 📦 اقلام و مقادیر (پشتیبانی از فاکتور تک‌قلمی و چندقلمی)
  items?: PurchaseItem[];   // در صورت چند قلمی بودن فاکتور
  quantity?: number;        // مقدار کلی (برای فاکتورهای سریع و تک‌قلمی)
  unit?: string;            // واحد کلی
  
  // 💰 اطلاعات مالی و حسابداری (هسته اصلی محاسبات شما)
  internalCost: number;     // بهای تمام شده واقعی (خروج از جیب پیمانکار)
  billedCost?: number;      // مبلغ فاکتور شده برای کارفرما (همراه با سود/بالاسری)
  
  // 🚚 اطلاعات حمل و نقل (درون‌فاکتوری)
  hasTransport?: boolean;           // آیا کرایه روی همین فاکتور کشیده شده؟
  transportInternalCost?: number;   // هزینه واقعی کرایه
  transportBilledCost?: number;     // کرایه فاکتور شده برای کارفرما
  
  // 🧠 اتصالات فوق‌هوشمند به سایر ماژول‌های ERP (برای توسعه‌های آینده و فعلی)
  linkedLogisticsId?: string; // اتصال به سیستم لجستیک (شناسه سرویس ماشین‌آلات مرتبط)
  linkedLaborId?: string;     // اتصال به سیستم نیروی کار (شناسه کارگر تخلیه‌بار یا راننده)
  
  // 🖼️ اسناد و ضمائم
  photos?: string[];        // تصاویر فاکتور، رسید بانکی، یا بارنامه
  notes?: string;           // توضیحات اضافه
  
  // ⏱️ تایم‌استمپ‌های سیستمی
  createdAt: number;
  updatedAt: number;
}

interface PurchaseStore {
  purchases: PurchaseRecord[];
  
  // 🛠️ اکشن‌های اصلی
  addPurchase: (record: Omit<PurchaseRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePurchase: (id: string, updates: Partial<PurchaseRecord>) => void;
  deletePurchase: (id: string) => void;
  
  // 🧹 اکشن‌های پاک‌سازی گروهی (برای زمانی که یک پروژه یا کارفرما کلاً حذف می‌شود)
  deletePurchasesByProject: (projectId: string) => void;
  deletePurchasesByClient: (clientId: string) => void;
}

export const usePurchaseStore = create<PurchaseStore>()(
  persist(
    (set) => ({
      purchases: [],

      // ثبت فاکتور جدید
      addPurchase: (record) => {
        const newRecord: PurchaseRecord = {
          ...record,
          id: Date.now().toString(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({ 
          purchases: [...state.purchases, newRecord] 
        }));
      },

      // ویرایش فاکتور موجود
      updatePurchase: (id, updates) => {
        set((state) => ({
          purchases: state.purchases.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
        }));
      },

      // حذف یک فاکتور خاص
      deletePurchase: (id) => {
        set((state) => ({
          purchases: state.purchases.filter((p) => p.id !== id),
        }));
      },

      // پاک‌سازی تمام خریدهای یک پروژه (در صورت حذف پروژه)
      deletePurchasesByProject: (projectId) => {
        set((state) => ({
          purchases: state.purchases.filter((p) => p.projectId !== projectId),
        }));
      },

      // پاک‌سازی تمام خریدهای یک کارفرما (در صورت حذف کارفرما)
      deletePurchasesByClient: (clientId) => {
        set((state) => ({
          purchases: state.purchases.filter((p) => p.clientId !== clientId),
        }));
      },
    }),
    {
      name: 'peyman-purchase-store', // نام دیتابیس در LocalStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);