import { useState, useCallback } from 'react';

/**
 * هوک اختصاصی برای مدیریت عملیات گروهی (Bulk Actions) در جداول
 * این هوک به هیچ فایل UI وابستگی ندارد و در تمام سیستم قابل استفاده است.
 */
export function useBulkSelection() {
  // وضعیت نگهداری آیدی‌های انتخاب شده
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // تغییر وضعیت انتخاب یک ردیف خاص (تیک زدن یا برداشتن تیک)
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) 
        ? prev.filter((item) => item !== id) // اگر بود، حذف کن
        : [...prev, id]                      // اگر نبود، اضافه کن
    );
  }, []);

  // انتخاب تمام ردیف‌ها (با رفتار هوشمند: اگر همه از قبل انتخاب شده باشند، لیست را خالی می‌کند)
  const selectAll = useCallback((allIds: string[]) => {
    setSelectedIds((prev) => {
      // بررسی اینکه آیا تمام آیدی‌های پاس داده شده، هم‌اکنون در استیت وجود دارند؟
      const areAllSelected = allIds.length > 0 && allIds.every(id => prev.includes(id));
      
      if (areAllSelected) {
        // اگر همه انتخاب شده‌اند، پس تیک هدر باید همه را لغو کند
        return [];
      }
      // در غیر این صورت، همه آیدی‌های پاس داده شده را به استیت اضافه کن
      return [...allIds];
    });
  }, []);

  // پاک‌سازی کامل استیت (لغو انتخاب تمام موارد - مناسب برای بعد از حذف گروهی)
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // بررسی اینکه آیا یک آیدی خاص انتخاب شده است یا خیر (خروجی Boolean)
  const isSelected = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  // بررسی اینکه آیا تمام آیدی‌های فعلی انتخاب شده‌اند یا خیر (مناسب برای تیک خوردن چک‌باکس اصلی هدر)
  const isAllSelected = useCallback((allIds: string[]) => {
    return allIds.length > 0 && allIds.every(id => selectedIds.includes(id));
  }, [selectedIds]);

  // برگرداندن متغیرها و توابع برای استفاده در کامپوننت‌ها
  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected
  };
}