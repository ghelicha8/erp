import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppSettings {
  companyName: string;
  address: string;
  phones: string[];
  
  // اطلاعات حقوقی و بانکی
  nationalId: string; // شناسه ملی
  registrationNumber: string; // شماره ثبت
  shebaNumber: string; // شماره شبا بانکی (IR)
  
  // واحد پول رسمی سیستم
  currency: 'toman' | 'rial';

  // شبکه‌های اجتماعی
  instagram: string;
  telegram: string;
  website: string;
  
  // تصاویر (به صورت Base64 ذخیره می‌شوند تا ۱۰۰٪ آفلاین کار کنند)
  logoUrl: string;
  signatureUrl: string;
  
  // درصدهای پیش‌فرض قانونی
  defaultTaxRate: number;
  defaultRetentionRate: number;
  defaultInsuranceRate: number;

  // روش ارزش‌گذاری و خروج انبار مرکزی (FIFO / LIFO / WEIGHTED_AVERAGE)
  valuationMethod: 'FIFO' | 'LIFO' | 'WEIGHTED_AVERAGE';
  exitPriority: 'STANDARD' | 'FEFO'; // FEFO: اولویت با خروج تاریخ انقضای نزدیک‌تر

  // جلوه‌های بصری و انیمیشن‌ها
  enableEnvelopeAnimation: boolean;
  enableThemeTransitions: boolean;
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
  nationalId: '',
  registrationNumber: '',
  shebaNumber: '',
  currency: 'toman',
  instagram: '',
  telegram: '',
  website: '',
  logoUrl: '',
  signatureUrl: '',
  defaultTaxRate: 9, // ۹٪ مالیات
  defaultRetentionRate: 10, // ۱۰٪ حسن انجام کار
  defaultInsuranceRate: 5, // ۵٪ بیمه
  valuationMethod: 'WEIGHTED_AVERAGE', // میانگین موزون به صورت پیش‌فرض
  exitPriority: 'FEFO', // خروج به ترتیب نزدیک‌ترین تاریخ انقضا
  enableEnvelopeAnimation: true,
  enableThemeTransitions: true,
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

/**
 * تابع کمکی برای فرمت مبالغ بر اساس واحد پول انتخاب شده در تنظیمات
 * اگر ریال انتخاب شده باشد، عدد در ۱۰ ضرب شده و برچسب ریال اضافه می‌شود.
 */
export const formatCurrency = (
  amount: number | string | undefined | null,
  currency?: 'toman' | 'rial',
  includeSuffix: boolean = true
): string => {
  const currentCurrency = currency || useSettingsStore.getState().settings?.currency || 'toman';
  const raw = typeof amount === 'number' ? amount : Number(String(amount || 0).replace(/[^\d.-]/g, '')) || 0;
  const converted = currentCurrency === 'rial' ? raw * 10 : raw;
  const formatted = Math.round(converted).toLocaleString('fa-IR');
  if (!includeSuffix) return formatted;
  return `${formatted} ${currentCurrency === 'rial' ? 'ریال' : 'تومان'}`;
};