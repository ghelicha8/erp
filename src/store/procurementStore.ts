import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usePurchaseStore } from './purchaseStore';

// ---------------------------------------------------------
// بخش‌های هفت‌گانه خرید و تدارکات (طرف‌های بیرونی)
// ---------------------------------------------------------
export type VendorSection =
  | 'FACTORIES'     // کارخانه‌جات، تولیدی‌ها، شرکت‌ها و کارگاه‌ها
  | 'MATERIALS'     // مغازه‌ها و مصالح‌فروشی‌ها
  | 'LOGISTICS'     // لجستیک بیرونی (خودروهای غیرخودی)
  | 'MINES'         // معادن
  | 'INSTALLERS'    // تاسیساتی‌ها
  | 'REPAIR_SHOPS'  // تعمیرگاه‌ها
  | 'MISC';         // سایر

export interface Vendor {
  id: string;
  section: VendorSection;
  name: string;
  phones: string[];
  photo?: string;
  address: string;
  // --- مخصوص لجستیک بیرونی ---
  plate?: string;
  vehicleType?: string;
  driverName?: string;
  ownerName?: string;
  linkType?: 'FREE' | 'VENDOR'; // آزاد یا وابسته به یک پروفایل دیگر
  linkedSection?: VendorSection;
  linkedVendorId?: string;
  // --- مخصوص معادن ---
  mineType?: string;
  isPinned: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

interface ProcurementState {
  vendors: Vendor[];
  addVendor: (vendor: Omit<Vendor, 'id' | 'createdAt'>) => void;
  updateVendor: (id: string, data: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;
  toggleVendorPin: (id: string) => void;
}

export const useProcurementStore = create<ProcurementState>()(
  persist(
    (set, get) => ({
      vendors: [],

      addVendor: (vendor) => set((state) => ({
        vendors: [{ ...vendor, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...state.vendors]
      })),
      updateVendor: (id, data) => {
        // 🕸️ لینک عنکبوتی: تغییر نام تامین‌کننده روی خریدهایش اعمال می‌شود تا از پروفایل گم نشوند
        const prev = get().vendors.find(v => v.id === id);
        if (prev && data.name && data.name.trim() !== prev.name) {
          const ps = usePurchaseStore.getState();
          ps.purchases
            .filter(x => x.vendor === prev.name)
            .forEach(x => ps.updatePurchase(x.id, { vendor: data.name!.trim() }));
        }
        set((state) => ({
          vendors: state.vendors.map(v => v.id === id ? { ...v, ...data } : v)
        }));
      },
      deleteVendor: (id) => set((state) => ({
        vendors: state.vendors.filter(v => v.id !== id)
      })),
      toggleVendorPin: (id) => set((state) => ({
        vendors: state.vendors.map(v => v.id === id ? { ...v, isPinned: !v.isPinned } : v)
      })),
    }),
    { name: 'procurement-storage' }
  )
);
