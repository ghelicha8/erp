import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Building2, Phone, CreditCard, 
  MapPin, Camera, Save, Wallet
} from 'lucide-react';
import { toast } from 'sonner';

import { useClientStore } from '../../../store/clientStore';
import type { Client } from '../../../store/clientStore';

type ClientFormType = 'PERSON' | 'COMPANY';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null; // 💡 پراپ جدید برای حالت ویرایش
}

export default function ClientFormModal({ isOpen, onClose, clientToEdit }: ClientFormModalProps) {
  const { addClient, updateClient } = useClientStore();
  
  const [type, setType] = useState<ClientFormType>('PERSON');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [address, setAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 💡 اگر در حالت ویرایش هستیم، اطلاعات فرم را با دیتای کارفرما پر کن
  useEffect(() => {
    if (clientToEdit && isOpen) {
      setType(clientToEdit.type);
      setName(clientToEdit.name);
      setLastName(clientToEdit.lastName || '');
      setPhone(clientToEdit.phone);
      setNationalId(clientToEdit.nationalId || '');
      setAddress(clientToEdit.address || '');
      setWalletBalance(clientToEdit.walletBalance.toString());
      setAvatar(clientToEdit.avatar || null);
    } else if (!clientToEdit && isOpen) {
      // ریست کردن فرم برای ثبت جدید
      setType('PERSON'); setName(''); setLastName(''); setPhone(''); 
      setNationalId(''); setAddress(''); setWalletBalance(''); setAvatar(null);
    }
  }, [clientToEdit, isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('لطفاً نام و شماره تماس را وارد کنید!');
      return;
    }

    const clientData = {
      type,
      name,
      lastName: type === 'PERSON' ? lastName : undefined,
      phone,
      nationalId,
      address,
      walletBalance: Number(walletBalance.toString().replace(/,/g, '')) || 0,
      avatar: avatar || undefined,
    };

    if (clientToEdit) {
      updateClient(clientToEdit.id, clientData);
      toast.success('اطلاعات با موفقیت به‌روزرسانی شد!');
    } else {
      addClient(clientData);
      toast.success('شخص جدید با موفقیت ثبت شد!');
    }
    
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6" dir="rtl">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto modal-scrollbar bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-2 border-white/60 dark:border-slate-700 shadow-[0_20px_60px_rgba(0,0,0,0.2)] rounded-[2.5rem] p-6 sm:p-8"
          >
            <button onClick={onClose} className="absolute top-6 left-6 p-2 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 hover:bg-rose-100 hover:text-rose-500 transition-colors z-10">
              <X className="w-5 h-5 text-slate-500" />
            </button>

            <div className="flex flex-col items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
                {clientToEdit ? 'ویرایش اطلاعات شخص' : 'ثبت شخص جدید'}
              </h2>
              <p className="text-sm font-bold text-slate-500">اطلاعات مشتری، کارفرما یا شرکت را وارد کنید</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="flex justify-center mb-8">
                <div onClick={() => fileInputRef.current?.click()} className="relative w-28 h-28 rounded-[2rem] border-2 border-dashed border-indigo-300 dark:border-indigo-500/50 flex items-center justify-center bg-indigo-50/50 dark:bg-indigo-900/20 cursor-pointer group hover:border-indigo-500 transition-all shadow-inner overflow-hidden">
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                  {avatar ? (
                    <img src={avatar} alt="Preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="flex flex-col items-center text-indigo-400 group-hover:text-indigo-600 transition-colors">
                      <Camera className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-bold">آپلود عکس/لوگو</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-colors" />
                </div>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                <button type="button" onClick={() => setType('PERSON')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${type === 'PERSON' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                  <User className="w-4 h-4" /> شخص حقیقی
                </button>
                <button type="button" onClick={() => setType('COMPANY')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${type === 'COMPANY' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Building2 className="w-4 h-4" /> شرکت / حقوقی
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">{type === 'PERSON' ? 'نام' : 'نام شرکت / سازمان'}</label>
                  <div className="relative group h-12 rounded-xl bg-white/50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all flex items-center px-4">
                    <User className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 shrink-0" />
                    <input value={name} onChange={e => setName(e.target.value)} required placeholder={type === 'PERSON' ? 'مثال: علی' : 'مثال: شرکت عمران سازه'} className="w-full h-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white px-2" />
                  </div>
                </div>

                <AnimatePresence>
                  {type === 'PERSON' && (
                    <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="space-y-1.5 overflow-hidden">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">نام خانوادگی <span className="text-[10px] font-normal text-slate-400">(اختیاری)</span></label>
                      <div className="relative group h-12 rounded-xl bg-white/50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all flex items-center px-4">
                        <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="مثال: محمدی" className="w-full h-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white px-2" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">شماره تماس (الزامی)</label>
                  <div className="relative group h-12 rounded-xl bg-white/50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all flex items-center px-4">
                    <Phone className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 shrink-0" />
                    <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="09123456789" dir="ltr" className="w-full h-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white px-2 text-right" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">کد ملی / شناسه ملی <span className="text-[10px] font-normal text-slate-400">(اختیاری)</span></label>
                  <div className="relative group h-12 rounded-xl bg-white/50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all flex items-center px-4">
                    <CreditCard className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 shrink-0" />
                    <input value={nationalId} onChange={e => setNationalId(e.target.value)} placeholder="1234567890" dir="ltr" className="w-full h-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white px-2 text-right" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">آدرس دقیق <span className="text-[10px] font-normal text-slate-400">(اختیاری)</span></label>
                <div className="relative group rounded-xl bg-white/50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all flex px-4 py-3">
                  <MapPin className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 shrink-0 mt-0.5" />
                  <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="تهران، خیابان..." rows={2} className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white px-2 resize-none" />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    <div>
                      <span className="text-sm font-black text-slate-700 dark:text-slate-200 block">موجودی اولیه کیف پول (تومان)</span>
                      <span className="text-[10px] font-bold text-slate-500">موجودی آزاد شخص از قبل در سیستم <span className="text-slate-400">(اختیاری)</span></span>
                    </div>
                  </div>
                  <input value={walletBalance} onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setWalletBalance(val ? Number(val).toLocaleString() : '');
                  }} placeholder="0" dir="ltr" className="w-32 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-center font-black text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500" />
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-black text-lg shadow-[0_10px_25px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 relative overflow-hidden group"
              >
                <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                <Save className="w-5 h-5 relative z-10" /> <span className="relative z-10">{clientToEdit ? 'ثبت تغییرات' : 'ذخیره اطلاعات شخص'}</span>
              </motion.button>
              
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}