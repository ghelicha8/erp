import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BellRing, AlertTriangle, CheckCircle, Info, Archive, Plus, 
  Search, CalendarClock, CreditCard, Package, ArrowLeft, Trash2, X, Clock
} from 'lucide-react';
import { toast } from 'sonner';

import GlassDatePicker from '../../components/ui/GlassDatePicker';

// ============================================================================
// کامپوننت‌های پایه و استاندارد (الزام UI سیستم)
// ============================================================================
const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

// ============================================================================
// 💎 ساعت کرونوگراف هوشمند (حل مشکل چپ‌چین اعداد و رنگ خط‌چین‌ها)
// ============================================================================
const LuxuryTimePicker = ({ value, onChange, placeholder = "انتخاب ساعت..." }: { value: string, onChange: (v: string) => void, placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'h' | 'm'>('h');
  const [isDragging, setIsDragging] = useState(false);
  const clockRef = useRef<HTMLDivElement>(null);

  const currentHour = value ? parseInt(value.split(':')[0]) : 12;
  const currentMinute = value ? parseInt(value.split(':')[1]) : 0;
  
  const isPM = currentHour >= 12;
  const displayHour = currentHour % 12 || 12;

  const handRotation = view === 'h' ? displayHour * 30 : currentMinute * 6;
  const numbers = view === 'h' ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const updateTimeFromEvent = (clientX: number, clientY: number, forceSwitchView = false) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (view === 'h') {
      let h = Math.round(angle / 30) % 12;
      if (h === 0) h = 12;
      const newHour = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
      onChange(`${newHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);
      if (forceSwitchView) setTimeout(() => setView('m'), 300);
    } else {
      let m = Math.round(angle / 6) % 60;
      onChange(`${currentHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      if (forceSwitchView) setTimeout(() => setIsOpen(false), 400);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateTimeFromEvent(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) updateTimeFromEvent(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      updateTimeFromEvent(e.clientX, e.clientY, true);
    }
  };

  return (
    <div className="relative w-full h-full">
      <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => setIsOpen(true)} className="w-full h-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 flex items-center justify-between outline-none font-bold text-sm text-slate-700 dark:text-slate-300 hover:border-indigo-500 transition-colors shadow-inner z-[50]">
        <span style={{ direction: 'ltr' }} className="tracking-widest">{value || placeholder}</span>
        <Clock className={`w-4 h-4 transition-colors ${isOpen ? 'text-indigo-500' : 'text-slate-400'}`} />
      </motion.button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsOpen(false); setView('h'); }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)', y: 20 }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)', y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative p-6 rounded-[2.5rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/50 dark:border-indigo-500/30 shadow-[0_30px_80px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_80px_rgba(99,102,241,0.25)] flex flex-col items-center gap-6 w-[340px]"
              >
                {/* 💡 حل مشکل جابه‌جا بودن ساعت و دقیقه (استفاده از direction: ltr اجباری) */}
                <div style={{ direction: 'ltr' }} className="flex items-center gap-3 text-5xl font-black text-slate-800 dark:text-white">
                  <button onClick={() => setView('h')} className={`transition-all duration-300 ${view === 'h' ? 'text-indigo-500 drop-shadow-md scale-110' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}>
                    {displayHour.toString().padStart(2, '0')}
                  </button>
                  <span className="text-slate-300 dark:text-slate-700 pb-2">:</span>
                  <button onClick={() => setView('m')} className={`transition-all duration-300 ${view === 'm' ? 'text-indigo-500 drop-shadow-md scale-110' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}>
                    {currentMinute.toString().padStart(2, '0')}
                  </button>
                </div>

                <div 
                  ref={clockRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  className="relative w-64 h-64 rounded-full bg-slate-50 dark:bg-slate-800/80 shadow-[inset_0_5px_15px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_10px_30px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-700/50 flex items-center justify-center cursor-pointer select-none touch-none"
                >
                  {/* 💡 خط‌چین‌ها: مشکی در لایت‌مود، سفید در دارک‌مود */}
                  {[...Array(60)].map((_, i) => (
                    <div key={i} className="absolute inset-0 flex justify-center pointer-events-none z-10" style={{ transform: `rotate(${i * 6}deg)` }}>
                      <div className={`rounded-full mt-2 transition-colors ${i % 5 === 0 ? 'bg-indigo-600 dark:bg-indigo-400 w-[3px] h-[14px]' : 'bg-slate-900 dark:bg-white w-[2px] h-[8px]'}`} />
                    </div>
                  ))}

                  <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-md z-30" />
                  
                  <motion.div
                    className="absolute w-1 bg-indigo-500 origin-bottom rounded-full z-10 pointer-events-none"
                    style={{ height: 75, bottom: '50%' }}
                    animate={{ rotate: handRotation }}
                    transition={isDragging ? { type: 'tween', duration: 0 } : { type: 'spring', stiffness: 250, damping: 20 }}
                  />
                  
                  <motion.div
                    className="absolute inset-0 z-20 pointer-events-none"
                    animate={{ rotate: handRotation }}
                    transition={isDragging ? { type: 'tween', duration: 0 } : { type: 'spring', stiffness: 250, damping: 20 }}
                  >
                    <div className="absolute top-[13px] left-1/2 -translate-x-1/2 w-10 h-10 border-[3px] border-indigo-500 rounded-full shadow-lg bg-white dark:bg-slate-900 flex items-center justify-center">
                      <motion.span 
                        className="text-sm font-black text-indigo-500"
                        animate={{ rotate: -handRotation }}
                        transition={isDragging ? { type: 'tween', duration: 0 } : { type: 'spring', stiffness: 250, damping: 20 }}
                      >
                        {view === 'h' ? displayHour : currentMinute}
                      </motion.span>
                    </div>
                  </motion.div>

                  {numbers.map(num => {
                    const angle = (num / (view === 'h' ? 12 : 60)) * 2 * Math.PI - Math.PI / 2;
                    const x = Math.cos(angle) * 95;
                    const y = Math.sin(angle) * 95;
                    
                    return (
                      <div
                        key={num}
                        className="absolute w-10 h-10 flex items-center justify-center text-sm font-bold z-0 pointer-events-none text-slate-800 dark:text-slate-300"
                        style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: 'translate(-50%, -50%)' }}
                      >
                        {num === 0 && view === 'h' ? 12 : num}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => { if (isPM) onChange(`${(currentHour - 12).toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`); }} 
                    className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all duration-300 border ${!isPM ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    AM (قبل از ظهر)
                  </button>
                  <button 
                    onClick={() => { if (!isPM) onChange(`${(currentHour + 12).toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`); }} 
                    className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all duration-300 border ${isPM ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    PM (بعد از ظهر)
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

// ============================================================================
// Types & Mock Data
// ============================================================================
type AlertType = 'CRITICAL' | 'WARNING' | 'INFO';
type AlertCategory = 'CHEQUE' | 'INVENTORY' | 'CUSTOM';

interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  title: string;
  description: string;
  date: string;
  isRead: boolean;
  actionText?: string;
}

const INITIAL_ALERTS: Alert[] = [
  { id: '1', type: 'CRITICAL', category: 'CHEQUE', title: 'سررسید چک پرداختی (فردا)', description: 'چک شماره ۱۲۳۴۵ بانک ملی به مبلغ ۵۰,۰۰۰,۰۰۰ تومان فردا سررسید می‌شود. گیرنده: آهن‌آلات رحیمی.', date: '۱۴۰۳/۰۸/۱۵ - ۰۸:۰۰', isRead: false, actionText: 'مشاهده تراکنش' },
  { id: '2', type: 'WARNING', category: 'CHEQUE', title: 'یادآوری چک دریافتی (۵ روز دیگر)', description: 'چک شماره ۹۸۷۶۵ بانک ملت به مبلغ ۱۲۰,۰۰۰,۰۰۰ تومان ۵ روز دیگر سررسید می‌شود.', date: '۱۴۰۳/۰۸/۱۹ - ۱۰:۳۰', isRead: false },
  { id: '3', type: 'WARNING', category: 'INVENTORY', title: 'کاهش موجودی سیمان تیپ ۲', description: 'موجودی سیمان تیپ ۲ به زیر خط هشدار (۴۰ پاکت) رسیده است. لطفاً جهت جلوگیری از توقف کارگاه اقدام کنید.', date: '۱۴۰۳/۰۸/۱۴ - ۱۴:۱۵', isRead: false, actionText: 'ثبت فاکتور خرید' },
];

const CONFIG_COLORS = {
  CRITICAL: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', gradient: 'from-rose-500 to-pink-600' },
  WARNING: { icon: BellRing, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', gradient: 'from-amber-400 to-orange-500' },
  INFO: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', gradient: 'from-blue-400 to-indigo-500' },
};

const CATEGORY_ICONS = {
  CHEQUE: CreditCard,
  INVENTORY: Package,
  CUSTOM: CalendarClock,
};

// ============================================================================
// Main Notification Center Component
// ============================================================================
export default function AlertsCenter() {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDesc, setReminderDesc] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');

  const [undoItems, setUndoItems] = useState<{ id: string, items: string[], expireAt: number, action: 'ARCHIVE' | 'DELETE' }[]>([]);
  const [pendingActionIds, setPendingActionIds] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            expired.forEach(u => {
              if (u.action === 'ARCHIVE') {
                setAlerts(curr => curr.map(a => u.items.includes(a.id) ? { ...a, isRead: true } : a));
              } else {
                setAlerts(curr => curr.filter(a => !u.items.includes(a.id)));
              }
            });
            setTimeout(() => setPendingActionIds(curr => curr.filter(id => !expired.flatMap(e=>e.items).includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const triggerAction = (id: string, action: 'ARCHIVE' | 'DELETE') => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: [id], expireAt: Date.now() + 5000, action }]);
    setPendingActionIds(prev => [...prev, id]);
  };

  const handleCreateReminder = () => {
    if (!reminderTitle || !reminderDate || !reminderTime) {
      toast.error('عنوان، تاریخ و ساعت یادآور الزامی است.');
      return;
    }
    const newAlert: Alert = {
      id: crypto.randomUUID(),
      type: 'INFO',
      category: 'CUSTOM',
      title: reminderTitle,
      description: reminderDesc,
      date: `${reminderDate} - ${reminderTime}`,
      isRead: false,
    };
    setAlerts(prev => [newAlert, ...prev]);
    toast.success('یادآور دستی با موفقیت تنظیم شد.');
    setIsReminderModalOpen(false);
    setReminderTitle(''); setReminderDesc(''); setReminderDate(''); setReminderTime('');
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (pendingActionIds.includes(a.id)) return false;
      const matchTab = activeTab === 'ACTIVE' ? !a.isRead : a.isRead;
      const matchSearch = a.title.includes(searchQuery) || a.description.includes(searchQuery);
      return matchTab && matchSearch;
    });
  }, [alerts, activeTab, searchQuery, pendingActionIds]);

  const activeCount = alerts.filter(a => !a.isRead && !pendingActionIds.includes(a.id)).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6 pb-24 relative">
      
      {/* ================= HEADER & ACTION BAR ================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm rounded-[2rem] px-6 py-4 z-[90] relative">
        
        <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1.5 rounded-2xl w-full xl:w-auto shrink-0 shadow-inner border border-white/50 dark:border-slate-700/50">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('ACTIVE')} className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-colors ${activeTab === 'ACTIVE' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <BellRing className="w-4 h-4" /> فعال ({activeCount})
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('ARCHIVE')} className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-colors ${activeTab === 'ARCHIVE' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <Archive className="w-4 h-4" /> بایگانی
          </motion.button>
        </div>

        <div className="flex-1 flex flex-col xl:flex-row items-center justify-end gap-4 w-full">
          <NeonSearchWrapper className="flex-1 w-full max-w-md h-[46px] sm:h-[48px]">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input 
              placeholder="جستجو در هشدارها..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 placeholder:text-slate-500 transition-colors" 
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </motion.button>
              )}
            </AnimatePresence>
          </NeonSearchWrapper>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setIsReminderModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl font-black shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all">
            <Plus className="w-5 h-5"/> یادآور جدید
          </motion.button>
        </div>
      </div>

      {/* --- Main Alerts List --- */}
      <div className="space-y-4 relative z-10 min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.length > 0 ? filteredAlerts.map(alert => {
            const config = CONFIG_COLORS[alert.type];
            const CategoryIcon = CATEGORY_ICONS[alert.category];
            
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: activeTab === 'ACTIVE' ? 100 : -100 }}
                transition={{ duration: 0.3 }}
                key={alert.id} 
                className="w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row gap-5 items-start sm:items-center relative overflow-hidden group hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-shadow"
              >
                <div className={`absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${config.gradient}`} />
                
                <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center shrink-0 border shadow-sm ${config.bg} ${config.color} ${config.border}`}>
                  <config.icon className="w-7 h-7" />
                </motion.div>

                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-2 py-1 rounded-md flex items-center gap-1 border border-slate-300 dark:border-slate-700">
                      <CategoryIcon className="w-3 h-3" />
                      {alert.category === 'CHEQUE' ? 'امور مالی و چک' : alert.category === 'INVENTORY' ? 'انبار و مصالح' : 'یادآور سیستم'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> <span style={{ direction: 'ltr' }}>{alert.date}</span></span>
                  </div>
                  <h3 className={`text-lg font-black ${alert.type === 'CRITICAL' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                    {alert.title}
                  </h3>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                    {alert.description}
                  </p>
                </div>

                <div className="w-full sm:w-auto flex items-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-r border-slate-200 dark:border-slate-700 pt-4 sm:pt-0 sm:pr-5 mt-2 sm:mt-0">
                  {alert.actionText && activeTab === 'ACTIVE' && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-500/20 shadow-sm">
                      {alert.actionText} <ArrowLeft className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                  {activeTab === 'ACTIVE' ? (
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => triggerAction(alert.id, 'ARCHIVE')} title="انتقال به بایگانی (فهمیدم)" className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-colors shadow-sm border border-slate-200 dark:border-slate-700">
                      <CheckCircle className="w-5 h-5" />
                    </motion.button>
                  ) : (
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => triggerAction(alert.id, 'DELETE')} title="حذف دائمی" className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors shadow-sm border border-slate-200 dark:border-slate-700">
                      <Trash2 className="w-5 h-5" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          }) : (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }} className="w-24 h-24 bg-slate-200/50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 shadow-inner border border-white/50 dark:border-slate-700">
                <CheckCircle className="w-10 h-10 text-emerald-500 opacity-60" />
              </motion.div>
              <h3 className="text-xl font-black text-slate-700 dark:text-slate-300 drop-shadow-sm">همه چیز مرتب است!</h3>
              <p className="text-sm font-bold text-slate-500 mt-2">هیچ هشدار خوانده‌نشده‌ای در سیستم وجود ندارد.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ======================================================== */}
      {/* MODALS & UNDO CAPSULE */}
      {/* ======================================================== */}
      
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
          <AnimatePresence>
            {undoItems.map(undo => (
              <motion.div
                key={undo.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto" dir="rtl"
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${undo.action === 'ARCHIVE' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600'}`}>
                  {undo.action === 'ARCHIVE' ? <Archive className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-black text-slate-800 dark:text-white">{undo.action === 'ARCHIVE' ? 'انتقال به بایگانی' : 'حذف دائمی'}</span>
                  <span className="text-[10px] font-medium text-slate-500 mt-0.5">تا چند ثانیه دیگر اعمال می‌شود...</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setPendingActionIds(prev => prev.filter(id => !undo.items.includes(id)));
                    setUndoItems(prev => prev.filter(u => u.id !== undo.id));
                    toast.success('عملیات لغو شد');
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black shadow-sm border border-slate-200 dark:border-slate-700"
                >
                  انصراف
                </motion.button>
                <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} className={`absolute bottom-0 right-0 h-1 ${undo.action === 'ARCHIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ transformOrigin: 'right' }} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>, document.body
      )}

      {/* مودال یادآور دستی */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isReminderModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReminderModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md p-6 rounded-[2rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/50 dark:border-slate-700 shadow-[0_20px_60px_rgba(0,0,0,0.3)] space-y-5">
                <div className="flex justify-between items-center mb-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-lg font-black flex items-center gap-2 text-indigo-600 dark:text-indigo-400 drop-shadow-sm">
                    <CalendarClock className="w-6 h-6" /> یادآور سفارشی جدید
                  </h3>
                  <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setIsReminderModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors shadow-sm"><X className="w-4 h-4" /></motion.button>
                </div>
                
                <div className="space-y-4 relative z-10">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">عنوان یادآور *</label>
                    <input autoFocus value={reminderTitle} onChange={e => setReminderTitle(e.target.value)} placeholder="مثلاً: تمدید قرارداد بیمه" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none font-bold text-sm focus:border-indigo-500 transition-colors shadow-inner text-slate-800 dark:text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative z-[60]">
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">تاریخ هشدار *</label>
                      <div className="h-[46px]"><GlassDatePicker value={reminderDate} onChange={setReminderDate} placeholder="انتخاب تاریخ..." /></div>
                    </div>
                    <div className="relative z-[50]">
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">ساعت هشدار *</label>
                      <div className="h-[46px]">
                        <LuxuryTimePicker value={reminderTime} onChange={setReminderTime} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">توضیحات تکمیلی</label>
                    <textarea value={reminderDesc} onChange={e => setReminderDesc(e.target.value)} placeholder="متن کامل پیام هشدار..." className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none font-medium text-sm resize-none h-24 focus:border-indigo-500 transition-colors shadow-inner modal-scrollbar text-slate-800 dark:text-white" />
                  </div>
                </div>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={handleCreateReminder} className="w-full py-4 mt-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-black rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 transition-all">
                  <CheckCircle className="w-5 h-5" /> تنظیم و فعال‌سازی یادآور
                </motion.button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>, document.body
      )}

    </motion.div>
  );
}