import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Notebook, Search, ChevronDown, X, Tag, Calendar, 
  Edit, Trash2, Combine, AlignRight, AlignCenter, AlignLeft, 
  Database, Banknote, Star, FileSpreadsheet, Printer,
  HardHat, ShoppingCart, Truck, FileText, Eye, Layers, AlertCircle, Type, Box, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

import GlassDatePicker from '../../../../components/ui/GlassDatePicker';
import { useProjectStore } from '../../store/projectStore';
import { useFinanceStore } from '../../../../store/financeStore';

interface NotesTabProps {
  projectId: string;
}

const TAG_CONFIG: Record<string, { label: string, color: string, bg: string, border: string }> = {
  URGENT: { label: 'فوری و مهم', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  FINANCIAL: { label: 'مسائل مالی', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  MATERIAL: { label: 'تامین مصالح', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  IDEA: { label: 'ایده / پیشنهاد', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  REPORT: { label: 'گزارش کارگاه', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  GENERAL: { label: 'یادداشت عمومی', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
};

const TAG_OPTIONS = [
  { value: 'ALL', label: 'همه تگ‌ها' },
  ...Object.keys(TAG_CONFIG).map(key => ({ value: key, label: TAG_CONFIG[key].label }))
];
const MODAL_TAG_OPTIONS = Object.keys(TAG_CONFIG).map(key => ({ value: key, label: TAG_CONFIG[key].label }));

const COLUMNS_MAP: Record<string, {id: string, label: string}[]> = {
  'FINANCE': [{id:'date', label:'تاریخ'}, {id:'desc', label:'شرح تراکنش'}, {id:'type', label:'نوع (ورودی/خروجی)'}, {id:'amount', label:'مبلغ (تومان)'}],
  'LABOR': [{id:'date', label:'تاریخ'}, {id:'name', label:'نام نیرو'}, {id:'type', label:'نوع کار'}, {id:'amount', label:'دستمزد (تومان)'}],
  'PHASES': [{id:'name', label:'نام فاز'}, {id:'type', label:'نوع قرارداد'}, {id:'status', label:'وضعیت'}, {id:'value', label:'ارزش برآوردی (تومان)'}],
  'PURCHASES': [{id:'date', label:'تاریخ'}, {id:'vendor', label:'فروشنده'}, {id:'title', label:'کالا / خدمات'}, {id:'amount', label:'مبلغ کل (تومان)'}],
  'LOGISTICS': [{id:'date', label:'تاریخ'}, {id:'driver', label:'راننده/ماشین'}, {id:'route', label:'مسیر'}, {id:'amount', label:'کرایه (تومان)'}],
};

const safeNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleanString = String(val).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/,/g, '').replace(/[^0-9.-]+/g, ""); 
  const parsed = Number(cleanString);
  return isNaN(parsed) ? 0 : parsed;
};
const formatValue = (val: any) => val ? Number(String(val).replace(/\D/g, '')).toLocaleString('fa-IR') : '0';

const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center">{children}</div>
  </div>
);

const GlassInputWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/60 dark:border-slate-600/50 shadow-sm focus-within:border-indigo-500/60 focus-within:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300 overflow-hidden group ${className}`}>
    <div className="relative z-10 w-full h-full bg-transparent flex flex-col justify-start">{children}</div>
  </div>
);

function GlassSelect({ options, value, onChange, placeholder }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);
  const selectedLabel = options.find((o: any) => o.value === value)?.label || placeholder;
  return (
    <div className="relative w-full" ref={ref}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer w-full bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-slate-600/50 rounded-xl px-4 py-3 outline-none backdrop-blur-md transition-all flex items-center justify-between shadow-sm focus:border-indigo-500/60 hover:bg-white/50 dark:hover:bg-slate-800/50">
        <span className={`font-bold text-sm truncate ${value ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="absolute top-full mt-2 left-0 right-0 z-[99999] min-w-[200px] backdrop-blur-2xl bg-white/80 dark:bg-slate-800/90 border border-white/50 dark:border-slate-600 shadow-[0_15px_40px_rgba(0,0,0,0.2)] rounded-2xl max-h-56 overflow-y-auto modal-scrollbar">
            {options.map((opt: any) => (
              <div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`px-4 py-3.5 cursor-pointer text-sm font-bold border-b border-white/30 dark:border-slate-700/50 last:border-0 transition-colors ${value === opt.value ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'hover:bg-white/60 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-200'}`}>{opt.label}</div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NoteBlock {
  id: string;
  type: 'text' | 'table';
  content?: string;
  size?: string;
  html?: string;
}

export default function NotesTab({ projectId }: NotesTabProps) {
  const allProjects = useProjectStore((state) => state.projects);
  const updateProject = useProjectStore((state) => state.updateProject);
  const allTransactions = useFinanceStore((state) => state.transactions);
  
  const project = useMemo(() => allProjects.find(p => p.id === projectId), [allProjects, projectId]);
  const notes = project?.notes || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('ALL');
  const [isMergedView, setIsMergedView] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewNote, setPreviewNote] = useState<any>(null);

  // 💡 استیت‌های کنترل حذف زمان‌دارِ شناور
  const [undoItems, setUndoItems] = useState<{ id: string, items: string[], expireAt: number }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTag, setFormTag] = useState('');
  const [formAlignment, setFormAlignment] = useState<'right' | 'center' | 'left'>('right');
  
  const [blocks, setBlocks] = useState<NoteBlock[]>([{ id: crypto.randomUUID(), type: 'text', content: '', size: 'text-base' }]);

  const [builderState, setBuilderState] = useState<{isOpen: boolean, module: string, availableCols: {id:string, label:string}[], availableRows: any[]}>({isOpen: false, module: '', availableCols: [], availableRows: []});
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    const handleOpenModal = () => openModal();
    document.addEventListener('open-new-note-modal', handleOpenModal);
    return () => document.removeEventListener('open-new-note-modal', handleOpenModal);
  }, []);

  // 💡 منطق اجرای خودکار حذف پس از ۵ ثانیه
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            const allExpiredIds = expired.flatMap(e => e.items);
            // گرفتن دیتای زنده از استور تا خطایی در رندر پیش نیاید
            const currentProject = useProjectStore.getState().projects.find(p => p.id === projectId);
            if (currentProject) {
               const currentNotes = currentProject.notes || [];
               const updatedNotes = currentNotes.filter((n: any) => !allExpiredIds.includes(n.id));
               useProjectStore.getState().updateProject(projectId, { notes: updatedNotes });
            }
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !allExpiredIds.includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [projectId]);

  // 💡 تابع فراخوانی حذف زمان‌دار (۵ ثانیه)
  const triggerDelete = (ids: string[]) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: ids, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...ids]);
  };

  const extractRawText = (contentStr: string) => {
    try {
      const parsed = JSON.parse(contentStr);
      if (Array.isArray(parsed)) return parsed.filter(b => b.type === 'text').map(b => b.content).join(' ... ');
      return contentStr;
    } catch { return contentStr; }
  };

  const filteredNotes = useMemo(() => {
    let filtered = [...notes].filter(n => {
      if (pendingDeleteIds.includes(n.id)) return false; // 💡 مخفی کردن در حین حذف
      const rawText = extractRawText(n.content);
      const matchSearch = n.title.includes(searchQuery) || rawText.includes(searchQuery);
      const matchTag = selectedTagFilter === 'ALL' ? true : n.tag === selectedTagFilter;
      return matchSearch && matchTag;
    });

    if (isMergedView) {
      filtered = filtered.sort((a, b) => a.tag.localeCompare(b.tag));
    } else {
      filtered = filtered.sort((a, b) => {
        if (a.isPinned === b.isPinned) return new Date(b.date).getTime() - new Date(a.date).getTime();
        return a.isPinned ? -1 : 1;
      });
    }
    return filtered;
  }, [notes, searchQuery, selectedTagFilter, isMergedView, pendingDeleteIds]);

  const openModal = (note?: any) => {
    if (note) {
      setNoteToEdit(note);
      setFormTitle(note.title);
      setFormDate(note.date);
      setFormTag(note.tag);
      setFormAlignment(note.textAlignment || 'right');
      try {
        const parsed = JSON.parse(note.content);
        if (Array.isArray(parsed)) setBlocks(parsed);
        else setBlocks([{ id: crypto.randomUUID(), type: 'text', content: note.content || '', size: 'text-base' }]);
      } catch {
        setBlocks([{ id: crypto.randomUUID(), type: 'text', content: note.content || '', size: 'text-base' }]);
      }
    } else {
      setNoteToEdit(null);
      setFormTitle('');
      setFormDate(new Date().toLocaleDateString('fa-IR'));
      setFormTag('GENERAL');
      setFormAlignment('right');
      setBlocks([{ id: crypto.randomUUID(), type: 'text', content: '', size: 'text-base' }]);
    }
    setIsModalOpen(true);
  };

  const handlePreview = (note: any) => {
    setPreviewNote(note);
    setIsPreviewOpen(true);
  };

  const handleExportPDF = async (note: any) => {
    setPreviewNote(note);
    setIsPreviewOpen(true);
    toast.loading('در حال پردازش گرافیک و تولید PDF...', { id: 'pdf-toast' });

    setTimeout(async () => {
      try {
        const element = document.getElementById('printable-a4-document');
        if (!element) throw new Error('المان یافت نشد.');

        const controls = document.getElementById('print-controls');
        if (controls) controls.style.display = 'none';

        const dataUrl = await htmlToImage.toJpeg(element, { quality: 0.98, pixelRatio: 2, backgroundColor: '#ffffff' });
        
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
           const pdfHeight = (img.height * pdfWidth) / img.width;
           pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
           pdf.save(`گزارش_${note.title.replace(/\s+/g, '_')}.pdf`);
           
           if (controls) controls.style.display = 'flex';
           toast.dismiss('pdf-toast');
           toast.success('فایل PDF با موفقیت دانلود شد.');
        };
      } catch (err: any) {
        toast.dismiss('pdf-toast');
        toast.error(`خطا در تولید PDF. لطفاً از نصب html-to-image مطمئن شوید.`);
        const controls = document.getElementById('print-controls');
        if (controls) controls.style.display = 'flex';
      }
    }, 1500); 
  };

  const handleExportStyledExcel = (note: any) => {
    try {
      let blocksHtml = '';
      try {
        const parsedBlocks = JSON.parse(note.content) as NoteBlock[];
        parsedBlocks.forEach(block => {
          if (block.type === 'text') {
            blocksHtml += `<div class="text-block" style="text-align: ${note.textAlignment || 'right'}; margin: 15px 0; font-size: 14px;">${(block.content ?? '').replace(/\n/g, '<br/>')}</div>`;
          } else if (block.type === 'table' && block.html) {
            blocksHtml += block.html; 
          }
        });
      } catch {
        blocksHtml += `<div class="text-block" style="text-align: right; margin: 15px 0; font-size: 14px;">${note.content.replace(/\n/g, '<br/>')}</div>`;
      }

      const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
          <meta charset="utf-8" />
          <style>
              body { font-family: 'Tahoma', sans-serif; direction: rtl; text-align: right; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; direction: rtl; }
              th { background-color: #4f46e5; color: white; border: 1px solid #cbd5e1; padding: 12px; font-weight: bold; text-align: center; font-size: 14px; }
              td { border: 1px solid #cbd5e1; padding: 10px; text-align: center; vertical-align: middle; font-size: 13px; color: #1e293b; }
              tr:nth-child(even) td { background-color: #f8fafc; }
              h1 { color: #1e293b; text-align: center; font-size: 24px; margin-bottom: 5px; }
              .meta { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 20px; font-weight: bold; }
          </style>
      </head>
      <body dir="rtl">
          <h1>${note.title}</h1>
          <div class="meta">تاریخ ثبت: ${note.date} | دسته‌بندی: ${TAG_CONFIG[note.tag]?.label || 'عمومی'}</div>
          ${blocksHtml}
      </body>
      </html>
      `;

      const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `گزارش_${note.title.replace(/\s+/g, '_')}.xls`;
      a.click();
      toast.success('فایل اکسل با قالب‌بندی و رنگ‌بندی زیبا دانلود شد.');
    } catch (err) {
      toast.error('خطا در تولید فایل اکسل.');
    }
  };

  const handleSaveNote = () => {
    if (!formTitle) return toast.error('عنوان سند الزامی است.');
    const finalContentStr = JSON.stringify(blocks);
    let updatedNotes;
    if (noteToEdit) {
      updatedNotes = notes.map((n: any) => n.id === noteToEdit.id ? { ...n, title: formTitle, content: finalContentStr, date: formDate, tag: formTag, textAlignment: formAlignment } : n);
      toast.success('سند با موفقیت ویرایش شد.');
    } else {
      updatedNotes = [{ id: crypto.randomUUID(), title: formTitle, content: finalContentStr, date: formDate, tag: formTag, textAlignment: formAlignment, isPinned: false }, ...notes];
      toast.success('سند جدید در سیستم ثبت شد.');
    }
    updateProject(projectId, { notes: updatedNotes });
    setIsModalOpen(false);
  };

  const togglePin = (id: string) => {
    const updatedNotes = notes.map((n: any) => n.id === id ? { ...n, isPinned: !n.isPinned } : n);
    updateProject(projectId, { notes: updatedNotes });
  };

  const updateBlockContent = (id: string, newContent: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: newContent } : b));
  };
  const updateBlockSize = (id: string, newSize: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, size: newSize } : b));
  };
  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const openColumnBuilder = (moduleKey: string) => {
    const availableCols = COLUMNS_MAP[moduleKey] || [];
    let data: any[] = [];
    if (moduleKey === 'FINANCE') data = allTransactions.filter(t => t.referenceId === projectId);
    else if (moduleKey === 'LABOR') data = project?.laborRecords || project?.labor || [];
    else if (moduleKey === 'PHASES') data = project?.phases || [];
    else if (moduleKey === 'PURCHASES') data = project?.purchases || [];
    else if (moduleKey === 'LOGISTICS') data = project?.logistics || [];

    const rowsWithIds = data.map((r, i) => ({ ...r, _tempId: r.id || i.toString() }));

    setBuilderState({ isOpen: true, module: moduleKey, availableCols, availableRows: rowsWithIds });
    setSelectedCols(availableCols.map(c => c.id));
    setSelectedRows(rowsWithIds.map(r => r._tempId));
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };
  const toggleAllRows = () => {
    if (selectedRows.length === builderState.availableRows.length) setSelectedRows([]);
    else setSelectedRows(builderState.availableRows.map(r => r._tempId));
  };

  const getRowLabel = (mod: string, row: any) => {
     if(mod === 'FINANCE') return `${row.date || ''} - ${row.description || 'تراکنش'} (${formatValue(row.amount)} ت)`;
     if(mod === 'LABOR') return `${row.date || ''} - ${row.workerName || row.name || 'نیرو'} (${row.workType || 'آزاد'})`;
     if(mod === 'PHASES') return row.name || 'فاز اجرایی';
     if(mod === 'PURCHASES') return `${row.date || ''} - ${row.title || row.vendor || 'خرید'}`;
     if(mod === 'LOGISTICS') {
       const vehicle = row.vehicleInfo || row.vehicleName || row.vehicleType || row.vehicle || row.car || '';
       const driver = row.provider || row.driverName || row.driver || row.operator || '';
       return `${row.date || ''} - ${[vehicle, driver].filter(Boolean).join(' / ') || 'لجستیک'}`;
     }
     return 'ردیف داده';
  };

  const generateTableHtml = () => {
    const { module, availableRows } = builderState;
    const dataToRender = availableRows.filter(r => selectedRows.includes(r._tempId));
    const getColLabel = (mod: string, colId: string) => COLUMNS_MAP[mod]?.find(c => c.id === colId)?.label || colId;

    const getColValue = (mod: string, col: string, row: any) => {
      if (mod === 'FINANCE') {
        if (col === 'date') return row.date || '-';
        if (col === 'desc') {
          let desc = row.description || '-';
          if (row.type === 'CHEQUE' && row.chequeDetails) {
            desc += ` (چک ${row.chequeDetails.bank || ''} سررسید: ${row.chequeDetails.dueDate || ''})`;
          }
          return desc;
        }
        if (col === 'type') return row.direction === 'IN' ? 'دریافتی' : 'پرداختی';
        if (col === 'amount') return formatValue(row.amount);
      }
      if (mod === 'LABOR') {
        if (col === 'date') return row.date || '-';
        if (col === 'name') return row.workerName || row.name || '-';
        if (col === 'type') return row.workType || row.jobType || '-';
        if (col === 'amount') return formatValue(safeNum(row.wage) || safeNum(row.amount));
      }
      if (mod === 'PHASES') {
        if (col === 'name') return row.name;
        if (col === 'type') return row.contractType === 'METRE' ? 'متری' : row.contractType === 'FIXED' ? 'مقطوع' : 'درصدی';
        if (col === 'status') return row.isCompleted ? 'تکمیل' : 'درجریان';
        if (col === 'value') {
           if (row.contractType === 'FIXED') return formatValue(Math.floor(safeNum(row.fixedPrice)/10));
           if (row.contractType === 'METRE') return formatValue(Math.floor((row.dimensions?.reduce((sum:any, d:any)=>sum+safeNum(d.area),0)||safeNum(row.area)||0) * safeNum(row.unitPrice)/10));
           return 'سیستمی (درصدی)';
        }
      }
      if (mod === 'PURCHASES') {
        if (col === 'date') return row.date || '-';
        if (col === 'vendor') return row.vendor || '-';
        if (col === 'title') return row.title || '-';
        if (col === 'amount') return formatValue(safeNum(row.amount) || safeNum(row.totalCost) || safeNum(row.billedCost) || safeNum(row.totalPrice));
      }
      if (mod === 'LOGISTICS') {
        if (col === 'date') return row.date || '-';
        if (col === 'driver') {
          const vehicle = row.vehicleInfo || row.vehicleName || row.vehicleType || row.vehicle || row.car || '';
          const driver = row.provider || row.driverName || row.driver || row.operator || '';
          return [vehicle, driver].filter(Boolean).join(' / ') || '-';
        }
        if (col === 'route') return `${row.origin || '-'} به ${row.destination || '-'}`;
        if (col === 'amount') return formatValue(safeNum(row.amount) || safeNum(row.totalCost) || safeNum(row.fee) || safeNum(row.billedCost));
      }
      return '-';
    };

    let ths = selectedCols.map(c => `<th style="padding: 12px; font-weight: bold; border: 1px solid #cbd5e1; background-color: #4f46e5; color: white; text-align: center; font-size: 14px;">${getColLabel(module, c)}</th>`).join('');
    let trs = dataToRender.map((row, idx) => {
       const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
       let tds = selectedCols.map(c => `<td style="padding: 10px; border: 1px solid #cbd5e1; color: #1e293b; text-align: center; vertical-align: middle; font-size: 13px;">${getColValue(module, c, row)}</td>`).join('');
       return `<tr style="background-color: ${bg};">${tds}</tr>`;
    }).join('');

    if (dataToRender.length === 0) {
      trs = `<tr><td colspan="${selectedCols.length}" style="border: 1px solid #cbd5e1; padding: 10px; text-align: center; color: #64748b;">دیتایی انتخاب نشد</td></tr>`;
    }

    const htmlString = `<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; font-family: Tahoma, Arial, sans-serif; text-align: right;" dir="rtl">
      <thead><tr>${ths}</tr></thead>
      <tbody>${trs}</tbody>
    </table>`;

    setBlocks(prev => [...prev, { id: crypto.randomUUID(), type: 'table', html: htmlString }, { id: crypto.randomUUID(), type: 'text', content: '', size: 'text-base' }]);
    setBuilderState({ isOpen: false, module: '', availableCols: [], availableRows: [] });
    toast.success('گزارش انتخابی با موفقیت در سند درج شد.');
  };

  const insertSmartReportText = (type: string) => {
    if (!project) return;
    let reportText = `\n--- خلاصه مدیریتی ---\n`;

    switch (type) {
      case 'FINANCE':
        const txs = allTransactions.filter(t => t.referenceId === projectId);
        const inCash = txs.filter(t => t.direction === 'IN' && t.type === 'CASH').reduce((a,b)=>a+safeNum(b.amount), 0);
        reportText += `تعداد کل تراکنش‌ها: ${txs.length} عدد\nمجموع دریافتی نقدی: ${formatValue(inCash)} تومان\n`;
        break;
      case 'LABOR':
        const laborData = project.laborRecords || project.labor || [];
        const totalWage = laborData.reduce((a:any,b:any) => a+(safeNum(b.wage)||safeNum(b.amount)||0), 0);
        reportText += `تعداد نیروهای ثبت شده: ${laborData.length} نفر\nمجموع دستمزدها: ${formatValue(totalWage)} تومان\n`;
        break;
      default: return;
    }
    
    setBlocks(prev => {
      const lastBlock = prev[prev.length - 1];
      if (lastBlock && lastBlock.type === 'text') {
         return prev.map((b, i) => i === prev.length - 1 ? { ...b, content: b.content + reportText } : b);
      }
      return [...prev, { id: crypto.randomUUID(), type: 'text', content: reportText, size: 'text-base' }];
    });
    toast.success('متن خلاصه گزارش اضافه شد.');
  };

  let currentMergedTag = '';

  if (!project) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6">
      
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-white/20 dark:border-slate-700/30 shadow-sm rounded-[2rem] px-6 py-4 z-[90] relative">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <NeonSearchWrapper className="w-full sm:w-80">
            <Search className="w-5 h-5 text-slate-400 shrink-0 ml-3" />
            <input placeholder="جستجو در دفترچه و گزارشات..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold py-3" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 rounded-full mr-3"><X className="w-3 h-3 text-slate-500" /></button>}
          </NeonSearchWrapper>
          
          <div className="w-44 z-[100]"><GlassSelect options={TAG_OPTIONS} value={selectedTagFilter} onChange={setSelectedTagFilter} placeholder="همه تگ‌ها" /></div>
          <div className="h-8 w-px bg-slate-300/50 dark:bg-slate-700/50 hidden sm:block" />

          <button onClick={() => setIsMergedView(!isMergedView)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${isMergedView ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-white/40 dark:bg-slate-800/40 border-white/60 dark:border-slate-600/50 text-slate-600 dark:text-slate-300 hover:bg-white/60'}`}>
            <Combine className="w-4 h-4" /> {isMergedView ? 'حالت گروه‌بندی (فعال)' : 'ادغام یادداشت‌های هم‌رنگ'}
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700/50 shadow-2xl modal-scrollbar relative min-h-[400px]">
        <table className="w-full text-right border-collapse min-w-[1050px]">
          <thead>
            <tr className="bg-white/40 dark:bg-black/20 border-b border-white/40 dark:border-slate-700/50">
              <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300 w-1/4">دسته‌بندی (تگ)</th>
              <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300 w-1/4">عنوان سند</th>
              <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300 w-1/3">شرح / دیتای درج‌شده</th>
              <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300 text-center w-44">عملیات و خروجی</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredNotes.map((note) => {
                const tagData = TAG_CONFIG[note.tag] || TAG_CONFIG['GENERAL'];
                let isFirstOfTagGroup = false;
                let rowSpanCount = 1;
                
                if (isMergedView) {
                  if (note.tag !== currentMergedTag) {
                    isFirstOfTagGroup = true;
                    currentMergedTag = note.tag;
                    rowSpanCount = filteredNotes.filter(n => n.tag === note.tag).length;
                  }
                }

                return (
                  <motion.tr key={note.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`border-b border-white/30 dark:border-slate-700/30 hover:bg-white/50 dark:hover:bg-white/10 transition-colors group ${isMergedView && isFirstOfTagGroup ? 'border-t-2 border-t-indigo-500/20' : ''} ${note.tag === 'URGENT' ? 'bg-rose-500/5 dark:bg-rose-500/10' : ''}`}>
                    {(!isMergedView || isFirstOfTagGroup) && (
                      <td rowSpan={isMergedView ? rowSpanCount : 1} className={`p-5 align-top ${isMergedView ? 'border-l border-white/40 dark:border-slate-700/50 bg-white/20 dark:bg-black/10' : ''}`}>
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${tagData.bg} ${tagData.border} ${tagData.color} shadow-sm`}>
                          <Tag className="w-4 h-4" /> <span className="text-sm font-black tracking-wide">{tagData.label}</span>
                        </div>
                      </td>
                    )}
                    <td className="p-5 align-top">
                      <div className="flex items-start gap-3 pt-1">
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.8 }} onClick={() => togglePin(note.id)} className="mt-0.5 focus:outline-none relative flex items-center justify-center w-6 h-6 shrink-0">
                          <AnimatePresence>
                            {note.isPinned && (
                              <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1, rotate: 360 }} exit={{ opacity: 0, scale: 0 }} transition={{ rotate: { duration: 4, repeat: Infinity, ease: "linear" } }} className="absolute inset-0 rounded-full bg-amber-400/50 blur-[6px]" />
                            )}
                          </AnimatePresence>
                          <motion.div initial={false} animate={{ rotate: note.isPinned ? [0, 360] : 0, scale: note.isPinned ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.5, type: "spring", stiffness: 200 }}>
                            <Star className={`relative z-10 w-5 h-5 transition-colors duration-300 ${note.isPinned ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]' : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'}`} />
                          </motion.div>
                        </motion.button>
                        <div className="flex flex-col gap-1.5">
                          <span className={`font-bold text-base leading-tight ${note.tag === 'URGENT' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {note.tag === 'URGENT' && <AlertCircle className="inline w-4 h-4 ml-1 text-rose-500 animate-pulse" />}
                            {note.title}
                          </span>
                          {note.date && <div className="flex items-center gap-1 text-slate-400 text-xs font-bold"><Calendar className="w-3.5 h-3.5" /> {note.date}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-5 align-top">
                      <div dir="auto" style={{ textAlign: note.textAlignment as any }} className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed pt-1.5 whitespace-pre-wrap line-clamp-3">
                        {extractRawText(note.content)}
                      </div>
                    </td>
                    <td className="p-5 align-top text-center">
                      <div className="flex flex-col gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        
                        <div className="flex items-center justify-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-2">
                          <button onClick={() => handlePreview(note)} title="پیش‌نمایش (A4)" className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 shadow-sm"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => handleExportPDF(note)} title="تولید فایل PDF گرافیکی" className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-sm"><FileText className="w-4 h-4" /></button>
                          <button onClick={() => handleExportStyledExcel(note)} title="دانلود اکسل گرافیکی" className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 shadow-sm"><FileSpreadsheet className="w-4 h-4" /></button>
                          <button onClick={() => { handlePreview(note); setTimeout(() => window.print(), 500); }} title="ارسال به پرینتر سیستم" className="p-1.5 rounded-lg bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 shadow-sm"><Printer className="w-4 h-4" /></button>
                        </div>
                        
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => openModal(note)} className="p-2 w-full flex justify-center rounded-xl bg-white/60 dark:bg-slate-800 text-blue-500 hover:bg-blue-50 shadow-sm"><Edit className="w-4 h-4" /></button>
                          {/* 💡 جایگزینی حذف مستقیم با تریگر زمان‌دار */}
                          <button onClick={() => triggerDelete([note.id])} className="p-2 w-full flex justify-center rounded-xl bg-white/60 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filteredNotes.length === 0 && (
                <tr className="border-none"><td colSpan={4} className="p-16 text-center text-slate-500 font-bold">هیچ یادداشت یا گزارشی یافت نشد.</td></tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

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
                    {undo.items.length > 1 ? `${undo.items.length} سند در حال حذف` : 'سند در حال حذف'}
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

      {/* ======================================================== */}
      {/* پاپ‌آپ پیش‌نمایش گرافیکی (A4 - آماده برای Print/PDF) */}
      {/* ======================================================== */}
      <style type="text/css" media="print">
        {`
          @page { size: A4 portrait; margin: 0; }
          body * { visibility: hidden !important; }
          #printable-a4-document, #printable-a4-document * { visibility: visible !important; }
          #printable-a4-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
            background: white !important;
            min-height: 100vh !important;
            border-radius: 0 !important;
          }
        `}
      </style>
      
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isPreviewOpen && previewNote && (
            <div className="fixed inset-0 z-[9999999] flex justify-center p-4 sm:p-8 overflow-y-auto" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPreviewOpen(false)} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md print:hidden" />
              
              <motion.div 
                initial={{ opacity: 0, y: 50 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 50 }} 
                className="relative w-full max-w-4xl flex justify-center my-auto print:shadow-none print:bg-transparent print:p-0 print:m-0"
              >
                <div id="printable-a4-document" className="w-full min-h-[297mm] bg-white text-black shadow-2xl rounded-2xl p-8 sm:p-12 print:shadow-none print:rounded-none">
                  
                  <div id="print-controls" className="absolute top-6 left-6 flex items-center gap-2 print:hidden">
                    <button onClick={() => handleExportPDF(previewNote)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors font-bold shadow-sm border border-emerald-200">
                      <FileText className="w-5 h-5" /> دانلود PDF
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors font-bold shadow-sm border border-indigo-200">
                      <Printer className="w-5 h-5" /> چاپ
                    </button>
                    <button onClick={() => setIsPreviewOpen(false)} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors shadow-sm border border-slate-300">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center justify-center border-b-2 border-slate-200 pb-8 mb-8 mt-4">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 print:hidden">
                      <Notebook className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 text-center">{previewNote.title}</h1>
                    <div className="flex items-center gap-4 mt-4 text-sm font-bold text-slate-500">
                      <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> تاریخ گزارش: {previewNote.date || 'ثبت نشده'}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> {TAG_CONFIG[previewNote.tag]?.label || 'عمومی'}</span>
                    </div>
                  </div>

                  <div dir="auto" style={{ textAlign: previewNote.textAlignment as any }} className="w-full">
                    {(() => {
                      try {
                        const parsedBlocks = JSON.parse(previewNote.content) as NoteBlock[];
                        return parsedBlocks.map(block => {
                          if (block.type === 'text') {
                            return <div key={block.id} className={`${block.size || 'text-base'} whitespace-pre-wrap font-medium text-slate-800 leading-loose mb-4`}>{block.content}</div>;
                          }
                          if (block.type === 'table' && block.html) {
                            return <div key={block.id} className="w-full overflow-x-auto my-6 print:overflow-visible" dangerouslySetInnerHTML={{ __html: block.html }} />;
                          }
                          return null;
                        });
                      } catch {
                        return <div className="text-base font-medium text-slate-800 whitespace-pre-wrap">{previewNote.content}</div>;
                      }
                    })()}
                  </div>

                  <div className="mt-20 pt-8 border-t border-slate-200 flex justify-between items-end opacity-70 break-inside-avoid">
                    <div className="text-sm font-bold text-slate-800">
                      <p>پیمانکار / تهیه‌کننده گزارش:</p>
                      <p className="mt-8 border-t border-slate-400 border-dashed w-48 text-center pt-2">مهر و امضا</p>
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      <p>کارفرما / ناظر پروژه:</p>
                      <p className="mt-8 border-t border-slate-400 border-dashed w-48 text-center pt-2">مهر و امضا</p>
                    </div>
                  </div>

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ======================================================== */}
      {/* مودال حرفه‌ای ویرایشگر بلوکی */}
      {/* ======================================================== */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
              
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl p-6 rounded-[2rem] backdrop-blur-3xl bg-white/95 dark:bg-slate-900/95 border border-white/50 dark:border-slate-700 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto modal-scrollbar">
                
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-black flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Notebook className="w-6 h-6" />
                    {noteToEdit ? 'ویرایش سند' : 'ایجاد سند / گزارش جدید'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">تگ و رنگ سند</label>
                    <GlassSelect options={MODAL_TAG_OPTIONS} value={formTag} onChange={setFormTag} placeholder="انتخاب دسته‌بندی" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">تاریخ پیوست</label>
                    <GlassDatePicker value={formDate} onChange={setFormDate} placeholder="انتخاب تاریخ..." />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">عنوان سند</label>
                  <GlassInputWrapper>
                    <input dir="auto" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="مثلاً: گزارش وضعیت کارگاه در هفته اول" className="w-full bg-transparent px-4 py-3 outline-none font-black text-sm text-slate-900 dark:text-white" />
                  </GlassInputWrapper>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-t-xl border border-b-0 border-slate-200 dark:border-slate-600/50 overflow-x-auto modal-scrollbar gap-3">
                    
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg p-1 shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                      <button onClick={() => setFormAlignment('right')} className={`p-1.5 rounded-md transition-colors ${formAlignment === 'right' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><AlignRight className="w-4 h-4" /></button>
                      <button onClick={() => setFormAlignment('center')} className={`p-1.5 rounded-md transition-colors ${formAlignment === 'center' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><AlignCenter className="w-4 h-4" /></button>
                      <button onClick={() => setFormAlignment('left')} className={`p-1.5 rounded-md transition-colors ${formAlignment === 'left' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><AlignLeft className="w-4 h-4" /></button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pr-2 pb-1 sm:pb-0">
                      <span className="text-[10px] font-bold text-slate-400 ml-1">درج لیست/جدول:</span>
                      <button type="button" onClick={() => openColumnBuilder('FINANCE')} title="درج جدول مالی" className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[10px] font-bold border border-emerald-500/20 transition-colors"><Banknote className="w-3.5 h-3.5" /> تراکنش‌ها</button>
                      <button type="button" onClick={() => openColumnBuilder('LABOR')} title="درج جدول نیروها" className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-[10px] font-bold border border-amber-500/20 transition-colors"><HardHat className="w-3.5 h-3.5" /> نیروی کار</button>
                      <button type="button" onClick={() => openColumnBuilder('PHASES')} title="درج جدول فازها" className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 text-[10px] font-bold border border-indigo-500/20 transition-colors"><Layers className="w-3.5 h-3.5" /> فازها</button>
                      <button type="button" onClick={() => openColumnBuilder('PURCHASES')} title="درج جدول خریدها" className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-[10px] font-bold border border-rose-500/20 transition-colors"><ShoppingCart className="w-3.5 h-3.5" /> خریدها</button>
                      <button type="button" onClick={() => openColumnBuilder('LOGISTICS')} title="درج جدول لجستیک" className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 text-[10px] font-bold border border-cyan-500/20 transition-colors"><Truck className="w-3.5 h-3.5" /> لجستیک</button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pr-2 pb-1 sm:pb-0 border-r border-slate-300 dark:border-slate-700 pl-2">
                       <span className="text-[10px] font-bold text-slate-400 ml-1">درج خلاصه متنی:</span>
                       <button type="button" onClick={() => insertSmartReportText('FINANCE')} title="خلاصه مالی" className="p-1.5 rounded-md bg-slate-200/50 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"><Banknote className="w-3.5 h-3.5" /></button>
                       <button type="button" onClick={() => insertSmartReportText('LABOR')} title="خلاصه نیروها" className="p-1.5 rounded-md bg-slate-200/50 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"><HardHat className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  <GlassInputWrapper className="!rounded-t-none !border-t-0 items-start p-4 min-h-[350px]">
                    {blocks.map((block, index) => (
                      <div key={block.id} className="w-full relative group/block mb-2">
                        {block.type === 'text' ? (
                          <>
                            <div className="absolute -top-7 right-0 flex items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 z-10">
                               <Type className="w-3.5 h-3.5 text-slate-400 mx-1" />
                               <select value={block.size} onChange={e => updateBlockSize(block.id, e.target.value)} className="text-xs bg-slate-100 dark:bg-slate-900 rounded p-1 outline-none text-slate-600 dark:text-slate-300 font-bold">
                                 <option value="text-sm">سایز: کوچک</option>
                                 <option value="text-base">سایز: متوسط</option>
                                 <option value="text-lg">سایز: بزرگ</option>
                                 <option value="text-xl font-black">سایز: تیتر / عنوان</option>
                               </select>
                               {blocks.length > 1 && (
                                 <button onClick={() => removeBlock(block.id)} className="p-1 hover:bg-rose-100 rounded text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                               )}
                            </div>
                            <textarea 
                              dir="auto" 
                              style={{ textAlign: formAlignment }}
                              value={block.content} 
                              onChange={e => updateBlockContent(block.id, e.target.value)} 
                              onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                              placeholder={index === 0 ? "متن یادداشت را اینجا بنویسید..." : "ادامه متن..."}
                              className={`w-full bg-transparent outline-none font-medium text-slate-900 dark:text-white resize-none overflow-hidden ${block.size || 'text-base'}`} 
                              rows={2}
                            />
                          </>
                        ) : (
                          <div className="relative pt-6 pb-2">
                            <div className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity z-10">
                               <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200">جدول سیستمی</span>
                               <button onClick={() => removeBlock(block.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-md text-rose-500 transition-colors border border-rose-200"><Trash2 className="w-3.5 h-3.5"/></button>
                            </div>
                            <div className="w-full overflow-x-auto bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2" dangerouslySetInnerHTML={{ __html: block.html || '' }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </GlassInputWrapper>
                </div>

                <button onClick={handleSaveNote} className="w-full py-4 mt-6 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                  <Database className="w-5 h-5" /> 
                  {noteToEdit ? 'ذخیره تغییرات سند' : 'ثبت نهایی سند در سیستم'}
                </button>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ======================================================== */}
      {/* انتخابگر ردیف‌ها و ستون‌های جدول */}
      {/* ======================================================== */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {builderState.isOpen && (
            <div className="fixed inset-0 z-[10000000] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBuilderState(prev => ({...prev, isOpen: false}))} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
              
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-6 max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-2 border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                  <h3 className="text-base font-black flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Box className="w-5 h-5" /> سفارشی‌سازی جدول {COLUMNS_MAP[builderState.module]?.[0]?.label ? builderState.module : ''}
                  </h3>
                  <button onClick={() => setBuilderState(prev => ({...prev, isOpen: false}))} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full"><X className="w-4 h-4 text-slate-500" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto modal-scrollbar pr-2 space-y-6">
                  <div>
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" /> ۱. انتخاب ستون‌های جدول
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {builderState.availableCols.map(col => (
                        <label key={col.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            checked={selectedCols.includes(col.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCols([...selectedCols, col.id]);
                              else setSelectedCols(selectedCols.filter(id => id !== col.id));
                            }}
                            className="w-4 h-4 text-indigo-500 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-fuchsia-500" /> ۲. انتخاب ردیف‌های داده
                      </h4>
                      <button onClick={toggleAllRows} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg">
                        {selectedRows.length === builderState.availableRows.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                      </button>
                    </div>
                    
                    {builderState.availableRows.length === 0 ? (
                      <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-500">
                        داده‌ای در این بخش یافت نشد!
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto modal-scrollbar pr-1">
                        {builderState.availableRows.map(row => (
                          <label key={row._tempId} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                            <div className="flex items-center gap-3 truncate">
                              <input 
                                type="checkbox" 
                                checked={selectedRows.includes(row._tempId)}
                                onChange={() => toggleRow(row._tempId)}
                                className="w-4 h-4 text-fuchsia-500 rounded focus:ring-fuchsia-500 shrink-0"
                              />
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{getRowLabel(builderState.module, row)}</span>
                            </div>
                            {builderState.module === 'PHASES' && (
                               <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded shrink-0">{row.isCompleted ? 'تکمیل' : 'جاری'}</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <button onClick={generateTableHtml} disabled={selectedCols.length === 0 || selectedRows.length === 0} className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95">
                    <CheckCircle className="w-5 h-5" /> تایید و درج جدول در گزارش
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </motion.div>
  );
}