import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Wallet, ShoppingCart, Truck, Activity, Edit2, FileDown, FileUp,
  Phone, MapPin, Scale, Receipt, DollarSign,
} from 'lucide-react';

import { useProcurementStore } from '../../../../store/procurementStore';
import { useFinanceStore } from '../../../../store/financeStore';
import { usePurchaseStore } from '../../../../store/purchaseStore';
import { useLogisticsStore } from '../../../../store/logisticsStore';

import { SECTION_CONFIG } from '../shared/vendorTypes';
import VendorPaymentsTab from '../shared/VendorPaymentsTab';
import VendorPurchasesTab from '../shared/VendorPurchasesTab';
import VendorLogisticsTab from '../shared/VendorLogisticsTab';
import VendorReportsTab from '../shared/VendorReportsTab';
import VendorPaymentModal, { type PaymentPrefill } from '../shared/VendorPaymentModal';
import RepairShopFormModal from './RepairShopFormModal';

import AdvancedPurchaseModal from '../../../projects/components/AdvancedPurchaseModal';
import NewLogisticsModal from '../../../projects/components/NewLogisticsModal';
import ExportBuilder from '../../../../components/shared/ExportBuilder';
import ImportBuilder from '../../../../components/shared/ImportBuilder';

const VENDOR_TABS = [
  { id: 'payments', label: 'تاریخچه پرداختی‌ها', icon: Wallet, color: 'text-emerald-500', activeClass: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'purchases', label: 'تاریخچه خرید', icon: ShoppingCart, color: 'text-rose-500', activeClass: 'text-rose-600 dark:text-rose-400' },
  { id: 'logistics', label: 'لجستیک', icon: Truck, color: 'text-amber-500', activeClass: 'text-amber-600 dark:text-amber-400' },
  { id: 'reports', label: 'گزارشات', icon: Activity, color: 'text-indigo-500', activeClass: 'text-indigo-600 dark:text-indigo-400' },
];

interface RepairShopProfileProps {
  vendorId: string;
  onBack: () => void;
}

