import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { 
  Package, AlertTriangle, PlusCircle, MinusCircle, 
  X, CheckCircle, ChevronDown,
  History, BarChart2, Calendar, Edit, Trash2, Search,
  PieChart, Activity, RefreshCcw, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  PieChart as RechartsPieChart, Pie
} from 'recharts';

import GlassDatePicker from '../../../../components/ui/GlassDatePicker';
import GlassSelect from '../../../../components/ui/GlassSelect';
import { useProjectStore } from '../../store/projectStore';

// 💡 اضافه کردن استور خرید برای محاسبه دقیق موجودی انبار از طریق فاکتورهای جدید
import { usePurchaseStore } from '../../../../store/purchaseStore';

interface InventoryTabProps {
  projectId: string;
}

const toEnglishDigits = (str: string) => {
  if (!str) return '';
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicNumbers  = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.split('').map(c => {
    let pIdx = persianNumbers.indexOf(c);
    if (pIdx >= 0) return pIdx;
    let aIdx = arabicNumbers.indexOf(c);
    if (aIdx >= 0) return aIdx;
    return c;
  }).join('');
};

const normalizeDate = (d: string) => {
  if (!d) return '';
  return toEnglishDigits(d).split('/').map(p => p.padStart(2, '0')).join('/');
};

const getTodayDate = () => {
  const d = new Date().toLocaleDateString('fa-IR');
  return normalizeDate(d);
};

const formatAmount = (value: string | number) => value.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const parseAmount = (val?: string) => Number((val || '0').replace(/,/g, ''));

const AnimatedNumber = ({ value, format = true }: { value: number, format?: boolean }) => {
  const count = useMotionValue(0);
  const displayValue = useTransform(count, (latest) => format ? Math.round(latest).toLocaleString() : Math.round(latest));
  useEffect(() => { const controls = animate(0, value, { duration: 1.5, ease: "easeOut", onUpdate: (v) => count.set(v) }); return controls.stop; }, [value, count]);
  return <motion.span>{displayValue}</motion.span>;
};

const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

const GlassInputWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl bg-white/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm focus-within:border-indigo-500/60 transition-all duration-300 overflow-hidden flex items-center ${className}`}>
    {children}
  </div>
);

const NeedleFuelGauge = ({ current, max }: { current: number, max: number }) => {
  const percentage = Math.min(Math.max((current / max) * 100, 0), 100);
  let colorClass = 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]'; 
  let strokeColor = '#f59e0b';
  let isCritical = false;

  if (percentage > 50) { colorClass = 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]'; strokeColor = '#34d399'; } 
  else if (percentage <= 20) { colorClass = 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'; strokeColor = '#f43f5e'; isCritical = true; }

  const targetAngle = (percentage / 100) * 180 - 90;
  const circumference = Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const [angle, setAngle] = useState(-90);

  useEffect(() => {
    const controls = animate(-90, targetAngle, { duration: 1.5, ease: "easeOut", onUpdate: setAngle });
    return controls.stop;
  }, [targetAngle]);

  return (
    <div className="flex flex-col items-center gap-1 relative">
      {isCritical && <AlertTriangle className="absolute -top-2 -right-4 w-4 h-4 text-rose-500 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] z-20" />}
      <div className="relative w-20 h-12 flex items-end justify-center overflow-hidden">
        <svg viewBox="0 0 100 60" className="w-full h-full overflow-visible">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-slate-200 dark:text-slate-700 opacity-50" />
          <motion.path initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset }} transition={{ duration: 1.5, ease: "easeOut" }} d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={strokeColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} style={{ filter: `drop-shadow(0 0 4px ${strokeColor})` }} />
          <g transform={`rotate(${angle}, 50, 50)`}>
            <polygon points="48.5,50 50,15 51.5,50" fill={strokeColor} className="drop-shadow-md" />
            <line x1="50" y1="50" x2="50" y2="15" stroke="white" strokeWidth="0.5" opacity="0.5" />
          </g>
          <circle cx="50" cy="50" r="5" fill="#1e293b" className="dark:fill-white" />
          <circle cx="50" cy="50" r="2.5" fill={strokeColor} />
        </svg>
      </div>
      <span className={`text-[11px] font-black font-mono ${colorClass} mt-1 tracking-wider`}><AnimatedNumber value={Math.round(percentage)} format={false} />%</span>
    </div>
  );
};

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] text-slate-800 dark:text-white font-bold text-xs" dir="rtl">
        <p className="mb-3 border-b border-slate-200 dark:border-slate-700 pb-2 text-indigo-600 dark:text-indigo-400">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-6 my-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-600 dark:text-slate-300">
                {entry.name === 'current' ? 'موجودی فعلی' : entry.name === 'add' ? 'افزایش انبار' : entry.name === 'consume' ? 'مصرف مصالح' : entry.name}
              </span>
            </div>
            <span className="font-black font-mono text-sm" dir="ltr" style={{ color: entry.color }}>
               {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function InventoryTab({ projectId }: InventoryTabProps) {
  const allProjects = useProjectStore(state => state.projects);
  const project = allProjects.find(p => p.id === projectId); 
  const addConsumeRecord = useProjectStore(state => state.addConsumeRecord);
  const deleteConsumeRecord = useProjectStore(state => state.deleteConsumeRecord);

  // 💡 فراخوانی خریدهای کل سیستم برای اتصال انبار به خریدهای جدید
  const allPurchases = usePurchaseStore((state) => state.purchases);

  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'HISTORY' | 'ANALYTICS'>('OVERVIEW');

  const [items] = useState([
    { id: '1', name: 'سیمان پرتلند تیپ ۲', max: 2000, defaultUnit: 'پاکت', availableUnits: ['پاکت', 'تن', 'فله'] },
    { id: '2', name: 'میلگرد ۱۴ اصفهان', max: 1000, defaultUnit: 'شاخه', availableUnits: ['شاخه', 'کیلوگرم', 'تن'] },
    { id: '3', name: 'گچ سمنان', max: 1500, defaultUnit: 'کیسه', availableUnits: ['کیسه', 'تن'] },
    { id: '4', name: 'آجر نسوز نما پلاک', max: 20000, defaultUnit: 'قالب', availableUnits: ['قالب', 'پالت'] },
    { id: '5', name: 'پودر سنگ لاشه', max: 1000, defaultUnit: 'کیسه', availableUnits: ['کیسه', 'تن'] },
  ]);

  const [undoItems, setUndoItems] = useState<{ id: string, items: string[], expireAt: number }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const transactions = useMemo(() => {
    // 💡 اضافه کردن فاکتورهای خریدی که مستقیما تو دیتابیس Purchase ثبت شدن به عنوان "ورودی انبار"
    const projectPurchases = allPurchases.filter(p => p.projectId === projectId);
    
    const adds = projectPurchases.map((p: any, idx: number) => {
      const matchedItem = items.find(i => p.title.includes(i.name)) || items[0]; 
      return { id: p.id, itemId: matchedItem.id, type: 'ADD', amount: p.quantity, unit: p.unit, date: p.date, note: `خرید از ${p.vendor}`, _index: idx };
    });

    const consumes = (project?.consumptions || []).map((c: any, idx: number) => {
      const matchedItem = items.find(i => i.id === c.itemId) || items[0];
      return {
        id: c.id, itemId: c.itemId || matchedItem.id, type: 'CONSUME', amount: c.quantity, unit: c.unit, date: c.date,
        note: c.reason === 'USE' ? 'مصرف کارگاهی' : c.reason === 'WASTE' ? 'خرابی و ضایعات' : 'انتقال به پروژه دیگر',
        _index: idx + 10000 
      };
    });

    return [...adds, ...consumes];
  }, [allPurchases, project?.consumptions, items, projectId]);

  const [actionModal, setActionModal] = useState<{ isOpen: boolean; item: any; editId?: string }>({ isOpen: false, item: null });
  const [actionAmount, setActionAmount] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [actionDate, setActionDate] = useState('');

  const [consumeReason, setConsumeReason] = useState<'USE' | 'WASTE' | 'TRANSFER'>('USE');
  const [isBillable, setIsBillable] = useState(true);
  const [destProject, setDestProject] = useState('');
  const [consumeValue, setConsumeValue] = useState('');

  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState('ALL');
  const [aMaterial, setAMaterial] = useState('ALL');
  const [aDateFrom, setADateFrom] = useState('');
  const [aDateTo, setADateTo] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            expired.forEach(u => u.items.forEach(id => deleteConsumeRecord(projectId, id)));
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e=>e.items).includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteConsumeRecord, projectId]);

  const triggerDelete = (id: string, type: string) => {
    if (type === 'ADD') {
      toast.error('این یک فاکتور خرید است. برای لغو آن باید فاکتور خرید را از بخش تدارکات باطل کنید.');
      return;
    }
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: [id], expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, id]);
  };

  const itemsWithStock = useMemo(() => {
    return items.map(item => {
      const txs = transactions.filter(t => t.itemId === item.id && !pendingDeleteIds.includes(t.id));
      const added = txs.filter(t => t.type === 'ADD').reduce((sum, t) => sum + t.amount, 0);
      const consumed = txs.filter(t => t.type === 'CONSUME').reduce((sum, t) => sum + t.amount, 0);
      return { ...item, current: added - consumed };
    });
  }, [items, transactions, pendingDeleteIds]);

  const otherProjects = useMemo(() => {
    return allProjects.filter(p => p.id !== projectId).map(p => ({ value: p.id, label: p.title || p.name || 'پروژه بدون نام' }));
  }, [allProjects, projectId]);

  const openModal = (type: 'ADD' | 'CONSUME', item: any) => {
    if (type === 'ADD') {
      toast.info(`برای افزایش موجودی ${item.name} لطفاً فاکتور خرید ثبت کنید.`);
      document.dispatchEvent(new CustomEvent('open-new-purchase-modal'));
      return;
    }

    setActionModal({ isOpen: true, item });
    setActionAmount('');
    setSelectedUnit(item.defaultUnit);
    setActionDate(getTodayDate());
    setConsumeReason('USE');
    setIsBillable(true);
    setDestProject('');
    setConsumeValue('');
  };

  const handleActionSubmit = () => {
    const amount = Number(actionAmount);
    if (!amount || amount <= 0 || !actionDate) return toast.error('لطفاً مقدار و تاریخ معتبر وارد کنید.');

    const itemStock = itemsWithStock.find(i => i.id === actionModal.item.id)?.current || 0;
    if (amount > itemStock) return toast.error('مقدار خروجی نمی‌تواند بیشتر از موجودی انبار باشد!');

    if (consumeReason === 'TRANSFER' && !destProject) return toast.error('لطفاً پروژه مقصد را مشخص کنید.');
    
    const showCostInput = consumeReason === 'TRANSFER' || (consumeReason === 'WASTE' && !isBillable);
    let parsedCost = 0;
    if (showCostInput) {
      parsedCost = parseAmount(consumeValue);
      if (parsedCost <= 0) return toast.error('برای انتقال یا ثبت ضرر پیمانکار، وارد کردن ارزش ریالی الزامی است.');
    }

    addConsumeRecord(projectId, {
      itemId: actionModal.item.id,
      title: actionModal.item.name,
      date: normalizeDate(actionDate),
      quantity: amount,
      unit: selectedUnit,
      reason: consumeReason,
      isBillable: consumeReason === 'WASTE' ? isBillable : true,
      destinationProjectId: consumeReason === 'TRANSFER' ? destProject : undefined,
      internalCost: parsedCost,
      billedCost: parsedCost,
      note: 'ثبت خروج از انبار توسط کاربر'
    });

    toast.success('خروج کالا از انبار با موفقیت در سیستم ثبت شد.');
    setActionModal({ isOpen: false, item: null });
  };

  const analyticsTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (pendingDeleteIds.includes(t.id)) return false;
      const matchMaterial = aMaterial === 'ALL' ? true : t.itemId === aMaterial;
      const tDateNorm = normalizeDate(t.date);
      const fDateNorm = normalizeDate(aDateFrom);
      const toDateNorm = normalizeDate(aDateTo);
      const matchFrom = fDateNorm ? tDateNorm >= fDateNorm : true;
      const matchTo = toDateNorm ? tDateNorm <= toDateNorm : true;
      return matchMaterial && matchFrom && matchTo;
    });
  }, [transactions, aMaterial, aDateFrom, aDateTo, pendingDeleteIds]);

  const barChartData = useMemo(() => {
    return itemsWithStock
      .filter(i => aMaterial === 'ALL' || i.id === aMaterial)
      .map(item => ({ name: item.name, current: item.current }));
  }, [itemsWithStock, aMaterial]);

  const pieChartData = useMemo(() => {
    const totalAdd = analyticsTransactions.filter(t => t.type === 'ADD').reduce((sum, t) => sum + t.amount, 0);
    const totalConsume = analyticsTransactions.filter(t => t.type === 'CONSUME').reduce((sum, t) => sum + t.amount, 0);
    return [
      { name: 'افزایش انبار', value: totalAdd, color: '#10b981' },
      { name: 'مصرف شده', value: totalConsume, color: '#f43f5e' }
    ];
  }, [analyticsTransactions]);

  const lineChartData = useMemo(() => {
    const sortedTxs = [...analyticsTransactions].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b._index - a._index;
    });

    if (sortedTxs.length === 0) return [];
    const groups: Record<string, { add: number, consume: number }> = {};
    sortedTxs.forEach(t => {
      const key = t.date; 
      if (!groups[key]) groups[key] = { add: 0, consume: 0 };
      if (t.type === 'ADD') groups[key].add += t.amount;
      if (t.type === 'CONSUME') groups[key].consume += t.amount;
    });
    return Object.keys(groups).sort().map(k => ({ label: k, add: groups[k].add, consume: groups[k].consume }));
  }, [analyticsTransactions]);

  const MATERIAL_OPTIONS = [
    { value: 'ALL', label: 'همه مصالح' },
    ...items.map(i => ({ value: i.id, label: i.name }))
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6">
      
      <div className="flex justify-center w-full relative z-[90]">
        <div className="flex p-1.5 backdrop-blur-2xl bg-white/40 dark:bg-slate-900/40 border border-white/60 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-x-auto modal-scrollbar">
          <button onClick={() => setActiveSubTab('OVERVIEW')} className={`relative px-6 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeSubTab === 'OVERVIEW' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
            {activeSubTab === 'OVERVIEW' && <motion.div layoutId="invTab" className="absolute inset-0 bg-white dark:bg-slate-800 shadow-md rounded-xl" />}
            <span className="relative z-10 flex items-center gap-2"><Package className="w-4 h-4" /> موجودی و عملیات</span>
          </button>
          <button onClick={() => setActiveSubTab('HISTORY')} className={`relative px-6 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeSubTab === 'HISTORY' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
            {activeSubTab === 'HISTORY' && <motion.div layoutId="invTab" className="absolute inset-0 bg-white dark:bg-slate-800 shadow-md rounded-xl" />}
            <span className="relative z-10 flex items-center gap-2"><History className="w-4 h-4" /> گزارش کاردکس انبار</span>
          </button>
          <button onClick={() => setActiveSubTab('ANALYTICS')} className={`relative px-6 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeSubTab === 'ANALYTICS' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
            {activeSubTab === 'ANALYTICS' && <motion.div layoutId="invTab" className="absolute inset-0 bg-white dark:bg-slate-800 shadow-md rounded-xl" />}
            <span className="relative z-10 flex items-center gap-2"><BarChart2 className="w-4 h-4" /> آنالیز و نمودارها</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* === بخش ۱ === */}
        {activeSubTab === 'OVERVIEW' && (
          <motion.div key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-2xl modal-scrollbar relative min-h-[400px]">
            <table className="w-full text-right border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-5 font-bold text-sm text-slate-800 dark:text-white w-1/3">محصول (مصالح)</th>
                  <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center w-40">آمپر موجودی</th>
                  <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center w-48">موجودی محاسباتی</th>
                  <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center">عملیات ثبت</th>
                </tr>
              </thead>
              <tbody>
                {itemsWithStock.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-sm"><Package className="w-6 h-6 text-indigo-500" /></div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 dark:text-white">{item.name}</span>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">واحدهای مجاز: {item.availableUnits.join('، ')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 align-middle"><div className="flex justify-center pt-2"><NeedleFuelGauge current={item.current} max={item.max} /></div></td>
                    <td className="p-5 text-center align-middle">
                       <div className="flex flex-col items-center justify-center gap-1 font-mono">
                         <span className={`font-black text-xl ${item.current / item.max <= 0.2 ? 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'text-slate-800 dark:text-slate-200'}`}>
                           <AnimatedNumber value={item.current} />
                         </span>
                         <span className="text-slate-500 text-xs font-bold border-t border-slate-300 dark:border-slate-700 pt-1 w-full text-center">ظرفیت: {item.max} {item.defaultUnit}</span>
                       </div>
                    </td>
                    <td className="p-5 align-middle">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal('ADD', item)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/20 transition-all text-xs"><PlusCircle className="w-4 h-4" /> فاکتور خرید</button>
                        <button onClick={() => openModal('CONSUME', item)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-500/20 transition-all text-xs"><MinusCircle className="w-4 h-4" /> مصرف/خروج</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* === بخش ۲ === */}
        {activeSubTab === 'HISTORY' && (
          <motion.div key="history" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-full space-y-4">
            
            <div className="flex flex-wrap items-center gap-4 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm rounded-[2rem] px-6 py-4 transition-all z-[90] relative">
              <NeonSearchWrapper className="flex-1 w-full xl:w-auto min-w-[250px] h-[46px]">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input placeholder="جستجوی نام مصالح در کاردکس..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 transition-colors placeholder:text-slate-500" />
                {historySearch && <button onClick={() => setHistorySearch('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /></button>}
              </NeonSearchWrapper>

              <div className="w-full xl:w-px h-px xl:h-8 bg-slate-300 dark:bg-slate-700 hidden xl:block" />
              
              <div className="w-full sm:w-56 relative z-[100] h-[46px]">
                <GlassSelect 
                  options={[{value: 'ALL', label: 'همه تراکنش‌ها'}, {value: 'ADD', label: 'فقط افزایش'}, {value: 'CONSUME', label: 'فقط مصرف و خروج'}]}
                  value={historyFilterType} onChange={setHistoryFilterType}
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-2xl modal-scrollbar min-h-[300px]">
              <table className="w-full text-right border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">نوع عملیات / شرح</th>
                    <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">نام مصالح</th>
                    <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">مقدار و واحد</th>
                    <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">تاریخ ثبت</th>
                    <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .filter(t => !pendingDeleteIds.includes(t.id) && (historyFilterType === 'ALL' || t.type === historyFilterType) && items.find(i => i.id === t.itemId)?.name.includes(historySearch))
                    .sort((a, b) => {
                      const dateCompare = b.date.localeCompare(a.date);
                      if (dateCompare !== 0) return dateCompare;
                      return b._index - a._index; 
                    })
                    .map(tx => {
                      const item = items.find(i => i.id === tx.itemId);
                      return (
                        <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/50 transition-colors group">
                          <td className="p-5">
                            <div className="flex flex-col gap-1.5">
                              {tx.type === 'ADD' ? 
                                <span className="flex items-center gap-1.5 w-max px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20"><PlusCircle className="w-3.5 h-3.5"/> ورود / خرید</span> :
                                <span className="flex items-center gap-1.5 w-max px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20"><MinusCircle className="w-3.5 h-3.5"/> خروج از انبار</span>
                              }
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tx.note}</span>
                            </div>
                          </td>
                          <td className="p-5 font-black text-slate-800 dark:text-slate-200">{item?.name}</td>
                          <td className="p-5 font-mono font-black text-lg text-indigo-600 dark:text-indigo-400" dir="ltr">{tx.amount} <span className="font-sans text-slate-500 text-xs font-bold">{tx.unit}</span></td>
                          <td className="p-5 text-sm font-bold text-slate-600 dark:text-slate-400">{tx.date}</td>
                          <td className="p-5 text-center">
                            <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* 💡 جایگزینی حذف مستقیم با تریگر زمان‌دار */}
                              <button onClick={() => triggerDelete(tx.id, tx.type)} className="p-2 bg-slate-100 dark:bg-slate-800 text-rose-500 rounded-xl shadow-sm hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                  })}
                  {transactions.filter(t => !pendingDeleteIds.includes(t.id)).length === 0 && (
                     <tr><td colSpan={5} className="p-16 text-center text-slate-500 font-bold">هیچ رکوردی یافت نشد.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* === بخش ۳: آنالیز و نمودارها === */}
        {activeSubTab === 'ANALYTICS' && (
          <motion.div key="analytics" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-full space-y-6">
            
            <div className="flex flex-wrap items-center gap-4 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm rounded-[2rem] px-6 py-4 z-[90] relative">
              <div className="w-full sm:w-64 relative z-[100] h-[46px]">
                <GlassSelect options={MATERIAL_OPTIONS} value={aMaterial} onChange={setAMaterial} placeholder="انتخاب مصالح..." />
              </div>
              <div className="w-full sm:w-44 h-[46px] relative">
                <GlassDatePicker placeholder="از تاریخ..." value={aDateFrom} onChange={setADateFrom} />
              </div>
              <div className="w-full sm:w-44 h-[46px] relative">
                <GlassDatePicker placeholder="تا تاریخ..." value={aDateTo} onChange={setADateTo} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="w-full p-6 sm:p-8 rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-2xl h-[400px] flex flex-col">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2"><BarChart2 className="text-indigo-500 w-5 h-5" /> موجودی انبار مصالح (نمودار ستونی)</h3>
                <div className="flex-1 w-full" dir="ltr" style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.2} vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickMargin={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <RechartsTooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
                      <Bar dataKey="current" name="موجودی فعلی" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={40} animationDuration={1500}>
                        {barChartData.map((entry, index) => (<Cell key={`cell-${index}`} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="w-full p-6 sm:p-8 rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-2xl h-[400px] flex flex-col items-center justify-center relative">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-200 absolute top-6 sm:top-8 right-6 sm:right-8 flex items-center gap-2 z-10"><PieChart className="text-amber-500 w-5 h-5" /> نسبت ورود به مصرف</h3>
                
                <div className="w-full relative flex items-center justify-center mt-4" dir="ltr" style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        animationBegin={0}
                        animationDuration={1500}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0 0 6px ${entry.color}80)` }} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomChartTooltip />} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">کل تراکنش‌ها</span>
                    <span className="text-3xl font-black text-slate-800 dark:text-white"><AnimatedNumber value={pieChartData[0].value + pieChartData[1].value} format={false} /></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full col-span-1 lg:col-span-2 p-6 sm:p-8 rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-2xl h-[400px] flex flex-col">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-base font-black text-slate-800 dark:text-slate-200 flex items-center gap-2"><Activity className="text-purple-500 w-5 h-5" /> روند زمانی عملیات (نمودار خطی)</h3>
               </div>

               <div className="flex-1 w-full relative" dir="ltr" style={{ height: '300px' }}>
                 {lineChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.2} vertical={false} />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickMargin={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(value) => value.toLocaleString()} />
                        <RechartsTooltip content={<CustomChartTooltip />} cursor={{ stroke: 'rgba(148,163,184,0.2)', strokeWidth: 2 }} />
                        
                        <Line 
                          type="monotone" name="add" dataKey="add" 
                          stroke="#10b981" strokeWidth={4} 
                          dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                          activeDot={{ r: 8, strokeWidth: 0, className: "drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" }} 
                          animationDuration={2000} style={{ filter: 'drop-shadow(0 5px 5px rgba(16,185,129,0.3))' }}
                        />
                        <Line 
                          type="monotone" name="consume" dataKey="consume" 
                          stroke="#f43f5e" strokeWidth={4} 
                          dot={{ r: 5, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} 
                          activeDot={{ r: 8, strokeWidth: 0, className: "drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" }} 
                          animationDuration={2000} style={{ filter: 'drop-shadow(0 5px 5px rgba(244,63,94,0.3))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">داده‌ای برای نمایش در این بازه وجود ندارد</div>
                 )}
               </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================= */}
      {/* 🌟 مودال سوپر هوشمند خروج از انبار */}
      {/* ======================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {actionModal.isOpen && (
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActionModal({ isOpen: false, item: null })} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
              
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg p-6 sm:p-8 rounded-[2rem] backdrop-blur-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-6 overflow-visible">
                
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
                  <h3 className={`text-xl font-black flex items-center gap-2 text-rose-600`}>
                    <MinusCircle className="w-6 h-6" /> مدیریت خروج کالا
                  </h3>
                  <button onClick={() => setActionModal({ isOpen: false, item: null })} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                </div>

                <div className="p-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl flex justify-between items-center border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Package className="w-5 h-5"/></div>
                    <span className="font-black text-slate-800 dark:text-white text-lg">{actionModal.item?.name}</span>
                  </div>
                  <div className="text-left flex flex-col">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">موجودی فعلی انبار</span>
                    <span className="text-lg font-mono font-black text-indigo-600 dark:text-indigo-400">{itemsWithStock.find(i=>i.id===actionModal.item?.id)?.current} <span className="text-xs text-slate-500 font-sans">{actionModal.item?.defaultUnit}</span></span>
                  </div>
                </div>

                <div className="space-y-5 relative z-50">
                  <div className="space-y-2 relative z-[70]">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">علت خروج از انبار چیست؟</label>
                    <GlassSelect 
                      options={[
                        { value: 'USE', label: 'مصرف عادی در همین کارگاه' },
                        { value: 'WASTE', label: 'اعلام خرابی / ضایعات / سرقت' },
                        { value: 'TRANSFER', label: 'انتقال و قرض به پروژه‌ای دیگر' }
                      ]} 
                      value={consumeReason} 
                      onChange={setConsumeReason} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 relative z-[60]">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">تاریخ عملیات</label>
                      <div className="w-full h-[46px]">
                        <GlassDatePicker value={actionDate} onChange={setActionDate} />
                      </div>
                    </div>

                    <div className="space-y-2 relative z-50">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">مقدار خروجی</label>
                      <GlassInputWrapper className="pl-0 h-[46px]">
                        <div className="w-1/2 h-full border-l border-slate-200 dark:border-slate-700 relative z-[60]">
                          <GlassSelect options={actionModal.item?.availableUnits.map((u:any) => ({value: u, label: u})) || []} value={selectedUnit} onChange={setSelectedUnit} />
                        </div>
                        <input type="number" value={actionAmount} onChange={e => setActionAmount(e.target.value)} className="w-1/2 h-full bg-transparent px-3 outline-none font-black text-lg text-center text-slate-900 dark:text-white relative z-10" dir="ltr" placeholder="0" autoFocus />
                      </GlassInputWrapper>
                    </div>
                  </div>

                  <AnimatePresence>
                    {consumeReason === 'TRANSFER' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="space-y-2 relative z-[45]">
                          <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400">انتخاب پروژه مقصد *</label>
                          <GlassSelect options={otherProjects} value={destProject} onChange={setDestProject} placeholder="جستجوی پروژه‌ها..." />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {consumeReason !== 'USE' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 relative z-30">
                        
                        {consumeReason === 'WASTE' && (
                          <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button onClick={() => setIsBillable(true)} className={`flex-1 py-3 px-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${isBillable ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>پای کارفرما (کسر نمی‌شود)</button>
                            <button onClick={() => setIsBillable(false)} className={`flex-1 py-3 px-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${!isBillable ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-rose-600 shadow-sm' : 'text-slate-500'}`}>ضرر پیمانکار (کسر از سود)</button>
                          </div>
                        )}

                        {(consumeReason === 'TRANSFER' || (consumeReason === 'WASTE' && !isBillable)) && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
                            <label className="text-xs font-bold text-amber-600 dark:text-amber-400">ارزش ریالی این محموله (جهت کسر از هزینه‌ها) *</label>
                            <input value={formatAmount(consumeValue)} onChange={e => setConsumeValue(e.target.value)} className="w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3 outline-none font-black text-lg text-amber-700 dark:text-amber-400" dir="ltr" placeholder="مبلغ را وارد کنید..." />
                          </motion.div>
                        )}

                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-4 relative z-20">
                  <button onClick={handleActionSubmit} className="w-full py-4 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-transform bg-gradient-to-r from-rose-500 to-orange-500">
                    {consumeReason === 'USE' ? <><CheckCircle className="w-5 h-5"/> ثبت مصرف کارگاهی</> : consumeReason === 'TRANSFER' ? <><RefreshCcw className="w-5 h-5"/> کسر موجودی و انتقال به پروژه مقصد</> : <><ShieldAlert className="w-5 h-5"/> تایید و ثبت ضایعات</>}
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 💎 کپسول فوق‌العاده شیکِ شیشه‌ای و آیفونی برای تایید حذف زمان‌دار */}
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
          <AnimatePresence>
            {undoItems.map(undo => (
              <motion.div
                key={undo.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto"
                dir="rtl"
              >
                <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-500" />
                </div>

                <div className="flex flex-col flex-1">
                  <span className="text-sm font-black text-slate-800 dark:text-white">
                    رکورد در حال حذف
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-black transition-colors shrink-0 shadow-sm"
                >
                  انصراف
                </button>

                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className="absolute bottom-0 right-0 h-1 bg-rose-500"
                  style={{ transformOrigin: 'right' }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>, document.body
      )}

    </motion.div>
  );
}