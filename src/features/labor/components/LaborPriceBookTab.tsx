import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Trash2, HardHat, Building2, Calculator, 
  Pickaxe, Wallet, Edit2, ShieldCheck, CheckSquare,
  Clock, Activity, Percent
} from 'lucide-react';
import { toast } from 'sonner';

import { useLaborStore } from '../../../store/laborStore';
import LaborPriceBookModal from './LaborPriceBookModal';

// 💡 ایمپورت کامپوننت‌های گرافیکی یکپارچه
import { FloatingUndoToast, AnimatedCheckbox } from '../../../components/ui/SharedLaborUI';

const formatAmount = (amount: number) => new Intl.NumberFormat('fa-IR').format(amount);

const PAYMENT_TYPES: Record<string, string> = {
  DAILY: 'روزمزد', HOURLY: 'ساعتی', PIECE_WORK: 'تیکه‌ای / آیتمی',
  METER: 'متراژی / متری', CONTRACT: 'کنترات / پروژه‌ای', MONTHLY: 'ماهانه ثابت'
};

const UNIT_TYPES: Record<string, string> = {
  DAY: 'روز', HOUR: 'ساعت', METER: 'متر', ITEM: 'آیتم/عدد', SERVICE: 'سرویس', FIXED: 'مقطوع', MONTH: 'ماه'
};

