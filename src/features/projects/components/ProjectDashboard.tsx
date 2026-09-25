import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, TrendingUp, Wallet, 
  Briefcase, HardHat, Banknote, 
  Layers, Images, Edit3, Package, FileText, 
  ShoppingCart, Truck, Notebook, Calculator,
  TrendingDown, PieChart, X,
  FileDown, FileUp,
  Receipt, Archive 
} from 'lucide-react';

import { useProjectStore } from '../store/projectStore';
import { useFinanceStore } from '../../../store/financeStore';
import { useClientStore } from '../../../store/clientStore';
import { usePurchaseStore } from '../../../store/purchaseStore';
import { useLaborStore } from '../../../store/laborStore';       
import { useLogisticsStore } from '../../../store/logisticsStore'; 
import type { Transaction } from '../../../store/financeStore';

import TransactionTab from './tabs/TransactionTab';
import PhaseManagementTab from './tabs/PhaseManagementTab';
import InventoryTab from './tabs/InventoryTab';
import LaborTab from './tabs/LaborTab';
import NotesTab from './tabs/NotesTab';
import PurchasesTab from './tabs/PurchasesTab';
import LogisticsTab from './tabs/LogisticsTab';
import ReportsTab from './tabs/ReportsTab'; 

import PettyCashTab from './tabs/PettyCashTab';
import ArchiveTab from './tabs/ArchiveTab';
import InvoiceTab from './tabs/InvoiceTab';

import NewTransactionModal from './NewTransactionModal';
import NewLaborModal from './NewLaborModal';
import NewProjectModal from './NewProjectModal';
import AdvancedPurchaseModal from './AdvancedPurchaseModal';
// 💡 مودال لجستیک اینجا اضافه شد
import NewLogisticsModal from './NewLogisticsModal';

import GlassSelect from '../../../components/ui/GlassSelect'; 
import InvoiceBuilder from './InvoiceBuilder'; 

// 💡 آدرس‌ها به پوشه shared تنظیم شد
import ImportBuilder from '../../../components/shared/ImportBuilder';
import ExportBuilder from '../../../components/shared/ExportBuilder';


interface ProjectDashboardProps {
  projectId: string;
  onBack: () => void;
}

const safeNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleanString = String(val).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/,/g, '').replace(/[^0-9.-]+/g, ""); 
  const parsed = Number(cleanString);
  return isNaN(parsed) ? 0 : parsed;
};

