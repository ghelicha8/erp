import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Handshake, X, Check, Calendar, DollarSign, Wrench, Lock, 
  Building2, User, Clock, CheckCircle2, AlertTriangle, Users, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { 
  useLogisticsStore, 
  TOOL_RENTAL_UNIT_LABELS,
  type ToolRentalRecord,
  type ToolRentalUnit,
  type SettlementStatus
} from '../../../store/logisticsStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { useClientStore } from '../../../store/clientStore';
import { useLaborStore } from '../../../store/laborStore';
import { 
  GlassDatePicker, 
  PortalSelect, 
  AnimatedCheckbox
} from '../../../components/ui/SharedLaborUI';
import { formatCurrency } from '../../../core/utils/currency';

interface ToolRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultToolId?: string;
  toolId?: string;
  rentalToEdit?: ToolRentalRecord | null;
}

const formatCommaSeparated = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/[^0-9]/g, '');
  return clean ? Number(clean).toLocaleString('en-US') : '';
};

const RENTAL_UNIT_OPTIONS = [
  { value: 'DAILY', label: 'روزانه' },
  { value: 'HOURLY', label: 'ساعتی' },
  { value: 'MONTHLY', label: 'ماهانه' },
  { value: 'FIXED', label: 'مقطوع / کل پروژه' },
];

const OPERATOR_WAGE_OPTIONS = [
  { value: 'DAILY', label: 'روزمزد' },
  { value: 'HOURLY', label: 'ساعتی' },
  { value: 'FIXED', label: 'مقطوع (کل دوره)' },
];

