import { useState, useMemo } from 'react';
import { motion} from 'framer-motion';
import { 
  FileDown, X, Layers, Wallet, Users, ShoppingCart, Truck, 
  Settings, Filter, CheckSquare, Square,
  Merge, FileSpreadsheet, FileText
} from 'lucide-react';
import { toast } from 'sonner';

// 💡 مسیر استورهای گلوبال (۳ تا نقطه برای خروج از features/clients/components)
import { useFinanceStore } from '../../../store/financeStore';
import { usePurchaseStore } from '../../../store/purchaseStore';
import { useLogisticsStore } from '../../../store/logisticsStore';
import { useLaborStore } from '../../../store/laborStore';

// 💡 مسیر استور پروژه‌ها (۲ تا نقطه چون هر دو داخل features هستند)
import { useProjectStore } from '../../projects/store/projectStore';

// 💡 مسیر کامپوننت‌های رابط کاربری
import GlassSelect from '../../../components/ui/GlassSelect';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';

// در اینجا توابع اصلی اکسپورت سیستم صدا زده خواهند شد
// import { exportToExcel } from '../../../io/exporters/ExcelExporter';
// import { exportToPdf } from '../../../io/exporters/PdfExporter';

interface ClientExportModalProps {
  clientId: string;
  onClose: () => void;
}

