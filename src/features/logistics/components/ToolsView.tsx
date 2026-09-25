import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, Search, Star, ShieldAlert, LayoutGrid, List as ListIcon, 
  Plus, ChevronDown, Check, X, Trash2, Activity, Ban, Handshake, PenTool, Hash, Truck
} from 'lucide-react';
import { toast } from 'sonner';

import { useLogisticsStore } from '../../../store/logisticsStore';
import type { ToolProfile } from '../../../store/logisticsStore';
import ToolFormModal from './ToolFormModal'; 

// 💡 ایمپورت دقیق سرچ نئونیِ چرخان از کامپوننت‌های مرکزی SharedLaborUI
import { NeonSearchWrapper } from '../../../components/ui/SharedLaborUI';

const ToolCard = ({ tool, onTogglePin, onDelete, onClick }: { tool: ToolProfile, onTogglePin: (id: string) => void, onDelete: (id: string) => void, onClick: () => void }) => {
  const mockValue = 8500000; 

  return (
    <motion.div 
      layout="position" transition={{ layout: { type: "spring", stiffness: 400, damping: 30, mass: 0.8 }, opacity: { duration: 0.2 } }}
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
      onClick={onClick} 
      className={`relative backdrop-blur-2xl border rounded-[2rem] p-6 transition-colors duration-300 group overflow-hidden cursor-pointer ${tool.isPinned ? 'bg-white/70 dark:bg-slate-800/70 border-amber-400/60 dark:border-amber-500/60 shadow-[0_15px_40px_rgba(245,158,11,0.2)]' : 'bg-white/50 dark:bg-slate-900/50 border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:border-purple-300/50'}`}
    >
      {tool.isPinned && (
        <motion.div animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.25, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/20 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            {tool.photo ? (
              <img src={tool.photo} alt={tool.name} className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-700" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white text-xl font-black shadow-lg border-2 border-white/80 dark:border-slate-700">
                <PenTool className="w-7 h-7" />
              </div>
            )}
            <div className={`absolute -bottom-2 -right-2 rounded-lg px-1.5 py-0.5 shadow-md border flex items-center gap-0.5 text-[10px] font-black ${tool.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : tool.status === 'REPAIR' ? 'bg-amber-100 text-amber-600 border-amber-200' : tool.status === 'RENTED' ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {tool.status === 'ACTIVE' && <Activity className="w-3 h-3" />}
              {tool.status === 'REPAIR' && <Wrench className="w-3 h-3" />}
              {tool.status === 'RENTED' && <Handshake className="w-3 h-3" />}
              {tool.status === 'UNAVAILABLE' && <Ban className="w-3 h-3" />}
              {tool.status === 'ACTIVE' ? 'آماده کار' : tool.status === 'REPAIR' ? 'تعمیرگاه' : tool.status === 'RENTED' ? 'اجاره رفته' : 'غیرفعال'}
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{tool.name}</h3>
            <div className="mt-1 flex items-center">
               <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1" dir="ltr">
                  <Hash className="w-3 h-3 text-purple-400" />
                  <span className="tracking-widest">{tool.serialNumber || 'بدون سریال'}</span>
               </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 z-20">
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onDelete(tool.id); }} title="حذف ابزار" className="relative p-2 rounded-xl transition-all text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer opacity-0 group-hover:opacity-100">
            <Trash2 className="w-5 h-5 transition-all" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onTogglePin(tool.id); }} className="relative p-2 rounded-xl transition-all cursor-pointer">
            {tool.isPinned && <motion.div animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.5, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-amber-400/80 blur-[10px] rounded-full z-0" />}
            <motion.div animate={tool.isPinned ? { rotate: 360 } : { rotate: 0 }} transition={tool.isPinned ? { duration: 8, repeat: Infinity, ease: "linear" } : { duration: 0.3 }} className="relative z-10">
              <Star className={`w-6 h-6 transition-all duration-300 ${tool.isPinned ? 'fill-amber-300 text-amber-100 drop-shadow-[0_0_12px_rgba(251,191,36,1)]' : 'text-slate-300 hover:text-amber-400 drop-shadow-sm'}`} />
            </motion.div>
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-700/50 relative z-10">
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-xl border border-white/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-bold text-slate-500 block mb-1">تاریخ ثبت سیستم</span>
          <span className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">{new Date(tool.createdAt).toLocaleDateString('fa-IR')}</span>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-xl border border-white/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-bold text-slate-500 block mb-1">ارزش تقریبی (دفتری)</span>
          <span className="text-sm font-black text-purple-600 dark:text-purple-400 flex items-center gap-1">
            {mockValue.toLocaleString('fa-IR')} <span className="text-[10px]">تومان</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const SORT_OPTIONS = [
  { id: 'NEWEST', label: 'جدیدترین ثبت' },
  { id: 'NAME', label: 'الفبا (نام ابزار)' },
  { id: 'SERIAL', label: 'بر اساس سریال اموال' },
];

export default function ToolsView({ activeTab, setActiveTab }: any) {
  const { tools, toggleToolPin, deleteTool } = useLogisticsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);

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
            expired.forEach(u => u.items.forEach(id => deleteTool(id)));
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e=>e.items).includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteTool]);

  const triggerDelete = (ids: string[]) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: ids, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...ids]);
  };

  const processedTools = useMemo(() => {
    let result = [...tools];
    result = result.filter(t => !pendingDeleteIds.includes(t.id));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.serialNumber.includes(q));
    }
    result.sort((a, b) => {
      if (sortBy.id === 'NAME') return a.name.localeCompare(b.name, 'fa');
      if (sortBy.id === 'NEWEST') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy.id === 'SERIAL') return a.serialNumber.localeCompare(b.serialNumber);
      return 0;
    });
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
    return result;
  }, [tools, searchQuery, sortBy, pendingDeleteIds]);

  return (
    <div className="w-full relative min-h-[80vh]">
      <AnimatePresence mode="wait">
        {selectedToolId ? (
          <motion.div key="profile-view" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="w-full">
             <div className="p-10 text-center text-slate-500 font-bold">پروفایل ابزارآلات به زودی متصل می‌شود... <button onClick={() => setSelectedToolId(null)} className="text-purple-500 hover:underline">بازگشت</button></div>
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
                <NeonSearchWrapper className="flex-1 w-full xl:w-auto min-w-[250px] h-[52px]">
                  <Search className="w-5 h-5 text-slate-400 shrink-0" />
                  <input placeholder="جستجو نام یا سریال..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 transition-colors placeholder:text-slate-500" />
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4 text-slate-500 dark:text-slate-400" /></button>}
                </NeonSearchWrapper>

                <div className="relative shrink-0" ref={dropdownRef}>
                  <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="h-[52px] bg-white/40 dark:bg-slate-800/50 rounded-2xl border border-white/60 dark:border-slate-600/50 shadow-[0_8px_16px_rgba(0,0,0,0.03)] backdrop-blur-2xl flex items-center justify-between gap-3 px-5 min-w-[200px] text-sm font-black text-slate-700 dark:text-slate-200 transition-all hover:bg-white/80 dark:hover:bg-slate-700/80 hover:border-purple-300/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] focus:ring-2 focus:ring-purple-500/50">
                    <span className="truncate">{sortBy.label}</span>
                    <ChevronDown className={`w-4 h-4 text-purple-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute top-[calc(100%+8px)] w-full bg-white/90 dark:bg-slate-800/95 backdrop-blur-3xl border border-white/80 dark:border-slate-600/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-[100] flex flex-col py-2">
                        {SORT_OPTIONS.map((option) => (
                          <button key={option.id} onClick={() => { setSortBy(option); setIsDropdownOpen(false); }} className={`flex items-center justify-between px-5 py-3.5 text-sm font-bold transition-all relative overflow-hidden group ${sortBy.id === option.id ? 'text-purple-600 dark:text-purple-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>
                            <div className={`absolute inset-0 transition-opacity ${sortBy.id === option.id ? 'bg-purple-50 dark:bg-purple-500/10 opacity-100' : 'bg-slate-100 dark:bg-slate-700/50 opacity-0 group-hover:opacity-100'}`} />
                            <span className="relative z-10">{option.label}</span>
                            {sortBy.id === option.id && <Check className="w-4 h-4 relative z-10 drop-shadow-sm" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1.5 rounded-2xl shadow-inner border border-white/50 dark:border-slate-700/50 shrink-0 h-[52px] z-20">
                  <button onClick={() => setViewMode('GRID')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-5 h-5" /></button>
                  <button onClick={() => setViewMode('LIST')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}><ListIcon className="w-5 h-5" /></button>
                </div>

                <motion.button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsModalOpen(true); }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} className="h-[52px] px-7 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(168,85,247,0.4)] border-t-2 border-purple-300/50 transition-all shrink-0 w-full md:w-auto relative overflow-hidden group z-20">
                  <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                  <Plus className="w-5 h-5 relative z-10"/> <span className="relative z-10">ابزار جدید</span>
                </motion.button>
              </div>
            </div>

            {processedTools.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white/20 dark:bg-slate-900/20 backdrop-blur-3xl rounded-[3rem] border-2 border-dashed border-purple-200/50 dark:border-slate-700">
                <ShieldAlert className="w-24 h-24 text-purple-300 dark:text-purple-900/50 mb-6 drop-shadow-xl" />
                <h3 className="text-2xl font-black text-slate-700 dark:text-slate-200">هیچ ابزاری یافت نشد!</h3>
                <p className="text-base font-bold text-slate-400 mt-2">جستجوی خود را تغییر دهید یا یک ابزار جدید ثبت کنید.</p>
              </div>
            ) : (
              <motion.div layout className={`grid gap-6 ${viewMode === 'GRID' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                <AnimatePresence>
                  {processedTools.map(tool => (
                    <ToolCard key={tool.id} tool={tool} onTogglePin={toggleToolPin} onDelete={(id) => triggerDelete([id])} onClick={() => setSelectedToolId(tool.id)} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* پاپ‌آپ حذف تایمردارِ گرافیکی */}
            {typeof document !== 'undefined' && createPortal(
              <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
                <AnimatePresence>
                  {undoItems.map(undo => (
                    <motion.div key={undo.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto" dir="rtl">
                      <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0"><Trash2 className="w-5 h-5 text-rose-600" /></div>
                      <div className="flex flex-col flex-1"><span className="text-sm font-black text-slate-800 dark:text-white">{undo.items.length > 1 ? `${undo.items.length} ابزار در حال حذف` : 'ابزار در حال حذف'}</span><span className="text-[10px] font-medium text-slate-500 mt-0.5">تا چند ثانیه دیگر پاک می‌شود...</span></div>
                      <button onClick={() => { setPendingDeleteIds(prev => prev.filter(id => !undo.items.includes(id))); setUndoItems(prev => prev.filter(u => u.id !== undo.id)); toast.success('حذف لغو شد'); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-colors shrink-0 cursor-pointer">انصراف</button>
                      <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} className="absolute bottom-0 right-0 h-1 bg-rose-500" style={{ transformOrigin: 'right' }} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>, document.body
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {isModalOpen && <ToolFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}