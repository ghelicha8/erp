import { useState, useMemo,  useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Star, Phone,
  Wallet, TrendingDown, LayoutGrid, List as ListIcon,
  ShieldAlert, X, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

// ایمپورت استور و کامپوننت‌ها
import { useClientStore } from '../../store/clientStore';
import type { Client } from '../../store/clientStore';
import ClientFormModal from './components/ClientFormModal';

// 💡 ایمپورت کامپوننت پروفایل
import ClientProfile from './ClientProfile';
import { NeonSearchWrapper, PortalSelect } from '../../components/ui/SharedLaborUI';

// ============================================================================
// کامپوننت نئونی جستجو
// ============================================================================

// ============================================================================
// کامپوننت کارت گرافیکی کارفرما
// ============================================================================
const ClientCard = ({ client, onTogglePin, onDelete, onClick }: { client: Client, onTogglePin: (id: string) => void, onDelete: (id: string) => void, onClick: () => void }) => {
  return (
    <motion.div 
      layout="position" 
      transition={{ 
        layout: { type: "spring", stiffness: 400, damping: 30, mass: 0.8 },
        opacity: { duration: 0.2 }
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
      onClick={onClick} 
      className={`relative backdrop-blur-2xl border rounded-[2rem] p-6 transition-colors duration-300 group overflow-hidden cursor-pointer ${
        client.isPinned 
          ? 'bg-white/70 dark:bg-slate-800/70 border-amber-400/60 dark:border-amber-500/60 shadow-[0_15px_40px_rgba(245,158,11,0.2)]' 
          : 'bg-white/50 dark:bg-slate-900/50 border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:border-indigo-300/50'
      }`}
    >
      {client.isPinned && (
        <motion.div 
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.25, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/20 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none" 
        />
      )}

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            {client.avatar ? (
              <img src={client.avatar} alt={client.name} className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-700" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg border-2 border-white/80 dark:border-slate-700">
                {client.name.substring(0, 1)}
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 rounded-lg px-1.5 py-0.5 shadow-md border border-slate-100 dark:border-slate-700 flex items-center gap-0.5 text-[10px] font-black text-amber-500">
              {client.creditScore} <Star className="w-3 h-3 fill-amber-500" />
            </div>
          </div>
          
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {client.name} <span className="text-indigo-600 dark:text-indigo-400">{client.lastName}</span>
            </h3>
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md w-max px-2 py-1 rounded-md border border-white/50 dark:border-slate-600 shadow-sm">
              <Phone className="w-3 h-3 text-indigo-400" /> {client.phone}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 z-20">
          <motion.button 
            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); onDelete(client.id); }} 
            title="حذف شخص"
            className="relative p-2 rounded-xl transition-all text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-5 h-5 transition-all" />
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); onTogglePin(client.id); }}
            className="relative p-2 rounded-xl transition-all cursor-pointer"
          >
            {client.isPinned && (
              <motion.div 
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.5, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 bg-amber-400/80 blur-[10px] rounded-full z-0"
              />
            )}
            <motion.div 
              animate={client.isPinned ? { rotate: 360 } : { rotate: 0 }} 
              transition={client.isPinned ? { duration: 8, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
              className="relative z-10"
            >
              <Star className={`w-6 h-6 transition-all duration-300 ${client.isPinned ? 'fill-amber-300 text-amber-100 drop-shadow-[0_0_12px_rgba(251,191,36,1)]' : 'text-slate-300 hover:text-amber-400 drop-shadow-sm'}`} />
            </motion.div>
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-700/50 relative z-10">
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-xl border border-white/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-bold text-slate-500 block mb-1">موجودی کیف پول</span>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Wallet className="w-4 h-4" /> {client.walletBalance.toLocaleString('fa-IR')} <span className="text-[10px]">تومان</span>
          </span>
        </div>
        
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-xl border border-white/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-bold text-slate-500 block mb-1">بدهی پروژه‌ها</span>
          <span className="text-sm font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <TrendingDown className="w-4 h-4" /> ۰ <span className="text-[10px]">تومان</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const SORT_OPTIONS = [
  { id: 'LAST_NAME', label: 'الفبا (نام خانوادگی)' },
  { id: 'WALLET', label: 'بیشترین موجودی کیف پول' },
  { id: 'CREDIT', label: 'بالاترین رتبه اعتباری' },
  { id: 'HIGHEST_DEBT', label: 'بیشترین بدهی (بدهکارترین)' },
  { id: 'HIGHEST_PAID', label: 'بیشترین پرداختی (خوش‌حساب)' },
];

export default function ClientCenter() {
  const { clients, togglePin, deleteClient } = useClientStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [undoItems, setUndoItems] = useState<{ id: string, items: string[], expireAt: number }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            expired.forEach(u => u.items.forEach(id => deleteClient(id)));
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e=>e.items).includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteClient]);

  const triggerDelete = (ids: string[]) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: ids, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...ids]);
  };

  const processedClients = useMemo(() => {
    let result = [...clients];
    
    result = result.filter(c => !pendingDeleteIds.includes(c.id));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.lastName && c.lastName.toLowerCase().includes(q)) ||
        c.phone.includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortBy.id === 'LAST_NAME') {
        const nameA = (a.lastName || a.name).toLowerCase();
        const nameB = (b.lastName || b.name).toLowerCase();
        return nameA.localeCompare(nameB, 'fa');
      }
      if (sortBy.id === 'WALLET') return b.walletBalance - a.walletBalance;
      if (sortBy.id === 'CREDIT') return b.creditScore - a.creditScore;
      if (sortBy.id === 'HIGHEST_DEBT') return 0; 
      if (sortBy.id === 'HIGHEST_PAID') return 0; 
      return 0;
    });
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
    return result;
  }, [clients, searchQuery, sortBy, pendingDeleteIds]);

  return (
    <div className="w-full relative min-h-screen">
      <AnimatePresence mode="wait">
        
        {selectedClientId ? (
          <motion.div
            key="profile-view"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full"
          >
            <ClientProfile 
              clientId={selectedClientId} 
              onBack={() => setSelectedClientId(null)} 
            />
          </motion.div>
        ) : (
          
          <motion.div
            key="list-view"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full space-y-6 pb-24"
          >
            <div className="flex flex-col xl:flex-row items-center justify-between gap-5 bg-white/20 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] px-6 py-5 z-50 relative overflow-visible">
              <div className="flex items-center gap-4 w-full xl:w-auto">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-[0_0_25px_rgba(99,102,241,0.5)]">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-indigo-800 dark:from-white dark:to-indigo-300 drop-shadow-sm">مشتریان و کارفرمایان</h2>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">مدیریت یکپارچه اشخاص، قراردادها و حساب‌ها</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-4 w-full">
                <NeonSearchWrapper className="flex-1 w-full xl:w-auto min-w-[200px] h-[52px]">
                  <Search className="w-5 h-5 text-slate-400 shrink-0" />
                  <input 
                    placeholder="جستجو نام یا شماره..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 transition-colors placeholder:text-slate-500" 
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')} 
                      className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </button>
                  )}
                </NeonSearchWrapper>

                <div className="shrink-0 min-w-[240px] h-[52px]">
                  <PortalSelect options={SORT_OPTIONS} value={sortBy.id} onChange={(id: any) => setSortBy(SORT_OPTIONS.find(o => o.id === id)!)} placeholder="مرتب‌سازی" className="!rounded-2xl" />
                </div>

                <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1.5 rounded-2xl shadow-inner border border-white/50 dark:border-slate-700/50 shrink-0 h-[52px] z-20">
                  <button onClick={() => setViewMode('GRID')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-5 h-5" /></button>
                  <button onClick={() => setViewMode('LIST')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}><ListIcon className="w-5 h-5" /></button>
                </div>

                {/* 💡 حل مشکل Event Bubbling با اضافه کردن e.stopPropagation() */}
                <motion.button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsModalOpen(true);
                  }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  className="h-[52px] px-7 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(16,185,129,0.4)] border-t-2 border-emerald-300/50 transition-all shrink-0 w-full md:w-auto relative overflow-hidden group z-20"
                >
                  <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                  <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.8 }} className="relative z-10 flex"><Users className="w-5 h-5" /></motion.span> <span className="relative z-10">شخص جدید</span>
                </motion.button>
              </div>
            </div>

            {processedClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white/20 dark:bg-slate-900/20 backdrop-blur-3xl rounded-[3rem] border-2 border-dashed border-indigo-200/50 dark:border-slate-700">
                <ShieldAlert className="w-24 h-24 text-indigo-300 dark:text-indigo-900/50 mb-6 drop-shadow-xl" />
                <h3 className="text-2xl font-black text-slate-700 dark:text-slate-200">هیچ مشتری یا کارفرمایی یافت نشد!</h3>
                <p className="text-base font-bold text-slate-400 mt-2">جستجوی خود را تغییر دهید یا یک شخص جدید ثبت کنید.</p>
              </div>
            ) : (
              <motion.div layout className={`grid gap-6 ${viewMode === 'GRID' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                <AnimatePresence>
                  {processedClients.map(client => (
                    <ClientCard 
                      key={client.id} 
                      client={client} 
                      onTogglePin={togglePin} 
                      onDelete={(id) => triggerDelete([id])}
                      onClick={() => setSelectedClientId(client.id)} 
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {typeof document !== 'undefined' && createPortal(
              <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
                <AnimatePresence>
                  {undoItems.map(undo => (
                    <motion.div 
                      key={undo.id} 
                      initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                      className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto"
                      dir="rtl"
                    >
                      <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0">
                        <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-500" />
                      </div>
                      
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-black text-slate-800 dark:text-white">
                          {undo.items.length > 1 ? `${undo.items.length} شخص در حال حذف` : 'شخص در حال حذف'}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                          تا چند ثانیه دیگر پاک می‌شود...
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => { 
                          setPendingDeleteIds(prev => prev.filter(id => !undo.items.includes(id))); 
                          setUndoItems(prev => prev.filter(u => u.id !== undo.id)); 
                          toast.success('عملیات لغو شد'); 
                        }} 
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-black transition-colors shrink-0 shadow-sm cursor-pointer"
                      >
                        انصراف
                      </button>

                      <motion.div 
                        initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} 
                        className="absolute bottom-0 right-0 h-1 bg-rose-500" style={{ transformOrigin: 'right' }}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>, document.body
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 💡 اطمینان از رندر شدن مودال با کاندیشنال */}
      {isModalOpen && (
        <ClientFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}