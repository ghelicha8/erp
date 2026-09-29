import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Phone, MapPin, Camera, Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { useProcurementStore } from '../../../../store/procurementStore';
import { SECTION_CONFIG } from '../shared/vendorTypes';

interface MiscVendorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editVendorId?: string | null;
}

export default function MiscVendorFormModal({ isOpen, onClose, editVendorId }: MiscVendorFormModalProps) {
  const addVendor = useProcurementStore(s => s.addVendor);
  const updateVendor = useProcurementStore(s => s.updateVendor);
  const vendors = useProcurementStore(s => s.vendors);
  const cfg = SECTION_CONFIG.MISC;

  const [name, setName] = useState('');
  const [phone1, setPhone1] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  useEffect(() => {
    if (!isOpen) return;
    if (editVendorId) {
      const v = vendors.find(x => x.id === editVendorId);
      if (v) {
        setName(v.name || '');
        setPhone1(v.phones?.[0] || '');
        setAddress(v.address || '');
        setPhoto(v.photo || '');
        setStatus(v.status || 'ACTIVE');
        return;
      }
    }
    setName(''); setPhone1(''); setAddress(''); setPhoto(''); setStatus('ACTIVE');
  }, [isOpen, editVendorId, vendors]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!name.trim()) return toast.error('نام شرکت / کارخانه الزامی است.');
    if (!phone1.trim()) return toast.error('شماره تلفن اول الزامی است.');

    const data = {
      section: 'MISC' as const,
      name: name.trim(),
      phones: [phone1.trim()],
      address: address.trim(),
      photo,
      status,
      isPinned: editVendorId ? (vendors.find(x => x.id === editVendorId)?.isPinned || false) : false,
    };

    if (editVendorId) {
      updateVendor(editVendorId, data);
      toast.success('پروفایل ویرایش شد.');
    } else {
      addVendor(data);
      toast.success(`${cfg.singular} «${name.trim()}» ثبت شد.`);
    }
    onClose();
  };

  return (
    <>{typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 rounded-[2rem] shadow-2xl overflow-hidden my-8"
          >
            <div className={`flex items-center justify-between px-6 py-5 bg-gradient-to-r ${cfg.gradient} bg-opacity-10 border-b border-slate-200 dark:border-slate-700`}>
              <div className="flex items-center gap-3">
                <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 3 }} className={`p-2.5 rounded-xl bg-gradient-to-br ${cfg.gradient} text-white shadow-lg`}>
                  <Package className="w-5 h-5" />
                </motion.div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">{editVendorId ? `ویرایش ${cfg.singular}` : `ثبت ${cfg.singular} جدید`}</h3>
                  <p className="text-[11px] font-bold text-slate-500">{cfg.label}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {photo ? (
                    <img src={photo} alt="پروفایل" className="w-20 h-20 rounded-2xl object-cover shadow-lg border-2 border-white dark:border-slate-700" />
                  ) : (
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white shadow-lg`}>
                      <Building2 className="w-8 h-8" />
                    </div>
                  )}
                  <label className="absolute -bottom-2 -left-2 p-2 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4 text-indigo-500" />
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><Building2 className="w-4 h-4 text-indigo-500" /> نام تامین‌کننده *</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: آقای محمدی" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 dark:text-white placeholder:text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><Phone className="w-4 h-4 text-emerald-500" /> شماره تلفن *</label>
                  <input value={phone1} onChange={(e) => setPhone1(e.target.value)} placeholder="0912..." dir="ltr" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 dark:text-white placeholder:text-slate-400 text-center tracking-widest" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-rose-500" /> آدرس</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="آدرس دفتر / کارخانه..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none text-slate-800 dark:text-white placeholder:text-slate-400" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-black text-slate-600 dark:text-slate-300">وضعیت همکاری</span>
                <div className="flex bg-slate-200/70 dark:bg-slate-700/70 p-1 rounded-xl">
                  <button onClick={() => setStatus('ACTIVE')} className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${status === 'ACTIVE' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500'}`}>فعال</button>
                  <button onClick={() => setStatus('INACTIVE')} className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${status === 'INACTIVE' ? 'bg-slate-500 text-white shadow' : 'text-slate-500'}`}>غیرفعال</button>
                </div>
              </div>

              <button onClick={handleSubmit} className={`w-full py-4 rounded-2xl font-black text-white bg-gradient-to-r ${cfg.gradient} ${cfg.gradientHover} ${cfg.glowShadow} transition-all active:scale-[0.98]`}>
                {editVendorId ? 'ثبت ویرایش' : `ثبت ${cfg.singular}`}
              </button>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>, document.body
    )}</>
  );
}
