import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Search, Star, Wrench, ShieldCheck, TrendingUp, TrendingDown,
  LayoutGrid, List as ListIcon, ShieldAlert, Plus, ChevronDown, Check, X, Trash2, Activity, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useLogisticsStore } from '../../../store/logisticsStore';
import type { VehicleProfile as VehicleProfileType } from '../../../store/logisticsStore';
import VehicleFormModal from './VehicleFormModal'; 

// 💡 استفاده‌ی ۱۰۰٪ مستقیم از ابزارهای آماده‌شده در SharedLaborUI
import { NeonSearchWrapper, FloatingUndoToast } from '../../../components/ui/SharedLaborUI';

// 💡 ایمپورت کامپوننت پروفایل خودرو که به تازگی ساختیم
import VehicleProfile from './VehicleProfile';

const VehicleCard = ({ vehicle, onTogglePin, onDelete, onClick }: { vehicle: VehicleProfileType, onTogglePin: (id: string) => void, onDelete: (id: string) => void, onClick: () => void }) => {
  const mockProfit = 15000000; 

  return (
    <motion.div 
      layout="position" transition={{ layout: { type: "spring", stiffness: 400, damping: 30, mass: 0.8 }, opacity: { duration: 0.2 } }}
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
      onClick={onClick} 
      className={`relative backdrop-blur-2xl border rounded-[2rem] p-6 transition-colors duration-300 group overflow-hidden cursor-pointer ${vehicle.isPinned ? 'bg-white/70 dark:bg-slate-800/70 border-amber-400/60 dark:border-amber-500/60 shadow-[0_15px_40px_rgba(245,158,11,0.2)]' : 'bg-white/50 dark:bg-slate-900/50 border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:border-blue-300/50'}`}
    >
      {vehicle.isPinned && (
        <motion.div animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.25, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/20 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            {vehicle.photo ? (
              <img src={vehicle.photo} alt={vehicle.name} className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-700" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg border-2 border-white/80 dark:border-slate-700">
                <Truck className="w-7 h-7" />
              </div>
            )}
            <div className={`absolute -bottom-2 -right-2 rounded-lg px-1.5 py-0.5 shadow-md border flex items-center gap-0.5 text-[10px] font-black ${vehicle.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : vehicle.status === 'REPAIR' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {vehicle.status === 'ACTIVE' && <Activity className="w-3 h-3" />}
              {vehicle.status === 'REPAIR' && <Wrench className="w-3 h-3" />}
              {vehicle.status === 'INACTIVE' && <Ban className="w-3 h-3" />}
              {vehicle.status === 'ACTIVE' ? 'فعال' : vehicle.status === 'REPAIR' ? 'تعمیرگاه' : 'غیرفعال'}
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{vehicle.name}</h3>
            <div className="mt-1 flex items-center">
               <span className="text-[11px] font-bold text-slate-700 dark:text-slate-800 bg-amber-400 px-2 py-0.5 rounded-md border border-amber-500 shadow-sm flex items-center gap-2" dir="ltr">
                  <span className="tracking-widest">{vehicle.plate || 'نامشخص'}</span>
                  <div className="w-1 h-3 bg-blue-700 rounded-sm"></div>
               </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 z-20">
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onDelete(vehicle.id); }} title="حذف خودرو" className="relative p-2 rounded-xl transition-all text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer opacity-0 group-hover:opacity-100">
            <Trash2 className="w-5 h-5 transition-all" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onTogglePin(vehicle.id); }} className="relative p-2 rounded-xl transition-all cursor-pointer">
            {vehicle.isPinned && <motion.div animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.5, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-amber-400/80 blur-[10px] rounded-full z-0" />}
            <motion.div animate={vehicle.isPinned ? { rotate: 360 } : { rotate: 0 }} transition={vehicle.isPinned ? { duration: 8, repeat: Infinity, ease: "linear" } : { duration: 0.3 }} className="relative z-10">
              <Star className={`w-6 h-6 transition-all duration-300 ${vehicle.isPinned ? 'fill-amber-300 text-amber-100 drop-shadow-[0_0_12px_rgba(251,191,36,1)]' : 'text-slate-300 hover:text-amber-400 drop-shadow-sm'}`} />
            </motion.div>
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-700/50 relative z-10">
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-xl border border-white/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-bold text-slate-500 block mb-1">وضعیت بیمه ({vehicle.insuranceType || 'نامشخص'})</span>
          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> {vehicle.insuranceDate ? moment(vehicle.insuranceDate).format('jYYYY/jMM/jDD') : 'ثبت نشده'}
          </span>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-xl border border-white/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-bold text-slate-500 block mb-1">تراز مالی (سود/زیان)</span>
          <span className={`text-sm font-black flex items-center gap-1 ${mockProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {mockProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} {Math.abs(mockProfit).toLocaleString('fa-IR')} <span className="text-[10px]">تومان</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const SORT_OPTIONS = [
  { id: 'NEWEST', label: 'جدیدترین ثبت' },
  { id: 'NAME', label: 'الفبا (نام خودرو)' },
  { id: 'INSURANCE', label: 'نزدیک‌ترین انقضای بیمه' },
];

export default function VehiclesView({ activeTab, setActiveTab }: any) {
  const { vehicles, toggleVehiclePin, deleteVehicle } = useLogisticsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const [undoItems, setUndoItems] = useState<{ id: string, items: string[], expireAt: number }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            expired.forEach(u => u.items.forEach(id => deleteVehicle(id)));
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e=>e.items).includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteVehicle]);

  const triggerDelete = (ids: string[]) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: ids, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...ids]);
  };

  const processedVehicles = useMemo(() => {
    let result = [...vehicles];
    result = result.filter(v => !pendingDeleteIds.includes(v.id));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v => v.name.toLowerCase().includes(q) || v.plate.includes(q));
    }
    result.sort((a, b) => {
      if (sortBy.id === 'NAME') return a.name.localeCompare(b.name, 'fa');
      if (sortBy.id === 'NEWEST') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy.id === 'INSURANCE') {
         if (!a.insuranceDate) return 1;
         if (!b.insuranceDate) return -1;
         return new Date(a.insuranceDate).getTime() - new Date(b.insuranceDate).getTime();
      }
      return 0;
    });
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
    return result;
  }, [vehicles, searchQuery, sortBy, pendingDeleteIds]);

  return (
    <div className="w-full relative min-h-[80vh]">
      <AnimatePresence mode="wait">
        {selectedVehicleId ? (
          <motion.div key="profile-view" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="w-full">
             {/* 💡 اتصال هوشمند به کامپوننت پروفایل خودرو با ارسال آیدی و دکمه بازگشت */}
             <VehicleProfile 
               vehicleId={selectedVehicleId} 
               onBack={() => setSelectedVehicleId(null)} 
             />
          </motion.div>
        ) : (
          <motion.div key="list-view" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full space-y-6 pb-24">
            
            {/* هدر یکپارچه */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-5 bg-white/20 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] px-6 py-5 z-50 relative overflow-visible">
              
              <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1.5 rounded-2xl shadow-inner border border-white/50 dark:border-slate-700/50 w-full xl:w-auto shrink-0 overflow-x-auto glass-scroll">
                <button onClick={() => setActiveTab('VEHICLES')} className={`relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === 'VEHICLES' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  <Truck className="w-5 h-5" /> ناوگان خودرویی
                </button>
                <button onClick={() => setActiveTab('TOOLS')} className={`relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === 'TOOLS' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  <Wrench className="w-5 h-5" /> ابزارآلات و تجهیزات
                </button>
              </div>

              <div className="flex flex-wrap md:flex-nowrap items-center justify-end gap-4 w-full">
                {/* استفاده از سرچ نئونیِ پورت‌شده از SharedLaborUI */}
                <NeonSearchWrapper className="flex-1 w-full xl:w-auto min-w-[250px] h-[52px]">
                  <Search className="w-5 h-5 text-slate-400 shrink-0" />
                  <input placeholder="جستجو نام یا پلاک..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 transition-colors placeholder:text-slate-500" />
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4 text-slate-500 dark:text-slate-400" /></button>}
                </NeonSearchWrapper>

                <div className="relative shrink-0" ref={dropdownRef}>
                  <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="h-[52px] bg-white/40 dark:bg-slate-800/50 rounded-2xl border border-white/60 dark:border-slate-600/50 shadow-[0_8px_16px_rgba(0,0,0,0.03)] backdrop-blur-2xl flex items-center justify-between gap-3 px-5 min-w-[200px] text-sm font-black text-slate-700 dark:text-slate-200 transition-all hover:bg-white/80 dark:hover:bg-slate-700/80 hover:border-blue-300/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] focus:ring-2 focus:ring-blue-500/50">
                    <span className="truncate">{sortBy.label}</span>
                    <ChevronDown className={`w-4 h-4 text-blue-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute top-[calc(100%+8px)] w-full bg-white/90 dark:bg-slate-800/95 backdrop-blur-3xl border border-white/80 dark:border-slate-600/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-[100] flex flex-col py-2">
                        {SORT_OPTIONS.map((option) => (
                          <button key={option.id} onClick={() => { setSortBy(option); setIsDropdownOpen(false); }} className={`flex items-center justify-between px-5 py-3.5 text-sm font-bold transition-all relative overflow-hidden group ${sortBy.id === option.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>
                            <div className={`absolute inset-0 transition-opacity ${sortBy.id === option.id ? 'bg-blue-50 dark:bg-blue-500/10 opacity-100' : 'bg-slate-100 dark:bg-slate-700/50 opacity-0 group-hover:opacity-100'}`} />
                            <span className="relative z-10">{option.label}</span>
                            {sortBy.id === option.id && <Check className="w-4 h-4 relative z-10 drop-shadow-sm" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1.5 rounded-2xl shadow-inner border border-white/50 dark:border-slate-700/50 shrink-0 h-[52px] z-20">
                  <button onClick={() => setViewMode('GRID')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-5 h-5" /></button>
                  <button onClick={() => setViewMode('LIST')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}><ListIcon className="w-5 h-5" /></button>
                </div>

                <motion.button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsModalOpen(true); }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} className="h-[52px] px-7 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(59,130,246,0.4)] border-t-2 border-blue-300/50 transition-all shrink-0 w-full md:w-auto relative overflow-hidden group z-20">
                  <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                  <Plus className="w-5 h-5 relative z-10"/> <span className="relative z-10">خودروی جدید</span>
                </motion.button>
              </div>
            </div>

            {processedVehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white/20 dark:bg-slate-900/20 backdrop-blur-3xl rounded-[3rem] border-2 border-dashed border-blue-200/50 dark:border-slate-700">
                <ShieldAlert className="w-24 h-24 text-blue-300 dark:text-blue-900/50 mb-6 drop-shadow-xl" />
                <h3 className="text-2xl font-black text-slate-700 dark:text-slate-200">هیچ خودرویی یافت نشد!</h3>
                <p className="text-base font-bold text-slate-400 mt-2">جستجوی خود را تغییر دهید یا یک خودروی جدید ثبت کنید.</p>
              </div>
            ) : (
              <motion.div layout className={`grid gap-6 ${viewMode === 'GRID' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                <AnimatePresence>
                  {processedVehicles.map(vehicle => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} onTogglePin={toggleVehiclePin} onDelete={(id) => triggerDelete([id])} onClick={() => setSelectedVehicleId(vehicle.id)} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* استفاده‌ی مستقیم از پاپ‌آپ حذف تایمردارِ موجود در SharedLaborUI */}
            <FloatingUndoToast 
              undoItems={undoItems.map(u => ({ id: u.id, items: u.items }))} 
              onCancel={(undoId: string, items: string[]) => {
                setPendingDeleteIds(prev => prev.filter(id => !items.includes(id)));
                setUndoItems(prev => prev.filter(u => u.id !== undoId));
                toast.success('حذف لغو شد');
              }} 
            />

          </motion.div>
        )}
      </AnimatePresence>
      
      {isModalOpen && <VehicleFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}