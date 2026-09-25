import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Trash2, X, Wallet, Camera, Printer, Tags, Image as ImageIcon, CheckCircle, Edit, Search, PieChart, AlertTriangle, Layers, ChevronRight, ChevronLeft, FileSpreadsheet, Download, ShieldAlert, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { useProjectStore } from '../../store/projectStore';
import { useFinanceStore } from '../../../../store/financeStore';

import GlassDatePicker from '../../../../components/ui/GlassDatePicker';
import GlassSelect from '../../../../components/ui/GlassSelect';
import { sortNewestFirst } from '../../../../core/utils/sortHelpers';

interface PettyCashTabProps {
  projectId: string;
}

const useCurrency = () => {
  const [currency] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('erp_currency') || 'تومان';
    return 'تومان';
  });
  const formatCurrency = (amount: number) => new Intl.NumberFormat('fa-IR').format(amount);
  return { currency, formatCurrency };
};

const CATEGORIES = [
  { id: 'مصالح خرد', color: 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400', hex: '#3b82f6' },
  { id: 'ایاب و ذهاب', color: 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400', hex: '#f59e0b' },
  { id: 'پذیرایی و خوراک', color: 'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400', hex: '#f43f5e' },
  { id: 'ابزارآلات', color: 'bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400', hex: '#6366f1' },
  { id: 'سایر موارد', color: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/20 dark:text-slate-400', hex: '#64748b' },
];

const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

export default function PettyCashTab({ projectId }: PettyCashTabProps) {
  const { currency, formatCurrency } = useCurrency();
  
  const project = useProjectStore(state => state.projects.find(p => p.id === projectId));
  const addPettyCashRecord = useProjectStore(state => state.addPettyCashRecord);
  const updatePettyCashRecord = useProjectStore(state => state.updatePettyCashRecord);
  const deletePettyCashRecord = useProjectStore(state => state.deletePettyCashRecord);
  const allTransactions = useFinanceStore(state => state.transactions);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState({ financialManager: '', projectManager: '', supervisor: '' });

  const [viewFile, setViewFile] = useState<{url: string, type: string, name: string} | null>(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('fa-IR'));
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [formPhaseId, setFormPhaseId] = useState('GENERAL');
  const [excludeFromTotal, setExcludeFromTotal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterPhase, setFilterPhase] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // 💡 استیت‌های مربوط به سیستم کپسول زمان‌دارِ حذف
  const [undoItems, setUndoItems] = useState<{ id: string, items: string[], expireAt: number }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const pettyCashRecords = project?.pettyCash || [];
  const phases = project?.phases || [];

  const filterPhaseOptions = useMemo(() => [
    { value: 'ALL', label: 'همه فازها' },
    { value: 'GENERAL', label: 'هزینه‌های عمومی' },
    ...phases.map((p: any) => ({ value: p.id, label: p.name }))
  ], [phases]);

  const formPhaseOptions = useMemo(() => [
    { value: 'GENERAL', label: 'هزینه عمومی (بدون فاز)' },
    ...phases.map((p: any) => ({ value: p.id, label: p.name }))
  ], [phases]);

  useEffect(() => {
    const handleOpen = () => openModal();
    document.addEventListener('open-new-pettycash-modal', handleOpen);
    return () => document.removeEventListener('open-new-pettycash-modal', handleOpen);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterPhase, dateFrom, dateTo, rowsPerPage]);

  // 💡 سیستم کنترل ۵ ثانیه‌ای برای حذف هزینه‌ها
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            expired.forEach(u => {
              u.items.forEach(id => deletePettyCashRecord(projectId, id));
            });
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e=>e.items).includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deletePettyCashRecord, projectId]);

  // 💡 تابع اجرای حذف زمان‌دار
  const triggerDelete = (id: string) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: [id], expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, id]);
  };

  const { totalFund, totalSpent, currentBalance } = useMemo(() => {
    const spent = pettyCashRecords.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);
    const fund = allTransactions
      .filter(t => t.referenceId === projectId && t.direction === 'IN' && t.description?.includes('تنخواه'))
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    return { totalFund: fund, totalSpent: spent, currentBalance: fund - spent };
  }, [pettyCashRecords, allTransactions, projectId]);

  const categoryStats = useMemo(() => {
    if (totalSpent === 0) return [];
    return CATEGORIES.map(cat => {
      const sum = pettyCashRecords.filter((r:any) => r.category === cat.id).reduce((acc:number, r:any) => acc + Number(r.amount || 0), 0);
      return { ...cat, sum, percentage: (sum / totalSpent) * 100 };
    }).filter(c => c.sum > 0).sort((a, b) => b.sum - a.sum);
  }, [pettyCashRecords, totalSpent]);

  const filteredRecords = useMemo(() => {
    return sortNewestFirst(pettyCashRecords
      .filter((r: any) => {
        if (pendingDeleteIds.includes(r.id)) return false; // عدم نمایش مواردی که در حال حذف هستند
        const matchesSearch = !searchQuery || r.title.includes(searchQuery);
        const matchesCategory = filterCategory === 'ALL' || r.category === filterCategory;
        const recordPhase = r.phaseId || 'GENERAL';
        const matchesPhase = filterPhase === 'ALL' || recordPhase === filterPhase;
        const matchesDateFrom = !dateFrom || r.date >= dateFrom;
        const matchesDateTo = !dateTo || r.date <= dateTo;
        
        return matchesSearch && matchesCategory && matchesPhase && matchesDateFrom && matchesDateTo;
      }), 'append');
  }, [pettyCashRecords, searchQuery, filterCategory, filterPhase, dateFrom, dateTo, pendingDeleteIds]);

  const paginatedRecords = useMemo(() => {
    if (rowsPerPage === 'ALL') return filteredRecords;
    const start = (currentPage - 1) * Number(rowsPerPage);
    return filteredRecords.slice(start, start + Number(rowsPerPage));
  }, [filteredRecords, currentPage, rowsPerPage]);

  const totalPages = rowsPerPage === 'ALL' ? 1 : Math.ceil(filteredRecords.length / Number(rowsPerPage));

  const getPhaseName = (phaseId?: string) => {
    if (!phaseId || phaseId === 'GENERAL') return 'عمومی';
    return phases.find((p: any) => p.id === phaseId)?.name || 'نامشخص';
  };

  const openModal = (record?: any) => {
    if (record) {
      setEditRecordId(record.id);
      setTitle(record.title);
      setAmount(record.amount.toString());
      setDate(record.date);
      setSelectedCategory(record.category || CATEGORIES[0].id);
      setFormPhaseId(record.phaseId || 'GENERAL');
      setReceiptImage(record.receiptImage || null);
      setExcludeFromTotal(record.excludeFromTotal || false);
    } else {
      setEditRecordId(null);
      setTitle('');
      setAmount('');
      setDate(new Date().toLocaleDateString('fa-IR'));
      setSelectedCategory(CATEGORIES[0].id);
      setFormPhaseId('GENERAL');
      setReceiptImage(null);
      setExcludeFromTotal(false);
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('حجم فایل (عکس یا PDF) نباید بیشتر از 5 مگابایت باشد.');
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height = Math.round((height *= MAX_WIDTH / width)); width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width = Math.round((width *= MAX_HEIGHT / height)); height = MAX_HEIGHT; }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setReceiptImage(compressedBase64);
          toast.success('عکس فاکتور با موفقیت فشرده و پیوست شد.');
        };
      };
    } else if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        setReceiptImage(event.target?.result as string);
        toast.success('فایل PDF با موفقیت پیوست شد.');
      };
    } else {
      toast.error('لطفاً فقط فایل عکس یا PDF انتخاب کنید.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return toast.error('لطفاً عنوان و مبلغ را وارد کنید.');
    
    const recordData = {
      title,
      amount: Number(amount.replace(/,/g, '')),
      date,
      category: selectedCategory,
      phaseId: formPhaseId === 'GENERAL' ? undefined : formPhaseId,
      receiptImage: receiptImage || undefined,
      excludeFromTotal
    };

    if (editRecordId) {
      updatePettyCashRecord(projectId, editRecordId, recordData as any);
      toast.success('هزینه با موفقیت ویرایش شد.');
    } else {
      addPettyCashRecord(projectId, recordData as any);
      toast.success('هزینه تنخواه در سیستم ثبت شد.');
    }
    
    setIsModalOpen(false);
  };

  const executeExport = (format: 'EXCEL' | 'PRINT' | 'PDF') => {
    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40" dir="rtl">
      <head><meta charset="utf-8" /></head>
      <body>
        <table border="1">
          <tr><th colspan="6" style="background-color: #4f46e5; color: white; font-size: 18px; padding: 10px; text-align: center;">روکش تنخواه‌گردان کارگاه</th></tr>
          <tr><th colspan="6" style="background-color: #f1f5f9; padding: 5px; text-align: center;">پروژه: ${project?.name} | فیلتر فاز: ${getPhaseName(filterPhase)} | تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')}</th></tr>
          <tr><td colspan="6"></td></tr>
          <tr>
             <td colspan="2" style="font-weight: bold; padding: 10px; text-align: right;">جمع کل شارژ تنخواه: ${formatCurrency(totalFund)} ${currency}</td>
             <td colspan="2" style="font-weight: bold; padding: 10px; text-align: right;">جمع هزینه‌های گزارش: ${formatCurrency(filteredRecords.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0))} ${currency}</td>
             <td colspan="2" style="font-weight: bold; padding: 10px; text-align: right; color: ${currentBalance < 0 ? '#ef4444' : '#10b981'};">مانده کل صندوق: ${formatCurrency(currentBalance)} ${currency}</td>
          </tr>
          <tr><td colspan="6"></td></tr>
          <tr>
            <th style="background-color: #e2e8f0; font-weight:bold;">ردیف</th><th style="background-color: #e2e8f0; font-weight:bold;">تاریخ</th>
            <th style="background-color: #e2e8f0; font-weight:bold;">شرح هزینه</th><th style="background-color: #e2e8f0; font-weight:bold;">دسته‌بندی</th>
            <th style="background-color: #e2e8f0; font-weight:bold;">فاز مربوطه</th><th style="background-color: #e2e8f0; font-weight:bold;">مبلغ (${currency})</th>
          </tr>
          ${filteredRecords.map((r: any, i: number) => `
            <tr style="background-color: ${r.excludeFromTotal ? '#fff1f2' : '#ffffff'}">
              <td style="text-align: center;">${i + 1}</td><td style="text-align: center;">${r.date}</td>
              <td style="text-align: right;">${r.title} ${r.excludeFromTotal ? '(ایزوله)' : ''}</td>
              <td style="text-align: center;">${r.category || '-'}</td><td style="text-align: center;">${getPhaseName(r.phaseId)}</td>
              <td style="text-align: center;">${formatCurrency(r.amount)}</td>
            </tr>
          `).join('')}
          <tr><td colspan="6"></td></tr><tr><td colspan="6"></td></tr>
          <tr>
             <td colspan="2" style="text-align: center; font-weight: bold; padding: 20px;">تنظیم کننده (سرپرست کارگاه)<br><br><br>${exportConfig.supervisor || '...........................'}</td>
             <td colspan="2" style="text-align: center; font-weight: bold; padding: 20px;">تایید کننده (مدیر پروژه)<br><br><br>${exportConfig.projectManager || '...........................'}</td>
             <td colspan="2" style="text-align: center; font-weight: bold; padding: 20px;">امور مالی<br><br><br>${exportConfig.financialManager || '...........................'}</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const printHtml = `
      <html dir="rtl">
      <head>
        <title>روکش تنخواه کارگاه - ${project?.name}</title>
        <style>
          body { font-family: 'Tahoma', sans-serif; padding: 20px; color: #1e293b; }
          .header { text-align: center; border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 30px; }
          .header h1 { margin: 0 0 10px 0; font-size: 22px; }
          .header p { margin: 0; font-size: 14px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background-color: #f1f5f9; padding: 12px; border: 1px solid #cbd5e1; font-size: 13px; }
          td { padding: 10px; border: 1px solid #cbd5e1; font-size: 13px; text-align: center; vertical-align: middle; }
          .summary { display: flex; justify-content: space-between; background: #f8fafc; padding: 15px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 40px; }
          .summary div { font-size: 14px; font-weight: bold; }
          .signatures { display: flex; justify-content: space-around; margin-top: 80px; text-align: center; font-weight: bold; font-size: 14px; }
          .sign-box { border-top: 1px dashed #64748b; padding-top: 10px; width: 200px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>روکش تنخواه‌گردان کارگاه</h1>
          <p>پروژه: ${project?.name} | فیلتر فاز: ${getPhaseName(filterPhase)} | تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')}</p>
        </div>
        <div class="summary">
          <div>جمع کل شارژ تنخواه: ${formatCurrency(totalFund)} ${currency}</div>
          <div>جمع هزینه‌های گزارش: ${formatCurrency(filteredRecords.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0))} ${currency}</div>
          <div style="color: ${currentBalance < 0 ? '#ef4444' : '#10b981'}">مانده کل صندوق: ${formatCurrency(currentBalance)} ${currency}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th width="5%">ردیف</th><th width="15%">تاریخ</th><th width="35%">شرح هزینه</th>
              <th width="15%">دسته‌بندی</th><th width="10%">فاز مربوطه</th><th width="20%">مبلغ (${currency})</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRecords.map((r: any, i: number) => `
              <tr style="background-color: ${r.excludeFromTotal ? '#fff1f2' : '#ffffff'}">
                <td>${i + 1}</td><td>${r.date}</td>
                <td style="text-align: right; padding-right: 10px;">${r.title} ${r.excludeFromTotal ? `<br><small style="color:#e11d48; font-weight:bold;">(ایزوله - خارج از حساب پروژه)</small>` : ''}</td>
                <td>${r.category || '-'}</td><td>${getPhaseName(r.phaseId)}</td><td>${formatCurrency(r.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="signatures">
          <div><p>${exportConfig.supervisor || '...........................'}</p><div class="sign-box">تنظیم کننده (سرپرست کارگاه)</div></div>
          <div><p>${exportConfig.projectManager || '...........................'}</p><div class="sign-box">تایید کننده (مدیر پروژه)</div></div>
          <div><p>${exportConfig.financialManager || '...........................'}</p><div class="sign-box">امور مالی</div></div>
        </div>
      </body>
      </html>
    `;

    if (format === 'EXCEL') {
      const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `روکش_تنخواه_${project?.name.replace(/\s+/g, '_')}.xls`; a.click();
      toast.success('فایل اکسل با موفقیت دانلود شد.'); setIsExportModalOpen(false);
    } else if (format === 'PDF') {
      toast.info('در حال تولید فایل PDF... (لطفاً چند لحظه صبر کنید)');
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        const element = document.createElement('div'); element.innerHTML = printHtml;
        // @ts-ignore
        window.html2pdf().set({ margin: 10, filename: `روکش_تنخواه_${project?.name.replace(/\s+/g, '_')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } }).from(element).save().then(() => {
          toast.success('فایل PDF با موفقیت دانلود شد!'); setIsExportModalOpen(false);
        });
      };
      script.onerror = () => toast.error('خطا در ارتباط با سرور برای تولید PDF');
      document.body.appendChild(script);
    } else {
      const printWindow = window.open('', '', 'width=900,height=700');
      if (printWindow) { printWindow.document.write(printHtml); printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); setIsExportModalOpen(false); }, 500); }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6">
      
      <div className="bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3 shadow-sm px-4 mx-4">
        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
          <span className="block text-base font-black mb-1">قانون طلایی ثبت هزینه‌ها</span>
          این بخش صرفاً جهت ثبت هزینه‌های <span className="text-amber-600 dark:text-amber-400 font-black">سریع، خرد و روزمره (تنخواه)</span> طراحی شده است.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-4">
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[2rem] backdrop-blur-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform" />
            <span className="text-sm font-bold text-slate-500 flex items-center gap-1.5"><Wallet className="w-4 h-4"/> کل شارژ تنخواه</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400" dir="ltr">{formatCurrency(totalFund)}</span>
              <span className="text-xs font-bold text-slate-500">{currency}</span>
            </div>
          </div>
          
          <div className="p-5 rounded-[2rem] backdrop-blur-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform" />
            <span className="text-sm font-bold text-slate-500 flex items-center gap-1.5"><Receipt className="w-4 h-4"/> کل هزینه‌های خرد</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400" dir="ltr">{formatCurrency(totalSpent)}</span>
              <span className="text-xs font-bold text-slate-500">{currency}</span>
            </div>
          </div>

          <div className={`p-5 rounded-[2rem] backdrop-blur-2xl border shadow-sm flex flex-col gap-2 relative overflow-hidden group transition-colors ${currentBalance < 0 ? 'bg-rose-50/80 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' : 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'}`}>
            <span className={`text-sm font-bold flex items-center gap-1.5 ${currentBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              <Wallet className="w-4 h-4"/> مانده صندوق
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black ${currentBalance < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`} dir="ltr">{formatCurrency(currentBalance)}</span>
              <span className="text-xs font-bold opacity-70">{currency}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 p-5 rounded-[2rem] backdrop-blur-2xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 shadow-sm flex flex-col justify-center gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><PieChart className="w-4 h-4"/> تحلیل مخارج</h4>
            <span className="text-xs font-bold text-slate-500">{pettyCashRecords.length} فاکتور</span>
          </div>
          {totalSpent > 0 ? (
            <div className="space-y-3">
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                {categoryStats.map(stat => (
                  <div key={stat.id} style={{ width: `${stat.percentage}%`, backgroundColor: stat.hex }} className="h-full" title={`${stat.id}: ${Math.round(stat.percentage)}%`} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs font-bold text-slate-400 text-center py-2">هنوز هزینه‌ای برای تحلیل وجود ندارد.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 px-4 bg-white/40 dark:bg-slate-800/40 p-4 rounded-3xl mx-4 border border-slate-200/50 dark:border-slate-700/50 shadow-sm relative z-50">
        <div className="flex-1 flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full">
          <NeonSearchWrapper className="flex-1 w-full sm:min-w-[200px] h-[46px]">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input placeholder="جستجو..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 transition-colors placeholder:text-slate-500" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /></button>}
          </NeonSearchWrapper>
          <div className="w-full sm:w-36 h-[46px]"><GlassSelect options={[{ value: 'ALL', label: 'همه دسته‌ها' }, ...CATEGORIES.map(c => ({ value: c.id, label: c.id }))]} value={filterCategory} onChange={setFilterCategory} placeholder="دسته‌بندی" /></div>
          <div className="w-full sm:w-36 h-[46px]"><GlassSelect options={filterPhaseOptions} value={filterPhase} onChange={setFilterPhase} placeholder="فاز اجرایی" /></div>
          <div className="w-full sm:w-32 h-[46px]"><GlassDatePicker value={dateFrom} onChange={setDateFrom} placeholder="از تاریخ..." /></div>
          <div className="w-full sm:w-32 h-[46px]"><GlassDatePicker value={dateTo} onChange={setDateTo} placeholder="تا تاریخ..." /></div>
          <div className="w-full sm:w-32 h-[46px]">
            <GlassSelect options={[{ value: '10', label: '۱۰ ردیف' }, { value: '20', label: '۲۰ ردیف' }, { value: '50', label: '۵۰ ردیف' }, { value: '100', label: '۱۰۰ ردیف' }, { value: 'ALL', label: 'همه ردیف‌ها' }]} value={rowsPerPage} onChange={setRowsPerPage} placeholder="تعداد نمایش" />
          </div>
        </div>
        <div className="flex items-center justify-end w-full xl:w-auto shrink-0 mt-2 xl:mt-0">
          <button onClick={() => setIsExportModalOpen(true)} disabled={filteredRecords.length === 0} className="px-6 py-3 h-[46px] w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2" title="خروجی پیشرفته تنخواه">
            <Download className="w-5 h-5 shrink-0" /> <span className="text-sm whitespace-nowrap">چاپ و دانلود روکش</span>
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700/50 shadow-2xl modal-scrollbar relative z-10 min-h-[300px] px-4 py-2">
        <table className="w-full text-right border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-white/60 dark:border-slate-700/50">
              <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">تاریخ</th>
              <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">شرح هزینه</th>
              <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">دسته‌بندی</th>
              <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">فاز مربوطه</th>
              <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">مبلغ ({currency})</th>
              <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300 text-center">پیوست</th>
              <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {paginatedRecords.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-slate-400 font-bold">هیچ هزینه‌ای یافت نشد.</td></tr>
              ) : paginatedRecords.map((expense: any) => {
                const catStyle = CATEGORIES.find(c => c.id === expense.category)?.color || CATEGORIES[4].color;
                
                return (
                  <motion.tr key={expense.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`border-b border-white/30 dark:border-slate-700/30 hover:bg-white/50 dark:hover:bg-white/5 transition-colors group ${expense.excludeFromTotal ? 'bg-rose-50/30 dark:bg-rose-900/10' : ''}`}>
                    <td className="p-5 text-sm font-bold text-slate-600 dark:text-slate-400">{expense.date}</td>
                    <td className="p-5 font-bold flex items-center gap-3 text-slate-800 dark:text-white">
                      <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${expense.excludeFromTotal ? 'bg-rose-100 border-rose-200 text-rose-500 dark:bg-rose-900/30 dark:border-rose-800' : 'bg-teal-500/10 border-teal-500/20 text-teal-500'}`}>
                        {expense.excludeFromTotal ? <ShieldAlert className="w-5 h-5"/> : <Receipt className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="line-clamp-2">{expense.title}</span>
                        {expense.excludeFromTotal && <span className="text-[10px] text-rose-500 mt-1 font-black">هزینه ایزوله (خارج از کل پروژه)</span>}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-black border ${catStyle}`}>
                        {expense.category || 'سایر موارد'}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 w-max rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold">
                        <Layers className="w-3.5 h-3.5" />{getPhaseName(expense.phaseId)}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-baseline gap-1 font-black text-lg text-slate-700 dark:text-slate-200">
                        <span dir="ltr">{formatCurrency(expense.amount)}</span>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      {expense.receiptImage ? (
                        <button 
                          onClick={() => setViewFile({ url: expense.receiptImage, type: expense.receiptImage.includes('application/pdf') ? 'PDF' : 'IMAGE', name: expense.title })} 
                          title="مشاهده فایل پیوست" 
                          className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 hover:bg-indigo-100 transition-colors inline-flex"
                        >
                          {expense.receiptImage.includes('application/pdf') ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(expense)} className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/50 shadow-sm transition-colors"><Edit className="w-4 h-4" /></button>
                        {/* 💡 جایگزینیِ تابع حذف مستقیم با سیستم زمان‌دار */}
                        <button onClick={() => triggerDelete(expense.id)} className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/50 shadow-sm transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>
        
        {filteredRecords.length > 0 && rowsPerPage !== 'ALL' && totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400 px-4">صفحه {currentPage} از {totalPages}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 💎 کپسول فوق‌العاده شیکِ شیشه‌ای و آیفونی برای تایید حذف (یکپارچه با سایر بخش‌ها) */}
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
                  <span className="text-sm font-black text-slate-800 dark:text-white">هزینه در حال حذف</span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">تا چند ثانیه دیگر پاک می‌شود...</span>
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

      {/* پاپ‌آپ مشاهده فایل */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {viewFile && (
            <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 lg:p-8" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewFile(null)} className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-6xl h-[90vh] bg-slate-100 dark:bg-slate-900 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-10">
                  <h3 className="text-lg md:text-xl font-black flex items-center gap-3 text-slate-800 dark:text-white">
                    {viewFile.type === 'PDF' ? <FileText className="w-6 h-6 text-rose-500" /> : <ImageIcon className="w-6 h-6 text-indigo-500" />}
                    {viewFile.name}
                  </h3>
                  <div className="flex items-center gap-3">
                    <button onClick={() => {
                      try {
                        const byteString = atob(viewFile.url.split(',')[1]);
                        const mimeString = viewFile.url.split(',')[0].split(':')[1].split(';')[0];
                        const ab = new ArrayBuffer(byteString.length);
                        const ia = new Uint8Array(ab);
                        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                        const blob = new Blob([ab], { type: mimeString });
                        const blobUrl = URL.createObjectURL(blob);
                        window.open(blobUrl, '_blank');
                      } catch (e) {
                        window.open(viewFile.url, '_blank');
                      }
                    }} className="px-4 py-2 md:py-2.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors text-xs md:text-sm font-black flex items-center gap-2">
                      <ExternalLink className="w-4 h-4"/> <span className="hidden sm:inline">باز کردن در تب جدید</span>
                    </button>
                    <button onClick={() => setViewFile(null)} className="p-2 md:p-2.5 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-200 dark:hover:bg-rose-900 transition-colors"><X className="w-5 h-5"/></button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex items-center justify-center bg-slate-200/50 dark:bg-slate-950/50 p-2 md:p-6">
                  {viewFile.type === 'PDF' ? (
                    <iframe src={viewFile.url} className="w-full h-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white" />
                  ) : (
                    <img src={viewFile.url} className="max-w-full max-h-full rounded-2xl object-contain drop-shadow-lg" alt={viewFile.name} />
                  )}
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Modal خروجی */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isExportModalOpen && (
            <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsExportModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Download className="w-6 h-6 text-indigo-500"/> چاپ و خروجی روکش تنخواه
                  </h3>
                  <button onClick={() => setIsExportModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-rose-500 transition-colors"><X className="w-5 h-5"/></button>
                </div>
                <div className="space-y-4 mb-6">
                  <p className="text-sm font-bold text-slate-500 mb-2">جهت چاپ در روکش، می‌توانید اسامی امضاکنندگان را در زیر وارد کنید (اختیاری):</p>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">نام تنظیم کننده (سرپرست کارگاه)</label>
                    <input value={exportConfig.supervisor} onChange={e => setExportConfig({...exportConfig, supervisor: e.target.value})} placeholder="مثال: مهندس احمدی" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 font-bold text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">نام تایید کننده (مدیر پروژه)</label>
                    <input value={exportConfig.projectManager} onChange={e => setExportConfig({...exportConfig, projectManager: e.target.value})} placeholder="مثال: مهندس رضایی" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 font-bold text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">نام مدیر مالی</label>
                    <input value={exportConfig.financialManager} onChange={e => setExportConfig({...exportConfig, financialManager: e.target.value})} placeholder="مثال: آقای محمدی" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 font-bold text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <button onClick={() => executeExport('EXCEL')} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <FileSpreadsheet className="w-5 h-5"/> دانلود Excel
                  </button>
                  <button onClick={() => executeExport('PDF')} className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Download className="w-5 h-5"/> دانلود PDF مستقیم
                  </button>
                  <button onClick={() => executeExport('PRINT')} className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Printer className="w-5 h-5"/> پنجره پرینت
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Modal ثبت */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-visible">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Receipt className="w-6 h-6 text-teal-500"/> {editRecordId ? 'ویرایش هزینه تنخواه' : 'ثبت هزینه در تنخواه'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-rose-500 transition-colors"><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1">شرح هزینه</label>
                    <input autoFocus required value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: خرید میخ و ناهار کارگران" className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-teal-500 font-bold text-sm transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1 flex justify-between">
                        <span>مبلغ ({currency})</span>
                        <span className="text-teal-500 text-[10px]">{amount ? formatCurrency(Number(amount.replace(/,/g, ''))) : ''}</span>
                      </label>
                      <input required type="text" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ","))} placeholder="0" className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-teal-500 font-black text-lg text-left transition-colors" dir="ltr" />
                    </div>
                    <div className="relative z-[150]">
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1">تاریخ</label>
                      <div className="h-[60px]"><GlassDatePicker value={date} onChange={setDate} placeholder="تاریخ هزینه" /></div>
                    </div>
                  </div>
                  <div className="relative z-[140]">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1 flex items-center gap-1"><Layers className="w-3.5 h-3.5"/> فاز مربوطه</label>
                    <div className="h-[52px]"><GlassSelect options={formPhaseOptions} value={formPhaseId} onChange={setFormPhaseId} placeholder="انتخاب فاز..." /></div>
                  </div>
                  <div className="relative z-10">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1 flex items-center gap-1"><Tags className="w-3.5 h-3.5"/> دسته‌بندی هزینه</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => (
                        <button type="button" key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${selectedCategory === cat.id ? cat.color + ' ring-2 ring-offset-1 ring-slate-200 dark:ring-slate-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                          {cat.id}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative z-10">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1 flex items-center gap-1"><Camera className="w-3.5 h-3.5"/> پیوست فاکتور (عکس یا PDF)</label>
                    <label className="w-full h-20 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative overflow-hidden">
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                      {receiptImage ? (
                        <>
                          {receiptImage.includes('application/pdf') ? (
                            <FileText className="absolute inset-0 m-auto w-10 h-10 text-slate-300 opacity-50" />
                          ) : (
                            <img src={receiptImage} alt="فاکتور" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                          )}
                          <div className="relative z-10 flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg shadow-sm">
                            <CheckCircle className="w-4 h-4"/> فایل پیوست شد
                          </div>
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-[10px] font-bold text-slate-500">جهت انتخاب فایل کلیک کنید (فشرده‌سازی عکس خودکار)</span>
                        </>
                      )}
                    </label>
                  </div>
                  <div className="relative z-10 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl flex items-center justify-between cursor-pointer" onClick={() => setExcludeFromTotal(!excludeFromTotal)}>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-rose-700 dark:text-rose-400">عدم محاسبه در هزینه‌های کل پروژه (ایزوله)</span>
                      <span className="text-[9px] font-bold text-rose-500 mt-1">این خرج در سود و زیان اصلی پروژه لحاظ نخواهد شد.</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${excludeFromTotal ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <motion.div animate={{ x: excludeFromTotal ? -16 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                  <div className="pt-2 relative z-10 border-t border-slate-100 dark:border-slate-800">
                    <button type="submit" className="w-full py-4 mt-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-black rounded-xl shadow-lg shadow-teal-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5"/> {editRecordId ? 'بروزرسانی اطلاعات' : 'ثبت قطعی در سیستم'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </motion.div>
  );
}