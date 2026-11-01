import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BellRing, AlertTriangle, CheckCircle, Info, Archive, Plus, 
  Search, CalendarClock, CreditCard, Package, ArrowLeft, Trash2, X, Clock,
  LayoutList, LayoutGrid, ShieldCheck, Mail, MailOpen, RotateCcw, ChevronDown, ChevronUp,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';

import GlassDatePicker from '../../components/ui/GlassDatePicker';
import { AppSearchInput, LuxuryTimePicker } from '../../components/ui/SharedLaborUI';
import { useAlertStore, type Alert } from '../../store/useAlertStore';
import { useSettingsStore } from '../../store/settingsStore';
import { generateUUID } from '../../core/utils/uuid';
import ArchivingEnvelope from './components/ArchivingEnvelope';

const CONFIG_COLORS = {
  CRITICAL: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', gradient: 'from-rose-500 to-pink-600' },
  WARNING: { icon: BellRing, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', gradient: 'from-amber-400 to-orange-500' },
  INFO: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', gradient: 'from-blue-400 to-indigo-500' },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  CHEQUE: CreditCard,
  INVENTORY: Package,
  CUSTOM: CalendarClock,
  PROJECT: ShieldCheck,
  INSURANCE: ShieldAlert,
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'CHEQUE': return 'چک و مالی';
    case 'INVENTORY': return 'انبار و متریال';
    case 'PROJECT': return 'پروژه و کارگاه';
    case 'INSURANCE': return 'بیمه خودرو و اقساط';
    default: return 'یادآور سیستم';
  }
};

