import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  X, Package, Layers, Image as ImageIcon, Trash2, 
  Plus, Check, Sparkles, MapPin, Barcode, Scale, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

import { 
  useInventoryStore, 
  type InventoryItem, 
  INVENTORY_CATEGORIES 
} from '../../../store/inventoryStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { PortalSelect } from '../../../components/ui/SharedLaborUI';

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: InventoryItem | null;
  onSaved?: (itemId: string) => void;
}

const safeNum = (val: unknown): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/,/g, '')
    .replace(/[^0-9.-]+/g, '');
  const parsed = Number(clean);
  return isNaN(parsed) ? 0 : parsed;
};

const formatNumber = (num: number): string => {
  if (!num || isNaN(num)) return '';
  return num.toLocaleString('fa-IR');
};

const PRIMARY_UNIT_OPTIONS = [
  { value: 'کیسه', label: 'کیسه / پاکت' },
  { value: 'شاخه', label: 'شاخه' },
  { value: 'تن', label: 'تن' },
  { value: 'کیلوگرم', label: 'کیلوگرم' },
  { value: 'متر', label: 'متر طول' },
  { value: 'مترمربع', label: 'مترمربع' },
  { value: 'مترمکعب', label: 'مترمکعب' },
  { value: 'عدد', label: 'عدد' },
  { value: 'قالب', label: 'قالب' },
  { value: 'بسته', label: 'بسته' },
  { value: 'رول', label: 'رول' },
  { value: 'لیتر', label: 'لیتر' },
];

const SECONDARY_UNIT_SUGGESTIONS = [
  { value: 'پالت', label: 'پالت' },
  { value: 'بندیل', label: 'بندیل' },
  { value: 'خاور', label: 'خاور' },
  { value: 'کمپرسی', label: 'کمپرسی' },
  { value: 'تریلی', label: 'تریلی' },
  { value: 'کارتن', label: 'کارتن' },
  { value: 'بسته', label: 'بسته' },
];

