import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, Plus, CheckCircle, Calculator, Ruler, Target, 
  Percent, Banknote, Calendar, PlayCircle, Edit3, X, Trash2,
  Images, UploadCloud 
} from 'lucide-react';
import { toast } from 'sonner';
import { useProjectStore } from '../../store/projectStore';

import { usePurchaseStore } from '../../../../store/purchaseStore';
import { useLaborStore } from '../../../../store/laborStore';
import { useLogisticsStore } from '../../../../store/logisticsStore';

import GlassDatePicker from '../../../../components/ui/GlassDatePicker';
import GlassSelect from '../../../../components/ui/GlassSelect';

interface PhaseManagementTabProps {
  projectId: string;
}

const appCurrency = 'TOMAN';
const currencySuffix = appCurrency === 'TOMAN' ? 'تومان' : 'ریال';

const safeNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleanString = String(val).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/,/g, '').replace(/[^0-9.-]+/g, ""); 
  const parsed = Number(cleanString);
  return isNaN(parsed) ? 0 : parsed;
};

const toDisplay = (dbValue: number) => dbValue;
const toDB = (displayValue: number) => displayValue;

const formatNumber = (num: number | string | undefined) => {
  if (num === undefined || num === null || num === '') return '';
  const str = num.toString();
  if (str.endsWith('.')) return str; 
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join('.');
};

const parseNumber = (str: string) => {
  if (!str) return 0;
  const cleanStr = str.replace(/,/g, '');
  return isNaN(Number(cleanStr)) ? 0 : Number(cleanStr);
};

const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else reject(new Error('خطا در فشرده‌سازی'));
      };
    };
  });
};