export default function AlertsCenter() {
  const { alerts, addCustomAlert, archiveAlert, unarchiveAlert, deleteAlert, scanSystemAlerts } = useAlertStore();
  const { settings } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
  const [layoutView, setLayoutView] = useState<'LIST' | 'GRID'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedArchivedIds, setExpandedArchivedIds] = useState<string[]>([]);
  
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDesc, setReminderDesc] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');

  // حالت‌های انیمیشن پاکت و کرکره بایگانی
  const [animatingAlert, setAnimatingAlert] = useState<Alert | null>(null);
  const [isArchiveShutterOpen, setIsArchiveShutterOpen] = useState(false);
  const archiveButtonRef = useRef<HTMLButtonElement>(null);

  // Undo Capsule
  const [undoItems, setUndoItems] = useState<{ id: string, alertId: string, expireAt: number, action: 'DELETE' }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  // اجرای اسکنر هوشمند سیستم در اولین اجرا
  useEffect(() => {
    scanSystemAlerts();
  }, [scanSystemAlerts]);

  // مدیریت صف Undo برای حذف دائمی
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
        const expired = prev.filter(u => u.expireAt <= now);
        const active = prev.filter(u => u.expireAt > now);
        if (expired.length > 0) {
          expired.forEach(u => {
            deleteAlert(u.alertId);
          });
          setTimeout(() => {
            setPendingDeleteIds(curr => curr.filter(id => !expired.map(e => e.alertId).includes(id)));
          }, 0);
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteAlert]);

  // مدیریت اکشن بایگانی (با انیمیشن پاکت یا بدون آن)
  const handleArchive = (alert: Alert) => {
    if (animatingAlert) return; // جلوگیری قطعی از تکرار یا تداخل همزمان
    const shouldAnimate = settings.enableEnvelopeAnimation ?? true;

    if (shouldAnimate) {
      setAnimatingAlert(alert);
      setIsArchiveShutterOpen(true);
    } else {
      archiveAlert(alert.id);
      toast.success('اعلان به بایگانی منتقل شد.');
    }
  };

  // پایان انیمیشن پاکت بایگانی و بسته شدن کرکره دریافت
  const handleEnvelopeComplete = () => {
    if (animatingAlert) {
      const alertId = animatingAlert.id;
      archiveAlert(alertId);
      toast.success('اعلان با موفقیت در بایگانی ذخیره شد.');
      setAnimatingAlert(null);
      setTimeout(() => {
        setIsArchiveShutterOpen(false);
      }, 250);
    } else {
      setIsArchiveShutterOpen(false);
    }
  };

  // مدیریت حذف دائمی با امکان لغو (Undo)
  const handleDelete = (id: string) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, alertId: id, expireAt: Date.now() + 5000, action: 'DELETE' }]);
    setPendingDeleteIds(prev => [...prev, id]);
  };

  const toggleArchivedExpand = (id: string) => {
    setExpandedArchivedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleUnarchive = (id: string) => {
    unarchiveAlert(id);
    toast.success('اعلان به کارتابل فعال بازگردانده شد.');
  };

  const handleCreateReminder = () => {
    if (!reminderTitle || !reminderDate || !reminderTime) {
      toast.error('عنوان، تاریخ و ساعت یادآور الزامی است.');
      return;
    }

    addCustomAlert({
      type: 'INFO',
      category: 'CUSTOM',
      title: reminderTitle,
      description: reminderDesc,
      date: `${reminderDate} - ${reminderTime}`,
    });

    toast.success('یادآور دستی با موفقیت تنظیم شد.');
    setIsReminderModalOpen(false);
    setReminderTitle('');
    setReminderDesc('');
    setReminderDate('');
    setReminderTime('');
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (pendingDeleteIds.includes(a.id)) return false;
      if (animatingAlert && a.id === animatingAlert.id) return false;
      const matchTab = activeTab === 'ACTIVE' ? !a.isArchived : a.isArchived;
      const matchSearch = a.title.includes(searchQuery) || a.description.includes(searchQuery);
      return matchTab && matchSearch;
    });
  }, [alerts, activeTab, searchQuery, pendingDeleteIds, animatingAlert]);

  const activeCount = alerts.filter(a => !a.isArchived && !pendingDeleteIds.includes(a.id)).length;
  const archivedCount = alerts.filter(a => a.isArchived && !pendingDeleteIds.includes(a.id)).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6 pb-24 relative" dir="rtl">
      
      {/* کامپوننت انیمیشن پاکت بایگانی */}
      <AnimatePresence>
        {animatingAlert && (
          <ArchivingEnvelope
            alert={animatingAlert}
            onComplete={handleEnvelopeComplete}
            archiveButtonRef={archiveButtonRef}
          />
        )}
      </AnimatePresence>

      {/* ================= HEADER & ACTION BAR ================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm rounded-[2rem] px-6 py-4 z-[90] relative">
        
        {/* دکمه‌های سوئیچ تب (فعال / بایگانی) با انیمیشن کرکره کشویی */}
        <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1.5 rounded-2xl w-full sm:w-auto shrink-0 shadow-inner border border-white/50 dark:border-slate-700/50">
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.95 }} 
            onClick={() => setActiveTab('ACTIVE')} 
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all ${
              activeTab === 'ACTIVE' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <BellRing className="w-4 h-4" /> فعال ({activeCount})
          </motion.button>

          <motion.button 
            ref={archiveButtonRef}
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.95 }} 
            onClick={() => setActiveTab('ARCHIVE')} 
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all relative overflow-hidden ${
              activeTab === 'ARCHIVE' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            } ${
              isArchiveShutterOpen 
                ? 'ring-4 ring-indigo-500/50 shadow-[0_0_25px_rgba(99,102,241,0.6)] animate-pulse text-indigo-600 dark:text-indigo-300' 
                : ''
            }`}
          >
            <Archive className={`w-4 h-4 transition-transform duration-200 ${isArchiveShutterOpen ? 'scale-125 text-indigo-500 animate-bounce' : ''}`} />
            <span className="flex items-center gap-1.5">
              <span>بایگانی</span>
              <motion.span 
                key={archivedCount}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold"
              >
                {archivedCount}
              </motion.span>
            </span>

            {/* انیمیشن کشویی / کرکره‌ای مکش پاکت به داخل تب بایگانی */}
            {isArchiveShutterOpen && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                exit={{ scaleX: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 bg-gradient-to-r from-indigo-500/25 via-purple-500/35 to-indigo-500/25 border-b-2 border-indigo-500 pointer-events-none flex items-center justify-center"
              >
                <div className="w-full h-0.5 bg-white shadow-[0_0_8px_#fff] animate-pulse" />
              </motion.div>
            )}
          </motion.button>
        </div>

        {/* بخش جستجو، سوئیچ چیدمان (List/Grid) و دکمه یادآور */}
        <div className="flex-1 flex flex-wrap items-center justify-end gap-3 w-full">
          
          {/* اینپوت جستجوی یکپارچه */}
          <div className="flex-1 min-w-[220px] max-w-md">
            <AppSearchInput
              placeholder="جستجو در هشدارها و پیام‌ها..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full h-[46px] sm:h-[48px]"
            />
          </div>

          {/* دکمه گرافیکی سوئیچ چیدمان دوحالته (سطری / کارتی) */}
          <div className="flex items-center bg-slate-200/50 dark:bg-slate-800/80 p-1 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-inner">
            <button
              type="button"
              onClick={() => setLayoutView('LIST')}
              className={`p-2.5 rounded-xl transition-all ${
                layoutView === 'LIST'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="نمایش سطری (List View)"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutView('GRID')}
              className={`p-2.5 rounded-xl transition-all ${
                layoutView === 'GRID'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="نمایش کارتی (Grid View)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* دکمه یادآور جدید */}
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.95 }} 
            onClick={() => setIsReminderModalOpen(true)} 
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl font-black shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all shrink-0 text-sm"
          >
            <Plus className="w-4 h-4"/> یادآور جدید
          </motion.button>
        </div>
      </div>

      {/* ================= MAIN ALERTS CONTAINER ================= */}
      <div className="relative z-10 min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.length > 0 ? (
            <div className={layoutView === 'GRID' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5' : 'space-y-4'}>
              {filteredAlerts.map(alert => {
                const config = CONFIG_COLORS[alert.type] || CONFIG_COLORS.INFO;
                const CategoryIcon = CATEGORY_ICONS[alert.category] || BellRing;
                
                const isArchivedTab = activeTab === 'ARCHIVE';
                const isExpanded = expandedArchivedIds.includes(alert.id);
                const shouldAnimateEnvelope = settings.enableEnvelopeAnimation ?? true;

                /* ================= حالت تب بایگانی: کارت‌های پاکت‌نامه‌ای مینیمال ================= */
                if (isArchivedTab) {
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -15 }}
                      transition={{ duration: 0.25 }}
                      key={alert.id}
                      onClick={() => toggleArchivedExpand(alert.id)}
                      className={`w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border transition-all cursor-pointer rounded-3xl relative overflow-hidden group shadow-md hover:shadow-xl ${
                        isExpanded
                          ? 'border-indigo-400 dark:border-indigo-500/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {/* نوار گرادیانت نشانگر دسته‌بندی در لبه بالای پاکت */}
                      <div className={`h-1.5 w-full bg-gradient-to-r ${config.gradient}`} />

                      <div className="p-5">
                        {/* سربرگ پاکت نامه: مهر مومی/آیکون، عنوان و کپسول وضعیت (چیدمان استاندارد بدون تداخل) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                          {/* بخش راست: آیکون، برچسب‌ها و عنوان */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* نشان مهر پاکت */}
                            <motion.div
                              whileHover={{ rotate: 12, scale: 1.05 }}
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-all ${
                                isExpanded
                                  ? 'bg-indigo-500 text-white border-indigo-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {isExpanded ? <MailOpen className="w-5 h-5" /> : <Mail className="w-5 h-5 text-indigo-500" />}
                            </motion.div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-[10px] font-black tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200 dark:border-slate-700 shrink-0">
                                  <CategoryIcon className="w-3 h-3 text-indigo-500" />
                                  {getCategoryLabel(alert.category)}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3" /> <span dir="ltr">{alert.date}</span>
                                </span>
                              </div>
                              <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white truncate">
                                {alert.title}
                              </h3>
                            </div>
                          </div>

                          {/* بخش چپ: وضعیت کپسول مهر و موم و دکمه باز/بسته شدن */}
                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/40">
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800/50 whitespace-nowrap">
                              {isExpanded ? 'نامه باز است' : 'پاکت مهر و موم شده'}
                            </span>
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-indigo-600 transition-colors shrink-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* محتوای نامه در حال باز شدن (Unfolding Letter) */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={shouldAnimateEnvelope ? { opacity: 0, height: 0, y: -10 } : false}
                              animate={shouldAnimateEnvelope ? { opacity: 1, height: 'auto', y: 0 } : {}}
                              exit={shouldAnimateEnvelope ? { opacity: 0, height: 0, y: -10 } : {}}
                              transition={{ duration: 0.25, ease: 'easeOut' }}
                              className="overflow-hidden pt-4"
                            >
                              <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 mt-2 space-y-4">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-black text-indigo-500">متن کامل اعلان بایگانی‌شده:</span>
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {alert.description}
                                  </p>
                                </div>

                                {/* دکمه‌های اقدام روی نامه */}
                                <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnarchive(alert.id);
                                    }}
                                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-500/30 transition-colors"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>بازگردانی به کارتابل فعال</span>
                                  </motion.button>

                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(alert.id);
                                    }}
                                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-rose-200 dark:border-rose-500/30 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>حذف دائمی</span>
                                  </motion.button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                }

                /* ================= حالت تب فعال: نمایش سطری یا کارتی ================= */
                return layoutView === 'LIST' ? (
                  /* ================= نمای سطری فعال (LIST VIEW) ================= */
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: 100 }}
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
                          {getCategoryLabel(alert.category)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> <span dir="ltr">{alert.date}</span>
                        </span>
                      </div>
                      <h3 className={`text-lg font-black ${alert.type === 'CRITICAL' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                        {alert.title}
                      </h3>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                        {alert.description}
                      </p>
                    </div>

                    <div className="w-full sm:w-auto flex items-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-r border-slate-200 dark:border-slate-700 pt-4 sm:pt-0 sm:pr-5 mt-2 sm:mt-0">
                      {alert.actionText && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-500/20 shadow-sm">
                          {alert.actionText} <ArrowLeft className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                      
                      <motion.button 
                        whileHover={{ scale: 1.1 }} 
                        whileTap={{ scale: 0.9 }} 
                        onClick={() => handleArchive(alert)} 
                        title="انتقال به بایگانی" 
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  /* ================= نمای کارتی فعال (GRID VIEW) ================= */
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.3 }}
                    key={alert.id} 
                    className="w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex flex-col justify-between gap-5 relative overflow-hidden group hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-1"
                  >
                    <div className={`absolute right-0 top-0 left-0 h-1.5 bg-gradient-to-r ${config.gradient}`} />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm ${config.bg} ${config.color} ${config.border}`}>
                            <config.icon className="w-6 h-6" />
                          </motion.div>
                          <span className="text-[10px] font-black tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-2 py-1 rounded-md flex items-center gap-1 border border-slate-300 dark:border-slate-700">
                            <CategoryIcon className="w-3 h-3" />
                            {getCategoryLabel(alert.category)}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> <span dir="ltr">{alert.date}</span>
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h3 className={`text-base font-black ${alert.type === 'CRITICAL' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                          {alert.title}
                        </h3>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                          {alert.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-200/60 dark:border-slate-700/60 mt-auto">
                      {alert.actionText ? (
                        <button className="px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl flex items-center gap-1 border border-indigo-200 dark:border-indigo-500/20 shadow-sm">
                          {alert.actionText} <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                      ) : <div />}

                      <motion.button 
                        whileHover={{ scale: 1.1 }} 
                        whileTap={{ scale: 0.9 }} 
                        onClick={() => handleArchive(alert)} 
                        title="انتقال به بایگانی" 
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-colors shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs font-bold"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>بایگانی</span>
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }} className="w-24 h-24 bg-slate-200/50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 shadow-inner border border-white/50 dark:border-slate-700">
                <CheckCircle className="w-10 h-10 text-emerald-500 opacity-60" />
              </motion.div>
              <h3 className="text-xl font-black text-slate-700 dark:text-slate-300 drop-shadow-sm">همه چیز مرتب است!</h3>
              <p className="text-sm font-bold text-slate-500 mt-2">
                {activeTab === 'ACTIVE' ? 'هیچ هشدار فعالی در سیستم وجود ندارد.' : 'هیچ هشداری در بایگانی یافت نشد.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================= MODALS & UNDO CAPSULE ================= */}
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
          <AnimatePresence>
            {undoItems.map(undo => (
              <motion.div
                key={undo.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto" dir="rtl"
              >
                <div className="p-2.5 rounded-xl shrink-0 bg-rose-100 dark:bg-rose-500/20 text-rose-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-black text-slate-800 dark:text-white">حذف دائمی اعلان</span>
                  <span className="text-[10px] font-medium text-slate-500 mt-0.5">تا چند ثانیه دیگر اعمال می‌شود...</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setPendingDeleteIds(prev => prev.filter(id => id !== undo.alertId));
                    setUndoItems(prev => prev.filter(u => u.id !== undo.id));
                    toast.success('عملیات حذف لغو شد.');
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black shadow-sm border border-slate-200 dark:border-slate-700"
                >
                  انصراف
                </motion.button>
                <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} className="absolute bottom-0 right-0 h-1 bg-rose-500" style={{ transformOrigin: 'right' }} />
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