export default function InventoryItemModal({
  isOpen,
  onClose,
  itemToEdit,
  onSaved
}: InventoryItemModalProps) {
  const { addItem, updateItem } = useInventoryStore();
  const { currency } = useSettingsStore(state => state.settings);
  const isRial = currency === 'rial' || (currency as any) === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';

  // استیت‌های فرم کالا
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('cement_mortar');
  const [location, setLocation] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // واحدهای دوگانه
  const [primaryUnit, setPrimaryUnit] = useState('کیسه');
  const [hasSecondaryUnit, setHasSecondaryUnit] = useState(false);
  const [secondaryUnit, setSecondaryUnit] = useState('پالت');
  const [conversionRatio, setConversionRatio] = useState<string>('40');

  // مقادیر اولیه و قیمت‌ها
  const [currentStock, setCurrentStock] = useState<string>('0');
  const [minStockLevel, setMinStockLevel] = useState<string>('10');
  const [averageUnitCost, setAverageUnitCost] = useState<string>('');
  const [defaultBilledPrice, setDefaultBilledPrice] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // هماهنگ‌سازی هنگام ویرایش
  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setCode(itemToEdit.code);
      setCategory(itemToEdit.category || 'cement_mortar');
      setLocation(itemToEdit.location || '');
      setImageBase64(itemToEdit.image || null);
      setPrimaryUnit(itemToEdit.primaryUnit || itemToEdit.unit || 'عدد');
      if (itemToEdit.secondaryUnit) {
        setHasSecondaryUnit(true);
        setSecondaryUnit(itemToEdit.secondaryUnit);
        setConversionRatio(String(itemToEdit.conversionRatio || 1));
      } else {
        setHasSecondaryUnit(false);
        setSecondaryUnit('پالت');
        setConversionRatio('40');
      }
      setCurrentStock(String(itemToEdit.currentStock || 0));
      setMinStockLevel(String(itemToEdit.minStockLevel || 10));
      setAverageUnitCost(formatNumber(itemToEdit.averageUnitCost || itemToEdit.costPrice || 0));
      setDefaultBilledPrice(formatNumber(itemToEdit.defaultBilledPrice || 0));
    } else {
      setName('');
      setCode(`INV-${Math.floor(100 + Math.random() * 900)}`);
      setCategory('cement_mortar');
      setLocation('');
      setImageBase64(null);
      setPrimaryUnit('کیسه');
      setHasSecondaryUnit(false);
      setSecondaryUnit('پالت');
      setConversionRatio('40');
      setCurrentStock('0');
      setMinStockLevel('10');
      setAverageUnitCost('');
      setDefaultBilledPrice('');
    }
  }, [itemToEdit, isOpen]);

  // دسته‌بندی‌ها برای PortalSelect
  const categoryOptions = useMemo(() => {
    return Object.values(INVENTORY_CATEGORIES).map(cat => ({
      value: cat.id,
      label: cat.title,
      subLabel: cat.shortTitle
    }));
  }, []);

  // هندلر آپلود تصویر
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error('حجم تصویر کالا نباید بیشتر از ۳ مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
      toast.success('تصویر کالا ضمیمه شد.');
    };
    reader.readAsDataURL(file);
  };

  // ذخیره فرم
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('لطفاً نام مصالح / کالا را وارد کنید.');
      return;
    }

    const payload = {
      name: name.trim(),
      code: code.trim() || `INV-${Date.now().toString().slice(-4)}`,
      category,
      location: location.trim() || undefined,
      image: imageBase64 || undefined,
      primaryUnit,
      secondaryUnit: hasSecondaryUnit ? secondaryUnit.trim() : undefined,
      conversionRatio: hasSecondaryUnit ? safeNum(conversionRatio) || 1 : undefined,
      currentStock: safeNum(currentStock),
      minStockLevel: safeNum(minStockLevel) || 10,
      averageUnitCost: safeNum(averageUnitCost),
      defaultBilledPrice: safeNum(defaultBilledPrice) || undefined,
      isPinned: itemToEdit?.isPinned || false
    };

    let savedId = itemToEdit?.id;
    if (itemToEdit) {
      updateItem(itemToEdit.id, payload);
      toast.success('مشخصات کالا در انبار به‌روزرسانی شد.');
    } else {
      savedId = addItem(payload);
      toast.success('کالای جدید با موفقیت در انبار مرکزی تعریف شد.');
    }

    onSaved?.(savedId || '');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md overflow-y-auto modal-scrollbar">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* هدر */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {itemToEdit ? 'ویرایش کالای انبار' : 'تعریف کالای جدید در انبار مرکزی'}
              </h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                تعریف مشخصات فنی، واحدهای دوگانه سنجش، ضریب تبدیل و نقطه سفارش
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* فرم */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto modal-scrollbar">
          
          {/* بخش ۱: نام، کد و عکس */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
            {/* تصویر کالا */}
            <div className="relative group shrink-0">
              {imageBase64 ? (
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-700 shadow-md relative">
                  <img src={imageBase64} alt="پیش‌نمایش" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageBase64(null)}
                    className="absolute inset-0 bg-rose-950/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-500 transition-all cursor-pointer"
                >
                  <ImageIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold">عکس کالا</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 w-full space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  نام کامل کالا / مصالح *
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="مثال: سیمان تیپ ۲ فیروزکوه، میلگرد ۱۶ نیشابور..."
                  className="w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5" /> کد / بارکد کالا
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="INV-101"
                    className="w-full h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-xs outline-none focus:border-emerald-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> محل نگهداری / قفسه
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="سوله A، دپوی شماره ۲..."
                    className="w-full h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* بخش ۲: رسته و صنف کالا */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              دسته‌بندی و صنف تخصصی کالا *
            </label>
            <PortalSelect
              options={categoryOptions}
              value={category}
              onChange={setCategory}
              placeholder="انتخاب دسته‌بندی..."
            />
          </div>

          {/* بخش ۳: موتور واحدهای دوگانه و ضریب تبدیل (Dual Unit & Conversion Ratio) */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-500" />
                واحدهای سنجش و موتور تبدیل واحد دوگانه
              </span>
              <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSecondaryUnit}
                  onChange={e => setHasSecondaryUnit(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                دارای واحد فرعی / بسته‌بندی
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  واحد پایه (شمارش اصلی انبار) *
                </label>
                <PortalSelect
                  options={PRIMARY_UNIT_OPTIONS}
                  value={primaryUnit}
                  onChange={setPrimaryUnit}
                  placeholder="واحد پایه..."
                />
              </div>

              {hasSecondaryUnit && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      واحد فرعی / بارگیری
                    </label>
                    <PortalSelect
                      options={SECONDARY_UNIT_SUGGESTIONS}
                      value={secondaryUnit}
                      onChange={setSecondaryUnit}
                      placeholder="واحد فرعی..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      ضریب تبدیل (تعداد {primaryUnit} در ۱ {secondaryUnit})
                    </label>
                    <input
                      type="number"
                      autoComplete="off"
                      value={conversionRatio}
                      onChange={e => setConversionRatio(e.target.value)}
                      placeholder="۴۰"
                      className="w-full h-[46px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-sm outline-none text-center"
                      dir="ltr"
                    />
                  </div>
                </>
              )}
            </div>

            {hasSecondaryUnit && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-500" />
                فرمول تبدیل: هر ۱ {secondaryUnit} معادل {safeNum(conversionRatio)} {primaryUnit} محاسبه و ذخیره می‌شود.
              </div>
            )}
          </div>

          {/* بخش ۴: موجودی اولیه و قیمت‌ها */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                موجودی اولیه به {primaryUnit}:
              </label>
              <input
                type="number"
                autoComplete="off"
                value={currentStock}
                onChange={e => setCurrentStock(e.target.value)}
                className="w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-sm outline-none text-center"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                حداقل موجودی (نقطه سفارش هشدار):
              </label>
              <input
                type="number"
                autoComplete="off"
                value={minStockLevel}
                onChange={e => setMinStockLevel(e.target.value)}
                className="w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-sm outline-none text-center"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                بهای تمام‌شده هر {primaryUnit} ({currencyLabel}):
              </label>
              <input
                type="text"
                autoComplete="off"
                value={averageUnitCost}
                onChange={e => setAverageUnitCost(formatNumber(safeNum(e.target.value)))}
                placeholder="۰"
                className="w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-xs outline-none text-left"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                فی پیش‌فرض اعلامی به کارفرما ({currencyLabel}):
              </label>
              <input
                type="text"
                autoComplete="off"
                value={defaultBilledPrice}
                onChange={e => setDefaultBilledPrice(formatNumber(safeNum(e.target.value)))}
                placeholder="۰"
                className="w-full h-[44px] px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-xs outline-none text-left"
                dir="ltr"
              />
            </div>
          </div>

          {/* فوتر */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {itemToEdit ? 'به‌روزرسانی کالا' : 'ذخیره در انبار'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}