export default function LaborPriceBookTab({ workerId }: { workerId: string }) {
  const { workers, specialtyTags } = useLaborStore();
  const worker = workers.find(w => w.id === workerId);
  
  const [editId, setEditId] = useState<string | null>(null);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [undoItems, setUndoItems] = useState<{ id: string, entryIds: string[], expireAt: number }[]>([]);

  if (!worker) return null;

  const currentBook = worker.priceBook || [];
  const activeEntries = currentBook.filter(e => !pendingDeleteIds.includes(e.id));

  // محاسبه آمار سریع برای داشبورد بالای تب
  const activeCount = activeEntries.length;
  let averageProfit = 0;
  if (activeCount > 0) {
    const totalProfit = activeEntries.reduce((sum, e) => sum + ((e.billedRate || 0) - (e.workerRate || 0)), 0);
    averageProfit = totalProfit / activeCount;
  }

  // توابع کنترل انتخاب و حذف
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const idsToDelete = [...selectedIds];
    
    setUndoItems(prev => [...prev, { id: Date.now().toString(), entryIds: idsToDelete, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...idsToDelete]);
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

  const handleDeleteSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setUndoItems(prev => [...prev, { id: Date.now().toString(), entryIds: [id], expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, id]);
  };

  // تایمر اجرایی برای حذف قطعی اسناد بعد از ۵ ثانیه
  // eslint-disable-next-line react-hooks/rules-of-hooks
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            const latestWorker = useLaborStore.getState().workers.find(w => w.id === workerId);
            const book = latestWorker?.priceBook || [];
            const idsToDelete = expired.flatMap(u => u.entryIds);
            const remaining = book.filter(e => !idsToDelete.includes(e.id));
            
            useLaborStore.getState().updateWorker(workerId, { priceBook: remaining });
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !idsToDelete.includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [workerId]);


  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full flex flex-col gap-6 relative z-0 pb-10">
        
        {/* داشبورد آمار سریع */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-fuchsia-200 dark:border-fuchsia-800/50 shadow-sm rounded-[2rem] p-5 flex flex-col justify-between hover:shadow-lg transition-all">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-black text-fuchsia-600 dark:text-fuchsia-400">تعداد تعرفه‌های فعال</span>
              <div className="p-2.5 bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-500 rounded-xl"><BookOpen className="w-4 h-4" /></div>
            </div>
            <div className="text-xl lg:text-2xl font-black text-fuchsia-600 dark:text-fuchsia-400 font-mono" dir="ltr">
              {activeCount} <span className="text-[10px] font-bold text-fuchsia-400 dark:text-fuchsia-500">قرارداد</span>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-indigo-200 dark:border-indigo-800/50 shadow-sm rounded-[2rem] p-5 flex flex-col justify-between hover:shadow-lg transition-all">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">میانگین حاشیه سود (آربیتراژ)</span>
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 rounded-xl"><Calculator className="w-4 h-4" /></div>
            </div>
            <div className="text-xl lg:text-2xl font-black font-mono tracking-widest text-indigo-600 dark:text-indigo-400" dir="ltr">
              {formatAmount(averageProfit)} <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-500">تومان</span>
            </div>
          </div>
        </div>

        {/* 💡 داشبورد تنظیمات پایه کارکرد (آپدیت شده با نمایش بازه زمانی) */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 shadow-sm rounded-[2rem] p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
             <ShieldCheck className="w-5 h-5 text-indigo-500" />
             <h3 className="text-sm font-black text-slate-800 dark:text-white">تنظیمات پایه و قرارداد نیرو</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             
             {/* 💡 ساعت کاری (نمایش از کی تا کی) */}
             <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700">
               <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl"><Clock className="w-5 h-5" /></div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-slate-500">ساعت کاری (ورود و خروج)</span>
                 <div className="flex items-center gap-2 mt-0.5">
                   <span className="text-sm font-black text-slate-800 dark:text-slate-200">{worker.standardWorkHours || 8} <span className="text-[9px] font-bold text-slate-400">ساعت</span></span>
                   <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/50" dir="ltr">
                     {worker.defaultStartTime || '08:00'} - {worker.defaultEndTime || '17:00'}
                   </span>
                 </div>
               </div>
             </div>
             
             {/* سقف مساعده */}
             <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700">
               <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl"><Activity className="w-5 h-5" /></div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-slate-500">سقف مجاز مساعده</span>
                 <span className="text-sm font-black text-slate-800 dark:text-slate-200" dir="ltr">
                   {worker.maxAdvanceLimit ? formatAmount(worker.maxAdvanceLimit) : 'بدون سقف'} 
                   {worker.maxAdvanceLimit ? <span className="text-[9px] font-bold text-slate-400 mr-1">تومان</span> : null}
                 </span>
               </div>
             </div>
             
             {/* کسر حسن انجام کار */}
             <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700">
               <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl"><Percent className="w-5 h-5" /></div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-slate-500">کسر حسن انجام کار</span>
                 <span className="text-sm font-black text-slate-800 dark:text-slate-200" dir="ltr">{worker.guaranteeRetained || 0} <span className="text-[9px] font-bold text-slate-400">درصد</span></span>
               </div>
             </div>

          </div>
        </div>

        {/* بخش عنوان و ابزار انتخاب گروهی */}
        <div className="flex items-center justify-between mt-2 mb-2">
           <div className="flex items-center gap-3">
             <div className="p-2.5 bg-fuchsia-500/10 rounded-xl border border-fuchsia-500/20"><BookOpen className="w-5 h-5 text-fuchsia-500" /></div>
             <h3 className="text-sm font-black text-slate-800 dark:text-white">دفترچه تعرفه‌ها (آربیتراژ)</h3>
           </div>
           
           {isSelectionMode ? (
             <AnimatePresence>
               <div className="flex items-center gap-2">
                 {selectedIds.length > 0 && (
                   <motion.button key="btn-bulk-delete" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={handleBulkDelete} className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-[10px] font-black shadow-sm flex items-center gap-1 transition-colors">
                     <Trash2 className="w-3.5 h-3.5" /> حذف ({selectedIds.length})
                   </motion.button>
                 )}
                 <motion.button key="btn-cancel-selection" onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-full text-[10px] font-black transition-colors">
                   انصراف
                 </motion.button>
               </div>
             </AnimatePresence>
           ) : (
             <button onClick={() => setIsSelectionMode(true)} className="px-3 py-1.5 bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-800/40 rounded-full text-[10px] font-black border border-fuchsia-200 dark:border-fuchsia-800/50 flex items-center gap-1 transition-colors">
               <CheckSquare className="w-3.5 h-3.5" /> انتخاب گروهی
             </button>
           )}
        </div>

        {/* لیست تعرفه‌های ثبت شده */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence>
            {activeEntries.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[2.5rem] bg-white/40 dark:bg-slate-800/40">
                 <Wallet className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                 <h3 className="text-base font-black text-slate-700 dark:text-slate-300 mb-1">دفترچه تعرفه‌ها خالی است</h3>
                 <p className="text-xs font-bold text-slate-500">با کلیک روی دکمه‌ی هدر، یک تعرفه یا قرارداد پیش‌فرض اضافه کنید.</p>
              </motion.div>
            ) : (
              activeEntries.map((entry, index) => {
                const spec = specialtyTags.find(s => s.id === entry.specialtyId);
                const pType = PAYMENT_TYPES[entry.paymentType] || 'نامشخص';
                const wUnit = UNIT_TYPES[entry.workerUnit] || 'نامشخص';
                const bUnit = UNIT_TYPES[entry.billedUnit] || 'نامشخص';
                const expectedProfit = (entry.billedRate || 0) - (entry.workerRate || 0);

                const isPrimary = index === 0;
                const isSelected = selectedIds.includes(entry.id);

                return (
                  <motion.div key={entry.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
                    onClick={() => isSelectionMode && toggleSelection(entry.id)}
                    className={`backdrop-blur-xl border shadow-sm transition-all rounded-[2rem] p-5 relative overflow-hidden group ${isSelectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] bg-rose-50 dark:bg-rose-900/10' : isPrimary ? 'bg-fuchsia-50/50 dark:bg-fuchsia-900/10 border-fuchsia-200 dark:border-fuchsia-800/50 hover:shadow-xl' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 hover:shadow-xl'}`}>
                    
                    {isPrimary && !isSelected && (
                      <div className="absolute top-0 right-0 bg-fuchsia-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1 z-10">
                        <ShieldCheck className="w-3 h-3" /> تعرفه اصلی
                      </div>
                    )}

                    {isSelectionMode && (
                      <div className="absolute top-4 left-4 z-20 pointer-events-none scale-90">
                        <AnimatedCheckbox checked={isSelected} onChange={() => {}} theme="rose" />
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-5 border-b border-slate-200 dark:border-slate-700/50 pb-4 mt-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${isSelected ? 'bg-rose-500/10 border-rose-500/20' : 'bg-purple-500/10 border-purple-500/20'}`}>
                          <Pickaxe className={`w-5 h-5 ${isSelected ? 'text-rose-500' : 'text-purple-600 dark:text-purple-400'}`} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800 dark:text-white pr-2">{spec?.name || 'تخصص نامشخص'}</span>
                          <span className="text-[10px] font-bold text-slate-500 mt-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded w-max mr-2">{pType}</span>
                        </div>
                      </div>
                      
                      {!isSelectionMode && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setEditId(entry.id); }} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={(e) => handleDeleteSingle(e, entry.id)} className="p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-500 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 mb-5">
                      <div className={`flex justify-between items-center text-xs p-3 rounded-xl border shadow-inner ${isSelected ? 'bg-rose-100/50 dark:bg-rose-800/30 border-rose-200/50 dark:border-rose-700' : 'bg-white/60 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}>
                        <span className="font-bold text-slate-500 flex items-center gap-1.5"><HardHat className="w-4 h-4 text-indigo-400"/> نرخ نیروی کار:</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400" dir="ltr">{formatAmount(entry.workerRate)} <span className="text-[9px] text-slate-400 font-bold">/ {wUnit}</span></span>
                      </div>
                      <div className={`flex justify-between items-center text-xs p-3 rounded-xl border shadow-inner ${isSelected ? 'bg-rose-100/50 dark:bg-rose-800/30 border-rose-200/50 dark:border-rose-700' : 'bg-white/60 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}>
                        <span className="font-bold text-slate-500 flex items-center gap-1.5"><Building2 className="w-4 h-4 text-blue-400"/> نرخ کارفرما:</span>
                        <span className="font-black text-blue-600 dark:text-blue-400" dir="ltr">{formatAmount(entry.billedRate)} <span className="text-[9px] text-slate-400 font-bold">/ {bUnit}</span></span>
                      </div>
                    </div>

                    <div className={`mt-auto pt-3 border-t flex justify-between items-center text-xs font-black ${isSelected ? 'border-rose-200/50 dark:border-rose-700 text-rose-500' : expectedProfit > 0 ? 'border-slate-200 dark:border-slate-700 text-emerald-500' : expectedProfit < 0 ? 'border-slate-200 dark:border-slate-700 text-rose-500' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                      <span className="flex items-center gap-1"><Calculator className="w-4 h-4"/> حاشیه سود (آربیتراژ):</span>
                      <span dir="ltr">{formatAmount(expectedProfit)} تومان</span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* مودال ویرایش که از داخل تب باز میشه */}
        {editId && <LaborPriceBookModal isOpen={!!editId} onClose={() => setEditId(null)} workerId={workerId} editEntryId={editId} />}
      </motion.div>

      {/* 💡 پورتال مرکزی تایمر حذف (Undo Toast) */}
      <FloatingUndoToast 
        undoItems={undoItems} 
        onCancel={(undoId: string, items: string[]) => {
          setPendingDeleteIds(prev => prev.filter(id => !items.includes(id)));
          setUndoItems(prev => prev.filter(u => u.id !== undoId));
          toast.success('عملیات لغو شد');
        }} 
      />
    </>
  );
}