import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, Plus, Trash2, Edit3, Check, X, Calculator, 
  Ruler, CheckCircle2, Clock, AlertCircle, ArrowDownRight, 
  Sparkles, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';

import type { 
  Contract, 
  ContractPhase, 
  ContractMeasurementItem 
} from '../../../../store/contractStore';
import { useContractStore, calculateMeasurementTotal } from '../../../../store/contractStore';
import { formatCurrency } from '../../../../core/utils/currency';

interface ContractPhasesAndMeasurementTabProps {
  contract: Contract;
}

const MEASUREMENT_UNITS = [
  'مترمربع',
  'مترمکعب',
  'مترطول',
  'تن',
  'کیلوگرم',
  'عدد',
  'سرویس',
  'قالب',
  'شاخه',
  'مقطوع',
];

export default function ContractPhasesAndMeasurementTab({
  contract,
}: ContractPhasesAndMeasurementTabProps) {
  const { 
    addPhase, 
    updatePhase, 
    deletePhase,
    addMeasurementItem,
    updateMeasurementItem,
    deleteMeasurementItem,
  } = useContractStore();

  // استیت فرم ردیف ریزمتره جدید
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [itemDesc, setItemDesc] = useState('');
  const [itemUnit, setItemUnit] = useState('مترمربع');
  const [itemLength, setItemLength] = useState<string>('');
  const [itemWidth, setItemWidth] = useState<string>('');
  const [itemHeight, setItemHeight] = useState<string>('');
  const [itemCount, setItemCount] = useState<string>('1');
  const [itemFactor, setItemFactor] = useState<string>('1');
  const [manualQty, setManualQty] = useState<string>('');
  const [itemUnitPrice, setItemUnitPrice] = useState<string>('');
  const [itemCompletedQty, setItemCompletedQty] = useState<string>('');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');

  // استیت افزودن فاز جدید
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [phaseName, setPhaseName] = useState('');
  const [phaseWeight, setPhaseWeight] = useState<number>(20);
  const [phaseAmount, setPhaseAmount] = useState<number>(0);

  // محاسبه خودکار متراژ بر اساس ابعاد
  const computedQty = React.useMemo(() => {
    const l = parseFloat(itemLength) || 0;
    const w = parseFloat(itemWidth) || 0;
    const h = parseFloat(itemHeight) || 0;
    const c = parseFloat(itemCount) || 1;
    const f = parseFloat(itemFactor) || 1;

    // اگر ابعاد ۳گانه یا دوگانه وارد شده بود:
    if (l > 0 && w > 0 && h > 0) {
      return Number((l * w * h * c * f).toFixed(2));
    } else if (l > 0 && w > 0) {
      return Number((l * w * c * f).toFixed(2));
    } else if (l > 0) {
      return Number((l * c * f).toFixed(2));
    }
    return parseFloat(manualQty) || 0;
  }, [itemLength, itemWidth, itemHeight, itemCount, itemFactor, manualQty]);

  // ریست فرم ریزمتره
  const resetItemForm = () => {
    setItemDesc('');
    setItemUnit('مترمربع');
    setItemLength('');
    setItemWidth('');
    setItemHeight('');
    setItemCount('1');
    setItemFactor('1');
    setManualQty('');
    setItemUnitPrice('');
    setItemCompletedQty('');
    setSelectedPhaseId('');
    setIsAddingItem(false);
    setEditingItemId(null);
  };

  // ذخیره یا ویرایش ردیف ریزمتره
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemDesc.trim()) {
      toast.error('لطفاً شرح ردیف ریزمتره را وارد کنید');
      return;
    }

    const finalQty = computedQty > 0 ? computedQty : (parseFloat(manualQty) || 0);
    const unitPriceNum = parseFloat(itemUnitPrice.replace(/\D/g, '')) || 0;
    const compQty = parseFloat(itemCompletedQty) || 0;

    if (editingItemId) {
      updateMeasurementItem(contract.id, editingItemId, {
        description: itemDesc.trim(),
        unit: itemUnit,
        length: parseFloat(itemLength) || undefined,
        width: parseFloat(itemWidth) || undefined,
        height: parseFloat(itemHeight) || undefined,
        count: parseFloat(itemCount) || 1,
        factor: parseFloat(itemFactor) || 1,
        quantity: finalQty,
        unitPrice: unitPriceNum,
        completedQuantity: compQty,
        phaseId: selectedPhaseId || undefined,
      });
      toast.success('ردیف ریزمتره به‌روزرسانی شد');
    } else {
      addMeasurementItem(contract.id, {
        description: itemDesc.trim(),
        unit: itemUnit,
        length: parseFloat(itemLength) || undefined,
        width: parseFloat(itemWidth) || undefined,
        height: parseFloat(itemHeight) || undefined,
        count: parseFloat(itemCount) || 1,
        factor: parseFloat(itemFactor) || 1,
        quantity: finalQty,
        unitPrice: unitPriceNum,
        totalPrice: finalQty * unitPriceNum,
        completedQuantity: compQty,
        phaseId: selectedPhaseId || undefined,
      });
      toast.success('ردیف جدید به ریزمتره اضافه شد');
    }

    resetItemForm();
  };

  // لود دیتا برای ویرایش ردیف
  const handleEditItem = (item: ContractMeasurementItem) => {
    setEditingItemId(item.id);
    setItemDesc(item.description);
    setItemUnit(item.unit);
    setItemLength(item.length ? item.length.toString() : '');
    setItemWidth(item.width ? item.width.toString() : '');
    setItemHeight(item.height ? item.height.toString() : '');
    setItemCount(item.count ? item.count.toString() : '1');
    setItemFactor(item.factor ? item.factor.toString() : '1');
    setManualQty(item.quantity ? item.quantity.toString() : '');
    setItemUnitPrice(item.unitPrice ? item.unitPrice.toString() : '');
    setItemCompletedQty(item.completedQuantity ? item.completedQuantity.toString() : '');
    setSelectedPhaseId(item.phaseId || '');
    setIsAddingItem(true);
  };

  // ثبت فاز جدید
  const handleSavePhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phaseName.trim()) {
      toast.error('لطفاً عنوان فاز را وارد کنید');
      return;
    }

    addPhase(contract.id, {
      name: phaseName.trim(),
      status: 'NOT_STARTED',
      weightPercentage: phaseWeight,
      estimatedAmount: phaseAmount,
      certifiedAmount: 0,
      progressPercentage: 0,
    });

    toast.success('فاز جدید با موفقیت ایجاد شد');
    setPhaseName('');
    setPhaseWeight(20);
    setPhaseAmount(0);
    setIsAddingPhase(false);
  };

  // محاسبات کل جدول ریزمتره
  const { totalAmount, certifiedAmount } = calculateMeasurementTotal(contract.measurementItems || []);

  return (
    <div className="space-y-8" dir="rtl">
      {/* ======================================================== */}
      {/* بخش ۱: فازهای قرارداد و درصد پیشرفت فیزیکی */}
      {/* ======================================================== */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                فازبندی و مراحل اجرایی قرارداد
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                تعیین وزن ریالی، مبالغ برآوردی و پیشرفت هر فاز
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingPhase(true)}
            className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 font-black text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف فاز جدید</span>
          </button>
        </div>

        {/* فرم بازشونده افزودن فاز */}
        <AnimatePresence>
          {isAddingPhase && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSavePhase}
              className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/60 mb-6 space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                  مشخصات فاز جدید:
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingPhase(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    نام فاز:
                  </label>
                  <input
                    type="text"
                    value={phaseName}
                    onChange={(e) => setPhaseName(e.target.value)}
                    placeholder="مثال: فاز دوم: بتن‌ریزی سقف‌ها"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    وزن از کل قرارداد (%):
                  </label>
                  <input
                    type="number"
                    value={phaseWeight}
                    onChange={(e) => setPhaseWeight(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white font-mono text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    مبلغ برآوردی فاز (تومان):
                  </label>
                  <input
                    type="text"
                    value={phaseAmount ? phaseAmount.toLocaleString('fa-IR') : ''}
                    onChange={(e) => setPhaseAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
                    placeholder="۰"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white font-mono text-center"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingPhase(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  افزودن فاز
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* لیست فازهای تعریف‌شده */}
        {(!contract.phases || contract.phases.length === 0) ? (
          <div className="text-center py-6 text-slate-400 text-xs font-bold">
            هنوز فازی برای این قرارداد ثبت نشده است. می‌توانید با دکمه بالا فازهای پروژه را مرحله‌بندی کنید.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contract.phases.map((phase) => {
              const isCompleted = phase.status === 'COMPLETED';
              return (
                <div
                  key={phase.id}
                  className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-black text-sm text-slate-800 dark:text-white">
                      {phase.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => deletePhase(contract.id, phase.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                      title="حذف فاز"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>وزن فاز: {phase.weightPercentage || 0}٪</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {formatCurrency(phase.estimatedAmount)}
                    </span>
                  </div>

                  {/* نوار پیشرفت فاز */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>پیشرفت فیزیکی فاز</span>
                      <span className="font-mono">{phase.progressPercentage || 0}٪</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${phase.progressPercentage || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const newStatus = isCompleted ? 'IN_PROGRESS' : 'COMPLETED';
                        updatePhase(contract.id, phase.id, {
                          status: newStatus,
                          progressPercentage: newStatus === 'COMPLETED' ? 100 : 50,
                          certifiedAmount: newStatus === 'COMPLETED' ? phase.estimatedAmount : 0,
                        });
                      }}
                      className={`px-3 py-1 rounded-xl text-[10px] font-black transition-colors ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400'
                      }`}
                    >
                      {isCompleted ? 'تکمیل شده ✓' : 'علامت‌گذاری به عنوان تکمیل'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* بخش ۲: جدول ریزمتره، محاسبات هندسی و فهرست‌بها */}
      {/* ======================================================== */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                جدول ریزمتره، ابعاد و فهرست‌بهای قرارداد
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                محاسبه خودکار: طول × عرض × ارتفاع × تعداد × فی واحد = بهای کل ردیف
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isAddingItem) resetItemForm();
              else setIsAddingItem(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingItem ? 'بستن فرم' : 'افزودن ردیف ریزمتره'}</span>
          </button>
        </div>

        {/* فرم بازشونده افزودن / ویرایش ردیف ریزمتره با ماشین‌حساب هندسی */}
        <AnimatePresence>
          {isAddingItem && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSaveItem}
              className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4" />
                  {editingItemId ? 'ویرایش ردیف ریزمتره:' : 'افزودن ردیف ریزمتره با ابعاد هندسی:'}
                </span>
                <button
                  type="button"
                  onClick={resetItemForm}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ردیف ۱: شرح، فاز و واحد */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    شرح آیتم کارکرد <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    placeholder="مثلاً: تیغه‌چینی سفال ۱۵ سانتی‌متری طبقه ۳"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    واحد اندازه‌گیری:
                  </label>
                  <select
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {MEASUREMENT_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    فاز مربوطه:
                  </label>
                  <select
                    value={selectedPhaseId}
                    onChange={(e) => setSelectedPhaseId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">بدون فاز مشخص</option>
                    {(contract.phases || []).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ردیف ۲: جدول ابعاد طول، عرض، ارتفاع، تعداد، ضریب */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-black text-slate-400 block">
                  محاسبه هندسی متراژ / احجام:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">طول (متر):</label>
                    <input
                      type="number"
                      step="any"
                      value={itemLength}
                      onChange={(e) => setItemLength(e.target.value)}
                      placeholder="۰"
                      className="w-full h-9 px-2 text-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">عرض (متر):</label>
                    <input
                      type="number"
                      step="any"
                      value={itemWidth}
                      onChange={(e) => setItemWidth(e.target.value)}
                      placeholder="۰"
                      className="w-full h-9 px-2 text-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ارتفاع / ضخامت:</label>
                    <input
                      type="number"
                      step="any"
                      value={itemHeight}
                      onChange={(e) => setItemHeight(e.target.value)}
                      placeholder="۰"
                      className="w-full h-9 px-2 text-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">تعداد ردیف / دهانه:</label>
                    <input
                      type="number"
                      value={itemCount}
                      onChange={(e) => setItemCount(e.target.value)}
                      placeholder="۱"
                      className="w-full h-9 px-2 text-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ضریب کسر / اضافه:</label>
                    <input
                      type="number"
                      step="any"
                      value={itemFactor}
                      onChange={(e) => setItemFactor(e.target.value)}
                      placeholder="۱"
                      className="w-full h-9 px-2 text-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-0.5">
                      مقدار کل محاسبه‌شده:
                    </label>
                    <div className="w-full h-9 px-2 flex items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-mono font-black text-xs" dir="ltr">
                      {computedQty.toLocaleString('fa-IR')} {itemUnit}
                    </div>
                  </div>
                </div>
              </div>

              {/* ردیف ۳: فی واحد، مقدار انجام شده و قیمت کل */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    بهای واحد / فی (تومان):
                  </label>
                  <input
                    type="text"
                    value={itemUnitPrice ? Number(itemUnitPrice.replace(/\D/g, '')).toLocaleString('fa-IR') : ''}
                    onChange={(e) => setItemUnitPrice(e.target.value.replace(/\D/g, ''))}
                    placeholder="۰"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    مقدار کارکرد تاییدشده تا امروز:
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={itemCompletedQty}
                    onChange={(e) => setItemCompletedQty(e.target.value)}
                    placeholder="۰"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    مبلغ کل ردیف (تومان):
                  </label>
                  <div className="w-full h-10 px-3 flex items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono font-black text-xs" dir="ltr">
                    {formatCurrency(computedQty * (parseFloat(itemUnitPrice.replace(/\D/g, '')) || 0))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-amber-200/50 dark:border-amber-800/50">
                <button
                  type="button"
                  onClick={resetItemForm}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-xs shadow-md shadow-amber-500/30 cursor-pointer"
                >
                  {editingItemId ? 'ذخیره تغییرات ردیف' : 'افزودن ردیف به جدول'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* جدول رسمی ریزمتره */}
        {(!contract.measurementItems || contract.measurementItems.length === 0) ? (
          <div className="text-center py-12 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-800">
            <Ruler className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">
              هیچ ردیف ریزمتره‌ای ثبت نشده است
            </h4>
            <p className="text-xs text-slate-400 font-bold mt-1">
              جهت کنترل مالی متراژ و ابعاد قرارداد، روی «افزودن ردیف ریزمتره» کلیک کنید.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
                  <th className="p-3 text-center w-12">ردیف</th>
                  <th className="p-3">شرح عملیات / آیتم</th>
                  <th className="p-3 text-center">ابعاد (طول×عرض×ارتفاع)</th>
                  <th className="p-3 text-center">تعداد</th>
                  <th className="p-3 text-center">مقدار کل</th>
                  <th className="p-3 text-center">واحد</th>
                  <th className="p-3 text-left">فی واحد (تومان)</th>
                  <th className="p-3 text-left">مبلغ کل (تومان)</th>
                  <th className="p-3 text-center">پیشرفت</th>
                  <th className="p-3 text-center w-20">اقدام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                {contract.measurementItems.map((item, idx) => {
                  const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
                  const itemProgress = item.quantity > 0 
                    ? Math.min(100, Math.round(((item.completedQuantity || 0) / item.quantity) * 100))
                    : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="p-3 text-slate-800 dark:text-slate-200">
                        <div>{item.description}</div>
                        {item.phaseId && (
                          <span className="text-[10px] text-indigo-500 font-normal">
                            {(contract.phases || []).find(p => p.id === item.phaseId)?.name}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center font-mono text-slate-500" dir="ltr">
                        {item.length ? `${item.length} × ${item.width || 1}${item.height ? ` × ${item.height}` : ''}` : '-'}
                      </td>

                      <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                        {item.count || 1}
                      </td>

                      <td className="p-3 text-center font-mono font-black text-amber-600 dark:text-amber-400">
                        {item.quantity.toLocaleString('fa-IR')}
                      </td>

                      <td className="p-3 text-center text-slate-500">
                        {item.unit}
                      </td>

                      <td className="p-3 text-left font-mono" dir="ltr">
                        {item.unitPrice.toLocaleString('fa-IR')}
                      </td>

                      <td className="p-3 text-left font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                        {formatCurrency(itemTotal)}
                      </td>

                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          itemProgress >= 100 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                        }`}>
                          {itemProgress}%
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditItem(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                            title="ویرایش ردیف"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMeasurementItem(contract.id, item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="حذف ردیف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* ردیف جمع کل مقادیر */}
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/70 font-black text-xs">
                  <td colSpan={7} className="p-4 text-slate-700 dark:text-slate-300">
                    مجموع ارزش کل اقلام ریزمتره:
                  </td>
                  <td className="p-4 text-left font-mono text-emerald-600 dark:text-emerald-400 text-sm" dir="ltr">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td colSpan={2} className="p-4 text-center text-slate-500 text-[11px]">
                    کارکرد تاییدشده: {formatCurrency(certifiedAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