const MODULES = [
  { id: 'FINANCE', label: 'تراکنش‌های مالی', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/20' },
  { id: 'PURCHASES', label: 'خرید مصالح', icon: ShoppingCart, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/20' },
  { id: 'LABOR', label: 'نیروی کار', icon: Users, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/20' },
  { id: 'LOGISTICS', label: 'لجستیک و ماشین‌آلات', icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/20' }
];

const safeNum = (val: any) => Number(val) || 0;

export default function ClientExportModal({ clientId, onClose }: ClientExportModalProps) {
  const allProjects = useProjectStore(state => state.projects);
  const clientProjects = useMemo(() => allProjects.filter(p => p.clientId === clientId), [allProjects, clientId]);
  
  const allTransactions = useFinanceStore(state => state.transactions);
  const allPurchases = usePurchaseStore(state => state.purchases);
  const allLogs = useLogisticsStore(state => state.logs);
  const allLaborLogs = useLaborStore(state => state.logs);

  
  // فیلترها
  const [selectedModules, setSelectedModules] = useState<string[]>(MODULES.map(m => m.id));
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // تنظیمات پیشرفته
  const [mergeStrategy, setMergeStrategy] = useState<'CLASSIC' | 'SMART'>('CLASSIC');
  const [priceStrategy, setPriceStrategy] = useState<'BILLED' | 'INTERNAL'>('BILLED');

  const projectOptions = [
    { value: 'ALL', label: 'تمامی پروژه‌ها و کارهای آزاد' },
    { value: 'FREE', label: 'فقط کارهای آزاد' },
    ...clientProjects.map(p => ({ value: p.id, label: p.name }))
  ];

  const toggleModule = (id: string) => {
    setSelectedModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  // 💡 موتور پردازش و ساخت دیتای خروجی
  const generateExportData = () => {
    let rawData: any[] = [];
    const clientProjectIds = clientProjects.map(p => p.id);

    const isMatchProject = (itemProjectId: string | undefined | null) => {
      if (selectedProject === 'ALL') return true;
      if (selectedProject === 'FREE') return !itemProjectId || itemProjectId === 'FREE';
      return itemProjectId === selectedProject;
    };

    const isMatchDate = (date: string) => {
      if (!date) return true;
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    };

    const getPrice = (item: any) => priceStrategy === 'BILLED' ? (safeNum(item.billedCost) || safeNum(item.internalCost)) : safeNum(item.internalCost);

    // واکشی اطلاعات بر اساس فیلترها
    if (selectedModules.includes('PURCHASES')) {
      allPurchases.filter(p => (p.clientId === clientId || clientProjectIds.includes(p.projectId || '')) && isMatchProject(p.projectId) && isMatchDate(p.date)).forEach(p => {
        rawData.push({ _type: 'PURCHASES', date: p.date, title: p.title, vendor: p.vendor, amount: getPrice(p), projectId: p.projectId });
      });
    }

    if (selectedModules.includes('LABOR')) {
      allLaborLogs.filter(l => (l.clientId === clientId || clientProjectIds.includes(l.projectId || '')) && isMatchProject(l.projectId) && isMatchDate(l.date)).forEach(l => {
        rawData.push({ _type: 'LABOR', date: l.date, title: l.workerName, vendor: l.workType, amount: getPrice(l), projectId: l.projectId });
      });
    }

    if (selectedModules.includes('LOGISTICS')) {
      allLogs.filter(l => (l.clientId === clientId || clientProjectIds.includes(l.projectId || '')) && isMatchProject(l.projectId) && isMatchDate(l.date)).forEach(l => {
        rawData.push({ _type: 'LOGISTICS', date: l.date, title: l.title, vendor: l.provider, amount: getPrice(l), projectId: l.projectId });
      });
    }

    if (selectedModules.includes('FINANCE')) {
      allTransactions.filter(t => t.direction === 'IN' && isMatchDate(t.date)).forEach(t => {
        let isMatch = false;
        if (selectedProject === 'ALL' && (t.clientId === clientId || t.referenceId === clientId || clientProjectIds.includes(t.referenceId))) isMatch = true;
        else if (selectedProject === 'FREE' && (t.clientId === clientId || t.referenceId === clientId)) isMatch = true;
        else if (t.referenceId === selectedProject || t.allocations?.some(a => a.projectId === selectedProject)) isMatch = true;
        
        if (isMatch) rawData.push({ _type: 'FINANCE', date: t.date, title: t.description, vendor: t.type === 'CHEQUE' ? 'چک' : 'نقدی', amount: safeNum(t.amount), projectId: t.referenceId });
      });
    }

    // ادغام هوشمند (Landed Cost)
    if (mergeStrategy === 'SMART') {
      const grouped: Record<string, any> = {};
      rawData.forEach(item => {
        if (item._type === 'FINANCE') return; // مالی ادغام نمیشه
        const key = `${item.date}_${item.projectId}`;
        if (!grouped[key]) {
          grouped[key] = { date: item.date, title: 'هزینه کارگاه', amount: 0, details: [] };
        }
        grouped[key].amount += item.amount;
        grouped[key].details.push(`${item._type === 'PURCHASES' ? 'خرید' : item._type === 'LOGISTICS' ? 'کرایه' : 'دستمزد'}: ${item.title}`);
      });
      
      const mergedList = Object.values(grouped).map(g => ({
        date: g.date,
        title: g.title,
        description: g.details.join(' | '),
        amount: g.amount
      }));
      
      return [...mergedList, ...rawData.filter(r => r._type === 'FINANCE')].sort((a,b) => a.date?.localeCompare(b.date));
    }

    return rawData.sort((a,b) => a.date?.localeCompare(b.date));
  };

  const handleExport = (format: 'EXCEL' | 'PDF') => {
    if (selectedModules.length === 0) return toast.error('حداقل یک بخش برای گزارش‌گیری انتخاب کنید.');
    const data = generateExportData();
    if (data.length === 0) return toast.error('داده‌ای برای این فیلترها یافت نشد.');

    toast.success(`در حال تولید فایل ${format}...`);
    console.log("Data ready for Export:", data);
    
    // در اینجا توابع اصلی اکسپورت صدا زده می‌شوند
    // if (format === 'EXCEL') exportToExcel({ fileName: `Report_${clientId}`, data, headers: {'date':'تاریخ', 'title':'عنوان', 'amount':'مبلغ'} });
    // if (format === 'PDF') exportToPdf({ title: 'گزارش کارفرما', fileName: `Report_${clientId}`, data: data.map(d=>[d.date, d.title, d.amount]), headers: ['تاریخ','عنوان','مبلغ'] });
    
    setTimeout(() => onClose(), 1000);
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-8" dir="rtl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
      
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center"><FileDown className="w-6 h-6 text-indigo-500" /></div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">خروجی پیشرفته و گزارش‌ساز</h2>
              <p className="text-xs font-bold text-slate-500 mt-1">فیلتر دقیق و تولید فایل‌های گرافیکی</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto modal-scrollbar p-6 space-y-8">
          
          {/* بخش اول: فیلترها */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><Filter className="w-4 h-4 text-indigo-500" /> ۱. فیلترهای گزارش</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 px-1">پروژه مورد نظر</label>
                <GlassSelect options={projectOptions} value={selectedProject} onChange={setSelectedProject} placeholder="انتخاب پروژه" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 px-1">از تاریخ</label>
                <GlassDatePicker value={startDate} onChange={setStartDate} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 px-1">تا تاریخ</label>
                <GlassDatePicker value={endDate} onChange={setEndDate} />
              </div>
            </div>
          </div>

          {/* بخش دوم: انتخاب ماژول‌ها */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500" /> ۲. بخش‌های مورد نیاز</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MODULES.map(mod => (
                <button key={mod.id} onClick={() => toggleModule(mod.id)} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right ${selectedModules.includes(mod.id) ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60 hover:opacity-100'}`}>
                  {selectedModules.includes(mod.id) ? <CheckSquare className="w-5 h-5 text-indigo-500 shrink-0" /> : <Square className="w-5 h-5 text-slate-400 shrink-0" />}
                  <div className={`p-2 rounded-lg ${mod.bg}`}><mod.icon className={`w-4 h-4 ${mod.color}`} /></div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">{mod.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* بخش سوم: تنظیمات هوشمند */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><Settings className="w-4 h-4 text-indigo-500" /> ۳. تنظیمات تجمیع و قیمت</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl">
                <h4 className="text-xs font-black text-slate-500 mb-3">نحوه نمایش ردیف‌ها</h4>
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button onClick={() => setMergeStrategy('CLASSIC')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mergeStrategy === 'CLASSIC' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}>
                    کلاسیک (تفکیک شده)
                  </button>
                  <button onClick={() => setMergeStrategy('SMART')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${mergeStrategy === 'SMART' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500'}`}>
                    <Merge className="w-3.5 h-3.5" /> تجمیعی (سرشکن هزینه‌ها)
                  </button>
                </div>
                {mergeStrategy === 'SMART' && <p className="text-[10px] text-indigo-500 mt-2 font-bold leading-relaxed">در این حالت، هزینه‌های لجستیک و نیروی کار یک روز، با مصالح همان روز جمع شده و قالب یک ردیف واحد نمایش داده می‌شوند.</p>}
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl">
                <h4 className="text-xs font-black text-slate-500 mb-3">مبنای قیمت‌گذاری گزارش</h4>
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button onClick={() => setPriceStrategy('BILLED')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${priceStrategy === 'BILLED' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}>
                    مبلغ فاکتور شده (کارفرما)
                  </button>
                  <button onClick={() => setPriceStrategy('INTERNAL')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${priceStrategy === 'INTERNAL' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'text-slate-500'}`}>
                    مبلغ واقعی (پای‌کار)
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-bold leading-relaxed">تعیین می‌کند که سود شما در خروجی مخفی بماند یا قیمت اصلی کارگاه گزارش شود.</p>
              </div>

            </div>
          </div>

        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
          <button onClick={() => handleExport('EXCEL')} className="flex-1 py-4 rounded-2xl font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all">
            <FileSpreadsheet className="w-5 h-5"/> تولید خروجی Excel
          </button>
          <button onClick={() => handleExport('PDF')} className="flex-1 py-4 rounded-2xl font-black bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all">
            <FileText className="w-5 h-5"/> تولید خروجی PDF
          </button>
        </div>

      </motion.div>
    </div>
  );
}