export default function RepairShopProfile({ vendorId, onBack }: RepairShopProfileProps) {
  const cfg = SECTION_CONFIG.REPAIR_SHOPS;
  const SectionIcon = cfg.icon;

  const vendor = useProcurementStore(s => s.vendors.find(v => v.id === vendorId));
  const allTransactions = useFinanceStore(s => s.transactions);
  const allPurchases = usePurchaseStore(s => s.purchases);
  const allLogs = useLogisticsStore(s => s.logs);

  const [activeTab, setActiveTab] = useState('payments');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const [paymentPrefill, setPaymentPrefill] = useState<PaymentPrefill | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const openPaymentModal = (prefill: PaymentPrefill | null = null) => {
    setEditTxId(null);
    setPaymentPrefill(prefill);
    setIsPaymentModalOpen(true);
  };
  const openEditPayment = (txId: string) => {
    setEditTxId(txId);
    setPaymentPrefill(null);
    setIsPaymentModalOpen(true);
  };

  const openPurchaseModal = () => {
    document.dispatchEvent(new CustomEvent('open-new-purchase-modal', {
      detail: { preSelectedVendorName: vendor?.name || '' }
    }));
  };
  const openLogisticsModal = () => {
    document.dispatchEvent(new CustomEvent('open-new-logistics-modal', {
      detail: { vendorId, vendorName: vendor?.name || '', source: 'EXTERNAL' }
    }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (activeTab === 'payments') openPaymentModal();
        if (activeTab === 'purchases') openPurchaseModal();
        if (activeTab === 'logistics') openLogisticsModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, vendorId]);

  const stats = useMemo(() => {
    const purchases = allPurchases.filter((p: any) => p.vendor === vendor?.name);
    const txs = allTransactions.filter(t => t.referenceId === vendorId && t.direction === 'OUT');
    const logs = allLogs.filter(l => l.vendorId === vendorId);
    const totalBilled = purchases.reduce((s: number, p: any) => s + (p.billedCost || p.internalCost || 0), 0);
    const totalPaid = txs.reduce((s, t) => s + (t.amount || 0), 0);
    const totalLogistics = logs.reduce((s, l) => s + (l.internalCost || 0), 0);
    return {
      totalBilled, totalPaid, totalLogistics,
      debt: Math.max(0, totalBilled - totalPaid),
      purchaseCount: purchases.length,
    };
  }, [allPurchases, allTransactions, allLogs, vendorId, vendor]);

  if (!vendor) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-slate-500 font-bold">پروفایل یافت نشد.</p>
        <button onClick={onBack} className="px-6 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 font-black text-sm">بازگشت</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="w-full flex flex-col gap-6 pb-24 h-full relative">

      <div className="sticky top-4 z-[100] flex flex-col lg:flex-row items-center justify-between gap-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/80 dark:border-slate-700/80 shadow-[0_15px_40px_rgba(0,0,0,0.08)] rounded-[2.5rem] px-6 py-5">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <button onClick={onBack} className="flex items-center justify-center p-3.5 rounded-[1.25rem] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-inner border border-slate-200 dark:border-slate-600 transition-all shrink-0 group" title="بازگشت به لیست">
            <ArrowRight className="w-6 h-6 text-slate-700 dark:text-slate-300 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="relative shrink-0 ml-1">
            {vendor.photo ? (
              <img src={vendor.photo} alt={vendor.name} className="w-[72px] h-[72px] rounded-2xl object-cover shadow-lg border-2 border-white dark:border-slate-700" />
            ) : (
              <div className={`w-[72px] h-[72px] rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white shadow-lg border-2 border-white/80 dark:border-slate-700`}>
                <SectionIcon className="w-8 h-8" />
              </div>
            )}
            <div className={`absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 rounded-lg px-2 py-0.5 shadow-md border border-slate-100 dark:border-slate-700 flex items-center gap-1 text-[10px] font-black ${vendor.status === 'ACTIVE' ? 'text-emerald-500' : 'text-slate-500'}`}>
              {vendor.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h2 className="text-xl font-black text-slate-800 dark:text-white drop-shadow-sm">{vendor.name}</h2>
              <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button onClick={() => setIsEditModalOpen(true)} title="ویرایش پروفایل" className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg transition-colors text-indigo-500">
                  <Edit2 className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
                <button onClick={() => setIsExportModalOpen(true)} title="گزارش‌گیری (Export)" className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-lg transition-colors text-emerald-500">
                  <FileDown className="w-4 h-4" />
                </button>
                <button onClick={() => setIsImportModalOpen(true)} title="ورودی اطلاعات (Import)" className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors text-blue-500">
                  <FileUp className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {(vendor.phones || []).map((ph, i) => (
                <a key={i} href={`tel:${ph}`} onClick={(e) => e.stopPropagation()} className="text-[11px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-400 transition-colors">
                  <Phone className="w-3 h-3 text-emerald-500" /><span dir="ltr" className="tracking-widest">{ph}</span>
                </a>
              ))}
              {vendor.address && (
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 max-w-[280px]">
                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" /><span className="truncate">{vendor.address}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto justify-end">
          <AnimatePresence mode="wait">
            {activeTab === 'payments' && (
              <motion.button
                key="btn-payments"
                initial={{ opacity: 0, scale: 0.9, width: 0 }} animate={{ opacity: 1, scale: 1, width: 'auto' }} exit={{ opacity: 0, scale: 0.9, width: 0 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => openPaymentModal()}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2.5 relative overflow-hidden border border-emerald-400/50"
              >
                <motion.div animate={{ y: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
                  <DollarSign className="w-5 h-5" />
                </motion.div>
                <span className="text-sm whitespace-nowrap">ثبت پرداخت (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'purchases' && (
              <motion.button
                key="btn-purchases"
                initial={{ opacity: 0, scale: 0.9, width: 0 }} animate={{ opacity: 1, scale: 1, width: 'auto' }} exit={{ opacity: 0, scale: 0.9, width: 0 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={openPurchaseModal}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(244,63,94,0.35)] flex items-center justify-center gap-2.5 relative overflow-hidden border border-rose-400/50"
              >
                <motion.div animate={{ x: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 1 }}>
                  <ShoppingCart className="w-5 h-5" />
                </motion.div>
                <span className="text-sm whitespace-nowrap">ثبت خرید (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'logistics' && (
              <motion.button
                key="btn-logistics"
                initial={{ opacity: 0, scale: 0.9, width: 0 }} animate={{ opacity: 1, scale: 1, width: 'auto' }} exit={{ opacity: 0, scale: 0.9, width: 0 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={openLogisticsModal}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2.5 relative overflow-hidden border border-amber-400/50"
              >
                <motion.div animate={{ x: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                  <Truck className="w-5 h-5" />
                </motion.div>
                <span className="text-sm whitespace-nowrap">ثبت سرویس (Ctrl+N)</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full relative z-[80]">
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-rose-200/50 dark:border-rose-900/50 p-5 flex flex-col justify-between min-h-[120px] shadow-[0_8px_30px_rgba(244,63,94,0.05)]">
          <div className="flex justify-between items-center w-full mb-3">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">مجموع خریدها</span>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-500/20 dark:to-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-500/30 shadow-inner"><Receipt className="w-5 h-5" /></div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-rose-600 dark:text-rose-400 text-left font-mono" dir="ltr">{stats.totalBilled.toLocaleString('fa-IR')}</div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-emerald-200/50 dark:border-emerald-900/50 p-5 flex flex-col justify-between min-h-[120px] shadow-[0_8px_30px_rgba(16,185,129,0.05)]">
          <div className="flex justify-between items-center w-full mb-3">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">مجموع پرداختی‌ها</span>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/20 dark:to-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/30 shadow-inner"><Wallet className="w-5 h-5" /></div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 text-left font-mono" dir="ltr">{stats.totalPaid.toLocaleString('fa-IR')}</div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-indigo-200/50 dark:border-indigo-900/50 p-5 flex flex-col justify-between min-h-[120px] shadow-[0_8px_30px_rgba(99,102,241,0.05)]">
          <div className="flex justify-between items-center w-full mb-3">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">هزینه لجستیک</span>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-500/20 dark:to-indigo-500/10 text-indigo-600 border border-indigo-200 dark:border-indigo-500/30 shadow-inner"><Truck className="w-5 h-5" /></div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-indigo-600 dark:text-indigo-400 text-left font-mono" dir="ltr">{stats.totalLogistics.toLocaleString('fa-IR')}</div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-amber-200/50 dark:border-amber-900/50 p-5 flex flex-col justify-between min-h-[120px] shadow-[0_8px_30px_rgba(245,158,11,0.05)]">
          <div className="flex justify-between items-center w-full mb-3">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">مانده بدهی</span>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-500/30 shadow-inner"><Scale className="w-5 h-5" /></div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-amber-600 dark:text-amber-400 text-left font-mono" dir="ltr">{stats.debt.toLocaleString('fa-IR')}</div>
        </div>
      </div>

      <div className="w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-[1.5rem] p-2 z-[90] sticky top-[130px] overflow-x-auto glass-scroll flex items-center gap-2 mt-4 transition-all">
        {VENDOR_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-colors duration-300 shrink-0 ${
                isActive
                  ? 'text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabVendorIndicator"
                  transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
                  className="absolute inset-0 bg-white/90 dark:bg-slate-700/90 backdrop-blur-md rounded-xl border border-white dark:border-slate-500 shadow-[0_6px_12px_rgba(0,0,0,0.08),inset_0_2px_4px_rgba(255,255,255,0.9)] dark:shadow-[0_6px_12px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)] z-0"
                />
              )}
              <Icon className={`w-4 h-4 relative z-10 transition-colors duration-300 ${isActive ? tab.activeClass : tab.color}`} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-full flex-1 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 shadow-xl rounded-[2.5rem] p-6 sm:p-8 z-[70] relative min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'payments' && (
            <motion.div key="tab-payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: 'easeOut' }} className="w-full h-full">
              <VendorPaymentsTab vendorId={vendorId} vendorName={vendor.name} onEditPayment={openEditPayment} />
            </motion.div>
          )}
          {activeTab === 'purchases' && (
            <motion.div key="tab-purchases" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: 'easeOut' }} className="w-full h-full">
              <VendorPurchasesTab vendorName={vendor.name} onPayPurchase={(prefill) => openPaymentModal(prefill)} />
            </motion.div>
          )}
          {activeTab === 'logistics' && (
            <motion.div key="tab-logistics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: 'easeOut' }} className="w-full h-full">
              <VendorLogisticsTab vendorId={vendorId} vendorName={vendor.name} />
            </motion.div>
          )}
          {activeTab === 'reports' && (
            <motion.div key="tab-reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: 'easeOut' }} className="w-full h-full">
              <VendorReportsTab vendorId={vendorId} vendorName={vendor.name} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RepairShopFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} editVendorId={vendorId} />
      <VendorPaymentModal vendorId={vendorId} vendorName={vendor.name} isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); setEditTxId(null); setPaymentPrefill(null); }} editTxId={editTxId} prefill={paymentPrefill} />

      <AdvancedPurchaseModal />
      <NewLogisticsModal />

      <AnimatePresence>
        {isExportModalOpen && <ExportBuilder context="GLOBAL" onClose={() => setIsExportModalOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {isImportModalOpen && <ImportBuilder context="GLOBAL" onClose={() => setIsImportModalOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
