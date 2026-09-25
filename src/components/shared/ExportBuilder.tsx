import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileDown, X, Layers, Wallet, Users, ShoppingCart, Truck, 
  Filter, FileSpreadsheet, FileText, Activity, 
  ListChecks, Check, Loader2, Settings2, PenTool, Edit3, Palette, ArrowUpDown, Calculator, EyeOff, Wand2, ArrowLeftRight, FolderGit2, ChevronDown, CalendarClock, Coffee
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useSettingsStore } from '../../store/settingsStore';
import { useFinanceStore } from '../../store/financeStore';
import { useProjectStore } from '../../features/projects/store/projectStore';
import { usePurchaseStore } from '../../store/purchaseStore';
import { useLogisticsStore } from '../../store/logisticsStore';
import { useLaborStore } from '../../store/laborStore';
import { useClientStore } from '../../store/clientStore'; 

import GlassSelect from '../ui/GlassSelect';
import GlassDatePicker from '../ui/GlassDatePicker';

import { exportToExcelAdvanced } from '../../core/exporters/ExcelExporter';
import { exportToPdfAdvanced } from '../../core/exporters/PdfExporter';

export interface ExportBuilderProps { 
  projectId?: string; 
  clientId?: string; 
  workerId?: string;
  context?: 'PROJECT' | 'CLIENT' | 'LABOR' | 'GLOBAL'; 
  onClose: () => void; 
}

// 💡 آرایه‌های داینامیک برای منوهای گزارش‌گیری (Global vs Labor)
const GLOBAL_MODULES = [
  { id: 'FINANCE', label: 'تراکنش‌های مالی', icon: Wallet, color: 'text-emerald-500' },
  { id: 'PURCHASES', label: 'خرید مصالح', icon: ShoppingCart, color: 'text-rose-500' },
  { id: 'LABOR', label: 'نیروی کار', icon: Users, color: 'text-orange-500' },
  { id: 'LOGISTICS', label: 'لجستیک و حمل', icon: Truck, color: 'text-blue-500' }
];

const LABOR_SPECIFIC_MODULES = [
  { id: 'LABOR_WORK_LOGS', label: 'تاریخچه کارکرد', icon: Activity, color: 'text-indigo-500' },
  { id: 'LABOR_FINANCE', label: 'تاریخچه پرداختی‌ها', icon: Wallet, color: 'text-emerald-500' },
  { id: 'LABOR_MONTHLY', label: 'مدیریت ماهانه', icon: CalendarClock, color: 'text-cyan-500' },
  { id: 'LABOR_MISC', label: 'متفرقه (رفاهی و کسر)', icon: Coffee, color: 'text-pink-500' }
];

const SCHEMAS: Record<string, Record<string, string>> = {
  FINANCE: { date: 'تاریخ', projectName: 'پروژه', title: 'شرح تراکنش', vendor: 'طرف حساب', phase: 'فاز', amount: 'مبلغ تراکنش', type: 'نوع (نقد/چک)', status: 'وضعیت', chequeDetails: 'مشخصات چک', dueDate: 'تاریخ سررسید', receiptDetails: 'رسید متنی' },
  PURCHASES: { date: 'تاریخ', projectName: 'پروژه', title: 'شرح فاکتور', vendor: 'فروشنده', phase: 'فاز', amount: 'مبلغ فاکتور', paidAmount: 'مبلغ پرداخت‌شده', remain: 'مانده بدهی', paymentDetails: 'جزئیات پرداختی (اسناد متصل)', receiptDetails: 'یادداشت فاکتور', profit: 'سود' },
  LABOR: { date: 'تاریخ', projectName: 'پروژه', title: 'تخصص / کار', vendor: 'نام نیرو', phase: 'فاز', amount: 'دستمزد کل', paidAmount: 'پرداختی و مساعده', remain: 'بستانکاری نیرو', paymentDetails: 'جزئیات پرداختی (اسناد متصل)', receiptDetails: 'توضیحات کارکرد', profit: 'سود' },
  LOGISTICS: { date: 'تاریخ', projectName: 'پروژه', title: 'شرح سرویس', vendor: 'راننده / ماشین', phase: 'فاز', amount: 'مبلغ کرایه', paidAmount: 'کرایه پرداخت‌شده', remain: 'مانده بدهی', paymentDetails: 'جزئیات پرداختی (اسناد متصل)', receiptDetails: 'یادداشت', profit: 'سود' },
  MIXED: { date: 'تاریخ', projectName: 'پروژه', module: 'بخش', title: 'شرح / عنوان', vendor: 'طرف حساب', phase: 'فاز', amount: 'مبلغ کل', paidAmount: 'کل پرداختی', remain: 'مانده حساب', paymentDetails: 'جزئیات اسناد پرداختی', receiptDetails: 'رسید متنی/یادداشت', profit: 'سود', dueDate: 'تاریخ سررسید چک' },
  
  // 💡 شماتیک اختصاصی برای تب‌های نیروی کار (اضافه شدن سود پنهان برای ردیف‌های کارکرد)
  LABOR_WORK_LOGS: { date: 'تاریخ', projectName: 'پروژه', title: 'شرح کار', phase: 'فاز', amount: 'دستمزد کل', profit: 'سود', receiptDetails: 'ملاحظات/توضیحات' },
  LABOR_FINANCE: { date: 'تاریخ', title: 'شرح پرداخت', amount: 'مبلغ پرداختی', receiptDetails: 'رسید متنی/ملاحظات' },
  LABOR_MONTHLY: { date: 'تاریخ', projectName: 'پروژه', title: 'شرح قرارداد', amount: 'مبلغ دوره', profit: 'سود', receiptDetails: 'ملاحظات' },
  LABOR_MISC: { date: 'تاریخ', projectName: 'پروژه', title: 'شرح (رفاهی/مساعده/پاداش)', amount: 'مبلغ', profit: 'سود', receiptDetails: 'ملاحظات' }
};

const MASTER_DICTIONARY: Record<string, string> = {
  date: 'تاریخ', projectName: 'پروژه', title: 'شرح/عنوان', vendor: 'طرف حساب/فروشنده', phase: 'فاز اجرایی', 
  amount: 'مبلغ کل', paidAmount: 'مبلغ پرداختی', remain: 'مانده حساب', paymentDetails: 'جزئیات اسناد پرداختی', 
  profit: 'سود پنهان', type: 'نوع (نقد/چک)', status: 'وضعیت', chequeDetails: 'مشخصات چک', module: 'بخش مربوطه', dueDate: 'تاریخ سررسید', receiptDetails: 'رسید متنی / یادداشت'
};

const safeNum = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  return Number(String(val).replace(/\D/g, "")) || 0;
};

const TableCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button onClick={onChange} className="flex items-center justify-center w-full focus:outline-none">
    <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-300 border-2 ${checked ? 'bg-indigo-500 border-indigo-500 shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}>
       <AnimatePresence>{checked && (<motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="w-3.5 h-3.5 text-white" strokeWidth={4} /></motion.div>)}</AnimatePresence>
    </div>
  </button>
);

