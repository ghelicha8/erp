import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Search, X, Edit, Trash2, CheckCircle, Eye, Check,
  FileDown, Copy, MessageSquareWarning,
  CalendarDays, AlertTriangle, ShieldAlert, Image as ImageIcon, ChevronRight, ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';

// 💡 استفاده از کتابخانه جدید که از تمام رنگ‌های مدرن Tailwind پشتیبانی می‌کند
import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';

import { useInvoiceStore } from '../../../store/invoiceStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { useClientStore } from '../../../store/clientStore';

import GlassSelect from '../../../components/ui/GlassSelect';
// 💡 ایمپورت قالب اصلی فاکتور
import A4InvoiceTemplate from '../../../components/ui/A4InvoiceTemplate';

const GlassCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div onClick={onChange} className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-300 ${checked ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}>
    <motion.div initial={{ scale: 0 }} animate={{ scale: checked ? 1 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
       <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
    </motion.div>
  </div>
);

const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse z-0" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#a855f7,#d946ef,#f59e0b,#ff00aa,#8b5cf6,#a855f7,#d946ef,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-fuchsia-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);


// 🚀 موتور تولید و دانلود مستقیم PDF با کیفیت بالا (مخصوص EXE و Android بدون کرش)
const exportDirectPDF = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    return toast.error('خطا در یافتن سند برای تولید PDF');
  }

  toast.loading('در حال پردازش و تولید فایل PDF...', { id: 'pdf-gen' });
  
  try {
    const originalDisplay = element.style.display;
    const originalPosition = element.style.position;
    
    // برای رندر صحیح، المنت باید در DOM قابل مشاهده باشد (خارج از صفحه)
    if (originalDisplay === 'none') {
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.top = '-9999px';
      element.style.left = '-9999px';
    }

    // منتظر میمانیم تا فونت‌ها و تصاویر کاملا لود شوند
    await new Promise(resolve => setTimeout(resolve, 300));

    // استفاده از dom-to-image-more که مشکل oklch را ندارد
    const dataUrl = await domtoimage.toJpeg(element, {
      quality: 1,
      bgcolor: '#ffffff',
      width: element.clientWidth,
      height: element.clientHeight,
      style: { transform: 'scale(1)', transformOrigin: 'top left' }
    });

    // بازگردانی استایل‌های قبلی
    element.style.display = originalDisplay;
    element.style.position = originalPosition;

    // تبدیل عکس با کیفیت به PDF استاندارد A4
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${fileName}.pdf`); // دانلود قطعی فایل
    
    toast.dismiss('pdf-gen');
    toast.success('فایل PDF با موفقیت دانلود شد.');
  } catch (err) {
    toast.dismiss('pdf-gen');
    console.error('PDF Generation Error:', err);
    toast.error('خطا در تولید PDF! لطفا مجددا تلاش کنید.');
  }
};

const getDaysAgo = (jalaliDateStr: string) => {
  if(!jalaliDateStr) return 0;
  const parts = jalaliDateStr.split('/');
  if(parts.length !== 3) return 0;
  const today = new Date().toLocaleDateString('fa-IR').split('/');
  const currentY = parseInt(today[0]); const currentM = parseInt(today[1]); const currentD = parseInt(today[2]);
  const y = parseInt(parts[0]); const m = parseInt(parts[1]); const d = parseInt(parts[2]);
  return Math.max(0, (currentY - y) * 365 + (currentM - m) * 30 + (currentD - d));
};

export default function ClientInvoicesTab({ clientId }: { clientId: string }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const { invoices, deleteInvoice, duplicateInvoice } = useInvoiceStore();
  const projects = useProjectStore(state => state.projects);
  const clients = useClientStore(state => state.clients);
  const settings = useSettingsStore(state => state.settings);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState<string>('10');
  const [currentPage, setCurrentPage] = useState(1);
  
  // 💡 استیت‌های کنترلی مودال‌ها
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [viewAttachmentsFor, setViewAttachmentsFor] = useState<string | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [undoItems, setUndoItems] = useState<{ id: string, items: { id: string, isSynced: boolean }[], expireAt: number }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const clientInfo = clients.find(c => c.id === clientId);
  const clientFullName = clientInfo ? `${clientInfo.name} ${clientInfo.lastName || ''}`.trim() : '';
  const clientProjects = useMemo(() => projects.filter(p => p.clientId === clientId).map(p => p.id), [projects, clientId]);

  const clientInvoices = useMemo(() => {
    return invoices.filter(inv => inv.clientId === clientId || clientProjects.includes(inv.projectId))
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.invoiceNumber.localeCompare(a.invoiceNumber));
  }, [invoices, clientId, clientProjects]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            expired.forEach(u => u.items.forEach(item => deleteInvoice(item.id)));
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e=>e.items).some(i => i.id === id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteInvoice]);

  const triggerDelete = (id: string, isSynced: boolean) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: [{ id, isSynced }], expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, id]);
  };

  const filteredInvoices = useMemo(() => {
    let filtered = [...clientInvoices];
    filtered = filtered.filter(inv => !pendingDeleteIds.includes(inv.id));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => i.invoiceNumber.toLowerCase().includes(q) || (i.clientName && i.clientName.toLowerCase().includes(q)));
    }
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PROFORMA') filtered = filtered.filter(i => i.status === 'PROFORMA');
      if (statusFilter === 'OFFICIAL') filtered = filtered.filter(i => i.isOfficial && i.status !== 'PROFORMA');
      if (statusFilter === 'INTERNAL') filtered = filtered.filter(i => !i.isOfficial && i.status !== 'PROFORMA');
      if (statusFilter === 'HAS_DEBT') filtered = filtered.filter(i => i.status !== 'PROFORMA' && (i.payment?.debtAmount || 0) > 0);
    }
    return filtered;
  }, [clientInvoices, searchQuery, statusFilter, pendingDeleteIds]);

  const paginatedInvoices = useMemo(() => {
    if (pageSize === 'ALL') return filteredInvoices;
    const size = Number(pageSize);
    const startIndex = (currentPage - 1) * size;
    return filteredInvoices.slice(startIndex, startIndex + size);
  }, [filteredInvoices, currentPage, pageSize]);

  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(filteredInvoices.length / Number(pageSize));

  const isRial = settings?.currency === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';
  const formatNum = (val: number) => (val * (isRial ? 10 : 1)).toLocaleString('fa-IR');
  
  const getProjectName = (pid: string) => {
    if (!pid) return 'فاکتور آزاد (بدون پروژه)';
    const p = projects.find(x => x.id === pid);
    return p ? p.name : 'پروژه نامشخص';
  };

  const { stats, agingDebt } = useMemo(() => {
    let totalBilled = 0, totalDebt = 0, proformaCount = 0, officialCount = 0;
    let debt0to30 = 0, debt31to60 = 0, debt60plus = 0;

    clientInvoices.forEach(inv => {
      if (inv.status === 'PROFORMA') proformaCount++;
      else {
        totalBilled += (inv.grandTotal || 0);
        const debt = (inv.payment?.debtAmount || 0);
        totalDebt += debt;
        if (inv.isOfficial) officialCount++;

        if (debt > 0) {
          const daysAgo = getDaysAgo(inv.date);
          if (daysAgo <= 30) debt0to30 += debt;
          else if (daysAgo <= 60) debt31to60 += debt;
          else debt60plus += debt;
        }
      }
    });

    return { 
      stats: { totalBilled, totalDebt, proformaCount, officialCount, totalInvoices: clientInvoices.length },
      agingDebt: { debt0to30, debt31to60, debt60plus }
    };
  }, [clientInvoices]);

  const toggleSelection = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => {
    if (selectedIds.length === filteredInvoices.length) setSelectedIds([]);
    else setSelectedIds(filteredInvoices.map(i => i.id));
  };

  const generateFollowUpMessage = () => {
    if (stats.totalDebt === 0) return toast.info('این شخص هیچ بدهی معوقی روی فاکتورها ندارد!');
    const msg = `جناب آقای/شرکت ${clientFullName}\nاحتراماً به استحضار می‌رساند جمع مبلغ تسویه‌نشده‌ی صورت‌وضعیت‌های شما مبلغ ${formatNum(stats.totalDebt)} ${currencyLabel} می‌باشد.\nلطفاً در اسرع وقت نسبت به بررسی و تسویه اقدام فرمایید.\nبا احترام - ${settings?.companyName || 'مدیریت'}`;
    navigator.clipboard.writeText(msg);
    toast.success('پیامک پیگیری تولید و در حافظه کپی شد!');
  };

  const openBuilderForEdit = (id: string) => {
    document.dispatchEvent(new CustomEvent('open-edit-invoice-modal', { detail: id }));
  };

  const itemsToPrintForLedger = selectedIds.length > 0 
    ? clientInvoices.filter(i => selectedIds.includes(i.id))
    : clientInvoices;

  const selectedAttachments = invoices.find(i => i.id === viewAttachmentsFor)?.attachments || [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full flex flex-col gap-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/40 dark:bg-slate-800/40 p-4 sm:p-5 rounded-[2rem] border border-white/50 dark:border-slate-700/50 shadow-sm">
         <div className="flex items-center gap-4 w-full sm:w-auto">
           <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-500/20 shadow-inner">
             <FileText className="w-6 h-6"/>
           </div>
           <div>
             <h3 className="text-lg font-black text-slate-800 dark:text-white">فاکتورها و صورت‌وضعیت‌ها</h3>
             <p className="text-xs text-slate-500 font-bold mt-1">مدیریت اسناد مالی مرتبط با {clientFullName}</p>
           </div>
         </div>
         <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={() => exportDirectPDF('ledger-print-area', `لجر_${clientFullName}`)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-5 py-3 rounded-xl text-sm font-black shadow-sm transition-all">
              <FileDown className="w-5 h-5"/> دانلود دفتر کل (لجر)
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500">جمع مبالغ فاکتور شده</span>
            <span className="text-lg font-black text-slate-800 dark:text-white font-mono">{formatNum(stats.totalBilled)}</span>
          </div>
          <div className="bg-rose-50/60 dark:bg-rose-900/10 backdrop-blur-md p-4 rounded-2xl border border-rose-100 dark:border-rose-800/30 shadow-sm flex flex-col gap-1">
            <span className="text-[11px] font-bold text-rose-500">مانده بدهی فاکتورها</span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">{formatNum(stats.totalDebt)}</span>
          </div>
          <div className="bg-amber-50/60 dark:bg-amber-900/10 backdrop-blur-md p-4 rounded-2xl border border-amber-100 dark:border-amber-800/30 shadow-sm flex flex-col gap-1">
            <span className="text-[11px] font-bold text-amber-600">پیش‌فاکتورها (در انتظار)</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">{stats.proformaCount} <span className="text-xs font-normal">سند</span></span>
          </div>
          <div className="bg-purple-50/60 dark:bg-purple-900/10 backdrop-blur-md p-4 rounded-2xl border border-purple-100 dark:border-purple-800/30 shadow-sm flex flex-col gap-1">
            <span className="text-[11px] font-bold text-purple-500">فاکتورهای رسمی (دارایی)</span>
            <span className="text-lg font-black text-purple-600 dark:text-purple-400 font-mono">{stats.officialCount} <span className="text-xs font-normal">سند</span></span>
          </div>
        </div>

        <div className="md:col-span-4 bg-white/60 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/50 dark:border-slate-700/50 flex flex-col justify-between relative overflow-hidden">
           <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-500/10 dark:bg-rose-500/20 rounded-full blur-2xl pointer-events-none"></div>
           <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                 <ShieldAlert className="w-4 h-4"/> <span className="text-xs font-black">تحلیل سنی بدهی</span>
              </div>
              <button onClick={generateFollowUpMessage} className="px-2 py-1 text-[9px] font-bold bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg flex items-center gap-1 transition-colors border border-slate-200/50 dark:border-transparent">
                <MessageSquareWarning className="w-3 h-3"/> پیامک پیگیری
              </button>
           </div>
           
           <div className="space-y-2 relative z-10 mt-2">
              <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1.5"><CheckCircle className="w-3 h-3"/> بدهی جاری (زیر ۱ ماه)</span>
                 <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{formatNum(agingDebt.debt0to30)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1.5"><CalendarDays className="w-3 h-3"/> تاخیر میان‌مدت (۱ تا ۲ ماه)</span>
                 <span className="font-mono font-black text-amber-600 dark:text-amber-400">{formatNum(agingDebt.debt31to60)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1.5"><AlertTriangle className="w-3 h-3"/> تاخیر پرخطر (بیش از ۲ ماه)</span>
                 <span className="font-mono font-black text-rose-600 dark:text-rose-400">{formatNum(agingDebt.debt60plus)}</span>
              </div>
           </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm rounded-[2rem] px-6 py-4 z-[50] relative">
        <NeonSearchWrapper className="flex-1 w-full xl:w-auto min-w-[250px] h-[46px]">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input 
            placeholder="جستجو با شماره یا نام چاپی..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full h-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white pl-2 pr-4 transition-colors placeholder:text-slate-500" 
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /></button>}
        </NeonSearchWrapper>
        
        <div className="w-full xl:w-px h-px xl:h-8 bg-slate-300 dark:bg-slate-700 hidden xl:block" />
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto relative z-[100]">
          <div className="w-full sm:w-32 h-[46px]">
            <GlassSelect options={[{ value: 'ALL', label: 'نمایش همه' }, { value: '10', label: 'نمایش ۱۰' }, { value: '20', label: 'نمایش ۲۰' }]} value={pageSize} onChange={setPageSize} placeholder="تعداد نمایش" />
          </div>
          <div className="w-full sm:w-56 h-[46px]">
            <GlassSelect 
              options={[
                {value:'ALL', label:'همه وضعیت‌ها'},
                {value:'OFFICIAL', label:'فاکتور رسمی (دارایی)'},
                {value:'INTERNAL', label:'فاکتور داخلی'},
                {value:'PROFORMA', label:'پیش‌فاکتور (استعلام)'},
                {value:'HAS_DEBT', label:'دارای بدهی (نسیه)'}
              ]} 
              value={statusFilter} onChange={setStatusFilter} placeholder="فیلتر وضعیت" 
            />
          </div>
        </div>
      </div>
      
      <div className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-xl modal-scrollbar min-h-[300px] z-10 relative">
         <table className="w-full text-right border-collapse min-w-[1000px] flex-1">
           <thead>
             <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
               <th className="p-5 w-16 text-center"><GlassCheckbox checked={selectedIds.length > 0 && selectedIds.length === filteredInvoices.length} onChange={toggleAll} /></th>
               <th className="p-5 text-sm font-bold text-slate-800 dark:text-white">شماره و تاریخ</th>
               <th className="p-5 text-sm font-bold text-slate-800 dark:text-white w-1/4">پروژه و عنوان چاپی</th>
               <th className="p-5 text-sm font-bold text-slate-800 dark:text-white text-center">مبلغ نهایی (تومان)</th>
               <th className="p-5 text-sm font-bold text-slate-800 dark:text-white text-center">وضعیت تسویه</th>
               <th className="p-5 text-sm font-bold text-slate-800 dark:text-white text-center w-48">عملیات</th>
             </tr>
           </thead>
           <tbody>
             <AnimatePresence>
               {paginatedInvoices.map((inv) => {
                 const isPrintedNameDifferent = inv.clientName && inv.clientName !== clientFullName;
                 const total = inv.grandTotal || 0;
                 const debt = inv.payment?.debtAmount || 0;
                 const paid = Math.max(total - debt, 0);
                 const paidPercent = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
                 const isSelected = selectedIds.includes(inv.id);

                 return (
                 <motion.tr key={inv.id} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className={`border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-white dark:hover:bg-slate-800/50 group ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                    <td className="p-5 text-center align-top"><GlassCheckbox checked={isSelected} onChange={() => toggleSelection(inv.id)} /></td>
                    
                    <td className="p-5 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-black text-slate-800 dark:text-white flex items-center gap-2">
                          {inv.invoiceNumber}
                          {inv.isOfficial && <span className="bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 px-1.5 py-0.5 rounded text-[8px] border border-purple-200 dark:border-purple-500/30">رسمی</span>}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">{inv.date}</span>
                      </div>
                    </td>
                    
                    <td className="p-5 align-top">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{getProjectName(inv.projectId || '')}</span>
                        {isPrintedNameDifferent && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-500/20 w-max inline-flex items-center gap-1">
                            <Eye className="w-3 h-3"/> چاپ بنام: {inv.clientName}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-5 align-top text-center">
                      <span className="font-mono font-black text-purple-600 dark:text-purple-400 text-lg">{formatNum(total)}</span>
                    </td>

                    <td className="p-5 align-top text-center">
                      {inv.status === 'PROFORMA' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 shadow-sm"><FileText className="w-3.5 h-3.5"/> پیش‌فاکتور</span>
                      ) : (
                        <div className="flex flex-col gap-2 w-40 mx-auto">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className={debt === 0 ? 'text-emerald-500' : 'text-slate-500'}>{debt === 0 ? 'تسویه کامل' : 'در حال پرداخت'}</span>
                            <span className="font-mono" dir="ltr">{paidPercent.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full transition-all ${debt === 0 ? 'bg-emerald-500' : 'bg-gradient-to-r from-purple-400 to-fuchsia-500'}`} style={{ width: `${paidPercent}%` }} />
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="p-5 text-center align-top">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                         {/* 💡 آیکون‌ها بدون هیچ مشکلی استیت را آپدیت می‌کنند */}
                         <button onClick={() => setViewInvoiceId(inv.id)} title="مشاهده پیش‌نمایش" className="p-2 bg-slate-100 dark:bg-slate-800 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-colors shadow-sm"><Eye className="w-4 h-4"/></button>
                         <button onClick={() => setViewAttachmentsFor(inv.id)} title="اسناد پیوست" className={`p-2 rounded-xl transition-colors shadow-sm ${inv.attachments && inv.attachments.length > 0 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500'}`}><ImageIcon className="w-4 h-4" /></button>
                         <button onClick={() => { duplicateInvoice(inv.id); toast.success('فاکتور با موفقیت کپی شد! می‌توانید آن را ویرایش کنید.'); }} title="کپی و صدور مشابه" className="p-2 bg-slate-100 dark:bg-slate-800 text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-xl transition-colors shadow-sm"><Copy className="w-4 h-4"/></button>
                         <button onClick={() => openBuilderForEdit(inv.id)} title="ویرایش" className="p-2 bg-slate-100 dark:bg-slate-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors shadow-sm"><Edit className="w-4 h-4"/></button>
                         <button onClick={() => triggerDelete(inv.id, inv.isGlobalSyncEnabled)} title="حذف" className="p-2 bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors shadow-sm"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </td>
                 </motion.tr>
               )})}
               
               {filteredInvoices.length === 0 && (
                 <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                   <td colSpan={6} className="p-16 text-center">
                     <div className="flex flex-col items-center justify-center gap-2">
                       <span className="text-base font-black text-slate-600 dark:text-slate-300">هیچ صورت‌وضعیتی یافت نشد.</span>
                     </div>
                   </td>
                 </motion.tr>
               )}
             </AnimatePresence>
           </tbody>
         </table>

         {/* ================= PAGINATION CONTROLS ================= */}
         {pageSize !== 'ALL' && totalPages > 1 && (
           <div className="flex items-center justify-between px-6 py-4 bg-white/40 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700/50 backdrop-blur-md w-full sticky bottom-0 mt-auto">
             <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all shadow-sm">
               <ChevronRight className="w-4 h-4" /> قبلی
             </button>
             <span className="text-sm font-bold text-slate-500 dark:text-slate-400">صفحه <span className="text-indigo-600 dark:text-indigo-400 font-black mx-1">{currentPage}</span> از {totalPages}</span>
             <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all shadow-sm">
                بعدی <ChevronLeft className="w-4 h-4" />
             </button>
           </div>
         )}
      </div>

      {/* 💎 داشبورد شناور گروهی */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 50, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 50, opacity: 0, scale: 0.9 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-white/80 dark:bg-slate-800/90 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 p-2 rounded-2xl flex items-center gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 px-4">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs">{selectedIds.length}</div>
              <span className="text-slate-800 dark:text-white font-bold text-sm">مورد انتخاب شده</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2" />
            <button onClick={() => exportDirectPDF('ledger-print-area', `گزارش_فاکتورهای_انتخابی`)} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl transition-colors text-sm font-bold"><FileDown className="w-4 h-4"/> دانلود PDF گروهی</button>
            <button onClick={() => {
                if (confirm(`آیا از حذف ${selectedIds.length} فاکتور مطمئن هستید؟`)) {
                  selectedIds.forEach(id => deleteInvoice(id));
                  setSelectedIds([]);
                  toast.success('فاکتورهای انتخاب شده حذف شدند.');
                }
            }} className="flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-xl transition-colors text-sm font-bold"><Trash2 className="w-4 h-4"/> حذف</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* سیستم زمان‌دار کاملاً امن برای حذف فاکتور */}
      {isMounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
          <AnimatePresence>
            {undoItems.map(undo => {
              const isGlobalSynced = undo.items.some(i => i.isSynced);
              return (
                <motion.div key={undo.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-[2rem] p-3 flex items-center gap-4 pointer-events-auto" dir="rtl">
                  <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0">
                    {isGlobalSynced ? <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-500 animate-pulse" /> : <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-500" />}
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-black text-slate-800 dark:text-white">فاکتور در حال حذف</span>
                    <span className={`text-[10px] font-medium mt-0.5 ${isGlobalSynced ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>{isGlobalSynced ? 'هشدار: مقادیر انبار و مالی برمی‌گردند!' : 'تا چند ثانیه دیگر پاک می‌شود...'}</span>
                  </div>
                  <button onClick={() => { setPendingDeleteIds(prev => prev.filter(id => !undo.items.some(i => i.id === id))); setUndoItems(prev => prev.filter(u => u.id !== undo.id)); toast.success('عملیات لغو شد'); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-colors shrink-0 shadow-sm">انصراف</button>
                  <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} className="absolute bottom-0 right-0 h-1 bg-rose-500" style={{ transformOrigin: 'right' }} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>, document.body
      )}

      {/* 💎 مودال پیش‌نمایش گرافیکی فاکتور */}
      <AnimatePresence>
        {viewInvoiceId && isMounted && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-8" dir="rtl">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewInvoiceId(null)} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-3xl overflow-hidden z-10 flex flex-col h-[95vh] sm:h-[90vh]">
              
              <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl z-20 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2"><Eye className="w-5 h-5 text-indigo-500"/> پیش‌نمایش فاکتور چاپی</h3>
                <div className="flex items-center gap-3">
                  <button onClick={() => exportDirectPDF('invoice-print-area', `فاکتور_${viewInvoiceId}`)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl text-sm font-black transition-all shadow-md active:scale-95">
                    <FileDown className="w-4 h-4"/> دانلود PDF مستقیم
                  </button>
                  <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                  <button onClick={() => setViewInvoiceId(null)} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-rose-500 transition-colors shadow-sm"><X className="w-5 h-5"/></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto modal-scrollbar bg-slate-100/50 dark:bg-slate-900/50 flex justify-center py-10 relative">
                 <div className="transform scale-[0.6] sm:scale-[0.8] md:scale-90 xl:scale-100 origin-top h-max pb-32 transition-transform duration-300">
                    <div id="invoice-print-area" className="bg-white shadow-2xl" style={{ width: '210mm', minHeight: '297mm' }}>
                       {(() => {
                          const inv = invoices.find(i => i.id === viewInvoiceId);
                          if(!inv) return null;
                          return <A4InvoiceTemplate invoice={inv} userSettings={settings} />;
                       })()}
                    </div>
                 </div>
              </div>

            </motion.div>
          </div>, document.body
        )}
      </AnimatePresence>

      {/* مودال پیش‌نمایش مدارک پیوست */}
      <AnimatePresence>
        {viewAttachmentsFor && isMounted && typeof document !== 'undefined' && createPortal(
            <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewAttachmentsFor(null)} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6 modal-scrollbar z-10">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2"><ImageIcon className="w-6 h-6 text-amber-500"/>اسناد و مدارک پیوست</h3>
                  <button onClick={() => setViewAttachmentsFor(null)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:text-rose-500"><X className="w-5 h-5"/></button>
                </div>
                {selectedAttachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedAttachments.map((img:string, i:number) => <img key={i} src={img} className="w-full h-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm" alt="پیوست" />)}
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-500 font-bold">هیچ مدرک فیزیکی آپلود نشده است.</div>
                )}
              </motion.div>
            </div>, document.body
        )}
      </AnimatePresence>

      {/* 💡 کانتینر مخفی لجر برای گرفتن خروجی PDF */}
      <div className="fixed top-[200vh] left-0 pointer-events-none z-[-1]">
        <div id="ledger-print-area" className="bg-white p-10 font-sans text-slate-900 w-[210mm] min-h-[297mm]" dir="rtl" style={{ display: 'none' }}>
           {/* هدر جذاب لجر برای پرینت */}
           <div className="flex justify-between items-center border-b-4 border-slate-800 pb-6 mb-8">
             <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-slate-900">صورت‌حساب دفتر کل (لجر)</h1>
                <p className="text-sm font-bold text-slate-500">تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</p>
             </div>
             <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-black text-indigo-900 mb-1">کارفرما: {clientFullName}</h2>
                <p className="text-xs text-slate-500 font-mono mt-1">تعداد اسناد: {itemsToPrintForLedger.length} عدد</p>
             </div>
           </div>

           <div className="flex justify-between bg-slate-100 p-6 rounded-2xl mb-8 border border-slate-200">
             <div className="flex flex-col"><span className="text-sm text-slate-500 font-bold mb-1">جمع کل فاکتورها</span><span className="font-mono font-black text-xl text-slate-800">{formatNum(stats.totalBilled)} <span className="text-xs">{currencyLabel}</span></span></div>
             <div className="flex flex-col"><span className="text-sm text-slate-500 font-bold mb-1">جمع پرداختی‌ها</span><span className="font-mono font-black text-xl text-emerald-600">{formatNum(stats.totalBilled - stats.totalDebt)} <span className="text-xs">{currencyLabel}</span></span></div>
             <div className="flex flex-col text-left"><span className="text-sm text-slate-500 font-bold mb-1">مانده بدهی کل</span><span className="font-mono font-black text-2xl text-rose-600">{formatNum(stats.totalDebt)} <span className="text-xs">{currencyLabel}</span></span></div>
           </div>

           <table className="w-full text-right border-collapse border border-slate-300">
              <thead>
                 <tr className="bg-slate-800 text-white text-sm">
                    <th className="p-3 border border-slate-700">تاریخ</th>
                    <th className="p-3 border border-slate-700">شماره سند</th>
                    <th className="p-3 border border-slate-700">پروژه</th>
                    <th className="p-3 border border-slate-700 text-center">مبلغ کل ({currencyLabel})</th>
                    <th className="p-3 border border-slate-700 text-center">پرداختی ({currencyLabel})</th>
                    <th className="p-3 border border-slate-700 text-center">بدهی ({currencyLabel})</th>
                 </tr>
              </thead>
              <tbody>
                 {itemsToPrintForLedger.filter(i => i.status !== 'PROFORMA').map((inv, idx) => {
                   const tTotal = inv.grandTotal || 0;
                   const tDebt = inv.payment?.debtAmount || 0;
                   const tPaid = Math.max(tTotal - tDebt, 0);
                   return (
                     <tr key={idx} className="border-b border-slate-200 text-sm even:bg-slate-50">
                        <td className="p-3 border border-slate-200 font-bold">{inv.date}</td>
                        <td className="p-3 border border-slate-200 font-mono font-bold text-indigo-600">{inv.invoiceNumber}</td>
                        <td className="p-3 border border-slate-200 text-sm">{getProjectName(inv.projectId || '')}</td>
                        <td className="p-3 border border-slate-200 text-center font-mono font-black text-slate-700">{formatNum(tTotal)}</td>
                        <td className="p-3 border border-slate-200 text-center font-mono font-black text-emerald-600">{formatNum(tPaid)}</td>
                        <td className="p-3 border border-slate-200 text-center font-mono font-black text-rose-600">{formatNum(tDebt)}</td>
                     </tr>
                   );
                 })}
                 {itemsToPrintForLedger.length === 0 && (
                   <tr><td colSpan={6} className="p-10 text-center font-bold text-slate-400">فاکتوری برای چاپ وجود ندارد</td></tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

    </motion.div>
  );
}