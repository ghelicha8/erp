import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MaterialItem {
  id: string;
  name: string;
  unit: string;        // واحد اندازه‌گیری (مثلاً پاکت، شاخه، تن)
  currentStock: number; // موجودی فعلی
  costPrice: number;    // قیمت تمام‌شده/خرید برای خود پیمانکار (مخفی از کارفرما)
}

interface InventoryState {
  materials: MaterialItem[];
  addMaterial: (material: Omit<MaterialItem, 'id'>) => void;
  updateMaterial: (id: string, data: Partial<MaterialItem>) => void;
  deleteMaterial: (id: string) => void;
  
  // توابع ویژه مدیریت موجودی
  addStock: (id: string, amount: number) => void;
  deductStock: (id: string, amount: number) => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      materials: [
        // چند دیتای نمونه برای تست اولیه
        { id: 'mat-1', name: 'سیمان تیپ ۲', unit: 'پاکت', currentStock: 500, costPrice: 65000 },
        { id: 'mat-2', name: 'میلگرد ۱۶', unit: 'شاخه', currentStock: 120, costPrice: 3200000 },
      ],
      
      addMaterial: (material) => set((state) => ({
        materials: [...state.materials, { ...material, id: crypto.randomUUID() }]
      })),
      
      updateMaterial: (id, data) => set((state) => ({
        materials: state.materials.map(m => m.id === id ? { ...m, ...data } : m)
      })),
      
      deleteMaterial: (id) => set((state) => ({
        materials: state.materials.filter(m => m.id !== id)
      })),

      addStock: (id, amount) => set((state) => ({
        materials: state.materials.map(m => {
          if (m.id === id) {
            return { ...m, currentStock: m.currentStock + amount };
          }
          return m;
        })
      })),

      deductStock: (id, amount) => set((state) => ({
        materials: state.materials.map(m => {
          if (m.id === id) {
            // جلوگیری از موجودی منفی
            const newStock = Math.max(0, m.currentStock - amount);
            return { ...m, currentStock: newStock };
          }
          return m;
        })
      })),
    }),
    { name: 'inventory-storage' }
  )
);