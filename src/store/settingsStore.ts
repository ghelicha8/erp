import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppSettings {
  companyName: string;
  address: string;
  phones: string[];
  
  // شبکه‌های اجتماعی
  instagram: string;
  telegram: string;
  website: string;
  
  // تصاویر (به صورت Base64 ذخیره می‌شوند تا ۱۰۰٪ آفلاین کار کنند)
  logoUrl: string;
  signatureUrl: string;
  
  // درصدهای پیش‌فرض قانونی
  currency: 'TOMAN' | 'RIAL';
  defaultTaxRate: number;
  defaultRetentionRate: number;
  defaultInsuranceRate: number;
}

interface SettingsState {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  updatePhone: (index: number, phone: string) => void;
}

const defaultSettings: AppSettings = {
  companyName: 'شرکت مهندسی و پیمانکاری',
  address: '',
  phones: ['', '', '', ''], // حداکثر 4 شماره
  instagram: '',
  telegram: '',
  website: '',
  logoUrl: '',
  signatureUrl: '',
  currency: 'TOMAN',
  defaultTaxRate: 9, // ۹٪ مالیات
  defaultRetentionRate: 10, // ۱۰٪ حسن انجام کار
  defaultInsuranceRate: 5, // ۵٪ بیمه
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      
      updatePhone: (index, phone) => set((state) => {
        const newPhones = [...state.settings.phones];
        newPhones[index] = phone;
        return { settings: { ...state.settings, phones: newPhones } };
      }),
    }),
    {
      name: 'peyman-settings-storage',
    }
  )
);