export default function ProjectDashboard({ projectId, onBack }: ProjectDashboardProps) {
  const allProjects = useProjectStore((state) => state.projects);
  const project = useMemo(() => allProjects.find(p => p.id === projectId), [allProjects, projectId]);
  
  const allTransactions = useFinanceStore((state) => state.transactions);
  const allClients = useClientStore((state) => state.clients);
  
  const allPurchases = usePurchaseStore((state) => state.purchases);
  const allLaborLogs = useLaborStore((state) => state.logs);
  const allLogisticsLogs = useLogisticsStore((state) => state.logs);

  const clientName = useMemo(() => {
    if (!project?.clientId) return 'نامشخص';
    const client = allClients.find(c => c.id === project.clientId);
    return client ? `${client.name} ${client.lastName || ''}`.trim() : project.clientId;
  }, [allClients, project?.clientId]);

  const [activeTab, setActiveTab] = useState<string>('transactions');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editTransactionData, setEditTransactionData] = useState<Transaction | null>(null);
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState('ALL');
  
  const [isInvoiceBuilderOpen, setIsInvoiceBuilderOpen] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState<string | undefined>(undefined);
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (activeTab === 'purchases') document.dispatchEvent(new CustomEvent('open-new-purchase-modal'));
        else if (activeTab === 'transport') document.dispatchEvent(new CustomEvent('open-new-logistics-modal'));
        else if (activeTab === 'labor') setIsLaborModalOpen(true);
        else if (activeTab === 'notes') document.dispatchEvent(new CustomEvent('open-new-note-modal'));
        else if (activeTab === 'pettycash') document.dispatchEvent(new CustomEvent('open-new-pettycash-modal')); 
        else if (activeTab === 'invoice') setIsInvoiceBuilderOpen(true);
        // 💡 کلید میانبر فازها هم به این قسمت اضافه شد
        else if (activeTab === 'phases') document.dispatchEvent(new CustomEvent('open-new-phase-modal'));
        else if (activeTab === 'transactions') { setEditTransactionData(null); setIsTransactionModalOpen(true); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  useEffect(() => {
    const handleEditTransaction = (e: any) => { setEditTransactionData(e.detail); setIsTransactionModalOpen(true); };
    const handleNewTransaction = (e: any) => { setEditTransactionData(e.detail || null); setIsTransactionModalOpen(true); };
    const handleEditInvoice = (e: any) => { setEditInvoiceId(e.detail); setIsInvoiceBuilderOpen(true); };

    document.addEventListener('open-edit-transaction-modal', handleEditTransaction);
    document.addEventListener('open-new-transaction-modal', handleNewTransaction);
    document.addEventListener('open-edit-invoice-modal', handleEditInvoice);
    
    return () => {
      document.removeEventListener('open-edit-transaction-modal', handleEditTransaction);
      document.removeEventListener('open-new-transaction-modal', handleNewTransaction);
      document.removeEventListener('open-edit-invoice-modal', handleEditInvoice);
    };
  }, []);

  const stats = useMemo(() => {
    if (!project) return { totalReceivedAll: 0, totalReceivedCleared: 0, costSum: 0, contractValue: 0, debt: 0 };

    let totalAll = 0;
    let totalCleared = 0;
    allTransactions.filter(t => t.direction === 'IN').forEach(t => {
      let allocatedAmount = 0;
      const projAlloc = t.allocations?.find(a => a.projectId === projectId);
      if (projAlloc) {
        allocatedAmount = projAlloc.amount || 0;
      } else if ((!t.allocations || t.allocations.length === 0) && t.referenceId === projectId) {
        allocatedAmount = t.amount || 0;
      }
      if (allocatedAmount > 0) {
        totalAll += allocatedAmount;
        const isCashed = t.type === 'CASH' || (t.type === 'CHEQUE' && ['CASHED','EXCHANGED','CASH_SETTLED'].includes(t.chequeDetails?.status || ''));
        if (isCashed) totalCleared += allocatedAmount;
      }
    });

    let costSum = 0;
    
    const projectPurchases = allPurchases.filter(p => p.projectId === projectId);
    projectPurchases.forEach((p:any) => {
      costSum += safeNum(p.billedCost) || safeNum(p.internalCost) || safeNum(p.totalPrice) || safeNum(p.totalCost) || safeNum(p.amount) || 0;
    });
    
    const projectLabor = allLaborLogs.filter(l => l.projectId === projectId);
    projectLabor.forEach((l:any) => {
      costSum += safeNum(l.billedCost) || safeNum(l.internalCost) || safeNum(l.totalWage) || safeNum(l.salary) || safeNum(l.totalPrice) || safeNum(l.amount) || 0;
    });

    const projectLogistics = allLogisticsLogs.filter(l => l.projectId === projectId);
    projectLogistics.forEach((l:any) => {
      costSum += safeNum(l.billedCost) || safeNum(l.internalCost) || safeNum(l.totalCost) || safeNum(l.fee) || safeNum(l.amount) || 0;
    });

    const phases = project.phases || [];
    const targetPhases = selectedPhaseFilter === 'ALL' ? phases : phases.filter((p: any) => p.id === selectedPhaseFilter);
    const hasContract = phases.some((p:any) => ['CONTRAT', 'FIXED', 'METRI', 'METRE', 'PERCENTAGE', 'COST_ONLY'].includes(p.contractType));

    let contractValue = 0;
    if (hasContract) {
      contractValue = targetPhases.reduce((acc: number, phase: any) => {
        if (phase.contractType === 'METRE' || phase.contractType === 'METRI') {
          const area = phase.dimensions?.reduce((sum: number, d: any) => sum + safeNum(d.area), 0) || safeNum(phase.area) || 0;
          return acc + Math.floor((area * safeNum(phase.unitPrice)) / 10);
        }
        if (phase.contractType === 'FIXED' || phase.contractType === 'CONTRAT') {
          return acc + Math.floor(safeNum(phase.fixedPrice) / 10);
        }
        if (phase.contractType === 'PERCENTAGE') {
          return acc + costSum + Math.floor((costSum * safeNum(phase.contractorPercentage)) / 100);
        }
        if (phase.contractType === 'COST_ONLY') {
          return acc + costSum;
        }
        return acc;
      }, 0);
    } else {
      contractValue = costSum; 
    }

    return { 
      costSum, 
      contractValue, 
      totalReceivedAll: totalAll, 
      totalReceivedCleared: totalCleared,
      debt: contractValue - totalCleared 
    };
  }, [allTransactions, project, projectId, selectedPhaseFilter, allPurchases, allLaborLogs, allLogisticsLogs]);

  const phases = project?.phases || [];
  const phaseOptions = useMemo(() => [{ value: 'ALL', label: 'تمامی فازها' }, ...phases.map((p: any) => ({ value: p.id, label: p.name }))], [phases]);

  const isDebtor = stats.debt >= 0; 
  const debtTitle = isDebtor ? `مانده طلب از کارفرما (${selectedPhaseFilter === 'ALL' ? 'کل پروژه' : 'فاز'})` : `پیش‌دریافت (بستانکار)`;
  const debtColor = isDebtor ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400';

  const kpiCards = [
    { title: `ارزش قرارداد (مبلغ قابل پرداخت)`, value: stats.contractValue, color: 'text-slate-800 dark:text-slate-200', bg: 'from-slate-500/10 to-slate-500/5', icon: Layers },
    { title: 'هزینه‌های واقعی کارگاه (خرید+نیرو+لجستیک)', value: stats.costSum, color: 'text-amber-600 dark:text-amber-400', bg: 'from-amber-500/10 to-amber-500/5', icon: TrendingDown },
    { title: 'دریافتی (کل چک‌ها + نقدی)', value: stats.totalReceivedAll, color: 'text-blue-500 dark:text-blue-400', bg: 'from-blue-500/10 to-blue-500/5', icon: Wallet },
    { title: 'دریافتی (فقط پاس‌شده + نقدی)', value: stats.totalReceivedCleared, color: 'text-emerald-500 dark:text-emerald-400', bg: 'from-emerald-500/10 to-emerald-500/5', icon: Banknote },
    { title: debtTitle, value: Math.abs(stats.debt), color: debtColor, bg: isDebtor ? 'from-indigo-500/10 to-indigo-500/5' : 'from-rose-500/10 to-rose-500/5', icon: Calculator, isDebt: true },
  ];

  if (!project) return null;

  const TABS = [
    { id: 'transactions', label: 'تراکنش‌ها', icon: Banknote, color: 'text-emerald-500', activeClass: 'text-emerald-700 dark:text-emerald-400' },
    { id: 'pettycash', label: 'تنخواه کارگاه', icon: Receipt, color: 'text-rose-500', activeClass: 'text-rose-700 dark:text-rose-400' },
    { id: 'labor', label: 'نیروی کار', icon: HardHat, color: 'text-orange-500', activeClass: 'text-orange-700 dark:text-orange-400' },
    { id: 'phases', label: 'فازها', icon: Layers, color: 'text-blue-500', activeClass: 'text-blue-700 dark:text-blue-400' },
    { id: 'inventory', label: 'انبار', icon: Package, color: 'text-cyan-500', activeClass: 'text-cyan-700 dark:text-cyan-400' },
    { id: 'purchases', label: 'خریدها', icon: ShoppingCart, color: 'text-teal-500', activeClass: 'text-teal-700 dark:text-teal-400' },
    { id: 'transport', label: 'لجستیک', icon: Truck, color: 'text-amber-500', activeClass: 'text-amber-700 dark:text-amber-400' },
    { id: 'notes', label: 'یادداشت', icon: Notebook, color: 'text-fuchsia-500', activeClass: 'text-fuchsia-700 dark:text-fuchsia-400' },
    { id: 'archive', label: 'اسناد و نقشه‌ها', icon: Archive, color: 'text-slate-500', activeClass: 'text-slate-700 dark:text-slate-300' },
    { id: 'invoice', label: 'صورت‌وضعیت', icon: FileText, color: 'text-purple-500', activeClass: 'text-purple-700 dark:text-purple-400' },
    { id: 'reports', label: 'گزارشات و نمودارها', icon: PieChart, color: 'text-indigo-500', activeClass: 'text-indigo-700 dark:text-indigo-400' }
  ];

  return (
    <div dir="rtl" className="w-full font-sans pb-32 space-y-8 animate-in fade-in zoom-in-95 duration-500 relative overflow-visible">
      
      <style dangerouslySetInnerHTML={{__html: `.rmdp-wrapper, .rmdp-ep-arrow { z-index: 2147483647 !important; }`}} />

      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="sticky top-4 z-[110] max-w-[98%] mx-auto p-4 sm:p-5 rounded-[2rem] backdrop-blur-2xl bg-white/80 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-700/50 shadow-[0_10px_40px_rgba(0,0,0,0.1)] flex flex-wrap items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 text-slate-700 dark:text-slate-300">
            <ArrowRight className="w-6 h-6" />
          </button>
          <div className="hidden sm:flex w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
            {project.profilePhoto ? <img src={project.profilePhoto} alt={project.name} className="w-full h-full object-cover" /> : <Briefcase className="w-7 h-7 text-slate-400" />}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white line-clamp-1">{project.name}</h1>
              <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button onClick={() => setIsEditModalOpen(true)} title="ویرایش اطلاعات پروژه" className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg transition-colors text-indigo-500"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => setIsGalleryOpen(true)} title="گالری تصاویر" className="p-1.5 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/20 rounded-lg transition-colors text-fuchsia-500"><Images className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"/>
                <button onClick={() => setIsExportModalOpen(true)} title="گزارش‌گیری و خروجی پیشرفته" className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-lg transition-colors text-emerald-500"><FileDown className="w-4 h-4" /></button>
                <button onClick={() => setIsImportModalOpen(true)} title="ورودی اطلاعات (Import)" className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors text-blue-500"><FileUp className="w-4 h-4" /></button>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> کارفرما: {clientName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {activeTab === 'transactions' && (
              <motion.button initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setEditTransactionData(null); setIsTransactionModalOpen(true); }} className="flex items-center gap-2 bg-gradient-to-tr from-emerald-500/90 to-teal-400/90 backdrop-blur-xl border border-white/40 text-white font-black py-3 px-6 rounded-2xl shadow-[0_8px_30px_rgba(16,185,129,0.4)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.6)] transition-all overflow-hidden group text-sm relative z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
                  <Banknote className="w-5 h-5 drop-shadow-md" />
                </motion.div>
                <span className="hidden sm:inline relative z-10 drop-shadow-sm">ثبت تراکنش (Ctrl+N)</span>
              </motion.button>
            )}

            {/* 💡 دکمه مربوط به فازها اینجا به هدر اضافه شد */}
            {activeTab === 'phases' && (
              <motion.button initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => document.dispatchEvent(new CustomEvent('open-new-phase-modal'))} className="flex items-center gap-2 bg-gradient-to-tr from-blue-500/90 to-indigo-400/90 backdrop-blur-xl border border-white/40 text-white font-black py-3 px-6 rounded-2xl shadow-[0_8px_30px_rgba(59,130,246,0.4)] hover:shadow-[0_12px_40px_rgba(59,130,246,0.6)] transition-all overflow-hidden group text-sm relative z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                  <Layers className="w-5 h-5 drop-shadow-md" />
                </motion.div>
                <span className="hidden sm:inline relative z-10 drop-shadow-sm">شروع فاز جدید (Ctrl+N)</span>
              </motion.button>
            )}
            
            {activeTab === 'pettycash' && (
              <motion.button initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => document.dispatchEvent(new CustomEvent('open-new-pettycash-modal'))} className="flex items-center gap-2 bg-gradient-to-tr from-rose-500/90 to-pink-400/90 backdrop-blur-xl border border-white/40 text-white font-black py-3 px-6 rounded-2xl shadow-[0_8px_30px_rgba(244,63,94,0.4)] hover:shadow-[0_12px_40px_rgba(244,63,94,0.6)] transition-all overflow-hidden group text-sm relative z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                  <Receipt className="w-5 h-5 drop-shadow-md" />
                </motion.div>
                <span className="hidden sm:inline relative z-10 drop-shadow-sm">ثبت تنخواه (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'purchases' && (
              <motion.button initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => document.dispatchEvent(new CustomEvent('open-new-purchase-modal'))} className="flex items-center gap-2 bg-gradient-to-tr from-teal-500/90 to-emerald-400/90 backdrop-blur-xl border border-white/40 text-white font-black py-3 px-6 rounded-2xl shadow-[0_8px_30px_rgba(20,184,166,0.4)] hover:shadow-[0_12px_40px_rgba(20,184,166,0.6)] transition-all overflow-hidden group text-sm relative z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                  <ShoppingCart className="w-5 h-5 drop-shadow-md" />
                </motion.div>
                <span className="hidden sm:inline relative z-10 drop-shadow-sm">فاکتور خرید (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'transport' && (
              <motion.button initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => document.dispatchEvent(new CustomEvent('open-new-logistics-modal'))} className="flex items-center gap-2 bg-gradient-to-tr from-amber-500/90 to-yellow-400/90 backdrop-blur-xl border border-white/40 text-white font-black py-3 px-6 rounded-2xl shadow-[0_8px_30px_rgba(245,158,11,0.4)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.6)] transition-all overflow-hidden group text-sm relative z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <motion.div animate={{ x: [0, -3, 3, 0], y: [0, -1, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Truck className="w-5 h-5 drop-shadow-md" />
                </motion.div>
                <span className="hidden sm:inline relative z-10 drop-shadow-sm">ثبت کرایه (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'labor' && (
              <motion.button initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsLaborModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-tr from-orange-500/90 to-amber-400/90 backdrop-blur-xl border border-white/40 text-white font-black py-3 px-6 rounded-2xl shadow-[0_8px_30px_rgba(249,115,22,0.4)] hover:shadow-[0_12px_40px_rgba(249,115,22,0.6)] transition-all overflow-hidden group text-sm relative z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                  <HardHat className="w-5 h-5 drop-shadow-md" />
                </motion.div>
                <span className="hidden sm:inline relative z-10 drop-shadow-sm">ثبت نیرو (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'notes' && (
              <motion.button initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => document.dispatchEvent(new CustomEvent('open-new-note-modal'))} className="flex items-center gap-2 bg-gradient-to-tr from-fuchsia-500/90 to-pink-400/90 backdrop-blur-xl border border-white/40 text-white font-black py-3 px-6 rounded-2xl shadow-[0_8px_30px_rgba(217,70,239,0.4)] hover:shadow-[0_12px_40px_rgba(217,70,239,0.6)] transition-all overflow-hidden group text-sm relative z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <motion.div animate={{ rotateY: [0, 180, 360] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}>
                  <Notebook className="w-5 h-5 drop-shadow-md" />
                </motion.div>
                <span className="hidden sm:inline relative z-10 drop-shadow-sm">ثبت گزارش (Ctrl+N)</span>
              </motion.button>
            )}
            
            {activeTab === 'invoice' && (
              <motion.button initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setEditInvoiceId(undefined); setIsInvoiceBuilderOpen(true); }} className="flex items-center gap-2 bg-gradient-to-tr from-purple-500/90 to-fuchsia-400/90 backdrop-blur-xl border border-white/40 text-white font-black py-3 px-6 rounded-2xl shadow-[0_8px_30px_rgba(168,85,247,0.4)] hover:shadow-[0_12px_40px_rgba(168,85,247,0.6)] transition-all overflow-hidden group text-sm relative z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <motion.div animate={{ y: [0, -3, 0], scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                  <FileText className="w-5 h-5 drop-shadow-md" />
                </motion.div>
                <span className="hidden sm:inline relative z-10 drop-shadow-sm">صدور فاکتور (Ctrl+N)</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="space-y-4 relative z-[30] px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> داشبورد وضعیت مالی پروژه
          </h2>
          <div className="w-[180px] h-[42px] relative z-[90]">
            <GlassSelect options={phaseOptions} value={selectedPhaseFilter} onChange={setSelectedPhaseFilter} placeholder="تمامی فازها" />
          </div>
        </div>

        <div className="flex overflow-x-auto gap-4 pb-6 pt-2 snap-x snap-mandatory modal-scrollbar" style={{ scrollBehavior: 'smooth' }}>
          {kpiCards.map((kpi, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + (idx * 0.05) }} className={`min-w-[280px] shrink-0 snap-center flex-1 p-5 rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br ${kpi.bg} border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-lg transition-all cursor-default relative overflow-hidden flex flex-col justify-between`}>
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 dark:bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col gap-4 relative z-10 h-full justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">{kpi.title}</span>
                  <div className={`p-2.5 rounded-xl bg-white/80 dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 ${kpi.color}`}>
                    <kpi.icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className={`text-xl sm:text-2xl font-black tracking-tight ${kpi.color}`} dir="ltr">{Math.round(kpi.value || 0).toLocaleString('fa-IR')}</span>
                  <span className={`text-[10px] font-bold mt-1 ${kpi.color}`}>تومان</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full relative z-[20] px-4">
        <div className="flex overflow-x-auto gap-2 p-2 backdrop-blur-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl w-full mb-6 modal-scrollbar sticky top-[100px] z-[50]">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative px-4 py-3 text-[13px] font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 shrink-0 ${isActive ? tab.activeClass : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/40'}`}>
                {isActive && <motion.div layoutId="dashboardTab" className="absolute inset-0 bg-white dark:bg-slate-800 shadow-md rounded-xl border border-slate-100 dark:border-slate-700" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                <Icon className={`w-4 h-4 relative z-10 transition-colors ${isActive ? tab.activeClass : tab.color}`} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="w-full relative">
          <AnimatePresence mode="wait">
            {activeTab === 'transactions' && <TransactionTab key="transactions" projectId={projectId} />}
            {activeTab === 'pettycash' && <PettyCashTab key="pettycash" projectId={projectId} />}
            {activeTab === 'archive' && <ArchiveTab key="archive" projectId={projectId} />}
            {activeTab === 'labor' && <LaborTab key="labor" projectId={projectId} />}
            {activeTab === 'phases' && <PhaseManagementTab key="phases" projectId={projectId} />}
            {activeTab === 'inventory' && <InventoryTab key="inventory" projectId={projectId} />}
            {activeTab === 'notes' && <NotesTab key="notes" projectId={projectId} />}
            {activeTab === 'purchases' && <PurchasesTab key="purchases" projectId={projectId} />}
            {activeTab === 'transport' && <LogisticsTab key="transport" projectId={projectId} />}
            {activeTab === 'invoice' && <InvoiceTab key="invoice" projectId={projectId} />}
            {activeTab === 'reports' && <ReportsTab key="reports" project={project} />}
          </AnimatePresence>
        </div>
      </motion.div>

      <NewProjectModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} editData={project} />
      <NewTransactionModal projectId={projectId} isOpen={isTransactionModalOpen} onClose={() => { setIsTransactionModalOpen(false); setEditTransactionData(null); }} editData={editTransactionData} />
      <NewLaborModal projectId={projectId} isOpen={isLaborModalOpen} onClose={() => setIsLaborModalOpen(false)} />
      <AdvancedPurchaseModal projectId={projectId} />
      {/* 💡 مودال لجستیک اینجا اضافه شد */}
      <NewLogisticsModal projectId={projectId} />

      <AnimatePresence>
        {isGalleryOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-4xl max-h-[90vh] overflow-y-auto modal-scrollbar bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl relative">
              <button onClick={() => setIsGalleryOpen(false)} className="absolute top-4 left-4 p-2 bg-slate-700 hover:bg-rose-500 text-white rounded-xl transition-colors z-10"><X className="w-5 h-5"/></button>
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Images className="w-6 h-6 text-fuchsia-500"/> گالری تصاویر و اسناد پروژه</h2>
              
              {project?.photos && project.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full mt-4">
                  {project.photos.map((img: string, i: number) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-600 shadow-md">
                      <img src={img} alt={`گالری ${i+1}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-64 border-2 border-dashed border-slate-600 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                  <Images className="w-12 h-12 mb-3 opacity-50"/>
                  <p className="font-bold">هیچ تصویر یا سندی آپلود نشده است.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInvoiceBuilderOpen && (
          <InvoiceBuilder projectId={projectId} existingInvoiceId={editInvoiceId} onClose={() => { setIsInvoiceBuilderOpen(false); setEditInvoiceId(undefined); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImportModalOpen && (
          <ImportBuilder projectId={projectId} onClose={() => setIsImportModalOpen(false)} />
        )}
      </AnimatePresence>

      {/* 💡 مودالِ فوق‌پیشرفته خروجی (ExportBuilder) که با هم ساختیم اینجا اضافه شد */}
      <AnimatePresence>
        {isExportModalOpen && (
          <ExportBuilder projectId={projectId} onClose={() => setIsExportModalOpen(false)} />
        )}
      </AnimatePresence>

    </div>
  );
}