const InlineAnimatedSelect = ({ options, value, onChange, disabled }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find((o:any) => o.value === value)?.label || 'گروه';
  
  return (
    <div className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl py-2 px-3 cursor-pointer hover:border-indigo-400 transition-colors w-32"
      >
        <span className="text-xs font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
            >
              {options.map((opt:any) => (
                <div 
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`px-3 py-2.5 text-[11px] font-bold cursor-pointer transition-colors ${value === opt.value ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                  {opt.label}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const AnimatedMultiSelect = ({ options, selected, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const isAllSelected = selected.length === options.length && options.length > 0;

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm font-bold cursor-pointer hover:border-indigo-400 transition-colors"
      >
        <span className="text-slate-700 dark:text-slate-300">
          {isAllSelected ? 'تمامی پروژه‌ها انتخاب شده‌اند' : selected.length === 0 ? placeholder : `${selected.length} پروژه انتخاب شده`}
        </span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[100] overflow-hidden max-h-64 overflow-y-auto modal-scrollbar"
            >
              <div 
                onClick={() => onChange(isAllSelected ? [] : options.map((o:any) => String(o.id)))} 
                className="flex items-center gap-3 p-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${isAllSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                  {isAllSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </div>
                <span className="text-sm font-black text-slate-800 dark:text-white">انتخاب همه</span>
              </div>
              {options.map((opt:any) => {
                const isChecked = selected.includes(String(opt.id));
                return (
                  <div 
                    key={opt.id} 
                    onClick={() => onChange(isChecked ? selected.filter((s:any) => s !== String(opt.id)) : [...selected, String(opt.id)])}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                      {isChecked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{opt.title || opt.name || 'بدون نام'}</span>
                  </div>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function ExportBuilder({ projectId, clientId, workerId, context, onClose }: ExportBuilderProps) {
  const settings = useSettingsStore(state => state.settings);
  const allProjects = useProjectStore(state => state.projects) || [];
  const allTransactions = useFinanceStore(state => state.transactions) || [];
  const allPurchases = usePurchaseStore(state => state.purchases) || [];
  const allLogs = useLogisticsStore(state => state.logs) || [];
  const allLaborLogs = useLaborStore(state => state.logs) || [];
  const allWorkers = useLaborStore(state => state.workers) || [];
  const allClients = useClientStore(state => state.clients) || [];

  const derivedContext = context || (projectId ? 'PROJECT' : clientId ? 'CLIENT' : workerId ? 'LABOR' : 'GLOBAL');
  
  const targetProject = projectId ? allProjects.find(p => String(p.id) === String(projectId)) : null;
  const targetWorker = workerId ? allWorkers.find(w => String(w.id) === String(workerId)) : null;
  
  const rawTargetPhases = targetProject?.phases;
  const projectPhases = useMemo(() => rawTargetPhases || [], [rawTargetPhases]);

  const finalClientId = clientId || targetProject?.clientId;
  const clientObj = finalClientId ? allClients.find(c => String(c.id) === String(finalClientId)) : null;
  
  const autoClientName = (derivedContext === 'LABOR' && targetWorker) 
    ? `${targetWorker.name} ${targetWorker.lastName || ''}` 
    : clientObj ? `${clientObj.name} ${clientObj.lastName || ''}` : 'عمومی / تمامی پروژه‌ها';

  const clientProjects = useMemo(() => {
    if (derivedContext === 'LABOR') return allProjects;
    return allProjects.filter(p => String(p.clientId) === String(finalClientId));
  }, [allProjects, finalClientId, derivedContext]);
  
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(projectId ? [String(projectId)] : clientProjects.map(p => String(p.id)));

  // 💡 تشخیص هوشمند ماژول‌های فعال برای چیدمان گزارش
  const currentModulesConfig = derivedContext === 'LABOR' ? LABOR_SPECIFIC_MODULES : GLOBAL_MODULES;

  const [selectedModules, setSelectedModules] = useState<string[]>(
    derivedContext === 'LABOR' ? ['LABOR_WORK_LOGS', 'LABOR_FINANCE', 'LABOR_MONTHLY', 'LABOR_MISC'] : ['FINANCE', 'PURCHASES', 'LABOR', 'LOGISTICS']
  );
  
  const [moduleGroups, setModuleGroups] = useState<Record<string, string>>({
    FINANCE: 'گروه ۱ (مالی)', PURCHASES: 'گروه ۲ (خرید)', LABOR: 'گروه ۳ (نیرو)', LOGISTICS: 'گروه ۴ (لجستیک)',
    LABOR_WORK_LOGS: 'گروه ۱ (کارکرد)', LABOR_FINANCE: 'گروه ۲ (پرداختی)', LABOR_MONTHLY: 'گروه ۳ (ماهانه)', LABOR_MISC: 'گروه ۴ (متفرقه)'
  });

  const [datePreset, setDatePreset] = useState('ALL'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('ALL');
  const [txStatusFilter, setTxStatusFilter] = useState('ALL'); 
  const [settlementFilter, setSettlementFilter] = useState('ALL'); 
  const [priceStrategy, setPriceStrategy] = useState<'BILLED' | 'INTERNAL'>('BILLED');
  const [includeSignature, setIncludeSignature] = useState(true);
  
  // 💡 مدیریت تایتل بر اساس کانتکست نیروی کار
  const getDynamicTitle = () => {
    if (derivedContext === 'LABOR' && targetWorker) {
      return `گزارش جامع نیروی کار: ${targetWorker.name} ${targetWorker.lastName || ''}`;
    }
    if (selectedProjectIds.length === 1 && derivedContext !== 'LABOR') {
      const p = allProjects.find(p => String(p.id) === String(selectedProjectIds[0]));
      return `گزارش پروژه: ${p?.name || p?.title || 'نامشخص'}`;
    }
    return selectedProjectIds.length > 1 ? `گزارش تجمعی پروژه‌ها` : 'گزارش جامع';
  };

  const [customReportTitle, setCustomReportTitle] = useState(localStorage.getItem('peyman_export_title') || getDynamicTitle());
  const [customClientName, setCustomClientName] = useState(localStorage.getItem('peyman_export_client') || autoClientName);
  const [customReportDate, setCustomReportDate] = useState(moment().format('jYYYY/jMM/jDD'));
  const [highlightCheques, setHighlightCheques] = useState(localStorage.getItem('peyman_export_highlight') !== 'false');
  const [sortConfig, setSortConfig] = useState<'DATE_DESC'|'DATE_ASC'|'CREATED_DESC'|'CREATED_ASC'>('DATE_DESC');

  const [billingMode, setBillingMode] = useState<'ACTUAL'|'PERCENT'|'FIXED'|'DIMENSION'>('ACTUAL');
  const [billingPercent, setBillingPercent] = useState<string>('10');
  const [billingFixed, setBillingFixed] = useState<string>('');
  const [dimL, setDimL] = useState<string>('1');
  const [dimW, setDimW] = useState<string>('1');
  const [dimH, setDimH] = useState<string>('1');
  const [dimPrice, setDimPrice] = useState<string>('');

  const [maskLaborNames, setMaskLaborNames] = useState(false);
  const [maskVendorNames, setMaskVendorNames] = useState(false);
  const [smartRedundancy, setSmartRedundancy] = useState(true); 
  const [exportCurrency, setExportCurrency] = useState<'TOMAN' | 'RIAL'>('TOMAN'); 
  
  const [liveEditMode, setLiveEditMode] = useState(false);
  const [cellOverrides, setCellOverrides] = useState<Record<string, string>>({});

  // 💡 استخراج دقیقِ ستون‌ها فقط و فقط براساس ماژول‌های فعال در این کانتکست
  const baseColumns = useMemo(() => {
    const keys = new Set<string>();
    currentModulesConfig.forEach(mod => {
      if (SCHEMAS[mod.id]) {
        Object.keys(SCHEMAS[mod.id]).forEach(k => keys.add(k));
      }
    });
    // فقط برای فایل‌های ترکیبی بیرون از نیروی کار کلیدهای Mixed را اضافه کن
    if (derivedContext !== 'LABOR' && SCHEMAS['MIXED']) {
      Object.keys(SCHEMAS['MIXED']).forEach(k => keys.add(k));
    }
    return Array.from(keys);
  }, [currentModulesConfig, derivedContext]);

  const isSingleProject = selectedProjectIds.length <= 1;
  const allPossibleColumns = isSingleProject ? baseColumns.filter(c => c !== 'projectName') : baseColumns;
  
  const initialColumns = allPossibleColumns.filter(c => c !== 'profit' && c !== 'projectName');
  const [activeColumns, setActiveColumns] = useState<string[]>(
    !isSingleProject ? ['projectName', ...initialColumns] : initialColumns
  ); 

  useEffect(() => {
    setCustomReportTitle(getDynamicTitle());
    setCustomClientName(autoClientName);
  }, [selectedProjectIds, allProjects, derivedContext, autoClientName]);

  useEffect(() => {
    localStorage.setItem('peyman_export_title', customReportTitle);
    localStorage.setItem('peyman_export_client', customClientName);
    localStorage.setItem('peyman_export_highlight', String(highlightCheques));
  }, [customReportTitle, customClientName, highlightCheques]);

  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState<'EXCEL' | 'PDF' | null>(null);

  const phaseOptions = useMemo(() => [{ value: 'ALL', label: 'تمامی فازها' }, ...projectPhases.map((p: any) => ({ value: p.id, label: p.name }))], [projectPhases]);
  const groupOptions = [{ value: 'گروه ۱ (مالی)', label: 'گروه ۱' }, { value: 'گروه ۲ (خرید)', label: 'گروه ۲' }, { value: 'گروه ۳ (نیرو)', label: 'گروه ۳' }, { value: 'گروه ۴ (لجستیک)', label: 'گروه ۴' }, { value: 'گروه ۵ (تجمیعی)', label: 'گروه ۵' }];

  useEffect(() => {
    if (datePreset === 'THIS_MONTH') { setStartDate(moment().startOf('jMonth').format('jYYYY/jMM/jDD')); setEndDate(moment().endOf('jMonth').format('jYYYY/jMM/jDD')); }
    else if (datePreset === 'THIS_YEAR') { setStartDate(moment().startOf('jYear').format('jYYYY/jMM/jDD')); setEndDate(moment().endOf('jYear').format('jYYYY/jMM/jDD')); }
    else if (datePreset === 'ALL') { setStartDate(''); setEndDate(''); }
  }, [datePreset]);

  const toggleModule = (id: string) => setSelectedModules(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleColumn = (id: string) => setActiveColumns(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const getPhaseName = (phaseId: string | undefined | null) => {
    if (!phaseId || phaseId === 'GENERAL' || phaseId === 'ALL') return 'عمومی';
    const p = projectPhases.find((ph:any) => String(ph.id) === String(phaseId));
    return p ? p.name : 'عمومی';
  };

  const getProjectName = (pId: string | undefined | null) => {
    if (!pId || pId === 'FREE' || pId === 'null' || pId === 'undefined') return 'عمومی / بدون پروژه';
    if (String(pId) === String(finalClientId) && derivedContext !== 'LABOR') return 'عمومی کارفرما'; 
    const proj = allProjects.find(p => String(p.id) === String(pId));
    return proj ? (proj.name || proj.title || 'نامشخص') : 'نامشخص';
  };

  const rawDataList = useMemo(() => {
    let raw: any[] = [];
    let globalIndex = 0; 
    
    const isMatch = (itemPId: string | undefined) => {
       if (!itemPId || itemPId === 'FREE') return true; 
       return selectedProjectIds.length === 0 ? true : selectedProjectIds.includes(String(itemPId));
    };

    const isDateMatch = (d: string) => (!startDate || d >= startDate) && (!endDate || d <= endDate);
    const isPhaseMatch = (ph: string) => phaseFilter === 'ALL' || ph === phaseFilter;

    const getLinkedPayments = (recordId: string) => {
      let paid = 0;
      let details: string[] = [];
      allTransactions.forEach(t => {
        t.allocations?.forEach(a => {
          if (String(a.recordId) === String(recordId)) {
            const amt = safeNum(a.amount);
            paid += amt;
            if (t.type === 'CASH') {
              details.push(`نقدی: ${amt.toLocaleString('fa-IR')}`);
            } else if (t.type === 'CHEQUE') {
              const bank = t.chequeDetails?.bank || t.chequeDetails?.bankName || 'نامشخص';
              details.push(`چک (${bank}): ${amt.toLocaleString('fa-IR')}`);
            }
          }
        });
      });
      return { paid, detailsStr: details.length > 0 ? details.join(' + ') : '-' };
    };

    const calcCosts = (item: any) => {
      const internal = safeNum(item.internalCost) || safeNum(item.totalWage) || safeNum(item.totalCost) || 0;
      const billed = safeNum(item.billedCost) || internal;
      return { amount: priceStrategy === 'BILLED' ? billed : internal, profit: billed - internal };
    };

    // 💡 تفکیک هوشمند برای بخش نیروی کار (LABOR CONTEXT)
    if (derivedContext === 'LABOR') {
      const laborLogsForWorker = allLaborLogs.filter(l => String(l.workerId) === String(workerId) && isMatch(l.projectId) && isDateMatch(l.date) && isPhaseMatch(l.phaseId||'GENERAL'));

      if (selectedModules.includes('LABOR_WORK_LOGS')) {
        laborLogsForWorker.filter(l => l.paymentType !== 'MONTHLY' && l.paymentType !== 'PROJECT_MONTHLY' && l.recordType !== 'PERK').forEach(l => {
          const { amount, profit } = calcCosts(l);
          raw.push({ _id: `lab_w_${l.id}`, _index: globalIndex++, _module: 'LABOR_WORK_LOGS', module: 'تاریخچه کارکرد', projectName: getProjectName(l.projectId), date: l.date, title: l.workType || 'کارکرد روزانه', phase: getPhaseName(l.phaseId), amount, profit, receiptDetails: l.description || '-' });
        });
      }

      if (selectedModules.includes('LABOR_MONTHLY')) {
        laborLogsForWorker.filter(l => l.paymentType === 'MONTHLY' || l.paymentType === 'PROJECT_MONTHLY').forEach(l => {
          const { amount, profit } = calcCosts(l);
          raw.push({ _id: `lab_m_${l.id}`, _index: globalIndex++, _module: 'LABOR_MONTHLY', module: 'قرارداد ماهانه', projectName: getProjectName(l.projectId), date: l.date, title: l.workType || 'حقوق ماهانه', phase: getPhaseName(l.phaseId), amount, profit, receiptDetails: l.description || '-' });
        });
      }

      if (selectedModules.includes('LABOR_MISC')) {
        laborLogsForWorker.forEach(l => {
          if (l.recordType === 'PERK') {
            const { amount, profit } = calcCosts(l);
            raw.push({ _id: `lab_misc_${l.id}`, _index: globalIndex++, _module: 'LABOR_MISC', module: 'متفرقه', projectName: getProjectName(l.projectId), date: l.date, title: l.perkTitle || l.workType || 'هزینه متفرقه', amount, profit, receiptDetails: l.description || '-' });
          }
          if (l.bonus && l.bonus > 0) raw.push({ _id: `lab_bns_${l.id}`, _index: globalIndex++, _module: 'LABOR_MISC', module: 'متفرقه', projectName: getProjectName(l.projectId), date: l.date, title: 'پاداش / اضافه‌کار', amount: l.bonus, profit: 0, receiptDetails: '-' });
          if (l.foodDeduction && l.foodDeduction > 0) raw.push({ _id: `lab_food_${l.id}`, _index: globalIndex++, _module: 'LABOR_MISC', module: 'متفرقه', projectName: getProjectName(l.projectId), date: l.date, title: 'کسر غذا', amount: -l.foodDeduction, profit: 0, receiptDetails: '-' });
          if (l.penaltyDeduction && l.penaltyDeduction > 0) raw.push({ _id: `lab_pen_${l.id}`, _index: globalIndex++, _module: 'LABOR_MISC', module: 'متفرقه', projectName: getProjectName(l.projectId), date: l.date, title: 'جریمه / کسر کار', amount: -l.penaltyDeduction, profit: 0, receiptDetails: '-' });
        });
      }

      if (selectedModules.includes('LABOR_FINANCE')) {
        laborLogsForWorker.forEach(l => {
          if (l.advancePayment && l.advancePayment > 0) {
            raw.push({ _id: `lab_adv_${l.id}`, _index: globalIndex++, _module: 'LABOR_FINANCE', module: 'تاریخچه پرداختی‌ها', date: l.date, title: 'مساعده ثبت شده در کارکرد', amount: l.advancePayment, receiptDetails: l.description || '-' });
          }
        });
        
        const logIds = laborLogsForWorker.map(l => String(l.id));
        allTransactions.forEach(t => {
          t.allocations?.forEach(a => {
            if (logIds.includes(String(a.recordId))) {
              raw.push({ _id: `lab_tx_${t.id}_${a.id}`, _index: globalIndex++, _module: 'LABOR_FINANCE', module: 'تاریخچه پرداختی‌ها', date: t.date, title: t.description || 'پرداختی مالی', amount: safeNum(a.amount), receiptDetails: t.textReceipt || '-' });
            }
          });
        });
      }
    } 
    // 💡 بخش اصلی برنامه (پروژه و کارفرما) بدون تغییر باقی موند
    else {
      if (selectedModules.includes('PURCHASES')) {
        allPurchases.filter(p => isMatch(p.projectId) && isDateMatch(p.date) && isPhaseMatch(p.phaseId||'GENERAL')).forEach(p => {
          const { amount, profit } = calcCosts(p);
          const { paid, detailsStr } = getLinkedPayments(p.id);
          const remain = amount - paid;
          if (settlementFilter === 'PAID' && remain > 0) return;
          if (settlementFilter === 'UNPAID' && remain <= 0) return;
          
          raw.push({ _id: `pur_${p.id}`, _index: globalIndex++, _module: 'PURCHASES', module: 'خرید مصالح', projectName: getProjectName(p.projectId), date: p.date, title: p.title, vendor: p.vendor || '-', phase: getPhaseName(p.phaseId), amount, paidAmount: paid, remain, paymentDetails: detailsStr, profit, dueDate: '-', receiptDetails: p.notes || '-' });
        });
      }

      if (selectedModules.includes('LABOR')) {
        allLaborLogs.filter(l => isMatch(l.projectId) && isDateMatch(l.date) && isPhaseMatch(l.phaseId||'GENERAL')).forEach(l => {
          const { amount, profit } = calcCosts(l);
          const advance = safeNum(l.advancePayment);
          const { paid, detailsStr } = getLinkedPayments(l.id);
          const totalPaid = advance + paid;
          const remain = amount - totalPaid;
          if (settlementFilter === 'PAID' && remain > 0) return;
          if (settlementFilter === 'UNPAID' && remain <= 0) return;
          const finalDetails = advance > 0 ? `مساعده/پرداختی: ${advance.toLocaleString('fa-IR')} ${detailsStr !== '-' ? ' | ' + detailsStr : ''}` : detailsStr;
          
          raw.push({ _id: `lab_${l.id}`, _index: globalIndex++, _module: 'LABOR', module: 'نیروی کار', projectName: getProjectName(l.projectId), date: l.date, title: l.workType || 'آزاد', vendor: l.workerName || '-', phase: getPhaseName(l.phaseId), amount, paidAmount: totalPaid, remain, paymentDetails: finalDetails, profit, dueDate: '-', receiptDetails: l.description || '-' });
        });
      }

      if (selectedModules.includes('LOGISTICS')) {
        allLogs.filter(l => isMatch(l.projectId || undefined) && isDateMatch(l.date) && isPhaseMatch(l.phaseId||'GENERAL')).forEach(l => {
          const { amount, profit } = calcCosts(l);
          const { paid, detailsStr } = getLinkedPayments(l.id);
          const remain = amount - paid;
          if (settlementFilter === 'PAID' && remain > 0) return;
          if (settlementFilter === 'UNPAID' && remain <= 0) return;
          
          raw.push({ _id: `log_${l.id}`, _index: globalIndex++, _module: 'LOGISTICS', module: 'لجستیک', projectName: getProjectName(l.projectId), date: l.date, title: l.title || 'سرویس', vendor: l.provider || '-', phase: getPhaseName(l.phaseId), amount, paidAmount: paid, remain, paymentDetails: detailsStr, profit, dueDate: '-', receiptDetails: '-' });
        });
      }

      if (selectedModules.includes('FINANCE')) {
        allTransactions.filter(t => t.direction === 'IN' && isDateMatch(t.date)).forEach(t => {
          let match = false;
          
          if (derivedContext === 'PROJECT' && projectId) {
            match = (String(t.referenceId) === String(projectId) || t.allocations?.some(a => String(a.projectId) === String(projectId))) ? true : false;
          } else if (derivedContext === 'CLIENT' || derivedContext === 'GLOBAL') {
            match = (String(t.clientId) === String(clientId) || clientProjects.map(p=>String(p.id)).includes(String(t.referenceId)));
            if (match && selectedProjectIds.length > 0) {
               match = selectedProjectIds.includes(String(t.referenceId)) || (t.allocations?.some(a => selectedProjectIds.includes(String(a.projectId || ''))) ?? false);
            }
          }

          const isPending = t.type === 'CHEQUE' && t.chequeDetails?.status === 'PENDING';
          if (match && txStatusFilter !== 'ALL') {
            if (txStatusFilter === 'CASHED' && isPending) match = false;
            if (txStatusFilter === 'PENDING' && !isPending) match = false;
          }
          
          if (match) {
            let chequeStr = '-';
            let dueDateStr = '-';
            let finalStatus = 'نقدی';

            if (t.type === 'CHEQUE') {
              const c = t.chequeDetails || (t as any); 
              const bank = c.bank || c.bankName || 'نامشخص';
              const num = c.serialNumber || c.chequeNumber || c.chequeNo || 'نامشخص';
              const sayyad = c.sayyadId || '-';
              
              dueDateStr = c.dueDate || c.date || 'نامشخص';
              chequeStr = `بانک: ${bank}\nسریال: ${num}\nصیاد: ${sayyad}`;
              
              if (c.status === 'PENDING') finalStatus = 'در جریان';
              else if (c.status === 'BOUNCED') finalStatus = 'برگشتی';
              else if (c.status === 'RETURNED') finalStatus = 'عودت داده شده';
              else finalStatus = 'پاس شده';
            } else {
              finalStatus = 'نقدی/حواله';
            }

            let pId = t.referenceId;
            if (derivedContext === 'CLIENT' || derivedContext === 'GLOBAL') {
               const alloc = t.allocations?.find(a => selectedProjectIds.includes(String(a.projectId)));
               if (alloc && alloc.projectId) pId = alloc.projectId;
            }

            raw.push({ 
              _id: `fin_${t.id}`, _index: globalIndex++, _module: 'FINANCE', module: 'تراکنش مالی', projectName: getProjectName(pId),
              date: t.date, title: t.description || 'تراکنش مالی', vendor: t.type === 'CHEQUE' ? (t.chequeDetails?.issuer || t.chequeDetails?.accountName || 'صاحب حساب نامشخص') : 'کارتخوان/نقدی', 
              phase: 'عمومی', amount: safeNum(t.amount), type: t.type === 'CHEQUE' ? 'چک' : 'نقدی', 
              status: finalStatus, chequeDetails: chequeStr, dueDate: dueDateStr, 
              remain: 0, paidAmount: safeNum(t.amount), profit: 0, receiptDetails: t.textReceipt || '-'
            });
          }
        });
      }
    }

    return raw.sort((a,b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (sortConfig === 'DATE_DESC') { const diff = dateB.localeCompare(dateA); return diff !== 0 ? diff : b._index - a._index; }
      if (sortConfig === 'DATE_ASC') { const diff = dateA.localeCompare(dateB); return diff !== 0 ? diff : a._index - b._index; }
      if (sortConfig === 'CREATED_DESC') return b._index - a._index;
      if (sortConfig === 'CREATED_ASC') return a._index - b._index;
      return 0;
    });

  }, [projectId, clientId, workerId, allProjects, allPurchases, allLaborLogs, allLogs, allTransactions, selectedModules, startDate, endDate, phaseFilter, txStatusFilter, settlementFilter, priceStrategy, projectPhases, sortConfig, selectedProjectIds, derivedContext]);

  const getFinalValue = (row: any, key: string, isExportingMode: boolean = false) => {
    const overrideKey = `${row._id}_${key}`;
    if (cellOverrides[overrideKey] !== undefined) {
        let val = cellOverrides[overrideKey];
        if (isExportingMode && exportCurrency === 'RIAL' && ['amount', 'paidAmount', 'remain', 'profit'].includes(key)) {
            return safeNum(val) * 10;
        }
        return val;
    }
    
    let val = row[key];

    if (key === 'vendor') {
      if (maskLaborNames && row._module === 'LABOR') return '-'; 
      if (maskVendorNames && row._module === 'PURCHASES') return 'تامین‌کننده (محفوظ)';
      if (maskVendorNames && row._module === 'LOGISTICS') return 'ناوگان حمل (محفوظ)';
    }

    if (smartRedundancy && key === 'vendor' && val === row.title && val && val !== '-') {
       return '---'; 
    }

    if (isExportingMode && exportCurrency === 'RIAL' && ['amount', 'paidAmount', 'remain', 'profit'].includes(key)) {
        return safeNum(val) * 10;
    }

    return val;
  };

  const tableGroups = useMemo(() => {
    const groups: Record<string, { modules: string[], data: any[], mergedSchema: Record<string, string> }> = {};
    
    selectedModules.forEach(mod => {
      const groupName = moduleGroups[mod];
      if (!groups[groupName]) {
        groups[groupName] = { modules: [], data: [], mergedSchema: {} };
      }
      groups[groupName].modules.push(mod);
    });

    Object.keys(groups).forEach(groupName => {
      const group = groups[groupName];
      if (group.modules.length === 1) {
        group.mergedSchema = SCHEMAS[group.modules[0]];
      } else {
        group.mergedSchema = SCHEMAS.MIXED; 
      }
    });

    rawDataList.forEach(item => {
      if (selectedRows.includes(item._id) || selectedRows.length === 0) { 
        const targetGroup = moduleGroups[item._module];
        if (targetGroup && groups[targetGroup]) {
          groups[targetGroup].data.push(item);
        }
      }
    });

    return groups;
  }, [rawDataList, moduleGroups, selectedModules, selectedRows]);

  useEffect(() => { setSelectedRows(rawDataList.map(r => r._id)); }, [rawDataList]);
  const toggleRow = (id: string) => setSelectedRows(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAllRows = () => setSelectedRows(selectedRows.length === rawDataList.length ? [] : rawDataList.map(r => r._id));

  const financialSummary = useMemo(() => {
    let totalExpenses = 0; 
    let totalReceipts = 0; 
    const currencyMultiplier = exportCurrency === 'RIAL' ? 10 : 1;

    rawDataList.forEach((r:any) => {
      if (selectedRows.includes(r._id)) {
        // 💡 در منطق نیروی کار LABOR_FINANCE نقش دریافتی رو داره
        if (r._module === 'FINANCE' || r._module === 'LABOR_FINANCE') {
          totalReceipts += safeNum(r.amount) * currencyMultiplier;
        } else {
          totalExpenses += safeNum(r.amount) * currencyMultiplier;
        }
      }
    });

    let finalBillingAmount = totalExpenses;
    let billingDesc = 'بر اساس مجموع دقیق هزینه‌ها';

    if (billingMode === 'PERCENT') {
      const p = safeNum(billingPercent);
      finalBillingAmount = totalExpenses + (totalExpenses * p / 100);
      billingDesc = `مدیریت پیمان (${p}٪ روی هزینه‌ها)`;
    } else if (billingMode === 'FIXED') {
      finalBillingAmount = safeNum(billingFixed) * currencyMultiplier;
      billingDesc = 'مبلغ مقطوع قرارداد';
    } else if (billingMode === 'DIMENSION') {
      finalBillingAmount = safeNum(dimL) * safeNum(dimW) * safeNum(dimH) * safeNum(dimPrice) * currencyMultiplier;
      billingDesc = `حجم/مساحت (${dimL} × ${dimW} × ${dimH}) با قیمت واحد ${(safeNum(dimPrice) * currencyMultiplier).toLocaleString('fa-IR')}`;
    }

    const balance = finalBillingAmount - totalReceipts;
    const balanceStatus = balance > 0 ? 'کارفرما بدهکار است' : balance < 0 ? 'پیمانکار بدهکار است (بستانکار)' : 'تسویه کامل';

    return { totalExpenses, totalReceipts, finalBillingAmount, billingDesc, balance, balanceStatus };
  }, [rawDataList, selectedRows, billingMode, billingPercent, billingFixed, dimL, dimW, dimH, dimPrice, exportCurrency]);

  const handleExport = async (format: 'EXCEL' | 'PDF') => {
    const dataToExport = rawDataList.filter((r:any) => selectedRows.includes(r._id));
    if (dataToExport.length === 0) return toast.error('هیچ ردیفی برای خروجی انتخاب نشده است.');

    setIsExporting(format);
    toast.info(`در حال آماده‌سازی فایل ${format}...`);

    try {
      const fileName = `Export_${moment().format('jYYYY-jMM-jDD_HH-mm')}`;
      const sheets: any[] = [];
      const pdfTables: any[] = [];
      
      const currencyLabel = exportCurrency === 'RIAL' ? ' (ریال)' : ' (تومان)';

      Object.keys(tableGroups).forEach(groupName => {
        const group = tableGroups[groupName];
        const groupData = group.data.filter((r:any) => selectedRows.includes(r._id));
        if (groupData.length === 0) return;

        const currentSchema = group.mergedSchema;
        const exportHeaders: Record<string, string> = {};
        const pdfHeaders: string[] = [];
        const activeKeys: string[] = [];
        
        const keysToProcess = Object.keys(currentSchema).filter(k => {
           if (k === 'vendor' && maskLaborNames && group.modules.length === 1 && group.modules[0] === 'LABOR') return false;
           return activeColumns.includes(k);
        });

        keysToProcess.forEach(key => {
          let headerText = currentSchema[key];
          if (['amount', 'paidAmount', 'remain', 'profit'].includes(key)) headerText += currencyLabel;
          
          exportHeaders[key] = headerText;
          pdfHeaders.push(headerText);
          activeKeys.push(key);
        });

        const excelData = groupData.map((row: any) => {
          const newRow: any = {};
          activeKeys.forEach(k => {
            const finalVal = getFinalValue(row, k, true);
            newRow[k] = (k === 'amount' || k === 'paidAmount' || k === 'remain' || k === 'profit') ? safeNum(finalVal) : (finalVal || '-');
          });
          newRow['_status'] = row['status']; 
          return newRow;
        });

        const sumCols = ['amount', 'paidAmount', 'remain', 'profit'].filter(c => activeKeys.includes(c));
        sheets.push({ sheetName: groupName.replace(/[/\\]/g, '-'), headers: exportHeaders, data: excelData, sumColumns: sumCols });

        const pdfData = groupData.map((row: any) => activeKeys.map(k => {
            const finalVal = getFinalValue(row, k, true);
            if (k === 'amount' || k === 'paidAmount' || k === 'remain' || k === 'profit') return safeNum(finalVal);
            return finalVal || '-';
        }));
        const sumIndexes = activeKeys.map((k, idx) => sumCols.includes(k) ? idx : -1).filter(i => i !== -1);
        
        pdfTables.push({ title: groupName, headers: pdfHeaders, data: pdfData, sumIndexes });
      });

      if (sheets.length === 0) throw new Error('شیت خالی است.');

      const extraInfo = {
        title: customReportTitle,
        clientName: customClientName,
        date: customReportDate || moment().format('jYYYY/jMM/jDD'), 
        highlightCheques: highlightCheques,
        financialSummary 
      };

      if (format === 'EXCEL') {
        await exportToExcelAdvanced(fileName, sheets, settings, extraInfo);
      } else {
        await exportToPdfAdvanced(fileName, pdfTables, includeSignature ? settings : null, extraInfo);
      }
      
      toast.success(`فایل ${format} با موفقیت دانلود شد.`);
      setTimeout(() => onClose(), 1000);
      
    } catch (error: any) {
      console.error(error);
      toast.error('خطا در تولید فایل خروجی. آیا فایل‌های صادرکننده را بروزرسانی کرده‌اید؟');
    } finally {
      setIsExporting(null);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-8" dir="rtl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isExporting && onClose()} className="absolute inset-0 bg-slate-900/85 backdrop-blur-md" />
      
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-7xl max-h-[95vh] flex flex-col bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center"><FileDown className="w-6 h-6 text-indigo-500" /></div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">گزارش‌ساز جامع سازمانی</h2>
              <p className="text-xs font-bold text-slate-500 mt-1">پیش‌نمایش جداول تفکیک‌شده و صدور صورت‌وضعیت</p>
            </div>
          </div>
          <button disabled={!!isExporting} onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-colors disabled:opacity-50"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto modal-scrollbar p-6 space-y-8 bg-slate-50 dark:bg-slate-900 relative">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500" /> ۱. تب‌ها و گروه‌بندی</h3>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-sm space-y-3">
                {currentModulesConfig.map(mod => (
                  <div key={mod.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <button onClick={() => toggleModule(mod.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedModules.includes(mod.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 text-transparent'}`}><Check className="w-4 h-4" strokeWidth={3} /></button>
                    <mod.icon className={`w-4 h-4 ${mod.color}`} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex-1">{mod.label}</span>
                    <InlineAnimatedSelect 
                      disabled={!selectedModules.includes(mod.id)}
                      options={groupOptions}
                      value={moduleGroups[mod.id]} 
                      onChange={(val: any) => setModuleGroups(prev => ({ ...prev, [mod.id]: val }))}
                    />
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2 pt-4"><Edit3 className="w-4 h-4 text-indigo-500" /> ۲. تنظیمات چاپ و سربرگ خروجی</h3>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-sm space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">عنوان اصلی گزارش</label>
                  <input type="text" value={customReportTitle} onChange={e => setCustomReportTitle(e.target.value)} placeholder="گزارش جامع..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">نام کارفرما / مشتری</label>
                  <input type="text" value={customClientName} onChange={e => setCustomClientName(e.target.value)} placeholder="نام کارفرما..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">تاریخ درج در سربرگ</label>
                  <input type="text" value={customReportDate} onChange={e => setCustomReportDate(e.target.value)} dir="ltr" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all text-center" />
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={highlightCheques} onChange={e => setHighlightCheques(e.target.checked)} className="sr-only" />
                      <div className={`w-10 h-6 rounded-full transition-colors ${highlightCheques ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${highlightCheques ? 'left-1' : 'right-1'}`}></div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"><Palette className="w-3.5 h-3.5"/> رنگ‌بندی هشداری چک‌ها در اکسل</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={includeSignature} onChange={e => setIncludeSignature(e.target.checked)} className="sr-only" />
                      <div className={`w-10 h-6 rounded-full transition-colors ${includeSignature ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${includeSignature ? 'left-1' : 'right-1'}`}></div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"><PenTool className="w-3.5 h-3.5"/> درج جایگاه امضا در انتهای PDF</span>
                  </label>
                </div>
              </div>

            </div>

            <div className="lg:col-span-8 space-y-4">
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><Filter className="w-4 h-4 text-indigo-500" /> ۳. فیلترها و انتخاب ستون‌ها</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                
                {(derivedContext === 'CLIENT' || derivedContext === 'LABOR') && (
                  <div className="space-y-2 col-span-1 sm:col-span-2 lg:col-span-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><FolderGit2 className="w-3.5 h-3.5"/> انتخاب پروژه‌ها (گزارش تجمعی)</label>
                    <AnimatedMultiSelect 
                      options={clientProjects} 
                      selected={selectedProjectIds} 
                      onChange={setSelectedProjectIds} 
                      placeholder="انتخاب پروژه‌ها..." 
                    />
                  </div>
                )}

                <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button onClick={() => setDatePreset('ALL')} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${datePreset === 'ALL' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}>همه زمان‌ها</button>
                  <button onClick={() => setDatePreset('THIS_MONTH')} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${datePreset === 'THIS_MONTH' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}>ماه جاری</button>
                  <button onClick={() => setDatePreset('THIS_YEAR')} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${datePreset === 'THIS_YEAR' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}>امسال</button>
                </div>

                {/* 💡 تقویم‌های اصلی بدون هیچ تغییری حفظ شدند */}
                <div className="space-y-1"><label className="text-[11px] font-bold text-slate-500">از تاریخ</label><GlassDatePicker value={startDate} onChange={setStartDate} /></div>
                <div className="space-y-1"><label className="text-[11px] font-bold text-slate-500">تا تاریخ</label><GlassDatePicker value={endDate} onChange={setEndDate} /></div>
                
                {(derivedContext === 'PROJECT' || derivedContext === 'GLOBAL') && <div className="space-y-1"><label className="text-[11px] font-bold text-slate-500">فاز اجرایی</label><GlassSelect options={phaseOptions} value={phaseFilter} onChange={setPhaseFilter} placeholder="تمامی فازها" /></div>}
                
                <div className="space-y-1"><label className="text-[11px] font-bold text-slate-500">فیلتر تراکنش/چک</label><GlassSelect options={[{ value: 'ALL', label: 'همه تراکنش‌ها' }, { value: 'CASHED', label: 'فقط نقد/پاس‌شده' }, { value: 'PENDING', label: 'چک‌های در جریان' }]} value={txStatusFilter} onChange={setTxStatusFilter} placeholder="همه" disabled={!selectedModules.includes('FINANCE') && !selectedModules.includes('LABOR_FINANCE')} /></div>
                <div className="space-y-1"><label className="text-[11px] font-bold text-slate-500">وضعیت تسویه (هزینه‌ها)</label><GlassSelect options={[{ value: 'ALL', label: 'همه فاکتورها' }, { value: 'PAID', label: 'کامل تسویه شده' }, { value: 'UNPAID', label: 'مانده‌دار (بدهکاریم)' }]} value={settlementFilter} onChange={setSettlementFilter} placeholder="همه" disabled={!selectedModules.some(m => ['PURCHASES', 'LABOR', 'LOGISTICS'].includes(m))} /></div>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><ArrowUpDown className="w-3.5 h-3.5"/> مرتب‌سازی ردیف‌ها</label>
                  <GlassSelect options={[{ value: 'DATE_DESC', label: 'جدیدترین تاریخ بالا' }, { value: 'DATE_ASC', label: 'قدیمی‌ترین تاریخ بالا' }, { value: 'CREATED_DESC', label: 'آخرین ثبت سیستم بالا' }, { value: 'CREATED_ASC', label: 'قدیمی‌ترین ثبت سیستم بالا' }]} value={sortConfig} onChange={(val:any) => setSortConfig(val)} placeholder="مرتب سازی" />
                </div>
              </div>

              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2 pt-2"><EyeOff className="w-4 h-4 text-indigo-500" /> ۴. حریم خصوصی، هوشمندسازی و ارز</h3>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full sm:w-1/2 mb-4">
                  <button onClick={() => setExportCurrency('TOMAN')} className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-2 ${exportCurrency === 'TOMAN' ? 'bg-indigo-500 shadow text-white' : 'text-slate-500'}`}>تومان (پایه)</button>
                  <button onClick={() => setExportCurrency('RIAL')} className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-2 ${exportCurrency === 'RIAL' ? 'bg-emerald-500 shadow text-white' : 'text-slate-500'}`}><ArrowLeftRight className="w-3 h-3"/> خروجی به ریال</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={maskLaborNames} onChange={e => setMaskLaborNames(e.target.checked)} className="sr-only" />
                      <div className={`w-10 h-6 rounded-full transition-colors ${maskLaborNames ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${maskLaborNames ? 'left-1' : 'right-1'}`}></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">مخفی کردن نام کارگران</span>
                      <span className="text-[9px] text-slate-500">جایگزینی نام با تخصص در چاپ</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={maskVendorNames} onChange={e => setMaskVendorNames(e.target.checked)} className="sr-only" />
                      <div className={`w-10 h-6 rounded-full transition-colors ${maskVendorNames ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${maskVendorNames ? 'left-1' : 'right-1'}`}></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">مخفی کردن نام فروشندگان</span>
                      <span className="text-[9px] text-slate-500">جایگزینی با «تامین‌کننده/راننده»</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={smartRedundancy} onChange={e => setSmartRedundancy(e.target.checked)} className="sr-only" />
                      <div className={`w-10 h-6 rounded-full transition-colors ${smartRedundancy ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${smartRedundancy ? 'left-1' : 'right-1'}`}></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">حذف تکرار (نام و تخصص)</span>
                      <span className="text-[9px] text-slate-500">اگر نام و تخصص یکی بود ادغام می‌شود</span>
                    </div>
                  </label>
                </div>
              </div>

              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2 pt-2"><Calculator className="w-4 h-4 text-indigo-500" /> ۵. تنظیمات قرارداد و صورت‌وضعیت نهایی</h3>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button onClick={() => setBillingMode('ACTUAL')} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${billingMode === 'ACTUAL' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}>هزینه قطعی</button>
                  <button onClick={() => setBillingMode('PERCENT')} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${billingMode === 'PERCENT' ? 'bg-indigo-500 shadow text-white' : 'text-slate-500'}`}>درصدی (پیمان)</button>
                  <button onClick={() => setBillingMode('FIXED')} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${billingMode === 'FIXED' ? 'bg-rose-500 shadow text-white' : 'text-slate-500'}`}>مقطوع (کنترات)</button>
                  <button onClick={() => setBillingMode('DIMENSION')} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${billingMode === 'DIMENSION' ? 'bg-emerald-500 shadow text-white' : 'text-slate-500'}`}>مساحت / حجم</button>
                </div>

                <AnimatePresence mode="wait">
                  {billingMode === 'PERCENT' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">درصد مدیریت پیمان / سود (%)</label>
                      <input type="number" value={billingPercent} onChange={e => setBillingPercent(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" dir="ltr" />
                    </motion.div>
                  )}
                  {billingMode === 'FIXED' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">مبلغ مقطوع قرارداد ({exportCurrency === 'RIAL' ? 'ریال' : 'تومان'})</label>
                      <input type="text" value={billingFixed} onChange={e => setBillingFixed(e.target.value)} placeholder="مثال: 50,000,000" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" dir="ltr" />
                    </motion.div>
                  )}
                  {billingMode === 'DIMENSION' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-4 gap-2">
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">طول</label><input type="text" value={dimL} onChange={e => setDimL(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-xs outline-none" dir="ltr" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">عرض</label><input type="text" value={dimW} onChange={e => setDimW(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-xs outline-none" dir="ltr" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">ارتفاع</label><input type="text" value={dimH} onChange={e => setDimH(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-xs outline-none" dir="ltr" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">قیمت واحد</label><input type="text" value={dimPrice} onChange={e => setDimPrice(e.target.value)} placeholder={exportCurrency === 'RIAL' ? 'ریال' : 'تومان'} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-xs outline-none" dir="ltr" /></div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mt-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">مجموع هزینه‌ها</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">{financialSummary.totalExpenses.toLocaleString('fa-IR')} <span className="text-[9px] font-normal text-slate-400">{exportCurrency === 'RIAL' ? '﷼' : 'تومان'}</span></span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">مبلغ صورت‌وضعیت</span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{financialSummary.finalBillingAmount.toLocaleString('fa-IR')} <span className="text-[9px] font-normal text-indigo-300">{exportCurrency === 'RIAL' ? '﷼' : 'تومان'}</span></span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">دریافتی از کارفرما</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{financialSummary.totalReceipts.toLocaleString('fa-IR')} <span className="text-[9px] font-normal text-emerald-300">{exportCurrency === 'RIAL' ? '﷼' : 'تومان'}</span></span>
                  </div>
                  <div className="space-y-1 border-r border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-500 block">وضعیت مانده</span>
                    <span className={`text-xs font-black ${financialSummary.balance > 0 ? 'text-amber-500' : financialSummary.balance < 0 ? 'text-rose-500' : 'text-slate-600'}`}>{Math.abs(financialSummary.balance).toLocaleString('fa-IR')} <span className="text-[9px] font-normal opacity-50">{exportCurrency === 'RIAL' ? '﷼' : 'تومان'}</span></span>
                    <span className={`text-[9px] font-bold block mt-1 ${financialSummary.balance > 0 ? 'text-amber-500' : financialSummary.balance < 0 ? 'text-rose-500' : 'text-slate-600'}`}>{financialSummary.balanceStatus}</span>
                  </div>
                </div>

                <div className="space-y-1 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <label className="text-[11px] font-bold text-slate-500">مبنای قیمت جداول بالا (برای هزینه‌ها)</label>
                  <GlassSelect options={[{ value: 'BILLED', label: 'فاکتور کارفرما (با سود)' }, { value: 'INTERNAL', label: 'قیمت پای‌کار (واقعی)' }]} value={priceStrategy} onChange={(val:any) => setPriceStrategy(val)} placeholder="مبنا" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 mt-4">
                <h4 className="text-[11px] font-black text-slate-500 flex items-center gap-1"><Settings2 className="w-4 h-4"/> انتخاب ستون‌های خروجی</h4>
                <div className="flex flex-wrap gap-2 pt-2">
                  {allPossibleColumns.map(colId => (
                    <button key={colId} onClick={() => toggleColumn(colId)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${activeColumns.includes(colId) ? 'bg-indigo-50 text-indigo-600 border-indigo-300 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'}`}>
                      {MASTER_DICTIONARY[colId] || colId} {activeColumns.includes(colId) && <Check className="w-3 h-3"/>}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><ListChecks className="w-4 h-4 text-indigo-500" /> ۶. پیش‌نمایش و ویرایش دستی</h3>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">{rawDataList.length} رکورد کل یافت شد</span>
              </div>
              <button 
                onClick={() => setLiveEditMode(!liveEditMode)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border ${liveEditMode ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}
              >
                <Wand2 className="w-4 h-4" /> {liveEditMode ? 'پایان ویرایش' : 'فعال‌سازی ویرایش دستی متن‌ها'}
              </button>
            </div>

            {Object.keys(tableGroups).map(groupName => {
              const group = tableGroups[groupName];
              if (group.data.length === 0) return null;

              const currentSchema = group.mergedSchema;
              
              const displayKeys = Object.keys(currentSchema).filter(k => {
                 if (k === 'vendor' && maskLaborNames && group.modules.length === 1 && group.modules[0] === 'LABOR') return false;
                 return activeColumns.includes(k);
              });

              return (
                <div key={groupName} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-100 dark:bg-slate-900/50 p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h4 className="text-sm font-black text-indigo-600 dark:text-indigo-400">{groupName}</h4>
                    <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">{group.data.length} ردیف</span>
                  </div>
                  
                  <div className="overflow-x-auto max-h-[45vh] modal-scrollbar">
                    <table className="w-full text-right text-[11px] font-bold whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="p-3 w-10 text-center border-b border-slate-200 dark:border-slate-700">
                             <TableCheckbox checked={group.data.every(r => selectedRows.includes(r._id))} onChange={toggleAllRows} />
                          </th>
                          {displayKeys.map(k => <th key={k} className="p-3 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{currentSchema[k]} {['amount', 'paidAmount', 'remain', 'profit'].includes(k) && <span className="text-[9px] opacity-70">({exportCurrency === 'RIAL' ? 'ریال' : 'تومان'})</span>}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {group.data.map((row, index) => {
                            const isSelected = selectedRows.includes(row._id);
                            const isEven = index % 2 === 0;
                            const isPending = row.status === 'در جریان';
                            const isBounced = row.status === 'برگشتی';
                            const rowColorClass = !isSelected ? 'opacity-40 bg-slate-100 dark:bg-slate-900 grayscale' : 
                                                  (highlightCheques && isBounced) ? 'bg-rose-50 hover:bg-rose-100 text-rose-800' :
                                                  (highlightCheques && isPending) ? 'bg-amber-50 hover:bg-amber-100 text-amber-800' :
                                                  isEven ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/50';

                            return (
                              <motion.tr 
                                layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                key={row._id} 
                                className={`${rowColorClass} transition-colors border-b border-slate-100 dark:border-slate-700`}
                              >
                                <td className="p-3 text-center">
                                  <TableCheckbox checked={isSelected} onChange={() => toggleRow(row._id)} />
                                </td>
                                {displayKeys.map(k => {
                                  const finalVal = getFinalValue(row, k);
                                  const isAmount = ['amount', 'paidAmount', 'remain', 'profit'].includes(k);
                                  
                                  const canEdit = liveEditMode && isSelected && !isAmount && !['status', 'date', 'type'].includes(k);

                                  return (
                                    <td key={k} className="p-3 text-slate-700 dark:text-slate-300 max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap" title={String(finalVal)}>
                                      {canEdit ? (
                                        <input 
                                          type="text"
                                          value={finalVal === '-' || finalVal === '---' ? '' : finalVal}
                                          onChange={e => setCellOverrides(prev => ({ ...prev, [`${row._id}_${k}`]: e.target.value }))}
                                          placeholder="-"
                                          className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/50 rounded-md px-2 py-1 text-[11px] font-black outline-none focus:ring-2 ring-indigo-500/30"
                                        />
                                      ) : (
                                        isAmount ? safeNum(finalVal).toLocaleString('fa-IR') : (finalVal || '-')
                                      )}
                                    </td>
                                  )
                                })}
                              </motion.tr>
                            )
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>

        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4 shrink-0 relative">
          {isExporting && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              <span className="font-black text-indigo-600 dark:text-indigo-400">تولید فایل و جداول... لطفاً صبر کنید</span>
            </div>
          )}
          <button onClick={() => handleExport('EXCEL')} disabled={selectedRows.length === 0 || !!isExporting} className="flex-1 py-4 rounded-2xl font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale">
            <FileSpreadsheet className="w-5 h-5"/> دانلود Excel
          </button>
          <button onClick={() => handleExport('PDF')} disabled={selectedRows.length === 0 || !!isExporting} className="flex-1 py-4 rounded-2xl font-black bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale">
            <FileText className="w-5 h-5"/> دانلود PDF
          </button>
        </div>

      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
}