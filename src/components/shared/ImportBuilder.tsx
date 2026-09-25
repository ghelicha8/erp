import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileUp, X, CheckCircle, Database, LayoutTemplate, AlertTriangle, 
  CheckSquare, Banknote, HardHat, ShoppingCart, Truck, Sparkles, Shuffle, Ban, Eye,
  Activity, ShieldAlert, Check, FileWarning, Search, Info, UserSquare, FolderGit2,
  BrainCircuit, CreditCard, Phone, Fingerprint, Receipt, Building2, Layers, ChevronDown, Download, FileSpreadsheet, CalendarClock, Coffee
} from 'lucide-react';
import { toast } from 'sonner';

import * as ExcelJS from 'exceljs';
import Papa from 'papaparse';

import { useProjectStore } from '../../features/projects/store/projectStore';
import { useFinanceStore } from '../../store/financeStore';
import { useClientStore } from '../../store/clientStore'; 
import { useLaborStore } from '../../store/laborStore';
import { usePurchaseStore } from '../../store/purchaseStore';
import { useLogisticsStore } from '../../store/logisticsStore';

import { ImportEngine } from '../../core/engines/ImportEngine';
import type { ParsedRow } from '../../core/engines/ImportEngine';

// 💡 استفاده یکپارچه از لیست کشویی گرافیکی
import { PortalSelect } from '../ui/SharedLaborUI';

export interface ImportBuilderProps {
  projectId?: string; 
  clientId?: string;
  workerId?: string;
  context?: 'PROJECT' | 'CLIENT' | 'LABOR' | 'GLOBAL';
  onClose: () => void;
}

type ImportModule = 'FINANCE' | 'LABOR' | 'PURCHASES' | 'LOGISTICS' | 'MIXED' | 'LABOR_MONTHLY' | 'LABOR_MISC' | null;

const MODULE_FIELDS = [
  { id: 'date', label: 'تاریخ / زمانبندی' },
  { id: 'title', label: 'شرح / شخص / کالا / ماشین' },
  { id: 'type', label: 'نوع / تخصص / گروه / فاز' },
  { id: 'qty', label: 'مقدار / تعداد / روزکرد' },
  { id: 'unitPrice', label: 'فی / قیمت واحد / دستمزد پایه' },
  { id: 'amount', label: 'مبلغ نهایی / جمع کل / پرداختی' },
  { id: 'percentage', label: 'درصد (مالیات/سود/تخفیف)' },
  { id: 'notes', label: 'ملاحظات / توضیحات تکمیلی' },
];

const ALIAS_DICTIONARY: Record<string, string[]> = {
  date: ['تاریخ', 'زمان', 'date', 'day', 'روز', 'مورخ', 'زمانبندی', 'سررسید'],
  title: ['عنوان', 'شرح', 'نام', 'شخص', 'کالا', 'بابت', 'توضیحات', 'title', 'فروشنده', 'راننده', 'کارگر', 'طرف حساب', 'تخصص / کار', 'شرح سرویس', 'شرح تراکنش', 'شرح فاکتور', 'شرح / عنوان'],
  type: ['نوع', 'مسیر', 'دسته', 'گروه', 'type', 'آدرس', 'مبدا', 'مقصد', 'تخصص', 'عملیات', 'فاز', 'بخش'],
  qty: ['مقدار', 'تعداد', 'وزن', 'حجم', 'روزکرد', 'ساعت', 'qty', 'quantity'],
  unitPrice: ['فی', 'قیمت واحد', 'دستمزد روزانه', 'دستمزد واحد', 'نرخ'],
  amount: ['مبلغ', 'هزینه', 'ارزش', 'قیمت', 'دستمزد', 'کرایه', 'amount', 'جمع', 'total', 'بهای کل', 'پرداختی', 'واریزی', 'بستانکار', 'بدهکار', 'مبلغ کل', 'دستمزد کل', 'کل پرداختی', 'مبلغ تراکنش', 'مبلغ فاکتور'],
  percentage: ['درصد', 'سود', 'مالیات', 'تخفیف', '%', 'percentage', 'vat'],
  notes: ['ملاحظات', 'یادداشت', 'شرح تکمیلی', 'توضیحات', 'notes', 'پیوست', 'جزئیات پرداختی', 'رسید متنی']
};

const getExcelColumnLetter = (colIndex: number): string => {
  let temp = colIndex;
  let letter = '';
  while (temp > 0) {
    let modulo = (temp - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    temp = Math.floor((temp - modulo) / 26);
  }
  return letter;
};

const safeNum = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  return Number(String(val).replace(/\D/g, "")) || 0;
};

