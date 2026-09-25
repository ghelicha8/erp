// ============================================================================
// PART 1: Imports & Interfaces
// ============================================================================
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BellRing, AlertTriangle, CheckCircle, Info, Archive, Plus, 
  Settings, Volume2, VolumeX, Smartphone, Wifi, Radio, 
  Search, CalendarClock, CreditCard, Package, ArrowLeft, Trash2, X
} from 'lucide-react';
import { toast } from 'sonner';
import GlassSelect from '../../../../components/ui/GlassSelect';
import GlassDatePicker from '../../../../components/ui/GlassDatePicker';

// ============================================================================
// PART 2: Types & Mock Data (Mocks for Demonstration)
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
  actionLink?: string;
}

const INITIAL_ALERTS: Alert[] = [
  { id: '1', type: 'CRITICAL', category: 'CHEQUE', title: 'سررسید چک پرداختی (فردا)', description: 'چک شماره ۱۲۳۴۵ بانک ملی به مبلغ ۵۰,۰۰۰,۰۰۰ تومان فردا سررسید می‌شود. گیرنده: آهن‌آلات رحیمی.', date: '۱۴۰۳/۰۸/۱۵', isRead: false, actionText: 'مشاهده تراکنش' },
  { id: '2', type: 'WARNING', category: 'CHEQUE', title: 'یادآوری چک دریافتی (۵ روز دیگر)', description: 'چک شماره ۹۸۷۶۵ بانک ملت به مبلغ ۱۲۰,۰۰۰,۰۰۰ تومان ۵ روز دیگر سررسید می‌شود.', date: '۱۴۰۳/۰۸/۱۹', isRead: false },
  { id: '3', type: 'WARNING', category: 'INVENTORY', title: 'کاهش موجودی سیمان تیپ ۲', description: 'موجودی سیمان تیپ ۲ به زیر خط هشدار (۴۰ پاکت) رسیده است. لطفاً جهت جلوگیری از توقف کارگاه اقدام کنید.', date: '۱۴۰۳/۰۸/۱۴', isRead: false, actionText: 'ثبت فاکتور خرید' },
  { id: '4', type: 'INFO', category: 'CUSTOM', title: 'جلسه با ناظر پروژه', description: 'یادآور دستی: فردا ساعت ۱۰ صبح جلسه بررسی فاز ۲ با مهندس ناظر.', date: '۱۴۰۳/۰۸/۱۵', isRead: false },
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
// PART 3: Main Notification Center Component
// ============================================================================
export default function AlertsTab() {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Settings States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [smsMode, setSmsMode] = useState<'ONLINE' | 'DONGLE'>('ONLINE');
  const [donglePort, setDonglePort] = useState('COM3');

  // Custom Reminder Form States
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDesc, setReminderDesc] = useState('');
  const [reminderDate, setReminderDate] = useState('');

  // 💡 کپسول زمان‌دار برای آرشیو/حذف (۵ ثانیه)
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
    if (!reminderTitle || !reminderDate) {
      toast.error('عنوان و تاریخ یادآور الزامی است.');
      return;
    }
    const newAlert: Alert = {
      id: crypto.randomUUID(),
      type: 'INFO',
      category: 'CUSTOM',
      title: reminderTitle,
      description: reminderDesc,
      date: reminderDate,
      isRead: false,
    };
    setAlerts(prev => [newAlert, ...prev]);
    toast.success('یادآور دستی با موفقیت تنظیم شد.');
    setIsReminderModalOpen(false);
    setReminderTitle(''); setReminderDesc(''); setReminderDate('');
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
      
      {/* --- Header & Action Bar --- */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm rounded-[2rem] px-4 py-3 z-[90] relative">
        <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1.5 rounded-2xl w-full xl:w-auto">
          <button onClick={() => setActiveTab('ACTIVE')} className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all duration-300 ${activeTab === 'ACTIVE' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
            <BellRing className="w-4 h-4" /> فعال ({activeCount})
          </button>
          <button onClick={() => setActiveTab('ARCHIVE')} className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all duration-300 ${activeTab === 'ARCHIVE' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
            <Archive className="w-4 h-4" /> بایگانی
          </button>
        </div>

        <div className="flex-1 flex flex-col xl:flex-row items-center justify-end gap-3 w-full">
          <div className={`relative rounded-xl group bg-white/60 dark:bg-slate-800/60 backdrop-blur-md overflow-hidden flex-1 max-w-md h-[48px] border border-white/50 dark:border-slate-600/50 focus-within:border-indigo-500/50 transition-colors`}>
            <div className="w-full h-full bg-transparent flex items-center px-4">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input placeholder="جستجو در هشدارها..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 placeholder:text-slate-500" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500" /></button>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/50 dark:border-slate-600/50 text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition-colors shadow-sm" title="قطع/وصل صدای هشدار">
              {isSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-rose-500" />}
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/50 dark:border-slate-600/50 text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition-colors shadow-sm" title="تنظیمات پیامک و نوتیفیکیشن">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={() => setIsReminderModalOpen(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl font-black shadow-lg shadow-indigo-500/30 transition-all active:scale-95">
              <Plus className="w-5 h-5"/> یادآور جدید
            </button>
          </div>
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
                className="w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row gap-5 items-start sm:items-center relative overflow-hidden group"
              >
                {/* Accent Line */}
                <div className={`absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${config.gradient}`} />
                
                <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center shrink-0 border shadow-sm ${config.bg} ${config.color} ${config.border}`}>
                  <config.icon className="w-7 h-7" />
                </div>

                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-2 py-1 rounded-md flex items-center gap-1">
                      <CategoryIcon className="w-3 h-3" />
                      {alert.category === 'CHEQUE' ? 'امور مالی و چک' : alert.category === 'INVENTORY' ? 'انبار و مصالح' : 'یادآور سیستم'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{alert.date}</span>
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
                    <button className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-500/20">
                      {alert.actionText} <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {activeTab === 'ACTIVE' ? (
                    <button onClick={() => triggerAction(alert.id, 'ARCHIVE')} title="انتقال به بایگانی (فهمیدم)" className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-colors shadow-sm">
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  ) : (
                    <button onClick={() => triggerAction(alert.id, 'DELETE')} title="حذف دائمی" className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors shadow-sm">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          }) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-slate-200/50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-emerald-500 opacity-50" />
              </div>
              <h3 className="text-xl font-black text-slate-700 dark:text-slate-300">همه چیز مرتب است!</h3>
              <p className="text-sm font-bold text-slate-500 mt-2">هیچ هشدار خوانده‌نشده‌ای در سیستم وجود ندارد.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ======================================================== */}
      {/* PART 4: Sub-Components (Modals & Undo Capsule) */}
      {/* ======================================================== */}
      
      {/* کپسول شیشه‌ای ۵ ثانیه‌ای Undo */}
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
          <AnimatePresence>
            {undoItems.map(undo => (
              <motion.div
                key={undo.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto"
                dir="rtl"
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${undo.action === 'ARCHIVE' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600'}`}>
                  {undo.action === 'ARCHIVE' ? <Archive className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                </div>

                <div className="flex flex-col flex-1">
                  <span className="text-sm font-black text-slate-800 dark:text-white">
                    {undo.action === 'ARCHIVE' ? 'انتقال به بایگانی' : 'حذف دائمی'}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 mt-0.5">تا چند ثانیه دیگر اعمال می‌شود...</span>
                </div>

                <button
                  onClick={() => {
                    setPendingActionIds(prev => prev.filter(id => !undo.items.includes(id)));
                    setUndoItems(prev => prev.filter(u => u.id !== undo.id));
                    toast.success('عملیات لغو شد');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-colors shrink-0 shadow-sm"
                >
                  انصراف
                </button>

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
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReminderModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md p-6 rounded-[2rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/50 dark:border-slate-700 shadow-2xl space-y-4">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-lg font-black flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <CalendarClock className="w-6 h-6" /> یادآور سفارشی جدید
                  </h3>
                  <button onClick={() => setIsReminderModalOpen(false)} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-rose-500"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">عنوان یادآور *</label>
                    <input autoFocus value={reminderTitle} onChange={e => setReminderTitle(e.target.value)} placeholder="مثلاً: تمدید قرارداد بیمه" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none font-bold text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">تاریخ هشدار *</label>
                    <div className="h-[46px]"><GlassDatePicker value={reminderDate} onChange={setReminderDate} placeholder="انتخاب تاریخ..." /></div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">توضیحات تکمیلی</label>
                    <textarea value={reminderDesc} onChange={e => setReminderDesc(e.target.value)} placeholder="متن کامل پیام هشدار..." className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none font-medium text-sm resize-none h-24" />
                  </div>
                </div>

                <button onClick={handleCreateReminder} className="w-full py-4 mt-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" /> تنظیم و فعال‌سازی یادآور
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>, document.body
      )}

      {/* مودال تنظیمات پیامک (SMS & Integration) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isSettingsOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg p-6 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/50 dark:border-slate-700 shadow-2xl space-y-6">
                <div className="flex justify-between items-center mb-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-xl font-black flex items-center gap-2 text-slate-800 dark:text-white">
                    <Settings className="w-6 h-6 text-indigo-500" /> تنظیمات پیکربندی هشدارها
                  </h3>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-rose-500"><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-6">
                  {/* SMS Engine Toggle */}
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-indigo-500" /> موتور ارسال پیامک (SMS)
                    </label>
                    <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button onClick={() => setSmsMode('ONLINE')} className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg transition-all ${smsMode === 'ONLINE' ? 'bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-white/50'}`}>
                        <Wifi className="w-5 h-5" />
                        <span className="text-xs font-bold">وب‌سرویس (آنلاین)</span>
                      </button>
                      <button onClick={() => setSmsMode('DONGLE')} className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg transition-all ${smsMode === 'DONGLE' ? 'bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-white/50'}`}>
                        <Radio className="w-5 h-5" />
                        <span className="text-xs font-bold">دانگل GSM (کاملاً آفلاین)</span>
                      </button>
                    </div>
                  </div>

                  {/* Contextual Settings based on Engine */}
                  <AnimatePresence mode="wait">
                    {smsMode === 'ONLINE' ? (
                      <motion.div key="online" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-xl overflow-hidden">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-xs font-bold text-blue-800 dark:text-blue-300 leading-relaxed">
                            در این حالت، سیستم از طریق API به پنل‌های پیامکی متصل می‌شود. کارگاه باید در زمان سررسید هشدارها به اینترنت متصل باشد.
                          </p>
                        </div>
                        <input placeholder="کلید دسترسی (API Key)..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 dir-ltr" />
                      </motion.div>
                    ) : (
                      <motion.div key="dongle" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-xl overflow-hidden">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 leading-relaxed">
                            این حالت بالاترین سطح امنیت و پایداری را دارد. سیستم کاملاً آفلاین و از طریق ماژول سخت‌افزاری سیم‌کارت متصل به سرور لوکال پیامک ارسال می‌کند.
                          </p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 block">پورت سریال مودم (Serial Port)</label>
                          <input value={donglePort} onChange={e => setDonglePort(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 font-mono dir-ltr" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => { toast.success('پیکربندی با موفقیت ذخیره شد.'); setIsSettingsOpen(false); }} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-xl shadow-lg active:scale-95 transition-transform">
                    ذخیره تنظیمات سیستم
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>, document.body
      )}

    </motion.div>
  );
}