const GlassInputWrapper = ({ children, className = '', icon: Icon }: any) => (
  <div className={`relative rounded-xl bg-white/40 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm focus-within:border-indigo-500/60 transition-all duration-300 flex items-center px-3 h-[46px] ${className}`}>
    {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0 ml-2" />}
    {children}
  </div>
);

const PhaseCard = ({ phase, index, isLast, onUpdate, projectTotalExpenditure }: { phase: any, index: number, isLast: boolean, onUpdate: (id: string, data: any) => void, projectTotalExpenditure: number }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false); 
  
  const [contractType, setContractType] = useState('METRE');
  const [unitPrice, setUnitPrice] = useState(0);
  const [fixedPrice, setFixedPrice] = useState(0);
  const [contractorPercentage, setContractorPercentage] = useState(0);
  const [dimensions, setDimensions] = useState<{id: string, name: string, l: number, w: number, h: number, area: number}[]>([]);

  const openEdit = () => {
    setContractType(phase.contractType || 'METRE');
    setUnitPrice(toDisplay(phase.unitPrice || 0));
    setFixedPrice(toDisplay(phase.fixedPrice || 0));
    setContractorPercentage(phase.contractorPercentage || 0);
    setDimensions(
      phase.dimensions && phase.dimensions.length > 0 
        ? phase.dimensions 
        : [{ id: Date.now().toString(), name: 'بخش اصلی', l: phase.length || 0, w: phase.width || 0, h: phase.height || 0, area: phase.area || 0 }]
    );
    setIsEditing(true);
  };

  const addDimension = () => setDimensions([...dimensions, { id: Date.now().toString(), name: `بخش ${dimensions.length + 1}`, l: 0, w: 0, h: 0, area: 0 }]);
  const removeDimension = (id: string) => setDimensions(dimensions.filter(d => d.id !== id));

  const updateDimension = (id: string, field: string, value: string) => {
    const numValue = parseNumber(value);
    setDimensions(dimensions.map(d => {
      if (d.id === id) {
        const newD = { ...d, [field]: numValue };
        const l = newD.l || 0;
        const w = newD.w || 0;
        const h = newD.h || 0;
        newD.area = Number((l * w * (h > 0 ? h : 1)).toFixed(2));
        return newD;
      }
      return d;
    }));
  };

  const totalArea = dimensions.reduce((sum, d) => sum + d.area, 0);

  const editCalculations = useMemo(() => {
    if (contractType === 'METRE' || contractType === 'METRI') return totalArea * unitPrice;
    if (contractType === 'FIXED' || contractType === 'CONTRAT') return fixedPrice;
    if (contractType === 'PERCENTAGE') return projectTotalExpenditure + Math.floor((projectTotalExpenditure * contractorPercentage) / 100);
    if (contractType === 'COST_ONLY') return projectTotalExpenditure;
    return 0;
  }, [contractType, totalArea, unitPrice, fixedPrice, contractorPercentage, projectTotalExpenditure]);

  const handleSave = () => {
    onUpdate(phase.id, {
      contractType, 
      dimensions, 
      area: totalArea, 
      unitPrice: toDB(unitPrice), 
      fixedPrice: toDB(fixedPrice), 
      contractorPercentage
    });
    setIsEditing(false);
    toast.success(`اطلاعات محاسباتی فاز ${phase.name} ذخیره شد.`);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const currentPhotos = phase.photos || [];
    if (currentPhotos.length + files.length > 5) {
      toast.error('حداکثر مجاز به آپلود ۵ عکس برای اسناد هر قرارداد هستید.');
      return;
    }
    try {
      toast.loading('در حال پردازش و آپلود اسناد...');
      const compressedFiles = await Promise.all(files.map(f => compressImage(f)));
      onUpdate(phase.id, { photos: [...currentPhotos, ...compressedFiles] });
      toast.dismiss();
      toast.success('تصاویر با موفقیت به قرارداد این فاز اضافه شدند.');
    } catch (error) { 
      toast.dismiss();
      toast.error('خطا در پردازش تصاویر'); 
    }
  };

  const removePhoto = (indexToRemove: number) => {
    const currentPhotos = phase.photos || [];
    onUpdate(phase.id, { photos: currentPhotos.filter((_: any, i: number) => i !== indexToRemove) });
    toast.success('سند با موفقیت از پرونده این فاز حذف شد.');
  };

  const displayTotal = useMemo(() => {
    const cType = phase.contractType || 'METRE';
    if (cType === 'METRE' || cType === 'METRI') {
      const area = phase.dimensions?.reduce((sum: number, d: any) => sum + d.area, 0) || phase.area || 0;
      return area * toDisplay(phase.unitPrice || 0);
    }
    if (cType === 'FIXED' || cType === 'CONTRAT') return toDisplay(phase.fixedPrice || 0);
    if (cType === 'PERCENTAGE') {
      const share = Math.floor((projectTotalExpenditure * (phase.contractorPercentage || 0)) / 100);
      return projectTotalExpenditure + share;
    }
    if (cType === 'COST_ONLY') return projectTotalExpenditure;
    return 0;
  }, [phase, projectTotalExpenditure]);

  const displayDetail = useMemo(() => {
    const cType = phase.contractType || 'METRE';
    if (cType === 'METRE' || cType === 'METRI') {
      const area = phase.dimensions?.reduce((sum: number, d: any) => sum + d.area, 0) || phase.area || 0;
      return `مساحت/حجم کل: ${formatNumber(area)}`;
    }
    if (cType === 'FIXED' || cType === 'CONTRAT') return 'بدون جزئیات محاسباتی';
    if (cType === 'PERCENTAGE') {
      const share = Math.floor((projectTotalExpenditure * (phase.contractorPercentage || 0)) / 100);
      return `مجموع هزینه‌ها: ${formatNumber(projectTotalExpenditure)} | سود شما: ${formatNumber(share)}`;
    }
    if (cType === 'COST_ONLY') return `مجموع هزینه‌ها: ${formatNumber(projectTotalExpenditure)}`;
    return '';
  }, [phase, projectTotalExpenditure]);

  return (
    <div className="relative pr-10 sm:pr-14 pb-8 z-10">
      {!isLast && <div className="absolute top-8 right-[14px] sm:right-[22px] bottom-0 w-1 bg-gradient-to-b from-indigo-500/50 to-transparent rounded-full" />}
      
      <div className={`absolute top-0 right-0 w-8 h-8 sm:w-12 sm:h-12 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg z-10 ${phase.isCompleted ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`}>
        {phase.isCompleted ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white ml-0.5" />}
      </div>

      <motion.div layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`w-full p-5 sm:p-6 rounded-[2rem] backdrop-blur-2xl border shadow-xl transition-all ${phase.isCompleted ? 'bg-white/40 dark:bg-slate-800/40 border-white/40' : 'bg-white/80 dark:bg-slate-900/80 border-indigo-500/30 shadow-indigo-500/10'}`}>
        
        <motion.div layout className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              {phase.name} 
              {phase.isCompleted && <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">پایان یافته</span>}
              {!phase.isCompleted && <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-600 text-[10px] font-bold border border-indigo-500/20">در حال اجرا</span>}
            </h3>
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 hidden sm:flex"><Calendar className="w-3 h-3" /> {phase.description?.replace('شروع شده در تاریخ ', '') || ''}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setIsGalleryOpen(true)} className="p-2 rounded-xl bg-white/60 text-fuchsia-600 hover:bg-fuchsia-50 dark:bg-slate-800 dark:text-fuchsia-400 shadow-sm transition-colors border border-transparent dark:border-slate-700" title="اسناد و قرارداد این فاز">
              <Images className="w-4 h-4" />
            </button>
            <button onClick={isEditing ? () => setIsEditing(false) : openEdit} className={`p-2 rounded-xl transition-colors shadow-sm ${isEditing ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-white/60 text-indigo-600 hover:bg-indigo-50 dark:bg-slate-800 dark:text-indigo-400 border border-transparent dark:border-slate-700'}`} title="ویرایش اطلاعات مالی این فاز">
              {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div key="edit-mode" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5 overflow-visible">
              
              <div className="space-y-1.5 w-full sm:w-1/2 relative z-[70]">
                <label className="text-xs font-bold text-slate-500 ml-1">نوع قرارداد و محاسبه این فاز</label>
                <GlassSelect 
                  icon={Target}
                  options={[
                    {value: 'METRE', label: 'مساحتی / متراژ چندگانه'}, 
                    {value: 'FIXED', label: 'مقطوع / کنترات'}, 
                    {value: 'PERCENTAGE', label: 'مدیریت پیمان (درصدی)'},
                    {value: 'COST_ONLY', label: 'فقط هزینه'}
                  ]} 
                  value={contractType} 
                  onChange={setContractType} 
                />
              </div>

              {contractType === 'METRE' && (
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 p-4 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-800/50 pb-3">
                    <span className="text-sm font-black text-indigo-800 dark:text-indigo-300 flex items-center gap-2"><Ruler className="w-4 h-4" /> لیست ابعاد این فاز</span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-lg">مجموع: {formatNumber(totalArea)}</span>
                  </div>
                  
                  {dimensions.map((dim) => (
                    <div key={dim.id} className="flex flex-wrap lg:flex-nowrap items-center gap-2 bg-white/60 dark:bg-slate-800/60 p-2.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                      <div className="w-full lg:flex-1"><input value={dim.name} onChange={e => updateDimension(dim.id, 'name', e.target.value)} className="w-full bg-transparent outline-none text-xs font-bold text-slate-700 dark:text-slate-300" placeholder="نام بخش" /></div>
                      
                      <div className="flex items-center gap-1.5 w-full lg:w-auto">
                        <div className="w-14 sm:w-16"><input type="text" value={dim.l ? formatNumber(dim.l) : ''} onChange={e => updateDimension(dim.id, 'l', e.target.value)} className="w-full bg-slate-100 dark:bg-slate-900 px-1.5 py-2 rounded-lg outline-none text-xs font-black text-center text-slate-800 dark:text-white" dir="ltr" placeholder="طول" title="طول" /></div>
                        <span className="text-slate-400 font-bold text-xs">X</span>
                        <div className="w-14 sm:w-16"><input type="text" value={dim.w ? formatNumber(dim.w) : ''} onChange={e => updateDimension(dim.id, 'w', e.target.value)} className="w-full bg-slate-100 dark:bg-slate-900 px-1.5 py-2 rounded-lg outline-none text-xs font-black text-center text-slate-800 dark:text-white" dir="ltr" placeholder="عرض" title="عرض" /></div>
                        <span className="text-slate-400 font-bold text-xs">X</span>
                        <div className="w-14 sm:w-16"><input type="text" value={dim.h ? formatNumber(dim.h) : ''} onChange={e => updateDimension(dim.id, 'h', e.target.value)} className="w-full bg-slate-100 dark:bg-slate-900 px-1.5 py-2 rounded-lg outline-none text-xs font-black text-center text-slate-800 dark:text-white" dir="ltr" placeholder="ارتفاع" title="ارتفاع (اختیاری)" /></div>
                        <span className="text-slate-400 font-bold text-xs">=</span>
                        
                        <div className="w-20 text-center font-black text-sm text-indigo-600 dark:text-indigo-400" dir="ltr">{formatNumber(dim.area)}</div>
                        <button onClick={() => removeDimension(dim.id)} className="p-1.5 bg-rose-100 text-rose-500 rounded-lg hover:bg-rose-200 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addDimension} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-700 px-2"><Plus className="w-3 h-3" /> افزودن ابعاد جدید</button>
                  
                  <div className="pt-4 border-t border-indigo-100 dark:border-indigo-800/50">
                    <label className="text-xs font-bold text-slate-500 ml-1">قیمت واحد ({currencySuffix})</label>
                    <GlassInputWrapper icon={Banknote} className="bg-white/80 dark:bg-slate-800">
                      <input type="text" value={unitPrice ? formatNumber(unitPrice) : ''} onChange={e => setUnitPrice(parseNumber(e.target.value))} className="w-full bg-transparent outline-none font-black text-base text-indigo-700 dark:text-indigo-400" dir="ltr" placeholder="0" />
                    </GlassInputWrapper>
                  </div>
                </div>
              )}

              {contractType === 'FIXED' && (
                <div className="space-y-1.5 w-full lg:w-2/3">
                  <label className="text-xs font-bold text-slate-500 ml-1">مبلغ مقطوع قرارداد فاز ({currencySuffix})</label>
                  <GlassInputWrapper icon={Banknote} className="bg-amber-50/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50">
                    <input type="text" value={fixedPrice ? formatNumber(fixedPrice) : ''} onChange={e => setFixedPrice(parseNumber(e.target.value))} className="w-full bg-transparent outline-none font-black text-base text-amber-700 dark:text-amber-400" dir="ltr" placeholder="0" />
                  </GlassInputWrapper>
                </div>
              )}

              {contractType === 'PERCENTAGE' && (
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 p-4 rounded-2xl space-y-4">
                   <div className="space-y-1.5 w-full sm:w-1/2">
                    <label className="text-xs font-bold text-slate-500 ml-1">درصد سود پیمانکار (%)</label>
                    <GlassInputWrapper icon={Percent} className="bg-white/80 dark:bg-slate-800">
                      <input type="text" value={contractorPercentage ? formatNumber(contractorPercentage) : ''} onChange={e => setContractorPercentage(parseNumber(e.target.value))} className="w-full bg-transparent outline-none font-black text-base text-emerald-700 dark:text-emerald-400" dir="ltr" placeholder="مثلا 15" />
                    </GlassInputWrapper>
                   </div>
                   <div className="flex flex-col gap-1.5 text-sm p-4 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
                      <div className="flex justify-between font-bold text-slate-600 dark:text-slate-400"><span>مجموع هزینه‌های ثبت شده پروژه:</span> <span dir="ltr">{formatNumber(toDisplay(projectTotalExpenditure))} {currencySuffix}</span></div>
                      <div className="flex justify-between font-black text-emerald-600 dark:text-emerald-400 border-t border-emerald-200 dark:border-emerald-800 pt-2 mt-1"><span>سهم شما (سود پیمانکار):</span> <span dir="ltr">{formatNumber(Math.floor((toDisplay(projectTotalExpenditure) * contractorPercentage) / 100))} {currencySuffix}</span></div>
                   </div>
                </div>
              )}

              <div className="p-3 sm:p-4 rounded-xl bg-slate-900 dark:bg-slate-950 text-white flex flex-col sm:flex-row items-center justify-between shadow-lg gap-2 border border-slate-700">
                <span className="text-sm font-bold flex items-center gap-2"><Calculator className="w-4 h-4 text-indigo-400" /> ارزش کل این فاز (مبلغ قابل فاکتور):</span>
                <span className="text-xl font-black text-indigo-400" dir="ltr">{formatNumber(editCalculations)} <span className="text-xs text-slate-400">{currencySuffix}</span></span>
              </div>

              <button onClick={handleSave} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                <CheckCircle className="w-5 h-5" /> بروزرسانی و ذخیره اطلاعات فاز
              </button>
            </motion.div>
          ) : (
            <motion.div key="view-mode" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 mt-2">
              <div className="md:col-span-1 flex flex-col gap-1 p-3 sm:p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <span className="text-[10px] font-bold text-slate-400">نوع محاسبه</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{phase.contractType === 'METRE' || phase.contractType === 'METRI' ? 'متراژ و ابعاد' : phase.contractType === 'FIXED' || phase.contractType === 'CONTRAT' ? 'مقطوع' : phase.contractType === 'PERCENTAGE' ? 'درصدی' : 'فقط هزینه'}</span>
              </div>
              <div className="md:col-span-1 flex flex-col gap-1 p-3 sm:p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <span className="text-[10px] font-bold text-slate-400">جزئیات محاسبات</span>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 truncate" title={displayDetail}>{displayDetail || '---'}</span>
              </div>
              <div className="md:col-span-2 flex flex-col justify-center gap-1 p-3 sm:p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent to-white/30 dark:to-white/5 pointer-events-none" />
                <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400">ارزش کل فاز (مبلغ قابل فاکتور)</span>
                <span className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300" dir="ltr">
                  {formatNumber(displayTotal)} <span className="text-xs font-bold ml-1 text-indigo-400/80">{currencySuffix}</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isGalleryOpen && (
            <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm" dir="rtl">
              <motion.div initial={{opacity: 0, scale: 0.9}} animate={{opacity: 1, scale: 1}} exit={{opacity: 0, scale: 0.9}} className="w-full max-w-4xl max-h-[90vh] overflow-y-auto modal-scrollbar bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl relative">
                <button onClick={() => setIsGalleryOpen(false)} className="absolute top-4 left-4 p-2 bg-slate-700 hover:bg-rose-500 text-white rounded-xl transition-colors z-10"><X className="w-5 h-5"/></button>
                <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Images className="w-6 h-6 text-fuchsia-500"/> اسناد و تصاویر قرارداد {phase.name}</h2>
                
                <div className="mb-6 bg-slate-700/50 p-4 rounded-2xl border border-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-slate-300 text-sm font-bold">
                        شما می‌توانید تا ۵ سند یا تصویر برای قرارداد این فاز آپلود کنید. ({phase.photos?.length || 0} / ۵)
                    </div>
                    <div className="relative">
                        <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={(phase.photos?.length || 0) >= 5} />
                        <button className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${phase.photos?.length >= 5 ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/30'}`}>
                            <UploadCloud className="w-4 h-4"/> آپلود سند جدید
                        </button>
                    </div>
                </div>

                {phase.photos && phase.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                    {phase.photos.map((img: string, i: number) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-600 shadow-md relative group">
                        <img src={img} alt={`سند فاز ${i+1}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                           <button type="button" onClick={() => removePhoto(i)} className="p-2 bg-rose-500 text-white rounded-xl hover:scale-110 transition-transform shadow-[0_0_15px_rgba(244,63,94,0.8)]"><Trash2 className="w-5 h-5"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-64 border-2 border-dashed border-slate-600 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                    <Images className="w-12 h-12 mb-3 opacity-50"/>
                    <p className="font-bold">هیچ تصویر یا سندی برای این فاز آپلود نشده است.</p>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default function PhaseManagementTab({ projectId }: PhaseManagementTabProps) {
  const allProjects = useProjectStore((state) => state.projects);
  const project = useMemo(() => allProjects.find(p => p.id === projectId), [allProjects, projectId]);
  const updateProject = useProjectStore((state) => state.updateProject);
  const startNewPhase = useProjectStore((state) => state.startNewPhase);

  // 💡 فراخوانی استورهای کل سیستم
  const allPurchases = usePurchaseStore((state) => state.purchases);
  const allLaborLogs = useLaborStore((state) => state.logs);
  const allLogisticsLogs = useLogisticsStore((state) => state.logs);

  useEffect(() => {
    const handleOpenModal = () => setIsNewPhaseModalOpen(true);
    document.addEventListener('open-new-phase-modal', handleOpenModal);
    return () => document.removeEventListener('open-new-phase-modal', handleOpenModal);
  }, []);

  const projectCostSum = useMemo(() => {
    let sum = 0;
    
    // 💡 محاسبه دقیق فقط برای فاکتورهای این پروژه
    const projectPurchases = allPurchases.filter(p => p.projectId === projectId);
    projectPurchases.forEach((p:any) => {
      // 💡 اولویت با مبلغ درج شده در فاکتور است، اگر نبود جمع مبالغ خام کالا + حمل
      const billed = safeNum(p.billedCost);
      const internal = safeNum(p.internalCost);
      const transport = safeNum(p.transportInternalCost) || safeNum(p.transportBilledCost);
      sum += (billed || internal) + transport;
    });

    const projectLabor = allLaborLogs.filter(l => l.projectId === projectId);
    projectLabor.forEach((l:any) => {
      // 💡 اولویت با مبلغ درج شده در فاکتور است
      const billed = safeNum(l.billedCost);
      const internal = safeNum(l.internalCost) || safeNum(l.totalWage) || safeNum(l.salary);
      sum += (billed || internal);
    });

    const projectLogistics = allLogisticsLogs.filter(l => l.projectId === projectId);
    projectLogistics.forEach((l:any) => {
      // 💡 اولویت با مبلغ درج شده در فاکتور است
      const billed = safeNum(l.billedCost);
      const internal = safeNum(l.internalCost) || safeNum(l.totalCost) || safeNum(l.fee);
      sum += (billed || internal);
    });

    return sum;
  }, [allPurchases, allLaborLogs, allLogisticsLogs, projectId]);

  const [isNewPhaseModalOpen, setIsNewPhaseModalOpen] = useState(false);
  const [newPhaseDate, setNewPhaseDate] = useState('');
  const [newPhaseType, setNewPhaseType] = useState('METRE');

  if (!project) return null;

  const phases = project.phases || [];
  const completedPhasesCount = phases.filter((p: any) => p.isCompleted).length;
  const progressPercentage = phases.length === 0 ? 0 : Math.round((completedPhasesCount / phases.length) * 100);

  const handleUpdatePhase = (phaseId: string, updatedData: any) => {
    const updatedPhases = phases.map((p: any) => p.id === phaseId ? { ...p, ...updatedData } : p);
    updateProject(projectId, { phases: updatedPhases });
  };

  const handleStartNewPhase = () => {
    if (!newPhaseDate) return toast.error('لطفاً تاریخ شروع فاز جدید را مشخص کنید.');
    startNewPhase(projectId, newPhaseType as any, newPhaseDate);
    toast.success('فاز فعلی بسته شد و فاز جدید با موفقیت ایجاد گردید.');
    setIsNewPhaseModalOpen(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6 relative z-10">
      
      <div className="bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-white/20 dark:border-slate-700/30 shadow-sm rounded-[2rem] p-6 z-10 relative flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <Layers className="w-8 h-8 text-indigo-500" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black text-slate-800 dark:text-white">مدیریت فازهای اجرایی</h2>
          <span className="text-sm font-bold text-slate-500 flex items-center gap-2">پیشرفت: {progressPercentage}% <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"/> تکمیل شده: {completedPhasesCount} از {phases.length}</span>
        </div>
      </div>

      <div className="relative pt-6 px-2 sm:px-6">
        {phases.length === 0 ? (
          <div className="text-center p-12 bg-white/40 dark:bg-slate-800/40 rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-700">
            <Layers className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-black text-slate-700 dark:text-slate-300 mb-2">هنوز فازی برای این پروژه تعریف نشده است</h3>
            <p className="text-sm text-slate-500 font-bold">برای شروع، روی دکمه «شروع فاز جدید» کلیک کنید.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {phases.map((phase: any, index: number) => (
              <PhaseCard 
                key={phase.id} 
                phase={phase} 
                index={index} 
                isLast={index === phases.length - 1} 
                onUpdate={handleUpdatePhase} 
                projectTotalExpenditure={projectCostSum} 
              />
            ))}
          </div>
        )}
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isNewPhaseModalOpen && (
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewPhaseModalOpen(false)} className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
              
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md p-6 rounded-[2rem] backdrop-blur-3xl bg-white/95 dark:bg-slate-900/95 border border-white/50 dark:border-slate-700 shadow-2xl space-y-6 overflow-visible">
                
                <div className="flex justify-between items-center mb-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <h3 className="text-lg font-black flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Layers className="w-6 h-6" /> شروع فاز جدید
                  </h3>
                  <button onClick={() => setIsNewPhaseModalOpen(false)} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
                </div>

                <div className="space-y-4 relative z-50">
                  <div className="space-y-1.5 relative z-[60]">
                    <label className="text-xs font-bold text-slate-500 ml-1">تاریخ شروع فاز جدید</label>
                    <GlassDatePicker value={newPhaseDate} onChange={setNewPhaseDate} placeholder="انتخاب تاریخ..." />
                  </div>

                  <div className="space-y-1.5 relative z-[50]">
                    <label className="text-xs font-bold text-slate-500 ml-1">قالب قرارداد فاز جدید</label>
                    <GlassSelect 
                      icon={Target}
                      options={[
                        {value: 'METRE', label: 'مساحتی / متراژ چندگانه'}, 
                        {value: 'FIXED', label: 'مقطوع / کنترات'}, 
                        {value: 'PERCENTAGE', label: 'مدیریت پیمان (درصدی)'}
                      ]} 
                      value={newPhaseType} 
                      onChange={setNewPhaseType} 
                    />
                  </div>
                </div>

                <button onClick={handleStartNewPhase} className="w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                  <Plus className="w-5 h-5" /> ساخت فاز و بستن فاز قبل
                </button>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}