export default function ToolRentalModal({
  isOpen,
  onClose,
  defaultToolId,
  toolId: toolIdProp,
  rentalToEdit
}: ToolRentalModalProps) {
  const { tools, addToolRental, updateToolRental, updateTool } = useLogisticsStore();
  const projects = useProjectStore(state => state.projects) || [];
  const clients = useClientStore(state => state.clients) || [];
  const workers = useLaborStore(state => state.workers) || [];

  const targetToolId = defaultToolId || toolIdProp || '';
  const isToolLocked = Boolean(targetToolId);

  const [toolId, setToolId] = useState(targetToolId);
  const [startDate, setStartDate] = useState(() => moment().format('jYYYY/jMM/jDD'));
  const [endDate, setEndDate] = useState('');
  const [projectId, setProjectId] = useState('FREE');
  const [clientId, setClientId] = useState('FREE');

  const [rentalUnit, setRentalUnit] = useState<ToolRentalUnit>('DAILY');
  const [unitCount, setUnitCount] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [settlementStatus, setSettlementStatus] = useState<SettlementStatus>('PENDING');
  const [paidAmount, setPaidAmount] = useState<string>('');

  // وضعیت اپراتور همراه ابزار
  const [hasOperator, setHasOperator] = useState(false);
  const [operatorId, setOperatorId] = useState('');
  const [operatorWageType, setOperatorWageType] = useState<'HOURLY' | 'DAILY' | 'FIXED'>('DAILY');
  const [operatorWageRate, setOperatorWageRate] = useState<string>('');
  const [operatorPaid, setOperatorPaid] = useState(false);

  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (rentalToEdit && isOpen) {
      setToolId(rentalToEdit.toolId || targetToolId);
      setStartDate(rentalToEdit.startDate || moment().format('jYYYY/jMM/jDD'));
      setEndDate(rentalToEdit.endDate || '');
      setProjectId(rentalToEdit.projectId || 'FREE');
      setClientId(rentalToEdit.clientId || 'FREE');
      setRentalUnit(rentalToEdit.rentalUnit || 'DAILY');
      setUnitCount(String(rentalToEdit.unitCount || 1));
      setUnitPrice(rentalToEdit.unitPrice ? formatCommaSeparated(rentalToEdit.unitPrice) : '');
      setSettlementStatus(rentalToEdit.settlementStatus || 'PENDING');
      setPaidAmount(rentalToEdit.paidAmount ? formatCommaSeparated(rentalToEdit.paidAmount) : '');
      setHasOperator(Boolean(rentalToEdit.hasOperator));
      setOperatorId(rentalToEdit.operatorId || '');
      setOperatorWageType(rentalToEdit.operatorWageType || 'DAILY');
      setOperatorWageRate(rentalToEdit.operatorWageRate ? formatCommaSeparated(rentalToEdit.operatorWageRate) : '');
      setOperatorPaid(Boolean(rentalToEdit.operatorPaid));
      setNotes(rentalToEdit.notes || '');
    } else if (isOpen) {
      setToolId(targetToolId || tools[0]?.id || '');
      setStartDate(moment().format('jYYYY/jMM/jDD'));
      setEndDate('');
      setProjectId('FREE');
      setClientId('FREE');
      setRentalUnit('DAILY');
      setUnitCount('1');
      setUnitPrice('');
      setSettlementStatus('PENDING');
      setPaidAmount('');
      setHasOperator(false);
      setOperatorId(workers[0]?.id || '');
      setOperatorWageType('DAILY');
      setOperatorWageRate('');
      setOperatorPaid(false);
      setNotes('');
    }
  }, [rentalToEdit, isOpen, targetToolId, tools, workers]);

  // قانون دوطرفه پروژه ⟷ کارفرما
  const isClientLocked = useMemo(() => {
    if (!projectId || projectId === 'FREE') return false;
    const proj = projects.find(p => p.id === projectId);
    return !!proj?.clientId;
  }, [projectId, projects]);

  const handleProjectChange = (val: string) => {
    setProjectId(val);
    if (val && val !== 'FREE') {
      const proj = projects.find(p => p.id === val);
      if (proj?.clientId) {
        setClientId(proj.clientId);
      }
    }
  };

  const handleClientChange = (val: string) => {
    setClientId(val);
    if (projectId && projectId !== 'FREE') {
      const proj = projects.find(p => p.id === projectId);
      if (proj && proj.clientId !== val) {
        setProjectId('FREE');
      }
    }
  };

  const filteredProjects = useMemo(() => {
    if (!clientId || clientId === 'FREE') return projects;
    return projects.filter(p => p.clientId === clientId);
  }, [projects, clientId]);

  const countNum = Math.max(1, Number(String(unitCount).replace(/[^0-9]/g, '')) || 1);
  const priceNum = Number(String(unitPrice).replace(/,/g, '')) || 0;
  const totalAmount = rentalUnit === 'FIXED' ? priceNum : countNum * priceNum;

  const opRateNum = Number(String(operatorWageRate).replace(/,/g, '')) || 0;
  const operatorTotalWage = hasOperator
    ? (operatorWageType === 'FIXED' ? opRateNum : countNum * opRateNum)
    : 0;

  const toolOptions = useMemo(() => tools.map(t => ({
    value: t.id,
    label: `${t.name} (${t.serialNumber || 'بدون سریال'})`
  })), [tools]);

  const projectOptions = useMemo(() => [
    { value: 'FREE', label: 'اجاره آزاد (بدون پروژه مشخص)' },
    ...filteredProjects.map(p => ({
      value: p.id,
      label: p.title || p.name || 'پروژه بدون نام'
    }))
  ], [filteredProjects]);

  const clientOptions = useMemo(() => [
    { value: 'FREE', label: 'بدون کارفرما / مشتری متفرقه' },
    ...clients.map(c => ({
      value: c.id,
      label: `${c.name} ${c.lastName || ''}`.trim()
    }))
  ], [clients]);

  const workerOptions = useMemo(() => workers.map(w => ({
    value: w.id,
    label: `${w.name} ${w.lastName || ''}`.trim()
  })), [workers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolId) {
      toast.error('لطفاً ابزار مورد نظر را انتخاب کنید.');
      return;
    }
    if (!startDate) {
      toast.error('ثبت تاریخ شروع اجاره الزامی است.');
      return;
    }
    if (endDate && endDate < startDate) {
      toast.error('تاریخ پایان اجاره نمی‌تواند قبل از تاریخ شروع باشد.');
      return;
    }
    if (totalAmount <= 0) {
      toast.error('لطفاً مبلغ یا نرخ اجاره را وارد کنید.');
      return;
    }
    if (hasOperator && !operatorId) {
      toast.error('لطفاً اپراتور دستگاه را از لیست پرسنل انتخاب کنید.');
      return;
    }

    const selectedClient = clients.find(c => c.id === clientId);
    const selectedWorker = workers.find(w => w.id === operatorId);
    const partialPaidNum = Number(String(paidAmount).replace(/,/g, '')) || 0;

    const finalPaidAmount = settlementStatus === 'SETTLED'
      ? totalAmount
      : settlementStatus === 'PARTIAL'
      ? Math.min(totalAmount, partialPaidNum)
      : 0;

    const payload: Omit<ToolRentalRecord, 'id' | 'createdAt'> = {
      toolId,
      startDate,
      endDate: endDate || undefined,
      projectId: projectId !== 'FREE' ? projectId : undefined,
      clientId: clientId !== 'FREE' ? clientId : undefined,
      clientName: selectedClient ? `${selectedClient.name} ${selectedClient.lastName || ''}`.trim() : undefined,
      rentalUnit,
      unitCount: rentalUnit === 'FIXED' ? 1 : countNum,
      unitPrice: priceNum,
      totalAmount,
      settlementStatus,
      paidAmount: finalPaidAmount,
      hasOperator,
      operatorId: hasOperator ? operatorId : undefined,
      operatorName: hasOperator && selectedWorker ? `${selectedWorker.name} ${selectedWorker.lastName || ''}`.trim() : undefined,
      operatorWageType: hasOperator ? operatorWageType : undefined,
      operatorWageRate: hasOperator ? opRateNum : undefined,
      operatorTotalWage: hasOperator ? operatorTotalWage : undefined,
      operatorPaid: hasOperator ? operatorPaid : undefined,
      notes: notes.trim() || undefined,
    };

    if (rentalToEdit) {
      updateToolRental(rentalToEdit.id, payload);
      toast.success('قرارداد اجاره و کارکرد ابزار بروزرسانی شد.');
    } else {
      addToolRental(payload);
      // اگر اجاره در جریان است و ابزار در تعمیرگاه نیست، وضعیت ابزار به RENTED تغییر کند
      const targetTool = tools.find(t => t.id === toolId);
      const todayStr = moment().format('jYYYY/jMM/jDD');
      if (targetTool && targetTool.status !== 'REPAIR' && (!endDate || endDate >= todayStr)) {
        updateTool(toolId, { status: 'RENTED' });
      }
      toast.success('قرارداد اجاره و کارکرد ابزار با موفقیت ثبت شد.');
    }

    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-3 sm:p-5" dir="rtl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border border-purple-300/40 dark:border-purple-500/20 shadow-[0_25px_70px_rgba(168,85,247,0.2)] overflow-hidden z-10"
        >
          {/* سربرگ */}
          <div className="px-6 py-5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                <Handshake className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">
                  {rentalToEdit ? 'ویرایش قرارداد اجاره و کارکرد ابزار' : 'ثبت اجاره و تخصیص کارکرد ابزارآلات'}
                </h2>
                <p className="text-xs text-purple-100 font-bold mt-0.5">
                  تخصیص به پروژه/کارفرما، محاسبه اجاره‌بها و دستمزد اپراتور همراه
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* فرم */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 modal-scrollbar">
            
            {/* ردیف ۱: ابزار، پروژه، کارفرما */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-purple-500" /> ابزار / دستگاه *
                  </span>
                  {isToolLocked && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">
                      <Lock className="w-3 h-3" /> قفل شده
                    </span>
                  )}
                </label>
                <div className="h-[46px]">
                  <PortalSelect
                    value={toolId}
                    onChange={(val) => setToolId(String(val))}
                    options={toolOptions}
                    disabled={isToolLocked}
                    placeholder="انتخاب ابزار..."
                    className="!h-[46px] !rounded-2xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-500" /> پروژه محل کارکرد
                </label>
                <div className="h-[46px]">
                  <PortalSelect
                    value={projectId}
                    onChange={(val) => handleProjectChange(String(val))}
                    options={projectOptions}
                    searchable={true}
                    placeholder="انتخاب پروژه..."
                    className="!h-[46px] !rounded-2xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-500" /> کارفرما / مستأجر
                  </span>
                  {isClientLocked && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      قفل با پروژه
                    </span>
                  )}
                </label>
                <div className="h-[46px]">
                  <PortalSelect
                    value={clientId}
                    onChange={(val) => handleClientChange(String(val))}
                    options={clientOptions}
                    disabled={isClientLocked}
                    searchable={true}
                    placeholder="انتخاب کارفرما..."
                    className="!h-[46px] !rounded-2xl"
                  />
                </div>
              </div>
            </div>

            {/* ردیف ۲: تاریخ شروع، تاریخ پایان، واحد محاسبه */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-500" /> تاریخ شروع اجاره *
                </label>
                <GlassDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="140X/XX/XX"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-rose-500" /> تاریخ پایان / تحویل (اختیاری)
                </label>
                <GlassDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="در حال کارکرد..."
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" /> مبنای محاسبه اجاره *
                </label>
                <div className="h-[46px]">
                  <PortalSelect
                    value={rentalUnit}
                    onChange={(val) => setRentalUnit(val as ToolRentalUnit)}
                    options={RENTAL_UNIT_OPTIONS}
                    placeholder="واحد اجاره..."
                    className="!h-[46px] !rounded-2xl"
                  />
                </div>
              </div>
            </div>

            {/* ردیف ۳: تعداد واحد، نرخ واحد، جمع کل اجاره‌بها */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-3xl border border-purple-200/60 dark:border-purple-800/40">
              {rentalUnit !== 'FIXED' && (
                <div>
                  <label className="text-xs font-black text-slate-700 dark:text-slate-200 mb-1.5 block">
                    تعداد ({TOOL_RENTAL_UNIT_LABELS[rentalUnit]}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={unitCount}
                    onChange={(e) => setUnitCount(e.target.value)}
                    className="w-full h-[46px] px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black font-mono text-slate-800 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <div className={rentalUnit === 'FIXED' ? 'md:col-span-2' : ''}>
                <label className="text-xs font-black text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-purple-500" />
                  {rentalUnit === 'FIXED' ? 'مبلغ مقطوع کل اجاره (تومان) *' : `نرخ هر ${TOOL_RENTAL_UNIT_LABELS[rentalUnit]} (تومان) *`}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(formatCommaSeparated(e.target.value))}
                  placeholder="0"
                  className="w-full h-[46px] px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black font-mono text-left text-slate-800 dark:text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex flex-col justify-center bg-white/90 dark:bg-slate-900/90 px-4 py-2.5 rounded-2xl border border-purple-300/50 dark:border-purple-700/50">
                <span className="text-[11px] font-bold text-slate-500">جمع کل اجاره‌بها:</span>
                <span className="text-lg font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* بخش تخصیص اپراتور همراه ابزار */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AnimatedCheckbox
                    checked={hasOperator}
                    onChange={() => setHasOperator(!hasOperator)}
                    theme="indigo"
                  />
                  <div>
                    <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-500" /> اعزام ابزار همراه با اپراتور تخصصی
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 block">
                      دستمزد اپراتور به صورت خودکار در کارکرد و تراز مالی پرسنل ثبت می‌شود
                    </span>
                  </div>
                </div>

                {hasOperator && (
                  <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    دستمزد اپراتور: {formatCurrency(operatorTotalWage)}
                  </span>
                )}
              </div>

              <AnimatePresence>
                {hasOperator && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 overflow-visible"
                  >
                    <div className="md:col-span-2">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 block">
                        انتخاب اپراتور از لیست نیروها *
                      </label>
                      <div className="h-[46px]">
                        <PortalSelect
                          value={operatorId}
                          onChange={(val) => setOperatorId(String(val))}
                          options={workerOptions}
                          searchable={true}
                          placeholder="جستجو و انتخاب اپراتور..."
                          className="!h-[46px] !rounded-2xl"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 block">
                        نوع دستمزد اپراتور
                      </label>
                      <div className="h-[46px]">
                        <PortalSelect
                          value={operatorWageType}
                          onChange={(val) => setOperatorWageType(val as 'HOURLY' | 'DAILY' | 'FIXED')}
                          options={OPERATOR_WAGE_OPTIONS}
                          placeholder="نوع دستمزد..."
                          className="!h-[46px] !rounded-2xl"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 block">
                        نرخ دستمزد اپراتور (تومان)
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={operatorWageRate}
                        onChange={(e) => setOperatorWageRate(formatCommaSeparated(e.target.value))}
                        placeholder="0"
                        className="w-full h-[46px] px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-black font-mono text-left text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-4 flex items-center gap-2.5 pt-1">
                      <AnimatedCheckbox
                        checked={operatorPaid}
                        onChange={() => setOperatorPaid(!operatorPaid)}
                        theme="emerald"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        دستمزد این اپراتور تسویه و پرداخت شده است
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* وضعیت تسویه اجاره‌بها */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 block">
                وضعیت تسویه حساب اجاره‌بها
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSettlementStatus('PENDING')}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                    settlementStatus === 'PENDING'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-300 shadow-sm'
                      : 'bg-white/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <span className="text-xs font-black flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-500" /> نسیه / در انتظار تسویه
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 ${settlementStatus === 'PENDING' ? 'border-rose-500 bg-rose-500' : 'border-slate-400'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setSettlementStatus('PARTIAL')}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                    settlementStatus === 'PARTIAL'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm'
                      : 'bg-white/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <span className="text-xs font-black flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> تسویه بخشی (پیش‌پرداخت)
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 ${settlementStatus === 'PARTIAL' ? 'border-amber-500 bg-amber-500' : 'border-slate-400'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setSettlementStatus('SETTLED')}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                    settlementStatus === 'SETTLED'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'bg-white/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <span className="text-xs font-black flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> تسویه کامل
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 ${settlementStatus === 'SETTLED' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-400'}`} />
                </button>
              </div>

              {settlementStatus === 'PARTIAL' && (
                <div className="pt-2">
                  <label className="text-xs font-black text-amber-600 dark:text-amber-400 mb-1.5 block">
                    مبلغ دریافت‌شده تا این لحظه (تومان)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(formatCommaSeparated(e.target.value))}
                    placeholder="0"
                    className="w-full sm:w-72 h-[44px] px-4 rounded-2xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-sm font-black font-mono text-left text-slate-800 dark:text-white outline-none"
                  />
                </div>
              )}
            </div>

            {/* توضیحات */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-500" /> توضیحات و شرایط تحویل ابزار
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="سلامت ظاهری، متعلقات همراه، شرایط استهلاک..."
                className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* دکمه‌ها */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-purple-500/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {rentalToEdit ? 'ذخیره تغییرات اجاره' : 'ثبت قرارداد اجاره'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
