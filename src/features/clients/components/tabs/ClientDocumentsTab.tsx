import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Archive, FileUp, FileText, Image as ImageIcon, Trash2, Download, Search, X, FolderOpen, 
  FileCheck, File, Eye, List, Grid, Edit3, Tag, MessageSquare, ExternalLink, 
  CheckSquare, CheckCircle, User, ShieldCheck, Mail, Briefcase, Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';

import { useClientStore } from '../../../../store/clientStore';
import { useProjectStore } from '../../../projects/store/projectStore';
import GlassSelect from '../../../../components/ui/GlassSelect';

interface ClientDocumentsTabProps {
  clientId: string;
}

const FOLDERS = [
  { id: 'اسناد هویتی و ثبتی', icon: User, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  { id: 'قراردادها و توافق‌نامه‌ها', icon: FileCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { id: 'تضامین و چک‌ها', icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
  { id: 'نامه‌نگاری‌ها و مکاتبات', icon: Mail, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10 border-fuchsia-500/20' },
  { id: 'سایر مدارک', icon: File, color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20' },
];

const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse z-0" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-indigo-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

export default function ClientDocumentsTab({ clientId }: ClientDocumentsTabProps) {
  const client = useClientStore(state => state.clients.find(c => c.id === clientId));
  const addClientDocument = useClientStore(state => state.addClientDocument);
  const updateClientDocument = useClientStore(state => state.updateClientDocument);
  const deleteClientDocument = useClientStore(state => state.deleteClientDocument);

  // 💡 استخراج توابع و پروژه‌ها برای تجمیع اطلاعات
  const allProjects = useProjectStore(state => state.projects);
  const addArchiveRecordToProject = useProjectStore(state => state.addArchiveRecord);
  const updateArchiveRecordInProject = useProjectStore(state => state.updateArchiveRecord);
  const deleteArchiveRecordFromProject = useProjectStore(state => state.deleteArchiveRecord);
  const clientProjects = useMemo(() => allProjects.filter(p => p.clientId === clientId), [allProjects, clientId]);

  // 🚀 جادوی تجمیع داینامیک: ترکیب مدارک کارفرما با تمام مدارک قبلی پروژه‌های او
  const archiveRecords = useMemo(() => {
    const clientDocs = client?.archive || [];
    
    // استخراج مدارک از تمام پروژه‌های مرتبط با این شخص
    const projectDocs = clientProjects.flatMap(p => 
      (p.archive || []).map((doc: any) => ({
        ...doc,
        linkedProjectId: p.id,
        linkedProjectName: p.name,
        isFromProjectTab: true // نشانه‌گذاری مدارکی که از بایگانی پروژه آمده‌اند
      }))
    );

    // ادغام و جلوگیری از نمایش فایل‌های تکراری
    const merged = [...clientDocs];
    projectDocs.forEach(pDoc => {
      const exists = merged.some(cDoc => cDoc.name === pDoc.name && cDoc.size === pDoc.size);
      if (!exists) merged.push(pDoc);
    });

    return merged;
  }, [client?.archive, clientProjects]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterFolder, setFilterFolder] = useState('ALL');
  
  const [uploadFolder, setUploadFolder] = useState(FOLDERS[0].id);
  const [uploadProjectId, setUploadProjectId] = useState<string>('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const [viewFile, setViewFile] = useState<{url: string, type: string, name: string} | null>(null);
  const [editModalFile, setEditModalFile] = useState<any>(null);

  const [editFolder, setEditFolder] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editRevision, setEditRevision] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editLinkedProjectId, setEditLinkedProjectId] = useState('');

  const [editNewFileBase64, setEditNewFileBase64] = useState('');
  const [editNewFileName, setEditNewFileName] = useState('');
  const [editNewFileType, setEditNewFileType] = useState('');
  const [editNewFileSize, setEditNewFileSize] = useState('');
  const [isEditUploading, setIsEditUploading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // 💡 آپدیت استیت Undo برای تشخیص اینکه فایل باید از کجا حذف شود
  const [undoItems, setUndoItems] = useState<{ id: string, items: {id: string, isFromProjectTab?: boolean, linkedProjectId?: string}[], expireAt: number }[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         if (expired.length > 0) {
            expired.forEach(u => {
               u.items.forEach(item => {
                  // 🚀 عملیات سراسری: اگر فایل مال پروژه بوده، از خود پروژه هم پاک می‌شود!
                  if (item.isFromProjectTab && item.linkedProjectId) {
                     deleteArchiveRecordFromProject(item.linkedProjectId, item.id);
                  } else {
                     deleteClientDocument(clientId, item.id);
                  }
               });
            });
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e=>e.items.map(i=>i.id)).includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [deleteClientDocument, deleteArchiveRecordFromProject, clientId]);

  const triggerDelete = (ids: string[]) => {
    const itemsToDelete = archiveRecords.filter(r => ids.includes(r.id)).map(r => ({
       id: r.id, 
       isFromProjectTab: r.isFromProjectTab, 
       linkedProjectId: r.linkedProjectId
    }));
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: itemsToDelete, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...ids]);
    setSelectedFiles([]); 
  };

  const stats = useMemo(() => {
    return {
      totalFiles: archiveRecords.length,
      images: archiveRecords.filter((r:any) => r.type === 'IMAGE').length,
      pdfs: archiveRecords.filter((r:any) => r.type === 'PDF').length,
    };
  }, [archiveRecords]);

  const filteredRecords = useMemo(() => {
    return archiveRecords.filter((r: any) => {
      if (pendingDeleteIds.includes(r.id)) return false;
      const matchesSearch = !searchQuery || 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (r.tags && r.tags.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.note && r.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.linkedProjectName && r.linkedProjectName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFolder = filterFolder === 'ALL' || r.folder === filterFolder;
      return matchesSearch && matchesFolder;
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [archiveRecords, searchQuery, filterFolder, pendingDeleteIds]);

  const toggleSelectAll = () => {
    if (selectedFiles.length === filteredRecords.length) setSelectedFiles([]);
    else setSelectedFiles(filteredRecords.map((r: any) => r.id));
  };
  
  const toggleSelectFile = (id: string) => {
    if (selectedFiles.includes(id)) setSelectedFiles(selectedFiles.filter(fid => fid !== id));
    else setSelectedFiles([...selectedFiles, id]);
  };

  const processFilesArray = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    let successCount = 0;
    
    const selectedProject = clientProjects.find(p => p.id === uploadProjectId);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2) + ' MB';
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`فایل ${file.name} بزرگتر از 10 مگابایت است.`);
        continue;
      }

      try {
        const base64 = await convertAndCompress(file);
        const docData = {
          name: file.name,
          type: file.type.includes('pdf') ? 'PDF' : file.type.includes('image') ? 'IMAGE' : 'DOCUMENT' as any,
          size: fileSizeMB,
          date: new Date().toLocaleDateString('fa-IR'),
          folder: uploadFolder,
          base64Data: base64,
          revision: '',
          tags: '',
          note: '',
          linkedProjectId: uploadProjectId || undefined,
          linkedProjectName: selectedProject ? selectedProject.name : undefined
        };

        addClientDocument(clientId, docData);

        if (uploadProjectId && addArchiveRecordToProject) {
           addArchiveRecordToProject(uploadProjectId, {
              ...docData,
              folder: 'سایر اسناد', 
              tags: 'کپی از پرونده کارفرما',
              note: `مرتبط با: ${uploadFolder}`
           });
        }

        successCount++;
      } catch (error) {
        toast.error(`خطا در پردازش فایل ${file.name}`);
      }
    }

    if (successCount > 0) {
       toast.success(`${successCount} فایل ذخیره شد.` + (uploadProjectId ? ' (همگام‌سازی با پروژه انجام شد)' : ''));
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('حجم فایل نباید بیشتر از 10 مگابایت باشد.');
    
    setIsEditUploading(true);
    toast.info('در حال فشرده‌سازی و جایگزینی فایل...');
    try {
      const base64 = await convertAndCompress(file);
      setEditNewFileBase64(base64);
      setEditNewFileName(file.name);
      setEditNewFileType(file.type.includes('pdf') ? 'PDF' : file.type.includes('image') ? 'IMAGE' : 'DOCUMENT');
      setEditNewFileSize((file.size / 1024 / 1024).toFixed(2) + ' MB');
      toast.success('فایل جدید جایگزین شد. برای ثبت دکمه ذخیره را بزنید.');
    } catch (error) {
      toast.error('خطا در پردازش فایل');
    }
    setIsEditUploading(false);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const convertAndCompress = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.src = result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > height) { if (width > 1600) { height *= 1600 / width; width = 1600; } } 
            else { if (height > 1600) { width *= 1600 / height; height = 1600; } }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.onerror = reject;
        } else resolve(result);
      };
      reader.onerror = reject;
    });
  };

  const downloadFile = (base64Data: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = base64Data; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const viewAttachedFile = (base64Data: string) => {
    try {
      const byteString = atob(base64Data.split(',')[1]);
      const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: mimeString });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      window.open(base64Data, '_blank');
    }
  };

  const openEditModal = (file: any) => {
    setEditModalFile(file);
    setEditFolder(file.folder);
    setEditNote(file.note || '');
    setEditRevision(file.revision || '');
    setEditTags(file.tags || '');
    setEditLinkedProjectId(file.linkedProjectId || '');
    setEditNewFileBase64('');
    setEditNewFileName('');
  };

  const handleUpdateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalFile) return;
    
    const selectedProject = clientProjects.find(p => p.id === editLinkedProjectId);

    const updateData: any = {
      folder: editFolder,
      note: editNote,
      revision: editRevision,
      tags: editTags,
      linkedProjectId: editLinkedProjectId || undefined,
      linkedProjectName: selectedProject ? selectedProject.name : undefined
    };

    if (editNewFileBase64) {
      updateData.base64Data = editNewFileBase64;
      updateData.name = editNewFileName;
      updateData.type = editNewFileType;
      updateData.size = editNewFileSize;
      updateData.date = new Date().toLocaleDateString('fa-IR');
    }

    // 🚀 عملیات سراسری: آپدیت همزمان در محل اصلی سند (کارفرما یا پروژه)
    if (editModalFile.isFromProjectTab && editModalFile.linkedProjectId) {
       updateArchiveRecordInProject(editModalFile.linkedProjectId, editModalFile.id, updateData);
    } else {
       updateClientDocument(clientId, editModalFile.id, updateData);
    }

    toast.success('اطلاعات سند با موفقیت بروزرسانی شد.');
    setEditModalFile(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6 pb-20">
      
      {/* داشبورد آمار */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4">
        <div className="p-5 rounded-[2rem] backdrop-blur-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 shadow-sm flex items-center justify-between group">
          <div>
            <span className="text-sm font-bold text-slate-500 flex items-center gap-1.5"><Archive className="w-4 h-4"/> کل مدارک کارفرما</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white mt-1">{stats.totalFiles} <span className="text-xs font-bold text-slate-500">فایل</span></div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform shadow-inner"><Archive className="w-6 h-6"/></div>
        </div>
        <div className="p-5 rounded-[2rem] backdrop-blur-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 shadow-sm flex items-center justify-between group">
          <div>
            <span className="text-sm font-bold text-slate-500 flex items-center gap-1.5"><ImageIcon className="w-4 h-4"/> تصاویر و اسکن‌ها</span>
            <div className="text-3xl font-black text-fuchsia-600 dark:text-fuchsia-400 mt-1">{stats.images} <span className="text-xs font-bold text-slate-500">مورد</span></div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-900/20 flex items-center justify-center text-fuchsia-500 group-hover:scale-110 transition-transform shadow-inner"><ImageIcon className="w-6 h-6"/></div>
        </div>
        <div className="p-5 rounded-[2rem] backdrop-blur-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 shadow-sm flex items-center justify-between group">
          <div>
            <span className="text-sm font-bold text-slate-500 flex items-center gap-1.5"><FileText className="w-4 h-4"/> قراردادها و PDF</span>
            <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.pdfs} <span className="text-xs font-bold text-slate-500">مورد</span></div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-inner"><FileText className="w-6 h-6"/></div>
        </div>
      </div>

      {/* منطقه آپلود حرفه‌ای + انتخاب پروژه */}
      <div className="px-4">
        <div className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-6 shadow-sm flex flex-col xl:flex-row items-stretch gap-6">
          <div className="flex-1 w-full relative">
            <input type="file" multiple accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && processFilesArray(Array.from(e.target.files))} disabled={isUploading} />
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFilesArray(Array.from(e.dataTransfer.files)); }}
              onClick={() => !isUploading && fileInputRef.current?.click()} 
              className={`w-full h-full min-h-[180px] border-2 border-dashed rounded-[1.5rem] p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${isUploading ? 'opacity-50 pointer-events-none border-slate-300 bg-slate-50' : isDragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 scale-[1.02]' : 'border-indigo-300 dark:border-indigo-700/50 bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'}`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-sm transition-transform ${isDragging ? 'bg-emerald-500 text-white scale-125' : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'}`}>
                {isUploading ? <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /> : isDragging ? <Download className="w-8 h-8" /> : <FileUp className="w-8 h-8" />}
              </div>
              <h3 className={`font-black text-lg ${isDragging ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                {isUploading ? 'در حال پردازش و فشرده‌سازی...' : isDragging ? 'فایل‌ها را همینجا رها کنید' : 'آپلود اسناد جدید کارفرما'}
              </h3>
              <p className="font-bold text-xs text-slate-500 mt-1">فایل‌ها را بکشید و اینجا رها کنید (Drag & Drop)</p>
            </div>
          </div>

          <div className="w-full xl:w-[350px] flex flex-col gap-4">
            <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 ml-1"><FolderOpen className="w-4 h-4 text-indigo-500"/> مقصد ذخیره‌سازی:</label>
               <div className="h-[52px]">
                 <GlassSelect options={FOLDERS.map(f => ({ value: f.id, label: f.id }))} value={uploadFolder} onChange={setUploadFolder} placeholder="انتخاب پوشه" />
               </div>
            </div>

            <div className="space-y-1.5">
               <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 ml-1"><Briefcase className="w-4 h-4 text-emerald-500"/> اتصال و کپی در پروژه:</label>
                  {uploadProjectId && <span className="text-[9px] bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 px-2 py-0.5 rounded font-black">Sync فعال</span>}
               </div>
               <div className="h-[52px]">
                 <GlassSelect 
                    options={[{value: '', label: 'بدون اتصال (فقط در پرونده کارفرما)'}, ...clientProjects.map(p => ({ value: p.id, label: p.name }))]} 
                    value={uploadProjectId} 
                    onChange={setUploadProjectId} 
                    placeholder="انتخاب پروژه..." 
                 />
               </div>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-[10px] font-bold text-indigo-700 dark:text-indigo-400 leading-relaxed border border-indigo-100 dark:border-indigo-800/30 flex items-start gap-2 mt-auto">
              <LinkIcon className="w-4 h-4 shrink-0 mt-0.5"/>
              <span>اگر پروژه‌ای را انتخاب کنید، این فایل همزمان در بایگانی آن پروژه نیز کپی خواهد شد.</span>
            </div>
          </div>
        </div>
      </div>

      {/* نوار ابزار هوشمند */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4 px-4 relative z-50">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full">
          <NeonSearchWrapper className="flex-1 w-full sm:min-w-[200px] h-[48px]">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input placeholder="جستجوی نام سند، تگ، یادداشت یا نام پروژه..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold pl-2 pr-4 transition-colors placeholder:text-slate-500" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /></button>}
          </NeonSearchWrapper>
          <div className="w-full sm:w-64 h-[48px]">
            <GlassSelect options={[{ value: 'ALL', label: 'همه پوشه‌ها' }, ...FOLDERS.map(f => ({ value: f.id, label: f.id }))]} value={filterFolder} onChange={setFilterFolder} placeholder="فیلتر پوشه‌ها" />
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-3 w-full xl:w-auto shrink-0">
          <AnimatePresence>
            {selectedFiles.length > 0 && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
                onClick={() => triggerDelete(selectedFiles)} 
                className="h-[48px] px-4 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold rounded-xl flex items-center gap-2 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors shadow-sm"
              >
                <Trash2 className="w-5 h-5"/> <span className="text-sm whitespace-nowrap">حذف {selectedFiles.length} مورد</span>
              </motion.button>
            )}
          </AnimatePresence>

          <div className="h-[48px] bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl flex items-center p-1 shadow-sm">
            <button onClick={() => setViewMode('GRID')} className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`} title="نمای شبکه‌ای (گالری)"><Grid className="w-5 h-5"/></button>
            <button onClick={() => setViewMode('LIST')} className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`} title="نمای لیستی (جدول)"><List className="w-5 h-5"/></button>
          </div>
        </div>
      </div>

      {/* نمایش فایل‌ها (دو حالته) */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          {filteredRecords.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] bg-white/20 dark:bg-slate-800/20">
              <Archive className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">هیچ مدرکی برای این شخص یافت نشد.</p>
            </motion.div>
          ) : viewMode === 'GRID' ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRecords.map((file: any) => {
                const folderInfo = FOLDERS.find(f => f.id === file.folder) || FOLDERS[4];
                const FolderIcon = folderInfo.icon;
                const isSelected = selectedFiles.includes(file.id);

                return (
                  <motion.div key={file.id} layout className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' : 'border-white/80 dark:border-slate-700/80 shadow-sm'} rounded-3xl p-4 flex flex-col gap-4 group transition-all`}>
                    
                    <div className="flex items-start justify-between gap-3 relative">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border overflow-hidden ${file.type === 'PDF' ? 'bg-rose-50 border-rose-100 text-rose-500 dark:bg-rose-900/20 dark:border-rose-800/50' : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                        {file.type === 'PDF' ? <FileText className="w-7 h-7" /> : <img src={file.base64Data} alt={file.name} className="w-full h-full object-cover" />}
                      </div>
                      
                      <button onClick={() => toggleSelectFile(file.id)} className={`absolute -top-2 -left-2 z-20 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100'}`}>
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-6 relative z-10">
                        <button onClick={() => setViewFile({ url: file.base64Data, type: file.type, name: file.name })} title="مشاهده" className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors"><Eye className="w-4 h-4"/></button>
                        <button onClick={() => downloadFile(file.base64Data, file.name)} title="دانلود" className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 transition-colors"><Download className="w-4 h-4"/></button>
                        <button onClick={() => openEditModal(file)} title="ویرایش" className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"><Edit3 className="w-4 h-4"/></button>
                        <button onClick={() => triggerDelete([file.id])} title="حذف" className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-black text-sm text-slate-800 dark:text-white line-clamp-2 mb-2 leading-tight" title={file.name}>{file.name}</h4>
                      
                      {/* 💡 نمایش منبع فایل (پروژه یا کارفرما) */}
                      {file.isFromProjectTab ? (
                         <div className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg mb-2 flex items-center gap-1 w-max border border-blue-100 dark:border-blue-800/50" title="این فایل مستقیماً در بایگانی این پروژه ثبت شده است">
                           <Briefcase className="w-3 h-3"/> پروژه: {file.linkedProjectName}
                         </div>
                      ) : file.linkedProjectName ? (
                         <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg mb-2 flex items-center gap-1 w-max border border-emerald-100 dark:border-emerald-800/50">
                           <LinkIcon className="w-3 h-3"/> متصل به: {file.linkedProjectName}
                         </div>
                      ) : null}

                      {file.tags && <div className="text-[10px] font-bold text-slate-400 mb-2 flex items-center gap-1"><Tag className="w-3 h-3 text-amber-500"/> {file.tags}</div>}
                      
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-auto">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border ${folderInfo.bg} ${folderInfo.color}`}>
                          <FolderIcon className="w-3 h-3" /> {file.folder}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <span>{file.size}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>{file.date}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700/50 shadow-sm relative z-10 p-2">
              <table className="w-full text-right border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-white/60 dark:border-slate-700/50">
                    <th className="p-4 text-center w-12"><button onClick={toggleSelectAll} className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${selectedFiles.length === filteredRecords.length && filteredRecords.length > 0 ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 hover:bg-slate-300'}`}><CheckSquare className="w-4 h-4"/></button></th>
                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-300">نام سند</th>
                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-300">پوشه / دسته</th>
                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-300">اتصال / تگ</th>
                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-300">تاریخ و حجم</th>
                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-300 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((file: any) => {
                    const isSelected = selectedFiles.includes(file.id);
                    const folderInfo = FOLDERS.find(f => f.id === file.folder) || FOLDERS[4];
                    const FolderIcon = folderInfo.icon;
                    return (
                      <motion.tr key={file.id} layout className={`border-b border-white/30 dark:border-slate-700/30 hover:bg-white/50 dark:hover:bg-white/5 transition-colors group ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                        <td className="p-4 text-center">
                          <button onClick={() => toggleSelectFile(file.id)} className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100'}`}><CheckSquare className="w-4 h-4"/></button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner overflow-hidden ${file.type === 'PDF' ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                              {file.type === 'PDF' ? <FileText className="w-5 h-5" /> : <img src={file.base64Data} alt={file.name} className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex flex-col max-w-[250px]">
                              <span className="font-black text-sm text-slate-800 dark:text-white truncate" title={file.name}>{file.name}</span>
                              {file.note && <span className="text-[10px] text-slate-500 truncate" title={file.note}><MessageSquare className="w-3 h-3 inline mr-0.5 text-indigo-400"/> {file.note}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="p-4"><span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black border ${folderInfo.bg} ${folderInfo.color}`}><FolderIcon className="w-3.5 h-3.5" /> {file.folder}</span></td>
                        <td className="p-4 flex flex-col gap-1.5">
                          {/* 💡 نمایش هوشمند منبع فایل در حالت لیستی */}
                          {file.isFromProjectTab ? (
                             <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 px-2 py-0.5 rounded w-max truncate max-w-[150px]" title="آپلود شده از داخل خود پروژه"><Briefcase className="w-3 h-3 inline mr-1"/> {file.linkedProjectName}</span>
                          ) : file.linkedProjectName ? (
                             <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 px-2 py-0.5 rounded w-max truncate max-w-[150px]" title="آپلود شده از کارفرما و متصل به این پروژه"><LinkIcon className="w-3 h-3 inline mr-1"/> {file.linkedProjectName}</span> 
                          ) : (
                             <span className="text-[10px] font-bold text-slate-400">- عمومی -</span>
                          )}
                          {file.tags && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded w-max truncate max-w-[150px]"><Tag className="w-3 h-3 inline"/> {file.tags}</span>}
                        </td>
                        <td className="p-4"><div className="flex flex-col"><span className="text-sm font-bold text-slate-700 dark:text-slate-300">{file.date}</span><span className="text-[10px] text-slate-400">{file.size}</span></div></td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setViewFile({ url: file.base64Data, type: file.type, name: file.name })} title="مشاهده" className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"><Eye className="w-4 h-4"/></button>
                            <button onClick={() => downloadFile(file.base64Data, file.name)} title="دانلود" className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"><Download className="w-4 h-4"/></button>
                            <button onClick={() => openEditModal(file)} title="ویرایش" className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"><Edit3 className="w-4 h-4"/></button>
                            <button onClick={() => triggerDelete([file.id])} title="حذف" className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* کپسول شیشه‌ای و آیفونی برای تایید حذف زمان‌دار */}
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
                    setPendingDeleteIds(prev => prev.filter(id => !undo.items.map(i=>i.id).includes(id))); 
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

      {/* پاپ‌آپ مشاهده فایل (لایت‌باکس داخلی) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {viewFile && (
            <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 lg:p-8" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewFile(null)} className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-6xl h-[90vh] bg-slate-100 dark:bg-slate-900 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-10">
                  <h3 className="text-lg md:text-xl font-black flex items-center gap-3 text-slate-800 dark:text-white truncate pr-2">
                    {viewFile.type === 'PDF' ? <FileText className="w-6 h-6 text-rose-500 shrink-0" /> : <ImageIcon className="w-6 h-6 text-indigo-500 shrink-0" />}
                    <span className="truncate">{viewFile.name}</span>
                  </h3>
                  <div className="flex items-center gap-3 pl-2">
                    <button onClick={() => viewAttachedFile(viewFile.url)} className="px-4 py-2 md:py-2.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors text-xs md:text-sm font-black flex items-center gap-2">
                      <ExternalLink className="w-4 h-4"/> <span className="hidden sm:inline whitespace-nowrap">باز کردن در تب جدید</span>
                    </button>
                    <button onClick={() => setViewFile(null)} className="p-2 md:p-2.5 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-200 dark:hover:bg-rose-900 transition-colors shrink-0"><X className="w-5 h-5"/></button>
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
        </AnimatePresence>, document.body
      )}

      {/* 💡 پاپ‌آپ ویرایش پیشرفته سند */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {editModalFile && (
            <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditModalFile(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2"><Edit3 className="w-6 h-6 text-indigo-500"/> ویرایش مشخصات سند</h3>
                  <button onClick={() => setEditModalFile(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-rose-500 transition-colors"><X className="w-5 h-5"/></button>
                </div>
                
                <form onSubmit={handleUpdateRecord} className="space-y-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {editNewFileBase64 
                        ? (editNewFileType === 'PDF' ? <FileText className="w-10 h-10 text-rose-500" /> : <img src={editNewFileBase64} className="w-10 h-10 rounded-lg object-cover shadow-sm border border-slate-200 dark:border-slate-700" alt="پیش‌نمایش جدید" />)
                        : (editModalFile.type === 'PDF' ? <FileText className="w-10 h-10 text-rose-500" /> : <img src={editModalFile.base64Data} className="w-10 h-10 rounded-lg object-cover shadow-sm border border-slate-200 dark:border-slate-700" alt="پیش‌نمایش فعلی" />)
                      }
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300 truncate max-w-[180px] sm:max-w-[220px]" title={editNewFileName || editModalFile.name}>
                          {editNewFileName || editModalFile.name}
                        </span>
                        {editNewFileBase64 
                          ? <span className="text-[10px] text-emerald-500 font-bold mt-0.5">فایل جدید آماده ثبت است</span>
                          : <span className="text-[10px] text-slate-400 mt-0.5">{editModalFile.size}</span>
                        }
                      </div>
                    </div>
                    
                    <input type="file" accept="image/*,application/pdf" className="hidden" ref={editFileInputRef} onChange={handleEditFileUpload} disabled={isEditUploading} />
                    <button type="button" disabled={isEditUploading} onClick={() => editFileInputRef.current?.click()} className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors text-xs font-black flex items-center gap-1.5 shrink-0">
                      {isEditUploading ? <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /> : <FileUp className="w-4 h-4"/>} 
                      تغییر فایل
                    </button>
                  </div>

                  {/* فیلد ویرایش اتصال پروژه */}
                  <div className="relative z-[160]">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1 flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-emerald-500"/> متصل به پروژه</label>
                    <div className="h-[52px]">
                       <GlassSelect 
                          options={[{value: '', label: 'بدون اتصال (فقط در پرونده کارفرما)'}, ...clientProjects.map(p => ({ value: p.id, label: p.name }))]} 
                          value={editLinkedProjectId} 
                          onChange={setEditLinkedProjectId} 
                          placeholder="انتخاب پروژه..." 
                          disabled={editModalFile.isFromProjectTab} // 💡 اگر از داخل پروژه آمده باشه، امکان تغییر پروژه رو می‌بندیم تا گره کور ایجاد نشه
                       />
                    </div>
                    {editModalFile.isFromProjectTab && <span className="text-[9px] text-rose-500 font-bold block mt-1">این سند از داخل خود پروژه ثبت شده و قابل انتقال به پروژه دیگری نیست.</span>}
                  </div>

                  <div className="relative z-[150]">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1 flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5"/> انتقال به پوشه</label>
                    <div className="h-[52px]"><GlassSelect options={FOLDERS.map(f => ({ value: f.id, label: f.id }))} value={editFolder} onChange={setEditFolder} placeholder="انتخاب پوشه..." /></div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1 flex items-center gap-1"><Tag className="w-3.5 h-3.5"/> برچسب‌ها</label>
                      <input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="مثال: قرارداد رسمی، ضمانت" className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 font-bold text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5"/> یادداشت ضمیمه</label>
                    <textarea value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="توضیحات تکمیلی در مورد این سند بنویسید..." rows={3} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 font-bold text-sm resize-none" />
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={isEditUploading} className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                      <CheckCircle className="w-5 h-5"/> بروزرسانی اطلاعات سند
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>, document.body
      )}
    </motion.div>
  );
}