export default function ImportBuilder({ projectId, clientId, workerId, context, onClose }: ImportBuilderProps) {
  const allProjects = useProjectStore(state => state.projects) || [];
  const allClients = useClientStore(state => state.clients) || [];
  const allTransactions = useFinanceStore(state => state.transactions) || [];
  
  const allLabor = useLaborStore(state => state.logs) || [];
  const allWorkers = useLaborStore(state => state.workers) || [];
  const addLaborBulkLogs = useLaborStore(state => state.addBulkLogs);

  const allPurchases = usePurchaseStore(state => state.purchases) || [];
  const allLogistics = useLogisticsStore(state => state.logs) || [];

  const addLaborRecord = useProjectStore(state => state.addLaborRecord);
  const addPurchaseRecord = useProjectStore(state => state.addPurchaseRecord);
  const addLogisticsRecord = useProjectStore(state => state.addLogisticsRecord);
  const addTransaction = useFinanceStore(state => state.addTransaction);

  const derivedContext = context || (projectId ? 'PROJECT' : clientId ? 'CLIENT' : workerId ? 'LABOR' : 'GLOBAL');
  
  const [localWorkerId, setLocalWorkerId] = useState<string>(workerId || '');
  useEffect(() => {
    if (workerId) setLocalWorkerId(workerId);
  }, [workerId]);

  const targetWorker = localWorkerId ? allWorkers.find(w => String(w.id) === String(localWorkerId)) : null;

  const targetProject = projectId ? allProjects.find(p => String(p.id) === String(projectId)) : null;
  const targetClient = targetProject?.clientId ? allClients.find(c => String(c.id) === String(targetProject.clientId)) : clientId ? allClients.find(c => String(c.id) === String(clientId)) : null;

  const [selectedClientId, setSelectedClientId] = useState<string>(targetClient?.id || '');
  const [activeProjectId, setActiveProjectId] = useState<string>(projectId || ''); 
  const [fileCurrency, setFileCurrency] = useState<'TOMAN' | 'RIAL'>('TOMAN');

  useEffect(() => {
    if (projectId) setActiveProjectId(projectId);
    if (targetClient) setSelectedClientId(targetClient.id);
  }, [projectId, targetClient]);

  const filteredProjects = useMemo(() => {
    let projs = allProjects;
    
    if (derivedContext === 'LABOR' && localWorkerId) {
      const workerHistoryProjectIds = new Set(allLabor.filter(l => String(l.workerId) === String(localWorkerId)).map(l => l.projectId));
      if (workerHistoryProjectIds.size > 0 && !selectedClientId) {
         projs = projs.filter(p => workerHistoryProjectIds.has(p.id));
      }
    }

    if (selectedClientId) {
      if (selectedClientId === 'FREE') {
         projs = projs.filter(p => !p.clientId || p.clientId === 'FREE');
      } else {
         projs = projs.filter(p => String(p.clientId) === String(selectedClientId));
      }
    }
    return projs;
  }, [selectedClientId, allProjects, derivedContext, localWorkerId, allLabor]);

  const clientOptions = useMemo(() => [
    { id: '', value: '', label: '-- همه کارفرمایان --' }, 
    { id: 'FREE', value: 'FREE', label: 'بدون کارفرما (آزاد)' }, 
    ...allClients.map(c => ({ id: c.id, value: c.id, label: `${c.name} ${c.lastName || ''}`.trim() }))
  ], [allClients]);

  const projectOptions = useMemo(() => [
    { id: '', value: '', label: '-- انتخاب از لیست --' }, 
    { id: 'FREE', value: 'FREE', label: 'بدون پروژه اختصاصی (آزاد)' }, 
    ...filteredProjects.map(p => ({ id: p.id, value: p.id, label: p.title || p.name || 'بدون نام' }))
  ], [filteredProjects]);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedModule, setSelectedModule] = useState<ImportModule>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 100, text: '' });
  
  const [excelCols, setExcelCols] = useState<{key: string, label: string}[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); 
  
  type UIRow = ParsedRow & { isInternalOnly?: boolean; selectedProjectId?: string; selectedPhaseId?: string; };
  const [parsedRows, setParsedRows] = useState<UIRow[]>([]);
  const [selectedRowIndexes, setSelectedRowIndexes] = useState<number[]>([]);
  const [importReport, setImportReport] = useState<any>(null);

  const [bulkProject, setBulkProject] = useState<string>('');
  const [bulkPhase, setBulkPhase] = useState<string>('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;

  const bulkPhaseOptions = useMemo(() => {
    const pId = bulkProject || activeProjectId;
    const proj = allProjects.find(p => String(p.id) === String(pId));
    const phases = proj?.phases || [];
    return [{ id: 'GENERAL', value: 'GENERAL', label: 'عمومی / بدون فاز' }, ...phases.map((ph: any) => ({ id: ph.id, value: ph.id, label: ph.name }))];
  }, [bulkProject, activeProjectId, allProjects]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeProjectId && derivedContext === 'PROJECT') return toast.error('ابتدا پروژه مقصد را انتخاب کنید.');
    if (derivedContext === 'LABOR' && !localWorkerId) return toast.error('ابتدا نیروی کار مورد نظر را انتخاب کنید.');
    
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) return toast.error('حجم فایل نباید بیشتر از ۱۵ مگابایت باشد.');

    setIsProcessing(true);
    setProgress({ current: 0, total: 100, text: 'تحلیل چندگانه شیت‌ها و کشف متادیتا...' });

    try {
      let rawData: any[] = [];
      let globalDisplayCols: {key: string, label: string}[] = [];
      const metadataTexts: string[] = [file.name]; 
      const fileNameLower = file.name.toLowerCase();

      if (fileNameLower.endsWith('.csv')) {
        await new Promise<void>((resolve, reject) => {
          Papa.parse(file, { header: false, skipEmptyLines: true, complete: (res) => {
            const parsedData = res.data.map(row => {
              const obj: any = { _sheetName: 'CSV Data' };
              (row as any[]).forEach((val, i) => { obj[getExcelColumnLetter(i + 1)] = val; });
              return obj;
            });
            
            let bestHeaderRowIdx = 0, maxScore = 0;
            for (let i = 0; i < Math.min(30, parsedData.length); i++) {
                let score = 0;
                const vals = Object.values(parsedData[i]).map(String).join(' ').toLowerCase();
                Object.values(ALIAS_DICTIONARY).flat().forEach(alias => { if (vals.includes(alias.toLowerCase())) score++; });
                if (score > maxScore) { maxScore = score; bestHeaderRowIdx = i; }
            }

            const colsSet = new Set<string>();
            Object.keys(parsedData[bestHeaderRowIdx]).forEach(k => { if(k !== '_sheetName') colsSet.add(k) });
            globalDisplayCols = Array.from(colsSet).sort().map(c => ({ key: c, label: String(parsedData[bestHeaderRowIdx][c] || `ستون ${c}`) }));
            
            for(let i=0; i<bestHeaderRowIdx; i++) {
               metadataTexts.push(Object.values(parsedData[i]).map(String).join(' '));
            }

            rawData.push(...parsedData.slice(bestHeaderRowIdx + 1));
            resolve();
          }, error: reject });
        });
      } else {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        
        let maxGlobalScore = -1;

        workbook.worksheets.forEach(ws => {
          if (ws.state === 'hidden' || ws.state === 'veryHidden') return;
          metadataTexts.push(ws.name); 
          
          let sheetData: any[] = [];
          ws.eachRow({ includeEmpty: false }, (row) => {
            let rowData: any = { _sheetName: ws.name }; 
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              let val = cell.value;
              if (val && typeof val === 'object' && 'formula' in val) val = (val as any).result;
              if (cell.isMerged && cell.master) val = cell.master.value;
              if (val && typeof val === 'object' && 'richText' in val) val = (val as any).richText.map((rt: any) => rt.text).join('');
              rowData[getExcelColumnLetter(colNumber)] = val;
            });
            if (Object.keys(rowData).length > 1) sheetData.push(rowData);
          });

          if (sheetData.length > 0) {
            let bestHeaderRowIdx = 0, maxScore = 0;
            for (let i = 0; i < Math.min(30, sheetData.length); i++) {
                let score = 0;
                const vals = Object.values(sheetData[i]).map(String).join(' ').toLowerCase();
                Object.values(ALIAS_DICTIONARY).flat().forEach(alias => { if (vals.includes(alias.toLowerCase())) score++; });
                if (score > maxScore) { maxScore = score; bestHeaderRowIdx = i; }
            }
            
            if (maxScore > maxGlobalScore) {
               maxGlobalScore = maxScore;
               const colsSet = new Set<string>();
               Object.keys(sheetData[bestHeaderRowIdx]).forEach(k => { if(k !== '_sheetName') colsSet.add(k) });
               globalDisplayCols = Array.from(colsSet).sort().map(c => ({ key: c, label: String(sheetData[bestHeaderRowIdx][c] || `ستون ${c}`) }));
            }

            for(let i=0; i<bestHeaderRowIdx; i++) {
               metadataTexts.push(Object.values(sheetData[i]).map(String).join(' '));
            }

            rawData.push(...sheetData.slice(bestHeaderRowIdx + 1));
          }
        });
      }

      if (rawData.length === 0) throw new Error('فایل حاوی داده معتبر نیست یا تمامی شیت‌ها خالی هستند.');

      if (!activeProjectId && derivedContext !== 'PROJECT' && derivedContext !== 'LABOR') {
        const engine = new ImportEngine({ workers: [], vehicles: [], inventory: [], clients: allClients }); 
        const foundId = engine.analyzeMetadataForProject(metadataTexts, filteredProjects);
        if (foundId) {
            setActiveProjectId(foundId);
            toast.success('پروژه از متادیتا (نام فایل/شیت/سربرگ) تشخیص داده شد! 🎯');
        }
      }

      setExcelCols(globalDisplayCols);
      setExcelData(rawData); 
      
      const colsHash = globalDisplayCols.map(c => c.label.substring(0,5)).join('|');
      const savedMapping = localStorage.getItem(`peyman_mapping_${colsHash}`);
      
      if (savedMapping) {
        setMapping(JSON.parse(savedMapping));
        toast.info('الگوی فایل شناسایی شد! مپینگ‌ها به‌صورت خودکار چیده شدند.');
      } else {
        const autoMap: Record<string, string> = {};
        MODULE_FIELDS.forEach(sysField => {
          const keywords = ALIAS_DICTIONARY[sysField.id] || [];
          const matchedCol = globalDisplayCols.find(c => keywords.some(kw => String(c.label).toLowerCase().includes(kw)));
          autoMap[sysField.id] = matchedCol ? matchedCol.key : '';
        });
        setMapping(autoMap);
      }

      setStep(2);
    } catch (err: any) {
      toast.error(err.message || 'خطا در پردازش فایل اکسل.');
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePreview = async () => {
    if (!selectedModule) return;

    const colsHash = excelCols.map(c => c.label.substring(0,5)).join('|');
    localStorage.setItem(`peyman_mapping_${colsHash}`, JSON.stringify(mapping));

    setIsProcessing(true);
    setProgress({ current: 0, total: 100, text: 'استارت موتور هوش مصنوعی و کراس‌رفرنس...' });
    
    await new Promise(resolve => setTimeout(resolve, 50)); 

    try {
      const masterData = {
        workers: Array.from(new Set(allLabor.map(l => l.workerName))).map(name => ({ id: name, name, lastName: '', specialty: 'کارگر' })),
        vehicles: Array.from(new Set(allLogistics.map(l => l.provider))).map(prov => ({ id: prov, name: prov, plate: '', type: 'ماشین', isInternal: true })),
        inventory: Array.from(new Set(allPurchases.map(p => p.title))).map(title => ({ id: title, title, category: 'مصالح' })),
        clients: allClients,
        activeTaxRates: [0.09, 0.10]
      };

      const engine = new ImportEngine(masterData);
      let rawParsedRows = engine.processRawExcel(excelData, mapping);

      if (fileCurrency === 'RIAL') {
        rawParsedRows = rawParsedRows.map(row => {
          if (row.detectedCurrency !== 'RIAL') {
            return {
              ...row,
              amount: row.amount / 10,
              unitPrice: row.unitPrice / 10,
              calculatedTax: row.calculatedTax / 10,
              calculatedManagementFee: row.calculatedManagementFee / 10,
              calculatedDiscount: row.calculatedDiscount / 10,
              calculatedGoodPerformance: row.calculatedGoodPerformance / 10,
              calculatedInsurance: row.calculatedInsurance / 10,
              detectedCurrency: 'RIAL'
            };
          }
          return row;
        });
      }

      if (selectedModule !== 'MIXED') {
        rawParsedRows = rawParsedRows.map(r => r._targetModule !== 'UNKNOWN' && r._targetModule !== 'IGNORE' ? { ...r, _targetModule: selectedModule as any } : r);
      }

      const rowsWithUIState: UIRow[] = rawParsedRows.map(r => {
        let isDuplicate = false;
        
        if (r._targetModule === 'FINANCE') {
          isDuplicate = allTransactions.some(t => t.date === r.date && safeNum(t.amount) === r.amount);
        } else if (r._targetModule === 'LABOR') {
          isDuplicate = allLabor.some(l => (l.date === r.date || l.startDate === r.date) && (safeNum(l.wage) === r.amount || safeNum(l.amount) === r.amount));
        } else if (r._targetModule === 'LABOR_MONTHLY' || r._targetModule === 'LABOR_MISC') {
          isDuplicate = allLabor.some(l => (l.date === r.date || l.startDate === r.date) && (safeNum(l.amount) === r.amount || safeNum(l.bonus) === r.amount || safeNum(l.foodDeduction) === r.amount));
        } else if (r._targetModule === 'PURCHASES') {
          isDuplicate = allPurchases.some(p => p.date === r.date && (safeNum(p.totalCost) === r.amount || safeNum(p.amount) === r.amount || safeNum(p.billedCost) === r.amount));
        } else if (r._targetModule === 'LOGISTICS') {
          isDuplicate = allLogistics.some(l => l.date === r.date && (safeNum(l.totalCost) === r.amount || safeNum(l.amount) === r.amount || safeNum(l.fee) === r.amount || safeNum(l.billedCost) === r.amount));
        }

        const newActions = [...r.needsUserAction];
        const newErrors = [...r.validationErrors];
        
        if (isDuplicate) {
          newActions.push('CONFIRM_DUPLICATE');
          newErrors.push('مشابه این رکورد در پایگاه‌داده‌ی سیستم (قدیمی) وجود دارد.');
        }

        return { 
          ...r, 
          isInternalOnly: false,
          selectedProjectId: activeProjectId || '', 
          selectedPhaseId: r.suggestedPhase !== 'GENERAL' ? r.suggestedPhase : 'GENERAL',
          needsUserAction: newActions,
          validationErrors: newErrors
        };
      });

      setParsedRows(rowsWithUIState);
      
      const validIndexes = rowsWithUIState
        .filter(r => r._targetModule !== 'UNKNOWN' && r._targetModule !== 'IGNORE' && !r.needsUserAction.includes('CONFIRM_DUPLICATE'))
        .map(r => r._index);
        
      setSelectedRowIndexes(validIndexes);
      setCurrentPage(1);
      setStep(3);
    } catch (err) {
      console.error(err);
      toast.error('خطا در موتور پردازش.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkProjectApply = () => {
    if (!bulkProject) return toast.error('ابتدا یک پروژه از لیست دسته‌جمعی انتخاب کنید.');
    if (selectedRowIndexes.length === 0) return toast.error('هیچ ردیفی انتخاب نشده است.');
    
    setParsedRows(prev => prev.map(r => selectedRowIndexes.includes(r._index) ? { ...r, selectedProjectId: bulkProject, selectedPhaseId: 'GENERAL' } : r));
    toast.success('پروژه با موفقیت به ردیف‌های انتخاب شده اعمال شد.');
  };

  const handleBulkPhaseApply = () => {
    if (!bulkPhase) return toast.error('ابتدا یک فاز از لیست دسته‌جمعی انتخاب کنید.');
    if (selectedRowIndexes.length === 0) return toast.error('هیچ ردیفی انتخاب نشده است.');

    setParsedRows(prev => prev.map(r => selectedRowIndexes.includes(r._index) ? { ...r, selectedPhaseId: bulkPhase } : r));
    toast.success('فاز با موفقیت به ردیف‌های انتخاب شده اعمال شد.');
  };

  const toggleRow = (index: number) => setSelectedRowIndexes(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  const toggleInternalAccounting = (rowIndex: number) => setParsedRows(prev => prev.map(r => r._index === rowIndex ? { ...r, isInternalOnly: !r.isInternalOnly } : r));

  const resolveUserAction = (rowIndex: number, actionType: string, resolutionData: any) => {
    setParsedRows(prev => prev.map(r => {
      if (r._index !== rowIndex) return r;
      const newRow = { ...r };
      
      if (actionType === 'IS_TAX') {
        newRow.calculatedTax = newRow.calculatedTax || newRow.calculatedMarkup || newRow.calculatedDiscount;
        newRow.calculatedMarkup = 0; newRow.calculatedDiscount = 0;
        newRow.needsUserAction = newRow.needsUserAction.filter(a => a !== 'CONFIRM_TAX_OR_FEE');
      } 
      else if (actionType === 'IS_FEE') {
        newRow.calculatedManagementFee = newRow.calculatedTax || newRow.calculatedMarkup || newRow.calculatedDiscount;
        newRow.calculatedTax = 0; newRow.calculatedDiscount = 0;
        newRow.needsUserAction = newRow.needsUserAction.filter(a => a !== 'CONFIRM_TAX_OR_FEE');
      }
      else if (actionType === 'VERIFY_DATE') newRow.needsUserAction = newRow.needsUserAction.filter(a => a !== 'VERIFY_DATE');
      else if (actionType === 'SELECT_MODULE') newRow._targetModule = resolutionData;
      else if (actionType === 'CONFIRM_DUPLICATE') newRow.needsUserAction = newRow.needsUserAction.filter(a => a !== 'CONFIRM_DUPLICATE');
      
      return newRow;
    }));

    if (actionType === 'CONFIRM_DUPLICATE') {
       setSelectedRowIndexes(prev => prev.includes(rowIndex) ? prev : [...prev, rowIndex]);
       toast.success('ردیفِ دارای تشابه، با اجازه شما برای واردات تایید شد.');
    }
  };

  const handleExportErrors = async () => {
    const errorRows = parsedRows.filter(r => r._targetModule === 'UNKNOWN' || r.validationErrors.length > 0 || r.needsUserAction.length > 0);
    if (errorRows.length === 0) return toast.info('هیچ ردیف دارای خطایی یافت نشد!');
    
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Error_Rows');
    
    const originalHeaders = excelCols.map(c => c.label);
    ws.addRow([...originalHeaders, 'دلایل خطا / اخطار (سیستم)']);
    
    errorRows.forEach(r => {
       const rowData = excelCols.map(c => r._originalData[c.key]);
       ws.addRow([...rowData, r.validationErrors.join(' | ')]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Rejected_Rows_${moment().format('jYYYY-jMM-jDD')}.xlsx`;
    link.click();
    toast.success('فایل ردیف‌های نامعتبر با موفقیت دانلود شد.');
  };

  const handleFinalImport = async () => {
    if (selectedRowIndexes.length === 0) return toast.error('هیچ ردیفی انتخاب نشده است.');

    const dataToImport = parsedRows.filter(r => selectedRowIndexes.includes(r._index));
    
    const missingProjects = dataToImport.filter(r => !r.selectedProjectId && r._targetModule !== 'UNKNOWN' && r._targetModule !== 'IGNORE');
    if (missingProjects.length > 0 && derivedContext !== 'LABOR') {
      return toast.error(`تعداد ${missingProjects.length} ردیف، پروژه‌ای برای تخصیص ندارند! لطفاً مشخص کنید.`);
    }

    setIsProcessing(true);
    const startTime = Date.now();
    let successCount = 0;
    let errorsCount = 0;

    try {
      const laborLogsToInsert: any[] = [];

      for (let i = 0; i < dataToImport.length; i++) {
        if (i % 30 === 0) {
          setProgress({ current: i, total: dataToImport.length, text: `در حال تزریق رکورد ${i} از ${dataToImport.length} در دیتابیس...` });
          await new Promise(r => setTimeout(r, 10)); 
        }

        const row = dataToImport[i];
        if (row._targetModule === 'UNKNOWN' || row._targetModule === 'IGNORE') {
          errorsCount++; continue;
        }

        const extraInfo = [];
        if (row.calculatedTax > 0) extraInfo.push(`شامل ${row.calculatedTax.toLocaleString('fa-IR')} تومان مالیات`);
        if (row.calculatedDiscount > 0) extraInfo.push(`دارای ${row.calculatedDiscount.toLocaleString('fa-IR')} تومان تخفیف`);
        if (row.calculatedManagementFee > 0) extraInfo.push(`سود مدیریت پیمان: ${row.calculatedManagementFee.toLocaleString('fa-IR')} تومان`);
        if (row.calculatedGoodPerformance > 0) extraInfo.push(`کسورات حسن انجام کار: ${row.calculatedGoodPerformance.toLocaleString('fa-IR')} تومان`);
        if (row.extractedChequeSayyad) extraInfo.push(`صیاد: ${row.extractedChequeSayyad}`);
        if (row.extractedNationalId) extraInfo.push(`کد ملی: ${row.extractedNationalId}`);
        if (row.extractedIban) extraInfo.push(`شبا: ${row.extractedIban}`);
        
        const richNotes = [row.originalDateText, extraInfo.join(' | ')].filter(Boolean).join(' - ');
        const baseData = { date: row.date, phaseId: row.selectedPhaseId || 'GENERAL' };
        const pId = row.selectedProjectId === 'FREE' ? undefined : row.selectedProjectId;
        const billedAmt = row.isInternalOnly ? 0 : row.amount;

        if (derivedContext === 'LABOR' && targetWorker) {
          if (row._targetModule === 'FINANCE') {
            laborLogsToInsert.push({
                recordType: 'WAGE',
                workerId: targetWorker.id,
                workerName: `${targetWorker.name} ${targetWorker.lastName || ''}`,
                projectId: pId || 'FREE',
                date: baseData.date,
                workType: 'پرداخت مساعده/تسویه',
                attendance: 'PRESENT',
                paymentType: 'DAILY',
                workerUnit: 'DAY', workerQuantity: 0, workerRate: 0,
                billedUnit: 'DAY', billedQuantity: 0, billedRate: 0,
                advancePayment: row.amount,
                description: richNotes
            });
          } else if (row._targetModule === 'LABOR') {
            laborLogsToInsert.push({
                recordType: 'WAGE',
                workerId: targetWorker.id,
                workerName: `${targetWorker.name} ${targetWorker.lastName || ''}`,
                projectId: pId || 'FREE',
                date: baseData.date,
                phaseId: row.selectedPhaseId === 'GENERAL' ? undefined : row.selectedPhaseId,
                workType: row.typeDetail || row.title || 'کارکرد ایمپورتی',
                attendance: 'PRESENT',
                paymentType: 'DAILY',
                workerUnit: row.unit || 'DAY',
                workerQuantity: row.qty || 1,
                workerRate: (row.unitPrice && row.unitPrice > 0) ? row.unitPrice : (row.amount / (row.qty || 1)),
                billedUnit: row.unit || 'DAY',
                billedQuantity: row.qty || 1,
                billedRate: billedAmt > 0 ? (billedAmt / (row.qty || 1)) : 0,
                description: richNotes,
                advancePayment: 0,
            });
          } else if (row._targetModule === 'LABOR_MONTHLY') {
            laborLogsToInsert.push({
                recordType: 'WAGE',
                workerId: targetWorker.id,
                workerName: `${targetWorker.name} ${targetWorker.lastName || ''}`,
                projectId: pId || 'FREE',
                date: baseData.date,
                phaseId: row.selectedPhaseId === 'GENERAL' ? undefined : row.selectedPhaseId,
                workType: row.typeDetail || row.title || 'قرارداد ماهانه ایمپورتی',
                attendance: 'PRESENT',
                paymentType: 'MONTHLY',
                workerUnit: 'MONTH', workerQuantity: 1, workerRate: row.amount,
                billedUnit: 'MONTH', billedQuantity: 1, billedRate: billedAmt,
                description: richNotes,
                advancePayment: 0,
            });
          } else if (row._targetModule === 'LABOR_MISC') {
            laborLogsToInsert.push({
                recordType: 'PERK',
                workerId: targetWorker.id,
                workerName: `${targetWorker.name} ${targetWorker.lastName || ''}`,
                projectId: pId || 'FREE',
                date: baseData.date,
                phaseId: row.selectedPhaseId === 'GENERAL' ? undefined : row.selectedPhaseId,
                workType: 'هزینه متفرقه ایمپورتی',
                perkTitle: row.typeDetail || row.title || 'متفرقه',
                attendance: 'PRESENT',
                paymentType: 'DAILY',
                workerUnit: 'ITEM', workerQuantity: 1, workerRate: row.amount,
                billedUnit: 'ITEM', billedQuantity: 1, billedRate: billedAmt,
                description: richNotes,
                advancePayment: 0,
            });
          } else {
             errorsCount++;
             continue;
          }
          successCount++;
          continue; 
        }

        if (row._targetModule === 'FINANCE') {
          const isOut = String(row.typeDetail).includes('پرداخت') || String(row.typeDetail).toLowerCase() === 'out';
          addTransaction({
            referenceId: pId || 'FREE', type: 'CASH', direction: isOut ? 'OUT' : 'IN',
            amount: row.amount, description: row.title || row.typeDetail || 'تراکنش ایمپورتی', 
            date: baseData.date, textReceipt: richNotes
          } as any);
        } 
        else if (row._targetModule === 'LABOR') {
          addLaborRecord(pId || 'FREE', {
            ...baseData, workerName: row.title || 'نیروی ایمپورتی', workType: row.typeDetail || 'آزاد', 
            wage: row.amount, billedCost: billedAmt, description: richNotes
          } as any);
        }
        else if (row._targetModule === 'PURCHASES') {
          addPurchaseRecord(pId || 'FREE', {
            ...baseData, title: row.typeDetail || 'کالای وارد شده', vendor: row.title || 'فروشنده عمومی',
            billedCost: billedAmt, internalCost: row.qty * row.unitPrice, source: 'MARKET', 
            quantity: row.qty, unit: row.unit || 'مورد', notes: richNotes
          } as any);
        }
        else if (row._targetModule === 'LOGISTICS') {
          addLogisticsRecord(pId || 'FREE', {
            ...baseData, type: 'TRANSPORT', source: 'EXTERNAL', provider: row.title || 'راننده عمومی',
            vehicleInfo: '-', title: row.typeDetail || 'مسیر وارد شده', 
            billedCost: billedAmt, internalCost: row.amount, description: richNotes
          } as any);
        }
        successCount++;
      }

      if (laborLogsToInsert.length > 0) {
         addLaborBulkLogs(laborLogsToInsert);
      }

      const duration = (Date.now() - startTime) / 1000;
      setImportReport({ imported: successCount, errors: errorsCount, skipped: parsedRows.length - dataToImport.length, duration });
      toast.success(`${successCount} رکورد با موفقیت تزریق شد.`);
      setStep(4);
    } catch (error) {
      toast.error('خطا در ثبت اطلاعات.');
    } finally {
      setIsProcessing(false);
    }
  };

  const aiStats = useMemo(() => {
    let taxes = 0, anomalies = 0, linked = 0, extracted = 0, duplicates = 0;
    parsedRows.forEach(r => {
      if (r.calculatedTax > 0 || r.calculatedManagementFee > 0 || r.calculatedDiscount > 0) taxes++;
      if (r.needsUserAction.some(a => a !== 'CONFIRM_DUPLICATE')) anomalies++;
      if (r.needsUserAction.includes('CONFIRM_DUPLICATE')) duplicates++;
      if (r.linkedParentRowIndexes && r.linkedParentRowIndexes.length > 0) linked++;
      if (r.extractedCardNumber || r.extractedChequeSayyad || r.extractedIban || r.extractedNationalId || r.extractedPhone) extracted++;
    });
    return { taxes, anomalies, linked, extracted, duplicates };
  }, [parsedRows]);

  const totalPages = Math.ceil(parsedRows.length / rowsPerPage);
  const currentTableData = useMemo(() => {
     return parsedRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  }, [parsedRows, currentPage]);

  const modalContent = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-8" dir="rtl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isProcessing && step !== 4 && onClose()} className="absolute inset-0 bg-slate-900/85 backdrop-blur-md" />
      
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-[90rem] max-h-[95vh] flex flex-col bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        
        {isProcessing && (
          <div className="absolute inset-0 z-50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 flex items-center justify-center mb-6">
              <div className="absolute inset-0 border-4 border-indigo-200 dark:border-indigo-900 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 dark:border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
              <BrainCircuit className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <span className="font-black text-xl text-indigo-900 dark:text-indigo-300">{progress.text}</span>
          </div>
        )}

        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Database className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                ایمپورت هوشمند سازمانی <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-600 text-[10px] uppercase font-black tracking-widest border border-rose-200">God Mode</span>
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-1">تطبیق خودکار، کشف مالیات و مدیریت حسابداری داخلی</p>
            </div>
          </div>
          {!isProcessing && step !== 4 && <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors"><X className="w-5 h-5" /></button>}
        </div>

        <div className="flex-1 overflow-y-auto modal-scrollbar p-6 lg:p-8">
          
          {step === 1 && (
            <div className="space-y-8 max-w-4xl mx-auto">
              
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-[2rem] space-y-5 shadow-sm">
                <h3 className="font-black text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-indigo-500"/> ۱. انتخاب مقصد داده‌ها
                </h3>
                
                <div className={`grid grid-cols-1 md:grid-cols-${derivedContext === 'LABOR' ? '4' : '3'} gap-5`}>
                  
                  {/* 💡 هوشمندسازی UI برای نیروی کار (قفل مطلق با پشتیبانی از PortalSelect استاندارد در صورت عدم وجود آیدی) */}
                  {derivedContext === 'LABOR' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><HardHat className="w-4 h-4"/> نیروی کار (مقصد)</label>
                      <PortalSelect 
                        options={allWorkers.map(w => ({id: w.id, value: w.id, label: `${w.name} ${w.lastName || ''}`}))} 
                        value={localWorkerId} 
                        onChange={setLocalWorkerId} 
                        placeholder="-- انتخاب کارگر --" 
                        disabled={!!workerId} // 💡 اگر آیدی پاس داده شده باشد کاملاً قفل می‌شود
                        searchable={true}
                        className="!h-[46px] !min-h-[46px]"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><UserSquare className="w-4 h-4"/> کارفرما / مشتری</label>
                    <PortalSelect 
                      options={clientOptions} 
                      value={selectedClientId} 
                      onChange={(val: any) => { setSelectedClientId(val); setActiveProjectId(''); }} 
                      placeholder="-- انتخاب کارفرما --" 
                      disabled={derivedContext === 'CLIENT'} // 💡 قفل هوشمند برای پروفایل کارفرما
                      searchable={true}
                      className="!h-[46px] !min-h-[46px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Layers className="w-4 h-4"/> پروژه پیش‌فرض</label>
                    <PortalSelect 
                      options={projectOptions} 
                      value={activeProjectId} 
                      onChange={setActiveProjectId} 
                      placeholder="-- انتخاب پروژه --" 
                      disabled={derivedContext === 'PROJECT'} // 💡 قفل هوشمند برای پروفایل پروژه
                      searchable={true}
                      className="!h-[46px] !min-h-[46px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Banknote className="w-4 h-4"/> واحد پول ارقام فایل</label>
                    <div className="flex bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 h-[46px]">
                      <button onClick={() => setFileCurrency('TOMAN')} className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${fileCurrency === 'TOMAN' ? 'bg-indigo-500 shadow text-white' : 'text-slate-500'}`}>تومان</button>
                      <button onClick={() => setFileCurrency('RIAL')} className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${fileCurrency === 'RIAL' ? 'bg-emerald-500 shadow text-white' : 'text-slate-500'}`}>ریال (تبدیل به تومان)</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`transition-all duration-500 ${!activeProjectId && derivedContext === 'PROJECT' ? 'opacity-30 pointer-events-none grayscale blur-[1px]' : 'opacity-100'}`}>
                <h3 className="text-center font-black text-slate-700 dark:text-slate-200 mb-6 text-lg">۲. ساختار فایل اکسل شما چگونه است؟</h3>
                
                {/* 💡 ساختار هوشمند برای نیروی کار و سایر بخش‌ها */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {derivedContext !== 'LABOR' && (
                    <button onClick={() => setSelectedModule('MIXED')} className={`col-span-2 lg:col-span-4 p-5 rounded-3xl border-2 transition-all flex items-center gap-5 ${selectedModule === 'MIXED' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 bg-white dark:bg-slate-800'}`}>
                      <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg"><BrainCircuit className="w-8 h-8 text-white animate-pulse" /></div>
                      <div className="text-right flex-1">
                        <span className="font-black text-lg text-indigo-700 dark:text-indigo-400 block mb-1">فایل ترکیبی و چند شیتی (تشخیص AI)</span>
                        <span className="text-xs font-bold text-slate-500 leading-relaxed">این گزینه را انتخاب کنید اگر در یک یا چند شیت اکسل هم کرایه دارید، هم کارگر، هم سیمان و هم پرداختی! سیستم خودش همه را تفکیک می‌کند.</span>
                      </div>
                    </button>
                  )}

                  {derivedContext === 'LABOR' && (
                    <button onClick={() => setSelectedModule('MIXED')} className={`col-span-2 lg:col-span-4 p-5 rounded-3xl border-2 transition-all flex items-center gap-5 ${selectedModule === 'MIXED' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 bg-white dark:bg-slate-800'}`}>
                      <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg"><BrainCircuit className="w-8 h-8 text-white animate-pulse" /></div>
                      <div className="text-right flex-1">
                        <span className="font-black text-lg text-indigo-700 dark:text-indigo-400 block mb-1">فایل ترکیبی کارکرد و پرداختی (تشخیص AI)</span>
                        <span className="text-xs font-bold text-slate-500 leading-relaxed">این گزینه را انتخاب کنید اگر در اکسل شما هم روزهای کارکرد ثبت شده و هم مبالغ پرداختی به عنوان مساعده. سیستم به صورت هوشمند آنها را تفکیک می‌کند.</span>
                      </div>
                    </button>
                  )}

                  {derivedContext === 'LABOR' ? (
                    <>
                      <button onClick={() => setSelectedModule('FINANCE')} className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 bg-white dark:bg-slate-800 ${selectedModule === 'FINANCE' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-slate-600 dark:text-slate-400'}`}>
                        <Banknote className="w-8 h-8" /><span className="font-black text-sm">پرداختی‌ها / مساعده</span>
                      </button>
                      <button onClick={() => setSelectedModule('LABOR')} className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 bg-white dark:bg-slate-800 ${selectedModule === 'LABOR' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 text-slate-600 dark:text-slate-400'}`}>
                        <HardHat className="w-8 h-8" /><span className="font-black text-sm">لیست روزهای کارکرد</span>
                      </button>
                      <button onClick={() => setSelectedModule('LABOR_MONTHLY')} className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 bg-white dark:bg-slate-800 ${selectedModule === 'LABOR_MONTHLY' ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-cyan-300 text-slate-600 dark:text-slate-400'}`}>
                        <CalendarClock className="w-8 h-8" /><span className="font-black text-sm">مدیریت ماهانه (قرارداد)</span>
                      </button>
                      <button onClick={() => setSelectedModule('LABOR_MISC')} className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 bg-white dark:bg-slate-800 ${selectedModule === 'LABOR_MISC' ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-600 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-pink-300 text-slate-600 dark:text-slate-400'}`}>
                        <Coffee className="w-8 h-8" /><span className="font-black text-sm">متفرقه (رفاهی/کسر)</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setSelectedModule('FINANCE')} className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 bg-white dark:bg-slate-800 ${selectedModule === 'FINANCE' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-slate-600 dark:text-slate-400'}`}>
                        <Banknote className="w-8 h-8" /><span className="font-black text-sm">تراکنش مالی یکدست</span>
                      </button>
                      <button onClick={() => setSelectedModule('LABOR')} className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 bg-white dark:bg-slate-800 ${selectedModule === 'LABOR' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 text-slate-600 dark:text-slate-400'}`}>
                        <HardHat className="w-8 h-8" /><span className="font-black text-sm">لیست کارگران</span>
                      </button>
                      <button onClick={() => setSelectedModule('PURCHASES')} className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 bg-white dark:bg-slate-800 ${selectedModule === 'PURCHASES' ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-600 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-rose-300 text-slate-600 dark:text-slate-400'}`}>
                        <ShoppingCart className="w-8 h-8" /><span className="font-black text-sm">لیست مصالح</span>
                      </button>
                      <button onClick={() => setSelectedModule('LOGISTICS')} className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 bg-white dark:bg-slate-800 ${selectedModule === 'LOGISTICS' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 text-slate-600 dark:text-slate-400'}`}>
                        <Truck className="w-8 h-8" /><span className="font-black text-sm">لجستیک و ماشین‌آلات</span>
                      </button>
                    </>
                  )}
                </div>

                <AnimatePresence>
                  {selectedModule && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                      <div onClick={() => !isProcessing && fileInputRef.current?.click()} className="w-full border-2 border-dashed border-indigo-400 dark:border-indigo-600 bg-indigo-50/80 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all group">
                        <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform"><FileUp className="w-10 h-10 text-indigo-600 dark:text-indigo-400" /></div>
                        <p className="font-black text-indigo-900 dark:text-indigo-300 text-xl">آپلود فایل اکسل (درگ و دراپ)</p>
                        <p className="font-bold text-sm text-indigo-500/80 mt-2">پشتیبانی از فایل‌های چند شیتی (Multi-Sheet)</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {step === 2 && selectedModule && (
            <div className="space-y-8 max-w-5xl mx-auto">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50 p-6 rounded-3xl flex items-start gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-xl shadow-md"><LayoutTemplate className="w-6 h-6" /></div>
                <div>
                  <h4 className="font-black text-amber-900 dark:text-amber-400 text-lg mb-1">تطبیق هوشمند ستون‌ها</h4>
                  <p className="text-sm font-bold text-amber-700/80 dark:text-amber-500/80">سیستم طبق الگوهای قبلی سعی در تطبیق دارد. لطفاً یک بار ستون‌ها را چک کنید.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {MODULE_FIELDS.map(field => (
                  <div key={field.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col gap-3 shadow-sm hover:border-indigo-300 transition-colors">
                    <span className="text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg inline-block w-max">{field.label}</span>
                    <PortalSelect 
                      options={[{ id: '', value: '', label: '-- خالی --' }, ...excelCols.map(c => ({ id: c.key, value: c.key, label: `ستون ${c.key} (${c.label.substring(0,20)})` }))]} 
                      value={mapping[field.id] || ''} 
                      onChange={(val: any) => setMapping({...mapping, [field.id]: val})} 
                      placeholder="-- خالی --" 
                      className="!h-[46px] !min-h-[46px]"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-8 flex gap-4">
                <button onClick={() => setStep(1)} className="px-8 py-4 rounded-2xl font-black bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors">بازگشت</button>
                <button onClick={generatePreview} className="flex-1 py-4 rounded-2xl font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all text-lg">
                  <BrainCircuit className="w-6 h-6"/> ارسال به موتور پردازش هوشمند
                </button>
              </div>
            </div>
          )}

          {step === 3 && selectedModule && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between"><span className="text-xs font-black text-slate-500">پنهان کشف شد</span><Fingerprint className="w-5 h-5 text-purple-500"/></div>
                  <span className="text-2xl font-black text-slate-800 dark:text-white">{aiStats.extracted} <span className="text-[10px] text-slate-400 font-bold">مورد</span></span>
                </div>
                
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between"><span className="text-xs font-black text-slate-500">مالیات / سود</span><Receipt className="w-5 h-5 text-emerald-500"/></div>
                  <span className="text-2xl font-black text-slate-800 dark:text-white">{aiStats.taxes} <span className="text-[10px] text-slate-400 font-bold">مورد</span></span>
                </div>
                
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between"><span className="text-xs font-black text-slate-500">نیاز به تایید</span><ShieldAlert className="w-5 h-5 text-amber-500"/></div>
                  <span className="text-2xl font-black text-slate-800 dark:text-white">{aiStats.anomalies} <span className="text-[10px] text-slate-400 font-bold">مورد مبهم</span></span>
                </div>
                
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between"><span className="text-xs font-black text-slate-500">لینک شده به هم</span><Shuffle className="w-5 h-5 text-blue-500"/></div>
                  <span className="text-2xl font-black text-slate-800 dark:text-white">{aiStats.linked} <span className="text-[10px] text-slate-400 font-bold">ارتباط</span></span>
                </div>

                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/50 p-5 rounded-3xl flex flex-col gap-2 relative overflow-hidden shadow-md">
                  <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 animate-pulse"></div>
                  <div className="flex items-center justify-between"><span className="text-[11px] font-black text-rose-600 dark:text-rose-400">تکراری و قرنطینه</span><Copy className="w-5 h-5 text-rose-500"/></div>
                  <span className="text-2xl font-black text-rose-700 dark:text-rose-300">{aiStats.duplicates} <span className="text-[10px] text-rose-500/70 font-bold">بلوکه شد</span></span>
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-sm mb-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Layers className="w-5 h-5" />
                  <span className="text-sm font-black">ابزار اعمال گروهی:</span>
                </div>

                <div className="flex items-center gap-2 flex-1 w-full relative z-30">
                  <PortalSelect 
                    options={[{ id: 'FREE', value: 'FREE', label: 'بدون پروژه (آزاد)' }, ...projectOptions.filter((p:any) => p.value !== '')]} 
                    value={bulkProject} 
                    onChange={setBulkProject} 
                    placeholder="تخصیص پروژه" 
                    className="!h-[46px] !min-h-[46px]"
                  />
                  <button onClick={handleBulkProjectApply} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 h-[46px] rounded-xl text-xs font-black shadow-sm transition-colors whitespace-nowrap shrink-0">اعمال به ردیف‌ها</button>
                </div>

                <div className="flex items-center gap-2 flex-1 w-full relative z-20">
                  <PortalSelect 
                    options={bulkPhaseOptions} 
                    value={bulkPhase} 
                    onChange={setBulkPhase} 
                    placeholder="تخصیص فاز" 
                    className="!h-[46px] !min-h-[46px]"
                  />
                  <button onClick={handleBulkPhaseApply} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 h-[46px] rounded-xl text-xs font-black shadow-sm transition-colors whitespace-nowrap shrink-0">اعمال به ردیف‌ها</button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm relative z-10">
                
                <div className="bg-slate-100 dark:bg-slate-900/50 p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h4 className="text-sm font-black text-indigo-600 dark:text-indigo-400">پیش‌نمایش جداول پردازش شده</h4>
                  <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">کل رکوردهای معتبر: {parsedRows.filter(r=>r._targetModule !== 'UNKNOWN').length}</span>
                </div>

                <div className="overflow-x-auto max-h-[50vh] modal-scrollbar relative">
                  <table className="w-full text-right border-collapse text-sm min-w-[1300px]">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20">
                      <tr>
                        <th className="p-4 w-12 text-center border-b border-slate-200 dark:border-slate-700">
                           <button onClick={() => setSelectedRowIndexes(selectedRowIndexes.length > 0 ? [] : parsedRows.filter(r=>r._targetModule !== 'UNKNOWN' && !r.needsUserAction.includes('CONFIRM_DUPLICATE')).map(r=>r._index))}><CheckSquare className="w-5 h-5 text-indigo-500 hover:text-indigo-600" /></button>
                        </th>
                        <th className="p-4 font-black text-slate-500 w-44 border-b border-slate-200 dark:border-slate-700 text-center">تخصیص پروژه و فاز</th>
                        <th className="p-4 font-black text-slate-500 border-b border-slate-200 dark:border-slate-700">تاریخ و شیت</th>
                        <th className="p-4 font-black text-slate-500 w-[20%] border-b border-slate-200 dark:border-slate-700">شرح و کشفیات هوش مصنوعی</th>
                        <th className="p-4 font-black text-slate-500 border-b border-slate-200 dark:border-slate-700 text-left">عملیات ریاضی و حسابداری</th>
                        <th className="p-4 font-black text-slate-500 border-b border-slate-200 dark:border-slate-700 text-center w-64">دستیار رفع ابهام (Resolvers)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {currentTableData.map((row) => {
                        const isSelected = selectedRowIndexes.includes(row._index);
                        const isGarbage = row._targetModule === 'UNKNOWN' || row._targetModule === 'IGNORE';
                        const isDuplicate = row.needsUserAction.includes('CONFIRM_DUPLICATE');
                        const isAnomalous = row.needsUserAction.length > 0 && !isDuplicate;
                        const canBeInternal = row._targetModule === 'LOGISTICS' || row._targetModule === 'LABOR';

                        const rowProj = allProjects.find(p => String(p.id) === String(row.selectedProjectId));
                        const rowPhases = rowProj?.phases || [];
                        const rowPhaseOptions = [
                           { value: 'GENERAL', label: 'عمومی / بدون فاز' },
                           ...rowPhases.map((ph: any) => ({ value: ph.id, label: ph.name }))
                        ];

                        const rowClass = isGarbage ? 'bg-slate-50/50 dark:bg-slate-900/50 opacity-50 grayscale' : 
                                         isDuplicate ? 'bg-rose-50/40 dark:bg-rose-900/10 hover:bg-rose-100/50' :
                                         isAnomalous ? 'bg-amber-50/30 dark:bg-amber-900/10' : 
                                         'hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10';

                        return (
                          <tr key={row._index} className={`transition-colors ${rowClass}`}>
                            
                            <td className="p-4 text-center align-top pt-5">
                               <input type="checkbox" disabled={isGarbage} checked={isSelected} onChange={() => toggleRow(row._index)} className="w-5 h-5 rounded cursor-pointer accent-indigo-600" />
                            </td>
                            
                            <td className="p-4 align-top pt-4">
                              <div className="relative mb-2">
                                <select 
                                  disabled={isGarbage} value={row._targetModule} 
                                  onChange={(e) => resolveUserAction(row._index, 'SELECT_MODULE', e.target.value)}
                                  className="w-full p-2 pl-7 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-[11px] font-black text-indigo-700 dark:text-indigo-400 outline-none appearance-none cursor-pointer"
                                >
                                  <option value="UNKNOWN">-- زباله / ناشناس --</option>
                                  {derivedContext === 'LABOR' ? (
                                    <>
                                      <option value="FINANCE">پرداختی / مساعده</option>
                                      <option value="LABOR">کارکرد</option>
                                      <option value="LABOR_MONTHLY">مدیریت ماهانه</option>
                                      <option value="LABOR_MISC">متفرقه (رفاهی/کسر)</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="FINANCE">مالی</option><option value="LABOR">نیرو</option>
                                      <option value="PURCHASES">خرید</option><option value="LOGISTICS">لجستیک</option>
                                    </>
                                  )}
                                </select>
                                <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                              </div>

                              {!isGarbage && (
                                <div className="relative mb-2">
                                  <select
                                    value={row.selectedProjectId}
                                    onChange={(e) => setParsedRows(prev => prev.map(r => r._index === row._index ? { ...r, selectedProjectId: e.target.value, selectedPhaseId: 'GENERAL' } : r))}
                                    className={`w-full p-2 pl-7 rounded-xl border outline-none text-[10px] font-bold appearance-none cursor-pointer ${!row.selectedProjectId ? 'bg-rose-50 border-rose-300 text-rose-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                  >
                                    <option value="">-- بدون پروژه (اخطار) --</option>
                                    <option value="FREE">🌟 عمومی / بدون پروژه اختصاصی (آزاد)</option>
                                    {allProjects.filter(p => !selectedClientId || String(p.clientId) === String(selectedClientId)).map(p => (
                                      <option key={p.id} value={p.id}>{p.title || p.name || 'بدون نام'}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${!row.selectedProjectId ? 'text-rose-400' : 'text-slate-400'}`} />
                                </div>
                              )}

                              {!isGarbage && (
                                <div className="relative">
                                  <select
                                    value={row.selectedPhaseId}
                                    onChange={(e) => setParsedRows(prev => prev.map(r => r._index === row._index ? { ...r, selectedPhaseId: e.target.value } : r))}
                                    className="w-full p-2 pl-7 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-400 outline-none appearance-none cursor-pointer"
                                  >
                                    {rowPhaseOptions.map(ph => (
                                       <option key={ph.value} value={ph.value}>{ph.label}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                </div>
                              )}
                            </td>

                            <td className="p-4 align-top pt-5 font-bold text-sm text-slate-700 dark:text-slate-300">
                              {row.date}
                              {row.originalDateText && row.originalDateText !== row.date && <span className="block text-[10px] text-slate-400 mt-1 line-through">{row.originalDateText}</span>}
                              
                              {row._originalData?._sheetName && (
                                <span className="inline-flex items-center gap-1 mt-2 bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[9px] font-black">
                                  <FileSpreadsheet className="w-3 h-3" /> شیت: {row._originalData._sheetName}
                                </span>
                              )}
                            </td>

                            <td className="p-4 align-top pt-5">
                              {/* 💡 Validation Tooltip (UI Transparency) */}
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-800 dark:text-white block text-sm">{row.title} {row.typeDetail && <span className="text-slate-400 font-bold">({row.typeDetail})</span>}</span>
                                {row.validationErrors.length > 0 && (
                                  <div className="relative group flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-rose-500 cursor-pointer" />
                                    <div className="absolute top-full left-0 mt-1 w-64 p-2 bg-rose-600 text-white text-[10px] font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                       {row.validationErrors.map((err, i) => <div key={i}>• {err}</div>)}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-1 mt-2">
                                {row.extractedCardNumber && <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1"><CreditCard className="w-3 h-3"/> {row.extractedCardNumber}</span>}
                                {row.extractedIban && <span className="text-[9px] font-black bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded flex items-center gap-1"><Banknote className="w-3 h-3"/> {row.extractedIban}</span>}
                                {row.extractedChequeSayyad && <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded flex items-center gap-1"><FileWarning className="w-3 h-3"/> صیاد: {row.extractedChequeSayyad}</span>}
                                {row.extractedNationalId && <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded flex items-center gap-1"><Fingerprint className="w-3 h-3"/> ملی: {row.extractedNationalId}</span>}
                                {row.extractedPhone && <span className="text-[9px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded flex items-center gap-1"><Phone className="w-3 h-3"/> {row.extractedPhone}</span>}
                                {row.suggestedChequeStatus && <span className="text-[9px] font-black bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">{row.suggestedChequeStatus}</span>}
                              </div>
                            </td>

                            <td className="p-4 align-top pt-5 text-left font-mono">
                              <div className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-1 mb-1">{row.amount.toLocaleString('fa-IR')} تومان</div>
                              {row.qty > 1 && <div className="text-[10px] font-bold text-slate-400">{row.qty} {row.unit} × {row.unitPrice.toLocaleString('fa-IR')}</div>}
                              
                              {row.calculatedTax > 0 && <div className="text-[10px] font-black text-rose-500 mt-1">+ {row.calculatedTax.toLocaleString('fa-IR')} تومان (ارزش افزوده)</div>}
                              {row.calculatedManagementFee > 0 && <div className="text-[10px] font-black text-purple-500 mt-1">+ {row.calculatedManagementFee.toLocaleString('fa-IR')} تومان (سود/بالابود)</div>}
                              {row.calculatedDiscount > 0 && <div className="text-[10px] font-black text-emerald-500 mt-1">- {row.calculatedDiscount.toLocaleString('fa-IR')} تومان (تخفیف)</div>}
                              {row.calculatedGoodPerformance > 0 && <div className="text-[10px] font-black text-amber-600 mt-1">- {row.calculatedGoodPerformance.toLocaleString('fa-IR')} تومان (حسن انجام کار)</div>}
                              {row.calculatedInsurance > 0 && <div className="text-[10px] font-black text-blue-500 mt-1">- {row.calculatedInsurance.toLocaleString('fa-IR')} تومان (کسورات بیمه)</div>}
                              
                              {canBeInternal && !isGarbage && derivedContext !== 'LABOR' && (
                                <button 
                                  onClick={() => toggleInternalAccounting(row._index)}
                                  className={`mt-2 w-full py-1.5 px-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-all ${row.isInternalOnly ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'}`}
                                >
                                  {row.isInternalOnly ? <><Building2 className="w-3 h-3"/> فقط حسابداری داخلی</> : <><Receipt className="w-3 h-3"/> فاکتور رسمی کارفرما</>}
                                </button>
                              )}
                            </td>

                            <td className="p-4 align-top pt-5 text-center">
                              {isGarbage ? <span className="text-xs font-bold text-slate-400">ردیف زباله / فوتر</span> :
                               row.needsUserAction.length === 0 ? <span className="text-xs font-black text-emerald-500 flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4"/> بی‌نقص</span> :
                               <div className="space-y-2">
                                 {row.needsUserAction.includes('CONFIRM_DUPLICATE') && (
                                   <button onClick={() => resolveUserAction(row._index, 'CONFIRM_DUPLICATE', null)} className="w-full py-1.5 px-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-[10px] font-black transition-colors flex items-center justify-center gap-1 shadow-sm border border-rose-200"><Copy className="w-3 h-3"/> اخطار: مشابه یافت شد (تایید)</button>
                                 )}
                                 {row.needsUserAction.includes('VERIFY_DATE') && (
                                   <button onClick={() => resolveUserAction(row._index, 'VERIFY_DATE', null)} className="w-full py-1.5 px-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-[10px] font-black transition-colors flex items-center justify-center gap-1"><Check className="w-3 h-3"/> تایید تاریخ: {row.date}</button>
                                 )}
                                 {row.needsUserAction.includes('CONFIRM_TAX_OR_FEE') && (
                                   <div className="flex gap-1">
                                     <button onClick={() => resolveUserAction(row._index, 'IS_TAX', null)} className="flex-1 py-1.5 px-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-[9px] font-black transition-colors">مالیاته</button>
                                     <button onClick={() => resolveUserAction(row._index, 'IS_FEE', null)} className="flex-1 py-1.5 px-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-[9px] font-black transition-colors">سود پیمانکاریه</button>
                                   </div>
                                 )}
                                 {row.needsUserAction.includes('SHARED_LOGISTICS_COST') && (
                                   <span className="w-full block py-1.5 px-2 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-black">🔗 متصل به خریدهای بالا</span>
                                 )}
                               </div>
                              }
                            </td>

                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 💡 صفحه‌بندی برای افزایش سرعت رندر UI */}
                {totalPages > 1 && (
                   <div className="flex justify-center items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                      <button disabled={currentPage === 1} onClick={() => setCurrentPage(p=>p-1)} className="px-3 py-1 bg-white dark:bg-slate-800 border rounded-lg text-xs font-bold disabled:opacity-50">قبلی</button>
                      <span className="text-xs font-black text-slate-500">صفحه {currentPage} از {totalPages}</span>
                      <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p=>p+1)} className="px-3 py-1 bg-white dark:bg-slate-800 border rounded-lg text-xs font-bold disabled:opacity-50">بعدی</button>
                   </div>
                )}
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <button onClick={() => setStep(2)} className="px-8 py-4 rounded-2xl font-black bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors">بازگشت</button>
                <button onClick={handleExportErrors} className="px-8 py-4 rounded-2xl font-black bg-rose-100 hover:bg-rose-200 text-rose-600 transition-colors flex items-center justify-center gap-2 border border-rose-200">
                  <Download className="w-5 h-5"/> دانلود فایلِ خطادارها
                </button>
                <button onClick={handleFinalImport} disabled={selectedRowIndexes.length===0} className="flex-1 py-4 rounded-2xl font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all text-lg">
                  <Database className="w-6 h-6"/> تزریق نهایی به پایگاه داده سیستم
                </button>
              </div>
            </div>
          )}

          {step === 4 && importReport && (
            <div className="space-y-6 max-w-xl mx-auto py-12">
              <div className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/40">
                <Check className="w-14 h-14 text-white" strokeWidth={3} />
              </div>
              <h3 className="text-center text-3xl font-black text-slate-800 dark:text-white">عملیات با موفقیت انجام شد</h3>
              
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 space-y-5 mt-8 shadow-sm">
                <h4 className="font-black text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-3 mb-5 uppercase tracking-widest text-xs">گزارش نهایی سیستم</h4>
                <div className="flex justify-between items-center font-black">
                  <span className="text-slate-600 dark:text-slate-300">رکوردهای اضافه‌شده:</span>
                  <span className="text-emerald-500 text-2xl">{importReport.imported}</span>
                </div>
                <div className="flex justify-between items-center font-black">
                  <span className="text-slate-600 dark:text-slate-300">رکوردهای زباله / رد شده:</span>
                  <span className="text-amber-500 text-xl">{importReport.skipped}</span>
                </div>
                <div className="flex justify-between items-center font-black pt-5 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 text-sm">زمان پردازش هوش مصنوعی:</span>
                  <span className="text-indigo-500 text-sm">{importReport.duration.toFixed(2)} ثانیه</span>
                </div>
              </div>

              <button onClick={onClose} className="w-full py-4 rounded-2xl font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mt-8 text-lg">
                بستن پنجره و بازگشت به سیستم
              </button>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
}