import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Store, User, Phone, MapPin, CreditCard, 
  Star, CheckCircle, Sparkles, FileText,
  Boxes, Mountain, Factory, Hammer, Wrench, Truck,
  Upload, Trash2, Camera, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  useProcurementStore, 
  type Supplier, 
  type SupplierCategory, 
  SUPPLIER_CATEGORIES,
  normalizeSupplierCategory
} from '../../../store/procurementStore';
import { useSettingsStore } from '../../../store/settingsStore';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit?: Supplier | null;
  defaultCategory?: SupplierCategory;
  onSuccess?: (supplier: Supplier) => void;
}

const CATEGORY_ITEMS: Array<{
  id: SupplierCategory;
  title: string;
  shortTitle: string;
  icon: React.ElementType;
  color: string;
  bgLight: string;
  borderColor: string;
}> = [
  {
    id: 'materialShop',
    title: 'فروشگاه مصالح و بنکداران',
    shortTitle: 'مصالح و بنکداری',
    icon: Boxes,
    color: '#3b82f6',
    bgLight: 'bg-blue-500/10 dark:bg-blue-500/20',
    borderColor: 'border-blue-500'
  },
  {
    id: 'mine',
    title: 'معادن (شن، ماسه، سنگ، پوکه)',
    shortTitle: 'معادن و دانه‌بندی',
    icon: Mountain,
    color: '#84cc16',
    bgLight: 'bg-lime-500/10 dark:bg-lime-500/20',
    borderColor: 'border-lime-500'
  },
  {
    id: 'ironMarket',
    title: 'آهن‌فروشی و مقاطع فولادی',
    shortTitle: 'آهن و مقاطع فولادی',
    icon: Factory,
    color: '#f97316',
    bgLight: 'bg-orange-500/10 dark:bg-orange-500/20',
    borderColor: 'border-orange-500'
  },
  {
    id: 'hardwareStore',
    title: 'ابزارفروشی، الکتریکی و تاسیسات',
    shortTitle: 'ابزار، برق و تاسیسات',
    icon: Hammer,
    color: '#8b5cf6',
    bgLight: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderColor: 'border-purple-500'
  },
  {
    id: 'repairShop',
    title: 'تعمیرگاه، تراشکاری و خدمات فنی',
    shortTitle: 'تعمیرگاه و تراشکاری',
    icon: Wrench,
    color: '#f59e0b',
    bgLight: 'bg-amber-500/10 dark:bg-amber-500/20',
    borderColor: 'border-amber-500'
  },
  {
    id: 'externalLogistics',
    title: 'لجستیک و باربری متفرقه / خارجی',
    shortTitle: 'باربری و رانندگان آزاد',
    icon: Truck,
    color: '#10b981',
    bgLight: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    borderColor: 'border-emerald-500'
  }
];

