import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartPulse, FileBadge, PhoneCall, AlertTriangle, 
  Syringe, FileWarning, Fingerprint, CalendarClock, Activity, 
  FileText, ShieldCheck, Globe, X, ExternalLink,
  Download, Trash2, CheckSquare, Check, ImageOff
} from 'lucide-react';
import moment from 'moment-jalaali';
import { toast } from 'sonner';
import { useLaborStore } from '../../../store/laborStore';

export default function LaborHSETab({ workerId }: { workerId: string }) {
  const { workers, logs } = useLaborStore();
  const worker = workers.find(w => w.id === workerId);

  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<string[]>([]);
  
  // 💡 استیت‌های اختصاصی برای سیستم کپسولی لغو حذف (بدون مربع اضافه)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [undoItems, setUndoItems] = useState<{ id: string, docIds: string[], expireAt: number }[]>([]);

  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  const workerIncidents = useMemo(() => {
    return logs.filter(l => l.workerId === workerId && l.hasIncident).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, workerId]);

  // 💡 تایمر اجرایی برای حذف قطعی مدارک بعد از ۵ ثانیه
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
         const expired = prev.filter(u => u.expireAt <= now);
         const active = prev.filter(u => u.expireAt > now);
         
         if (expired.length > 0) {
            const latestWorker = useLaborStore.getState().workers.find(w => w.id === workerId);
            const docs = latestWorker?.documents || [];
            const idsToDelete = expired.flatMap(u => u.docIds);
            
            const remaining = docs.filter((d: any, idx: number) => {
                const docSafeId = d.id ? String(d.id) : d.url ? String(d.url) : `legacy-doc-${idx}`;
                return !idsToDelete.includes(docSafeId);
            });
            
            useLaborStore.getState().updateWorker(workerId, { documents: remaining });
            setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !idsToDelete.includes(id))), 0);
         }
         return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [workerId]);

  useEffect(() => {
    if (!selectedDoc || !selectedDoc.url) {
      setPreviewBlobUrl(null);
      return;
    }
    
    const docUrl = selectedDoc.url;
    const docType = selectedDoc.type || '';
    const isImage = docType.startsWith('image/') || docUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    
    if (docUrl.startsWith('blob:')) {
      setPreviewBlobUrl(null);
      return;
    }
    
    if (docUrl.startsWith('data:') && !isImage) {
       try {
         const [prefix, b64] = docUrl.split(',');
         const mime = prefix.split(':')[1].split(';')[0];
         const binStr = atob(b64);
         const len = binStr.length;
         const arr = new Uint8Array(len);
         for (let i = 0; i < len; i++) arr[i] = binStr.charCodeAt(i);
         const blob = new Blob([arr], { type: mime });
         const url = URL.createObjectURL(blob);
         setPreviewBlobUrl(url);
         return () => URL.revokeObjectURL(url);
       } catch(e) {
         setPreviewBlobUrl(docUrl);
       }
    } else {
       setPreviewBlobUrl(null);
    }
  }, [selectedDoc]);

  if (!worker) return null;

  const visaStatus = useMemo(() => {
    if (!worker.workPermitExpiry) return null;
    moment.loadPersian({ dialect: 'persian-modern' });
    const today = moment();
    const expiry = moment(worker.workPermitExpiry, 'jYYYY/jMM/jDD');
    const diffDays = expiry.diff(today, 'days');
    
    if (diffDays < 0) return { status: 'EXPIRED', text: 'منقضی شده!', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30' };
    if (diffDays <= 30) return { status: 'DANGER', text: `${diffDays} روز مانده`, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30' };
    if (diffDays <= 90) return { status: 'WARNING', text: `${diffDays} روز مانده`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30' };
    return { status: 'SAFE', text: `${diffDays} روز مانده`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' };
  }, [worker.workPermitExpiry]);

  // مدارکی که در لیست انتظار حذف نیستند
  const displayedDocs = (worker.documents || []).map((doc, idx) => ({
    ...doc,
    safeId: doc.id ? String(doc.id) : doc.fileUrl ? String(doc.fileUrl) : `legacy-doc-${idx}`
  })).filter(doc => !pendingDeleteIds.includes(doc.safeId));

  const toggleDocSelection = (safeId: string) => {
    setSelectedForDelete(prev => prev.includes(safeId) ? prev.filter(id => id !== safeId) : [...prev, safeId]);
  };

  // 💡 استفاده از سیستم پورتال کپسولی به جای toast مربعی برای حذف گروهی
  const handleBulkDelete = () => {
    if (selectedForDelete.length === 0) return;
    const idsToDelete = [...selectedForDelete];
    
    setUndoItems(prev => [...prev, { id: Date.now().toString(), docIds: idsToDelete, expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, ...idsToDelete]);
    setSelectedForDelete([]);
    setIsSelectionMode(false);
  };

  // 💡 استفاده از سیستم پورتال کپسولی به جای toast مربعی برای حذف تکی
  const handleDeleteSingleDoc = (e: React.MouseEvent, safeId: string) => {
    e.stopPropagation();
    
    setUndoItems(prev => [...prev, { id: Date.now().toString(), docIds: [safeId], expireAt: Date.now() + 5000 }]);
    setPendingDeleteIds(prev => [...prev, safeId]);
    
    if (selectedDoc && (selectedDoc.id || selectedDoc.url || selectedDoc.safeId) === safeId) {
       setSelectedDoc(null);
    }
  };

  const handleDownload = () => {
    if (!selectedDoc) return;
    const a = document.createElement('a');
    a.href = previewBlobUrl || selectedDoc.url;
    a.download = selectedDoc.title || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full flex flex-col gap-6 relative z-0">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-[2rem] p-5 relative overflow-hidden">
               <div className="flex items-center gap-3 mb-5 border-b border-slate-200 dark:border-slate-700/50 pb-4">
                 <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20"><FileBadge className="w-5 h-5 text-amber-500" /></div>
                 <h3 className="text-sm font-black text-slate-800 dark:text-white">پرونده حقوقی و مهاجرتی</h3>
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-slate-500 flex items-center gap-1.5"><Fingerprint className="w-4 h-4"/> کد ملی/پاسپورت:</span>
                    <span className="font-black text-slate-800 dark:text-white tracking-widest">{worker.nationalId || '---'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-slate-500 flex items-center gap-1.5"><Globe className="w-4 h-4"/> تابعیت:</span>
                    <span className="font-black text-slate-800 dark:text-white">{worker.nationality || '---'}</span>
                  </div>

                  {worker.nationality !== 'ایرانی' && (
                    <div className={`p-4 rounded-xl border flex flex-col gap-2 transition-colors duration-300 ${visaStatus?.bg || 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><CalendarClock className="w-4 h-4"/> انقضای پروانه کار:</span>
                        <span className="font-black text-slate-800 dark:text-white">{worker.workPermitExpiry || 'ثبت نشده'}</span>
                      </div>
                      {visaStatus && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                             <div className={`h-full rounded-full ${visaStatus.status === 'SAFE' ? 'bg-emerald-500 w-full' : visaStatus.status === 'WARNING' ? 'bg-amber-500 w-2/3' : 'bg-rose-500 w-1/3'}`} />
                          </div>
                          <span className={`text-[10px] font-black shrink-0 ${visaStatus.color}`}>{visaStatus.text}</span>
                        </div>
                      )}
                    </div>
                  )}
               </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-rose-200 dark:border-rose-900/50 shadow-sm rounded-[2rem] p-5">
               <div className="flex items-center gap-3 mb-5 border-b border-rose-100 dark:border-rose-900/50 pb-4">
                 <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20"><HeartPulse className="w-5 h-5 text-rose-500 animate-pulse" /></div>
                 <h3 className="text-sm font-black text-rose-900 dark:text-rose-400">اطلاعات پزشکی و اورژانس</h3>
               </div>

               <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-rose-500 to-red-500 rounded-2xl text-white shadow-lg shadow-rose-500/30 mb-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md"><PhoneCall className="w-6 h-6" /></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-rose-100">تماس اضطراری (SOS)</span>
                    <span className="text-sm font-black tracking-widest mt-0.5" dir="ltr">{worker.emergencyContactPhone || 'ثبت نشده'}</span>
                    <span className="text-xs font-bold text-rose-50 mt-1">{worker.emergencyContactName || '---'}</span>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3 mb-3">
                 <div className="p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-800/30 flex flex-col items-center justify-center gap-1">
                   <Syringe className="w-4 h-4 text-rose-500" />
                   <span className="text-[9px] font-bold text-slate-500">گروه خونی</span>
                   <span className="text-sm font-black text-rose-600 dark:text-rose-400" dir="ltr">{worker.bloodType || '؟'}</span>
                 </div>
                 <div className="p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-800/30 flex flex-col items-center justify-center gap-1">
                   <ShieldCheck className="w-4 h-4 text-emerald-500" />
                   <span className="text-[9px] font-bold text-slate-500">کد بیمه تامین</span>
                   <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{worker.insuranceCode ? 'دارد' : 'ندارد'}</span>
                 </div>
               </div>

               <div className="p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-800/30 text-xs">
                  <span className="font-bold text-slate-500 flex items-center gap-1.5 mb-1"><FileWarning className="w-4 h-4 text-rose-400"/> سوابق بیماری:</span>
                  <p className="font-black text-slate-700 dark:text-slate-300 pr-5 leading-relaxed">{worker.medicalNotes || 'سابقه خاصی ثبت نشده است.'}</p>
               </div>
            </div>

          </div>

          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-[2rem] p-5 flex flex-col max-h-[450px]">
               <div className="flex items-center justify-between mb-5 border-b border-slate-200 dark:border-slate-700/50 pb-4 shrink-0">
                 <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20"><AlertTriangle className="w-5 h-5 text-orange-500" /></div>
                   <h3 className="text-sm font-black text-slate-800 dark:text-white">تایم‌لاین حوادث و خسارات کارگاه (HSE)</h3>
                 </div>
                 <span className="bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 px-3 py-1 rounded-lg text-[10px] font-black border border-rose-200 dark:border-rose-800">{workerIncidents.length} حادثه</span>
               </div>

               <div className="flex-1 overflow-y-auto pr-2 relative glass-scroll">
                 {workerIncidents.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-full opacity-50 py-10">
                     <ShieldCheck className="w-16 h-16 text-emerald-500 mb-3" />
                     <p className="text-xs font-black text-slate-600 dark:text-slate-400">هیچ حادثه‌ای برای این نیرو ثبت نشده است.</p>
                   </div>
                 ) : (
                   <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-rose-500 before:to-transparent">
                     {workerIncidents.map((incident, idx) => (
                       <motion.div key={incident.id ? String(incident.id) : `inc-${idx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                         <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-rose-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                           <Activity className="w-4 h-4" />
                         </div>
                         <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-800/30 shadow-sm hover:shadow-md transition-shadow">
                           <div className="flex items-center justify-between mb-2">
                             <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 flex items-center gap-1"><CalendarClock className="w-3 h-3"/> {incident.date}</span>
                           </div>
                           <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{incident.incidentDescription}</p>
                           <div className="mt-3 pt-2 border-t border-rose-200 dark:border-rose-800/50 flex items-center gap-2">
                             <span className="text-[9px] bg-white/60 dark:bg-slate-800 px-2 py-1 rounded text-slate-500 border border-slate-200 dark:border-slate-700 font-bold">{incident.workType}</span>
                           </div>
                         </div>
                       </motion.div>
                     ))}
                   </div>
                 )}
               </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-[2rem] p-5 flex-1 flex flex-col">
               <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-slate-700/50 pb-4">
                 <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20"><FileText className="w-5 h-5 text-blue-500" /></div>
                   <h3 className="text-sm font-black text-slate-800 dark:text-white">گاوصندوق مدارک</h3>
                 </div>
                 
                 {displayedDocs.length > 0 && (
                   <div className="flex items-center gap-2">
                     {isSelectionMode ? (
                       <AnimatePresence>
                         {selectedForDelete.length > 0 && (
                           <motion.button key="btn-bulk-delete" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={handleBulkDelete} className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-[10px] font-black shadow-sm flex items-center gap-1 transition-colors">
                             <Trash2 className="w-3.5 h-3.5" /> حذف ({selectedForDelete.length})
                           </motion.button>
                         )}
                         <motion.button key="btn-cancel-selection" onClick={() => { setIsSelectionMode(false); setSelectedForDelete([]); }} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-full text-[10px] font-black transition-colors">
                           انصراف
                         </motion.button>
                       </AnimatePresence>
                     ) : (
                       <button onClick={() => setIsSelectionMode(true)} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40 rounded-full text-[10px] font-black border border-blue-200 dark:border-blue-800/50 flex items-center gap-1 transition-colors">
                         <CheckSquare className="w-3.5 h-3.5" /> انتخاب و حذف گروهی
                       </button>
                     )}
                   </div>
                 )}
               </div>
               
               <div className="flex-1 overflow-y-auto pr-2 glass-scroll">
                 {displayedDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl opacity-60 bg-slate-50/50 dark:bg-slate-800/50">
                      <FileText className="w-10 h-10 text-slate-400 mb-2" />
                      <span className="text-xs font-bold text-slate-500">هیچ مدرکی در گاوصندوق نیست</span>
                    </div>
                 ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {displayedDocs.map((doc) => {
                        const safeId = doc.safeId; 
                        const docUrl = doc.fileUrl || '';
                        const isLegacyBlob = docUrl.startsWith('blob:');
                        const isImage = doc.mimeType?.startsWith('image/') || docUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                        const isVideo = doc.mimeType?.startsWith('video/') || docUrl.match(/\.(mp4|mkv|webm)$/i);
                        const isSelected = selectedForDelete.includes(safeId);

                        return (
                          <div key={safeId} onClick={() => isSelectionMode ? toggleDocSelection(safeId) : setSelectedDoc({...doc, safeId})} className={`group border rounded-2xl flex flex-col overflow-hidden hover:shadow-lg transition-all cursor-pointer relative ${isSelected ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] bg-rose-50 dark:bg-rose-900/10' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50 hover:border-blue-400 dark:hover:border-blue-500'}`}>
                            
                            {isSelectionMode && (
                              <div className="absolute top-2 right-2 z-20">
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-500 text-transparent'}`}>
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            )}

                            {!isSelectionMode && (
                              <button onClick={(e) => handleDeleteSingleDoc(e, safeId)} className="absolute top-2 right-2 z-20 p-1.5 bg-rose-500/80 hover:bg-rose-600 text-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100" title="حذف سریع">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <div className="h-24 bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center relative overflow-hidden">
                              {(isImage || isVideo) && !isLegacyBlob ? (
                                <img src={docUrl} alt={doc.title} className={`w-full h-full object-cover transition-transform duration-500 ${isSelectionMode ? '' : 'group-hover:scale-110'}`} 
                                  onError={(e) => { 
                                    e.currentTarget.style.display = 'none'; 
                                    const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                                    if(sibling) sibling.style.display = 'block'; 
                                  }} 
                                />
                              ) : null}
                              
                              <FileText className={`w-8 h-8 transition-transform duration-500 ${isSelected ? 'text-rose-400' : 'text-blue-400'} ${((isImage || isVideo) && !isLegacyBlob) ? 'hidden' : ''} ${isSelectionMode ? '' : 'group-hover:scale-110'}`} />
                              
                              {!isSelectionMode && (
                                <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/30 transition-colors duration-300 flex items-center justify-center backdrop-blur-[1px] opacity-0 group-hover:opacity-100">
                                  <ExternalLink className="w-6 h-6 text-white drop-shadow-md" />
                                </div>
                              )}
                            </div>
                            <div className={`p-2.5 flex flex-col gap-0.5 z-10 ${isSelected ? 'bg-rose-100/50 dark:bg-rose-900/30' : 'bg-white dark:bg-slate-900'}`}>
                              <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate" dir="ltr" title={doc.title}>{doc.title}</span>
                              <span className="text-[8px] font-bold text-slate-500">{doc.uploadDate}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                 )}
               </div>
            </div>

          </div>
        </div>
      </motion.div>

      {/* 💡 پورتال صف نوتیفیکیشن‌های حذف گروهی/تکی (کپسولی کامل بدون مربع اضافه) */}
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm">
          <AnimatePresence>
            {undoItems.map(undo => (
              <motion.div key={undo.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="flex items-center justify-between gap-4 p-2 pr-3 bg-white dark:bg-slate-800 rounded-full shadow-2xl border border-slate-200 dark:border-slate-700 w-full pointer-events-auto" dir="rtl">
                <div className="flex items-center gap-3 relative z-10">
                  <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                     <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-md" viewBox="0 0 36 36">
                       <motion.circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-rose-500" strokeDasharray="100" initial={{ strokeDashoffset: 100 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 5, ease: "linear" }} strokeLinecap="round" />
                     </svg>
                     <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center relative z-10">
                       <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                     </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-800 dark:text-white">{undo.docIds.length > 1 ? `${undo.docIds.length} مدرک در حال حذف` : 'مدرک در حال حذف'}</span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">تا چند ثانیه دیگر پاک می‌شود...</span>
                  </div>
                </div>
                <button onClick={() => { setPendingDeleteIds(prev => prev.filter(id => !undo.docIds.includes(id))); setUndoItems(prev => prev.filter(u => u.id !== undo.id)); toast.success('عملیات لغو شد'); }} className="px-5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-black rounded-full transition-colors shrink-0 shadow-sm">
                  انصراف
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>, document.body
      )}

      {/* پاپ‌آپ سینماییِ نمایشگر */}
      {createPortal(
        <AnimatePresence>
          {selectedDoc && !isSelectionMode && (
            <motion.div 
              key="lightbox-container" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 sm:p-10" dir="rtl"
            >
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md cursor-zoom-out" onClick={() => setSelectedDoc(null)} />
              
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative w-full max-w-5xl h-[85vh] bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-700">
                
                <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-800/80 backdrop-blur-xl border-b border-slate-700 z-10 shrink-0 absolute top-0 left-0 right-0">
                   <div className="flex items-center gap-3">
                     <FileText className="w-5 h-5 text-blue-400" />
                     <div className="flex flex-col">
                       <span className="text-sm font-black text-white" dir="ltr">{selectedDoc.title || 'مدرک بدون نام'}</span>
                       <span className="text-[10px] font-bold text-slate-400">آپلود شده در: {selectedDoc.uploadDate || 'نامشخص'}</span>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-3">
                     <button onClick={handleDownload} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full text-xs font-black transition-colors shadow-lg shadow-indigo-500/20">
                       <Download className="w-4 h-4" /> ذخیره در سیستم
                     </button>
                     
                     <button onClick={(e) => { const id = selectedDoc.safeId || selectedDoc.id || selectedDoc.url; setSelectedDoc(null); handleDeleteSingleDoc(e, id); }} className="p-2.5 bg-slate-700 hover:bg-rose-500 text-white rounded-full transition-colors" title="حذف این مدرک"><Trash2 className="w-4 h-4" /></button>
                     <div className="w-px h-6 bg-slate-600 mx-1"></div>
                     <button onClick={() => setSelectedDoc(null)} className="p-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition-colors" title="بستن"><X className="w-4 h-4" /></button>
                   </div>
                </div>

                <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 pt-20 overflow-hidden relative">
                  {(() => {
                     const docUrl = selectedDoc.url || '';
                     const docType = selectedDoc.type || '';
                     const isImg = docType.startsWith('image/') || docUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                     const isVid = docType.startsWith('video/') || docUrl.match(/\.(mp4|mkv|webm)$/i);
                     const actualUrl = previewBlobUrl || docUrl;

                     if (!actualUrl || actualUrl.startsWith('blob:')) {
                        return (
                          <div className="text-rose-500 flex flex-col items-center gap-4 bg-slate-900 p-8 rounded-3xl border border-rose-500/30">
                            <ImageOff className="w-16 h-16 opacity-80"/>
                            <div className="text-center">
                              <h3 className="font-black text-lg text-rose-400 mb-1">فایل در دسترس نیست</h3>
                              <p className="text-xs font-bold text-slate-400">این یک فایل تست قدیمی است و از حافظه سیستم پاک شده. لطفاً آن را حذف کنید.</p>
                            </div>
                          </div>
                        );
                     }

                     if (isVid) {
                       return <video src={actualUrl} controls autoPlay className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />;
                     } else if (isImg) {
                       return <img src={actualUrl} alt={selectedDoc.title} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />;
                     } else {
                       return <iframe src={actualUrl} className="w-full h-full bg-white rounded-xl" title={selectedDoc.title} />;
                     }
                  })()}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}