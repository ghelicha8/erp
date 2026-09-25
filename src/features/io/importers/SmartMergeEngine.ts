// استراتژی‌های ورود اطلاعات
export type ImportStrategy = 'SMART_MERGE' | 'OVERWRITE' | 'WIPE_INSERT';

export interface MergeConfig {
  strategy: ImportStrategy;
  uniqueKey: string; // کلیدی که بر اساس آن تکراری بودن را می‌سنجیم (مثلاً شماره موبایل یا کد ملی یا اسم کالا)
  mapping: Record<string, string>; // مپینگ ستون‌های اکسل به فیلدهای دیتابیس. مثال: { 'نام مشتری': 'clientName' }
}

export class SmartMergeEngine {
  /**
   * مرحله اول: تبدیل ستون‌های فارسی/نامنظم اکسل به کلیدهای استاندارد دیتابیس
   */
  static mapData(rawData: any[], mapping: Record<string, string>): any[] {
    return rawData.map(row => {
      const mappedRow: any = { id: crypto.randomUUID() }; // تولید آیدی جدید به صورت پیش‌فرض
      
      for (const [excelHeader, dbField] of Object.entries(mapping)) {
        if (row[excelHeader] !== undefined) {
          mappedRow[dbField] = row[excelHeader];
        }
      }
      
      // 💡 در اینجا قوانین تبدیل واحد (Unit Conversions) اعمال می‌شود
      // مثال: اگر واردات سیمان تنی بود، به پاکتی تبدیل کن (طبق معماری DigiMatin)
      if (mappedRow.unit === 'تن' && mappedRow.category === 'مصالح') {
         mappedRow.unit = 'پاکت';
         mappedRow.quantity = Number(mappedRow.quantity) * 20; // هر تن ۲۰ پاکت ۵۰ کیلویی
      }
      
      return mappedRow;
    });
  }

  /**
   * مرحله دوم: اعمال استراتژی ادغام با داده‌های موجود در دیتابیس
   */
  static applyStrategy(existingData: any[], newData: any[], config: MergeConfig): any[] {
    const { strategy, uniqueKey } = config;

    switch (strategy) {
      case 'WIPE_INSERT':
        // پاکسازی کامل دیتای قبلی و جایگزینی با دیتای جدید
        return [...newData];

      case 'OVERWRITE':
        // اگر دیتای تکراری پیدا شد، دیتای جدید جایگزین می‌شود
        const overwrittenData = [...existingData];
        newData.forEach(newItem => {
          const index = overwrittenData.findIndex(item => item[uniqueKey] === newItem[uniqueKey]);
          if (index !== -1) {
            overwrittenData[index] = { ...overwrittenData[index], ...newItem }; // آپدیت کامل
          } else {
            overwrittenData.push(newItem); // اضافه کردن آیتم جدید
          }
        });
        return overwrittenData;

      case 'SMART_MERGE':
      default:
        // 🧠 ادغام هوشمند: فقط فیلدهای خالی پر می‌شوند و دیتای قبلی دست نمی‌خورد
        const mergedData = [...existingData];
        newData.forEach(newItem => {
          const index = mergedData.findIndex(item => item[uniqueKey] === newItem[uniqueKey]);
          if (index !== -1) {
            // پروفایل وجود دارد. فقط فیلدهایی که در دیتابیس ما خالی هستند را از اکسل پر کن
            const existingItem = mergedData[index];
            const updatedItem = { ...existingItem };
            for (const key in newItem) {
              if (!existingItem[key] || existingItem[key] === '') {
                updatedItem[key] = newItem[key];
              }
            }
            mergedData[index] = updatedItem;
          } else {
            // پروفایل جدید است، کلاً اضافه کن
            mergedData.push(newItem);
          }
        });
        return mergedData;
    }
  }
}