export default function SupplierModal({ 
  isOpen, 
  onClose, 
  supplierToEdit,
  defaultCategory,
  onSuccess 
}: SupplierModalProps) {
  const { addSupplier, updateSupplier } = useProcurementStore();
  const { currency } = useSettingsStore(state => state.settings);
  const isRial = currency === 'rial' || (currency as any) === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';

  const fileInputRef = useRef<HTMLInputElement>(null);

  // استیت‌های فرم بدون کامپوننت داخلی جهت حل قطعی باگ تایپ تک‌رقمی
  const [name, setName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [category, setCategory] = useState<SupplierCategory>('materialShop');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [logo, setLogo] = useState<string | undefined>(undefined);
  
  const [bankName, setBankName] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [shabaNumber, setShabaNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  
  const [initialBalance, setInitialBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name || '');
      setManagerName(supplierToEdit.managerName || '');
      setCategory(normalizeSupplierCategory(supplierToEdit.category));
      setPhone(supplierToEdit.phone || '');
      setPhone2(supplierToEdit.phone2 || '');
      setAddress(supplierToEdit.address || '');
      setCity(supplierToEdit.city || '');
      setLogo(supplierToEdit.logo || undefined);
      
      setBankName(supplierToEdit.bankAccount?.bankName || '');
      setCardHolder(supplierToEdit.bankAccount?.cardHolder || '');
      setShabaNumber(supplierToEdit.bankAccount?.shabaNumber || '');
      setAccountNumber(supplierToEdit.bankAccount?.accountNumber || '');
      
      setInitialBalance(supplierToEdit.initialBalance ? String(supplierToEdit.initialBalance) : '');
      setCreditLimit(supplierToEdit.creditLimit ? String(supplierToEdit.creditLimit) : '');
      setRating(supplierToEdit.rating || 5);
      setNotes(supplierToEdit.notes || '');
    } else {
      setName('');
      setManagerName('');
      setCategory(defaultCategory ? normalizeSupplierCategory(defaultCategory) : 'materialShop');
      setPhone('');
      setPhone2('');
      setAddress('');
      setCity('');
      setLogo(undefined);
      
      setBankName('');
      setCardHolder('');
      setShabaNumber('');
      setAccountNumber('');
      
      setInitialBalance('');
      setCreditLimit('');
      setRating(5);
      setNotes('');
    }
    setErrors({});
  }, [supplierToEdit, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('لطفاً یک فایل تصویری معتبر انتخاب کنید.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogo(base64);
      toast.success('تصویر با موفقیت بارگذاری شد.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setLogo(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info('تصویر حذف شد.');
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'نام فروشگاه، کارگاه، معدن یا راننده الزامی است';
    if (!phone.trim()) newErrors.phone = 'شماره تماس الزامی است';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const cleanInitial = Number(initialBalance.replace(/[^0-9.-]/g, '')) || 0;
    const cleanCredit = Number(creditLimit.replace(/[^0-9.-]/g, '')) || undefined;

    const payload = {
      name: name.trim(),
      managerName: managerName.trim() || undefined,
      category,
      phone: phone.trim(),
      phone2: phone2.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      logo,
      bankAccount: (bankName || cardHolder || shabaNumber || accountNumber) ? {
        bankName: bankName.trim() || undefined,
        cardHolder: cardHolder.trim() || undefined,
        shabaNumber: shabaNumber.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
      } : undefined,
      initialBalance: cleanInitial,
      creditLimit: cleanCredit,
      rating,
      notes: notes.trim() || undefined,
    };

    if (supplierToEdit) {
      updateSupplier(supplierToEdit.id, payload);
      toast.success(`اطلاعات تأمین‌کننده «${payload.name}» به‌روزرسانی شد.`);
      onSuccess?.({ ...supplierToEdit, ...payload });
    } else {
      const newSupp = addSupplier(payload);
      toast.success(`تأمین‌کننده «${payload.name}» با موفقیت در سیستم ثبت شد.`);
      onSuccess?.(newSupp);
    }

    onClose();
  };

  // کمکی برای فرمت سه‌رقمی بدون ایجاد تداخل هنگام تایپ
  const formatCommaSeparated = (val: string) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    return clean ? Number(clean).toLocaleString('fa-IR') : '';
  };

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6" dir="rtl">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }} 
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 backdrop-blur-3xl border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-hidden"
      >
        {/* هدر مودال */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {supplierToEdit ? 'ویرایش مشخصات تأمین‌کننده / راننده' : 'ثبت تأمین‌کننده یا راننده جدید'}
              </h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                تخصیص به دسته‌بندی ۶‌گانه، تصویر، اطلاعات تماس و رتبه کیفیت
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-500 rounded-xl transition-all cursor-pointer text-slate-500 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* بدنه فرم */}
        <form onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-y-auto modal-scrollbar p-6 space-y-6">
          
          {/* انتخاب دسته‌بندی ۶‌گانه تخصصی */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> دسته‌بندی تدارکات و لجستیک *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CATEGORY_ITEMS.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? `${cat.bgLight} ${cat.borderColor} ring-2 ring-indigo-500/20 shadow-md`
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                        {cat.shortTitle}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                        {cat.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* بخش تصویر/لوگو یا کارت ویزیت + نام و مدیریت */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
            
            {/* بارگذاری تصویر */}
            <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700/80 text-center">
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden" 
              />
              
              {logo ? (
                <div className="relative group w-24 h-24 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-md">
                  <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 bg-white text-slate-800 rounded-lg shadow hover:bg-slate-100 cursor-pointer"
                      title="تعویض تصویر"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1.5 bg-rose-500 text-white rounded-lg shadow hover:bg-rose-600 cursor-pointer"
                      title="حذف تصویر"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors shadow-inner"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-[10px] font-bold">لوگو / عکس</span>
                </div>
              )}
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2">
                تصویر واحد، کارت ویزیت یا راننده
              </span>
            </div>

            {/* نام و مدیر */}
            <div className="sm:col-span-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-indigo-500" /> 
                  {category === 'externalLogistics' ? 'نام راننده یا باربری متفرقه *' : 'نام فروشگاه، کارگاه، معدن یا بنگاه *'}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={category === 'externalLogistics' ? 'مثلاً: آقا رضا کریمی (کامیون ده‌چرخ)' : 'مثلاً: بنکداری آهن و فولاد پایتخت'}
                  className={`w-full h-11 px-4 bg-slate-50 dark:bg-slate-900/90 border rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-all ${
                    errors.name ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {errors.name && <span className="text-[10px] font-bold text-rose-500">{errors.name}</span>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-500" /> نام مدیر، مسئول فروش یا شماره پلاک راننده
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={managerName}
                  onChange={e => setManagerName(e.target.value)}
                  placeholder={category === 'externalLogistics' ? 'مثلاً: پلاک ۲۳ ایران ۶۵' : 'مثلاً: حاج احمد رضایی'}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

          </div>

          {/* اطلاعات تماس و آدرس */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-500" /> شماره تماس اصلی *
              </label>
              <input
                type="text"
                autoComplete="off"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0912..."
                dir="ltr"
                className={`w-full h-11 px-4 bg-slate-50 dark:bg-slate-900/90 border rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-all ${
                  errors.phone ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {errors.phone && <span className="text-[10px] font-bold text-rose-500">{errors.phone}</span>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-slate-400" /> تلفن ثابت / خط دوم
              </label>
              <input
                type="text"
                autoComplete="off"
                value={phone2}
                onChange={e => setPhone2(e.target.value)}
                placeholder="021..."
                dir="ltr"
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" /> شهر / منطقه فعالیت
              </label>
              <input
                type="text"
                autoComplete="off"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="مثلاً: تهران، بازار آهن شادآباد"
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400" /> آدرس دقیق، انبار یا پایانه باربری
            </label>
            <input
              type="text"
              autoComplete="off"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="آدرس کارگاه، انبار یا پایانه..."
              className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* اطلاعات مالی، حساب بانکی و اعتبار */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-500" /> مشخصات بانکی و مالی
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">نام بانک و صاحب حساب</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    autoComplete="off"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="بانک ملت"
                    className="w-full h-10 px-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    autoComplete="off"
                    value={cardHolder}
                    onChange={e => setCardHolder(e.target.value)}
                    placeholder="صاحب حساب"
                    className="w-full h-10 px-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">شماره شبا (بدون IR)</label>
                <div className="relative">
                  <input
                    type="text"
                    autoComplete="off"
                    value={shabaNumber}
                    onChange={e => setShabaNumber(e.target.value)}
                    placeholder="120120000000001234567890"
                    dir="ltr"
                    className="w-full h-10 px-3 pl-10 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400">IR</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">مانده حساب اولیه (طلبکار از ما)</label>
                <div className="relative">
                  <input
                    type="text"
                    autoComplete="off"
                    value={formatCommaSeparated(initialBalance)}
                    onChange={e => setInitialBalance(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    dir="ltr"
                    className="w-full h-10 px-3 pr-14 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black font-mono text-rose-600 dark:text-rose-400 outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{currencyLabel}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">سقف اعتبار خرید / قرارداد</label>
                <div className="relative">
                  <input
                    type="text"
                    autoComplete="off"
                    value={formatCommaSeparated(creditLimit)}
                    onChange={e => setCreditLimit(e.target.value.replace(/\D/g, ''))}
                    placeholder="اختیاری..."
                    dir="ltr"
                    className="w-full h-10 px-3 pr-14 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black font-mono text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{currencyLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* رتبه کیفیت کالا، خوش‌قولی و خدمات (Quality Rating) */}
          <div className="p-5 rounded-3xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                رتبه کیفیت کالا، خوش‌قولی و خدمات (Quality Rating)
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-125 transition-transform cursor-pointer"
                  >
                    <Star 
                      className={`w-5 h-5 ${
                        star <= rating 
                          ? 'text-amber-400 fill-amber-400' 
                          : 'text-slate-300 dark:text-slate-600'
                      }`} 
                    />
                  </button>
                ))}
                <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400 mr-2">
                  ({rating} از ۵ ستاره)
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> توضیحات و شرایط توافق / نحوه همکاری
              </label>
              <textarea
                autoComplete="off"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="تخفیف نقدی، موعد چک‌ها، مشخصات فنی مصالح، نرخ کرایه حمل و..."
                className="w-full p-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-all resize-none"
              />
            </div>
          </div>

          {/* دکمه‌های اکشن */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              {supplierToEdit ? 'ذخیره تغییرات' : 'ثبت تأمین‌کننده در سیستم'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>,
    document.body
  );
}
