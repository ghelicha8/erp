import { useSettingsStore } from '../../store/settingsStore';

/**
 * تابع کمکی سراسری تبدیل و فرمت واحد پول بر اساس تنظیمات سیستم
 * دیتای پایه در دیتابیس همیشه به «تومان» ذخیره می‌شود.
 * هنگام نمایش در UI، در صورت انتخاب «ریال»، مبلغ در ۱۰ ضرب شده و پسوند «ریال» درج می‌شود.
 */
export const formatCurrency = (
  amount: number | string | undefined | null,
  options?: { includeUnit?: boolean; customUnit?: string }
): string => {
  if (amount === undefined || amount === null || amount === '') {
    const isRial = (useSettingsStore.getState().settings?.currency ?? (useSettingsStore.getState() as any).currency) === 'rial';
    const unit = isRial ? 'ریال' : 'تومان';
    return options?.includeUnit === false ? '۰' : `۰ ${options?.customUnit || unit}`;
  }

  const cleanVal = typeof amount === 'number'
    ? amount
    : Number(
        String(amount)
          .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
          .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
          .replace(/,/g, '')
          .replace(/[^\d.-]/g, '')
      ) || 0;

  const state = useSettingsStore.getState();
  const currency = state.settings?.currency ?? (state as any).currency ?? 'toman';
  const isRial = currency === 'rial';
  const finalAmount = isRial ? cleanVal * 10 : cleanVal;
  const unit = isRial ? 'ریال' : 'تومان';

  const formatted = Math.round(finalAmount).toLocaleString('fa-IR');
  if (options?.includeUnit === false) {
    return formatted;
  }
  return `${formatted} ${options?.customUnit || unit}`;
};

export const getCurrencyUnit = (): 'ریال' | 'تومان' => {
  const state = useSettingsStore.getState();
  const currency = state.settings?.currency ?? (state as any).currency ?? 'toman';
  return currency === 'rial' ? 'ریال' : 'تومان';
};

export const getCurrencyMultiplier = (): number => {
  const state = useSettingsStore.getState();
  const currency = state.settings?.currency ?? (state as any).currency ?? 'toman';
  return currency === 'rial' ? 10 : 1;
};

/**
 * هوک ری‌اکتیو برای کامپوننت‌هایی که باید با تغییر سوییچ تنظیمات بلادرنگ ری‌رندر شوند
 */
export const useCurrency = () => {
  const currency = useSettingsStore(state => state.settings?.currency ?? (state as any).currency ?? 'toman');
  const isRial = currency === 'rial';
  const unit = isRial ? 'ریال' : 'تومان';
  const multiplier = isRial ? 10 : 1;

  const format = (amount: number | string | undefined | null, includeUnit = true) => {
    return formatCurrency(amount, { includeUnit });
  };

  return { currency, isRial, unit, multiplier, format };
};
