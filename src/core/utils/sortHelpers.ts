// ============================================================================
// 🔽 قرارداد سراسری مرتب‌سازی لیست‌های تاریخ‌دار (جدیدترین بالا)
// قانون: ۱) تاریخ نزدیک‌تر به امروز بالاتر ۲) تاریخ مساوی → ثبت جدیدتر بالاتر
// تاریخ‌ها رشته شمسی صفرپدشده (jYYYY/jMM/jDD) هستند پس مقایسه رشته‌ای معتبر است.
// new Date() فقط برای تاریخ‌های میلادی/ISO اثر دارد و برای شمسی NaN می‌دهد.
// ============================================================================

/** جهت درج رکورد جدید در استور: آخر آرایه (append) یا اول آرایه (prepend) */
export type StoreOrder = 'append' | 'prepend';

export interface SortableRecord {
  date: string;
  /** زمان ثبت (ISO) — برای رکوردهای قدیمی که ندارند، ترتیب ایندکس مبناست */
  createdAt?: string | number;
}

/**
 * مرتب‌سازی نزولی بر اساس تاریخ + شکست مساوی به نفع «ثبت جدیدتر».
 * ورودی را تغییر نمی‌دهد (کپی برمی‌گرداند).
 */
export function sortNewestFirst<T extends SortableRecord>(
  list: readonly T[],
  order: StoreOrder = 'append'
): T[] {
  return [...list]
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      // ۱) تاریخ (میلادی/ISO اگر قابل پارس باشد)
      const timeDiff =
        new Date(b.item.date).getTime() - new Date(a.item.date).getTime();
      if (timeDiff) return timeDiff; // NaN و صفر عبور می‌کنند

      // ۲) تاریخ شمسی رشته‌ای (نزولی)
      const dateStrDiff = (b.item.date || '').localeCompare(a.item.date || '');
      if (dateStrDiff !== 0) return dateStrDiff;

      // ۳) زمان ثبت جدیدتر بالاتر (رکورد بدون createdAt قدیمی فرض می‌شود)
      const createdA = a.item.createdAt ?? '';
      const createdB = b.item.createdAt ?? '';
      if (createdA !== createdB) {
        return String(createdB).localeCompare(String(createdA));
      }

      // ۴)Fallback قطعی: ترتیب درج در استور (ثبت جدیدتر بالاتر)
      return order === 'append' ? b.idx - a.idx : a.idx - b.idx;
    })
    .map((x) => x.item);
}
